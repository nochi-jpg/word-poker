"""
本番用：game/ を「1つのHTMLファイル」にまとめる（three.js・フォント・画像をすべて埋め込む）。
勤務校の i-フィルター下や、ファイルをダブルクリックで開く使い方でも動くようにするため。

使い方: python tools/build.py   → dist/kotoba-poker.html
（先に python tools/make_fonts.py でフォントを作っておく）
"""
import base64, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = ROOT / "game"
MIME = {".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2"}

def data_uri(p):
    return f"data:{MIME[p.suffix]};base64," + base64.b64encode(p.read_bytes()).decode()

def main():
    html = (GAME / "index.html").read_text(encoding="utf-8")
    css = (GAME / "css" / "style.css").read_text(encoding="utf-8")
    css = re.sub(r"url\(\.\./fonts/([\w.]+)\)", lambda m: f"url({data_uri(GAME / 'fonts' / m.group(1))})", css)
    html = html.replace('<link rel="stylesheet" href="css/style.css">', f"<style>\n{css}\n</style>")
    assets = {str(p.relative_to(GAME)).replace("\\", "/"): data_uri(p)
              for p in sorted((GAME / "assets").rglob("*")) if p.suffix in MIME}
    first = True
    def inline(m):
        nonlocal first
        js = (GAME / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script")
        pre = ""
        if first:
            pre = "<script>window.KP_ASSETS=" + json.dumps(assets) + ";</script>\n"; first = False
        return pre + "<script>\n" + js + "\n</script>"
    html = re.sub(r'<script src="([\w/.\-]+)"></script>', inline, html)
    out = ROOT / "dist" / "kotoba-poker.html"
    out.parent.mkdir(exist_ok=True); out.write_text(html, encoding="utf-8")
    print(out, round(out.stat().st_size / 1e6, 2), "MB")

if __name__ == "__main__":
    main()
