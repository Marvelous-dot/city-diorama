#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""obj2toon.py — 把 MuJoCo/URDF 风格的 OBJ 分件 + XML 骨架，转成三渲二可用的紧凑资产。

为什么不用 usd2toon：
  UR10 的 SimReady USD 几何层 13 MB、三角数 30 万+，直接内联会撑爆单文件 HTML。
  同一资产在 mjcf/ 下有一份按连杆切好的低模 OBJ + 完整运动学 XML，
  不仅轻，还能按关节角度摆姿势 —— 对一个「自动化产线」场景，摆好姿势比高模更重要。

用法：
    # 看统计（三角数、尺寸、各连杆权重）
    python tools/obj2toon.py ur10e.xml --stats

    # 摆姿势导出（6 个关节角，弧度）
    python tools/obj2toon.py ur10e.xml --js ur10.js --pose "-1.2,-1.9,1.7,-1.4,-1.57,0" --tris 5000

    # 换配色（模拟库卡橙 / 发那科黄）
    python tools/obj2toon.py ur10e.xml --js x.js --tint 0xd06a1e

输出格式（紧凑、可内联）：
    window.NVR = {n, bb:[cx,cy,cz,sx,sy,sz], px:"<b64 int16>", c:"<b64 u8>", pal:[[r,g,b],...]}
    位置按包围盒量化成 int16（精度 = 尺寸/65535），颜色是调色板索引。
    三角数 n → 文件里约 24 字节/三角。
"""

import argparse
import base64
import json
import math
import os
import sys
import xml.etree.ElementTree as ET


# ---------------------------------------------------------------- OBJ

def load_obj(path):
    """返回 (verts, tris)。只取 v / f，法线 UV 全部丢弃（三渲二用面法线重算）。"""
    vs = []
    fs = []
    with open(path, "r", errors="ignore") as f:
        for line in f:
            if not line:
                continue
            c = line[0]
            if c == "v" and line[1] == " ":
                p = line.split()
                if len(p) >= 4:
                    vs.append((float(p[1]), float(p[2]), float(p[3])))
            elif c == "f" and line[1] == " ":
                p = line.split()[1:]
                idx = []
                for tok in p:
                    s = tok.split("/")[0]
                    if not s:
                        continue
                    i = int(s)
                    idx.append(i - 1 if i > 0 else len(vs) + i)
                for k in range(1, len(idx) - 1):
                    fs.append((idx[0], idx[k], idx[k + 1]))
    return vs, fs


# ---------------------------------------------------------------- 四元数 / 矩阵

def q_to_mat(q):
    """MuJoCo quat = (w, x, y, z)。返回 3x3 行主序。"""
    w, x, y, z = q
    n = math.sqrt(w * w + x * x + y * y + z * z) or 1.0
    w, x, y, z = w / n, x / n, y / n, z / n
    return [
        [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
        [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
        [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
    ]


def axis_angle_mat(axis, ang):
    x, y, z = axis
    n = math.sqrt(x * x + y * y + z * z) or 1.0
    x, y, z = x / n, y / n, z / n
    c, s = math.cos(ang), math.sin(ang)
    C = 1 - c
    return [
        [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
        [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
        [z * x * C - y * s, z * y * C + x * s, c + z * z * C],
    ]


def mm(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def mv(A, v):
    return (A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2],
            A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2],
            A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2])


def parse_quat(s, default=(1, 0, 0, 0)):
    if not s:
        return default
    p = [float(x) for x in s.split()]
    return tuple(p) if len(p) == 4 else default


# ---------------------------------------------------------------- 骨架遍历

def walk_bodies(elem, parent_R, parent_t, qpos_map, out, meshdir, mat_of, joint_idx):
    """递归累乘世界变换；每个 body 记录（网格文件 → 世界矩阵）。"""
    for body in elem.findall("body"):
        pos = [float(x) for x in (body.get("pos") or "0 0 0").split()]
        R = mm(parent_R, q_to_mat(parse_quat(body.get("quat"))))
        t = (parent_t[0] + sum(parent_R[0][k] * pos[k] for k in range(3)),
             parent_t[1] + sum(parent_R[1][k] * pos[k] for k in range(3)),
             parent_t[2] + sum(parent_R[2][k] * pos[k] for k in range(3)))

        # 关节：本 body 的 joint 先作用在自身坐标
        for j in body.findall("joint"):
            name = j.get("name") or ""
            axis = [float(x) for x in (j.get("axis") or "0 1 0").split()]
            ang = qpos_map.get(name, 0.0)
            if abs(ang) > 1e-9:
                R = mm(R, axis_angle_mat(axis, ang))
            joint_idx.append(name)

        for g in body.findall("geom"):
            mname = g.get("mesh")
            if not mname:
                continue                                    # capsule 等碰撞体跳过
            f = os.path.join(meshdir, mname + ".obj")
            if not os.path.exists(f):
                continue
            out.append({
                "file": f,
                "R": R, "t": t,
                "color": mat_of.get(g.get("material") or "", (0.75, 0.75, 0.75)),
                "body": body.get("name") or "",
            })
        walk_bodies(body, R, t, qpos_map, out, meshdir, mat_of, joint_idx)


def read_xml(path):
    tree = ET.parse(path)
    root = tree.getroot()
    comp = root.find("compiler")
    meshdir = comp.get("meshdir") if comp is not None else "assets"
    mats = {}
    for m in root.iter("material"):
        rgba = m.get("rgba")
        if rgba:
            p = [float(x) for x in rgba.split()]
            mats[m.get("name")] = (p[0], p[1], p[2])
    return root, os.path.join(os.path.dirname(os.path.abspath(path)), meshdir), mats


# ---------------------------------------------------------------- 顶点聚类减面

def cluster(verts, tris, cell):
    """把一个三角汤按网格聚类到 cell 大小，返回新的 (verts, tris)。

    做法：每个顶点落到体素，用体素内均值代替；退化三角形（两个顶点同格）丢弃；
    再用排序键去重同位置三角形，避免叠加面导致描边发黑。
    """
    inv = 1.0 / cell
    bucket = {}
    reps = []
    vmap = [0] * len(verts)
    for i, v in enumerate(verts):
        key = (int(math.floor(v[0] * inv)), int(math.floor(v[1] * inv)), int(math.floor(v[2] * inv)))
        s = bucket.get(key)
        if s is None:
            bucket[key] = [v[0], v[1], v[2], 1]
            vmap[i] = len(reps)
            reps.append(key)
        else:
            s[0] += v[0]; s[1] += v[1]; s[2] += v[2]; s[3] += 1
            vmap[i] = vmap[i]
    # 第一次遍历时同格顶点还没分到同一 rep，这里重建映射
    order = {}
    reps2 = []
    for key in bucket:
        order[key] = len(reps2)
        reps2.append(key)
    newv = []
    for key, idx in order.items():
        s = bucket[key]
        newv.append((s[0] / s[3], s[1] / s[3], s[2] / s[3]))
    remap = [0] * len(verts)
    for i, v in enumerate(verts):
        key = (int(math.floor(v[0] * inv)), int(math.floor(v[1] * inv)), int(math.floor(v[2] * inv)))
        remap[i] = order[key]

    seen = set()
    newt = []
    for a, b, c in tris:
        ia, ib, ic = remap[a], remap[b], remap[c]
        if ia == ib or ib == ic or ia == ic:
            continue
        k = tuple(sorted((ia, ib, ic)))
        if k in seen:
            continue
        seen.add(k)
        newt.append((ia, ib, ic))
    return newv, newt


# ---------------------------------------------------------------- 组装 + 导出

def build(xml, pose, target_tris, tint):
    root, meshdir, mats = read_xml(xml)
    # 只取具名关节：<default> 段里的匿名 <joint> 会占位，导致角度全部错位
    names = [j.get("name") for j in root.iter("joint") if j.get("name")]
    qpos = {}
    if pose:
        vals = [float(x) for x in pose.split(",")]
        for i, n in enumerate(names[:len(vals)]):
            qpos[n] = vals[i]
    parts = []
    jidx = []
    walk_bodies(root.find("worldbody"), [[1, 0, 0], [0, 1, 0], [0, 0, 1]], (0, 0, 0),
                qpos, parts, meshdir, mats, jidx)

    # 合并所有件到统一坐标
    allv, allt, allc, part_id = [], [], [], []
    cache = {}
    for pi, p in enumerate(parts):
        vs, fs = cache.get(p["file"]) or load_obj(p["file"])
        cache[p["file"]] = (vs, fs)
        base = len(allv)
        R, t = p["R"], p["t"]
        for v in vs:
            r = mv(R, v)
            allv.append((r[0] + t[0], r[1] + t[1], r[2] + t[2]))
        for a, b, c in fs:
            allt.append((a + base, b + base, c + base))
            allc.append(p["color"])
            part_id.append(pi)

    # MuJoCo 是 Z-up，转 Y-up：x,y,z → x, z, -y
    allv = [(x, z, -y) for (x, y, z) in allv]

    raw = len(allt)
    if target_tris and raw > target_tris:
        allv, allt, allc = decimate_parts(allv, allt, allc, part_id, target_tris)

    if tint is not None:
        tr = ((tint >> 16) & 255) / 255.0
        tg = ((tint >> 8) & 255) / 255.0
        tb = (tint & 255) / 255.0
        ncol = []
        for c in allc:
            # 只替换彩色件（饱和度高的），黑色/灰色结构件保留
            mx, mn = max(c), min(c)
            if mx - mn > 0.08:
                ncol.append((tr, tg, tb))
            else:
                ncol.append(c)
        allc = ncol
    return allv, allt, allc, raw, jidx, root


def recluster_with_color(verts, tris, cols, cell):
    """聚类时同步保留每面的颜色（按面序号一一对应）。"""
    inv = 1.0 / cell
    order = {}
    rep = []
    remap = [0] * len(verts)
    for i, v in enumerate(verts):
        key = (int(math.floor(v[0] * inv)), int(math.floor(v[1] * inv)), int(math.floor(v[2] * inv)))
        j = order.get(key)
        if j is None:
            j = len(rep)
            order[key] = j
            rep.append([v[0], v[1], v[2], 1])
        else:
            rep[j][0] += v[0]; rep[j][1] += v[1]; rep[j][2] += v[2]; rep[j][3] += 1
        remap[i] = j
    nv = [(s[0] / s[3], s[1] / s[3], s[2] / s[3]) for s in rep]
    seen = set()
    nt, nc = [], []
    for t, (a, b, c) in zip(cols, tris):
        ia, ib, ic = remap[a], remap[b], remap[c]
        if ia == ib or ib == ic or ia == ic:
            continue
        k = tuple(sorted((ia, ib, ic)))
        if k in seen:
            continue
        seen.add(k)
        nt.append((ia, ib, ic))
        nc.append(t)
    return nv, nt, nc


def decimate_parts(verts, tris, cols, part_id, target):
    """按连杆分组做自适应粒度聚类。

    全局统一体素会把腕部这种小件糊成团（5 cm 的球只切到 4 格）。
    改为每件用「自身包围盒对角线 / K」当体素，二分 K 逼近总面数 ——
    大件该粗就粗，小件该细就细，比例才不失真。
    """
    groups = {}
    for i, p in enumerate(part_id):
        groups.setdefault(p, []).append(i)

    # 预切分：每件只保留自己用到的顶点，局部索引
    prep = []
    for p, tidx in groups.items():
        used = {}
        lv, lt, lc = [], [], []
        for i in tidx:
            a, b, c = tris[i]
            tri = []
            for vi in (a, b, c):
                j = used.get(vi)
                if j is None:
                    j = len(lv)
                    used[vi] = j
                    lv.append(verts[vi])
                tri.append(j)
            lt.append((tri[0], tri[1], tri[2]))
            lc.append(cols[i])
        if not lv:
            continue
        mn = [min(v[k] for v in lv) for k in range(3)]
        mx = [max(v[k] for v in lv) for k in range(3)]
        d = math.sqrt(sum((mx[k] - mn[k]) ** 2 for k in range(3)))
        prep.append((lv, lt, lc, d))

    def run(K):
        ov, ot, oc = [], [], []
        for lv, lt, lc, d in prep:
            cell = max(d / K, 1e-4)
            nv, nt, nc = recluster_with_color(lv, lt, lc, cell)
            if not nt:
                continue
            off = len(ov)
            ov.extend(nv)
            ot.extend([(a + off, b + off, c + off) for a, b, c in nt])
            oc.extend(nc)
        return ov, ot, oc

    lo, hi = 6.0, 240.0
    for _ in range(13):
        mid = (lo + hi) / 2
        _, nt, _ = run(mid)
        if len(nt) > target:
            hi = mid
        else:
            lo = mid
    return run(lo)


def export_js(verts, tris, cols, out_path, lin=0.0):
    pal = []
    pidx = {}
    idx = []
    for c in cols:
        k = (round(c[0], 3), round(c[1], 3), round(c[2], 3))
        j = pidx.get(k)
        if j is None:
            j = len(pal)
            pidx[k] = j
            if lin > 0:
                # three.js 把顶点色当「线性」值直接乘光强，而这里的颜色是按 sRGB 画的。
                # 不做 sRGB→线性 + 除以光照系数，颜色会被抬亮一大截（蓝变青白）。
                def s2l(x):
                    y = (x ** 2.2) / lin
                    return int(round(max(0.0, min(1.0, y)) * 255))
                pal.append([s2l(k[0]), s2l(k[1]), s2l(k[2])])
            else:
                pal.append([int(round(k[0] * 255)), int(round(k[1] * 255)), int(round(k[2] * 255))])
        idx.append(j)

    mn = [min(v[i] for v in verts) for i in range(3)]
    mx = [max(v[i] for v in verts) for i in range(3)]
    ext = [mx[i] - mn[i] or 1e-6 for i in range(3)]

    import array
    pos = array.array("h")
    for a, b, c in tris:
        for vi in (a, b, c):
            v = verts[vi]
            for i in range(3):
                q = int(round((v[i] - mn[i]) / ext[i] * 65534.0)) - 32767
                pos.append(max(-32768, min(32767, q)))
    col = array.array("B", idx)

    px = base64.b64encode(pos.tobytes()).decode()
    cc = base64.b64encode(col.tobytes()).decode()
    cx = [(mn[i] + mx[i]) / 2 for i in range(3)]
    body = {
        "n": len(tris),
        "bb": [round(cx[0], 4), round(cx[1], 4), round(cx[2], 4),
               round(ext[0], 4), round(ext[1], 4), round(ext[2], 4)],
        "px": px, "c": cc, "pal": pal,
    }
    js = "window.NVR=" + json.dumps(body, separators=(",", ":")) + ";\n"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(js)
    return len(js)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xml")
    ap.add_argument("--js")
    ap.add_argument("--pose", default="")
    ap.add_argument("--tris", type=int, default=5000)
    ap.add_argument("--tint", default=None)
    ap.add_argument("--lin", type=float, default=0.0,
                    help="按 sRGB 处理并按该光照系数反除，颜色才不会发白")
    ap.add_argument("--stats", action="store_true")
    a = ap.parse_args()

    tint = int(a.tint, 16) if a.tint else None
    verts, tris, cols, raw, jidx, root = build(a.xml, a.pose, a.tris, tint)

    if a.stats or not a.js:
        mn = [min(v[i] for v in verts) for i in range(3)]
        mx = [max(v[i] for v in verts) for i in range(3)]
        print("关节 :", ", ".join(dict.fromkeys([j for j in jidx if j])))
        print("原始三角 :", raw)
        print("减面后   :", len(tris), " (%d%%)" % (100 * len(tris) / max(1, raw)))
        print("尺寸 m   : %.3f × %.3f × %.3f" % tuple(mx[i] - mn[i] for i in range(3)))
        print("调色板   :", len({tuple(round(x, 3) for x in c) for c in cols}), "色")
    if a.js:
        n = export_js(verts, tris, cols, a.js, a.lin)
        print("导出 %s  %.1f KB  (%.1f 字节/三角)" % (a.js, n / 1024.0, n / max(1, len(tris))))


if __name__ == "__main__":
    main()
