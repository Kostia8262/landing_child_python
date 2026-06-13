'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'reviews.json');

const SEED = [
  { id: 1, name: 'Марина К.', initials: 'МК', role: 'мама Арсенія, 9 років · Scratch',
    text: '"Син 9 років почав з нуля на курсі Scratch. Через 3 місяці зробив гру і показував друзям!"',
    rating: 5, active: true, createdAt: new Date().toISOString() },
  { id: 2, name: 'Олег М.', initials: 'ОМ', role: 'тато Дарини, 14 років · Web',
    text: '"Донька хотіла створювати сайти. За 5 місяців зробила справжній сайт-портфоліо. Викладачі пояснюють зрозуміло!"',
    rating: 5, active: true, createdAt: new Date().toISOString() },
  { id: 3, name: 'Тетяна В.', initials: 'ТВ', role: 'мама Матвія, 11 років · Roblox',
    text: '"Син фанат Roblox — записали на курс. Тепер будує свої світи. Каже, хоче стати геймдевом!"',
    rating: 5, active: true, createdAt: new Date().toISOString() },
  { id: 4, name: 'Наталя С.', initials: 'НС', role: 'мама Микити, 12 років · Python',
    text: '"Python — складно, здавалося б. Але дитина сама тягнула нас до комп\'ютера. Telegram-бот працює досі!"',
    rating: 5, active: true, createdAt: new Date().toISOString() },
];

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(SEED, null, 2), 'utf8');

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}
function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}
function nextId(arr) {
  return arr.length > 0 ? Math.max(...arr.map(r => r.id || 0)) + 1 : 1;
}

module.exports = {
  getAll()     { return load(); },
  getActive()  { return load().filter(r => r.active !== false); },

  create(data) {
    const reviews = load();
    const review = {
      id:        nextId(reviews),
      name:      data.name      || '',
      initials:  data.initials  || (data.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      role:      data.role      || '',
      text:      data.text      || '',
      rating:    Math.min(5, Math.max(1, parseInt(data.rating) || 5)),
      active:    data.active !== false,
      createdAt: new Date().toISOString(),
    };
    reviews.push(review);
    save(reviews);
    return review;
  },

  update(id, data) {
    const reviews = load();
    const idx = reviews.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const allowed = ['name', 'initials', 'role', 'text', 'rating', 'active'];
    const patch = {};
    allowed.forEach(k => { if (k in data) patch[k] = data[k]; });
    if (patch.rating !== undefined) patch.rating = Math.min(5, Math.max(1, parseInt(patch.rating) || 5));
    reviews[idx] = { ...reviews[idx], ...patch, updatedAt: new Date().toISOString() };
    save(reviews);
    return reviews[idx];
  },

  delete(id) {
    const reviews = load();
    const idx = reviews.findIndex(r => r.id === id);
    if (idx === -1) return false;
    reviews.splice(idx, 1);
    save(reviews);
    return true;
  },
};
