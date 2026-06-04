# Деплой My Computer Academy

## Структура проекта
```
my-computer-academy/
├── index.html          — лендинг (фронтенд)
├── css/style.css       — стили
├── js/main.js          — фронтенд JS
├── server/
│   ├── server.js       — Express сервер
│   └── database.js     — SQLite через better-sqlite3
├── data/               — создаётся автоматически (leads.db)
├── package.json
├── .env                — переменные окружения (создай из .env.example)
└── .gitignore
```

---

## Локальный запуск

```bash
# 1. Установить зависимости
npm install

# 2. Создать .env
cp .env.example .env
# Отредактируй .env — замени ADMIN_TOKEN

# 3. Запустить
npm start
# Сайт: http://localhost:3000
```

---

## Деплой на VPS (Ubuntu/Debian)

### 1. Установить Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Загрузить проект на сервер
```bash
# Вариант 1 — через git
git clone <твой-репозиторий> /var/www/mycomputer
cd /var/www/mycomputer

# Вариант 2 — через scp
scp -r ./my-computer-academy user@server:/var/www/mycomputer
```

### 3. Установить зависимости и настроить
```bash
cd /var/www/mycomputer
npm install --production
cp .env.example .env
nano .env   # задай ADMIN_TOKEN и PORT
```

### 4. Запустить через PM2
```bash
sudo npm install -g pm2
pm2 start server/server.js --name mycomputer
pm2 save
pm2 startup   # автозапуск при перезагрузке
```

### 5. Nginx reverse proxy (порт 3000 → 80/443)

```nginx
# /etc/nginx/sites-available/mycomputer
server {
    listen 80;
    server_name mycomputer.education www.mycomputer.education;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mycomputer /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 6. SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mycomputer.education -d www.mycomputer.education
```

---

## Работа с заявками

### Просмотр всех заявок
```bash
curl https://mycomputer.education/api/leads?token=ВАШ_ADMIN_TOKEN
```

### Или SQLite напрямую
```bash
sqlite3 data/leads.db "SELECT * FROM leads ORDER BY created_at DESC;"
```

### Обновить статус заявки
```bash
curl -X PATCH https://mycomputer.education/api/leads/1 \
  -H "x-admin-token: ВАШ_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "contacted"}'
```

Статусы: `new` → `contacted` → `trial_scheduled` → `enrolled` / `rejected`

---

## Телефон и контакты
Замени в `index.html`:
- `+38 (000) 000-00-00` → реальный номер
- `info@mycomputer.education` → реальный email

---

## Обновление цветов бренда
В `css/style.css` измени CSS-переменные в `:root`:
```css
--color-primary:       #6C47FF;  /* основной цвет */
--color-primary-dark:  #5533EE;  /* тёмный вариант */
--color-primary-light: #EEE9FF;  /* светлый фон */
```
