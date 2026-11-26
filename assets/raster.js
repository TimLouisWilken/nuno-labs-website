/* Nuno Labs – Punktraster-Motive für die Unterseiten (R6). Ein festes Raster, die Punktgröße trägt das Bild. */
(function () {
  const SP = 12, ROW = SP * .866, RMAX = 5.6, RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COL = [null, '#141312', '#F26938', '#0097B2', '#F38D03', 'rgba(20,19,18,.3)'];
  const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const de = v => v.toFixed(1).replace('.', ',');
  const MAPS = {}; if (window.NUNO_CLOUDS) for (const k in NUNO_CLOUDS) { const m = NUNO_CLOUDS[k], b = atob(m.d), d = new Float32Array(b.length); for (let i = 0; i < b.length; i++) d[i] = b.charCodeAt(i) / 255; MAPS[k] = { w: m.w, h: m.h, r: m.r, d }; }
  function smp(k, u, v) {
    const m = MAPS[k]; if (!m || u < 0 || u > 1 || v < 0 || v > 1) return 0;
    const fx = u * (m.w - 1), fy = v * (m.h - 1), x0 = fx | 0, y0 = fy | 0, x1 = Math.min(m.w - 1, x0 + 1), y1 = Math.min(m.h - 1, y0 + 1), ax = fx - x0, ay = fy - y0, d = m.d;
    return (d[y0 * m.w + x0] * (1 - ax) + d[y0 * m.w + x1] * ax) * (1 - ay) + (d[y1 * m.w + x0] * (1 - ax) + d[y1 * m.w + x1] * ax) * ay;
  }
  /* eine ziehende Wolke: liefert Dichte an (x,y) */
  const cloud = (k, W, H, t, o) => { const cw = W * o.w, ch = cw * MAPS[k].r, x0 = -cw + (((t * o.v + o.ph) % 1 + 1) % 1) * (W + cw * 1.15), y0 = H * o.y - ch / 2; return (x, y) => smp(k, (x - x0) / cw, (y - y0) / ch); };
  const label = (ctx, s, x, y, c, al) => { ctx.font = '500 11px Inter,sans-serif'; ctx.textAlign = al || 'left'; ctx.fillStyle = c || '#77726a'; ctx.fillText(s, x, y); };

  const MOTIF = {
    /* Wolke zieht vor die Sonne */
    wolke(t, W, H) {
      const s = Math.min(W, H) / 520, S = [W * .66, H * .5], A = cloud('a', W, H, t, { w: .6, v: .05, ph: .18, y: .5 }), B = cloud('b', W, H, t, { w: .32, v: .062, ph: .7, y: .14 });
      const cv = Math.min(1, A(S[0], S[1]) * 1.7);
      return {
        cell(x, y) {
          const dx = x - S[0], dy = y - S[1], q = dx * dx + dy * dy, d = Math.max(A(x, y), B(x, y));
          if (d > .035) return [RMAX * Math.pow(d, .62), q < 7600 * s * s ? 2 : 1];
          if (q < 3200 * s * s) return [0, 0];
          const r = 4.2 * Math.exp(-q / (30000 * s * s)) * (1 - .78 * cv); return r > .75 ? [r, 2] : [.8, 5];
        },
        after(ctx) {
          ctx.globalAlpha = 1 - cv; ctx.fillStyle = COL[2]; ctx.beginPath(); ctx.arc(S[0], S[1], 26 * s, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
          ctx.strokeStyle = COL[2]; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(S[0], S[1], 54 * s, 0, 6.283); ctx.stroke();
          ctx.beginPath(); for (let a = 0; a < 360; a += 15) { const r = a * Math.PI / 180, r0 = 64 * s, r1 = (a % 45 ? 71 : 79) * s; ctx.moveTo(S[0] + r0 * Math.cos(r), S[1] + r0 * Math.sin(r)); ctx.lineTo(S[0] + r1 * Math.cos(r), S[1] + r1 * Math.sin(r)); } ctx.stroke();
          label(ctx, cv > .5 ? 'Sonne verdeckt' : 'Sonne frei', S[0] + 62 * s, S[1] - 50 * s, '#141312');
        }
      };
    },
    /* Modulfeld, über das ein Schatten zieht */
    park(t, W, H) {
      const A = cloud('a', W, H, t, { w: .78, v: .045, ph: .1, y: .5 }), cols = 5, rows = 4, bw = W * .145, bh = H * .135, gx = W * .028, gy = H * .05, x0 = (W - cols * bw - (cols - 1) * gx) / 2, y0 = (H - rows * bh - (rows - 1) * gy) / 2;
      let sum = 0, n = 0;
      return {
        cell(x, y) {
          const sh = Math.min(1, A(x, y) * 1.5), cx = (x - x0) / (bw + gx), cy = (y - y0) / (bh + gy), inx = cx >= 0 && cx < cols && (cx % 1) < bw / (bw + gx), iny = cy >= 0 && cy < rows && (cy % 1) < bh / (bh + gy);
          if (inx && iny) { sum += sh; n++; return [RMAX * (.92 - .62 * sh), 1]; }
          return sh > .18 ? [1.7, 5] : [.8, 5];
        },
        after(ctx) {
          const hx = x0 - 22, hy = y0 + rows * bh + (rows - 1) * gy + 18; ctx.fillStyle = COL[2]; ctx.beginPath(); ctx.arc(hx, hy, 5, 0, 6.283); ctx.fill(); ctx.strokeStyle = COL[2]; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(hx, hy, 11, 0, 6.283); ctx.stroke();
          label(ctx, 'Sensor-Hub', hx + 18, hy + 4, '#141312'); label(ctx, 'Leistung ' + de(38.6 * (1 - .7 * (n ? sum / n : 0))) + ' MW', W - x0 + 22 - 22, hy + 4, '#141312', 'right');
        }
      };
    },
    /* mehrere Parks an einem Netzknoten */
    netz(t, W, H) {
      const A = cloud('a', W, H, t, { w: .62, v: .04, ph: .05, y: .34 }), B = cloud('b', W, H, t, { w: .46, v: .05, ph: .55, y: .74 }), sh = (x, y) => Math.min(1, Math.max(A(x, y), B(x, y)) * 1.5);
      const P = [[.16, .26, 12], [.5, .16, 9], [.84, .3, 14], [.24, .76, 8], [.76, .78, 11]].map(p => [p[0] * W, p[1] * H, p[2]]), R = Math.min(W, H) * .1, hub = [W * .5, H * .5];
      return {
        before(ctx) { ctx.strokeStyle = 'rgba(20,19,18,.28)'; ctx.lineWidth = 1; ctx.beginPath(); P.forEach(p => { ctx.moveTo(p[0], p[1]); ctx.lineTo(hub[0], hub[1]); }); ctx.stroke(); },
        cell(x, y) {
          for (const p of P) { const dx = x - p[0], dy = y - p[1]; if (dx * dx + dy * dy < R * R) return [RMAX * (.9 - .62 * sh(x, y)), 1]; }
          const hx = x - hub[0], hy = y - hub[1]; if (hx * hx + hy * hy < 900) return [0, 0];
          return sh(x, y) > .18 ? [1.7, 5] : [.8, 5];
        },
        after(ctx) {
          ctx.fillStyle = '#f3f0ea'; ctx.beginPath(); ctx.arc(hub[0], hub[1], 22, 0, 6.283); ctx.fill(); ctx.strokeStyle = COL[2]; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(hub[0], hub[1], 14, 0, 6.283); ctx.stroke(); ctx.fillStyle = COL[2]; ctx.beginPath(); ctx.arc(hub[0], hub[1], 5, 0, 6.283); ctx.fill();
          let tot = 0; P.forEach((p, i) => { const v = p[2] * (1 - .7 * sh(p[0], p[1])); tot += v; label(ctx, 'Park ' + 'ABCDE'[i] + ' · ' + de(v) + ' MW', p[0], p[1] + R + 16, '#141312', 'center'); });
          label(ctx, 'Netzknoten · ' + de(tot) + ' MW', hub[0], hub[1] + 38, '#F26938', 'center');
        }
      };
    },
    /* gemeinsamer Netzanschluss: was die Sonne nicht belegt, ist frei für den Speicher */
    speicher(t, W, H) {
      const y0 = H * .2, y1 = H * .84, lev = x => { const u = x / W * 1.5 + t * .045; return .8 * (1 - .66 * Math.pow(Math.max(0, Math.sin(u * 2.3) * Math.sin(u * 5.1 + 1)), 1.4)); };
      return {
        cell(x, y) { if (y < y0 || y > y1) return [.8, 5]; return y > y1 - lev(x) * (y1 - y0) ? [RMAX * .66, 1] : [2.5, 2]; },
        after(ctx) {
          ctx.strokeStyle = '#141312'; ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(0, y0 - 9); ctx.lineTo(W, y0 - 9); ctx.stroke(); ctx.setLineDash([]);
          label(ctx, 'Netzanschluss', 4, y0 - 17, '#141312'); label(ctx, 'frei für den Speicher', W - 4, y0 - 17, '#F26938', 'right'); label(ctx, 'PV-Einspeisung', 4, y1 + 22, '#141312'); label(ctx, 'Zeit →', W - 4, y1 + 22, '#77726a', 'right');
        }
      };
    },
    /* das Logo als Raster */
    logo(t, W, H) {
      const s = Math.min(W, H) * .92 / 100, ox = W / 2 - 50 * s, oy = H / 2 - 50 * s, Cs = [[50, 38, 23, 4, 0], [67, 60, 22, 3, 2], [33, 62, 22, 2, 4]];
      return {
        cell(x, y) {
          let best = 0, col = 0;
          for (const c of Cs) { const r = c[2] * s * (1 + .035 * Math.sin(t * .5 + c[4])), d = ss(1.16, .5, Math.hypot(x - ox - c[0] * s, y - oy - c[1] * s) / r); if (d > best + .02) { best = d; col = c[3]; } }
          return best > .04 ? [RMAX * Math.pow(best, .75), col] : [.8, 5];
        }
      };
    }
  };

  function mount(el) {
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d'), make = MOTIF[el.dataset.raster] || MOTIF.wolke; el.appendChild(cv);
    let W = 0, H = 0, dpr = 1, vis = false, t = +(el.dataset.t || 0) || 40;
    function size() { const r = el.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(2, devicePixelRatio || 1); cv.width = W * dpr; cv.height = H * dpr; }
    function draw() {
      const m = make(t, W, H), buf = [[], [], [], [], [], []];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); m.before && m.before(ctx);
      for (let j = 0, y = ROW / 2; y < H; j++, y = ROW / 2 + j * ROW) for (let x = SP / 2 + (j & 1) * SP / 2; x < W; x += SP) { const c = m.cell(x, y); if (c[1]) buf[c[1]].push(x, y, c[0]); }
      for (let k = 1; k < 6; k++) { const b = buf[k]; if (!b.length) continue; ctx.fillStyle = COL[k]; ctx.beginPath(); for (let i = 0; i < b.length; i += 3) { ctx.moveTo(b[i] + b[i + 2], b[i + 1]); ctx.arc(b[i], b[i + 1], b[i + 2], 0, 6.283); } ctx.fill(); }
      m.after && m.after(ctx);
    }
    size(); draw(); addEventListener('resize', () => { size(); draw(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    if (RM) return;
    new IntersectionObserver(e => vis = e[0].isIntersecting, { rootMargin: '60px' }).observe(el);
    let last = performance.now(); (function loop(now) { if (vis) { t += Math.min(.1, (now - last) / 1000); draw(); } last = now; requestAnimationFrame(loop); })(last);
  }
  document.querySelectorAll('[data-raster]').forEach(mount);
})();
