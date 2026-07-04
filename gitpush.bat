@echo off
cd /d "C:\Users\katoh\OneDrive\Desktop\CLAUDE COWORK"
git add -A > gitout.txt 2>&1
git commit -m "feat: nurture-batch KV email cron, wrangler.toml, set-sentry-dsn.bat, remove vercel.json, sw v14" >> gitout.txt 2>&1
git push origin main --force-with-lease >> gitout.txt 2>&1
echo DONE >> gitout.txt
