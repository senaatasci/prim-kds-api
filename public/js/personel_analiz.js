// ===============================
// GLOBAL DEĞİŞKENLER
// ===============================
let chartPersonel = null;
let chartHedefGerceklesen = null;
let chartRolHedef = null;
let chartPersonelTrend = null;

let selectedPersonelId = null;

// ===============================
// ELEMENTLER
// ===============================
const ilceSelect = document.getElementById("ilceSelect");
const btnUygula = document.getElementById("btnUygula");
const personelSelect = document.getElementById("personelSelect");
const donemSelect = document.getElementById("donemSelect");

// KPI
const kpiPerformans = document.getElementById("kpiPerformans");
const kpiPersonel   = document.getElementById("kpiPersonel");
const kpiHedef      = document.getElementById("kpiHedef");
const kpiGercek     = document.getElementById("kpiGercek");
const kpiOran       = document.getElementById("kpiOran");

// ===============================
// YARDIMCI
// ===============================
function destroy(chart) {
  if (chart && typeof chart.destroy === "function") {
    chart.destroy();
  }
}

function fmtNumber(n) {
  return Number(n || 0).toLocaleString("tr-TR");
}

// ===============================
// İLÇELER
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
async function loadDonemler() {
  const res = await fetch("/api/personel-analiz/donemler");
  const data = await res.json();

  donemSelect.innerHTML = "";
  const tumOpt = document.createElement("option");
  tumOpt.value = "6ay";
  tumOpt.textContent = "Son 6 Ay";
  donemSelect.appendChild(tumOpt);

  (data || []).slice(0, 6).forEach(donem => {
    const opt = document.createElement("option");
    opt.value = donem;
    opt.textContent = donem;
    donemSelect.appendChild(opt);
  });
}

// ===============================
// DASHBOARD
// ===============================
async function loadDashboard() {
  const ilce = ilceSelect.value;
  const res = await fetch(`/api/ilce-detay/dashboard?ilce=${encodeURIComponent(ilce)}`);
  const data = await res.json();

  if (data?.kpi) setKpi(data.kpi);
  renderPersonelChart(data.charts.personelPerformans);
}

// ===============================
// KPI
// ===============================
function setKpi(kpi) {
  const formatPersonel = (personel, value) => {
    if (!personel || !personel.ad_soyad) return "-";
    const name = personel.ad_soyad;
    if (value === null || value === undefined || value === "") return name;
    return `${name} (${value})`;
  };

  const enYuksekSkor = kpi?.en_yuksek_personel?.skor;
  const enIstikrarliDalga = kpi?.en_istikrarli_personel?.dalga;
  const enCokGelisimFark = kpi?.en_cok_gelisim?.fark;
  const hedefeEnYakinOran = kpi?.hedefe_en_yakin?.oran;

  kpiPerformans.textContent = formatPersonel(
    kpi?.en_yuksek_personel,
    enYuksekSkor !== null && enYuksekSkor !== undefined ? Number(enYuksekSkor).toFixed(2) : ""
  );
  kpiPersonel.textContent = fmtNumber(kpi?.hedef_asan_sayisi || 0);
  kpiHedef.textContent = formatPersonel(
    kpi?.en_istikrarli_personel,
    enIstikrarliDalga !== null && enIstikrarliDalga !== undefined ? Number(enIstikrarliDalga).toFixed(2) : ""
  );
  kpiGercek.textContent = formatPersonel(
    kpi?.en_cok_gelisim,
    enCokGelisimFark !== null && enCokGelisimFark !== undefined ? Number(enCokGelisimFark).toFixed(2) : ""
  );
  kpiOran.textContent = formatPersonel(
    kpi?.hedefe_en_yakin,
    hedefeEnYakinOran !== null && hedefeEnYakinOran !== undefined ? `${(Number(hedefeEnYakinOran) * 100).toFixed(1)}%` : ""
  );
}

// ===============================
// ÜST: PERSONEL PERFORMANS (TIKLANABİLİR)
// ===============================
function renderPersonelChart(personeller) {
  destroy(chartPersonel);

  chartPersonel = new Chart(document.getElementById("chartPersonel"), {
    type: "bar",
    data: {
      labels: personeller.map(p => p.ad_soyad),
      datasets: [{
        label: "Performans Skoru",
        data: personeller.map(p => Number(p.skor)),
        backgroundColor: "rgba(47,111,237,0.6)"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (evt, elements) => {
        if (!elements.length) return;

        const index = elements[0].index;
        selectedPersonelId = personeller[index].personel_id;

        // 👇 ALT ÇİZGİ GRAFİĞİ BURADA TETİKLENİR
        loadPersonelTrend();
      }
    }
  });
}

// ===============================
// ALT: SEÇİLEN PERSONEL TREND (ÇİZGİ)
// ===============================
async function loadPersonelTrend() {
  if (!selectedPersonelId) return;

  const res = await fetch(`/api/personel-analiz/trend?personel_id=${selectedPersonelId}`);
  const data = await res.json();

  if (!data || data.length === 0) return;

  destroy(chartPersonelTrend);

  chartPersonelTrend = new Chart(
    document.getElementById("chartPersonelTrend"),
    {
      type: "line",
      data: {
        labels: data.map(r => r.donem),
        datasets: [{
          label: "Performans Skoru",
          data: data.map(r => Number(r.aylik_skor)),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.15)",
          tension: 0.4,
          fill: true,
          pointRadius: 4
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
// HEDEF – GERÇEKLEŞEN
// ===============================
async function loadHedefGerceklesen() {
  const ilce = ilceSelect.value;
  const donem = donemSelect.value;

  const res = await fetch(
    `/api/personel-analiz/hedef-gerceklesen?ilce=${encodeURIComponent(ilce)}&donem=${encodeURIComponent(donem)}`
  );
  const data = await res.json();

  destroy(chartHedefGerceklesen);

  chartHedefGerceklesen = new Chart(
    document.getElementById("chartHedefGerceklesen"),
    {
      type: "bar",
      data: {
        labels: data.map(r => r.ad_soyad),
        datasets: [
          {
            label: "Hedef",
            data: data.map(r => Number(r.toplam_hedef)),
            backgroundColor: "rgba(255,159,64,0.6)"
          },
          {
            label: "Gerçekleşen",
            data: data.map(r => Number(r.toplam_gerceklesen)),
            backgroundColor: "rgba(75,192,192,0.7)"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    }
  );
}

// ===============================
// ROL DAĞILIMI
// ===============================
async function loadRolHedefDagilim() {
  const ilce = ilceSelect.value;
  const donem = donemSelect.value;

  const res = await fetch(
    `/api/personel-analiz/rol-hedef-dagilim?ilce=${encodeURIComponent(ilce)}&donem=${encodeURIComponent(donem)}`
  );
  const data = await res.json();

  destroy(chartRolHedef);

  chartRolHedef = new Chart(document.getElementById("chartRolHedef"), {
    type: "doughnut",
    data: {
      labels: data.map(r => r.rol_adi),
      datasets: [{
        data: data.map(r => Number(r.toplam_hedef)),
        backgroundColor: ["#60a5fa", "#34d399", "#fbbf24", "#f87171"]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } }
    }
  });
}
async function loadPersoneller() {
  const ilce = ilceSelect.value;

  const res = await fetch(
    `/api/personel-analiz/personeller?ilce=${encodeURIComponent(ilce)}`
  );
  const data = await res.json();

  personelSelect.innerHTML = `<option value="">Personel Seç</option>`;

  data.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.personel_id;
    opt.textContent = p.ad_soyad;
    personelSelect.appendChild(opt);
  });
}

// ===============================
// EVENTLER
// ===============================
btnUygula.addEventListener("click", loadDashboard);
btnUygula.addEventListener("click", loadHedefGerceklesen);
btnUygula.addEventListener("click", loadRolHedefDagilim);
btnUygula.addEventListener("click", loadPersoneller);
donemSelect.addEventListener("change", loadHedefGerceklesen);
donemSelect.addEventListener("change", loadRolHedefDagilim);
personelSelect.addEventListener("change", () => {
  selectedPersonelId = personelSelect.value || null;
  loadPersonelTrend();
});


// ===============================
// INIT
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  await loadIlceler();
  await loadDonemler();
  await loadDashboard();
  await loadHedefGerceklesen();
  await loadRolHedefDagilim();
  await loadPersoneller();   // 👈 YENİ
});

