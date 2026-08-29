import "server-only";

import { ObjectId, type WithId } from "mongodb";

import { sessionsCollection } from "@/lib/db/collections";
import { generateAuthToken, hashAuthToken } from "@/lib/auth/tokens";
import type { Session } from "@/models/session";

const SESSION_LIFETIME_DAYS = 30;

export type CreatedSession = {
  rawToken: string;
  session: Session;
};

export async function createAuthSession(params: {
  accountId: ObjectId;
  workspaceId: string;
}): Promise<CreatedSession> {
  const rawToken = generateAuthToken();
  const now = new Date();
  const session: Session = {
    _id: new ObjectId(),
    accountId: params.accountId,
    workspaceId: params.workspaceId,
    tokenHash: hashAuthToken(rawToken),
    createdAt: now,
    expiresAt: addDays(now, SESSION_LIFETIME_DAYS),
  };

  const sessions = await sessionsCollection();
  await sessions.insertOne(session);

  return { rawToken, session };
}

export async function findValidSessionByToken(
  rawToken: string,
): Promise<WithId<Session> | null> {
  const sessions = await sessionsCollection();

  return sessions.findOne({
    tokenHash: hashAuthToken(rawToken),
    expiresAt: {
      $gt: new Date(),
    },
  });
}

export async function revokeSessionByToken(rawToken: string): Promise<void> {
  const sessions = await sessionsCollection();

  await sessions.deleteOne({
    tokenHash: hashAuthToken(rawToken),
  });
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
