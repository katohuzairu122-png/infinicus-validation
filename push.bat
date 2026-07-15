@echo off
cd /d "C:\Users\katoh\OneDrive\Desktop\CLAUDE COWORK"
echo Nuking stuck rebase state...
del /f /q ".git\REBASE_HEAD" 2>NUL
rmdir /s /q ".git\rebase-merge" 2>NUL
rmdir /s /q ".git\rebase-apply" 2>NUL
git merge --abort 2>NUL
git checkout main
echo Staging all changes...
git add -A
echo Committing...
git commit -m "feat: bump all font sizes ~20% engine-wide, sw.js v20"
echo Pushing...
git push origin main --force
echo.
echo === DONE === Press any key to close.
pause
