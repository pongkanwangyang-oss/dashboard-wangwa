// ===== Google Sheets Configuration =====
// คำแนะนำ: สร้าง Google Sheets และตั้งค่า API ก่อนใช้งานจริง

const GOOGLE_SHEETS_CONFIG = {
  // 1. สร้าง Google Sheets ใหม่: https://sheets.new
  // 2. แชร์เป็น "Anyone with the link" และคัดลอก URL
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',
  
  // 3. สร้าง Google Cloud Project: https://console.cloud.google.com
  // 4. เปิด Google Sheets API
  // 5. สร้าง API Key
  API_KEY: 'YOUR_API_KEY_HERE',
  
  // ชื่อ worksheet (sheet tab)
  RANGE: 'Sheet1!A:Z',
  
  // โครงสร้างข้อมูลใน Google Sheets
  COLUMNS: [
    'id',           // A - รหัสเหตุการณ์
    'date',         // B - วันที่เวลา
    'type',         // C - ประเภทภัย
    'location',     // D - ตำบล
    'victimName',   // E - ชื่อผู้ประสบภัย
    'houseNumber',  // F - บ้านเลขที่
    'victims',      // G - จำนวนผู้ประสบภัย
    'status',       // H - สถานะ
    'responseTime', // I - เวลาตอบสนอง
    'details',      // J - รายละเอียด
    'waterTrucks',  // K - จำนวนรถบรรทุกน้ำ
    'waterVolume'   // L - ปริมาณน้ำ
  ]
};

// ฟังก์ชันสำหรับอ่านข้อมูลจาก Google Sheets
async function loadFromGoogleSheets() {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const rows = data.values || [];
    
    // แปลงข้อมูลให้ตรงกับโครงสร้าง
    const incidents = rows.slice(1) // ข้าม header row
      .map((row, index) => {
        if (!row[0]) return null; // ข้ามแถวว่าง
        
        return {
          id: row[0] || `INC-${index}`,
          date: new Date(row[1]),
          type: row[2] || 'accident',
          location: row[3] || 'ตำบลในเมือง',
          victimName: row[4] || '',
          houseNumber: row[5] || '',
          victims: parseInt(row[6]) || 1,
          status: row[7] || 'critical',
          responseTime: parseInt(row[8]) || 15,
          details: row[9] || '',
          waterTrucks: parseInt(row[10]) || 0,
          waterVolume: parseInt(row[11]) || 0
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

// ฟังก์ชันสำหรับบันทึกข้อมูลไป Google Sheets
async function saveToGoogleSheets(incident) {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SPREADSHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.RANGE}:append?valueInputOption=USER_ENTERED&key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;
    
    const values = [
      [
        incident.id,
        incident.date.toISOString(),
        incident.type,
        incident.location,
        incident.victimName || '',
        incident.houseNumber || '',
        incident.victims,
        incident.status,
        incident.responseTime,
        incident.details || '',
        incident.waterTrucks || 0,
        incident.waterVolume || 0
      ]
    ];
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Google Sheets save result:', result);
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
         GOOGLE_SHEETS_CONFIG.API_KEY !== 'YOUR_API_KEY_HERE';
}
