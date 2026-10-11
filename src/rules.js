/* src/rules.js — 纯规则函数：数值、敌人、装备、背包、时间、任务。
 * 不碰 DOM，浏览器和 node 都能跑（tools/test_rules.js 会单测）。公式来源：docs/游戏设计方案_v3.md */
(function (root) {
  "use strict";
  const O = root.Oscar = root.Oscar || {};
  const U = O.U, D = O.DATA;
  const R = {};

  /* ── 运气（1.2）：1-10 点 1:1；11 点起对数衰减，100 点 40% ── */
  R.luckRate = function (L) {
    if (L <= 10) return L / 100;
    const a = 15.76;
    return (10 + a * Math.log(1 + (L - 10) / a)) / 100;
  };

  /* ── 经验与金币（1.4、3.9、3.11） ── */
  R.expNeed = function (lv) { return lv * 100; };
  R.enemyExp = function (type, danger) {
    const t = { small: [5, 5], elite: [20, 50], boss: [100, 100] }[type];
    return t[0] + danger * t[1];
  };
  const GRADE = { D: 1, C: 2, B: 3, A: 4, S: 5 };
  const GRADE_COEF = { D: 20, C: 50, B: 100, A: 400, S: 500 };
  const GRADE_GOLD = { D: 50, C: 100, B: 300, A: 500, S: 1000 };
  R.taskExp = function (danger, grade) { return (danger + 1) * GRADE_COEF[grade]; };
  R.taskGold = function (grade) { return GRADE_GOLD[grade]; };
  R.enemyGold = function (type) {
    const r = { small: [1, 2], elite: [5, 10], boss: [100, 200] }[type];
    return U.int(r[0], r[1]);
  };
  R.enemyLevel = function (danger, grade) { return 5 * (danger - 1) + GRADE[grade]; };
  R.difficultyLabel = function (playerLv, enemyLv) {
    const d = playerLv - enemyLv;
    if (d >= 4) return "轻松应付";
    if (d <= -4) return "满地找牙";
    return "旗鼓相当";
  };
  R.yearOfDanger = function (danger) { return danger <= 5 ? 2 : danger <= 10 ? 3 : 4; };
  R.hardOfDanger = function (danger) { return danger >= 16; };

  /* ── 敌人（1.11） ── */
  const BASE = { small: { s: 1, i: 1, v: [3, 5], g: [2, 3] }, elite: { s: 2, i: 2, v: [4, 8], g: [4, 5] }, boss: { s: 3, i: 3, v: [10, 20], g: [6, 8] } };
  R.makeEnemy = function (type, speciesId, level) {
    const b = BASE[type], sp = D.species[speciesId];
    const st = { str: b.s, int: b.i, vit: U.int(b.v[0], b.v[1]) };
    for (let n = 0; n < level; n++) {
      const pts = U.int(b.g[0], b.g[1]);
      const share = U.float(0.5, 0.6);
      const main = Math.round(pts * share);
      st[sp.main] += main;
      const others = ["str", "int", "vit"].filter(function (k) { return k !== sp.main; });
      for (let k = 0; k < pts - main; k++) st[U.pick(others)] += 1;
    }
    let atk;
    if (sp.main === "str") atk = st.str + st.int * 0.2;
    else if (sp.main === "int") atk = st.str * 0.2 + st.int;
    else atk = st.str * 0.5 + st.int * 0.5;
    atk = Math.round(atk);
    return { type: type, species: speciesId, name: sp.name, lv: level, str: st.str, int: st.int, vit: st.vit, atk: atk, hp: st.vit, maxHp: st.vit, weak: sp.weak };
  };

  /* ── 玩家 ── */
  R.EQUIP_SLOTS = ["head", "chest", "legs", "feet", "hands", "neck", "ring1", "ring2", "ring3", "ring4", "ring5"];
  const SLOT_NAME = { head: "头盔", chest: "胸甲", legs: "护腿", feet: "靴子", hands: "手套", neck: "项链" };
  R.slotType = function (slot) { return slot.indexOf("ring") === 0 ? "ring" : slot; };
  R.slotLabel = function (slot) {
    if (slot.indexOf("ring") === 0) return "戒指（第" + slot.slice(4) + "指）";
    return SLOT_NAME[slot];
  };

  R.newPlayer = function (raceId) {
    const r = D.races[raceId];
    const p = {
      race: raceId, name: r.en, lv: 1, exp: 0, free: 0,
      base: { str: 5, int: raceId === "cat" ? 10 : 5, vit: 10, luck: 1 },
      hp: 10, gold: 0, lives: 1,
      equip: {}, bag: [],
      used: { roll: false, sniff: false },
      math: { tier: 1, ok: 0, bad: 0 },
      memory: { typeDeaths: {}, deaths: [] },
      known: { species: {}, bossWeak: {} }
    };
    p.hp = R.maxHp(p);
    return p;
  };
  R.totals = function (p) {
    const t = { str: p.base.str, int: p.base.int, vit: p.base.vit, luck: p.base.luck };
    Object.keys(p.equip).forEach(function (s) {
      const it = p.equip[s];
      if (it) { t.str += it.stats.str; t.int += it.stats.int; t.vit += it.stats.vit; }
    });
    return t;
  };
  R.maxHp = function (p) { return R.totals(p).vit; };
  R.gainExp = function (p, amount) {
    p.exp += amount;
    let n = 0;
    while (p.lv < 999 && p.exp >= R.expNeed(p.lv)) {
      p.exp -= R.expNeed(p.lv);
      p.lv += 1; p.free += 5; n += 1;
    }
    return n;
  };
  R.spendPoint = function (p, key) {
    if (p.free <= 0 || !(key in p.base)) return false;
    p.base[key] += 1; p.free -= 1;
    return true;
  };

  /* ── 战斗（1.3） ── */
  R.attackPower = function (p, atkType) {
    const t = R.totals(p);
    return atkType === "magic" ? t.int : t.str;
  };
  R.hitsWeak = function (enemy, atkType) {
    return (enemy.weak === "magic" && atkType === "magic") || (enemy.weak === "phys" && atkType === "phys");
  };
  R.playerDamage = function (p, atkType, enemy, quick) {
    let m = 1;
    if (R.hitsWeak(enemy, atkType)) m *= 1.5;
    if (quick) m *= 2;
    return Math.round(R.attackPower(p, atkType) * m);
  };
  R.rollDamage = function (p) { return R.totals(p).str * 3; };
  R.incoming = function (p, raw) {
    const cut = p.race === "bear" ? 2 : 0;
    return Math.max(0, raw - cut);
  };
  R.pctDamage = function (p, pct) { return R.incoming(p, Math.round(R.maxHp(p) * pct / 100)); };
  R.luckSave = function (p) { return U.chance(R.luckRate(R.totals(p).luck)); };
  R.heal = function (p, frac) {
    const max = R.maxHp(p);
    const before = p.hp;
    p.hp = Math.min(max, p.hp + Math.max(1, Math.round(max * frac)));
    return p.hp - before;
  };
  R.weakWindow = function (p, baseSec) {
    const total = baseSec + (p.race === "parrot" ? 5 : 0);
    return { total: total, quick: total / 2 };
  };
  R.baseSeconds = function (year) { return year === 2 ? 13 : year === 3 ? 23 : 42; };

  /* ── 装备（1.9） ── */
  const QNAME = { white: "白色", blue: "蓝色", yellow: "黄色" };
  const QRANK = { white: 1, blue: 2, yellow: 3 };
  R.qualityName = function (q) { return QNAME[q]; };
  R.qualityRank = function (q) { return QRANK[q]; };
  R.rollQuality = function (pairs) { return U.weighted(pairs); };
  R.CAMP_QUALITY = [["white", 70], ["blue", 25], ["yellow", 5]];
  R.equipPoints = function (q, danger) {
    if (q === "white") return danger + U.int(0, 5);
    if (q === "blue") return Math.round(danger * U.float(1.5, 2) + 5);
    return Math.round(danger * U.float(3, 4) + 10);
  };
  R.pickSlot = function (p, q) {
    const slots = R.EQUIP_SLOTS;
    const rank = function (s) { return p.equip[s] ? QRANK[p.equip[s].q] : 0; };
    let cand, prob;
    if (q === "white") { cand = slots.filter(function (s) { return rank(s) === 0; }); prob = 0.5; }
    else { cand = slots.filter(function (s) { return rank(s) < QRANK[q]; }); prob = 0.6; }
    if (cand.length && U.chance(prob)) return U.pick(cand);
    return U.pick(slots);
  };
  R.makeEquip = function (p, q, danger, slotOpt) {
    const slot = slotOpt || R.pickSlot(p, q);
    const pts = Math.max(1, R.equipPoints(q, danger));
    const st = { str: 0, int: 0, vit: 0 };
    for (let k = 0; k < pts; k++) st[U.pick(["str", "int", "vit"])] += 1;
    const affix = q === "white" ? [] : q === "blue" ? ["词条（待定）"] : ["词条（待定）", "词条（待定）"];
    return { uid: U.uid(), kind: "equip", slot: slot, q: q, pts: pts, stats: st, affix: affix,
             name: QNAME[q] + (R.slotType(slot) === "ring" ? "戒指" : SLOT_NAME[slot]) };
  };
  R.sellPrice = function (it) { return { white: 5, blue: 20, yellow: 100 }[it.q]; };

  /* ── 背包（3.12）：默认 100 格，血瓶堆叠 ── */
  R.BAG_SIZE = 100;
  R.POTIONS = { small: { name: "小血瓶", frac: 0.10, price: 10 }, mid: { name: "中血瓶", frac: 0.30, price: 50 } };
  R.potionCount = function (p, id) {
    const e = p.bag.find(function (b) { return b.kind === "potion" && b.id === id; });
    return e ? e.n : 0;
  };
  R.canAdd = function (p, item) {
    if (item.kind === "potion" && p.bag.some(function (b) { return b.kind === "potion" && b.id === item.id; })) return true;
    return p.bag.length < R.BAG_SIZE;
  };
  R.addItem = function (p, item) {
    if (!R.canAdd(p, item)) return false;
    if (item.kind === "potion") {
      const e = p.bag.find(function (b) { return b.kind === "potion" && b.id === item.id; });
      if (e) { e.n += item.n || 1; return true; }
      p.bag.push({ kind: "potion", id: item.id, n: item.n || 1 });
      return true;
    }
    p.bag.push(item);
    return true;
  };
  R.removePotion = function (p, id) {
    const i = p.bag.findIndex(function (b) { return b.kind === "potion" && b.id === id; });
    if (i < 0) return false;
    p.bag[i].n -= 1;
    if (p.bag[i].n <= 0) p.bag.splice(i, 1);
    return true;
  };
  R.removeByUid = function (p, uid) {
    const i = p.bag.findIndex(function (b) { return b.uid === uid; });
    return i < 0 ? null : p.bag.splice(i, 1)[0];
  };
  R.equipItem = function (p, uid) {
    const it = R.removeByUid(p, uid);
    if (!it || it.kind !== "equip") return false;
    const old = p.equip[it.slot];
    p.equip[it.slot] = it;
    if (old) p.bag.push(old);
    p.hp = Math.min(p.hp, R.maxHp(p));
    return true;
  };
  R.unequip = function (p, slot) {
    const it = p.equip[slot];
    if (!it || p.bag.length >= R.BAG_SIZE) return false;
    delete p.equip[slot];
    p.bag.push(it);
    p.hp = Math.min(p.hp, R.maxHp(p));
    return true;
  };
  R.sellItem = function (p, uid) {
    const it = p.bag.find(function (b) { return b.uid === uid && b.kind === "equip"; });
    if (!it) return 0;
    R.removeByUid(p, uid);
    const g = R.sellPrice(it);
    p.gold += g;
    return g;
  };

  /* ── 时间（2.5）：分钟计，第 0 天 0:00 起算，新游戏 6:00 ── */
  R.START_TIME = 360;
  R.nextSix = function (t) {
    const six = Math.floor(t / 1440) * 1440 + 360;
    return t < six ? six : six + 1440;
  };
  R.refreshIndex = function (t) { return Math.floor((t - 360) / 1440); };
  R.clock = function (t) {
    const m = ((t % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
  };
  R.HOTEL = { cheap: { cost: 1, frac: 0.2 }, full: { cost: 5, frac: 1 } };

  /* ── 任务板（3.9） ── */
  const TITLES = {
    D: ["谷仓里的怪叫声", "农场的夜半怪声"],
    C: ["谷仓里的黑影", "农场夜里的响动"],
    B: ["谷仓顶上的异响", "老山羊的烦心事"],
    A: ["农场的怪事", "谷仓的秘密"],
    S: ["赏金：谷仓里的大家伙"]
  };
  R.newWorld = function () {
    const w = { time: R.START_TIME, danger: 1, done: 0, boardIdx: 0, stock: 5, tasks: [], taskSeq: 0 };
    R.refreshBoard(w);
    return w;
  };
  R.genOpenTasks = function (w) {
    let c;
    do {
      c = { D: U.int(1, 2), C: U.int(2, 3), B: U.int(1, 2), A: U.int(0, 1) };
    } while (c.D + c.C + c.B + c.A < 6 || c.D + c.C + c.B + c.A > 8);
    const out = [];
    ["D", "C", "B", "A"].forEach(function (g) {
      for (let i = 0; i < c[g]; i++) out.push(R.makeTask(w, g));
    });
    return out;
  };
  R.makeTask = function (w, grade) {
    w.taskSeq += 1;
    return { id: "t" + w.taskSeq, grade: grade, danger: w.danger, enemyLv: R.enemyLevel(w.danger, grade),
             title: U.pick(TITLES[grade]), dungeon: "farm", state: "open",
             gold: R.taskGold(grade), exp: R.taskExp(w.danger, grade), run: null };
  };
  // 刷新：已接取的保留，S 级未完成的保留，其余换新
  R.refreshBoard = function (w) {
    const keep = w.tasks.filter(function (t) { return t.state !== "open" || t.grade === "S"; });
    w.tasks = keep.concat(R.genOpenTasks(w));
    R.ensureS(w);
    w.stock = 5;
  };
  R.ensureS = function (w) {
    if (w.done >= 10 && !w.tasks.some(function (t) { return t.grade === "S"; })) w.tasks.push(R.makeTask(w, "S"));
  };
  // 时间推进后检查是否跨过新的 6:00；回退后不会重复刷新（只在索引超过历史最大值时刷新）
  R.advanceTo = function (w, t) {
    w.time = t;
    const idx = R.refreshIndex(t);
    if (idx > w.boardIdx) { w.boardIdx = idx; R.refreshBoard(w); return true; }
    return false;
  };
  R.acceptedCount = function (w) {
    return w.tasks.filter(function (t) { return t.state === "accepted" || t.state === "ready"; }).length;
  };
  // 提交 S 级：进入下一危险等级，计数清零，未完成任务失效，立即发新一批
  R.submitTask = function (w, p, t) {
    const lvUp = R.gainExp(p, t.exp);
    p.gold += t.gold;
    w.tasks = w.tasks.filter(function (x) { return x.id !== t.id; });
    let nextDanger = false;
    if (t.grade === "S") {
      if (w.danger < 20) w.danger += 1;
      w.done = 0;
      w.tasks = [];
      R.refreshBoard(w);
      nextDanger = true;
    } else {
      w.done += 1;
      R.ensureS(w);
    }
    return { levels: lvUp, nextDanger: nextDanger };
  };

  O.R = R;
})(typeof window !== "undefined" ? window : globalThis);