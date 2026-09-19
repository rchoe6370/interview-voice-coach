import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function openDatabase(path: string): Database.Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  initializeSchema(db);
  return db;
}

export function initializeSchema(db: Database.Database): void {
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      question_set_version TEXT NOT NULL DEFAULT 'v1',
      created_at TEXT NOT NULL,
      current_question_index INTEGER NOT NULL DEFAULT 0,
      retry_target_index INTEGER,
      status TEXT NOT NULL DEFAULT 'in_progress',
      total_score REAL,
      overall_category TEXT,
      conclusion TEXT,
      strengths_json TEXT,
      growth_areas_json TEXT,
      certificate_unlocked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS turns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      question_index INTEGER NOT NULL,
      turn_number INTEGER NOT NULL DEFAULT 0,
      is_final INTEGER NOT NULL DEFAULT 0,
      is_retry INTEGER NOT NULL DEFAULT 0,
      transcript TEXT NOT NULL,
      transcript_source TEXT NOT NULL DEFAULT 'stt',
      superseded_transcript TEXT,
      superseded_audio_url TEXT,
      stt_confidence REAL,
      decision_json TEXT NOT NULL,
      evaluator TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (session_id, question_index, turn_number, is_retry)
    );
  `);
}
