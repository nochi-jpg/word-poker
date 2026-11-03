// ことばポーカー：対戦（あいて4人×2本先取・ショップ・クリア。高学年ハードは ステージ？ をふくめて5人）
(function (KP) {
  const $ = KP.$, S3 = KP.S3;
  const D = () => KP.data(), R = () => KP.data().run;
  const G = () => KP.GRADES[R().grade];
  const card = w => KP.card(R().grade, w);
  const nStage = r => (r.hard ? KP.GRADES[r.grade].hard : KP.GRADES[r.grade].dealer).length;
  const dealerOf = r => r.hard && r.d === 4 ? KP.MISE : KP.DEALERS[r.grade][r.d];
  const save = () => KP.save.write();
  const SUB = c => c.r === "S" ? c.tag : c.r === "M" ? KP.CAT[c.kind] : c.r === "N" ? "名詞に かさねる" : "どうした";
  const cardHTML = c => { const [band, ink] = KP.COLOR[c.r]; return `<span class="bd" style="background:${band};color:${ink}">${KP.rb(KP.ROLE[c.r])}</span><span class="wd"><span>${KP.rb(c.w)}</span></span><span class="sb">${KP.rb(SUB(c))}</span>`; };
  const stageName = r => r.hard && r.d === 4 ? "ステージ ？" : `ステージ ${r.d + 1}`;

  // ---- 1プレイを始める／つづける ----
  KP.startRun = function (grade, hard) {
    const g = KP.GRADES[grade], n = (hard ? g.hard : g.dealer).length;
    D().run = { grade, hard: !!hard, d: 0, phase: "intro", deck: KP.newDeck(grade), swaps: g.swaps === Infinity ? null : g.swaps,
      tries: Array(n).fill(1), score: Array(n).fill(0), continued: false, m: null, offer: null };
    save(); return KP.runLoop();
  };
  function newMatch() {
    const r = R(), g = G(); r.m = { pile: KP.shuffle(r.deck.slice()), disc: [], hand: [], win: 0, lose: 0, size: r.hard && g.hardHand ? g.hardHand : g.hand };
    KP.refill(r.grade, r.m); // 最初のドローもすぐ保存（引き直し防止）
  }
  const lightOf = r => r.hard ? (r.d === 4 ? 4 : 5) : r.d;
  const bgmOf = r => r.hard && r.d === 4 ? null : r.d < 3 ? "stage" : r.grade === "高学年" ? "boss" : "stage4";
  function setScene(cam = "center") {
    const r = R(); S3.visible = true; S3.storyMode(false); S3.showTable(true); S3.setDealer(dealerOf(r).id); S3.showDealer(true);
    S3.light(lightOf(r), $("vig")); S3.camTo(cam, 0);
    $("battle").classList.toggle("hard", r.hard);
  }

  KP.runLoop = async function () {
    for (;;) {
      const r = R(); if (!r) return KP.toTitle();
      if (r.phase === "intro") {
        $("sel").classList.add("off");
        const dl = dealerOf(r);
        await KP.fade(() => { setScene("center"); KP.screen("battle"); hudUpdate(); KP.bgm(bgmOf(r)); }, 700, 1100, stageName(r) + (r.hard ? "　ハード" : ""));
        if (dl.pre) { S3.showDealer(false); await KP.say("", dl.pre); S3.light(4, $("vig")); await KP.wait(500); S3.showDealer(true); }
        else await KP.say("", r.d === nStage(r) - 1 ? "さいごの 相手が あらわれた！" : `${["{1人目|ひとりめ}", "{2人目|ふたりめ}", "{3人目|さんにんめ}", "{4人目|よにんめ}"][r.d]}の 相手が あらわれた！`);
        await KP.cutin(dl);
        S3.mood("カードを出す"); await KP.say(dl.name, dl.intro); S3.mood("基本");
        newMatch(); r.phase = "match"; save();
      } else if (r.phase === "retry") {
        await KP.fade(() => { setScene(); KP.screen("battle"); KP.bgm(bgmOf(r)); }, 500, 300);
        newMatch(); r.phase = "match"; save();
      } else if (r.phase === "match") {
        if (!$("battle").classList.contains("on")) { setScene(); KP.screen("battle"); KP.bgm(bgmOf(r)); resumed = true; } // 中断から もどった
        $("battle").classList.remove("shopping");
        const res = await playMatch();
        if (res === "pause") return KP.toTitle();
        if (res === "over") return gameOver();
        if (res === "win") {
          r.score[r.d] = r.tries[r.d] > 1 ? 10 : (r.m.lose ? 20 : 30);
          const last = r.d >= nStage(r) - 1, shopNext = G().shop && !last && !(r.hard && r.d === 3);
          r.d++; r.m = null;
          r.phase = last ? "clear" : (shopNext ? "shop" : "intro"); save();
        }
      } else if (r.phase === "lost") {
        setScene(); KP.screen("battle", { slide: false }); hudUpdate(); $("sel").classList.add("off"); S3.mood("嬉しい"); KP.bgm(bgmOf(r));
        const i = await KP.choose(dealerOf(r).name, "負けてしまった……。この あいてと、もう一度 勝負する？", ["コンティニュー", "やめる"]);
        if (i === 0) { r.continued = true; r.tries[r.d]++; r.phase = "retry"; save(); }
        else { D().run = null; save(); return KP.toTitle(); }
      } else if (r.phase === "over") {
        return gameOver();
      } else if (r.phase === "shop") {
        await shop(); r.phase = "intro"; r.offer = null; save();
      } else if (r.phase === "clear") {
        return clear();
      }
    }
  };

  // ---- ハードのタイマー：1手30秒。0になると ゲームオーバー ----
  let resumed = false;
  const T = { left: KP.TIMER, run: false, last: 0, raf: 0, onEnd: null, tick: -1 };
  function drawTimer() {
    const f = Math.max(0, T.left / KP.TIMER), n = Math.ceil(Math.max(0, T.left));
    $("tFill").style.width = (f * 100) + "%"; $("tNum").textContent = n;
    $("tGauge").classList.toggle("low", T.left <= 10);
    if (T.run && n <= 5 && n !== T.tick && n > 0) { T.tick = n; KP.se("cursor", 1.6); }
  }
  function timerLoop(now) {
    if (!T.run) return;
    T.left -= (now - T.last) / 1000; T.last = now; drawTimer();
    if (T.left <= 0) { T.run = false; T.left = 0; drawTimer(); const e = T.onEnd; T.onEnd = null; e && e(); return; }
    T.raf = requestAnimationFrame(timerLoop);
  }
  function timerStart(sec, onEnd) { T.left = sec; T.onEnd = onEnd; T.tick = -1; T.run = true; T.last = performance.now(); drawTimer(); cancelAnimationFrame(T.raf); T.raf = requestAnimationFrame(timerLoop); }
  function timerPause() { T.run = false; cancelAnimationFrame(T.raf); }
  function timerResume() { if (T.run || !T.onEnd || T.left <= 0) return; T.run = true; T.last = performance.now(); T.raf = requestAnimationFrame(timerLoop); }
  function timerStop() { T.run = false; T.onEnd = null; cancelAnimationFrame(T.raf); }
  KP.timerState = () => ({ left: T.left, run: T.run }); // 自動チェック用
  KP.timerSet = s => { T.left = s; };

  // ---- ゲームオーバー（ハード：コンティニューなし） ----
  async function gameOver() {
    const r = R(); timerStop();
    D().run = null; save();
    $("sel").classList.add("off"); $("battle").classList.remove("swapping");
    await KP.popup("ゲームオーバー", [`<div class="big-note">ゲームオーバー</div>${r && r.over === "time" ? "時間切れです。" : "あいてに 負けてしまった……。"}ハードは コンティニューできません。<br>もう一度 ちょうせんしよう！`]);
    KP.toTitle();
  }

  // ---- 上の表示 ----
  function hudUpdate() {
    const r = R(), m = r.m || { win: 0, lose: 0 };
    KP.setRb($("hDealer"), r.hard && r.d === 4 ? "ステージ ？" : `ステージ ${Math.min(r.d + 1, nStage(r))} / ${r.hard && r.grade === "高学年" ? 4 : nStage(r)}`);
    $("hStars").innerHTML = `あなた${KP.star(m.win > 0)}${KP.star(m.win > 1)}<span class="sp"></span>あいて${KP.star(m.lose > 0)}${KP.star(m.lose > 1)}`;
    const sw = $("hSwap"), n = $("swapN");
    if (r.swaps === null) { KP.setRb(sw.firstChild, "入れかえ"); KP.setRb(n, "何回でも"); n.classList.add("inf"); }
    else { KP.setRb(sw.firstChild, "入れかえ のこり"); n.textContent = r.swaps; n.classList.remove("inf"); }
  }

  // ---- カード選び ----
  let sel, hold, swapMode, marks, busy, endMatch, fresh = [], fly = null;
  const inSel = w => sel.s === w || sel.p === w || sel.ms.includes(w) || sel.adj.some(a => a[1] === w);
  function removeW(w) {
    if (sel.s === w) sel.s = null; if (sel.p === w) sel.p = null;
    sel.ms = sel.ms.filter(x => x !== w);
    sel.adj = sel.adj.filter(([n, a]) => n !== w && a !== w && (n === sel.s || sel.ms.includes(n)));
  }
  const rectOf = e => { const b = e.getBoundingClientRect(), st = $("stage").getBoundingClientRect(), s = KP.scale || 1; return { x: (b.left - st.left) / s, y: (b.top - st.top) / s, w: b.width / s, h: b.height / s }; };
  function clickHand(w, ev) {
    if (busy) return; const c = card(w);
    const from = ev && ev.currentTarget ? rectOf(ev.currentTarget) : null;
    if (swapMode) { marks.has(w) ? marks.delete(w) : marks.add(w); KP.se("cursor", .9); return render(); }
    if (hold === w) { hold = null; return render(); }
    if (inSel(w)) { removeW(w); hold = null; return render(); }
    hold = null;
    if (c.r === "S") { if (sel.s) removeW(sel.s); sel.s = w; }
    else if (c.r === "P") { if (sel.p) removeW(sel.p); sel.p = w; }
    else if (c.r === "M") { if (sel.ms.length >= G().maxM) return flashHint(`修飾語は ${G().maxM}まいまで。いらない修飾語を タップして もどそう`); sel.ms.push(w); }
    else if (c.r === "N") { hold = w; KP.se("cursor", 1.3); return render(); }
    fly = from ? { w, from, to: "slot" } : null; KP.se("place");
    render();
  }
  function clickSlot(w, ev) {
    if (busy || swapMode) return;
    fly = { w, from: rectOf(ev.currentTarget), to: "hand" }; removeW(w); render();
  }
  function clickAdj(noun, ev) {
    if (busy || swapMode) return;
    const cur = sel.adj.find(a => a[0] === noun);
    if (hold) { sel.adj = sel.adj.filter(a => a[0] !== noun && a[1] !== hold); sel.adj.push([noun, hold]); fly = ev ? { w: hold, from: rectOf($("hand").querySelector(`[data-w="${hold}"]`) || ev.currentTarget), to: "adj" } : null; hold = null; KP.se("place"); }
    else if (cur) sel.adj = sel.adj.filter(a => a !== cur);
    render();
  }
  let hintTimer = null, hintOver = null;
  function flashHint(t) { hintOver = t; clearTimeout(hintTimer); hintTimer = setTimeout(() => { hintOver = null; render(); }, 2200); render(); }

  // 手札から枠へ（枠から手札へ）カードが飛ぶ
  function doFly() {
    if (!fly || KP.S3.lite) { fly = null; return; }
    const { w, from, to } = fly; fly = null;
    const sel = to === "slot" ? `#slots .scard[data-w="${w}"]` : to === "adj" ? `#slots .adj[data-w="${w}"]` : `#hand .hcard[data-w="${w}"]`;
    const el = document.querySelector(sel); if (!el) return;
    const t = rectOf(el), dx = from.x - t.x + (from.w - t.w) / 2, dy = from.y - t.y + (from.h - t.h) / 2, sk = to === "hand" ? "" : " skewX(-8deg)";
    const base = to === "hand" ? el.style.transform : "skewX(-8deg)";
    el.animate([{ transform: `translate(${dx}px,${dy}px) rotate(${to === "hand" ? -8 : 8}deg) scale(${from.w / t.w})${sk}`, zIndex: 5 },
      { transform: `translate(${dx * .1}px,${dy * .1 - 18}px) scale(1.08)${sk}`, offset: .75 }, { transform: base }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
  }

  function render() {
    const r = R(), g = G(), hand = r.m.hand;
    $("battle").classList.toggle("swapping", !!swapMode);
    // 手札
    const h = $("hand"); h.innerHTML = "";
    const newOnes = hand.filter(w => fresh.includes(w));
    hand.forEach((w, i) => {
      const c = card(w), b = KP.el("button", "hcard", cardHTML(c));
      b.dataset.box = ""; b.dataset.w = w;
      if (!swapMode && inSel(w)) b.classList.add("used");
      if (hold === w) b.classList.add("hold");
      if (swapMode && marks.has(w)) b.classList.add("mark");
      const rot = [-3, 2, -1, 3, -2, 1, -3, 2][i];
      b.style.transform = `rotate(${rot}deg)`; b.style.setProperty("--rot", rot + "deg");
      const ni = newOnes.indexOf(w);
      b.addEventListener("animationend", e => { if (e.animationName === "deal") b.classList.remove("new"); });
      if (ni >= 0 && !KP.S3.lite) { b.classList.add("new"); b.style.animationDelay = (ni * 110) + "ms"; setTimeout(() => KP.se("flip", 1 + Math.random() * .2), ni * 110 + 60); }
      b.onclick = ev => clickHand(w, ev);
      h.appendChild(b);
    });
    fresh = [];
    const wds = [...h.querySelectorAll(".wd")]; wds.forEach(e => KP.refit(e, 11));
    const mn = Math.min(...wds.map(e => parseFloat(e.style.fontSize))); wds.forEach(e => e.style.fontSize = mn + "px");
    // 文の枠：主語・修飾語（いつ→どこで…の順）・述語
    const sl = $("slots"); sl.innerHTML = "";
    const ms = [...sel.ms].sort((a, b) => KP.ORD.indexOf(card(a).kind) - KP.ORD.indexOf(card(b).kind));
    const slots = [["S", sel.s], ...Array.from({ length: g.maxM }, (_, i) => ["M", ms[i] || null]), ["P", sel.p]];
    for (const [role, w] of slots) {
      const s = KP.el("div", "slot"), adj = KP.el("div", "adj"), sc = KP.el("div", "scard");
      adj.dataset.box = ""; sc.dataset.box = "";
      const c = w && card(w);
      if (g.adj && c && c.nt) {
        const a = sel.adj.find(x => x[0] === w);
        if (a) { adj.classList.add("full"); KP.setRb(adj, a[1]); adj.dataset.w = a[1]; }
        else { adj.classList.add("can"); KP.setRb(adj, "くわしくする語"); if (hold) adj.classList.add("glow"); }
        adj.onclick = ev => clickAdj(w, ev);
        if (hold) sc.classList.add("noun");
      } else if (!g.adj) adj.style.display = "none";
      if (c) {
        const [band, ink] = KP.COLOR[c.r]; sc.classList.add("full"); sc.dataset.w = w;
        sc.innerHTML = `<div class="bd" style="background:${band};color:${ink}">${KP.rb(KP.ROLE[c.r])}</div><div class="wd"><span>${KP.rb(c.w)}</span></div>`;
        sc.onclick = ev => clickSlot(w, ev);
      } else sc.innerHTML = `<div class="bd">${KP.rb(KP.ROLE[role])}</div><div class="wd"></div>`;
      s.append(adj, sc); sl.appendChild(s);
    }
    sl.style.top = g.adj ? "384px" : "418px";
    sl.querySelectorAll(".scard .wd").forEach(e => KP.refit(e, 11));
    sl.querySelectorAll(".adj.full").forEach(e => KP.refit(e, 11));
    // いまの文と点数
    const st = { s: sel.s, ms: sel.ms, p: sel.p, adj: sel.adj }, n = KP.lenOf(st);
    const pv = $("pvText"); pv.innerHTML = KP.rb(n ? KP.words(r.grade, st).map(c => c.w).join(" ") : "カードを えらんで 文を つくろう"); KP.refit(pv, 14);
    const ps = $("pvScore"); KP.setRb(ps, sel.s && sel.p ? `${n}語 → 成立なら ${n * 2}点` : "主語と述語が ひつよう"); KP.refit(ps, 12);
    // ヒント
    const hi = $("hint");
    KP.setRb(hi, hintOver || (swapMode ? "入れかえる カードを えらんで、「入れかえる」を おそう" :
      hold ? "くわしくしたい 名詞の 上の わくを タップしよう" :
      !sel.s ? "主語（赤）を 1まい えらぼう" : !sel.p ? "述語（青）を 1まい えらぼう" :
      g.adj ? "修飾語（黄）や くわしくする語（緑）で 文を 長くしよう" : "修飾語（黄）で 文を 長くできるよ"));
    KP.refit(hi, 12);
    // ボタン
    const bs = $("bSwap"), bg = $("bGo");
    if (swapMode) { KP.setRb(bs, "やめる"); bs.disabled = busy; KP.setRb(bg, "入れかえる"); bg.disabled = busy || !marks.size; }
    else { KP.setRb(bs, "入れかえ"); bs.disabled = busy || r.swaps === 0; KP.setRb(bg, "決定！"); bg.disabled = busy || !(sel.s && sel.p); }
    [bs, bg].forEach(b => KP.refit(b, 14));
    if (!busy) S3.mood(n ? "思考" : "基本");
    hudUpdate(); doFly();
  }

  async function playMatch() {
    sel = { s: null, ms: [], p: null, adj: [] }; hold = null; swapMode = false; marks = new Set(); busy = false;
    const r = R(); fresh = r.m.hand.slice();
    const p = new Promise(res => { endMatch = res; });
    await S3.camTo("sel", 800);
    $("sel").classList.remove("off"); render(); KP.slideIn($("battle"));
    startTurnTimer();
    return p;
  }
  function startTurnTimer() {
    const r = R(); if (!r.hard) return;
    timerStart(resumed ? KP.TIMER_RESUME : KP.TIMER, timeUp); resumed = false;
  }
  // 時間切れ：その場で 保存してから（やり直し防止）演出
  async function timeUp() {
    const r = R(); if (!r || !endMatch) return;
    busy = true; swapMode = false; hold = null; r.phase = "over"; r.over = "time"; save();
    $("battle").classList.remove("swapping"); $("sel").classList.add("off");
    KP.se("ko"); S3.mood("嬉しい"); await S3.camTo("center", 600);
    await KP.stamp("時間切れ！", "", 1300);
    await KP.say(dealerOf(r).name, dealerOf(r).win);
    busy = false; const e = endMatch; endMatch = null; e("over");
  }
  // ハードでは「デッキ」「中断」のあいだ タイマーを止め、うしろを まっくらにする（手札を見て考えられないように）
  async function pausedPopup(fn) {
    const r = R(); timerPause();
    $("pop").classList.toggle("black", !!r.hard);
    try { return await fn(); } finally { $("pop").classList.remove("black"); }
  }
  $("bSwap").onclick = () => {
    if (busy) return;
    if (swapMode) { swapMode = false; marks.clear(); return render(); }
    sel = { s: null, ms: [], p: null, adj: [] }; hold = null; swapMode = true; marks = new Set(); render();
  };
  $("bGo").onclick = () => { if (busy) return; swapMode ? doSwap() : decide(); };
  $("hPause").onclick = async () => {
    if (busy || !endMatch) return; busy = true;
    const i = await pausedPopup(() => KP.popup("中断", ["ここまでの きろくを 保存して、タイトルに もどります。<br>つぎは タイトルの「プレイ」から「前回のつづき」を えらぶと、つづきから 遊べます。" + (R().hard ? "<br>ハードは、もどったとき タイマーが 15秒から はじまります。" : "")], { buttons: ["中断する", "つづける"] }));
    busy = false;
    if (i === 0) { timerStop(); save(); const e = endMatch; endMatch = null; $("battle").classList.remove("swapping"); e("pause"); } else { render(); timerResume(); }
  };

  function doSwap() {
    const r = R(), m = r.m;
    m.hand = m.hand.filter(w => !marks.has(w)); m.disc.push(...marks);
    const before = new Set(m.hand); KP.draw(r.grade, m); fresh = m.hand.filter(w => !before.has(w));
    if (r.swaps !== null) r.swaps--;
    swapMode = false; marks.clear(); save(); render();
  }

  // ---- 決定：結果を先に計算して保存してから、演出する（やり直し防止） ----
  async function decide() {
    const r = R(), m = r.m;
    const pst = { s: sel.s, ms: sel.ms.slice(), p: sel.p, adj: sel.adj.map(a => a.slice()) };
    const pj = KP.judge(r.grade, pst), ps = KP.scoreOf(r.grade, pst, pj.ok);
    const dl = KP.dealerSentence(r.grade, r.d, r.hard), ds = KP.scoreOf(r.grade, dl.st, dl.ok);
    let res, reason;
    if (ps > ds) { res = "win"; reason = `${ps}点 対 ${ds}点で、あなたの勝ち！`; }
    else if (ps < ds) { res = "lose"; reason = `${ps}点 対 ${ds}点で、あいての勝ち。`; }
    else if (pj.ok && !dl.ok) { res = "win"; reason = "同点なので、文が正しい あなたの勝ち！"; }
    else if (!pj.ok && dl.ok) { res = "lose"; reason = "同点だけど、文が正しい あいての勝ち。"; }
    else { res = "draw"; reason = `同点で、どちらも ${pj.ok ? "文が正しい" : "へんな文な"}ので 引き分け。もう一度！`; }
    if (res === "win") m.win++; if (res === "lose") m.lose++;
    const used = [pst.s, pst.p, ...pst.ms, ...pst.adj.map(a => a[1])];
    m.hand = m.hand.filter(w => !used.includes(w)); m.disc.push(...used);
    const before = new Set(m.hand); KP.refill(r.grade, m);
    const matchEnd = m.win >= 2 ? "win" : m.lose >= 2 ? "lose" : null;
    if (matchEnd === "lose") { r.phase = r.hard ? "over" : "lost"; r.over = "lose"; } // 負けた瞬間に保存（ハードは コンティニューなし）
    timerStop(); save();
    busy = true; hold = null; $("sel").classList.add("off");
    await reveal({ pst, pj, ps, dl, ds, res, reason });
    sel = { s: null, ms: [], p: null, adj: [] };
    if (matchEnd) {
      const d = dealerOf(r); KP.se("ko");
      if (matchEnd === "win") { S3.mood("悔しい"); await KP.stamp("勝利！", "red", 1200); await KP.say(d.name, d.lose); }
      else { S3.mood("嬉しい"); await KP.stamp("敗北……", "", 1200); await KP.say(d.name, d.win); }
      busy = false; const e = endMatch; endMatch = null; return e(matchEnd === "lose" && r.hard ? "over" : matchEnd);
    }
    fresh = m.hand.filter(w => !before.has(w));
    await S3.camTo("sel", 800);
    busy = false; $("sel").classList.remove("off"); render(); startTurnTimer();
  }

  async function reveal({ pst, pj, ps, dl, ds, res, reason }) {
    const r = R(), g = G(), d = dealerOf(r), grade = r.grade;
    const pw = KP.words(grade, pst), dw = KP.words(grade, dl.st);
    S3.mood("カードを出す");
    await S3.camTo("center", 700);
    const placed = S3.place(dw, pw); KP.se("place");
    await KP.wait(250); await S3.camTo("top", 850); KP.se("flip"); await S3.flip(); KP.se("flip", 1.2);
    if (pj.ok) S3.bounce(placed.p); else if (g.burst) S3.burst(placed.p);
    if (dl.ok) S3.bounce(placed.d); else if (g.burst) S3.burst(placed.d);
    await KP.wait(900);
    await S3.camTo("judge", 800);
    S3.mood(res === "win" ? "悔しい" : res === "lose" ? "嬉しい" : "思考");
    hudUpdate();
    await judgePanel({ pst, pj, ps, dl, ds, res, reason });
    if (!(r.m.win >= 2 || r.m.lose >= 2)) await KP.say(d.name, res === "lose" ? d.rw : res === "win" ? d.rl : "引き分けね。もう一回！");
    S3.clear(); S3.mood("基本");
  }

  // ---- 点数の計算：3Dの上に重ねる赤いパネル（ばん、ばん、ばん） ----
  function judgePanel({ pst, pj, ps, dl, ds, res, reason }) {
    return new Promise(async done => {
      const r = R(), g = G(), J = $("judge"), grade = r.grade;
      const fill = (row, st, j, sc) => {
        const box = row.querySelector(".jcards"); box.innerHTML = "";
        const adjOf = new Map((st.adj || []).map(([n, a]) => [n, a]));
        const ws = [st.s, ...[...st.ms].sort((a, b) => KP.ORD.indexOf(card(a).kind) - KP.ORD.indexOf(card(b).kind)), st.p];
        ws.forEach(w => {
          const c = card(w), [band, ink] = KP.COLOR[c.r], col = KP.el("div", "jcol");
          col.appendChild(adjOf.has(w) ? KP.el("div", "jadj", KP.rb(adjOf.get(w))) : KP.el("div", "jadj none"));
          col.appendChild(KP.el("div", "jc", `<div class="bd" style="background:${band};color:${ink}">${KP.rb(KP.ROLE[c.r])}</div><div class="wd"><span>${KP.rb(c.w)}</span></div>`));
          box.appendChild(col);
        });
        const n = KP.lenOf(st);
        KP.setRb(row.querySelector(".jf"), j.ok ? `成立　${n}語 × 2` : g.burst ? `バースト　${n}語 × 0` : `へんな文　${n}語 × 1`);
        KP.setRb(row.querySelector(".jp"), `${sc}点`);
        row.classList.toggle("ng", !j.ok);
        row.querySelectorAll(".jcol").forEach(e => e.classList.remove("on")); row.querySelector(".jf").classList.remove("on"); row.querySelector(".jp").classList.remove("on");
      };
      fill($("jD"), dl.st, dl, ds); fill($("jP"), pst, pj, ps);
      const bt = J.querySelector(".jbt"), bs = J.querySelector(".jbs"), band = $("jBand");
      KP.setRb(bt, pj.ok ? "成立！" : g.burst ? "バースト！" : "へんな文……");
      KP.setRb(bs, res === "win" ? "あなたの勝ち" : res === "lose" ? "あいての勝ち" : "引き分け");
      $("jBurst").classList.toggle("ng", !pj.ok);
      const why = [];
      if (!pj.ok) why.push(`あなたの文：${pj.why[0]}。`);
      if (!dl.ok) why.push(`あいての文：${dl.why[0]}。`);
      band.querySelector(".jtx").innerHTML = `<span>${KP.rb(why.join("　") + reason)}</span>`;
      $("jBurst").classList.remove("on"); band.classList.remove("on");
      $("battle").classList.add("judging"); J.classList.add("on"); J.querySelectorAll(".jc .wd").forEach(e => KP.refit(e, 10)); KP.refit(band.querySelector(".jtx"), 13);
      let skip = false; J.onclick = () => { skip = true; };
      const w = ms => skip ? Promise.resolve() : KP.wait(ms);
      const bang = (e, s = "bang") => { e.classList.add("on"); if (!skip) KP.se(s); };
      await w(250);
      for (const row of [$("jD"), $("jP")]) {
        const cols = [...row.querySelectorAll(".jcol")];
        for (const c of cols) { c.classList.add("on"); if (!skip) KP.se("place", 1.1); await w(70); }
        await w(160); bang(row.querySelector(".jf")); await w(330); bang(row.querySelector(".jp")); await w(420);
      }
      $("jBurst").classList.add("on"); KP.se(pj.ok ? "good" : "ng"); await w(320);
      band.classList.add("on"); await w(200);
      // クリックで つぎへ
      J.classList.add("wait"); skip = false;
      await new Promise(r2 => { J.onclick = r2; });
      J.onclick = null; J.classList.remove("on", "wait"); $("battle").classList.remove("judging"); done();
    });
  }

  // ---- いまのデッキを見る（カード選択・ショップ）。1ページ24まい、ボタンでページ切りかえ ----
  KP.showDeck = function (extra = []) {
    const r = R(), m = r.m, deck = r.deck.slice().sort((a, b) => "SMNP".indexOf(card(a).r) - "SMNP".indexOf(card(b).r));
    const where = w => !m ? "" : m.hand.includes(w) ? "h" : m.disc.includes(w) ? "d" : "p";
    const label = { h: "手札", d: "すて札", p: "山札", "": "" };
    const per = 24, pages = [];
    for (let i = 0; i < Math.max(1, deck.length); i += per) {
      const part = deck.slice(i, i + per);
      pages.push(body => {
        const cnt = r => deck.filter(w => card(w).r === r).length;
        body.innerHTML = `<div class="dksum">${KP.rb(`デッキ ${deck.length}まい（主語 ${cnt("S")}・修飾語 ${cnt("M")}${G().adj ? `・くわしくする語 ${cnt("N")}` : ""}・述語 ${cnt("P")}）${m ? "　手札・山札・すて札を 表示" : ""}`)}</div><div class="deckgrid"></div>`;
        const grid = body.querySelector(".deckgrid");
        part.forEach(w => {
          const c = card(w), [band, ink] = KP.COLOR[c.r], wh = where(w);
          const e = KP.el("div", "dk", `<div class="bd" style="background:${band};color:${ink}">${KP.rb(KP.ROLE[c.r])}</div><div class="wd"><span>${KP.rb(c.w)}</span></div>` + (wh ? `<div class="st ${wh}">${KP.rb(label[wh])}</div>` : ""));
          e.dataset.box = ""; grid.appendChild(e);
        });
        grid.querySelectorAll(".wd").forEach(e => KP.fit(e, 10));
      });
    }
    void extra;
    return KP.popup("いまのデッキ", pages, { minH: 400 });
  };
  $("hDeck").onclick = async () => { if (busy || !endMatch) return; busy = true; await pausedPopup(() => KP.showDeck()); busy = false; render(); timerResume(); };
  $("spDeck").onclick = () => KP.showDeck();

  // ---- 自動チェック用：手札からいちばん点の高い文を、実際の操作で作る ----
  KP.botPick = function () {
    const r = R(), g = G(), cs = r.m.hand.map(card), S = cs.filter(c => c.r === "S"), P = cs.filter(c => c.r === "P"), M = cs.filter(c => c.r === "M"), N = cs.filter(c => c.r === "N");
    const subsets = [[]]; for (const m of M) for (const x of subsets.slice()) if (x.length < g.maxM) subsets.push([...x, m]);
    let best = null, bv = -1;
    for (const s of S) for (const p of P) for (const ms of subsets) {
      const st = { s: s.w, ms: ms.map(m => m.w), p: p.w, adj: [] };
      if (g.adj) { const used = new Set(); for (const no of [s, ...ms].filter(c => c.nt)) for (const a of N) { if (used.has(a.w) || st.adj.some(x => x[0] === no.w)) continue; st.adj.push([no.w, a.w]); if (KP.judge(r.grade, st).ok) used.add(a.w); else st.adj.pop(); } }
      const v = KP.scoreOf(r.grade, st, KP.judge(r.grade, st).ok);
      if (v > bv) { bv = v; best = st; }
    }
    sel = { s: null, ms: [], p: null, adj: [] }; hold = null; swapMode = false;
    clickHand(best.s); clickHand(best.p); best.ms.forEach(w => clickHand(w)); best.adj.forEach(([n, a]) => { clickHand(a); clickAdj(n); });
    return bv;
  };

  // ---- ショップ（中・高学年、あいて1〜3のあと） ----
  async function shop() {
    const r = R(), sh = KP.SHOP, g = G();
    $("sel").classList.add("off");
    await KP.fade(() => {
      KP.screen("battle", { slide: false }); hudUpdate(); KP.bgm("story"); $("battle").classList.add("shopping");
      S3.visible = true; S3.storyMode(false); S3.showTable(true); S3.setDealer("shop"); S3.showDealer(true); S3.light(r.hard ? 5 : Math.max(0, r.d - 1), $("vig")); S3.camTo("center", 0);
    }, 600, 500, "ショップ");
    await KP.cutin(sh);
    await KP.say(sh.name, sh.hello);
    const i = await KP.choose(sh.name, `どちらに なさいますか？（いまの入れかえ のこり：${r.swaps}回）`, ["カードを買う", `入れかえ +${g.shopSwap}`]);
    if (i === 1) { r.swaps += g.shopSwap; save(); hudUpdate(); KP.se("shop"); await KP.say(sh.name, `入れかえが ${g.shopSwap}回 ふえて、${r.swaps}回に なりました。`); }
    else {
      if (!r.offer) { r.offer = KP.shopOffer(r.grade, r.deck); save(); }
      await KP.say(sh.name, sh.buyMsg);
      await S3.camTo("top"); S3.showDealer(false);
      const got = await pickCards(r.offer); S3.showDealer(true);
      r.deck.push(...got); save(); KP.se("shop");
      KP.screen("battle", { slide: false }); await S3.camTo("center");
      await KP.say(sh.name, `${got.length}まい デッキに 加えました。デッキは ${r.deck.length}まいに なりました。`);
    }
    await KP.say(sh.name, sh.bye);
  }
  function pickCards(offer) {
    return new Promise(res => {
      const on = new Set(), box = $("spCards"); KP.screen("shopPick");
      const draw = first => {
        box.innerHTML = "";
        offer.forEach((w, i) => {
          const c = card(w), b = KP.el("button", "hcard" + (on.has(w) ? " on" : ""), cardHTML(c));
          b.dataset.box = "";
          b.addEventListener("animationend", e => { if (e.animationName === "deal") b.classList.remove("new"); });
          if (first && !KP.S3.lite) { b.classList.add("new"); b.style.animationDelay = i * 90 + "ms"; setTimeout(() => KP.se("flip"), i * 90 + 60); }
          b.onclick = () => { on.has(w) ? on.delete(w) : on.size < 4 && on.add(w); KP.se("cursor"); draw(); };
          box.appendChild(b);
        });
        const wds = [...box.querySelectorAll(".wd")]; wds.forEach(e => KP.fit(e, 12));
        const mn = Math.min(...wds.map(e => parseFloat(e.style.fontSize))); wds.forEach(e => e.style.fontSize = mn + "px");
        KP.setRb($("spInfo"), `えらんだ カード：${on.size}まい（デッキ ${R().deck.length}→${R().deck.length + on.size}まい）`); KP.refit($("spInfo"), 12);
        $("spOk").disabled = !on.size;
      };
      $("spOk").onclick = () => { if (on.size) res([...on]); };
      draw(true);
    });
  }

  // ---- クリア ----
  const rankOf = (score, max) => { const q = score / max; return q >= 1 ? "S" : q >= .83 ? "A" : q >= .66 ? "B" : q >= .5 ? "C" : "D"; };
  KP.rankOfRun = rankOf;
  async function clear() {
    const r = R(), dat = D(), n = nStage(r), total = r.score.reduce((a, b) => a + b, 0), rank = rankOf(total, n * 30);
    const ppl = r.hard && r.grade === "高学年" ? [...KP.DEALERS[r.grade], KP.MISE] : KP.DEALERS[r.grade];
    await KP.fade(() => { S3.visible = false; KP.screen("result", { slide: false }); KP.bgm("title"); }, 600, 200);
    const resEl = $("result"); resEl.classList.add("dealing"); resEl.querySelectorAll(".shown").forEach(e => e.classList.remove("shown"));
    KP.setRb($("rTitle"), r.hard ? "ハード クリア！" : "クリア！");
    const rows = $("rRows"); rows.innerHTML = ""; rows.classList.toggle("five", n === 5);
    ppl.forEach((d, i) => {
      const t = r.tries[i] > 1 ? "やり直して 勝ち" : r.score[i] === 30 ? "ストレート勝ち" : "{2勝|にしょう} {1敗|いっぱい}";
      const e = KP.el("div", "rrow", `<span>${KP.rb((i === 4 ? "ステージ？" : `ステージ${i + 1}`) + "　" + d.name)}</span><span>${KP.rb(t)}</span><b>${KP.rb(r.score[i] + "/30点")}</b>`);
      e.dataset.box = ""; rows.appendChild(e);
    });
    const tot = KP.el("div", "rrow total", `<span>${KP.rb(r.grade + (r.hard ? "ハード" : ""))}　${KP.rb("合計")}</span><span></span><b>${KP.rb(total + "/" + n * 30 + "点")}</b>`); tot.dataset.box = ""; rows.appendChild(tot);
    $("rRank").innerHTML = `<div class="rl">ランク</div><div class="rv">${rank}</div>`;
    // ゆっくり 1つずつ（クリック・タップで とばせる）
    let fast = false; resEl.onpointerdown = () => { fast = true; };
    const wt = ms => fast ? Promise.resolve() : KP.wait(ms);
    const show = (e, s = "place") => { e.classList.add("shown"); if (!fast) KP.se(s); };
    await wt(300); show($("rTitle"), "slide"); await wt(450);
    for (const e of rows.children) { show(e); await wt(420); }
    await wt(250); show($("rRank"), "bang"); await wt(600);
    const notes = [], after = []; let unlocked = false;
    const bestKey = r.hard ? "bestHard" : "best", best = dat[bestKey][r.grade];
    if (!best || total > best.score) { dat[bestKey][r.grade] = { score: total, rank }; notes.push("ハイスコアを 記録しました！"); }
    if (!r.continued) {
      const ng = KP.NEXT_GRADE[r.grade];
      if (!r.hard) {
        const ep = KP.EP_OF_GRADE[r.grade];
        if (ng && !dat.grades.includes(ng)) { dat.grades.push(ng); dat.gradeNew = ng; unlocked = true; notes.push(`${ng}モードが 解禁されました！`); }
        if (!dat.eps.includes(ep)) { dat.eps.push(ep); after.push(["ep", ep]); notes.push(`おはなし「${KP.EP_TITLES[ep]}」が 見られるように なりました！`); }
        if (r.grade === "高学年" && !dat.hard.length) { dat.hard.push("低学年"); dat.hardNew = true; after.push(["hard"]); }
      } else {
        if (ng && !dat.hard.includes(ng)) { dat.hard.push(ng); unlocked = true; notes.push(`${ng}ハードが 解禁されました！`); }
        if (r.grade === "高学年") {
          if (!dat.eps.includes(KP.HARD_EP)) { dat.eps.push(KP.HARD_EP); after.push(["ep", KP.HARD_EP]); notes.push(`おまけの おはなし「${KP.EP_TITLES[KP.HARD_EP]}」が 見られるように なりました！`); }
          if (!dat.allClear) { dat.allClear = true; after.push(["all"]); }
        }
      }
    } else notes.push(r.hard ? "コンティニューしたので、つぎの ハードは まだ 解禁されません。ノーコンティニューで クリアを めざそう！" : "コンティニューしたので、つぎの学年は まだ 解禁されません。ノーコンティニューで クリアを めざそう！");
    KP.setRb($("rNote"), notes.join("　")); KP.refit($("rNote"), 14);
    dat.run = null; save();
    show($("rNote"), unlocked ? "good" : "slide"); await wt(300);
    KP.setRb($("rOk"), after.length ? "つぎへ" : "タイトルへ"); show($("rOk"), "slide"); resEl.onpointerdown = null; resEl.classList.remove("dealing");
    await new Promise(res => $("rOk").onclick = res);
    for (const [k, v] of after) {
      if (k === "ep") await KP.playStory(v);
      if (k === "hard") { KP.screen(null); KP.se("good"); await KP.popup("解禁", [`<div class="big-note">ハードモードが 解禁されました！</div>学年選択の「もどる」の 右に「ハード」ボタンが 出ます。`]); }
      if (k === "all") { KP.screen(null); await KP.popup("おめでとう！", [`<div class="big-note">すべての モードを クリアしました！</div>あそんでくれて ありがとう！`]); }
    }
    KP.toTitle();
  }
})(window.KP);
