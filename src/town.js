/* src/town.js — 2D 俯视角像素城镇（偏暗黑）。
 * 移动是连续的，不是一格一格跳：按住方向键（或 WASD）持续走，松开就停；也可以点击地面或建筑，沿路线平滑走过去。
 * 每帧按时间推进位置，碰撞用一个小方框对格子地图做检测，碰到墙会贴着滑过去。
 * 门在建筑最下面一行；走进门那一格就会进入建筑。 */
(function (root) {
  "use strict";
  const O = root.Oscar = root.Oscar || {};
  const T = {};
  T.COLS = 15; T.ROWS = 20; T.TS = 16;
  T.SPEED = 4.5;   // 每秒走几格
  T.R = 0.3;       // 碰撞方框半宽（格）
  T.buildings = [
    { id: "guild",  name: "冒险公会", x: 1, y: 2,  w: 5, h: 4, door: [3, 5],  wall: "#5a4a3a", roof: "#7a2a2a" },
    { id: "hotel",  name: "酒店",     x: 9, y: 2,  w: 5, h: 4, door: [11, 5], wall: "#4a4a5a", roof: "#2a4a6a" },
    { id: "shop",   name: "道具商人", x: 1, y: 8,  w: 5, h: 4, door: [3, 11], wall: "#5a503a", roof: "#6a5a2a" },
    { id: "church", name: "教堂",     x: 9, y: 8,  w: 5, h: 4, door: [11, 11], wall: "#6a6a72", roof: "#3a3a4a" },
    { id: "grave",  name: "墓地",     x: 9, y: 14, w: 5, h: 4, door: [11, 17], wall: "#3a3a3a", roof: "#222" }
  ];
  const WATER = { x0: 1, y0: 14, x1: 4, y1: 17 };
  const TREES = [[0,0],[14,0],[7,0],[6,0],[8,0],[0,1],[14,1],[0,7],[14,7],[6,9],[8,10],[0,13],[5,13],[14,12],[6,19],[8,19],[0,19],[14,19],[5,19],[2,19],[12,13],[6,16],[6,17]];
  T.spawn = [7, 10];
  T.graveSpawn = [11, 18];

  const blocked = {};
  function k(x, y) { return x + "," + y; }
  T.buildings.forEach(function (b) {
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) blocked[k(x, y)] = b.id;
  });
  for (let y = WATER.y0; y <= WATER.y1; y++) for (let x = WATER.x0; x <= WATER.x1; x++) blocked[k(x, y)] = "water";
  TREES.forEach(function (t) { blocked[k(t[0], t[1])] = "tree"; });
  const doorOf = {};
  T.buildings.forEach(function (b) { doorOf[k(b.door[0], b.door[1])] = b; delete blocked[k(b.door[0], b.door[1])]; });
  T.front = function (b) { return [b.door[0], b.door[1] + 1]; };

  T.walkable = function (x, y) {
    return x >= 0 && y >= 0 && x < T.COLS && y < T.ROWS && !blocked[k(x, y)];
  };
  T.buildingAt = function (x, y) {
    const id = blocked[k(x, y)];
    return T.buildings.find(function (b) { return b.id === id; }) || doorOf[k(x, y)] || null;
  };
  T.isPath = function (x, y) {
    return y === 6 || y === 12 || y === 18 || (x === 7 && y >= 6) || (y === 10 && x >= 5 && x <= 9);
  };

  // 角色方框放在 (x, y)（格坐标，中心点）是否不碰墙
  T.canStand = function (x, y) {
    const r = T.R;
    return T.walkable(Math.floor(x - r), Math.floor(y - r)) && T.walkable(Math.floor(x + r), Math.floor(y - r)) &&
           T.walkable(Math.floor(x - r), Math.floor(y + r)) && T.walkable(Math.floor(x + r), Math.floor(y + r));
  };

  // 广度优先寻路，返回从起点之后到终点的格子列表；走不到返回 null
  T.findPath = function (sx, sy, tx, ty) {
    if (!T.walkable(tx, ty) || !T.walkable(sx, sy)) return null;
    if (sx === tx && sy === ty) return [];
    const prev = {}, q = [[sx, sy]];
    prev[k(sx, sy)] = null;
    while (q.length) {
      const c = q.shift();
      const ds = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (let i = 0; i < 4; i++) {
        const nx = c[0] + ds[i][0], ny = c[1] + ds[i][1];
        if (!T.walkable(nx, ny) || k(nx, ny) in prev) continue;
        prev[k(nx, ny)] = c;
        if (nx === tx && ny === ty) {
          const out = [[nx, ny]];
          let p = c;
          while (p && !(p[0] === sx && p[1] === sy)) { out.unshift(p); p = prev[k(p[0], p[1])]; }
          return out;
        }
        q.push([nx, ny]);
      }
    }
    return null;
  };

  /* ── 运行状态：fx, fy 是角色中心的格坐标（小数），x, y 是所在的整数格 ── */
  T.fx = 7.5; T.fy = 10.5; T.x = 7; T.y = 10;
  T.canvas = null; T.onEnter = null; T.route = null; T.keys = {}; T.moving = false; T.walked = 0; T.raf = null; T.last = 0; T.bg = null; T.stuck = 0;

  T.init = function (canvas, tx, ty, onEnter) {
    T.canvas = canvas; T.onEnter = onEnter; T.bg = null;
    T.fx = tx + 0.5; T.fy = ty + 0.5; T.x = tx; T.y = ty;
    T.stop();
    T.draw();
    T.start();
  };
  // 清掉按键和路线（打开弹窗、换界面时用）
  T.stop = function () { T.keys = {}; T.route = null; T.moving = false; T.stuck = 0; };
  T.setKey = function (dir, down) { T.keys[dir] = !!down; if (down) T.route = null; };
  T.clearKeys = function () { T.keys = {}; };

  function move(mx, my) {
    let m = 0;
    const nx = T.fx + mx;
    if (mx && T.canStand(nx, T.fy)) { T.fx = nx; m += Math.abs(mx); }
    const ny = T.fy + my;
    if (my && T.canStand(T.fx, ny)) { T.fy = ny; m += Math.abs(my); }
    return m;
  }

  // 每帧推进：dt 是秒
  T.update = function (dt) {
    dt = Math.min(dt, 0.05);
    if (!(dt > 0)) return;
    const kk = T.keys;
    const dx = (kk.right ? 1 : 0) - (kk.left ? 1 : 0), dy = (kk.down ? 1 : 0) - (kk.up ? 1 : 0);
    let moved = 0;
    if (dx || dy) {
      T.route = null;
      const len = Math.hypot(dx, dy);
      moved = move(dx / len * T.SPEED * dt, dy / len * T.SPEED * dt);
    } else if (T.route && T.route.length) {
      let budget = T.SPEED * dt;
      while (budget > 1e-9 && T.route && T.route.length) {
        const t = T.route[0], vx = t[0] - T.fx, vy = t[1] - T.fy, d = Math.hypot(vx, vy);
        if (d <= budget) { T.fx = t[0]; T.fy = t[1]; moved += d; budget -= d; T.route.shift(); T.stuck = 0; }
        else {
          const m = move(vx / d * budget, vy / d * budget);
          moved += m; budget = 0;
          if (m < 1e-9) { T.stuck += 1; if (T.stuck > 30) { T.route = null; T.stuck = 0; } } else T.stuck = 0;
        }
      }
      if (T.route && !T.route.length) T.route = null;
    }
    T.moving = moved > 1e-9;
    if (T.moving) T.walked += moved;
    T.x = Math.floor(T.fx); T.y = Math.floor(T.fy);
    const door = doorOf[k(T.x, T.y)];
    if (door) {
      // 进门：把角色放回门前一格，免得弹窗关掉后又触发一次
      T.fx = door.door[0] + 0.5; T.fy = door.door[1] + 1.5; T.x = door.door[0]; T.y = door.door[1] + 1;
      T.stop();
      if (T.onEnter) T.onEnter(door.id);
    }
  };

  T.planRoute = function (tx, ty) {
    const sx = Math.floor(T.fx), sy = Math.floor(T.fy);
    const path = T.findPath(sx, sy, tx, ty);
    if (!path) return null;
    return [[sx + 0.5, sy + 0.5]].concat(path.map(function (c) { return [c[0] + 0.5, c[1] + 0.5]; }));
  };
  // fx, fy 是点击位置在画布里的比例 0-1
  T.click = function (px, py) {
    const x = Math.floor(px * T.COLS), y = Math.floor(py * T.ROWS);
    const b = T.buildingAt(x, y);
    const tx = b ? b.door[0] : x, ty = b ? b.door[1] : y;
    const r = T.planRoute(tx, ty);
    if (!r) return false;
    T.keys = {}; T.route = r; T.stuck = 0;
    return true;
  };

  /* ── 绘制：背景只画一次存到离屏画布，每帧只重画角色 ── */
  function drawStatic(ctx) {
    const S = T.TS;
    const f = function (col, x, y, w, h) { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    for (let y = 0; y < T.ROWS; y++) {
      for (let x = 0; x < T.COLS; x++) {
        const path = T.isPath(x, y);
        f(path ? "#6b5a45" : ((x + y) % 2 ? "#26341f" : "#2a3a22"), x * S, y * S, S, S);
        if (path) { f("#5a4a38", x * S + 3, y * S + 4, 2, 2); f("#7a6a52", x * S + 10, y * S + 10, 2, 2); }
        else if ((x * 7 + y * 13) % 5 === 0) f("#3a4a2c", x * S + 4, y * S + 6, 2, 3);
      }
    }
    f("#1c3a5a", WATER.x0 * S, WATER.y0 * S, (WATER.x1 - WATER.x0 + 1) * S, (WATER.y1 - WATER.y0 + 1) * S);
    f("#2a5a7a", WATER.x0 * S + 6, WATER.y0 * S + 6, 10, 2); f("#2a5a7a", WATER.x0 * S + 30, WATER.y0 * S + 30, 12, 2);
    TREES.forEach(function (t) {
      f("#3a2a1a", t[0] * S + 6, t[1] * S + 10, 4, 6); f("#1a3a1a", t[0] * S + 1, t[1] * S + 1, 14, 11); f("#244a24", t[0] * S + 4, t[1] * S + 3, 8, 6);
    });
    T.buildings.forEach(function (b) {
      const X = b.x * S, Y = b.y * S, W = b.w * S, H = b.h * S;
      if (b.id === "grave") {
        f("#2a2a2a", X, Y, W, H); f("#3a3a3a", X + 2, Y + 2, W - 4, H - 4);
        for (let i = 0; i < 6; i++) { const gx = X + 8 + (i % 3) * 22, gy = Y + 10 + Math.floor(i / 3) * 26; f("#8a8a92", gx, gy, 8, 12); f("#8a8a92", gx + 2, gy - 3, 4, 3); f("#555", gx + 3, gy + 3, 2, 5); }
        f("#111", b.door[0] * S + 1, b.door[1] * S + 2, S - 2, S - 2);
        return;
      }
      f(b.wall, X, Y + S, W, H - S); f(b.roof, X - 2, Y, W + 4, S + 4);
      f("#00000040", X, Y + S + 4, W, 2);
      for (let i = 0; i < b.w - 2; i++) f("#e8c868", X + S + i * S + 3, Y + S + 8, 7, 7);
      f("#2a1a10", b.door[0] * S + 2, b.door[1] * S + 2, S - 4, S - 2); f("#c0a040", b.door[0] * S + S - 6, b.door[1] * S + 9, 2, 2);
      if (b.id === "church") { f("#d8d8e0", X + 2 * S + 6, Y - 12, 4, 14); f("#d8d8e0", X + 2 * S + 2, Y - 8, 12, 4); }
    });
  }

  T.draw = function () {
    const c = T.canvas;
    if (!c || typeof document === "undefined") return;
    const ctx = c.getContext("2d"), S = T.TS;
    ctx.imageSmoothingEnabled = false;
    if (!T.bg) {
      T.bg = document.createElement("canvas");
      T.bg.width = T.COLS * S; T.bg.height = T.ROWS * S;
      drawStatic(T.bg.getContext("2d"));
    }
    ctx.drawImage(T.bg, 0, 0);
    const px = Math.round((T.fx - 0.5) * S), py = Math.round((T.fy - 0.5) * S);
    const bob = T.moving && Math.floor(T.walked * 3) % 2 === 0 ? 1 : 0;
    ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(px + 3, py + 14, 10, 2);
    const race = O.G.p ? O.G.p.race : "dog";
    O.P.critter(ctx, px, py - bob, 1, race);
  };

  /* ── 动画循环：城镇界面在时一直跑，换了界面自己停 ── */
  T.loop = function (ts) {
    T.raf = null;
    if (!O.G || O.G.screen !== "town" || !T.canvas || !document.body.contains(T.canvas)) return;
    const dt = T.last ? (ts - T.last) / 1000 : 0;
    T.last = ts;
    if (O.G.modal) T.stop(); else T.update(dt);
    T.draw();
    T.raf = requestAnimationFrame(T.loop);
  };
  T.start = function () {
    if (typeof requestAnimationFrame === "undefined") return;
    if (T.raf) cancelAnimationFrame(T.raf);
    T.last = 0;
    T.raf = requestAnimationFrame(T.loop);
  };

  O.T = T;
})(typeof window !== "undefined" ? window : globalThis);