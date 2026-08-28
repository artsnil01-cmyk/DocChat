import type { ObjectId } from "mongodb";

export type Account = {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
};
