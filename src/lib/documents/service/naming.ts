import "server-only";

import { documentsCollection } from "@/lib/db/collections";

export async function resolveWorkspaceDocumentName(
  workspaceId: string,
  requestedName: string,
): Promise<string> {
  const documents = await documentsCollection();
  const existingNames = new Set(
    (
      await documents
        .find({ workspaceId }, { projection: { name: 1 } })
        .toArray()
    ).map((document) => document.name),
  );

  if (!existingNames.has(requestedName)) {
    return requestedName;
  }

  const { stem, extension } = splitFilename(requestedName);
  let candidateIndex = 1;
  let candidate = `${stem} (${candidateIndex})${extension}`;

  while (existingNames.has(candidate)) {
    candidateIndex += 1;
    candidate = `${stem} (${candidateIndex})${extension}`;
  }

  return candidate;
}

function splitFilename(filename: string): { stem: string; extension: string } {
  const extensionStart = filename.lastIndexOf(".");

  if (extensionStart <= 0 || extensionStart === filename.length - 1) {
    return {
      stem: filename,
      extension: "",
    };
  }

  return {
    stem: filename.slice(0, extensionStart),
    extension: filename.slice(extensionStart),
  };
}
