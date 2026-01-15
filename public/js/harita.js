// Harita sayfası: İzmir ilçe sınırları + şube markerları + filtreler

let map;
let geoJsonLayer;
let markerLayer;
let performansOzet = [];
let subeler = [];
let geojsonData = null;
let seciliIlce = "tum";
let seciliSube = "tum";

const ilceSelect = document.getElementById("ilceSelect");
const subeSelect = document.getElementById("subeSelect");
const btnTemizle = document.getElementById("btnTemizle");
const seciliIlceEtiket = document.getElementById("seciliIlceEtiket");
const seciliSubeEtiket = document.getElementById("seciliSubeEtiket");
const seciliDurum = document.getElementById("seciliDurum");
const tabloGovde = document.getElementById("subeTabloGovde");

// İlçe adlarını normalize et (türkçe, mojibake varyasyonları)
const ILCE_CHAR_MAP = {
  "Ç": "C", "ç": "C", "Ć": "C", "ć": "C", "‡": "C",
  "Ğ": "G", "ğ": "G",
  "İ": "I", "ı": "I", "Ì": "I", "í": "I", "Ž": "I",
  "Ö": "O", "ö": "O",
  "Ş": "S", "ş": "S",
  "Ü": "U", "ü": "U"
};
function normalizeIlceKey(value) {
  if (!value) return "";
  return value
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[ÇçĆć‡ĞğİıÌíŽÖöŞşÜü]/g, (c) => ILCE_CHAR_MAP[c] || "")
    .replace(/[^A-Z0-9]/g, "");
}

function normalizeDurum(value) {
  if (!value) return "";
  return value
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[\u0131\u0130]/g, "I")
    .replace(/[\u015f\u015e]/g, "S")
    .replace(/[\u011f\u011e]/g, "G")
    .replace(/[\u00fc\u00dc]/g, "U")
    .replace(/[\u00f6\u00d6]/g, "O")
    .replace(/[\u00e7\u00c7]/g, "C")
    .replace(/[^A-Z0-9]/g, "");
}


function renkPaleti(skor, durum) {
  if (normalizeDurum(durum) === "YILDIZ") {
    return { fill: "#22c55e", stroke: "#15803d", tag: "tag-iyi", aciklama: "Yildiz performans" };
  }
  if (skor === null || skor === undefined) return { fill: "#cbd5e1", stroke: "#1e293b", tag: "tag-orta", aciklama: "Veri yok" };
  if (skor >= 110) return { fill: "#22c55e", stroke: "#15803d", tag: "tag-iyi", aciklama: "Yuksek performans" };
  if (skor >= 90) return { fill: "#ffecb5", stroke: "#d97706", tag: "tag-orta", aciklama: "Orta seviye" };
  return { fill: "#e74c3c", stroke: "#b91c1c", tag: "tag-risk", aciklama: "Riskli bolge" };
}

function ilceOzeti(ilceAdi) {
  const key = normalizeIlceKey(ilceAdi);
  return performansOzet.find((i) => normalizeIlceKey(i.ilce) === key) || null;
}

function ilceStili(feature) {
  const ad = feature.properties?.adi || "";
  const ozet = ilceOzeti(ad);
  const renk = renkPaleti(ozet?.ort_performans_skoru, ozet?.durum);
  const secim = normalizeIlceKey(ad) === normalizeIlceKey(seciliIlce);
  return {
    color: secim ? "#0f172a" : renk.stroke,
    weight: secim ? 2.4 : 1.2,
    opacity: 1,
    fillColor: renk.fill,
    fillOpacity: secim ? 0.82 : 0.55
  };
}

function tabloyuGuncelle() {
  const liste = subeler
    .filter((s) => seciliIlce === "tum" || normalizeIlceKey(s.ilce) === normalizeIlceKey(seciliIlce))
    .filter((s) => seciliSube === "tum" || String(s.sube_id) === String(seciliSube));

  if (!liste.length) {
    tabloGovde.innerHTML = `<tr><td colspan="6">Seçilen filtreye ait şube bulunamadı.</td></tr>`;
    return;
  }

  tabloGovde.innerHTML = liste
    .map((s, idx) => {
      const ozet = ilceOzeti(s.ilce);
      const renk = renkPaleti(ozet?.ort_performans_skoru, ozet?.durum);
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${s.sube_adi}</td>
          <td>${s.ilce}</td>
          <td>${s.il}</td>
          <td>${s.latitude && s.longitude ? `${Number(s.latitude).toFixed(3)}, ${Number(s.longitude).toFixed(3)}` : "-"}</td>
          <td><span class="tag ${renk.tag}">${ozet?.durum || "Belirsiz"}</span></td>
        </tr>
      `;
    })
    .join("");
}

function etiketleriGuncelle() {
  const ilceMetin = seciliIlce === "tum" ? "Tüm İzmir" : seciliIlce;
  seciliIlceEtiket.textContent = `İlçe: ${ilceMetin}`;

  const subeMetin = seciliSube === "tum" ? "Tüm şubeler" : (subeler.find((s) => String(s.sube_id) === String(seciliSube))?.sube_adi || "");
  seciliSubeEtiket.textContent = `Şube: ${subeMetin || "Bilinmiyor"}`;

  const ozet = seciliIlce === "tum" ? null : ilceOzeti(seciliIlce);
  const renk = renkPaleti(ozet?.ort_performans_skoru, ozet?.durum);
  seciliDurum.textContent = `Durum: ${ozet?.durum || renk.aciklama}`;
  seciliDurum.className = `etiket ${renk.tag || ""}`;
}

function subeSelectDoldur() {
  subeSelect.innerHTML = "";
  const tumOpt = document.createElement("option");
  tumOpt.value = "tum";
  tumOpt.textContent = "Tüm şubeler";
  subeSelect.appendChild(tumOpt);

  if (seciliIlce === "tum") {
    subeSelect.disabled = true;
    subeSelect.value = "tum";
    return;
  }

  subeSelect.disabled = false;
  const hedefSlug = normalizeIlceKey(seciliIlce);
  subeler
    .filter((s) => normalizeIlceKey(s.ilce) === hedefSlug)
    .forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.sube_id;
      opt.textContent = s.sube_adi;
      subeSelect.appendChild(opt);
    });

  subeSelect.value = seciliSube;
}

function markerlariCiz() {
  if (markerLayer) markerLayer.remove();
  markerLayer = L.layerGroup();

  const hedefSlug = normalizeIlceKey(seciliIlce);
  subeler
    .filter((s) => seciliIlce === "tum" || normalizeIlceKey(s.ilce) === hedefSlug)
    .filter((s) => seciliSube === "tum" || String(s.sube_id) === String(seciliSube))
    .forEach((s) => {
      if (!s.latitude || !s.longitude) return;
      const marker = L.marker([s.latitude, s.longitude]).bindPopup(`<strong>${s.sube_adi}</strong><br>${s.il} / ${s.ilce}`);
      markerLayer.addLayer(marker);
    });

  markerLayer.addTo(map);
}

function geoLayerOlustur() {
  if (!geojsonData) return;
  if (geoJsonLayer) geoJsonLayer.remove();

  geoJsonLayer = L.geoJSON(geojsonData, {
    style: ilceStili,
    onEachFeature: (feature, layer) => {
      layer.on("click", () => {
        const ad = feature.properties?.adi;
        if (!ad) return;
        seciliIlce = normalizeIlceKey(seciliIlce) === normalizeIlceKey(ad) ? "tum" : ad;
        seciliSube = "tum";
        ilceSelect.value = seciliIlce === "tum" ? "tum" : seciliIlce;
        subeSelectDoldur();
        etiketleriGuncelle();
        tabloyuGuncelle();
        markerlariCiz();
        geoJsonLayer.setStyle(ilceStili);
      });
    }
  }).addTo(map);

  map.fitBounds(geoJsonLayer.getBounds(), { padding: [14, 14] });
}

function ilceSelectDoldur() {
  const geoIlceler = geojsonData?.features?.map((f) => f.properties?.adi).filter(Boolean) || [];
  const subeIlceler = subeler.map((s) => s.ilce).filter(Boolean);

  // Aynı ilçenin farklı yazımları (Buca/buca/BUCA) tek seçenek olsun
  const displayMap = new Map();
  geoIlceler.forEach((ad) => {
    const slug = normalizeIlceKey(ad);
    if (slug) displayMap.set(slug, ad);
  });
  subeIlceler.forEach((ad) => {
    const slug = normalizeIlceKey(ad);
    if (slug && !displayMap.has(slug)) displayMap.set(slug, ad);
  });

  const sirali = [...displayMap.values()].sort((a, b) => a.localeCompare(b, "tr"));
  sirali.forEach((ad) => {
    const opt = document.createElement("option");
    opt.value = ad;
    opt.textContent = ad;
    ilceSelect.appendChild(opt);
  });

  // Mevcut seçim korunmaya çalışılsın
  ilceSelect.value = seciliIlce === "tum" ? "tum" : (displayMap.get(normalizeIlceKey(seciliIlce)) || "tum");
}

function olaylariBagla() {
  ilceSelect.addEventListener("change", (e) => {
    seciliIlce = e.target.value === "tum" ? "tum" : e.target.value;
    seciliSube = "tum";
    subeSelectDoldur();
    etiketleriGuncelle();
    tabloyuGuncelle();
    markerlariCiz();
    if (geoJsonLayer) geoJsonLayer.setStyle(ilceStili);
  });

  subeSelect.addEventListener("change", (e) => {
    seciliSube = e.target.value || "tum";
    etiketleriGuncelle();
    tabloyuGuncelle();
    markerlariCiz();
  });

  btnTemizle.addEventListener("click", () => {
    seciliIlce = "tum";
    seciliSube = "tum";
    ilceSelect.value = "tum";
    subeSelectDoldur();
    etiketleriGuncelle();
    tabloyuGuncelle();
    markerlariCiz();
    if (geoJsonLayer) {
      geoJsonLayer.setStyle(ilceStili);
      map.fitBounds(geoJsonLayer.getBounds(), { padding: [14, 14] });
    }
  });
}

async function veriYukle() {
  // Kaynaklardan biri hata verse bile diğerlerini alabilmek için ayrı try blokları kullan
  try {
    const resp = await fetch("/ilceler.geojson");
    if (resp.ok) geojsonData = await resp.json();
  } catch (err) {
    console.warn("GeoJSON alınamadı:", err);
  }

  try {
    const resp = await fetch("/api/performans/ilce-ozet");
    if (resp.ok) performansOzet = await resp.json();
  } catch (err) {
    console.warn("Performans özeti alınamadı:", err);
  }

  try {
    const resp = await fetch("/api/harita");
    if (resp.ok) subeler = await resp.json();
  } catch (err) {
    console.warn("Şubeler alınamadı:", err);
  }
}

async function init() {
  map = L.map("leafletHarita").setView([38.42, 27.14], 9);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "OpenStreetMap katkıcıları",
    maxZoom: 18
  }).addTo(map);

  try {
    await veriYukle();
  } catch (err) {
    console.warn("Veri yüklenemedi:", err);
  }

  ilceSelectDoldur();
  // GeoJSON bulunamadıysa merkezde marker göremezsin; en azından şube verisi yüklüyse ilçe listesi dolacaktır.
  subeSelectDoldur();
  olaylariBagla();
  geoLayerOlustur();
  markerlariCiz();
  etiketleriGuncelle();
  tabloyuGuncelle();
}

document.addEventListener("DOMContentLoaded", init);



