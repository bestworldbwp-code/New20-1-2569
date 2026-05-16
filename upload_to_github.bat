@echo off
echo Uploading changes to GitHub...
echo -------------------------------
cd /d "%~dp0"
git add .
git commit -m "Fix Excel export, add approval dates, and update system status"
echo pushing to remote...
git push
echo.
echo -------------------------------
echo Done! Please check your GitHub repository.
pause
