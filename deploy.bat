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
    set "GIT=git"
    echo Found git in system PATH.
    goto :git_found
)

:: Check GitHub Desktop's bundled git (auto-detect version)
for /d %%D in ("%LOCALAPPDATA%\GitHubDesktop\app-*") do (
    if exist "%%D\resources\app\git\cmd\git.exe" (
        set "GIT=%%D\resources\app\git\cmd\git.exe"
        echo Found git via GitHub Desktop: %%D
        goto :git_found
    )
)

:: Fallback: common install locations
if exist "C:\Program Files\Git\cmd\git.exe" (
    set "GIT=C:\Program Files\Git\cmd\git.exe"
    echo Found git in Program Files.
    goto :git_found
)
if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
    set "GIT=C:\Program Files (x86)\Git\cmd\git.exe"
    echo Found git in Program Files (x86).
    goto :git_found
)

echo.
echo ERROR: Could not find git.exe anywhere.
echo.
echo Fix options:
echo   1. Install Git for Windows: https://git-scm.com/download/win
echo   2. Or install GitHub Desktop: https://desktop.github.com
echo.
pause
exit /b 1

:git_found
echo Using: "%GIT%"
echo.

:: ---- Navigate to project folder ----
cd /d "%~dp0"
echo Working directory: %cd%
echo.

:: ---- Check for changes ----
echo Checking for changes...
"%GIT%" status --short
echo.

:: ---- Stage, Commit, Push ----
echo Adding all changes...
"%GIT%" add -A
if %errorlevel% neq 0 (
    echo ERROR: git add failed.
    pause
    exit /b 1
)

echo.
set "MSG=Update %date% %time:~0,8%"
echo Committing: %MSG%
"%GIT%" commit -m "%MSG%"
if %errorlevel% neq 0 (
    echo.
    echo No changes to commit (or commit failed).
    echo If there are no changes, your site is already up to date.
    pause
    exit /b 0
)

echo.
echo Pushing to GitHub (this triggers Netlify deploy)...
"%GIT%" push origin main
if %errorlevel% neq 0 (
    echo.
    echo Push failed. Trying 'master' branch instead...
    "%GIT%" push origin master
    if %errorlevel% neq 0 (
        echo.
        echo ERROR: Push failed on both 'main' and 'master'.
        echo Make sure your GitHub repo is set up and you're authenticated.
        pause
        exit /b 1
    )
)

echo.
echo =============================================
echo    Deploy successful!
echo    Netlify will build and publish shortly.
echo =============================================
echo.
pause
