// tools/check_story.js — 地下城数据自检。运行：node tools/check_story.js
global.window = undefined;
["../src/util.js", "../data/races.js", "../data/enemies.js", "../data/dungeons.js"].forEach(function (f) { require(f); });
const O = globalThis.Oscar;
let bad = 0;
function check(name, cond, extra) {
  console.log((cond ? "  OK   " : "  坏   ") + name + (cond || !extra ? "" : "  " + extra));
  if (!cond) bad++;
}
const RANGE = { D: [5, 8] };
Object.keys(O.DATA.dungeons).forEach(function (id) {
  const d = O.DATA.dungeons[id], ev = d.events;
  console.log("\n=== " + id + "：" + d.title + " ===");
  const battles = ev.filter(function (e) { return e.type === "battle"; });
  const order = battles.map(function (e) { return e.enemy; });
  check("至少 3 场战斗", battles.length >= 3, "只有 " + battles.length);
  check("战斗按 小怪 → 精英 → BOSS", order.indexOf("small") < order.indexOf("elite") && order.indexOf("elite") < order.indexOf("boss"));
  check("BOSS 战只有 1 场且固定 1 只", order.filter(function (x) { return x === "boss"; }).length === 1 && battles.every(function (e) { return e.enemy !== "boss" || (e.count[0] === 1 && e.count[1] === 1); }));
  check("小怪 1-4 只、精英 1-2 只", battles.every(function (e) { return e.enemy === "boss" || (e.enemy === "small" ? e.count[1] <= 4 : e.count[1] <= 2) && e.count[0] >= 1; }));
  const camp = ev.findIndex(function (e) { return e.type === "camp"; }), boss = ev.findIndex(function (e) { return e.enemy === "boss"; });
  check("营地在 BOSS 战之前", camp >= 0 && camp < boss);
  const rid = ev.filter(function (e) { return e.type === "riddle"; });
  check("BOSS 谜题 2 个：一个揭示弱点、一个给故事道具", rid.length === 2 && rid.some(function (e) { return e.reveal.kind === "weak"; }) && rid.some(function (e) { return e.reveal.kind === "item"; }));
  check("事件数在 D 级范围 5-8", ev.length >= RANGE.D[0] && ev.length <= RANGE.D[1], "共 " + ev.length);
  check("敌人种族都存在", battles.every(function (e) { return O.DATA.species[e.species]; }));
  check("BOSS 克制标签与故事一致", O.DATA.species[ev[boss].species].weak === d.bossWeak);
  const long = [];
  ev.forEach(function (e, i) {
    [e.text].concat((e.choices || []).map(function (c) { return c.result; })).concat(e.reveal ? [e.reveal.text] : []).forEach(function (t) {
      if (t && t.length > 60) long.push((i + 1) + ": " + t.length + " 字");
    });
  });
  check("每段文字不超过 60 字", long.length === 0, long.join("；"));
  check("分支路线至少 2 个选项", ev.filter(function (e) { return e.type === "branch"; }).every(function (e) { return e.choices.length >= 2; }));
  check("机关陷阱百分比在 5-10", ev.filter(function (e) { return e.type === "trap"; }).every(function (e) { return e.pct[0] === 5 && e.pct[1] === 10; }));
});
console.log(bad === 0 ? "\n全部通过。" : "\n有 " + bad + " 项没过。");
process.exit(bad === 0 ? 0 : 1);