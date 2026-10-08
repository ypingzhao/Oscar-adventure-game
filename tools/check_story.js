/* tools/check_story.js —— 剧情图自检
 *
 * 用法（在项目根目录下）：
 *     node tools/check_story.js
 *
 * 为什么需要它：剧情表里最容易出的暗坑是某个选项「前往」了一个不存在的场景。
 * 这种错在页面上表现为「点了没反应」——不报错、不白屏、控制台也干净，
 * 只能靠翻代码找。这个脚本把这类问题变成一条命令。
 *
 * 它查七项，任何一项不过就退 1：
 *   1 起始场景是否存在
 *   2 所有「前往」的目标是否存在
 *   3 所有「获得」的物品是否在物品表里
 *   4 有没有写了但玩家永远走不到的场景
 *   5 结局有几个、分别叫什么
 *   6 有没有「所有选项都有门槛」的场景（可能卡住玩家）
 *   7 空手（不带任何道具）能不能走到结局
 *
 * 它只读不改。退出码 0 = 全过，1 = 有问题。
 */
"use strict";

const fs = require("fs");
const path = require("path");

const 项目根 = path.resolve(__dirname, "..");

// 数据文件是给浏览器用的普通脚本（挂 window），这里造个假的 window 来读。
const win = {};
global.window = win;
for (const 文件 of ["data/items.js", "data/scenes.js"]) {
  const 全路径 = path.join(项目根, 文件);
  if (!fs.existsSync(全路径)) {
    console.error("找不到数据文件：" + 全路径);
    process.exit(1);
  }
  eval(fs.readFileSync(全路径, "utf8"));
}

const 场景表 = win.场景表;
const 物品表 = win.物品表 || {};
const 起始 = win.起始场景;

if (!场景表) {
  console.error("data/scenes.js 里没有 window.场景表。");
  process.exit(1);
}

let 问题数 = 0;
const 说 = (s) => console.log(s);
const 错 = (s) => { console.log("  ✗ " + s); 问题数++; };

/* 1 ─ 起始场景 */
说("=== 1. 起始场景 ===");
if (!起始 || !场景表[起始]) 错("起始场景不存在：" + 起始);
else 说("  OK  " + 起始);

/* 2 ─ 前往目标 */
说("\n=== 2. 所有「前往」的目标 ===");
for (const [id, sc] of Object.entries(场景表)) {
  for (const o of sc.选项 || []) {
    if (o.前往 && !场景表[o.前往]) 错(id + " 的选项「" + o.文本 + "」指向不存在的场景：" + o.前往);
  }
}
if (!问题数) 说("  OK  全部有效");

/* 3 ─ 获得物品 */
说("\n=== 3. 所有「获得」的物品 ===");
let 问题3 = 问题数;
for (const [id, sc] of Object.entries(场景表)) {
  for (const o of sc.选项 || []) {
    for (const p of o.获得 || []) {
      if (!物品表[p]) 错(id + " 会获得物品「" + p + "」，但 items.js 里没这件东西");
    }
  }
}
if (问题数 === 问题3) 说("  OK  全部在物品表里");

/* 4 ─ 可达性 */
说("\n=== 4. 可达的场景 ===");
const 可达 = new Set();
const 队列 = [起始];
while (队列.length) {
  const 当前 = 队列.shift();
  if (可达.has(当前) || !场景表[当前]) continue;
  可达.add(当前);
  for (const o of 场景表[当前].选项 || []) if (o.前往) 队列.push(o.前往);
}
const 全部场景 = Object.keys(场景表);
const 不可达 = 全部场景.filter((x) => !可达.has(x));
if (不可达.length) 错("写了但玩家永远走不到：" + 不可达.join("、"));
else 说("  OK  全部 " + 全部场景.length + " 个场景都可达");

/* 5 ─ 结局 */
说("\n=== 5. 结局（没有「选项」字段的场景）===");
const 结局 = 全部场景.filter((id) => !(场景表[id].选项 || []).length);
if (!结局.length) 错("一个结局都没有，故事走不完");
else 结局.forEach((id) => 说("  " + id + "  →  " + (场景表[id].结局名 || "(未命名)")));

/* 6 ─ 死路 */
说("\n=== 6. 可能有门槛卡死的场景 ===");
let 问题6 = 问题数;
for (const [id, sc] of Object.entries(场景表)) {
  const 选项 = sc.选项 || [];
  if (!选项.length) continue;
  if (!选项.some((o) => !o.需要)) 错(id + " 的每个选项都有条件，玩家可能一条都点不动");
}
if (问题数 === 问题6) 说("  OK  每个场景都至少有一条无条件出口");

/* 7 ─ 空手通关 */
说("\n=== 7. 空手能不能走到结局 ===");
function 能走通(id, 物品, 标记, 走过) {
  if (走过.has(id)) return false;
  const sc = 场景表[id];
  if (!sc) return false;
  const 选项 = sc.选项 || [];
  if (!选项.length) return true;
  走过.add(id);
  for (const o of 选项) {
    const 需 = o.需要 || {};
    if ((需.物品 || []).some((p) => !物品.includes(p))) continue;
    if ((需.标记 || []).some((f) => !标记.includes(f))) continue;
    if ((需.无标记 || []).some((f) => 标记.includes(f))) continue;
    if (o.前往 && 能走通(o.前往, 物品.concat(o.获得 || []), 标记.concat(o.标记 || []), new Set(走过))) {
      return true;
    }
  }
  return false;
}
if (能走通(起始, [], [], new Set())) 说("  OK  不带任何道具也能走到一个结局");
else 错("空手会卡死——所有结局都需要道具");

/* 收尾 */
说("\n================================");
if (问题数 === 0) {
  说("全部通过。");
  process.exit(0);
} else {
  说("共 " + 问题数 + " 个问题，修完再提交。");
  process.exit(1);
}
