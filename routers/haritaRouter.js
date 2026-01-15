const express = require("express");
const router = express.Router();
const haritaController = require("../controllers/haritaController");

router.get("/", haritaController.getHaritaData);

module.exports = router;
