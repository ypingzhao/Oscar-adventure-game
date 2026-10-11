/* src/ui.js — 界面：开始页、存档页、种族选择、城镇、地下城（冒险书）、死亡页、通关页，以及弹窗引擎。
 * 动作都登记在 O.Act 里，页面上的 data-act="名字" 会被 main.js 的点击代理转给它。 */
(function (root) {
  "use strict";
  const O = root.Oscar, G = O.G, R = O.R, S = O.S, Act = O.Act;
  const UI = {};
  O.UI = UI;
  UI.panels = {};
  const $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  UI.esc = esc;

  UI.toast = function (t) {
    const box = $("toasts");
    if (!box) return;
    const d = document.createElement("div");
    d.className = "toast"; d.textContent = t;
    box.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 4200);
  };

  function heartHtml() {
    const p = G.p, max = R.maxHp(p), low = p.hp / max <= 0.2;
    return '<span class="heart" style="animation-duration:' + (low ? "0.33" : "1") + 's">♥</span><span class="hptxt">' + p.hp + "/" + max + "</span>";
  }
  UI.hud = function () {
    if (!G.p) return;
    const c = $("clock"); if (c && G.w) c.textContent = R.clock(G.w.time);
    const g = $("gold"); if (g) g.textContent = G.p.gold;
    const l = $("lvinfo"); if (l) l.textContent = "Lv" + G.p.lv + " " + G.p.name + " · 第 " + G.p.lives + " 次人生";
    const cb = $("charbtn");
    if (cb) cb.innerHTML = "角色" + (G.p.free > 0 ? ' <i class="badge">' + G.p.free + "</i>" : "");
    const h = $("hpwrap");
    if (h) { const k = G.p.hp + "/" + R.maxHp(G.p); if (h.dataset.k !== k) { h.dataset.k = k; h.innerHTML = heartHtml(); } }
  };

  /* ── 弹窗 ── */
  UI.openModal = function (name, arg) {
    const fn = UI.panels[name];
    if (!fn) return;
    G.modal = name; G.modalArg = arg;
    if (G.screen === "dungeon") O.Dun.pause();
    if (O.T) O.T.stop();
    $("modal").innerHTML = '<div class="mask" data-act="mask"><div class="panel">' + fn(arg) + "</div></div>";
  };
  UI.closeModal = function () {
    if (UI.delTimer) { clearInterval(UI.delTimer); UI.delTimer = null; }
    G.modal = null; G.modalArg = null;
    $("modal").innerHTML = "";
    if (G.screen === "dungeon") O.Dun.resumeTimer();
    UI.hud();
  };
  UI.reopen = function () { if (G.modal) UI.openModal(G.modal, G.modalArg); UI.hud(); };

  /* ── 总渲染 ── */
  UI.render = function () {
    const a = $("app"), s = G.screen;
    if (s === "town" && $("tcanvas") && a.dataset.screen === "town") { UI.hud(); return; }
    a.dataset.screen = s;
    if (s !== "town") O.T.stop();
    ({ start: rStart, slots: rSlots, race: rRace, town: rTown, dungeon: rDungeon, death: rDeath, clear: rClear })[s]();
  };

  function rStart() {
    const any = S.any();
    $("app").innerHTML = '<div class="start"><div class="logo">⚔</div><h1>Oscar 冒险记</h1><p class="sub">一个会算数的冒险故事</p>' +
      (any ? '<button class="btn main" data-act="continueGame">继续</button><button class="btn" data-act="slotsOpen">选择存档</button>' : "") +
      '<button class="btn' + (any ? "" : " main") + '" data-act="newGame">新游戏</button>' +
      (S.persistent ? "" : '<p class="warn">这个浏览器不能保存进度，关掉页面后进度会丢失。</p>') + "</div>";
  }

  function fmtDate(t) {
    const d = new Date(t), z = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate()) + " " + z(d.getHours()) + ":" + z(d.getMinutes());
  }
  function rSlots() {
    let cards = "";
    for (let i = 0; i < 3; i++) {
      const sm = S.summary(i);
      if (!sm) { cards += '<div class="slot empty"><b>存档位 ' + (i + 1) + "</b><span>空存档位</span></div>"; continue; }
      cards += '<div class="slot"><b>存档位 ' + (i + 1) + "</b><span>" + esc(sm.name) + " · Lv" + sm.lv + " · 危险等级 " + sm.danger + "</span><span class='dim'>" + fmtDate(sm.savedAt) +
        '</span><div class="row">' + (G.newMode ? "" : '<button class="mini main" data-act="loadSlot" data-arg="' + i + '">进入</button>') +
        '<button class="mini" data-act="delAsk" data-arg="' + i + '">删除</button></div></div>';
    }
    $("app").innerHTML = '<div class="slots"><h2>' + (G.newMode ? "存档位已满" : "选择存档") + "</h2>" +
      (G.newMode ? '<p class="txt">三个存档位都有存档了。请先删除一个，再开始新游戏。</p>' : "") + cards +
      '<button class="btn" data-act="toStartPage">返回</button></div>';
  }

  function rRace() {
    const cards = O.DATA.raceOrder.map(function (id) {
      const r = O.DATA.races[id];
      return '<div class="race' + (G.pickRace === id ? " sel" : "") + '" data-act="pickRace" data-arg="' + id + '"><canvas id="rc-' + id + '" width="32" height="32"></canvas>' +
        "<div><b>" + r.name + " " + r.en + "</b><div class='dim'>" + r.ability + "：" + esc(r.desc) + "</div></div></div>";
    }).join("");
    $("app").innerHTML = '<div class="racepage"><h2>选择你的种族</h2><p class="txt dim">选定后不能更换。角色的名字是种族的英文名。</p>' + cards +
      '<button class="btn main" data-act="confirmRace"' + (G.pickRace ? "" : " disabled") + ">决定了</button></div>";
    O.DATA.raceOrder.forEach(function (id) { O.P.avatar($("rc-" + id), id, 2); });
  }

  function rTown() {
    const T = O.T, p = G.p;
    const pos = G.townPos === "grave" ? T.graveSpawn : G.townPos === "spawn" ? T.spawn : [T.x, T.y];
    G.townPos = null;
    const labels = T.buildings.map(function (b) {
      return '<span class="blabel" style="left:' + ((b.x + b.w / 2) / T.COLS * 100) + "%;top:" + ((b.y + 0.1) / T.ROWS * 100) + '%">' + b.name + "</span>";
    }).join("");
    $("app").innerHTML = '<div class="town"><div class="hud"><span class="clock" id="clock"></span><span>金币 <b id="gold"></b></span><span id="lvinfo" class="dim"></span></div>' +
      '<div class="twrap"><canvas id="tcanvas" width="240" height="320"></canvas>' + labels + "</div>" +
      '<div class="bar"><button id="charbtn" class="mini" data-act="open" data-arg="char">角色' + (p.free > 0 ? ' <i class="badge">' + p.free + "</i>" : "") + '</button>' +
      '<button class="mini" data-act="open" data-arg="bag">背包</button><button class="mini" data-act="open" data-arg="menu">菜单</button><div id="hpwrap" class="hpwrap"></div></div>' +
      '<p class="tip">方向键或点击地面走路。走到建筑门口，或点击建筑，就能进去。</p></div>';
    const cv = $("tcanvas");
    T.init(cv, pos[0], pos[1], function (id) { UI.openModal(id); });
    cv.addEventListener("click", function (e) {
      const r = cv.getBoundingClientRect();
      T.click((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    });
    UI.hud();
  }

  function enemiesHtml(ev) {
    return '<div class="enemies">' + ev.enemies.map(function (e, i) {
      const cur = i === ev.target && e.hp > 0;
      return '<div class="en' + (e.hp <= 0 ? " dead" : "") + (cur ? " tgt" : "") + '" data-act="dtarget" data-arg="' + i + '"><span class="nm">' + (cur ? "▶ " : "") + esc(e.name) + " Lv" + e.lv +
        '</span><span class="ehp"><i style="width:' + (e.hp / e.maxHp * 100) + '%"></i></span><span class="num">' + e.hp + "/" + e.maxHp + '</span><span class="wk">弱点：' + O.Dun.weakLabel(e) + "</span></div>";
    }).join("") + "</div>";
  }

  function rDungeon() {
    const D = O.Dun, ev = G.ev, def = O.DATA.dungeons[G.task.dungeon], d = def.events[ev.idx], p = G.p, run = G.task.run;
    const crumbs = D.crumbs().map(function (c, i) {
      return '<div class="cr ' + c.state + '"><span class="arrow">' + (c.state === "cur" ? "▼" : "") + '</span><span class="dot">' + (c.state === "done" ? "✓" : i + 1) + "</span></div>";
    }).join("");
    const text = '<p class="txt">' + esc(d.text || "") + "</p>";
    let body = "";
    if (ev.phase === "skip") {
      body = '<p class="txt">「' + esc(d.title) + '」这里的事已经处理过了，继续前进吧。</p><button class="btn main" data-act="dskip">继续前进</button>';
    } else if (ev.phase === "choose") {
      body = text + d.choices.map(function (c, i) { return '<button class="btn" data-act="dpick" data-arg="' + i + '">' + esc(c.label) + "</button>"; }).join("");
    } else if (ev.phase === "result" || ev.phase === "campmsg") {
      body = '<p class="txt">' + esc(ev.fb) + '</p><button class="btn main" data-act="dcont">继续</button>';
    } else if (ev.phase === "camp") {
      const c = run.camp, opts = [["heal", "回复 30% 最大血量"], ["equip", "获取一件装备"], ["leave", "离开地下城（进度重置，收获保留）"]];
      if (opts.every(function (o) { return c[o[0]]; })) {
        body = text + '<p class="txt dim">营地的三个选项都用过了。</p><button class="btn main" data-act="dskip">继续前进</button>';
      } else {
        body = text + '<p class="dim small">三个选项选其中一个。</p>' + opts.map(function (o) {
          return '<button class="btn" data-act="dcamp" data-arg="' + o[0] + '"' + (c[o[0]] ? " disabled" : "") + ">" + o[1] + (c[o[0]] ? "（已选过）" : "") + "</button>";
        }).join("");
      }
    } else {
      const q = ev.q;
      body = text;
      if (d.type === "trap") {
        const pct = run.trap[ev.idx];
        body += '<p class="warn">限时答 1 题：答错扣最大血量的 ' + pct + "%（约 " + R.pctDamage(p, pct) + " 点），门还是会开。</p>";
      }
      if (d.type === "battle") {
        body += enemiesHtml(ev);
        if (!ev.locked) {
          const t = R.totals(p);
          body += '<div class="atk"><button class="' + (ev.atk === "phys" ? "on" : "") + '" data-act="datk" data-arg="phys">物理攻击 ' + t.str +
            '</button><button class="' + (ev.atk === "magic" ? "on" : "") + '" data-act="datk" data-arg="magic">魔法攻击 ' + t.int + "</button></div>";
        }
      }
      if (!ev.locked) body += '<div class="timer"><div class="tbar" id="tbar" style="width:100%"></div><span id="tsec" class="tsec"></span></div>';
      body += '<div class="stem">' + esc(q.stem) + "</div>";
      if (ev.hint) body += '<p class="hint">提示：' + esc(ev.hint.text) + "</p>";
      body += '<div class="opts">' + q.options.map(function (v, i) {
        let cls = "opt", dis = "";
        if (ev.locked) { dis = " disabled"; if (i === q.answer) cls += " ok"; else if (i === ev.picked) cls += " bad"; }
        else if (ev.dead[i]) { cls += " bad"; dis = " disabled"; }
        return '<button class="' + cls + '"' + dis + ' data-act="dans" data-arg="' + i + '">' + v + "</button>";
      }).join("") + "</div>";
      if (ev.note) body += '<p class="txt">' + esc(ev.note) + "</p>";
      if (ev.locked) {
        const lab = { next: "下一题", retry: "再试一次", victory: "战斗胜利，继续", finish: "继续", clear: "击败了！", die: "你倒下了……" }[ev.after] || "继续";
        body += '<p class="fb">' + esc(ev.fb) + '</p><button class="btn main" data-act="dcont">' + lab + "</button>";
      }
      if (d.type === "battle") {
        const sp = R.potionCount(p, "small"), mp = R.potionCount(p, "mid");
        const calm = p.bag.find(function (b) { return b.kind === "story" && b.id === "calm"; });
        body += '<div class="acts">' + (sp ? '<button class="mini" data-act="potion" data-arg="small">小血瓶 ×' + sp + "</button>" : "") +
          (mp ? '<button class="mini" data-act="potion" data-arg="mid">中血瓶 ×' + mp + "</button>" : "") +
          (D.canRoll() ? '<button class="mini" data-act="droll">死亡翻滚（' + R.rollDamage(p) + " 点）</button>" : "") +
          (calm && d.enemy === "boss" && !ev.locked ? '<button class="mini" data-act="dstory" data-arg="' + calm.uid + '">使用' + esc(calm.name) + "</button>" : "") + "</div>";
      }
    }
    $("app").innerHTML = '<div class="dun"><div class="crumbs">' + crumbs + '</div><div class="ctitle">第 ' + (ev.idx + 1) + "/" + def.events.length + " 个事件 · " + esc(d.title) +
      '</div><canvas id="art" class="art" width="240" height="120"></canvas><div class="dbody">' + body + '</div><div class="dfoot"><button class="mini" data-act="open" data-arg="bag">背包</button><div id="hpwrap" class="hpwrap"></div></div></div>';
    O.P.art($("art"), d.art, ev.enemies);
    UI.hud();
  }

  function rDeath() {
    const di = G.deathInfo, p = G.p;
    const list = di.wrong.length ? di.wrong.map(function (w) {
      return '<div class="wq"><b>' + esc(w.stem) + "</b><div>你的答案：" + (w.mine === null ? "（时间到了）" : w.mine) + "　正确答案：<b class='okc'>" + w.right + "</b></div><div class='dim'>" + esc(w.name) + "：" + esc(w.steps) + "</div></div>";
    }).join("") : '<p class="txt dim">这次没有答错的题。</p>';
    $("app").innerHTML = '<div class="death"><h2>你倒下了</h2><p class="txt">别担心，等级、属性和记忆都还在。先看看这次答错的题：</p>' + list +
      '<p class="txt dim">本次地下城的收获丢失了，游戏时间回到了出发之前。再遇到同类的题，会有提示。</p>' +
      (di.gift ? '<p class="txt">你身上一分钱也没有了，得到 10 金币。</p>' : "") +
      '<button class="btn main" data-act="deathOk">醒来（第 ' + p.lives + " 次人生）</button></div>";
  }
  function rClear() {
    const c = G.clearInfo;
    $("app").innerHTML = '<div class="death"><h2>通关了！</h2><p class="txt">' + esc(c.title) + "</p><p class=\"txt\">" + esc(c.epilogue) + "</p><p class=\"txt\">这一趟得到 " + c.gold +
      " 金币。游戏时间过去了 12 小时。" + (c.refreshed ? "任务板和商人刷新了。" : "") + '</p><button class="btn main" data-act="clearOk">回到城镇，去公会交任务</button></div>';
  }

  /* ── 动作 ── */
  function loadSlot(slot) {
    const s = S.read(slot);
    if (!s) return;
    G.slot = slot; G.p = s.p; G.w = s.w; G.task = null; G.ev = null; G.townPos = "spawn"; G.modal = null; G.newMode = false;
    if (s.where === "dungeon" && s.taskId) {
      const t = G.w.tasks.find(function (x) { return x.id === s.taskId; });
      if (t && t.run) { O.Dun.resume(t); return; }
    }
    G.screen = "town";
    UI.render();
  }
  Act.continueGame = function () { const n = S.last(); if (n >= 0) loadSlot(n); else { G.screen = "slots"; G.newMode = false; UI.render(); } };
  Act.slotsOpen = function () { G.screen = "slots"; G.newMode = false; UI.render(); };
  Act.toStartPage = function () { G.screen = "start"; G.newMode = false; UI.render(); };
  Act.loadSlot = function (a) { loadSlot(parseInt(a, 10)); };
  Act.newGame = function () {
    const e = S.firstEmpty();
    if (e < 0) { G.screen = "slots"; G.newMode = true; UI.render(); return; }
    G.slot = e; G.pickRace = null; G.screen = "race"; UI.render();
  };
  Act.pickRace = function (id) { G.pickRace = id; UI.render(); };
  Act.confirmRace = function () {
    if (!G.pickRace) return;
    G.p = R.newPlayer(G.pickRace); G.w = R.newWorld(); G.task = null; G.ev = null; G.townPos = "spawn"; G.screen = "town";
    S.save(); UI.render();
  };
  Act.delAsk = function (a) { UI.openModal("del", parseInt(a, 10)); };
  Act.deathOk = function () { G.deathInfo = null; G.screen = "town"; UI.render(); };
  Act.clearOk = function () {
    G.clearInfo = null; G.screen = "town"; G.townPos = "spawn"; S.save(); UI.render();
  };
  Act.open = function (name) { UI.openModal(name); };
  Act.close = function () { UI.closeModal(); };
  Act.mask = function (a, el, e) { if (e.target === el) UI.closeModal(); };
  Act.toStart = function () { S.save(); UI.closeModal(); G.screen = "start"; UI.render(); };

  Act.dans = function (a) { O.Dun.answer(parseInt(a, 10)); };
  Act.dpick = function (a) { O.Dun.pick(parseInt(a, 10)); };
  Act.dcont = function () { O.Dun.cont(); };
  Act.dcamp = function (a) { O.Dun.camp(a); };
  Act.dskip = function () { O.Dun.campSkip(); };
  Act.dtarget = function (a) { O.Dun.target(parseInt(a, 10)); };
  Act.datk = function (a) { O.Dun.setAtk(a); };
  Act.droll = function () { O.Dun.roll(); };
  Act.dstory = function (a) { O.Dun.useStory(a); };
  Act.potion = function (id) {
    const p = G.p;
    if (R.potionCount(p, id) <= 0) return;
    if (p.hp >= R.maxHp(p)) { UI.toast("血量已经满了。"); return; }
    R.removePotion(p, id);
    const h = R.heal(p, R.POTIONS[id].frac);
    UI.toast("用了" + R.POTIONS[id].name + "，回复 " + h + " 点血量。");
    if (G.screen === "dungeon") UI.render(); else UI.hud();
    if (G.modal) UI.reopen();
  };
})(typeof window !== "undefined" ? window : globalThis);