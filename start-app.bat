@echo off
echo Starting MikroTik-UBNT Dashboard...

:: تشغيل الخادم في نافذة جديدة
start cmd /k "cd /d %~dp0 && npm run dev"

:: الانتظار لمدة 5 ثواني للتأكد من تشغيل الخادم
timeout /t 5

:: تشغيل تطبيق React في نافذة جديدة
start cmd /k "cd /d %~dp0\client && SET PORT=3001 && npm start"

:: الانتظار لمدة 10 ثواني للتأكد من تشغيل التطبيق
timeout /t 10

:: فتح المتصفح تلقائياً على المنفذ 3001
start http://localhost:3001

echo The application has been started successfully!