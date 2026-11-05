#!/usr/bin/env python
"""从 NVIDIA/simready-foundation 拉取指定资产的 simready_usd 及其依赖层。

GitHub 的 raw 通道只返回 LFS 指针，真正的二进制在 media.githubusercontent.com，
这里直连该端点（实测可用）。只取几何/材质所需的层，跳过缩略图、mdl、源工程文件。
"""
import json
import os
import sys
import urllib.request
import urllib.error

OWNER = "NVIDIA/simready-foundation"
REF = "main"
MEDIA = "https://media.githubusercontent.com/media/%s/%s/" % (OWNER, REF)
TREE = os.path.join(os.path.dirname(__file__), "_tree.json")

SKIP_DIR = (".thumbs", "dcc_source", "source_assets", "materials/OmniPBR",
            "runnables", "runtime_tests", "isaacsim_usd", "cad", "urdf", "urdf_2",
            "mjcf", "simready_isaac_usd")
SKIP_EXT = (".mdl", ".png", ".hdr", ".jpg", ".mp4", ".blend", ".blend1", ".txt")


def load_tree():
    with open(TREE) as f:
        return [t["path"] for t in json.load(f)["tree"] if t["type"] == "blob"]


def fetch(rel, out_root):
    dst = os.path.join(out_root, rel)
    if os.path.exists(dst) and os.path.getsize(dst) > 200:
        return dst, os.path.getsize(dst), True
    url = MEDIA + rel.replace("\\", "/")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
    except urllib.error.HTTPError as e:
        return None, 0, False
    head = data[:8]
    if head.startswith(b"version https:"):
        return None, 0, False          # 仍是 LFS 指针
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(data)
    return dst, len(data), False


def main():
    if len(sys.argv) < 3:
        print("usage: dl_nv.py <asset_dir_prefix> <out_root> [prefix2 ...]")
        return
    out_root = sys.argv[2]
    prefixes = [sys.argv[1]] + sys.argv[3:]
    paths = load_tree()
    total = 0
    for pre in prefixes:
        picked = []
        for p in paths:
            if not p.startswith(pre):
                continue
            if any(s in p for s in SKIP_DIR):
                continue
            if p.lower().endswith(SKIP_EXT):
                continue
            picked.append(p)
        print("== %s  (%d files)" % (pre, len(picked)))
        for p in picked:
            dst, n, cached = fetch(p, out_root)
            flag = "cache" if cached else ("ok" if dst else "FAIL")
            print("   %-7s %8.1f KB  %s" % (flag, n / 1024.0, os.path.basename(p)))
            total += n
    print("total %.2f MB" % (total / 1048576.0))


if __name__ == "__main__":
    main()
