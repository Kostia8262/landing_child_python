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
const fs           = require('fs');
const db             = require('./database');
const adminsDb       = require('./admins');
const clientsDb      = require('./clients');
const paymentsDb     = require('./payments');
const attendanceDb   = require('./attendance');
const monthlyPayDb   = require('./monthly-payments');
const coursesDb      = require('./courses');
const articlesDb     = require('./articles');
const reviewsDb      = require('./reviews');
const { sendLeadNotification } = require('./mailer');

const CONTENT_FILE = path.join(__dirname, '..', 'data', 'content.json');

// ── STARTUP SEED (test teachers + demo clients) ───────────────────────────────
(function seedTestData() {
  try {
    if (!adminsDb.getAll().some(a => a.role === 'teacher')) {
      adminsDb.create('Богдан Коваль',   'teacher', { hourlyRate: 150, lessonDuration: 60, phone: '+380501234567', notes: 'Веб-розробка, Python' });
      adminsDb.create('Аліна Петренко',  'teacher', { hourlyRate: 130, lessonDuration: 60, phone: '+380671234568', notes: 'Scratch, Roblox' });
      console.log('✅  Seeded 2 test teachers');
    }
    if (!clientsDb.getAll().some(c => c.scheduleDays && c.scheduleDays.length > 0)) {
      [
        { name: 'Марко Тищенко',    age: 10, course: 'scratch', phone: '+380501001001', status: 'active', teacher: 'Аліна Петренко', lessonType: 'group',      scheduleDays: [{day:'1',time:'15:00'},{day:'4',time:'15:00'}], schedule: 'Пн 15:00, Чт 15:00' },
        { name: 'Діана Коваль',     age: 12, course: 'python',  phone: '+380502002002', status: 'active', teacher: 'Богдан Коваль',  lessonType: 'group',      scheduleDays: [{day:'2',time:'16:00'},{day:'5',time:'16:00'}], schedule: 'Вт 16:00, Пт 16:00' },
        { name: 'Артем Мороз',      age: 14, course: 'web',     phone: '+380503003003', status: 'active', teacher: 'Богдан Коваль',  lessonType: 'individual', scheduleDays: [{day:'3',time:'17:00'}],                       schedule: 'Ср 17:00' },
        { name: 'Соня Петрик',      age: 11, course: 'roblox',  phone: '+380504004004', status: 'active', teacher: 'Аліна Петренко', lessonType: 'group',      scheduleDays: [{day:'3',time:'14:30'}],                       schedule: 'Ср 14:30' },
        { name: 'Данило Романів',   age:  9, course: 'scratch', phone: '+380505005005', status: 'active', teacher: 'Аліна Петренко', lessonType: 'group',      scheduleDays: [{day:'6',time:'10:00'}],                       schedule: 'Сб 10:00' },
        { name: 'Вікторія Лисенко', age: 13, course: 'python',  phone: '+380506006006', status: 'active', teacher: 'Богдан Коваль',  lessonType: 'group',      scheduleDays: [{day:'2',time:'18:00'}],                       schedule: 'Вт 18:00' },
      ].forEach(c => clientsDb.create(c));
      console.log('✅  Seeded 6 test clients with schedule data');
    }
  } catch(e) { console.warn('Seed warning:', e.message); }
})();

function loadContent() {
  try { return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8')); } catch { return {}; }
}
function saveContent(data) { fs.writeFileSync(CONTENT_FILE, JSON.stringify(data, null, 2), 'utf8'); }

const app            = express();
const PORT           = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
// Support both SUPERADMIN_TOKEN (new) and ADMIN_TOKEN (legacy)
const SUPERADMIN_TOKEN = process.env.SUPERADMIN_TOKEN || process.env.ADMIN_TOKEN;

if (!SUPERADMIN_TOKEN) {
  console.warn('⚠️  WARNING: SUPERADMIN_TOKEN / ADMIN_TOKEN is not set in .env!');
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
      connectSrc:     ["'self'"],
      frameSrc:       ["'none'"],
      objectSrc:      ["'none'"],
      scriptSrcAttr:  ["'unsafe-inline'"], // allow onclick/onchange in admin panel
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // needed for Google Fonts
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN.split(',').map(s => s.trim()),
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-token'],
}));

// ── BODY PARSING ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: false, limit: '12mb' }));

// ── RATE LIMITING ─────────────────────────────────────────────────────────────
// Public: 10 form submissions per 15 minutes per IP
const leadsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Забагато запитів. Спробуйте через 15 хвилин.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin: dashboard makes ~11 requests per load (parallel monthly-payments fetches).
// 500/15min gives ~45 full dashboard reloads before limiting — plenty for normal use.
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
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

// Returns 'superadmin' | 'admin' | null
function getRole(token) {
  if (!token) return null;
  if (SUPERADMIN_TOKEN && token === SUPERADMIN_TOKEN) return 'superadmin';
  if (adminsDb.findByToken(token)) return 'admin';
  return null;
}

// Safe ID pattern — prevents path traversal / injection
const SAFE_ID_RE = /^[a-z0-9_-]{1,64}$/i;

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  const role  = getRole(token);
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  req.role  = role;
  req.token = token;
  next();
}

function requireSuperAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!SUPERADMIN_TOKEN || token !== SUPERADMIN_TOKEN) {
    return res.status(403).json({ error: 'Forbidden: superadmin only' });
  }
  req.role  = 'superadmin';
  req.token = token;
  next();
}

function requireNotTeacher(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (SUPERADMIN_TOKEN && token === SUPERADMIN_TOKEN) return next();
  const admin = adminsDb.findByToken(token);
  if (admin && admin.role === 'teacher') {
    return res.status(403).json({ error: 'Forbidden: teacher access restricted' });
  }
  next();
}

// Teacher-role guard: allow only attendance + client read + me + alerts
// req.path inside app.use('/api', ...) is relative to /api (e.g. '/me', '/clients')
const TEACHER_ALLOWED = ['/me', '/health', '/attendance', '/clients', '/alerts', '/teachers'];
app.use('/api', (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (!token || (SUPERADMIN_TOKEN && token === SUPERADMIN_TOKEN)) return next();
  const admin = adminsDb.findByToken(token);
  if (!admin || admin.role !== 'teacher') return next();
  const allowed = TEACHER_ALLOWED.some(p => req.path === p || req.path.startsWith(p + '/') || req.path.startsWith(p + '?'));
  if (!allowed) return res.status(403).json({ error: 'Forbidden: teacher access restricted' });
  if (req.path.startsWith('/clients') && req.method !== 'GET') {
    return res.status(403).json({ error: 'Forbidden: teacher access restricted' });
  }
  next();
});

// ── ROUTES ────────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET /api/me — returns current user role
app.get('/api/me', adminLimiter, requireAdmin, (req, res) => {
  if (req.role === 'superadmin') {
    return res.json({ success: true, role: 'superadmin', name: 'Супер-адмін' });
  }
  const a = adminsDb.findByToken(req.token);
  res.json({ success: true, role: a?.role || 'administrator', name: a?.name || 'Адмін' });
});

// ── ADMIN MANAGEMENT (superadmin only) ───────────────────────────────────────
app.get('/api/admins', adminLimiter, requireSuperAdmin, (req, res) => {
  res.json({ success: true, admins: adminsDb.getAll() });
});

// GET /api/teachers — list active teachers (any admin; no tokens exposed)
app.get('/api/teachers', adminLimiter, requireAdmin, (req, res) => {
  const teachers = adminsDb.getAll()
    .filter(a => a.role === 'teacher' && a.active)
    .map(a => ({ id: a.id, name: a.name }));
  res.json({ success: true, teachers });
});

app.post('/api/admins', adminLimiter, requireSuperAdmin, (req, res) => {
  const name = sanitize(req.body.name || '');
  const role = sanitize(req.body.role || 'administrator');
  if (!name || name.length < 2) return res.status(400).json({ error: 'Вкажіть ім\'я адміністратора' });
  // Security: never allow creating superadmin via API
  if (!adminsDb.ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Недійсна роль' });
  }
  const admin = adminsDb.create(name, role);
  res.status(201).json({ success: true, admin });
});

app.patch('/api/admins/:id/revoke', adminLimiter, requireSuperAdmin, (req, res) => {
  const admin = adminsDb.revoke(parseInt(req.params.id));
  if (!admin) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, admin });
});

app.delete('/api/admins/:id', adminLimiter, requireSuperAdmin, (req, res) => {
  const ok = adminsDb.delete(parseInt(req.params.id));
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// Teacher profile update (superadmin only)
app.patch('/api/admins/:id/profile', adminLimiter, requireSuperAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid ID' });
  const patch = {};
  const { name, hourlyRate, lessonDuration, notes, phone, paymentType, monthlyRate } = req.body;
  if (name           !== undefined) patch.name           = sanitize(name);
  if (hourlyRate     !== undefined) patch.hourlyRate     = parseFloat(hourlyRate)    || 0;
  if (lessonDuration !== undefined) patch.lessonDuration = parseInt(lessonDuration)  || 60;
  if (notes          !== undefined) patch.notes          = sanitize(notes);
  if (phone          !== undefined) patch.phone          = sanitize(phone);
  if (paymentType    !== undefined) patch.paymentType    = sanitize(paymentType);
  if (monthlyRate    !== undefined) patch.monthlyRate    = parseFloat(monthlyRate)   || 0;
  const admin = adminsDb.update(id, patch);
  if (!admin) return res.status(404).json({ error: 'Не знайдено' });
  res.json({ success: true, admin });
});

// Regenerate token for revoked admin (superadmin only)
app.post('/api/admins/:id/regenerate-token', adminLimiter, requireSuperAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid ID' });
  const admin = adminsDb.regenerateToken(id);
  if (!admin) return res.status(404).json({ error: 'Не знайдено' });
  res.json({ success: true, admin });
});

// Staff document upload (base64 JSON) — superadmin only
const STAFF_DOCS_DIR = path.join(__dirname, '..', 'data', 'staff-docs');

app.post('/api/admins/:id/docs', adminLimiter, requireSuperAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid ID' });
  const { name: fileName, data: b64 } = req.body;
  if (!fileName || !b64) return res.status(400).json({ error: 'Потрібні name і data' });
  const safeName = sanitize(fileName).replace(/[^a-zA-Z0-9_\-\.а-яА-ЯіІїЇєЄ]/gu, '_').slice(0, 120);
  if (!safeName) return res.status(400).json({ error: 'Недійсна назва файлу' });
  try {
    const dir = path.join(STAFF_DOCS_DIR, String(id));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const buf = Buffer.from(b64, 'base64');
    if (buf.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'Файл завеликий (макс 8 МБ)' });
    fs.writeFileSync(path.join(dir, safeName), buf);
    res.json({ success: true, name: safeName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admins/:id/docs', adminLimiter, requireSuperAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid ID' });
  const dir = path.join(STAFF_DOCS_DIR, String(id));
  if (!fs.existsSync(dir)) return res.json({ success: true, docs: [] });
  const docs = fs.readdirSync(dir).filter(f => !f.startsWith('.')).map(f => {
    const stat = fs.statSync(path.join(dir, f));
    return { name: f, size: stat.size, mtime: stat.mtime };
  });
  res.json({ success: true, docs });
});

app.delete('/api/admins/:id/docs/:filename', adminLimiter, requireSuperAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const filename = req.params.filename;
  if (!id || !filename) return res.status(400).json({ error: 'Invalid params' });
  const filePath = path.join(STAFF_DOCS_DIR, String(id), filename);
  if (!filePath.startsWith(STAFF_DOCS_DIR)) return res.status(400).json({ error: 'Invalid path' });
  try {
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admins/:id/docs/:filename', adminLimiter, requireSuperAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const filename = req.params.filename;
  if (!id || !filename) return res.status(400).json({ error: 'Invalid params' });
  const filePath = path.join(STAFF_DOCS_DIR, String(id), filename);
  if (!filePath.startsWith(STAFF_DOCS_DIR)) return res.status(400).json({ error: 'Invalid path' });
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  res.download(filePath, filename);
});

// Teacher salary calculation (superadmin only)
app.get('/api/admins/:id/salary', adminLimiter, requireSuperAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const admin = adminsDb.getById(id);
  if (!admin) return res.status(404).json({ error: 'Не знайдено' });
  const ym = req.query.ym || new Date().toISOString().slice(0, 7);
  const [year, month] = ym.split('-').map(Number);
  const allClients     = clientsDb.getAll();
  const teacherClients = allClients.filter(c => c.teacher === admin.name);
  const attData        = attendanceDb.getMonth(year, month);
  const breakdown = [];
  let totalLessons = 0;
  teacherClients.forEach(c => {
    const clientAtt = attData[String(c.id)] || {};
    const lessons = Object.values(clientAtt).filter(v => ['present', 'absent', 'makeup'].includes(v)).length;
    totalLessons += lessons;
    breakdown.push({ clientId: c.id, clientName: c.name, lessons });
  });
  const hourlyRate     = admin.hourlyRate     || 0;
  const lessonDuration = admin.lessonDuration || 60;
  const totalHours     = (totalLessons * lessonDuration) / 60;
  const totalSalary    = Math.round(totalHours * hourlyRate);
  res.json({ success: true, admin, ym, totalLessons, totalHours, totalSalary, hourlyRate, lessonDuration, breakdown });
});

// POST /api/leads — submit lead (rate-limited)
app.post('/api/leads', leadsLimiter, (req, res) => {
  const { child_name, age, course, phone } = req.body;

  const errors = validateLead({ child_name, phone, age });
  if (errors.length) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  try {
    const { email } = req.body;
    const sanitized = {
      child_name: sanitize(child_name),
      age:        age ? parseInt(age) : null,
      course:     sanitize(course) || null,
      phone:      sanitize(phone),
      email:      sanitize(email) || null,
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

// POST /api/leads/admin — admin-only lead creation (no public rate limit)
app.post('/api/leads/admin', adminLimiter, requireAdmin, (req, res) => {
  const { child_name, age, phone, course, email, teacher, notes } = req.body;
  if (!child_name || child_name.trim().length < 2) return res.status(400).json({ error: 'Вкажіть ім\'я (мін. 2 символи)' });
  if (!phone || String(phone).replace(/\D/g,'').length < 10) return res.status(400).json({ error: 'Невірний формат телефону' });
  try {
    const result = db.insertLead({
      child_name: sanitize(child_name),
      age:        age ? parseInt(age) || null : null,
      course:     sanitize(course || '') || null,
      phone:      sanitize(phone),
      email:      sanitize(email || '') || null,
    });
    const lead = db.getLeadById(result.id);
    if (teacher) db.updateFields(result.id, { teacher: sanitize(teacher) });
    if (notes)   db.updateNotes(result.id, sanitize(notes));
    const fresh = db.getLeadById(result.id);
    res.status(201).json({ success: true, lead: fresh });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
  const { status, notes, child_name, phone, age, course, email, teacher, schedule } = req.body;
  const valid = ['new', 'contacted', 'trial_scheduled', 'enrolled', 'rejected'];
  try {
    // Update editable fields
    const fieldPatch = {};
    if (child_name !== undefined) fieldPatch.child_name = sanitize(child_name);
    if (phone      !== undefined) fieldPatch.phone      = sanitize(phone);
    if (age        !== undefined) fieldPatch.age        = age ? parseInt(age) || null : null;
    if (course     !== undefined) fieldPatch.course     = sanitize(course) || null;
    if (email      !== undefined) fieldPatch.email      = sanitize(email) || null;
    if (teacher    !== undefined) fieldPatch.teacher    = sanitize(teacher) || null;
    if (schedule   !== undefined) fieldPatch.schedule   = sanitize(schedule) || null;
    if (Object.keys(fieldPatch).length) db.updateFields(id, fieldPatch);

    if (status) {
      if (!valid.includes(status)) return res.status(400).json({ error: `Статус: ${valid.join(', ')}` });
      db.updateStatus(id, status);

      // Auto-create client when lead is enrolled.
      // Dedup by sourceLeadId so each lead gets exactly one client even when
      // two leads share the same phone number.
      if (status === 'enrolled') {
        try {
          const lead = db.getLeadById(id);
          if (lead) {
            const alreadyLinked = clientsDb.getAll().find(c => c.sourceLeadId === id);
            if (!alreadyLinked) {
              const today = new Date().toISOString().slice(0, 10);
              const newClient = clientsDb.create({
                name:         lead.child_name,
                age:          lead.age,
                course:       lead.course || null,
                phone:        lead.phone,
                email:        lead.email || null,
                status:       'active',
                source:       'website',
                enrolledDate: today,
                notes:        lead.notes || '',
                teacher:      lead.teacher || null,
                schedule:     lead.schedule || null,
                sourceLeadId: id,
              });
              const ym = new Date().toISOString().slice(0, 7);
              const monthData = monthlyPayDb.getMonth(ym);
              if (monthData) {
                monthlyPayDb.addRecord(ym, {
                  clientId:       newClient.id,
                  clientName:     newClient.name,
                  expectedAmount: 0,
                  paidAmount:     0,
                  status:         'pending',
                  paidDate:       null,
                  method:         null,
                  note:           'Автоматично з заявки #' + lead.id,
                });
              }
              console.log(`[AUTO-CLIENT] Created client #${newClient.id} from lead #${lead.id}`);
            } else {
              console.log(`[AUTO-CLIENT] Lead #${id} already has client #${alreadyLinked.id}, skipping`);
            }
          }
        } catch (autoErr) {
          console.error('[AUTO-CLIENT]', autoErr.message);
        }
      }
    }
    if (notes !== undefined) db.updateNotes(id, sanitize(notes));

    // Sync field changes from lead to its linked client (by sourceLeadId first, phone as fallback)
    if (fieldPatch.child_name || fieldPatch.phone || fieldPatch.teacher || fieldPatch.schedule) {
      try {
        const updatedLead = db.getLeadById(id);
        if (updatedLead) {
          const matchClient = clientsDb.getAll().find(c => c.sourceLeadId === id)
            || (updatedLead.phone ? clientsDb.getAll().find(c => c.phone === updatedLead.phone) : null);
          if (matchClient) {
            const clientPatch = {};
            if (fieldPatch.child_name) clientPatch.name     = fieldPatch.child_name;
            if (fieldPatch.phone)      clientPatch.phone    = fieldPatch.phone;
            if (fieldPatch.teacher)    clientPatch.teacher  = fieldPatch.teacher;
            if (fieldPatch.schedule)   clientPatch.schedule = fieldPatch.schedule;
            const updated = clientsDb.update(matchClient.id, clientPatch);
            if (updated && clientPatch.name) {
              monthlyPayDb.syncClientName(matchClient.id, clientPatch.name);
            }
          }
        }
      } catch (syncErr) {
        console.error('[SYNC lead→client]', syncErr.message);
      }
    }

    res.json({ success: true, lead: db.getLeadById(id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:id — superadmin only
app.delete('/api/leads/:id', adminLimiter, requireSuperAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const r = db.deleteLead(id);
    if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, message: `Lead #${id} deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin panel — no cache so updates apply immediately
app.get('/admin', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});
app.get('/admin.html', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

// Known single-page routes → index.html
const SPA_ROUTES = ['/', '/index.html'];
SPA_ROUTES.forEach(r => app.get(r, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
}));

// ── CLIENTS CRM API ──────────────────────────────────────────────────────────

// Full sanitize — used for POST (create). Always returns all fields.
function sanitizeClient(body) {
  const s = v => sanitize(v);
  return {
    name:         s(body.name),
    age:          body.age ? parseInt(body.age) || null : null,
    course:       s(body.course) || null,
    phone:        s(body.phone),
    email:        s(body.email) || null,
    status:       s(body.status),
    source:       s(body.source),
    enrolledDate: s(body.enrolledDate) || null,
    trialDate:    s(body.trialDate) || null,
    lastContact:  s(body.lastContact) || null,
    nextContact:  s(body.nextContact) || null,
    monthlyFee:   body.monthlyFee != null ? parseFloat(body.monthlyFee) || null : null,
    totalPaid:    body.totalPaid != null ? parseFloat(body.totalPaid) || null : null,
    notes:        s(body.notes),
    manager:      s(body.manager),
    teacher:      s(body.teacher),
    schedule:     s(body.schedule),
    scheduleDays: Array.isArray(body.scheduleDays) ? body.scheduleDays : [],
    lessonType:   s(body.lessonType) || null,
    city:         s(body.city),
  };
}

// Partial sanitize — used for PATCH. Only processes fields actually present in body,
// so a single-field inline save does not overwrite every other field.
function sanitizeClientPatch(body) {
  const s = v => sanitize(v);
  const p = {};
  if ('name'         in body) p.name         = s(body.name);
  if ('age'          in body) p.age          = body.age !== '' && body.age != null ? parseInt(body.age) || null : null;
  if ('course'       in body) p.course       = s(body.course) || null;
  if ('phone'        in body) p.phone        = s(body.phone);
  if ('email'        in body) p.email        = s(body.email) || null;
  if ('status'       in body) p.status       = s(body.status);
  if ('source'       in body) p.source       = s(body.source);
  if ('enrolledDate' in body) p.enrolledDate = s(body.enrolledDate) || null;
  if ('trialDate'    in body) p.trialDate    = s(body.trialDate) || null;
  if ('lastContact'  in body) p.lastContact  = s(body.lastContact) || null;
  if ('nextContact'  in body) p.nextContact  = s(body.nextContact) || null;
  if ('monthlyFee'   in body) p.monthlyFee   = body.monthlyFee !== '' && body.monthlyFee != null ? parseFloat(body.monthlyFee) || null : null;
  if ('totalPaid'    in body) p.totalPaid    = body.totalPaid !== '' && body.totalPaid != null ? parseFloat(body.totalPaid) || null : null;
  if ('notes'        in body) p.notes        = s(body.notes);
  if ('manager'      in body) p.manager      = s(body.manager);
  if ('teacher'      in body) p.teacher      = s(body.teacher);
  if ('schedule'     in body) p.schedule     = s(body.schedule);
  if ('scheduleDays' in body) p.scheduleDays = Array.isArray(body.scheduleDays) ? body.scheduleDays : [];
  if ('lessonType'   in body) p.lessonType   = s(body.lessonType) || null;
  if ('city'         in body) p.city         = s(body.city);
  return p;
}

app.get('/api/clients', adminLimiter, requireAdmin, (req, res) => {
  res.json({ success: true, clients: clientsDb.getAll(), stats: clientsDb.getStats() });
});

app.post('/api/clients', adminLimiter, requireAdmin, (req, res) => {
  const data = sanitizeClient(req.body);
  if (!data.name || data.name.length < 2) return res.status(400).json({ error: 'Вкажіть ім\'я' });
  const client = clientsDb.create(data);
  res.status(201).json({ success: true, client });
});

app.patch('/api/clients/:id', adminLimiter, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const before = clientsDb.getById(id);
  if (!before) return res.status(404).json({ error: 'Not found' });
  const data = sanitizeClientPatch(req.body);
  const client = clientsDb.update(id, data);
  if (!client) return res.status(404).json({ error: 'Not found' });

  // Sync name change → monthly-payments + matching lead
  if (data.name && data.name !== before.name) {
    try {
      monthlyPayDb.syncClientName(id, data.name);
    } catch (e) { console.error('[SYNC client→payments]', e.message); }
    try {
      const matchPhone = client.phone || '';
      const matchLead = matchPhone ? db.getByPhone(matchPhone) : null;
      if (matchLead) db.updateFields(matchLead.id, { child_name: data.name });
    } catch (e) { console.error('[SYNC client→lead]', e.message); }
  }
  // Sync phone change → matching lead
  if (data.phone && data.phone !== before.phone) {
    try {
      const matchLead = db.getByPhone(before.phone);
      if (matchLead) db.updateFields(matchLead.id, { phone: data.phone });
    } catch (e) { console.error('[SYNC client phone→lead]', e.message); }
  }

  res.json({ success: true, client });
});

app.delete('/api/clients/:id', adminLimiter, requireSuperAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const ok = clientsDb.delete(id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// ── ALERTS API ────────────────────────────────────────────────────────────────
function parseUkDate(s) {
  if (!s) return null;
  const [datePart, timePart] = String(s).split(', ');
  if (!datePart) return null;
  const [day, month, year] = datePart.split('.');
  if (!year) return null;
  return new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}`);
}

app.get('/api/alerts', adminLimiter, requireAdmin, (req, res) => {
  const leads   = db.getAllLeads();
  const clients = clientsDb.getAll();
  const now     = Date.now();
  const H2      = 2  * 60 * 60 * 1000;
  const D3      = 3  * 24 * 60 * 60 * 1000;
  const D7      = 7  * 24 * 60 * 60 * 1000;
  const D30     = 30 * 24 * 60 * 60 * 1000;
  const alerts  = [];

  // 1. New leads not contacted > 2h
  const uncontacted = leads.filter(l => {
    if (l.status !== 'new') return false;
    const d = parseUkDate(l.created_at);
    return d && (now - d.getTime()) > H2;
  });
  if (uncontacted.length) alerts.push({
    type: 'leads_uncontacted', severity: 'high', count: uncontacted.length,
    message: `${uncontacted.length} нових заявок не прозвонені більше 2 годин`,
    hint: 'Зателефонуйте негайно — шанс конверсії падає з кожною годиною',
    ids: uncontacted.map(l => l.id), tab: 'leads',
  });

  // 2. Leads in contacted/trial_scheduled > 3 days without update
  const stale = leads.filter(l => {
    if (!['contacted', 'trial_scheduled'].includes(l.status)) return false;
    const d = parseUkDate(l.updated_at);
    return d && (now - d.getTime()) > D3;
  });
  if (stale.length) alerts.push({
    type: 'leads_stale', severity: 'medium', count: stale.length,
    message: `${stale.length} заявок без оновлення більше 3 днів`,
    hint: 'Перенабрати — можливо, клієнт передумав або забув',
    ids: stale.map(l => l.id), tab: 'leads',
  });

  // 3. Trial scheduled > 7 days not moved to enrolled
  const trialPending = leads.filter(l => {
    if (l.status !== 'trial_scheduled') return false;
    const d = parseUkDate(l.updated_at);
    return d && (now - d.getTime()) > D7;
  });
  if (trialPending.length) alerts.push({
    type: 'leads_trial_pending', severity: 'medium', count: trialPending.length,
    message: `${trialPending.length} пробних уроків не завершено записом`,
    hint: 'З\'ясуйте результат пробного уроку та запропонуйте запис',
    ids: trialPending.map(l => l.id), tab: 'leads',
  });

  // 4. Clients with overdue nextContact
  const overdueClients = clients.filter(c => {
    if (!c.nextContact || !['active','trial','paused'].includes(c.status)) return false;
    return new Date(c.nextContact) < new Date();
  });
  if (overdueClients.length) alerts.push({
    type: 'clients_overdue', severity: 'medium', count: overdueClients.length,
    message: `${overdueClients.length} клієнтів — прострочений дзвінок`,
    hint: 'Дата наступного контакту вже минула — зателефонуйте сьогодні',
    ids: overdueClients.map(c => c.id), tab: 'clients',
  });

  // 5. Paused clients > 30 days
  const longPaused = clients.filter(c => {
    if (c.status !== 'paused') return false;
    const d = new Date(c.updatedAt);
    return !isNaN(d) && (now - d.getTime()) > D30;
  });
  if (longPaused.length) alerts.push({
    type: 'clients_paused', severity: 'low', count: longPaused.length,
    message: `${longPaused.length} клієнтів на паузі більше 30 днів`,
    hint: 'Нагадайте про себе — після відпустки або канікул добре "утеплити" контакт',
    ids: longPaused.map(c => c.id), tab: 'clients',
  });

  const total = alerts.reduce((s, a) => s + a.count, 0);
  res.json({ success: true, alerts, total });
});

// ── CSV IMPORT API ────────────────────────────────────────────────────────────
app.post('/api/leads/import', adminLimiter, requireAdmin, (req, res) => {
  const rows = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'Expected array' });
  let imported = 0;
  const errors = [];
  rows.forEach((row, i) => {
    try {
      const name = sanitize(row.name || row.child_name || '');
      const phone = sanitize(row.phone || '');
      if (name.length >= 2 && phone) {
        db.insertLead({
          child_name: name,
          age:    row.age ? parseInt(row.age) || null : null,
          course: sanitize(row.course) || null,
          phone,
          email:  sanitize(row.email) || null,
        });
        imported++;
      }
    } catch (e) { errors.push(`Row ${i}: ${e.message}`); }
  });
  res.json({ success: true, imported, errors });
});

app.post('/api/clients/import', adminLimiter, requireAdmin, (req, res) => {
  const rows = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'Expected array' });
  let imported = 0;
  const errors = [];
  rows.forEach((row, i) => {
    try {
      const name = sanitize(row.name || row.child_name || '');
      const phone = sanitize(row.phone || '');
      if (name.length >= 2 && phone) {
        clientsDb.create(sanitizeClient({ ...row, name, phone }));
        imported++;
      }
    } catch (e) { errors.push(`Row ${i}: ${e.message}`); }
  });
  res.json({ success: true, imported, errors });
});

// ── PAYMENTS API ─────────────────────────────────────────────────────────────
app.get('/api/payments', adminLimiter, requireAdmin, (req, res) => {
  const clientId = req.query.clientId ? parseInt(req.query.clientId) : null;
  res.json({ success: true, payments: paymentsDb.getAll(clientId) });
});

app.post('/api/payments', adminLimiter, requireAdmin, (req, res) => {
  const { clientId, amount, date, method, note } = req.body;
  if (!clientId) return res.status(400).json({ error: 'clientId обов\'язковий' });
  if (!amount || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Сума має бути більше 0' });
  const payment = paymentsDb.create({
    clientId, amount, date: date || new Date().toISOString().slice(0, 10),
    method: sanitize(method || 'other'),
    note: sanitize(note || ''),
  });
  // Recalculate totalPaid for client from payment history
  const total = paymentsDb.getTotalForClient(parseInt(clientId));
  clientsDb.update(parseInt(clientId), { totalPaid: total });
  res.status(201).json({ success: true, payment });
});

app.delete('/api/payments/:id', adminLimiter, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const payment = paymentsDb.getById(id);
  if (!payment) return res.status(404).json({ error: 'Not found' });
  paymentsDb.delete(id);
  const total = paymentsDb.getTotalForClient(payment.clientId);
  clientsDb.update(payment.clientId, { totalPaid: total });
  res.json({ success: true });
});

// ── MONTHLY PAYMENTS API ─────────────────────────────────────────────────────
app.get('/api/monthly-payments', adminLimiter, requireAdmin, (req, res) => {
  res.json({ success: true, months: monthlyPayDb.getAllMonths() });
});

app.get('/api/monthly-payments/:ym', adminLimiter, requireAdmin, (req, res) => {
  const { ym } = req.params;
  if (!/^\d{4}-\d{2}$/.test(ym)) return res.status(400).json({ error: 'Format: YYYY-MM' });
  const records = monthlyPayDb.getMonth(ym);
  res.json({ success: true, ym, records: records || [] });
});

app.post('/api/monthly-payments/:ym', adminLimiter, requireAdmin, (req, res) => {
  const { ym } = req.params;
  if (!/^\d{4}-\d{2}$/.test(ym)) return res.status(400).json({ error: 'Format: YYYY-MM' });
  if (!Array.isArray(req.body.records)) return res.status(400).json({ error: 'records[] required' });
  const result = monthlyPayDb.createMonth(ym, req.body.records);
  res.status(result.alreadyExists ? 200 : 201).json({ success: true, ...result });
});

app.patch('/api/monthly-payments/:ym/:clientId', adminLimiter, requireAdmin, (req, res) => {
  const { ym, clientId } = req.params;
  const record = monthlyPayDb.updateRecord(ym, clientId, req.body);
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, record });
});

// Upsert: create record if missing, update if exists (used for "virtual" rows added client-side)
app.put('/api/monthly-payments/:ym/:clientId', adminLimiter, requireAdmin, (req, res) => {
  const { ym, clientId } = req.params;
  if (!monthlyPayDb.getMonth(ym)) return res.status(404).json({ error: 'Month not found' });
  const client = clientsDb.getById(parseInt(clientId));
  // Always take clientName from DB if available — prevents stale/garbled values from client
  const data = { ...req.body, clientName: client?.name || req.body.clientName || '' };
  const record = monthlyPayDb.upsertRecord(ym, clientId, data);
  if (!record) return res.status(404).json({ error: 'Month not found' });
  res.status(200).json({ success: true, record });
});

app.delete('/api/monthly-payments/:ym/:clientId', adminLimiter, requireAdmin, (req, res) => {
  const { ym, clientId } = req.params;
  const ok = monthlyPayDb.removeRecord(ym, parseInt(clientId));
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// ── ATTENDANCE API ────────────────────────────────────────────────────────────
app.get('/api/attendance', adminLimiter, requireAdmin, (req, res) => {
  const year  = parseInt(req.query.year)  || new Date().getFullYear();
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
  res.json({ success: true, year, month, data: attendanceDb.getMonth(year, month) });
});

app.post('/api/attendance', adminLimiter, requireAdmin, (req, res) => {
  const { clientId, date, status } = req.body;
  if (!clientId || !date) return res.status(400).json({ error: 'clientId та date обов\'язкові' });
  const ok = attendanceDb.setRecord(clientId, date, status || '');
  if (ok === false) return res.status(400).json({ error: 'Невірний статус' });
  res.json({ success: true });
});

// ── CONTENT CMS API ──────────────────────────────────────────────────────────
// Public: read all content
app.get('/api/content', (req, res) => {
  res.json(loadContent());
});

// Admin: update a section (pricing | faq | courses | modules)
app.put('/api/content/:section', adminLimiter, requireAdmin, (req, res) => {
  const { section } = req.params;
  const allowed = ['pricing', 'faq', 'courses', 'modules'];
  if (!allowed.includes(section)) return res.status(400).json({ error: 'Unknown section' });
  const data = loadContent();
  data[section] = req.body;
  saveContent(data);
  res.json({ success: true, section });
});

// ── COURSES API ───────────────────────────────────────────────────────────────
// Public endpoint — landing page fetches it without auth
app.get('/api/courses', (req, res) => {
  const all = req.query.all === '1';
  res.json({ success: true, courses: all ? coursesDb.getAll() : coursesDb.getActive() });
});

app.post('/api/courses', adminLimiter, requireAdmin, (req, res) => {
  const course = coursesDb.create(req.body);
  if (!course) return res.status(409).json({ error: 'ID вже існує' });
  res.status(201).json({ success: true, course });
});

app.patch('/api/courses/:id', adminLimiter, requireAdmin, (req, res) => {
  if (!SAFE_ID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid course ID' });
  const course = coursesDb.update(req.params.id, req.body);
  if (!course) return res.status(404).json({ error: 'Курс не знайдено' });
  res.json({ success: true, course });
});

app.delete('/api/courses/:id', adminLimiter, requireAdmin, (req, res) => {
  if (!SAFE_ID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid course ID' });
  const ok = coursesDb.delete(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Курс не знайдено' });
  res.json({ success: true });
});

// ── ARTICLES API ─────────────────────────────────────────────────────────────
// Public: latest active articles (for homepage + article pages)
app.get('/api/articles', (req, res) => {
  const all = req.query.all === '1';
  const list = all ? articlesDb.getAll() : articlesDb.getActive();
  res.json({ success: true, articles: list });
});

app.get('/api/articles/:id', (req, res) => {
  const id = parseInt(req.params.id) || 0;
  const all = articlesDb.getAll();
  const article = all.find(a => a.id === id);
  if (!article) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, article });
});

app.post('/api/articles', adminLimiter, requireAdmin, (req, res) => {
  const article = articlesDb.create(req.body);
  if (!article) return res.status(409).json({ error: 'Slug вже існує' });
  res.status(201).json({ success: true, article });
});

app.patch('/api/articles/:id', adminLimiter, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id) || 0;
  const article = articlesDb.update(id, req.body);
  if (!article) return res.status(404).json({ error: 'Статтю не знайдено' });
  res.json({ success: true, article });
});

app.delete('/api/articles/:id', adminLimiter, requireSuperAdmin, (req, res) => {
  const id = parseInt(req.params.id) || 0;
  const ok = articlesDb.delete(id);
  if (!ok) return res.status(404).json({ error: 'Статтю не знайдено' });
  res.json({ success: true });
});

// ── REVIEWS API ───────────────────────────────────────────────────────────────
app.get('/api/reviews', (req, res) => {
  const token = req.headers['x-admin-token'];
  const isAdmin = (SUPERADMIN_TOKEN && token === SUPERADMIN_TOKEN) || !!adminsDb.findByToken(token);
  const reviews = isAdmin ? reviewsDb.getAll() : reviewsDb.getActive();
  res.json({ success: true, reviews });
});

app.post('/api/reviews', adminLimiter, requireAdmin, (req, res) => {
  const { name, initials, role, text, rating, active } = req.body;
  if (!name || !text) return res.status(400).json({ error: 'name та text обов\'язкові' });
  const review = reviewsDb.create({ name: sanitize(name), initials: sanitize(initials), role: sanitize(role), text: sanitize(text), rating, active });
  res.status(201).json({ success: true, review });
});

app.patch('/api/reviews/:id', adminLimiter, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id) || 0;
  const { name, initials, role, text, rating, active } = req.body;
  const patch = {};
  if (name     !== undefined) patch.name     = sanitize(name);
  if (initials !== undefined) patch.initials = sanitize(initials);
  if (role     !== undefined) patch.role     = sanitize(role);
  if (text     !== undefined) patch.text     = sanitize(text);
  if (rating   !== undefined) patch.rating   = rating;
  if (active   !== undefined) patch.active   = active;
  const review = reviewsDb.update(id, patch);
  if (!review) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, review });
});

app.delete('/api/reviews/:id', adminLimiter, requireSuperAdmin, (req, res) => {
  const id = parseInt(req.params.id) || 0;
  const ok = reviewsDb.delete(id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

// ── ARTICLE PAGES ─────────────────────────────────────────────────────────────
app.get('/articles/:slug', (req, res) => {
  const { slug } = req.params;
  if (!SAFE_ID_RE.test(slug)) return res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
  res.sendFile(path.join(__dirname, '..', 'article.html'));
});

// ── COURSE PAGES ──────────────────────────────────────────────────────────────
// Serve the single course.html for all /courses/:slug SEO URLs
const COURSE_SLUGS = ['scratch', 'python', 'roblox', 'web'];
app.get('/courses/:slug', (req, res) => {
  const { slug } = req.params;
  if (!SAFE_ID_RE.test(slug)) return res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
  const known = COURSE_SLUGS.includes(slug) || coursesDb.getAll().some(c => c.id === slug);
  if (!known) return res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
  res.sendFile(path.join(__dirname, '..', 'course.html'));
});

// ── TEST / DEBUG ROUTES ───────────────────────────────────────────────────────
app.get('/503', (req, res) => {
  res.status(503).sendFile(path.join(__dirname, '..', '503.html'));
});
app.get('/test-500', (req, res, next) => {
  next(new Error('Test 500 error'));
});

// 404 — everything else that wasn't caught by static files or API
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.status(404).sendFile(path.join(__dirname, '..', '404.html'));
});

// 500 — unhandled server errors
app.use((err, req, res, _next) => {
  console.error('[SERVER ERROR]', err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Internal server error' });
  }
  res.status(500).sendFile(path.join(__dirname, '..', '500.html'));
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
