// Server-only session config for Steam auth (don't import from client).
export type SteamUser = {
  steamId: string;
  personaName: string;
  avatar: string;
  profileUrl: string;
};

export type SessionData = {
  user?: SteamUser;
};

export const sessionConfig = {
  password: process.env.SESSION_SECRET || "dev-insecure-session-secret-change-me-please-32+chars",
  name: "floatiq_session",
  maxAge: 60 * 60 * 24 * 30, // 30 days
  cookie: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: true,
    path: "/",
  },
};
