"""
11/3 追加の素材を作る（process_chara.py の続き）
  - 早乙女の「カードを出す」ポーズのさしかえ（c04_2_new.png → c04_2.webp）
  - 見瀬先のバトル用5ポーズ（mise_battle.png → mise_0〜4.webp。ひざ下が切れた絵なので下にそろえる）
  - 第1話の教室背景のさしかえ（bg_classroom_new.jpg → bg_classroom.jpg）
使い方: python tools/process_extra.py
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
import importlib.util

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "assets" / "source", ROOT / "game" / "assets"
spec = importlib.util.spec_from_file_location("pc", ROOT / "tools" / "process_chara.py"); pc = importlib.util.module_from_spec(spec); spec.loader.exec_module(pc)
W, H = pc.W, pc.H


def figures(a):
    """人物ごとのかたまり（文字は高さで除く）を左から順に返す"""
    al = a[:, :, 3] > 10
    lab, _ = ndimage.label(ndimage.binary_dilation(al, iterations=3))
    out = []
    for k, s in enumerate(ndimage.find_objects(lab)):
        if s[0].stop - s[0].start > 300:
            sub = a[s].copy(); sub[lab[s] != k + 1] = 0; out.append((s[1].start, sub))
    return [x[1] for x in sorted(out, key=lambda t: t[0])]


def fit_bottom(sub, scale):
    im = Image.fromarray(sub)
    im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    c.paste(im, ((W - im.width) // 2, H - im.height), im)
    return c


def main():
    # 早乙女：元のシートと同じ大きさなので、同じ置き方（足元そろえ）
    a = np.array(Image.open(SRC / "characters" / "c04_2_new.png").convert("RGBA"))
    sub = pc.drop_small(figures(a)[0])
    pc.add_outline(pc.place(sub)).save(OUT / "chara" / "c04_2.webp", "WEBP", quality=86, method=6)
    # 見瀬先：5ポーズを同じ倍率で（いちばん背の高い絵がキャンバスに入る倍率）
    a = np.array(Image.open(SRC / "characters" / "mise_battle.png").convert("RGBA"))
    figs = [pc.drop_small(f) for f in figures(a)]
    assert len(figs) == 5, len(figs)
    sc = min(min((H - 10) / f.shape[0], (W - 16) / f.shape[1]) for f in figs)
    for k, f in enumerate(figs):
        pc.add_outline(fit_bottom(f, sc)).save(OUT / "chara" / f"mise_{k}.webp", "WEBP", quality=86, method=6)
    # 教室の背景
    bg = Image.open(SRC / "bg_classroom_new.jpg").convert("RGB")
    bg.resize((1920, int(1920 * bg.height / bg.width)), Image.LANCZOS).save(OUT / "tex" / "bg_classroom.jpg", quality=84, optimize=True)
    print("done")


if __name__ == "__main__":
    main()
