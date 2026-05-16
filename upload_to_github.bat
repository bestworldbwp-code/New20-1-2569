@echo off
echo Updating from GitHub first...
echo -------------------------------
cd /d "%~dp0"
git pull origin master --rebase

echo.
echo Uploading your changes...
echo -------------------------------
git add .
git commit -m "Fix Excel export, add approval dates, and update system status"
echo pushing to remote...
git push origin master

echo.
echo -------------------------------
echo Done! Please check your GitHub repository.
pause
