// ===== Google Sheets Simple Configuration =====
// ใช้ Google Sheets โดยตรง ไม่ต้องใช้ Google Cloud

const GOOGLE_SHEETS_CONFIG = {
  SPREADSHEET_ID: '1-8Eh59qMjxdGXi_DTp9fUN5UoltWedE0F5IfkH2kkD0',
  SHEET_NAME: 'log1',  // ชื่อ sheet,
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbzYC7msCgoXMxfhrZzf5Su7XKWLJHqZmrYas_AV8jQk0KuQI3PB3wgr3Phh6NAipr2pAQ/exec'
};

// ฟังก์ชันสำหรับอ่านข้อมูลจาก Google Sheets (CSV Export)
async function loadFromGoogleSheets() {
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${GOOGLE_SHEETS_CONFIG.SHEET_NAME}`;

    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    const incidents = rows.slice(1)
      .map((row, index) => {
        if (!row[0] || row[0] === '') return null;
        return {
          id:           row[0] || `INC-${index}`,
          date:         parseDateFromSheet(row[1]),
          type:         row[2] || 'accident',
          location:     row[3] || 'หมู่ 1',
          victimName:   row[4] || '',
          houseNumber:  (row[5] || '').replace(/^'/, ''),
          victimPhone:  row[6] || '',
          victims:      parseInt(row[7]) || 1,
          status:       normalizeStatus(row[8]),
          responseTime: parseInt(row[9]) || 15,
          details:      row[10] || '',
          waterTrucks:  parseInt(row[11]) || 0,
          waterVolume:  parseInt(row[12]) || 0,
          lat:          parseFloat(row[13]) || null,
          lng:          parseFloat(row[14]) || null
        };
      })
      .filter(inc => inc !== null)
      .sort((a, b) => b.date - a.date);

    return incidents;

  } catch (error) {
    console.error('Error loading from Google Sheets:', error);
    showNotification('ไม่สามารถโหลดข้อมูลจาก Google Sheets ได้');
    return [];
  }
}

// แปลงสถานะภาษาไทย → code
function normalizeStatus(val) {
  if (!val) return 'critical';
  const v = val.trim().toLowerCase();
  if (v === 'resolved' || v === 'เสร็จสิ้น' || v === 'แก้ไขแล้ว') return 'resolved';
  if (v === 'ongoing'  || v === 'กำลังดำเนินการ') return 'ongoing';
  if (v === 'critical' || v === 'มีการรับแจ้งเหตุ') return 'critical';
  return 'critical';
}
function parseDateFromSheet(str) {
  if (!str) return new Date(NaN);
  // รองรับทั้ง "dd/MM/yyyy HH:mm" และ ISO format
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1]);
    const m = parseInt(dmyMatch[2]) - 1;
    const y = parseInt(dmyMatch[3]);
    const h = parseInt(dmyMatch[4] || '0');
    const min = parseInt(dmyMatch[5] || '0');
    return new Date(y, m, d, h, min);
  }
  return new Date(str); // fallback ISO
}
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const result = [];

  for (let line of lines) {
    if (line.trim() === '') continue;

    const values = [];
    let currentValue = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        // handle escaped quotes ""
        if (inQuotes && line[i + 1] === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    result.push(values);
  }

  return result;
}

// ฟังก์ชันสำหรับบันทึกข้อมูลไป Google Sheets (Web App)
async function saveToGoogleSheets(incident) {
  try {
    const webAppUrl = GOOGLE_SHEETS_CONFIG.WEB_APP_URL;

    // แปลงวันที่เป็นรูปแบบอ่านง่าย dd/MM/yyyy HH:mm
    const d = incident.date;
    const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

    const row = JSON.stringify([
      incident.id,
      dateStr,
      incident.type,
      incident.location,
      incident.victimName  || '',
      "'" + (incident.houseNumber || ''),  // apostrophe นำหน้าป้องกัน Sheets แปลงเป็น Date
      incident.victimPhone || '',
      incident.victims,
      incident.status,
      incident.responseTime,
      incident.details     || '',
      incident.waterTrucks || 0,
      incident.waterVolume || 0,
      incident.lat         || '',
      incident.lng         || ''
    ]);

    const url = `${webAppUrl}?action=append&data=${encodeURIComponent(row)}`;
    await fetch(url, { method: 'GET', mode: 'no-cors' });
    return true;

  } catch (error) {
    console.error('Error saving to Google Sheets:', error);
    showNotification('ไม่สามารถบันทึกข้อมูลลง Google Sheets ได้');
    return false;
  }
}

// สำหรับการทดสอบ - ใช้ข้อมูลจำลองถ้ายังไม่ได้ตั้งค่า
function isGoogleSheetsConfigured() {
  return GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID !== 'YOUR_SPREADSHEET_ID_HERE' &&
         GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID !== '' &&
         typeof GOOGLE_SHEETS_CONFIG.WEB_APP_URL !== 'undefined' &&
         GOOGLE_SHEETS_CONFIG.WEB_APP_URL !== '' &&
         GOOGLE_SHEETS_CONFIG.WEB_APP_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';
}
