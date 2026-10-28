import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { sqlite?: Database.Database };

const dbFile = process.env.GERMAN_DB ?? path.join(process.cwd(), "data", "german.db");
fs.mkdirSync(path.dirname(dbFile), { recursive: true }); // fresh clones and build servers have no data/ folder

const sqlite = globalForDb.sqlite ?? new Database(dbFile);
sqlite.pragma("journal_mode = WAL");
if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

// The exam table is created on first use, so existing databases need no migration.
sqlite.exec(`CREATE TABLE IF NOT EXISTS exam_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, exam_id TEXT NOT NULL, taken_at INTEGER NOT NULL,
  timed INTEGER NOT NULL DEFAULT 1, hoeren REAL NOT NULL, lesen REAL NOT NULL,
  schreiben REAL NOT NULL, sprechen REAL NOT NULL, total INTEGER NOT NULL)`);

export const db = drizzle(sqlite, { schema });
export * from "./schema";
