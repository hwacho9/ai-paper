declare module "pdfjs-dist" {
  export type PDFPageProxy = any;
  const pdfjs: any;
  export = pdfjs;
}

declare module "pdfjs-dist/build/pdf.worker?url" {
  const workerSrc: string;
  export default workerSrc;
}
