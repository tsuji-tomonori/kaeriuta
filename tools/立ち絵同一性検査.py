#!/usr/bin/env python3
"""立ち絵差分の同一人物性を、Pillow だけで機械的に確認する。"""
import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw

MASTERS = {"sogen": "smile", "uno": "normal"}
LIMITS = {"iou": .82, "hair": 42, "clothes": 46, "skin": 26, "head": .10, "shoulder": .09}
# 同一人物として成立している原本ペアの顔帯 MAD（RGB の絶対差平均）の最小値。
# makabe normal/stern=13.29, uno normal/shadow=16.14, saeki normal/pale=20.63。
# 最も小さい makabe の 13.29 を表情の下限に採る。完全複製を必ず落とすため IoU も上限を持つ。
EXPRESSION_LIMITS = {"iou_max": .9995, "face_mad_min": 13.29}
# 腕・俯きで帯域／肩線が動くことを確認済みの、意図的な例外。
EXCEPTIONS = {
    ("fujino", "sad"): "俯きと腕の位置で肌帯・肩幅が変わる（衣装・髪型は一致）。",
    ("shiori", "uneasy"): "腕の位置で肩幅が変わる（髪型・服・顔は一致）。",
    # resolve は腕組みによる肩線の差だけを許容する。髪・服・肌・頭幅・IoU・
    # 表情差のいずれかも外れた場合は例外にしない。
    ("shiori", "resolve"): "腕組みによる肩幅差のみを許容（他の全指標が合格時に限る）。",
}

def bbox(im):
    box = im.getchannel("A").getbbox()
    if not box: raise ValueError("透明画です")
    return box

def visible_width(im, rel_y):
    x0, y0, x1, y1 = bbox(im); y = min(y1 - 1, max(y0, y0 + round((y1-y0)*rel_y)))
    xs = [x for x in range(x0, x1) if im.getpixel((x,y))[3] > 8]
    return (max(xs)-min(xs)+1) if xs else 0

def mean_band(im, y0, y1, x0=0., x1=1.):
    l,t,r,b = bbox(im); xx0=l+round((r-l)*x0); xx1=l+round((r-l)*x1)
    yy0=t+round((b-t)*y0); yy1=t+round((b-t)*y1)
    values=[]
    for y in range(yy0, max(yy0+1, yy1)):
        for x in range(xx0, max(xx0+1, xx1)):
            p=im.getpixel((x,y))
            if p[3] > 8: values.append(p[:3])
    return tuple(sum(v[i] for v in values)/len(values) for i in range(3)) if values else (0.,0.,0.)

def distance(a,b): return math.sqrt(sum((x-y)**2 for x,y in zip(a,b)))
def face_mad(a,b):
    """顔帯（bbox 上端10〜22%、中央35〜65%）の平均絶対 RGB 差。"""
    al,at,ar,ab=bbox(a); bl,bt,br,bb=bbox(b); total=count=0
    for iy in range(120):
        for ix in range(180):
            ax=al+round((ar-al)*(.35+ix/179*.30)); ay=at+round((ab-at)*(.10+iy/119*.12))
            bx=bl+round((br-bl)*(.35+ix/179*.30)); by=bt+round((bb-bt)*(.10+iy/119*.12))
            ap=a.getpixel((min(ar-1,ax),min(ab-1,ay))); bp=b.getpixel((min(br-1,bx),min(bb-1,by)))
            if ap[3]>8 and bp[3]>8:
                total += sum(abs(ap[i]-bp[i]) for i in range(3)); count += 3
    return total/count if count else 0
def iou(a,b):
    # 同じ700x1200キャンバス前提、4 px 間隔でアルファ形状を比較する。
    both=either=0
    for y in range(0, min(a.height,b.height), 4):
        for x in range(0, min(a.width,b.width), 4):
            av=a.getpixel((x,y))[3]>8; bv=b.getpixel((x,y))[3]>8
            both += av and bv; either += av or bv
    return both/either if either else 0

def measure(master, variant):
    return {
      "iou": iou(master,variant),
      "hair": distance(mean_band(master,.02,.10), mean_band(variant,.02,.10)),
      "clothes": distance(mean_band(master,.55,.80,.25,.75), mean_band(variant,.55,.80,.25,.75)),
      "skin": distance(mean_band(master,.11,.17,.40,.60), mean_band(variant,.11,.17,.40,.60)),
      "head": abs(visible_width(master,.07)/bbox(master)[2]-visible_width(variant,.07)/bbox(variant)[2]),
      "shoulder": abs(visible_width(master,.30)/bbox(master)[2]-visible_width(variant,.30)/bbox(variant)[2]),
      "face_mad": face_mad(master,variant),
    }

def parse(path):
    bits=path.stem.removeprefix("chara_").split("_")
    return bits[0], "_".join(bits[1:])

def sheet(groups, out, old_dir):
    out.mkdir(parents=True, exist_ok=True)
    for char, paths in groups.items():
        paths=sorted(paths, key=lambda p: (parse(p)[1] != MASTERS.get(char,"normal"), p.name))
        # 対象6点は必ず master / 改修前 / 改修後の顔を同一倍率で横並びにする。
        entries=[]
        for p in paths:
            expr=parse(p)[1]
            if (old_dir/p.name).exists() and expr != MASTERS.get(char,"normal"):
                entries += [("master", next(q for q in paths if parse(q)[1]==MASTERS.get(char,"normal"))), ("before",old_dir/p.name), ("after",p)]
            else: entries.append((expr,p))
        canvas=Image.new("RGB", (420*len(entries),520), (38,38,38)); d=ImageDraw.Draw(canvas)
        for n,(label,p) in enumerate(entries):
            im=Image.open(p).convert("RGBA"); bg=Image.new("RGBA",im.size,(112,112,112,255)); bg.alpha_composite(im)
            l,t,r,b=bbox(im); crop=bg.crop((l+round((r-l)*.20),t,l+round((r-l)*.80),t+round((b-t)*.20))).resize((420,480),Image.Resampling.LANCZOS)
            canvas.paste(crop.convert("RGB"),(420*n,0)); d.text((420*n+12,492),label,fill="white")
        canvas.save(out/f"立ち絵_{char}.png")

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("directory",nargs="?",type=Path,default=Path("assets/chara"))
    ap.add_argument("--contact-sheet",action="store_true",help="--out 配下に人物ごとの横並びPNGを出力")
    ap.add_argument("--out",type=Path,default=Path("/tmp/kaeriuta-contact-sheets"))
    ap.add_argument("--before",type=Path,default=Path("assets/chara/_改修前"))
    args=ap.parse_args(); groups={}
    for p in sorted(args.directory.glob("chara_*.png")): groups.setdefault(parse(p)[0],[]).append(p)
    failures=0
    for char, paths in sorted(groups.items()):
        master_id=MASTERS.get(char,"normal"); master_path=next((p for p in paths if parse(p)[1]==master_id),None)
        if not master_path: print(f"{char}: マスター {master_id} がないため未検査"); continue
        master=Image.open(master_path).convert("RGBA")
        for p in paths:
            _, expr=parse(p)
            if p==master_path: continue
            m=measure(master,Image.open(p).convert("RGBA")); bad=[]
            for key, value in m.items():
                if key == "face_mad": continue
                if (key=="iou" and value<LIMITS[key]) or (key!="iou" and value>LIMITS[key]): bad.append(key)
            if (char,expr) in {("makabe","uneasy"),("detective","sleepy"),("shiori","resolve"),("sogen","speech"),("sogen","shadow"),("uno","kind")}:
                if m["iou"] > EXPRESSION_LIMITS["iou_max"]: bad.append("複製")
                if m["face_mad"] < EXPRESSION_LIMITS["face_mad_min"]: bad.append("表情差")
            exc=EXCEPTIONS.get((char,expr))
            if (char,expr) == ("shiori","resolve") and bad:
                allowed = [item for item in bad if item == "shoulder"]
                exc = exc if len(allowed) == len(bad) else None
            status="既知例外" if bad and exc else ("NG" if bad else "OK")
            failures += bool(bad and not exc)
            print(f"{char}/{expr}: {status} IoU={m['iou']:.3f} 髪={m['hair']:.1f} 服={m['clothes']:.1f} 肌={m['skin']:.1f} 頭={m['head']:.3f} 肩={m['shoulder']:.3f} 顔MAD={m['face_mad']:.2f}" + (f" / {exc}" if exc else ""))
    if args.contact_sheet: sheet(groups,args.out,args.before); print(f"コンタクトシート: {args.out}")
    if failures: raise SystemExit(f"不合格: {failures} 点")
if __name__=="__main__": main()
