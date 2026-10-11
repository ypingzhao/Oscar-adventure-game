// tools/test_town.js — 城镇移动单测：连续移动、碰撞、点击寻路、进门。运行：node tools/test_town.js
global.window = undefined;
["../src/util.js", "../data/races.js", "../data/enemies.js", "../src/save.js", "../src/pixel.js", "../src/town.js"].forEach(function (f) { require(f); });
const T = Oscar.T;
let bad = 0, total = 0;
function ok(n, c, extra) { total++; if (!c) { bad++; console.log("  坏  " + n + (extra ? "  " + extra : "")); } }
function reset(x, y) { T.fx = x + 0.5; T.fy = y + 0.5; T.x = x; T.y = y; T.keys = {}; T.route = null; T.walked = 0; T.entered = []; T.onEnter = function (id) { T.entered.push(id); }; }
const DT = 1 / 60;

// 1. 地图基本检查
ok("出生点可走", T.walkable(T.spawn[0], T.spawn[1]));
ok("墓地重生点可走", T.walkable(T.graveSpawn[0], T.graveSpawn[1]));
T.buildings.forEach(function (b) {
  const f = T.front(b);
  ok(b.name + " 门口前一格可走", T.walkable(f[0], f[1]));
  ok(b.name + " 门这一格可走（走进去触发）", T.walkable(b.door[0], b.door[1]));
  ok(b.name + " 从出生点走得到", T.findPath(T.spawn[0], T.spawn[1], b.door[0], b.door[1]) !== null);
});

// 2. 连续移动：每帧位移很小，不是一格一格跳（起点选 7,12：右边一整行是空地）
reset(7, 12);
T.keys = { right: true };
let maxStep = 0, last = T.fx, frames = 0;
for (let i = 0; i < 20; i++) { T.update(DT); maxStep = Math.max(maxStep, Math.abs(T.fx - last)); last = T.fx; frames++; }
ok("每帧位移小于 0.2 格", maxStep < 0.2, "max=" + maxStep);
ok("每帧位移约等于速度 × 时间", Math.abs(maxStep - T.SPEED * DT) < 1e-6, "max=" + maxStep);
ok("位置是小数不是整格", T.fx % 1 !== 0.5 || frames === 0);
ok("20 帧后向右走了", T.fx > 7.5 + 0.9);
ok("松开按键就停", (function () { T.keys = {}; const p = T.fx; T.update(DT); return T.fx === p; })());

// 3. 斜向不会更快
reset(7, 10);
T.keys = { right: true, down: true };
const sx = T.fx, sy = T.fy;
T.update(DT);
ok("斜向速度和直走一样", Math.abs(Math.hypot(T.fx - sx, T.fy - sy) - T.SPEED * DT) < 1e-6);

// 4. 碰撞：一直往墙里走，永远不会站在不可走的地方，也不会穿过去
[["left", 1000], ["right", 1000], ["up", 1000], ["down", 1000]].forEach(function (c) {
  reset(7, 10);
  T.keys = {}; T.keys[c[0]] = true;
  let stand = true;
  for (let i = 0; i < c[1]; i++) { T.update(DT); if (!T.canStand(T.fx, T.fy)) stand = false; if (T.entered.length) break; }
  ok("一直往" + c[0] + "走不会穿墙", stand && T.fx >= 0 && T.fy >= 0 && T.fx <= T.COLS && T.fy <= T.ROWS, "pos=" + T.fx.toFixed(2) + "," + T.fy.toFixed(2));
});
// 随机乱按 5000 帧
reset(7, 10);
let seed = 12345; function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
let stand2 = true;
for (let i = 0; i < 5000; i++) {
  if (i % 15 === 0) T.keys = { up: rnd() < 0.5, down: rnd() < 0.5, left: rnd() < 0.5, right: rnd() < 0.5 };
  T.update(DT);
  if (!T.canStand(T.fx, T.fy)) stand2 = false;
}
ok("乱按 5000 帧都站在可走的地方", stand2);

// 5. 贴墙滑行：斜着顶墙，沿墙方向还能走
reset(7, 6);
T.keys = { left: true, up: true };
const y0 = T.fy;
for (let i = 0; i < 30; i++) T.update(DT);
ok("斜顶建筑墙时仍能沿墙滑动", T.fx < 7.5);

// 6. 点击寻路：每个建筑，沿路线平滑走到门并进入
T.buildings.forEach(function (b) {
  reset(T.spawn[0], T.spawn[1]);
  const r = T.click((b.x + b.w / 2) / T.COLS, (b.y + b.h / 2) / T.ROWS);
  ok("点击 " + b.name + " 能规划路线", r === true);
  let steps = 0, maxStep2 = 0, lx = T.fx, ly = T.fy, stand3 = true;
  while (!T.entered.length && steps < 3000) {
    T.update(DT); steps++;
    if (!T.entered.length) maxStep2 = Math.max(maxStep2, Math.hypot(T.fx - lx, T.fy - ly));   // 进门那一帧会被放回门前，不算走路
    lx = T.fx; ly = T.fy;
    if (!T.canStand(T.fx, T.fy)) stand3 = false;
  }
  ok(b.name + " 走得到并触发进入", T.entered.length === 1 && T.entered[0] === b.id, "steps=" + steps + " entered=" + T.entered);
  ok(b.name + " 路上每帧位移小于 0.2 格", maxStep2 < 0.2, "max=" + maxStep2);
  ok(b.name + " 路上没有穿墙", stand3);
  ok(b.name + " 进入后回到门前一格", T.x === b.door[0] && T.y === b.door[1] + 1);
  const n = T.entered.length;
  for (let i = 0; i < 60; i++) T.update(DT);
  ok(b.name + " 不会重复触发", T.entered.length === n);
});

// 7. 按住方向键走进门
reset(3, 7);                       // 公会门前 (3,6) 的下面
T.keys = { up: true };
for (let i = 0; i < 200 && !T.entered.length; i++) T.update(DT);
ok("按住上键走进公会", T.entered[0] === "guild");

// 8. 点击不能走的地方（树、水）
reset(7, 10);
ok("点击树不规划路线", T.click(0.5 / T.COLS, 0.5 / T.ROWS) === false);
ok("点击水面不规划路线", T.click(2.5 / T.COLS, 15.5 / T.ROWS) === false);

// 9. 按键会取消路线，点击会取消按键
reset(7, 10);
T.click(0.5, 0.9);
ok("有路线", !!T.route);
T.setKey("left", true);
ok("按键取消路线", T.route === null);
T.click(0.5, 0.9);
ok("点击取消按键", Object.keys(T.keys).length === 0 && !!T.route);

// 10. 暂停很久再回来，一帧不会瞬移
reset(7, 10);
T.keys = { right: true };
T.update(5);
ok("帧间隔很大也不会瞬移", T.fx - 7.5 <= T.SPEED * 0.05 + 1e-6);

console.log(bad === 0 ? "城镇单测全部通过：" + total + " 项" : "失败 " + bad + " / " + total + " 项");
process.exit(bad === 0 ? 0 : 1);