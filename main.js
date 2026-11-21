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
