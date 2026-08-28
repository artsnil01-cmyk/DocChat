import type { ObjectId } from "mongodb";

export type Chat = {
  _id: ObjectId;
  workspaceId: string;
  title: string;
  documentIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};
