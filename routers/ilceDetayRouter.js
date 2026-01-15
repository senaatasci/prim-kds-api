const express = require("express");
const router = express.Router();

const ilceDetayController = require("../controllers/ilceDetayController");

// Filtre seçenekleri
router.get("/filters", ilceDetayController.getFilters);

// Dashboard verileri (KPI + 6 grafik)
router.get("/dashboard", ilceDetayController.getDashboard);

module.exports = router;
