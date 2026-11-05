# AURE — neo-banka üyelik landing page

katmanlı abonelik modeli: paketsiz ücretsiz hesap ve isteğe bağlı Standard, Plus, Premium paketleri.

```bash
npm install
npm run dev
```

- Landing: `/landingpage_newbanking/`
- Compare plans: `/landingpage_newbanking/#/compare`
- Waiting list: `/landingpage_newbanking/#/waitlist` (şifreli)

Giriş: kullanıcı `admin` · şifre `AureWaitlist2026`

## GitHub Pages

Site **mutlaka** bu adreste açılır (kök `tanerduman.github.io` değil):

https://tanerduman.github.io/landingpage_newbanking/

Compare plans: https://tanerduman.github.io/landingpage_newbanking/#/compare  
Waiting list: https://tanerduman.github.io/landingpage_newbanking/#/waitlist

Boş beyaz sayfa görürsen: bu tam URL’yi kullan, hard refresh (Ctrl+Shift+R). **Settings → Pages → Source** GitHub Actions olmalı.

Yerel: `npm run dev` → http://localhost:5173/landingpage_newbanking/

Üretim derlemesi: `npm run build`
