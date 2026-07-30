// types.d.ts
import 'expo-file-system';

declare module 'expo-file-system' {
  export const documentDirectory: string | null;
  export const cacheDirectory: string | null;
}

declare module '*.pdfjs' {
  const assetId: number;
  export default assetId;
}