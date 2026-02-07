@echo off
echo Searching for git.exe on your system...
echo This may take a moment...
echo.

echo === Checking GitHub Desktop locations ===
dir /s /b "C:\Users\NGGha\AppData\Local\GitHubDesktop\*git.exe" 2>nul

echo.
echo === Checking Program Files ===
dir /s /b "C:\Program Files\Git\cmd\git.exe" 2>nul
dir /s /b "C:\Program Files (x86)\Git\cmd\git.exe" 2>nul

echo.
echo === Checking common locations ===
where git 2>nul

echo.
echo === Checking all AppData ===
dir /s /b "C:\Users\NGGha\AppData\Local\GitHub*" 2>nul

echo.
echo === Listing GitHubDesktop folder ===
dir "C:\Users\NGGha\AppData\Local\GitHubDesktop\" 2>nul

echo.
echo Done searching. Screenshot this and send to me.
pause
