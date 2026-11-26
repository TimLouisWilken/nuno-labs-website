/* Nuno Labs – Himmel-Simulation: ein Wolkenfeld, drei Ansichten.
   Himmelskamera (Fisheye, WebGL) · Schatten auf der Seite (WebGL) · Solarpark + Leistung (gleiche Daten auf der CPU).
   Alles hängt an einer Uhr und einer Rausch-Textur, darum passt alles physikalisch zusammen. */
(function () {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches, QS = new URLSearchParams(location.search);
  const N = 256, MPP = 2.2, CH = 1200, TS = 6, S1 = 4400, S2 = 2500, W = [9.5, -3.2], LO = .53, HI = .65;   // m/px, Wolkenhöhe m, Zeitraffer, Kachelgrößen m, Wind m/s
  const LMAX = 1.3, SUNR = .42, SD = [.6225, -.7826], SOFF = CH * Math.tan(SUNR * LMAX), SUN = [SD[0] * SOFF, SD[1] * SOFF];
  const PCLEAR = 38.6, KSH = .75, T0 = parseFloat(QS.get('t')) || 760;
  const fr = v => v - Math.floor(v), sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const de = v => v.toFixed(1).replace('.', ','), mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  /* ---- kachelbare Rausch-Textur ---- */
  const F = new Float32Array(N * N), TEX = new Uint8Array(N * N);
  (function () {
    let seed = 11; const r = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    let amp = .5;
    for (const p of [3, 6, 12, 24, 48, 96]) {
      const g = Float32Array.from({ length: p * p }, r);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const fx = x / N * p, fy = y / N * p, ix = Math.floor(fx), iy = Math.floor(fy); let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        const a = g[(iy % p) * p + ix % p], b = g[(iy % p) * p + (ix + 1) % p], c = g[((iy + 1) % p) * p + ix % p], d = g[((iy + 1) % p) * p + (ix + 1) % p];
        F[y * N + x] += amp * ((a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty);
      }
      amp *= .52;
    }
    let lo = 9, hi = -9; for (const v of F) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    for (let i = 0; i < F.length; i++) { TEX[i] = Math.round((F[i] - lo) / (hi - lo) * 255); F[i] = TEX[i] / 255; }
  })();
  function samp(u, v) {
    const x = fr(u) * N - .5, y = fr(v) * N - .5, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, w = i => ((i % N) + N) % N;
    const a = F[w(y0) * N + w(x0)], b = F[w(y0) * N + w(x0 + 1)], c = F[w(y0 + 1) * N + w(x0)], d = F[w(y0 + 1) * N + w(x0 + 1)];
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  }
  const offs = t => [fr(-W[0] * t / S1), fr(-W[1] * t / S1), fr(-1.25 * W[0] * t / S2 + .37), fr(-1.25 * W[1] * t / S2 + .11)];
  const dens = (gx, gy, o) => sm(LO, HI, .62 * samp(gx / S1 + o[0], gy / S1 + o[1]) + .38 * samp(gx / S2 + o[2], gy / S2 + o[3]));

  /* ---- WebGL ---- */
  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const COMMON = `precision highp float;uniform sampler2D uN;uniform vec4 uO;uniform vec2 uRes;
    float D(vec2 g){return smoothstep(${LO.toFixed(3)},${HI.toFixed(3)},.62*texture2D(uN,g/${S1.toFixed(1)}+uO.xy).r+.38*texture2D(uN,g/${S2.toFixed(1)}+uO.zw).r);}
    const vec2 SUN=vec2(${SUN[0].toFixed(2)},${SUN[1].toFixed(2)});const vec2 SD=vec2(${SD[0]},${SD[1]});`;
  const FS_BG = COMMON + `uniform float uS;void main(){vec2 c=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uS;float d=D(c*${MPP.toFixed(1)}+SUN);
    float vy=c.y*uS/uRes.y;float f=smoothstep(0.,.07,vy)*smoothstep(1.,.93,vy);gl_FragColor=vec4(vec3(1.)-d*f*vec3(.115,.11,.095),1.);}`;
  const FS_LENS = COMMON + `uniform vec2 uP;void main(){vec2 uv=gl_FragCoord.xy/uRes*2.-1.;uv.y=-uv.y;float r=length(uv);
    vec2 pos=uP+${CH.toFixed(1)}*tan(min(r,1.)*${LMAX})*uv/max(r,1e-4);float n1=texture2D(uN,pos/550.+uO.xy*8.).r,n2=texture2D(uN,pos/190.+uO.zw*5.).r;
    float v=.62*texture2D(uN,pos/4400.+uO.xy).r+.38*texture2D(uN,pos/2500.+uO.zw).r+.06*(n1-.5)+.025*(n2-.5);
    float d=smoothstep(.53,.65,v),tk=smoothstep(.56,.86,v),dl=D(pos+SD*220.);
    vec3 sky=mix(vec3(.086,.083,.08),vec3(.34,.33,.31),pow(r,2.4));
    vec3 cl=mix(vec3(.42,.41,.395),vec3(1.,.99,.97),clamp(1.-.85*dl,0.,1.));cl*=(.8+.32*n1)*(1.-.3*tk);cl=mix(cl,vec3(.6,.59,.57),pow(r,3.)*.55);
    vec3 col=mix(sky,cl,d*(1.-.2*pow(r,4.)));
    float sd=length(uv-SD*${SUNR}),open=1.-.9*D(uP+SUN);
    col+=vec3(.953,.553,.012)*exp(-sd*sd*26.)*.9*open;col+=vec3(1.,.9,.74)*smoothstep(.042,.024,sd)*open;
    col+=vec3(.953,.553,.012)*d*(1.-d)*exp(-sd*sd*8.)*1.2;
    col=mix(col,vec3(.949,.412,.22),smoothstep(.009,.0,abs(sd-.105))*.95);
    col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)*.035;
    col*=mix(.6,1.,smoothstep(1.,.78,r));float a=smoothstep(1.,.99,r);gl_FragColor=vec4(col*a,a);}`;
  function glInit(cv, fs) {
    const gl = cv.getContext('webgl', { antialias: false, premultipliedAlpha: true }); if (!gl) return null;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(o)); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture()); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, N, N, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, TEX);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const u = {}; for (const n of ['uO', 'uRes', 'uS', 'uP']) u[n] = gl.getUniformLocation(pr, n);
    return { gl, u, cv, draw(o, extra) { gl.viewport(0, 0, cv.width, cv.height); gl.uniform4fv(u.uO, o); gl.uniform2f(u.uRes, cv.width, cv.height); extra && extra(gl, u); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); } };
  }

  /* ---- Elemente ---- */
  const field = document.querySelector('[data-field]'), parkEl = document.querySelector('[data-park]'), stripEl = document.querySelector('[data-strip]');
  const out = k => document.querySelectorAll('[data-o="' + k + '"]'), set = (k, t) => out(k).forEach(e => { if (e.textContent !== t) e.textContent = t; });
  let P = [900, 700], panels = [], SP = [], pv = parseFloat(QS.get('pv')) || 0;

  let bg = null;
  if (field) { const cv = document.createElement('canvas'); cv.className = 'shadows'; field.appendChild(cv); bg = glInit(cv, FS_BG); if (bg) bg.S = .25; }
  const lenses = [...document.querySelectorAll('[data-lens]')].map(el => { const cv = document.createElement('canvas'); el.appendChild(cv); const g = glInit(cv, FS_LENS); if (g) { g.el = el; g.vis = true; new IntersectionObserver(e => g.vis = e[0].isIntersecting, { rootMargin: '100px' }).observe(el); } return g; }).filter(Boolean);

  if (parkEl) {
    const cols = +parkEl.dataset.cols || 18, rows = +parkEl.dataset.rows || 6;
    parkEl.style.setProperty('--cols', cols);
    for (let i = 0; i < cols * rows; i++) { const d = document.createElement('i'); parkEl.appendChild(d); panels.push({ el: d, q: -1 }); }
  }

  let strip = null;
  const SW = 1100, SH = 230, SL = 44, SR = 16, STp = 14, SB = 30, PAST = 300, FUT = 900, NP = 121, YM = 45;
  const sx = tau => SL + (tau + PAST) / (PAST + FUT) * (SW - SL - SR), sy = v => STp + (SH - STp - SB) * (1 - v / YM);
  if (stripEl) {
    let cb = 0; for (let i = 0; i < 3000; i++) cb += sm(LO, HI, .62 * F[(i * 7919) % (N * N)] + .38 * F[(i * 104729 + 31) % (N * N)]); cb /= 3000;
    let g = ''; for (let v = 0; v <= 40; v += 10) g += `<line class="c-grid" x1="${SL}" x2="${SW - SR}" y1="${sy(v)}" y2="${sy(v)}"/><text class="c-lab" x="${SL - 8}" y="${sy(v) + 4}" text-anchor="end">${v}</text>`;
    for (const [tau, l] of [[-300, '−5 min'], [300, '+5 min'], [600, '+10 min'], [900, '+15 min']]) g += `<text class="c-lab" x="${sx(tau)}" y="${SH - 8}" text-anchor="${tau < 0 ? 'start' : tau > 800 ? 'end' : 'middle'}">${l}</text>`;
    stripEl.innerHTML = `<svg viewBox="0 0 ${SW} ${SH}" role="img" aria-label="Leistung: gemessen bis jetzt, Prognose für die nächsten 15 Minuten">${g}
      <line class="c-nwp" x1="${SL}" x2="${SW - SR}" y1="${sy(PCLEAR * (1 - KSH * cb))}" y2="${sy(PCLEAR * (1 - KSH * cb))}"/>
      <path class="c-band"/><path class="c-fc"/><path class="c-actual"/>
      <line class="c-pv" y1="${STp}" y2="${SH - SB}" style="display:none"/><circle class="c-pvdot" r="5" style="display:none"/><line class="c-now" x1="${sx(0)}" x2="${sx(0)}" y1="${STp}" y2="${SH - SB}"/><circle class="c-dot" r="4.5" cx="${sx(0)}"/><text class="c-lab" x="${sx(0)}" y="${SH - 8}" text-anchor="middle" style="font-weight:600;fill:var(--ink)">Jetzt</text></svg>`;
    const q = s => stripEl.querySelector(s); strip = { a: q('.c-actual'), f: q('.c-fc'), b: q('.c-band'), d: q('.c-dot'), pv: q('.c-pv'), pd: q('.c-pvdot') };
  }

  function layout() {
    if (field) {
      const fr_ = field.getBoundingClientRect();
      if (bg) { bg.cv.width = Math.max(2, Math.round(fr_.width * bg.S)); bg.cv.height = Math.max(2, Math.round(fr_.height * bg.S)); }
      if (parkEl) {
        const pr_ = parkEl.getBoundingClientRect(); P = [(pr_.left - fr_.left + pr_.width / 2) * MPP, (pr_.top - fr_.top + pr_.height / 2) * MPP];
        panels.forEach(p => { const r = p.el.getBoundingClientRect(); p.g = [(r.left - fr_.left + r.width / 2) * MPP + SUN[0], (r.top - fr_.top + r.height / 2) * MPP + SUN[1]]; });
        SP = panels.filter((_, i) => i % 2 === 0).map(p => p.g);
      }
    }
    const dpr = Math.min(2, devicePixelRatio || 1);
    lenses.forEach(l => { const w = Math.round(l.el.clientWidth * dpr); l.cv.width = l.cv.height = Math.max(2, w); });
  }
  const pw = o => { if (!SP.length) return PCLEAR; let s = 0; for (const g of SP) s += dens(g[0], g[1], o); return PCLEAR * (1 - KSH * s / SP.length); };

  let fvis = true, n = 0;
  if (field) new IntersectionObserver(e => fvis = e[0].isIntersecting, { rootMargin: '100px' }).observe(field);
  function frame(t) {
    const o = offs(t), ov = pv ? offs(t + pv) : o;
    if (bg && fvis) bg.draw(ov, (gl, u) => gl.uniform1f(u.uS, bg.S));
    lenses.forEach(l => l.vis && l.draw(ov, (gl, u) => gl.uniform2f(u.uP, P[0], P[1])));
    if (!fvis) return;
    if (panels.length && panels[0].g) panels.forEach(p => { const q = Math.round(dens(p.g[0], p.g[1], ov) * 16); if (q !== p.q) { p.q = q; p.el.style.setProperty('--s', (q / 16).toFixed(3)); } });
    if (n++ % 2 && !RM && !pv) return;
    const now = pw(o); set('now', de(now));
    if (!strip && !out('next').length) return;
    let a = '', f = '', up = '', lo = [], next = -1; const vals = [];
    for (let i = 0; i < NP; i++) { const tau = -PAST + i * (PAST + FUT) / (NP - 1), v = Math.abs(tau) < 1 ? now : pw(offs(t + tau)), X = sx(tau).toFixed(1); vals.push([tau, v]);
      if (tau <= 0) a += (a ? 'L' : 'M') + X + ' ' + sy(v).toFixed(1);
      if (tau >= 0) { const bw = .4 + 4.2 * tau / FUT; f += (f ? 'L' : 'M') + X + ' ' + sy(v).toFixed(1); up += (up ? 'L' : 'M') + X + ' ' + sy(Math.min(YM, v + bw)).toFixed(1); lo.push('L' + X + ' ' + sy(Math.max(0, v - bw)).toFixed(1)); if (next < 0 && v < PCLEAR * .82) next = tau; } }
    if (strip) { strip.a.setAttribute('d', a); strip.f.setAttribute('d', f); strip.b.setAttribute('d', up + lo.reverse().join('') + 'Z'); strip.d.setAttribute('cy', sy(now)); }
    const at = tau => de(vals.reduce((b, c) => Math.abs(c[0] - tau) < Math.abs(b[0] - tau) ? c : b)[1]);
    set('p5', at(300)); set('p10', at(600)); set('p15', at(900));
    set('next', next === 0 ? 'Schatten über dem Park' : next > 0 ? 'Nächster Schatten in ' + mmss(next) : 'Freie Sicht für 15 Minuten');
    out('next').forEach(e => e.classList.toggle('hot', next >= 0));
    set('cd', next < 0 ? '15:00+' : mmss(next));
    set('state', next < 0 || next > 360 ? 'Freier Himmel. Der Park liefert, was die Sonne hergibt.' : next > 150 ? 'Eine Wolke zieht auf die Sonne zu. Die Kamera sieht sie schon.' : next > 0 ? 'Der Einbruch steht in der Prognose. Der Park liefert noch voll.' : 'Der Schatten liegt auf dem Park. Die Prognose kannte ihn schon.');
    set('pv', pv ? 'Prognose +' + mmss(pv) : 'Live'); set('pvmw', pv ? at(pv) : de(now));
    document.documentElement.classList.toggle('previewing', pv > 0);
    if (strip) { const on = pv > 0 ? '' : 'none', X = sx(pv); strip.pv.style.display = strip.pd.style.display = on; if (pv) { strip.pv.setAttribute('x1', X); strip.pv.setAttribute('x2', X); strip.pd.setAttribute('cx', X); strip.pd.setAttribute('cy', sy(parseFloat(at(pv).replace(',', '.')))); } }
  }

  layout(); let t = T0, last = performance.now();
  if (stripEl) {
    const mv = e => { const r = stripEl.getBoundingClientRect(), xv = (e.clientX - r.left) / r.width * SW, tau = (xv - SL) / (SW - SL - SR) * (PAST + FUT) - PAST; pv = tau > 8 ? Math.min(FUT, tau) : 0; frame(t); };
    stripEl.addEventListener('pointermove', mv); stripEl.addEventListener('pointerdown', mv);
    stripEl.addEventListener('pointerleave', () => { pv = 0; frame(t); });
  }
  frame(t);
  addEventListener('resize', () => { layout(); frame(t); }); addEventListener('load', () => { layout(); frame(t); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); frame(t); });
  if (RM || QS.get('t')) return;
  (function loop(now) { t += Math.min(.1, (now - last) / 1000) * TS; last = now; if (!document.hidden) frame(t); requestAnimationFrame(loop); })(last);
})();
