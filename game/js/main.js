// ことばポーカー：起動・タイトル・学年選択・あそびかた・おはなし・ハイスコア・オプション
(function (KP) {
  const $ = KP.$, D = () => KP.data(), save = () => KP.save.write();
  const chip = (r, t) => `<span class="chip" style="background:${KP.COLOR[r][0]};color:${KP.COLOR[r][1]}">${t}</span>`;

  // ---- あそびかた（学年ごとに3ページ） ----
  function howtoPages(grade) {
    const g = KP.GRADES[grade];
    const p1 = `カードを ならべて 文を つくり、あいてと 点数で 勝負します。<br>
      ${chip("S", "主語")} 「だれが」「なにが」　${chip("P", "述語")} 「どうした」「どんなだ」<br>
      ${chip("M", "修飾語")} 「いつ」「どこで」「なにを」など、文を くわしくする 言葉<br>` +
      (g.adj ? `${chip("N", "くわしくする語")} 「かわいい」「大きな」など。名詞の 上の わくに かさねて 使う<br>` : "") +
      `主語と述語は、1まいずつ かならず 使います。`;
    const p2 = `点数は「使ったカードの まい数」で きまります。<br>
      <span class="em">正しい文（成立）なら まい数の 2ばい！</span>　3語なら 6点、4語なら 8点。<br>` +
      (g.burst ? `へんな文は <span class="em">バースト（0点）</span>。長い文ほど 気をつけて！<br>` : `へんな文は まい数と 同じ点数。2語の正しい文（4点）と 4語のへんな文（4点）は 同点です。<br>`) +
      `同点のときは、文が正しい ほうの 勝ち。勝ち負けの 理由は かならず 表示されます。`;
    const p3 = `あいて {4人|よにん}に、それぞれ <span class="em">{2本|にほん}先取</span>で 勝てば クリア！<br>
      手札は ${g.hand}まい（${grade === "低学年" ? "ハードは 6まい" : "ハードも 同じ"}）。使った分だけ 引きます（使わなかった カードは 次も 使えます）。<br>
      入れかえ：${g.swaps === Infinity ? "何回でも" : `全部で ${g.swaps}回`}（何まい かえても 1回）。<br>` +
      (g.shop ? `あいてに 勝つと お店へ。カードを 買うか、入れかえを ${g.shopSwap}回 ふやせます。<br>` : "") +
      `負けたら、その あいてから やり直し。ノーコンティニューで クリアすると、つぎの 学年が 遊べます。`;
    return [p1, p2, p3];
  }
  KP.howto = grade => KP.popup(`あそびかた　${grade}`, howtoPages(grade));

  // ---- タイトル（右側に カードが降ってくる） ----
  let introT = null;
  KP.toTitle = function () {
    KP.S3.visible = false; KP.hideMsg(); $("vig").style.background = ""; KP.screen("scr-title", { slide: false });
    const t = $("scr-title"), menu = $("menu"); t.classList.remove("in"); void t.offsetWidth; t.classList.add("in");
    // ボタンのスライドインは ひらいたときの1回だけ。おわったら アニメーションを はずす（マウスを はなしても 消えないように）
    clearTimeout(introT);
    if (!KP.S3.lite) { menu.classList.add("intro"); introT = setTimeout(() => menu.classList.remove("intro"), 1150); KP.se("slide"); }
    KP.bgm("title"); KP.T3.start();
  };
  const ACT = {
    async play() {
      const d = D();
      if (!d.ep1) { await KP.playStory(1); d.ep1 = true; save(); return gradeSelect(); }
      if (d.run) {
        const r = d.run, label = r.phase === "shop" ? `ショップ` : r.hard && r.d >= 4 ? "ステージ？" : `ステージ${Math.min(r.d + 1, 5)}`;
        const i = await KP.popup("プレイ", [`中断した データが あります。<br><span class="em">${r.grade}${r.hard ? "ハード" : ""}　${label}</span>`], { buttons: ["前回のつづき", "学年選択から"] });
        if (i === 0) return KP.runLoop();
        const j = await KP.popup("学年選択から", ["前回のつづきの データは きえます。よろしいですか？"], { buttons: ["きえてもよい", "もどる"] });
        if (j !== 0) return;
        d.run = null; save();
      }
      gradeSelect();
    },
    async howto() {
      const ok = KP.GRADE_LIST.filter(g => D().grades.includes(g));
      if (ok.length === 1) return KP.howto(ok[0]);
      const i = await KP.popup("あそびかた", ["どの学年の あそびかたを 見ますか？"], { buttons: ok.concat("とじる") });
      if (i < ok.length) return KP.howto(ok[i]);
    },
    async story() {
      const ok = n => D().eps.includes(n) && (n > 1 || D().ep1);
      const page = (body) => {
        body.innerHTML = `<div class="eplist"></div>`;
        const box = body.querySelector(".eplist");
        KP.EP_LIST.forEach(n => {
          const b = KP.el("button", "epb" + (ok(n) ? "" : " lock") + (n === 5 ? " omake" : ""));
          b.dataset.box = ""; b.disabled = !ok(n);
          b.innerHTML = `<span class="epn">${KP.rb(n === 5 ? "おまけ" : `第{${n}話|${["", "いちわ", "にわ", "さんわ", "よんわ"][n]}}`)}</span><span class="ept"><span>${ok(n) ? KP.rb(KP.EP_TITLES[n].replace(/^第\d話/, "")) : "？？？"}</span></span>`;
          b.onclick = async () => { $("pop").classList.remove("on"); KP.screen(null); await KP.playStory(n); KP.toTitle(); };
          box.appendChild(b);
        });
        box.querySelectorAll(".ept").forEach(e => KP.fit(e, 14));
      };
      if (!ok(1)) return KP.popup("おはなし", ["まだ 見られる おはなしが ありません。「プレイ」から はじめよう！"]);
      return KP.popup("おはなし", [page]);
    },
    best() {
      // 1行ずつ「しゃっ、しゃっ」と出す。点数は 上限も書く（100/120点）
      const row = (g, b, open, sfx, max) => `<div class="row brow"><span class="k">${g}${sfx}</span><span class="v">${b ? `ランク ${b.rank}　${b.score}/${max}点` : open ? "まだ クリアしていない" : "まだ 遊べない"}</span></div>`;
      const max = (g, hard) => (hard && g === "高学年" ? 5 : 4) * 30;
      const deal = body => {
        const rows = [...body.querySelectorAll(".brow")];
        rows.forEach((e, i) => { e.style.animationDelay = (i * 260 + 150) + "ms"; e.classList.add("sin"); setTimeout(() => { KP.se("place", 1.1); }, i * 260 + 150); setTimeout(() => e.classList.remove("sin"), i * 260 + 600); });
      };
      const pageN = body => { body.innerHTML = KP.rb(KP.GRADE_LIST.map(g => row(g, D().best[g], D().grades.includes(g), "", max(g))).join("") +
        `<div class="bnote">ランク：S＝満点　A＝83%〜　B＝66%〜　C＝50%〜　D＝それより下</div>`); deal(body); };
      const pageH = body => { body.innerHTML = KP.rb(KP.GRADE_LIST.map(g => row(g, D().bestHard[g], D().hard.includes(g), "ハード", max(g, true))).join("")); deal(body); };
      const p = KP.popup("ハイスコア", D().hard.length ? [pageN, pageH] : [pageN], { closeBtn: false, minH: 300 });
      debugTap();
      return p;
    },
    opt() {
      const o = D().opt;
      const page = (body, rerender) => {
        body.innerHTML = KP.rb(`
          <div class="row"><span class="k">音量</span><button class="pbtn" data-box id="oVd">小さく</button><span class="v" style="text-align:center">${o.vol} / 10</span><button class="pbtn" data-box id="oVu">大きく</button></div>
          <div class="row"><span class="k">軽量モード</span><span class="v">${o.lite ? "オン" : "オフ"}</span><button class="pbtn" data-box id="oLite">${o.lite ? "オフにする" : "オンにする"}</button></div>
          <div class="row"><span class="k">クレジット</span><span class="v"></span><button class="pbtn" data-box id="oCr">見る</button></div>
          <div class="row"><span class="k">セーブデータ</span><span class="v"></span><button class="pbtn" data-box id="oDel">けす</button></div>
          <div class="bnote">軽量モードは、えんしゅつを へらして 動きを 軽くします（つぎに ひらいたときから）。</div>`);
        body.querySelector("#oVd").onclick = () => { o.vol = Math.max(0, o.vol - 1); save(); KP.setVolume(); rerender(); };
        body.querySelector("#oVu").onclick = () => { o.vol = Math.min(10, o.vol + 1); save(); KP.setVolume(); rerender(); };
        body.querySelector("#oLite").onclick = () => { o.lite = !o.lite; save(); rerender(); };
        body.querySelector("#oCr").onclick = async () => { $("pop").classList.remove("on"); await KP.staffRoll(false); KP.toTitle(); ACT.opt(); };
        body.querySelector("#oDel").onclick = async () => {
          const i = await KP.popup("セーブデータを けす", ["解禁・ハイスコア・中断データが すべて きえます。<br>本当に けしますか？"], { buttons: ["けす", "やめる"] });
          if (i === 0) KP.save.reset(); ACT.opt();
        };
      };
      return KP.popup("オプション", [page]);
    },
  };
  document.querySelectorAll("#menu .mb").forEach(b => b.onclick = () => ACT[b.dataset.act]());

  // ---- デバッグモード：ハイスコアを ひらいて、左上の「ハ」を 20回 クリック（タップ）すると すべて解禁 ----
  function debugTap() {
    const t = $("popTitle"); let n = 0;
    const wrap = () => { if (!/^ハイスコア/.test(t.textContent) || t.querySelector("#dbgHa")) return; t.innerHTML = t.innerHTML.replace("ハ", '<span id="dbgHa">ハ</span>'); };
    wrap(); const mo = new MutationObserver(wrap); mo.observe(t, { childList: true });
    const on = e => {
      if (!$("pop").classList.contains("on") || !/^ハイスコア/.test(t.textContent)) { t.removeEventListener("pointerdown", on); mo.disconnect(); return; }
      if (e.target.id !== "dbgHa") return;
      if (++n < 20) return;
      t.removeEventListener("pointerdown", on); mo.disconnect();
      const d = D(); d.ep1 = true; d.grades = KP.GRADE_LIST.slice(); d.hard = KP.GRADE_LIST.slice(); d.eps = KP.EP_LIST.slice(); d.hardHint = true; d.gradeNew = null;
      KP.GRADE_LIST.forEach(g => d.howto[g] = true); save(); KP.se("good");
      $("pop").classList.remove("on");
      KP.popup("デバッグモード", ["すべての 学年・ハード・おはなしを 解禁しました。"]);
    };
    t.addEventListener("pointerdown", on);
  }

  // ---- 学年選択（ハードは「もどる」の右のボタンで切りかえ。背景が黒になる） ----
  let hardView = false;
  function gradeSelect(keepView) {
    const d = D(); if (!keepView) hardView = false;
    KP.S3.visible = false; KP.bgm("title");
    const scr = $("scr-grade"); scr.classList.toggle("hardmode", hardView);
    KP.setRb($("gTitle"), hardView ? "ハード　学年を えらぶ" : "学年を えらぶ");
    const box = $("gList"); box.innerHTML = "";
    KP.GRADE_LIST.forEach((g, i) => {
      const G = KP.GRADES[g], open = hardView ? d.hard.includes(g) : d.grades.includes(g), best = (hardView ? d.bestHard : d.best)[g];
      const b = KP.el("button", "gcard si" + (open ? "" : " lock")); b.dataset.box = "";
      b.innerHTML = KP.rb(`<div class="gn">${g}${hardView ? "<small>ハード</small>" : ""}</div>
        <div class="gr"><span>手札</span><b>${hardView && G.hardHand ? G.hardHand : G.hand}まい</b></div>
        <div class="gr"><span>入れかえ</span><b>${G.swaps === Infinity ? "何回でも" : G.swaps + "回"}</b></div>
        <div class="gr"><span>${hardView ? "あいて" : "文の長さ"}</span><b>${hardView ? (g === "高学年" ? "{5人|ごにん}" : "{4人|よにん}") + "・強い" : G.adj ? "上限なし" : "4語まで"}</b></div>
        <div class="gr"><span>お店</span><b>${G.shop ? "あり" : "なし"}</b></div>
        <div class="gb">${open ? (best ? `さいこう ランク ${best.rank}` : "まだ クリアしていない") : "まだ えらべない"}</div>` +
        (open ? "" : `<div class="glock"><p>${hardView ? (i ? KP.GRADE_LIST[i - 1] + "ハード" : "高学年") : KP.GRADE_LIST[i - 1]}を<br>ノーコンティニューで<br>クリアすると 遊べます</p></div>`));
      if (open) b.onclick = async () => {
        if (!d.howto[g]) { await KP.howto(g); d.howto[g] = true; save(); }
        KP.startRun(g, hardView);
      };
      box.appendChild(b);
    });
    const hb = $("gHard"); hb.style.display = d.hard.length ? "block" : "none"; KP.setRb(hb, hardView ? "ノーマル" : "ハード");
    KP.screen("scr-grade");
    // 新しく 遊べるようになった学年を 3秒だけ 明るくする（中学年・高学年）
    if (d.gradeNew && !hardView) {
      const i = KP.GRADE_LIST.indexOf(d.gradeNew), card = box.children[i]; d.gradeNew = null; save();
      if (card) {
        const sp = $("spot"); sp.style.setProperty("--sx", (103 + i * 400 + 180) + "px"); sp.style.setProperty("--sy", "428px"); sp.classList.add("big");
        sp.classList.remove("on"); void sp.offsetWidth; sp.classList.add("on"); card.classList.add("lit"); KP.se("good");
        setTimeout(() => { sp.classList.remove("on", "big"); card.classList.remove("lit"); }, 3000);
      }
    }
    // ハードが解禁されて はじめての 学年選択：「ハード」だけ 3秒 明るくする
    else if (d.hard.length && !d.hardHint && !hardView) {
      d.hardHint = true; d.hardNew = false; save();
      const sp = $("spot"); sp.style.setProperty("--sx", "400px"); sp.style.setProperty("--sy", "704px"); sp.classList.remove("on"); void sp.offsetWidth; sp.classList.add("on"); hb.classList.add("lit"); KP.se("good");
      setTimeout(() => { sp.classList.remove("on"); hb.classList.remove("lit"); }, 3000);
    }
  }
  $("gBack").onclick = () => KP.toTitle();
  $("gHard").onclick = () => { hardView = !hardView; $("spot").classList.remove("on"); $("gHard").classList.remove("lit"); gradeSelect(true); };

  // ---- 起動 ----
  async function boot() {
    const d = D();
    KP.S3.init($("gl"), d.opt.lite);
    KP.fitStage(); window.addEventListener("resize", KP.fitStage);
    $("logo").src = KP.asset("assets/chara/logo2.webp");
    try { await Promise.all([document.fonts.load('40px "KPDela"'), document.fonts.load('900 24px "KPMaru"')]); } catch (e) { }
    $("loading").classList.add("off");
    KP.toTitle();
  }
  boot();
  // 自動チェック用：画面を直接ひらく
  KP.debug = { ACT, gradeSelect, howtoPages, botPick: () => KP.botPick(), setHard: v => { hardView = v; } };
})(window.KP);
