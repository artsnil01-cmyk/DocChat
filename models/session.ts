import type { ObjectId } from "mongodb";

export type Session = {
  _id: ObjectId;
  accountId: ObjectId;
  workspaceId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
};
