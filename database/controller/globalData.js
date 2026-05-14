/**
 * DAVID V1 — Global Data Controller
 * Copyright © DJAMEL
 */

"use strict";

const db = require("../connectDB/connectSqlite.js");

const stmtGet = db.prepare("SELECT data FROM globals WHERE key = ?");
const stmtSet = db.prepare("INSERT OR REPLACE INTO globals (key, data) VALUES (?, ?)");

module.exports = {
  async get(key, field, defaultVal) {
    try {
      const row = stmtGet.get(String(key));
      if (!row) return defaultVal ?? null;
      const parsed = JSON.parse(row.data);
      return field ? (parsed[field] ?? defaultVal) : parsed;
    } catch (_) { return defaultVal ?? null; }
  },

  async set(key, field, value) {
    let existing = {};
    try {
      const row = stmtGet.get(String(key));
      if (row) existing = JSON.parse(row.data);
    } catch (_) {}
    if (field) existing[field] = value;
    else existing = value;
    stmtSet.run(String(key), JSON.stringify(existing));
    return existing;
  },
};
