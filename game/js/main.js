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
      手札は ${g.hand}まい。使った分だけ 引きます（使わなかった カードは 次も 使えます）。<br>
      入れかえ：${g.swaps === Infinity ? "何回でも" : `全部で ${g.swaps}回`}（何まい かえても 1回）。<br>` +
      (g.shop ? `あいてに 勝つと お店へ。カードを 買うか、入れかえを ${g.shopSwap}回 ふやせます。<br>` : "") +
      `負けたら、その あいてから やり直し。ノーコンティニューで クリアすると、つぎの 学年が 遊べます。`;
    return [p1, p2, p3];
  }
  KP.howto = grade => KP.popup(`あそびかた　${grade}`, howtoPages(grade));

  // ---- タイトル（シルエットの相手が10秒ごとに入れかわる） ----
  const SIL = ["c01", "c02", "c03", "c04", "c05", "c06", "c07", "c08", "c09", "c10", "c11", "c12"];
  let silTimer = null, silLast = -1;
  function silNext() {
    const sil = $("sil"), img = $("silImg"), fl = $("tflash");
    let i; do { i = Math.floor(Math.random() * SIL.length); } while (i === silLast); silLast = i;
    img.src = KP.asset(`assets/chara/${SIL[i]}_0.webp`);
    sil.classList.remove("in"); void sil.offsetWidth; sil.classList.add("in");
    setTimeout(() => { fl.classList.remove("on"); void fl.offsetWidth; fl.classList.add("on"); }, 450);
  }
  KP.toTitle = function () {
    KP.S3.visible = false; KP.hideMsg(); $("vig").style.background = ""; KP.screen("scr-title", { slide: false });
    const t = $("scr-title"); t.classList.remove("in"); void t.offsetWidth; t.classList.add("in");
    if (!KP.S3.lite) KP.se("slide");
    KP.bgm("title");
    clearInterval(silTimer); clearTimeout(KP._silT);
    if (!KP.S3.lite) { KP._silT = setTimeout(silNext, 900); silTimer = setInterval(() => { if (t.classList.contains("on")) silNext(); }, 10000); }
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
      const row = (g, b, open, sfx) => `<div class="row"><span class="k">${g}${sfx}</span><span class="v">${b ? `ランク ${b.rank}　${b.score}点` : open ? "まだ クリアしていない" : "まだ 遊べない"}</span></div>`;
      const pages = [KP.GRADE_LIST.map(g => row(g, D().best[g], D().grades.includes(g), "")).join("") +
        `<div class="bnote">ランク：S＝満点　A＝83%〜　B＝66%〜　C＝50%〜　D＝それより下（満点は 120点。高学年ハードは 150点）</div>`];
      if (D().hard.length) pages.push(KP.GRADE_LIST.map(g => row(g, D().bestHard[g], D().hard.includes(g), "ハード")).join(""));
      return KP.popup("ハイスコア", pages, { closeBtn: false });
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
        <div class="gr"><span>手札</span><b>${G.hand}まい</b></div>
        <div class="gr"><span>入れかえ</span><b>${G.swaps === Infinity ? "何回でも" : G.swaps + "回"}</b></div>
        <div class="gr"><span>${hardView ? "あいて" : "文の長さ"}</span><b>${hardView ? (g === "高学年" ? "{5人|ごにん}" : "{4人|よにん}") + "・強い" : G.adj ? "上限なし" : "4語まで"}</b></div>
        <div class="gr"><span>お店</span><b>${G.shop ? "あり" : "なし"}</b></div>
        <div class="gb">${open ? (best ? `さいこう ランク ${best.rank}` : "まだ クリアしていない") : "まだ えらべない"}</div>` +
        (open ? "" : `<div class="glock">${hardView ? (i ? KP.GRADE_LIST[i - 1] + "ハード" : "高学年") : KP.GRADE_LIST[i - 1]}を ノーコンティニューで<br>クリアすると 遊べます</div>`));
      if (open) b.onclick = async () => {
        if (!d.howto[g]) { await KP.howto(g); d.howto[g] = true; save(); }
        KP.startRun(g, hardView);
      };
      box.appendChild(b);
    });
    const hb = $("gHard"); hb.style.display = d.hard.length ? "block" : "none"; KP.setRb(hb, hardView ? "ノーマル" : "ハード");
    KP.screen("scr-grade");
    // ハードが解禁されて はじめての 学年選択：「ハード」だけ 3秒 明るくする
    if (d.hard.length && !d.hardHint && !hardView) {
      d.hardHint = true; d.hardNew = false; save();
      const sp = $("spot"); sp.classList.remove("on"); void sp.offsetWidth; sp.classList.add("on"); hb.classList.add("lit");
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
