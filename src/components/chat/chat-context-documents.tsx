import { FileText } from "lucide-react";

import type { DocumentLibraryItem } from "@/components/documents/use-document-library";

import styles from "./chat.module.css";

type ChatContextDocumentsProps = {
  documents: DocumentLibraryItem[];
};

export function ChatContextDocuments({
  documents,
}: ChatContextDocumentsProps) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <div className={styles.chatContextDocuments} aria-label="Documents du chat">
      {documents.map((document) => (
        <span className={styles.chatContextChip} key={document.id}>
          <FileText aria-hidden="true" />
          <span>@{document.name}</span>
        </span>
      ))}
    </div>
  );
}
