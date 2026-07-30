const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const DIST_DIR = path.join(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
};

/**
 * Serves the statically exported Expo web build (`dist/`) from a
 * loopback-only HTTP server. This is required because the exported HTML
 * references assets with absolute paths (e.g. "/_expo/..."), which only
 * resolve correctly over http://, not over a file:// URL. Nothing leaves
 * the machine — the server only binds to 127.0.0.1 — so the app stays
 * fully offline.
 */
function startLocalServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);

      // Same-origin proxy for "add from web link". The renderer is a Chromium
      // context and so is bound by CORS; fetching here in the main process is
      // not, which is what lets desktop read article pages.
      if (urlPath === '/__fetch') {
        const target = new URL(req.url, 'http://127.0.0.1').searchParams.get('url');
        if (!target || !/^https?:\/\//i.test(target)) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad or missing url parameter');
          return;
        }
        try {
          const upstream = await fetch(target, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });
          const body = await upstream.text();
          res.writeHead(upstream.status, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(body);
        } catch (err) {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end(`Upstream fetch failed: ${err.message}`);
        }
        return;
      }

      let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);

      if (!filePath.startsWith(DIST_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          // SPA fallback for client-side routes.
          fs.readFile(path.join(DIST_DIR, 'index.html'), (fallbackErr, fallbackData) => {
            if (fallbackErr) {
              res.writeHead(404);
              res.end('Not found');
              return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fallbackData);
          });
          return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });

    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
    server.on('error', reject);
  });
}

async function createWindow() {
  const port = await startLocalServer();

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'PDF Quiz Reviewer',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadURL(`http://127.0.0.1:${port}`);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
