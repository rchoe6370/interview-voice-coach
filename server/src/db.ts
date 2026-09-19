import type { Database } from "better-sqlite3";

export function openDatabase(_path: string): Database {
  throw new Error("TODO: open SQLite database and apply migrations");
}

export function initializeSchema(_db: Database): void {
  throw new Error("TODO: create sessions and turns tables");
}
