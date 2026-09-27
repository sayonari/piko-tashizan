'use strict';
// =====================================================================
//  のうじるモード — レインボー・ばくはつ・コンボ の きょうつう えんしゅつ
//  piko-tashizan / piko-kakezan で おなじ ファイルを つかう
//  (index.html の グローバル T, W, H, DPR, L, ctx, P, FONT, tone, noise, mf, burst,
//   popText, jtext, ptext, rrect, clamp, shake, BGM を よびだし時に つかう)
// =====================================================================
const FV = {
  flash: 0, flashCol: '#fff', rings: [], texts: [], level: 0,
  reset() { this.flash = 0; this.rings = []; this.texts = []; this.level = 0; BGM.st = .19; },
  hue(i = 0) { return (T * 240 + i * 40) % 360; },
  rb(i = 0, l = 60) { return `hsl(${this.hue(i)},100%,${l}%)`; },
  rbs(n = 10) { return Array.from({length: n}, (_, i) => `hsl(${(i * 360 / n + T * 240) % 360},100%,${55 + (i % 3) * 10}%)`); },
  // コンボが ふえるほど おとが たかく なる (ペンタトニック)
  note(k) { const PN = [0, 2, 4, 7, 9]; return 60 + 12 * Math.min(3, Math.floor(k / 5)) + PN[k % 5]; },

  // ---------- おと ----------
  sfxHit(combo) {
    const n = this.note(Math.min(combo, 19));
    tone(mf(n), .09, {vol: .13}); tone(mf(n + 4), .09, {delay: .05, vol: .12}); tone(mf(n + 7), .09, {delay: .1, vol: .12});
    tone(mf(n + 12), .32, {delay: .15, type: 'p12', vol: .12});
    tone(mf(n - 24), .3, {type: 'triangle', vol: .3});
    noise(.35 + Math.min(combo, 20) * .01, {vol: .18, f: 4000, f2: 150});
    if (combo >= 5) [0, 1, 2, 3].forEach(i => tone(mf(n + 19 + i * 5), .05, {delay: .2 + i * .035, type: 'p12', vol: .06}));
  },
  sfxMilestone() {
    for (let i = 0; i < 16; i++) tone(mf(60 + [0, 4, 7, 12][i % 4] + 12 * Math.floor(i / 4)), .07, {delay: i * .035, vol: .1});
    [0, .25, .5].forEach(d => noise(.6, {delay: d, vol: .25, f: 3000, f2: 100}));
    [60, 64, 67, 72].forEach(m => tone(mf(m), .9, {delay: .6, type: 'p25', vol: .08}));
    tone(mf(36), .9, {delay: .6, type: 'triangle', vol: .3});
  },
  sfxMiss() { tone(mf(64), .5, {type: 'square', slide: .3, vol: .12}); noise(.3, {vol: .15, ft: 'highpass', f: 2000}); },

  // ---------- できごと ----------
  hit(x, y, combo) {
    const k = Math.min(combo, 30);
    this.flash = Math.min(.55, .2 + k * .02); this.flashCol = this.rb(0, 75);
    shake = Math.min(.6, .15 + k * .015);
    burst(x, y, 40 + k * 4, this.rbs(12), 1.2 + k * .025, 1 + k * .02);
    for (let i = 0; i < 3; i++) this.rings.push({x, y, r: 0, v: L.u * (1 + i * .35), a: 1, h: this.hue(i * 3), w: L.u * .03});
    if (combo >= 2) this.texts.push({t: `${combo}コンボ!`, x: L.x0 + L.w / 2, y: L.y0 + L.h * .42, life: 1.1, max: 1.1, size: L.u * (.1 + Math.min(k, 20) * .005)});
    if (combo >= 10) for (let i = 0; i < Math.min(4, 1 + Math.floor(k / 8)); i++)
      burst(L.x0 + L.w * Math.random(), L.y0 + L.h * Math.random() * .6, 50, this.rbs(8), 1.1, 1.2);
    this.level = Math.min(1, .3 + combo / 12);
    BGM.st = combo >= 10 ? .13 : combo >= 5 ? .16 : .19;
    this.sfxHit(combo);
    if (combo % 10 === 0) this.milestone(combo);
  },
  milestone(combo) {
    const msg = combo >= 30 ? 'かみ!!!' : combo >= 20 ? 'すごすぎ!!' : 'フィーバー!!';
    this.texts.push({t: msg, x: L.x0 + L.w / 2, y: L.y0 + L.h * .28, life: 2, max: 2, size: Math.min(L.u * .16, L.w * .9 / msg.length)});
    this.flash = 1; this.flashCol = '#ffffff'; shake = .8;
    for (let i = 0; i < 8; i++) burst(L.x0 + L.w * Math.random(), L.y0 + L.h * Math.random() * .7, 60, this.rbs(10), 1.3, 1.3);
    this.sfxMilestone();
  },
  miss() {
    this.flash = .45; this.flashCol = '#ff004d'; shake = .3;
    this.texts.push({t: 'ざんねん…', x: L.x0 + L.w / 2, y: L.y0 + L.h * .42, life: 1, max: 1, size: L.u * .09, gray: true});
    this.level = 0; BGM.st = .19;
    this.sfxMiss();
  },
  update(dt) {
    this.flash = Math.max(0, this.flash - dt * 2.5);
    for (const r of this.rings) { r.r += r.v * dt; r.v *= .96; r.a -= dt * 1.4; }
    this.rings = this.rings.filter(r => r.a > 0);
    for (const t of this.texts) t.life -= dt;
    this.texts = this.texts.filter(t => t.life > 0);
  },

  // ---------- えがく ----------
  drawBack() {
    if (this.level <= 0) return;
    const R = Math.hypot(W, H), n = 24;
    ctx.save(); ctx.globalAlpha = .28 * this.level; ctx.translate(W / 2, H / 2); ctx.rotate(T * .5);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = `hsl(${(i * 360 / n + T * 120) % 360},100%,55%)`;
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a0) * R, Math.sin(a0) * R); ctx.lineTo(Math.cos(a1) * R, Math.sin(a1) * R); ctx.fill();
    }
    ctx.restore();
  },
  rainbowText(t, x, y, size, o = {}) {
    ctx.font = `${Math.round(size)}px ${FONT}`;
    const chs = [...t], ws = chs.map(ch => ctx.measureText(ch).width), tw = ws.reduce((a, b) => a + b, 0);
    let px = x - tw / 2;
    chs.forEach((ch, i) => {
      jtext(ch, px + ws[i] / 2, y + Math.sin(T * 10 + i) * size * .08, size, o.gray ? P.lgray : `hsl(${(T * 400 + i * 45) % 360},100%,62%)`, {outline: '#000'});
      px += ws[i];
    });
  },
  drawFront() {
    for (const r of this.rings) {
      ctx.save(); ctx.globalAlpha = Math.max(0, r.a);
      ctx.strokeStyle = `hsl(${(r.h + T * 300) % 360},100%,60%)`; ctx.lineWidth = r.w * r.a + 1;
      ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    for (const t of this.texts) {
      const k = t.life / t.max, p = 1 - k, sc = p < .15 ? .4 + p / .15 * .9 : 1.3 - Math.min(.3, (p - .15) * 1.5);
      ctx.globalAlpha = Math.min(1, k * 3);
      this.rainbowText(t.t, t.x, t.y - p * L.u * .05, t.size * sc, t);
      ctx.globalAlpha = 1;
    }
    if (this.flash > 0) {
      ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalAlpha = this.flash * .6; ctx.fillStyle = this.flashCol; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  },
  // うえの バー: スコア と じかん
  drawHud(score, time, maxT, combo) {
    const bar = L.bar, x1 = L.x0 + bar + 16, x2 = L.x0 + L.w - 12, y = L.y0 + 6 + bar * .22, h = bar * .56;
    const sw = Math.min(bar * 3.2, (x2 - x1) * .42), bx = x1 + sw, bw = x2 - bx;
    const s = '' + score;
    ptext(s, x1, y + h / 2, Math.min(h * .8 / 7, (sw - 8) / (s.length * 6)), combo >= 5 ? [...s].map((_, i) => this.rb(i * 2)) : P.yellow, {align: 'left'});
    ctx.fillStyle = '#0b1230'; rrect(bx, y, bw, h, h / 2); ctx.fill();
    const p = clamp(time / maxT, 0, 1);
    if (p > 0) {
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(i * 60 + T * 200) % 360},100%,55%)`);
      ctx.fillStyle = time < 5 ? (Math.sin(T * 20) > 0 ? P.red : P.white) : g;
      rrect(bx, y, Math.max(h, bw * p), h, h / 2); ctx.fill();
    }
    jtext('' + Math.ceil(time), bx + bw / 2, y + h / 2, h * .8, P.white);
  },
  drawResult(a, score, maxCombo, best, rec) {
    const u = L.u, cx = L.x0 + L.w / 2;
    ctx.fillStyle = `rgba(10,14,40,${.7 * a})`; ctx.fillRect(0, 0, W, H);
    this.level = .6 * a;
    ctx.globalAlpha = a;
    this.rainbowText('タイムアップ!', cx, L.y0 + L.h * .15, Math.min(u * .15, L.w * .9 / 7));
    jtext('スコア', cx, L.y0 + L.h * .29, u * .06, P.white);
    const s = '' + score;
    ptext(s, cx, L.y0 + L.h * .41, Math.min(u * .17 / 7, L.w * .8 / (s.length * 6)), [...s].map((_, i) => this.rb(i * 2)));
    jtext(`さいだい ${maxCombo} コンボ`, cx, L.y0 + L.h * .54, u * .065, P.yellow);
    if (rec) this.rainbowText('しんきろく!!', cx, L.y0 + L.h * .64, u * .08);
    else jtext(`ベスト ${best}`, cx, L.y0 + L.h * .64, u * .06, P.lgray);
    ctx.globalAlpha = 1;
  },
  // ステージえらびの カード
  drawCard(b, name, best) {
    const w = b.w, h = b.h * .91, top = -h / 2, r = Math.min(b.w, b.h) * .2;
    ctx.save(); rrect(-w / 2, top, w, h, r); ctx.clip();
    const g = ctx.createLinearGradient(-w / 2, top, w / 2, top + h);
    for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(i * 60 + T * 150) % 360},95%,55%)`);
    ctx.fillStyle = g; ctx.fillRect(-w / 2, top, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-w / 2, top + h * .6, w, h * .4);
    ctx.restore();
    ctx.font = `${Math.round(h * .28)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🌈🔥', 0, top + h * .22 + Math.sin(T * 6) * h * .02);
    jtext(name, 0, top + h * .5, Math.min(h * .17, w * .92 / name.length), P.white, {outline: '#000'});
    if (best) jtext(`ベスト ${best}`, 0, top + h * .8, h * .13, P.yellow, {outline: '#000'});
  },
  async countdown(f) {
    for (const t of ['3', '2', '1']) {
      popText(t, L.x0 + L.w / 2, L.y0 + L.h * .45, L.u * .3, this.rb(), {pix: true, life: .9}); tone(mf(72), .15, {vol: .12});
      await f.sleep(.8);
    }
    this.texts.push({t: 'スタート!', x: L.x0 + L.w / 2, y: L.y0 + L.h * .45, life: 1, max: 1, size: L.u * .14});
    tone(mf(84), .4, {vol: .14}); noise(.4, {vol: .15, f: 3000, f2: 200});
  },
};
