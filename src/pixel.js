/* src/pixel.js — 用 Canvas 画像素占位图：种族角色、敌人、场景。以后可整体替换为正式美术。 */
(function (root) {
  "use strict";
  const O = root.Oscar = root.Oscar || {};
  const P = {};
  function mk(ctx, ox, oy, s) { return function (c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(ox + x * s, oy + y * s, w * s, h * s); }; }

  // 16x16 的种族角色
  P.critter = function (ctx, ox, oy, s, race) {
    const r = mk(ctx, ox, oy, s);
    const pal = { bear: ["#8b5a2b", "#c9a06b"], cat: ["#e0a050", "#f4d9a8"], crocodile: ["#4a9a4a", "#a8d98a"], parrot: ["#d94040", "#f0c040"], dog: ["#c8a070", "#7a5a38"] }[race];
    r("#2a2a2a", 4, 14, 3, 2); r("#2a2a2a", 9, 14, 3, 2);
    r(pal[0], 4, 8, 8, 6); r(pal[1], 6, 9, 4, 4);
    r(pal[0], 3, 2, 10, 7);
    if (race === "bear") { r(pal[0], 2, 1, 3, 3); r(pal[0], 11, 1, 3, 3); r(pal[1], 6, 5, 4, 3); r("#222", 7, 5, 2, 1); }
    if (race === "cat") { r(pal[0], 3, 0, 3, 3); r(pal[0], 10, 0, 3, 3); r(pal[1], 6, 6, 4, 2); r("#d06080", 7, 6, 2, 1); }
    if (race === "crocodile") { r(pal[1], 2, 5, 12, 4); r("#fff", 4, 8, 1, 1); r("#fff", 7, 8, 1, 1); r("#fff", 10, 8, 1, 1); r(pal[0], 4, 1, 2, 2); r(pal[0], 10, 1, 2, 2); }
    if (race === "parrot") { r(pal[1], 6, 0, 4, 2); r("#e8a020", 6, 5, 4, 3); r("#2a6ad0", 1, 8, 3, 5); r("#2a6ad0", 12, 8, 3, 5); }
    if (race === "dog") { r(pal[1], 1, 2, 3, 6); r(pal[1], 12, 2, 3, 6); r("#e8d0a8", 5, 5, 6, 4); r("#222", 7, 5, 2, 1); }
    r("#111", 5, 4, 1, 2); r("#111", 10, 4, 1, 2);
  };

  // 敌人（按种族挑一个外形，没有专属外形的用色块怪）
  P.enemy = function (ctx, ox, oy, s, species) {
    const r = mk(ctx, ox, oy, s);
    const sp = O.DATA.species[species];
    if (species === "zombieAnimal") {
      r("#7d8a78", 3, 8, 9, 5); r("#7d8a78", 9, 6, 5, 5); r("#d9a0a0", 10, 5, 2, 2); r("#d9a0a0", 13, 6, 1, 2);
      r("#7d8a78", 0, 11, 4, 1); r("#e03030", 12, 8, 1, 1); r("#222", 4, 13, 2, 1); r("#222", 9, 13, 2, 1); r("#5a6a58", 5, 9, 1, 3);
    } else if (species === "demon") {
      r("#4a2a4a", 3, 7, 9, 6); r("#4a2a4a", 9, 4, 6, 6); r("#c03030", 9, 2, 1, 2); r("#c03030", 13, 2, 1, 2);
      r("#ff4040", 11, 6, 1, 1); r("#ff4040", 13, 6, 1, 1); r("#fff", 11, 9, 1, 1); r("#fff", 13, 9, 1, 1);
      r("#222", 4, 13, 2, 2); r("#222", 10, 13, 2, 2); r("#4a2a4a", 1, 8, 2, 1);
    } else if (species === "griffin") {
      r("#9a6a30", 3, 7, 9, 6); r("#d8b060", 0, 3, 5, 6); r("#d8b060", 11, 3, 5, 6); r("#f2f2f2", 9, 3, 5, 4);
      r("#e8b020", 13, 5, 3, 2); r("#111", 11, 4, 1, 1); r("#7a4a20", 4, 13, 2, 2); r("#7a4a20", 9, 13, 2, 2); r("#9a6a30", 1, 9, 2, 1);
    } else {
      const c = sp ? { str: "#b04040", int: "#7a50b0", vit: "#50a050" }[sp.main] : "#808080";
      r(c, 3, 5, 10, 9); r(c, 4, 3, 8, 2); r("#fff", 5, 7, 2, 2); r("#fff", 9, 7, 2, 2); r("#111", 6, 8, 1, 1); r("#111", 10, 8, 1, 1);
    }
  };

  P.scene = function (ctx, key, w, h) {
    const sky = { barn: ["#3a2e4a", "#8a5a5a"], field: ["#101830", "#2a3a5a"], door: ["#2a1f18", "#3a2a1e"], night: ["#0c1024", "#1c2848"],
                  camp: ["#0c1024", "#1c2848"], roof: ["#3a2e4a", "#b07a5a"] }[key] || ["#202030", "#404060"];
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const f = function (c, x, y, ww, hh) { ctx.fillStyle = c; ctx.fillRect(x, y, ww, hh); };
    if (key === "field" || key === "night" || key === "camp") {
      for (let i = 0; i < 18; i++) f("#d8d8f0", (i * 37 + 11) % w, (i * 23 + 5) % 50, 1, 1);
      f("#f2eec8", 196, 14, 12, 12); f(sky[0], 201, 12, 10, 10);
    }
    if (key === "door") {
      for (let x = 0; x < w; x += 24) f("#4a3524", x, 0, 2, h);
      f("#3a2a1e", 90, 24, 60, 90); f("#5a4430", 94, 28, 52, 82); f("#c0a040", 130, 70, 8, 8); f("#222", 133, 73, 2, 4);
      return;
    }
    f(key === "roof" ? "#5a3a3a" : "#26361e", 0, 90, w, 30);
    if (key === "barn") {
      f("#8a3030", 70, 40, 100, 56); f("#4a2020", 62, 32, 116, 12); f("#3a1818", 105, 62, 30, 34);
      f("#e8d8c0", 44, 58, 2, 22); f("#e8d8c0", 50, 56, 2, 24); f("#e8d8c0", 56, 58, 2, 22);
    }
    if (key === "roof") { f("#6a3a3a", 40, 62, 160, 12); f("#4a2828", 20, 74, 200, 16); f("#7a4a4a", 60, 50, 120, 12); }
    if (key === "camp") {
      f("#5a3a20", 104, 86, 32, 5); f("#ffb020", 112, 70, 16, 16); f("#fff060", 117, 74, 7, 10); f("#e05010", 114, 66, 6, 6);
      f("#4a5a7a", 30, 60, 36, 32); f("#2a3a5a", 40, 70, 16, 22);
    }
    if (key === "field") { for (let x = 6; x < w; x += 30) { f("#5a4430", x, 78, 3, 14); f("#5a4430", x - 4, 82, 38, 2); } }
  };

  // 在 canvas 上画场景和敌人
  P.art = function (canvas, key, enemies) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    P.scene(ctx, key, canvas.width, canvas.height);
    const alive = (enemies || []).filter(function (e) { return e.hp > 0; });
    const n = alive.length;
    alive.forEach(function (e, i) {
      const s = e.type === "boss" ? 6 : e.type === "elite" ? 5 : 4;
      const cx = canvas.width * (i + 1) / (n + 1);
      P.enemy(ctx, Math.round(cx - 8 * s), canvas.height - 16 * s - 6, s, e.species);
    });
  };
  P.avatar = function (canvas, race, s) {
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    P.critter(ctx, 0, 0, s, race);
  };

  O.P = P;
})(typeof window !== "undefined" ? window : globalThis);