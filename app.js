// ===== Dashboard App =====

Chart.register(ChartDataLabels);

// ---- State ----
let trendChart, donutChart, monthlyChart, waterChart, responseChart;
let incidentMap = null;
let mapMarkers  = [];
let currentRange = 7;
let filteredData = [];
let isAdminLoggedIn = false;

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  initDateDefaults();
  initClock();
  initMap();
  bindEvents();
  await applyFilter();
});

function initDateDefaults() {
  const today = new Date();
  const from  = new Date(today);
  from.setDate(from.getDate() - 6);
  setDateFrom(from);
  setDateTo(today);

  document.getElementById('todayLabel').textContent =
    'วันนี้: ' + today.toLocaleDateString('th-TH', { dateStyle: 'full' });
}

// ---- Date helpers ----
function getDateFrom() { return new Date(document.getElementById('dateFrom').value); }
function getDateTo()   { return new Date(document.getElementById('dateTo').value); }
function setDateFrom(date) { document.getElementById('dateFrom').value = formatDateInput(date); }
function setDateTo(date)   { document.getElementById('dateTo').value   = formatDateInput(date); }

function initClock() {
  function tick() {
    const now = new Date();
    document.getElementById('currentTime').textContent =
      now.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'medium' });
  }
  tick();
  setInterval(tick, 1000);
}

function bindEvents() {
  document.getElementById('applyFilter').addEventListener('click', async () => await applyFilter());

  // ปุ่มรีเฟรช — โหลดข้อมูลใหม่จาก Google Sheets
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');
    await applyFilter();
    btn.classList.remove('spinning');
    showNotification('โหลดข้อมูลล่าสุดแล้ว');
  });

  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = parseInt(btn.dataset.range);
      const today = new Date();
      const from  = new Date(today);
      if (currentRange > 0) from.setDate(from.getDate() - (currentRange - 1));
      setDateFrom(from);
      setDateTo(today);
      await applyFilter();
    });
  });

  // Map controls
  document.getElementById('mapFullscreen').addEventListener('click', toggleMapFullscreen);
  document.getElementById('mapLatest').addEventListener('click', goToLatestIncident);

  document.getElementById('tvMode').addEventListener('click', toggleTvMode);
  document.getElementById('tvExit').addEventListener('click', toggleTvMode);

  document.getElementById('exportBtn').addEventListener('click', exportCSV);

  // ค้นหาในตาราง
  document.getElementById('tableSearch').addEventListener('input', renderTable);

  // ค้นหาในแมพ
  document.getElementById('mapSearch').addEventListener('input', renderMap);

  // Detail Modal
  document.getElementById('detailModalClose').addEventListener('click', () => {
    document.getElementById('incidentDetailModal').classList.remove('open');
  });
  document.getElementById('incidentDetailModal').addEventListener('click', e => {
    if (e.target === document.getElementById('incidentDetailModal'))
      document.getElementById('incidentDetailModal').classList.remove('open');
  });
  document.getElementById('pdfBtn').addEventListener('click', openPdfModal);

  // Add Incident Modal
  document.getElementById('addIncident').addEventListener('click', openAddIncidentModal);
  document.getElementById('addIncidentClose').addEventListener('click', closeAddIncidentModal);
  document.getElementById('addIncidentCancel').addEventListener('click', closeAddIncidentModal);
  document.getElementById('addIncidentConfirm').addEventListener('click', saveIncident);
  document.getElementById('addIncidentModal').addEventListener('click', e => {
    if (e.target === document.getElementById('addIncidentModal')) closeAddIncidentModal();
  });

  // GPS button
  document.getElementById('btnGetGPS').addEventListener('click', () => {
    const btn = document.getElementById('btnGetGPS');
    const status = document.getElementById('gpsStatus');
    if (!navigator.geolocation) {
      status.textContent = '❌ เบราว์เซอร์นี้ไม่รองรับ GPS';
      status.className = 'gps-status error';
      return;
    }
    btn.disabled = true;
    status.textContent = '⏳ กำลังระบุตำแหน่ง...';
    status.className = 'gps-status loading';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);
        document.getElementById('incidentLat').value = lat.toFixed(6);
        document.getElementById('incidentLng').value = lng.toFixed(6);
        if (pickMarker && pickMap) {
          pickMarker.setLatLng([lat, lng]);
          pickMap.setView([lat, lng], 17);
        }
        // แจ้งเตือนถ้าความแม่นยำต่ำ (คอมพิวเตอร์มักได้ค่าสูงมาก)
        if (accuracy > 500) {
          status.innerHTML = `⚠️ ตำแหน่งไม่แม่นยำ (±${accuracy} ม.) — คอมพิวเตอร์ไม่มี GPS จริง<br><span style="color:var(--text-muted)">แนะนำให้ลาก 📌 บนแผนที่แทน</span>`;
          status.className = 'gps-status error';
        } else {
          status.textContent = `✅ ตำแหน่งปัจจุบัน (±${accuracy} ม.)`;
          status.className = 'gps-status success';
        }
        btn.disabled = false;
      },
      (err) => {
        const msgs = { 1: 'ไม่อนุญาตเข้าถึง GPS', 2: 'ไม่พบสัญญาณ GPS', 3: 'หมดเวลา' };
        status.textContent = `❌ ${msgs[err.code] || 'เกิดข้อผิดพลาด'} — ลาก 📌 บนแผนที่แทนได้เลย`;
        status.className = 'gps-status error';
        btn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  // พิมพ์พิกัดเอง → ย้าย marker
  document.getElementById('incidentLat').addEventListener('change', syncMarkerFromInputs);
  document.getElementById('incidentLng').addEventListener('change', syncMarkerFromInputs);

  // Login Modal
  document.getElementById('loginBtn').addEventListener('click', openLoginModal);
  document.getElementById('loginModalClose').addEventListener('click', closeLoginModal);
  document.getElementById('loginModalCancel').addEventListener('click', closeLoginModal);
  document.getElementById('loginModalConfirm').addEventListener('click', login);
  document.getElementById('loginModal').addEventListener('click', e => {
    if (e.target === document.getElementById('loginModal')) closeLoginModal();
  });
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // TV Filter Modal — เปิดจาก pill แสดงวันที่
  document.getElementById('tvDateLabel').addEventListener('click', () => {
    const from = getDateFrom();
    const to   = getDateTo();
    document.getElementById('tvDateFrom').value = isNaN(from) ? '' : formatDateInput(from);
    document.getElementById('tvDateTo').value   = isNaN(to)   ? '' : formatDateInput(to);    document.getElementById('tvDisasterFilter').value = document.getElementById('disasterFilter').value;
    document.getElementById('tvFilterModal').classList.add('open');
  });
  const closeTvFilter = () => document.getElementById('tvFilterModal').classList.remove('open');
  document.getElementById('tvFilterClose').addEventListener('click', closeTvFilter);
  document.getElementById('tvFilterCancel').addEventListener('click', closeTvFilter);
  document.getElementById('tvFilterModal').addEventListener('click', e => {
    if (e.target === document.getElementById('tvFilterModal')) closeTvFilter();
  });
  document.getElementById('tvFilterConfirm').addEventListener('click', async () => {
    const tvFrom = new Date(document.getElementById('tvDateFrom').value);
    const tvTo   = new Date(document.getElementById('tvDateTo').value);
    if (!isNaN(tvFrom)) setDateFrom(tvFrom);
    if (!isNaN(tvTo))   setDateTo(tvTo);
    document.getElementById('disasterFilter').value = document.getElementById('tvDisasterFilter').value;
    closeTvFilter();
    await applyFilter();
  });
  document.querySelectorAll('[data-tv-range]').forEach(btn => {
    btn.addEventListener('click', () => {
      const range = parseInt(btn.dataset.tvRange);
      const today = new Date();
      const from  = new Date(today);
      if (range > 0) from.setDate(from.getDate() - (range - 1));
      document.getElementById('tvDateFrom').value = formatDateInput(from);
      document.getElementById('tvDateTo').value   = formatDateInput(today);
    });
  });

  // PDF Modal
  document.getElementById('pdfModalClose').addEventListener('click', closePdfModal);
  document.getElementById('pdfModalCancel').addEventListener('click', closePdfModal);
  document.getElementById('pdfModal').addEventListener('click', e => {
    if (e.target === document.getElementById('pdfModal')) closePdfModal();
  });
  document.getElementById('pdfModalConfirm').addEventListener('click', () => {
    closePdfModal();
    exportPDF();
  });
  document.getElementById('pdfModalDownload').addEventListener('click', () => {
    closePdfModal();
    downloadPDF();
  });
  document.querySelectorAll('[data-pdf-range]').forEach(btn => {
    btn.addEventListener('click', () => {
      const range = parseInt(btn.dataset.pdfRange);
      const today = new Date();
      const from  = new Date(today);
      if (range > 0) from.setDate(from.getDate() - (range - 1));
      document.getElementById('pdfDateFrom').value = formatDateInput(from);
      document.getElementById('pdfDateTo').value   = formatDateInput(today);
    });
  });
}

function toggleTvMode() {
  document.body.classList.toggle('tv-mode');
  updateTvDateLabel();
  setTimeout(() => {
    [trendChart, donutChart, monthlyChart, waterChart, responseChart].forEach(c => c && c.resize());
    if (incidentMap) incidentMap.invalidateSize();
  }, 300);
}

function updateTvDateLabel() {
  const from    = getDateFrom();
  const to      = getDateTo();
  const typeVal = document.getElementById('disasterFilter').value;
  const typeLabel = typeVal === 'all' ? 'ทุกประเภทภัย' : (DISASTER_TYPES[typeVal]?.icon + ' ' + DISASTER_TYPES[typeVal]?.label);
  const fmt = d => isNaN(d) ? '?' : d.toLocaleDateString('th-TH', { dateStyle: 'medium' });
  const isSameDay = fmt(from) === fmt(to);
  const rangeText = isSameDay ? `<span class="tv-date-accent">${fmt(from)}</span>` : `<span class="tv-date-accent">${fmt(from)}</span> — <span class="tv-date-accent">${fmt(to)}</span>`;
  document.getElementById('tvDateLabel').innerHTML = `📅 ${rangeText} &nbsp;|&nbsp; ${typeLabel}<span class="tv-edit-hint">✏️ แตะเพื่อเปลี่ยน</span>`;
}

// ---- Filter & Render ----
async function applyFilter() {
  // โหลดข้อมูลจาก Google Sheets ก่อน
  if (typeof loadFromGoogleSheets === 'function') {
    try {
      const googleSheetsData = await loadFromGoogleSheets();
      if (googleSheetsData.length > 0) {
        // ใช้ข้อมูลจาก Google Sheets แทนข้อมูลจำลอง
        ALL_INCIDENTS.length = 0; // ล้างข้อมูลเก่า
        ALL_INCIDENTS.push(...googleSheetsData);
      }
    } catch (error) {
      console.log('Using mock data as fallback');
    }
  }

  const from = getDateFrom();
  const to   = getDateTo();
  to.setHours(23, 59, 59, 999);
  const type = document.getElementById('disasterFilter').value;

  filteredData = ALL_INCIDENTS.filter(inc => {
    const dateOk = inc.date >= from && inc.date <= to;
    const typeOk = type === 'all' || inc.type === type;
    return dateOk && typeOk;
  });

  renderKPIs();
  renderSummary();
  renderTrendChart();
  renderDonutChart();
  renderMonthlyChart();
  renderWaterChart();
  renderResponseChart();
  renderTable();
  renderMap();
  updateTvDateLabel();
  document.getElementById('footerDate').textContent =
    new Date().toLocaleDateString('th-TH', { dateStyle: 'long' });
}

// ---- KPI Cards ----
function renderKPIs() {
  const types = Object.keys(DISASTER_TYPES);
  types.forEach(type => {
    const count = filteredData.filter(i => i.type === type).length;
    const victims = filteredData.filter(i => i.type === type).reduce((s, i) => s + i.victims, 0);
    document.getElementById(`kpi-${type}`).textContent = count.toLocaleString('th-TH');
    document.getElementById(`kpi-${type}-sub`).textContent =
      victims > 0 ? `${victims.toLocaleString('th-TH')} ราย` : '';
  });
}

// ---- Summary ----
function renderSummary() {
  const total   = filteredData.length;
  const victims = filteredData.reduce((s, i) => s + i.victims, 0);
  const avgResp = total > 0
    ? Math.round(filteredData.reduce((s, i) => s + i.responseTime, 0) / total)
    : 0;
  const resolved = filteredData.filter(i => i.status === 'resolved').length;
  const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  animateCount('totalIncidents', total);
  animateCount('totalVictims', victims);
  document.getElementById('avgResponse').textContent = `${avgResp} นาที`;
  document.getElementById('resolvedRate').textContent = `${rate}%`;
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  const start = parseInt(el.textContent.replace(/,/g, '')) || 0;
  const duration = 600;
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const value = Math.round(start + (target - start) * easeOut(progress));
    el.textContent = value.toLocaleString('th-TH');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

// ---- Trend Chart ----
function renderTrendChart() {
  const from = getDateFrom();
  const to   = getDateTo();
  const days = Math.round((to - from) / 86400000) + 1;
  const labels = [];
  const datasets = {};

  Object.keys(DISASTER_TYPES).forEach(t => { datasets[t] = []; });

  for (let d = 0; d < days; d++) {
    const day = new Date(from);
    day.setDate(day.getDate() + d);
    const dayStr = formatDateInput(day);
    labels.push(day.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }));

    Object.keys(DISASTER_TYPES).forEach(type => {
      const count = filteredData.filter(i => formatDateInput(i.date) === dayStr && i.type === type).length;
      datasets[type].push(count);
    });
  }

  // แสดงเฉพาะ type ที่มีข้อมูล
  const activeTypes = Object.keys(DISASTER_TYPES).filter(t =>
    datasets[t].some(v => v > 0)
  );

  const chartDatasets = activeTypes.map(type => ({
    label: DISASTER_TYPES[type].label,
    data: datasets[type],
    borderColor: DISASTER_TYPES[type].color,
    backgroundColor: DISASTER_TYPES[type].color + '22',
    borderWidth: 2,
    pointRadius: days <= 14 ? 4 : 2,
    pointHoverRadius: 6,
    tension: 0.4,
    fill: false,
  }));

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(document.getElementById('trendChart'), {
    type: 'line',
    data: { labels, datasets: chartDatasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'top', labels: { color: '#8892b0', font: { family: 'Sarabun', size: 11 }, boxWidth: 12, padding: 12 } },
        datalabels: { display: false },
        tooltip: { backgroundColor: '#1a1d27', borderColor: '#2e3350', borderWidth: 1, titleColor: '#e8eaf6', bodyColor: '#8892b0', titleFont: { family: 'Sarabun' }, bodyFont: { family: 'Sarabun' } },
      },
      scales: {
        x: { ticks: { color: '#8892b0', font: { family: 'Sarabun', size: 10 }, maxTicksLimit: 14 }, grid: { color: '#2e3350' } },
        y: { ticks: { color: '#8892b0', font: { family: 'Sarabun' }, stepSize: 1 }, grid: { color: '#2e3350' }, beginAtZero: true },
      },
    },
  });
}

// ---- Donut Chart ----
function renderDonutChart() {
  const counts = Object.keys(DISASTER_TYPES).map(t => filteredData.filter(i => i.type === t).length);
  const labels = Object.keys(DISASTER_TYPES).map(t => DISASTER_TYPES[t].label);
  const colors = Object.keys(DISASTER_TYPES).map(t => DISASTER_TYPES[t].color);

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data: counts, backgroundColor: colors, borderColor: '#1a1d27', borderWidth: 3, hoverOffset: 8 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#8892b0', font: { family: 'Sarabun', size: 11 }, padding: 12, boxWidth: 12 } },
        datalabels: {
          color: '#fff',
          font: { family: 'Sarabun', size: 10, weight: 'bold' },
          formatter: (value, ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            return total > 0 && value > 0 ? Math.round(value / total * 100) + '%' : '';
          },
        },
        tooltip: { backgroundColor: '#1a1d27', borderColor: '#2e3350', borderWidth: 1, titleColor: '#e8eaf6', bodyColor: '#8892b0', titleFont: { family: 'Sarabun' }, bodyFont: { family: 'Sarabun' } },
      },
    },
  });
}

// ---- Monthly Bar Chart ----
function renderMonthlyChart() {
  const monthMap = {};
  filteredData.forEach(inc => {
    const key = `${inc.date.getFullYear()}-${String(inc.date.getMonth()+1).padStart(2,'0')}`;
    monthMap[key] = (monthMap[key] || 0) + 1;
  });

  const sortedKeys = Object.keys(monthMap).sort();
  const labels = sortedKeys.map(k => {
    const [y, m] = k.split('-');
    return new Date(y, m-1).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
  });
  const values = sortedKeys.map(k => monthMap[k]);

  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(document.getElementById('monthlyChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'จำนวนเหตุการณ์',
        data: values,
        backgroundColor: '#4f8ef7aa',
        borderColor: '#4f8ef7',
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: { color: '#8892b0', anchor: 'end', align: 'top', font: { family: 'Sarabun', size: 10 } },
        tooltip: { backgroundColor: '#1a1d27', borderColor: '#2e3350', borderWidth: 1, titleColor: '#e8eaf6', bodyColor: '#8892b0', titleFont: { family: 'Sarabun' }, bodyFont: { family: 'Sarabun' } },
      },
      scales: {
        x: { ticks: { color: '#8892b0', font: { family: 'Sarabun', size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#8892b0', font: { family: 'Sarabun' } }, grid: { color: '#2e3350' }, beginAtZero: true },
      },
    },
  });
}

// ---- Water Support Chart ----
function renderWaterChart() {
  const waterData = filteredData.filter(i => i.type === 'water');
  const monthMap = {};
  waterData.forEach(inc => {
    const key = `${inc.date.getFullYear()}-${String(inc.date.getMonth()+1).padStart(2,'0')}`;
    if (!monthMap[key]) monthMap[key] = { trips: 0, volume: 0 };
    monthMap[key].trips  += inc.waterTrucks;
    monthMap[key].volume += inc.waterVolume;
  });

  const sortedKeys = Object.keys(monthMap).sort();
  const labels  = sortedKeys.map(k => {
    const [y, m] = k.split('-');
    return new Date(y, m-1).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
  });
  const trips   = sortedKeys.map(k => monthMap[k].trips);
  const volumes = sortedKeys.map(k => Math.round(monthMap[k].volume / 1000)); // หน่วย: พัน ลิตร

  if (waterChart) waterChart.destroy();
  waterChart = new Chart(document.getElementById('waterChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'จำนวนเที่ยว (คัน)', data: trips, backgroundColor: '#06d6a0aa', borderColor: '#06d6a0', borderWidth: 1, borderRadius: 4, yAxisID: 'y' },
        { label: 'ปริมาณน้ำ (พัน ล.)', data: volumes, type: 'line', borderColor: '#00d4ff', backgroundColor: '#00d4ff22', borderWidth: 2, pointRadius: 3, tension: 0.4, yAxisID: 'y1' },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#8892b0', font: { family: 'Sarabun', size: 11 }, boxWidth: 12 } },
        datalabels: { display: false },
        tooltip: { backgroundColor: '#1a1d27', borderColor: '#2e3350', borderWidth: 1, titleColor: '#e8eaf6', bodyColor: '#8892b0', titleFont: { family: 'Sarabun' }, bodyFont: { family: 'Sarabun' } },
      },
      scales: {
        x:  { ticks: { color: '#8892b0', font: { family: 'Sarabun', size: 10 } }, grid: { display: false } },
        y:  { ticks: { color: '#8892b0', font: { family: 'Sarabun' } }, grid: { color: '#2e3350' }, beginAtZero: true, position: 'left' },
        y1: { ticks: { color: '#00d4ff', font: { family: 'Sarabun' } }, grid: { display: false }, beginAtZero: true, position: 'right' },
      },
    },
  });
}

// ---- Response Time Chart ----
function renderResponseChart() {
  const typeKeys = Object.keys(DISASTER_TYPES);
  const avgTimes = typeKeys.map(type => {
    const items = filteredData.filter(i => i.type === type);
    if (items.length === 0) return 0;
    return Math.round(items.reduce((s, i) => s + i.responseTime, 0) / items.length);
  });

  if (responseChart) responseChart.destroy();
  responseChart = new Chart(document.getElementById('responseChart'), {
    type: 'bar',
    data: {
      labels: typeKeys.map(t => DISASTER_TYPES[t].label),
      datasets: [{
        label: 'เวลาเฉลี่ย (นาที)',
        data: avgTimes,
        backgroundColor: typeKeys.map(t => DISASTER_TYPES[t].color + 'aa'),
        borderColor: typeKeys.map(t => DISASTER_TYPES[t].color),
        borderWidth: 1,
        borderRadius: 6,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: { color: '#e8eaf6', anchor: 'end', align: 'right', font: { family: 'Sarabun', size: 10 }, formatter: v => v > 0 ? `${v} นาที` : '' },
        tooltip: { backgroundColor: '#1a1d27', borderColor: '#2e3350', borderWidth: 1, titleColor: '#e8eaf6', bodyColor: '#8892b0', titleFont: { family: 'Sarabun' }, bodyFont: { family: 'Sarabun' } },
      },
      scales: {
        x: { ticks: { color: '#8892b0', font: { family: 'Sarabun' } }, grid: { color: '#2e3350' }, beginAtZero: true },
        y: { ticks: { color: '#e8eaf6', font: { family: 'Sarabun', size: 11 } }, grid: { display: false } },
      },
    },
  });
}

// ---- Table ----
function renderTable() {
  const tbody   = document.getElementById('incidentTableBody');
  const keyword = (document.getElementById('tableSearch')?.value || '').trim().toLowerCase();

  let rows = filteredData;

  // กรองตาม keyword
  if (keyword) {
    rows = rows.filter(inc => {
      const type    = DISASTER_TYPES[inc.type]?.label || '';
      const status  = inc.status === 'resolved' ? 'เสร็จสิ้น' : inc.status === 'ongoing' ? 'กำลังดำเนินการ' : 'มีการรับแจ้งเหตุ';
      return [inc.location, inc.victimName, inc.houseNumber, inc.victimPhone, inc.details, type, status]
        .some(v => (v || '').toLowerCase().includes(keyword));
    });
  }

  rows = rows.slice(0, 50);

  tbody.innerHTML = rows.map(inc => {
    const dt = inc.date.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
    const type = DISASTER_TYPES[inc.type];
    const statusMap = { resolved: ['badge-resolved', 'เสร็จสิ้น'], ongoing: ['badge-ongoing', 'กำลังดำเนินการ'], critical: ['badge-critical', 'มีการรับแจ้งเหตุ'] };
    const [cls, label] = statusMap[inc.status] || ['', inc.status];
    const waterInfo = inc.type === 'water' ? ` (${(inc.waterVolume/1000).toFixed(1)}k ล.)` : '';
    const victimInfo = inc.victimName 
      ? `${inc.victimName}${inc.houseNumber ? ` (${inc.houseNumber})` : ''}` 
      : `${inc.victims.toLocaleString('th-TH')} ราย`;
    const statusButtons = getStatusButtons(inc);
    return `
      <tr class="table-row-clickable" onclick="showIncidentDetail('${inc.id}')">
        <td>${dt}</td>
        <td>${type.icon} ${type.label}</td>
        <td>${inc.location}</td>
        <td>${victimInfo}${waterInfo}</td>
        <td>${inc.responseTime} นาที</td>
        <td><span class="badge ${cls}">${label}</span></td>
        <td onclick="event.stopPropagation()">${statusButtons}</td>
      </tr>`;
  }).join('');
}


// ---- Incident Detail Modal ----
function showIncidentDetail(incidentId) {
  const inc = ALL_INCIDENTS.find(i => i.id === incidentId);
  if (!inc) return;

  const type = DISASTER_TYPES[inc.type];
  const statusMap = { resolved: ['badge-resolved', 'เสร็จสิ้น'], ongoing: ['badge-ongoing', 'กำลังดำเนินการ'], critical: ['badge-critical', 'มีการรับแจ้งเหตุ'] };
  const [cls, label] = statusMap[inc.status] || ['', inc.status];
  const coordsInfo = (inc.lat && inc.lng)
    ? `<div class="detail-row"><span class="detail-label">📌 พิกัด</span><span>${inc.lat.toFixed(6)}, ${inc.lng.toFixed(6)}</span></div>
       <div class="detail-row"><a href="https://www.google.com/maps?q=${inc.lat},${inc.lng}" target="_blank" style="color:var(--accent)">🗺️ เปิดใน Google Maps</a></div>`
    : '';

  document.getElementById('detailTitle').textContent = `${type.icon} ${type.label} — ${inc.location}`;
  document.getElementById('detailModalBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-row"><span class="detail-label">🗓️ วันที่/เวลา</span><span>${inc.date.toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}</span></div>
      <div class="detail-row"><span class="detail-label">🏘️ หมู่บ้าน</span><span>${inc.location}</span></div>
      ${inc.victimName ? `<div class="detail-row"><span class="detail-label">👤 ชื่อผู้ประสบภัย</span><span>${inc.victimName}</span></div>` : ''}
      ${inc.houseNumber ? `<div class="detail-row"><span class="detail-label">🏠 บ้านเลขที่</span><span>${inc.houseNumber}</span></div>` : ''}
      ${inc.victimPhone ? `<div class="detail-row"><span class="detail-label">📞 เบอร์โทร</span><span><a href="tel:${inc.victimPhone}" style="color:var(--accent)">${inc.victimPhone}</a></span></div>` : ''}
      <div class="detail-row"><span class="detail-label">👥 จำนวนผู้ประสบภัย</span><span>${inc.victims.toLocaleString('th-TH')} ราย</span></div>
      <div class="detail-row"><span class="detail-label">⏱️ เวลาตอบสนอง</span><span>${inc.responseTime} นาที</span></div>
      <div class="detail-row"><span class="detail-label">📊 สถานะ</span><span class="badge ${cls}">${label}</span></div>
      ${inc.details ? `<div class="detail-row"><span class="detail-label">📝 รายละเอียด</span><span>${inc.details}</span></div>` : ''}
      ${coordsInfo}
    </div>
  `;
  document.getElementById('incidentDetailModal').classList.add('open');
}

// ---- Export CSV ----
function exportCSV() {
  const headers = ['วันที่', 'เวลา', 'ประเภทภัย', 'สถานที่', 'ผู้ได้รับผลกระทบ', 'เวลาตอบสนอง(นาที)', 'สถานะ'];
  const rows = filteredData.map(inc => [
    inc.date.toLocaleDateString('th-TH'),
    inc.date.toLocaleTimeString('th-TH'),
    DISASTER_TYPES[inc.type].label,
    inc.location,
    inc.victims,
    inc.responseTime,
    inc.status === 'resolved' ? 'เสร็จสิ้น' : inc.status === 'ongoing' ? 'กำลังดำเนินการ' : 'มีการรับแจ้งเหตุ',
  ]);

  const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `disaster_report_${formatDateInput(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Helpers ----
function formatDateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// ---- Map ----
// พิกัดจำลองในเขตจังหวัดขอนแก่น (ปรับตามพื้นที่จริง)
// หมายเหตุ: LOCATION_COORDS ถูกประกาศใน data.js แล้ว ไม่ต้องประกาศซ้ำที่นี่

function initMap() {
  // center ที่ตำบลวังหว้า อำเภอศรีประจันต์ จังหวัดสุพรรณบุรี
  incidentMap = L.map('incidentMap', { zoomControl: true }).setView([14.5693, 100.1469], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(incidentMap);

  // Marker เทศบาลตำบลวังหว้า
  const municipalityIcon = L.divIcon({
    html: `<div class="municipality-marker">📍</div>`,
    className: '',
    iconAnchor: [12, 12],
  });
  L.marker(WANG_YANG_CENTER, { icon: municipalityIcon, interactive: true })
    .bindPopup(`
      <strong>🏛️ เทศบาลตำบลวังหว้า</strong><br>
      📍 ตำบลวังหว้า อำเภอศรีประจันต์<br>
      จังหวัดสุพรรณบุรี
    `)
    .addTo(incidentMap);

  // Legend
  const legend = document.getElementById('mapLegend');
  legend.innerHTML = Object.entries(DISASTER_TYPES).map(([, v]) =>
    `<span class="map-legend-item"><span class="map-legend-dot" style="background:${v.color}"></span>${v.label}</span>`
  ).join('');
}

function renderMap() {
  if (!incidentMap) return;

  // ลบ markers เดิม
  mapMarkers.forEach(m => m.remove());
  mapMarkers = [];

  const keyword = (document.getElementById('mapSearch')?.value || '').trim().toLowerCase();

  // กรองตาม keyword ถ้ามี
  let mapData = filteredData;
  if (keyword) {
    mapData = mapData.filter(inc => {
      const type   = DISASTER_TYPES[inc.type]?.label || '';
      const status = inc.status === 'resolved' ? 'เสร็จสิ้น' : inc.status === 'ongoing' ? 'กำลังดำเนินการ' : 'มีการรับแจ้งเหตุ';
      return [inc.location, inc.victimName, inc.houseNumber, inc.victimPhone, inc.details, type, status]
        .some(v => (v || '').toLowerCase().includes(keyword));
    });
  }

  // แสดงเฉพาะ 200 รายการล่าสุดเพื่อประสิทธิภาพ
  const recent = mapData.slice(0, 200);

  recent.forEach(inc => {
    // ใช้พิกัดจริงถ้ามี ไม่งั้นใช้พิกัดหมู่บ้าน + กระจายเล็กน้อย
    let lat, lng;
    if (inc.lat && inc.lng && !isNaN(inc.lat) && !isNaN(inc.lng)) {
      lat = inc.lat;
      lng = inc.lng;
    } else {
      const base = LOCATION_COORDS[inc.location];
      if (!base) return;
      lat = base[0] + (Math.random() - 0.5) * 0.008;
      lng = base[1] + (Math.random() - 0.5) * 0.008;
    }
    const color = DISASTER_TYPES[inc.type].color;
    const icon  = DISASTER_TYPES[inc.type].icon;

    const marker = L.circleMarker([lat, lng], {
      radius: inc.status === 'critical' ? 10 : 7,
      fillColor: color,
      color: '#fff',
      weight: 1.5,
      opacity: 1,
      fillOpacity: inc.status === 'critical' ? 1 : 0.75,
    });

    const statusLabel = { resolved: 'เสร็จสิ้น', ongoing: 'กำลังดำเนินการ', critical: '⚠️ มีการรับแจ้งเหตุ' };
    const victimInfo = inc.victimName ? `👤 ${inc.victimName}${inc.houseNumber ? `<br>🏠 ${inc.houseNumber}` : ''}<br>${inc.victimPhone ? `📞 ${inc.victimPhone}<br>` : ''}` : '';
    const coordsInfo = (lat && lng) ? `<br>📌 ${lat.toFixed(6)}, ${lng.toFixed(6)}<br><a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" style="color:#4f8ef7">🗺️ เปิดใน Google Maps</a>` : '';
    marker.bindPopup(`
      <strong>${icon} ${DISASTER_TYPES[inc.type].label}</strong><br>
      📍 ${inc.location}<br>
      ${victimInfo}
      🗓️ ${inc.date.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}<br>
      👥 ${inc.victims} ราย &nbsp;|&nbsp; ⏱️ ${inc.responseTime} นาที<br>
      สถานะ: ${statusLabel[inc.status] || inc.status}
      ${inc.details ? `<br><br>📝 ${inc.details}` : ''}
      ${coordsInfo}
    `);

    marker.addTo(incidentMap);
    mapMarkers.push(marker);
  });
}

// ---- PDF Modal ----
function openPdfModal() {
  const from = getDateFrom();
  const to   = getDateTo();
  document.getElementById('pdfDateFrom').value = isNaN(from) ? '' : formatDateInput(from);
  document.getElementById('pdfDateTo').value   = isNaN(to)   ? '' : formatDateInput(to);
  document.getElementById('pdfDisasterFilter').value = document.getElementById('disasterFilter').value;
  document.getElementById('pdfStatusFilter').value   = 'all';
  document.getElementById('pdfModal').classList.add('open');
}
function closePdfModal() {
  document.getElementById('pdfModal').classList.remove('open');
}

function getPdfHtml() {
  // ใช้ร่วมกันระหว่าง print และ download
  return exportPDF(true);
}

function downloadPDF() {
  const html = exportPDF(true);
  if (!html) return;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const fromDate = new Date(document.getElementById('pdfDateFrom').value);
  const dateStr  = isNaN(fromDate) ? formatDateInput(new Date()) : formatDateInput(fromDate);
  a.href     = url;
  a.download = `รายงานสาธารณภัย_${dateStr}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Add Incident Modal ----
let pickMap = null;
let pickMarker = null;
const WANG_YANG_CENTER = [14.570544414831959, 100.14489966286149];

function openAddIncidentModal() {
  // ตั้งค่าเริ่มต้นวันที่และเวลาปัจจุบัน
  const now = new Date();
  document.getElementById('incidentDate').value = formatDateInput(now);
  // ตั้งเวลาปัจจุบันแบบ 24 ชม.
  document.getElementById('incidentHour').value   = String(now.getHours());
  document.getElementById('incidentMinute').value = String(now.getMinutes()).padStart(2, '0');
  
  // เคลียร์ฟอร์ม
  document.getElementById('incidentType').value = '';
  document.getElementById('incidentSubdistrict').value = '';
  document.getElementById('victimName').value = '';
  document.getElementById('houseNumber').value = '';
  document.getElementById('victimPhone').value = '';
  document.getElementById('victimCount').value = '1';
  document.getElementById('incidentStatus').value = 'critical';
  document.getElementById('incidentDetails').value = '';
  document.getElementById('incidentLat').value = '';
  document.getElementById('incidentLng').value = '';
  document.getElementById('gpsStatus').textContent = '';
  document.getElementById('gpsStatus').className = 'gps-status';
  
  document.getElementById('addIncidentModal').classList.add('open');

  // init mini map หลัง modal เปิด (ต้องรอ DOM visible)
  setTimeout(() => initPickMap(), 100);
}

function initPickMap() {
  if (pickMap) {
    pickMap.remove();
    pickMap = null;
    pickMarker = null;
  }

  pickMap = L.map('pickMap', { zoomControl: true }).setView(WANG_YANG_CENTER, 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(pickMap);

  // Draggable marker ตรงกลาง
  pickMarker = L.marker(WANG_YANG_CENTER, { draggable: true }).addTo(pickMap);
  syncCoordsFromMarker(pickMarker.getLatLng());

  // ลาก marker → อัปเดต input
  pickMarker.on('dragend', () => {
    syncCoordsFromMarker(pickMarker.getLatLng());
  });

  // คลิกแผนที่ → ย้าย marker
  pickMap.on('click', (e) => {
    pickMarker.setLatLng(e.latlng);
    syncCoordsFromMarker(e.latlng);
  });
}

function syncCoordsFromMarker(latlng) {
  document.getElementById('incidentLat').value = latlng.lat.toFixed(6);
  document.getElementById('incidentLng').value = latlng.lng.toFixed(6);
}

function syncMarkerFromInputs() {
  const lat = parseFloat(document.getElementById('incidentLat').value);
  const lng = parseFloat(document.getElementById('incidentLng').value);
  if (!isNaN(lat) && !isNaN(lng) && pickMarker && pickMap) {
    pickMarker.setLatLng([lat, lng]);
    pickMap.setView([lat, lng], pickMap.getZoom());
  }
}

function closeAddIncidentModal() {
  document.getElementById('addIncidentModal').classList.remove('open');
  // destroy mini map เพื่อ free memory
  if (pickMap) {
    pickMap.remove();
    pickMap = null;
    pickMarker = null;
  }
}

function saveIncident() {
  // ตรวจสอบข้อมูลที่จำเป็น
  const date   = document.getElementById('incidentDate').value;
  const hour   = document.getElementById('incidentHour').value.padStart(2, '0');
  const minute = document.getElementById('incidentMinute').value.padStart(2, '0');
  const time   = `${hour}:${minute}`;
  const type   = document.getElementById('incidentType').value;
  const subdistrict = document.getElementById('incidentSubdistrict').value;
  const victimName  = document.getElementById('victimName').value;
  const houseNumber = document.getElementById('houseNumber').value;
  const victimPhone = document.getElementById('victimPhone').value;
  const victimCount = document.getElementById('victimCount').value;
  const status = document.getElementById('incidentStatus').value;
  const details = document.getElementById('incidentDetails').value;

  if (!date || !hour || !minute || !type || !subdistrict || !victimName || !houseNumber || !victimCount) {
    alert('กรุณากรอกข้อมูลที่จำเป็นทั้งหมด');
    return;
  }
  if (parseInt(hour) < 0 || parseInt(hour) > 23) {
    alert('ชั่วโมงต้องอยู่ระหว่าง 0-23');
    return;
  }
  if (parseInt(minute) < 0 || parseInt(minute) > 59) {
    alert('นาทีต้องอยู่ระหว่าง 0-59');
    return;
  }

  // สร้างข้อมูลเหตุการณ์ใหม่
  const incidentDateTime = new Date(`${date}T${time}`);

  // พิกัด: ใช้ที่กรอก/เลือกบนแผนที่ ถ้าไม่มีใช้พิกัดหมู่บ้านเริ่มต้น
  const latVal = parseFloat(document.getElementById('incidentLat').value);
  const lngVal = parseFloat(document.getElementById('incidentLng').value);
  const defaultCoords = LOCATION_COORDS[subdistrict] || WANG_YANG_CENTER;
  const coords = (!isNaN(latVal) && !isNaN(lngVal)) ? [latVal, lngVal] : defaultCoords;

  const newIncident = {
    id: `INC-${date.replace(/-/g, '')}-${String(Date.now()).slice(-3)}`,
    date: incidentDateTime,
    type,
    location: subdistrict,
    lat: coords[0],
    lng: coords[1],
    victimName,
    houseNumber,
    victimPhone,
    victims: parseInt(victimCount),
    status,
    details,
    responseTime: Math.floor(Math.random() * 30) + 10,
    waterTrucks: type === 'water' ? Math.floor(Math.random() * 3) + 1 : 0,
    waterVolume: type === 'water' ? Math.floor(Math.random() * 15000) + 5000 : 0
  };

  // บันทึกไป Google Sheets
  handleSaveToSheets(newIncident);
  
  // เพิ่มข้อมูลลงในระบบ
  ALL_INCIDENTS.unshift(newIncident);
  
  // รีเฟรชข้อมูล
  applyFilter();
  
  // ปิด modal
  closeAddIncidentModal();
  
  // แสดงข้อความสำเร็จ
  showNotification('บันทึกข้อมูลสำเร็จแล้ว');
}

function handleSaveToSheets(incident) {
  // ตรวจสอบว่าตั้งค่า Google Sheets แล้วหรือไม่
  if (typeof isGoogleSheetsConfigured === 'function' && isGoogleSheetsConfigured()) {
    // ใช้ฟังก์ชัน saveToGoogleSheets จาก google-sheets-simple.js
    saveToGoogleSheets(incident).then(success => {
      if (success) {
        showNotification('บันทึกข้อมูลลง Google Sheets สำเร็จ');
      }
    });
  } else {
    // จำลองการบันทึก - สำหรับการทดสอบ
    console.log('Google Sheets not configured, saving locally:', incident);
    setTimeout(() => {
      console.log('Local save simulated');
      showNotification('บันทึกข้อมูลสำเร็จ (โหมดทดสอบ)');
    }, 500);
  }
}

// ---- Authentication ----
function openLoginModal() {
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginModal').classList.add('open');
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.remove('open');
}

function login() {
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;

  // ตรวจสอบข้อมูล (ทดสอบ: admin/1234)
  if (username === 'admin' && password === '1234') {
    isAdminLoggedIn = true;
    document.body.classList.add('admin-logged-in');
    
    // แสดง user info, ซ่อน login btn
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('userInfo').style.display = 'flex';
    document.getElementById('userName').textContent = username;
    
    closeLoginModal();
    showNotification('เข้าสู่ระบบสำเร็จแล้ว');
    
    // รีเฟรชข้อมูลเพื่อแสดงปุ่ม admin
    renderTable();
  } else {
    showNotification('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
}

function logout() {
  isAdminLoggedIn = false;
  document.body.classList.remove('admin-logged-in');
  
  // แสดง login btn, ซ่อน user info
  document.getElementById('loginBtn').style.display = 'inline-flex';
  document.getElementById('userInfo').style.display = 'none';
  
  showNotification('ออกจากระบบแล้ว');
  
  // รีเฟรชข้อมูลเพื่อซ่อนปุ่ม admin
  renderTable();
}

// ---- Status Management ----
function getStatusButtons(incident) {
  // แสดงปุ่มเฉพาะ admin ที่ login
  if (!isAdminLoggedIn) return '';
  
  let buttons = '';
  
  if (incident.status === 'critical') {
    buttons = `<button class="btn-status ongoing admin-controls" onclick="updateIncidentStatus('${incident.id}', 'ongoing')">🔄 ดำเนินการ</button>`;
  } else if (incident.status === 'ongoing') {
    buttons = `<button class="btn-status resolved admin-controls" onclick="updateIncidentStatus('${incident.id}', 'resolved')">✅ เสร็จสิ้น</button>`;
  }
  
  return buttons;
}

function updateIncidentStatus(incidentId, newStatus) {
  if (!isAdminLoggedIn) {
    showNotification('ต้องเข้าสู่ระบบก่อน');
    return;
  }

  const incident = ALL_INCIDENTS.find(inc => inc.id === incidentId);
  if (!incident) return;

  incident.status = newStatus;

  // อัปเดตใน Google Sheets
  if (typeof isGoogleSheetsConfigured === 'function' && isGoogleSheetsConfigured()) {
    updateStatusInGoogleSheets(incident);
  }

  // รีเฟรช UI โดยไม่โหลดข้อมูลจาก Sheets ใหม่
  const from = getDateFrom();
  const to   = getDateTo();
  to.setHours(23, 59, 59, 999);
  const type = document.getElementById('disasterFilter').value;

  filteredData = ALL_INCIDENTS.filter(inc => {
    const dateOk = inc.date >= from && inc.date <= to;
    const typeOk = type === 'all' || inc.type === type;
    return dateOk && typeOk;
  });

  renderKPIs();
  renderSummary();
  renderTable();
  renderMap();

  const statusLabels = { critical: 'มีการรับแจ้งเหตุ', ongoing: 'กำลังดำเนินการ', resolved: 'เสร็จสิ้น' };
  showNotification(`อัปเดตสถานะเป็น "${statusLabels[newStatus]}" เรียบร้อย`);
}

async function updateStatusInGoogleSheets(incident) {
  try {
    const webAppUrl = GOOGLE_SHEETS_CONFIG.WEB_APP_URL;

    // ใช้รูปแบบวันที่เดียวกับ saveToGoogleSheets
    const d = incident.date;
    const dateStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

    const values = JSON.stringify([
      incident.id,
      dateStr,
      incident.type,
      incident.location,
      incident.victimName  || '',
      incident.houseNumber || '',
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

    const url = `${webAppUrl}?action=update&id=${encodeURIComponent(incident.id)}&values=${encodeURIComponent(values)}`;
    await fetch(url, { method: 'GET', mode: 'no-cors' });

  } catch (error) {
    console.error('Error updating status in Google Sheets:', error);
  }
}

function showNotification(message) {
  // สร้าง notification แบบง่าย
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--teal);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    z-index: 9999;
    font-family: 'Sarabun', sans-serif;
    font-weight: 500;
    box-shadow: var(--shadow);
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// ---- Map Controls ----
function toggleMapFullscreen() {
  const mapContainer = document.getElementById('incidentMap').parentElement;
  mapContainer.classList.toggle('map-fullscreen');
  
  setTimeout(() => {
    if (incidentMap) incidentMap.invalidateSize();
  }, 300);
}

function goToLatestIncident() {
  if (!incidentMap) return;
  // กลับไปที่ศูนย์กลางเทศบาลตำบลวังหว้า
  incidentMap.setView(WANG_YANG_CENTER, 15);
}

// ---- Export PDF (Print Window) ----
function exportPDF(returnHtml = false) {
  const orgName   = document.getElementById('orgName').textContent;
  const fromDate  = new Date(document.getElementById('pdfDateFrom').value);
  const toDate    = new Date(document.getElementById('pdfDateTo').value);
  toDate.setHours(23, 59, 59, 999);
  const typeFilter   = document.getElementById('pdfDisasterFilter').value;
  const statusFilter = document.getElementById('pdfStatusFilter').value;

  const dateFrom  = fromDate.toLocaleDateString('th-TH', { dateStyle: 'long' });
  const dateTo    = toDate.toLocaleDateString('th-TH', { dateStyle: 'long' });

  // กรองตามวันที่ + ประเภทภัย + สถานะ
  const pdfData = ALL_INCIDENTS.filter(i => {
    const dateOk   = i.date >= fromDate && i.date <= toDate;
    const typeOk   = typeFilter   === 'all' || i.type   === typeFilter;
    const statusOk = statusFilter === 'all' || i.status === statusFilter;
    return dateOk && typeOk && statusOk;
  });

  // label สำหรับ filter ที่เลือก
  const typeLabel   = typeFilter   === 'all' ? 'ทุกประเภทภัย' : `${DISASTER_TYPES[typeFilter]?.icon} ${DISASTER_TYPES[typeFilter]?.label}`;
  const statusLabel = statusFilter === 'all' ? 'ทุกสถานะ' : { critical: '⚠️ มีการรับแจ้งเหตุ', ongoing: '🔄 กำลังดำเนินการ', resolved: '✅ เสร็จสิ้น' }[statusFilter];

  const total    = pdfData.length;
  const victims  = pdfData.reduce((s, i) => s + i.victims, 0);
  const avgResp  = total > 0 ? Math.round(pdfData.reduce((s, i) => s + i.responseTime, 0) / total) : 0;
  const resolved = pdfData.filter(i => i.status === 'resolved').length;
  const rate     = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const printDate = new Date().toLocaleDateString('th-TH', { dateStyle: 'full' });

  const typeRows = Object.keys(DISASTER_TYPES)
    .filter(t => typeFilter === 'all' || t === typeFilter)
    .map((type, idx) => {
      const items   = pdfData.filter(i => i.type === type);
      const count   = items.length;
      const vic     = items.reduce((s, i) => s + i.victims, 0);
      const avgR    = count > 0 ? Math.round(items.reduce((s, i) => s + i.responseTime, 0) / count) : 0;
      const res     = items.filter(i => i.status === 'resolved').length;
      const resRate = count > 0 ? Math.round(res / count * 100) : 0;
      const bg      = idx % 2 === 0 ? '#fff' : '#f9f9f9';
      return `<tr style="background:${bg}">
        <td>${DISASTER_TYPES[type].icon} ${DISASTER_TYPES[type].label}</td>
        <td style="text-align:center">${count}</td>
        <td style="text-align:center">${vic.toLocaleString('th-TH')} ราย</td>
        <td style="text-align:center">${count > 0 ? avgR + ' นาที' : '-'}</td>
        <td style="text-align:center">${count > 0 ? resRate + '%' : '-'}</td>
      </tr>`;
    }).join('');

  const statusTh = { resolved: 'เสร็จสิ้น', ongoing: 'กำลังดำเนินการ', critical: 'มีการรับแจ้งเหตุ' };
  const incRows = pdfData.slice(0, 50).map((inc, idx) => {
    const bg = idx % 2 === 0 ? '#fff' : '#f9f9f9';
    return `<tr style="background:${bg}">
      <td>${inc.date.toLocaleDateString('th-TH')}</td>
      <td>${inc.date.toLocaleTimeString('th-TH', { timeStyle: 'short' })}</td>
      <td>${DISASTER_TYPES[inc.type].icon} ${DISASTER_TYPES[inc.type].label}</td>
      <td>${inc.location}</td>
      <td>${inc.victimName || '-'}</td>
      <td style="text-align:center">${inc.victims.toLocaleString('th-TH')} ราย</td>
      <td style="text-align:center">${inc.responseTime} นาที</td>
      <td style="text-align:center">${statusTh[inc.status] || inc.status}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8"/>
  <title>รายงานสาธารณภัย</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Sarabun', sans-serif; font-size: 13px; color: #222; background: #fff; }
    .header { background: linear-gradient(135deg,#c0392b,#e74c3c); color: #fff; padding: 16px 24px; }
    .header h1 { font-size: 18px; font-weight: 700; }
    .header p  { font-size: 12px; opacity: .85; margin-top: 3px; }
    .meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px; padding: 10px 24px; background: #f5f5f5; border-bottom: 2px solid #c0392b; font-size: 12px; color: #555; }
    .section { padding: 14px 24px 0; }
    .section-title { font-size: 14px; font-weight: 700; color: #c0392b; border-left: 4px solid #c0392b; padding-left: 8px; margin-bottom: 10px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 16px; }
    .summary-box { border: 1px solid #ddd; border-radius: 6px; padding: 10px; text-align: center; }
    .summary-box .val { font-size: 20px; font-weight: 700; color: #c0392b; }
    .summary-box .lbl { font-size: 11px; color: #777; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
    thead tr { background: #c0392b; color: #fff; }
    thead th { padding: 7px 8px; text-align: left; font-weight: 600; }
    tbody td { padding: 6px 8px; border-bottom: 1px solid #eee; }
    .footer { text-align: center; font-size: 10px; color: #aaa; padding: 12px 24px; border-top: 1px solid #eee; margin-top: 8px; }
    @media print {
      @page { size: A4; margin: 10mm 12mm; }
      body { font-size: 11px; }
      .header h1 { font-size: 15px; }
      .summary-box .val { font-size: 16px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>รายงานสรุปสถิติงานป้องกันและบรรเทาสาธารณภัย</h1>
    <p>${orgName}</p>
  </div>
  <div class="meta">
    <span>ช่วงเวลา: ${dateFrom} — ${dateTo}</span>
    <span>ประเภทภัย: ${typeLabel}</span>
    <span>สถานะ: ${statusLabel}</span>
    <span>วันที่พิมพ์: ${printDate}</span>
  </div>

  <div class="section">
    <div class="section-title">สรุปภาพรวม</div>
    <div class="summary-grid">
      <div class="summary-box"><div class="val">${total.toLocaleString('th-TH')}</div><div class="lbl">เหตุการณ์ทั้งหมด</div></div>
      <div class="summary-box"><div class="val">${victims.toLocaleString('th-TH')}</div><div class="lbl">ผู้ได้รับความช่วยเหลือ (ราย)</div></div>
      <div class="summary-box"><div class="val">${avgResp} นาที</div><div class="lbl">เวลาตอบสนองเฉลี่ย</div></div>
      <div class="summary-box"><div class="val">${rate}%</div><div class="lbl">อัตราเสร็จสิ้น</div></div>
    </div>
  </div>

  ${typeFilter === 'all' ? `
  <div class="section">
    <div class="section-title">สถิติแยกตามประเภทภัย</div>
    <table>
      <thead><tr>
        <th>ประเภทภัย</th><th>จำนวนเหตุการณ์</th><th>ผู้ได้รับผลกระทบ</th><th>เวลาตอบสนองเฉลี่ย</th><th>เสร็จสิ้น</th>
      </tr></thead>
      <tbody>${typeRows}</tbody>
    </table>
  </div>` : ''}

  <div class="section">
    <div class="section-title">รายการเหตุการณ์ (${total} รายการ)</div>
    <table>
      <thead><tr>
        <th>วันที่</th><th>เวลา</th><th>ประเภทภัย</th><th>หมู่บ้าน</th><th>ชื่อผู้ประสบภัย</th><th>ผู้ได้รับผลกระทบ</th><th>เวลาตอบสนอง</th><th>สถานะ</th>
      </tr></thead>
      <tbody>${incRows}</tbody>
    </table>
  </div>

  <div class="footer">เอกสารนี้ออกโดยระบบแดชบอร์ดงานป้องกันและบรรเทาสาธารณภัย</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  if (returnHtml) return html;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.addEventListener('afterprint', () => { win.close(); window.focus(); });
  win.addEventListener('focus', () => { setTimeout(() => window.focus(), 300); });
}

