/* src/panels.js — 弹窗面板：公会、酒店、道具商人、墓地、教堂、角色、背包、菜单、删除确认。 */
(function (root) {
  "use strict";
  const O = root.Oscar, G = O.G, R = O.R, S = O.S, Act = O.Act, UI = O.UI, P = UI.panels, esc = UI.esc;

  function itemLine(it) {
    return '<span class="q-' + it.q + '">' + esc(it.name) + "</span>（" + R.slotLabel(it.slot) + "，力" + it.stats.str + " 智" + it.stats.int + " 体" + it.stats.vit + "）" +
      (it.affix.length ? ' <span class="dim">' + esc(it.affix.join("、")) + "</span>" : "");
  }
  function after() { S.save(); UI.reopen(); }
  function closeBtn() { return '<button class="btn" data-act="close">关闭</button>'; }

  /* ── 冒险公会 ── */
  P.guild = function () {
    const w = G.w, p = G.p, acc = R.acceptedCount(w);
    const so = { ready: 0, accepted: 1, open: 2 }, sg = { S: 0, A: 1, B: 2, C: 3, D: 4 };
    const list = w.tasks.slice().sort(function (a, b) { return so[a.state] - so[b.state] || sg[a.grade] - sg[b.grade]; });
    const cards = list.map(function (t) {
      let btn;
      if (t.state === "open") btn = '<button class="mini main" data-act="accept" data-arg="' + t.id + '"' + (acc >= 3 ? " disabled" : "") + ">接取任务</button>" + (acc >= 3 ? '<span class="dim small">最多同时接 3 个</span>' : "");
      else if (t.state === "accepted") btn = '<button class="mini main" data-act="depart" data-arg="' + t.id + '">出发</button><button class="mini" data-act="abandon" data-arg="' + t.id + '">放弃</button>';
      else btn = '<button class="mini main" data-act="submit" data-arg="' + t.id + '">交任务，领报酬</button>';
      return '<div class="task g' + t.grade + '"><div class="th"><span class="gr">' + t.grade + "级</span><b>" + esc(t.title) + (t.state === "accepted" ? " （进行中）" : t.state === "ready" ? " （已完成）" : "") +
        '</b></div><div class="small dim">敌人 ' + t.enemyLv + " 级 · <b>" + R.difficultyLabel(p.lv, t.enemyLv) + "</b> · 报酬 " + t.gold + " 金币 + " + t.exp + ' 经验</div><div class="row">' + btn + "</div></div>";
    }).join("");
    return "<h3>冒险公会</h3><p class='dim small'>世界危险等级 " + w.danger + "/20 · 本级已完成 " + w.done + "/10 个 · 已接取 " + acc + "/3</p>" +
      '<div class="scroll">' + cards + "</div>" + closeBtn();
  };
  Act.accept = function (id) {
    const t = G.w.tasks.find(function (x) { return x.id === id; });
    if (!t || t.state !== "open" || R.acceptedCount(G.w) >= 3) return;
    t.state = "accepted"; after();
  };
  Act.abandon = function (id) {
    const t = G.w.tasks.find(function (x) { return x.id === id; });
    if (!t || t.state !== "accepted") return;
    t.state = "open"; t.run = null; O.Dun.dropStory(t.id); UI.toast("放弃了任务，这座地下城的进度清空了。"); after();
  };
  Act.depart = function (id) {
    const t = G.w.tasks.find(function (x) { return x.id === id; });
    if (!t || t.state !== "accepted") return;
    UI.closeModal();
    O.Dun.enter(t);
  };
  Act.submit = function (id) {
    const t = G.w.tasks.find(function (x) { return x.id === id; });
    if (!t || t.state !== "ready") return;
    const r = R.submitTask(G.w, G.p, t);
    let msg = "交了任务，得到 " + t.gold + " 金币和 " + t.exp + " 经验。";
    if (r.levels > 0) msg += " 升到 " + G.p.lv + " 级，得到 " + (r.levels * 5) + " 点属性点！";
    UI.toast(msg);
    if (r.nextDanger) UI.toast("进入了更危险的世界（危险等级 " + G.w.danger + "）。没完成的任务失效了，公会发布了新的一批。");
    else if (G.w.done === 10) UI.toast("公会发布了一个 S 级赏金任务！");
    UI.render(); after();
  };

  /* ── 酒店 ── */
  P.hotel = function () {
    const p = G.p, h = R.HOTEL;
    return "<h3>酒店</h3><p class='txt'>住一晚，睡到早上 6:00，同时存档。</p><p class='dim small'>现在 " + R.clock(G.w.time) + " · 金币 " + p.gold + " · 血量 " + p.hp + "/" + R.maxHp(p) + "</p>" +
      '<button class="btn" data-act="sleep" data-arg="cheap">普通房：' + h.cheap.cost + " 金币，回复 20% 最大血量</button>" +
      '<button class="btn" data-act="sleep" data-arg="full">舒适房：' + h.full.cost + " 金币，回复 100% 最大血量</button>" + closeBtn();
  };
  Act.sleep = function (kind) {
    const p = G.p, h = R.HOTEL[kind];
    if (p.gold < h.cost) { UI.toast("金币不够。"); return; }
    p.gold -= h.cost;
    const healed = R.heal(p, h.frac);
    const refreshed = R.advanceTo(G.w, R.nextSix(G.w.time));
    p.used = { roll: false, sniff: false };
    S.save();
    UI.toast("睡到了早上 6:00，回复了 " + healed + " 点血量，种族能力恢复了。" + (refreshed ? "任务板和商人刷新了。" : ""));
    UI.reopen();
  };

  /* ── 道具商人 ── */
  P.shop = function () {
    const p = G.p, w = G.w;
    const eq = p.bag.filter(function (b) { return b.kind === "equip"; });
    const sell = eq.length ? eq.map(function (it) {
      return '<div class="line"><span>' + itemLine(it) + '</span><button class="mini" data-act="sell" data-arg="' + it.uid + '">卖 ' + R.sellPrice(it) + " 金币</button></div>";
    }).join("") : '<p class="dim small">背包里没有装备可以卖。身上穿着的装备不能卖。</p>';
    return "<h3>道具商人</h3><p class='dim small'>金币 " + p.gold + " · 背包 " + p.bag.length + "/" + R.BAG_SIZE + "</p>" +
      '<div class="line"><span>小血瓶（回复 10% 最大血量）<br><span class="dim small">今天还剩 ' + w.stock + " 瓶，每天早上 6:00 补满到 5 瓶</span></span>" +
      '<button class="mini main" data-act="buy"' + (w.stock <= 0 ? " disabled" : "") + ">买 " + R.POTIONS.small.price + " 金币</button></div>" +
      "<h4>卖出装备</h4>" + '<div class="scroll">' + sell + "</div>" + closeBtn();
  };
  Act.buy = function () {
    const p = G.p, w = G.w, it = { kind: "potion", id: "small", n: 1 };
    if (w.stock <= 0) { UI.toast("今天的小血瓶卖完了。"); return; }
    if (p.gold < R.POTIONS.small.price) { UI.toast("金币不够。"); return; }
    if (!R.canAdd(p, it)) { UI.toast("背包已满，不能购买。"); return; }
    p.gold -= R.POTIONS.small.price; w.stock -= 1; R.addItem(p, it);
    UI.toast("买了 1 个小血瓶。"); after();
  };
  Act.sell = function (uid) {
    const g = R.sellItem(G.p, uid);
    if (g) { UI.toast("卖出，得到 " + g + " 金币。"); after(); }
  };

  /* ── 墓地、教堂 ── */
  P.grave = function () {
    const p = G.p, d = p.memory.deaths;
    const recent = d.slice(-5).reverse().map(function (x) { return "<li>" + esc(x.task) + "</li>"; }).join("");
    return "<h3>墓地</h3><p class='txt'>风吹过石碑。你已经是第 " + p.lives + " 次人生了。</p>" +
      (d.length ? "<p class='dim small'>你倒下过 " + d.length + " 次，最近的是：</p><ul class='small'>" + recent + "</ul>" : "<p class='dim small'>你还没有在这里醒来过。</p>") + closeBtn();
  };
  P.church = function () { return "<h3>教堂</h3><p class='txt'>教堂的门关着，里面好像在装修。</p><p class='dim small'>（占位，功能以后再定）</p>" + closeBtn(); };

  /* ── 角色 ── */
  P.char = function () {
    const p = G.p, t = R.totals(p);
    const pts = function (k, n, label) {
      return '<div class="line"><span>' + label + " <b>" + t[k] + "</b>" + (k !== "luck" && t[k] !== p.base[k] ? ' <span class="dim small">(基础 ' + p.base[k] + ")</span>" : "") + "</span>" +
        (p.free > 0 ? '<button class="mini" data-act="spend" data-arg="' + k + '">+1</button>' : "") + "</div>";
    };
    const slots = R.EQUIP_SLOTS.map(function (s) {
      const it = p.equip[s];
      return '<div class="line"><span>' + R.slotLabel(s) + "：" + (it ? itemLine(it) : '<span class="dim">空</span>') + "</span>" +
        (it ? '<button class="mini" data-act="unequip" data-arg="' + s + '">脱下</button>' : "") + "</div>";
    }).join("");
    return "<h3>" + esc(p.name) + " · " + O.DATA.races[p.race].name + "</h3><p class='dim small'>Lv" + p.lv + " · 经验 " + p.exp + "/" + R.expNeed(p.lv) + " · 第 " + p.lives + " 次人生" +
      (p.free > 0 ? " · <b>有 " + p.free + " 点属性点可以分配</b>" : "") + "</p>" +
      pts("str", 0, "力量（物理攻击）") + pts("int", 0, "智力（魔法攻击）") + pts("vit", 0, "体力（血量上限）") + pts("luck", 0, "运气（答错免伤 " + Math.round(R.luckRate(t.luck) * 1000) / 10 + "%）") +
      "<p class='dim small'>种族能力：" + O.DATA.races[p.race].ability + "——" + esc(O.DATA.races[p.race].desc) + "</p><h4>装备</h4><div class='scroll'>" + slots + "</div>" + closeBtn();
  };
  Act.spend = function (k) { if (R.spendPoint(G.p, k)) { after(); } };
  Act.unequip = function (slot) { if (R.unequip(G.p, slot)) after(); else UI.toast("背包满了，脱不下来。"); };

  /* ── 背包 ── */
  P.bag = function () {
    const p = G.p;
    let rows = "";
    p.bag.forEach(function (b) {
      if (b.kind === "potion") {
        const d = R.POTIONS[b.id];
        rows += '<div class="line"><span>' + d.name + " ×" + b.n + '<br><span class="dim small">回复 ' + Math.round(d.frac * 100) + '% 最大血量</span></span><button class="mini" data-act="potion" data-arg="' + b.id + '">使用</button></div>';
      } else if (b.kind === "story") {
        rows += '<div class="line"><span>' + esc(b.name) + '<br><span class="dim small">' + esc(b.desc) + "</span></span></div>";
      } else {
        rows += '<div class="line"><span>' + itemLine(b) + '</span><button class="mini" data-act="equip" data-arg="' + b.uid + '">穿上</button></div>';
      }
    });
    return "<h3>背包</h3><p class='dim small'>" + p.bag.length + "/" + R.BAG_SIZE + " 格 · 金币 " + p.gold + "</p><div class='scroll'>" + (rows || "<p class='dim'>空空的。</p>") + "</div>" + closeBtn();
  };
  Act.equip = function (uid) { if (R.equipItem(G.p, uid)) { after(); if (G.screen === "dungeon") UI.render(); } };

  /* ── 菜单、删除确认 ── */
  P.menu = function () {
    return "<h3>菜单</h3><button class='btn' data-act='toStart'>保存并回到开始页</button>" + closeBtn();
  };
  P.del = function (slot) {
    const sm = S.summary(slot);
    if (UI.delTimer) clearInterval(UI.delTimer);
    let n = 3;
    UI.delTimer = setInterval(function () {
      const b = document.getElementById("delbtn");
      if (!b) { clearInterval(UI.delTimer); UI.delTimer = null; return; }
      n -= 1;
      if (n <= 0) { b.disabled = false; b.textContent = "是（删除）"; clearInterval(UI.delTimer); UI.delTimer = null; }
      else b.textContent = "是（删除）（" + n + "）";
    }, 1000);
    return "<h3>删除存档位 " + (slot + 1) + "？</h3><p class='txt'>" + (sm ? esc(sm.name) + " · Lv" + sm.lv : "") + "</p><p class='warn'>删除后找不回来。</p>" +
      '<button class="btn danger" id="delbtn" data-act="delDo" data-arg="' + slot + '" disabled>是（删除）（3）</button><button class="btn main" data-act="close">不删</button>';
  };
  Act.delDo = function (a) {
    const slot = parseInt(a, 10);
    S.remove(slot);
    UI.closeModal();
    if (G.newMode) { G.newMode = false; G.slot = slot; G.pickRace = null; G.screen = "race"; }
    UI.render();
  };
})(typeof window !== "undefined" ? window : globalThis);