# PsikoConnect - Online Psikolojik Danışmanlık Platformu

Psikologların hastalarıyla görüntülü görüşme yapabildiği, randevu yönetebildiği ve hasta notları tutabildiği full-stack web uygulaması.

## Özellikler

### Kullanıcılar
- **Psikolog Kayıt/Giriş**: Profil oluşturma, uzmanlık alanları, eğitim bilgileri
- **Hasta Kayıt/Giriş**: Profil yönetimi, psikolog arama

### Randevu Sistemi
- Psikolog müsaitlik takvimi
- Online randevu oluşturma
- Randevu onay/red/iptal
- Otomatik bildirimler

### Görüntülü Görüşme (WebRTC)
- Peer-to-peer video/ses görüşmesi
- Ekran paylaşımı
- Mikrofon/kamera kontrolü

### Mesajlaşma
- Gerçek zamanlı chat (Socket.io)
- Dosya paylaşımı
- Okundu bildirimi

### Hasta Notları
- Seans notları
- Tanı ve tedavi planları
- Hasta ile paylaşım seçeneği

### Blog/Makale
- Psikolog makale paylaşımı
- Kategori sistemi
- Yorum ve beğeni

### Ödeme Sistemi
- Iyzico entegrasyonu (sandbox)
- Seans ücretlendirme
- İade talebi

## Teknoloji Yığını

### Frontend
- React 18 + Vite
- Tailwind CSS
- React Router v6
- Socket.io-client
- Simple-peer (WebRTC)

### Backend
- Node.js + Express
- **Supabase (PostgreSQL)** - Ücretsiz veritabanı
- Socket.io
- JWT Authentication
- Multer (dosya yükleme)

## Kurulum

### Gereksinimler
- Node.js v18+
- Supabase hesabı (ücretsiz)

### 1. Supabase Kurulumu

1. https://supabase.com adresine gidin
2. Ücretsiz hesap oluşturun
3. "New Project" ile yeni proje oluşturun
4. Proje oluşturulduktan sonra:
   - **Settings > API** bölümünden:
     - `Project URL` → SUPABASE_URL
     - `service_role key` → SUPABASE_SERVICE_KEY
5. **SQL Editor** bölümüne gidin
6. `server/config/schema.sql` dosyasındaki SQL'i kopyalayıp çalıştırın

### 2. Projeyi Klonlayın
```bash
cd psikologss
```

### 3. Backend Kurulumu
```bash
cd server
npm install

# .env dosyasını oluşturun
copy env.sample .env
# .env dosyasını düzenleyin (Supabase bilgilerini ekleyin)
```

### 4. Frontend Kurulumu
```bash
cd client
npm install
```

### 5. Environment Variables

`server/.env` dosyasını düzenleyin:
```env
PORT=5000
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```

### 6. Uygulamayı Çalıştırın

Terminal 1 - Backend:
```bash
cd server
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm run dev
```

Uygulama: http://localhost:5173

## Proje Yapısı

```
psikologss/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # UI bileşenleri
│   │   ├── pages/          # Sayfa bileşenleri
│   │   ├── context/        # Auth, Socket context
│   │   ├── services/       # API çağrıları
│   │   └── utils/          # Yardımcı fonksiyonlar
│   └── package.json
├── server/                 # Node.js Backend
│   ├── config/             # Supabase config + SQL schema
│   ├── routes/             # API endpoint'leri
│   ├── middleware/         # Auth, upload middleware
│   ├── socket/             # Socket.io handlers
│   └── package.json
└── README.md
```

## Ücretsiz Dağıtım

### Frontend - Vercel
1. GitHub'a push edin
2. Vercel'de import edin
3. Build command: `npm run build`
4. Output directory: `dist`

### Backend - Render.com
1. Web Service oluşturun
2. Build command: `npm install`
3. Start command: `npm start`
4. Environment variables ekleyin

### Database - Supabase
- Ücretsiz plan: 500MB veritabanı, 1GB dosya depolama
- Otomatik yedekleme
- Gerçek zamanlı özellikler

## Lisans

MIT License
