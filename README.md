# EK LifeTracker

Gündelik hayat paneli: görev, olay, son tarih, not, hatırlatma.
Türkçe doğal dil ile ekle → otomatik tür + kategori + tarih.
Siri / Tailscale ile telefonda aktif kullanım.

## Stack

- `client/` Vite + React + Chakra (port **5181**)
- `server/` Express + Prisma + SQLite (port **3081**)
- `dev-manager/` Electron start/stop panel
- Mimari: watchlist ile aynı katmanlar (routes → schemas → repos/services)

## Kurulum

```bash
npm install
copy .env.example .env
npm run db:push
npm run dev
```

- Panel: http://localhost:5181
- API: http://localhost:3081
- Dev Manager: `npm run dev-panel` (önce `npm run dev-panel:install`)

## Siri (Kestirmeler)

`.env` içine `VOICE_API_KEY` yaz. Tailscale IP ile:

```
GET http://<tailscale-ip>:3081/api/voice/add?key=...&q=Haftaya%20proje%20teslimi%20var
```

Cevap: `{ ok, message, title, kind, category, dueAt }`

## Ollama (yerel LLM parse)

Parser önce kuralları çalıştırır; düşük güvende Ollama’ya sorar. `.env`:

```
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
```

Ollama kapalıysa kural sonucu kullanılır.

## Örnek cümleler

- Bugün x olayı oldu
- Haftaya x projesinin teslimi var
- 16 Eylül'e kadar x'e başvur
- Bu hafta x görevini tamamla

## Sistem kategorileri

Genel, İş, Okul, Sağlık, Finans, Sosyal, Ev, Kişisel — sunucu açılışında seed edilir.
Panelden tür, kategori ve tarihler drawer ile düzenlenebilir.
