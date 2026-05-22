// ===== Google Apps Script สำหรับบันทึกข้อมูลไป Google Sheets =====

function doGet(e) {
  try {
    var sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('log1');
    var action = e.parameter.action;

    if (action === 'append') {
      // สร้าง header ถ้ายังไม่มี
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'รหัสเหตุการณ์','วันที่/เวลา','ประเภทภัย','หมู่บ้าน',
          'ชื่อผู้ประสบภัย','บ้านเลขที่','เบอร์โทร','จำนวน(คน)','สถานะ',
          'เวลาตอบสนอง(นาที)','รายละเอียด','รถน้ำ(คัน)','ปริมาณน้ำ(ล.)','Lat','Lng'
        ]);
      }
      var row = JSON.parse(e.parameter.data);
      // เลขลำดับ = จำนวนแถวข้อมูล (ไม่นับ header)
      var seq = sheet.getLastRow(); // header อยู่แถว 1 ดังนั้น seq เริ่มที่ 1
      row[0] = 'INC-' + String(seq).padStart(4, '0'); // INC-0001, INC-0002, ...
      sheet.appendRow(row);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'read') {
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow === 0) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'success', data: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var data = sheet.getRange(1, 1, lastRow, lastCol > 0 ? lastCol : 15).getValues();
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success', data: data }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'update') {
      var id     = e.parameter.id;
      var values = JSON.parse(e.parameter.values);
      var range  = sheet.getRange(1, 1, sheet.getLastRow()).getValues();
      for (var i = 1; i < range.length; i++) {
        if (range[i][0] === id) {
          sheet.getRange(i + 1, 1, 1, values.length).setValues([values]);
          break;
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ไม่มี action → คืนชื่อ sheet และจำนวนแถว
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        sheetName: sheet.getName(),
        rows: sheet.getLastRow()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  return doGet(e);
}
