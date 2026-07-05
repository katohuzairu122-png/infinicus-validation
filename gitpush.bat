@echo off
cd /d "C:\Users\katoh\OneDrive\Desktop\CLAUDE COWORK"
git add -A > gitout.txt 2>&1
git commit -m "feat: wire Sentry DSN into all 4 HTML pages" >> gitout.txt 2>&1
git push origin main --force-with-lease >> gitout.txt 2>&1
echo DONE >> gitout.txt
del gitpush.bat
