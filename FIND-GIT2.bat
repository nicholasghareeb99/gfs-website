@echo off
echo Searching for git.exe specifically...
echo.

echo === Deep search in app-3.5.4 ===
dir /s /b "C:\Users\NGGha\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd\git.exe" 2>nul
dir /s /b "C:\Users\NGGha\AppData\Local\GitHubDesktop\app-3.5.4\resources\git\cmd\git.exe" 2>nul

echo.
echo === Full search for ANY git.exe ===
dir /s /b "C:\Users\NGGha\AppData\Local\GitHubDesktop\app-3.5.4\*git.exe" 2>nul

echo.
echo === Check embedded git folder ===
dir /s /b "C:\Users\NGGha\AppData\Local\GitHubDesktop\app-3.5.4\resources" 2>nul | findstr /i "git.exe"

echo.
echo === Check dugite (GitHub Desktop's git) ===
dir /s /b "C:\Users\NGGha\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\node_modules\dugite" 2>nul | findstr /i "git.exe"

echo.
echo === Broad search entire Local AppData for git.exe ===
dir /s /b "C:\Users\NGGha\AppData\Local\*git.exe" 2>nul | findstr /i /v "gitignore"

echo.
echo Done. Screenshot this.
pause
