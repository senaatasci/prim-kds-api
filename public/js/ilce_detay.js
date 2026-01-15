// ===============================
// GLOBAL DEĞİŞKENLER
// ===============================
let chartAylikTrend,
    chartHedefTrend,
    chartMetrikTrend,
    chartPersonel,
    chartSube,
    chartRadar;

// ===============================
// ELEMENTLER
// ===============================
const ilceSelect = document.getElementById("ilceSelect");
const btnUygula = document.getElementById("btnUygula");

const kpiPerformans = document.getElementById("kpiPerformans");
const kpiPersonel   = document.getElementById("kpiPersonel");
const kpiHedef      = document.getElementById("kpiHedef");
const kpiGercek     = document.getElementById("kpiGercek");
const kpiOran       = document.getElementById("kpiOran");

// ===============================
// YARDIMCI
// ===============================
function destroy(chart) {
  if (chart) chart.destroy();
}

function fmtNumber(n) {
  return Number(n || 0).toLocaleString("tr-TR");
}

// ===============================
// İLÇE LİSTESİNİ DOLDUR
// ===============================
async function loadIlceler() {
  const res = await fetch("/api/ilce-detay/filters");
  const data = await res.json();

  ilceSelect.innerHTML = "";
  data.ilceler.forEach(ilce => {
    const opt = document.createElement("option");
    opt.value = ilce;
    opt.textContent = ilce;
    ilceSelect.appendChild(opt);
  });
}

// ===============================
// DASHBOARD VERİLERİ
// ===============================
async function loadDashboard() {
  const ilce = ilceSelect.value;

  const res = await fetch(`/api/ilce-detay/dashboard?ilce=${encodeURIComponent(ilce)}`);
  const data = await res.json();

  if (data && data.kpi) {
  setKpi(data.kpi);
} else {
  console.error("KPI verisi gelmedi", data);
}

  renderCharts(data.charts);
}

// ===============================
// KPI SET
// ===============================
function setKpi(kpi) {
  const rawPerformans = Number(kpi.ortalama_performans || 0);
  const normalizedPerformans = rawPerformans > 1000 ? rawPerformans / 100 : rawPerformans;
  kpiPerformans.textContent = normalizedPerformans.toFixed(2);
  kpiPersonel.textContent   = fmtNumber(kpi.toplam_personel);
  kpiHedef.textContent      = fmtNumber(kpi.toplam_hedef);
  kpiGercek.textContent     = fmtNumber(kpi.toplam_gercek);
  kpiOran.textContent       = `%${Number(kpi.hedef_gercek_oran || 0).toFixed(1)}`;
}


// ===============================
// GRAFİKLER
// ===============================
function renderCharts(charts) {

  /* ===========================
     1️⃣ Aylık Ortalama Performans
  =========================== */
  destroy(chartAylikTrend);
  chartAylikTrend = new Chart(document.getElementById("chartAylikTrend"), {
    type: "line",
    data: {
      labels: charts.aylikTrend.map(r => r.donem),
      datasets: [{
        label: "Ortalama Skor",
        data: charts.aylikTrend.map(r => Number(r.skor)),
        borderColor: "#2f6fed",
        backgroundColor: "rgba(47,111,237,0.15)",
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });

  /* ===========================
     2️⃣ Hedef – Gerçekleşen Trend
  =========================== */
  destroy(chartHedefTrend);
  chartHedefTrend = new Chart(document.getElementById("chartHedefTrend"), {
    type: "line",
    data: {
      labels: charts.hedefGercekTrend.map(r => r.donem),
      datasets: [
        {
          label: "Hedef",
          data: charts.hedefGercekTrend.map(r => Number(r.hedef)),
          borderColor: "#ff9f40",
          backgroundColor: "rgba(255,159,64,0.15)",
          tension: 0.3,
          fill: true
        },
        {
          label: "Gerçekleşen",
          data: charts.hedefGercekTrend.map(r => Number(r.gercek)),
          borderColor: "#2ecc71",
          backgroundColor: "rgba(46,204,113,0.15)",
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  /* ===========================
     3️⃣ 4 Ana Metrik Skor Trendleri
  =========================== */
  destroy(chartMetrikTrend);

  const donemler = [...new Set(charts.metrikTrend.map(r => r.donem))];
  const metrikMap = {};

  charts.metrikTrend.forEach(r => {
    if (!metrikMap[r.metrik_adi]) metrikMap[r.metrik_adi] = {};
    metrikMap[r.metrik_adi][r.donem] = Number(r.oran);
  });

  chartMetrikTrend = new Chart(document.getElementById("chartMetrikTrend"), {
    type: "line",
    data: {
      labels: donemler,
      datasets: Object.keys(metrikMap).map((m, i) => ({
        label: m,
        data: donemler.map(d => metrikMap[m][d] || 0),
        tension: 0.3,
        borderWidth: 2
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, max: 120 } }
    }
  });

  

  /* ===========================
     5️⃣ Şube Performans
  =========================== */
 // ===============================
// ŞUBE PERFORMANS KARŞILAŞTIRMASI
// ===============================

// charts objesi fetch sonrası zaten tanımlı
// const charts = data.charts;

// ✅ Grafik datasına göre koşullu gösterim
const showSubeChart =
  Array.isArray(charts.subePerformans) &&
  charts.subePerformans.length >= 2;

const chartWrapper = document.getElementById("sube-performans-wrapper");
const infoMessage = document.getElementById("sube-performans-message");

if (showSubeChart) {
  chartWrapper.style.display = "block";
  infoMessage.style.display = "none";
} else {
  chartWrapper.style.display = "none";
  infoMessage.style.display = "block";
}

// ✅ Grafik SADECE karşılaştırma varsa çizilir
if (showSubeChart) {

  // chartSube varsa temizle
  if (chartSube) {
    chartSube.destroy();
  }

  chartSube = new Chart(
    document.getElementById("subePerformansChart"), // ⚠️ DOĞRU ID
    {
      type: "bar",
      data: {
        labels: charts.subePerformans.map(r => r.sube_adi),
        datasets: [{
          label: "Şube Performans Skoru",
          data: charts.subePerformans.map(r => Number(r.skor)),
          backgroundColor: "rgba(54,162,235,0.6)"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    }
  );
}


  // ===============================
// Metrik Bazlı Hedef – Gerçekleşme (Grouped Bar)
// ===============================


}
// ===============================
// EVENTLER
// ===============================
btnUygula.addEventListener("click", loadDashboard);

// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  await loadIlceler();
  await loadDashboard();
});
