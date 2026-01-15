// public/js/anasayfa.js
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("/api/dashboard/ozet");
        if (!response.ok) {
            throw new Error("HTTP hata: " + response.status);
        }

        const data = await response.json();
        console.log("Dashboard verisi:", data);

        const elSube = document.getElementById("toplamSube");
        const elPersonel = document.getElementById("toplamPersonel");
        const elPerformans = document.getElementById("ortalamaPerformans");
        const elPrim = document.getElementById("aylikPrim");
        const elGercekKaydi = document.getElementById("gercekKaydi");

        // 🟢 CAMELCASE İSİMLER
        if (elSube) elSube.textContent = data.toplamSube ?? 0;
        if (elPersonel) elPersonel.textContent = data.toplamPersonel ?? 0;
        if (elPerformans)
            elPerformans.textContent = (data.ortalamaPerformans ?? 0).toFixed(2) + " %";
        if (elPrim)
            elPrim.textContent = (data.aylikPrim ?? 0).toFixed(2) + " ₺";
        if (elGercekKaydi)
            elGercekKaydi.textContent = data.gercekKaydi ?? 0;

    } catch (err) {
        console.error("Ana sayfa özet verisi yüklenemedi:", err);
    }
});
