# Mikrotik-UBNT Dashboard | لوحة تحكم ميكروتيك ويوبي إن بي

لوحة تحكم متكاملة لإدارة الشبكات تدعم سيرفرات Mikrotik وأبراج UBNT وMimosa.  
A full dashboard for managing Mikrotik servers and UBNT & Mimosa towers.

---

## فكرة المشروع | Project Idea

يهدف المشروع إلى تقديم أداة مراقبة وإدارة لحظية للشبكات اللاسلكية.  
The goal is to provide a real-time monitoring and management tool for wireless networks.

---

## الخصائص الرئيسية | Main Features

- إدارة سيرفرات Mikrotik | Manage Mikrotik servers
- مراقبة أبراج UBNT وMimosa | Monitor UBNT and Mimosa towers
- عرض عدد المستخدمين وسرعات الشبكة | Display connected users and bandwidth
- تنبيهات لحظية عند الأعطال | Real-time alerts for failures
- نسخ احتياطي تلقائي للإعدادات | Auto backup for settings
- عرض خرائط تفصيلية للشبكة | Display detailed network maps

---

## المتطلبات | Requirements

- Node.js (الإصدار 18 أو أحدث) | Node.js (version 18+)
- MongoDB (اختياري) | MongoDB (optional)

---

## خطوات التثبيت والتشغيل | Installation and Run

```bash
git clone https://github.com/Homsi700/mikrotik-ubnt.git
cd mikrotik-ubnt
npm install
npm start
أو أثناء التطوير مع التحديث التلقائي:
Or during development with auto-reload:

bash
نسخ
تحرير
npm run dev
الملفات المهمة | Important Files
src/server.js: ملف بدء الخادم | Server starting point

package.json: تعريف الحزم والأوامر | Packages and commands definition

README.md: هذا الملف | This file

الرخصة | License
هذا المشروع مرخص برخصة MIT ومفتوح المصدر.
This project is licensed under the MIT License and is open-source.

روابط مهمة | Useful Links
مستودع المشروع: Mikrotik-UBNT GitHub Repo

تحميل Node.js: Node.js Download

تحميل MongoDB: MongoDB Download

المساهمة | Contribution
نرحب بجميع المساهمات من خلال Pull Requests أو رفع Issues.
All contributions are welcome via Pull Requests or submitting Issues.

تم تطوير المشروع بحب لتسهيل إدارة الشبكات اللاسلكية.
Built with passion to simplify wireless network management.
