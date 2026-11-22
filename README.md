# Said Numan Yücel — Portfolyo

Grafik tasarım, editoryal, tipografi, video ve web uygulaması çalışmalarımı içeren kişisel portfolyo sitesi.

Herhangi bir derleme adımı yok; düz HTML, CSS ve JavaScript. Vercel'e bağlandığında `main` dalına yapılan her push otomatik olarak yayına alınır.

## Yapı

- `index.html` / `en/index.html` — ana sayfa (TR / EN). Çalışmalar bölümünde 5 öne çıkan iş tam boy, kalanlar "Diğer çalışmalar" ızgarasında
- `calismalar/<proje>.html` / `en/calismalar/<proje>.html` — her projenin kendi sayfası (adres: `/calismalar/<proje>`)
- `playground.html` / `en/playground.html` + `playground.js` — harf fiziği oyuncağı (Yerçekimi / Void / Sıfır G modları, PNG kaydetme); ana sayfadaki önizleme de aynı dosyayı kullanır
- `sergiler/<sergi>.html` / `en/sergiler/<sergi>.html` — sergi sayfaları; ana sayfadaki "Sergiler" listesinden bağlanır
- `404.html` — bulunamayan sayfa
- `sitemap.xml`, `robots.txt` — Google için; yeni proje sayfası eklersen site haritasına da ekle
- `style.css` — tasarım sistemi ve duyarlı (mobil uyumlu) düzen
- `main.js` — menü, kategori filtresi, görsel büyütme, kaydırma animasyonları
- `img/` — WebP formatında çalışma görselleri

## Kelime bulutu

Hero'daki kelimelerin konumları `tools/cloud.py` ile hesaplandı (kelimeleri ölçer, çakışmadan dağıtır, `index.html` ve `en/index.html` içine yazar). Kelime eklemek/çıkarmak için dosyanın başındaki `WORDS` listesini düzenle, sonra yerel sunucu açıkken çalıştır:

```bash
npx serve . -l 8765   # ya da: python3 -m http.server 8765
python3 tools/cloud.py 2 2   # sayılar: TR ve EN için farklı dağılım tohumları
```

## Lokal önizleme

```bash
npx serve .
```

## Yeni proje eklemek

1. `calismalar/` içindeki bir proje sayfasını kopyala, adını değiştir (örn. `calismalar/yeni-is.html`) ve içeriğini güncelle. Aynısını `en/calismalar/` için yap.
2. Ana sayfaya ızgara kartı ekle (`<a class="pcard" ...>`) ya da öne çıkanlardan biriyle yer değiştir.
3. Önceki / Sonraki bağlantılarını ve `sitemap.xml`'i güncelle.
4. Görsellere `width` ve `height` ekle (sayfa yüklenirken zıplamasın diye).
