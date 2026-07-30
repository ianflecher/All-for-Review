// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle the pdf.js library/worker as opaque assets (extension ".pdfjs")
// so they can be shipped inside the native app and used fully offline.
config.resolver.assetExts.push('pdfjs');

module.exports = config;
