# EK LifeTracker — Özellik checklist

> İlke: **otomatik aksın, kontrol sende kalsın.**  
> Parser / Siri / Ollama arka planda çalışır; yanlışsa panelden tek dokunuşla düzeltirsin.

## Efsane

- `[x]` yapıldı
- `[ ]` önerilen / yapılacak

---

## Temel yakalama (otomatik giriş)

- [x] Doğal dil ile hızlı ekleme (panel)
- [x] Kural tabanlı Türkçe parse (tür / kategori / tarih)
- [x] Ollama hibrit parse (düşük güvende LLM, yoksa kural)
- [x] Siri / Kestirmeler voice endpoint (`/api/voice/add`)
- [x] `parseMeta` (güven, sinyaller, engine) saklama
- [x] Ingest sonrası **hızlı onay şeridi** (önerilen tür/kategori/tarih → onayla / düzelt)
- [x] Düşük güvenli kayıtları **“gözden geçir”** kuyruğuna ayırma
- [x] Sesli ekleme cevabında Siri’ye okunabilir kısa onay metni iyileştirmesi
- [x] Çoklu cümle / madde listesini tek seferde birden fazla kayda bölme (virgül + satır; `1,5` korunur)

## Kontrol yüzeyi (elle override)

- [x] Kayıt düzenleme drawer (başlık, tür, kategori, durum, öncelik, tarihler, not)
- [x] Tamamla / sil (onay balonu)
- [x] Inbox filtreleri (durum, tür, kategori)
- [x] Kategori yönetimi (ekle, renk/ad düzenle; sistem kategorisi silinemez)
- [x] Toplu işlemler (çoklu seç → tamamla / arşivle / kategori değiştir)
- [x] Sürükle-bırak ile takvimde tarih taşıma
- [x] “Bu parse’ı düzelt ve **öğren**” (kullanıcı düzeltmesini anahtar kelime / örnek olarak sakla)
- [x] Öncelik ve durum için klavye kısayolları

## Zaman & görünümler

- [x] Bugün görünümü
- [x] Inbox (kategoriye göre gruplu)
- [x] Takvim ay görünümü
- [x] Takvim hafta görünümü
- [x] Gündem / zaman çizelgesi (önümüzdeki 14 gün listesi)
- [x] Hatırlatma saati (saatli REMINDER) ve yerel bildirim stratejisi
- [x] E-posta bildirimleri (SMTP panel + günlük özet şablonu)
- [x] Tekrarlayan kayıtlar (her gün / hafta / ay — tamamlanınca sonraki oluşur)
- [x] “Ertele” kısayolu (+1 gün / +1 hafta)

## Kategori & sınıflandırma

- [x] Sistem kategorileri seed
- [x] Kullanıcı kategorisi CRUD
- [x] Sistem kategorisinde ad/renk özelleştirme (seed üzerine yazmaz)
- [x] Kategoriye özel anahtar kelime listesi (parser’a kullanıcı kuralları)
- [x] Kategori arşivleme (silmeden gizle)
- [x] Kayıtları kategorisiz / “Genel”e taşıma aracı (silmeden önce)

## Ollama / zeka katmanı

- [x] Yerel Ollama entegrasyonu + timeout + sessiz fallback
- [x] `.env` ile model seçimi
- [x] Ayarlar’dan model seçimi / “Ollama durumu” göstergesi
- [x] Parse motoru tercihi: sadece kural / hibrit / her zaman LLM
- [x] Güven eşiği kaydırıcısı (`PARSER_LLM_MIN_CONFIDENCE`)
- [x] Örnek cümlelerle parser smoke test paneli

## Siri & mobil akış

- [x] Voice API key koruması
- [x] Tailscale dostu CORS (`.ts.net`)
- [x] Kurulum sayfası (Voice)
- [x] Shortcut şablon metni / kopyala-yapıştır tek tık
- [x] “Bugün ne var?” sorgu endpoint’i (okuma, sadece ekleme değil)
- [x] “X’i tamamla” sesli komutu

## Güvenilirlik & veri

- [x] SQLite + Prisma
- [x] Dev Manager (start/stop, port, log)
- [x] Yedek al / geri yükle (JSON merge/replace)
- [x] Dışa aktar (Markdown / CSV)
- [x] Soft-delete / çöp kutusu (yanlış silmeyi geri al)
- [x] App settings tablosu üzerinden parser tercihleri (motor / eşik / model; diğer UI tercihler sonra)
- [x] Otomatik arşiv yedeği (açılış + aralık + kapanış → `backups/*.zip`; son 20 zip; canlı veri DB’de kalır)

## UX cilası

- [x] Boş durumlar için daha yönlendirici kopya + örnek cümleler
- [x] Arama (başlık / ham metin / not) global
- [ ] Karanlık / açık tema (isteğe bağlı; mevcut dil korunarak)
- [x] Mobil alt nav’da yoğunluk sadeleştirildi (Siri → Ayarlar linki; Gündem eklendi)
- [x] Parse sonucu chip’leri (engine: rules/hybrid) ince gösterge

## Geliştirici / işletim

- [x] Portlar: client **5181**, API **3081**
- [x] Root `.env` tek kaynak
- [x] `npm run dev` / `dev-panel`
- [x] Sağlık sayfasında Ollama ping
- [x] Basit e2e smoke script (ingest → list → patch)

---

## Öncelik önerisi (sonraki 3 sprint)

1. ~~**Ingest onay şeridi + gözden geçir kuyruğu**~~ ✓  
2. ~~**Öğrenen düzeltmeler + kategori anahtar kelimeleri**~~ ✓  
3. ~~**Yedek / dışa aktar + ertele / tekrarlayan**~~ ✓  

Kurulum / cihaz değiştirme: [`docs/KURULUM.md`](./KURULUM.md) · betik: `npm run setup`

Sonraki adaylar: karanlık/açık tema (isteğe bağlı), mobil nav sadeleştirme ince ayar.

---

_Son güncelleme: e-posta bildirimleri (SMTP panel + günlük özet şablonu)._
