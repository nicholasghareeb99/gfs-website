@echo off
setlocal enabledelayedexpansion
title GFS Website Deploy

echo.
echo =============================================
echo    Ghareeb Fencing Solutions - Deploy
echo =============================================
echo.

:: ---- Find Git ----
set "GIT="

:: Check system PATH first
where git >nul 2>&1
if %errorlevel%==0 (
    for /f "delims=" %%G in ('where git') do set "GIT=%%G"
    echo Found git in system PATH: !GIT!
    goto :git_found
)

:: Check GitHub Desktop's bundled git (your specific install)
set "GHD_GIT=%LOCALAPPDATA%\GitHubDesktop\app-3.5.4\resources\app\git\cmd\git.exe"
if exist "!GHD_GIT!" (
    set "GIT=!GHD_GIT!"
    echo Found git via GitHub Desktop 3.5.4
    goto :git_found
)

:: Auto-detect any GitHub Desktop version
for /d %%D in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do (
    if exist "%%D\resources\app\git\cmd\git.exe" (
        set "GIT=%%D\resources\app\git\cmd\git.exe"
        echo Found git via GitHub Desktop: %%D
        goto :git_found
    )
)

:: Fallback locations
for %%P in (
    "C:\Program Files\Git\cmd\git.exe"
    "C:\Program Files (x86)\Git\cmd\git.exe"
    "%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
) do (
    if exist "%%~P" (
        set "GIT=%%~P"
        echo Found git at %%~P
        goto :git_found
    )
)

echo.
echo ERROR: Could not find git.exe anywhere.
echo Install Git for Windows: https://git-scm.com/download/win
pause
exit /b 1

:git_found
echo Using: "!GIT!"
echo.

cd /d "%~dp0"
echo Working directory: %cd%
echo.

echo Checking for changes...
"!GIT!" status --short
echo.

echo Adding all changes...
"!GIT!" add -A

echo.
set "MSG=Update %date% %time:~0,8%"
echo Committing: %MSG%
"!GIT!" commit -m "%MSG%"
if %errorlevel% neq 0 (
    echo.
    echo No changes to commit - site is already up to date!
    pause
    exit /b 0
)

echo.
echo Pushing to GitHub (triggers Netlify deploy)...
"!GIT!" push origin main
if %errorlevel% neq 0 (
    echo.
    echo Push failed. Try opening GitHub Desktop and signing in first.
    pause
    exit /b 1
)

echo.
echo =============================================
echo    SUCCESS! Netlify will deploy in ~2 min.
echo =============================================
echo.
pause
