declare module 'browser-image-compression' {
  interface Options {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    maxIteration?: number;
    exifOrientation?: number;
    onProgress?: (progress: number) => void;
    fileType?: string;
    initialQuality?: number;
    alwaysKeepResolution?: boolean;
    preserveExif?: boolean;
    signal?: AbortSignal;
  }
  function imageCompression(file: File | Blob, options: Options): Promise<File | Blob>;
  export default imageCompression;
}
