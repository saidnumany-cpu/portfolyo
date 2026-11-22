// voidbysaid playground — harf fiziği oyuncağı (kütüphanesiz)
(() => {
  const EN = document.documentElement.lang === 'en';
  const T = EN
    ? { eaten: 'swallowed', hint: 'Drag, throw, click empty space.', hintVoid: 'Move around — the void is hungry.', hintZero: 'Zero gravity. Click to push.', tiltOn: 'Tilt: on', tilt: 'Tilt phone' }
    : { eaten: 'yutulan', hint: 'Sürükle, fırlat, boş yere tıkla.', hintVoid: 'Gez — void acıktı.', hintZero: 'Sıfır yerçekimi. Tıkla, it.', tiltOn: 'Eğim: açık', tilt: 'Telefonu eğ' };

  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const rnd = (a, b) => a + Math.random() * (b - a);

  function create(stage, opts = {}) {
    const canvas = stage.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, dpr = 1, scale = 1;
    let bodies = [];
    let mode = opts.mode || 'fall';
    let gx = 0, gy = 1;
    let pointer = { x: 0, y: 0, in: false, vx: 0, vy: 0, t: 0 };
    let drag = null, eaten = 0, holeA = 0, running = true, visible = true;
    const MAX = opts.max || 180;
    let source = opts.text || 'voidbysaid';

    function resize() {
      const r = stage.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      scale = Math.max(.5, Math.min(1, W / 1100));
      bodies.forEach(b => { b.x = Math.min(Math.max(b.R, b.x), W - b.R); b.y = Math.min(Math.max(b.R, b.y), H - b.R); });
    }

    function font(size) { return `600 ${size}px ${css('--disp') || 'system-ui'}`; }

    function make(ch, x, y) {
      const size = Math.round(rnd(54, 120) * scale);
      ctx.font = font(size); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      const m = ctx.measureText(ch);
      const w = m.actualBoundingBoxRight + m.actualBoundingBoxLeft || m.width;
      const asc = m.actualBoundingBoxAscent || size * .7, desc = m.actualBoundingBoxDescent || 0;
      const r = Math.max(size * .2, Math.max(w, asc + desc) * .5);
      return { ch, x, y, vx: rnd(-2, 2), vy: rnd(-1, 2), r, R: Math.hypot(w, asc + desc) * .5, size, oy: (asc - desc) / 2, ox: (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2 || 0, a: rnd(-.4, .4), va: 0, acc: Math.random() < .16, s: 0, dying: 0 };
    }

    function drop(text) {
      const chars = [...text.replace(/\s+/g, '')];
      if (!chars.length) return;
      chars.forEach((ch, i) => {
        const b = make(ch, W * .15 + (i / Math.max(1, chars.length - 1)) * W * .7 + rnd(-10, 10), -60 - i * 14);
        if (mode !== 'fall') { b.y = rnd(60, H - 60); b.x = rnd(60, W - 60); }
        bodies.push(b);
      });
      while (bodies.length > MAX) bodies.shift();
    }

    function respawn(b) {
      const side = Math.floor(Math.random() * 4);
      b.x = side === 0 ? b.r : side === 1 ? W - b.r : rnd(b.r, W - b.r);
      b.y = side === 2 ? b.r : side === 3 ? H - b.r : rnd(b.r, H - b.r);
      const chars = [...source.replace(/\s+/g, '')];
      if (chars.length) b.ch = chars[Math.floor(Math.random() * chars.length)];
      b.vx = rnd(-1, 1); b.vy = rnd(-1, 1); b.s = 0; b.dying = 0;
    }

    function burst(x, y, power = 14) {
      bodies.forEach(b => {
        const dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy) || 1;
        if (d < 320 * scale + 40) { const f = power * (1 - d / (320 * scale + 60)); b.vx += dx / d * f; b.vy += dy / d * f - (mode === 'fall' ? 3 : 0); b.va += rnd(-.2, .2); }
      });
    }

    function shake() { bodies.forEach(b => { b.vx += rnd(-14, 14); b.vy += rnd(-18, 4); b.va += rnd(-.3, .3); }); }

    function step() {
      const grav = mode === 'fall' ? .55 : 0;
      const damp = mode === 'zero' ? .999 : mode === 'void' ? .985 : .995;
      const hx = pointer.in ? pointer.x : W / 2, hy = pointer.in ? pointer.y : H / 2;
      const holeR = 34 * scale + 10;
      for (const b of bodies) {
        if (b.s < 1) b.s = Math.min(1, b.s + .08);
        if (b === drag) continue;
        b.vx += gx * grav; b.vy += gy * grav;
        if (mode === 'void') {
          const dx = hx - b.x, dy = hy - b.y, d = Math.hypot(dx, dy) || 1;
          const f = Math.min(2.2, 900 / (d * d) + 60 / d) * .5;
          b.vx += dx / d * f + (-dy / d) * f * .9;
          b.vy += dy / d * f + (dx / d) * f * .9;
          if (d < holeR + b.r * .3 && !b.dying) { b.dying = 1; eaten++; }
          if (b.dying) { b.s -= .09; b.x += dx * .2; b.y += dy * .2; if (b.s <= .05) respawn(b); }
        }
        b.vx *= damp; b.vy *= damp; b.va *= .97;
        b.x += b.vx; b.y += b.vy; b.a += b.va;
        const e = mode === 'zero' ? .95 : .35;
        if (b.x < b.R) { b.x = b.R; b.vx = Math.abs(b.vx) * e; b.va += b.vy * .004; }
        if (b.x > W - b.R) { b.x = W - b.R; b.vx = -Math.abs(b.vx) * e; b.va -= b.vy * .004; }
        if (b.y < b.R && mode !== 'fall') { b.y = b.R; b.vy = Math.abs(b.vy) * e; }
        if (b.y > H - b.R) { b.y = H - b.R; b.vy = -Math.abs(b.vy) * e; b.vx *= .9; b.va += b.vx * .006; }
      }
      // çarpışmalar
      const n = bodies.length;
      for (let i = 0; i < n; i++) {
        const a = bodies[i]; if (a.dying) continue;
        for (let j = i + 1; j < n; j++) {
          const b = bodies[j]; if (b.dying) continue;
          const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
          if (Math.abs(dx) > rr || Math.abs(dy) > rr) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr || d2 === 0) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = (rr - d) / 2;
          const ma = a === drag ? 0 : 1, mb = b === drag ? 0 : 1, mt = ma + mb || 1;
          a.x -= nx * ov * 2 * ma / mt; a.y -= ny * ov * 2 * ma / mt;
          b.x += nx * ov * 2 * mb / mt; b.y += ny * ov * 2 * mb / mt;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) {
            const j2 = -(1 + (mode === 'zero' ? .9 : .25)) * rv / mt;
            a.vx -= j2 * nx * ma; a.vy -= j2 * ny * ma; b.vx += j2 * nx * mb; b.vy += j2 * ny * mb;
            const tv = (b.vx - a.vx) * -ny + (b.vy - a.vy) * nx;
            a.va += tv * .004 * ma; b.va -= tv * .004 * mb;
          }
        }
      }
      for (const b of bodies) {
        if (b.x < b.R) b.x = b.R; if (b.x > W - b.R) b.x = W - b.R;
        if (b.y > H - b.R) b.y = H - b.R; if (mode !== 'fall' && b.y < b.R) b.y = b.R;
      }
      if (drag) {
        const tx = pointer.x - drag.gx, ty = pointer.y - drag.gy;
        drag.vx = (tx - drag.x) * .5; drag.vy = (ty - drag.y) * .5;
        drag.x += drag.vx; drag.y += drag.vy; drag.va *= .9; drag.a += drag.va;
      }
    }

    function draw() {
      const ink = css('--ink'), acc = css('--acc');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (mode === 'void') {
        const hx = pointer.in ? pointer.x : W / 2, hy = pointer.in ? pointer.y : H / 2, R = 34 * scale + 10;
        holeA += .03;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath(); ctx.strokeStyle = acc; ctx.globalAlpha = .5 - k * .14; ctx.lineWidth = 2;
          ctx.ellipse(hx, hy, R * (1.5 + k * .5), R * (.55 + k * .2), holeA * (k % 2 ? -1 : 1) + k, 0, Math.PI * 1.6);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.fillStyle = '#000'; ctx.arc(hx, hy, R, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = acc; ctx.stroke();
      }
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      for (const b of bodies) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); const s = Math.max(.01, b.s); ctx.scale(s, s);
        ctx.font = font(b.size); ctx.fillStyle = b.acc || b === drag ? acc : ink;
        ctx.fillText(b.ch, b.ox, b.oy);
        ctx.restore();
      }
      if (opts.counter) opts.counter.textContent = mode === 'void' ? `${eaten} ${T.eaten}` : '';
    }

    function loop() {
      if (running && visible) { step(); if (!reduce || drag) step(); draw(); }
      requestAnimationFrame(loop);
    }

    function pos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    canvas.addEventListener('pointerdown', e => {
      const p = pos(e); Object.assign(pointer, p, { in: true });
      if (mode === 'void') return;
      let best = null, bd = 1e9;
      for (const b of bodies) { const d = Math.hypot(b.x - p.x, b.y - p.y); if (d < b.r * 1.15 && d < bd) { bd = d; best = b; } }
      if (best) { drag = best; drag.gx = p.x - best.x; drag.gy = p.y - best.y; canvas.setPointerCapture(e.pointerId); stage.classList.add('grab'); }
      else burst(p.x, p.y, mode === 'zero' ? 10 : 16);
      stage.classList.add('touched');
    });
    canvas.addEventListener('pointermove', e => { const p = pos(e); pointer.x = p.x; pointer.y = p.y; pointer.in = true; if (mode === 'void') stage.classList.add('touched'); });
    const up = () => { if (drag) { drag.vx *= 1.6; drag.vy *= 1.6; drag.va += drag.vx * .01; } drag = null; stage.classList.remove('grab'); };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !drag) pointer.in = false; });

    new ResizeObserver(resize).observe(stage);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(stage);
    document.addEventListener('visibilitychange', () => { running = !document.hidden; });

    resize();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      drop(source);
      if (opts.second) setTimeout(() => drop(opts.second), 700);
      loop();
    });

    return {
      drop: t => { source = t || source; drop(t); },
      shake, reset: () => { bodies = []; eaten = 0; drop(source); },
      setMode: m => {
        mode = m; gx = 0; gy = 1;
        if (m !== 'fall') bodies.forEach(b => { b.vx += rnd(-3, 3); b.vy += rnd(-6, -1); });
        if (opts.hint) opts.hint.textContent = m === 'void' ? T.hintVoid : m === 'zero' ? T.hintZero : T.hint;
      },
      tilt: (x, y) => { gx = x; gy = y; },
      png: () => {
        const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
        const g = c.getContext('2d');
        g.fillStyle = css('--panel'); g.fillRect(0, 0, c.width, c.height);
        g.drawImage(canvas, 0, 0);
        g.font = `500 ${13 * dpr}px ${css('--text')}`; g.fillStyle = css('--mute'); g.textAlign = 'right';
        g.fillText('voidbysaid.studio/playground', c.width - 18 * dpr, c.height - 16 * dpr);
        const a = document.createElement('a'); a.download = 'voidbysaid-playground.png'; a.href = c.toDataURL('image/png'); a.click();
      },
      T
    };
  }

  // Tam sayfa
  const full = document.querySelector('[data-pg="full"]');
  if (full) {
    const hint = document.querySelector('.pg-hint'), counter = document.querySelector('.pg-count');
    const pg = create(full, { text: 'voidbysaid', second: EN ? 'play' : 'oyna', hint, counter });
    const form = document.querySelector('.pg-form'), input = form.querySelector('input');
    form.addEventListener('submit', e => { e.preventDefault(); const v = input.value.trim(); if (v) { pg.drop(v.slice(0, 40)); input.value = ''; } });
    document.querySelectorAll('.pg-mode').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.pg-mode').forEach(x => x.classList.toggle('on', x === b));
      full.dataset.mode = b.dataset.m; pg.setMode(b.dataset.m);
    }));
    document.querySelector('.pg-shake').addEventListener('click', pg.shake);
    document.querySelector('.pg-reset').addEventListener('click', pg.reset);
    document.querySelector('.pg-png').addEventListener('click', pg.png);
    const tiltBtn = document.querySelector('.pg-tilt');
    if (tiltBtn && 'DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches) {
      tiltBtn.hidden = false;
      tiltBtn.addEventListener('click', async () => {
        try { if (typeof DeviceOrientationEvent.requestPermission === 'function' && await DeviceOrientationEvent.requestPermission() !== 'granted') return; } catch (_) { return; }
        window.addEventListener('deviceorientation', e => {
          const x = Math.max(-1, Math.min(1, (e.gamma || 0) / 45)), y = Math.max(-1, Math.min(1, (e.beta || 0) / 45));
          pg.tilt(x, y);
        });
        tiltBtn.classList.add('on'); tiltBtn.textContent = pg.T.tiltOn;
      });
    }
  }
  // Ana sayfa önizlemesi
  const mini = document.querySelector('[data-pg="mini"]');
  if (mini) create(mini, { text: 'playground', max: 60 });
})();
