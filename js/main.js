'use strict';

/* ===================================================
   i18n — редактируйте текст прямо в index.html:
   • Украинский: текст внутри тега
   • Русский: атрибут data-ru="..." на том же элементе
   =================================================== */
let currentLang = localStorage.getItem('mca-lang') || 'ua';

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

document.getElementById('langSwitcher').addEventListener('click', e => {
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
  const bars = burger.querySelectorAll('span');
  if (isOpen) {
    bars[0].style.transform = 'translateY(7px) rotate(45deg)';
    bars[1].style.opacity   = '0';
    bars[2].style.transform = 'translateY(-7px) rotate(-45deg)';
  } else {
    bars.forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
  }
});

document.querySelectorAll('.nav__link').forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    burger.querySelectorAll('span').forEach(b => { b.style.transform = ''; b.style.opacity = ''; });
  });
});

/* ===================================================
   MODAL — Fix 5 & 6
   =================================================== */
const modal         = document.getElementById('signupModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalClose    = document.getElementById('modalClose');

function openModal(courseValue) {
  modal.classList.add('open');
  document.body.classList.add('modal-open');
  // Pre-select course if provided
  if (courseValue) {
    const sel = modal.querySelector('select[name="course"]');
    if (sel) sel.value = courseValue;
  }
  // Focus first input
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
  btn.addEventListener('click', e => {
    e.preventDefault();
    // Try to detect course from nearest course card
    const card  = btn.closest('.course-card');
    const title = card?.querySelector('.course-card__title')?.textContent || '';
    let course = '';
    if (/scratch/i.test(title)) course = 'scratch';
    else if (/python/i.test(title)) course = 'python';
    else if (/roblox/i.test(title)) course = 'roblox';
    else if (/web|веб/i.test(title)) course = 'web';
    openModal(course);
  });
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
   FORM SUBMIT — shared handler for both forms
   =================================================== */
async function submitLeadForm(formEl, submitBtnEl) {
  const btnText    = submitBtnEl.querySelector('.btn-text');
  const btnLoading = submitBtnEl.querySelector('.btn-loading');

  submitBtnEl.disabled     = true;
  btnText.style.display    = 'none';
  btnLoading.style.display = 'inline';

  const data = {
    child_name:  formEl.child_name?.value.trim()  || '',
    age:         formEl.age?.value                 || '',
    course:      formEl.course?.value              || '',
    phone:       formEl.phone?.value.trim()        || '',
    email:       formEl.email?.value.trim()        || '',
  };

  try {
    const res = await fetch('/api/leads', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    formEl.reset();
    showResultNotify(
      'success',
      currentLang === 'ua' ? 'Заявку прийнято!' : 'Заявка принята!',
      currentLang === 'ua' ? 'Передзвонимо протягом 30 хвилин. Дитину чекає безкоштовний пробний урок!' : 'Перезвоним в течение 30 минут. Ребёнка ждёт бесплатный пробный урок!'
    );
  } catch (err) {
    console.error('Lead submit error:', err);
    showResultNotify(
      'error',
      currentLang === 'ua' ? 'Помилка відправки' : 'Ошибка отправки',
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
   PHONE MASK — applied to all phone inputs
   =================================================== */
document.querySelectorAll('input[name="phone"]').forEach(input => {
  input.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '');
    if (v.startsWith('380')) v = v.slice(3);
    else if (v.startsWith('38')) v = v.slice(2);
    else if (v.startsWith('8'))  v = v.slice(1);
    let f = '+38 ';
    if (v.length > 0) f += '(' + v.substring(0, 3);
    if (v.length >= 3) f += ') ' + v.substring(3, 6);
    if (v.length >= 6) f += '-' + v.substring(6, 8);
    if (v.length >= 8) f += '-' + v.substring(8, 10);
    this.value = f;
  });
});

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
