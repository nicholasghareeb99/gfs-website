@echo off
echo ==========================================
echo   Pushing your website to Netlify...
echo ==========================================
echo.

cd /d "C:\Users\NGGha\OneDrive\Documents\GitHub\gfs-website"

set "GIT=C:\Users\NGGha\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd\git.exe"

echo Adding all changes...
"%GIT%" add -A

echo.
echo Committing changes...
"%GIT%" commit -m "Update site design to match static version"

echo.
echo Pushing to GitHub (this triggers Netlify deploy)...
"%GIT%" push origin main

echo.
echo ==========================================
if %ERRORLEVEL% EQU 0 (
    echo   SUCCESS! Your site will update in 1-2 minutes.
    echo   Check: https://extraordinary-naiad-98e50a.netlify.app
) else (
    echo   Something went wrong. Screenshot this window
    echo   and send it to me.
)
echo ==========================================
echo.
pause
