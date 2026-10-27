/* Draws the result image: one "Expression Experiment / Reflection Card" per round,
   styled like the printed card, under a small header with the original story.
   draw(data) → canvas. `data` is prepared by app.js so this file only paints. */
window.HECIS_ResultCard = (() => {
  const W = 1080;
  const M = 40;        // page margin
  const P = 52;        // padding inside a card
  const CW = W - M * 2;
  const IW = CW - P * 2;
  const C = {
    bg: '#FBF3E4', card: '#FFFFFF', ink: '#1F241D', soft: '#66735F',
    line: '#A6C9A0', label: '#6E9A63', fill: '#A3CE9B', coral: '#DB9789', coralDark: '#BF7A6C',
  };
  const FONT = '"SF Pro Rounded", ui-rounded, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", system-ui, -apple-system, "Segoe UI", sans-serif';
  const font = (size, weight = 500, italic = false) => `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT}`;

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Wrap text to a width. CJK breaks per character, Latin per word.
  function wrap(ctx, text, maxW, maxLines) {
    const lines = [];
    String(text || '').split('\n').forEach((para) => {
      const tokens = para.match(/[⺀-鿿豈-﫿＀-￯]|\s+|[^\s⺀-鿿豈-﫿＀-￯]+/g) || [''];
      let line = '';
      tokens.forEach((tok) => {
        // Closing punctuation never starts a line; it may overhang a little
        if (ctx.measureText(line + tok).width <= maxW || (line && /^[，。！？、；：,.!?;:）」』》…”’]$/.test(tok))) { line += tok; return; }
        if (line.trim()) { lines.push(line.trimEnd()); line = ''; tok = tok.trimStart(); }
        for (const ch of tok) { // a single word longer than the line
          if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ''; }
          line += ch;
        }
      });
      lines.push(line.trimEnd());
    });
    if (maxLines && lines.length > maxLines) {
      const cut = lines.slice(0, maxLines);
      let last = cut[maxLines - 1];
      while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      cut[maxLines - 1] = last + '…';
      return cut;
    }
    return lines;
  }

  function text(ctx, s, x, y, size, color, weight = 500, italic = false) {
    ctx.font = font(size, weight, italic);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  function lines(ctx, ls, x, y, size, lh, color, weight = 500) {
    ctx.font = font(size, weight);
    ctx.fillStyle = color;
    ls.forEach((ln, i) => ctx.fillText(ln, x, y + size + i * lh));
  }
  function outline(ctx) {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Speech bubble with a tail at the bottom right, like the printed card
  function bubble(ctx, x, y, w, h) {
    const r = 44, tx = x + w * 0.83;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, tx, y + h, r);
    ctx.lineTo(tx + 24, y + h);
    ctx.quadraticCurveTo(tx - 4, y + h + 6, tx + 48, y + h + 44);
    ctx.quadraticCurveTo(tx - 10, y + h + 54, tx - 50, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function header(ctx, d, y, draw) {
    if (draw) {
      text(ctx, 'How ', M + 8, y + 50, 50, C.ink, 900);
      let x = M + 8 + ctx.measureText('How ').width;
      text(ctx, 'Else', x, y + 50, 50, C.label, 900, true);
      x += ctx.measureText('Else ').width;
      text(ctx, 'Could I Say It?', x, y + 50, 50, C.ink, 900);
      text(ctx, d.meta, M + 8, y + 50 + 46, 24, C.soft, 600);
    }
    y += 50 + 46 + 34;
    // original story
    ctx.font = font(30, 500);
    const sl = wrap(ctx, d.story, IW, 6);
    const h = 30 + 22 + sl.length * 44 + 40;
    if (draw) {
      ctx.fillStyle = C.card;
      rrect(ctx, M, y, CW, h, 22);
      ctx.fill();
      text(ctx, d.storyLabel, M + P, y + 30 + 20, 24, C.label, 700);
      lines(ctx, sl, M + P, y + 30 + 30, 30, 44, C.ink);
    }
    return y + h + 28;
  }

  function reflectionCard(ctx, d, r, y0, draw) {
    const L = d.labels;
    const x = M + P;
    let y = y0 + 48;

    // Title + double rule
    if (draw) {
      text(ctx, L.title, x, y + 40, 40, C.ink, 800, true);
      if (r.fav) {
        ctx.font = font(26, 800);
        const t = '♥ ' + L.fav;
        text(ctx, t, M + CW - P - ctx.measureText(t).width, y + 36, 26, C.coralDark, 800);
      } else {
        ctx.font = font(24, 700);
        text(ctx, r.label, M + CW - P - ctx.measureText(r.label).width, y + 36, 24, C.soft, 700);
      }
    }
    y += 40 + 18;
    if (draw) {
      ctx.fillStyle = C.line;
      ctx.fillRect(x - 4, y, IW + 8, 3);
      ctx.fillRect(x - 4, y + 8, IW + 8, 3);
    }
    y += 11 + 36;

    // Technique / Perspective boxes
    const colW = (IW - 48) / 2;
    ctx.font = font(32, 800);
    const tl = wrap(ctx, r.tech, colW - 40, 2);
    const pl = wrap(ctx, r.persp || '—', colW - 40, 2);
    const boxH = Math.max(tl.length, pl.length) * 42 + 44;
    if (draw) {
      text(ctx, L.technique, x, y + 28, 28, C.ink);
      text(ctx, L.perspective, x + colW + 48, y + 28, 28, C.ink);
    }
    y += 28 + 22;
    if (draw) {
      [[x, tl], [x + colW + 48, pl]].forEach(([bx, ls]) => {
        ctx.beginPath(); ctx.rect(bx, y, colW, boxH); outline(ctx);
        lines(ctx, ls, bx + 20, y + 16, 32, 42, ls === pl && !r.persp ? C.soft : C.ink, 800);
      });
    }
    y += boxH + 40;

    // My version (speech bubble)
    ctx.font = font(30, 500);
    const vl = wrap(ctx, r.version, IW - 64, 12);
    const bh = Math.max(150, vl.length * 44 + 52);
    if (draw) {
      text(ctx, L.version, x, y + 28, 28, C.ink);
    }
    y += 28 + 22;
    if (draw) {
      bubble(ctx, x, y, IW, bh); outline(ctx);
      lines(ctx, vl, x + 32, y + 20, 30, 44, C.ink);
      text(ctx, L.readNote, x, y + bh + 34, 20, C.label, 500);
    }
    y += bh + 34 + 52;

    // Ratings table: the chosen number is filled in
    const numX0 = x + IW * 0.43, numStep = (IW * 0.57 - 20) / 4;
    if (draw) {
      text(ctx, L.rate, x, y + 30, 28, C.ink);
      ctx.textAlign = 'center';
      text(ctx, L.bad, numX0, y + 18, 19, C.label);
      text(ctx, L.good, numX0 + numStep * 4, y + 18, 19, C.label);
      ctx.textAlign = 'left';
    }
    y += 30 + 26;
    r.ratings.forEach((rt) => {
      if (draw) {
        ctx.font = font(28, 500);
        const lbl = wrap(ctx, rt.label, IW * 0.42, 1)[0];
        text(ctx, lbl, x + 2, y + 34, 28, C.label);
        for (let n = 1; n <= 5; n++) {
          const cx = numX0 + numStep * (n - 1);
          if (rt.v === n) {
            ctx.beginPath();
            ctx.arc(cx, y + 24, 25, 0, Math.PI * 2);
            ctx.fillStyle = C.fill;
            ctx.fill();
          }
          ctx.textAlign = 'center';
          text(ctx, String(n), cx, y + 34, 28, rt.v === n ? C.ink : C.label, rt.v === n ? 800 : 500);
          ctx.textAlign = 'left';
        }
      }
      y += 58;
    });
    y += 36;

    // Reflection box
    ctx.font = font(28, 500);
    const ql = wrap(ctx, L.reflect, IW, 2);
    ctx.font = font(28, 500);
    const rl = r.reflection ? wrap(ctx, r.reflection, IW - 44, 10) : [];
    const rh = Math.max(150, rl.length * 42 + 44);
    if (draw) lines(ctx, ql, x, y - 6, 28, 38, C.ink);
    y += ql.length * 38 + 20;
    if (draw) {
      ctx.beginPath(); ctx.rect(x, y, IW, rh); outline(ctx);
      lines(ctx, rl, x + 22, y + 14, 28, 42, C.ink);
    }
    y += rh + 52;

    return y;
  }

  function footer(ctx, d, y, draw) {
    if (d.favWhy) {
      ctx.font = font(28, 500);
      const fl = wrap(ctx, d.favWhy, CW - 16, 5);
      if (draw) {
        text(ctx, '♥ ' + d.favWhyLabel, M + 8, y + 26, 24, C.coralDark, 800);
        lines(ctx, fl, M + 8, y + 40, 28, 42, C.ink);
      }
      y += 40 + fl.length * 42 + 24;
    }
    if (draw) {
      ctx.textAlign = 'center';
      text(ctx, d.footer, W / 2, y + 30, 22, C.soft, 600);
      ctx.textAlign = 'left';
    }
    return y + 30 + M + 10;
  }

  function layout(ctx, d, draw) {
    if (draw) {
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, ctx.canvas.height);
    }
    let y = header(ctx, d, M + 12, draw);
    d.rounds.forEach((r) => {
      if (draw) { // card paper first, sized by a measuring pass
        const end = reflectionCard(ctx, d, r, y, false);
        ctx.save();
        ctx.fillStyle = C.card;
        ctx.shadowColor = 'rgba(47,59,44,0.10)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 6;
        rrect(ctx, M, y, CW, end - y, 26);
        ctx.fill();
        ctx.restore();
      }
      y = reflectionCard(ctx, d, r, y, draw) + 32;
    });
    y = footer(ctx, d, y - 8, draw);
    return Math.ceil(y);
  }

  function draw(data) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    canvas.height = layout(ctx, data, false); // resizing also resets the context
    layout(ctx, data, true);
    return canvas;
  }

  return { draw };
})();
