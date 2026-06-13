Restore / rollback instructions

What was moved to `vps_backup/`:
- server/ (all Node/Express backend files)
  - vps_backup/server/server.js
  - vps_backup/server/database.js
  - vps_backup/server/mailer.js
  - vps_backup/server/admins.js
  - vps_backup/server/clients.js
  - vps_backup/server/articles.js
  - vps_backup/server/attendance.js
  - vps_backup/server/courses.js
  - vps_backup/server/payments.js
  - vps_backup/server/monthly-payments.js
  - vps_backup/server/reviews.js
- vps_backup/setup.bat

When we removed server files, we preserved them in `vps_backup/` so you can restore later.

Quick restore commands (from repo root):

```powershell
# move files back
git mv vps_backup/server server
git mv vps_backup/setup.bat setup.bat
# commit and push
git add -A
git commit -m "restore: move server files back"
git push origin main
```

Notes & considerations:
- Restoring `server/` requires a Node environment on the host (VPS) and setting up a `.env` with tokens and SMTP credentials.
- The original Express server expects environment variables: `SUPERADMIN_TOKEN` (or `ADMIN_TOKEN`), `SMTP_USER`, `SMTP_PASS`, possibly `NOTIFY_EMAIL`, `PORT`, and `ALLOWED_ORIGIN`.
- If you restore on a shared hosting without Node support you will need to deploy the `server/` code to a VPS or serverless environment (e.g., a small DigitalOcean droplet, Heroku-like service, or an AWS Lambda + API Gateway wrapper).

If you want, I can also:
- Create a small `/docs/deploy-server.md` with exact steps to run the Express server on a VPS.
- Prepare a serverless function alternative (Netlify Functions / Vercel) to accept form submissions without running a full VPS.
