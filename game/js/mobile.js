// ことばポーカー：スマホで開いたとき（GitHub版だけ。Canva版には入れない）
//  - Android：さわった瞬間に 全画面にして 横向きに固定する（全画面がとけたら、つぎにさわったとき また全画面に）
//  - iPhone：ページから全画面・横向き固定はできない（Safari のしくみ）。縦向きのときは「よこむきにしてね」を出し、
//            「ホーム画面に追加」から開くと 全画面で遊べることを 案内する
(function () {
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  if (!iOS && !android) return;
  document.documentElement.classList.add("mobile", iOS ? "ios" : "android");
  const standalone = matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches || navigator.standalone;
  if (standalone) document.documentElement.classList.add("standalone");

  // 縦向きのときの案内
  const rot = document.createElement("div"); rot.id = "rotTip";
  rot.innerHTML = `<div class="rphone"></div><div class="rtx">よこむきに して あそんでね</div>` +
    (iOS && !standalone ? `<div class="rsub"><ruby>共有<rt>きょうゆう</rt></ruby>ボタンから「ホーム<ruby>画面<rt>がめん</rt></ruby>に<ruby>追加<rt>ついか</rt></ruby>」して ひらくと、<br><ruby>全画面<rt>ぜんがめん</rt></ruby>で <ruby>遊<rt>あそ</rt></ruby>べます</div>` : `<div class="rsub">タップすると <ruby>全画面<rt>ぜんがめん</rt></ruby>に なります</div>`);
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(rot));

  if (!android) return;
  const el = document.documentElement;
  const full = () => document.fullscreenElement || document.webkitFullscreenElement;
  function goFull() {
    if (full()) return;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    Promise.resolve(req.call(el, { navigationUI: "hide" })).then(() => {
      if (screen.orientation && screen.orientation.lock) return screen.orientation.lock("landscape");
    }).catch(() => { });
  }
  window.addEventListener("pointerdown", goFull, true);
  document.addEventListener("fullscreenchange", () => { if (window.KP && KP.fitStage) setTimeout(KP.fitStage, 120); });
})();
