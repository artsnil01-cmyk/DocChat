export const authConfig = {
  sessionLifetimeDays: 30,
  authCookieMaxAgeSeconds: 60 * 60 * 24 * 30,
  workspaceCookieMaxAgeSeconds: 60 * 60 * 24 * 365,
} as const;
