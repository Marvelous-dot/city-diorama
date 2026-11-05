#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
usd2toon.py — 把 OpenUSD 资产转成「三渲二管线」能直接吃的几何数据。

设计取向：不追求 PBR 还原，只保留 剪影 + 平色 + 法线，
因为下游是 MeshToonMaterial + 反向外壳描边，贴图会全部丢弃。

用法：
    # 只看资产信息（面数、包围盒、材质色、单位/朝向）
    python tools/usd2toon.py asset.usd --stats

    # 导出给 three.js 用的紧凑 JS（单文件 HTML 可直接内联）
    python tools/usd2toon.py asset.usd --js out.js [--scale 0.78] [--smooth]

    # 导出标准 GLB（想在别的引擎验证时用）
    python tools/usd2toon.py asset.usd --glb out.glb

依赖：pip install usd-core
"""

import argparse
import json
import math
import os
import struct
import sys

try:
    from pxr import Usd, UsdGeom, UsdShade, Gf
except ImportError:
    sys.exit("缺少 usd-core，先执行：python -m pip install usd-core")


# ---------------------------------------------------------------- 工具

def _lin(c):
    """USD 里 displayColor 一般已是线性值，这里只做钳制。"""
    return max(0.0, min(1.0, float(c)))


def _shader_color(mat, cache):
    """从 UsdShade 材质里掏一个能用的基色，掏不到返回 None。"""
    if not mat:
        return None
    try:
        src = mat.ComputeSurfaceSource()[0]
    except Exception:
        src = None
    if not src:
        return None
    for name in ("diffuseColor", "base_color", "baseColor"):
        inp = src.GetInput(name)
        if not inp:
            continue
        val = inp.Get()
        if val is None:
            continue
        try:
            if hasattr(val, "__len__") and not isinstance(val, str):
                return (_lin(val[0]), _lin(val[1]), _lin(val[2]))
            f = _lin(val)
            return (f, f, f)
        except Exception:
            pass
    return None


def _prim_colors(prim, mesh, n_points, n_faces, face_vert_ranges):
    """返回 (per_vertex_colors|None, per_face_colors|None)。"""
    pv = UsdGeom.PrimvarsAPI(prim).GetPrimvar("displayColor")
    if pv and pv.HasValue():
        vals = pv.ComputeFlattened()
        interp = pv.GetInterpolation()
        if vals:
            cols = [(_lin(c[0]), _lin(c[1]), _lin(c[2])) for c in vals]
            if interp == "constant" or len(cols) == 1:
                return None, [cols[0]] * n_faces
            if interp == "faceVarying" and len(cols) >= len(face_vert_ranges) * 3:
                return cols, None
            if len(cols) == n_points:
                return cols, None
            if len(cols) == n_faces:
                return None, cols
    # 退到材质
    binding = UsdShade.MaterialBindingAPI(prim).ComputeBoundMaterial()[0]
    c = _shader_color(binding, None) if binding else None
    if c:
        return None, [c] * n_faces
    return None, None


def _triangulate(counts, indices):
    """扇形三角化，返回 [(i0,i1,i2, face_idx), ...]。"""
    tris = []
    k = 0
    for fi, n in enumerate(counts):
        base = k
        for j in range(1, n - 1):
            tris.append((indices[base], indices[base + j], indices[base + j + 1], fi))
        k += n
    return tris


# ---------------------------------------------------------------- 主转换

def convert(path, scale=1.0, smooth=False):
    stage = Usd.Stage.Open(path)
    if not stage:
        raise RuntimeError("打不开 USD：%s" % path)

    up = UsdGeom.GetStageUpAxis(stage)
    mpu = UsdGeom.GetStageMetersPerUnit(stage) or 1.0
    xf = UsdGeom.XformCache(Usd.TimeCode.Default())

    pos, nrm, col = [], [], []
    mesh_count = 0
    tri_count = 0
    skipped = 0
    colors_seen = {}
    bmin = [1e9] * 3
    bmax = [-1e9] * 3

    for prim in stage.Traverse():
        if not prim.IsA(UsdGeom.Mesh):
            continue
        img = UsdGeom.Imageable(prim)
        if img and img.ComputeVisibility() == UsdGeom.Tokens.invisible:
            skipped += 1
            continue

        mesh = UsdGeom.Mesh(prim)
        pts = mesh.GetPointsAttr().Get()
        counts = mesh.GetFaceVertexCountsAttr().Get()
        idx = mesh.GetFaceVertexIndicesAttr().Get()
        if not pts or not counts or not idx:
            skipped += 1
            continue

        m = xf.GetLocalToWorldTransform(prim)
        wpts = [m.Transform(Gf.Vec3d(p[0], p[1], p[2])) for p in pts]

        # 世界里再按单位/朝向归一
        conv = []
        for p in wpts:
            x, y, z = p[0] * mpu, p[1] * mpu, p[2] * mpu
            if up == UsdGeom.Tokens.z:
                x, y, z = x, z, -y
            x *= scale
            y *= scale
            z *= scale
            conv.append((x, y, z))
            bmin[0] = min(bmin[0], x); bmin[1] = min(bmin[1], y); bmin[2] = min(bmin[2], z)
            bmax[0] = max(bmax[0], x); bmax[1] = max(bmax[1], y); bmax[2] = max(bmax[2], z)

        ranges = []
        k = 0
        for n in counts:
            ranges.append((k, k + n))
            k += n

        vcol, fcol = _prim_colors(prim, mesh, len(pts), len(counts), ranges)
        tris = _triangulate(counts, idx)
        mesh_count += 1
        tri_count += len(tris)

        for (a, b, c, fi) in tris:
            pa, pb, pc = conv[a], conv[b], conv[c]
            # 面法线（法线在 Y-up 之后重新算，避免 up 轴带来的符号错）
            ux, uy, uz = pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]
            vx, vy, vz = pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]
            nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
            ln = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
            nx, ny, nz = nx / ln, ny / ln, nz / ln

            if vcol:
                ca = vcol[a] if a < len(vcol) else (0.8, 0.8, 0.8)
                cb = vcol[b] if b < len(vcol) else ca
                cc = vcol[c] if c < len(vcol) else ca
            elif fcol:
                ca = cb = cc = fcol[fi]
            else:
                ca = cb = cc = (0.78, 0.78, 0.78)

            for p, cc2 in ((pa, ca), (pb, cb), (pc, cc)):
                pos.extend(p)
                nrm.extend((nx, ny, nz))
                col.extend(cc2)
            key = tuple(round(v * 8) for v in ca)
            colors_seen[key] = colors_seen.get(key, 0) + 1

    if tri_count == 0:
        raise RuntimeError("没找到任何有效网格（可能全是 Cube/Sphere 等隐式几何，或层级未展开）")

    if smooth:
        pass  # 预留：焊接顶点 + 平均法线；当前走平面法线，符合 toon 观感

    return {
        "pos": pos, "nrm": nrm, "col": col,
        "stats": {
            "meshes": mesh_count, "tris": tri_count, "skipped": skipped,
            "upAxis": str(up), "metersPerUnit": mpu, "scale": scale,
            "bboxMin": [round(v, 4) for v in bmin],
            "bboxMax": [round(v, 4) for v in bmax],
            "size": [round(bmax[i] - bmin[i], 4) for i in range(3)],
            "colors": [{"rgb": [k[0] / 8, k[1] / 8, k[2] / 8], "tris": v}
                       for k, v in sorted(colors_seen.items(), key=lambda kv: -kv[1])[:12]],
        },
    }


# ---------------------------------------------------------------- 输出

def _r(v, n=4):
    return round(v, n)


def write_js(data, out, name="MESH"):
    p, n, c = data["pos"], data["nrm"], data["col"]
    rows = []
    for i in range(0, len(p), 3):
        rows.append("[%s,%s,%s,%s,%s,%s,%s,%s,%s]" % (
            _r(p[i]), _r(p[i + 1]), _r(p[i + 2]),
            _r(n[i]), _r(n[i + 1]), _r(n[i + 2]),
            _r(c[i], 3), _r(c[i + 1], 3), _r(c[i + 2], 3)))
    with open(out, "w", encoding="utf-8") as f:
        f.write("// 由 tools/usd2toon.py 生成  tris=%d  bbox=%s\n" % (
            data["stats"]["tris"], data["stats"]["size"]))
        f.write("window.%s = {\n  stats: %s,\n  v: [\n" % (
            name, json.dumps(data["stats"], ensure_ascii=False)))
        f.write(",\n".join("  " + r for r in rows))
        f.write("\n  ]\n};\n")
    return os.path.getsize(out)


def write_glb(data, out):
    pos, nrm, col = data["pos"], data["nrm"], data["col"]
    nv = len(pos) // 3
    bin_pos = struct.pack("<%df" % len(pos), *pos)
    bin_nrm = struct.pack("<%df" % len(nrm), *nrm)
    bin_col = struct.pack("<%df" % len(col), *col)
    blob = bin_pos + bin_nrm + bin_col
    while len(blob) % 4:
        blob += b"\x00"

    off_p, off_n = 0, len(bin_pos)
    off_c = off_n + len(bin_nrm)

    gltf = {
        "asset": {"version": "2.0", "generator": "usd2toon.py"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "usd_asset"}],
        "meshes": [{"primitives": [{
            "attributes": {"POSITION": 0, "NORMAL": 1, "COLOR_0": 2},
            "material": 0, "mode": 4,
        }]}],
        "materials": [{
            "name": "toon",
            "pbrMetallicRoughness": {"baseColorFactor": [1, 1, 1, 1], "metallicFactor": 0.0, "roughnessFactor": 0.9},
            "doubleSided": True,
        }],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": nv, "type": "VEC3",
             "min": data["stats"]["bboxMin"], "max": data["stats"]["bboxMax"]},
            {"bufferView": 1, "componentType": 5126, "count": nv, "type": "VEC3"},
            {"bufferView": 2, "componentType": 5126, "count": nv, "type": "VEC3"},
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": off_p, "byteLength": len(bin_pos), "target": 34962},
            {"buffer": 0, "byteOffset": off_n, "byteLength": len(bin_nrm), "target": 34962},
            {"buffer": 0, "byteOffset": off_c, "byteLength": len(bin_col), "target": 34962},
        ],
        "buffers": [{"byteLength": len(blob)}],
    }
    js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    while len(js) % 4:
        js += b" "

    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(out, "wb") as f:
        f.write(b"glTF" + struct.pack("<II", 2, total))
        f.write(struct.pack("<I", len(js)) + b"JSON" + js)
        f.write(struct.pack("<I", len(blob)) + b"BIN\x00" + blob)
    return total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--js")
    ap.add_argument("--glb")
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--smooth", action="store_true")
    ap.add_argument("--stats", action="store_true")
    a = ap.parse_args()

    data = convert(a.input, scale=a.scale, smooth=a.smooth)
    s = data["stats"]

    if a.stats or (not a.js and not a.glb):
        print(json.dumps(s, ensure_ascii=False, indent=2))

    if a.js:
        size = write_js(data, a.js)
        print("JS  -> %s  (%.1f KB)" % (a.js, size / 1024.0))
    if a.glb:
        size = write_glb(data, a.glb)
        print("GLB -> %s  (%.1f KB)" % (a.glb, size / 1024.0))


if __name__ == "__main__":
    main()
