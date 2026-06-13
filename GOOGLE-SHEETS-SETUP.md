# Google Sheets Integration Setup

## Інструкції для налаштування Google Sheets (з Google Apps Script)

### Крок 1: Відкрийте Google Apps Script Console

1. Перейдіть на https://script.google.com
2. Натисніть "Новий проект"

### Крок 2: Скопіюйте цей код в редактор

```javascript
// Google Apps Script Web App — додає дані в Google Sheet
function doPost(e) {
  const spreadsheetId = "1wJ9jBYmkv5qj2sC3aqIiPx6CVGfjpfsxWHlJt4jNvUg"; // ID вашої таблиці
  const sheetName = "Заявки"; // Назва листа (створіть, якщо не існує)
  
  try {
    const params = e.parameter;
    const data = [
      new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' }), // Час заявки
      params.child_name || '',
      params.age || '',
      params.course || '',
      params.phone || '',
      params.email || '',
    ];
    
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Sheet not found' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Додайте заголовки, якщо це перший запис
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Час', "Ім'я дитини", 'Вік', 'Курс', 'Телефон', 'Email']);
    }
    
    // Додайте новий рядок з даними
    sheet.appendRow(data);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### Крок 3: Deploy як Web App

1. Натисніть "Deploy" (верхній правий куток)
2. Виберіть "New deployment"
3. Виберіть тип: "Web app"
4. Заповніть:
   - Execute as: `[Ваш Google акаунт]`
   - Who has access: `Anyone`
5. Натисніть "Deploy"
6. Скопіюйте URL (вигляду `https://script.google.com/macros/d/...`)

### Крок 4: Вставте URL у файл js/main.js

Знайдіть в коді рядок:
```javascript
const GOOGLE_SHEETS_URL = '';
```

І вставте скопійований URL:
```javascript
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/usercontent/exec';
```

### Крок 5: Підготуйте Google Sheet

1. Відкрийте вашу таблицю: https://docs.google.com/spreadsheets/d/1wJ9jBYmkv5qj2sC3aqIiPx6CVGfjpfsxWHlJt4jNvUg/edit
2. Переконайтеся, що є лист з назвою "Заявки" (або змініть ім'я в скрипті)
3. Перший рядок можна залишити для заголовків (скрипт автоматично їх додасть)

### Готово!

Тепер при заповненні форми на сайті, дані будуть автоматично додаватися в Google Sheet.

---

**Примітка**: Якщо виникають проблеми з CORS, переконайтеся, що URL розташування скрипту правильний і deployment активний.
