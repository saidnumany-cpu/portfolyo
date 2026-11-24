// Tema
const root = document.documentElement;
document.querySelector('.theme').addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  let saved = null; try { saved = localStorage.getItem('theme'); } catch (_) {}
  if (!saved) root.dataset.theme = e.matches ? 'dark' : 'light';
});

// Dil: bulunulan bölümü koruyarak geçiş
const lang = document.querySelector('.lang');
lang.addEventListener('click', e => {
  e.preventDefault();
  try { localStorage.setItem('lang', lang.dataset.lang); } catch (_) {}
  location.href = lang.getAttribute('href') + (location.hash || '');
});

// Mobil menü
const nav = document.querySelector('.nav');
const menuBtn = document.querySelector('.menu');
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});
nav.querySelectorAll('nav a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  menuBtn.setAttribute('aria-expanded', 'false');
}));

// Kaydırınca beliren öğeler
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Aktif menü bağlantısı
const links = [...document.querySelectorAll('.nav nav a')].filter(a => a.getAttribute('href').startsWith('#'));
const secs = links.map(a => document.querySelector(a.getAttribute('href')));
const spy = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
secs.forEach(s => s && spy.observe(s));

// Kategori filtresi
const chips = document.querySelectorAll('.chip');
chips.forEach(c => c.addEventListener('click', () => {
  chips.forEach(x => x.classList.toggle('on', x === c));
  const f = c.dataset.f;
  document.querySelectorAll('.project, .pcard').forEach(p => {
    const show = f === 'all' || p.dataset.cat === f;
    p.classList.toggle('hide', !show);
    if (show) p.classList.add('in');
  });
  const more = document.querySelector('.more');
  if (more) more.hidden = ![...more.querySelectorAll('.pcard')].some(c => !c.classList.contains('hide'));
}));

// Yıl ve sınıf kendiliğinden güncellensin (Eylül 2024 girişli, 4 yıllık)
(() => {
  const d = new Date(), y = d.getFullYear();
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = y; });
  const g = Math.min(4, Math.max(1, y - 2024 + (d.getMonth() >= 8 ? 1 : 0)));
  const ord = ['first', 'second', 'third', 'fourth'][g - 1];
  const suf = ['st', 'nd', 'rd', 'th'][g - 1];
  document.querySelectorAll('[data-grade]').forEach(el => {
    el.textContent = el.dataset.grade === 'word' ? ord + '-year' : document.documentElement.lang === 'en' ? g + suf + ' year' : g + '. sınıf';
  });
})();

// Görsel büyütme
const lb = document.querySelector('.lightbox');
const lbImg = lb.querySelector('img');
const lbCap = lb.querySelector('.lb-cap');
let lastFocus = null;
document.querySelectorAll('.zoom').forEach(b => b.addEventListener('click', () => {
  const img = b.querySelector('img');
  lbImg.src = img.src;
  lbImg.alt = img.alt;
  lbCap.textContent = b.parentElement.querySelector('figcaption')?.textContent || '';
  lastFocus = b;
  lb.hidden = false;
  document.body.style.overflow = 'hidden';
  lb.querySelector('.lb-close').focus();
}));
const closeLb = () => { lb.hidden = true; document.body.style.overflow = ''; lastFocus && lastFocus.focus(); };
lb.addEventListener('click', e => { if (e.target !== lbImg) closeLb(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeLb(); });

// Başa dön: #top yapışkan başlıkta olduğu için tarayıcı kaydırmıyor; elle en başa kaydır
document.querySelectorAll('a[href="#top"]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  history.replaceState(null, '', location.pathname + location.search);
}));

// Çalışmalar: aşağı değil yana kayan şeritler
(() => {
  const en = document.documentElement.lang === 'en';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.projects, .pgrid').forEach(track => {
    track.classList.add('track');
    const ctl = document.createElement('div');
    ctl.className = 'tctl';
    ctl.innerHTML = `<div class="tbar" aria-hidden="true"><span></span></div><button class="tbtn" type="button" aria-label="${en ? 'Previous' : 'Önceki'}">←</button><button class="tbtn" type="button" aria-label="${en ? 'Next' : 'Sonraki'}">→</button>`;
    track.after(ctl);
    const [prev, next] = ctl.querySelectorAll('button');
    const bar = ctl.querySelector('.tbar span');
    const step = dir => {
      const items = [...track.children].filter(c => c.getClientRects().length);
      const w = items[1] ? items[1].offsetLeft - items[0].offsetLeft : track.clientWidth;
      const n = Math.max(1, Math.floor((track.clientWidth - parseFloat(getComputedStyle(track).paddingLeft)) / w));
      track.scrollBy({ left: dir * w * n, behavior: reduce ? 'auto' : 'smooth' });
    };
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      ctl.hidden = max <= 2;
      if (max <= 2) return;
      const vis = track.clientWidth / track.scrollWidth;
      bar.style.width = vis * 100 + '%';
      bar.style.transform = `translateX(${(track.scrollLeft / max) * (1 / vis - 1) * 100}%)`;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max - 2;
    };
    track._update = update;
    track.addEventListener('scroll', update, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    addEventListener('resize', update);
    update();
  });
  // filtre değişince şeritleri başa sar
  document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.track').forEach(t => { t.scrollLeft = 0; t._update && t._update(); });
  }));
})();

// Alttaki yüzen sosyal bar
(() => {
  const en = document.documentElement.lang === 'en';
  const bar = document.createElement('nav');
  bar.className = 'sbar';
  bar.setAttribute('aria-label', en ? 'Social accounts' : 'Sosyal hesaplar');
  bar.innerHTML = `
    <a href="https://instagram.com/saidnumany" target="_blank" rel="noopener" aria-label="Instagram @saidnumany" title="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle class="fill" cx="17.4" cy="6.6" r="1.25"/></svg></a>
    <a href="https://www.linkedin.com/in/saidnumany/" target="_blank" rel="noopener" aria-label="LinkedIn" title="LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 10.5V16.5M12 16.5V10.5M12 13.2c0-1.6 1-2.7 2.4-2.7S16.5 11.6 16.5 13v3.5"/><circle class="fill" cx="8" cy="7.6" r="1.2"/></svg></a>
    <a href="mailto:saidnumany@gmail.com" aria-label="${en ? 'Email' : 'E-posta'}: saidnumany@gmail.com" title="${en ? 'Email' : 'E-posta'}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.8" y="5" width="18.4" height="14" rx="3.5"/><path d="M3.5 7.5l7.4 5.4a1.9 1.9 0 0 0 2.2 0l7.4-5.4"/></svg></a>`;
  document.body.appendChild(bar);
  document.body.classList.add('has-sbar');
})();

// Kaydırırken sosyal bar küçülsün, durunca eski hâline dönsün
(() => {
  const bar = document.querySelector('.sbar');
  if (!bar) return;
  let t;
  addEventListener('scroll', () => {
    bar.classList.add('mini');
    clearTimeout(t);
    t = setTimeout(() => bar.classList.remove('mini'), 450);
  }, { passive: true });
})();
