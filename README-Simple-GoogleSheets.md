# คู่มือการตั้งค่า Google Sheets แบบง่าย (ไม่ต้องใช้ Google Cloud)

## ขั้นตอนที่ 1: สร้างและตั้งค่า Google Sheets

1. **สร้าง Google Sheets ใหม่**: https://sheets.new
2. **ตั้งชื่อ**: "ระบบแดชบอร์ดสาธารณภัย"
3. **สร้างหัวตาราง** ในแถวแรก (Row 1):
   ```
   A1: id
   B1: date  
   C1: type
   D1: location
   E1: victimName
   F1: houseNumber
   G1: victims
   H1: status
   I1: responseTime
   J1: details
   K1: waterTrucks
   L1: waterVolume
   ```

## ขั้นตอนที่ 2: แชร์ Google Sheets

1. คลิกปุ่ม **"Share"** มุมขวาบน
2. เปลี่ยนจาก "Restricted" เป็น **"Anyone with the link"**
3. **คัดลอก Spreadsheet ID** จาก URL
   - URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit`
   - คัดลอกเฉพาะ `SPREADSHEET_ID_HERE`

## ขั้นตอนที่ 3: ตั้งค่าในโปรเจคต์

1. เปิดไฟล์ `google-sheets-simple.js`
2. แทนที่ `YOUR_SPREADSHEET_ID_HERE` ด้วย Spreadsheet ID ที่ได้:
   ```javascript
   const GOOGLE_SHEETS_CONFIG = {
     SPREADSHEET_ID: 'ใส่ Spreadsheet ID ที่นี่',
     SHEET_NAME: 'Sheet1'
   };
   ```

## ขั้นตอนที่ 4: ตั้งค่า Google Apps Script (สำหรับบันทึกข้อมูล)

1. **ใน Google Sheets** ไปที่ **Extensions** > **Apps Script**
2. **คัดลอกโค้ด** จากไฟล์ `Google-Apps-Script-Code.gs`
3. **วางโค้ด** และ **บันทึก** (Ctrl+S)
4. **Deploy** > **New Deployment**
5. **เลือก**: Web app
6. **Execute as**: Me
7. **Who has access**: Anyone
8. **คลิก Deploy**
9. **อนุญาตการเข้าถึง** (Authorize)
10. **คัดลอก Web app URL** ที่ได้

## ขั้นตอนที่ 5: ตั้งค่า Web App URL

1. กลับไปที่ไฟล์ `google-sheets-simple.js`
2. แทนที่ `YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL` ด้วย Web app URL ที่ได้:
   ```javascript
   const webAppUrl = 'ใส่ Web app URL ที่นี่';
   ```

## ขั้นตอนที่ 6: ทดสอบการทำงาน

1. **รีสตาร์ทเซิร์ฟเวอร์** Python
2. **เปิดหน้าเว็บ** → ควรโหลดข้อมูลจาก Google Sheets
3. **Login admin** → เพิ่มข้อมูลใหม่
4. **ตรวจสอบ** ว่าข้อมูลปรากฏใน Google Sheets

## โครงสร้างข้อมูลที่ต้องกรอก

| คอลัมน์ | ชื่อ | คำอธิบาย | ตัวอย่าง |
|---------|------|-----------|----------|
| A | id | รหัสเหตุการณ์ | INC-20260511-001 |
| B | date | วันที่เวลา (ISO) | 2026-05-11T14:30:00 |
| C | type | ประเภทภัย | accident, fire, storm, flood |
| D | location | ตำบล | ตำบลในเมือง |
| E | victimName | ชื่อผู้ประสบภัย | สมชาย ใจดี |
| F | houseNumber | บ้านเลขที่ | 123/45 |
| G | victims | จำนวนผู้ประสบภัย | 3 |
| H | status | สถานะ | critical, ongoing, resolved |
| I | responseTime | เวลาตอบสนอง (นาที) | 15 |
| J | details | รายละเอียด | ต้นเหตุ... |
| K | waterTrucks | จำนวนรถบรรทุกน้ำ | 2 |
| L | waterVolume | ปริมาณน้ำ (ลิตร) | 10000 |

## การแก้ไขข้อผิดพลาด

### ปัญหา: ไม่โหลดข้อมูล
- ตรวจสอบว่าแชร์ Google Sheets เป็น "Anyone with the link"
- ตรวจสอบ Spreadsheet ID ว่าถูกต้อง

### ปัญหา: บันทึกไม่ได้
- ตรวจสอบว่าติดตั้ง Google Apps Script แล้ว
- ตรวจสอบ Web app URL ว่าถูกต้อง
- ตรวจสอบว่า Deploy Web app เป็น "Anyone"

### ปัญหา: Permission denied
- ตรวจสอบว่าอนุญาต Google Apps Script แล้ว
- ลอง Deploy Web app ใหม่

## ข้อดีของวิธีนี้
- **ฟรี** ไม่ต้องจ่ายค่า Google Cloud
- **ง่าย** ใช้เฉพาะ Google Sheets และ Apps Script
- **ปลอดภัย** ไม่ต้องแชร์ API Key
- **รวดเร็ว** โหลดข้อมูลผ่าน CSV export

## หมายเหตุ
- ข้อมูลจะอ่านได้ทันทีเมื่อมีการเปลี่ยนแปลงใน Google Sheets
- การบันทึกต้องใช้ Google Apps Script Web App
- สามารถแก้ไขข้อมูลได้โดยตรงใน Google Sheets
