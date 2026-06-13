'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'clients.json');

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
  return arr.length > 0 ? Math.max(...arr.map(c => c.id || 0)) + 1 : 1;
}

function nowIso() { return new Date().toISOString(); }

const STATUS_VALUES      = ['new', 'trial', 'active', 'paused', 'completed', 'churned'];
const SOURCE_VALUES      = ['website', 'referral', 'social', 'phone', 'walk-in', 'other'];
const LESSON_TYPE_VALUES = ['individual', 'adult', 'group', 'group2'];

module.exports = {
  STATUS_VALUES,
  SOURCE_VALUES,
  LESSON_TYPE_VALUES,

  getAll() { return load(); },

  getById(id) { return load().find(c => c.id === id) || null; },

  create(data) {
    const clients = load();
    const client = {
      id:           nextId(clients),
      name:         data.name         || '',
      age:          data.age          ?? null,
      course:       data.course       || null,
      phone:        data.phone        || '',
      email:        data.email        || null,
      status:       STATUS_VALUES.includes(data.status) ? data.status : 'new',
      source:       SOURCE_VALUES.includes(data.source) ? data.source : 'website',
      enrolledDate: data.enrolledDate || null,
      trialDate:    data.trialDate    || null,
      lastContact:  data.lastContact  || null,
      nextContact:  data.nextContact  || null,
      monthlyFee:   data.monthlyFee   ?? null,
      totalPaid:    data.totalPaid    ?? null,
      notes:        data.notes        || '',
      manager:      data.manager      || '',
      teacher:      data.teacher      || '',
      schedule:     data.schedule     || '',
      scheduleDays: Array.isArray(data.scheduleDays) ? data.scheduleDays : [],
      lessonType:   LESSON_TYPE_VALUES.includes(data.lessonType) ? data.lessonType : 'group',
      city:         data.city         || '',
      sourceLeadId: data.sourceLeadId ?? null,
      createdAt:    data.createdAt    || nowIso(),
      updatedAt:    nowIso(),
    };
    clients.unshift(client);
    save(clients);
    return client;
  },

  update(id, data) {
    const clients = load();
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return null;
    const allowed = ['name','age','course','phone','email','status','source',
      'enrolledDate','trialDate','lastContact','nextContact','monthlyFee','totalPaid',
      'notes','manager','teacher','schedule','scheduleDays','lessonType','city','sourceLeadId'];
    const patch = {};
    allowed.forEach(k => { if (k in data) patch[k] = data[k]; });
    if (patch.status     && !STATUS_VALUES.includes(patch.status))           delete patch.status;
    if (patch.source     && !SOURCE_VALUES.includes(patch.source))           delete patch.source;
    if (patch.lessonType && !LESSON_TYPE_VALUES.includes(patch.lessonType))  delete patch.lessonType;
    clients[idx] = { ...clients[idx], ...patch, id, updatedAt: nowIso() };
    save(clients);
    return clients[idx];
  },

  delete(id) {
    const clients = load();
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) return false;
    clients.splice(idx, 1);
    save(clients);
    return true;
  },

  getStats() {
    const clients = load();
    const s = { total: clients.length };
    STATUS_VALUES.forEach(v => { s[v] = clients.filter(c => c.status === v).length; });
    return s;
  },
};
