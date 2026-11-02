// ことばポーカー CPU戦シミュレーター（全学年）
// 使い方: node cpu_sim.js
const fs = require('fs');
const path = require('path');

// ---- カードデータを試作HTMLからそのまま読み込む ----
function loadCards(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/const C=\[([\s\S]*?)\n\];/);
  return eval('[' + m[1] + ']');
}
const MID = loadCards(path.join(__dirname, '..', 'prototypes', 'battle-mid', 'index.html'));
const HIGH = loadCards(path.join(__dirname, '..', 'prototypes', 'judge-test-high', 'index.html'));

// ---- 低学年（仮）のカード 28枚 ----
const LOW = [
  { r: 'S', w: 'いぬが', b: 'いぬ', tag: 'どうぶつ' }, { r: 'S', w: 'ねこが', b: 'ねこ', tag: 'どうぶつ' },
  { r: 'S', w: 'うさぎが', b: 'うさぎ', tag: 'どうぶつ' }, { r: 'S', w: 'ぼくは', b: 'ぼく', tag: 'ひと' },
  { r: 'S', w: 'わたしは', b: 'わたし', tag: 'ひと' }, { r: 'S', w: 'せんせいが', b: 'せんせい', tag: 'ひと' },
  { r: 'S', w: 'ともだちが', b: 'ともだち', tag: 'ひと' },
  { r: 'P', w: 'たべた', subj: ['ひと', 'どうぶつ'], mods: ['たべもの', 'ようす', 'とき', 'ばしょ'] },
  { r: 'P', w: 'はしった', subj: ['ひと', 'どうぶつ'], mods: ['ようす', 'とき', 'ばしょ'] },
  { r: 'P', w: 'ねた', subj: ['ひと', 'どうぶつ'], mods: ['とき', 'ばしょ'] },
  { r: 'P', w: 'あるいた', subj: ['ひと', 'どうぶつ'], mods: ['ようす', 'とき', 'ばしょ'] },
  { r: 'P', w: 'あそんだ', subj: ['ひと', 'どうぶつ'], mods: ['ようす', 'とき', 'ばしょ'] },
  { r: 'P', w: 'わらった', subj: ['ひと'], mods: ['ようす', 'とき', 'ばしょ', 'こえ'] },
  { r: 'P', w: 'ないた', subj: ['ひと', 'どうぶつ'], mods: ['こえ', 'とき', 'ばしょ'] },
  { r: 'P', w: 'よんだ', subj: ['ひと'], mods: ['もの', 'こえ', 'とき', 'ばしょ'] },
  { r: 'P', w: 'かいた', subj: ['ひと'], mods: ['もの', 'とき', 'ばしょ'] },
  { r: 'P', w: 'みた', subj: ['ひと', 'どうぶつ'], mods: ['たべもの', 'もの', 'ようす', 'とき', 'ばしょ'] },
  { r: 'M', w: 'パンを', b: 'パン', kind: 'たべもの', cs: 'を' }, { r: 'M', w: 'りんごを', b: 'りんご', kind: 'たべもの', cs: 'を' },
  { r: 'M', w: 'ほんを', b: 'ほん', kind: 'もの', cs: 'を', ngP: ['かいた'] }, { r: 'M', w: 'えを', b: 'え', kind: 'もの', cs: 'を', ngP: ['よんだ'] },
  { r: 'M', w: 'こうえんで', b: 'こうえん', kind: 'ばしょ', cs: 'で' }, { r: 'M', w: 'いえで', b: 'いえ', kind: 'ばしょ', cs: 'で' },
  { r: 'M', w: 'きのう', b: 'きのう', kind: 'とき' }, { r: 'M', w: 'あさ', b: 'あさ', kind: 'とき' },
  { r: 'M', w: 'ゆっくり', b: 'ゆっくり', kind: 'ようす' }, { r: 'M', w: 'げんきに', b: 'げんき', kind: 'ようす', ngP: ['みた'] },
  { r: 'M', w: 'おおきなこえで', b: 'こえ', kind: 'こえ' },
];

// ---- 判定（高学年テストページと同じルール。低・中学年はこのサブセット） ----
function judge(st) {
  const { s, ms, p, adj } = st;
  if (!s || !p) return false;
  if (!p.subj.includes(s.tag)) return false;
  const kinds = new Set(), cs = new Set();
  for (const m of ms) {
    if (!m.any && !p.mods.includes(m.kind) && !(m.okP && m.okP.includes(p.w))) return false;
    if (m.ngP && m.ngP.includes(p.w)) return false;
    if (kinds.has(m.kind)) return false;
    if (m.cs && cs.has(m.cs)) return false;
    for (const o of ms) if (m.ng && m.ng.includes(o.b)) return false;
    kinds.add(m.kind); if (m.cs) cs.add(m.cs);
  }
  for (const [noun, a] of adj) {
    if (noun.adj === false) return false;
    if (!noun.nt || !a.to.includes(noun.nt) || (a.ngN && a.ngN.includes(noun.b))) return false;
    if (a.ngP && a.ngP.includes(p.w)) return false;
  }
  const bs = [s.b, ...ms.map(m => m.b), ...[...adj.values()].map(a => a.b)];
  if (new Set(bs).size !== bs.length) return false;
  return true;
}

// ---- 学年ごとの設定（仕様書どおり） ----
const GRADES = {
  低学年: {
    pool: LOW, deckSize: 16, startDeck: null, hand: 5, swaps: Infinity, maxM: 2, adjOK: false, burst: false, shop: false,
    dealer: [ // [語数の分布, 成立率]
      { len: { 2: 1 }, ok: 0.8 }, { len: { 2: 1 }, ok: 0.8 }, { len: { 2: 1 }, ok: 0.8 }, { len: { 2: 0.7, 3: 0.3 }, ok: 0.8 }],
  },
  中学年: {
    pool: MID, deckSize: 20,
    startDeck: ['先生が', '子どもが', '友だちが', '私は', '犬が', 'ぞうが', '食べた', '見た', '話した', '歩いた', '走った', '読んだ',
      '教室で', '公園で', 'きのう', 'あさ', 'パンを', '本を', 'ゆっくり', '大きな声で'],
    hand: 7, swaps: 8, maxM: 2, adjOK: false, burst: false, shop: true,
    dealer: [
      { len: { 2: 0.5, 3: 0.5 }, ok: 0.5 }, { len: { 2: 0.5, 3: 0.5 }, ok: 0.5 }, { len: { 2: 0.5, 3: 0.5 }, ok: 0.65 },
      { len: { 2: 0.4, 3: 0.4, 4: 0.2 }, ok: 0.65 }],
  },
  高学年: {
    pool: HIGH, deckSize: 24,
    startDeck: ['先生が', '子どもが', '友だちが', '犬が', 'ねこが', '私は', '食べた', '歩いた', '話した', '見た', '作った', '読んだ',
      '放課後', '日曜日に', '図書館で', '公園で', 'ケーキを', '物語を', 'ていねいに', 'すこし', 'やさしい', '大きな', 'おいしい', '新しい'],
    hand: 8, swaps: 8, maxM: 3, adjOK: true, burst: true, shop: true,
    dealer: [
      { len: { 3: 0.5, 4: 0.5 }, ok: 0.25 }, { len: { 3: 0.5, 4: 0.5 }, ok: 0.25 }, { len: { 4: 0.5, 5: 0.5 }, ok: 0.5 },
      { len: { 5: 0.5, 6: 0.5 }, ok: 0.75 }],
  },
};

// ---- プレイヤーの上手さ：文が成立するかを正しく見分けられる確率 ----
const SKILLS = { 上手: 0.97, ふつう: 0.85, にがて: 0.7 };

// ---- 便利関数 ----
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickDist = d => { let x = rnd(), acc = 0; for (const [k, v] of Object.entries(d)) { acc += v; if (x <= acc) return +k; } return +Object.keys(d).pop(); };
let uid = 0; const copy = c => ({ ...c, id: uid++ });

// 手札から作れる文を全部挙げる（名詞をくわしくする語は高学年だけ）
function candidates(hand, g) {
  const S = hand.filter(c => c.r === 'S'), P = hand.filter(c => c.r === 'P'), M = hand.filter(c => c.r === 'M'), N = hand.filter(c => c.r === 'N');
  const sets = [[]];
  for (let a = 0; a < M.length; a++) { sets.push([M[a]]); for (let b = a + 1; b < M.length; b++) { sets.push([M[a], M[b]]); if (g.maxM >= 3) for (let c = b + 1; c < M.length; c++) sets.push([M[a], M[b], M[c]]); } }
  const out = [];
  for (const s of S) for (const p of P) for (const ms of sets) {
    if (ms.length > g.maxM) continue;
    const base = { s, ms, p, adj: new Map() };
    out.push(base);
    if (g.adjOK && N.length && judge(base)) {
      // 名詞をくわしくする語：1枚だけ重ねた形と、重ねられるだけ重ねた形（貪欲）を候補にする
      const nouns = [s, ...ms].filter(c => c.nt);
      for (const no of nouns) for (const a of N) out.push({ s, ms, p, adj: new Map([[no, a]]) });
      const adj = new Map(), used = new Set();
      for (const no of nouns) for (const a of N) { if (used.has(a) || adj.has(no)) continue; adj.set(no, a); if (judge({ s, ms, p, adj })) used.add(a); else adj.delete(no); }
      if (adj.size > 1) out.push({ s, ms, p, adj });
    }
  }
  return out;
}
const lenOf = st => 2 + st.ms.length + st.adj.size;
const scoreOf = (st, ok, g) => ok ? lenOf(st) * 2 : (g.burst ? 0 : lenOf(st));

// プレイヤーの選び方：「成立すると思った文」の中で、いちばん点が高そうなもの
// 見分けをまちがえる確率は文が長いほど上がる（1語ふえるごとに）
function choose(hand, g, acc) {
  const cs = candidates(hand, g);
  let best = null, bv = -1;
  for (const st of cs) {
    const ok = judge(st);
    const a = Math.pow(acc, lenOf(st) - 1);
    const believe = rnd() < a ? ok : !ok;
    const v = believe ? lenOf(st) * 2 : -1; // 成立しないと思った文は出さない
    if (v > bv || (v === bv && rnd() < 0.3)) { bv = v; best = st; }
  }
  // どれにも自信がないときは、2語の文をとりあえず出す（子どもは何か出す）
  if (bv < 0) { const two = cs.filter(c => lenOf(c) === 2); best = two.length ? two[Math.floor(rnd() * two.length)] : cs[0] || null; }
  return best;
}
function canMake(hand) { const S = hand.filter(c => c.r === 'S'), P = hand.filter(c => c.r === 'P'); return S.some(s => P.some(p => p.subj.includes(s.tag))); }

// ---- 1プレイ ----
function playRun(g, acc) {
  const pool = g.pool.map(copy);
  let deck;
  if (g.startDeck) deck = g.startDeck.map(w => { const c = pool.find(x => x.w === w); if (!c) throw new Error('no card ' + w); return c; });
  else deck = shuffle(pool.slice()).slice(0, g.deckSize);
  const shopPool = pool.filter(c => !deck.includes(c));
  let swaps = g.swaps;
  const st = { rounds: 0, tieWins: 0, tieLoss: 0, draws: 0, lossesByDealer: [0, 0, 0, 0], roundsByDealer: [0, 0, 0, 0], lens: [], score: 0, swapsUsed: 0, invalidPlays: 0 };
  for (let d = 0; d < 4; d++) {
    let cleared = false, tries = 0;
    while (!cleared && tries < 30) {
      tries++;
      // 試合開始：山札をシャッフルして配る
      let pile = shuffle(deck.slice()), disc = [], hand = [];
      const draw = () => { while (hand.length < g.hand) { if (!pile.length) { if (!disc.length) break; pile = shuffle(disc); disc = []; } hand.push(pile.pop()); } };
      const ensure = () => { let k = 0; while (!canMake(hand) && k < 20) { disc.push(...hand); hand = []; draw(); k++; } };
      draw(); ensure();
      let win = 0, lose = 0;
      let guard = 0;
      while (win < 2 && lose < 2 && guard++ < 60) {
        st.rounds++; st.roundsByDealer[d]++;
        let pick = choose(hand, g, acc);
        // 入れ替え：3語未満しか作れなさそうなら、使わないカードを入れ替える（低学年は1ラウンド3回まで）
        let k = 0;
        while (pick && lenOf(pick) < 3 && swaps > 0 && k < (g.swaps === Infinity ? 3 : 1)) {
          const keep = new Set([pick.s, pick.p, ...pick.ms, ...pick.adj.values()]);
          const out = hand.filter(c => !keep.has(c)); if (!out.length) break;
          hand = hand.filter(c => keep.has(c)); disc.push(...out); draw(); ensure();
          swaps--; st.swapsUsed++; k++;
          pick = choose(hand, g, acc);
        }
        if (!pick) { disc.push(...hand); hand = []; draw(); ensure(); continue; }
        const ok = judge(pick); if (!ok) st.invalidPlays++;
        const my = scoreOf(pick, ok, g); st.lens.push(lenOf(pick));
        const dd = g.dealer[d], dl = pickDist(dd.len), dok = rnd() < dd.ok;
        const dp = dok ? dl * 2 : (g.burst ? 0 : dl);
        if (my > dp) win++;
        else if (my < dp) lose++;
        else if (ok && !dok) { win++; st.tieWins++; }
        else if (!ok && dok) { lose++; st.tieLoss++; }
        else st.draws++;
        // 使ったカードを捨てて補充
        const used = new Set([pick.s, pick.p, ...pick.ms, ...pick.adj.values()]);
        hand = hand.filter(c => !used.has(c)); disc.push(...used); draw(); ensure();
      }
      if (win === 2) { cleared = true; st.score += lose === 0 ? (tries === 1 ? 30 : 10) : (tries === 1 ? 20 : 10); }
      else st.lossesByDealer[d]++;
    }
    if (!cleared) return { ...st, cleared: false };
    // ショップ（中・高学年、ディーラー1〜3のあと）：入れ替えが2回以下なら+3、そうでなければカードパック
    if (g.shop && d < 3) {
      if (swaps <= 2) swaps += 3;
      else {
        const offer = shuffle(shopPool.slice()).slice(0, 8);
        // 述語と、述語と合いやすい修飾語・名詞をくわしくする語を最大2枚えらぶ
        const want = offer.filter(c => c.r === 'P' || c.r === 'N' || (c.r === 'M' && ['とき', 'ばしょ', 'ようす'].includes(c.kind))).slice(0, 2);
        for (const c of want) { deck.push(c); shopPool.splice(shopPool.indexOf(c), 1); }
      }
    }
  }
  return { ...st, cleared: true };
}

const rankOf = s => s >= 120 ? 'S' : s >= 100 ? 'A' : s >= 80 ? 'B' : s >= 60 ? 'C' : 'D';

// ---- 実行 ----
const N = 300;
const rows = [];
for (const [gname, g] of Object.entries(GRADES).filter(([k]) => !process.argv[2] || k === process.argv[2])) {
  for (const [sname, acc] of Object.entries(SKILLS)) {
    let clear = 0, rounds = 0, tieW = 0, tieL = 0, draws = 0, inval = 0, plays = 0, swapsUsed = 0;
    const loss = [0, 0, 0, 0], rbd = [0, 0, 0, 0], ranks = { S: 0, A: 0, B: 0, C: 0, D: 0 }, lens = {};
    for (let i = 0; i < N; i++) {
      const r = playRun(g, acc);
      if (r.cleared) { clear++; ranks[rankOf(r.score)]++; }
      rounds += r.rounds; tieW += r.tieWins; tieL += r.tieLoss; draws += r.draws; inval += r.invalidPlays; plays += r.lens.length; swapsUsed += r.swapsUsed;
      r.lossesByDealer.forEach((v, k) => loss[k] += v); r.roundsByDealer.forEach((v, k) => rbd[k] += v);
      r.lens.forEach(l => lens[l] = (lens[l] || 0) + 1);
    }
    const pct = x => (x / N * 100).toFixed(0) + '%';
    const lenStr = Object.keys(lens).sort().map(k => `${k}語${(lens[k] / plays * 100).toFixed(0)}%`).join(' ');
    rows.push({
      学年: gname, 上手さ: sname, クリア率: pct(clear), 平均ラウンド: (rounds / N).toFixed(1),
      ディーラー別の負け回数: loss.map(v => (v / N).toFixed(2)).join(' / '),
      ランク: Object.entries(ranks).map(([k, v]) => `${k}${v}`).join(' '),
      出した文: lenStr, へんな文の割合: (inval / plays * 100).toFixed(0) + '%',
      同点ルール: `勝ち${(tieW / N).toFixed(1)} 負け${(tieL / N).toFixed(1)} 引分${(draws / N).toFixed(1)}`,
      入れ替え: (swapsUsed / N).toFixed(1),
    });
  }
}
console.log(JSON.stringify(rows, null, 1));
