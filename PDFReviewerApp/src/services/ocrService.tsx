import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

// Staged out of node_modules by scripts/prepare-ocr-assets.js. One opaque
// extension keeps Metro from bundling the .js parts as modules.
// @ts-ignore - resolved via metro.config.js assetExts
import tesseractJs from '../../assets/ocr/tesseract.min.js.ocrasset';
// @ts-ignore
import tesseractWorker from '../../assets/ocr/worker.min.js.ocrasset';
// @ts-ignore
import coreJs from '../../assets/ocr/core.wasm.js.ocrasset';
// @ts-ignore
import coreWasm from '../../assets/ocr/core.wasm.ocrasset';
// @ts-ignore
import engData from '../../assets/ocr/eng.traineddata.gz.ocrasset';
// @ts-ignore
import filData from '../../assets/ocr/fil.traineddata.gz.ocrasset';

/**
 * Reading text off a photo, on the device.
 *
 * Deliberately a separate WebView from the pdf.js host. That one works and is
 * the app's main path; bolting a second engine into it would put the feature
 * everybody uses at risk for the sake of one that not everybody will.
 *
 * The engine is staged into a folder and the page is loaded from a file:// URL
 * in that same folder, so tesseract fetches its worker, wasm and language data
 * by name the way it expects. The alternative — pushing eleven megabytes
 * through injectJavaScript in 64KB pieces — would take most of a minute before
 * any reading started.
 *
 * English and Filipino are loaded together, because modules here are routinely
 * Taglish and asking the user to pick a language per photo is a question they
 * should not have to answer.
 */

const DIRECTORY = `${FileSystem.documentDirectory}ocr/`;
const PAGE_URL = `${DIRECTORY}ocr.html`;
/** Rebuild the staged folder when the file list or the page changes. */
const STAGE_VERSION = 'v1';

const TIMEOUT_MS = 180000;

type PendingRequest = {
  resolve: (text: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

let webviewRef: WebView | null = null;
let isReady = false;
let readyWaiters: Array<{ resolve: () => void; reject: (e: Error) => void }> = [];
let pending: PendingRequest | null = null;

function settle(error: Error | null, text?: string) {
  if (!pending) return;
  clearTimeout(pending.timer);
  if (error) pending.reject(error);
  else pending.resolve(text ?? '');
  pending = null;
}

function teardown(reason: string) {
  isReady = false;
  const waiters = readyWaiters;
  readyWaiters = [];
  waiters.forEach((waiter) => waiter.reject(new Error(reason)));
  settle(new Error(reason));
}

const PAGE = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<script src="./tesseract.min.js"></script>
<script>
(function () {
  function send(payload) { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); }

  var workerPromise = null;

  function getWorker() {
    if (!workerPromise) {
      workerPromise = Tesseract.createWorker(['eng', 'fil'], 1, {
        workerPath: './worker.min.js',
        corePath: './core.wasm.js',
        langPath: '.',
        gzip: true,
      });
    }
    return workerPromise;
  }

  window.ocrRun = async function (fileName) {
    try {
      var worker = await getWorker();
      var result = await worker.recognize('./' + fileName);
      send({ ok: true, text: result.data.text });
    } catch (e) {
      send({ ok: false, error: String((e && e.message) || e) });
    }
  };

  send({ ready: true });
})();
</script>
</body></html>`;

/**
 * Copies the engine out of the app bundle into a working folder, under the
 * names tesseract looks for. Bundled assets carry hashed filenames, so they
 * cannot be pointed at directly.
 */
async function stageEngine(): Promise<void> {
  const marker = `${DIRECTORY}${STAGE_VERSION}.stamp`;
  const existing = await FileSystem.getInfoAsync(marker);
  if (existing.exists) return;

  await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true }).catch(() => undefined);

  const files: [number, string][] = [
    [tesseractJs, 'tesseract.min.js'],
    [tesseractWorker, 'worker.min.js'],
    [coreJs, 'core.wasm.js'],
    [coreWasm, 'core.wasm'],
    [engData, 'eng.traineddata.gz'],
    [filData, 'fil.traineddata.gz'],
  ];

  for (const [module, name] of files) {
    const asset = Asset.fromModule(module);
    await asset.downloadAsync();
    if (!asset.localUri) throw new Error(`Could not unpack the OCR engine (${name}).`);
    await FileSystem.copyAsync({ from: asset.localUri, to: `${DIRECTORY}${name}` });
  }

  await FileSystem.writeAsStringAsync(PAGE_URL, PAGE);
  await FileSystem.writeAsStringAsync(marker, STAGE_VERSION);
}

export const OcrHost: React.FC = () => {
  const [ready, setReady] = useState(false);
  const localRef = useRef<WebView | null>(null);

  useEffect(() => {
    let mounted = true;
    stageEngine()
      .then(() => mounted && setReady(true))
      .catch((e) => {
        console.warn('Could not prepare the OCR engine:', e);
        teardown('The text reader could not be prepared.');
      });

    return () => {
      mounted = false;
      if (webviewRef === localRef.current) webviewRef = null;
      teardown('The text reader was closed.');
    };
  }, []);

  if (!ready) return null;

  return (
    <View style={styles.host} pointerEvents="none">
      <WebView
        ref={(r) => {
          localRef.current = r;
          webviewRef = r;
        }}
        source={{ uri: PAGE_URL }}
        originWhitelist={['file://*', '*']}
        javaScriptEnabled
        // The page is our own file, loads nothing from the network, and never
        // navigates. These allow it to read its own engine and the image being
        // scanned off disk, and keep the canvas untainted so pixels can be read.
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        onError={() => teardown('The text reader failed to load.')}
        onRenderProcessGone={() =>
          teardown('The text reader ran out of memory. Try a smaller photo.')
        }
        onMessage={(event) => {
          let parsed: any;
          try {
            parsed = JSON.parse(event.nativeEvent.data);
          } catch {
            return;
          }

          if (parsed.ready) {
            isReady = true;
            const waiters = readyWaiters;
            readyWaiters = [];
            waiters.forEach((waiter) => waiter.resolve());
            return;
          }

          if (parsed.ok) settle(null, parsed.text);
          else settle(new Error(parsed.error || 'Could not read this image.'));
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  host: { position: 'absolute', width: 1, height: 1, opacity: 0, top: 0, left: 0 },
});

function waitForReady(timeoutMs = 30000): Promise<void> {
  if (isReady) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      readyWaiters = readyWaiters.filter((w) => w !== waiter);
      reject(new Error('The text reader took too long to start.'));
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

/**
 * Reads the text in a picked image. The file is copied next to the engine so
 * the page can fetch it by name, which is far cheaper than pushing several
 * megabytes of base64 across the bridge.
 */
export async function recognizeImage(uri: string): Promise<string> {
  await waitForReady();

  const view = webviewRef;
  if (!view) {
    throw new Error('The text reader is not available. Restart the app and try again.');
  }
  if (pending) {
    throw new Error('Another photo is still being read. Please wait for it to finish.');
  }

  const scanName = `scan-${Date.now()}.img`;
  await FileSystem.copyAsync({ from: uri, to: `${DIRECTORY}${scanName}` });

  const result = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending = null;
      reject(new Error('Reading this photo took too long. Try a clearer or smaller picture.'));
    }, TIMEOUT_MS);
    pending = { resolve, reject, timer };
  });

  view.injectJavaScript(`window.ocrRun(${JSON.stringify(scanName)}); true;`);

  try {
    return await result;
  } finally {
    // The scan is a copy; the original stays where the user put it.
    FileSystem.deleteAsync(`${DIRECTORY}${scanName}`, { idempotent: true }).catch(() => undefined);
  }
}
