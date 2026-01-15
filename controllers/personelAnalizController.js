const db = require("../db/mysql_connect");

exports.getPersonelList = async (req, res) => {
  const { ilce } = req.query;

  const [rows] = await db.query(`
    SELECT p.personel_id, p.ad_soyad
    FROM personeller p
    JOIN subeler s ON s.sube_id = p.sube_id
    WHERE s.ilce = ?
    ORDER BY p.ad_soyad
  `, [ilce]);

  res.json(rows);
};


exports.getPersonelOzet = async (req, res) => {
  const { personel_id } = req.query;

  const [[donemRow]] = await db.query(`SELECT MAX(donem) AS son_donem FROM gerceklesmeler`);
  const sonDonem = donemRow?.son_donem;

  // Son 6 ay donemleri (varchar(7) güvenli sıralama)
  const [donemler] = await db.query(`
    SELECT DISTINCT donem
    FROM gerceklesmeler
    ORDER BY STR_TO_DATE(CONCAT(donem,'-01'), '%Y-%m-%d') DESC
    LIMIT 6
  `);

  const donemList = donemler.map(x => x.donem);
  if (!personel_id || donemList.length === 0) return res.json({});

  const [rows] = await db.query(
    `
    SELECT
      p.ad_soyad,
      s.sube_adi,
      su.ilce,
      ROUND(AVG(kps.toplam_katsayi),2) AS ort_performans_6ay,
      SUM(CASE WHEN g.metrik_id=1 THEN g.gerceklesen_deger ELSE 0 END) AS toplam_ciro_6ay,
      ROUND(AVG(CASE WHEN g.metrik_id=3 THEN g.gerceklesen_deger END),2) AS ort_memnuniyet_6ay,
      ROUND(SUM(COALESCE(kpr.prim_tutari,0)),2) AS toplam_prim
    FROM personeller p
    JOIN subeler su ON su.sube_id = p.sube_id
    JOIN subeler s ON s.sube_id = p.sube_id
    LEFT JOIN kds_performans_skoru kps ON kps.personel_id = p.personel_id AND kps.donem IN (?)
    LEFT JOIN gerceklesmeler g ON g.personel_id = p.personel_id AND g.donem IN (?)
    LEFT JOIN kds_prim_sonuc kpr ON kpr.personel_id = p.personel_id
    WHERE p.personel_id = ?
    GROUP BY p.personel_id
    `,
    [donemList, donemList, personel_id]
  );

  res.json({ donem: "Son 6 Ay", row: rows[0] || null });
};

exports.getPersonelTrend = async (req, res) => {
  const { personel_id } = req.query;
  if (!personel_id) return res.json([]);

  const [rows] = await db.query(`
    SELECT
      donem,
      ROUND(SUM(agirlikli_skor),2) AS aylik_skor
    FROM kds_performans_skoru
    WHERE personel_id = ?
    GROUP BY donem
    ORDER BY STR_TO_DATE(CONCAT(donem,'-01'), '%Y-%m-%d')
  `, [personel_id]);

  res.json(rows);
};        
exports.getDonemler = async (req, res) => {
  const [rows] = await db.query(`
    SELECT DISTINCT donem
    FROM gerceklesmeler
    ORDER BY STR_TO_DATE(CONCAT(donem,'-01'), '%Y-%m-%d') DESC
  `);
  res.json(rows.map(r => r.donem));
};

// ⚠️ hedef için "hedefler" tablosu varsayıyorum (ilce_detay KPI hedefi nereden geliyorsa orası)
exports.getHedefGerceklesen = async (req, res) => {
  try {
    const { ilce, donem } = req.query;

    if (!ilce || !donem) {
      return res.status(400).json({ error: "ilce veya donem eksik" });
    }

    let donemList = [];

    // 🔹 Son 6 Ay
    if (donem === "6ay") {
      const [rows] = await db.query(`
        SELECT DISTINCT donem
        FROM gerceklesmeler
        ORDER BY STR_TO_DATE(CONCAT(donem,'-01'), '%Y-%m-%d') DESC
        LIMIT 6
      `);

      donemList = rows.map(r => r.donem);
    }
    // 🔹 Tek Ay
    else {
      donemList = [donem];
    }

    const [rows] = await db.query(
      `
      SELECT
        p.ad_soyad,
        SUM(CASE WHEN h.metrik_id = 1 THEN h.hedef_deger ELSE 0 END) AS toplam_hedef,
        SUM(CASE WHEN g.metrik_id = 1 THEN g.gerceklesen_deger ELSE 0 END) AS toplam_gerceklesen
      FROM personeller p
      JOIN subeler s ON s.sube_id = p.sube_id

      LEFT JOIN hedefler h 
        ON h.personel_id = p.personel_id
        AND h.donem IN (?)

      LEFT JOIN gerceklesmeler g 
        ON g.personel_id = p.personel_id
        AND g.donem IN (?)

      WHERE s.ilce = ?
      GROUP BY p.personel_id, p.ad_soyad
      ORDER BY p.ad_soyad
      `,
      [donemList, donemList, ilce]
    );

    res.json(rows);
  } catch (err) {
    console.error("Hedef-Gerçekleşen Hatası:", err);
    res.status(500).json({ error: "Hedef-Gerçekleşen API hatası" });
  }
};
exports.getRolHedefDagilim = async (req, res) => {
  try {
    const { ilce, donem } = req.query;
    if (!ilce || !donem) {
      return res.status(400).json({ error: "ilce veya donem eksik" });
    }

    let donemList = [];

    if (donem === "6ay") {
      const [rows] = await db.query(`
        SELECT DISTINCT donem
        FROM hedefler
        ORDER BY STR_TO_DATE(CONCAT(donem,'-01'), '%Y-%m-%d') DESC
        LIMIT 6
      `);
      donemList = rows.map(r => r.donem);
    } else {
      donemList = [donem];
    }

    const [rows] = await db.query(
      `
      SELECT
        r.rol_adi,
        SUM(h.hedef_deger) AS toplam_hedef
      FROM hedefler h
      JOIN personeller p ON p.personel_id = h.personel_id
      JOIN roller r ON r.rol_id = p.rol_id
      JOIN subeler s ON s.sube_id = p.sube_id
      WHERE s.ilce = ?
        AND h.donem IN (?)
      GROUP BY r.rol_adi
      ORDER BY toplam_hedef DESC
      `,
      [ilce, donemList]
    );

    res.json(rows);
  } catch (err) {
    console.error("Rol Hedef Dağılımı Hatası:", err);
    res.status(500).json({ error: "Rol hedef dağılımı hatası" });
  }
};

