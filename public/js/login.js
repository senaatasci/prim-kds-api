document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                kullanici_adi: document.getElementById("kullanici_adi").value,
                sifre: document.getElementById("sifre").value
            })
        });

        const data = await res.json();

        // ✅ Başarılı giriş
        if (res.ok) {
    window.location.href = "/ilce_detay";
}

        // ❌ Hatalı giriş
        else {
            alert(data.error || "Hatalı giriş!");
        }

    } catch (err) {
        console.error("Login JS Hatası:", err);
        alert("Sunucuya bağlanılamadı.");
    }
});
