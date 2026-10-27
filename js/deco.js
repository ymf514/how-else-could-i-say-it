/* Background decoration: floating flat shapes + confetti bursts.
   A tiny p5-style draw loop on a plain canvas (no library needed).
   It sits behind the page with pointer-events: none, so it never blocks forms. */
window.Deco = (() => {
  const canvas = document.getElementById('deco');
  const ctx = canvas.getContext('2d');
  const css = getComputedStyle(document.documentElement);
  const COLORS = ['--mint', '--grass', '--sprout', '--coral', '--cream'].map((v) => css.getPropertyValue(v).trim());
  const TYPES = ['circle', 'ring', 'square', 'plus'];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, dpr = 1, shapes = [], confetti = [], t = 0;
  const mouse = { x: -999, y: -999 };

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(14, Math.max(6, (W * H) / 90000)));
    shapes = Array.from({ length: n }, () => ({
      x: rand(0, W), y: rand(0, H),
      r: rand(10, 26), type: pick(TYPES), color: pick(COLORS),
      rot: rand(0, Math.PI * 2), vr: rand(-0.006, 0.006),
      vx: rand(-0.15, 0.15), phase: rand(0, 6.28), speed: rand(0.6, 1.4),
      ox: 0, oy: 0,
    }));
    if (reduced) draw();
  }

  function drawShape(s, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(s.rot);
    ctx.fillStyle = s.color;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    const r = s.r;
    ctx.beginPath();
    switch (s.type) {
      case 'circle': ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); break;
      case 'ring': ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.stroke(); break;
      case 'tri':
        ctx.moveTo(0, -r); ctx.lineTo(r * 0.9, r * 0.7); ctx.lineTo(-r * 0.9, r * 0.7); ctx.closePath(); ctx.fill(); break;
      case 'square':
        if (ctx.roundRect) ctx.roundRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5, 6); else ctx.rect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
        ctx.fill(); break;
      case 'squiggle':
        ctx.moveTo(-r * 1.2, 0);
        for (let i = -r * 1.2; i <= r * 1.2; i += 3) ctx.lineTo(i, Math.sin(i / 5 + t * 0.05) * 5);
        ctx.stroke(); break;
      case 'plus':
        ctx.moveTo(-r * 0.7, 0); ctx.lineTo(r * 0.7, 0); ctx.moveTo(0, -r * 0.7); ctx.lineTo(0, r * 0.7); ctx.stroke(); break;
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 0.28;
    for (const s of shapes) {
      if (!reduced) {
        s.x += s.vx; s.rot += s.vr;
        if (s.x < -40) s.x = W + 40; if (s.x > W + 40) s.x = -40;
        // gentle shy-away from the cursor
        const dx = s.x + s.ox - mouse.x, dy = s.y + s.oy - mouse.y, d = Math.hypot(dx, dy);
        if (d < 130 && d > 0) { s.ox += (dx / d) * 1.6; s.oy += (dy / d) * 1.6; }
        s.ox *= 0.96; s.oy *= 0.96;
      }
      const bob = reduced ? 0 : Math.sin(t * 0.02 * s.speed + s.phase) * 10;
      drawShape(s, s.x + s.ox, s.y + s.oy + bob);
    }
    ctx.globalAlpha = 1;
    for (let i = confetti.length - 1; i >= 0; i--) {
      const p = confetti[i];
      p.vy += 0.25; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
      if (p.life <= 0 || p.y > H + 20) confetti.splice(i, 1);
    }
  }

  function loop() {
    if (!document.hidden) { t++; draw(); }
    requestAnimationFrame(loop);
  }

  function burst(x = W / 2, y = H / 3, n = 70) {
    if (reduced) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), v = rand(4, 11);
      confetti.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5,
        size: rand(8, 14), color: pick(COLORS), rot: rand(0, 6), vr: rand(-0.3, 0.3),
        life: 120, round: Math.random() < 0.4,
      });
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  resize();
  if (!reduced) requestAnimationFrame(loop);

  return { burst };
})();
