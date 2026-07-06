@echo off
cd /d "C:\Users\katoh\OneDrive\Desktop\CLAUDE COWORK"
echo Cleaning up any rebase/merge state...
git rebase --abort 2>nul
git merge --abort 2>nul
git checkout main 2>nul
echo Staging all changes...
git add -A
echo Committing...
git commit -m "feat: upgrade input tab — progress steps, motivational quote, category hints, renamed modes, button loading state, sw v16" 2>nul || echo (nothing new to commit, already up to date)
echo Pushing (force-with-lease to handle divergence)...
git push origin main --force-with-lease
echo.
echo === DONE === Press any key to close.
pause
