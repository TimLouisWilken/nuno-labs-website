/* Nuno Labs – Röntgen-Objekte: durchleuchtete 3D-Modelle, live auf Canvas gezeichnet (Logofarben, multiplizierend) */
(function () {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const A = [243, 141, 3], O = [242, 105, 56], T = [0, 151, 178], K = [21, 20, 19];
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  function Mesh() {
    const m = {
      q: [], l: [], an: [],
      quad(p, c, o = {}) { m.q.push({ p, c, a: o.a ?? .06, e: o.e ?? .5, hu: o.hu || 0, hv: o.hv || 0, ha: o.ha ?? .22 }); },
      line(p, c, a = .5, w = .7) { m.l.push({ p, c, a, w }); },
      box(x, y, z, w, h, d, c, o) {
        const X = [x - w / 2, x + w / 2], Y = [y - h / 2, y + h / 2], Z = [z - d / 2, z + d / 2], P = (i, j, k) => [X[i], Y[j], Z[k]];
        m.quad([P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)], c, o); m.quad([P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)], c, o);
        m.quad([P(0, 0, 0), P(0, 0, 1), P(0, 1, 1), P(0, 1, 0)], c, o); m.quad([P(1, 0, 0), P(1, 0, 1), P(1, 1, 1), P(1, 1, 0)], c, o);
        m.quad([P(0, 0, 0), P(1, 0, 0), P(1, 0, 1), P(0, 0, 1)], c, o); m.quad([P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)], c, o);
      },
      cyl(x, y0, y1, z, r, c, o = {}, seg = 22) {
        const pt = (a, y) => [x + r * Math.cos(a), y, z + r * Math.sin(a)], r0 = [], r1 = [];
        for (let i = 0; i <= seg; i++) {
          const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832; r0.push(pt(a0, y0)); r1.push(pt(a0, y1));
          if (i < seg) m.quad([pt(a0, y0), pt(a1, y0), pt(a1, y1), pt(a0, y1)], c, { a: o.a ?? .05, e: 0, hv: o.hv || 0, ha: o.ha });
        }
        m.line(r0, c, o.e ?? .55); m.line(r1, c, o.e ?? .55);
        for (let i = 0; i < seg; i += 2) m.line([r0[i], r1[i]], c, .22, .5);
      },
      sphere(x, y, z, r, c, a = .4, half = false, n = 7, k = 14) {
        for (let i = half ? 0 : -n + 1; i < n; i++) { const ph = i / n * 1.5708, rr = r * Math.cos(ph), yy = y + r * Math.sin(ph), ring = []; for (let j = 0; j <= 36; j++) ring.push([x + rr * Math.cos(j / 36 * 6.2832), yy, z + rr * Math.sin(j / 36 * 6.2832)]); m.line(ring, c, a, .6); }
        for (let j = 0; j < k; j++) { const th = j / k * 6.2832, arc = []; for (let i = half ? 0 : -18; i <= 18; i++) { const ph = i / 18 * 1.5708; arc.push([x + r * Math.cos(ph) * Math.cos(th), y + r * Math.sin(ph), z + r * Math.cos(ph) * Math.sin(th)]); } m.line(arc, c, a * .8, .5); }
      },
      mark(p, label, dx, dy) { m.an.push({ p, label, dx, dy }); }
    };
    return m;
  }

  const MODELS = {
    /* Sensor-Hub: Mast, Gehäuse mit Innenleben, Kamera mit Glaskuppel (stilisiert) */
    hub() {
      const m = Mesh();
      m.box(0, -150, 0, 78, 5, 78, A, { hu: 6, hv: 6 });
      m.cyl(0, -148, 96, 0, 5.5, A, { a: .1 }, 14);
      m.box(0, -18, 26, 76, 104, 40, A, { hu: 12, hv: 16, a: .07 });
      m.box(0, -2, 22, 54, 58, 5, T, { hu: 9, hv: 9, a: .12 });
      m.box(0, -52, 26, 56, 22, 26, T, { hu: 8, hv: 4, a: .12 });
      m.cyl(-16, 14, 30, 34, 6, T, { a: .16 }, 12); m.cyl(14, 14, 30, 34, 6, T, { a: .16 }, 12);
      m.line([[0, 30, 26], [0, 96, 4]], T, .6, 1);
      m.box(0, 98, 0, 96, 5, 44, A, { hu: 10, hv: 5 });
      m.cyl(0, 100, 126, 0, 27, A, { a: .08, hv: 5 }, 26);
      m.cyl(0, 104, 122, 0, 15, T, { a: .14 }, 18);
      m.sphere(0, 126, 0, 27, T, .5, true, 7, 16);
      m.sphere(0, 124, 0, 11, O, .55, true, 4, 10);
      m.line([[38, 100, 0], [38, 168, 0]], A, .8, 1.2);
      m.mark([0, 150, 0], 'Fisheye-Kamera', -150, -34); m.mark([38, -18, 46], 'Sensor-Hub', 120, 10);
      return m;
    },
    /* Modultische */
    module() {
      const m = Mesh(), s = Math.sin(.44), c = Math.cos(.44);
      for (const z0 of [-150, 0, 150]) {
        const P = (x, t, off = 0) => [x, t * s - 30 + off, z0 + t * c - 55];
        m.quad([P(-150, 0), P(150, 0), P(150, 124), P(-150, 124)], A, { hu: 6, hv: 2, a: .07, e: .7 });
        m.quad([P(-146, 4, -3), P(146, 4, -3), P(146, 120, -3), P(-146, 120, -3)], T, { hu: 36, hv: 12, a: .1, e: .35, ha: .3 });
        for (const x of [-110, 0, 110]) { m.line([P(x, 18, -3), [x, -84, z0 + 18 * c - 55]], A, .7, 1.1); m.line([P(x, 104, -3), [x, -84, z0 + 104 * c - 55]], A, .7, 1.1); m.line([[x, -84, z0 + 18 * c - 55], P(x, 104, -3)], A, .4, .7); }
        m.line([[-150, -84, z0 - 40], [150, -84, z0 - 40]], A, .35); m.line([[-150, -84, z0 + 40], [150, -84, z0 + 40]], A, .35);
      }
      return m;
    },
    /* Batteriecontainer mit Racks */
    battery() {
      const m = Mesh();
      m.box(0, 0, 0, 330, 120, 116, A, { hu: 22, hv: 9, a: .05, ha: .16 });
      for (let i = 0; i < 7; i++) for (const z of [-30, 30]) { const x = -132 + i * 38; m.box(x, -4, z, 28, 92, 34, T, { hu: 3, hv: 9, a: .09, ha: .3 }); }
      m.box(142, -8, 0, 22, 84, 80, O, { hu: 3, hv: 8, a: .1 });
      m.line([[-165, 64, -30], [150, 64, -30]], T, .6, 1); m.line([[-165, 64, 30], [150, 64, 30]], T, .6, 1);
      m.box(-176, 20, 0, 18, 46, 70, A, { hu: 2, hv: 6 });
      for (const x of [-150, 150]) for (const z of [-50, 50]) m.box(x, -66, z, 16, 12, 16, A, {});
      return m;
    },
    /* Freileitungsmast */
    pylon() {
      const m = Mesh(), lv = [-190, -140, -92, -46, -2, 40, 80, 116, 150], hw = y => 46 - (y + 190) / 340 * 37, cs = (y, i) => { const w = hw(y); return [[-w, y, -w], [w, y, -w], [w, y, w], [-w, y, w]][i]; };
      for (let i = 0; i < 4; i++) m.line(lv.map(y => cs(y, i)), A, .85, 1.2);
      for (let k = 0; k < lv.length; k++) { m.line([0, 1, 2, 3, 0].map(i => cs(lv[k], i)), A, .5); if (k) for (let i = 0; i < 4; i++) { m.line([cs(lv[k - 1], i), cs(lv[k], (i + 1) % 4)], A, .4, .6); m.line([cs(lv[k - 1], (i + 1) % 4), cs(lv[k], i)], A, .4, .6); } }
      for (const [y, w] of [[40, 120], [80, 96], [116, 70]]) {
        for (const z of [-hw(y), hw(y)]) { m.line([[-w, y, 0], [-hw(y), y, z], [hw(y), y, z], [w, y, 0]], A, .75, 1); m.line([[-w, y, 0], [-hw(y), y + 16, z], [hw(y), y + 16, z], [w, y, 0]], A, .4, .6); }
        for (const x of [-w, w]) { m.line([[x, y, 0], [x, y - 18, 0]], O, .9, 1.4); const wire = []; for (let i = -10; i <= 10; i++) wire.push([x, y - 18 - 26 * (1 - (i / 10) ** 2) + 26, i * 21]); m.line(wire.map(p => [p[0], p[1] - 26, p[2]]), T, .7, .9); }
      }
      m.line([[0, 150, 0], [0, 172, 0]], A, .8, 1);
      return m;
    },
    /* Wolke über Modulreihen */
    cloud() {
      const m = Mesh();
      for (const [x, y, z, r] of [[-60, 96, 0, 44], [-8, 112, 8, 56], [52, 98, -4, 46], [96, 84, 6, 30], [-104, 84, 4, 28], [10, 86, 40, 38], [-20, 88, -40, 36]]) m.sphere(x, y, z, r, T, .34, false, 5, 10);
      const s = Math.sin(.4), c = Math.cos(.4);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) { const x0 = -168 + k * 86, z0 = -92 + r * 78, P = (x, t) => [x0 + x, t * s - 118, z0 + t * c]; m.quad([P(0, 0), P(74, 0), P(74, 46), P(0, 46)], A, { hu: 8, hv: 4, a: .09, e: .65, ha: .28 }); m.line([P(12, 40), [x0 + 12, -128, z0 + 40 * c]], A, .5); m.line([P(62, 40), [x0 + 62, -128, z0 + 40 * c]], A, .5); }
      const sh = []; for (let j = 0; j <= 40; j++) sh.push([-10 + 150 * Math.cos(j / 40 * 6.2832), -128, 70 * Math.sin(j / 40 * 6.2832)]); m.line(sh, O, .7, 1);
      for (const x of [-70, 0, 70]) m.line([[x, 50, 0], [x - 4, -124, 0]], O, .22, .6);
      return m;
    }
  };

  function mount(el) {
    const model = (MODELS[el.dataset.xray] || MODELS.hub)(), cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    el.appendChild(cv);
    const G = +el.dataset.gain || 1.5, zoom = +el.dataset.zoom || 1, pitch = +(el.dataset.pitch ?? .3), yaw0 = +(el.dataset.yaw ?? -.5), swing = +(el.dataset.swing ?? .5);
    const labels = model.an.map(a => { const d = document.createElement('span'); d.className = 'xr-l'; d.textContent = a.label; el.appendChild(d); return d; });
    let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    const all = []; model.q.forEach(q => all.push(...q.p)); model.l.forEach(l => all.push(...l.p));
    all.forEach(p => { for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); } });
    const ce = [0, 1, 2].map(i => (lo[i] + hi[i]) / 2), R = Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2;
    let W = 0, H = 0, S = 1, dpr = 1, tgt = 0, cur = 0, cy = 0, sy = 0, yaw = yaw0;
    function size() { const r = el.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; S = Math.min(W, H) * .5 / R * zoom; }
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    function pr(p) {
      const x = p[0] - ce[0], y = p[1] - ce[1], z = p[2] - ce[2], x1 = x * cy - z * sy, z1 = x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, s = 1100 / (1100 + z2) * S;
      return [W / 2 + x1 * s, H / 2 - y1 * s];
    }
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.min(1, a * G)})`, LW = G > 1.6 ? 1.35 : 1.1;
    function draw(t) {
      cur += (tgt - cur) * .06; yaw = yaw0 + (RM ? 0 : swing * Math.sin(t * .00022)) + cur; cy = Math.cos(yaw); sy = Math.sin(yaw);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'multiply'; ctx.lineJoin = 'round';
      for (const q of model.q) {
        const P = q.p.map(pr);
        ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(P[i][0], P[i][1]); ctx.closePath();
        ctx.fillStyle = rgba(q.c, q.a); ctx.fill();
        if (q.e) { ctx.strokeStyle = rgba(q.c, q.e); ctx.lineWidth = .7 * LW; ctx.stroke(); }
        if (q.hu || q.hv) {
          ctx.beginPath();
          for (let i = 1; i < q.hu; i++) { const a = lerp(P[0].concat(0), P[1].concat(0), i / q.hu), b = lerp(P[3].concat(0), P[2].concat(0), i / q.hu); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
          for (let i = 1; i < q.hv; i++) { const a = lerp(P[0].concat(0), P[3].concat(0), i / q.hv), b = lerp(P[1].concat(0), P[2].concat(0), i / q.hv); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
          ctx.strokeStyle = rgba(q.c, q.ha); ctx.lineWidth = .5 * LW; ctx.stroke();
        }
      }
      for (const l of model.l) { ctx.beginPath(); l.p.forEach((p, i) => { const s = pr(p); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); }); ctx.strokeStyle = rgba(l.c, l.a); ctx.lineWidth = l.w * LW; ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
      model.an.forEach((a, i) => {
        const s = pr(a.p), ex = s[0] + a.dx, ey = s[1] + a.dy;
        ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[0] + a.dx * .35, ey); ctx.lineTo(ex, ey); ctx.strokeStyle = 'rgba(21,20,19,.55)'; ctx.lineWidth = .8; ctx.stroke();
        ctx.beginPath(); ctx.arc(s[0], s[1], 2.4, 0, 6.3); ctx.fillStyle = 'rgba(21,20,19,.9)'; ctx.fill();
        labels[i].style.transform = `translate(${a.dx < 0 ? ex - labels[i].offsetWidth - 8 : ex + 8}px,${ey - 9}px)`;
      });
    }
    size(); addEventListener('resize', () => { size(); draw(performance.now()); });
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); tgt = ((e.clientX - r.left) / r.width - .5) * .7; });
    el.addEventListener('pointerleave', () => tgt = 0);
    draw(0);
    if (RM) return;
    let vis = false; new IntersectionObserver(e => vis = e[0].isIntersecting, { rootMargin: '80px' }).observe(el);
    (function loop(t) { if (vis) draw(t); requestAnimationFrame(loop); })(0);
  }
  document.querySelectorAll('[data-xray]').forEach(mount);
})();
