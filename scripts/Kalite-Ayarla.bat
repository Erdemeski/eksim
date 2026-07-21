@echo off
chcp 65001 >nul
setlocal
title Eksim Kiosk - Kalite Ayari
cd /d "%~dp0"

rem  Bu dosya, portable EksimPhygitalKiosk-*.exe ile AYNI klasorde bulunmalidir.
rem  Sectiginiz kalite, yanindaki kiosk-config.json dosyasina yazilir; uygulama
rem  her acilista bu dosyayi okur (yeniden derleme GEREKMEZ).

:menu
cls
echo ============================================
echo    EKSIM KIOSK - GORUNTU KALITESI AYARI
echo ============================================
echo.
echo    Ayar dosyasi: %~dp0kiosk-config.json
echo.
echo    [1] Otomatik  (donanima gore karar verir) - onerilen
echo    [2] Yuksek    (tum efektler acik)
echo    [3] Dusuk     (agir efektler kapali - en akici)
echo    [0] Cikis
echo.
set /p secim="Seciminiz (1/2/3/0): "

if "%secim%"=="1" ( set "TIER=auto" & goto write )
if "%secim%"=="2" ( set "TIER=high" & goto write )
if "%secim%"=="3" ( set "TIER=low"  & goto write )
if "%secim%"=="0" goto end
goto menu

:write
> "%~dp0kiosk-config.json" echo {"perfTier": "%TIER%"}
echo.
echo    Kaydedildi: perfTier = %TIER%
echo    Degisiklik icin uygulamayi yeniden baslatin.
echo.
pause
goto end

:end
endlocal
