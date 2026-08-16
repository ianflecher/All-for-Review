import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
// This file only runs on iOS/Android, where the legacy FileSystem API
// (readAsStringAsync) is still available, unlike on web.
import * as FileSystem from 'expo-file-system/legacy';
// @ts-ignore - resolved via metro.config.js assetExts
import pdfLibAsset from '../../assets/pdfjs/pdf.min.pdfjs';
// @ts-ignore - resolved via metro.config.js assetExts
import pdfWorkerAsset from '../../assets/pdfjs/pdf.worker.min.pdfjs';

/**
 * Offline PDF text extraction for iOS/Android.
 *
 * pdf.js needs a DOM + Worker, which React Native doesn't provide, so we run
 * it inside a hidden WebView loaded from a local HTML file built from the
 * pdf.js library + worker bundled as app assets. Nothing is fetched from the
 * network, so this works fully offline on-device.
 */

/**
 * Bytes of base64 pushed into the WebView per injectJavaScript call.
 *
 * A whole PDF cannot go in one call: on Android injectJavaScript ends up in an
 * evaluateJavascript() Binder transaction, which fails once the script gets
 * into the megabytes — silently, so the extract promise would simply never
 * settle. 64KB per call keeps every transaction far below that ceiling.
 */
const CHUNK_SIZE = 64 * 1024;

/** Base timeout, plus extra per MB, since big files legitimately take longer. */
const BASE_TIMEOUT_MS = 30000;
const TIMEOUT_MS_PER_MB = 15000;

type PendingRequest = {
  resolve: (text: string) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

let webviewRef: WebView | null = null;
let isReady = false;
let readyWaiters: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
let pending: PendingRequest | null = null;

function settleReject(error: Error) {
  if (!pending) return;
  clearTimeout(pending.timer);
  pending.reject(error);
  pending = null;
}

function settleResolve(text: string) {
  if (!pending) return;
  clearTimeout(pending.timer);
  pending.resolve(text);
  pending = null;
}

/** Called when the engine goes away (unmount, crash, load failure). */
function teardown(reason: string) {
  isReady = false;
  const waiters = readyWaiters;
  readyWaiters = [];
  waiters.forEach((w) => w.reject(new Error(reason)));
  settleReject(new Error(reason));
}

async function buildHtml(): Promise<string> {
  const libAsset = Asset.fromModule(pdfLibAsset);
  const workerAsset = Asset.fromModule(pdfWorkerAsset);
  await Promise.all([libAsset.downloadAsync(), workerAsset.downloadAsync()]);

  const libSource = await FileSystem.readAsStringAsync(libAsset.localUri as string);
  const workerSource = await FileSystem.readAsStringAsync(workerAsset.localUri as string);
  const workerSourceLiteral = JSON.stringify(workerSource);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<script>${libSource}</script>
<script>
(function () {
  var workerBlob = new Blob([${workerSourceLiteral}], { type: 'application/javascript' });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob);

  // The document arrives in pieces (see CHUNK_SIZE on the native side) and is
  // reassembled here before pdf.js sees it.
  var buffer = [];

  function send(payload) {
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }

  window.pdfReset = function () { buffer = []; };
  window.pdfChunk = function (part) { buffer.push(part); };

  window.pdfRun = async function () {
    var base64 = buffer.join('');
    buffer = [];
    try {
      var binary = atob(base64);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      var pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
      var text = '';
      for (var p = 1; p <= pdf.numPages; p++) {
        var page = await pdf.getPage(p);
        var content = await page.getTextContent();
        text += content.items.map(function (it) { return it.str; }).join(' ') + '\\n\\n';
      }
      send({ ok: true, text: text });
    } catch (e) {
      send({ ok: false, error: String((e && e.message) || e) });
    }
  };

  send({ ready: true });
})();
</script>
</body></html>`;
}

export const PdfExtractorHost: React.FC = () => {
  const [html, setHtml] = useState<string | null>(null);
  const localRef = useRef<WebView | null>(null);

  useEffect(() => {
    let mounted = true;
    buildHtml()
      .then((doc) => mounted && setHtml(doc))
      .catch((e) => {
        console.warn('Failed to prepare offline PDF engine:', e);
        teardown('The offline PDF engine could not be prepared.');
      });
    return () => {
      mounted = false;
      // Without this, isReady would stay true against a WebView that no longer
      // exists and every later extraction would hang or throw.
      if (webviewRef === localRef.current) webviewRef = null;
      teardown('The offline PDF engine was closed.');
    };
  }, []);

  if (!html) return null;

  return (
    <View style={styles.host} pointerEvents="none">
      <WebView
        ref={(r) => {
          localRef.current = r;
          webviewRef = r;
        }}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        onError={() => teardown('The offline PDF engine failed to load.')}
        onRenderProcessGone={() =>
          teardown('The offline PDF engine ran out of memory. Try a smaller PDF.')
        }
        onMessage={(event) => {
          let parsed: any;
          try {
            parsed = JSON.parse(event.nativeEvent.data);
          } catch {
            return; // ignore malformed / unrelated messages
          }

          if (parsed.ready) {
            isReady = true;
            const waiters = readyWaiters;
            readyWaiters = [];
            waiters.forEach((w) => w.resolve());
            return;
          }

          if (parsed.ok) {
            settleResolve(parsed.text);
          } else {
            settleReject(new Error(parsed.error || 'Failed to extract PDF text.'));
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // 1x1 rather than 0x0: some Android builds skip work for zero-sized views.
  host: { position: 'absolute', width: 1, height: 1, opacity: 0, top: 0, left: 0 },
});

function waitForReady(timeoutMs = 20000): Promise<void> {
  if (isReady) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      readyWaiters = readyWaiters.filter((w) => w !== waiter);
      reject(new Error('Offline PDF engine took too long to start.'));
    }, timeoutMs);

    const waiter = {
      resolve: () => {
        clearTimeout(timer);
        resolve();
      },
      reject: (e: Error) => {
        clearTimeout(timer);
        reject(e);
      },
    };
    readyWaiters.push(waiter);
  });
}

export async function extractTextNative(base64: string): Promise<string> {
  await waitForReady();

  const view = webviewRef;
  if (!view) {
    throw new Error('Offline PDF engine is not available. Please restart the app and try again.');
  }
  if (pending) {
    throw new Error('Another document is still being read. Please wait for it to finish.');
  }

  const sizeMb = base64.length / (1024 * 1024);
  const timeoutMs = BASE_TIMEOUT_MS + Math.ceil(sizeMb) * TIMEOUT_MS_PER_MB;

  const result = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending = null;
      reject(new Error('Reading this PDF took too long. It may be very large or damaged.'));
    }, timeoutMs);
    pending = { resolve, reject, timer };
  });

  const request = pending;

  view.injectJavaScript('window.pdfReset(); true;');
  for (let offset = 0; offset < base64.length; offset += CHUNK_SIZE) {
    // The engine can die or time out mid-transfer; stop feeding a dead WebView.
    if (pending !== request) return result;

    const chunk = base64.slice(offset, offset + CHUNK_SIZE);
    view.injectJavaScript(`window.pdfChunk(${JSON.stringify(chunk)}); true;`);
    // Yield between chunks so the UI thread can keep the loading overlay
    // animating instead of freezing for the length of a large document.
    await new Promise((r) => setTimeout(r, 0));
  }

  if (pending === request) view.injectJavaScript('window.pdfRun(); true;');

  return result;
}
