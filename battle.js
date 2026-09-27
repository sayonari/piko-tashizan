'use strict';
// =====================================================================
//  たいせんモード — はやおしバトル / じっくりバトル (ターンせい)
//  piko-tashizan / piko-kakezan で おなじ ファイルを つかう
//  ゲームがわは BT.init(hook) で もんだいの だしかた・こたえの みせかた を わたす
// =====================================================================
const ENEMIES = [
  {name: 'スライム', pal: {'1': '#003a0e', '2': '#00e436', '3': '#a8f5bc'},
   spr: ['.....11.....', '....1331....', '...122221...', '..12222221..', '.1224222421.', '.1224222421.', '122222222221', '122226622221', '122222222221', '.1111111111.']},
  {name: 'コウモリ', pal: {'1': '#1d0b3a', '2': '#8a5cd8', '3': '#c9b0ff'},
   spr: ['11..........11', '121..1..1..121', '1221.1111.1221', '12221222212221', '12222422422221', '.122225522221.', '..1222222221..', '...11.11.11...']},
  {name: 'おばけ', pal: {'1': '#3b3b6b', '2': '#e8e8ff', '3': '#ffffff'},
   spr: ['...111111...', '..12222221..', '.1222222221.', '.1242222421.', '.1242222421.', '.1222662221.', '.1222222221.', '.1222222221.', '.1212212121.', '.1.1..1..1..']},
  {name: 'ロボット', pal: {'1': '#1d2b53', '2': '#c2c3c7', '3': '#29adff'},
   spr: ['.....11.....', '.....33.....', '..11111111..', '..12222221..', '..12322321..', '..12222221..', '..12666621..', '..11111111..', '.1122222211.', '1.12233221.1', '..12222221..', '..11....11..']},
  {name: 'ドラゴン', pal: {'1': '#3a0010', '2': '#ff5030', '3': '#ffec27'},
   spr: ['1..............1', '11....1111....11', '121..122221..121', '1221122222211221', '1222224224222221', '.12222222222221.', '..122555555221..', '..122666666221..', '..122222222221..', '.12233333333221.', '.12233333333221.', '..122222222221..', '...121....121...', '...11......11...']},
];
const LOOP_COL = [null, '#ff77a8', '#ffec27', '#29adff', '#ff004d'];
const LOOP_NAME = ['', 'つよい ', 'すごく つよい ', 'でんせつの ', 'かみさまの '];
const HEART = ['.11.11.', '1111111', '1111111', '.11111.', '..111..', '...1...'];

const BT = {
  hook: null, startLv: 1,
  init(hook) { this.hook = hook; },
  enemy(lv) {
    const e = ENEMIES[(lv - 1) % 5], loop = Math.min(4, Math.floor((lv - 1) / 5));
    const pal = Object.assign({'4': '#1d1d2b', '5': '#ffffff', '6': '#ff004d'}, e.pal);
    if (loop) pal['2'] = LOOP_COL[loop];
    return {name: LOOP_NAME[loop] + e.name, spr: e.spr, pal};
  },
  // ---------- じょうたい ----------
  newState(kind) {
    const lv = this.startLv || 1; this.startLv = 1;
    const race = kind === 'race';
    return {kind, lv, php: race ? 3 : 10, pmax: race ? 3 : 10, ehp: race ? 2 + Math.min(lv, 4) : 8 + 2 * lv, emax: race ? 2 + Math.min(lv, 4) : 8 + 2 * lv,
      gauge: 0, thinking: false, tq: 8, sp: 0, phase: 'intro', es: 0, ef: 0, esh: 0, lunge: 0, pf: 0, psh: 0, guard: 0, dead: 0,
      dmg: [], proj: [], charge: false, result: null, resA: 0, pc: false, correct: false, wrong: false, hard: false, msg: null, mark: null};
  },
  // ---------- おと ----------
  sfxAppear() { [48, 52, 55, 60, 64].forEach((m, i) => tone(mf(m), .15, {delay: i * .06, type: 'square', vol: .1})); noise(.5, {vol: .12, f: 800, f2: 3000}); },
  sfxShoot() { tone(mf(84), .25, {slide: 2.5, vol: .1}); noise(.2, {vol: .08, ft: 'highpass', f: 3000}); },
  sfxHit() { noise(.3, {vol: .25, f: 2500, f2: 200}); tone(mf(48), .2, {type: 'square', slide: .5, vol: .15}); },
  sfxEnemyAtk() { tone(mf(40), .4, {type: 'sawtooth', slide: .6, vol: .12}); noise(.4, {vol: .25, f: 1200, f2: 100}); },
  sfxHeal() { [72, 76, 79, 84, 88, 91].forEach((m, i) => tone(mf(m), .12, {delay: i * .06, type: 'triangle', vol: .18})); },
  sfxGuard() { tone(1800, .3, {type: 'square', slide: .7, vol: .08}); tone(2400, .25, {type: 'p12', vol: .06}); noise(.15, {vol: .12, ft: 'highpass', f: 5000}); },
  sfxEnemyRing() { tone(mf(64), .12, {type: 'square', vol: .12}); tone(mf(60), .35, {delay: .12, type: 'square', vol: .12}); },
  sfxCharge() { tone(mf(36), 1.2, {type: 'sawtooth', slide: 2, vol: .08}); },
  sfxLose() { [67, 64, 60, 55, 48].forEach((m, i) => tone(mf(m), .3, {delay: i * .22, type: 'triangle', vol: .2})); },

  // ---------- ボタン ----------
  makeButtons() {
    const cmd = (key, col, dcol, emo, label) => Btn({key, col, dcol, vis: false, sc: 0, onTap: () => this.pickCmd(key),
      draw: b => {
        const wide = b.w > b.h * 2.2, bt = G.bt;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (wide) {
          ctx.font = `${Math.round(b.h * .55)}px sans-serif`; ctx.fillText(emo, -b.w * .3, 0);
          jtext(label, b.w * .05, 0, Math.min(b.h * .45, b.w * .4 / label.length), P.white, {outline: dcol});
          if (key === 'sp') { const s = b.h * .3; for (let i = 0; i < 3; i++) drawStar(b.w * .3 + (i - 1) * s * 1.2, 0, s, i < bt.sp ? P.yellow : '#0006'); }
          return;
        }
        ctx.font = `${Math.round(b.h * .32)}px sans-serif`; ctx.fillText(emo, 0, -b.h * .18);
        jtext(label, 0, b.h * .2, Math.min(b.h * .24, b.w * .85 / label.length), P.white, {outline: dcol});
        if (key === 'sp') { const s = Math.min(b.h * .16, b.w * .18); for (let i = 0; i < 3; i++) drawStar(-s * 1.2 + i * s * 1.2, -b.h * .38, s, i < bt.sp ? P.yellow : '#0006'); }
      }});
    this.cmds = [cmd('atk', '#e8413c', '#7a0e1c', '⚔️', 'こうげき'), cmd('heal', '#2fb96a', '#0d5a30', '💖', 'かいふく'), cmd('sp', '#9a40e8', '#4a1680', '🔥', 'ひっさつ')];
    const rb = (label, col, dcol, fn) => Btn({col, dcol, vis: false, sc: 0, onTap: fn, draw(b) { jtext(label, 0, 0, Math.min(b.h * .36, b.w * .85 / label.length), P.white, {outline: dcol}); }});
    this.resBtns = [
      rb('もういちど', P.blue, '#1868c0', () => { sfx.select(); this.startLv = G.bt.lv; this.hook.start(G.si); }),
      rb('つぎの てき ▶', P.green, P.dgreen, () => { sfx.select(); this.startLv = G.bt.lv + 1; this.hook.start(G.si); }),
      rb('もどる', P.lav, '#4b3f6b', () => { sfx.tap(); this.hook.back(); }),
    ];
    return [...this.cmds, ...this.resBtns];
  },
  layout(choices) {
    this.cmds.forEach((b, i) => Object.assign(b, {x: choices[i].x, y: choices[i].y, w: choices[i].w, h: choices[i].h}));
    const bw = Math.min(L.w * .3, 240), bh = clamp(L.u * .13, 50, 100), gap = L.w * .02;
    this.resBtns.forEach((b, i) => Object.assign(b, {x: L.x0 + L.w / 2 + (i - 1.5) * bw + (i - 1) * gap, y: L.y0 + L.h * .76, w: bw, h: bh}));
  },
  showCmds(on) {
    this.cmds.forEach((b, i) => {
      if (on) { b.vis = true; b.en = b.key !== 'sp' || G.bt.sp >= 3; b.sc = 0; tw(b, {sc: 1}, .3, {delay: i * .07, ease: E.outBack}); }
      else tw(b, {sc: 0}, .15).then(() => { b.vis = false; });
    });
  },
  pickCmd(key) { const bt = G.bt; if (bt.phase !== 'cmd' || !bt.cmdRes) return; sfx.select(); const r = bt.cmdRes; bt.cmdRes = null; r(key); },
  msg(text, life = 1.6) { G.bt.msg = {text, life, max: life}; },

  // ---------- ゲームがわ から よばれる ----------
  answer(btn, correct) {
    const bt = G.bt;
    if (G.phase !== 'ask' || !btn.en) return;
    if (correct) {
      G.phase = 'done'; bt.pc = true; bt.correct = true; bt.lastBtn = btn;
      tone(mf(88), .1, {vol: .12}); tone(mf(96), .25, {delay: .08, vol: .12});
      burst(btn.x + btn.w / 2, btn.y + btn.h / 2, 30, FIRE, 1, 1);
      tw(btn, {sc: 1.1}, .12, {ease: E.outBack});
      this.hook.choices().forEach(b => { if (b !== btn) tw(b, {sc: 0}, .2); });
    } else {
      sfx.wrong(); btn.en = false; btn.shake = 1; tw(btn, {shake: 0}, .5);
      if (bt.kind === 'race') bt.gauge = Math.min(.97, bt.gauge + .15);
      else { bt.wrong = true; G.phase = 'done'; this.hook.choices().forEach(b => { b.en = false; }); }
      this.hook.onWrong();
    }
  },
  update(dt) {
    const bt = G.bt; if (!bt) return;
    if (bt.thinking && G.phase === 'ask') bt.gauge = Math.min(1, bt.gauge + dt / bt.tq);
    for (const d of bt.dmg) { d.life -= dt; d.y -= L.u * .08 * dt; }
    bt.dmg = bt.dmg.filter(d => d.life > 0);
    if (bt.msg && (bt.msg.life -= dt) <= 0) bt.msg = null;
  },

  // ---------- ながれ ----------
  async run() {
    const g = G, bt = G.bt, e = this.enemy(bt.lv);
    const ok = () => { if (G !== g || sceneName !== 'play') throw CANCEL; };
    const sl = async s => { await wait(s); ok(); };
    this.hook.clear();
    await sl(.3);
    tw(bt, {es: 1}, .6, {ease: E.outBack}); this.sfxAppear();
    this.msg(`${e.name} が あらわれた!`, 1.8); speak(`${e.name} が あらわれた!`);
    await sl(1.6);
    if (bt.kind === 'race') await this.race(sl, ok, e); else await this.turn(sl, ok, e);
  },
  async race(sl, ok, e) {
    const bt = G.bt;
    this.msg('はやく こたえた ほうが かち!', 1.6); await sl(1.2);
    for (;;) {
      bt.pc = false; bt.gauge = 0; bt.thinking = false; bt.mark = null;
      await this.hook.newQuestion(); ok();
      bt.tq = this.hook.raceTime(bt.lv) * (.8 + Math.random() * .4);
      bt.thinking = true;
      while (!bt.pc && bt.gauge < 1) await sl(.03);
      bt.thinking = false;
      if (bt.pc) { this.hook.reveal(true); await this.playerAttack(sl, 1, false, false); }
      else {
        G.phase = 'done'; this.hook.choices().forEach(b => { b.en = false; });
        bt.mark = this.hook.choices().find(b => b.val === this.hook.answerOf());
        this.sfxEnemyRing(); this.msg(`${e.name} が さきに こたえた!`, 1.4);
        await sl(.5);
        await this.hook.reveal(true); ok();
        await this.enemyAttack(sl, 1, e);
      }
      if (bt.ehp <= 0) return this.win(sl, e);
      if (bt.php <= 0) return this.lose(sl, e);
      await sl(.6);
    }
  },
  async turn(sl, ok, e) {
    const bt = G.bt;
    for (;;) {
      // じぶんの ばん
      this.hook.clear(); bt.phase = 'cmd'; bt.mark = null;
      this.showCmds(true); this.msg('どうする?', 999);
      const cmd = await new Promise(r => { bt.cmdRes = r; }); ok();
      this.showCmds(false); bt.msg = null;
      bt.hard = cmd === 'sp'; if (cmd === 'sp') bt.sp = 0;
      bt.phase = 'q'; bt.correct = false; bt.wrong = false;
      this.msg(cmd === 'heal' ? 'かいふくの もんだい!' : cmd === 'sp' ? 'ひっさつの もんだい! むずかしいぞ' : 'こうげきの もんだい!', 1.6);
      await this.hook.newQuestion(); ok();
      const t0 = T;
      while (G.phase === 'ask') await sl(.05);
      const quick = T - t0 < this.hook.critTime;
      if (bt.correct) {
        if (cmd !== 'sp') bt.sp = Math.min(3, bt.sp + 1);
        await this.hook.reveal(false); ok();
        if (cmd === 'heal') await this.heal(sl, 4);
        else if (cmd === 'sp') await this.playerAttack(sl, 6, true, false);
        else await this.playerAttack(sl, (2 + rnd(0, 1)) * (quick ? 2 : 1), false, quick);
      } else {
        await this.hook.reveal(false); ok();
        this.msg('ミス! しっぱい…', 1.4); await sl(1.2);
      }
      if (bt.ehp <= 0) return this.win(sl, e);
      await sl(.4);
      // てきの ばん
      this.hook.clear(); bt.phase = 'enemy';
      const strong = bt.charge; bt.charge = false;
      this.msg(strong ? `${e.name}の すごい こうげき!` : `${e.name}の こうげき!`, 1.3);
      tw(bt, {lunge: .25}, .25).then(() => tw(bt, {lunge: 0}, .25));
      tone(mf(45), .5, {type: 'sawtooth', slide: 1.3, vol: .08});
      await sl(1.1);
      this.msg('けいさんで まもれ!', 1.5);
      bt.phase = 'q'; bt.hard = false; bt.correct = false; bt.wrong = false;
      await this.hook.newQuestion(); ok();
      while (G.phase === 'ask') await sl(.05);
      let dmg = (strong ? 2 : 1) * (2 + Math.floor(bt.lv / 2));
      await this.hook.reveal(false); ok();
      if (bt.correct) {
        dmg = strong ? Math.ceil(dmg / 3) : 0;
        bt.guard = 1; tw(bt, {guard: 0}, 1); this.sfxGuard(); this.msg(dmg ? 'ガード! すこし くらった' : 'ガード!', 1.2);
        await sl(.6);
      }
      if (dmg > 0) await this.enemyAttack(sl, dmg, e); else await sl(.6);
      if (bt.php <= 0) return this.lose(sl, e);
      if (!strong && Math.random() < .35) {
        bt.charge = true; this.msg(`${e.name}は ちからを ためている!`, 1.8); this.sfxCharge(); await sl(1.8);
      }
    }
  },
  pos() { const p = L.bp; return {px: p.x + p.w * .17, py: p.y + p.h * .55, ex: p.x + p.w * .74, ey: p.y + p.h * .48}; },
  async playerAttack(sl, dmg, special, crit) {
    const bt = G.bt, q = this.pos(), b = bt.lastBtn;
    const pr = {x0: b ? b.x + b.w / 2 : q.px, y0: b ? b.y + b.h / 2 : q.py, x1: q.ex, y1: q.ey, p: 0, special};
    bt.proj.push(pr); this.sfxShoot();
    await tw(pr, {p: 1}, special ? .5 : .35, {ease: E.inCubic});
    bt.proj = bt.proj.filter(x => x !== pr);
    bt.ef = 1; tw(bt, {ef: 0}, .35); bt.esh = 1; tw(bt, {esh: 0}, .45);
    this.sfxHit(); shake = special ? .7 : .3;
    burst(q.ex, q.ey, special ? 90 : 35, special ? FV.rbs(10) : [P.yellow, P.white, P.orange], special ? 1.5 : 1, 1.1);
    if (special) { FV.flash = 1; FV.flashCol = '#ffffff'; for (let i = 0; i < 3; i++) FV.rings.push({x: q.ex, y: q.ey, r: 0, v: L.u * (1 + i * .4), a: 1, h: i * 120, w: L.u * .04}); FV.sfxMilestone(); }
    bt.ehp = Math.max(0, bt.ehp - dmg);
    bt.dmg.push({t: `-${dmg}`, x: q.ex, y: q.ey - L.bp.h * .3, life: 1.2, col: P.yellow});
    if (crit) this.msg('かいしんの いちげき!', 1.2);
    if (special) this.msg('ひっさつ!!', 1.2);
    await sl(special ? 1.0 : .6);
  },
  async enemyAttack(sl, dmg, e) {
    const bt = G.bt, q = this.pos();
    await tw(bt, {lunge: 1}, .18, {ease: E.inCubic});
    this.sfxEnemyAtk(); shake = .45; FV.flash = .5; FV.flashCol = '#ff004d';
    bt.pf = 1; tw(bt, {pf: 0}, .4); bt.psh = 1; tw(bt, {psh: 0}, .5);
    burst(q.px, q.py, 30, [P.red, P.white, P.pink], 1, 1);
    bt.php = Math.max(0, bt.php - dmg);
    bt.dmg.push({t: `-${dmg}`, x: q.px, y: q.py - L.bp.h * .3, life: 1.2, col: P.red});
    tw(bt, {lunge: 0}, .3);
    await sl(.8);
  },
  async heal(sl, n) {
    const bt = G.bt, q = this.pos();
    this.sfxHeal();
    for (let i = 0; i < 3; i++) burst(q.px + (Math.random() - .5) * 40, q.py, 15, [P.green, P.white, P.pink], .5, .8);
    bt.php = Math.min(bt.pmax, bt.php + n);
    bt.dmg.push({t: `+${n}`, x: q.px, y: q.py - L.bp.h * .3, life: 1.2, col: P.green});
    this.msg('げんき いっぱい!', 1.2);
    await sl(.9);
  },
  async win(sl, e) {
    const bt = G.bt, q = this.pos();
    bt.phase = 'end'; bt.msg = null;
    for (let i = 0; i < 5; i++) { burst(q.ex + (Math.random() - .5) * 60, q.ey + (Math.random() - .5) * 40, 40, FV.rbs(8), 1.2, 1.1); sfx.boom(); shake = .4; await sl(.18); }
    tw(bt, {dead: 1}, .5);
    await sl(.4);
    sfx.fanfare(); speak(`やったね! ${e.name} を やっつけた!`);
    const key = 'bt_' + bt.kind; SAVE[key] = Math.max(SAVE[key] || 0, bt.lv); SAVE.stars += bt.lv; save();
    bt.result = 'win'; tw(bt, {resA: 1}, .5);
    this.resBtns.forEach((b, i) => { b.vis = true; b.sc = 0; tw(b, {sc: 1}, .4, {delay: .5 + i * .1, ease: E.outBack}); });
  },
  async lose(sl, e) {
    const bt = G.bt;
    bt.phase = 'end'; bt.msg = null;
    this.sfxLose(); speak('まけちゃった… もういちど がんばろう!');
    await sl(.8);
    bt.result = 'lose'; tw(bt, {resA: 1}, .5);
    this.resBtns.forEach((b, i) => { b.vis = i !== 1; b.sc = 0; tw(b, {sc: 1}, .4, {delay: .3 + i * .1, ease: E.outBack}); });
  },

  // ---------- えがく ----------
  drawBar(x, y, w, h, v, max, col) {
    ctx.fillStyle = '#000a'; rrect(x, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = col; if (v > 0) { rrect(x, y, Math.max(h, w * v / max), h, h / 2); ctx.fill(); }
    ctx.strokeStyle = '#fff8'; ctx.lineWidth = 2; rrect(x, y, w, h, h / 2); ctx.stroke();
    jtext(`${v}/${max}`, x + w / 2, y + h / 2, h * .85, P.white);
  },
  drawHearts(x, y, size, v, max, col) {
    const px = size / 7;
    for (let i = 0; i < max; i++) sprite(HEART, x + i * size * 1.15, y, px, {'1': i < v ? col : '#0008'});
  },
  drawPanel() {
    const bt = G.bt, p = L.bp; if (!bt || !p) return;
    const e = this.enemy(bt.lv), q = this.pos();
    ctx.save(); rrect(p.x, p.y, p.w, p.h, 12); ctx.clip();
    const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    g.addColorStop(0, bt.charge ? '#4a0a2a' : '#2a1d5e'); g.addColorStop(.7, '#3b2a6b'); g.addColorStop(.7, '#1a3a2a'); g.addColorStop(1, '#0d2418');
    ctx.fillStyle = g; ctx.fillRect(p.x, p.y, p.w, p.h);
    // じぶん (ピコ)
    const cpx = Math.min(p.h * .5, p.w * .22) / 11, cw = 13 * cpx;
    const sh = Math.sin(T * 50) * bt.psh * cpx * 1.5;
    sprite(G.cat && G.cat.happy > 0 ? SPR.catHappy : SPR.cat, q.px - cw / 2 + sh, q.py - 5.5 * cpx + Math.sin(T * 3) * cpx * .4, cpx, CATPAL);
    if (bt.pf > 0) { ctx.globalAlpha = bt.pf * .7; ctx.fillStyle = P.red; ctx.fillRect(q.px - cw / 2, q.py - 5.5 * cpx, cw, 11 * cpx); ctx.globalAlpha = 1; }
    if (bt.guard > 0) { ctx.globalAlpha = bt.guard; ctx.strokeStyle = P.blue; ctx.lineWidth = cpx * 1.2; ctx.beginPath(); ctx.arc(q.px, q.py, cw * .75, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    // てき
    if (bt.dead < 1) {
      const epx = Math.min(p.h * .62 / e.spr.length, p.w * .3 / e.spr[0].length);
      const ew = e.spr[0].length * epx, eh = e.spr.length * epx;
      const lx = -bt.lunge * p.w * .4, esh = Math.sin(T * 60) * bt.esh * epx * 1.5;
      ctx.save(); ctx.globalAlpha = 1 - bt.dead;
      ctx.translate(q.ex + lx + esh, q.ey + Math.sin(T * 2.5) * epx * .5); ctx.scale(bt.es * (1 - bt.dead * .5), bt.es * (1 + bt.dead));
      if (bt.charge) { ctx.fillStyle = `rgba(255,0,77,${.25 + .15 * Math.sin(T * 10)})`; ctx.beginPath(); ctx.arc(0, 0, ew * .75, 0, Math.PI * 2); ctx.fill(); }
      sprite(e.spr, -ew / 2, -eh / 2, epx, e.pal);
      if (bt.ef > 0) { ctx.globalAlpha = bt.ef; sprite(e.spr, -ew / 2, -eh / 2, epx, {'1': '#fff', '2': '#fff', '3': '#fff', '4': '#fff', '5': '#fff', '6': '#fff'}); }
      ctx.restore();
    }
    // HP
    const hs = Math.min(p.h * .12, p.w * .045);
    if (bt.kind === 'race') {
      this.drawHearts(p.x + 8, p.y + 8, hs, bt.php, bt.pmax, P.red);
      const ew = bt.emax * hs * 1.15;
      this.drawHearts(p.x + p.w - 8 - ew, p.y + 8, hs, bt.ehp, bt.emax, P.orange);
    } else {
      const bw = p.w * .36, bh = Math.max(12, hs * 1.1);
      this.drawBar(p.x + 8, p.y + 8, bw, bh, bt.php, bt.pmax, bt.php <= 3 ? P.red : P.green);
      this.drawBar(p.x + p.w - 8 - bw, p.y + 8, bw, bh, bt.ehp, bt.emax, P.orange);
    }
    jtext(`Lv.${bt.lv} ${e.name}`, p.x + p.w - 8, p.y + 8 + hs * 1.9, Math.min(hs * .95, p.w * .4 / 7), P.white, {align: 'right'});
    // かんがえちゅう ゲージ
    if (bt.kind === 'race' && (bt.thinking || bt.gauge > 0) && bt.phase !== 'end') {
      const gw = p.w * .34, gh = Math.max(8, p.h * .07), gx = q.ex - gw / 2, gy = p.y + p.h * .88;
      ctx.fillStyle = '#000a'; rrect(gx, gy, gw, gh, gh / 2); ctx.fill();
      ctx.fillStyle = bt.gauge > .75 ? (Math.sin(T * 20) > 0 ? P.red : P.orange) : P.orange; rrect(gx, gy, Math.max(gh, gw * bt.gauge), gh, gh / 2); ctx.fill();
      jtext('かんがえちゅう…', q.ex, gy - gh * .9, gh * 1.3, P.white);
    }
    // ひっさつ ゲージ
    if (bt.kind === 'turn') for (let i = 0; i < 3; i++) drawStar(p.x + 8 + hs * .5 + i * hs * 1.2, p.y + 8 + hs * 2.4, hs, i < bt.sp ? P.yellow : '#0008');
    ctx.restore();
    ctx.strokeStyle = bt.charge ? P.red : '#6a5aa0'; ctx.lineWidth = 3; rrect(p.x, p.y, p.w, p.h, 12); ctx.stroke();
    // メッセージ
    if (bt.msg) {
      const m = bt.msg, sz = Math.min(p.h * .15, p.w * .9 / Math.max(6, m.text.length));
      ctx.globalAlpha = Math.min(1, m.life * 4);
      ctx.font = `${Math.round(sz)}px ${FONT}`; const tw0 = ctx.measureText(m.text).width + sz;
      ctx.fillStyle = '#000c'; rrect(p.x + p.w / 2 - tw0 / 2, p.y + p.h - sz * 1.6, tw0, sz * 1.4, sz * .4); ctx.fill();
      jtext(m.text, p.x + p.w / 2, p.y + p.h - sz * .9, sz, P.yellow, {outline: false});
      ctx.globalAlpha = 1;
    }
  },
  drawTop() {
    const bt = G.bt;
    jtext(bt.kind === 'race' ? '⚡ はやおしバトル' : '⚔️ じっくりバトル', L.x0 + L.w / 2, L.y0 + 6 + L.bar / 2, L.bar * .45, P.white, {outline: P.plum});
  },
  drawOverlay() {
    const bt = G.bt; if (!bt) return;
    // てきの マーク
    if (bt.mark && bt.mark.vis) {
      const b = bt.mark, e = this.enemy(bt.lv), px = b.h * .45 / e.spr.length;
      ctx.strokeStyle = P.red; ctx.lineWidth = 5; rrect(b.x - 3, b.y - 3, b.w + 6, b.h + 6, 12); ctx.stroke();
      sprite(e.spr, b.x + b.w - e.spr[0].length * px * .8, b.y - px * e.spr.length * .5, px, e.pal);
    }
    // たま
    for (const pr of bt.proj) {
      const x = pr.x0 + (pr.x1 - pr.x0) * pr.p, y = pr.y0 + (pr.y1 - pr.y0) * pr.p - Math.sin(pr.p * Math.PI) * L.u * .15;
      if (pr.special) {
        ctx.save(); ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) { ctx.strokeStyle = `hsl(${(i * 60 + T * 500) % 360},100%,60%)`; ctx.lineWidth = L.u * .05 * (1 - i / 7); ctx.beginPath(); ctx.moveTo(pr.x0, pr.y0); ctx.lineTo(x, y); ctx.stroke(); }
        ctx.restore();
      }
      drawStar(x, y, L.u * (pr.special ? .12 : .07), pr.special ? FV.rb() : P.yellow);
    }
    for (const d of bt.dmg) { ctx.globalAlpha = Math.min(1, d.life * 3); jtext(d.t, d.x, d.y, L.u * .09, d.col, {outline: '#000'}); ctx.globalAlpha = 1; }
    // どうする?
    if (bt.phase === 'cmd' && L.mat) {
      const m = L.mat, cx = L.portrait ? L.x0 + L.w / 2 : m.x + m.w / 2, aw = L.portrait ? L.w * .92 : m.w * 1.1, sz = Math.min(aw * .16, L.u * .1);
      jtext('どうする?', cx, m.y + m.h * .3, sz, P.white, {outline: P.plum});
      const tips = bt.php <= 4 ? ['HPが すくない!', 'かいふく しよう'] : bt.charge ? ['つよい こうげきが', 'くるぞ! きをつけて'] : bt.sp >= 3 ? ['ひっさつが', 'つかえるよ!'] : ['せいかい すると', '★が たまるよ'];
      tips.forEach((t, k) => jtext(t, cx, m.y + m.h * (.48 + k * .13), Math.min(sz * .55, aw / t.length), P.yellow, {outline: '#000'}));
    }
    // けっか
    if (bt.result) {
      const a = bt.resA, u = L.u, cx = L.x0 + L.w / 2;
      ctx.fillStyle = `rgba(10,14,40,${.72 * a})`; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = a;
      if (bt.result === 'win') {
        FV.rainbowText('やっつけた!', cx, L.y0 + L.h * .22, Math.min(u * .15, L.w * .9 / 6));
        const px = u * .02; sprite(SPR.catHappy, cx - 6.5 * px, L.y0 + L.h * .38 - Math.abs(Math.sin(T * 5)) * u * .04, px, CATPAL);
        jtext(`Lv.${bt.lv} クリア!  ★+${bt.lv}`, cx, L.y0 + L.h * .6, u * .065, P.yellow);
      } else {
        jtext('まけちゃった…', cx, L.y0 + L.h * .25, Math.min(u * .12, L.w * .9 / 7), P.lgray, {outline: P.navy});
        const e = this.enemy(bt.lv), px = u * .25 / e.spr[0].length;
        sprite(e.spr, cx - e.spr[0].length * px / 2, L.y0 + L.h * .36, px, e.pal);
        jtext('もういちど ちょうせん しよう!', cx, L.y0 + L.h * .66, u * .055, P.white);
      }
      ctx.globalAlpha = 1;
      this.resBtns.forEach(drawBtn);
    }
  },
  drawCard(b, name, kind, best) {
    const w = b.w, h = b.h * .91, top = -h / 2;
    const e = this.enemy(kind === 'race' ? 1 : 5), px = h * .4 / e.spr.length;
    sprite(e.spr, w * .22 - e.spr[0].length * px / 2, top + h * .1 + Math.sin(T * 3) * px, px, e.pal);
    ctx.font = `${Math.round(h * .28)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(kind === 'race' ? '⚡' : '⚔️', -w * .22, top + h * .3);
    jtext(name, 0, top + h * .66, Math.min(h * .16, w * .92 / name.length), P.white, {outline: '#000'});
    const lv = SAVE['bt_' + kind];
    if (lv) jtext(`Lv.${lv} まで たおした`, 0, top + h * .87, Math.min(h * .11, w * .9 / 10), P.yellow, {outline: '#000'});
  },
};
