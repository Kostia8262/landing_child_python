'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'monthly-payments.json');

if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}', 'utf8');

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return {}; }
}
function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 'pending' = not yet paid | 'paid' = fully paid | 'partial' = partially paid
// 'waived' = exempt from payment | 'completed' = finished course
const STATUS_VALUES = ['pending', 'paid', 'partial', 'waived', 'completed'];

const METHOD_VALUES = ['cash', 'card', 'wayforpay', 'googlepay', 'applepay', 'transfer', 'other'];

module.exports = {
  STATUS_VALUES,
  METHOD_VALUES,

  getAllMonths() {
    return Object.keys(load()).sort();
  },

  getMonth(ym) {
    return load()[ym] || null;
  },

  createMonth(ym, records) {
    const all = load();
    if (all[ym]) return { alreadyExists: true, records: all[ym] };
    all[ym] = records;
    save(all);
    return { alreadyExists: false, records: all[ym] };
  },

  updateRecord(ym, clientId, patch) {
    const all = load();
    if (!all[ym]) return null;
    const idx = all[ym].findIndex(r => r.clientId === parseInt(clientId));
    if (idx === -1) return null;
    const allowed = ['expectedAmount','paidAmount','status','paidDate','method','note','clientName'];
    allowed.forEach(k => { if (k in patch) all[ym][idx][k] = patch[k]; });
    save(all);
    return all[ym][idx];
  },

  removeRecord(ym, clientId) {
    const all = load();
    if (!all[ym]) return false;
    const before = all[ym].length;
    all[ym] = all[ym].filter(r => r.clientId !== parseInt(clientId));
    if (all[ym].length === before) return false;
    save(all);
    return true;
  },

  addRecord(ym, record) {
    const all = load();
    if (!all[ym]) return false;
    all[ym].push(record);
    save(all);
    return true;
  },

  syncClientName(clientId, newName) {
    const all = load();
    let changed = false;
    Object.keys(all).forEach(ym => {
      all[ym].forEach(r => {
        if (r.clientId === clientId) { r.clientName = newName; changed = true; }
      });
    });
    if (changed) save(all);
    return changed;
  },

  // Create or update a record (upsert). Used when a "virtual" client row is first edited.
  upsertRecord(ym, clientId, data) {
    const all = load();
    if (!all[ym]) return null;
    const cid = parseInt(clientId);
    const idx = all[ym].findIndex(r => r.clientId === cid);
    const { _virtual, ...d } = data;
    if (idx !== -1) {
      const allowed = ['expectedAmount','paidAmount','status','paidDate','method','note','clientName'];
      allowed.forEach(k => { if (k in d) all[ym][idx][k] = d[k]; });
      save(all);
      return all[ym][idx];
    }
    const record = {
      clientId: cid,
      clientName: d.clientName || '',
      expectedAmount: d.expectedAmount ?? 0,
      paidAmount: d.paidAmount ?? 0,
      status: STATUS_VALUES.includes(d.status) ? d.status : 'pending',
      paidDate: d.paidDate ?? null,
      method: METHOD_VALUES.includes(d.method) ? d.method : null,
      note: d.note ?? '',
    };
    all[ym].push(record);
    save(all);
    return record;
  },

  deleteMonth(ym) {
    const all = load();
    if (!all[ym]) return false;
    delete all[ym];
    save(all);
    return true;
  },
};
