/* data/races.js — 五个种族（v3 的 1.10）。 */
(function (root) {
  "use strict";
  const O = root.Oscar = root.Oscar || {};
  O.DATA = O.DATA || {};
  O.DATA.races = {
    bear:      { id: "bear",      name: "熊",   en: "Bear",      ability: "厚皮",     desc: "受到的伤害 -2 点，最低扣 0。" },
    cat:       { id: "cat",       name: "猫",   en: "Cat",       ability: "智力 +5",  desc: "智力 5 变成 10，魔法攻击力翻倍。" },
    crocodile: { id: "crocodile", name: "鳄鱼", en: "Crocodile", ability: "死亡翻滚", desc: "面对敌人时可直接造成 力量×3 的伤害，住酒店后恢复。" },
    parrot:    { id: "parrot",    name: "鹦鹉", en: "Parrot",    ability: "灵敏反应", desc: "答题时间额外 +5 秒。" },
    dog:       { id: "dog",       name: "狗",   en: "Dog",       ability: "嗅觉",     desc: "获得装备后有 10% 概率额外得到一件白色装备，住酒店后恢复。" }
  };
  O.DATA.raceOrder = ["bear", "cat", "crocodile", "parrot", "dog"];
})(typeof window !== "undefined" ? window : globalThis);