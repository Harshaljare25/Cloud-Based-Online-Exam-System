@echo off
echo ===================================================
echo     UPLOADING PROJECT TO GITHUB
echo ===================================================
echo.
echo [1/3] Adding files to git...
git add .
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Failed to add files. Please make sure Git is installed and you are running this from the repository folder.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Committing changes...
git commit -m "Upload exam system files"
if %ERRORLEVEL% neq 0 (
    echo.
    echo NOTE: No new changes to commit or commit failed. Continuing...
)

echo.
echo [3/3] Pushing to GitHub (origin main)...
git push -u origin main
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: Failed to push to GitHub.
    echo Please make sure you have internet access and write permissions to the repository.
    echo If this is a new repository, make sure your GitHub account is authenticated.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo     SUCCESS: Files uploaded successfully!
echo ===================================================
echo.
pause
