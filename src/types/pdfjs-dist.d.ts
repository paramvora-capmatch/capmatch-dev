declare module 'pdfjs-dist' {
  export function getDocument(src: any): { promise: Promise<any> };
  export const GlobalWorkerOptions: { workerSrc: string; };
}

declare module 'pdfjs-dist/build/pdf.mjs' {
    export * from 'pdfjs-dist';
    export const version: string;
}