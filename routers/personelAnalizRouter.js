const express = require("express");
const router = express.Router();
const c = require("../controllers/personelAnalizController");

router.get("/personeller", c.getPersonelList);
router.get("/ozet", c.getPersonelOzet);      // ?personel_id=1
router.get("/trend", c.getPersonelTrend);    // ?personel_id=1
router.get("/donemler", c.getDonemler);
router.get("/hedef-gerceklesen", c.getHedefGerceklesen);
router.get("/rol-hedef-dagilim", c.getRolHedefDagilim);



module.exports = router; 