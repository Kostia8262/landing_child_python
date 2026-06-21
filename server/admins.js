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

  create(name, role, extra = {}) {
    const r = ALLOWED_ROLES.includes(role) ? role : 'administrator';
    const list  = load();
    const admin = { id: nextId(list), name: String(name).trim(), role: r, token: genToken(), active: true, createdAt: now() };
    if (extra.hourlyRate     !== undefined) admin.hourlyRate     = parseFloat(extra.hourlyRate)    || 0;
    if (extra.lessonDuration !== undefined) admin.lessonDuration = parseInt(extra.lessonDuration)  || 60;
    if (extra.notes !== undefined) admin.notes = String(extra.notes).slice(0, 500);
    if (extra.phone !== undefined) admin.phone = String(extra.phone).slice(0, 30);
    list.push(admin);
    save(list);
    return admin;
  },

  update(id, patch) {
    const list = load();
    const idx  = list.findIndex(a => a.id === id);
    if (idx === -1) return null;
    ['name', 'hourlyRate', 'lessonDuration', 'notes', 'phone', 'paymentType', 'monthlyRate'].forEach(k => {
      if (!(k in patch)) return;
      if (k === 'hourlyRate' || k === 'monthlyRate') list[idx][k] = parseFloat(patch[k]) || 0;
      else if (k === 'lessonDuration') list[idx][k] = parseInt(patch[k]) || 60;
      else if (k === 'paymentType')    list[idx][k] = String(patch[k]).slice(0, 20);
      else                             list[idx][k] = String(patch[k]).slice(0, 500);
    });
    list[idx].updatedAt = now();
    save(list);
    return list[idx];
  },

  regenerateToken(id) {
    const list  = load();
    const admin = list.find(a => a.id === id);
    if (!admin) return null;
    admin.token    = genToken();
    admin.active   = true;
    admin.updatedAt = now();
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
