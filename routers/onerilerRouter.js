const express = require("express");
const router = express.Router();

const onerilerController = require("../controllers/onerilerController");

// GET /api/oneriler
router.get("/", onerilerController.getOneriler);

module.exports = router;
