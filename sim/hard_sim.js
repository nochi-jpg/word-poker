// ことばポーカー：本番のデータと判定（game/js/data.js・logic.js）をそのまま使うシミュレーター
// 使い方: node sim/hard_sim.js [学年] [hard|normal] [回数]
//   例: node sim/hard_sim.js 高学年 hard 2000
// 「ノーコン」＝一度も負けずにクリアした割合（解禁の条件）。「クリア」＝コンティニューありでクリアした割合
const fs = require("fs"), path = require("path");
global.window = undefined;
global.KP = {};
const load = f => new Function("window", "global", fs.readFileSync(path.join(__dirname, "..", "game", "js", f), "utf8"))({ KP: global.KP }, global);
load("data.js"); load("logic.js");
const KP = global.KP;
// 数値をためすとき：HARD='{"高学年":[{"len":{"4":1},"ok":0.5},...]}' node sim/hard_sim.js
if (process.env.HARD) for (const [k, v] of Object.entries(JSON.parse(process.env.HARD))) KP.GRADES[k].hard = v;

// 上手さ：文が成立するかを正しく見分けられる確率（1語ふえるごとにかけ算）
const SKILLS = { 上手: 0.97, ふつう: 0.85, にがて: 0.7 };

function candidates(grade, hand) {
  const g = KP.GRADES[grade], cs = hand.map(w => KP.card(grade, w));
  const S = cs.filter(c => c.r === "S"), P = cs.filter(c => c.r === "P"), M = cs.filter(c => c.r === "M"), N = cs.filter(c => c.r === "N");
  const sets = [[]]; for (const m of M) for (const x of sets.slice()) if (x.length < g.maxM) sets.push([...x, m]);
  const out = [];
  for (const s of S) for (const p of P) for (const ms of sets) {
    const base = { s: s.w, ms: ms.map(m => m.w), p: p.w, adj: [] };
    out.push(base);
    if (g.adj && N.length && KP.judge(grade, base).ok) {
      const nouns = [s, ...ms].filter(c => c.nt);
      for (const no of nouns) for (const a of N) out.push({ ...base, adj: [[no.w, a.w]] });
      const adj = [], used = new Set();
      for (const no of nouns) for (const a of N) {
        if (used.has(a.w) || adj.some(x => x[0] === no.w)) continue;
        adj.push([no.w, a.w]); if (KP.judge(grade, { ...base, adj }).ok) used.add(a.w); else adj.pop();
      }
      if (adj.length > 1) out.push({ ...base, adj: adj.slice() });
    }
  }
  return out;
}
function choose(grade, hand, acc) {
  const cs = candidates(grade, hand); let best = null, bv = -1;
  for (const st of cs) {
    const ok = KP.judge(grade, st).ok, n = KP.lenOf(st);
    const believe = Math.random() < Math.pow(acc, n - 1) ? ok : !ok;
    const v = believe ? n * 2 : -1;
    if (v > bv || (v === bv && Math.random() < .3)) { bv = v; best = st; }
  }
  if (bv < 0) { const two = cs.filter(c => KP.lenOf(c) === 2); best = two.length ? two[Math.floor(Math.random() * two.length)] : cs[0] || null; }
  return best;
}
const usedOf = st => [st.s, st.p, ...st.ms, ...st.adj.map(a => a[1])];

function playRun(grade, hard, acc) {
  const g = KP.GRADES[grade], dealers = hard ? g.hard : g.dealer, nStage = dealers.length;
  const deck = KP.newDeck(grade);
  let swaps = g.swaps;
  const st = { cont: false, first: Array(nStage).fill(null), lossBy: Array(nStage).fill(0), rounds: 0, lens: {}, dlens: {} };
  for (let d = 0; d < nStage; d++) {
    // 目標の語数：相手がよく出す語数（上手な子は相手の強さを知っている）
    const dd = dealers[d], avg = Object.entries(dd.len).reduce((a, [k, v]) => a + k * v, 0);
    const target = Math.ceil(avg * dd.ok + 0.2);
    let cleared = false, tries = 0;
    while (!cleared && tries < 40) {
      tries++;
      const m = { pile: KP.shuffle(deck.slice()), disc: [], hand: [], size: hard && g.hardHand ? g.hardHand : g.hand }; KP.refill(grade, m);
      let win = 0, lose = 0, guard = 0;
      while (win < 2 && lose < 2 && guard++ < 60) {
        st.rounds++;
        let pick = choose(grade, m.hand, acc), k = 0;
        while (pick && KP.lenOf(pick) < target && swaps > 0 && k < (swaps === Infinity ? 3 : 1)) {
          const keep = new Set(usedOf(pick)), out = m.hand.filter(w => !keep.has(w)); if (!out.length) break;
          m.hand = m.hand.filter(w => keep.has(w)); m.disc.push(...out); KP.refill(grade, m);
          swaps--; k++; pick = choose(grade, m.hand, acc);
        }
        if (!pick) { m.disc.push(...m.hand); m.hand = []; KP.refill(grade, m); continue; }
        const ok = KP.judge(grade, pick).ok, my = KP.scoreOf(grade, pick, ok);
        const dl = KP.dealerSentence(grade, d, hard), ds = KP.scoreOf(grade, dl.st, dl.ok);
        st.lens[KP.lenOf(pick)] = (st.lens[KP.lenOf(pick)] || 0) + 1; st.dlens[ds] = (st.dlens[ds] || 0) + 1;
        if (my > ds || (my === ds && ok && !dl.ok)) win++;
        else if (my < ds || (my === ds && !ok && dl.ok)) lose++;
        const used = usedOf(pick); m.hand = m.hand.filter(w => !used.includes(w)); m.disc.push(...used); KP.refill(grade, m);
      }
      if (st.first[d] === null) st.first[d] = win === 2;
      if (win === 2) cleared = true; else { st.lossBy[d]++; st.cont = true; }
    }
    if (!cleared) return { ...st, cleared: false };
    if (g.shop && d < nStage - 1 && !(hard && d === 3 && grade !== "高学年")) {
      if (swaps <= 1) swaps += g.shopSwap;
      else {
        const offer = KP.shopOffer(grade, deck);
        const want = offer.filter(w => { const c = KP.card(grade, w); return c.r === "P" || c.r === "N" || (c.r === "M" && ["とき", "ばしょ", "ようす", "たべもの"].includes(c.kind)); }).slice(0, 2);
        deck.push(...want);
      }
    }
  }
  return { ...st, cleared: true };
}

const [, , onlyGrade, modeArg = "hard", nArg = "1000"] = process.argv;
const hard = modeArg === "hard", N = +nArg;
for (const grade of KP.GRADE_LIST.filter(x => !onlyGrade || x === onlyGrade)) {
  const nStage = (hard ? KP.GRADES[grade].hard : KP.GRADES[grade].dealer).length;
  for (const [sk, acc] of Object.entries(SKILLS)) {
    let clear = 0, nocont = 0; const loss = Array(nStage).fill(0), fw = Array(nStage).fill(0), lens = {};
    for (let i = 0; i < N; i++) {
      const r = playRun(grade, hard, acc);
      if (r.cleared) clear++; if (r.cleared && !r.cont) nocont++;
      r.lossBy.forEach((v, k) => loss[k] += v); r.first.forEach((v, k) => fw[k] += v ? 1 : 0);
      for (const [k, v] of Object.entries(r.lens)) lens[k] = (lens[k] || 0) + v;
    }
    const tot = Object.values(lens).reduce((a, b) => a + b, 0);
    console.log(`${grade}${hard ? "ハード" : ""} ${sk}: ノーコン ${(nocont / N * 100).toFixed(0)}%  クリア ${(clear / N * 100).toFixed(0)}%  1回目で勝つ ${fw.map(v => (v / N * 100).toFixed(0) + "%").join(" / ")}  負けの回数 ${loss.map(v => (v / N).toFixed(1)).join("/")}  出した文 ${Object.keys(lens).sort((a, b) => a - b).map(k => `${k}語${(lens[k] / tot * 100).toFixed(0)}%`).join(" ")}`);
  }
}
