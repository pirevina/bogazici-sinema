// --- AYARLAR ---
const SITE_SIFRESI = "1234";

// --- FİLM VERİTABANI (20 FİLM İÇİN HAZIR LİSTE) ---
const filmler = [
    // 1. FİLM (ÖRNEK OLARAK DOLU BIRAKTIM)
    {
        id: 1,
        baslik: "Die Welle (Dalga)",
        tur: ["Bilim Kurgu", "Aksiyon"],
        ozet: "Rüyaların içinde geçen, zihnin derinliklerine inen bir hırsızlık hikayesi. Dom Cobb yetenekli bir hırsızdır.",
        poster: "https://upload.wikimedia.org/wikipedia/tr/thumb/1/1f/Tehlikeli-oyun.jpg/500px-Tehlikeli-oyun.jpg", 
        driveDublaj: "https://drive.google.com/file/d/19ij7Zy3Dq1iHqM4FtVv77Q-0wHrSyqE8/preview", // Drive linkini buraya yapıştır
        driveAltyazi: "https://www.youtube.com/embed/8hP9D6kZseM",
        formLink: "https://forms.google.com" // Form linkini buraya yapıştır
    },

    // 2. FİLM (BURADAN İTİBAREN DOLDURMAYA BAŞLA)
    {
        id: 2,
        baslik: "Inception (Başlangıç)",
        tur: ["Bilim Kurgu", "Aksiyon"],
        ozet: "Rüyaların içinde geçen, zihnin derinliklerine inen bir hırsızlık hikayesi. Dom Cobb yetenekli bir hırsızdır.",
        poster: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg", 
        driveDublaj: "https://www.youtube.com/embed/YoHD9XEInc0", // Drive linkini buraya yapıştır
        driveAltyazi: "https://www.youtube.com/embed/8hP9D6kZseM",
        formLink: "https://forms.google.com" // Form linkini buraya yapıştır
    },

    // 3. FİLM
    {
        id: 3,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 4. FİLM
    {
        id: 4,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 5. FİLM
    {
        id: 5,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 6. FİLM
    {
        id: 6,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 7. FİLM
    {
        id: 7,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 8. FİLM
    {
        id: 8,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 9. FİLM
    {
        id: 9,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 10. FİLM
    {
        id: 10,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 11. FİLM
    {
        id: 11,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 12. FİLM
    {
        id: 12,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 13. FİLM
    {
        id: 13,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 14. FİLM
    {
        id: 14,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 15. FİLM
    {
        id: 15,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 16. FİLM
    {
        id: 16,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 17. FİLM
    {
        id: 17,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 18. FİLM
    {
        id: 18,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 19. FİLM
    {
        id: 19,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    },

    // 20. FİLM
    {
        id: 20,
        baslik: "BURAYA FİLMİN ADINI YAZ",
        tur: ["Tür Yaz"],
        ozet: "Filmin özetini buraya yapıştır.",
        poster: "BURAYA_POSTER_LINKI", 
        driveDublaj: "BURAYA_DRIVE_LINKI",
        driveAltyazi: "BURAYA_DRIVE_LINKI",
        formLink: "BURAYA_FORM_LINKI"
    }
];

// --- SAYFA YÜKLENDİĞİNDE ÇALIŞACAKLAR ---
document.addEventListener("DOMContentLoaded", function() {
    
    // Enter tuşu ile giriş
    const passInput = document.getElementById("password-input");
    if(passInput) {
        passInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                checkPassword();
            }
        });
    }

    // Aydınlık tema varsayılan olsun, eğer kullanıcı karanlık seçtiyse onu yükle
    if(localStorage.getItem("theme") === "dark") {
        document.body.setAttribute("data-theme", "dark");
    }

    initFilms(filmler);
});

// --- ŞİFRE KONTROLÜ ---
function checkPassword() {
    const input = document.getElementById("password-input").value;
    const errorMsg = document.getElementById("error-msg");
    
    if(input === SITE_SIFRESI) {
        document.getElementById("login-overlay").style.display = "none";
        document.getElementById("app-container").style.display = "block";
    } else {
        errorMsg.textContent = "Hatalı şifre! Tekrar deneyin.";
        errorMsg.style.color = "#e74c3c";
    }
}

// --- SİTEYİ BAŞLAT ---
function initFilms(data) {
    const grid = document.getElementById("movie-grid");
    if(!grid) return;
    
    grid.innerHTML = ""; // Temizle

    data.forEach(film => {
        // Eğer filmin adı veya posteri boşsa onu gösterme (boş kutu oluşmasın)
        if(film.baslik === "" || film.baslik.includes("BURAYA")) return;

        const card = document.createElement("div");
        card.className = "movie-card";
        
        card.innerHTML = `
            <div class="poster-container" onclick="openPlayer(${film.id}, 'dublaj')">
                <img src="${film.poster}" alt="${film.baslik}">
                <div class="play-overlay">
                    <i class="fas fa-play-circle play-icon"></i>
                </div>
            </div>
            <div class="card-info">
                <h3>${film.baslik}</h3>
                <div class="tags">${film.tur.join(", ")}</div>
            </div>
            <div class="watch-options">
                <button class="opt-btn" onclick="openPlayer(${film.id}, 'dublaj')">TR Dublaj</button>
                <button class="opt-btn" onclick="openPlayer(${film.id}, 'altyazi')">Altyazılı</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- PLAYER AÇMA (MODAL) ---
function openPlayer(id, type) {
    const film = filmler.find(f => f.id === id);
    if (!film) return;

    const modal = document.getElementById("player-modal");
    const iframe = document.getElementById("main-player");
    const titleEl = document.getElementById("player-title");
    const descEl = document.getElementById("player-desc");
    const tagsEl = document.getElementById("player-tags");
    const btn = document.getElementById("eval-btn");

    titleEl.innerText = film.baslik;
    descEl.innerText = film.ozet;
    tagsEl.innerHTML = film.tur.map(t => `<span>${t}</span>`).join('');
    
    iframe.src = (type === 'dublaj') ? film.driveDublaj : film.driveAltyazi;
    btn.href = film.formLink;
    
    // Flex ile ortalayarak aç
    modal.style.display = "flex"; 
}

// --- DUYURU AÇMA ---
function openModal(id) { 
    const modal = document.getElementById(id);
    if(modal) modal.style.display = "flex"; 
}

// --- KAPATMA FONKSİYONU ---
function closeModal(id) { 
    document.getElementById(id).style.display = "none";
    if(id === 'player-modal') document.getElementById("main-player").src = "";
}

// --- FİLTRELEME ---
function filterFilms() {
    const query = document.getElementById("search-input").value.toLowerCase();
    const filtered = filmler.filter(f => f.baslik.toLowerCase().includes(query));
    initFilms(filtered);
}

function filterGenre(genre) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    if(genre === 'all') {
        initFilms(filmler);
    } else {
        const filtered = filmler.filter(f => f.tur.includes(genre));
        initFilms(filtered);
    }
}

// --- TEMA DEĞİŞTİRME ---
function toggleTheme() {
    const body = document.body;
    if(body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
}

// --- TIKLAMA İLE KAPATMA ---
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
        if(event.target.id === 'player-modal') document.getElementById("main-player").src = "";
    }
}