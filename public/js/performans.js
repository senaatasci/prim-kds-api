document.addEventListener("DOMContentLoaded", () => {
  const donemInfo = document.getElementById("donemInfo");
  const ilceTbody = document.querySelector("#ilceTable tbody");
  const personelTbody = document.querySelector("#personelTable tbody");
  const personelFilterInfo = document.getElementById("personelFilterInfo");

  const formatMoney = (n) =>
    Number(n || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const formatNumber = (n) =>
    Number(n || 0).toLocaleString("tr-TR");

  const formatDate = (d) => {
    if (!d) return "-";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString("tr-TR");
  };

  const badgeClassByDurum = (durum) => {
    if (durum === "Yıldız") return "badge-star";
    if (durum === "İyi") return "badge-success";
    return "badge-danger"; // Riskli
  };

  async function safeFetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`${url} → HTTP ${res.status}`);
    }
    return res.json();
  }

  async function loadIlceOzet() {
    const data = await safeFetchJson("/api/performans/ilce-ozet");

    ilceTbody.innerHTML = "";

    if (donemInfo) {
      if (data.length > 0 && data[0].donem) {
        donemInfo.textContent = `Aylık veriler: ${data[0].donem} dönemi (son dönem)`;
      } else {
        donemInfo.textContent = "";
      }
    }

    data.forEach(row => {
      const tr = document.createElement("tr");
      tr.classList.add("clickable-row");
      tr.dataset.ilce = row.ilce;

      tr.innerHTML = `
        <td>${row.ilce}</td>
        <td>${formatNumber(row.sube_sayisi)}</td>
        <td>${formatNumber(row.personel_sayisi)}</td>
        <td>${formatNumber(row.ort_performans_skoru)}</td>
        <td>${formatMoney(row.toplam_ciro)}</td>
        <td>${formatNumber(row.ort_memnuniyet)}</td>
        <td>${formatMoney(row.toplam_prim)}</td>
        <td><span class="badge ${badgeClassByDurum(row.durum)}">${row.durum}</span></td>
      `;

      tr.addEventListener("click", () => {
        loadPersonelDetay(row.ilce);

        document
          .querySelectorAll("#ilceTable tbody tr")
          .forEach(x => x.classList.remove("row-selected"));

        tr.classList.add("row-selected");
      });

      ilceTbody.appendChild(tr);
    });
  }

  async function loadPersonelDetay(ilce = "Tümü") {
    const url =
      ilce && ilce !== "Tümü"
        ? `/api/performans/personel-detay?ilce=${encodeURIComponent(ilce)}`
        : `/api/performans/personel-detay`;

    const payload = await safeFetchJson(url);

    if (personelFilterInfo) {
      personelFilterInfo.textContent =
        `Filtre: ${payload.ilce || "Tümü"}` +
        (payload.donem ? ` | Dönem: ${payload.donem}` : "");
    }

    personelTbody.innerHTML = "";

    (payload.rows || []).forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.ad_soyad}</td>
        <td>${r.sube_adi}</td>
        <td>${r.rol_adi}</td>
        <td>${formatDate(r.ise_giris_tarihi)}</td>
        <td>${formatNumber(r.genel_performans)}</td>
        <td>${formatNumber(r.ciro_yuzde)}</td>
        <td>${formatNumber(r.iade_orani)}</td>
        <td>${formatMoney(r.prim_tutari)}</td>
      `;
      personelTbody.appendChild(tr);
    });
  }

  // İlk yükleme
  (async () => {
    try {
      await loadIlceOzet();
      await loadPersonelDetay("Tümü");
    } catch (err) {
      console.error("Performans sayfası veri hatası:", err);
    }
  })();
});
