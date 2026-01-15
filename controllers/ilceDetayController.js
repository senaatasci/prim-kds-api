const db = require("../db/mysql_connect");

// İlçe listesi (dropdown için)
exports.getFilters = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DISTINCT ilce
      FROM subeler
      ORDER BY ilce
    `);
    res.json({ ilceler: rows.map(r => r.ilce) });
  } catch (err) {
    console.error("Filtre Hatası:", err);
    res.status(500).json({ hata: "Filtreler alınamadı" });
  }
};

/**
 * İlçe filtresi WHERE
 */
function buildWhere(ilce) {
  if (!ilce || ilce === "Tümü") return { where: "", params: [] };
  return { where: "WHERE s.ilce = ?", params: [ilce] };
}

/**
 * GET /api/ilce-detay/dashboard?ilce=...
 */
exports.getDashboard = async (req, res) => {
  try {
    const ilce = req.query.ilce || "Tümü";
    const scope = buildWhere(ilce);
    // ✅ [EKLENDİ] İlçedeki şube sayısı (koşullu gösterim için)
const [subeCountRows] = await db.query(`
  SELECT COUNT(DISTINCT s.sube_id) AS sube_sayisi
  FROM subeler s
  ${scope.where}
`, scope.params);

const subeSayisi = Number(subeCountRows[0]?.sube_sayisi || 0);


    /* ===============================
       KPI’lar (DÜZELTİLDİ)
       =============================== */

    // 1️⃣ Ortalama Performans + Personel Sayısı
    const [skorRows] = await db.query(`
      SELECT
        COUNT(DISTINCT p.personel_id) AS personel_sayisi
      FROM kds_performans_skoru kps
      JOIN personeller p ON p.personel_id = kps.personel_id
      JOIN subeler s ON s.sube_id = p.sube_id
      ${scope.where}
    `, scope.params);

    const [ortRows] = await db.query(`
      SELECT
        ${ilce === "TÇ¬mÇ¬" ? "ROUND(AVG(ort_performans_skoru), 2)" : "ROUND(ort_performans_skoru, 2)"} AS ort_skor
      FROM kds_ilce_ozet_6aylik
      ${ilce === "TÇ¬mÇ¬" ? "" : "WHERE ilce = ?"}
    `, ilce === "TÇ¬mÇ¬" ? [] : [ilce]);

    // 2️⃣ Toplam Hedef
    const [hedefRows] = await db.query(`
      SELECT
        SUM(h.hedef_deger) AS toplam_hedef
      FROM hedefler h
      JOIN personeller p ON p.personel_id = h.personel_id
      JOIN subeler s ON s.sube_id = p.sube_id
      WHERE h.metrik_id = 1
      ${scope.where ? "AND s.ilce = ?" : ""}
    `, scope.where ? scope.params : []);

    // 3️⃣ Toplam Gerçekleşme
    const [gercekRows] = await db.query(`
      SELECT
        SUM(g.gerceklesen_deger) AS toplam_gercek
      FROM gerceklesmeler g
      JOIN personeller p ON p.personel_id = g.personel_id
      JOIN subeler s ON s.sube_id = p.sube_id
      WHERE g.metrik_id = 1
      ${scope.where ? "AND s.ilce = ?" : ""}
    `, scope.where ? scope.params : []);

    const skor = { ...(skorRows[0] || {}), ...(ortRows[0] || {}) };
    const hedef = Number(hedefRows[0]?.toplam_hedef || 0);
    const gercek = Number(gercekRows[0]?.toplam_gercek || 0);

    const kpi = {
      ortalama_performans: skor.ort_skor || 0,
      toplam_personel: skor.personel_sayisi || 0,
      toplam_hedef: hedef,
      toplam_gercek: gercek,
      hedef_gercek_oran: hedef > 0 ? +(gercek / hedef * 100).toFixed(1) : 0
    };

    // Yeni KPI'lar icin son 6 ay donemleri
    const [donemRows] = await db.query(`
      SELECT DISTINCT donem
      FROM kds_performans_skoru
      ORDER BY STR_TO_DATE(CONCAT(donem,'-01'), '%Y-%m-%d') DESC
      LIMIT 6
    `);

    const donemList = donemRows.map(r => r.donem);
    const sonDonem = donemList[0] || null;
    const ilkDonem = donemList[donemList.length - 1] || null;

    let enYuksek = null;
    let enIstikrarli = null;
    let enCokGelisim = null;
    let hedefeEnYakin = null;
    let hedefAsanSayisi = 0;

    if (donemList.length) {
      const [enYuksekRows] = await db.query(`
        SELECT
          p.personel_id,
          p.ad_soyad,
          ROUND(AVG(kps.agirlikli_skor), 2) AS skor
        FROM kds_performans_skoru kps
        JOIN personeller p ON p.personel_id = kps.personel_id
        JOIN subeler s ON s.sube_id = p.sube_id
        WHERE kps.donem IN (?)
        ${scope.where ? "AND s.ilce = ?" : ""}
        GROUP BY p.personel_id
        ORDER BY skor DESC
        LIMIT 1
      `, scope.where ? [donemList, ...scope.params] : [donemList]);

      enYuksek = enYuksekRows[0] || null;

      const [hedefAsanRows] = await db.query(`
        SELECT COUNT(*) AS sayi
        FROM (
          SELECT
            p.personel_id,
            SUM(COALESCE(h.hedef_deger, 0)) AS hedef,
            SUM(COALESCE(g.gerceklesen_deger, 0)) AS gercek
          FROM personeller p
          JOIN subeler s ON s.sube_id = p.sube_id
          LEFT JOIN hedefler h ON h.personel_id = p.personel_id AND h.donem IN (?) AND h.metrik_id = 1
          LEFT JOIN gerceklesmeler g ON g.personel_id = p.personel_id AND g.donem IN (?) AND g.metrik_id = 1
          ${scope.where ? "WHERE s.ilce = ?" : ""}
          GROUP BY p.personel_id
          HAVING SUM(COALESCE(g.gerceklesen_deger, 0)) > SUM(COALESCE(h.hedef_deger, 0))
        ) t
      `, scope.where ? [donemList, donemList, ...scope.params] : [donemList, donemList]);

      hedefAsanSayisi = Number(hedefAsanRows[0]?.sayi || 0);

      const [istikrarRows] = await db.query(`
        SELECT
          t.personel_id,
          t.ad_soyad,
          ROUND(STDDEV_SAMP(t.aylik_skor), 2) AS dalga
        FROM (
          SELECT
            p.personel_id,
            p.ad_soyad,
            kps.donem,
            SUM(kps.agirlikli_skor) AS aylik_skor
          FROM kds_performans_skoru kps
          JOIN personeller p ON p.personel_id = kps.personel_id
          JOIN subeler s ON s.sube_id = p.sube_id
          WHERE kps.donem IN (?)
          ${scope.where ? "AND s.ilce = ?" : ""}
          GROUP BY p.personel_id, kps.donem
        ) t
        GROUP BY t.personel_id
        ORDER BY (dalga IS NULL), dalga ASC
        LIMIT 1
      `, scope.where ? [donemList, ...scope.params] : [donemList]);

      enIstikrarli = istikrarRows[0] || null;

      if (sonDonem && ilkDonem) {
        const [gelisimRows] = await db.query(`
          SELECT
            p.personel_id,
            p.ad_soyad,
            ROUND(SUM(CASE WHEN kps.donem = ? THEN kps.agirlikli_skor ELSE 0 END), 2) AS skor_son,
            ROUND(SUM(CASE WHEN kps.donem = ? THEN kps.agirlikli_skor ELSE 0 END), 2) AS skor_ilk
          FROM kds_performans_skoru kps
          JOIN personeller p ON p.personel_id = kps.personel_id
          JOIN subeler s ON s.sube_id = p.sube_id
          WHERE kps.donem IN (?)
          ${scope.where ? "AND s.ilce = ?" : ""}
          GROUP BY p.personel_id
          ORDER BY (skor_son - skor_ilk) DESC
          LIMIT 1
        `, scope.where ? [sonDonem, ilkDonem, donemList, ...scope.params] : [sonDonem, ilkDonem, donemList]);

        const row = gelisimRows[0] || null;
        if (row) {
          row.fark = Number(row.skor_son || 0) - Number(row.skor_ilk || 0);
        }
        enCokGelisim = row;
      }

      const [yakinRows] = await db.query(`
        SELECT
          p.personel_id,
          p.ad_soyad,
          SUM(COALESCE(g.gerceklesen_deger, 0)) AS gercek,
          SUM(COALESCE(h.hedef_deger, 0)) AS hedef
        FROM personeller p
        JOIN subeler s ON s.sube_id = p.sube_id
        LEFT JOIN hedefler h ON h.personel_id = p.personel_id AND h.donem IN (?) AND h.metrik_id = 1
        LEFT JOIN gerceklesmeler g ON g.personel_id = p.personel_id AND g.donem IN (?) AND g.metrik_id = 1
        ${scope.where ? "WHERE s.ilce = ?" : ""}
        GROUP BY p.personel_id
        HAVING SUM(COALESCE(h.hedef_deger, 0)) > 0
        ORDER BY ABS((SUM(COALESCE(g.gerceklesen_deger, 0)) / SUM(COALESCE(h.hedef_deger, 0))) - 1) ASC
        LIMIT 1
      `, scope.where ? [donemList, donemList, ...scope.params] : [donemList, donemList]);

      const rowYakin = yakinRows[0] || null;
      if (rowYakin) {
        rowYakin.oran = rowYakin.hedef > 0 ? Number(rowYakin.gercek) / Number(rowYakin.hedef) : null;
      }
      hedefeEnYakin = rowYakin;
    }

    kpi.en_yuksek_personel = enYuksek;
    kpi.hedef_asan_sayisi = hedefAsanSayisi;
    kpi.en_istikrarli_personel = enIstikrarli;
    kpi.en_cok_gelisim = enCokGelisim;
    kpi.hedefe_en_yakin = hedefeEnYakin;

    /* ===============================
       1️⃣ Aylık Ortalama Performans Trendi
       =============================== */
    const [aylikTrend] = await db.query(`
      SELECT
        kps.donem,
        ROUND(AVG(kps.agirlikli_skor),2) AS skor
      FROM kds_performans_skoru kps
      JOIN personeller p ON p.personel_id = kps.personel_id
      JOIN subeler s ON s.sube_id = p.sube_id
      ${scope.where}
      GROUP BY kps.donem
      ORDER BY kps.donem
    `, scope.params);

    /* ===============================
       2️⃣ Hedef – Gerçekleşen Trend
       =============================== */
    const [hedefGercekTrend] = await db.query(`
      SELECT
        h.donem,
        SUM(h.hedef_deger) AS hedef,
        SUM(g.gerceklesen_deger) AS gercek
      FROM hedefler h
      JOIN gerceklesmeler g
        ON g.personel_id = h.personel_id
        AND g.metrik_id = h.metrik_id
        AND g.donem = h.donem
      JOIN personeller p ON p.personel_id = h.personel_id
      JOIN subeler s ON s.sube_id = p.sube_id
      ${scope.where}
      GROUP BY h.donem
      ORDER BY h.donem
    `, scope.params);

    /* ===============================
       3️⃣ 4 Ana Metrik Skor Trendleri
       =============================== */
    const [metrikTrend] = await db.query(`
      SELECT
        g.donem,
        m.metrik_adi,
        ROUND(SUM(g.gerceklesen_deger) / NULLIF(SUM(h.hedef_deger),0) * 100,1) AS oran
      FROM metrikler m
      JOIN gerceklesmeler g ON g.metrik_id = m.metrik_id
      JOIN hedefler h
        ON h.personel_id = g.personel_id
        AND h.metrik_id = g.metrik_id
        AND h.donem = g.donem
      JOIN personeller p ON p.personel_id = g.personel_id
      JOIN subeler s ON s.sube_id = p.sube_id
      WHERE m.metrik_id IN (1,2,3,4)
      ${scope.where ? "AND s.ilce = ?" : ""}
      GROUP BY g.donem, m.metrik_adi
      HAVING SUM(h.hedef_deger) > 0
      ORDER BY g.donem
    `, scope.params);

    /* ===============================
       4️⃣ Personel Performans Karşılaştırması
       =============================== */
    const [personelPerformans] = await db.query(`
      SELECT
        p.ad_soyad,
        ROUND(AVG(kps.agirlikli_skor),2) AS skor
      FROM kds_performans_skoru kps
      JOIN personeller p ON p.personel_id = kps.personel_id
      JOIN subeler s ON s.sube_id = p.sube_id
      ${scope.where}
      GROUP BY p.personel_id
      ORDER BY skor DESC
    `, scope.params);

    /* ===============================
       5️⃣ Şube Performans Karşılaştırması
       =============================== */
    const [subePerformans] = await db.query(`
      SELECT
        s.sube_adi,
        ROUND(AVG(kps.agirlikli_skor),2) AS skor
      FROM kds_performans_skoru kps
      JOIN personeller p ON p.personel_id = kps.personel_id
      JOIN subeler s ON s.sube_id = p.sube_id
      ${scope.where}
      GROUP BY s.sube_id
      ORDER BY skor DESC
    `, scope.params);

  /* ===============================
   6️⃣ Metrik Bazlı Hedef – Gerçekleşme Karşılaştırması
   =============================== */
const [metrikHedefGercek] = await db.query(`
  SELECT
    m.metrik_adi,
    SUM(h.hedef_deger) AS hedef,
    SUM(g.gerceklesen_deger) AS gercek
  FROM metrikler m
  JOIN hedefler h ON h.metrik_id = m.metrik_id
  JOIN gerceklesmeler g
    ON g.metrik_id = h.metrik_id
    AND g.personel_id = h.personel_id
  JOIN personeller p ON p.personel_id = h.personel_id
  JOIN subeler s ON s.sube_id = p.sube_id
  ${scope.where}
  GROUP BY m.metrik_adi
  HAVING SUM(h.hedef_deger) > 0
  ORDER BY m.metrik_adi
`, scope.params);



    res.json({
      ilce,
      kpi,
      // ✅ [EKLENDİ] UI koşullu gösterim bayrağı
flags: {
  subeKarsilastirmaGoster: subeSayisi >= 2
},

      charts: {
  aylikTrend,
  hedefGercekTrend,
  metrikTrend,
  personelPerformans,
  subePerformans,
  metrikHedefGercek
}

    });

  } catch (err) {
    console.error("İlçe Detay Hatası:", err);
    res.status(500).json({ hata: "İlçe detay verileri alınamadı" });
  }
};
