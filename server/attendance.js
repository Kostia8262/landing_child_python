'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'attendance.json');

if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}', 'utf8');

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return {}; }
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// status: 'present' | 'absent' | 'makeup' | 'cancelled' | '' (remove)
const STATUS_VALUES = ['present', 'absent', 'makeup', 'cancelled'];

module.exports = {
  STATUS_VALUES,

  // Get all attendance records for a specific month
  getMonth(year, month) {
    const all = load();
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const result = {};
    Object.keys(all).forEach(clientId => {
      const monthData = {};
      Object.keys(all[clientId]).forEach(date => {
        if (date.startsWith(prefix)) monthData[date] = all[clientId][date];
      });
      if (Object.keys(monthData).length > 0) result[clientId] = monthData;
    });
    return result;
  },

  setRecord(clientId, date, status) {
    const all = load();
    const cId = String(clientId);
    if (!all[cId]) all[cId] = {};
    if (!status || status === '') {
      delete all[cId][date];
      if (Object.keys(all[cId]).length === 0) delete all[cId];
    } else {
      if (!STATUS_VALUES.includes(status)) return false;
      all[cId][date] = status;
    }
    save(all);
    return true;
  },

  getAll() { return load(); },
};
