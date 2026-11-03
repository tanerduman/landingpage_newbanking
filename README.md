# AURE — neo-banka üyelik landing page

Revolut tarzı katmanlı abonelik modeli: paketsiz ücretsiz hesap ve isteğe bağlı Standard, Plus, Premium paketleri.

```bash
npm install
npm run dev
```

- Landing: `/`
- Waiting list: `/waitlist` (şifreli)

Giriş: kullanıcı `admin` · şifre `AureWaitlist2026`  
(İstersen build sırasında `VITE_WAITLIST_PASSWORD` ile değiştir.)

Kayıtlar tarayıcı `localStorage` içinde tutulur. Oturum `sessionStorage` ile sekmeye bağlıdır.

Üretim derlemesi: `npm run build`
