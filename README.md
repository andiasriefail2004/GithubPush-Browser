# gitpush

Upload file ke GitHub langsung dari browser — tanpa terminal, tanpa install apapun.

🔗 **Demo:** https://gitpush-6v.vercel.app/

---

## Fitur

- Upload file/folder ke repo GitHub via drag & drop
- Ekstrak `.zip` otomatis, struktur folder dipertahankan
- Browser repo — lihat, edit, download, rename, hapus file
- **Upload gambar → URL raw langsung ke clipboard** (untuk README, dst.)
- Copy URL raw/blob setelah upload
- Rename / pindah file di repo
- Download file satuan atau seluruh repo sebagai ZIP
- Bulk rename & drag reorder file sebelum push
- Buat repo & branch baru
- Riwayat commit tersimpan lokal (IndexedDB)
- Tidak ada server — semua request langsung ke `api.github.com`
- Token tersimpan di IndexedDB perangkat kamu sendiri

---

## Cara pakai

### 1. Login

Ada dua cara:

**Personal Access Token (PAT)** — paling simpel
1. Buka https://github.com/settings/tokens/new?scopes=repo&description=gitpush
2. Pilih scope **repo**, set masa berlaku
3. Copy token → paste ke kolom PAT di gitpush → klik Hubungkan

**GitHub OAuth** — untuk deploy sendiri (lihat bagian deploy)

---

## Deploy sendiri

### Vercel

Struktur file yang dibutuhkan:

```
/
├── index.html
├── vercel.json
└── api/
    └── oauth-callback.js
```

**`vercel.json`** mengatur security headers dan fungsi serverless:

```json
{
  "version": 2,
  "functions": {
    "api/oauth-callback.js": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options",             "value": "DENY" },
        { "key": "X-Content-Type-Options",       "value": "nosniff" },
        { "key": "X-DNS-Prefetch-Control",       "value": "on" },
        { "key": "Referrer-Policy",              "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy",           "value": "geolocation=(), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()" },
        { "key": "Content-Security-Policy",      "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https://avatars.githubusercontent.com https://raw.githubusercontent.com data: blob:; connect-src 'self' https://api.github.com https://github.com https://raw.githubusercontent.com; worker-src blob:; frame-ancestors 'none'" },
        { "key": "Strict-Transport-Security",    "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "Cross-Origin-Opener-Policy",   "value": "same-origin" },
        { "key": "Cross-Origin-Resource-Policy", "value": "same-origin" }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

> **Kenapa CORS tidak ada di `vercel.json`?**
> CORS untuk `/api/oauth-callback` sudah diset langsung di dalam `api/oauth-callback.js` via `res.setHeader(...)`. Kalau didobel di `vercel.json` bisa konflik.

**`api/oauth-callback.js`** pakai format Node.js (`req, res`) — format khusus Vercel Serverless Functions.

Env vars (set di Vercel Dashboard → Settings → Environment Variables):
```
GITHUB_CLIENT_ID=Iv1.xxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxx
```

---

### Cloudflare Pages

Struktur file yang dibutuhkan:

```
/
├── index.html
├── _headers
└── functions/
    └── api/
        └── oauth-callback.js
```

**`_headers`** mengatur security headers — **hanya dibaca Cloudflare Pages** (dan Netlify). Vercel mengabaikan file ini:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-DNS-Prefetch-Control: on
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https://avatars.githubusercontent.com https://raw.githubusercontent.com data: blob:; connect-src 'self' https://api.github.com https://github.com https://raw.githubusercontent.com; worker-src blob:; frame-ancestors 'none'
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin

/api/*
  Cache-Control: no-store
```

> **Kenapa CORS tidak ada di `_headers`?**
> CORS untuk `/api/oauth-callback` diset di dalam `functions/api/oauth-callback.js` lewat `Response` headers. Sama seperti Vercel — tidak perlu didobel di `_headers`.

**`functions/api/oauth-callback.js`** pakai format Web API (`Request`/`Response`) — format khusus Cloudflare Pages Functions. **Berbeda dengan versi Vercel** yang pakai Node.js `req/res`.

| | Vercel | Cloudflare Pages |
|---|---|---|
| File handler | `api/oauth-callback.js` | `functions/api/oauth-callback.js` |
| Format | Node.js `(req, res)` | Web API `({ request, env })` |
| Env vars | `process.env.XXX` | `env.XXX` |
| CORS | `res.setHeader(...)` | Lewat object `Response` |
| URL yang dipanggil browser | `/api/oauth-callback` | `/api/oauth-callback` |

URL-nya sama persis — Cloudflare otomatis route `/api/*` ke `/functions/api/*`.

Env vars (set di Cloudflare Dashboard → Pages → Settings → Environment Variables):
```
GITHUB_CLIENT_ID=Iv1.xxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxx
```

---

## Perbedaan `vercel.json` vs `_headers`

| | `vercel.json` | `_headers` |
|---|---|---|
| Dibaca oleh | Vercel saja | Cloudflare Pages, Netlify |
| Format | JSON | Plain text |
| Lokasi | root project | root project |
| Mengatur | Headers + Functions config | Headers saja |

Keduanya ada di repo ini. Vercel baca `vercel.json` dan abaikan `_headers`. Cloudflare Pages baca `_headers` dan abaikan `vercel.json`. Tidak ada konflik.

---

## Penjelasan security headers

| Header | Nilai | Fungsi |
|---|---|---|
| `X-Frame-Options` | `DENY` | Cegah halaman dibuka dalam iframe (clickjacking) |
| `X-Content-Type-Options` | `nosniff` | Browser tidak boleh tebak-tebak tipe file |
| `X-DNS-Prefetch-Control` | `on` | Percepat DNS lookup ke api.github.com |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Batasi info referrer yang bocor ke domain lain |
| `Permissions-Policy` | `geolocation=(), camera=(), ...` | Matikan semua browser API yang tidak dipakai |
| `Content-Security-Policy` | (lihat di bawah) | Whitelist sumber resource yang boleh dimuat |
| `Strict-Transport-Security` | `max-age=63072000` | Paksa HTTPS selama 2 tahun |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolasi tab, diperlukan agar `clipboard.writeText()` reliable |
| `Cross-Origin-Resource-Policy` | `same-origin` | Cegah hotlinking resource dari domain lain |

**CSP breakdown:**
```
default-src 'self'
  → semua resource harus dari domain sendiri, kecuali yang dikecualikan di bawah

script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com
  → script boleh inline (untuk <script> di index.html) + JSZip dari cdnjs

style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
  → style inline diizinkan + Google Fonts CSS

font-src https://fonts.gstatic.com
  → file font hanya dari Google Fonts CDN

img-src 'self' https://avatars.githubusercontent.com https://raw.githubusercontent.com data: blob:
  → avatar GitHub, gambar raw dari repo, data URI, blob URL (untuk download)

connect-src 'self' https://api.github.com https://github.com https://raw.githubusercontent.com
  → fetch/XHR hanya ke GitHub API, GitHub OAuth, dan raw content GitHub

worker-src blob:
  → izinkan JSZip pakai blob URL untuk Web Worker saat ekstrak ZIP besar

frame-ancestors 'none'
  → tidak boleh di-embed dalam iframe di domain manapun
```

---

## Keamanan

- Semua request ke GitHub API dilakukan **langsung dari browser** — tidak ada server perantara yang menyentuh token kamu
- Token disimpan di **IndexedDB** perangkat lokal, tidak pernah dikirim ke server gitpush
- Satu-satunya yang menyentuh server (Vercel/CF Pages) adalah OAuth callback — itupun hanya untuk tukar `code` sementara dengan `access_token`, dan `code` itu hanya berlaku sekali
- Verifikasi sendiri: buka DevTools → Network → semua request cuma ke `api.github.com`

---

## Lisensi

MIT
