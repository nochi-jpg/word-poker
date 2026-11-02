// ことばポーカー：おはなし（サウンドノベル風）
(function (KP) {
  const S = "早乙女", K = "幸崎", N = "", ME = "あなた";
  // [背景, 話す人, 立ち絵(cXX_ポーズ), 文]  背景：class=2Dの教室 / black=暗転 / 3d=旧校舎の教室
  const EP = {
    1: { title: "第1話「放課後の招待状」", lines: [
      ["class", S, "c04_0", "はい、みんな。黒板を見てね。今日は「文」のひみつを 勉強します。"],
      ["class", S, "c04_0", "文には、まず「だれが」「なにが」にあたる言葉が あります。これを 主語 といいます。"],
      ["class", S, "c04_0", "そして「どうした」「どんなだ」にあたる言葉。これが 述語 です。"],
      ["class", S, "c04_2", "たとえば「犬が 走った。」。「犬が」が主語で、「走った」が述語。この2つがそろうと、文になるの。"],
      ["class", S, "c04_1", "でも、これだけだと ちょっと さみしいでしょう？ そこで くわしくする言葉、修飾語の 出番です。"],
      ["class", S, "c04_3", "「白い 犬が 公園で 元気よく 走った。」――どう？ どんな犬が、どこで、どのように走ったか、よくわかるように なったでしょう？"],
      ["class", S, "c04_1", "でも 気をつけて。「犬が 公園で 話した。」――これは へんな文。主語と述語が ちゃんと つながっているか、いつも たしかめてね。"],
      ["class", N, "c04_0", "（キーンコーンカーンコーン……）"],
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
  };
  KP.EP_TITLES = { 1: "第1話「放課後の招待状」", 2: "第2話", 3: "第3話", 4: "第4話（エンディング）" };

  KP.playStory = async function (n) {
    const ep = EP[n], $ = KP.$;
    if (!ep) { await KP.popup(KP.EP_TITLES[n], ["このおはなしは、いま じゅんび中です。"]); return; }
    KP.screen(null); const bg = $("bg2d"), ch = $("chara2d"), skip = $("skipBtn");
    let skipped = false; skip.style.display = "block"; skip.dataset.box = "";
    skip.onclick = () => { skipped = true; KP.hideMsg(); const r = $("msg")._res; $("msg")._res = null; r && r(); };
    for (const [b, who, img, text] of ep.lines) {
      if (skipped) break;
      if (b === "3d") {
        bg.style.display = "none"; ch.style.display = "none"; KP.S3.visible = true;
        KP.S3.showTable(true); KP.S3.light(1, $("vig")); await KP.S3.camTo("center", 0);
        const [id, pose] = (img || "c08_0").split("_");
        if (KP.S3._cur !== id) { KP.S3.setDealer(id); KP.S3._cur = id; }
        KP.S3.mood(["基本", "思考", "カードを出す", "嬉しい", "悔しい"][+pose]);
      } else {
        KP.S3.visible = false; bg.style.display = "block";
        if (b === "class") bg.src = KP.asset("assets/tex/bg_classroom.jpg"); else bg.removeAttribute("src");
        bg.style.background = "#000";
        if (img) { ch.src = KP.asset(`assets/chara/${img}.webp`); ch.style.display = "block"; } else ch.style.display = "none";
      }
      await KP.say(who, text);
    }
    skip.style.display = "none"; bg.style.display = "none"; ch.style.display = "none"; $("vig").style.background = "";
    KP.S3._cur = null; KP.hideMsg();
  };
})(window.KP);
