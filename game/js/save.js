// ことばポーカー：セーブ（端末のブラウザの中＝localStorage）
(function (KP) {
  const KEY = "kotobapoker_v1";
  const fresh = () => ({
    ep1: false,                       // 第1話を見たか
    grades: ["低学年"],                // 選べる学年
    eps: [1],                         // 見られる話
    best: {},                         // 学年ごとの最高 {score, rank}
    hard: [],                         // 選べるハードの学年（高学年ノーマルをノーコンクリアで 低学年から）
    bestHard: {},                     // ハードの最高 {score, rank}
    hardHint: false,                  // ハードボタンの強調を見せたか（初回だけ）
    hardNew: false,                   // ハードが解禁されたばかり（つぎの学年選択で強調）
    allClear: false,
    howto: {},                        // 学年ごとに あそびかたを見たか
    opt: { vol: 5, lite: false },
    run: null,                        // 中断データ
  });
  let mem = null;
  KP.save = {
    load() {
      if (mem) return mem;
      try { mem = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { mem = fresh(); }
      return mem;
    },
    write() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* 保存できない環境でも遊べるように */ } },
    reset() { mem = fresh(); this.write(); },
  };
  KP.data = () => KP.save.load();
})(window.KP);
