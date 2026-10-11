/* src/main.js — 启动：点击代理、键盘、游戏时钟。 */
(function (root) {
  "use strict";
  const O = root.Oscar, G = O.G, R = O.R;
  G.screen = "start"; G.modal = null; G.slot = -1; G.newMode = false;

  document.addEventListener("click", function (e) {
    const el = e.target.closest("[data-act]");
    if (!el || el.disabled) return;
    const fn = O.Act[el.dataset.act];
    if (fn) fn(el.dataset.arg, el, e);
  });

  // 按住方向键（或 WASD）持续移动，松开就停
  const DIRS = { arrowup: "up", arrowdown: "down", arrowleft: "left", arrowright: "right", w: "up", s: "down", a: "left", d: "right" };
  document.addEventListener("keydown", function (e) {
    if (G.screen !== "town" || G.modal || e.ctrlKey || e.metaKey || e.altKey) return;
    const d = DIRS[String(e.key).toLowerCase()];
    if (!d) return;
    e.preventDefault();
    O.T.setKey(d, true);
  });
  document.addEventListener("keyup", function (e) {
    const d = DIRS[String(e.key).toLowerCase()];
    if (d) O.T.setKey(d, false);
  });
  window.addEventListener("blur", function () { O.T.clearKeys(); });

  // 城镇里时间正常流逝：现实 1 秒 = 游戏 1 分钟
  setInterval(function () {
    if (G.screen !== "town" || !G.w) return;
    const refreshed = R.advanceTo(G.w, G.w.time + 1);
    O.UI.hud();
    if (refreshed) {
      O.UI.toast("早上 6:00，任务板和道具商人刷新了。");
      if (G.modal === "guild" || G.modal === "shop") O.UI.reopen();
    }
  }, 1000);
  // 地下城答题倒计时
  setInterval(function () { O.Dun.tick(); }, 100);

  O.UI.render();
})(typeof window !== "undefined" ? window : globalThis);