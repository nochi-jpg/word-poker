// ことばポーカー：判定・得点・ディーラーの文・山札
// 文の形（保存できる形）: {s:"犬が", ms:["公園で"], p:"走った", adj:[["犬が","かわいい"]]}
(function (KP) {
  const byW = {};
  KP.card = (grade, w) => {
    const g = KP.GRADES[grade];
    byW[grade] = byW[grade] || Object.fromEntries(g.pool.map(c => [c.w, c]));
    return byW[grade][w];
  };
  const sortM = ms => [...ms].sort((a, b) => KP.ORD.indexOf(a.kind) - KP.ORD.indexOf(b.kind));

  // 文（言葉の文字列）→ カード
  function resolve(grade, st) {
    const C = w => KP.card(grade, w);
    return { s: st.s ? C(st.s) : null, ms: st.ms.map(C), p: st.p ? C(st.p) : null, adj: (st.adj || []).map(([n, a]) => [C(n), C(a)]) };
  }

  // 判定：へんな文になった理由をすべて返す
  KP.judge = function (grade, st) {
    const g = KP.GRADES[grade], { s, ms, p, adj } = resolve(grade, st), why = [];
    if (!s) why.push("主語が ない");
    if (!p) why.push("述語が ない");
    if (why.length) return { ok: false, why };
    if (ms.length > g.maxM) why.push(`修飾語は ${g.maxM}まいまで`);
    if (!p.subj.includes(s.tag)) why.push(`「${s.w}」は「${p.w}」の 主語に なれない`);
    const kinds = new Set(), cs = new Set();
    for (const m of ms) {
      if (!m.any && !p.mods.includes(m.kind) && !(m.okP && m.okP.includes(p.w))) why.push(`「${m.w}」は「${p.w}」を くわしく できない`);
      else if (m.ngP && m.ngP.includes(p.w)) why.push(`「${m.w}」と「${p.w}」は 合わない`);
      if (kinds.has(m.kind)) why.push(`同じ しゅるいの 修飾語（${KP.CAT[m.kind]}）が 2つ ある`);
      if (m.cs && cs.has(m.cs)) why.push(`「${m.cs}」が 2つ ある`);
      for (const o of ms) if (m.ng && m.ng.includes(o.b)) why.push(`「${m.w}」と「${o.w}」は いっしょに 使えない`);
      kinds.add(m.kind); if (m.cs) cs.add(m.cs);
    }
    for (const [noun, a] of adj) {
      if (noun.adj === false) why.push(`「${noun.w}」は くわしく できない`);
      else if (!noun.nt || !a.to.includes(noun.nt) || (a.ngN && a.ngN.includes(noun.b))) why.push(`「${a.w}」は「${noun.b}」を くわしく できない`);
      if (a.ngP && a.ngP.includes(p.w)) why.push(`「${a.w}」と「${p.w}」は 意味が かさなる`);
    }
    const bs = [s.b, ...ms.map(m => m.b), ...adj.map(([, a]) => a.b)], seen = new Set();
    for (const x of bs) { if (seen.has(x)) why.push(`「${x}」が 2回 出てくる`); seen.add(x); }
    return { ok: !why.length, why: [...new Set(why)] };
  };

  // 文の言葉を、ならべる順（主語→いつ→どこで…→述語）で返す。くわしくする語は名詞の前
  KP.words = function (grade, st) {
    const r = resolve(grade, st), am = new Map(r.adj.map(([n, a]) => [n, a])), out = [];
    const push = c => { if (am.has(c)) out.push(am.get(c)); out.push(c); };
    if (r.s) push(r.s); sortM(r.ms).forEach(push); if (r.p) out.push(r.p);
    return out;
  };
  KP.lenOf = st => (st.s ? 1 : 0) + st.ms.length + (st.p ? 1 : 0) + (st.adj || []).length;
  KP.scoreOf = (grade, st, ok) => ok ? KP.lenOf(st) * 2 : (KP.GRADES[grade].burst ? 0 : KP.lenOf(st));

  // ---- 乱数 ----
  const rnd = () => Math.random();
  KP.shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const pickDist = d => { let x = rnd(), acc = 0; for (const [k, v] of Object.entries(d)) { acc += v; if (x <= acc) return +k; } return +Object.keys(d).pop(); };

  // ---- ディーラーの文：語数と成立をくじで決めて、同じカードデータから作る ----
  KP.dealerSentence = function (grade, dIdx, hard) {
    const g = KP.GRADES[grade], d = (hard ? g.hard : g.dealer)[dIdx], len = pickDist(d.len), wantOk = rnd() < d.ok;
    const P = g.pool, S_ = P.filter(c => c.r === "S"), M_ = P.filter(c => c.r === "M"), V_ = P.filter(c => c.r === "P"), N_ = P.filter(c => c.r === "N");
    for (let k = 0; k < 8000; k++) {
      const rest = len - 2;
      let nm = rest, na = 0;
      if (g.adj && rest > 0) { na = Math.floor(rnd() * (Math.min(rest, 2) + 1)); nm = rest - na; }
      if (nm > g.maxM) continue;
      const ms = KP.shuffle(M_.slice()).slice(0, nm), s = pick(S_), p = pick(V_);
      const nouns = KP.shuffle([s, ...ms].filter(c => c.nt)), adj = [];
      if (na > nouns.length) continue;
      const as = KP.shuffle(N_.slice());
      for (let i = 0; i < na; i++) adj.push([nouns[i].w, as[i].w]);
      const st = { s: s.w, ms: ms.map(m => m.w), p: p.w, adj };
      const j = KP.judge(grade, st);
      // 不成立の文は「主語と述語が合わない」「修飾語が述語に合わない」などで1つだけまちがえる
      if (j.ok === wantOk && (wantOk || j.why.length === 1)) return { st, ok: j.ok, why: j.why };
    }
    const st = { s: S_[0].w, ms: [], p: V_[0].w, adj: [] }; const j = KP.judge(grade, st);
    return { st, ok: j.ok, why: j.why };
  };

  // ---- 山札と手札 ----
  // m = {pile:[w], disc:[w], hand:[w]}
  KP.draw = function (grade, m) {
    const n = KP.GRADES[grade].hand;
    while (m.hand.length < n) {
      if (!m.pile.length) { if (!m.disc.length) break; m.pile = KP.shuffle(m.disc); m.disc = []; }
      m.hand.push(m.pile.pop());
    }
  };
  // 主語と述語の組が1つも作れない手札なら、引き直す（どの学年でも必ず文が作れるように）
  KP.canMake = (grade, hand) => {
    const cs = hand.map(w => KP.card(grade, w)), S = cs.filter(c => c.r === "S"), P = cs.filter(c => c.r === "P");
    return S.some(s => P.some(p => p.subj.includes(s.tag)));
  };
  KP.refill = function (grade, m) {
    KP.draw(grade, m);
    for (let k = 0; k < 20 && !KP.canMake(grade, m.hand); k++) { m.disc.push(...m.hand); m.hand = []; KP.draw(grade, m); }
  };
  KP.newDeck = function (grade) {
    const g = KP.GRADES[grade];
    if (g.startDeck) return g.startDeck.slice();
    // ランダムなデッキでも、主語と述語を3まいずつは入れる（文が作れない手札を防ぐ）
    for (let k = 0; k < 50; k++) {
      const d = KP.shuffle(g.pool.map(c => c.w)).slice(0, g.deckSize), cs = d.map(w => KP.card(grade, w));
      if (cs.filter(c => c.r === "S").length >= 3 && cs.filter(c => c.r === "P").length >= 3) return d;
    }
    return KP.shuffle(g.pool.map(c => c.w)).slice(0, g.deckSize);
  };
  KP.shopOffer = function (grade, deck) {
    const rest = KP.GRADES[grade].pool.map(c => c.w).filter(w => !deck.includes(w));
    return KP.shuffle(rest).slice(0, 8);
  };
})(typeof window !== "undefined" ? window.KP : global.KP);
