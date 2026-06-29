@echo off
cd /d "C:\Users\katoh\OneDrive\Desktop\CLAUDE COWORK"
git add -A
git commit -m "chore: force redeploy to pick up RESEND_API_KEY env var"
git push origin main
echo.
echo Done! Press any key to close.
pause
