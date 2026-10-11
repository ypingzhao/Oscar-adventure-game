/* src/dungeon.js — 地下城流程：事件推进、战斗、谜题、机关陷阱、营地、死亡、通关。
 * 只管状态，界面由 ui.js 根据 O.G.ev 画。 */
(function (root) {
  "use strict";
  const O = root.Oscar = root.Oscar || {};
  const U = O.U, R = O.R, M = O.M, S = O.S, G = O.G;
  const D = {};

  function ui() { return O.UI; }
  function render() { if (O.UI) O.UI.render(); }
  function toast(t) { if (O.UI) O.UI.toast(t); }
  function def() { return O.DATA.dungeons[G.task.dungeon]; }
  function evDef() { return def().events[G.ev.idx]; }
  function itemText(it) { return it.name + "（" + R.slotLabel(it.slot) + "，力" + it.stats.str + " 智" + it.stats.int + " 体" + it.stats.vit + "）"; }
  D.itemText = itemText;

  /* ── 进入与恢复 ── */
  D.enter = function (task) {
    G.task = task;
    if (!task.run) task.run = { idx: 0, done: {}, camp: {}, trap: {}, gains: { gold: 0, items: [] }, entry: G.w.time };
    task.run.entry = G.w.time;
    task.run.gains = { gold: 0, items: [] };
    G.wrong = [];
    G.screen = "dungeon";
    S.save();
    D.start();
  };
  D.resume = function (task) {
    G.task = task; G.wrong = []; G.screen = "dungeon";
    D.start();
  };

  /* ── 事件开始 ── */
  D.start = function () {
    const run = G.task.run, d = def().events[run.idx];
    const ev = G.ev = { idx: run.idx, phase: "", locked: false, fb: "", note: "", after: "", q: null, picked: -1, dead: {}, enemies: null, target: 0,
                        atk: "phys", timerEnd: 0, quickEnd: 0, total: 0, pausedAt: 0, hint: null, timedOut: false, chosen: -1 };
    if (d.type !== "camp" && run.done[ev.idx]) { ev.phase = "skip"; render(); return; }
    if (d.type === "branch") ev.phase = "choose";
    else if (d.type === "camp") ev.phase = "camp";
    else {
      ev.phase = "q";
      if (d.type === "trap") {
        if (run.trap[ev.idx] === undefined) run.trap[ev.idx] = U.int(d.pct[0], d.pct[1]);
      }
      if (d.type === "battle") {
        const n = U.int(d.count[0], d.count[1]);
        ev.enemies = [];
        for (let i = 0; i < n; i++) {
          const e = R.makeEnemy(d.enemy, d.species, G.task.enemyLv);
          e.name = d.label + (n > 1 ? " " + (i + 1) : "");
          ev.enemies.push(e);
        }
        const t = R.totals(G.p);
        ev.atk = t.int > t.str ? "magic" : "phys";
      }
      newQ();
    }
    render();
  };

  function startTimer() {
    const ev = G.ev, year = R.yearOfDanger(G.task.danger);
    const w = R.weakWindow(G.p, R.baseSeconds(year));
    const now = Date.now();
    ev.total = w.total * 1000; ev.timerEnd = now + ev.total; ev.quickEnd = now + w.quick * 1000; ev.pausedAt = 0;
  }
  function newQ() {
    const ev = G.ev, p = G.p, year = R.yearOfDanger(G.task.danger);
    const weak = M.typesOfYear(year).filter(function (t) { return (p.memory.typeDeaths[t] || 0) > 0; });
    const force = weak.length && U.chance(0.5) ? U.pick(weak) : null;
    ev.q = M.make(year, p.math.tier, force);
    ev.locked = false; ev.picked = -1; ev.fb = ""; ev.after = ""; ev.dead = {}; ev.timedOut = false;
    ev.hint = M.hintFor(p, ev.q);
    startTimer();
  }

  /* ── 计时 ── */
  D.pause = function () { const ev = G.ev; if (ev && ev.q && !ev.locked && !ev.pausedAt) ev.pausedAt = Date.now(); };
  D.resumeTimer = function () {
    const ev = G.ev;
    if (ev && ev.pausedAt) { const d = Date.now() - ev.pausedAt; ev.timerEnd += d; ev.quickEnd += d; ev.pausedAt = 0; }
  };
  D.tick = function () {
    const ev = G.ev;
    if (G.screen !== "dungeon" || !ev || !ev.q || ev.locked || ev.pausedAt) return;
    const left = ev.timerEnd - Date.now();
    const bar = typeof document !== "undefined" ? document.getElementById("tbar") : null;
    if (bar) {
      bar.style.width = Math.max(0, Math.min(100, left / ev.total * 100)) + "%";
      bar.className = "tbar" + (Date.now() <= ev.quickEnd ? " quick" : "");
    }
    const sec = typeof document !== "undefined" ? document.getElementById("tsec") : null;
    if (sec) sec.textContent = Math.max(0, Math.ceil(left / 1000)) + " 秒";
    if (left <= 0) D.timeout();
  };

  /* ── 答题 ── */
  D.answer = function (i) {
    const ev = G.ev;
    if (!ev || ev.locked || !ev.q || ev.dead[i]) return;
    resolve(i, false);
  };
  D.timeout = function () {
    const ev = G.ev;
    if (!ev || ev.locked || !ev.q) return;
    const wrongs = [0, 1, 2, 3].filter(function (i) { return i !== ev.q.answer && !ev.dead[i]; });
    resolve(U.pick(wrongs), true);
  };
  function resolve(i, timedOut) {
    const ev = G.ev, q = ev.q, ok = i === q.answer, d = evDef();
    const quick = Date.now() <= ev.quickEnd && !timedOut;
    ev.locked = true; ev.picked = i; ev.timedOut = timedOut;
    M.adapt(G.p.math, ok);
    if (!ok) G.wrong.push({ stem: q.stem, mine: timedOut ? null : q.options[i], right: q.options[q.answer], type: q.type, name: q.name, steps: q.hint2 });
    if (d.type === "battle") battleResult(ok, quick, timedOut);
    else if (d.type === "riddle") riddleResult(ok);
    else trapResult(ok, timedOut);
    render();
  }

  function weakText(e) { return O.DATA.weakName[e.weak]; }
  function hit(t, dmg) {
    const ev = G.ev, p = G.p;
    t.hp = Math.max(0, t.hp - dmg);
    let s = "";
    if (t.hp <= 0) {
      const exp = R.enemyExp(t.type, G.task.danger), gold = R.enemyGold(t.type);
      const lv = R.gainExp(p, exp);
      p.gold += gold; G.task.run.gains.gold += gold;
      s += " " + t.name + "被打倒了！得到 " + exp + " 经验、" + gold + " 金币。";
      if (lv > 0) s += " 升到 " + p.lv + " 级了，得到 " + (lv * 5) + " 点属性点！";
    }
    const alive = ev.enemies.filter(function (e) { return e.hp > 0; });
    if (!alive.length) ev.after = evDef().enemy === "boss" ? "clear" : "victory";
    else { ev.target = ev.enemies.indexOf(alive[0]); ev.after = "next"; }
    return s;
  }
  function battleResult(ok, quick, timedOut) {
    const ev = G.ev, p = G.p, t = ev.enemies[ev.target];
    if (ok) {
      const dmg = R.playerDamage(p, ev.atk, t, quick), weak = R.hitsWeak(t, ev.atk);
      let msg = "答对了！";
      if (quick) msg += "反应很快，伤害翻倍！";
      if (weak) { msg += "打中了弱点（" + weakText(t) + "），伤害 ×1.5！"; p.known.species[t.species] = t.weak; }
      msg += t.name + "受到 " + dmg + " 点伤害。";
      ev.fb = msg + hit(t, dmg);
    } else if (R.luckSave(p)) {
      ev.dead[ev.picked] = true; ev.after = "retry";
      ev.fb = (timedOut ? "时间到了。" : "答错了。") + "但运气好，没有受伤，再试一次！";
    } else {
      const dmg = R.incoming(p, t.atk);
      p.hp = Math.max(0, p.hp - dmg);
      ev.fb = (timedOut ? "时间到了！" : "答错了。") + t.name + "攻击你，受到 " + dmg + " 点伤害。";
      ev.after = p.hp <= 0 ? "die" : "next";
    }
  }
  function riddleResult(ok) {
    const ev = G.ev, p = G.p, d = evDef();
    if (!ok) { ev.fb = "答错了，没有惩罚。换一道再想想。"; ev.after = "next"; return; }
    let msg = "答对了！" + d.reveal.text;
    if (d.reveal.kind === "weak") p.known.bossWeak[G.task.dungeon] = def().bossWeak;
    else {
      const it = { kind: "story", uid: U.uid(), task: G.task.id, id: d.reveal.item.id, name: d.reveal.item.name, desc: d.reveal.item.desc };
      if (R.addItem(p, it)) G.task.run.gains.items.push(it.uid);
      else msg += "（背包满了，没拿到）";
    }
    ev.fb = msg; ev.after = "finish";
  }
  function trapResult(ok, timedOut) {
    const ev = G.ev, p = G.p, pct = G.task.run.trap[ev.idx];
    if (ok) { ev.fb = "答对了！机关打开，门开了。"; ev.after = "finish"; return; }
    if (R.luckSave(p)) { ev.dead[ev.picked] = true; ev.after = "retry"; ev.fb = "答错了，但运气好，机关没有伤到你，再试一次！"; return; }
    const dmg = R.pctDamage(p, pct);
    p.hp = Math.max(0, p.hp - dmg);
    ev.fb = (timedOut ? "时间到了！" : "答错了。") + "机关弹了出来，受到 " + dmg + " 点伤害。门还是开了。";
    ev.after = p.hp <= 0 ? "die" : "finish";
  }

  /* ── 继续按钮 ── */
  D.cont = function () {
    const ev = G.ev;
    if (!ev) return;
    const a = ev.after;
    if (a === "next") newQ();
    else if (a === "retry") { ev.locked = false; ev.picked = -1; ev.fb = ""; ev.after = ""; ev.timedOut = false; startTimer(); }
    else if (a === "victory" || a === "finish") { finish(); return; }
    else if (a === "clear") { clearDungeon(); return; }
    else if (a === "die") { die(); return; }
    render();
  };
  function finish() {
    const run = G.task.run;
    run.done[run.idx] = true; run.idx += 1;
    S.save();
    D.start();
  }

  /* ── 分支路线、营地 ── */
  D.pick = function (i) {
    const ev = G.ev, d = evDef();
    ev.chosen = i; ev.phase = "result"; ev.fb = d.choices[i].result; ev.after = "finish";
    render();
  };
  function giveEquip() {
    const p = G.p, run = G.task.run;
    const q = R.rollQuality(R.CAMP_QUALITY), it = R.makeEquip(p, q, G.task.danger);
    let msg;
    if (R.addItem(p, it)) { run.gains.items.push(it.uid); msg = "得到 " + itemText(it) + "，放进了背包。"; }
    else msg = "背包满了，" + it.name + "被丢掉了。";
    if (p.race === "dog" && !p.used.sniff && U.chance(0.1)) {
      p.used.sniff = true;
      const ex = R.makeEquip(p, "white", G.task.danger);
      if (R.addItem(p, ex)) { run.gains.items.push(ex.uid); msg += " 狗的嗅觉发动，又找到 " + itemText(ex) + "！"; }
      else msg += " 狗的嗅觉发动，但背包满了。";
    }
    return msg;
  }
  D.camp = function (kind) {
    const ev = G.ev, run = G.task.run;
    if (run.camp[kind]) return;
    run.camp[kind] = true;
    if (kind === "heal") { const h = R.heal(G.p, 0.3); ev.fb = "歇了一会儿，回复了 " + h + " 点血量。"; }
    else if (kind === "equip") ev.fb = giveEquip();
    else { D.leave(); return; }
    ev.phase = "campmsg"; ev.after = "finish";
    render();
  };
  D.campSkip = function () { finish(); };
  D.leave = function () {
    const run = G.task.run;
    run.idx = 0; run.gains = { gold: 0, items: [] };
    const refreshed = R.advanceTo(G.w, G.w.time + 720);
    G.screen = "town"; G.ev = null; G.townPos = null;
    S.save();
    render();
    toast("离开了地下城。游戏时间过去了 12 小时，任务还在，进度重置。" + (refreshed ? "任务板和商人刷新了。" : ""));
  };

  /* ── 战斗中的操作 ── */
  D.setAtk = function (t) { if (G.ev && G.ev.enemies) { G.ev.atk = t; render(); } };
  D.target = function (i) { const ev = G.ev; if (ev && ev.enemies && ev.enemies[i] && ev.enemies[i].hp > 0 && !ev.locked) { ev.target = i; render(); } };
  function directHit(dmg, label) {
    const ev = G.ev, t = ev.enemies[ev.target];
    const s = label + "，" + t.name + "受到 " + dmg + " 点伤害。" + hit(t, dmg);
    if (ev.after === "clear" || ev.after === "victory") { ev.locked = true; ev.fb = s; }
    else ev.note = s;
    render();
  }
  D.canRoll = function () { return !!(G.ev && G.ev.enemies && !G.ev.locked && G.p.race === "crocodile" && !G.p.used.roll); };
  D.roll = function () {
    if (!D.canRoll()) return;
    G.p.used.roll = true;
    directHit(R.rollDamage(G.p), "你用出了死亡翻滚");
  };
  D.useStory = function (uid) {
    const ev = G.ev;
    if (!ev || !ev.enemies || ev.locked || evDef().enemy !== "boss") return;
    const it = G.p.bag.find(function (b) { return b.uid === uid; });
    if (!it || it.id !== "calm") return;
    R.removeByUid(G.p, uid);
    const t = ev.enemies[ev.target];
    directHit(Math.round(t.maxHp * 0.5), "你用了" + it.name);
  };
  D.weakLabel = function (e) {
    if (G.p.known.species[e.species]) return O.DATA.weakName[G.p.known.species[e.species]];
    if (e.type === "boss" && G.p.known.bossWeak[G.task.dungeon]) return O.DATA.weakName[G.p.known.bossWeak[G.task.dungeon]];
    return "？";
  };

  // 故事道具：对 BOSS 使用后消耗；营地主动离开时保留；通关、死亡、放弃任务后失效（v3 的 3.4）
  D.dropStory = function (taskId) {
    G.p.bag = G.p.bag.filter(function (b) { return !(b.kind === "story" && b.task === taskId); });
  };

  /* ── 通关 ── */
  function clearDungeon() {
    const t = G.task, run = t.run, d = def();
    t.state = "ready"; t.run = null;
    D.dropStory(t.id);
    const refreshed = R.advanceTo(G.w, G.w.time + 720);
    G.clearInfo = { title: d.title, epilogue: d.epilogue, gold: run.gains.gold, refreshed: refreshed };
    G.screen = "clear"; G.ev = null; G.townPos = null;
    S.save();
    render();
  }

  /* ── 死亡与重生 ── */
  function die() {
    const p = G.p, run = G.task.run;
    const types = {};
    G.wrong.forEach(function (w) { types[w.type] = true; });
    Object.keys(types).forEach(function (k) { p.memory.typeDeaths[k] = (p.memory.typeDeaths[k] || 0) + 1; });
    p.memory.deaths.push({ task: G.task.title, time: G.w.time });
    p.gold = Math.max(0, p.gold - run.gains.gold);
    run.gains.items.forEach(function (uid) {
      if (!R.removeByUid(p, uid)) Object.keys(p.equip).forEach(function (s) { if (p.equip[s] && p.equip[s].uid === uid) delete p.equip[s]; });
    });
    G.w.time = run.entry;
    D.dropStory(G.task.id);
    G.task.run = null;
    p.lives += 1;
    p.hp = Math.max(1, Math.round(R.maxHp(p) * 0.1));
    let gift = false;
    if (p.gold <= 0) { p.gold = 10; gift = true; }
    G.deathInfo = { wrong: G.wrong.slice(), gift: gift, task: G.task.title };
    G.screen = "death"; G.ev = null; G.townPos = "grave";
    S.save();
    render();
  }

  /* ── 面包屑 ── */
  D.crumbs = function () {
    const run = G.task.run, evs = def().events;
    return evs.map(function (e, i) {
      return { title: e.title, state: i === G.ev.idx ? "cur" : (run.done[i] ? "done" : "todo") };
    });
  };

  O.Dun = D;
})(typeof window !== "undefined" ? window : globalThis);