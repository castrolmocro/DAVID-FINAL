/**
 * DAVID V1 — Threads Data Controller
 * Copyright © DJAMEL
 */

"use strict";

const db = require("../connectDB/connectSqlite.js");

const stmtGet    = db.prepare("SELECT data FROM threads WHERE threadID = ?");
const stmtSet    = db.prepare("INSERT OR REPLACE INTO threads (threadID, data) VALUES (?, ?)");
const stmtDelete = db.prepare("DELETE FROM threads WHERE threadID = ?");
const stmtAll    = db.prepare("SELECT threadID, data FROM threads");

module.exports = {
  async get(threadID) {
    try {
      const row = stmtGet.get(String(threadID));
      return row ? JSON.parse(row.data) : null;
    } catch (_) { return null; }
  },

  async set(threadID, data) {
    stmtSet.run(String(threadID), JSON.stringify(data));
    return data;
  },

  async delete(threadID) {
    stmtDelete.run(String(threadID));
  },

  async getAll() {
    return stmtAll.all().map(row => ({
      threadID: row.threadID,
      ...JSON.parse(row.data),
    }));
  },
};
