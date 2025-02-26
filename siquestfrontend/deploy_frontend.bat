@echo off
setlocal enabledelayedexpansion

set "REMOTE_USER=simeds"
set "REMOTE_HOST=192.168.5.35"

REM Percorso locale del frontend
set "LOCAL_FRONTEND=C:\Users\plups\WorkSpaces\fullstack\SiQuest\siquestfrontend"

REM Destinazione remota (assicurarsi che il percorso sia corretto)
set "FRONTEND_DEST=/opt/NodeJS/SiQuest/frontend/predeploy"

REM Opzioni per SSH/ SCP per evitare timeout
set "SSH_OPTS=-o ConnectTimeout=60 -o ServerAliveInterval=30 -o ServerAliveCountMax=5"

REM ==================================================
REM INIZIO SCRIPT
REM ==================================================

REM ==================================================
REM 1) Pulizia della destinazione remota
REM ==================================================
echo [INFO] Pulizia della destinazione remota, mantenendo le cartelle...
ssh %SSH_OPTS% %REMOTE_USER%@%REMOTE_HOST% "find %FRONTEND_DEST% -mindepth 1 -type f -delete && find %FRONTEND_DEST%/src -mindepth 1 -type f -delete && find %FRONTEND_DEST%/public/config -mindepth 1 -delete && find %FRONTEND_DEST%/src/componenti/config -mindepth 1 -type f -delete && find %FRONTEND_DEST%/src/styles -mindepth 1 -type f -delete"

if errorlevel 1 (
    echo [ERROR] Errore durante la pulizia della destinazione remota.
    pause
    exit /b 1
)
echo [INFO] Pulizia completata con successo.

REM ==================================================
REM 2) Creazione delle directory sul server remoto
REM ==================================================
REM (Non necessaria, l'ambiente di destinazione è già ben strutturato.)

REM ==================================================
REM 3) Trasferimento dei file principali con retry
REM ==================================================
echo [INFO] Trasferimento file principali...
for %%F in (Dockerfile package.json package-lock.json postcss.config.js serverFrontend.js tailwind.config.js) do (
    call :transfer_file "%%F"
    if errorlevel 1 (
        echo [ERROR] Trasferimento interrotto dopo errore su %%F
        pause
        exit /b 1
    )
)

REM ==================================================
REM 4) Trasferimento delle cartelle con meccanismo di retry
REM  - Trasferiamo SOLO le cartelle specifiche (non la cartella “public” intera)
REM ==================================================
for %%D in (src\componenti src\styles src\componenti\config public\config) do (
    call :transfer_folder "%%D"
    if errorlevel 1 (
        echo [ERROR] Trasferimento interrotto dopo errore su %%D
        pause
        exit /b 1
    )
)

REM Trasferimento dei soli file top-level in "src" (senza sottocartelle)
echo [INFO] Trasferimento dei soli file in src (no subfolders)...
call :transfer_only_src_files
if errorlevel 1 (
    echo [ERROR] Errore permanente nel trasferimento dei file di src
    pause
    exit /b 1
)

REM Trasferimento dei soli file top-level in "public" (senza sottocartelle)
echo [INFO] Trasferimento dei soli file in public (no subfolders)...
call :transfer_only_public_files
if errorlevel 1 (
    echo [ERROR] Errore permanente nel trasferimento dei file di public
    pause
    exit /b 1
)

REM ==================================================
REM Fine script
REM ==================================================
echo [INFO] Trasferimento completato con successo!
pause
exit /b 0


:transfer_file
REM Subroutine per il trasferimento di un file con retry
REM %1 = nome del file
set "FILE=%~1"
set attempts=0
set max_attempts=3
:transfer_file_loop
set /a attempts+=1
echo [INFO] Trasferimento di %FILE% (tentativo %attempts% di %max_attempts%)...
scp %SSH_OPTS% "%LOCAL_FRONTEND%\%FILE%" "%REMOTE_USER%@%REMOTE_HOST%:%FRONTEND_DEST%/"

if errorlevel 1 (
    if !attempts! lss !max_attempts! (
        echo [WARN] Trasferimento di %FILE% fallito. Riprovo tra 2 secondi...
        timeout /t 2 >nul
        goto transfer_file_loop
    ) else (
        echo [ERROR] Errore nel trasferimento di %FILE% dopo !attempts! tentativi.
        endlocal
        exit /b 1
    )
) else (
    echo [INFO] Trasferimento di %FILE% completato.
)
exit /b 0


:transfer_folder
REM Subroutine per il trasferimento di una cartella (ricorsiva) con retry
REM %1 = nome della cartella
set "FOLDER=%~1"
set attempts=0
set max_attempts=3

:transfer_folder_loop
set /a attempts+=1
echo [INFO] Trasferimento della cartella %FOLDER% (tentativo %attempts% di %max_attempts%)...
scp -r %SSH_OPTS% "%LOCAL_FRONTEND%\%FOLDER%" "%REMOTE_USER%@%REMOTE_HOST%:%FRONTEND_DEST%/%FOLDER%/"

if errorlevel 1 (
    if !attempts! lss !max_attempts! (
        echo [WARN] Trasferimento della cartella %FOLDER% fallito. Riprovo tra 2 secondi...
        timeout /t 2 >nul
        goto transfer_folder_loop
    ) else (
        echo [ERROR] Errore nel trasferimento della cartella %FOLDER% dopo !attempts! tentativi.
        endlocal
        exit /b 1
    )
) else (
    echo [INFO] Trasferimento della cartella %FOLDER% completato.
)
exit /b 0


:transfer_only_src_files
REM Subroutine per trasferire SOLO i file top-level in src, ignorando le sottocartelle
set attempts=0
set max_attempts=3

:transfer_only_src_files_loop
set /a attempts+=1
set "failcount=0"

echo [INFO] Trasferimento dei file top-level di src (tentativo %attempts% di %max_attempts%)...

for /F "delims=" %%f in ('dir /b /a-d "%LOCAL_FRONTEND%\src"') do (
    scp %SSH_OPTS% "%LOCAL_FRONTEND%\src\%%f" "%REMOTE_USER%@%REMOTE_HOST%:%FRONTEND_DEST%/src/"
    if errorlevel 1 (
        echo [WARN] Trasferimento di %%f in src fallito.
        set /a failcount=1
    )
)

if %failcount%==1 (
    if %attempts% LSS %max_attempts% (
        echo [WARN] Alcuni file in src non sono stati copiati. Riprovo tra 2 secondi...
        timeout /t 2 >nul
        goto transfer_only_src_files_loop
    ) else (
        echo [ERROR] Errore nel trasferimento dei file in src dopo %attempts% tentativi.
        exit /b 1
    )
) else (
    echo [INFO] Trasferimento dei soli file top-level di src completato senza errori.
)
exit /b 0


:transfer_only_public_files
REM Subroutine per trasferire SOLO i file top-level in public, ignorando le sottocartelle
set attempts=0
set max_attempts=3

:transfer_only_public_files_loop
set /a attempts+=1
set "failcount=0"

echo [INFO] Trasferimento dei file top-level di public (tentativo %attempts% di %max_attempts%)...

for /F "delims=" %%f in ('dir /b /a-d "%LOCAL_FRONTEND%\public"') do (
    scp %SSH_OPTS% "%LOCAL_FRONTEND%\public\%%f" "%REMOTE_USER%@%REMOTE_HOST%:%FRONTEND_DEST%/public/"
    if errorlevel 1 (
        echo [WARN] Trasferimento di %%f in public fallito.
        set /a failcount=1
    )
)

if %failcount%==1 (
    if %attempts% LSS %max_attempts% (
        echo [WARN] Alcuni file in public non sono stati copiati. Riprovo tra 2 secondi...
        timeout /t 2 >nul
        goto transfer_only_public_files_loop
    ) else (
        echo [ERROR] Errore nel trasferimento dei file in public dopo %attempts% tentativi.
        exit /b 1
    )
) else (
    echo [INFO] Trasferimento dei soli file top-level di public completato senza errori.
)
exit /b 0
