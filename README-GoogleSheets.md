# คู่มือการตั้งค่า Google Sheets สำหรับแดชบอร์ดสาธารณภัย

## ขั้นตอนที่ 1: สร้าง Google Sheets

1. เข้าไปที่ [Google Sheets](https://sheets.new)
2. สร้าง spreadsheet ใหม่ ตั้งชื่อว่า "ระบบแดชบอร์ดสาธารณภัย"
3. สร้างหัวตารางในแถวแรก (Row 1) ตามนี้:
   ```
   A: id           (รหัสเหตุการณ์)
   B: date         (วันที่เวลา)
   C: type         (ประเภทภัย)
   D: location     (ตำบล)
   E: victimName   (ชื่อผู้ประสบภัย)
   F: houseNumber  (บ้านเลขที่)
   G: victims      (จำนวนผู้ประสบภัย)
   H: status       (สถานะ)
   I: responseTime (เวลาตอบสนอง)
   J: details      (รายละเอียด)
   K: waterTrucks  (จำนวนรถบรรทุกน้ำ)
   L: waterVolume  (ปริมาณน้ำ)
   ```

## ขั้นตอนที่ 2: แชร์ Google Sheets

1. คลิกปุ่ม "Share" มุมขวาบน
2. เปลี่ยนจาก "Restricted" เป็น "Anyone with the link"
3. คัดลอก Spreadsheet ID จาก URL
   - URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`
   - คัดลอกเฉพาะ `SPREADSHEET_ID_HERE`

## ขั้นตอนที่ 3: สร้าง Google Cloud Project และ API Key

1. เข้าไปที่ [Google Cloud Console](https://console.cloud.google.com)
2. สร้าง project ใหม่
3. เปิด Google Sheets API:
   - ไปที่ "APIs & Services" > "Library"
   - ค้นหา "Google Sheets API"
   - คลิก "Enable"
4. สร้าง API Key:
   - ไปที่ "APIs & Services" > "Credentials"
   - คลิก "Create Credentials" > "API Key"
   - คัดลอก API Key ที่ได้

## ขั้นตอนที่ 4: ตั้งค่าในโปรเจคต์

1. เปิดไฟล์ `google-sheets-config.js`
2. แทนที่ค่าในส่วนนี้:
   ```javascript
   const GOOGLE_SHEETS_CONFIG = {
     SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',    // ใส่ Spreadsheet ID ที่ได้
     API_KEY: 'YOUR_API_KEY_HERE',                  // ใส่ API Key ที่ได้
     // ...
   };
   ```

## ขั้นตอนที่ 5: ทดสอบการทำงาน

1. เปิดหน้าเว็บแดชบอร์ด
2. คลิกปุ่ม "➕ เพิ่มข้อมูล"
3. กรอกข้อมูลตัวอย่างและบันทึก
4. ตรวจสอบว่าข้อมูลปรากฏใน Google Sheets

## โครงสร้างข้อมูล

- **id**: รหัสเหตุการณ์ (เช่น INC-20260511-001)
- **date**: วันที่เวลาในรูปแบบ ISO (เช่น 2026-05-11T14:30:00)
- **type**: ประเภทภัย (accident, fire, storm, flood, drought, water, cold, chemical)
- **location**: ชื่อตำบล (เช่น ตำบลในเมือง)
- **victimName**: ชื่อ-นามสกุลผู้ประสบภัย
- **houseNumber**: บ้านเลขที่ (เช่น 123/45)
- **victims**: จำนวนผู้ประสบภัย (ตัวเลข)
- **status**: สถานะ (critical, ongoing, resolved)
- **responseTime**: เวลาตอบสนองเป็นนาที (ตัวเลข)
- **details**: รายละเอียดเพิ่มเติม (ข้อความ)
- **waterTrucks**: จำนวนรถบรรทุกน้ำ (สำหรับประเภท water)
- **waterVolume**: ปริมาณน้ำเป็นลิตร (สำหรับประเภท water)

## การแก้ไขข้อผิดพลาด

### ปัญหา: "API key not authorized"
- ตรวจสอบว่าเปิด Google Sheets API แล้ว
- ตรวจสอบว่า API Key ถูกต้อง

### ปัญหา: "Spreadsheet not found"
- ตรวจสอบว่าแชร์ spreadsheet เป็น "Anyone with the link"
- ตรวจสอบว่า Spreadsheet ID ถูกต้อง

### ปัญหา: "Permission denied"
- ตรวจสอบว่ามีการแชร์ spreadsheet อย่างถูกต้อง
- ลองสร้าง API Key ใหม่

## ความปลอดภัย

- **อย่าเปิดเผย API Key** ในที่สาธารณะ
- **จำกัดการเข้าถึง** API หากจำเป็นต้อง
- **สำรองข้อมูล** Google Sheets ประจำ
- **ใช้ HTTPS** เสมอในการเรียก API

## ฟีเจอร์เพิ่มเติม (ถ้าต้องการ)

- การยืนยันตัวตน (Authentication)
- การอนุมัติข้อมูลก่อนบันทึก
- การส่งแจ้งเมื่อมีเหตุการณ์ใหม่
- การสำรองข้อมูลอัตโนมัติ
