'use strict';

/* ===================================================
   PAGE LOADER
   =================================================== */
(function () {
  const bar = document.getElementById('page-loader');
  if (!bar) return;
  requestAnimationFrame(() => { bar.style.width = '72%'; });
  window.addEventListener('load', () => {
    bar.classList.add('done');
    setTimeout(() => bar.remove(), 600);
  }, { once: true });
})();

/* ===================================================
   CONFIGURATION
   =================================================== */
const GOOGLE_SHEETS_URL  = 'https://script.google.com/macros/s/AKfycbye7OSMTk5TmjBBEMRA4NpxLpFR1R_MMuo1DKQgilgdUY4I-aNB7QxlvySZcmhNDPVKAw/exec';
const TELEGRAM_BOT_TOKEN = ''; // Отримати у @BotFather у Telegram
const TELEGRAM_CHAT_ID   = ''; // ID вашого чату (наприклад: '123456789')

/* ===================================================
   i18n
   =================================================== */
function detectInitialLang() {
  const saved = localStorage.getItem('mca-lang');
  if (saved) return saved;
  const nav = (navigator.languages?.[0] || navigator.language || 'uk').toLowerCase();
  return nav.startsWith('ru') ? 'ru' : 'ua';
}
let currentLang = detectInitialLang();

function cacheUaTexts() {
  document.querySelectorAll('[data-ru]').forEach(el => {
    if (!('ua' in el.dataset)) el.dataset.ua = el.textContent.trim();
  });
}

function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('mca-lang', lang);
  document.documentElement.lang = lang === 'ua' ? 'uk' : 'ru';
  document.querySelectorAll('[data-ru]').forEach(el => {
    el.textContent = lang === 'ru' ? el.dataset.ru : el.dataset.ua;
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

cacheUaTexts();
applyLang(currentLang);

document.addEventListener('click', e => {
  const btn = e.target.closest('.lang-btn');
  if (btn) applyLang(btn.dataset.lang);
});

/* ===================================================
   HEADER SCROLL
   =================================================== */
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

/* ===================================================
   BURGER — simple dropdown (restored)
   =================================================== */
const burger  = document.getElementById('navBurger');
const navMenu = document.getElementById('navMenu');

burger.addEventListener('click', () => {
  const isOpen = navMenu.classList.toggle('open');
  burger.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.nav__link').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  });
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.nav__has-dropdown')) {
    document.querySelectorAll('.nav__has-dropdown').forEach(el => el.classList.remove('open'));
  }
});

/* ===================================================
   MODAL — Fix 5 & 6
   =================================================== */
const modal         = document.getElementById('signupModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose    = document.getElementById('modalClose');

function openModal() {
  modal.classList.add('open');
  document.body.classList.add('modal-open');
  setTimeout(() => {
    const first = modal.querySelector('input:not([type="hidden"])');
    if (first) first.focus();
  }, 350);
}

function closeModal() {
  modal.classList.remove('open');
  document.body.classList.remove('modal-open');
}

modalBackdrop.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// All "Записаться" buttons with .open-modal class
document.querySelectorAll('.open-modal').forEach(btn => {
  btn.addEventListener('click', e => { e.preventDefault(); openModal(); });
});

/* ===================================================
   RESULT NOTIFICATION — appears for 5s, then form stays visible
   =================================================== */
let _notifyTimer = null;

function showResultNotify(type, title, sub) {
  const wrap     = document.getElementById('resultNotify');
  const inner    = document.getElementById('resultNotifyInner');
  const icon     = document.getElementById('resultNotifyIcon');
  const titleEl  = document.getElementById('resultNotifyTitle');
  const subEl    = document.getElementById('resultNotifySub');
  const progress = document.getElementById('resultNotifyProgress');
  if (!wrap) return;

  clearTimeout(_notifyTimer);
  icon.textContent    = type === 'success' ? '🎉' : '❌';
  titleEl.textContent = title;
  subEl.textContent   = sub || '';
  wrap.className      = 'result-notify result-notify--' + type;
  wrap.style.display  = 'block';

  // restart progress bar
  progress.style.transition = 'none';
  progress.style.width      = '100%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    progress.style.transition = 'width 5s linear';
    progress.style.width      = '0%';
  }));

  _notifyTimer = setTimeout(() => hideResultNotify(), 5000);
}

function hideResultNotify() {
  const wrap = document.getElementById('resultNotify');
  if (!wrap) return;
  wrap.classList.add('result-notify--out');
  setTimeout(() => {
    wrap.style.display = 'none';
    wrap.className = 'result-notify';
  }, 350);
}

const _closeBtn = document.getElementById('resultNotifyClose');
if (_closeBtn) _closeBtn.addEventListener('click', () => { clearTimeout(_notifyTimer); hideResultNotify(); });

/* ===================================================
   FORM VALIDATION
   =================================================== */
const ERR = {
  ua: {
    name_req:    "Введіть ім'я дитини",
    name_short:  "Мінімум 2 символи",
    phone_req:   'Введіть номер телефону',
    phone_short: 'Занадто короткий номер',
    age_range:   'Вік від 5 до 18 років',
    email_fmt:   'Невірний формат email',
  },
  ru: {
    name_req:    'Введите имя ребёнка',
    name_short:  'Минимум 2 символа',
    phone_req:   'Введите номер телефона',
    phone_short: 'Слишком короткий номер',
    age_range:   'Возраст от 5 до 18 лет',
    email_fmt:   'Неверный формат email',
  },
};

function t(key) { return (ERR[currentLang] || ERR.ua)[key] || key; }

function setFieldError(inputEl, msg) {
  inputEl.classList.add('form-input--error');
  const wrap = inputEl.closest('.phone-wrap') || inputEl.parentElement;
  const errEl = wrap.parentElement.querySelector('.field-error') || wrap.querySelector('.field-error');
  if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
}

function clearFieldError(inputEl) {
  inputEl.classList.remove('form-input--error');
  const wrap = inputEl.closest('.phone-wrap') || inputEl.parentElement;
  const errEl = wrap.parentElement.querySelector('.field-error') || wrap.querySelector('.field-error');
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
}

function clearAllErrors(formEl) {
  formEl.querySelectorAll('.form-input--error').forEach(el => el.classList.remove('form-input--error'));
  formEl.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; el.style.display = 'none'; });
}

function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

function validateForm(formEl) {
  clearAllErrors(formEl);
  let ok = true;

  const nameEl = formEl.querySelector('[name="child_name"]');
  if (nameEl) {
    const v = nameEl.value.trim();
    if (!v) { setFieldError(nameEl, t('name_req'));   ok = false; }
    else if (v.length < 2) { setFieldError(nameEl, t('name_short')); ok = false; }
  }

  const phoneEl = formEl.querySelector('[name="phone"]');
  if (phoneEl) {
    const codeEl = formEl.querySelector('[name="phone_code"]');
    const code   = codeEl ? codeEl.value : '+380';
    const digits = phoneEl.value.replace(/\D/g, '');
    const minLen = code === '+380' ? 9 : 6;
    const maxLen = code === '+380' ? 10 : 13;
    if (!digits) { setFieldError(phoneEl, t('phone_req')); ok = false; }
    else if (digits.length < minLen || digits.length > maxLen) {
      setFieldError(phoneEl, t('phone_short')); ok = false;
    }
  }

  const ageEl = formEl.querySelector('[name="age"]');
  if (ageEl && ageEl.value !== '') {
    const a = parseInt(ageEl.value);
    if (isNaN(a) || a < 5 || a > 18) { setFieldError(ageEl, t('age_range')); ok = false; }
  }

  const emailEl = formEl.querySelector('[name="email"]');
  if (emailEl && emailEl.value.trim() && !isValidEmail(emailEl.value.trim())) {
    setFieldError(emailEl, t('email_fmt')); ok = false;
  }

  return ok;
}

// Clear error on change
document.querySelectorAll('#contactForm, #modalForm').forEach(form => {
  if (!form) return;
  form.addEventListener('input', e => {
    const el = e.target;
    if (el.classList.contains('form-input')) clearFieldError(el);
  });
  form.addEventListener('change', e => {
    const el = e.target;
    if (el.classList.contains('form-input')) clearFieldError(el);
  });
});

/* ===================================================
   PHONE MASK + COUNTRY CODE
   =================================================== */
function applyUkrMask(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.startsWith('380')) v = v.slice(3);
  else if (v.startsWith('38')) v = v.slice(2);
  else if (v.startsWith('8'))  v = v.slice(1);
  else if (v.startsWith('0'))  v = v.slice(1); // strip local trunk 0 (380 already has it)
  v = v.slice(0, 9);
  let f = '';
  if (v.length > 0) f = '(' + v.substring(0, 2);
  if (v.length >= 2) f += ') ' + v.substring(2, 5);
  if (v.length >= 5) f += '-' + v.substring(5, 7);
  if (v.length >= 7) f += '-' + v.substring(7, 9);
  input.value = f;
}

document.querySelectorAll('.phone-wrap').forEach(wrap => {
  const codeEl  = wrap.querySelector('.phone-code-sel');
  const phoneEl = wrap.querySelector('[name="phone"]');
  if (!codeEl || !phoneEl) return;

  function updatePlaceholder() {
    if (codeEl.value === '+380') {
      phoneEl.placeholder = '(95) ___-__-__';
    } else {
      phoneEl.placeholder = 'XXX XXX XXXX';
    }
  }
  updatePlaceholder();

  codeEl.addEventListener('change', () => {
    phoneEl.value = '';
    updatePlaceholder();
    phoneEl.focus();
  });

  phoneEl.addEventListener('input', () => {
    if (codeEl.value === '+380') applyUkrMask(phoneEl);
  });
});

/* ===================================================
   FORM SUBMIT — shared handler for both forms
   =================================================== */
async function submitLeadForm(formEl, submitBtnEl) {
  if (!validateForm(formEl)) {
    // Scroll to first error
    const firstErr = formEl.querySelector('.form-input--error');
    if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btnText    = submitBtnEl.querySelector('.btn-text');
  const btnLoading = submitBtnEl.querySelector('.btn-loading');
  submitBtnEl.disabled     = true;
  btnText.style.display    = 'none';
  btnLoading.style.display = 'inline';

  // Build full phone: code + digits
  const codeEl   = formEl.querySelector('[name="phone_code"]');
  const code     = codeEl ? codeEl.value : '+380';
  const rawPhone = (formEl.querySelector('[name="phone"]')?.value || '').replace(/\D/g, '');
  const fullPhone = code + rawPhone;

  const data = {
    child_name: formEl.querySelector('[name="child_name"]')?.value.trim() || '',
    age:        formEl.querySelector('[name="age"]')?.value || '',
    course:     formEl.querySelector('[name="course"]')?.value || '',
    phone:      fullPhone,
    email:      formEl.querySelector('[name="email"]')?.value.trim() || '',
  };

  try {
    if (GOOGLE_SHEETS_URL && GOOGLE_SHEETS_URL.includes('script.google.com')) {
      try {
        const gsParams = new URLSearchParams();
        gsParams.append('child_name', data.child_name);
        gsParams.append('age',        data.age);
        gsParams.append('course',     data.course);
        gsParams.append('phone',      data.phone);
        gsParams.append('email',      data.email);
        // Image pixel trick: follows GAS auth redirects, ignores CORS entirely
        await new Promise(resolve => {
          const img = new Image();
          img.onload = img.onerror = resolve;
          img.src = GOOGLE_SHEETS_URL + '?' + gsParams.toString();
          setTimeout(resolve, 4000);
        });
      } catch (gsErr) { console.warn('Google Sheets error:', gsErr); }
    }

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      const msg = `🎓 Нова заявка!\n👤 ${data.child_name}\n📱 ${data.phone}` +
        (data.age    ? `\n🎂 Вік: ${data.age}`    : '') +
        (data.course ? `\n📚 Курс: ${data.course}` : '');
      try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg }),
        });
      } catch (tgErr) { console.warn('Telegram error:', tgErr); }
    }

    formEl.reset();
    clearAllErrors(formEl);
    // Reset phone placeholder after reset
    formEl.querySelectorAll('.phone-wrap').forEach(wrap => {
      const p = wrap.querySelector('[name="phone"]');
      if (p) p.placeholder = '(0__) ___-__-__';
    });
    showResultNotify(
      'success',
      currentLang === 'ua' ? 'Заявку прийнято!' : 'Заявка принята!',
      currentLang === 'ua' ? 'Передзвонимо протягом 30 хвилин. Дитину чекає безкоштовний пробний урок!' : 'Перезвоним в течение 30 минут. Ребёнка ждёт бесплатный пробный урок!'
    );
  } catch (err) {
    console.error('Lead submit error:', err);
    showResultNotify(
      'error',
      currentLang === 'ua' ? 'Помилка зв\'язку' : 'Ошибка связи',
      currentLang === 'ua' ? 'Зателефонуйте нам: +38 (095) 462-46-72' : 'Позвоните нам: +38 (095) 462-46-72'
    );
  } finally {
    submitBtnEl.disabled     = false;
    btnText.style.display    = 'inline';
    btnLoading.style.display = 'none';
  }
}

// Main contact form
const contactForm   = document.getElementById('contactForm');
const contactSubmit = document.getElementById('submitBtn');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    submitLeadForm(contactForm, contactSubmit);
  });
}

// Modal form
const modalForm   = document.getElementById('modalForm');
const modalSubmit = document.getElementById('modalSubmitBtn');
if (modalForm) {
  modalForm.addEventListener('submit', e => {
    e.preventDefault();
    submitLeadForm(modalForm, modalSubmit);
  });
}

/* ===================================================
   DYNAMIC CONTENT — loads from /api/content
   =================================================== */
let _siteContent = null;

async function loadSiteContent() {
  try {
    const res = await fetch('/api/content');
    if (!res.ok) return;
    _siteContent = await res.json();
    renderPricing(_siteContent.pricing || []);
    renderFaq(_siteContent.faq || []);
    applyModuleVisibility(_siteContent.modules || {});
  } catch(e) { /* keep static fallback */ }
}

async function loadCourses() {
  try {
    const res = await fetch('/api/courses');
    if (!res.ok) return;
    const { courses } = await res.json();
    const active = (courses || []).filter(c => c.active !== false);
    if (!active.length) return;
    const el = document.getElementById('coursesGrid');
    if (!el) return;
    const COLOR_CLASS = { scratch: 'course-card__header--scratch', python: 'course-card__header--python', roblox: 'course-card__header--roblox', web: 'course-card__header--web' };
    el.innerHTML = active.map(c => {
      const hClass = COLOR_CLASS[c.id] || '';
      const hStyle = hClass ? '' : `style="background:${esc(c.color || '#6C47FF')}"`;
      return `<div class="course-card">
        <div class="course-card__header ${hClass}" ${hStyle}>
          <div class="course-card__emoji">${esc(c.emoji || '')}</div>
          <div class="course-card__age-badge">${esc(c.age)}</div>
        </div>
        <div class="course-card__body">
          <h3 class="course-card__title">${esc(c.name)}</h3>
          <p class="course-card__desc">${esc(c.description)}</p>
          <div class="course-card__footer">
            <div class="course-card__info">
              <span>⏱ ${esc(c.duration)}</span>
              <span>👥 Група до ${esc(String(c.groupSize||''))} осіб</span>
            </div>
            <a href="#" class="btn btn--primary btn--sm open-modal">${currentLang === 'ru' ? 'Записаться' : 'Записатись'}</a>
          </div>
        </div>
      </div>`;
    }).join('');
    el.querySelectorAll('.open-modal').forEach(btn => btn.addEventListener('click', e => {
      e.preventDefault(); openModal();
    }));
  } catch (e) { /* keep static fallback */ }
}

function applyModuleVisibility(modules) {
  const SECTION_MAP = {
    'hero':         'hero',
    'courses':      'courses',
    'how-it-works': 'how-it-works',
    'about':        'about',
    'stats':        'stats',
    'pricing':      'pricing',
    'certificate':  'certificate',
    'partners':     'partners',
    'reviews':      'reviews',
    'articles':     'articles',
    'faq':          'faq',
    'contact':      'contact',
  };
  Object.entries(SECTION_MAP).forEach(([key, sectionId]) => {
    if (modules[key] === false) {
      const el = document.getElementById(sectionId);
      if (el) el.style.display = 'none';
    }
  });
}

function t2(obj) {
  if (!obj) return '';
  return currentLang === 'ru' ? (obj.ru || obj.ua || '') : (obj.ua || '');
}

function renderPricing(cards) {
  const el = document.getElementById('pricingGrid');
  if (!el || !cards.length) return;
  el.innerHTML = cards.map(c => `
    <div class="pricing-card${c.featured ? ' pricing-card--featured' : ''}">
      <div class="pricing-card__badge">${esc(t2(c.badge))}</div>
      <h3 class="pricing-card__title">${esc(t2(c.title))}</h3>
      <ul class="pricing-card__features">
        ${(c.features||[]).map(f => `<li>${esc(t2(f))}</li>`).join('')}
      </ul>
      <div class="pricing-card__price">
        <div class="pricing-card__price-label">${t2({ua:'від',ru:'от'})}</div>
        <div class="pricing-card__price-val">${esc(String(c.price||''))} <span>${esc(t2(c.priceUnit))}</span>${c.oldPrice ? ` <del class="pricing-card__price-old">${esc(String(c.oldPrice))}</del>` : ''}</div>
      </div>
      <a href="#contact" class="pricing-card__btn open-modal">${t2({ua:'Записатись на пробне',ru:'Записаться на пробное'})}</a>
    </div>
  `).join('');
  // Re-attach open-modal handlers
  el.querySelectorAll('.open-modal').forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); openModal(''); }));
}

function renderCourses(courses) {
  const el = document.getElementById('coursesGrid');
  if (!el || !courses.length) return;
  el.innerHTML = courses.map(c => `
    <div class="course-card${c.popular ? ' course-card--popular' : ''}">
      <div class="course-card__header ${esc(c.headerClass||'')}">
        <div class="course-card__emoji">${esc(c.emoji||'')}</div>
        <div class="course-card__age-badge">${esc(t2(c.age))}</div>
      </div>
      <div class="course-card__body">
        <h3 class="course-card__title">${esc(t2(c.title))}</h3>
        <p class="course-card__desc">${esc(t2(c.desc))}</p>
        <ul class="course-card__features">${(c.features||[]).map(f=>`<li>${esc(t2(f))}</li>`).join('')}</ul>
        <div class="course-card__footer">
          <div class="course-card__info">
            <span>${esc(t2(c.duration))}</span>
            <span>${esc(t2(c.groupSize))}</span>
          </div>
          <a href="#" class="btn btn--primary btn--sm open-modal">${t2({ua:'Записатись',ru:'Записаться'})}</a>
        </div>
      </div>
    </div>
  `).join('');
  el.querySelectorAll('.open-modal').forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); openModal(); }));
}

function renderFaq(items) {
  const el = document.getElementById('faqList');
  if (!el || !items.length) return;
  el.innerHTML = items.map(item => `
    <div class="faq-item">
      <button class="faq-item__question">
        <span>${esc(t2(item.question))}</span>
        <svg class="faq-item__icon" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="faq-item__answer"><p>${esc(t2(item.answer))}</p></div>
    </div>
  `).join('');
  // Re-attach FAQ accordion
  el.querySelectorAll('.faq-item__question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('active');
      el.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
      if (!isOpen) item.classList.add('active');
    });
  });
}

// Load content on page start (after lang is applied)
loadSiteContent();
loadCourses();
loadReviews();

/* ===================================================
   ARTICLES — loads from /api/articles
   =================================================== */
async function loadArticles() {
  const slider = document.getElementById('articlesSlider');
  const dotsEl = document.getElementById('articlesDots');
  if (!slider) return;
  try {
    const res = await fetch('/api/articles');
    if (!res.ok) return;
    const { articles } = await res.json();
    const active = (articles || []).filter(a => a.active !== false).slice(0, 6);
    if (!active.length) { document.getElementById('articles')?.style.setProperty('display','none'); return; }

    slider.innerHTML = active.map(a => `
      <a class="article-card" href="/articles/${esc(a.slug)}" aria-label="${esc(a.title)}">
        <div class="article-card__top">
          <span class="article-card__emoji">${esc(a.coverEmoji || '📄')}</span>
          <span class="article-card__cat">${esc(a.category || '')}</span>
        </div>
        <div class="article-card__body">
          <h3 class="article-card__title">${esc(a.title)}</h3>
          <p class="article-card__excerpt">${esc(a.excerpt)}</p>
        </div>
        <div class="article-card__footer">
          <span class="article-card__date">${formatDate(a.publishedAt)}</span>
          <span class="article-card__read">Читати →</span>
        </div>
      </a>
    `).join('');

    // Mobile dots
    if (dotsEl && active.length > 1) {
      dotsEl.innerHTML = active.map((_, i) => `<span class="articles-dot${i===0?' active':''}"></span>`).join('');
      slider.addEventListener('scroll', () => {
        const card = slider.querySelector('.article-card');
        if (!card) return;
        const idx = Math.round(slider.scrollLeft / (card.offsetWidth + 16));
        dotsEl.querySelectorAll('.articles-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
      }, { passive: true });
    }
  } catch(e) { /* silent fail */ }
}

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function formatDate(d) { if (!d) return ''; try { return new Date(d).toLocaleDateString('uk-UA', {day:'numeric',month:'long',year:'numeric'}); } catch { return d; } }
loadArticles();

/* ===================================================
   FAQ ACCORDION
   =================================================== */
document.querySelectorAll('.faq-item__question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item   = btn.closest('.faq-item');
    const isOpen = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
    if (!isOpen) item.classList.add('active');
  });
});

/* ===================================================
   SCROLL ANIMATIONS
   =================================================== */
const animObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); animObs.unobserve(e.target); }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });

document.querySelectorAll(
  '.benefit-card, .course-card, .review-card, .step, .faq-item, .section-header, .stats__card'
).forEach(el => { el.classList.add('fade-up'); animObs.observe(el); });

/* ===================================================
   STATS COUNTER
   =================================================== */
function animateCounter(el, target, duration = 1600) {
  let start = null;
  const step = ts => {
    if (!start) start = ts;
    const p    = Math.min((ts - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(ease * target);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}
const statsSection = document.querySelector('.stats');
let statsAnimated = false;
if (statsSection) {
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !statsAnimated) {
      statsAnimated = true;
      document.querySelectorAll('.stats__number[data-target]').forEach(el => {
        animateCounter(el, parseInt(el.dataset.target));
      });
    }
  }, { threshold: 0.3 }).observe(statsSection);
}

/* ===================================================
   REVIEWS — loads from /api/reviews
   =================================================== */
async function loadReviews() {
  const grid   = document.getElementById('reviewsGrid');
  const dotsEl = document.getElementById('reviewsDots');
  if (!grid) return;

  const staticHTML = grid.innerHTML;

  const skelCard = () => `
    <div class="review-card review-card--skel" aria-hidden="true">
      <span class="skel-block" style="width:52%;height:13px;margin-bottom:14px"></span>
      <span class="skel-block" style="width:100%;height:9px;margin-bottom:7px"></span>
      <span class="skel-block" style="width:85%;height:9px;margin-bottom:7px"></span>
      <span class="skel-block" style="width:68%;height:9px;margin-bottom:22px"></span>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="skel-block skel-avatar"></span>
        <div style="flex:1">
          <span class="skel-block" style="width:44%;height:9px;margin-bottom:5px"></span>
          <span class="skel-block" style="width:30%;height:8px"></span>
        </div>
      </div>
    </div>`;
  grid.innerHTML = [1, 2, 3].map(skelCard).join('');

  function attachDots(track, dots) {
    if (!track || !dots.length) return;
    track.addEventListener('scroll', () => {
      const card = track.querySelector('.review-card');
      if (!card) return;
      const idx = Math.round(track.scrollLeft / (card.offsetWidth + 14));
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    }, { passive: true });
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        const card = track.querySelector('.review-card');
        if (!card) return;
        track.scrollTo({ left: i * (card.offsetWidth + 14), behavior: 'smooth' });
      });
    });
  }

  try {
    const res = await fetch('/api/reviews');
    if (!res.ok) throw new Error('no data');
    const { reviews } = await res.json();
    const active = (reviews || []).filter(r => r.active !== false);
    if (!active.length) throw new Error('empty');
    const stars = n => '★'.repeat(Math.max(1, Math.min(5, n || 5)));
    grid.innerHTML = active.map(r => `
      <div class="review-card">
        <div class="review-card__stars">${stars(r.rating)}</div>
        <p class="review-card__text">${esc(r.text)}</p>
        <div class="review-card__author">
          <div class="review-card__avatar">${esc(r.initials || '')}</div>
          <div>
            <div class="review-card__name">${esc(r.name)}</div>
            <div class="review-card__meta">${esc(r.role || '')}</div>
          </div>
        </div>
      </div>`).join('');
    if (dotsEl) {
      dotsEl.innerHTML = active.map((_, i) =>
        `<span class="reviews__dot${i === 0 ? ' active' : ''}"></span>`).join('');
      attachDots(document.getElementById('reviewsTrack'), [...dotsEl.querySelectorAll('.reviews__dot')]);
    }
  } catch {
    grid.innerHTML = staticHTML;
  }
}

/* ===================================================
   REVIEWS SLIDER DOTS (mobile)
   =================================================== */
const reviewsTrack = document.getElementById('reviewsTrack');
const reviewsDots  = document.querySelectorAll('.reviews__dot');

if (reviewsTrack && reviewsDots.length) {
  reviewsTrack.addEventListener('scroll', () => {
    const card = reviewsTrack.querySelector('.review-card');
    if (!card) return;
    const index = Math.round(reviewsTrack.scrollLeft / (card.offsetWidth + 14));
    reviewsDots.forEach((d, i) => d.classList.toggle('active', i === index));
  }, { passive: true });

  reviewsDots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const card = reviewsTrack.querySelector('.review-card');
      if (!card) return;
      reviewsTrack.scrollTo({ left: i * (card.offsetWidth + 14), behavior: 'smooth' });
    });
  });
}

/* ===================================================
   COOKIE CONSENT
   =================================================== */
(function () {
  const COOKIE_KEY = 'mca_cookie_consent';
  const banner     = document.getElementById('cookieBanner');
  const btnAccept  = document.getElementById('cookieAccept');
  const btnDecline = document.getElementById('cookieDecline');

  function hideBanner() {
    if (banner) {
      banner.style.transition = 'transform .3s ease, opacity .3s ease';
      banner.style.transform  = 'translateY(100%)';
      banner.style.opacity    = '0';
      setTimeout(() => { banner.style.display = 'none'; }, 320);
    }
  }

  // Show banner only if consent not yet given
  if (banner && !localStorage.getItem(COOKIE_KEY)) {
    // Small delay so banner doesn't compete with page load
    setTimeout(() => { banner.style.display = 'block'; }, 1200);
  }

  if (btnAccept) {
    btnAccept.addEventListener('click', () => {
      localStorage.setItem(COOKIE_KEY, 'all');
      hideBanner();
    });
  }
  if (btnDecline) {
    btnDecline.addEventListener('click', () => {
      localStorage.setItem(COOKIE_KEY, 'necessary');
      hideBanner();
    });
  }
})();

/* ===================================================
   SMOOTH SCROLL
   =================================================== */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - 80,
      behavior: 'smooth',
    });
  });
});

/* ===================================================
   AGE TABS — COURSE PROGRAM
   =================================================== */
document.querySelectorAll('.age-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const age = tab.dataset.age;
    const block = tab.closest('.python-course-content');
    block.querySelectorAll('.age-tab').forEach(t => t.classList.toggle('active', t === tab));
    block.querySelectorAll('.age-program').forEach(p => p.classList.toggle('active', p.dataset.age === age));
  });
});

/* ===================================================
   TOAST
   =================================================== */
let toastEl = null, toastTimer = null;
function showToast(msg, type = 'success') {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.className   = `toast toast--${type}`;
  clearTimeout(toastTimer);
  toastEl.offsetHeight; // force reflow
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 4500);
}
