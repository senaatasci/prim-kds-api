const db = require("../db/mysql_connect");

/**
 * 1) İlçe bazlı özet tablo
 */
exports.getIlceBazliOzet = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        ilce,
        sube_sayisi,
        personel_sayisi,
        ort_performans_skoru,
        toplam_ciro,
        ort_memnuniyet,
        toplam_prim,
        durum
      FROM kds_ilce_ozet_6aylik
      ORDER BY ilce
    `);

    res.json(
      rows.map(r => ({
        ilce: r.ilce,
        sube_sayisi: r.sube_sayisi,
        personel_sayisi: r.personel_sayisi,
        ort_performans_skoru: r.ort_performans_skoru,
        toplam_ciro: r.toplam_ciro ?? 0,
        ort_memnuniyet: r.ort_memnuniyet ?? 0,
        toplam_prim: r.toplam_prim ?? 0,
        durum: r.durum,
        donem: "Son 6 Ay"
      }))
    );
  } catch (error) {
    console.error("İlçe Bazlı Özet Hatası:", error);
    res.status(500).json({ hata: "İlçe bazlı özet alınamadı" });
  }
};






/**
 * 2) Personel bazlı detay tablo
 */
exports.getPersonelDetay = async (req, res) => {
  try {
    const { ilce } = req.query;

    const [[donemRow]] = await db.query(
      `SELECT MAX(donem) AS son_donem FROM kds_performans_skoru`
    );
    const sonDonem = donemRow?.son_donem || null;

    let where = "";
    const params = [sonDonem, sonDonem];

    if (ilce && ilce !== "Tümü") {
      where = "WHERE s.ilce = ?";
      params.push(ilce);
    }

    const [rows] = await db.query(
      `
      SELECT
        p.ad_soyad,
        s.sube_adi,
        r.rol_adi,
        p.ise_giris_tarihi,

        ROUND(COALESCE(kpr.toplam_katsayi, 0), 2) AS genel_performans,
        ROUND(COALESCE(ciro.yuzde_basari, 0), 2) AS ciro_yuzde,
        ROUND(COALESCE(iade.gerceklesen_deger, 0), 2) AS iade_orani,
        ROUND(COALESCE(kpr.prim_tutari, 0), 2) AS prim_tutari

      FROM personeller p
      INNER JOIN subeler s ON s.sube_id = p.sube_id
      INNER JOIN roller r ON r.rol_id = p.rol_id
      LEFT JOIN kds_prim_sonuc kpr ON kpr.personel_id = p.personel_id

      LEFT JOIN (
        SELECT personel_id, yuzde_basari
        FROM kds_performans_skoru
        WHERE metrik_id = 1 AND donem = ?
      ) ciro ON ciro.personel_id = p.personel_id

      LEFT JOIN (
        SELECT personel_id, gerceklesen_deger
        FROM kds_performans_skoru
        WHERE metrik_id = 4 AND donem = ?
      ) iade ON iade.personel_id = p.personel_id

      ${where}
      ORDER BY s.ilce, s.sube_adi, p.ad_soyad
      `,
      params
    );

    res.json({
      donem: sonDonem,
      ilce: ilce || "Tümü",
      rows
    });
  } catch (error) {
    console.error("Personel Detay Hatası:", error);
    res.status(500).json({ hata: "Personel detayı alınamadı" });
  }
};
