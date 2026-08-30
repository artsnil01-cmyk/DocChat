export type NormalizedPdfPage = {
  page: number;
  text: string;
};

export type NormalizedPdfText = {
  pageCount: number;
  pages: NormalizedPdfPage[];
};

export type PdfNormalizationResult =
  | {
      ok: true;
      document: NormalizedPdfText;
    }
  | {
      ok: false;
      code: "PDF_NO_USABLE_TEXT";
      message: string;
    };
