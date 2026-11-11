#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""usd2nvr.py — NVIDIA SimReady OpenUSD 资产 → 单文件 HTML 可内联的紧凑 NVR。

为什么不直接用 usd2toon.py --js：那份输出是逐三角 9 个浮点的文本数组，
约 160 字节/三角，一个 2 万面的咖啡杯就是 3 MB，而 build.js 会把资产
内联进**每一个**预设产物，撑爆预算。

这里复用 usd2toon.convert() 拿逐三角几何，再做**带颜色的顶点聚类减面**，
最后按 obj2toon.py 的 int16 量化格式导出，约 25 字节/三角。

用法：
  python tools/usd2nvr.py asset.usd --var KFC_CUP --tris 900 --out nv_assets/kfc_assets.js
  python tools/usd2nvr.py asset.usd --var KFC_BENCH --tris 1200 --append --out 同一个文件
  # 灰模染成场景色（r,g,b 为 0~1 乘算系数）
  python tools/usd2nvr.py asset.usd --var X --tint 0.95,0.95,0.98 --out x.js
"""
import argparse
import array
import base64
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from usd2toon import convert  # noqa: E402


def _cluster(verts, tris, cols, cell):
    """体素聚类：同格顶点取均值，退化/重复三角形丢弃，颜色也按格平均。"""
    inv = 1.0 / cell
    bucket, keys = {}, []

    def keyof(v):
        return (int(math.floor(v[0] * inv)),
                int(math.floor(v[1] * inv)),
                int(math.floor(v[2] * inv)))

    for i, v in enumerate(verts):
        k = keyof(v)
        c = cols[i]
        s = bucket.get(k)
        if s is None:
            bucket[k] = [v[0], v[1], v[2], c[0], c[1], c[2], 1]
            keys.append(k)
        else:
            s[0] += v[0]; s[1] += v[1]; s[2] += v[2]
            s[3] += c[0]; s[4] += c[1]; s[5] += c[2]
            s[6] += 1

    order = {k: i for i, k in enumerate(keys)}
    newv, newc = [], []
    for k in keys:
        s = bucket[k]
        n = s[6]
        newv.append((s[0] / n, s[1] / n, s[2] / n))
        newc.append((s[3] / n, s[4] / n, s[5] / n))

    remap = [order[keyof(v)] for v in verts]
    seen, newt, newtc = set(), [], []
    for a, b, c in tris:
        ia, ib, ic = remap[a], remap[b], remap[c]
        if ia == ib or ib == ic or ia == ic:
            continue
        k = tuple(sorted((ia, ib, ic)))
        if k in seen:
            continue
        seen.add(k)
        newt.append((ia, ib, ic))
        ca, cb, cc = newc[ia], newc[ib], newc[ic]
        newtc.append(((ca[0] + cb[0] + cc[0]) / 3.0,
                      (ca[1] + cb[1] + cc[1]) / 3.0,
                      (ca[2] + cb[2] + cc[2]) / 3.0))
    return newv, newt, newtc


def decimate(verts, tris, cols, target):
    """二分体素尺寸，逼近目标三角数。cell 越大合并越狠、面越少。"""
    best = None
    lo, hi = 1e-5, 0.35
    for _ in range(26):
        cell = (lo + hi) / 2.0
        nv, nt, nc = _cluster(verts, tris, cols, cell)
        if len(nt) > target:
            lo = cell
        else:
            hi = cell
            best = (nv, nt, nc, cell)
        if hi - lo < 1e-7:
            break
    if best is None:
        nv, nt, nc = _cluster(verts, tris, cols, hi)
        best = (nv, nt, nc, hi)
    return best


def apply_bands(verts, tris, spec):
    """SimReady 的 geometries.usd 通常不带材质，转出来是一整块灰模。
    按三角形重心的相对高度分段染色，让它融进场景的品牌配色。
    spec 形如 "0.30:#4a5058,0.55:#b8bec2,1.0:#e2e5e6"。
    """
    stages = []
    for item in spec.split(','):
        h, hx = item.split(':')
        hx = hx.lstrip('#')
        stages.append((float(h), (int(hx[0:2], 16) / 255.0,
                                  int(hx[2:4], 16) / 255.0,
                                  int(hx[4:6], 16) / 255.0)))
    ys = [v[1] for v in verts]
    mn, mx = min(ys), max(ys)
    span = (mx - mn) or 1e-6
    out = []
    for a, b, c in tris:
        u = ((verts[a][1] + verts[b][1] + verts[c][1]) / 3.0 - mn) / span
        col = stages[-1][1]
        for h, cc in stages:
            if u <= h:
                col = cc
                break
        out.append(col)
    return out


def to_nvr(verts, tris, tcols, var, quant=16):
    """obj2toon.py 的 window.NVR 格式：int16 量化位置 + 每三角一个调色板索引。"""
    pal, pidx, idx = [], {}, []
    for c in tcols:
        k = tuple(min(255, max(0, int(round(v * 255.0 / quant) * quant))) for v in c)
        if k not in pidx:
            pidx[k] = len(pal)
            pal.append(list(k))
        idx.append(pidx[k])

    mn = [min(v[i] for v in verts) for i in range(3)]
    mx = [max(v[i] for v in verts) for i in range(3)]
    ext = [mx[i] - mn[i] or 1e-6 for i in range(3)]

    pos = array.array('h')
    for a, b, c in tris:
        for vi in (a, b, c):
            v = verts[vi]
            for i in range(3):
                q = int(round((v[i] - mn[i]) / ext[i] * 65534.0)) - 32767
                pos.append(max(-32768, min(32767, q)))
    cidx = array.array('B', idx)

    body = {
        'n': len(tris),
        'bb': [round((mn[i] + mx[i]) / 2, 4) for i in range(3)] +
              [round(ext[i], 4) for i in range(3)],
        'px': base64.b64encode(pos.tobytes()).decode(),
        'c': base64.b64encode(cidx.tobytes()).decode(),
        'pal': pal,
    }
    return 'window.%s=%s;\n' % (var, json.dumps(body, separators=(',', ':')))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input', help='SimReady geometries.usd / .usda')
    ap.add_argument('--var', default='KFC_ASSET', help='输出 JS 的全局变量名')
    ap.add_argument('--tris', type=int, default=900, help='目标三角数')
    ap.add_argument('--out', required=True)
    ap.add_argument('--append', action='store_true', help='追加到已有 JS（多资产合并成一个文件）')
    ap.add_argument('--tint', default='', help='r,g,b 乘算系数，如 0.95,0.95,0.98')
    ap.add_argument('--bands', default='', help='按高度分段染色，如 "0.3:#444,0.6:#bbb,1.0:#eee"')
    ap.add_argument('--up', action='store_true',
                    help='资产在 USD 里是躺倒的（如 grasp 版咖啡杯）：绕 x 轴立起来')
    a = ap.parse_args()

    data = convert(a.input)
    pos, col = data['pos'], data['col']
    verts, tris, cols = [], [], []
    for t in range(len(pos) // 9):
        base = t * 3
        for k in range(3):
            verts.append((pos[t * 9 + k * 3], pos[t * 9 + k * 3 + 1], pos[t * 9 + k * 3 + 2]))
            cols.append((col[t * 9 + k * 3], col[t * 9 + k * 3 + 1], col[t * 9 + k * 3 + 2]))
        tris.append((base, base + 1, base + 2))

    if a.up:
        # (x, y, z) → (x, z, -y)：原本沿 z 的长度变成高度
        verts = [(v[0], v[2], -v[1]) for v in verts]

    if a.tint:
        q = [float(x) for x in a.tint.split(',')]
        cols = [(c[0] * q[0], c[1] * q[1], c[2] * q[2]) for c in cols]

    name = os.path.basename(os.path.dirname(os.path.dirname(a.input)))
    print('%s  原始 %d 三角' % (name, len(tris)))
    nv, nt, nc, cell = decimate(verts, tris, cols, a.tris)
    print('       减面 → %d 三角  cell=%.5f m' % (len(nt), cell))
    if a.bands:
        nc = apply_bands(nv, nt, a.bands)
        print('       分段染色 %d 色' % len(set(nc)))
    js = to_nvr(nv, nt, nc, a.var)
    with open(a.out, 'a' if a.append else 'w', encoding='utf-8') as f:
        f.write(js)
    print('       %s %d bytes → %s  (window.%s)' %
          ('追加' if a.append else '写入', len(js), a.out, a.var))


if __name__ == '__main__':
    main()
