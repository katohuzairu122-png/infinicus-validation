@echo off
cd /d "C:\Users\katoh\OneDrive\Desktop\CLAUDE COWORK"
git add -A
git commit -m "chore: redeploy rev2 — pick up RESEND_API_KEY from Cloudflare env"
git push origin main
echo.
echo Done! Press any key to close.
pause
