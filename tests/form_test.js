const fs = require('fs');
const { JSDOM } = require('jsdom');
const vm = require('vm');

(async function run() {
  const mainJsPath = './js/main.js';
  let src = fs.readFileSync(mainJsPath, 'utf8');

  // Ensure GOOGLE_SHEETS_URL is set to a test URL so the script sends to it during test
  src = src.replace(/const\s+GOOGLE_SHEETS_URL\s*=\s*['"].*?['"];?/, "const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/d/TEST_DEPLOYMENT/exec';");

  // Create a minimal HTML page containing the contact form elements used by the script
  const html = `<!doctype html><html><head></head><body>
    <form class="contact-form" id="contactForm" novalidate>
      <input type="text" class="form-input" name="child_name" value="Test Child" />
      <input type="number" class="form-input" name="age" value="12" />
      <select class="form-input form-select" name="course"><option value="python" selected>Python</option></select>
      <select class="form-input phone-code-sel" name="phone_code"><option value="+380">+380</option></select>
      <input type="tel" class="form-input" name="phone" value="(95) 462-4672" />
      <input type="email" class="form-input" name="email" value="parent@example.com" />
      <button type="submit" class="btn btn--primary btn--full btn--lg" id="submitBtn"><span class="btn-text">Send</span><span class="btn-loading" style="display:none">Sending...</span></button>
    </form>
    <form id="modalForm" style="display:none"></form>
  </body></html>`;

  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
  const { window } = dom;

  // Provide minimal globals expected by the script
  window.localStorage = { getItem: () => 'ua', setItem: () => {} };
  window.fetchCalls = [];

  // Mock fetch to capture calls
  window.fetch = async function(url, opts) {
    window.fetchCalls.push({ url, opts });
    return { ok: true, status: 200, json: async () => ({ success: true }) };
  };

  // Provide console to window
  window.console = console;

  // Ensure minimal globals are available to the script by prepending small polyfills
  const polyfill = `
    if (typeof localStorage === 'undefined') { var localStorage = { getItem: function(){ return 'ua'; }, setItem: function(){} }; }
    if (typeof sessionStorage === 'undefined') { var sessionStorage = { getItem: function(){ return null; }, setItem: function(){} }; }
    if (typeof navigator === 'undefined') { var navigator = { userAgent: 'node-js' }; }
  `;

  const scriptEl = window.document.createElement('script');
  scriptEl.textContent = polyfill + '\n' + src;
  window.document.body.appendChild(scriptEl);

  // Wait briefly for any async init
  await new Promise(r => setTimeout(r, 150));

  // Grab form and button elements
  const formEl = window.document.getElementById('contactForm');
  const submitBtn = window.document.getElementById('submitBtn');

  // Call submitLeadForm (should be exposed globally)
  if (typeof window.submitLeadForm !== 'function') {
    console.error('submitLeadForm is not available in the page context');
    process.exit(2);
  }

  await window.submitLeadForm(formEl, submitBtn);

  console.log('Captured fetch calls:', JSON.stringify(window.fetchCalls, null, 2));

  // Print what would be sent to Google Sheets (body format)
  for (const call of window.fetchCalls) {
    if (typeof call.opts.body === 'string') {
      console.log('Body (string):', call.opts.body);
    } else if (call.opts.body && typeof call.opts.body.get === 'function') {
      // URLSearchParams
      console.log('URLSearchParams entries:');
      for (const [k,v] of call.opts.body.entries()) console.log(k, '=', v);
    }
  }

  process.exit(0);
})();
