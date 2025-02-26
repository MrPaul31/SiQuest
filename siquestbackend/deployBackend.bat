@echo off
setlocal enabledelayedexpansion

REM ==================================================
REM CONFIGURAZIONE
REM ==================================================
set "REMOTE_USER=simeds"
set "REMOTE_HOST=192.168.5.35"

REM Percorso locale del backend
set "LOCAL_BACKEND=C:\Users\plups\WorkSpaces\fullstack\SiQuest\siquestbackend"

REM Destinazione remota
set "BACKEND_DEST=/opt/Node.js/SiQuest/backend/predeploy"

REM ==================================================
REM 1) Pulizia della destinazione remota
REM ==================================================
echo [INFO] Pulizia della destinazione remota, mantenendo le cartelle...

REM - La riga seguente elimina tutti i file da %BACKEND_DEST% (lasciando le sottocartelle)
REM   e poi elimina il contenuto di %BACKEND_DEST%/src (ma non la cartella src stessa).
ssh -o ConnectTimeout=120 -o ServerAliveInterval=30 -o ServerAliveCountMax=10 ^
  %REMOTE_USER%@%REMOTE_HOST% ^
  "if [ -d %BACKEND_DEST% ]; then find %BACKEND_DEST% -mindepth 1 -type f -delete; fi && if [ -d %BACKEND_DEST%/src ]; then find %BACKEND_DEST%/src -mindepth 1 -delete; fi"

if errorlevel 1 (
    echo [ERROR] Errore durante la pulizia della destinazione remota.
    pause
    exit /b 1
)

echo [INFO] Pulizia completata con successo.

REM ==================================================
REM 2) Trasferimento dei file principali con ritento
REM ==================================================
echo [INFO] Trasferimento file principali...

for %%F in (Dockerfile package.json package-lock.json .env) do (
    call :TransferFile "%%F"
    if errorlevel 1 (
        echo [ERROR] Interruzione script dopo errore permanente nel trasferimento di %%F
        pause
        exit /b 1
    )
)

REM ==================================================
REM 3) Trasferimento della directory 'src' con meccanismo di retry
REM ==================================================
set RETRIES=0
:RETRY_SRC
echo [INFO] Trasferimento della cartella 'src'... (tentativo %RETRIES% di 3)
scp -r ^
  -o ConnectTimeout=120 ^
  -o ServerAliveInterval=30 ^
  -o ServerAliveCountMax=10 ^
  "%LOCAL_BACKEND%\src" ^
  "%REMOTE_USER%@%REMOTE_HOST%:%BACKEND_DEST%/src/"

echo SCP exited with code %ERRORLEVEL%
if errorlevel 1 (
    set /a RETRIES+=1
    if %RETRIES% LSS 3 (
        echo [WARN] Ritento il trasferimento della cartella 'src'... (%RETRIES%/3)
        timeout /t 5 >nul
        goto RETRY_SRC
    ) else (
        echo [ERROR] Errore nel trasferimento della cartella 'src' dopo %RETRIES% tentativi.
        pause
        exit /b 1
    )
)

REM ==================================================
REM Fine Script
REM ==================================================
echo [INFO] Trasferimento completato con successo!
pause
exit /b 0

REM --------------------------------------------------
REM              Subroutine :TransferFile
REM --------------------------------------------------
:TransferFile
setlocal

set "FILE=%~1"
echo [INFO] Trasferimento di %FILE%

set /a RETRIES=0

:RETRY
scp ^
  -o ConnectTimeout=120 ^
  -o ServerAliveInterval=30 ^
  -o ServerAliveCountMax=10 ^
  "%LOCAL_BACKEND%\%FILE%" ^
  "%REMOTE_USER%@%REMOTE_HOST%:%BACKEND_DEST%/"

if errorlevel 1 (
    set /a RETRIES+=1
    if %RETRIES% GEQ 3 (
        echo [ERROR] Errore permanente nel trasferimento di %FILE% dopo 3 tentativi.
        endlocal
        exit /b 1
    ) else (
        echo [WARNING] Ritento il trasferimento di %FILE%... (%RETRIES%/3)
        timeout /t 5 >nul
        goto RETRY
    )
)

endlocal
exit /b 0
