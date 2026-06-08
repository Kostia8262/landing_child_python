'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'articles.json');

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
  getAll()    { return load(); },
  getActive() { return load().filter(a => a.active !== false); },

  getBySlug(slug) {
    return load().find(a => a.slug === slug) || null;
  },

  create(data) {
    const articles = load();
    const id = Date.now();
    const slug = data.slug || slugify(data.title || '') || `article-${id}`;
    if (articles.find(a => a.slug === slug)) return null;
    const article = {
      id,
      slug,
      title:       data.title       || '',
      excerpt:     data.excerpt     || '',
      content:     data.content     || '',
      category:    data.category    || 'навчання',
      coverEmoji:  data.coverEmoji  || '📄',
      author:      data.author      || 'My Computer Academy',
      publishedAt: data.publishedAt || new Date().toISOString().slice(0, 10),
      active:      data.active !== false,
    };
    articles.unshift(article);
    save(articles);
    return article;
  },

  update(id, data) {
    const articles = load();
    const idx = articles.findIndex(a => a.id === id);
    if (idx === -1) return null;
    const allowed = ['title','excerpt','content','category','coverEmoji','author','publishedAt','active','slug'];
    const patch = {};
    allowed.forEach(k => { if (k in data) patch[k] = data[k]; });
    articles[idx] = { ...articles[idx], ...patch };
    save(articles);
    return articles[idx];
  },

  delete(id) {
    const articles = load();
    const before = articles.length;
    const next   = articles.filter(a => a.id !== id);
    if (next.length === before) return false;
    save(next);
    return true;
  },
};

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[а-яёіїєґ]/g, c => ({
      'а':'a','б':'b','в':'v','г':'h','д':'d','е':'e','є':'ie','ж':'zh','з':'z','и':'y',
      'і':'i','ї':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
      'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch',
      'ь':'','ю':'iu','я':'ia','ё':'e','ґ':'g',
    }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
