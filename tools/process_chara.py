"""
立ち絵シート（1920x1080・5ポーズ横並び・透過PNG）から、
ゲーム用の立ち絵（全員同じキャンバス・足元そろえ・白い縁取り）を作るスクリプト。

使い方:
  pip install pillow numpy scipy
  python tools/process_chara.py assets/source/characters prototypes/classroom/chara

入力:  1.png 〜 12.png（キャラクター）、13.png（ロゴ）、shop_miseki.png（ショップ・白背景）
出力:  cXX_P.webp（XX=シート番号、P=ポーズ 0基本 1思考 2カードを出す 3嬉しい 4悔しい）
       shop_0.webp、logo.webp
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

W, H = 398, 655          # 立ち絵のキャンバス（全員共通）
OUTLINE = 4              # 白い縁取りの太さ(px)


def find_figures(a):
    """シートから人物5体の箱を返す（くっついた人物も列の密度の谷で分ける）"""
    al = a[:, :, 3] > 10
    lab, _ = ndimage.label(ndimage.binary_dilation(al, iterations=3))
    objs = ndimage.find_objects(lab)
    keep = [k + 1 for k, s in enumerate(objs) if (s[0].stop - s[0].start) > 300]  # 文字は除外
    m = np.isin(lab, keep) & al
    xs = np.where(m)[1]
    x0, x1 = xs.min(), xs.max() + 1
    col = m.sum(0)[x0:x1].astype(float)
    cuts = []
    for k in range(1, 5):
        c = int((x1 - x0) * k / 5)
        lo, hi = max(1, c - 60), min(len(col) - 1, c + 60)
        cuts.append(x0 + lo + int(np.argmin(col[lo:hi])))
    edges = [x0] + cuts + [x1]
    boxes = []
    for k in range(5):
        sub = m[:, edges[k]:edges[k + 1]]
        yy, xx = np.where(sub)
        boxes.append((edges[k] + xx.min(), yy.min(), edges[k] + xx.max() + 1, yy.max() + 1))
    return boxes, edges


def drop_small(a, ratio=0.02):
    """となりの文字の切れはしなど、小さなかたまりを消す"""
    al = a[:, :, 3] > 10
    lab, n = ndimage.label(ndimage.binary_dilation(al, iterations=2))
    if n > 1:
        sz = ndimage.sum(al, lab, range(1, n + 1))
        a[np.isin(lab, [j + 1 for j, s in enumerate(sz) if s < sz.max() * ratio])] = 0
    return a


def add_outline(im):
    """シルエットを白く塗り、少し広げて、絵の下に重ねる"""
    a = np.array(im)
    yy, xx = np.mgrid[-OUTLINE:OUTLINE + 1, -OUTLINE:OUTLINE + 1]
    sil = ndimage.binary_dilation(a[:, :, 3] > 40, structure=(xx ** 2 + yy ** 2) <= OUTLINE ** 2)
    base = np.zeros_like(a)
    base[sil] = [255, 255, 255, 255]
    out = Image.fromarray(base)
    out.alpha_composite(im)
    return out


def place(sub):
    """足元（下35%の中心）をキャンバスの中央にそろえて置く"""
    h = sub.shape[0]
    cx = np.where(sub[int(h * .65):, :, 3] > 10)[1].mean()
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    im = Image.fromarray(sub)
    c.paste(im, (int(W / 2 - cx), H - h - 6), im)
    return c


def main(src, dst):
    src, dst = Path(src), Path(dst)
    dst.mkdir(parents=True, exist_ok=True)
    for i in range(1, 13):
        a = np.array(Image.open(src / f"{i}.png").convert("RGBA"))
        boxes, edges = find_figures(a)
        for k, (x0, y0, x1, y1) in enumerate(boxes):
            sub = a[y0:y1, x0:x1].copy()
            sub[:, :max(0, edges[k] - x0)] = 0
            sub[:, max(0, edges[k + 1] - x0):] = 0
            add_outline(place(drop_small(sub))).save(dst / f"c{i:02d}_{k}.webp", "WEBP", quality=86, method=6)
        print("done", i)

    # ショップ（白背景の絵）：外枠から白を塗りつぶして背景を抜く。すそが開いているので絵の下端で切ってから
    s = np.array(Image.open(src / "shop_miseki.png").convert("RGBA"))
    dark = s[:, :, :3].min(2) < 120
    yb = np.where(dark[:, 700:1130].any(1))[0].max()
    crop = s[90:yb + 1, 700:1130].copy()
    white = crop[:, :, :3].astype(int).min(2) >= 240
    lab, _ = ndimage.label(white)
    edge = set(np.unique(np.concatenate([lab[0], lab[:, 0], lab[:, -1]]))) - {0}
    crop[np.isin(lab, list(edge)), 3] = 0
    im = Image.fromarray(crop)
    im = im.crop(im.getbbox())
    sc = min((H - 10) / im.height, (W - 20) / im.width)
    im = im.resize((int(im.width * sc), int(im.height * sc)), Image.LANCZOS)
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    c.paste(im, ((W - im.width) // 2, H - im.height), im)
    add_outline(c).save(dst / "shop_0.webp", "WEBP", quality=86, method=6)

    # ロゴ（左上の「ロゴ」という書きこみを除いた範囲）
    Image.open(src / "13.png").convert("RGBA").crop((210, 265, 1731, 796)).save(dst / "logo.webp", "WEBP", quality=90)
    print("all done")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
