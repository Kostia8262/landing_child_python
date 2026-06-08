'use strict';

/**
 * MY COMPUTER ACADEMY — JSON file storage (no native deps, works on all platforms)
 * Data is stored in data/leads.json — created automatically on first run.
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'leads.json');

if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function save(leads) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), 'utf8');
}

function nextId(leads) {
  return leads.length > 0 ? Math.max(...leads.map(l => l.id)) + 1 : 1;
}

function now() {
  return new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' });
}

module.exports = {
  insertLead(data) {
    const leads = load();
    const lead = {
      id:          nextId(leads),
      child_name:  data.child_name,
      age:         data.age   ?? null,
      course:      data.course ?? null,
      phone:       data.phone,
      parent_name: data.parent_name ?? null,
      status:      'new',
      notes:       null,
      created_at:  now(),
      updated_at:  now(),
    };
    leads.unshift(lead);
    save(leads);
    return { id: lead.id, changes: 1 };
  },

  getAllLeads() {
    return load();
  },

  getLeadById(id) {
    return load().find(l => l.id === id) || null;
  },

  updateStatus(id, status) {
    const leads = load();
    const lead  = leads.find(l => l.id === id);
    if (lead) { lead.status = status; lead.updated_at = now(); save(leads); }
    return { changes: lead ? 1 : 0 };
  },

  updateNotes(id, notes) {
    const leads = load();
    const lead  = leads.find(l => l.id === id);
    if (lead) { lead.notes = notes; lead.updated_at = now(); save(leads); }
    return { changes: lead ? 1 : 0 };
  },

  deleteLead(id) {
    const leads = load();
    const idx   = leads.findIndex(l => l.id === id);
    if (idx >= 0) { leads.splice(idx, 1); save(leads); return { changes: 1 }; }
    return { changes: 0 };
  },

  getStats() {
    const leads    = load();
    const statusMap = {};
    leads.forEach(l => { statusMap[l.status] = (statusMap[l.status] || 0) + 1; });
    return {
      total:    leads.length,
      byStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    };
  },

  close() {},
};
