@echo off
cd /d "%~dp0"
echo ===== Clinical_Psychologist deploy =====
git add -A
git commit -m "update site"
echo --- pushing to GitHub ---
git push origin main
echo.
echo ===== If you see "main -> main" or "up-to-date" : SUCCESS =====
echo ===== Site: https://law-test.github.io/Clinical_Psychologist/ =====
pause
