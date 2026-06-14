// Lightweight payload builder to simulate what the browser will send from the lead form

function buildPayload(input) {
  const code = input.phone_code || '+380';
  const rawPhone = (input.phone || '').replace(/\D/g, '');
  const fullPhone = code + rawPhone;
  const data = {
    child_name: (input.child_name || '').trim(),
    age: input.age || '',
    course: input.course || '',
    phone: fullPhone,
    email: (input.email || '').trim(),
  };
  return data;
}

// Example test case (matching page defaults)
const example = {
  child_name: 'Тест Дитина',
  age: '12',
  course: 'python',
  phone_code: '+380',
  phone: '(95) 462-46-72',
  email: 'parent@example.com'
};

const payload = buildPayload(example);
console.log('JSON payload (fallback /api/leads):');
console.log(JSON.stringify(payload, null, 2));

console.log('\nGoogle Sheets URLSearchParams (what will be POSTed to Apps Script):');
const params = new URLSearchParams();
Object.entries(payload).forEach(([k,v]) => params.append(k, v));
for (const [k,v] of params.entries()) console.log(k + ' = ' + v);

console.log('\nIf `GOOGLE_SHEETS_URL` is set to your Apps Script deployment, the above URLSearchParams will be sent as the request body.');
console.log('If not set, script attempts a fallback JSON POST to /api/leads (may fail on shared hosting).');
