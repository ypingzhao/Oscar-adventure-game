/* src/main.js — 游戏引擎
 *
 * 依赖 window.物品表（data/items.js）和 window.场景表（data/scenes.js）。
 * 除这两个全局量之外零依赖，直接 file:// 打开或 GitHub Pages 均可运行。
 */
(function () {
  "use strict";

  /* ── 存档 ── */

  const 存档键 = "oscar-adventure-save-v1";

  function 读存档() {
    try {
      const raw = localStorage.getItem(存档键);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function 写存档(状态) {
    try { localStorage.setItem(存档键, JSON.stringify(状态)); } catch (_) {}
  }

  function 清存档() {
    try { localStorage.removeItem(存档键); } catch (_) {}
  }

  /* ── 初始状态 ── */

  function 新游戏状态() {
    return {
      场景: window.起始场景,
      物品: [],   // 已获得物品名数组
      标记: [],   // 已触发标记数组
      已选: []    // 已消耗的一次性选项键数组
    };
  }

  /* ── 选项可用性检查 ──
   *   返回 { 可用: bool, 原因: string }
   *   「原因」只有在 可用=false 时才有意义
   */
  function 检查选项(选项, 状态, 选项索引) {
    const 需要 = 选项.需要 || {};

    // 检查所需物品
    if (需要.物品) {
      const 缺 = 需要.物品.filter(p => !状态.物品.includes(p));
      if (缺.length > 0) {
        return { 可用: false, 原因: "需要：" + 缺.join("、") };
      }
    }

    // 检查所需标记
    if (需要.标记) {
      const 缺 = 需要.标记.filter(f => !状态.标记.includes(f));
      if (缺.length > 0) {
        return { 可用: false, 原因: "需要：" + 缺.join("、") };
      }
    }

    // 检查禁止标记
    if (需要.无标记) {
      const 冲突 = 需要.无标记.filter(f => 状态.标记.includes(f));
      if (冲突.length > 0) {
        return { 可用: false, 原因: "这条路已经不成立了" };
      }
    }

    // 检查一次性
    if (选项.一次性) {
      const key = 状态.场景 + "#" + 选项索引;
      if (状态.已选.includes(key)) {
        return { 可用: false, 原因: "已经选过了" };
      }
    }

    return { 可用: true, 原因: "" };
  }

  /* ── 渲染 ── */

  function 渲染(状态) {
    const 数据 = window.场景表[状态.场景];
    if (!数据) {
      document.getElementById("正文").textContent = "【错误：找不到场景 " + 状态.场景 + "】";
      return;
    }

    // 标题
    document.getElementById("场景标题").textContent = 数据.标题 || 状态.场景;

    // 正文
    const 正文el = document.getElementById("正文");
    正文el.innerHTML = "";
    (数据.正文 || []).forEach(段 => {
      const p = document.createElement("p");
      p.textContent = 段;
      正文el.appendChild(p);
    });

    // 结局判断：无选项字段
    const 选项列表 = 数据.选项;
    const 选项ul = document.getElementById("选项");
    选项ul.innerHTML = "";

    if (!选项列表 || 选项列表.length === 0) {
      // 结局
      const p = document.createElement("p");
      p.style.cssText = "margin-top:1.4em;opacity:.55;font-size:.88rem;text-align:center;letter-spacing:.1em;";
      p.textContent = "── " + (数据.结局名 || "结局") + " ──";
      正文el.appendChild(p);
    } else {
      // 选项按钮
      选项列表.forEach((选项, i) => {
        const { 可用, 原因 } = 检查选项(选项, 状态, i);
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.disabled = !可用;

        // 主文本
        const 主文本 = document.createTextNode(选项.文本);
        btn.appendChild(主文本);

        // 条件提示
        if (!可用 && 原因) {
          const hint = document.createElement("span");
          hint.className = "缺什么";
          hint.textContent = 原因;
          btn.appendChild(hint);
        }

        if (可用) {
          btn.addEventListener("click", () => 执行选项(选项, i, 状态));
        }

        li.appendChild(btn);
        选项ul.appendChild(li);
      });
    }

    // 背包
    const 背包el = document.getElementById("背包内容");
    if (状态.物品.length === 0) {
      背包el.textContent = "空的";
    } else {
      背包el.innerHTML = "";
      状态.物品.forEach((名, idx) => {
        const sp = document.createElement("span");
        sp.textContent = 名;
        const 物品数据 = window.物品表 && window.物品表[名];
        if (物品数据 && 物品数据.描述) {
          sp.title = 物品数据.描述;
          sp.style.cursor = "help";
          sp.style.borderBottom = "1px dotted currentColor";
        }
        背包el.appendChild(sp);
        if (idx < 状态.物品.length - 1) {
          背包el.appendChild(document.createTextNode("　"));
        }
      });
    }
  }

  /* ── 执行选项 ── */

  function 执行选项(选项, 索引, 状态) {
    // 记录一次性消耗
    if (选项.一次性) {
      const key = 状态.场景 + "#" + 索引;
      if (!状态.已选.includes(key)) 状态.已选.push(key);
    }

    // 追加获得物品（去重）
    if (选项.获得) {
      选项.获得.forEach(p => {
        if (!状态.物品.includes(p)) 状态.物品.push(p);
      });
    }

    // 追加标记（去重）
    if (选项.标记) {
      选项.标记.forEach(f => {
        if (!状态.标记.includes(f)) 状态.标记.push(f);
      });
    }

    // 跳转
    if (选项.前往 && window.场景表[选项.前往]) {
      状态.场景 = 选项.前往;
    }

    写存档(状态);
    渲染(状态);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── 初始化 ── */

  function 初始化() {
    let 状态 = 读存档();

    // 存档校验：场景必须存在
    if (!状态 || !window.场景表[状态.场景]) {
      状态 = 新游戏状态();
    }
    // 确保数组字段存在（兼容旧存档格式）
    状态.物品 = Array.isArray(状态.物品) ? 状态.物品 : [];
    状态.标记 = Array.isArray(状态.标记) ? 状态.标记 : [];
    状态.已选 = Array.isArray(状态.已选) ? 状态.已选 : [];

    // 重开按钮
    document.getElementById("重开").addEventListener("click", () => {
      if (confirm("清除存档，从头开始？")) {
        清存档();
        状态 = 新游戏状态();
        渲染(状态);
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    });

    渲染(状态);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", 初始化);
  } else {
    初始化();
  }

})();
