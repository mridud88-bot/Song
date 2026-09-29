import "dotenv/config";

const req = (k: string) => {
  const v = process.env[k]?.trim();
  if (!v) throw new Error(`Missing ${k}`);
  return v;
};

export const config = {
  botToken: req("BOT_TOKEN"),
  databaseUrl: req("DATABASE_URL"),
  apiId: Number(req("API_ID")),
  apiHash: req("API_HASH"),
  session: req("USER_SESSION_STRING"),
  allowedGroups: req("ALLOWED_GROUP_IDS").split(",").map(Number).filter(Number.isFinite),
  voiceWorker: process.env.VOICE_WORKER ?? "voice/voice_worker.py"
};
