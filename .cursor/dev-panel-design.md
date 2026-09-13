# EK Watchlist — Dev Panel UI Tasarım Standartları

Bu belge, `dev-manager/` içindeki **Dev Panel** arayüzünde kullandığımız görsel dili tanımlar. Ana uygulama (React/Chakra, light theme) ile aynı marka kimliğini paylaşır; araç paneli için **koyu, terminal-odaklı** bir varyanttır.

Referans dosyalar:
- `dev-manager/renderer/styles.css`
- `dev-manager/renderer/index.html`

---

## Marka & renk sistemi

Ana uygulamayla ortak çekirdek:

| Token | Hex | Kullanım |
|-------|-----|----------|
| **Jungle** | `#1A4731` | Marka yeşili, header gradient, primary metin rengi (cream buton üstünde) |
| **Cream Soda** | `#FFF4CC` | Primary CTA arka planı, marka vurgusu |

Dev Panel koyu yüzey paleti:

| Token | CSS değişken | Hex | Kullanım |
|-------|---------------|-----|----------|
| Arka plan | `--bg` | `#141412` | Sayfa zemini |
| Panel | `--panel` | `#1e1e1b` | Kartlar, komut satırı |
| Kenarlık | `--border` | `#2e2e28` | Panel/card sınırları |
| Metin | `--text` | `#f5f0e6` | Ana metin |
| Soluk | `--muted` | `#9a9588` | İkincil metin, etiketler |
| Log zemin | — | `#0f0f0d` | Log alanı (en koyu katman) |

### Semantik log / servis renkleri

Her servis logda ve UI’da aynı renkle görünür:

| Rol | Arka plan vurgu | Metin | Anlam |
|-----|-----------------|-------|-------|
| **Backend** | `rgba(26,71,49,0.35)` | `#8fd4a8` | API / tsx / port 3100 |
| **Frontend** | `rgba(196,160,53,0.18)` | `#ffe08a` | Vite / port 5170 |
| **Sistem** | `rgba(107,114,128,0.2)` | `#cbd5e1` | Panel mesajları |
| **Hata** | — | `#fca5a5` | Hata satırları |

Durum göstergeleri (indicator dot):

- **Açık (port):** `#22c55e` + hafif glow
- **Kapalı:** `#ef4444`
- **Çalışıyor (süreç):** `#eab308` + hafif glow

---

## Tipografi

| Bağlam | Font | Boyut | Not |
|--------|------|-------|-----|
| UI genel | `Segoe UI`, `system-ui`, sans-serif | 0.78–1.1rem | Windows-native his |
| Log / port | `Consolas`, `Cascadia Mono`, monospace | 0.78rem | Terminal okunurluğu |
| Pill / label | uppercase | 0.72rem | `letter-spacing: 0.05–0.06em` |
| Sayfa başlığı | — | 1.1rem | `letter-spacing: 0.02em` |

Log satırlarında ANSI renk kodları gösterilmez; düz metin + semantik renk sınıfı kullanılır.

---

## Spacing & radius

- Sayfa padding (üst panel): `16px`
- Bölümler arası gap: `12px`
- Kart / panel iç padding: `12–14px`
- Border radius:
  - **Header:** `14px`
  - **Panel / kart:** `12px`
  - **Buton:** `10px`
  - **Pill:** `999px` (tam yuvarlak)
  - **Brand icon:** `8px`

---

## Layout

```
┌─ top-panel (flex-shrink: 0) ─────────────────┐
│  header (gradient jungle)                  │
│  commands-panel                            │
│  status-grid (3 kolon)                     │
│  legend                                    │
└────────────────────────────────────────────┘
┌─ log-panel (flex: 1, full width) ──────────┐
│  terminal log — kenardan kenara             │
└────────────────────────────────────────────┘
```

- Üst bölüm kompakt kontrol alanı; **log alanı tüm genişliği kaplar** ve dikeyde kalan alanı doldurur (`flex: 1`, `min-height: 0`).
- Log paneli yatay padding’siz tam genişlik; içerik `#log-output` içinde `12px 16px` padding alır.
- Mobil (`max-width: 820px`): status grid tek kolon.

---

## Bileşenler

### Header (`.header`)

- Jungle gradient: `135deg, #1a4731 → #243d32`
- Border: `#2f5a45`
- Sol: favicon + başlık + alt başlık (cream tonlu soluk alt metin)
- Sağ: birincil aksiyonlar

### Butonlar (`.btn`)

| Varyant | Görünüm | Kullanım |
|---------|---------|----------|
| **primary** | Cream zemin, jungle metin | Ana aksiyon (Tümünü başlat) |
| **danger** | Koyu kırmızı | Durdur |
| **ghost** | Yarı saydam beyaz | İkincil / komut butonları |
| **small** | Daha küçük padding | Komut satırı |

- `disabled`: opacity `0.45`
- Hover: primary `brightness(0.95)`, ghost biraz daha aydınlık
- Geçiş: `0.15s ease`

### Panel & kart (`.commands-panel`, `.status-card`)

- Arka plan `--panel`, border `--border`, radius `12px`
- Bilgi yoğunluğu yüksek; gölge kullanılmaz — flat + border

### Pill (`.pill-*`)

- Küçük uppercase etiket (Backend, Frontend, Süreç)
- Servis rengine göre yarı saydam arka plan

### Komut grupları (`.commands-group`)

- Yatay buton grubu; gruplar arası dikey ayırıcı (`border-right`)
- Grup etiketi: `.commands-label` (uppercase, muted)

### Log (`.log-panel`, `.log-line.*`)

- En koyu zemin; üstte ince border
- Her satır: zaman damgası (gri) + renkli metin
- Sınıflar: `.backend`, `.frontend`, `.system`, `.error`

---

## Etkileşim ilkeleri

1. **Renk = anlam.** Backend/frontend logları asla aynı renkte karıştırılmaz.
2. **Flat & net.** Gölge yerine border + hafif gradient (sadece header).
3. **Kompakt araç UI.** Dev panel bir “dashboard dekorasyonu” değil; start/stop/log odaklı.
4. **Marka sürekliliği.** Jungle + Cream ana uygulamayla aynı; dev panel koyu mod varyantı.
5. **Terminal dostu.** Log monospace; ANSI strip; otomatik kaydır seçeneği.

---

## Yeni özellik eklerken

- Yeni servis rengi: hem `--pill-*` / `--*-text` token çifti hem log sınıfı ekle.
- Yeni buton: mevcut `.btn-*` varyantlarından birini genişlet; yeni stil gerekiyorsa token tabanlı tut.
- Yeni kart: `.status-card` veya `.commands-panel` pattern’ini kopyala — özel gölge/radius icat etme.
- Ana uygulama (light) sayfalarına bu koyu panel stillerini doğrudan taşıma; sadece **token adları ve marka renkleri** paylaşılır.

---

## Hızlı token kopyası (CSS)

```css
:root {
  --bg: #141412;
  --panel: #1e1e1b;
  --border: #2e2e28;
  --text: #f5f0e6;
  --muted: #9a9588;
  --cream: #fff4cc;
  --jungle: #1a4731;
  --backend-text: #8fd4a8;
  --frontend-text: #ffe08a;
  --system-text: #cbd5e1;
  --error-text: #fca5a5;
}
```
