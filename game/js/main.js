// ことばポーカー：起動・タイトル・学年選択・あそびかた・ハイスコア・オプション
(function (KP) {
  const $ = KP.$, D = () => KP.data(), save = () => KP.save.write();
  const chip = (r, t) => `<span class="chip" style="background:${KP.COLOR[r][0]};color:${KP.COLOR[r][1]}">${t}</span>`;

  // ---- あそびかた（学年ごとに3ページ。文面は仮） ----
  function howtoPages(grade) {
    const g = KP.GRADES[grade];
    const p1 = `カードを ならべて 文を つくり、ディーラーと 点数で 勝負します。<br>
      ${chip("S", "主語")} 「だれが」「なにが」　${chip("P", "述語")} 「どうした」「どんなだ」<br>
      ${chip("M", "修飾語")} 「いつ」「どこで」「なにを」など、文を くわしくする 言葉<br>` +
      (g.adj ? `${chip("N", "くわしくする語")} 「かわいい」「大きな」など。名詞の 上の わくに かさねて 使う<br>` : "") +
      `主語と述語は、1まいずつ かならず 使います。`;
    const p2 = `点数は「使ったカードの まい数」で きまります。<br>
      <span class="em">正しい文（成立）なら まい数の 2ばい！</span>　3語なら 6点、4語なら 8点。<br>` +
      (g.burst ? `へんな文は <span class="em">バースト（0点）</span>。長い文ほど 気をつけて！<br>` : `へんな文は まい数と 同じ点数。2語の正しい文（4点）と 4語のへんな文（4点）は 同点です。<br>`) +
      `同点のときは、文が正しい ほうの 勝ち。勝ち負けの 理由は かならず 表示されます。`;
    const p3 = `ディーラー 4人に、それぞれ <span class="em">2本先取</span>で 勝てば クリア！<br>
      手札は ${g.hand}まい。使った分だけ 引きます（使わなかった カードは 次も 使えます）。<br>
      入れかえ：${g.swaps === Infinity ? "何回でも" : `全部で ${g.swaps}回`}（何まい かえても 1回）。<br>` +
      (g.shop ? `ディーラーに 勝つと お店へ。カードを 買うか、入れかえを 3回 ふやせます。<br>` : "") +
      `負けたら、その ディーラーから やり直し。ノーコンティニューで クリアすると、つぎの 学年が 遊べます。`;
    return [p1, p2, p3];
  }
  KP.howto = grade => KP.popup(`あそびかた　${grade}`, howtoPages(grade));

  // ---- タイトル ----
  KP.toTitle = function () {
    KP.S3.visible = false; KP.hideMsg(); $("vig").style.background = ""; KP.screen("scr-title");
  };
  const ACT = {
    async play() {
      const d = D();
      if (!d.ep1) { await KP.playStory(1); d.ep1 = true; save(); return gradeSelect(); }
      if (d.run) {
        const r = d.run, label = r.phase === "shop" ? `ショップ` : `ステージ${Math.min(r.d + 1, 4)}`;
        const i = await KP.popup("プレイ", [`中断した データが あります。<br><span class="em">${r.grade}　${label}</span>`], { buttons: ["前回のつづき", "学年選択から"] });
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
      const i = await KP.popup("あそびかた", ["どの学年の あそびかたを 見ますか？"], { buttons: ok });
      return KP.howto(ok[i]);
    },
    async story() {
      const eps = [1, 2, 3, 4].filter(n => D().eps.includes(n) && (n > 1 || D().ep1));
      if (!eps.length) return KP.popup("おはなし", ["まだ 見られる おはなしが ありません。「プレイ」から はじめよう！"]);
      const labels = eps.map(n => `第${n}話`);
      const lock = [1, 2, 3, 4].map(n => `${KP.EP_TITLES[n]}：${eps.includes(n) ? "見られる" : "まだ 見られない"}`).join("<br>");
      const i = await KP.popup("おはなし", [lock], { buttons: labels.concat("とじる") });
      if (i < eps.length) { await KP.playStory(eps[i]); KP.toTitle(); }
    },
    best() {
      const rows = KP.GRADE_LIST.map(g => {
        const b = D().best[g];
        return `<div class="row"><span class="k">${g}</span><span class="v">${b ? `ランク ${b.rank}　${b.score}点` : D().grades.includes(g) ? "まだ クリアしていない" : "まだ 遊べない"}</span></div>`;
      }).join("");
      return KP.popup("ハイスコア", [rows + `<div style="margin-top:18px;font-size:20px">ランク：S＝120点　A＝100点〜　B＝80点〜　C＝60点〜　D＝それより下</div>`]);
    },
    opt() {
      const o = D().opt;
      const page = (body, rerender) => {
        body.innerHTML = `
          <div class="row"><span class="k">音量</span><button class="pbtn" data-box id="oVd">小さく</button><span class="v" style="text-align:center">${o.vol} / 10</span><button class="pbtn" data-box id="oVu">大きく</button></div>
          <div class="row"><span class="k">軽量モード</span><span class="v">${o.lite ? "オン" : "オフ"}</span><button class="pbtn" data-box id="oLite">${o.lite ? "オフにする" : "オンにする"}</button></div>
          <div class="row"><span class="k">クレジット</span><span class="v"></span><button class="pbtn" data-box id="oCr">見る</button></div>
          <div class="row"><span class="k">セーブデータ</span><span class="v"></span><button class="pbtn" data-box id="oDel">けす</button></div>
          <div style="margin-top:14px;font-size:18px;line-height:1.5">軽量モードは、えんしゅつを へらして 動きを 軽くします（つぎに ひらいたときから）。音は いま じゅんび中です。</div>`;
        body.querySelector("#oVd").onclick = () => { o.vol = Math.max(0, o.vol - 1); save(); rerender(); };
        body.querySelector("#oVu").onclick = () => { o.vol = Math.min(10, o.vol + 1); save(); rerender(); };
        body.querySelector("#oLite").onclick = () => { o.lite = !o.lite; save(); rerender(); };
        body.querySelector("#oCr").onclick = async () => { await credits(); ACT.opt(); };
        body.querySelector("#oDel").onclick = async () => {
          const i = await KP.popup("セーブデータを けす", ["解禁・ハイスコア・中断データが すべて きえます。<br>本当に けしますか？"], { buttons: ["けす", "やめる"] });
          if (i === 0) KP.save.reset(); ACT.opt();
        };
      };
      return KP.popup("オプション", [page]);
    },
  };
  function credits() {
    return KP.popup("クレジット", [`ことばポーカー<br>企画・シナリオ・イラスト：K.nom<br>
      プログラム：K.nom、Claude（Anthropic）<br>
      3D：three.js（MIT License）<br>
      フォント：Dela Gothic One、Zen Maru Gothic（SIL Open Font License）<br>
      サウンド：じゅんび中`]);
  }
  document.querySelectorAll("#menu .pbtn").forEach(b => b.onclick = () => ACT[b.dataset.act]());

  // ---- 学年選択 ----
  function gradeSelect() {
    KP.S3.visible = false; KP.screen("scr-grade");
    const box = $("gList"); box.innerHTML = "";
    KP.GRADE_LIST.forEach((g, i) => {
      const G = KP.GRADES[g], open = D().grades.includes(g), best = D().best[g];
      const b = KP.el("button", "gcard" + (open ? "" : " lock")); b.dataset.box = "";
      b.innerHTML = `<div class="gn">${g}</div>
        <div class="gr"><span>手札</span><b>${G.hand}まい</b></div>
        <div class="gr"><span>入れかえ</span><b>${G.swaps === Infinity ? "何回でも" : G.swaps + "回"}</b></div>
        <div class="gr"><span>文の長さ</span><b>${G.adj ? "上限なし" : "4語まで"}</b></div>
        <div class="gr"><span>お店</span><b>${G.shop ? "あり" : "なし"}</b></div>
        <div class="gb">${open ? (best ? `さいこう ランク ${best.rank}` : "まだ クリアしていない") : "まだ えらべない"}</div>` +
        (open ? "" : `<div class="glock">${KP.GRADE_LIST[i - 1]}を ノーコンティニューで<br>クリアすると 遊べます</div>`);
      if (open) b.onclick = async () => {
        if (!D().howto[g]) { await KP.howto(g); D().howto[g] = true; save(); }
        KP.startRun(g);
      };
      box.appendChild(b);
    });
  }
  $("gBack").onclick = () => KP.toTitle();

  // ---- 起動 ----
  async function boot() {
    const d = D();
    KP.S3.init($("gl"), d.opt.lite);
    KP.fitStage(); window.addEventListener("resize", KP.fitStage);
    $("logo").src = KP.asset("assets/chara/logo.webp");
    try { await Promise.all([document.fonts.load('40px "KPDela"'), document.fonts.load('900 24px "KPMaru"')]); } catch (e) { }
    $("loading").classList.add("off");
    KP.toTitle();
  }
  boot();
  // 自動チェック用：画面を直接ひらく
  KP.debug = { ACT, gradeSelect, howtoPages, botPick: () => KP.botPick() };
})(window.KP);
