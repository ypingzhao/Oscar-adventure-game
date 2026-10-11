/* src/save.js — 三个存档位，存 localStorage（file:// 下可用）。
 * 如果浏览器禁用了 localStorage，自动退回内存存档，并在界面上提示。 */
(function (root) {
  "use strict";
  const O = root.Oscar = root.Oscar || {};
  const S = {};
  const PREFIX = "oscar-v2-slot-", LAST = "oscar-v2-last";
  const memory = {};
  function probe() {
    try {
      if (typeof localStorage === "undefined") return false;
      localStorage.setItem("__oscar_t", "1"); localStorage.removeItem("__oscar_t");
      return true;
    } catch (e) { return false; }
  }
  S.persistent = probe();
  function get(k) {
    if (S.persistent) { try { return localStorage.getItem(k); } catch (e) {} }
    return Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null;
  }
  function set(k, v) {
    if (S.persistent) { try { localStorage.setItem(k, v); return; } catch (e) {} }
    memory[k] = v;
  }
  function del(k) {
    if (S.persistent) { try { localStorage.removeItem(k); } catch (e) {} }
    delete memory[k];
  }
  S.read = function (slot) {
    try { const raw = get(PREFIX + slot); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  };
  S.write = function (slot, state) { set(PREFIX + slot, JSON.stringify(state)); set(LAST, String(slot)); };
  S.remove = function (slot) { del(PREFIX + slot); if (S.last() === slot) del(LAST); };
  S.last = function () {
    const v = get(LAST);
    if (v === null) return -1;
    const n = parseInt(v, 10);
    return S.read(n) ? n : -1;
  };
  S.firstEmpty = function () {
    for (let i = 0; i < 3; i++) if (!S.read(i)) return i;
    return -1;
  };
  S.any = function () { for (let i = 0; i < 3; i++) if (S.read(i)) return true; return false; };
  S.summary = function (slot) {
    const s = S.read(slot);
    if (!s) return null;
    return { race: s.p.race, name: s.p.name, lv: s.p.lv, danger: s.w.danger, time: s.w.time, savedAt: s.savedAt };
  };
  // 把当前游戏状态写入当前存档位
  S.save = function () {
    const G = O.G;
    if (G.slot === undefined || G.slot < 0 || !G.p || !G.w) return;
    const inside = G.screen === "dungeon" && G.task && G.task.run;
    S.write(G.slot, { v: 2, p: G.p, w: G.w, where: inside ? "dungeon" : "town", taskId: inside ? G.task.id : null, savedAt: Date.now() });
  };
  O.S = S;
})(typeof window !== "undefined" ? window : globalThis);