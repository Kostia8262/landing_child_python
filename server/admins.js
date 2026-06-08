'use strict';

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const FILE      = path.join(DATA_DIR, 'admins.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(FILE))     fs.writeFileSync(FILE, '[]', 'utf8');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}
function save(list) { fs.writeFileSync(FILE, JSON.stringify(list, null, 2), 'utf8'); }
function now()      { return new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' }); }
function genToken() { return crypto.randomBytes(24).toString('hex'); }
function nextId(list) { return list.length > 0 ? Math.max(...list.map(a => a.id)) + 1 : 1; }

const ALLOWED_ROLES = ['administrator', 'manager', 'teacher'];

module.exports = {
  ALLOWED_ROLES,
  getAll()        { return load(); },
  getById(id)     { return load().find(a => a.id === id) || null; },
  findByToken(t)  { return load().find(a => a.token === t && a.active) || null; },

  create(name, role) {
    const r = ALLOWED_ROLES.includes(role) ? role : 'administrator';
    const list  = load();
    const admin = { id: nextId(list), name: String(name).trim(), role: r, token: genToken(), active: true, createdAt: now() };
    list.push(admin);
    save(list);
    return admin;
  },

  revoke(id) {
    const list  = load();
    const admin = list.find(a => a.id === id);
    if (!admin) return null;
    admin.active = false;
    save(list);
    return admin;
  },

  delete(id) {
    const list = load();
    const idx  = list.findIndex(a => a.id === id);
    if (idx < 0) return false;
    list.splice(idx, 1);
    save(list);
    return true;
  },
};
