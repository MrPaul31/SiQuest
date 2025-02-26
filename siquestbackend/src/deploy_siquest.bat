@echo off
setlocal

:: Define variables
set "REMOTE_USER=simeds"
set "REMOTE_HOST=192.168.5.35"
set "BACKEND_DEST=/opt/NodeJS/SiQuest/backend/predeploy/src"

:: Define the source directory (current working directory)
set "SOURCE_DIR=%CD%"

:: Transfer files using SCP (Ensure OpenSSH is installed)
echo Transferring files to %REMOTE_USER%@%REMOTE_HOST%:%BACKEND_DEST%
scp "%SOURCE_DIR%\*.js" "%SOURCE_DIR%\*.log" "%REMOTE_USER%@%REMOTE_HOST%:%BACKEND_DEST%"

:: Check for errors
if %ERRORLEVEL% neq 0 (
    echo File transfer failed!
    exit /b %ERRORLEVEL%
)

echo Transfer completed successfully.
exit /b 0

