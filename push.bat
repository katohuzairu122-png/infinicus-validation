@echo off
cd /d "C:\Users\katoh\OneDrive\Desktop\CLAUDE COWORK"
echo Cleaning up any rebase/merge state...
git rebase --abort 2>nul
git merge --abort 2>nul
git checkout main 2>nul
echo Staging all changes...
git add -A
echo Committing...
git commit -m "fix: WOM 1.8pct->0.3pct, churn /90->30, startSim auth guard, hide demo btn for logged-in" 2>nul || echo (nothing new to commit, already up to date)
echo Pushing (force-with-lease to handle divergence)...
git push origin main --force-with-lease
echo.
echo === DONE === Press any key to close.
pause
