// ことばポーカー：画面まわりの道具（文字ウインドウ・ポップアップ・カットイン・スタンプ）
(function (KP) {
  const $ = KP.$ = id => document.getElementById(id);
  KP.wait = ms => new Promise(r => setTimeout(r, KP.S3 && KP.S3.lite ? Math.min(ms, 200) : ms));
  KP.el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // 舞台（1366×768）を画面に合わせる
  KP.fitStage = function () {
    const w = window.innerWidth, h = window.innerHeight, s = Math.min(w / 1366, h / 768), st = $("stage");
    st.style.transform = `scale(${s})`; st.style.left = (w - 1366 * s) / 2 + "px"; st.style.top = (h - 768 * s) / 2 + "px";
    KP.scale = s; if (KP.S3.resize) KP.S3.resize(1366 * s, 768 * s);
  };
  // はみだす文字は小さくする（1行）
  KP.fit = function (e, min = 12) {
    let f = parseFloat(e.dataset.fs || getComputedStyle(e).fontSize); e.dataset.fs = f; e.style.fontSize = f + "px";
    while ((e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) && f > min) { f -= 1; e.style.fontSize = f + "px"; }
    return f;
  };
  KP.screen = function (id) {
    document.querySelectorAll(".scr").forEach(s => s.classList.toggle("on", s.id === id));
  };
  KP.star = on => `<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4.5 2 7.5L12 17l-6.5 4 2-7.5L2 9h7z" fill="${on ? "#d7141f" : "none"}" stroke="#111" stroke-width="1.6"/></svg>`;

  // ---- 文字ウインドウ ----
  let resolveMsg = null, typing = null;
  KP.say = function (name, text) {
    return new Promise(res => {
      const m = $("msg"), t = $("mText");
      m.classList.remove("ch"); $("mName").textContent = name || ""; m.classList.add("on");
      t.style.fontSize = ""; t.textContent = text; KP.fit(t, 16); t.textContent = "";
      let i = 0; const chars = [...text];
      clearInterval(typing);
      const done = () => { clearInterval(typing); typing = null; t.textContent = text; };
      if (KP.S3.lite) done(); else typing = setInterval(() => { t.textContent += chars[i++] || ""; if (i >= chars.length) done(); }, 28);
      resolveMsg = () => { if (typing) { done(); return false; } return true; };
      m._res = res;
    });
  };
  $("msg").addEventListener("click", e => {
    const m = $("msg"); if (m.classList.contains("ch")) return;
    if (resolveMsg && resolveMsg()) { m.classList.remove("on"); resolveMsg = null; const r = m._res; m._res = null; r && r(); }
  });
  KP.hideMsg = () => $("msg").classList.remove("on");
  KP.choose = function (name, text, options) {
    return new Promise(res => {
      const m = $("msg"), t = $("mText"), box = $("mChoices");
      clearInterval(typing); typing = null; resolveMsg = null;
      $("mName").textContent = name || ""; t.style.fontSize = ""; t.textContent = text; m.classList.add("on", "ch");
      box.innerHTML = "";
      options.forEach((o, i) => { const b = KP.el("button", "pbtn", o); b.dataset.box = ""; b.onclick = ev => { ev.stopPropagation(); m.classList.remove("on", "ch"); res(i); }; box.appendChild(b); });
      KP.fit(t, 16); box.querySelectorAll(".pbtn").forEach(b => KP.fit(b, 14));
    });
  };

  // ---- ポップアップ：ページはボタンで切り替え（スクロールなし） ----
  KP.popup = function (title, pages, opt = {}) {
    return new Promise(res => {
      const pop = $("pop"); let p = 0;
      const render = () => {
        $("popTitle").textContent = title + (pages.length > 1 ? `（${p + 1} / ${pages.length}）` : "");
        const body = $("popBody"); body.style.fontSize = ""; body.innerHTML = typeof pages[p] === "function" ? "" : pages[p];
        if (typeof pages[p] === "function") pages[p](body, render);
        let f = 24; while (body.scrollHeight > body.clientHeight + 1 && f > 15) { f--; body.style.fontSize = f + "px"; }
        const foot = $("popFoot"); foot.innerHTML = "";
        const btn = (txt, fn, cls) => { const b = KP.el("button", "pbtn sm" + (cls ? " " + cls : ""), txt); b.dataset.box = ""; b.onclick = fn; foot.appendChild(b); return b; };
        if (pages.length > 1) {
          const prev = btn("まえへ", () => { p--; render(); }); prev.disabled = p === 0;
          foot.appendChild(KP.el("div", "pg", `${p + 1} / ${pages.length}`));
          if (p < pages.length - 1) btn("つぎへ", () => { p++; render(); }, "red");
          else btn(opt.last || "とじる", close, "red");
        } else {
          foot.appendChild(KP.el("div", "pg", ""));
          (opt.buttons || [opt.last || "とじる"]).forEach((t, i) => btn(t, () => close(i), i === 0 ? "red" : ""));
        }
      };
      const close = (i = 0) => { pop.classList.remove("on"); res(i); };
      pop.classList.add("on"); render();
    });
  };

  // ---- スタンプ ----
  KP.stamp = async function (text, cls = "", ms = 900) {
    const s = $("stamp"); s.className = cls; s.textContent = text; void s.offsetWidth; s.classList.add("on");
    await KP.wait(ms); s.classList.remove("on");
  };

  // ---- カットイン（ペルソナ風：斜めの帯に立ち絵と名前） ----
  KP.cutin = function (d, grade) {
    return new Promise(res => {
      const c = $("cutin");
      $("ciImg").src = KP.asset(d.id === "shop" ? "assets/chara/shop_0.webp" : `assets/chara/${d.id}_2.webp`);
      $("ciRole").textContent = d.role;
      const n = $("ciName");
      if (grade === "低学年" && d.kana) {
        const [a, b] = d.name.split(" "), [ka, kb] = d.kana.split(" ");
        n.innerHTML = `<ruby>${a}<rt>${ka}</rt></ruby> <ruby>${b}<rt>${kb}</rt></ruby>`;
      } else n.textContent = d.name;
      c.classList.remove("on"); void c.offsetWidth; c.classList.add("on");
      let done = false; const fin = () => { if (done) return; done = true; c.classList.remove("on"); res(); };
      c.onclick = fin; setTimeout(fin, KP.S3.lite ? 900 : 2000);
    });
  };
})(window.KP);
