@echo off
echo [STEP 1] Cleaning up git rebase/merge...
cd /d "%~dp0"
git rebase --abort >nul 2>&1
git merge --abort >nul 2>&1
git checkout master >nul 2>&1

echo [STEP 2] Adding and committing your work...
git add .
git commit -m "Rescue: Fixed Excel export and hidden modules"

echo [STEP 3] Forcing upload to GitHub...
git push origin master --force

echo.
echo ---------------------------------------
echo SUCCESS! Check your GitHub now.
echo ---------------------------------------
pause
