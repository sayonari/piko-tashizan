'use strict';
// =====================================================================
//  メニュー — 「★やさしい / ★★ふつう / ★★★むずかしい / 🎮ゲーム」の 4つの へや
//  piko-tashizan / piko-kakezan で おなじ ファイルを つかう
//  setupMenu({cats, drawCard(b, i), cardCol(i), start(i), cleared(i), extra: [{emoji, onTap}]})
// =====================================================================
let curCat = 0;
function setupMenu(o) {
  scenes.select = {
    enter() {
      const t = (k) => () => { SAVE[k] = !SAVE[k]; save(); audioInit(); applySound(); sfx.tap(); if (k === 'voice' && SAVE.voice) speak('こえ オン'); if (k === 'voice' && !SAVE.voice && window.speechSynthesis) speechSynthesis.cancel(); };
      this.tog = [iconBtn('🔊', t('sfx'), () => !SAVE.sfx), iconBtn('🗣️', t('voice'), () => !SAVE.voice), iconBtn('🎵', t('bgm'), () => !SAVE.bgm)];
      this.extra = (o.extra || []).map(x => iconBtn(x.emoji, x.onTap));
      this.tiles = o.cats.map((c, k) => Btn({col: c.col, dcol: '#0008', sc: 0, noHi: true,
        onTap: () => { sfx.select(); curCat = k; speak(c.say || c.name); setScene('cat'); }, draw: b => drawTile(b, c)}));
      this.tiles.forEach((b, i) => tw(b, {sc: 1}, .4, {delay: .07 * i, ease: E.outBack}));
      this.btns = [...this.tog, ...this.extra, ...this.tiles];
    },
    layout() {
      const {x0, y0, w, h} = L, bar = L.bar;
      this.tog.forEach((b, i) => Object.assign(b, {x: x0 + w - (3 - i) * (bar + 4) - 4, y: y0 + 6, w: bar, h: bar}));
      this.extra.forEach((b, i) => Object.assign(b, {x: x0 + bar * 2.2 + 16 + i * (bar + 4), y: y0 + 6, w: bar, h: bar}));
      this.hdrY = y0 + bar + 10 + L.u * .045;
      const top = this.hdrY + L.u * .06, gap = clamp(L.u * .03, 8, 20);
      const cols = L.portrait ? 1 : 2, rows = Math.ceil(this.tiles.length / cols);
      const tw0 = Math.min((w - gap * (cols + 1)) / cols, 620), th = Math.min((y0 + h - top - gap * rows) / rows, tw0 * .45);
      const ox = x0 + (w - (cols * tw0 + (cols - 1) * gap)) / 2;
      this.tiles.forEach((b, i) => Object.assign(b, {x: ox + (i % cols) * (tw0 + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw0, h: th}));
    },
    update() {},
    draw() {
      jtext('どれで あそぶ?', L.x0 + L.w / 2, this.hdrY, L.u * .07, P.white, {outline: P.plum});
      drawStar(L.x0 + L.bar * .5 + 6, L.y0 + 6 + L.bar / 2, L.bar * .6, P.yellow);
      jtext('' + SAVE.stars, L.x0 + L.bar + 10, L.y0 + 6 + L.bar / 2, L.bar * .5, P.yellow, {align: 'left'});
      this.btns.forEach(drawBtn);
    },
  };
  function drawTile(b, c) {
    const w = b.w, h = b.h * .91, top = -h / 2, r = Math.min(b.w, b.h) * .2;
    if (c.game) {
      ctx.save(); rrect(-w / 2, top, w, h, r); ctx.clip();
      const g = ctx.createLinearGradient(-w / 2, top, w / 2, top + h);
      for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(i * 60 + T * 100) % 360},85%,45%)`);
      ctx.fillStyle = g; ctx.fillRect(-w / 2, top, w, h); ctx.restore();
    }
    // ひだり: ほし or アイコン
    const iw = Math.min(w * .34, h * 1.1), icx = -w / 2 + iw / 2 + w * .03;
    if (c.stars) {
      const s = Math.min(iw / (c.stars * 1.1 + .2), h * .5);
      for (let i = 0; i < c.stars; i++) drawStar(icx + (i - (c.stars - 1) / 2) * s * 1.1, Math.sin(T * 4 + i) * s * .06, s, P.yellow);
    } else {
      ctx.font = `${Math.round(h * .5)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.emoji, icx, Math.sin(T * 4) * h * .03);
    }
    // みぎ: なまえ と れい
    const tx = -w / 2 + iw + w * .06, tw0 = w / 2 - tx - w * .04;
    jtext(c.name, tx, -h * .14, Math.min(h * .3, tw0 / c.name.length * 1.05), P.white, {align: 'left', outline: '#0009'});
    jtext(c.sub, tx, h * .22, Math.min(h * .15, tw0 / c.sub.length * 1.1), '#fff8d0', {align: 'left', outline: '#0009'});
    const done = c.items.filter(i => i >= 0 && o.cleared(i)).length, all = c.items.filter(i => i >= 0).length;
    if (done && !c.game) jtext(`🏅${done}/${all}`, w / 2 - h * .1, top + h * .16, h * .13, P.yellow, {align: 'right', outline: '#000'});
  }
  scenes.cat = {
    enter() {
      const c = o.cats[curCat];
      this.back = iconBtn('⬅️', () => { sfx.tap(); setScene('select'); });
      this.cards = c.items.map(i => Btn({col: o.cardCol(i), dcol: '#0008', sc: 0, noHi: true,
        onTap: () => { sfx.select(); o.start(i); }, draw: b => o.drawCard(b, i)}));
      this.cards.forEach((b, i) => tw(b, {sc: 1}, .4, {delay: .06 * i, ease: E.outBack}));
      this.btns = [this.back, ...this.cards];
    },
    layout() {
      const {x0, y0, w, h} = L, bar = L.bar, n = this.cards.length;
      Object.assign(this.back, {x: x0 + 6, y: y0 + 6, w: bar, h: bar});
      const top = y0 + bar + 18, gap = clamp(L.u * .03, 8, 20);
      const cols = L.portrait ? (n <= 3 ? 1 : 2) : Math.min(n, 3), rows = Math.ceil(n / cols);
      const cw = Math.min((w - gap * (cols + 1)) / cols, 520), ch = Math.min((y0 + h - top - gap * rows) / rows, cw * .75);
      this.cards.forEach((b, i) => {
        const r = Math.floor(i / cols), k = i % cols, m = r === rows - 1 ? n - r * cols : cols;
        const ox = x0 + (w - (m * cw + (m - 1) * gap)) / 2;
        Object.assign(b, {x: ox + k * (cw + gap), y: top + r * (ch + gap), w: cw, h: ch});
      });
    },
    update() {},
    draw() {
      const c = o.cats[curCat], y = L.y0 + 6 + L.bar / 2;
      const label = c.stars ? '' : c.emoji + ' ';
      jtext(label + c.name, L.x0 + L.w / 2 + (c.stars ? L.bar * .5 : 0), y, Math.min(L.bar * .55, L.w * .6 / (c.name.length + 1)), P.white, {outline: P.plum});
      if (c.stars) {
        ctx.font = `${Math.round(Math.min(L.bar * .55, L.w * .6 / (c.name.length + 1)))}px ${FONT}`;
        const tw0 = ctx.measureText(c.name).width, s = L.bar * .45;
        for (let i = 0; i < c.stars; i++) drawStar(L.x0 + L.w / 2 + L.bar * .5 - tw0 / 2 - s * (c.stars - i) * 1.1, y, s, P.yellow);
      }
      this.btns.forEach(drawBtn);
    },
  };
}
