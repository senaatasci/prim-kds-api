const db = require("../db/mysql_connect");

exports.getHaritaData = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM subeler");
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Harita verisi çekilemedi" });
    }
};
