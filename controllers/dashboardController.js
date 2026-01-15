const db = require("../db/mysql_connect");

exports.getOzet = async (req, res) => {
  try {
    const [[sube]] = await db.query(`SELECT COUNT(*) AS toplam_sube FROM subeler`);
    const [[personel]] = await db.query(`SELECT COUNT(*) AS toplam_personel FROM personeller`);
    const [[performans]] = await db.query(`
      SELECT ROUND(AVG(toplam_katsayi),2) AS ortalama_performans
      FROM kds_prim_sonuc
    `);
    const [[gercek]] = await db.query(`SELECT COUNT(*) AS gercek_kaydi FROM gerceklesmeler`);
    const [[prim]] = await db.query(`
      SELECT COALESCE(SUM(prim_tutari),0) AS toplam_prim
      FROM kds_prim_sonuc
    `);

    res.json({
      toplamSube: sube.toplam_sube,
      toplamPersonel: personel.toplam_personel,
      ortalamaPerformans: performans.ortalama_performans,
      gercekKaydi: gercek.gercek_kaydi,
      aylikPrim: prim.toplam_prim
    });

  } catch (err) {
    console.error("❌ Dashboard Hatası:", err);
    res.status(500).json({ error: "Dashboard verisi getirilemedi" });
  }
};
