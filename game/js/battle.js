// ことばポーカー：対戦（ディーラー4人×2本先取・ショップ・クリア）
(function (KP) {
  const $ = KP.$, S3 = KP.S3;
  const D = () => KP.data(), R = () => KP.data().run;
  const G = () => KP.GRADES[R().grade];
  const card = w => KP.card(R().grade, w);
  const dealerOf = r => KP.DEALERS[r.grade][r.d];
  const save = () => KP.save.write();
  const SUB = c => c.r === "S" ? c.tag : c.r === "M" ? KP.CAT[c.kind] : c.r === "N" ? "名詞に かさねる" : "どうした";

  // ---- 1プレイを始める／つづける ----
  KP.startRun = function (grade) {
    const g = KP.GRADES[grade];
    D().run = { grade, d: 0, phase: "intro", deck: KP.newDeck(grade), swaps: g.swaps === Infinity ? null : g.swaps, tries: [1, 1, 1, 1], score: [0, 0, 0, 0], continued: false, m: null, offer: null };
    save(); return KP.runLoop();
  };
  function newMatch() {
    const r = R(); r.m = { pile: KP.shuffle(r.deck.slice()), disc: [], hand: [], win: 0, lose: 0 };
    KP.refill(r.grade, r.m); // 最初のドローもすぐ保存（引き直し防止）
  }
  function setScene() {
    const r = R(); S3.visible = true; S3.showTable(true); S3.setDealer(dealerOf(r).id); S3.light(r.d, $("vig")); S3.camTo("front", 0);
  }

  KP.runLoop = async function () {
    for (;;) {
      const r = R(); if (!r) return KP.toTitle();
      if (r.phase === "intro") {
        setScene(); KP.screen("battle"); hudUpdate(); $("sel").classList.add("off");
        const dl = dealerOf(r);
        await KP.say("", `${KP.STAGE_LIGHT[r.d].split("：")[0]}。${r.d === 3 ? "さいごの あいてだ。" : "つぎの あいてが あらわれた。"}`);
        await KP.cutin(dl, r.grade);
        S3.mood("カードを出す"); await KP.say(dl.name, dl.intro); S3.mood("基本");
        newMatch(); r.phase = "match"; save();
      } else if (r.phase === "retry") {
        setScene(); KP.screen("battle"); newMatch(); r.phase = "match"; save();
      } else if (r.phase === "match") {
        setScene(); KP.screen("battle");
        const res = await playMatch();
        if (res === "pause") return KP.toTitle();
        if (res === "win") {
          r.score[r.d] = r.tries[r.d] > 1 ? 10 : (r.m.lose ? 20 : 30);
          r.d++; r.m = null;
          r.phase = r.d >= 4 ? "clear" : (G().shop ? "shop" : "intro"); save();
        }
      } else if (r.phase === "lost") {
        setScene(); KP.screen("battle"); hudUpdate(); $("sel").classList.add("off"); S3.mood("嬉しい");
        const i = await KP.choose(dealerOf(r).name, "負けてしまった……。このディーラーと、もう一度 勝負する？", ["コンティニュー", "やめる"]);
        if (i === 0) { r.continued = true; r.tries[r.d]++; r.phase = "retry"; save(); }
        else { D().run = null; save(); return KP.toTitle(); }
      } else if (r.phase === "shop") {
        await shop(); r.phase = "intro"; r.offer = null; save();
      } else if (r.phase === "clear") {
        return clear();
      }
    }
  };

  // ---- 上の表示 ----
  function hudUpdate() {
    const r = R(), m = r.m || { win: 0, lose: 0 };
    $("hDealer").textContent = `ディーラー ${Math.min(r.d + 1, 4)} / 4`;
    $("hStars").innerHTML = `あなた${KP.star(m.win > 0)}${KP.star(m.win > 1)}<span class="sp"></span>ディーラー${KP.star(m.lose > 0)}${KP.star(m.lose > 1)}`;
    const sw = $("hSwap");
    if (r.swaps === null) { sw.firstChild.textContent = "入れかえ"; $("swapN").textContent = "何回でも"; $("swapN").style.width = "120px"; $("swapN").style.fontSize = "24px"; }
    else { sw.firstChild.textContent = "入れかえ のこり"; $("swapN").textContent = r.swaps; $("swapN").style.width = ""; $("swapN").style.fontSize = ""; }
  }

  // ---- カード選び ----
  let sel, hold, swapMode, marks, busy, endMatch, fresh = new Set();
  const inSel = w => sel.s === w || sel.p === w || sel.ms.includes(w) || sel.adj.some(a => a[1] === w);
  function removeW(w) {
    if (sel.s === w) sel.s = null; if (sel.p === w) sel.p = null;
    sel.ms = sel.ms.filter(x => x !== w);
    sel.adj = sel.adj.filter(([n, a]) => n !== w && a !== w && (n === sel.s || sel.ms.includes(n)));
  }
  function clickHand(w) {
    if (busy) return; const c = card(w);
    if (swapMode) { marks.has(w) ? marks.delete(w) : marks.add(w); return render(); }
    if (hold === w) { hold = null; return render(); }
    if (inSel(w)) { removeW(w); hold = null; return render(); }
    hold = null;
    if (c.r === "S") { if (sel.s) removeW(sel.s); sel.s = w; }
    else if (c.r === "P") sel.p = w;
    else if (c.r === "M") { if (sel.ms.length >= G().maxM) return flashHint(`修飾語は ${G().maxM}まいまで。いらない修飾語を タップして もどそう`); sel.ms.push(w); }
    else if (c.r === "N") { hold = w; }
    render();
  }
  function clickAdj(noun) {
    if (busy || swapMode) return;
    const cur = sel.adj.find(a => a[0] === noun);
    if (hold) { sel.adj = sel.adj.filter(a => a[0] !== noun && a[1] !== hold); sel.adj.push([noun, hold]); hold = null; }
    else if (cur) sel.adj = sel.adj.filter(a => a !== cur);
    render();
  }
  let hintTimer = null, hintOver = null;
  function flashHint(t) { hintOver = t; clearTimeout(hintTimer); hintTimer = setTimeout(() => { hintOver = null; render(); }, 2200); render(); }

  function render() {
    const r = R(), g = G(), hand = r.m.hand;
    // 手札
    const h = $("hand"); h.innerHTML = "";
    hand.forEach((w, i) => {
      const c = card(w), [band, ink] = KP.COLOR[c.r], b = KP.el("button", "hcard");
      b.dataset.box = "";
      if (!swapMode && inSel(w)) b.classList.add("used");
      if (hold === w) b.classList.add("hold");
      if (swapMode && marks.has(w)) b.classList.add("mark");
      if (fresh.has(w)) b.classList.add("new");
      b.style.transform = `rotate(${[-3, 2, -1, 3, -2, 1, -3, 2][i]}deg)`;
      b.innerHTML = `<span class="bd" style="background:${band};color:${ink}">${KP.ROLE[c.r]}</span><span class="wd">${c.w}</span><span class="sb">${SUB(c)}</span>`;
      b.onclick = () => clickHand(w);
      h.appendChild(b);
    });
    fresh.clear();
    const wds = [...h.querySelectorAll(".wd")]; wds.forEach(e => { e.style.fontSize = ""; delete e.dataset.fs; KP.fit(e, 11); });
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
        if (a) { adj.classList.add("full"); adj.textContent = a[1]; }
        else { adj.classList.add("can"); adj.textContent = "くわしくする語"; if (hold) adj.classList.add("glow"); }
        adj.onclick = () => clickAdj(w);
        if (hold) sc.classList.add("noun");
      } else if (!g.adj) adj.style.display = "none";
      if (c) {
        const [band, ink] = KP.COLOR[c.r]; sc.classList.add("full");
        sc.innerHTML = `<div class="bd" style="background:${band};color:${ink}">${KP.ROLE[c.r]}</div><div class="wd">${c.w}</div>`;
        sc.onclick = () => { if (!busy && !swapMode) { removeW(w); render(); } };
      } else sc.innerHTML = `<div class="bd">${KP.ROLE[role]}</div><div class="wd"></div>`;
      s.append(adj, sc); sl.appendChild(s);
    }
    if (!g.adj) sl.style.top = "418px"; else sl.style.top = "384px";
    const swd = [...sl.querySelectorAll(".scard .wd")]; swd.forEach(e => { e.style.fontSize = ""; delete e.dataset.fs; KP.fit(e, 11); });
    sl.querySelectorAll(".adj.full").forEach(e => { e.style.fontSize = ""; delete e.dataset.fs; KP.fit(e, 11); });
    // いまの文と点数
    const st = { s: sel.s, ms: sel.ms, p: sel.p, adj: sel.adj }, n = KP.lenOf(st);
    const pv = $("pvText"); pv.style.fontSize = ""; delete pv.dataset.fs;
    pv.textContent = n ? KP.words(r.grade, st).map(c => c.w).join(" ") : "カードを えらんで 文を つくろう";
    KP.fit(pv, 14);
    const ps = $("pvScore"); ps.style.fontSize = ""; delete ps.dataset.fs;
    ps.textContent = sel.s && sel.p ? `${n}語 → 成立なら ${n * 2}点` : "主語と述語が ひつよう";
    KP.fit(ps, 12);
    // ヒント
    const hi = $("hint"); hi.style.fontSize = ""; delete hi.dataset.fs;
    hi.textContent = hintOver || (swapMode ? "入れかえる カードを えらんで、「入れかえる」を おそう" :
      hold ? "くわしくしたい 名詞の 上の わくを タップしよう" :
      !sel.s ? "主語（赤）を 1まい えらぼう" : !sel.p ? "述語（青）を 1まい えらぼう" :
      g.adj ? "修飾語（黄）や くわしくする語（緑）で 文を 長くしよう" : "修飾語（黄）で 文を 長くできるよ");
    KP.fit(hi, 12);
    // ボタン
    const bs = $("bSwap"), bg = $("bGo");
    if (swapMode) { bs.textContent = "やめる"; bs.disabled = busy; bg.textContent = "入れかえる"; bg.disabled = busy || !marks.size; }
    else { bs.textContent = "入れかえ"; bs.disabled = busy || r.swaps === 0; bg.textContent = "決定！"; bg.disabled = busy || !(sel.s && sel.p); }
    [bs, bg].forEach(b => { b.style.fontSize = ""; delete b.dataset.fs; KP.fit(b, 14); });
    if (!busy) S3.mood(n ? "思考" : "基本");
    hudUpdate();
  }

  function playMatch() {
    return new Promise(res => {
      sel = { s: null, ms: [], p: null, adj: [] }; hold = null; swapMode = false; marks = new Set(); busy = false; endMatch = res;
      $("sel").classList.remove("off"); render();
    });
  }
  $("bSwap").onclick = () => {
    if (busy) return;
    if (swapMode) { swapMode = false; marks.clear(); return render(); }
    sel = { s: null, ms: [], p: null, adj: [] }; hold = null; swapMode = true; marks = new Set(); render();
  };
  $("bGo").onclick = () => { if (busy) return; swapMode ? doSwap() : decide(); };
  $("hPause").onclick = async () => {
    if (busy || !endMatch) return; busy = true;
    const i = await KP.popup("中断", ["ここまでの きろくを 保存して、タイトルに もどります。<br>つぎは タイトルの「プレイ」から「前回のつづき」を えらぶと、つづきから 遊べます。"], { buttons: ["中断する", "つづける"] });
    busy = false;
    if (i === 0) { save(); const e = endMatch; endMatch = null; e("pause"); } else render();
  };

  function doSwap() {
    const r = R(), m = r.m;
    m.hand = m.hand.filter(w => !marks.has(w)); m.disc.push(...marks);
    const before = new Set(m.hand); KP.draw(r.grade, m); m.hand.forEach(w => { if (!before.has(w)) fresh.add(w); });
    if (r.swaps !== null) r.swaps--;
    swapMode = false; marks.clear(); save(); render();
  }

  // ---- 決定：結果を先に計算して保存してから、演出する（やり直し防止） ----
  async function decide() {
    const r = R(), g = G(), m = r.m;
    const pst = { s: sel.s, ms: sel.ms.slice(), p: sel.p, adj: sel.adj.map(a => a.slice()) };
    const pj = KP.judge(r.grade, pst), ps = KP.scoreOf(r.grade, pst, pj.ok);
    const dl = KP.dealerSentence(r.grade, r.d), ds = KP.scoreOf(r.grade, dl.st, dl.ok);
    let res, reason;
    if (ps > ds) { res = "win"; reason = `${ps}点 対 ${ds}点で、あなたの勝ち！`; }
    else if (ps < ds) { res = "lose"; reason = `${ps}点 対 ${ds}点で、ディーラーの勝ち。`; }
    else if (pj.ok && !dl.ok) { res = "win"; reason = "同点なので、文が正しい あなたの勝ち！"; }
    else if (!pj.ok && dl.ok) { res = "lose"; reason = "同点だけど、文が正しい ディーラーの勝ち。"; }
    else { res = "draw"; reason = `同点で、どちらも ${pj.ok ? "文が正しい" : "へんな文"}ので 引き分け。もう一度！`; }
    if (res === "win") m.win++; if (res === "lose") m.lose++;
    const used = [pst.s, pst.p, ...pst.ms, ...pst.adj.map(a => a[1])];
    m.hand = m.hand.filter(w => !used.includes(w)); m.disc.push(...used);
    const before = new Set(m.hand); KP.refill(r.grade, m);
    const matchEnd = m.win >= 2 ? "win" : m.lose >= 2 ? "lose" : null;
    if (matchEnd === "lose") r.phase = "lost"; // 負けた瞬間に保存
    save();
    busy = true; hold = null; $("sel").classList.add("off");
    await reveal({ pst, pj, ps, dl, ds, res, reason });
    sel = { s: null, ms: [], p: null, adj: [] };
    if (matchEnd) {
      const d = dealerOf(r);
      if (matchEnd === "win") { S3.mood("悔しい"); await KP.stamp("勝利！", "red", 1100); await KP.say(d.name, d.lose); }
      else { S3.mood("嬉しい"); await KP.stamp("敗北……", "", 1100); await KP.say(d.name, d.win); }
      busy = false; const e = endMatch; endMatch = null; return e(matchEnd);
    }
    m.hand.forEach(w => { if (!before.has(w)) fresh.add(w); });
    busy = false; $("sel").classList.remove("off"); render();
  }

  async function reveal({ pst, pj, ps, dl, ds, res, reason }) {
    const r = R(), g = G(), d = dealerOf(r), grade = r.grade;
    const pw = KP.words(grade, pst), dw = KP.words(grade, dl.st);
    S3.mood("カードを出す");
    const placed = S3.place(dw, pw);
    await KP.wait(300); await S3.camTo("top"); await S3.flip();
    const show = async (who, cs, j, sc, list) => {
      const n = cs.length;
      if (j.ok) { S3.bounce(list); await KP.stamp(`成立！ ×2`, "red", 800); }
      else if (g.burst) { S3.burst(list); await KP.stamp("バースト！", "", 900); }
      else await KP.stamp("へんな文……", "", 800);
      const line = j.ok ? `成立！ ${n}語×2＝${sc}点` : g.burst ? `へんな文なので バースト。0点` : `へんな文…… ${n}語×1＝${sc}点`;
      await KP.say("判定", `${who}：「${cs.map(c => c.w).join(" ")}」\n${line}`);
      if (!j.ok) await KP.say("判定", `へんな文に なった理由：${j.why[0]}`);
    };
    await show("あなた", pw, pj, ps, placed.p);
    await show(d.name, dw, dl, ds, placed.d);
    await S3.camTo("front");
    S3.mood(res === "win" ? "悔しい" : res === "lose" ? "嬉しい" : "思考");
    hudUpdate();
    await KP.stamp(res === "win" ? "勝ち！" : res === "lose" ? "負け……" : "引き分け", res === "win" ? "red" : "", 800);
    await KP.say("判定", reason);
    if (!(r.m.win >= 2 || r.m.lose >= 2)) await KP.say(d.name, res === "lose" ? d.rw : res === "win" ? d.rl : "引き分けね。もう一回！");
    S3.clear(); S3.mood("基本");
  }

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
    clickHand(best.s); clickHand(best.p); best.ms.forEach(clickHand); best.adj.forEach(([n, a]) => { clickHand(a); clickAdj(n); });
    return bv;
  };

  // ---- ショップ（中・高学年、ディーラー1〜3のあと） ----
  async function shop() {
    const r = R(), sh = KP.SHOP;
    KP.screen("battle"); $("sel").classList.add("off"); hudUpdate();
    S3.visible = true; S3.showTable(true); S3.setDealer("shop"); S3.light(Math.max(0, r.d - 1), $("vig")); S3.camTo("front", 0);
    await KP.cutin(sh, r.grade);
    await KP.say(sh.name, sh.hello);
    const i = await KP.choose(sh.name, `どちらに なさいますか？（いまの入れかえ のこり：${r.swaps}回）`, ["カードを買う", "入れかえ +3"]);
    if (i === 1) { r.swaps += 3; save(); hudUpdate(); await KP.say(sh.name, `入れかえが 3回 ふえて、${r.swaps}回に なりました。`); }
    else {
      if (!r.offer) { r.offer = KP.shopOffer(r.grade, r.deck); save(); }
      await KP.say(sh.name, sh.buyMsg);
      await S3.camTo("top"); S3.showDealer(false);
      const got = await pickCards(r.offer); S3.showDealer(true);
      r.deck.push(...got); save();
      KP.screen("battle"); await S3.camTo("front");
      await KP.say(sh.name, `${got.length}まい デッキに 加えました。デッキは ${r.deck.length}まいに なりました。`);
    }
    await KP.say(sh.name, sh.bye);
  }
  function pickCards(offer) {
    return new Promise(res => {
      const on = new Set(), box = $("spCards"); KP.screen("shopPick");
      const draw = () => {
        box.innerHTML = "";
        offer.forEach(w => {
          const c = card(w), [band, ink] = KP.COLOR[c.r], b = KP.el("button", "hcard" + (on.has(w) ? " on" : ""));
          b.dataset.box = "";
          b.innerHTML = `<span class="bd" style="background:${band};color:${ink}">${KP.ROLE[c.r]}</span><span class="wd">${c.w}</span><span class="sb">${SUB(c)}</span>`;
          b.onclick = () => { on.has(w) ? on.delete(w) : on.size < 4 && on.add(w); draw(); };
          box.appendChild(b);
        });
        const wds = [...box.querySelectorAll(".wd")]; wds.forEach(e => KP.fit(e, 12));
        const mn = Math.min(...wds.map(e => parseFloat(e.style.fontSize))); wds.forEach(e => e.style.fontSize = mn + "px");
        $("spInfo").textContent = `えらんだ カード：${on.size}まい（デッキ ${R().deck.length}→${R().deck.length + on.size}まい）`; KP.fit($("spInfo"), 12);
        $("spOk").disabled = !on.size;
      };
      $("spOk").onclick = () => { if (on.size) res([...on]); };
      draw();
    });
  }

  // ---- クリア ----
  async function clear() {
    const r = R(), dat = D(), total = r.score.reduce((a, b) => a + b, 0), rank = KP.rankOf(total);
    S3.visible = false; KP.screen("result");
    const rows = $("rRows"); rows.innerHTML = "";
    KP.DEALERS[r.grade].forEach((d, i) => {
      const t = r.tries[i] > 1 ? `やり直して 勝ち` : r.score[i] === 30 ? "ストレート勝ち" : "2勝1敗";
      const e = KP.el("div", "rrow", `<span>ディーラー${i + 1}　${d.name}</span><span>${t}</span><b>${r.score[i]}点</b>`); e.dataset.box = ""; rows.appendChild(e);
    });
    const tot = KP.el("div", "rrow total", `<span>${r.grade}　合計</span><span></span><b>${total}点</b>`); tot.dataset.box = ""; rows.appendChild(tot);
    $("rRank").innerHTML = `<div class="rl">ランク</div><div class="rv">${rank}</div>`;
    const notes = [];
    const best = dat.best[r.grade];
    if (!best || total > best.score) { dat.best[r.grade] = { score: total, rank }; notes.push("ハイスコアを 記録しました！"); }
    if (!r.continued) {
      const ng = KP.NEXT_GRADE[r.grade], ep = KP.EP_OF_GRADE[r.grade];
      if (ng && !dat.grades.includes(ng)) { dat.grades.push(ng); notes.push(`${ng}モードが 遊べるように なりました！`); }
      if (!dat.eps.includes(ep)) { dat.eps.push(ep); notes.push(`おはなし「${KP.EP_TITLES[ep]}」が 見られるように なりました！`); }
    } else notes.push("コンティニューしたので、つぎの学年は まだ 解禁されません。ノーコンティニューで クリアを めざそう！");
    $("rNote").textContent = notes.join("　"); KP.fit($("rNote"), 14);
    dat.run = null; save();
    await new Promise(res => $("rOk").onclick = res);
    KP.toTitle();
  }
})(window.KP);
