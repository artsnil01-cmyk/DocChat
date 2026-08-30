export type PdfPageText = {
  page: number;
  text: string;
};

export type PdfTextExtraction = {
  pageCount: number;
  pages: PdfPageText[];
};

export type PdfExtractionErrorCode =
  | "PDF_PARSE_FAILED"
  | "PDF_NO_EXTRACTABLE_TEXT"
  | "PDF_UNSUPPORTED";

export type PdfExtractionFailure = {
  ok: false;
  code: PdfExtractionErrorCode;
  message: string;
};

export type PdfExtractionSuccess = {
  ok: true;
  document: PdfTextExtraction;
};

export type PdfExtractionResult = PdfExtractionSuccess | PdfExtractionFailure;
