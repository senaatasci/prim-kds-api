const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(express.json());

// ---- STATİK DOSYALAR ----
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "views")));

// GeoJSON dosyasŽñnŽñ doYrudan servis edilmesi
app.get("/ilceler.geojson", (req, res) => {
  res.sendFile(path.join(__dirname, "ilceler.geojson"));
});

// ---- API ROUTER'LARI ----
app.use("/api/oneriler", require("./routers/onerilerRouter"));
app.use("/api/harita", require("./routers/haritaRouter"));
app.use("/api/auth", require("./routers/authRouter"));
app.use("/api/dashboard", require("./routers/dashboardRouter"));
app.use("/api/ilce-detay", require("./routers/ilceDetayRouter"));
app.use("/api/personel-analiz", require("./routers/personelAnalizRouter"));



/*
  🔴 ÖNEMLİ:
  performansRouter hem:
  - /performans (HTML)
  - /api/performans/* (JSON)
  endpoint'lerini içeriyor.
  Bu yüzden root'a mount ediyoruz.
*/
app.use("/", require("./routers/performansRouter"));

// ---- HTML SAYFA ROUTE'LARI ----
//app.get("/", (req, res) => {
 // res.sendFile(path.join(__dirname, "views", "login.html"));
//});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});



app.get("/harita", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "harita.html"));
});

app.get("/ilce_detay", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "ilce_detay.html"));
});

app.get("/personel_analiz", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "personel_analiz.html"));
});


app.get("/oneriler", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "oneriler.html"));
});

// ⚠️ DİKKAT:
// /performans route'u BURADA YOK.
// Çünkü bunu performansRouter yönetiyor.
// Çakışma ve 404'leri engellemek için bilinçli olarak kaldırıldı.

// ---- SUNUCUYU BAŞLAT ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sunucu çalışıyor: http://localhost:${PORT}`);
});
