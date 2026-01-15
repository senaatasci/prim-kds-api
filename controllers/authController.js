exports.login = async (req, res) => {
    const { kullanici_adi, sifre } = req.body;

    if (kullanici_adi === "admin" && sifre === "1234") {
        return res.json({ status: "ok" });
    }

    res.status(401).json({ status: "error", message: "Geçersiz giriş" });
};
