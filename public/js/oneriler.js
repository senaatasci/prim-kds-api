document.addEventListener("DOMContentLoaded", () => {
  const donemLine = document.getElementById("donemLine");

  const primCards = document.getElementById("primCards");
  const egitimCards = document.getElementById("egitimCards");
  const riskCards = document.getElementById("riskCards");

  const badgePrim = document.getElementById("badgePrim");
  const badgeEgitim = document.getElementById("badgeEgitim");
  const badgeRisk = document.getElementById("badgeRisk");

  const primEmpty = document.getElementById("primEmpty");
  const egitimEmpty = document.getElementById("egitimEmpty");
  const riskEmpty = document.getElementById("riskEmpty");

  const money = (n) =>
    Number(n || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const num = (n) =>
    Number(n || 0).toLocaleString("tr-TR", {
      maximumFractionDigits: 2
    });

  /* =======================
     KART ŞABLONLARI
  ======================= */

  function cardPrim(x) {
    return `
      <div class="cardx card-prim">
        <span class="pill blue">🟢 Prim Hak Ediyor</span>

        <h4>${x.ad_soyad}
          <span class="muted">(${x.sube_adi})</span>
        </h4>

        <div class="grid2">
          <div class="kv">
            <div class="k">Performans Skoru</div>
            <div class="v">${num(x.performans_skoru_100)} / 100</div>
          </div>
          <div class="kv">
            <div class="k">Prim Tutarı</div>
            <div class="v">${money(x.prim_tutari)} ₺</div>
          </div>
        </div>

        <div class="muted">
          <b>Sistem Tespiti:</b> ${x.sistem_tespiti}
        </div>

        <div class="action">
          <button class="btnx">${x.aksiyon}</button>
        </div>
      </div>
    `;
  }

  function cardEgitim(x) {
  return `
    <div class="cardx card-egitim">
      <span class="pill orange">🟡 Eğitim Gerekli</span>

      <h4>${x.ad_soyad}
        <span class="muted">(${x.sube_adi})</span>
      </h4>

      <div class="grid2">
        <div class="kv">
          <div class="k">En Zayıf Alan</div>
          <div class="v">📉 ${x.metrik_adi}</div>
        </div>
        <div class="kv">
          <div class="k">Sapma</div>
          <div class="v">${x.sapma_text}</div>
        </div>
      </div>

      <div class="muted">
        <b>Analiz:</b> ${x.analiz}
      </div>

      <div class="action">
        <button class="btnx">${x.aksiyon}</button>
      </div>
    </div>
  `;
}


  function cardRisk(x) {
    const finansal = Number(x.finansal_etki || 0);

    return `
      <div class="cardx card-risk">
        <span class="pill red">🔴 Kritik Seviye</span>

        <h4>${x.ad_soyad}
          <span class="muted">(${x.sube_adi})</span>
        </h4>

        <div class="grid2">
          <div class="kv">
            <div class="k">Genel Puan</div>
            <div class="v">${num(x.genel_puan)} / 100</div>
          </div>
          <div class="kv">
            <div class="k">Tahmini Kayıp</div>
            <div class="v">-${money(finansal)} ₺</div>
          </div>
        </div>

        <div class="muted">
          <b>KDS Kararı:</b> ${x.kds_karar}
        </div>

        <div class="action">
          <button class="btnx">${x.aksiyon}</button>
        </div>
      </div>
    `;
  }

  /* =======================
     VERİYİ YÜKLE
  ======================= */

  async function load() {
    const res = await fetch("/api/oneriler");
    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();

    donemLine.textContent = data.donem
      ? `Analiz Dönemi: ${data.donem}`
      : "Analiz dönemi bulunamadı";

    // 🔵 Prim
    const prim = data.primOnerileri || [];
    badgePrim.textContent = `${prim.length} kişi`;
    primCards.innerHTML = prim.map(cardPrim).join("");
    primEmpty.style.display = prim.length ? "none" : "block";

    // 🟠 Eğitim
    const egitim = data.egitimOnerileri || [];
    badgeEgitim.textContent = `${egitim.length} kişi`;
    egitimCards.innerHTML = egitim.map(cardEgitim).join("");
    egitimEmpty.style.display = egitim.length ? "none" : "block";

    // 🔴 Kritik
    const risk = data.kritikRiskler || [];
    badgeRisk.textContent = `${risk.length} kişi`;
    riskCards.innerHTML = risk.map(cardRisk).join("");
    riskEmpty.style.display = risk.length ? "none" : "block";
  }

  load().catch(err => {
    console.error("Öneriler yüklenemedi:", err);
    donemLine.textContent = "Veriler yüklenemedi";
    primEmpty.style.display = "block";
    egitimEmpty.style.display = "block";
    riskEmpty.style.display = "block";
  });
});
