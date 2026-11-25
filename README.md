# AURE

Kurgusal bir neo-banka vitrini. Gerçek bankacılık hizmeti sunmaz; para yatırma ve canlı hesap açılışı yoktur. Site, ücretsiz Temel hesap ile isteğe bağlı Standard, Plus ve Premium paketlerini gösterir ve talep listesine kayıt alır. Arayüz Türkçe ve İngilizcedir.

Canlı site: https://www.getaure.org

## Yerel çalışma

```bash
npm install
npm run dev
```

Geliştirme sunucusu http://localhost:5173/ adresini açar.

```bash
npm run lint
npm run build
```

`npm run build` TypeScript denetimini, Vite üretim derlemesini ve `dist/404.html` kopyasını çalıştırır.

Veritabanı ve yönetici ortamı yokken API bellek içi depoda durur. Bu depo süreç yeniden başlayınca sıfırlanır. Waitlist girişi, `WAITLIST_USER`, `WAITLIST_PASSWORD` ve `WAITLIST_SESSION_SECRET` üçünün birden tanımlı olmasını ister.

## Sayfalar

Yol adresleri esastır. Aynı sayfa, eski hash adresiyle de açılır (`/#/karsilastir` gibi).

| Sayfa | Adres | Menü |
| --- | --- | --- |
| Ana sayfa | `/` | Her zaman |
| Paketler | `/karsilastir`, `/compare` | Her zaman |
| Hesaplama | `/hesaplama`, `/calculate` | Her zaman |
| Marka işbirlikleri | `/isbirlikleri`, `/partners` | Her zaman |
| Destek | `/support`, `/destek` | Her zaman |
| Blog | `/blog` | Her zaman |
| Kampanyalar | `/kampanyalar`, `/campaigns` | Menüde yok |
| Uygun paket | `/uygun-paket`, `/fit` | Waitlist açınca |
| Yatırımcı ilişkileri | `/yatirimci`, `/investors` | Waitlist açınca |
| Talep listesi | `/waitlist` | Menüde yok; `noindex` |
| E-posta onayı | `/confirm` | — |

Uygun paket ve yatırımcı ilişkileri kapalı başlar. Kapalıyken menüde görünmezler; adres açılırsa sayfa yayında olmadığını söyler ve sunumu ya da hesaplayıcıyı göstermez. Waitlist ekranındaki anahtarlar açar ve kapatır.

Türkiye dışından gelen ziyaretçi `/region` sayfasına alınır. `MAINTENANCE` açıkken site `/maintenance` sayfasına döner; `/region` bu yönlendirmeden muaftır.

## Waitlist

`/waitlist` yönetici ekranıdır. Oturum çerezi yalnızca `/api` yoluna yazılır.

Buradan şunlar yönetilir:

- Onaylı hesap ve paket talepleri, destek kayıtları, ilgi alanları
- Paket tablosunun satırları ve fiyatların görünüp görünmemesi
- Karşılama metni, film opaklığı ve iki video yuvasından hangisinin yayında olduğu
- Açılış pop-up’ları
- Uygun paket ve yatırımcı ilişkileri sayfalarının yayını

Hero videoları `hero/reklam` ve `hero/film2` yollarına yüklenir. Yükleme, Vercel Blob’un imzalı adresi üzerinden gider.

## API

Tüm uçlar mevcut fonksiyonların içindedir. Yeni bir sunucusuz fonksiyon eklenmez.

| Uç | İş |
| --- | --- |
| `/api/waitlist` | Talep, paket kataloğu, karşılama, film, pop-up, sayfa anahtarları |
| `/api/login`, `/api/logout` | Yönetici oturumu |
| `/api/confirm`, `/api/confirm-status` | E-posta onay kodu |
| `/api/support` | Destek, öneri ve şikayet |
| `/api/interest` | İlgi alanları |
| `/api/visits` | Ziyaret sayacı |
| `/api/rates`, `/api/gold` | Döviz ve gram altın |
| `/api/health` | Sağlık kontrolü |

## Ortam

Değerler depoya yazılmaz. İsimler:

| Değişken | Ne işe yarar |
| --- | --- |
| `POSTGRES_URL` veya `DATABASE_URL` | Kalıcı depo. Yoksa bellek kullanılır |
| `WAITLIST_USER`, `WAITLIST_PASSWORD`, `WAITLIST_SESSION_SECRET` | Waitlist girişi |
| `RESEND_API_KEY`, `MAIL_FROM`, `APP_URL` | Onay ve makbuz e-postası |
| `FREECURRENCYAPI_KEY` | Döviz kuru |
| `COLLECTAPI_KEY` | Gram altın |
| `BLOB_STORE_ID` veya `BLOB_READ_WRITE_TOKEN` | Hero videosu. Vercel’de mağaza kimliği yeter |
| `MAINTENANCE` | `1`, `true` veya `on` ise bakım sayfası |

## Yayın

Canlı site Vercel projesine bağlıdır ve https://www.getaure.org adresine çıkar.

`main` dalına yapılan her push, ayrıca GitHub Pages’e statik bir kopya bırakır. Bu kopyanın API adresi derlemede `VITE_API_BASE` ile verilir. İş akışı şu an `https://landingpage-newbanking.vercel.app` değerini kullanır. Pages derlemesi `GITHUB_PAGES=1` ile `/landingpage_newbanking/` taban yolunu alır.
