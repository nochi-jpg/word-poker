// ことばポーカー：画面まわりの道具（文字ウインドウ・ポップアップ・カットイン・スタンプ・暗転・スライドイン）
(function (KP) {
  const $ = KP.$ = id => document.getElementById(id);
  KP.wait = ms => new Promise(r => setTimeout(r, KP.S3 && KP.S3.lite ? Math.min(ms, 200) : ms));
  KP.BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  KP.loadImg = p => new Promise(r => { const i = new Image(); i.onload = i.onerror = () => r(); i.src = KP.asset(p); });
  KP.el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // 舞台（1366×768）を画面に合わせる
  KP.fitStage = function () {
    const w = window.innerWidth, h = window.innerHeight, s = Math.min(w / 1366, h / 768), st = $("stage");
    st.style.transform = `scale(${s})`; st.style.left = (w - 1366 * s) / 2 + "px"; st.style.top = (h - 768 * s) / 2 + "px";
    KP.scale = s; if (KP.S3.resize) KP.S3.resize(1366 * s, 768 * s); if (KP.T3) KP.T3.resize();
  };
  // はみだす文字は小さくする
  KP.fit = function (e, min = 12) {
    let f = parseFloat(e.dataset.fs || getComputedStyle(e).fontSize); e.dataset.fs = f; e.style.fontSize = f + "px";
    while ((e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) && f > min) { f -= 1; e.style.fontSize = f + "px"; }
    return f;
  };
  KP.refit = (e, min) => { e.style.fontSize = ""; delete e.dataset.fs; return KP.fit(e, min); };
  // 画面の切りかえ：UIを時間差でスライドインさせる（画面をひらいたときの1回だけ）
  KP.screen = function (id, opt = {}) {
    document.querySelectorAll(".scr").forEach(s => s.classList.toggle("on", s.id === id));
    if (id !== "scr-title" && KP.T3) KP.T3.stop();
    if (id && opt.slide !== false) KP.slideIn($(id));
  };
  KP.slideIn = function (root) {
    if (!root || (KP.S3 && KP.S3.lite)) return;
    const items = [...root.querySelectorAll(".si")].filter(e => e.offsetParent !== null);
    items.forEach((e, i) => { e.classList.remove("sin"); void e.offsetWidth; e.style.setProperty("--d", (i * 55) + "ms"); e.classList.add("sin"); });
    if (items.length) KP.se("slide");
    setTimeout(() => items.forEach(e => e.classList.remove("sin")), 600 + items.length * 55);
  };
  KP.star = on => `<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4.5 2 7.5L12 17l-6.5 4 2-7.5L2 9h7z" fill="${on ? "#d7141f" : "none"}" stroke="#111" stroke-width="1.6"/></svg>`;

  // ---- クリックの手ごたえ：押しこみ→はね返り＋光、効果音 ----
  document.addEventListener("pointerdown", e => {
    const b = e.target.closest("button,.gcard,.hcard,.scard.full,.adj.can,.adj.full");
    if (!b || b.disabled) return;
    b.classList.remove("clk"); void b.offsetWidth; b.classList.add("clk");
    setTimeout(() => b.classList.remove("clk"), 420);
    const r = b.getBoundingClientRect(), st = $("stage").getBoundingClientRect(), s = KP.scale || 1;
    const f = KP.el("div", "clkfx"); f.style.left = (e.clientX - st.left) / s + "px"; f.style.top = (e.clientY - st.top) / s + "px";
    $("stage").appendChild(f); setTimeout(() => f.remove(), 450);
    if (!b.classList.contains("hcard") && !b.classList.contains("scard") && !b.classList.contains("adj")) KP.se("ok");
    void r;
  }, true);
  // マウスをのせたとき：カード選択の音
  let lastHover = null;
  document.addEventListener("pointerover", e => {
    const b = e.target.closest(".hcard,.mb,.gcard:not(.lock)");
    if (b && b !== lastHover && e.pointerType === "mouse") KP.se("cursor", 1.2);
    lastHover = b;
  });

  // ---- 文字ウインドウ（ふりがなつき・1文字ずつポンと出る） ----
  let resolveMsg = null, typing = null;
  // 「主語」は赤、「述語」は青、「修飾語」は黄（カードと同じ色）
  const TERM = { 主語: "kS", 述語: "kP", 修飾語: "kM" };
  const termHTML = k => TERM[k.t] ? `<span class="${TERM[k.t]}">${KP.tokHTML(k)}</span>` : KP.tokHTML(k);
  function typeInto(t, text, speed, done) {
    const toks = KP.rbTokens(text), full = toks.map(termHTML).join(""); t.innerHTML = full; KP.fit(t, 16); t.innerHTML = "";
    let i = 0; clearInterval(typing);
    const finish = () => { clearInterval(typing); typing = null; t.innerHTML = full; done && done(); };
    if (KP.S3.lite) { finish(); return finish; }
    typing = setInterval(() => {
      for (let k = 0; k < 2 && i < toks.length; k++, i++) { const sp = KP.el("span", "tc", termHTML(toks[i])); t.appendChild(sp); }
      if (i >= toks.length) finish();
    }, speed);
    return finish;
  }
  KP.say = function (name, text) {
    return new Promise(res => {
      const m = $("msg"), t = $("mText");
      m.classList.remove("ch"); KP.setRb($("mName"), name || ""); m.classList.add("on");
      t.style.fontSize = ""; delete t.dataset.fs;
      const finish = typeInto(t, text, 26);
      resolveMsg = () => { if (typing) { finish(); return false; } return true; };
      m._res = res;
    });
  };
  $("msg").addEventListener("click", () => {
    const m = $("msg"); if (m.classList.contains("ch")) return;
    if (resolveMsg && resolveMsg()) { m.classList.remove("on"); resolveMsg = null; const r = m._res; m._res = null; r && r(); }
  });
  KP.hideMsg = () => $("msg").classList.remove("on");
  KP.choose = function (name, text, options) {
    return new Promise(res => {
      const m = $("msg"), t = $("mText"), box = $("mChoices");
      clearInterval(typing); typing = null; resolveMsg = null;
      KP.setRb($("mName"), name || ""); t.style.fontSize = ""; delete t.dataset.fs; t.innerHTML = KP.rb(text); m.classList.add("on", "ch");
      box.innerHTML = "";
      options.forEach((o, i) => { const b = KP.el("button", "pbtn si", KP.rb(o)); b.dataset.box = ""; b.onclick = ev => { ev.stopPropagation(); m.classList.remove("on", "ch"); res(i); }; box.appendChild(b); });
      KP.fit(t, 16); box.querySelectorAll(".pbtn").forEach(b => KP.fit(b, 14)); KP.slideIn(box);
    });
  };

  // ---- ポップアップ：ページはボタンで切り替え（スクロールなし）。ウインドウは中身に合わせた高さ ----
  KP.popup = function (title, pages, opt = {}) {
    return new Promise(res => {
      const pop = $("pop"), box = $("popBox"), body = $("popBody"); let p = 0;
      const render = (first) => {
        KP.setRb($("popTitle"), title + (pages.length > 1 ? `（${p + 1} / ${pages.length}）` : "")); KP.fit($("popTitle"), 18);
        body.style.fontSize = ""; body.style.height = "auto"; body.innerHTML = typeof pages[p] === "function" ? "" : KP.rb(pages[p]);
        if (typeof pages[p] === "function") pages[p](body, () => render());
        // 全ページで いちばん高い中身に合わせる（ページをめくっても ウインドウの大きさが かわらないように）
        let hMax = 0;
        if (pages.length > 1) {
          const keep = body.innerHTML;
          for (const pg of pages) { if (typeof pg !== "string") continue; body.innerHTML = KP.rb(pg); hMax = Math.max(hMax, body.scrollHeight); }
          body.innerHTML = keep;
        } else hMax = body.scrollHeight;
        const H = Math.min(420, Math.max(opt.minH || 120, hMax));
        body.style.height = H + "px";
        let f = 24; while (body.scrollHeight > body.clientHeight + 1 && f > 15) { f--; body.style.fontSize = f + "px"; }
        const total = 76 + H + 108; box.style.height = total + "px"; box.style.top = Math.round((768 - total) / 2) + "px";
        const foot = $("popFoot"); foot.innerHTML = "";
        const btn = (txt, fn, cls) => { const b = KP.el("button", "pbtn sm si" + (cls ? " " + cls : ""), KP.rb(txt)); b.dataset.box = ""; b.onclick = fn; foot.appendChild(b); return b; };
        if (pages.length > 1) {
          const prev = btn("まえへ", () => { p--; render(); }); prev.disabled = p === 0;
          foot.appendChild(KP.el("div", "pg", `${p + 1} / ${pages.length}`));
          if (p < pages.length - 1) btn("つぎへ", () => { p++; render(); }, "red");
          else btn(opt.last || "とじる", () => close(0), "red");
          if (opt.closeBtn !== false && p < pages.length - 1) btn("とじる", () => close(0), "dark");
        } else {
          foot.appendChild(KP.el("div", "pg", ""));
          (opt.buttons || [opt.last || "とじる"]).forEach((t, i) => btn(t, () => close(i), i === 0 ? "red" : ""));
        }
        foot.querySelectorAll(".pbtn").forEach(b => KP.fit(b, 14));
        if (first) { box.classList.remove("pin"); void box.offsetWidth; box.classList.add("pin"); clearTimeout(box._pt); box._pt = setTimeout(() => box.classList.remove("pin"), 340); KP.slideIn(foot); }
      };
      const close = (i = 0) => { pop.classList.remove("on"); res(i); };
      pop.classList.add("on"); render(true);
    });
  };

  // ---- スタンプ ----
  KP.stamp = async function (text, cls = "", ms = 900) {
    const s = $("stamp"); s.className = cls; s.innerHTML = KP.rb(text); void s.offsetWidth; s.classList.add("on");
    await KP.wait(ms); s.classList.remove("on");
  };

  // ---- 暗転：フェードアウト→暗転→フェードイン。クリックで飛ばせる ----
  KP.fade = function (mid, ms = 600, hold = 0, text = "") {
    return new Promise(async res => {
      const f = $("fade"), tx = $("fadeTx");
      let skip = false; f.onclick = () => { skip = true; f.classList.add("fast"); };
      const w = t => new Promise(r => { const t0 = performance.now(); const k = () => (skip || performance.now() - t0 >= t) ? r() : requestAnimationFrame(k); k(); });
      f.style.transitionDuration = ms + "ms"; f.classList.remove("fast"); f.classList.add("on"); tx.innerHTML = KP.rb(text);
      await w(ms);
      if (mid) await mid();
      if (text) { tx.classList.add("on"); await w(hold); tx.classList.remove("on"); } else await w(hold);
      f.classList.remove("on"); await w(skip ? 150 : ms);
      f.onclick = null; f.classList.remove("fast"); res();
    });
  };

  // ---- カットイン（ペルソナ風：斜めの帯に立ち絵と、二つ名・名前・役職） ----
  KP.cutin = function (d) {
    return new Promise(res => {
      const c = $("cutin");
      $("ciImg").src = KP.asset(d.id === "shop" ? "assets/chara/shop_0.webp" : `assets/chara/${d.id}_2.webp`);
      c.classList.toggle("shop", d.id === "shop");
      KP.setRb($("ciNick"), d.nick || "");
      const n = $("ciName"), [a, b] = d.name.split(" "), [ka, kb] = (d.kana || " ").split(" ");
      n.innerHTML = kb ? `<ruby>${a}<rt>${ka}</rt></ruby> <ruby>${b}<rt>${kb}</rt></ruby>` : KP.rb(d.name);
      const role = $("ciRole");
      if (d.hideRole) { role.textContent = "？？？"; setTimeout(() => { KP.setRb(role, d.role); role.classList.remove("flip"); void role.offsetWidth; role.classList.add("flip"); }, 1300); }
      else KP.setRb(role, d.role);
      c.classList.remove("on", "out"); void c.offsetWidth; c.classList.add("on"); KP.se("slide");
      // 長めに見せる（クリック・タップで とばせる）。さいごは 帯が切れるように 走りさって フラッシュ
      let done = false; const fin = async () => {
        if (done) return; done = true; clearTimeout(tm);
        if (!KP.S3.lite) { c.classList.add("out"); KP.se("slide", 1.3); await new Promise(r => setTimeout(r, 420)); }
        c.classList.remove("on", "out"); res();
      };
      c.onclick = fin; const tm = setTimeout(fin, KP.S3.lite ? 1100 : (d.hideRole ? 4300 : 3600));
    });
  };
})(window.KP);
