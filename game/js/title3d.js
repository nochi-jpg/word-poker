// ことばポーカー：タイトル画面の右側に、カードがパラパラ回りながら ゆっくり降ってくる（three.js）
// 表＝赤地に キャラのシルエット、裏＝黒。同時に出るのは最大8まい。マウスには反応しない（pointer-events:none）
(function (KP) {
  const T = KP.T3 = {};
  const IDS = ["c01", "c02", "c03", "c04", "c05", "c06", "c07", "c08", "c09", "c10", "c11", "c12", "mise"];
  const MAX = 8, U = 768 / (2 * 10 * Math.tan(20 * Math.PI / 180)); // 1単位が何px か
  let renderer, scene, cam, faces = [], back, cards = [], raf = 0, last = 0, nextSpawn = 0, running = false;

  function faceTex(img) {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 360; const g = cv.getContext("2d");
    g.fillStyle = "#c8101b"; g.fillRect(0, 0, 256, 360);
    g.fillStyle = "rgba(0,0,0,.22)"; for (let y = 6; y < 360; y += 12) for (let x = (y / 12 % 2) * 6; x < 256; x += 12) { g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); }
    if (img) {
      // シルエット：絵の形だけを黒くぬる
      const t = document.createElement("canvas"); t.width = img.width; t.height = img.height; const tg = t.getContext("2d");
      tg.drawImage(img, 0, 0); tg.globalCompositeOperation = "source-in"; tg.fillStyle = "#0a0a0a"; tg.fillRect(0, 0, t.width, t.height);
      const s = Math.min(230 / img.width, 330 / img.height), w = img.width * s, h = img.height * s;
      g.drawImage(t, (256 - w) / 2, 360 - 14 - h, w, h);
    }
    g.strokeStyle = "#fff"; g.lineWidth = 10; g.strokeRect(9, 9, 238, 342);
    g.strokeStyle = "#111"; g.lineWidth = 6; g.strokeRect(3, 3, 250, 354);
    const tx = new THREE.CanvasTexture(cv); tx.anisotropy = 4; return tx;
  }
  function backTex() {
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 360; const g = cv.getContext("2d");
    g.fillStyle = "#0b0b0b"; g.fillRect(0, 0, 256, 360);
    g.strokeStyle = "rgba(215,20,31,.35)"; g.lineWidth = 8; for (let i = -360; i < 360; i += 30) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 360, 360); g.stroke(); }
    g.strokeStyle = "#d7141f"; g.lineWidth = 10; g.strokeRect(9, 9, 238, 342);
    return new THREE.CanvasTexture(cv);
  }

  T.init = function (canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(40, 1366 / 768, .1, 50); cam.position.set(0, 0, 10); cam.lookAt(0, 0, 0);
    back = new THREE.MeshBasicMaterial({ map: backTex() });
    faces = IDS.map(() => new THREE.MeshBasicMaterial({ map: faceTex(null) }));
    IDS.forEach((id, i) => {
      const img = new Image();
      img.onload = () => { faces[i].map = faceTex(img); faces[i].needsUpdate = true; };
      img.src = KP.asset(`assets/chara/${id}_0.webp`);
    });
    T.resize();
  };
  T.resize = function () {
    if (!renderer) return;
    const s = KP.scale || 1;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.setSize(1366 * s, 768 * s, false);
  };
  const px = (x, y) => [(x - 683) / U, (384 - y) / U];
  function spawn(top) {
    const i = Math.floor(Math.random() * IDS.length), side = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.04, .03), [side, side, side, side, faces[i], back]);
    const [x, y] = px(480 + Math.random() * 860, top ? -160 : Math.random() * 600);
    m.position.set(x, y, -1.5 + Math.random() * 3);
    m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    const ax = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize();
    m.userData = { ax, w: .5 + Math.random() * 1.1, vy: .45 + Math.random() * .4, sway: Math.random() * 6, sa: .15 + Math.random() * .35, x0: x };
    scene.add(m); cards.push(m);
  }
  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    if (cards.length < MAX && now > nextSpawn) { spawn(true); nextSpawn = now + 900 + Math.random() * 1400; }
    for (let k = cards.length - 1; k >= 0; k--) {
      const m = cards[k], u = m.userData;
      m.position.y -= u.vy * dt; u.sway += dt; m.position.x = u.x0 + Math.sin(u.sway * .8) * u.sa;
      m.rotateOnAxis(u.ax, u.w * dt);
      if (m.position.y < -384 / U - 1.6) { scene.remove(m); m.geometry.dispose(); cards.splice(k, 1); }
    }
    renderer.render(scene, cam);
  }
  T.start = function () {
    if (KP.S3.lite || running) return;
    if (!renderer) T.init(KP.$("tcards"));
    running = true; last = 0;
    if (!cards.length) for (let k = 0; k < 4; k++) spawn(false);
    raf = requestAnimationFrame(loop);
  };
  T.stop = function () { running = false; cancelAnimationFrame(raf); };
})(window.KP);
