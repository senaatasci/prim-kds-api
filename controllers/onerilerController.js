const db = require("../db/mysql_connect");

/**
 * En güncel dönemi bul
 */
async function getLatestDonem() {
  const [[a]] = await db.query(`SELECT MAX(donem) AS donem FROM kds_performans_skoru`);
  if (a && a.donem) return a.donem;

  const [[b]] = await db.query(`SELECT MAX(donem) AS donem FROM gerceklesmeler`);
  return (b && b.donem) ? b.donem : null;
}

/**
 * Eğitim önerisi mapper (AYNEN KORUNDU)
 */
function mapEgitimOnerisi(row) {
  let kdsOnerisi = "Gelişim planı uygulanmalı.";
  let aksiyon = "📅 Eğitim Planla";

  if (row.metrik_id === 2) {
    kdsOnerisi = `"Zor Müşterilerle İletişim Eğitimi" önerilir.`;
  } else if (row.metrik_id === 4) {
    kdsOnerisi = `"Motivasyon Görüşmesi" yapılmalı.`;
    aksiyon = "📞 Birebir Görüşme";
  } else if (row.metrik_id === 1) {
    kdsOnerisi = `"Satış Performansı Geliştirme" eğitimi önerilir.`;
  }

  return {
    personel_id: row.personel_id,
    ad_soyad: row.ad_soyad,
    sube_adi: row.sube_adi,
    metrik_adi: row.metrik_adi,
    sapma_text: `%${Math.abs(row.sapma_yuzde).toFixed(0)} hedef altı`,
    analiz: "Hedef-gerçekleşme farkı gelişim ihtiyacına işaret ediyor.",
    kds_onerisi: kdsOnerisi,
    aksiyon
  };
}

exports.getOneriler = async (req, res) => {
  try {
    const latestDonem = await getLatestDonem();

    /**
     * 🔑 TEK MERKEZ: Ortalama bazlı gruplama
     */
    const [rows] = await db.query(`
      SELECT
        p.personel_id,
        p.ad_soyad,
        s.sube_adi,
        k.toplam_katsayi,
        k.ortalama_katsayi,
        k.prim_tutari,
        CASE
          WHEN k.toplam_katsayi >= k.ortalama_katsayi THEN 'PRIM'
          WHEN k.toplam_katsayi >= k.ortalama_katsayi * 0.80 THEN 'EGITIM'
          ELSE 'KRITIK'
        END AS grup
      FROM kds_prim_sonuc k
      JOIN personeller p ON p.personel_id = k.personel_id
      JOIN subeler s ON s.sube_id = p.sube_id
      ORDER BY k.toplam_katsayi DESC
    `);

    /**
     * 🔵 PRİM HAK EDENLER
     */
    const primOnerileri = rows
  .filter(r => r.grup === "PRIM")
  .map(r => {
    const oran = r.toplam_katsayi / r.ortalama_katsayi;
    const skor = Math.min(120, Math.round(oran * 100));

    return {
      personel_id: r.personel_id,
      ad_soyad: r.ad_soyad,
      sube_adi: r.sube_adi,
      performans_skoru_100: skor,
      prim_tutari: r.prim_tutari,
      sistem_tespiti: "Ortalamanın üzerinde performans. Prim ödemesi uygundur.",
      aksiyon: "✅ Ödemeyi Onayla ve Teşekkür Maili Gönder"
    };
  });


    /**
 * 🟡 EĞİTİM VERİLECEKLER
 * KURAL: KİŞİ BAŞINA SADECE 1 KART (EN ZAYIF METRİK)
 */
const [egitimRows] = await db.query(`
  SELECT
    p.personel_id,
    p.ad_soyad,
    s.sube_adi,
    m.metrik_id,
    m.metrik_adi,
    ROUND(((g.gerceklesen_deger - h.hedef_deger) / h.hedef_deger) * 100, 2) AS sapma_yuzde
  FROM hedefler h
  JOIN gerceklesmeler g
    ON g.personel_id = h.personel_id
    AND g.metrik_id = h.metrik_id
    AND g.donem = h.donem
  JOIN personeller p ON p.personel_id = h.personel_id
  JOIN subeler s ON s.sube_id = p.sube_id
  JOIN metrikler m ON m.metrik_id = h.metrik_id
  WHERE g.gerceklesen_deger < h.hedef_deger
`);

/**
 * 👉 KİŞİ BAZLI EN ZAYIF METRİĞİ SEÇ
 */
const egitimMap = {};
egitimRows.forEach(r => {
  if (
    !egitimMap[r.personel_id] ||
    Math.abs(r.sapma_yuzde) > Math.abs(egitimMap[r.personel_id].sapma_yuzde)
  ) {
    egitimMap[r.personel_id] = r;
  }
});

/**
 * 👉 SADECE EGITIM GRUBUNDAKİLERİ AL
 */
const egitimOnerileri = Object.values(egitimMap)
  .filter(r => rows.find(x => x.personel_id === r.personel_id && x.grup === "EGITIM"))
  .map(r => ({
    personel_id: r.personel_id,
    ad_soyad: r.ad_soyad,
    sube_adi: r.sube_adi,
    metrik_adi: r.metrik_adi,
    sapma_text: `%${Math.abs(r.sapma_yuzde).toFixed(0)} hedef altı`,
    analiz: `${r.metrik_adi} performansı hedefin belirgin şekilde altında.`,
    kds_onerisi: `"${r.metrik_adi}" alanında gelişim eğitimi önerilir.`,
    aksiyon: "📅 Eğitim Planla"
  }));

    /**
     * 🔴 KRİTİK SEVİYE
     */
    const kritikRiskler = rows
      .filter(r => r.grup === "KRITIK")
      .map(r => ({
        personel_id: r.personel_id,
        ad_soyad: r.ad_soyad,
        sube_adi: r.sube_adi,
        genel_puan: Math.round(r.toplam_katsayi * 100),
        finansal_etki: Math.round((r.ortalama_katsayi - r.toplam_katsayi) * 3000),
        risk_durumu: "⚠️ Kritik Performans Seviyesi",
        kds_karar: "Acil performans değerlendirmesi ve aksiyon planı önerilir.",
        aksiyon: "📩 İK’ya Risk Bildir"
      }));

    return res.json({
      donem: latestDonem,
      primOnerileri,
      egitimOnerileri,
      kritikRiskler
    });

  } catch (err) {
    console.error("❌ Öneriler API Hatası:", err);
    return res.status(500).json({ error: "Öneriler verisi getirilemedi" });
  }
};
