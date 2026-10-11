/* src/math.js — 数学题生成：按年级和档位出题，4 选 1，干扰项取典型错误，带题型标签。
 * 年级内自适应：连续答对 3 题升档，答错 2 题降档（v3 的 3.3）。 */
(function (root) {
  "use strict";
  const O = root.Oscar = root.Oscar || {};
  const U = O.U;
  const M = {};
  const int = U.int;

  const NAMES = {
    add_nc: "两位数加法（不进位）", add_c: "两位数加法（进位）",
    sub_nb: "两位数减法（不退位）", sub_b: "两位数减法（退位）",
    mul_s: "表内乘法", mul_t: "表内乘法（较大）",
    add3: "三位数加法", sub3: "三位数减法",
    mul_md: "多位数乘一位数", div1: "除数是一位数的除法",
    mul_23: "三位数乘两位数", mix: "四则混合运算"
  };
  M.typeName = function (t) { return NAMES[t] || t; };

  const G = {};
  G.add_nc = function () {
    const at = int(1, 8), bt = int(1, 9 - at), ao = int(0, 8), bo = int(0, 9 - ao);
    const a = at * 10 + ao, b = bt * 10 + bo, ans = a + b;
    return { stem: a + " + " + b + " = ?", ans: ans, wrong: [ans + 10, ans - 10, ans + 1, ans - 1],
      hint1: "先算十位，再算个位，最后把两个结果加起来。",
      hint2: "十位：" + at * 10 + " + " + bt * 10 + " = " + (at + bt) * 10 + "；个位：" + ao + " + " + bo + " = " + (ao + bo) + "；合起来 " + ans + "。" };
  };
  G.add_c = function () {
    const at = int(1, 7), bt = int(1, 8 - at), ao = int(2, 9), bo = int(10 - ao, 9);
    const a = at * 10 + ao, b = bt * 10 + bo, ans = a + b;
    return { stem: a + " + " + b + " = ?", ans: ans, wrong: [ans - 10, ans + 10, ans + 1, ans - 1],
      hint1: "先算十位，再算个位。个位满 10，要向十位进 1。",
      hint2: "十位：" + at * 10 + " + " + bt * 10 + " = " + (at + bt) * 10 + "；个位：" + ao + " + " + bo + " = " + (ao + bo) + "；" + (at + bt) * 10 + " + " + (ao + bo) + " = " + ans + "。" };
  };
  G.sub_nb = function () {
    const at = int(2, 9), bt = int(1, at - 1), ao = int(1, 9), bo = int(0, ao);
    const a = at * 10 + ao, b = bt * 10 + bo, ans = a - b;
    return { stem: a + " - " + b + " = ?", ans: ans, wrong: [ans + 10, ans - 10, ans + 1, ans - 1],
      hint1: "先算十位，再算个位，最后合起来。",
      hint2: "十位：" + at * 10 + " - " + bt * 10 + " = " + (at - bt) * 10 + "；个位：" + ao + " - " + bo + " = " + (ao - bo) + "；合起来 " + ans + "。" };
  };
  G.sub_b = function () {
    const at = int(3, 9), bt = int(1, at - 2), ao = int(0, 7), bo = int(ao + 1, 9);
    const a = at * 10 + ao, b = bt * 10 + bo, ans = a - b;
    return { stem: a + " - " + b + " = ?", ans: ans, wrong: [(at - bt) * 10 + (bo - ao), ans + 10, ans - 10, ans + 1],
      hint1: "个位不够减，要向十位借 1 个十。",
      hint2: "个位：" + (10 + ao) + " - " + bo + " = " + (10 + ao - bo) + "（借了 1 个十）；十位：" + (at - 1) + " - " + bt + " = " + (at - 1 - bt) + "，即 " + (at - 1 - bt) * 10 + "；合起来 " + ans + "。" };
  };
  G.mul_s = function () {
    const a = int(2, 5), b = int(2, 9), ans = a * b;
    return { stem: a + " × " + b + " = ?", ans: ans, wrong: [a * (b + 1), a * (b - 1), (a + 1) * b, ans + 1, ans - 1],
      hint1: "想一想乘法口诀，或者把 " + a + " 连加 " + b + " 次。",
      hint2: new Array(b).fill(a).join(" + ") + " = " + ans + "。" };
  };
  G.mul_t = function () {
    const a = int(6, 9), b = int(3, 9), ans = a * b;
    return { stem: a + " × " + b + " = ?", ans: ans, wrong: [a * (b + 1), a * (b - 1), (a + 1) * b, ans + 1, ans - 1],
      hint1: "想一想乘法口诀，也可以拆开算：先算 " + a + " × " + (b - 1) + "，再加 " + a + "。",
      hint2: a + " × " + (b - 1) + " = " + a * (b - 1) + "，再加 " + a + " 得 " + ans + "。" };
  };
  G.add3 = function () {
    const a = int(120, 780), b = int(110, 999 - a), ans = a + b;
    const bh = Math.floor(b / 100) * 100, bt = Math.floor((b % 100) / 10) * 10, bo = b % 10;
    return { stem: a + " + " + b + " = ?", ans: ans, wrong: [ans + 10, ans - 10, ans + 100, ans - 100, ans + 1],
      hint1: "按百位、十位、个位一步一步加。",
      hint2: a + " + " + bh + " = " + (a + bh) + "；再加 " + bt + " 得 " + (a + bh + bt) + "；再加 " + bo + " 得 " + ans + "。" };
  };
  G.sub3 = function () {
    const a = int(300, 999), b = int(110, a - 60), ans = a - b;
    const bh = Math.floor(b / 100) * 100, bt = Math.floor((b % 100) / 10) * 10, bo = b % 10;
    return { stem: a + " - " + b + " = ?", ans: ans, wrong: [ans + 10, ans - 10, ans + 100, ans - 100, ans + 1],
      hint1: "按百位、十位、个位一步一步减，不够减就借位。",
      hint2: a + " - " + bh + " = " + (a - bh) + "；再减 " + bt + " 得 " + (a - bh - bt) + "；再减 " + bo + " 得 " + ans + "。" };
  };
  G.mul_md = function (ctx) {
    const big = ctx.tier >= 3 || ctx.year >= 4;
    const a = big ? int(110, 399) : int(12, 99), b = int(2, 9), ans = a * b;
    const p1 = a >= 100 ? Math.floor(a / 100) * 100 : Math.floor(a / 10) * 10, r = a - p1;
    return { stem: a + " × " + b + " = ?", ans: ans, wrong: [ans + b, ans - b, ans + 10, ans - 10, ans + 100, p1 * b + r],
      hint1: "把 " + a + " 拆成两部分，分别乘 " + b + "，再加起来。",
      hint2: p1 + " × " + b + " = " + p1 * b + "；" + r + " × " + b + " = " + r * b + "；" + p1 * b + " + " + r * b + " = " + ans + "。" };
  };
  G.div1 = function (ctx) {
    const d = int(2, 9), q = ctx.tier >= 3 || ctx.year >= 4 ? int(40, 150) : int(12, 99), a = q * d;
    const p1 = Math.floor(q / 10) * 10 * d, q1 = p1 / d;
    return { stem: a + " ÷ " + d + " = ?", ans: q, wrong: [q + 1, q - 1, q + 10, q - 10, q + 2],
      hint1: "想一想：几乘 " + d + " 等于 " + a + "？可以把 " + a + " 拆开来除。",
      hint2: a + " 拆成 " + p1 + " 和 " + (a - p1) + "：" + p1 + " ÷ " + d + " = " + q1 + "，" + (a - p1) + " ÷ " + d + " = " + (q - q1) + "；合起来 " + q + "。" };
  };
  G.mul_23 = function () {
    const a = int(101, 399), b = int(11, 59);
    if (b % 10 === 0) return G.mul_23();
    const bt = Math.floor(b / 10) * 10, bo = b % 10, s1 = a * bo, s2 = a * bt, ans = a * b;
    return { stem: a + " × " + b + " = ?", ans: ans, wrong: [s1 + a * (bt / 10), ans + a, ans - a, ans + 100, ans - 100, ans + 10],
      hint1: "把 " + b + " 拆成 " + bt + " 和 " + bo + "，分别去乘，再加起来。",
      hint2: a + " × " + bo + " = " + s1 + "；" + a + " × " + bt + " = " + s2 + "；" + s1 + " + " + s2 + " = " + ans + "。" };
  };
  G.mix = function () {
    const f = int(1, 3);
    if (f === 1) {
      const a = int(10, 60), b = int(2, 9), c = int(2, 9), ans = a + b * c;
      return { stem: a + " + " + b + " × " + c + " = ?", ans: ans, wrong: [(a + b) * c, ans + b, ans - c, ans + 10],
        hint1: "先算乘法，再算加法。",
        hint2: "先算 " + b + " × " + c + " = " + b * c + "，再算 " + a + " + " + b * c + " = " + ans + "。" };
    }
    if (f === 2) {
      const a = int(5, 40), b = int(5, 40), c = int(2, 9), ans = (a + b) * c;
      return { stem: "（" + a + " + " + b + "）× " + c + " = ?", ans: ans, wrong: [a + b * c, ans + c, ans - c, ans + 10],
        hint1: "先算括号里的，再算乘法。",
        hint2: "先算括号 " + a + " + " + b + " = " + (a + b) + "，再算 " + (a + b) + " × " + c + " = " + ans + "。" };
    }
    const a = int(11, 40), b = int(2, 9), c = int(5, a * b - 5), ans = a * b - c;
    return { stem: a + " × " + b + " - " + c + " = ?", ans: ans, wrong: [a * b + c, ans + 10, ans - 10, ans + 1],
      hint1: "先算乘法，再算减法。",
      hint2: "先算 " + a + " × " + b + " = " + a * b + "，再算 " + a * b + " - " + c + " = " + ans + "。" };
  };

  const POOL = {
    2: { 1: ["add_nc", "sub_nb", "mul_s"], 2: ["add_c", "sub_b", "mul_s"], 3: ["add_c", "sub_b", "mul_t"] },
    3: { 1: ["add3", "sub3", "mul_t"], 2: ["mul_md", "div1"], 3: ["mul_md", "div1"] },
    4: { 1: ["mul_md", "div1"], 2: ["mul_23", "mix"], 3: ["mul_23", "mix"] }
  };
  M.typesOfYear = function (year) {
    const s = {};
    [1, 2, 3].forEach(function (t) { POOL[year][t].forEach(function (x) { s[x] = true; }); });
    return Object.keys(s);
  };

  function options(ans, wrong) {
    const seen = {}, out = [];
    U.shuffle(wrong).forEach(function (w) {
      if (w > 0 && w !== ans && !seen[w] && out.length < 3) { seen[w] = true; out.push(w); }
    });
    let k = 2;
    while (out.length < 3) {
      const w = ans + (U.chance(0.5) ? k : -k);
      if (w > 0 && w !== ans && !seen[w]) { seen[w] = true; out.push(w); }
      k += 1;
    }
    const all = U.shuffle(out.concat([ans]));
    return { list: all, idx: all.indexOf(ans) };
  }

  M.make = function (year, tier, forceType) {
    const y = POOL[year] ? year : 4;
    let type = U.pick(POOL[y][tier] || POOL[y][1]);
    if (forceType && M.typesOfYear(y).indexOf(forceType) >= 0) type = forceType;
    const q = G[type]({ year: y, tier: tier });
    const o = options(q.ans, q.wrong);
    return { type: type, name: NAMES[type], year: y, tier: tier, stem: q.stem, options: o.list, answer: o.idx,
             ansValue: q.ans, hint1: q.hint1, hint2: q.hint2 };
  };

  // 连续答对 3 题升档，答错 2 题降档
  M.adapt = function (ms, correct) {
    if (correct) {
      ms.ok += 1; ms.bad = 0;
      if (ms.ok >= 3) { ms.tier = Math.min(3, ms.tier + 1); ms.ok = 0; }
    } else {
      ms.bad += 1; ms.ok = 0;
      if (ms.bad >= 2) { ms.tier = Math.max(1, ms.tier - 1); ms.bad = 0; }
    }
  };

  // 提示：死过 0 次不给；死过 1 次给思路；死过 2 次及以上给步骤和答案
  M.hintFor = function (p, q) {
    const n = p.memory.typeDeaths[q.type] || 0;
    if (n <= 0) return null;
    if (n === 1) return { level: 1, text: q.hint1 };
    return { level: 2, text: q.hint2 + " 答案是 " + q.ansValue + "。" };
  };

  O.M = M;
})(typeof window !== "undefined" ? window : globalThis);