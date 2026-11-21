"""Kelime bulutu yerleşimi: kelimeleri ölç, spiral ile çakışmadan yerleştir, HTML'i yaz."""
import asyncio, math, random, re, json
from playwright.async_api import async_playwright

import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 100.0, 80.0   # bulut kutusu, cqi biriminde (en-boy 5:4)
PAD = 2.2            # kelimeler arası boşluk (cqi)
SLACK = 1.12         # SF, Inter'den biraz geniş olabilir: ölçülere pay

# (sınıflar, boyut cqi, metin, bağlantı)
WORDS = {
 'tr': [('out', 9, 'Videografi', '#video'), ('', 9, 'Tipografi', '#type-specimen'), ('', 8.6, 'Dergi', '/calismalar/ikilem'),
        ('acc', 7, 'Belgesel', '#objektif'), ('', 6.6, 'Uygulama', '#uygulamalar'), ('', 5.6, 'Afiş', '/calismalar/afisler'),
        ('', 5, 'Kurumsal Kimlik', '#benfica'), ('', 4.6, 'Kitap Kapağı', '#elektrik-yagmuru'), ('out', 5, 'Animasyon', '/calismalar/55-saniye'),
        ('', 4.4, 'Kaligrafi', '/calismalar/tipogram'), ('mute', 4.2, 'Albüm Kapağı', '/calismalar/album-kapaklari'),
        ('acc', 4, 'Video Kurgu', '#video'), ('mute', 3.8, 'Web Tasarımı', '#uygulamalar'), ('mute', 3.7, 'Broşür', '/calismalar/ikilem-brosur'),
        ('mute', 3.5, 'Kartvizit', '/calismalar/kartvizit'), ('mute', 3.4, 'İllüstrasyon', '/calismalar/yeni-medya'), ('mute', 3.3, 'Monogram', '/calismalar/monogram')],
 'en': [('out', 8.4, 'Videography', '#video'), ('', 8.4, 'Typography', '#type-specimen'), ('', 8, 'Magazine', '/en/calismalar/ikilem'),
        ('acc', 6.4, 'Documentary', '#objektif'), ('', 7, 'Apps', '#uygulamalar'), ('', 5.6, 'Poster', '/en/calismalar/afisler'),
        ('', 4.8, 'Brand Identity', '#benfica'), ('', 4.6, 'Book Cover', '#elektrik-yagmuru'), ('out', 5, 'Animation', '/en/calismalar/55-saniye'),
        ('', 4.4, 'Calligraphy', '/en/calismalar/tipogram'), ('mute', 4.2, 'Album Art', '/en/calismalar/album-kapaklari'),
        ('acc', 4, 'Video Editing', '#video'), ('mute', 3.8, 'Web Design', '#uygulamalar'), ('mute', 3.7, 'Brochure', '/en/calismalar/ikilem-brosur'),
        ('mute', 3.5, 'Business Card', '/en/calismalar/kartvizit'), ('mute', 3.4, 'Illustration', '/en/calismalar/yeni-medya'), ('mute', 3.3, 'Monogram', '/en/calismalar/monogram')],
}

async def measure(words):
    spans = ''.join(f'<span class="w" style="font-size:{s*10}px">{t}</span><br>' for _, s, t, _ in words)
    page = f'''<html><head><link rel="stylesheet" href="/style.css"><style>.w{{animation:none!important;position:static!important;translate:none!important;display:inline-block}}</style></head>
    <body><div id="b">{spans}</div></body></html>'''
    open(ROOT + '/_m.html', 'w').write(page)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome')
        pg = await b.new_page(viewport={'width': 2000, 'height': 1000})
        await pg.goto('http://localhost:8765/_m.html'); await pg.wait_for_timeout(500)
        r = await pg.evaluate("[...document.querySelectorAll('.w')].map(e=>{const b=e.getBoundingClientRect();return [b.width,b.height]})")
        await b.close()
    return [(w / 10 * SLACK, h / 10 * 0.84) for w, h in r]   # satır yüksekliğinin boş kısmını at

def place(words, sizes, seed):
    """Dağınık yerleşim: rastgele adaylar arasından komşularına en uzak olanı seç; büyük kelimeler merkeze çekilir."""
    rnd = random.Random(seed)
    placed = []
    cx, cy = W * 0.5, H * 0.5
    smax = max(s for _, s, _, _ in words)
    for (cls, s, t, href), (w, h) in zip(words, sizes):
        best, bscore = None, -1e9
        for _ in range(5000):
            x = rnd.uniform(w / 2 + PAD, W - w / 2 - PAD)
            y = rnd.uniform(h / 2 + PAD, H - h / 2 - PAD)
            box = (x - w / 2, y - h / 2, x + w / 2, y + h / 2)
            gap = 30.0
            ok = True
            for q in placed:
                dx = max(q[0] - box[2], box[0] - q[2], 0); dy = max(q[1] - box[3], box[1] - q[3], 0)
                if dx < PAD and dy < PAD: ok = False; break
                gap = min(gap, math.hypot(dx, dy) if dx and dy else max(dx, dy))
            if not ok: continue
            dc = math.hypot((x - cx) / W, (y - cy) / H)
            score = min(gap, 7) - 22 * dc * (s / smax) ** 2 + rnd.uniform(0, 1.5)
            if score > bscore: best, bscore = (x, y, box), score
        if not best:
            raise SystemExit(f'yer bulunamadı: {t}')
        placed.append(best[2])
        yield cls, s, t, href, best[0], best[1]

def build(lang, seed):
    words = WORDS[lang]
    sizes = asyncio.run(measure(words))
    out = list(place(words, sizes, seed))
    rnd = random.Random(seed + 7)
    html = ''
    # okuma sırası: yukarıdan aşağı, soldan sağa (klavye ve ekran okuyucu için)
    for cls, s, t, href, x, y in sorted(out, key=lambda o: (round(o[5] / 8), o[4])):
        dur = rnd.uniform(6.5, 10.5); dly = -rnd.uniform(0, 8)
        dx = rnd.choice([-1, 1]) * rnd.uniform(.3, .7); dy = rnd.choice([-1, 1]) * rnd.uniform(.4, .8)
        c = ('w ' + cls).strip()
        html += (f'<a class="{c}" href="{href}" style="--x:{x / W * 100:.1f}%;--y:{y / H * 100:.1f}%;--s:{s};'
                 f'--t:{dur:.1f}s;--d:{dly:.1f}s;--dx:{dx:.2f}cqi;--dy:{dy:.2f}cqi">{t}</a>')
    return html

if __name__ == '__main__':
    import sys
    seeds = {'tr': int(sys.argv[1]) if len(sys.argv) > 1 else 3, 'en': int(sys.argv[2]) if len(sys.argv) > 2 else 3}
    for lang, f in (('tr', '/index.html'), ('en', '/en/index.html')):
        s = open(ROOT + f).read()
        h = build(lang, seeds[lang])
        s = re.sub(r'(<div class="cloud" aria-label="[^"]*">).*?(</div>\n)', lambda m: m.group(1) + h + m.group(2), s, count=1, flags=re.S)
        open(ROOT + f, 'w').write(s)
    import os; os.remove(ROOT + '/_m.html')
    print('ok')
