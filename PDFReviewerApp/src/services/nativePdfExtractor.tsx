import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
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

type PendingRequest = { resolve: (text: string) => void; reject: (err: Error) => void };

let webviewRef: WebView | null = null;
let isReady = false;
let readyWaiters: Array<() => void> = [];
let pending: PendingRequest | null = null;

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

  window.extractPdfText = async function (base64) {
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
      window.ReactNativeWebView.postMessage(JSON.stringify({ ok: true, text: text }));
    } catch (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
    }
  };

  window.ReactNativeWebView.postMessage('ready');
})();
</script>
</body></html>`;
}

export const PdfExtractorHost: React.FC = () => {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    buildHtml()
      .then((doc) => mounted && setHtml(doc))
      .catch((e) => console.warn('Failed to prepare offline PDF engine:', e));
    return () => {
      mounted = false;
    };
  }, []);

  if (!html) return null;

  return (
    <View style={{ width: 0, height: 0, opacity: 0 }} pointerEvents="none">
      <WebView
        ref={(r) => {
          webviewRef = r;
        }}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        onMessage={(event) => {
          const data = event.nativeEvent.data;
          if (data === 'ready') {
            isReady = true;
            readyWaiters.forEach((fn) => fn());
            readyWaiters = [];
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (!pending) return;
            if (parsed.ok) {
              pending.resolve(parsed.text);
            } else {
              pending.reject(new Error(parsed.error || 'Failed to extract PDF text.'));
            }
            pending = null;
          } catch {
            // ignore malformed / unrelated messages
          }
        }}
      />
    </View>
  );
};

function waitForReady(timeoutMs = 15000): Promise<void> {
  if (isReady) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Offline PDF engine took too long to start.'));
    }, timeoutMs);
    readyWaiters.push(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export async function extractTextNative(base64: string): Promise<string> {
  await waitForReady();
  if (!webviewRef) {
    throw new Error('Offline PDF engine is not available. Please restart the app and try again.');
  }
  return new Promise((resolve, reject) => {
    pending = { resolve, reject };
    webviewRef!.injectJavaScript(`window.extractPdfText(${JSON.stringify(base64)}); true;`);
  });
}
