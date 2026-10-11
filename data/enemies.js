/* data/enemies.js — 敌人种族：主加属性与克制标签（v3 的 1.11）。
 * main: 主加属性 str 力量 / int 智力 / vit 体力
 * weak: 克制标签 "magic" 弱魔法（受到魔法攻击 x1.5）/ "phys" 弱物理（受到物理攻击 x1.5）
 */
(function (root) {
  "use strict";
  const O = root.Oscar = root.Oscar || {};
  O.DATA = O.DATA || {};
  O.DATA.species = {
    goblin:     { name: "哥布林",   main: "str", weak: "magic" },
    werewolf:   { name: "狼人",     main: "str", weak: "magic" },
    crocodile:  { name: "鳄鱼",     main: "str", weak: "magic" },
    skeleton:   { name: "骷髅",     main: "str", weak: "magic" },
    ogre:       { name: "食人魔",   main: "str", weak: "magic" },
    spider:     { name: "巨蜘蛛",   main: "str", weak: "magic" },
    griffin:    { name: "狮鹫",     main: "str", weak: "magic" },
    ghost:      { name: "幽灵",     main: "int", weak: "phys" },
    witch:      { name: "女巫",     main: "int", weak: "phys" },
    vampire:    { name: "吸血鬼",   main: "int", weak: "phys" },
    scarecrow:  { name: "稻草人",   main: "int", weak: "phys" },
    demon:      { name: "恶魔",     main: "int", weak: "phys" },
    slime:      { name: "史莱姆",   main: "vit", weak: "magic" },
    gargoyle:   { name: "石像鬼",   main: "vit", weak: "magic" },
    zombieAnimal: { name: "僵尸动物", main: "vit", weak: "phys" },
    golem:      { name: "傀儡",     main: "vit", weak: "phys" },
    plant:      { name: "植物",     main: "vit", weak: "phys" }
  };
  O.DATA.weakName = { magic: "魔法", phys: "物理" };
})(typeof window !== "undefined" ? window : globalThis);