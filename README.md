# Said Numan Yücel — Portfolyo

Grafik tasarım, editoryal, tipografi, video ve web uygulaması çalışmalarımı içeren kişisel portfolyo sitesi.

Herhangi bir derleme adımı yok; düz HTML, CSS ve JavaScript. Vercel'e bağlandığında `main` dalına yapılan her push otomatik olarak yayına alınır.

## Yapı

- `index.html` / `en/index.html` — ana sayfa (TR / EN). Çalışmalar bölümünde 5 öne çıkan iş tam boy, kalanlar "Diğer çalışmalar" ızgarasında
- `calismalar/<proje>.html` / `en/calismalar/<proje>.html` — her projenin kendi sayfası (adres: `/calismalar/<proje>`)
- `404.html` — bulunamayan sayfa
- `sitemap.xml`, `robots.txt` — Google için; yeni proje sayfası eklersen site haritasına da ekle
- `style.css` — tasarım sistemi ve duyarlı (mobil uyumlu) düzen
- `main.js` — menü, kategori filtresi, görsel büyütme, kaydırma animasyonları
- `img/` — WebP formatında çalışma görselleri

## Lokal önizleme

```bash
npx serve .
```

## Yeni proje eklemek

1. `calismalar/` içindeki bir proje sayfasını kopyala, adını değiştir (örn. `calismalar/yeni-is.html`) ve içeriğini güncelle. Aynısını `en/calismalar/` için yap.
2. Ana sayfaya ızgara kartı ekle (`<a class="pcard" ...>`) ya da öne çıkanlardan biriyle yer değiştir.
3. Önceki / Sonraki bağlantılarını ve `sitemap.xml`'i güncelle.
4. Görsellere `width` ve `height` ekle (sayfa yüklenirken zıplamasın diye).
