"""
本番用：game/ を「1つのHTMLファイル」にまとめる（three.js・フォント・画像・音をすべて埋め込む）。
勤務校の i-フィルター下や、ファイルをダブルクリックで開く使い方でも動くようにするため。

使い方:
  python tools/build.py           → dist/kotoba-poker.html（音は game/ のまま。大きい）
  python tools/build.py --canva   → dist/kotoba-poker-canva.html（Canvaのホームページで配る版。10MB以内）
（先に python tools/make_fonts.py でフォントを作っておく）

Canva版の音（10MB に収めて、しかも ガビガビにしないための工夫）
  - 形式を mp3 から Opus（同じ大きさでも音がきれい）に。Edge・Android の Chrome で再生できる
  - BGM は曲の頭から LOOP 秒を切り出し、終わりと頭を XF 秒かけて重ねて つなぎ目のないループにする
  - 学校のチャイム（26秒）は 8秒に短くする
"""
import base64, json, pathlib, re, subprocess, sys, tempfile, wave
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = ROOT / "game"
MIME = {".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".mp3": "audio/mpeg"}
LOOP, XF, BGM_KBPS, SE_KBPS = 60, 3, 48, 40   # Canva版：ループの長さ・つなぎの長さ(秒)・音質(kbps)
SR = 48000


def data_uri(p, mime=None):
    return f"data:{mime or MIME[p.suffix]};base64," + base64.b64encode(p.read_bytes()).decode()


def ff(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *map(str, args)], check=True)


def loop_bgm(src, out, tmp):
    """頭から LOOP+XF 秒を読み、さいごの XF 秒を 頭に重ねて（クロスフェード）、LOOP 秒のループにする"""
    wav = tmp / (src.stem + ".wav")
    ff("-i", src, "-t", LOOP + XF, "-ac", 2, "-ar", SR, wav)
    with wave.open(str(wav)) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float32)
    n, x = LOOP * SR, XF * SR
    if len(a) >= n + x:
        head, tail = a[:x], a[n:n + x]
        t = np.linspace(0, 1, x, dtype=np.float32)[:, None]
        a = a[:n].copy(); a[:x] = head * np.sqrt(t) + tail * np.sqrt(1 - t)   # 同じ大きさに聞こえる重ね方
    out_wav = tmp / (src.stem + "_loop.wav")
    with wave.open(str(out_wav), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(np.clip(a, -32768, 32767).astype(np.int16).tobytes())
    ff("-i", out_wav, "-c:a", "libopus", "-b:a", f"{BGM_KBPS}k", "-vbr", "on", out)


def canva_sounds(tmp):
    """Canva版の音：key は game/ と同じ名前（assets/sound/xxx.mp3）のまま、中身を Opus にする"""
    out = {}
    for p in sorted((GAME / "assets" / "sound").glob("*.mp3")):
        o = tmp / (p.stem + ".ogg")
        if p.stem.startswith("bgm_"): loop_bgm(p, o, tmp)
        elif p.stem == "se_chime": ff("-i", p, "-t", 8, "-af", "afade=t=out:st=6:d=2", "-c:a", "libopus", "-b:a", f"{SE_KBPS}k", o)
        else: ff("-i", p, "-c:a", "libopus", "-b:a", f"{SE_KBPS}k", o)
        out["assets/sound/" + p.name] = data_uri(o, "audio/ogg")
    return out


def main():
    canva = "--canva" in sys.argv
    html = (GAME / "index.html").read_text(encoding="utf-8")
    css = (GAME / "css" / "style.css").read_text(encoding="utf-8")
    css = re.sub(r"url\(\.\./fonts/([\w.]+)\)", lambda m: f"url({data_uri(GAME / 'fonts' / m.group(1))})", css)
    html = html.replace('<link rel="stylesheet" href="css/style.css">', f"<style>\n{css}\n</style>")
    assets = {str(p.relative_to(GAME)).replace("\\", "/"): data_uri(p)
              for p in sorted((GAME / "assets").rglob("*")) if p.suffix in MIME and not (canva and p.suffix == ".mp3")}
    if canva:
        with tempfile.TemporaryDirectory() as t:
            assets.update(canva_sounds(pathlib.Path(t)))
    first = True
    def inline(m):
        nonlocal first
        js = (GAME / m.group(1)).read_text(encoding="utf-8").replace("</script", "<\\/script")
        pre = ""
        if first:
            pre = "<script>window.KP_ASSETS=" + json.dumps(assets) + ";</script>\n"; first = False
        return pre + "<script>\n" + js + "\n</script>"
    html = re.sub(r'<script src="([\w/.\-]+)"></script>', inline, html)
    out = ROOT / "dist" / ("kotoba-poker-canva.html" if canva else "kotoba-poker.html")
    out.parent.mkdir(exist_ok=True); out.write_text(html, encoding="utf-8")
    print(out, round(out.stat().st_size / 1e6, 2), "MB")

if __name__ == "__main__":
    main()
