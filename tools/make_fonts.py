"""
ゲームで使う文字だけを取り出した小さなフォント（woff2）を作る。
カードや台本の文字を変えたら、もう一度実行する。

使い方: python tools/make_fonts.py
元フォント: tools/fonts_src/（無ければ GitHub の google/fonts から取得）
  - Dela Gothic One（見出し・カード）  SIL Open Font License
  - Zen Maru Gothic Bold（本文）       SIL Open Font License
"""
import pathlib, subprocess, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "fonts_src"
OUT = ROOT / "game" / "fonts"
FONTS = {
    "dela": ("DelaGothicOne-Regular.ttf", "ofl/delagothicone/DelaGothicOne-Regular.ttf"),
    "maru": ("ZenMaruGothic-Bold.ttf", "ofl/zenmarugothic/ZenMaruGothic-Bold.ttf"),
}

def chars():
    s = set()
    for p in (ROOT / "game").rglob("*"):
        if p.suffix in (".js", ".html", ".css") and "vendor" not in p.parts:
            s |= set(p.read_text(encoding="utf-8"))
    s |= set(chr(c) for c in range(0x20, 0x7F))            # 英数字
    s |= set(chr(c) for c in range(0x3041, 0x3097))        # ひらがな
    s |= set(chr(c) for c in range(0x30A1, 0x30FB))        # カタカナ
    s |= set("ー「」『』（）、。！？・…―〜／：　０１２３４５６７８９")
    return "".join(sorted(c for c in s if c >= " "))

def main():
    SRC.mkdir(parents=True, exist_ok=True); OUT.mkdir(parents=True, exist_ok=True)
    text = chars()
    (SRC / "chars.txt").write_text(text, encoding="utf-8")
    for name, (file, url) in FONTS.items():
        src = SRC / file
        if not src.exists():
            urllib.request.urlretrieve("https://raw.githubusercontent.com/google/fonts/main/" + url, src)
        subprocess.run(["pyftsubset", str(src), f"--text-file={SRC / 'chars.txt'}", "--flavor=woff2",
                        f"--output-file={OUT / (name + '.woff2')}", "--layout-features=*"], check=True)
        print(name, (OUT / (name + ".woff2")).stat().st_size, "bytes")
    print(len(text), "文字")

if __name__ == "__main__":
    main()
