/**
 * DAVID V1 — SQLite Connection
 * Copyright © DJAMEL
 */

"use strict";

const Database = require("better-sqlite3");
const path     = require("path");
const fs       = require("fs-extra");

const dbDir  = path.join(process.cwd(), "database/data");
const dbPath = path.join(dbDir, "david.sqlite");

fs.ensureDirSync(dbDir);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS threads (
    threadID TEXT PRIMARY KEY,
    data     TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS users (
    userID TEXT PRIMARY KEY,
    data   TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS globals (
    key  TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}'
  );
`);

module.exports = db;
