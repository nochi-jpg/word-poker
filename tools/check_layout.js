// レイアウト自動チェック：カードのかぶり・文字のはみだし・ふりがなのはみだし・画面から切れるボタン
// 使い方: node tools/check_layout.js [dist/kotoba-poker.html] [--play 高学年] [--hard] [--shots out]
//   htmlを指定しないときは game/ をこのツールの中の小さなサーバーで開く（3Dの画像を読むため）
// 基準は 1366×768。スマホ横画面（915×412）でも舞台が画面に収まるかを見る。
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const args = process.argv.slice(2);
const html = args.find(a => a.endsWith('.html'));
const playGrade = args.includes('--play') ? args[args.indexOf('--play') + 1] : null;
const hard = args.includes('--hard');
const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
if (shots) fs.mkdirSync(shots, { recursive: true });

function serve(root) {
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
  return new Promise(res => {
    const sv = http.createServer((q, r) => {
      const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
      fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
    }).listen(0, () => res(sv));
  });
}

// ページの中で動かす検査
function inspect() {
  const st = document.getElementById('stage'), sr = st.getBoundingClientRect(), s = sr.width / 1366;
  const vis = e => { for (let x = e; x && x !== st; x = x.parentElement) { const c = getComputedStyle(x); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; } return true; };
  const pop = document.querySelector('#pop.on');
  let els = [...st.querySelectorAll('[data-box]')].filter(vis);
  if (pop) els = els.filter(e => pop.contains(e));
  const box = e => { const r = e.getBoundingClientRect(); return { l: (r.left - sr.left) / s, t: (r.top - sr.top) / s, r: (r.right - sr.left) / s, b: (r.bottom - sr.top) / s }; };
  const name = e => (e.id ? '#' + e.id : e.className.toString().split(' ')[0]) + '「' + (e.textContent || '').trim().slice(0, 14) + '」';
  const errs = [];
  for (const e of els) {
    const b = box(e);
    if (b.l < -1 || b.t < -1 || b.r > 1367 || b.b > 769) errs.push(`画面から切れる: ${name(e)} (${b.l | 0},${b.t | 0})-(${b.r | 0},${b.b | 0})`);
    for (const x of [e, ...e.querySelectorAll('*')]) {
      if (x.tagName === 'RT' || x.tagName === 'RUBY' || !vis(x) || !x.childNodes.length || getComputedStyle(x).overflow === 'visible' && x !== e) continue;
      if (x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 2) { errs.push(`文字のはみだし: ${name(x)} ${x.scrollWidth}x${x.scrollHeight} > ${x.clientWidth}x${x.clientHeight}`); break; }
    }
    // ふりがな：読みが 枠（はみ出しを切る親）や 画面の外に 出ていないか
    for (const rt of e.querySelectorAll('rt')) {
      if (!vis(rt)) continue;
      const R = box(rt); if (R.r - R.l < 1) continue;
      if (R.t < -1 || R.b > 769 || R.l < -1 || R.r > 1367) { errs.push(`ふりがなが画面の外: ${name(e)}「${rt.textContent}」`); break; }
      let bad = null;
      for (let x = rt.parentElement; x && x !== e.parentElement; x = x.parentElement) {
        const c = getComputedStyle(x); if (c.overflow === 'visible' && x !== e) continue;
        const B = box(x); if (R.t < B.t - 1 || R.b > B.b + 1 || R.l < B.l - 1 || R.r > B.r + 1) { bad = x; break; }
      }
      if (bad) { errs.push(`ふりがなのはみだし: ${name(bad)}「${rt.textContent}」`); break; }
    }
  }
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], c = els[j]; if (a.contains(c) || c.contains(a)) continue;
    const A = box(a), B = box(c), ox = Math.min(A.r, B.r) - Math.max(A.l, B.l), oy = Math.min(A.b, B.b) - Math.max(A.t, B.t);
    if (ox > 2 && oy > 2) errs.push(`かぶり: ${name(a)} と ${name(c)} (${ox | 0}x${oy | 0})`);
  }
  return errs;
}

(async () => {
  const sv = html ? null : await serve(path.join(__dirname, '..', 'game'));
  const url = html ? 'file://' + path.resolve(html) : `http://localhost:${sv.address().port}/index.html`;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  let fail = 0;
  for (const vp of [{ width: 1366, height: 768 }, { width: 915, height: 412 }]) {
    // スマホ横は 本物のスマホと同じ扱い（タッチ・ページの縮小あり）で開く
    const page = await browser.newPage(vp.width < 1000 ? { viewport: vp, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-F956B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' } : { viewport: vp });
    const logs = []; page.on('pageerror', e => logs.push('JSエラー: ' + e.message)); page.on('console', m => m.type() === 'error' && logs.push('console: ' + m.text()));
    await page.addInitScript(lite => { if (lite) localStorage.setItem('kotobapoker_v1', JSON.stringify({ opt: { vol: 0, lite: true } })); else localStorage.setItem('kotobapoker_v1', JSON.stringify({ opt: { vol: 0, lite: false } })); }, !!playGrade);
    await page.goto(url);
    await page.waitForSelector('#loading.off', { state: 'attached', timeout: 30000 });
    const tag = `${vp.width}x${vp.height}`;
    const tap = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (e) e.click(); }, sel);
    const check = async label => {
      await page.waitForTimeout(playGrade ? 150 : 900); // スライドインが終わるのを待つ
      await page.waitForFunction(() => !document.querySelector('.hcard.new,.si.sin,.brow.sin'), null, { timeout: 5000 }).catch(() => { });
      const errs = await page.evaluate(inspect);
      const fit = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; });
      if (!fit) errs.push('舞台が画面に収まっていない');
      if (shots && vp.width === 1366) await page.screenshot({ path: `${shots}/${label}.png` });
      console.log(`[${tag}] ${label}: ${errs.length ? 'NG' : 'OK'}`); errs.forEach(e => console.log('   ' + e)); fail += errs.length;
    };
    const waitFade = () => page.waitForSelector('#fade:not(.on)', { state: 'attached', timeout: 15000 });
    const clickMsg = async (n = 1) => { for (let i = 0; i < n; i++) { if (await page.isVisible('#msg.on:not(.ch)')) { await tap('#msg'); await page.waitForTimeout(40); await tap('#msg'); } await page.waitForTimeout(80); } };
    await page.waitForTimeout(1500);
    await check('01_タイトル');
    if (vp.width === 1366) {
      await tap('[data-act=best]'); await check('02_ハイスコア'); await tap('#popFoot .pbtn.red');
      await tap('[data-act=opt]'); await check('03_オプション'); await tap('#popFoot .pbtn.red');
      await page.evaluate(() => { const d = KP.data(); d.eps = [1, 2, 3, 4, 5]; d.ep1 = true; });
      await tap('[data-act=story]'); await check('03b_おはなし'); await tap('#popFoot .pbtn.red');
      await page.evaluate(() => { const d = KP.data(); d.eps = [1]; d.ep1 = false; });
      await tap('[data-act=play]'); await page.waitForSelector('#msg.on'); await page.waitForTimeout(1500); await check('04_第1話');
      await tap('#skipBtn'); await page.waitForSelector('#pop.on'); await check('04b_スキップ確認'); await tap('#popFoot .pbtn.red');
      await page.waitForSelector('#scr-grade.on'); await check('05_学年選択');
      const g = playGrade || '高学年';
      await page.evaluate(([g, hard]) => { const d = KP.data(); d.grades = KP.GRADE_LIST.slice(); if (hard) { d.hard = KP.GRADE_LIST.slice(); d.hardHint = true; } KP.save.write(); KP.debug.setHard(hard); KP.debug.gradeSelect(true); }, [g, hard]);
      if (hard) await check('05b_学年選択ハード');
      await tap(`.gcard:nth-child(${['低学年', '中学年', '高学年'].indexOf(g) + 1})`);
      for (let p = 1; p <= 3; p++) { await page.waitForSelector('#pop.on'); await check(`06_あそびかた${p}`); await tap('#popFoot .pbtn.red'); }
      // 暗転→登場→カットイン→セリフ
      for (let i = 0; i < 150 && !(await page.isVisible('#cutin.on')); i++) { if (await page.isVisible('#msg.on')) await tap('#msg'); await page.waitForTimeout(100); }
      await page.waitForTimeout(900); await check('07_カットイン');
      await tap('#cutin');
      for (let i = 0; i < 150 && !(await page.isVisible('#sel:not(.off)')); i++) { if (await page.isVisible('#msg.on')) await tap('#msg'); await page.waitForTimeout(100); }
      await check('08_カード選び');
      // 通しプレイ
      if (playGrade) {
        let guard = 0, shotSel = false, shotShop = false, shotJ = 0, shotCh = false, shotSwap = false, shotEnd = false;
        while (guard++ < 4000) {
          const st = await page.evaluate(() => {
            const r = KP.data().run, on = id => !!document.querySelector(id + '.on');
            return { run: !!r, phase: r && r.phase, d: r && r.d, sel: !!document.querySelector('#sel:not(.off)') && on('#battle') && !on('#msg') && !on('#judge'),
              ch: on('#msg.ch'), msg: on('#msg'), shop: on('#shopPick'), res: on('#result'), pop: on('#pop'), cut: on('#cutin'), title: on('#scr-title'),
              judge: !!document.querySelector('#judge.wait'), fade: on('#fade'), roll: on('#roll'), skip: getComputedStyle(document.getElementById('skipBtn')).display !== 'none' };
          });
          if (st.res && !shotEnd) { await page.waitForSelector('#rOk.shown', { state: 'attached', timeout: 20000 }); await check('20_クリア'); shotEnd = true; await tap('#rOk'); continue; }
          if (st.title && !st.run && !st.pop) { console.log('タイトルにもどった'); break; }
          if (st.pop) { if (await page.evaluate(() => /解禁|おめでとう/.test(document.getElementById('popTitle').textContent))) await check('21_解禁'); await tap('#popFoot .pbtn.red'); continue; }
          if (st.fade) { await page.waitForTimeout(150); continue; }
          if (st.roll) { await page.waitForTimeout(1500); await check('22_スタッフロール'); await tap('#skipBtn'); continue; }
          if (st.skip && st.msg && !st.run) { await tap('#skipBtn'); continue; }
          if (st.cut) { await tap('#cutin'); continue; }
          if (st.judge) { if (shotJ < 2) await check('10_判定' + (++shotJ)); await tap('#judge'); continue; }
          if (st.shop) { if (!shotShop) { await check('15_ショップ'); await tap('#spDeck'); await check('16_デッキ'); await tap('#popFoot .pbtn.red'); shotShop = true; } await tap('#spCards .hcard'); await tap('#spCards .hcard:nth-child(2)'); await tap('#spOk'); continue; }
          if (st.ch && !shotCh) { await check('11_えらぶ'); shotCh = true; }
          if (st.ch) { if (st.phase === 'lost') console.log('  負け→コンティニュー', st.d); await tap('#mChoices .pbtn'); continue; }
          if (st.msg) { await tap('#msg'); await page.waitForTimeout(20); continue; }
          if (st.sel) {
            if (!shotSwap) {
              shotSwap = true; await tap('#hPause'); await check('12_中断'); await tap('#popFoot .pbtn:not(.red)');
              await tap('#hDeck'); await check('12b_デッキ'); await tap('#popFoot .pbtn.red');
              await tap('#bSwap'); await tap('#hand .hcard'); await tap('#hand .hcard:nth-child(3)'); await check('13_入れかえ'); await tap('#bGo');
            }
            await page.evaluate(() => KP.debug.botPick());
            if (!shotSel) { await check('09_文を作った'); shotSel = true; }
            await tap('#bGo'); await page.waitForTimeout(100); continue;
          }
          await page.waitForTimeout(100);
        }
        const r = await page.evaluate(() => KP.data());
        console.log('結果:', JSON.stringify({ best: r.best, bestHard: r.bestHard, grades: r.grades, hard: r.hard, eps: r.eps }));
      }
    }
    if (logs.length) { console.log(logs.join('\n')); fail += logs.length; }
    await page.close();
  }
  await browser.close(); if (sv) sv.close();
  console.log(fail ? `NG ${fail}件` : 'すべてOK');
  process.exit(fail ? 1 : 0);
})();
