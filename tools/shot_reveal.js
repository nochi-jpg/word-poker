// 確認用：めくった瞬間の俯瞰カメラを撮る  node tools/shot_reveal.js out.png
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1366, height: 768 } });
  await p.goto('file://' + process.cwd() + '/dist/kotoba-poker.html'); await p.waitForTimeout(1500);
  await p.evaluate(async () => {
    KP.screen('battle'); document.getElementById('sel').classList.add('off');
    KP.S3.visible = true; KP.S3.setDealer('c12'); KP.S3.light(3);
    const g = '高学年', w = st => KP.words(g, st);
    KP.S3.place(w({ s: '犬が', ms: ['公園で', 'ケーキを'], p: '食べた', adj: [['犬が', 'かわいい'], ['ケーキを', 'おいしい']] }), w({ s: '先生が', ms: ['放課後', '図書館で', '物語を'], p: '読んだ', adj: [['先生が', 'やさしい'], ['物語を', '長い'], ['図書館で', '新しい']] }));
    await KP.S3.camTo('top', 0); await KP.S3.flip(10);
    KP.say('判定', 'あなた：「やさしい 先生が 放課後 新しい 図書館で 長い 物語を 読んだ」\n成立！ 8語×2＝16点');
  });
  await p.waitForTimeout(3000); await p.screenshot({ path: process.argv[2] || '/tmp/reveal.png' }); await b.close();
})();
