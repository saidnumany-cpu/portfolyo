// voidbysaid — ısı haritası (heatmap) efekti
// [data-heat] öğelerine uygulanır: içinde SVG varsa yollarını, yoksa kendi metnini maske olarak kullanır
// ve WebGL ile akan termal renklerle çizer. Renk yalnızca şeklin içinde kalır, kontur dışına taşmaz.
// data-heat="1.8" gibi bir sayı kenar (sıcak çizgi) kalınlığını ölçekler.
// WebGL yoksa orijinal öğe görünür; "hareketi azalt" açıksa durağan bir kare çizilir.
(() => {
  const VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const FS = `precision highp float;
varying vec2 uv;uniform sampler2D m;uniform float t;uniform float lt;uniform float as;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
vec3 pal(float x){x=clamp(x,0.,1.);
 vec3 c0=vec3(.05,.02,.16),c1=vec3(.16,.10,.86),c2=vec3(.50,.16,.95),c3=vec3(.93,.24,.62);
 vec3 c4=mix(vec3(1.,.50,.28),vec3(.98,.30,.42),lt),c5=mix(vec3(1.,.86,.66),vec3(1.,.50,.26),lt);
 if(x<.2)return mix(c0,c1,x/.2);if(x<.4)return mix(c1,c2,(x-.2)/.2);
 if(x<.6)return mix(c2,c3,(x-.4)/.2);if(x<.8)return mix(c3,c4,(x-.6)/.2);return mix(c4,c5,(x-.8)/.2);}
vec3 hue(vec3 c,float a){vec3 k=vec3(.57735);float co=cos(a);
 return c*co+cross(k,c)*sin(a)+k*dot(k,c)*(1.-co);}
void main(){
 vec4 s=texture2D(m,uv);float a=s.r;
 vec2 q=vec2(uv.x*as,uv.y);
 float w=fbm(q*1.8+vec2(t*.05,-t*.04));
 // geniş, yavaş akan sıcaklık alanı
 float f=.5+.5*sin((q.x*.9-q.y*.75)*4.3-t*.6+w*3.2);
 f=f*f*(3.-2.*f);
 // kenara yakınlık: iki ölçekte yumuşak geçiş (keskin çizgi yok)
 float e2=smoothstep(0.,1.,clamp((1.-s.g)*1.45,0.,1.));
 float e1=smoothstep(.15,1.,clamp((1.-s.b)*1.9,0.,1.));
 float edge=e2*.7+e1*.3;
 float heat=.2+.46*f+.34*edge*(.55+.45*f)+(w-.5)*.12;
 heat=clamp(heat,0.,1.)+(h(gl_FragCoord.xy)-.5)/200.;
 vec3 col=hue(pal(heat),(sin(t*.17)*.45+(w-.5)*.5)*mix(1.,.4,lt));
 col=clamp(col,0.,1.);
 gl_FragColor=vec4(col*a,a);
}`;

  const PAD = 0.04; // kenarda kırpılmayı önleyen küçük boşluk (kısa kenarın oranı)
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const t0 = performance.now() - 8000;
  const now = () => (window.HEAT_T != null ? window.HEAT_T : (performance.now() - t0) / 1000);

  function box(src, W, H, r) {
    const tmp = new Float32Array(W * H), out = new Float32Array(W * H), d = 2 * r + 1;
    for (let y = 0; y < H; y++) {
      let acc = 0; const o = y * W;
      for (let x = -r; x <= r; x++) acc += src[o + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) {
        tmp[o + x] = acc / d;
        acc += src[o + Math.min(W - 1, x + r + 1)] - src[o + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) {
        out[y * W + x] = acc / d;
        acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
      }
    }
    return out;
  }
  const blur = (a, W, H, r) => box(box(box(a, W, H, r), W, H, r), W, H, r);

  // Şeklin ekrandaki kutusu (dönüşümlerden bağımsız, sarmalayıcıya göre)
  function geom(el, svg) {
    if (svg) {
      const r = svg.getBoundingClientRect(), p = el.getBoundingClientRect();
      return { x: r.left - p.left, y: r.top - p.top, w: r.width, h: r.height };
    }
    return { x: 0, y: 0, w: el.offsetWidth, h: el.offsetHeight };
  }

  function mask(el, svg, g, k, L) {
    const pad = PAD * Math.min(g.w, g.h);
    L = L || 512; const sc = L / Math.max(g.w + 2 * pad, g.h + 2 * pad);
    const W = Math.max(8, Math.round((g.w + 2 * pad) * sc)), H = Math.max(8, Math.round((g.h + 2 * pad) * sc));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    if (svg) {
      const vb = svg.viewBox.baseVal, s = Math.min(g.w / vb.width, g.h / vb.height) * sc;
      x.setTransform(s, 0, 0, s, pad * sc + (g.w * sc - vb.width * s) / 2 - vb.x * s, pad * sc + (g.h * sc - vb.height * s) / 2 - vb.y * s);
      // Bitişik parçaların arasında ince ek izi kalmasın diye her parça ince bir çizgiyle de kapatılır
      x.strokeStyle = '#fff'; x.lineJoin = 'round'; x.lineWidth = 0.6 / s;
      svg.querySelectorAll('path,polygon,rect,circle').forEach(n => {
        const A = k => +n.getAttribute(k) || 0;
        let P;
        if (n.tagName === 'rect') { P = new Path2D(); P.rect(A('x'), A('y'), A('width'), A('height')); }
        else if (n.tagName === 'circle') { P = new Path2D(); P.arc(A('cx'), A('cy'), A('r'), 0, Math.PI * 2); }
        else {
          let d = n.getAttribute('d');
          if (!d) { const p = n.getAttribute('points').trim().split(/[\s,]+/).map(Number); d = 'M' + p.join(' ') + 'Z'; }
          P = new Path2D(d);
        }
        x.fill(P); if (n.tagName !== 'rect' && n.tagName !== 'circle') x.stroke(P);
      });
    } else {
      // Metin: CSS satır kutusundaki taban çizgisini yeniden kur
      const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
      x.setTransform(sc, 0, 0, sc, pad * sc, pad * sc);
      x.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontStretch === '125%' ? 'expanded ' : ''}${fs}px ${cs.fontFamily}`;
      if ('fontStretch' in x) x.fontStretch = { '125%': 'expanded', '112.5%': 'semi-expanded', '87.5%': 'semi-condensed', '75%': 'condensed' }[cs.fontStretch] || 'normal';
      if ('letterSpacing' in x && cs.letterSpacing !== 'normal') x.letterSpacing = cs.letterSpacing;
      const txt = el.textContent, mt = x.measureText(txt);
      const asc = mt.fontBoundingBoxAscent, dsc = mt.fontBoundingBoxDescent;
      const pl = parseFloat(cs.paddingLeft) || 0, pt = parseFloat(cs.paddingTop) || 0;
      const inner = g.h - pt - (parseFloat(cs.paddingBottom) || 0);
      x.textBaseline = 'alphabetic';
      x.fillText(txt, pl, pt + (inner - (asc + dsc)) / 2 + asc);
    }
    const px = x.getImageData(0, 0, W, H).data, a = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) a[i] = px[i * 4 + 3] / 255;
    // Kenar kalınlığı: şeklin kendi kalınlığına göre (ortalama doluluktan kestirim)
    const gb = blur(a, W, H, Math.max(1, Math.round(L * 0.024 * k)));
    const bb = blur(a, W, H, Math.max(1, Math.round(L * 0.010 * k)));
    const rgba = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i++) { rgba[i * 4] = a[i] * 255; rgba[i * 4 + 1] = Math.min(1, gb[i]) * 255; rgba[i * 4 + 2] = Math.min(1, bb[i]) * 255; rgba[i * 4 + 3] = 255; }
    return { rgba, W, H, pad };
  }

  function heat(el) {
    if (el.__heat) return el.__heat;
    const svg = el.querySelector('svg');
    const k = parseFloat(el.dataset.heat) || 1;
    const cv = document.createElement('canvas');
    const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: window.HEAT_T != null });
    if (!gl) return;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.LINEAR));
    [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(p => gl.texParameteri(gl.TEXTURE_2D, p, gl.CLAMP_TO_EDGE));
    const ut = gl.getUniformLocation(pr, 't'), ul = gl.getUniformLocation(pr, 'lt'), ua = gl.getUniformLocation(pr, 'as');

    const tone = () => {
      const c = getComputedStyle(svg || el.parentNode).color.match(/\d+(\.\d+)?/g).map(Number);
      gl.uniform1f(ul, (c[0] * .299 + c[1] * .587 + c[2] * .114) < 128 ? 1 : 0);
    };

    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    Object.assign(cv.style, { position: 'absolute', pointerEvents: 'none' });
    cv.setAttribute('aria-hidden', 'true');
    el.appendChild(cv);

    let lastKey = '', m;
    const place = () => {
      const g = geom(el, svg);
      if (!g.w || !g.h) return;
      // Maske çözünürlüğü ekrandaki piksel boyutuna eşit: küçültürken pikselleşme olmaz
      const d = Math.min(3, devicePixelRatio || 1);
      const L = Math.max(96, Math.min(1024, Math.round(Math.max(g.w, g.h) * 1.1 * d)));
      const key = g.w + 'x' + g.h + '@' + L + (svg ? '' : getComputedStyle(el).font);
      if (key !== lastKey) {
        lastKey = key;
        m = mask(el, svg, g, k, L);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, m.W, m.H, 0, gl.RGBA, gl.UNSIGNED_BYTE, m.rgba);
      }
      const cw = g.w + 2 * m.pad, ch = g.h + 2 * m.pad;
      Object.assign(cv.style, { left: g.x - m.pad + 'px', top: g.y - m.pad + 'px', width: cw + 'px', height: ch + 'px' });
      const s = Math.min(1, 1400 / Math.max(cw * d, ch * d));
      const pw = Math.round(cw * d * s), ph = Math.round(ch * d * s);
      if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
      gl.viewport(0, 0, pw, ph);
      gl.uniform1f(ua, cw / ch);
    };
    place();
    tone();
    if (svg) svg.style.visibility = 'hidden'; else el.style.color = 'transparent';
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { place(); kick(); }, 120); });

    let raf = 0, vis = true;
    const draw = () => {
      gl.uniform1f(ut, now());
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = vis && !still.matches && window.HEAT_T == null ? requestAnimationFrame(draw) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
    new IntersectionObserver(e => { vis = e[0].isIntersecting; if (vis) kick(); }).observe(el);
    still.addEventListener('change', kick);
    new MutationObserver(() => setTimeout(() => { tone(); kick(); }, 320))
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    kick();
    return (el.__heat = { draw, canvas: cv });
  }
  window.voidHeat = heat;

  // Açılış: ana sayfada oturum başına bir kez, logo ısınıp kaybolur
  function intro() {
    const root = document.documentElement;
    if (!root.classList.contains('intro')) return;
    const done = () => { root.classList.remove('intro'); try { sessionStorage.setItem('intro', '1'); } catch (_) {} };
    const src = document.querySelector('.brand svg');
    if (!src) return done();
    const ov = document.createElement('div');
    ov.className = 'intro-ov'; ov.setAttribute('aria-hidden', 'true');
    const lg = document.createElement('div'); lg.className = 'intro-logo';
    lg.appendChild(src.cloneNode(true));
    lg.firstChild.style.visibility = '';
    ov.appendChild(lg);
    document.body.appendChild(ov);
    heat(lg);
    root.classList.add('intro-ready');
    requestAnimationFrame(() => ov.classList.add('go'));
    setTimeout(() => {
      ov.classList.add('out'); done();
      setTimeout(() => ov.remove(), 700);
    }, 1500);
  }

  const run = () => {
    intro();
    document.querySelectorAll('[data-heat]').forEach(el => {
      if (el.querySelector('svg')) heat(el);
      else (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => heat(el));
    });
  };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', run) : run();
})();
