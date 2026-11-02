// ふりがなチェック：ゲームの文字（js・html）に出てくる漢字に、すべて読みがあるかを調べる
// 使い方: node tools/check_yomi.js
const fs = require("fs"), path = require("path");
const G = path.join(__dirname, "..", "game");
global.KP = {};
new Function("window", fs.readFileSync(path.join(G, "js", "yomi.js"), "utf8"))({ KP: global.KP });
const KP = global.KP;
const miss = new Map();
const files = fs.readdirSync(path.join(G, "js")).filter(f => f.endsWith(".js") && f !== "yomi.js").map(f => path.join(G, "js", f)).concat(path.join(G, "index.html"));
for (const f of files) {
  // コメントをのぞいた文字列だけを見る
  const src = fs.readFileSync(f, "utf8").replace(/^\s*\/\/.*$/gm, "").replace(/\s\/\/ [^\n"`']*$/gm, "").replace(/<!--[\s\S]*?-->/g, "");
  const strs = f.endsWith(".html") ? src.split(/<[^>]+>/) : [...src.matchAll(/"((?:[^"\\\n]|\\.)*)"|`([^`]*)`/g)].map(m => m[1] || m[2] || "");
  for (const s of strs) {
    if (!/[一-鿿]/.test(s)) continue;
    KP.YOMI_MISS.clear(); KP.rbTokens(s.replace(/\$\{[^}]*\}/g, ""));
    for (const k of KP.YOMI_MISS) { if (!miss.has(k)) miss.set(k, []); if (miss.get(k).length < 2) miss.get(k).push(path.basename(f) + "：" + s.slice(0, 30)); }
  }
}
if (!miss.size) { console.log("ふりがな：すべての漢字に読みがあります"); process.exit(0); }
for (const [k, v] of miss) console.log(`読みがない「${k}」 ${v.join(" ／ ")}`);
process.exit(1);
