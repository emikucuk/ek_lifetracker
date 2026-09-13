# EK LifeTracker — Kurulum ve cihaz değiştirme rehberi

Bu belge, uygulamayı **yeni bir Windows bilgisayara** kurman veya **cihaz değiştirirken** arşivini kayıpsız taşıman için yazıldı.

> İlke: Canlı veri SQLite’ta (`server/prisma/dev.db`). Yedekler `backups/*.zip`. Panel ayarlarının bir kısmı DB içinde (`AppSetting`). Root `.env` tek sır ortam dosyasıdır.

---

## 1. Ne kurulur? (mimari özet)

| Parça | Port | Görev |
|--------|------|--------|
| **client** (Vite/React) | **5181** | Panel UI |
| **server** (Express/Prisma) | **3081** | API, parser, yedek, e-posta, voice |
| **dev-manager** (Electron) | — | Start/stop / log paneli (isteğe bağlı) |
| **Ollama** (harici) | 11434 | Yerel LLM parse (yoksa kurallar çalışır) |
| **SQLite** | dosya | `server/prisma/dev.db` |
| **Otomatik yedek** | klasör | `backups/lifetracker-*.zip` (son 20 zip) |

Klasör yapısı (önemli olanlar):

```
ek_lifetracker/
├── .env                 ← tek ortam dosyası (gizli; kopyala)
├── .env.example         ← şablon
├── backups/             ← otomatik zip arşivleri (OneDrive ile senkronlanırsa iyi)
├── client/
├── server/
│   └── prisma/
│       ├── schema.prisma
│       └── dev.db       ← asıl arşiv veritabanı
├── dev-manager/
├── scripts/
│   └── setup-new-device.ps1
└── docs/
    ├── KURULUM.md       ← bu dosya
    └── FEATURE_CHECKLIST.md
```

---

## 2. Yeni cihazda sıfırdan kurulum

### 2.1 Gereksinimler

1. **Windows 10/11**
2. **Node.js 18+** (LTS önerilir) — [nodejs.org](https://nodejs.org)
3. **Git** (repoyu klonluyorsan) veya OneDrive ile klasörün zaten gelmesi
4. İsteğe bağlı:
   - **Ollama** + model (örn. `qwen2.5:7b-instruct`)
   - **Tailscale** (telefonda Siri / uzak erişim)
   - Gmail **uygulama şifresi** (e-posta bildirimleri)

Kontrol:

```powershell
node -v
npm -v
```

### 2.2 Projeyi getir

**A) OneDrive ile (senin mevcut yolun)**  
Klasör zaten senkron ise yeni PC’de OneDrive bitene kadar bekle:

`...\OneDrive\Belgeler\ek_lifetracker`

**B) Git ile**

```powershell
git clone <repo-url> ek_lifetracker
cd ek_lifetracker
```

### 2.3 Tek komutluk kurulum betiği

Proje kökünde:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-new-device.ps1
```

Betik şunları yapar:

- Node/npm kontrolü  
- `.env` yoksa `.env.example` → `.env`  
- `npm install` (workspaces: client + server)  
- `npm run db:generate` + `npm run db:push`  
- `backups/` klasörü  
- `dev-manager` için `npm install`  

Elle yapmak istersen:

```powershell
cd ek_lifetracker
copy .env.example .env
notepad .env
npm install
npm run db:generate
npm run db:push
npm install --prefix dev-manager
```

### 2.4 `.env` doldur

Kökteki `.env` dosyasını düzenle (örnek alanlar `.env.example` içinde):

| Değişken | Anlamı | Örnek |
|----------|--------|--------|
| `PORT` | API portu | `3081` |
| `CLIENT_ORIGIN` | Panel origin (CORS) | `http://localhost:5181` |
| `DATABASE_URL` | SQLite | `file:./dev.db` |
| `VOICE_API_KEY` | Siri/Kestirmeler anahtarı | uzun rastgele metin |
| `OLLAMA_BASE_URL` | Ollama adresi | `http://127.0.0.1:11434` |
| `OLLAMA_MODEL` | Model adı | `qwen2.5:7b-instruct` |
| `OLLAMA_TIMEOUT_MS` | LLM timeout | `8000` |
| `PARSER_LLM_MIN_CONFIDENCE` | Hibrit eşik | `0.7` |
| `AUTO_BACKUP_ENABLED` | Otomatik zip | `true` |
| `AUTO_BACKUP_INTERVAL_HOURS` | Aralık (saat) | `6` |
| `AUTO_BACKUP_KEEP` | Tutulan zip sayısı | `20` |
| `AUTO_BACKUP_DIR` | İsteğe bağlı yol | `backups` |
| `AUTO_BACKUP_GIT_PUSH` | Yedekten sonra GitHub push | `true` |
| `AUTO_BACKUP_GIT_REMOTE` | Git remote | `origin` |
| `AUTO_BACKUP_GIT_BRANCH` | Push dalı (ayrı dal) | `backups` |

> SMTP bilgileri `.env`’de değildir. **Ayarlar → E-posta** panelinden girilir (veritabanına yazılır).

### 2.5 Çalıştırma

```powershell
npm run dev
```

- Panel: http://localhost:5181  
- API: http://localhost:3081  
- Sağlık: http://localhost:5181/health veya `GET http://localhost:3081/api/health`

**Dev Manager (Electron):**

```powershell
npm run dev-panel:install   # ilk sefer
npm run dev-panel
```

Smoke test (API ayaktayken):

```powershell
npm run smoke
```

---

## 3. Cihaz değiştirirken veri taşıma (kritik)

Amaç: **hiçbir kayıt kaybolmasın**.

### 3.1 Eski cihazda kapanmadan önce

1. Sunucunun bir kez düzgün kapandığından emin ol (otomatik **shutdown yedeği** üretir).  
2. Ayarlar → Yedek → **Şimdi yedekle** (ek güvence).  
3. Elle de indir: **JSON yedek** (Ayarlar → Elle dışa aktar).  
4. Şunları USB / OneDrive / harici diske kopyala:

| Ne | Nereden | Neden |
|----|---------|--------|
| Canlı DB | `server/prisma/dev.db` (+ varsa `dev.db-wal`, `dev.db-shm`) | Asıl arşiv |
| Yedek zip’ler | `backups\*.zip` | Geri dönüş noktaları |
| Ortam | kök `.env` | Anahtarlar / Ollama / yedek ayarları |
| (İsteğe bağlı) | elle indirdiğin `lifetracker-backup.json` | Panel import |

> `node_modules`, `dist`, `.git` taşımana gerek yok — yeni cihazda `npm install` yeter.

### 3.2 Yeni cihazda veri yerleştirme

**Senaryo A — OneDrive aynı klasör**  
Hiçbir şey taşıma; OneDrive sync bitsin. Sonra sadece:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-new-device.ps1
npm run dev
```

**Senaryo B — Temiz kopya + DB taşıma**

1. Kurulum betiğini çalıştır (veya `npm install` + `db:push`).  
2. Sunucu **kapalıyken** eski `dev.db` dosyasını şuraya kopyala (üzerine yaz):

   `server\prisma\dev.db`

3. Varsa `dev.db-wal` / `dev.db-shm` dosyalarını da aynı klasöre koy.  
4. `backups\` klasörünü de kopyala.  
5. `.env` dosyasını kökte güncelle.  
6. `npm run db:push` (şema uyumu; mevcut veriyi silmez).  
7. `npm run dev` ile aç; Bugün / Gelen / Ayarlar’ı kontrol et.

**Senaryo C — Sadece JSON yedekten kurtarma**

1. Kurulumu bitir, boş DB ile aç.  
2. Ayarlar → Yedek → **Değiştir (replace)** veya **Birleştir (merge)** ile JSON yükle.  
3. Replace: kullanıcı kategorileri + kayıtlar/ipuçları silinip yedek yazılır — bilinçli kullan.

**Zip yedekten (`backups/lifetracker-….zip`)**

1. Zip’i aç.  
2. İçinde `backup.json.gz` → gunzip / 7-Zip ile `backup.json` yap.  
3. Panelden JSON import (merge/replace).  
4. İstersen `backup.db` dosyasını da `server/prisma/dev.db` olarak kopyalayabilirsin (sunucu kapalıyken) — bu yol daha doğrudan.

### 3.3 Taşıma sonrası kontrol listesi

- [ ] Panel açılıyor (5181)  
- [ ] Kayıtlar görünüyor  
- [ ] Ayarlar → Parser / Ollama ping  
- [ ] Ayarlar → E-posta (SMTP’yi yeniden girmen gerekebilir; şifre DB’de ama yeni DB kopyaladıysan gelir)  
- [ ] Ayarlar → Yedek: son zip’ler listeleniyor  
- [ ] `VOICE_API_KEY` aynı mı? (Siri kestirmelerini güncelle)  
- [ ] Tailscale IP değiştiyse telefon kestirme URL’lerini güncelle  

---

## 4. Ollama (isteğe bağlı zeka katmanı)

1. [ollama.com](https://ollama.com) kur.  
2. Model çek:

```powershell
ollama pull qwen2.5:7b-instruct
```

3. `.env` içinde `OLLAMA_MODEL` aynı olsun.  
4. Panel → Ayarlar → Parser & Ollama → **Ollama ping**.  
5. Ollama yoksa uygulama çalışmaya devam eder (kural tabanlı parse).

---

## 5. E-posta bildirimleri

Kurulumdan sonra panelden (`.env` değil):

1. Ayarlar → **E-posta bildirimleri**  
2. Gmail örneği:
   - Host: `smtp.gmail.com`
   - Port: `465`, TLS açık  
   - Kullanıcı / from / to: kendi adresin  
   - Şifre: [Google uygulama şifresi](https://myaccount.google.com/apppasswords)  
3. Bildirimleri aç → Kaydet → **Test maili gönder**  
4. İstersen **Özeti şimdi gönder**  
5. Otomatik: her gün seçtiğin saatte (sunucu çalışırken) günlük özet şablonu gider  

Şablon içeriği: gecikenler · önümüzdeki N gün deadline · hatırlatmalar.

---

## 6. Siri / Kestirmeler + Tailscale

1. `.env` → güçlü `VOICE_API_KEY`  
2. Tailscale kur; PC’nin Tailscale IP’sini not et  
3. Backend’in `0.0.0.0:3081` dinlediğinden emin ol (`npm run dev`)  
4. Panel → **Siri kurulum** (`/voice`) — şablonları kopyala:

| Amaç | Endpoint |
|------|----------|
| Ekle | `/api/voice/add?key=...&q=...` |
| Bugün ne var? | `/api/voice/today?key=...` |
| Tamamla | `/api/voice/complete?key=...&q=...` |

5. iPhone Kestirmeler: **URL içeriğini al** → cevaptaki `message` / `speak` alanını Siri’ye okut  
6. Cihaz değişince **IP veya hostname** değişirse kestirme URL’lerini güncelle; key aynı kalabilir

CORS: `localhost` + `*.ts.net` izinli.

---

## 7. Otomatik yedek davranışı

- **Ne zaman:** sunucu açılışı, her N saat, sunucu kapanışı, panelden “Şimdi yedekle”  
- **Ne:** `backups/lifetracker-TARIH-reason.zip`  
  - içinde `manifest.json`, `backup.json.gz`, varsa `backup.db`  
- **Saklama:** son **20 zip** (canlı DB silinmez)  
- OneDrive altında tutuyorsan zip’ler de buluta gider — cihaz değişiminde büyük avantaj

---

## 8. Sık komutlar

```powershell
# Geliştirme
npm run dev
npm run dev-panel

# Veritabanı şeması
npm run db:generate
npm run db:push

# Derleme
npm run build

# API smoke
npm run smoke

# Yeni cihaz kurulumu
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-new-device.ps1
```

---

## 9. Sorun giderme

| Belirti | Kontrol |
|---------|---------|
| Panel API’ye bağlanamıyor | Server 3081 ayakta mı? Vite proxy / `CLIENT_ORIGIN` |
| Boş gelen kutusu | Yanlış `dev.db` mi kopyalandı? Yol: `server/prisma/dev.db` |
| Prisma hata | `npm run db:generate` sonra `db:push` |
| Ollama kapalı | Normal; kurallar çalışır. Ping kırmızı olabilir |
| E-posta gitmiyor | Uygulama şifresi, port 465/587, “Bildirimleri aç”, test butonu |
| Siri 401/geçersiz key | `VOICE_API_KEY` kestirme ile aynı mı? |
| Yedek yok | `AUTO_BACKUP_ENABLED=true`, `backups/` yazılabilir mi, sunucu en az bir kez kapandı mı? |
| Port çakışması | 3081/5181 dolu mu? (ek_watchlist farklı port kullanır) |

---

## 10. Güvenlik notları

- `.env` ve `dev.db` **kişisel arşiv** — public repoya koyma  
- `VOICE_API_KEY` paylaşılmamalı  
- E-posta SMTP şifresi panelde saklanır; cihaz paylaşımında dikkat  
- `backups/` gitignore’da (yerel); GitHub’a **`backups` dalı** ile push edilir (`AUTO_BACKUP_GIT_PUSH`)
- Repo **private** olmalı — zip içinde kişisel hayat verisi var

---

## 11. Hızlı “yeni laptop” özeti

1. OneDrive sync bekle **veya** `dev.db` + `backups/` + `.env` kopyala  
2. `scripts\setup-new-device.ps1` çalıştır  
3. `.env` gözden geçir  
4. `npm run dev`  
5. Ayarlar: e-posta, Ollama, yedek durumu  
6. Tailscale IP + Siri URL güncelle  
7. Test: bir cümle ekle, smoke, test maili  

Detaylı özellik listesi: [`FEATURE_CHECKLIST.md`](./FEATURE_CHECKLIST.md).

---

_Son güncelleme: yeni cihaz kurulum betiği + taşıma / e-posta / Siri / yedek bölümleri._
