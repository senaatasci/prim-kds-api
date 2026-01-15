const express = require("express");
const path = require("path");
const router = express.Router();

const performansController = require("../controllers/performansController");

/**
 * HTML SAYFA
 * URL: /performans
 */
router.get("/performans", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "performans.html"));
});

/**
 * API – İlçe bazlı özet tablo
 * URL: /api/performans/ilce-ozet
 */
router.get(
  "/api/performans/ilce-ozet",
  performansController.getIlceBazliOzet
);

/**
 * API – Personel bazlı detay tablo
 * URL: /api/performans/personel-detay
 * Opsiyonel: ?ilce=Buca
 */
router.get(
  "/api/performans/personel-detay",
  performansController.getPersonelDetay
);

module.exports = router;
