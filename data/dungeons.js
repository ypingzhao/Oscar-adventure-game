/* data/dungeons.js — 地下城数据。目前只有「南方农场」（v3 的 3.6 范本一），做完就是模板。
 * type: branch 分支路线 / riddle 谜题 / battle 战斗 / trap 机关陷阱 / camp 营地
 * 每段文字 ≤60 字。 */
(function (root) {
  "use strict";
  const O = root.Oscar = root.Oscar || {};
  O.DATA = O.DATA || {};
  O.DATA.dungeons = {
    farm: {
      id: "farm",
      title: "南方农场·怪叫声",
      intro: "老山羊愁眉苦脸：夜里总有怪叫，奶是酸的，母鸡也不下蛋。",
      epilogue: "狮鹫什么都没干，它只是受伤了，在屋顶睡觉。长得凶，不等于是坏的。",
      bossWeak: "magic",
      events: [
        { type: "branch", title: "勘查谷仓", art: "barn",
          text: "谷仓外墙有三道深抓痕，比人还高，地上撒满了谷物。",
          choices: [
            { label: "看看抓痕", result: "三道抓痕又平行又高，留下它的家伙爪子很大。" },
            { label: "看看谷物", result: "谷物被啃过，啃得乱七八糟，只啃了一半。" }
          ] },
        { type: "riddle", title: "抓痕之谜", art: "field",
          text: "老山羊说是鬼，货郎说有影子飞走。算对石板上的题，就能知道线索。",
          reveal: { kind: "weak", text: "有翅膀、爪子大，怕魔法。线索记在你的笔记里了。" } },
        { type: "battle", title: "偷吃饲料的巨鼠", art: "barn", enemy: "small", species: "zombieAnimal", label: "巨鼠", count: [1, 4],
          text: "一群巨鼠从饲料堆里钻出来，吱吱乱叫。" },
        { type: "trap", title: "谷仓大门", art: "door", pct: [5, 10],
          text: "大门上有个机关锁。答对开门，答错会受伤，但门还是会开。" },
        { type: "battle", title: "被吵醒的守夜犬", art: "night", enemy: "elite", species: "demon", label: "守夜犬", count: [1, 2],
          text: "守夜犬被吵醒了，红着眼睛扑了过来。" },
        { type: "riddle", title: "鼾声之谜", art: "night",
          text: "怪叫隔一阵响一次，像是在打呼噜。算对题，找出原因。",
          reveal: { kind: "item", item: { id: "calm", name: "安神草", desc: "对 BOSS 使用，直接扣掉它一半血量。" }, text: "原来是鼾声。你在角落找到一把安神草。" } },
        { type: "camp", title: "营地", art: "camp",
          text: "谷仓角落有一堆干草，可以生火歇一会儿。" },
        { type: "battle", title: "幼年狮鹫", art: "roof", enemy: "boss", species: "griffin", label: "幼年狮鹫", count: [1, 1],
          text: "屋顶上，一只幼年狮鹫被惊醒，张开了翅膀。" }
      ]
    }
  };
})(typeof window !== "undefined" ? window : globalThis);