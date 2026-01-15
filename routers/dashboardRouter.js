const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");

// ⚠️ ÇOK ÖNEMLİ: fonksiyon referansı veriyoruz
router.get("/ozet", dashboardController.getOzet);

module.exports = router;
