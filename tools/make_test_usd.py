#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
make_test_usd.py — 造一份用于验证 usd2toon 的测试资产。

刻意用「厘米单位 + Z 轴朝上」，把单位换算与坐标轴转换都逼出来。
内容是一块托盘 + 4 个纸箱 + 1 个 16 边形圆柱，覆盖：
  - 纯四边形网格
  - N 边形（>4）扇形三角化
  - constant 与 faceVarying 两种 displayColor
"""

import sys

try:
    from pxr import Usd, UsdGeom, Gf, Sdf
except ImportError:
    sys.exit("缺少 usd-core")


def box(stage, path, cx, cy, cz, sx, sy, sz, color, interp="constant"):
    x0, x1 = cx - sx / 2.0, cx + sx / 2.0
    y0, y1 = cy - sy / 2.0, cy + sy / 2.0
    z0, z1 = cz - sz / 2.0, cz + sz / 2.0
    pts = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
           (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    idx = [0, 3, 2, 1,  4, 5, 6, 7,  0, 1, 5, 4,  1, 2, 6, 5,
           2, 3, 7, 6,  3, 0, 4, 7]   # 逆时针朝外，法线才不会内翻
    m = UsdGeom.Mesh.Define(stage, path)
    m.CreatePointsAttr([Gf.Vec3f(*p) for p in pts])
    m.CreateFaceVertexCountsAttr([4] * 6)
    m.CreateFaceVertexIndicesAttr(idx)
    m.CreateExtentAttr([Gf.Vec3f(x0, y0, z0), Gf.Vec3f(x1, y1, z1)])
    pv = UsdGeom.PrimvarsAPI(m).CreatePrimvar(
        "displayColor", Sdf.ValueTypeNames.Color3fArray,
        UsdGeom.Tokens.constant if interp == "constant" else UsdGeom.Tokens.faceVarying)
    cols = [Gf.Vec3f(*color)] * (6 if interp != "constant" else 1)
    pv.Set(cols)
    return m


def cyl(stage, path, cx, cy, cz, r, h, seg, color):
    import math
    pts, ring_b, ring_t = [], [], []
    for i in range(seg):                       # 先排完一圈底面，再排一圈顶面
        a = 2 * math.pi * i / seg
        pts.append(Gf.Vec3f(cx + r * math.cos(a), cy + r * math.sin(a), cz - h / 2))
    for i in range(seg):
        a = 2 * math.pi * i / seg
        pts.append(Gf.Vec3f(cx + r * math.cos(a), cy + r * math.sin(a), cz + h / 2))
    ring_b = list(range(seg))
    ring_t = [seg + i for i in range(seg)]
    counts = [seg, seg] + [4] * seg
    idx = list(reversed(ring_b)) + ring_t
    for i in range(seg):
        j = (i + 1) % seg
        idx += [ring_b[i], ring_b[j], ring_t[j], ring_t[i]]
    m = UsdGeom.Mesh.Define(stage, path)
    m.CreatePointsAttr(pts)
    m.CreateFaceVertexCountsAttr(counts)
    m.CreateFaceVertexIndicesAttr(idx)
    pv = UsdGeom.PrimvarsAPI(m).CreatePrimvar(
        "displayColor", Sdf.ValueTypeNames.Color3fArray, UsdGeom.Tokens.constant)
    pv.Set([Gf.Vec3f(*color)])


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "test_asset.usda"
    stage = Usd.Stage.CreateNew(out)
    UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.z)
    UsdGeom.SetStageMetersPerUnit(stage, 0.01)   # 厘米

    UsdGeom.Xform.Define(stage, "/Root")
    KRAFT = (0.76, 0.60, 0.39)
    KRAFT2 = (0.66, 0.51, 0.32)
    ORANGE = (0.81, 0.48, 0.18)

    # 托盘（cm）：95 × 72 × 11.5
    box(stage, "/Root/Pallet_Top", 0, 0, 10.4, 95, 72, 2.2, KRAFT)
    box(stage, "/Root/Pallet_Bot", 0, 0, 2.4, 95, 72, 2.2, KRAFT)
    for i, off in enumerate((-28, 0, 28)):
        box(stage, "/Root/Stringer_%d" % i, 0, off, 6.4, 95, 7.2, 5.8, KRAFT2)

    # 四个纸箱
    for i, (ox, oy) in enumerate(((-22, 18), (22, 18), (-22, -18), (22, -18))):
        box(stage, "/Root/Carton_%d" % i, ox, oy, 11.5 + 14, 42, 31, 28,
            KRAFT if i % 2 == 0 else KRAFT2, interp="faceVarying")

    # 圆柱（橙色立柱）
    cyl(stage, "/Root/Post", 0, 0, 11.5 + 28 + 45, 3.8, 90, 16, ORANGE)

    stage.Save()
    print("写出", out)


if __name__ == "__main__":
    main()
