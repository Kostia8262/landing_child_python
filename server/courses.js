'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'courses.json');

if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}
function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  getAll()  { return load(); },
  getActive() { return load().filter(c => c.active !== false); },

  create(data) {
    const courses = load();
    const id = data.id || ('course_' + Date.now());
    if (courses.find(c => c.id === id)) return null; // duplicate
    const course = {
      id,
      name:         data.name        || '',
      emoji:        data.emoji       || '📚',
      age:          data.age         || '',
      duration:     data.duration    || '',
      lessonsCount: parseInt(data.lessonsCount) || 0,
      groupSize:    parseInt(data.groupSize)    || 0,
      price:        parseFloat(data.price)      || 0,
      description:  data.description || '',
      color:        data.color       || '#6C47FF',
      active:       data.active !== false,
    };
    courses.push(course);
    save(courses);
    return course;
  },

  update(id, data) {
    const courses = load();
    const idx = courses.findIndex(c => c.id === id);
    if (idx === -1) return null;
    const allowed = ['name','emoji','age','duration','lessonsCount','groupSize','price','description','color','active','curriculum'];
    const patch = {};
    allowed.forEach(k => { if (k in data) patch[k] = data[k]; });
    if ('lessonsCount' in patch) patch.lessonsCount = parseInt(patch.lessonsCount) || 0;
    if ('groupSize'    in patch) patch.groupSize    = parseInt(patch.groupSize) || 0;
    if ('price'        in patch) patch.price        = parseFloat(patch.price) || 0;
    if ('curriculum'   in patch) patch.curriculum   = Array.isArray(patch.curriculum) ? patch.curriculum : [];
    courses[idx] = { ...courses[idx], ...patch };
    save(courses);
    return courses[idx];
  },

  delete(id) {
    const courses = load();
    const before = courses.length;
    const next   = courses.filter(c => c.id !== id);
    if (next.length === before) return false;
    save(next);
    return true;
  },
};
