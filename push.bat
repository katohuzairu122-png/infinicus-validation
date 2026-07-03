@echo off
cd /d "C:\Users\katoh\OneDrive\Desktop\CLAUDE COWORK"
echo Cleaning up any rebase/merge state...
git rebase --abort 2>nul
git merge --abort 2>nul
git checkout main 2>nul
echo Staging all changes...
git add -A
echo Committing...
git commit -m "debug: expose Resend response in waitlist API" 2>nul || echo (nothing new to commit, already up to date)
echo Pushing (force-with-lease to handle divergence)...
git push origin main --force-with-lease
echo.
echo === DONE === Press any key to close.
pause
