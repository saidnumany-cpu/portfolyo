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
const links = [...document.querySelectorAll('.nav nav a')];
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
  document.querySelectorAll('.project').forEach(p => {
    const show = f === 'all' || p.dataset.cat === f;
    p.classList.toggle('hide', !show);
    if (show) p.classList.add('in');
  });
  document.querySelectorAll('.index li').forEach(li => li.classList.toggle('hide', f !== 'all' && li.dataset.cat !== f));
}));

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
