'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'payments.json');

if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function nextId(arr) {
  return arr.length > 0 ? Math.max(...arr.map(p => p.id || 0)) + 1 : 1;
}

const METHOD_VALUES = ['cash', 'card', 'wayforpay', 'googlepay', 'applepay', 'transfer', 'other'];

module.exports = {
  METHOD_VALUES,

  getAll(clientId) {
    const all = load();
    return clientId ? all.filter(p => p.clientId === parseInt(clientId)) : all;
  },

  create(data) {
    const payments = load();
    const payment = {
      id:       nextId(payments),
      clientId: parseInt(data.clientId),
      amount:   parseFloat(data.amount) || 0,
      date:     data.date || new Date().toISOString().slice(0, 10),
      method:   METHOD_VALUES.includes(data.method) ? data.method : 'other',
      note:     data.note || '',
      createdAt: new Date().toISOString(),
    };
    payments.unshift(payment);
    save(payments);
    return payment;
  },

  delete(id) {
    const payments = load();
    const idx = payments.findIndex(p => p.id === id);
    if (idx === -1) return false;
    payments.splice(idx, 1);
    save(payments);
    return true;
  },

  getTotalForClient(clientId) {
    return load()
      .filter(p => p.clientId === parseInt(clientId))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  },

  getById(id) {
    return load().find(p => p.id === id) || null;
  },
};
