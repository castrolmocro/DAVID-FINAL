/**
 * DAVID V1 — Users Data Controller
 * Copyright © DJAMEL
 */

"use strict";

const db = require("../connectDB/connectSqlite.js");

const stmtGet    = db.prepare("SELECT data FROM users WHERE userID = ?");
const stmtSet    = db.prepare("INSERT OR REPLACE INTO users (userID, data) VALUES (?, ?)");
const stmtDelete = db.prepare("DELETE FROM users WHERE userID = ?");
const stmtAll    = db.prepare("SELECT userID, data FROM users");

module.exports = {
  async get(userID) {
    try {
      const row = stmtGet.get(String(userID));
      return row ? JSON.parse(row.data) : null;
    } catch (_) { return null; }
  },

  async set(userID, data) {
    stmtSet.run(String(userID), JSON.stringify(data));
    return data;
  },

  async delete(userID) {
    stmtDelete.run(String(userID));
  },

  async getAll() {
    return stmtAll.all().map(row => ({
      userID: row.userID,
      ...JSON.parse(row.data),
    }));
  },
};
