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

## GitHub Pages

`main`’e push sonrası Action siteyi yayınlar.

1. Repo **Settings → Pages → Source:** GitHub Actions
2. `main`’e merge veya **Actions → Deploy GitHub Pages → Run workflow**
3. Adres: `https://tanerduman.github.io/landingpage_newbanking/`
4. Waiting list: `https://tanerduman.github.io/landingpage_newbanking/waitlist`

Yerel derleme `base: '/'` kullanır. Pages derlemesi `GITHUB_PAGES=true` ile `/landingpage_newbanking/` kullanır.

Üretim derlemesi: `npm run build`
