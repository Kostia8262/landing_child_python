/**
 * MY COMPUTER ACADEMY — Express Server (production-ready)
 *
 * Endpoints:
 *   POST   /api/leads        — save lead from form
 *   GET    /api/leads        — list leads (ADMIN_TOKEN required)
 *   GET    /api/leads/stats  — stats (ADMIN_TOKEN required)
 *   PATCH  /api/leads/:id    — update status/notes
 *   DELETE /api/leads/:id    — delete lead
 *
 * Start: npm start
 * Dev:   npm run dev
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const db           = require('./database');
const { sendLeadNotification } = require('./mailer');

const app          = express();
const PORT         = process.env.PORT || 3000;
const ADMIN_TOKEN  = process.env.ADMIN_TOKEN;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

// ── SECURITY: warn if token is missing ──────────────────────────────────────
if (!ADMIN_TOKEN || ADMIN_TOKEN === 'changeme-secret-token') {
  console.warn('⚠️  WARNING: ADMIN_TOKEN is not set or uses default value!');
  console.warn('   Set a strong token in .env before deploying to production.');
}

// ── SECURITY HEADERS (helmet) ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:", "https:"],
      connectSrc:  ["'self'"],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // needed for Google Fonts
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN.split(',').map(s => s.trim()),
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-token'],
}));

// ── BODY PARSING ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
// Public: 10 form submissions per 15 minutes per IP
const leadsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Забагато запитів. Спробуйте через 15 хвилин.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin: 100 requests per 15 minutes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests.' },
});

// ── STATIC FILES ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..'), {
  maxAge: '1d',           // cache static assets 1 day
  etag: true,
  index: 'index.html',
}));

// ── HELPERS ───────────────────────────────────────────────────────────────────
function sanitize(str) {
  if (!str) return '';
  return String(str).trim().slice(0, 500).replace(/[<>]/g, '');
}

function validateLead(data) {
  const errors = [];
  if (!data.child_name || data.child_name.trim().length < 2) {
    errors.push('child_name: мінімум 2 символи');
  }
  const phoneDigits = (data.phone || '').replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    errors.push('phone: невірний формат');
  }
  if (data.age && (isNaN(data.age) || data.age < 5 || data.age > 18)) {
    errors.push('age: від 5 до 18');
  }
  return errors;
}

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ── ROUTES ────────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// POST /api/leads — submit lead (rate-limited)
app.post('/api/leads', leadsLimiter, (req, res) => {
  const { child_name, age, course, phone, parent_name } = req.body;

  const errors = validateLead({ child_name, phone, age });
  if (errors.length) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  try {
    const sanitized = {
      child_name:  sanitize(child_name),
      age:         age ? parseInt(age) : null,
      course:      sanitize(course) || null,
      phone:       sanitize(phone),
      parent_name: sanitize(parent_name) || null,
    };

    const result = db.insertLead(sanitized);
    console.log(`[LEAD #${result.id}] ${sanitized.child_name} | ${sanitized.phone} | ${sanitized.course || '—'}`);

    // Send email notification (non-blocking — lead is saved regardless)
    sendLeadNotification({ ...sanitized, id: result.id }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Заявку прийнято! Ми передзвонимо протягом 30 хвилин.',
      id: result.id,
    });
  } catch (err) {
    console.error('[LEAD ERROR]', err.message);
    res.status(500).json({ error: 'Помилка сервера. Зателефонуйте нам.' });
  }
});

// GET /api/leads — admin only
app.get('/api/leads', adminLimiter, requireAdmin, (req, res) => {
  try {
    const leads = db.getAllLeads();
    res.json({ success: true, count: leads.length, leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/stats
app.get('/api/leads/stats', adminLimiter, requireAdmin, (req, res) => {
  try {
    res.json({ success: true, stats: db.getStats() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:id
app.get('/api/leads/:id', adminLimiter, requireAdmin, (req, res) => {
  const lead = db.getLeadById(parseInt(req.params.id));
  if (!lead) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, lead });
});

// PATCH /api/leads/:id
app.patch('/api/leads/:id', adminLimiter, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { status, notes } = req.body;
  const valid = ['new', 'contacted', 'trial_scheduled', 'enrolled', 'rejected'];
  try {
    if (status) {
      if (!valid.includes(status)) return res.status(400).json({ error: `Статус: ${valid.join(', ')}` });
      db.updateStatus(id, status);
    }
    if (notes !== undefined) db.updateNotes(id, sanitize(notes));
    res.json({ success: true, lead: db.getLeadById(id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:id
app.delete('/api/leads/:id', adminLimiter, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const r = db.deleteLead(id);
    if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, message: `Lead #${id} deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── START ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n  ╔═══════════════════════════════════╗`);
  console.log(`  ║  My Computer Academy              ║`);
  console.log(`  ║  http://localhost:${PORT}             ║`);
  console.log(`  ╚═══════════════════════════════════╝\n`);
  console.log(`  Admin UI: http://localhost:${PORT}/admin`);
  console.log(`  Leads: POST /api/leads\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  ❌ Порт ${PORT} уже занят другим процессом.`);
    console.error(`  Завершите его командой:`);
    console.error(`  PowerShell: Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process -Force`);
    console.error(`  Затем запустите npm start снова.\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

process.on('SIGINT',  () => { db.close(); process.exit(0); });
process.on('SIGTERM', () => { db.close(); process.exit(0); });
