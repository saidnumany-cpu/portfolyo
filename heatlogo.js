// voidbysaid — ısı haritası (heatmap) logo efekti
// Sayfadaki logo SVG'sinin yollarını okur, WebGL ile akan termal renklerle çizer.
// Renk yalnızca harflerin içinde kalır, kontur dışına taşmaz.
// WebGL yoksa veya "hareketi azalt" açıksa orijinal SVG / durağan kare kalır.
(() => {
  const VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const FS = `precision highp float;
varying vec2 uv;uniform sampler2D m;uniform float t;uniform float lt;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
vec3 pal(float x){x=clamp(x,0.,1.);
 vec3 c0=vec3(.05,.02,.16),c1=vec3(.16,.10,.86),c2=vec3(.50,.16,.95),c3=vec3(.93,.24,.62);
 vec3 c4=mix(vec3(1.,.50,.28),vec3(.98,.30,.42),lt),c5=mix(vec3(1.,.94,.74),vec3(1.,.47,.22),lt);
 if(x<.2)return mix(c0,c1,x/.2);if(x<.4)return mix(c1,c2,(x-.2)/.2);
 if(x<.6)return mix(c2,c3,(x-.4)/.2);if(x<.8)return mix(c3,c4,(x-.6)/.2);return mix(c4,c5,(x-.8)/.2);}
vec3 hue(vec3 c,float a){vec3 k=vec3(.57735);float co=cos(a);
 return c*co+cross(k,c)*sin(a)+k*dot(k,c)*(1.-co);}
void main(){
 vec4 s=texture2D(m,uv);float a=s.r,g=s.g,b=s.b;
 float w=fbm(uv*2.4+vec2(t*.07,-t*.05));
 float sweep=.5+.5*sin((uv.x*1.2-uv.y)*4.6-t*1.05+w*4.);
 float rim=clamp((1.-g)*2.3,0.,1.);
 float heat=.36+rim*mix(.78,.68,lt);
 heat*=.5+.7*sweep;
 heat+=(w-.5)*.14;
 vec3 col=hue(pal(heat),(sin(t*.21)*.6+(w-.5)*.7)*mix(1.,.4,lt));
 col=clamp(col,0.,1.);
 float al=a;
 gl_FragColor=vec4(col*al,al);
}`;

  const PAD = 0.02; // kenarda kırpılmayı önleyen küçük boşluk

  function box(src, N, r) {
    const tmp = new Float32Array(N * N), out = new Float32Array(N * N), d = 2 * r + 1;
    for (let y = 0; y < N; y++) {
      let acc = 0; const o = y * N;
      for (let x = -r; x <= r; x++) acc += src[o + Math.min(N - 1, Math.max(0, x))];
      for (let x = 0; x < N; x++) {
        tmp[o + x] = acc / d;
        acc += src[o + Math.min(N - 1, x + r + 1)] - src[o + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < N; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(N - 1, Math.max(0, y)) * N + x];
      for (let y = 0; y < N; y++) {
        out[y * N + x] = acc / d;
        acc += tmp[Math.min(N - 1, y + r + 1) * N + x] - tmp[Math.max(0, y - r) * N + x];
      }
    }
    return out;
  }
  const blur = (a, N, r) => box(box(box(a, N, r), N, r), N, r);

  function mask(svg, N) {
    const vb = svg.viewBox.baseVal;
    const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d');
    const inner = N / (1 + 2 * PAD), s = inner / Math.max(vb.width, vb.height);
    x.setTransform(s, 0, 0, s, inner * PAD - vb.x * s, inner * PAD - vb.y * s);
    x.fillStyle = '#fff';
    svg.querySelectorAll('path,polygon').forEach(el => {
      let d = el.getAttribute('d');
      if (!d) { const p = el.getAttribute('points').trim().split(/[\s,]+/).map(Number); d = 'M' + p.join(' ') + 'Z'; }
      x.fill(new Path2D(d));
    });
    const px = x.getImageData(0, 0, N, N).data, a = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) a[i] = px[i * 4 + 3] / 255;
    const g = blur(a, N, Math.round(N * 0.011)), b = blur(a, N, Math.round(N * 0.028));
    const rgba = new Uint8Array(N * N * 4);
    for (let i = 0; i < N * N; i++) {
      rgba[i * 4] = a[i] * 255; rgba[i * 4 + 1] = Math.min(1, g[i]) * 255;
      rgba[i * 4 + 2] = Math.min(1, b[i] * 1.6) * 255; rgba[i * 4 + 3] = 255;
    }
    return rgba;
  }

  function heat(svg) {
    const cv = document.createElement('canvas');
    const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
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

    const N = 512;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, mask(svg, N));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const ut = gl.getUniformLocation(pr, 't'), ul = gl.getUniformLocation(pr, 'lt');
    // Açık zemin mi? Logonun yazı rengi koyuysa zemin açıktır.
    const tone = () => {
      const c = getComputedStyle(svg).color.match(/\d+(\.\d+)?/g).map(Number);
      gl.uniform1f(ul, (c[0] * .299 + c[1] * .587 + c[2] * .114) < 128 ? 1 : 0);
    };
    tone();

    // Yerleşim: SVG yerinde kalır (gizlenir), tuval çevresine taşacak şekilde üstüne biner
    const wrap = svg.parentNode;
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    const inset = -PAD * 100 + '%';
    Object.assign(cv.style, { position: 'absolute', pointerEvents: 'none' });
    cv.setAttribute('aria-hidden', 'true');
    wrap.appendChild(cv);
    const place = () => {
      const r = svg.getBoundingClientRect(), pr2 = wrap.getBoundingClientRect();
      const w = r.width * (1 + 2 * PAD);
      Object.assign(cv.style, { left: r.left - pr2.left - r.width * PAD + 'px', top: r.top - pr2.top - r.height * PAD + 'px', width: w + 'px', height: w + 'px' });
      const px = Math.min(1024, Math.round(w * Math.min(2, devicePixelRatio || 1)));
      if (cv.width !== px) { cv.width = cv.height = px; gl.viewport(0, 0, px, px); }
    };
    place();
    svg.style.visibility = 'hidden';
    addEventListener('resize', place);

    const still = matchMedia('(prefers-reduced-motion: reduce)');
    const t0 = performance.now() - 8000;
    let raf = 0, vis = true;
    const draw = now => {
      gl.uniform1f(ut, (now - t0) / 1000);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = vis && !still.matches ? requestAnimationFrame(draw) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(draw); };
    new IntersectionObserver(e => { vis = e[0].isIntersecting; if (vis) kick(); }).observe(wrap);
    still.addEventListener('change', kick);
    new MutationObserver(() => setTimeout(() => { tone(); kick(); }, 320))
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    kick();
  }

  const run = () => document.querySelectorAll('[data-heat] svg').forEach(heat);
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', run) : run();
})();
