// ことばポーカー：おはなし（サウンドノベル風）・スタッフロール
(function (KP) {
  const S = "早乙女", K = "幸崎", KU = "黒井", MI = "見瀬先", N = "", ME = "あなた";
  // [背景, 話す人, 立ち絵(cXX_ポーズ / shop_0), 文]
  // 背景：class=2Dの教室 / black=暗転 / 3d=旧校舎の教室（ポーカー台あり） / room=旧校舎の教室（ポーカー台なし）
  // ポーズ：0基本 1思考 2カードを出す 3嬉しい 4悔しい
  const EP = {
    1: { title: "第1話「放課後の招待状」", bgm: "story", lines: [
      ["class", S, "c04_0", "はい、みんな。黒板を見てね。今日は「文」のひみつを 勉強します。"],
      ["class", S, "c04_0", "文には、まず「だれが」「なにが」にあたる言葉が あります。これを 主語 といいます。"],
      ["class", S, "c04_0", "そして「どうした」「どんなだ」にあたる言葉。これが 述語 です。"],
      ["class", S, "c04_2", "たとえば「犬が 走った。」。「犬が」が主語で、「走った」が述語。この2つがそろうと、文になるの。"],
      ["class", S, "c04_1", "でも、これだけだと ちょっと さみしいでしょう？ そこで くわしくする言葉、修飾語の 出番です。"],
      ["class", S, "c04_3", "「白い 犬が 公園で 元気よく 走った。」――どう？ どんな犬が、どこで、どのように走ったか、よくわかるように なったでしょう？"],
      ["class", S, "c04_1", "でも 気をつけて。「犬が 公園で 話した。」――これは へんな文。主語と述語が ちゃんと つながっているか、いつも たしかめてね。"],
      ["class", N, "c04_0", "（キーンコーンカーンコーン……）", "chime"],
      ["class", S, "c04_3", "あら、もう こんな時間。今日は ここまで。気をつけて 帰るのよ。"],
      ["class", N, null, "ランドセルをせおって、教室を出ようとしたそのとき――"],
      ["class", K, "c08_0", "ちょっと いいかな。"],
      ["class", N, "c08_0", "校長先生だ。めったに 話したことは ない。"],
      ["class", K, "c08_1", "さっきの授業、廊下から 聞いていたよ。――きみ、主語と述語の関係を、本当に マスターしたいと 思わないかね？"],
      ["class", N, "c08_0", "……よくわからないまま、うなずいた。"],
      ["class", K, "c08_3", "よろしい。では今日の夕方、もう一度 学校へ 来なさい。裏庭で 待っているよ。"],
      ["class", K, "c08_1", "――このことは、みんなには ないしょだ。"],
      ["black", N, null, "……数時間後……"],
      ["black", N, null, "夕焼けの裏庭。校長先生についていくと、古い木造の建物が見えてきた。"],
      ["black", K, null, "ここは 旧校舎。いまは だれも 使っていない――ことに なっている。さあ、入りなさい。"],
      ["3d", K, "c08_3", "ようこそ、「ことばポーカー」の 会場へ。"],
      ["3d", K, "c08_0", "ここには 夜な夜な、さまざまな人間が やってきては、ことばのカードで 文を作り、その出来で 勝負をしている。"],
      ["3d", K, "c08_2", "主語と述語が つながった 正しい文ほど、点数は 高くなる。長く、くわしく 作れれば さらに 高くなる。"],
      ["3d", K, "c08_1", "そして 大会で 優勝した者には――「すばらしいこと」が 起こる、と 言われている。"],
      ["3d", K, "c08_0", "どうだい。きみも、参加してみるかね？"],
      ["3d", ME, "c08_0", "……やります。参加します！"],
      ["3d", K, "c08_3", "いい返事だ。では、最初の相手を 呼んでこよう。"],
    ] },
    2: { title: "第2話「先生の ひみつ」", bgm: "story", lines: [
      ["room", N, null, "低学年の部を 勝ちぬいた。カードを 片づけていると、うしろから 声がした。"],
      ["room", S, "c04_3", "おめでとう。まさか 本当に 勝ちぬくなんてね。"],
      ["room", ME, "c04_0", "早乙女先生！ どうして 先生が ここに？"],
      ["room", S, "c04_0", "先生も 招待されたのよ。「子どもたちの 国語の力を、ためしてみませんか」って。"],
      ["room", S, "c04_1", "でもね、ずっと 気になっているの。招待状には、だれの 名前も 書いていなかった。"],
      ["room", S, "c04_1", "校長先生に きいても、「わたしは たのまれただけだ」って 笑うだけ。"],
      ["room", S, "c04_2", "この大会は、何者かが、何らかの 目的で 開いている……先生は そう 思うわ。"],
      ["room", ME, "c04_2", "何者か……？"],
      ["room", S, "c04_3", "こわがらなくて いいわ。あなたの 文は、主語と 述語が ちゃんと つながっていたもの。"],
      ["room", S, "c04_0", "つぎは 中学年の部。修飾語を 上手に 使えるかどうかが 勝負に なるわよ。"],
      ["room", N, null, "中学年の部への とびらが ひらいた。"],
    ] },
    3: { title: "第3話「黒幕の かげ」", bgm: "story", lines: [
      ["room", N, null, "中学年の部を 勝ちぬいた。校長先生が、ゆっくりと 拍手を しながら 近づいてきた。"],
      ["room", K, "c08_3", "見事だ。中学年の部まで 勝ちぬくとはな。"],
      ["room", ME, "c08_0", "校長先生。この大会を 開いたのは、校長先生なんですか？"],
      ["room", K, "c08_1", "……ふむ。そう 思うのも むりは ない。"],
      ["room", K, "c08_0", "だが、ちがう。わたしは この 旧校舎を かしているだけだ。"],
      ["room", K, "c08_1", "主催者は 校長では ない。もっと 上の……"],
      ["room", N, "c08_1", "校長先生は あたりを 見まわし、声を ひそめた。"],
      ["room", K, "c08_2", "……黒幕が いる。"],
      ["room", ME, "c08_2", "黒幕……！？"],
      ["room", K, "c08_0", "高学年の部の さいごに、その人物は あらわれるだろう。"],
      ["room", K, "c08_1", "高学年では、名詞を くわしくする 言葉も 使う。どの言葉が どの言葉に かかるのか。そこを まちがえれば バーストだ。"],
      ["room", K, "c08_3", "きみなら、たどりつけるかもしれん。――行きなさい。"],
      ["room", N, null, "高学年の部への とびらが ひらいた。"],
    ] },
    4: { title: "第4話「すばらしいこと」", bgm: "ending", lines: [
      ["room", N, null, "さいごの 相手を たおした。教室が しんと しずまりかえる。"],
      ["room", KU, "c12_4", "……おみごと。わたくしを 負かすなんて。"],
      ["room", KU, "c12_0", "約束どおり、お教えしますわ。この大会の ひみつを。"],
      ["room", KU, "c12_2", "この大会は、わたくしが 校長先生と いっしょに 立ち上げたもの。"],
      ["room", ME, "c12_2", "いったい 何のために……？"],
      ["room", KU, "c12_0", "これは、国語の力を 上げるための、国ぐるみの プロジェクト なのですわ。"],
      ["room", KU, "c12_1", "遊びながら、主語と 述語と 修飾語の 関係を 身につける。それが ねらい。"],
      ["room", ME, "c12_1", "じゃあ、優勝したら 起こる「すばらしいこと」って……？"],
      ["room", KU, "c12_3", "もう 起こっていますわ。あなたに 国語の力が ついたこと。それが「すばらしいこと」ですわ。"],
      ["room", ME, "c12_3", "……え。それだけ？"],
      ["room", N, "c12_3", "体じゅうから 力が ぬけた。"],
      ["room", KU, "c12_3", "おほほ。でも、思い出して ごらんなさい。さいしょの あなたに、こんなに 長くて 正しい 文が 作れたかしら？"],
      ["room", N, "c12_0", "……たしかに。「やさしい 先生が 放課後 新しい 図書館で 長い 物語を 読んだ。」――前の自分なら、きっと 作れなかった。"],
      ["room", ME, "c12_0", "……まあ、いっか。"],
      ["room", KU, "c12_0", "また いつでも いらっしゃい。この教室は、ことばを みがく 人のために ありますのよ。"],
      ["black", N, null, "夕焼けの中、ランドセルを せおって 家に 帰った。"],
      ["black", N, null, "明日の 国語の 時間が、ちょっとだけ 楽しみだ。"],
    ], roll: true },
    5: { title: "第5話「ひみつの 店員」", bgm: "story", lines: [
      ["room", MI, "mise_0", "この売店で、たくさんの 人に カードを わたしてきました。"],
      ["room", MI, "mise_1", "でも、わたしに 勝ったのは、あなたが はじめてです。"],
      ["room", MI, "mise_4", "黒井さんにも、校長先生にも、ナイショに しておいてくださいね。"],
      ["room", MI, "mise_2", "……わたしが、この大会で いちばん 強いってこと。"],
      ["room", N, "mise_3", "見瀬先さんは、いたずらっぽく わらった。"],
      ["room", MI, "mise_0", "ことばは、使うほど 強くなります。また いつでも どうぞ。"],
    ] },
  };
  KP.EP_TITLES = Object.fromEntries(Object.entries(EP).map(([k, v]) => [k, v.title]));
  KP.EP_LIST = [1, 2, 3, 4, 5];

  // 本当に スキップする？
  const askSkip = async () => (await KP.popup("スキップ", ["本当に スキップする？"], { buttons: ["スキップする", "もどる"] })) === 0;

  KP.playStory = async function (n) {
    const ep = EP[n], $ = KP.$;
    KP.screen(null); KP.bgm(ep.bgm);
    const bg = $("bg2d"), ch = $("chara2d"), skip = $("skipBtn");
    let skipped = false; skip.style.display = "block"; skip.dataset.box = "";
    skip.onclick = async ev => {
      ev.stopPropagation(); if (skipped) return;
      if (await askSkip()) { skipped = true; KP.hideMsg(); const r = $("msg")._res; $("msg")._res = null; r && r(); }
    };
    // 背景と立ち絵を先に読みこんでおく（背景が おくれて出ないように）
    const pre = [...new Set(ep.lines.flatMap(([b, , img]) => [b === "class" ? "assets/tex/bg_classroom.jpg" : null, img ? `assets/chara/${img}.webp` : null]).filter(Boolean))];
    await KP.fade(() => Promise.race([Promise.all(pre.map(KP.loadImg)), KP.wait(4000)]), 300);
    let lastBg = null, curImg = null;
    for (const [b, who, img, text, se] of ep.lines) {
      if (skipped) break;
      if (b !== lastBg && lastBg !== null && !KP.S3.lite) { await KP.fade(() => showBg(b, img, true), 500); curImg = img; }
      else { await showBg(b, img, lastBg === null); curImg = img; }
      lastBg = b;
      if (se) KP.se(se);
      await KP.say(who, text);
    }
    skip.style.display = "none"; bg.style.display = "none"; ch.style.display = "none"; ch.classList.remove("on"); $("vig").style.background = "";
    KP.S3._cur = null; KP.hideMsg(); KP.S3.storyMode(false);
    if (ep.roll) await KP.staffRoll(true);

    // 人物は パッと出さずに フェードイン、いなくなるときは フェードアウト（同じ人の表情がわりは そのまま）
    async function showBg(b, img, instant) {
      const idOf = s => s ? s.split("_")[0] : null, sameWho = idOf(img) === idOf(curImg);
      if (b === "3d" || b === "room") {
        bg.style.display = "none"; ch.style.display = "none"; KP.S3.visible = true;
        KP.S3.showTable(b === "3d"); KP.S3.storyMode(true); KP.S3.light(n === 4 ? 3 : 1, $("vig")); KP.S3.camTo(b === "3d" ? "center" : "story", 0);
        if (img) {
          const [id, pose] = img.split("_");
          if (!sameWho && !instant && KP.S3._cur) await KP.S3.fadeDealer(false);
          if (KP.S3._cur !== id) { KP.S3.setDealer(id); KP.S3._cur = id; }
          KP.S3.mood(["基本", "思考", "カードを出す", "嬉しい", "悔しい"][+pose]);
          if (!sameWho || instant) { if (instant) KP.S3.showDealer(true); else await KP.S3.fadeDealer(true); }
        } else if (!instant && KP.S3._cur) { await KP.S3.fadeDealer(false); KP.S3._cur = null; } else KP.S3.showDealer(false);
      } else {
        KP.S3.visible = false; bg.style.display = "block";
        bg.src = b === "class" ? KP.asset("assets/tex/bg_classroom.jpg") : KP.BLANK;
        bg.style.background = "#000";
        const want = img && b === "class" ? img : null;
        if (!want) { if (ch.classList.contains("on") && !instant) { ch.classList.remove("on"); await KP.wait(300); } ch.classList.remove("on"); ch.style.display = "none"; return; }
        if (!sameWho && ch.classList.contains("on") && !instant) { ch.classList.remove("on"); await KP.wait(300); }
        ch.src = KP.asset(`assets/chara/${want}.webp`); ch.style.display = "block";
        if (!ch.classList.contains("on")) { void ch.offsetWidth; ch.classList.add("on"); }
      }
    }
  };

  // ---- スタッフロール（第4話のあと・オプションのクレジット） ----
  const ROLL = () => {
    const ppl = [];
    for (const g of KP.GRADE_LIST) KP.DEALERS[g].forEach(d => ppl.push(d));
    ppl.push(KP.SHOP);
    return [
      ["big", "ことばポーカー"],
      ["k", "企画・シナリオ・キャラクター"], ["v", "K.nom"],
      ["k", "プログラム"], ["v", "K.nom、Claude（Anthropic）"],
      ["k", "登場人物"], ...ppl.map(d => ["p", d]),
      ["k", "音楽"], ["v", "MusMus"],
      ["k", "効果音"], ["v", "効果音ラボ"],
      ["k", "3D"], ["v", "three.js"],
      ["k", "フォント"], ["v", "Dela Gothic One、Zen Maru Gothic"], ["s", "（SIL Open Font License）"],
      ["k", "スペシャルサンクス"], ["v", "遊んでくれた みんな"],
      ["end", "あそんでくれて ありがとう！"],
    ];
  };
  KP.staffRoll = function (ending) {
    return new Promise(async res => {
      const $ = KP.$, box = $("roll"), inner = $("rollIn"), skip = $("skipBtn");
      KP.S3.visible = false; KP.screen(null); KP.bgm("credit");
      inner.innerHTML = "";
      const ppl = [];
      for (const [t, v] of ROLL()) {
        if (t === "p") {
          const e = KP.el("div", "rp", `<div class="rpn">${KP.rb(v.nick)}</div><div class="rpm">${KP.rb(v.name)}</div>`);
          inner.appendChild(e); ppl.push([e, v]);
        } else inner.appendChild(KP.el("div", "r" + t, KP.rb(v)));
      }
      box.classList.add("on");
      const sideL = $("rollL"), sideR = $("rollR");
      let done = false;
      const fin = () => { if (done) return; done = true; cancelAnimationFrame(raf); box.classList.remove("on"); skip.style.display = "none"; res(); };
      skip.style.display = "block";
      skip.onclick = async ev => { ev.stopPropagation(); if (await askSkip()) fin(); };
      const H = inner.scrollHeight, total = H + 768, speed = KP.S3.lite ? 220 : 70; // px/秒
      const t0 = performance.now(); let raf, shown = -1;
      const step = now => {
        const y = 768 - (now - t0) / 1000 * speed; inner.style.transform = `translateY(${y}px)`;
        // いま画面のまん中あたりにいる登場人物の立ち絵を左右に出す
        let cur = -1; ppl.forEach(([e], i) => { const top = y + e.offsetTop; if (top < 520 && top > 120) cur = i; });
        if (cur !== shown && cur >= 0) {
          shown = cur; const [, d] = ppl[cur], side = cur % 2 ? sideR : sideL, other = cur % 2 ? sideL : sideR;
          side.src = KP.asset(d.id === "shop" ? "assets/chara/shop_0.webp" : `assets/chara/${d.id}_3.webp`);
          side.classList.remove("on"); void side.offsetWidth; side.classList.add("on"); other.classList.remove("on");
        }
        if (y < -H) { setTimeout(fin, 1800); return; }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      void total; void ending;
    });
  };
})(window.KP);
