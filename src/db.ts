import { Pool } from "pg";
import { config } from "./config";

export const db = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false }
});

export async function initDb() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS music_history (
      id BIGSERIAL PRIMARY KEY,
      chat_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      title TEXT NOT NULL,
      url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS music_history_chat_idx
      ON music_history(chat_id, created_at DESC);
  `);
}

export async function history(chatId:number,userId:number,title:string,url:string) {
  await db.query(
    `INSERT INTO music_history(chat_id,user_id,title,url) VALUES($1,$2,$3,$4)`,
    [chatId,userId,title,url]
  );
}
