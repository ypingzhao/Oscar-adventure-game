// tools/test_rules.js — 规则与数学题单测。运行：node tools/test_rules.js
global.window = undefined;
["../src/util.js", "../data/races.js", "../data/enemies.js", "../data/dungeons.js", "../src/rules.js", "../src/math.js"].forEach(function (f) { require(f); });
const O = globalThis.Oscar, R = O.R, M = O.M, U = O.U;
let fail = 0, total = 0;
function ok(name, cond, extra) {
  total++;
  if (!cond) { fail++; console.log("  FAIL  " + name + (extra ? "  " + extra : "")); }
}

// 运气曲线：1-10 点 1:1，100 点 40%
ok("运气 1 点 = 1%", Math.abs(R.luckRate(1) - 0.01) < 1e-9);
ok("运气 10 点 = 10%", Math.abs(R.luckRate(10) - 0.10) < 1e-9);
ok("运气 100 点 = 40%", Math.abs(R.luckRate(100) - 0.40) < 1e-3);
ok("运气单调递增", R.luckRate(50) > R.luckRate(20) && R.luckRate(20) > R.luckRate(11));

// 经验与金币
ok("Lv3 小怪经验 20", R.enemyExp("small", 3) === 20);
ok("Lv1 C 级任务经验 100", R.taskExp(1, "C") === 100);
ok("Lv3 S 级任务经验 2000", R.taskExp(3, "S") === 2000);
ok("升到下一级需要 等级×100", R.expNeed(7) === 700);
ok("敌人等级 Lv2 B 级 = 8", R.enemyLevel(2, "B") === 8);
ok("敌人等级 Lv20 S 级 = 100", R.enemyLevel(20, "S") === 100);
ok("难度标签 高 4 级 = 轻松应付", R.difficultyLabel(9, 5) === "轻松应付");
ok("难度标签 差 3 级 = 旗鼓相当", R.difficultyLabel(8, 5) === "旗鼓相当");
ok("难度标签 低 4 级 = 满地找牙", R.difficultyLabel(1, 5) === "满地找牙");

// 敌人生成
for (let i = 0; i < 300; i++) {
  const lv = U.int(1, 100);
  [["small", 3, 5, 2, 3], ["elite", 4, 8, 4, 5], ["boss", 10, 20, 6, 8]].forEach(function (c) {
    const e = R.makeEnemy(c[0], "goblin", lv);
    const extra = e.str + e.int + e.vit - (c[0] === "small" ? 2 : c[0] === "elite" ? 4 : 6) - 0;
    const baseVit = e.vit;
    ok("敌人 " + c[0] + " 体力下限", baseVit >= c[1], "vit=" + baseVit);
    ok("敌人 " + c[0] + " 力量智力不同时为 0", e.str > 0 || e.int > 0);
    ok("敌人 " + c[0] + " 攻击力 >= 1", e.atk >= 1);
  });
}
const gob = R.makeEnemy("small", "goblin", 10);
ok("哥布林 弱魔法", gob.weak === "magic");
ok("史莱姆 主加体力", O.DATA.species.slime.main === "vit");

// 玩家
const bear = R.newPlayer("bear"), cat = R.newPlayer("cat"), dog = R.newPlayer("dog");
ok("Lv1 体力 10 = HP 10", R.maxHp(bear) === 10 && bear.hp === 10);
ok("猫智力 10", R.totals(cat).int === 10);
ok("其他种族智力 5", R.totals(dog).int === 5);
ok("熊受伤 -2", R.incoming(bear, 5) === 3);
ok("熊受伤最低扣 0", R.incoming(bear, 1) === 0);
ok("非熊不减伤", R.incoming(dog, 5) === 5);
ok("鳄鱼翻滚 力量×3 = 15", R.rollDamage(R.newPlayer("crocodile")) === 15);
ok("鹦鹉 +5 秒", R.weakWindow(R.newPlayer("parrot"), 13).total === 18);
ok("弱点窗口为一半", R.weakWindow(dog, 13).quick === 6.5);

// 伤害：克制 x1.5，倒计时 x2，叠加 x3
const wEn = { weak: "magic" };
const strong = R.newPlayer("dog"); strong.base.int = 10;
ok("克制伤害 x1.5", R.playerDamage(strong, "magic", wEn, false) === 15);
ok("倒计时 x2", R.playerDamage(strong, "phys", wEn, true) === 10);
ok("克制加倒计时 x3", R.playerDamage(strong, "magic", wEn, true) === 30);
ok("猜错弱点没有加成", R.playerDamage(strong, "phys", wEn, false) === 5);

// 升级：等级×100，每级 5 点
const lvp = R.newPlayer("dog");
const n = R.gainExp(lvp, 100);
ok("100 经验升 1 级", n === 1 && lvp.lv === 2 && lvp.free === 5 && lvp.exp === 0);
R.gainExp(lvp, 250);
ok("再 250 经验升到 3 级剩 50", lvp.lv === 3 && lvp.exp === 50 && lvp.free === 10);
ok("加点", R.spendPoint(lvp, "vit") && lvp.base.vit === 11 && lvp.free === 9);

// 装备
for (let i = 0; i < 200; i++) {
  const lv = U.int(1, 20), pl = R.newPlayer("dog");
  const w = R.makeEquip(pl, "white", lv), b = R.makeEquip(pl, "blue", lv), y = R.makeEquip(pl, "yellow", lv);
  ok("白装备属性点 Lv 到 Lv+5", w.pts >= Math.max(1, lv) && w.pts <= lv + 5, "lv=" + lv + " pts=" + w.pts);
  ok("蓝装备属性点范围", b.pts >= Math.round(lv * 1.5 + 5) && b.pts <= Math.round(lv * 2 + 5), "lv=" + lv + " pts=" + b.pts);
  ok("黄装备属性点范围", y.pts >= Math.round(lv * 3 + 10) && y.pts <= Math.round(lv * 4 + 10));
  ok("装备属性点总和", w.stats.str + w.stats.int + w.stats.vit === w.pts);
  ok("词条数量 0/1/2", w.affix.length === 0 && b.affix.length === 1 && y.affix.length === 2);
  ok("部位合法", R.EQUIP_SLOTS.indexOf(w.slot) >= 0);
}
ok("卖价为黑市 1/10", R.sellPrice({ q: "white" }) === 5 && R.sellPrice({ q: "blue" }) === 20 && R.sellPrice({ q: "yellow" }) === 100);
const ep = R.newPlayer("dog"), item = R.makeEquip(ep, "blue", 5, "head");
R.addItem(ep, item);
ok("穿上装备", R.equipItem(ep, item.uid) && ep.equip.head && ep.bag.length === 0);
ok("装备增加体力上限", R.maxHp(ep) === 10 + item.stats.vit);
ok("脱下装备", R.unequip(ep, "head") && !ep.equip.head && ep.bag.length === 1);

// 背包：100 格，血瓶叠加，满了不能买但能叠
const bp = R.newPlayer("dog");
for (let i = 0; i < 99; i++) R.addItem(bp, R.makeEquip(bp, "white", 1));
ok("背包 99 件装备", bp.bag.length === 99);
ok("血瓶占 1 格", R.addItem(bp, { kind: "potion", id: "small", n: 1 }) && bp.bag.length === 100);
ok("背包满了装备放不进", !R.canAdd(bp, R.makeEquip(bp, "white", 1)));
ok("背包满了血瓶仍能叠加", R.canAdd(bp, { kind: "potion", id: "small" }) && R.addItem(bp, { kind: "potion", id: "small", n: 2 }));
ok("血瓶堆叠数量", R.potionCount(bp, "small") === 3);
ok("背包满了不同血瓶放不进", !R.canAdd(bp, { kind: "potion", id: "mid" }));

// 时间
ok("新游戏 6:00", R.clock(R.START_TIME) === "06:00");
ok("0:00 到 6:00 之间下一个 6:00 是当天", R.nextSix(3 * 60) === 360);
ok("6:00 之后下一个 6:00 是次日", R.nextSix(360) === 360 + 1440 && R.nextSix(20 * 60) === 360 + 1440);
ok("刷新索引", R.refreshIndex(360) === 0 && R.refreshIndex(359 + 1440) === 0 && R.refreshIndex(360 + 1440) === 1);

// 任务板
for (let i = 0; i < 100; i++) {
  const w = R.newWorld();
  const open = w.tasks.filter(function (t) { return t.state === "open"; }).length;
  ok("任务板 6-8 个", open >= 6 && open <= 8, "n=" + open);
  const cnt = {};
  w.tasks.forEach(function (t) { cnt[t.grade] = (cnt[t.grade] || 0) + 1; });
  ok("D 1-2 / C 2-3 / B 1-2 / A 0-1", cnt.D >= 1 && cnt.D <= 2 && cnt.C >= 2 && cnt.C <= 3 && cnt.B >= 1 && cnt.B <= 2 && (cnt.A || 0) <= 1);
}
const w = R.newWorld();
w.tasks[0].state = "accepted";
const keepId = w.tasks[0].id;
ok("跨过 6:00 刷新", R.advanceTo(w, 360 + 1440) === true);
ok("已接取任务刷新后保留", w.tasks.some(function (t) { return t.id === keepId; }));
ok("死亡回退不刷新", R.advanceTo(w, 400) === false);
ok("回退后再过同一个 6:00 不刷新", R.advanceTo(w, 360 + 1440) === false);
ok("到下一天才刷新", R.advanceTo(w, 360 + 2880) === true);

// 晋级：10 个后出 S，提交 S 进入下一危险等级
const w2 = R.newWorld(), p2 = R.newPlayer("dog");
for (let i = 0; i < 10; i++) {
  let t = w2.tasks.find(function (x) { return x.state === "open" && x.grade !== "S"; });
  if (!t) { R.refreshBoard(w2); t = w2.tasks.find(function (x) { return x.state === "open" && x.grade !== "S"; }); }
  R.submitTask(w2, p2, t);
}
ok("完成 10 个后出现 S 级", w2.tasks.some(function (t) { return t.grade === "S"; }) && w2.done === 10);
const s = w2.tasks.find(function (t) { return t.grade === "S"; });
ok("S 级敌人等级 5", s.enemyLv === 5);
const res = R.submitTask(w2, p2, s);
ok("S 级提交后危险等级 +1，计数清零", res.nextDanger && w2.danger === 2 && w2.done === 0);
ok("下一等级立即发新一批", w2.tasks.length >= 6 && w2.tasks.every(function (t) { return t.danger === 2; }));

// 数学题
[2, 3, 4].forEach(function (year) {
  M.typesOfYear(year).forEach(function (type) {
    for (let i = 0; i < 300; i++) {
      const q = M.make(year, U.int(1, 3), type);
      ok(year + "年级 " + type + " 选项 4 个且互不相同", q.options.length === 4 && new Set(q.options).size === 4, q.stem + " " + q.options);
      ok(year + "年级 " + type + " 答案在选项里", q.options[q.answer] === q.ansValue, q.stem);
      ok(year + "年级 " + type + " 选项都是正整数", q.options.every(function (v) { return Number.isInteger(v) && v > 0; }), q.stem + " " + q.options);
      ok(year + "年级 " + type + " 有提示", q.hint1.length > 0 && q.hint2.length > 0);
      // 用题干算一遍确认答案
      const expr = q.stem.replace("= ?", "").replace(/×/g, "*").replace(/÷/g, "/").replace(/（/g, "(").replace(/）/g, ")");
      ok(year + "年级 " + type + " 答案正确", Function("return " + expr)() === q.ansValue, q.stem + " ans=" + q.ansValue);
    }
  });
});
const ms = { tier: 1, ok: 0, bad: 0 };
M.adapt(ms, true); M.adapt(ms, true); M.adapt(ms, true);
ok("连续答对 3 题升档", ms.tier === 2 && ms.ok === 0);
M.adapt(ms, false); M.adapt(ms, false);
ok("连续答错 2 题降档", ms.tier === 1);
const hp = R.newPlayer("dog"), qq = M.make(2, 1, "add_nc");
ok("没死过不给提示", M.hintFor(hp, qq) === null);
hp.memory.typeDeaths.add_nc = 1;
ok("死过 1 次给思路", M.hintFor(hp, qq).level === 1);
hp.memory.typeDeaths.add_nc = 2;
ok("死过 2 次给步骤和答案", M.hintFor(hp, qq).level === 2 && M.hintFor(hp, qq).text.indexOf(String(qq.ansValue)) >= 0);

console.log(fail === 0 ? "全部通过：" + total + " 项" : "失败 " + fail + " / " + total + " 项");
process.exit(fail === 0 ? 0 : 1);