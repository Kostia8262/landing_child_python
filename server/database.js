/**
 * MY COMPUTER ACADEMY — Database (SQLite via better-sqlite3)
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_DIR  = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'leads.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    child_name  TEXT    NOT NULL,
    age         INTEGER,
    course      TEXT,
    phone       TEXT    NOT NULL,
    parent_name TEXT,
    status      TEXT    NOT NULL DEFAULT 'new',
    notes       TEXT,
    created_at  DATETIME DEFAULT (datetime('now', 'localtime')),
    updated_at  DATETIME DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS lead_status_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id    INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT    NOT NULL,
    changed_at DATETIME DEFAULT (datetime('now', 'localtime'))
  );
`);

// ---------- PREPARED STATEMENTS ----------
const stmts = {
  insertLead: db.prepare(`
    INSERT INTO leads (child_name, age, course, phone, parent_name)
    VALUES (@child_name, @age, @course, @phone, @parent_name)
  `),

  getAllLeads: db.prepare(`
    SELECT * FROM leads ORDER BY created_at DESC
  `),

  getLeadById: db.prepare(`
    SELECT * FROM leads WHERE id = ?
  `),

  updateStatus: db.prepare(`
    UPDATE leads SET status = @status, updated_at = datetime('now','localtime')
    WHERE id = @id
  `),

  updateNotes: db.prepare(`
    UPDATE leads SET notes = @notes, updated_at = datetime('now','localtime')
    WHERE id = @id
  `),

  deleteLead: db.prepare(`
    DELETE FROM leads WHERE id = ?
  `),

  countByStatus: db.prepare(`
    SELECT status, COUNT(*) as count FROM leads GROUP BY status
  `),

  countTotal: db.prepare(`
    SELECT COUNT(*) as total FROM leads
  `),
};

// ---------- PUBLIC API ----------
module.exports = {
  /**
   * Insert a new lead.
   * @param {{ child_name, age, course, phone, parent_name }} data
   * @returns {{ id, changes }}
   */
  insertLead(data) {
    const result = stmts.insertLead.run(data);
    return { id: result.lastInsertRowid, changes: result.changes };
  },

  getAllLeads() {
    return stmts.getAllLeads.all();
  },

  getLeadById(id) {
    return stmts.getLeadById.get(id);
  },

  updateStatus(id, status) {
    return stmts.updateStatus.run({ id, status });
  },

  updateNotes(id, notes) {
    return stmts.updateNotes.run({ id, notes });
  },

  deleteLead(id) {
    return stmts.deleteLead.run(id);
  },

  getStats() {
    const byStatus = stmts.countByStatus.all();
    const { total } = stmts.countTotal.get();
    return { total, byStatus };
  },

  close() {
    db.close();
  },
};
