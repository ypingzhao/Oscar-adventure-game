/* src/util.js — 随机与小工具。浏览器和 node 都能加载（挂在 window / globalThis 的 Oscar 上）。 */
(function (root) {
  "use strict";
  const O = root.Oscar = root.Oscar || {};
  O.G = O.G || {};      // 运行时全局状态
  O.Act = O.Act || {};  // 界面动作表：data-act 名 -> 函数
  O.DATA = O.DATA || {};

  const U = {
    rand: function () { return Math.random(); },
    int: function (a, b) { return a + Math.floor(U.rand() * (b - a + 1)); },
    float: function (a, b) { return a + U.rand() * (b - a); },
    chance: function (p) { return U.rand() < p; },
    pick: function (arr) { return arr[Math.floor(U.rand() * arr.length)]; },
    shuffle: function (arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(U.rand() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },
    clamp: function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); },
    // pairs: [[值, 权重], ...]
    weighted: function (pairs) {
      let total = 0;
      pairs.forEach(function (p) { total += p[1]; });
      let r = U.rand() * total;
      for (let i = 0; i < pairs.length; i++) {
        r -= pairs[i][1];
        if (r < 0) return pairs[i][0];
      }
      return pairs[pairs.length - 1][0];
    },
    uid: function () {
      return "i" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    },
    clone: function (o) { return JSON.parse(JSON.stringify(o)); }
  };
  O.U = U;
})(typeof window !== "undefined" ? window : globalThis);