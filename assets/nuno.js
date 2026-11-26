/* Nuno Labs – gemeinsame Bausteine der Entwürfe: Reveal, Wort-Scroll, Prognose-Chart, Sky-Imager */
(function () {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll('[data-reveal]').forEach(e => io.observe(e));

  /* ---------- Wörter leuchten beim Scrollen auf ---------- */
  const wordEls = [...document.querySelectorAll('[data-words]')];
  wordEls.forEach(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(w => '<span class="w">' + w + '</span>').join(' ');
  });
  function words() {
    wordEls.forEach(el => {
      const r = el.getBoundingClientRect(), vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.3)));
      const k = Math.round(p * el.children.length);
      for (let i = 0; i < el.children.length; i++) el.children[i].classList.toggle('on', i < k || RM);
    });
  }
  if (wordEls.length) { addEventListener('scroll', words, { passive: true }); addEventListener('resize', words); words(); }

  /* ---------- Prognose-Chart (Beispieldaten) ---------- */
  const N = 240, W = 760, H = 340, L = 40, R = 14, T = 16, B = 30, YM = 50;
  const X = i => L + (W - L - R) * i / N, Y = v => T + (H - T - B) * (1 - v / YM);
  const clear = i => 30 + 14 * Math.sin(Math.PI * (0.18 + 0.64 * i / N));
  const dips = [[62, .5, 8], [118, .3, 5], [150, .62, 11], [204, .28, 6]];
  const kidx = i => { let v = 1; for (const [d, a, w] of dips) v -= a * Math.exp(-((i - d) ** 2) / (2 * w * w)); return v + .012 * Math.sin(i * 1.7) + .01 * Math.sin(i * .63); };
  const act = i => clear(i) * kidx(i);
  const nwp = i => clear(i) * .8 + 1.2 * Math.sin(i / 38);
  const fc = (n, j) => {
    const h = Math.min(1, (j - n) / 120), win = Math.round(1 + 6 * h);
    let s = 0, c = 0; for (let q = j - win; q <= j + win; q++) { s += act(Math.max(0, Math.min(N, q))); c++; }
    const w = .55 * h * h; return (s / c) * (1 - w) + nwp(j) * w;
  };
  const path = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  const de = v => v.toFixed(1).replace('.', ',');

  function chart(el) {
    let g = '';
    for (let v = 0; v <= YM; v += 10) g += `<line class="c-grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="c-lab" x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
    for (let i = 0; i <= N; i += 30) { const m = 600 + i; g += `<text class="c-lab" x="${X(i)}" y="${H - 8}" text-anchor="middle">${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}</text>`; }
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Beispiel: gemessene Leistung, Standardprognose und Nuno-Kurzfristprognose">${g}
      <path class="c-nwp" d="${path(Array.from({ length: N + 1 }, (_, i) => [X(i), Y(nwp(i))]))}"/>
      <path class="c-band"/><path class="c-actual"/><path class="c-fc"/>
      <line class="c-now" y1="${T}" y2="${H - B}"/><circle class="c-dot" r="4.5"/><text class="c-nowlab" y="${T + 10}">Jetzt</text></svg>`;
    const q = s => el.querySelector(s), wrap = el.closest('[data-chart-wrap]') || el;
    const out = k => wrap.querySelector('[data-out="' + k + '"]');
    function frame(n) {
      const a = [], f = [], up = [], lo = [];
      for (let i = 0; i <= n; i++) a.push([X(i), Y(act(i))]);
      const end = Math.min(N, n + 120);
      for (let j = Math.floor(n); j <= end; j++) {
        const v = fc(n, j), bw = .6 + 5.5 * Math.min(1, (j - n) / 120);
        f.push([X(j), Y(v)]); up.push([X(j), Y(v + bw)]); lo.push([X(j), Y(Math.max(0, v - bw))]);
      }
      q('.c-actual').setAttribute('d', path(a));
      q('.c-fc').setAttribute('d', path(f));
      q('.c-band').setAttribute('d', path(up) + path(lo.reverse()).replace('M', 'L') + 'Z');
      const nx = X(n), now = act(n);
      q('.c-now').setAttribute('x1', nx); q('.c-now').setAttribute('x2', nx);
      q('.c-dot').setAttribute('cx', nx); q('.c-dot').setAttribute('cy', Y(now));
      q('.c-nowlab').setAttribute('x', nx + 8);
      const p15 = fc(n, Math.min(N, n + 15)), p30 = fc(n, Math.min(N, n + 30)), ramp = (p15 - now) / now * 100, m = 600 + Math.floor(n);
      const set = (k, t) => { const o = out(k); if (o && o.textContent !== t) o.textContent = t; };
      set('now', de(now)); set('p15', de(p15)); set('p30', de(p30));
      set('ramp', (ramp > 0 ? '+' : '−') + Math.abs(ramp).toFixed(0) + ' %');
      set('time', String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
    }
    let n = 44; frame(RM ? 138 : n);
    if (RM) return;
    let vis = false; new IntersectionObserver(e => vis = e[0].isIntersecting).observe(el);
    (function loop() { if (vis) { n += .13; if (n > 214) n = 24; frame(n); } requestAnimationFrame(loop); })();
  }
  document.querySelectorAll('[data-chart]').forEach(chart);

  /* ---------- Wolken-Szene: Himmelskamera · Solarpark · Leistung, eine gemeinsame Zeitachse ---------- */
  const FP = parseFloat(new URLSearchParams(location.search).get('p'));           // ?p=0.5 friert einen Zeitpunkt ein
  const ss = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const LOOP_MIN = 20, ARRIVE = .45, PEAK = .62, CLEAR = .79;                       // Schleife = 20 Minuten Echtzeit
  const SUN = [255, 135], mc = p => [40 + 347 * p, 290 - 250 * p];                 // Wolke zieht von SW über die Sonne
  const cov = p => ss(ARRIVE, .58, p) * (1 - ss(.66, CLEAR, p));
  const power = p => 40 * (1 - .62 * cov(p)) + .35 * Math.sin(p * 90) + .25 * Math.sin(p * 211);
  const fcast = q => 40 * (1 - .6 * cov(q + .006));
  const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const eta = p => Math.max(0, ARRIVE - p) * LOOP_MIN * 60;
  const fade = p => Math.min(1, p / .03, (1 - p) / .04);

  function run(el, frame, dur) {
    if (!isNaN(FP)) return frame(FP);
    if (RM) return frame(.36);
    let vis = false, acc = .02 * dur, last = performance.now();
    new IntersectionObserver(e => vis = e[0].isIntersecting).observe(el);
    (function loop(now) { if (vis) { acc += Math.min(80, now - last); frame((acc % dur) / dur); } last = now; requestAnimationFrame(loop); })(last);
  }

  let sid = 0;
  function skyBuild(el) {
    const id = 'sky' + (++sid);
    const blob = `<ellipse rx="62" ry="36"/><ellipse cx="-44" cy="10" rx="44" ry="26"/><ellipse cx="40" cy="12" rx="46" ry="26"/><ellipse cx="-8" cy="-22" rx="40" ry="24"/><ellipse cx="20" cy="-14" rx="34" ry="22"/>`;
    let dots = ''; for (let q = .2; q < .6; q += .05) { const [x, y] = mc(q); dots += `<circle class="s-tick" data-q="${q}" cx="${x}" cy="${y}" r="2.2"/>`; }
    el.innerHTML = `<svg viewBox="-20 -20 440 440" role="img" aria-label="Himmelskamera: eine Wolke zieht auf die Sonne zu, ihre Zugbahn wird berechnet">
      <defs><clipPath id="${id}c"><circle cx="200" cy="200" r="180"/></clipPath>
      <filter id="${id}b" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
      <filter id="${id}s" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="14"/></filter></defs>
      <circle class="s-disc" cx="200" cy="200" r="180"/>
      <g clip-path="url(#${id}c)">
        <circle class="s-ring" cx="200" cy="200" r="60"/><circle class="s-ring" cx="200" cy="200" r="120"/>
        <line class="s-ring" x1="20" x2="380" y1="200" y2="200"/><line class="s-ring" x1="200" x2="200" y1="20" y2="380"/>
        <circle class="s-glow" cx="${SUN[0]}" cy="${SUN[1]}" r="46" filter="url(#${id}s)"/>
        <g class="s-dyn">
          <g class="s-cloud" filter="url(#${id}b)"><g class="cB">${blob}</g><g class="cC">${blob}</g><g class="cA">${blob}</g></g>
          <g class="s-track"><line class="s-path"/>${dots}</g>
          <g class="s-det"><path d="M-92 -44v-14h14M78 -58h14v14M92 44v14h-14M-78 58h-14v-14"/><path class="s-arrow" d="M0 0L36 -26m-12 1l12 -1l-4 11"/><text x="-92" y="-66">Wolke 01</text></g>
          <text class="s-eta" text-anchor="middle"></text>
        </g>
      </g>
      <circle class="s-rim" cx="200" cy="200" r="180"/>
      <circle class="s-sun" cx="${SUN[0]}" cy="${SUN[1]}" r="5"/><circle class="s-sunring" cx="${SUN[0]}" cy="${SUN[1]}" r="13"/>
      <text class="s-lab" x="200" y="8" text-anchor="middle">N</text><text class="s-lab" x="200" y="404" text-anchor="middle">S</text>
      <text class="s-lab" x="2" y="204" text-anchor="middle">W</text><text class="s-lab" x="398" y="204" text-anchor="middle">O</text></svg>`;
    const q = s => el.querySelector(s), ticks = [...el.querySelectorAll('.s-tick')];
    const A = q('.cA'), Bc = q('.cB'), C = q('.cC'), det = q('.s-det'), path = q('.s-path'), track = q('.s-track'), et = q('.s-eta'), glow = q('.s-glow'), dyn = q('.s-dyn');
    return function (p) {
      const [x, y] = mc(p);
      A.setAttribute('transform', `translate(${x} ${y})`);
      Bc.setAttribute('transform', `translate(${x + 7} ${y + 112}) scale(.6)`);
      C.setAttribute('transform', `translate(${x - 248} ${y + 49}) scale(.75)`);
      det.setAttribute('transform', `translate(${x} ${y})`);
      det.style.opacity = ss(.05, .09, p) * (1 - ss(.8, .86, p));
      const tr = ss(.15, .2, p) * (1 - ss(.5, .56, p));
      track.style.opacity = tr;
      path.setAttribute('x1', x); path.setAttribute('y1', y); path.setAttribute('x2', SUN[0]); path.setAttribute('y2', SUN[1]);
      ticks.forEach(t => t.style.opacity = +t.dataset.q > p + .05 ? 1 : 0);
      et.setAttribute('x', (x + SUN[0]) / 2 + 26); et.setAttribute('y', (y + SUN[1]) / 2 + 24);
      et.textContent = mmss(eta(p)); et.style.opacity = tr * (1 - ss(.4, .44, p));
      glow.style.opacity = .62 * (1 - .85 * ss(70, 30, Math.hypot(x - SUN[0], y - SUN[1])));
      dyn.style.opacity = fade(p);
    };
  }

  /* nur die Kamera (z. B. Hero) */
  document.querySelectorAll('[data-sky]').forEach(el => {
    const up = skyBuild(el), o = (el.closest('[data-sky-wrap]') || el).querySelector('[data-out="eta"]');
    run(el, p => { up(p); if (o) { const t = p < ARRIVE ? mmss(eta(p)) : p < CLEAR ? '00:00' : '––:––'; if (o.textContent !== t) o.textContent = t; } }, 18000);
  });

  /* die ganze Szene */
  const STEPS = [
    [.04, .16, 'Erkennen', 'Die Kamera am Park sieht die Wolke, lange bevor ihr Schatten ankommt.'],
    [.16, .26, 'Verfolgen', 'Die KI misst Richtung und Tempo und berechnet die Zugbahn zur Sonne.'],
    [.26, ARRIVE, 'Vorhersagen', 'Der Einbruch steht in der Prognose, während der Park noch voll liefert.'],
    [ARRIVE, .84, 'Eintreffen', 'Der Schatten zieht über die Module. Die Leistung fällt wie vorhergesagt.']];
  function scene(el) {
    const PW = 520, PH = 230, CW = 520, CH = 170, cx = p => 14 + (CW - 28) * p, cy = v => CH - 22 - v / 46 * (CH - 40);
    let panels = '';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 12; c++) {
      const x = 78 + c * 34 - r * 14, y = 44 + r * 31;
      panels += `<path class="pk-panel" data-x="${x + 9}" data-y="${y + 10}" d="M${x} ${y}h28l-10 21h-28z"/>`;
    }
    const flat = Array.from({ length: 61 }, (_, i) => (i ? 'L' : 'M') + cx(i / 60).toFixed(1) + ' ' + cy(40).toFixed(1)).join('');
    el.innerHTML = `<div class="sc">
      <div class="sc-main">
        <figure class="sc-sky"><figcaption>Himmelskamera</figcaption><div class="sc-skysvg"></div></figure>
        <div class="sc-right">
          <figure class="sc-park"><figcaption>Solarpark</figcaption><span class="sc-chip num"></span>
            <svg viewBox="0 0 ${PW} ${PH}" role="img" aria-label="Solarpark von oben: der Wolkenschatten zieht über die Module">
              <defs><filter id="pk${sid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16"/></filter><clipPath id="pkc${sid}"><rect width="${PW}" height="${PH}"/></clipPath></defs>
              <ellipse class="pk-shadow" cy="120" rx="255" ry="135" filter="url(#pk${sid})"/>${panels}</svg></figure>
          <figure class="sc-pow"><figcaption>Leistung</figcaption><span class="sc-val num"><b></b> MW</span>
            <svg viewBox="0 0 ${CW} ${CH}" role="img" aria-label="Leistung: die Prognose zeigt den Einbruch, bevor er gemessen wird">
              <line class="c-grid" x1="14" x2="${CW - 14}" y1="${cy(0)}" y2="${cy(0)}"/><path class="c-nwp" d="${flat}"/>
              <g class="sc-dyn"><g class="sc-fc"><path class="c-band"/><path class="c-fc"/><text class="sc-dip" text-anchor="middle" x="${cx(PEAK)}" y="${cy(40 * .4) + 20}">−60 %</text></g>
              <path class="c-actual"/><line class="c-now" y1="14" y2="${cy(0)}"/><circle class="c-dot" r="4.5"/><text class="c-nowlab" y="22">Jetzt</text></g></svg>
            <div class="sc-leg"><span><i></i>Gemessen</span><span class="f"><i></i>Nuno-Prognose</span><span class="n"><i></i>Ohne Kamera</span></div></figure>
        </div>
      </div>
      <ol class="sc-steps">${STEPS.map((s, i) => `<li><i></i><b>0${i + 1}</b><h4>${s[2]}</h4><p>${s[3]}</p></li>`).join('')}</ol></div>`;
    const q = s => el.querySelector(s), up = skyBuild(q('.sc-skysvg'));
    const ps = [...el.querySelectorAll('.pk-panel')].map(n => ({ n, x: +n.dataset.x, y: +n.dataset.y }));
    const sh = q('.pk-shadow'), chip = q('.sc-chip'), val = q('.sc-val b'), lis = [...el.querySelectorAll('.sc-steps li')];
    const act = q('.sc-pow .c-actual'), fc = q('.sc-pow .c-fc'), band = q('.c-band'), now = q('.sc-pow .c-now'), dot = q('.sc-pow .c-dot'), lab = q('.sc-pow .c-nowlab'), fcg = q('.sc-fc'), dip = q('.sc-dip'), dyn = q('.sc-dyn');
    run(el, p => {
      up(p);
      const sx = 240 + (p - PEAK) * 2600; sh.setAttribute('cx', sx);
      ps.forEach(o => { const d = Math.abs(o.x - sx - (o.y - 120) * .45); o.n.style.opacity = .95 - .78 * ss(265, 195, d); });
      let a = '', f = '', u = '', l = [];
      for (let i = 0; i <= 200 * p; i++) a += (i ? 'L' : 'M') + cx(i / 200).toFixed(1) + ' ' + cy(power(i / 200)).toFixed(1);
      a += 'L' + cx(p).toFixed(1) + ' ' + cy(power(p)).toFixed(1);
      for (let s = p; s <= Math.min(1, p + .5) + 1e-6; s += .005) {
        const v = fcast(s), bw = .7 + 7 * (s - p);
        f += (f ? 'L' : 'M') + cx(s).toFixed(1) + ' ' + cy(v).toFixed(1); u += (u ? 'L' : 'M') + cx(s).toFixed(1) + ' ' + cy(v + bw).toFixed(1); l.push('L' + cx(s).toFixed(1) + ' ' + cy(v - bw).toFixed(1));
      }
      act.setAttribute('d', a); fc.setAttribute('d', f); band.setAttribute('d', u + l.reverse().join('') + 'Z');
      fcg.style.opacity = ss(.24, .29, p); dip.style.opacity = 1 - ss(.5, .56, p);
      const nx = cx(p); now.setAttribute('x1', nx); now.setAttribute('x2', nx); dot.setAttribute('cx', nx); dot.setAttribute('cy', cy(power(p)));
      lab.setAttribute('x', p > .86 ? nx - 8 : nx + 8); lab.setAttribute('text-anchor', p > .86 ? 'end' : 'start');
      dyn.style.opacity = fade(p);
      const t = p < .06 ? 'Freier Himmel' : p < .16 ? 'Wolke erkannt' : p < .26 ? 'Zugbahn berechnet' : p < ARRIVE ? 'Schatten in ' + mmss(eta(p)) : p < CLEAR ? 'Schatten über dem Park' : 'Wolke durchgezogen';
      if (chip.textContent !== t) chip.textContent = t; chip.classList.toggle('hot', p >= .26 && p < CLEAR);
      const v = de(power(p)); if (val.textContent !== v) val.textContent = v;
      lis.forEach((li, i) => { const [s, e] = STEPS[i]; li.classList.toggle('on', p >= s && p < e); li.classList.toggle('done', p >= e); li.style.setProperty('--p', Math.min(1, Math.max(0, (p - s) / (e - s)))); });
    }, 20000);
  }
  document.querySelectorAll('[data-scene]').forEach(scene);
})();
