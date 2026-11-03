// ことばポーカー：BGM・効果音（音量はオプションの1つでまとめて調整）
(function (KP) {
  const BGM = { title: "bgm_title", story: "bgm_story", normal: "bgm_normal", hard: "bgm_hard", stage4: "bgm_stage4", boss: "bgm_boss", ending: "bgm_ending", credit: "bgm_credit", mise: "bgm_mise" };
  const SE = { chime: "se_chime", bang: "se_bang", ok: "se_ok", ko: "se_ko", cursor: "se_cursor", flip: "se_flip", slide: "se_slide",
    ng: "se_ng", shop: "se_shop", place: "se_place", good: "se_good" };
  const src = f => KP.asset(`assets/sound/${f}.mp3`);
  const vol = () => { const v = KP.data().opt.vol; return Math.pow(v / 10, 1.6); };
  let cur = null, curName = null, pending = null, unlocked = false;
  const pool = {};
  // BGM：同じ曲ならそのまま。null で止める
  KP.bgm = function (name) {
    if (name === curName) return;
    curName = name || null;
    if (cur) { const a = cur; fadeOut(a); cur = null; }
    if (!name) return;
    const a = new Audio(src(BGM[name])); a.loop = true; a.volume = vol() * .55; cur = a;
    const p = a.play(); if (p && p.catch) p.catch(() => { pending = a; });
  };
  function fadeOut(a, keep) {
    const v0 = a.volume, t0 = performance.now();
    const f = () => { const t = Math.min(1, (performance.now() - t0) / 400); a.volume = v0 * (1 - t); if (t < 1) requestAnimationFrame(f); else { a.pause(); if (!keep) a.src = ""; } };
    f();
  }
  // 効果音：重ねて鳴らせるように、使い回しのプレイヤーを数個ずつ持つ
  KP.se = function (name, rate = 1) {
    const v = vol(); if (!v || !SE[name]) return;
    const list = pool[name] = pool[name] || [];
    let a = list.find(x => x.paused || x.ended);
    if (!a) { if (list.length >= 6) a = list[0]; else { a = new Audio(src(SE[name])); list.push(a); } }
    try { a.currentTime = 0; } catch (e) { }
    a.volume = Math.min(1, v * (name === "chime" ? .6 : .9)); a.playbackRate = rate;
    const p = a.play(); if (p && p.catch) p.catch(() => { });
    if (name === "chime") setTimeout(() => { if (!a.paused) fadeOut(a, true); }, 7000);
    return a;
  };
  KP.setVolume = function () { if (cur) cur.volume = vol() * .55; };
  // さいしょにさわったときに、止められていたBGMを鳴らす（ブラウザの自動再生の制限）
  const unlock = () => { if (unlocked) return; unlocked = true; if (pending && pending === cur) pending.play().catch(() => { }); pending = null; };
  window.addEventListener("pointerdown", unlock, true); window.addEventListener("keydown", unlock, true);
})(window.KP);
