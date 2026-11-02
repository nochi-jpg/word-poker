// ことばポーカー：3Dの教室（カキワリ）・ポーカー台・ディーラー・カード・カメラ
(function (KP) {
  KP.asset = p => (window.KP_ASSETS && window.KP_ASSETS[p]) || p;
  KP.COLOR = { S: ["#d7141f", "#fff"], M: ["#f2b705", "#111"], P: ["#1e4fd8", "#fff"], N: ["#3dd27a", "#111"] };
  const POSE = { 基本: 0, 思考: 1, カードを出す: 2, 嬉しい: 3, 悔しい: 4 };
  const S3 = KP.S3 = {};
  let renderer, scene, cam, lamp, amb, dealer, table, room, roomMats = [], tableMats = [], moods = {}, cards = [];
  const anims = [];
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  S3.tween = (ms, fn) => new Promise(res => { if (S3.lite && ms > 0) ms = Math.min(ms, 250); anims.push({ t0: performance.now(), ms: Math.max(1, ms), fn, res }); });
  const loader = () => new THREE.TextureLoader();
  function tex(file, rx, ry) {
    const t = loader().load(KP.asset("assets/tex/" + file + ".jpg")); t.anisotropy = 4;
    if (rx || ry) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); }
    return t;
  }

  S3.init = function (holder, lite) {
    S3.lite = !!lite;
    renderer = new THREE.WebGLRenderer({ antialias: !lite });
    holder.appendChild(renderer.domElement);
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0b0f);
    cam = new THREE.PerspectiveCamera(50, 1366 / 768, .1, 50);
    amb = new THREE.AmbientLight(0xffffff, .55); scene.add(amb);
    lamp = new THREE.PointLight(0xffd59a, 1.6, 8); lamp.position.set(0, 2.6, -.3); scene.add(lamp);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(.35, .25, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a2418, side: THREE.DoubleSide }));
    shade.position.set(0, 2.95, -.3); scene.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe8b0 })); bulb.position.set(0, 2.82, -.3); scene.add(bulb);
    // 教室：横6×奥行き7×高さ3.375（画像の16:9に合わせる）
    const RW = 6, RD = 7, RH = 3.375, Z0 = -4, Z1 = Z0 + RD;
    const board = (f, w, h, rx, ry) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex(f, rx, ry) }));
    room = new THREE.Group(); scene.add(room);
    const floor = board("floor", RW, RD, 1, 2); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (Z0 + Z1) / 2); room.add(floor);
    const ceil = board("ceiling", RW, RD); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, RH, (Z0 + Z1) / 2); room.add(ceil);
    const front = board("front", RW, RH); front.position.set(0, RH / 2, Z0); room.add(front);
    const back = board("wall", RW, RH); back.rotation.y = Math.PI; back.position.set(0, RH / 2, Z1); room.add(back);
    const left = board("door", RD, RH); left.rotation.y = Math.PI / 2; left.position.set(-RW / 2, RH / 2, (Z0 + Z1) / 2); room.add(left);
    const right = board("wall", RD, RH); right.rotation.y = -Math.PI / 2; right.position.set(RW / 2, RH / 2, (Z0 + Z1) / 2); room.add(right);
    roomMats = room.children.map(m => m.material);
    // ポーカー台
    table = new THREE.Group(); scene.add(table);
    const feltMat = new THREE.MeshStandardMaterial({ map: tex("felt", 2.2, 1), roughness: .95 });
    const chipMat = new THREE.MeshStandardMaterial({ map: tex("walnut", 3, .4), roughness: .6 });
    const legMat = new THREE.MeshStandardMaterial({ map: tex("walnut", .3, 1), roughness: .6 });
    tableMats = [feltMat, chipMat, legMat];
    const felt = new THREE.Mesh(new THREE.BoxGeometry(2.3, .08, 1.5), [chipMat, chipMat, feltMat, chipMat, chipMat, chipMat]); felt.position.y = .78; table.add(felt);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(2.45, .1, 1.65), chipMat); rim.position.y = .74; table.add(rim);
    for (const [x, z] of [[-1.05, -.65], [1.05, -.65], [-1.05, .65], [1.05, .65]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.12, .74, .12), legMat); l.position.set(x, .37, z); table.add(l); }
    // ディーラー（立ち絵は全員398×655・足元そろえ）
    const DH = 2.15, DW = DH * 398 / 655;
    dealer = new THREE.Mesh(new THREE.PlaneGeometry(DW, DH), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .05 }));
    dealer.position.set(0, DH / 2, -1.25); dealer.userData.y0 = DH / 2; dealer.visible = false; scene.add(dealer);
    S3.camTo("front", 0);
    requestAnimationFrame(loop);
  };
  S3.resize = function (w, h) {
    renderer.setPixelRatio(S3.lite ? 1 : Math.min(devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false); renderer.domElement.style.width = "1366px"; renderer.domElement.style.height = "768px";
  };

  // ---- ディーラー ----
  S3.setDealer = function (id) {
    moods = {}; dealer.visible = !!id; if (!id) return;
    if (id === "shop") { moods.基本 = loader().load(KP.asset("assets/chara/shop_0.webp")); dealer.position.y = dealer.userData.y0 - .25; dealer.userData.yy = -.25; }
    else { Object.entries(POSE).forEach(([m, k]) => { moods[m] = loader().load(KP.asset(`assets/chara/${id}_${k}.webp`)); }); dealer.userData.yy = 0; }
    S3.mood("基本");
  };
  S3.mood = m => { const t = moods[m] || moods.基本; if (!t) return; dealer.material.map = t; dealer.material.needsUpdate = true; };
  S3.showTable = v => { table.visible = v; };
  S3.showDealer = v => { dealer.visible = v; };

  // ---- ステージごとの照明 ----
  const LIGHTS = [
    { tint: [1, 1, 1], amb: .6, lamp: 1.4, vig: "rgba(0,0,0,0)" },
    { tint: [1, .82, .66], amb: .5, lamp: 1.6, vig: "rgba(60,20,0,.35)" },
    { tint: [.45, .52, .75], amb: .35, lamp: 1.8, vig: "rgba(0,0,20,.6)" },
    { tint: [.75, .3, .32], amb: .3, lamp: 2.2, vig: "rgba(30,0,0,.7)" },
  ];
  S3.light = function (i, vigEl) {
    const L = LIGHTS[i];
    roomMats.forEach(m => m.color.setRGB(...L.tint));
    dealer.material.color.setRGB(...L.tint.map(v => .5 + v * .5));
    tableMats.forEach(m => m.color.setRGB(...L.tint.map(v => .4 + v * .6)));
    amb.intensity = L.amb; lamp.intensity = L.lamp;
    if (vigEl) vigEl.style.background = `radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 35%, ${L.vig} 100%)`;
  };

  // ---- カード（3D） ----
  const mctx = document.createElement("canvas").getContext("2d");
  const FONT = '"KPDela","KPMaru",sans-serif';
  function fitFs(words) { let f = 64; const ok = w => { mctx.font = `${f}px ${FONT}`; return mctx.measureText(w).width <= 220; }; while (f > 20 && !words.every(ok)) f -= 2; return f; }
  function cardTex(c, fs) {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 360; const g = cv.getContext("2d");
    const [band, ink] = KP.COLOR[c.r];
    g.fillStyle = "#fff"; g.fillRect(0, 0, 256, 360); g.strokeStyle = "#111"; g.lineWidth = 12; g.strokeRect(6, 6, 244, 348);
    g.fillStyle = band; g.fillRect(12, 12, 232, 64);
    g.fillStyle = ink; g.font = `40px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(KP.ROLE[c.r], 128, 46);
    g.fillStyle = "#111"; g.font = `${fs}px ${FONT}`; g.fillText(c.w, 128, 214);
    return new THREE.CanvasTexture(cv);
  }
  let backTex = null;
  function getBack() {
    if (backTex) return backTex;
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 360; const g = cv.getContext("2d");
    g.fillStyle = "#b0101a"; g.fillRect(0, 0, 256, 360);
    g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 10; for (let i = -360; i < 360; i += 34) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 360, 360); g.stroke(); }
    g.strokeStyle = "#fff"; g.lineWidth = 12; g.strokeRect(6, 6, 244, 348);
    g.fillStyle = "#111"; g.fillRect(64, 140, 128, 80); g.fillStyle = "#fff"; g.font = `44px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ことば", 128, 181);
    return backTex = new THREE.CanvasTexture(cv);
  }
  function makeCard(c, fs, x, z, sc) {
    const side = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const m = new THREE.Mesh(new THREE.BoxGeometry(.36 * sc, .006, .5 * sc), [side, side, new THREE.MeshStandardMaterial({ map: getBack() }), new THREE.MeshStandardMaterial({ map: cardTex(c, fs) }), side, side]);
    m.position.set(x, .83, z); m.rotation.y = Math.PI; m.userData = { x, z }; scene.add(m); cards.push(m); return m;
  }
  // 両者の文を伏せて置く（奥＝ディーラー、手前＝プレイヤー）。cs はカードの配列
  S3.place = function (dCards, pCards) {
    S3.clear();
    const fs = fitFs([...dCards, ...pCards].map(c => c.w));
    const row = (cs, z) => { const n = cs.length, gap = Math.min(.42, 2.1 / Math.max(n, 1)), sc = Math.min(1, gap / .42); return cs.map((c, i) => makeCard(c, fs, (i - (n - 1) / 2) * gap, z, sc)); };
    return { d: row(dCards, -.4), p: row(pCards, .3) };
  };
  S3.flip = (ms = 600) => S3.tween(ms, t => { const e = ease(t); cards.forEach(m => { m.rotation.z = Math.PI * e; m.position.y = .83 + Math.sin(Math.PI * e) * .18; }); });
  // 成立：カードがはねる／バースト：カードがくずれる
  S3.bounce = list => S3.tween(500, t => list.forEach((m, i) => { m.position.y = .83 + Math.max(0, Math.sin(Math.PI * Math.min(1, t * 1.6 - i * .08))) * .12; }));
  S3.burst = list => S3.tween(900, t => list.forEach((m, i) => {
    const e = ease(t), dir = (i % 2 ? 1 : -1);
    m.position.x = m.userData.x + dir * e * (.2 + i * .05); m.position.z = m.userData.z + e * .25; m.rotation.y = Math.PI + dir * e * 1.2; m.position.y = .83 + Math.sin(Math.PI * Math.min(1, t * 2)) * .15;
  }));
  S3.clear = () => cards.splice(0).forEach(m => { scene.remove(m); m.geometry.dispose(); });

  // ---- カメラ ----
  const A = {
    front: { pos: new THREE.Vector3(-.9, 1.35, 2.5), look: new THREE.Vector3(-.9, 1.2, -1.2) },
    center: { pos: new THREE.Vector3(0, 1.35, 2.5), look: new THREE.Vector3(0, 1.2, -1.2) },
    top: { pos: new THREE.Vector3(0, 2.7, .62), look: new THREE.Vector3(0, .8, .2) },
  };
  const camState = { pos: A.front.pos.clone(), look: A.front.look.clone(), at: "front" };
  S3.camTo = async function (name, ms = 1100) {
    const from = { pos: camState.pos.clone(), look: camState.look.clone() }, to = A[name], side = name === "top" ? 1.6 : -1.6;
    camState.at = name;
    if (!ms || S3.lite) { camState.pos.copy(to.pos); camState.look.copy(to.look); return; }
    const ctrl = new THREE.Vector3((from.pos.x + to.pos.x) / 2 + side, Math.max(from.pos.y, to.pos.y) + .4, (from.pos.z + to.pos.z) / 2 + .6);
    await S3.tween(ms, t => {
      const e = ease(t), a = new THREE.Vector3().copy(from.pos).multiplyScalar((1 - e) * (1 - e));
      a.addScaledVector(ctrl, 2 * (1 - e) * e).addScaledVector(to.pos, e * e); camState.pos.copy(a); camState.look.lerpVectors(from.look, to.look, e);
    });
  };
  S3.shake = () => S3.tween(300, t => { dealer.position.x = Math.sin(t * 40) * .03 * (1 - t); });

  let tt = 0, last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (S3.lite && now - last < 32) return; last = now;
    for (let i = anims.length - 1; i >= 0; i--) { const a = anims[i], t = Math.min(1, (now - a.t0) / a.ms); a.fn(t); if (t >= 1) { anims.splice(i, 1); a.res(); } }
    tt += .016; dealer.position.y = dealer.userData.y0 + (dealer.userData.yy || 0) + Math.sin(tt * 1.6) * .008;
    cam.position.copy(camState.pos); cam.lookAt(camState.look);
    if (S3.visible !== false) renderer.render(scene, cam);
  }
})(window.KP);
