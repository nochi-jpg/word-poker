// レイアウト自動チェック：カードのかぶり・文字のはみだし・画面から切れるボタン
// 使い方: node tools/check_layout.js [dist/kotoba-poker.html] [--play 低学年] [--shots out]
// 基準は 1366×768。スマホ横画面（915×412）でも舞台が画面に収まるかを見る。
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const args = process.argv.slice(2);
const file = path.resolve(args.find(a => a.endsWith('.html')) || 'dist/kotoba-poker.html');
const playGrade = args.includes('--play') ? args[args.indexOf('--play') + 1] : null;
const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : null;
if (shots) fs.mkdirSync(shots, { recursive: true });

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
      if (!vis(x) || !x.childNodes.length || getComputedStyle(x).overflow === 'visible' && x !== e) continue;
      if (x.scrollWidth > x.clientWidth + 1 || x.scrollHeight > x.clientHeight + 2) { errs.push(`文字のはみだし: ${name(x)} ${x.scrollWidth}x${x.scrollHeight} > ${x.clientWidth}x${x.clientHeight}`); break; }
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
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  let fail = 0;
  for (const vp of [{ width: 1366, height: 768 }, { width: 915, height: 412 }]) {
    const page = await browser.newPage({ viewport: vp });
    const logs = []; page.on('pageerror', e => logs.push('JSエラー: ' + e.message)); page.on('console', m => m.type() === 'error' && logs.push('console: ' + m.text()));
    await page.addInitScript(lite => { if (lite) localStorage.setItem('kotobapoker_v1', JSON.stringify({ opt: { vol: 5, lite: true } })); }, !!playGrade);
    await page.goto('file://' + file);
    await page.waitForSelector('#loading.off', { state: 'attached', timeout: 30000 });
    const tag = `${vp.width}x${vp.height}`;
    const tap = sel => page.evaluate(sel => { const e = document.querySelector(sel); if (e) e.click(); }, sel);
    const check = async label => {
      await page.waitForTimeout(150);
      const errs = await page.evaluate(inspect);
      const fit = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; });
      if (!fit) errs.push('舞台が画面に収まっていない');
      if (shots && vp.width === 1366) await page.screenshot({ path: `${shots}/${label}.png` });
      console.log(`[${tag}] ${label}: ${errs.length ? 'NG' : 'OK'}`); errs.forEach(e => console.log('   ' + e)); fail += errs.length;
    };
    const clickMsg = async (n = 1) => { for (let i = 0; i < n; i++) { if (await page.isVisible('#msg.on:not(.ch)')) { await tap('#msg'); await page.waitForTimeout(40); await tap('#msg'); } await page.waitForTimeout(60); } };
    await check('01_タイトル');
    if (vp.width === 1366) {
      await page.click('[data-act=best]'); await check('02_ハイスコア'); await page.click('#popFoot .pbtn');
      await page.click('[data-act=opt]'); await check('03_オプション'); await page.click('#popFoot .pbtn');
      await page.click('[data-act=play]'); await page.waitForSelector('#msg.on'); await check('04_第1話');
      await page.click('#skipBtn'); await page.waitForSelector('#scr-grade.on'); await check('05_学年選択');
      const g = playGrade || '高学年';
      if (g !== '低学年') await page.evaluate(g => { const d = KP.data(); d.grades = KP.GRADE_LIST.slice(); KP.save.write(); KP.debug.gradeSelect(); }, g);
      await page.click(`.gcard:nth-child(${['低学年', '中学年', '高学年'].indexOf(g) + 1})`);
      for (let p = 1; p <= 3; p++) { await check(`06_あそびかた${p}`); await tap('#popFoot .pbtn.red'); }
      // 登場→カットイン→セリフ
      await clickMsg(1); await page.waitForTimeout(400); await check('07_カットイン');
      await page.waitForSelector('#cutin:not(.on)', { state: 'attached', timeout: 5000 }); await clickMsg(3);
      await page.waitForSelector('#sel:not(.off)'); await check('08_カード選び');
      if (!playGrade) {
        // 文を作って枠を埋めた状態（最長）を見る
        await page.evaluate(() => KP.debug.botPick && KP.debug.botPick());
      }
      // 通しプレイ
      if (playGrade) {
        let guard = 0, shotSel = false, shotShop = false, shotMsg = 0, shotCh = false, shotSwap = false;
        while (guard++ < 3000) {
          const st = await page.evaluate(() => {
            const r = KP.data().run, on = id => document.querySelector(id + '.on');
            return { run: !!r, phase: r && r.phase, d: r && r.d, sel: !!document.querySelector('#sel:not(.off)') && document.querySelector('#battle.on') && !document.querySelector('#msg.on'),
              ch: !!on('#msg.ch'), msg: !!document.querySelector('#msg.on'), shop: !!on('#shopPick'), res: !!on('#result'), pop: !!on('#pop'), cut: !!on('#cutin'), title: !!on('#scr-title') };
          });
          if (guard % 10 === 0) console.log('  …', st.phase, st.d, st.msg, await page.evaluate(() => document.getElementById('mText').textContent.slice(0, 30)));
          if (st.res) { await check('20_クリア'); break; }
          if (st.title && !st.run) { console.log('タイトルにもどった'); break; }
          if (st.pop) { await tap('#popFoot .pbtn.red'); continue; }
          if (st.cut) { await tap('#cutin'); continue; }
          if (st.shop) { if (!shotShop) { await check('15_ショップ'); shotShop = true; } await tap('#spCards .hcard'); await tap('#spCards .hcard:nth-child(2)'); await tap('#spOk'); continue; }
          if (st.ch && !shotCh) { await check('11_えらぶ'); shotCh = true; }
          if (st.ch) { if (st.phase === 'lost') console.log('  負け→コンティニュー'); await tap('#mChoices .pbtn'); continue; }
          if (st.msg && shotMsg < 2 && st.phase === 'match') { await check('10_判定' + (++shotMsg)); }
          if (st.msg) { await tap('#msg'); await page.waitForTimeout(20); continue; }
          if (st.sel) {
            if (!shotSwap) {
              shotSwap = true; await page.click('#hPause'); await check('12_中断'); await tap('#popFoot .pbtn:not(.red)');
              await tap('#bSwap'); await tap('#hand .hcard'); await tap('#hand .hcard:nth-child(3)'); await check('13_入れかえ'); await tap('#bGo');
            }
            const ok = await page.evaluate(() => KP.debug.botPick());
            if (!shotSel) { await check('09_文を作った'); shotSel = true; }
            await tap('#bGo'); await page.waitForTimeout(100); continue;
          }
          await page.waitForTimeout(100);
        }
        const r = await page.evaluate(() => KP.data());
        console.log('結果:', JSON.stringify({ best: r.best, grades: r.grades, eps: r.eps }));
      }
    }
    if (logs.length) { console.log(logs.join('\n')); fail += logs.length; }
    await page.close();
  }
  await browser.close();
  console.log(fail ? `NG ${fail}件` : 'すべてOK');
  process.exit(fail ? 1 : 0);
})();
