/* 江南水乡 · 临水茶楼 微缩三维场景 */
(function () {
  'use strict';
  const T = THREE;
  const PS = window.PRESET || {};
  function cfg(a, b, d) { return a !== undefined ? a : (b !== undefined ? b : d); }

  /* ================= 渲染器 ================= */
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NoToneMapping;
  document.body.appendChild(renderer.domElement);

  const scene = new T.Scene();
  /* 夜景大气：让远处的塔沉进紫雾里，霓虹（fog:false）不受影响，
     一层雾就能把「楼群」和「远景天际线」分成两个深度层。 */
  if (PS.fog) {
    scene.fog = new T.Fog(new T.Color(PS.fog.color), PS.fog.near, PS.fog.far);
  }
  const camera = new T.PerspectiveCamera(33, window.innerWidth / window.innerHeight, 0.3, cfg(PS.camFar, 300));

  /* ================= 光 ================= */
  const LT = PS.light || {};
  const L_SUN = LT.sun || {};
  const L_FILL = LT.fill || {};
  const L_HEMI = LT.hemi || {};
  const L_AMB = LT.amb || {};
  const sun = new T.DirectionalLight(cfg(L_SUN.color, 0xfff1d0), cfg(L_SUN.i, 2.15));
  const sp0 = cfg(L_SUN.pos, [17.5, 16.5, 12.0]);
  sun.position.set(sp0[0], sp0[1], sp0[2]);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  /* 城市尺度要更大的正交阴影框，否则只有正中一小块有影子 */
  const SHD = cfg(PS.shadowSpan, 11);
  sc.left = -SHD; sc.right = SHD; sc.top = SHD; sc.bottom = -SHD;
  sc.near = 1; sc.far = cfg(PS.shadowFar, 70);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new T.DirectionalLight(cfg(L_FILL.color, 0x8fc0da), cfg(L_FILL.i, 0.62));
  const fp0 = cfg(L_FILL.pos, [-13, 9, -11]);
  fill.position.set(fp0[0], fp0[1], fp0[2]);
  scene.add(fill);

  const hemi = new T.HemisphereLight(cfg(L_HEMI.sky, 0xa9d2e4), cfg(L_HEMI.ground, 0xcfc3a0), cfg(L_HEMI.i, 0.78));
  scene.add(hemi);
  const amb = new T.AmbientLight(cfg(L_AMB.color, 0x8fb0bd), cfg(L_AMB.i, 0.22));
  scene.add(amb);

  /* ================= 三渲二 材质 ================= */
  const GRAD = (function () {
    const v = [0.40, 0.66, 0.85, 1.0];
    const d = new Uint8Array(v.length * 4);
    v.forEach(function (x, i) {
      const c = Math.round(x * 255);
      d[i * 4] = c; d[i * 4 + 1] = c; d[i * 4 + 2] = c; d[i * 4 + 3] = 255;
    });
    const t = new T.DataTexture(d, v.length, 1, T.RGBAFormat);
    t.minFilter = T.NearestFilter; t.magFilter = T.NearestFilter;
    t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  })();

  const PAL = Object.assign({
    wood: 0x9a6a42,
    woodDark: 0x6b452c,
    woodDeep: 0x412b1d,
    woodLight: 0xbb8f5f,
    woodPale: 0xd6b98a,
    woodWarm: 0x8a5a34,
    plaster: 0xeee5d2,
    plaster2: 0xe2d9c5,
    stone: 0x9c9c92,
    stoneD: 0x74766d,
    stoneL: 0xb2b0a3,
    tile: 0x53606a,
    tileD: 0x3c4852,
    tileL: 0x64727c,
    leaf1: 0x7b9a4f,
    leaf2: 0x5d7c3c,
    leaf3: 0x94ae5e,
    bark: 0x6d5741,
    bambooS: 0x93a862,
    celadon: 0x9fb8a6,
    brass: 0xb9964d,
    paper: 0xf2e7ca,
    ink: 0x33302b,
    red: 0xb14a34,
    clay: 0xa9755a,
    cat: 0xdcc7a8,
    catD: 0x8d7358,
    hull: 0x5a3d29,
    dark: 0x2c2724
  }, PS.palette || {});

  function scaleHex(hex, k) {
    const r = Math.min(255, Math.round(((hex >> 16) & 255) * k));
    const g = Math.min(255, Math.round(((hex >> 8) & 255) * k));
    const bb = Math.min(255, Math.round((hex & 255) * k));
    return (r << 16) | (g << 8) | bb;
  }
  const EMIS = cfg(PS.emis, 1);
  const EMIT = {};
  (function () {
    const raw = Object.assign({
      int1: { c: 0x845934, e: 0x160a04 },
      int2: { c: 0x8f6640, e: 0x140b04 },
      int3: { c: 0xdccfae, e: 0x201810 },
      int4: { c: 0x503320, e: 0x0c0602 }
    }, PS.emit || {});
    Object.keys(raw).forEach(function (k) {
      EMIT[k] = { c: raw[k].c, e: scaleHex(raw[k].e, EMIS) };
    });
  })();
  const MATS = {};
  function mat(k) {
    /* 天桥玻璃：只有它需要真透明，其余全部走不透明 + 加色片 */
    if (k === 'ctGlassB') {
      if (!MATS[k]) MATS[k] = new T.MeshToonMaterial({
        color: PAL.ctGlassB, gradientMap: GRAD, transparent: true, opacity: 0.46,
        side: T.DoubleSide, depthWrite: false
      });
      return MATS[k];
    }
    if (EMIT[k]) {
      if (!MATS[k]) MATS[k] = new T.MeshToonMaterial({ color: EMIT[k].c, emissive: EMIT[k].e, gradientMap: GRAD });
      return MATS[k];
    }
    if (!MATS[k]) {
      MATS[k] = new T.MeshToonMaterial({
        color: PAL[k] !== undefined ? PAL[k] : 0xff00ff,
        gradientMap: GRAD,
        side: (k === 'hull' || k === 'cloth' || k === 'leaf1') ? T.DoubleSide : T.FrontSide
      });
    }
    return MATS[k];
  }

  /* 描边：反向外壳 */
  const OUTLINE = new T.ShaderMaterial({
    uniforms: { uColor: { value: new T.Color(0x2a2420) }, uT: { value: 0.0017 } },
    vertexShader: 'uniform float uT;\n' +
      'void main(){\n' +
      '  vec4 mv = modelViewMatrix * vec4(position,1.0);\n' +
      '  vec3 n = normalize(normalMatrix * normal);\n' +
      '  mv.xyz += n * (uT * -mv.z);\n' +
      '  gl_Position = projectionMatrix * mv;\n' +
      '}',
    fragmentShader: 'uniform vec3 uColor;\nvoid main(){ gl_FragColor = vec4(uColor,1.0); }',
    side: T.BackSide
  });

  /* 外部资产接入：把 tools/usd2toon.py 转出来的几何挂进场景。
     data 形如 { v:[[px,py,pz, nx,ny,nz, r,g,b], ...] }（逐三角顶点，平色）。
     材质走顶点色 + 同一套色阶，描边直接复用 OUTLINE，保证与手建部件同质感。 */
  function addUSD(parent, data, x, y, z, s, ry) {
    if (!data || !data.v || !data.v.length) return null;
    const n = data.v.length;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = data.v[i];
      pos[i * 3] = v[0]; pos[i * 3 + 1] = v[1]; pos[i * 3 + 2] = v[2];
      nor[i * 3] = v[3]; nor[i * 3 + 1] = v[4]; nor[i * 3 + 2] = v[5];
      col[i * 3] = v[6]; col[i * 3 + 1] = v[7]; col[i * 3 + 2] = v[8];
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.BufferAttribute(nor, 3));
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.computeBoundingSphere();

    const grp = new T.Group();
    grp.position.set(x || 0, y || 0, z || 0);
    if (ry) grp.rotation.y = ry;
    if (s && s !== 1) grp.scale.setScalar(s);
    grp.add(new T.Mesh(g, new T.MeshToonMaterial({ vertexColors: true, gradientMap: GRAD })));
    grp.add(new T.Mesh(g, OUTLINE));
    parent.add(grp);
    return grp;
  }

  /* 外部资产接入（紧凑量化格式）：tools/obj2toon.py 转出的 window.NVR。
     位置按包围盒量化成 int16、颜色走调色板索引，约 25 字节/三角；
     这里解回来并复算面法线，材质与描边跟手建部件完全一致。 */
  function addNV(parent, A, x, y, z, s, ry) {
    if (!A || !A.n) return null;
    function b64(s) {
      const bin = atob(s), n = bin.length, u = new Uint8Array(n);
      for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
      return u;
    }
    const n = A.n, bb = A.bb;
    const pi = new Int16Array(b64(A.px).buffer);
    const ci = b64(A.c);
    const pos = new Float32Array(n * 9), nor = new Float32Array(n * 9), col = new Float32Array(n * 9);
    const mnx = bb[0] - bb[3] / 2, mny = bb[1] - bb[4] / 2, mnz = bb[2] - bb[5] / 2;
    const v = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let t = 0; t < n; t++) {
      for (let k = 0; k < 3; k++) {
        const o = (t * 3 + k) * 3;
        v[k * 3] = mnx + (pi[o] + 32767) / 65534 * bb[3];
        v[k * 3 + 1] = mny + (pi[o + 1] + 32767) / 65534 * bb[4];
        v[k * 3 + 2] = mnz + (pi[o + 2] + 32767) / 65534 * bb[5];
      }
      const ux = v[3] - v[0], uy = v[4] - v[1], uz = v[5] - v[2];
      const wx = v[6] - v[0], wy = v[7] - v[1], wz = v[8] - v[2];
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      const ln = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= ln; ny /= ln; nz /= ln;
      const p = A.pal[ci[t]] || [200, 200, 200];
      const r = p[0] / 255, g2 = p[1] / 255, b2 = p[2] / 255;
      for (let q = 0; q < 3; q++) {
        const o2 = t * 9 + q * 3;
        pos[o2] = v[q * 3]; pos[o2 + 1] = v[q * 3 + 1]; pos[o2 + 2] = v[q * 3 + 2];
        nor[o2] = nx; nor[o2 + 1] = ny; nor[o2 + 2] = nz;
        col[o2] = r; col[o2 + 1] = g2; col[o2 + 2] = b2;
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.computeBoundingSphere();

    const grp = new T.Group();
    grp.position.set(x || 0, y || 0, z || 0);
    if (ry) grp.rotation.y = ry;
    if (s && s !== 1) grp.scale.setScalar(s);
    grp.add(new T.Mesh(geo, new T.MeshToonMaterial({ vertexColors: true, gradientMap: GRAD })));
    grp.add(new T.Mesh(geo, OUTLINE));
    parent.add(grp);
    return grp;
  }

  /* ================= 几何合并 ================= */
  function mergeGeos(list) {
    const gs = [];
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      const ng = g.index ? g.toNonIndexed() : g;
      gs.push(ng);
      n += ng.attributes.position.count;
    }
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    const uvs = new Float32Array(n * 2);
    let o = 0;
    for (let i = 0; i < gs.length; i++) {
      const g = gs[i];
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      if (g.attributes.uv) uvs.set(g.attributes.uv.array, o * 2);
      o += g.attributes.position.count;
      if (g.attributes.position.array !== pos && g !== list[i]) g.dispose();
    }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(pos, 3));
    out.setAttribute('normal', new T.BufferAttribute(nor, 3));
    out.setAttribute('uv', new T.BufferAttribute(uvs, 2));
    out.computeBoundingSphere();
    return out;
  }

  const _up = new T.Vector3(0, 1, 0);

  function Builder() { this.parts = new Map(); }
  Builder.prototype.add = function (k, g) {
    let a = this.parts.get(k);
    if (!a) { a = []; this.parts.set(k, a); }
    a.push(g);
    return this;
  };
  Builder.prototype.xf = function (g, x, y, z, rx, ry, rz) {
    if (rx || ry || rz) {
      const m = new T.Matrix4().makeRotationFromEuler(new T.Euler(rx, ry, rz));
      m.setPosition(x, y, z);
      g.applyMatrix4(m);
    } else {
      g.translate(x, y, z);
    }
    return g;
  };
  Builder.prototype.box = function (k, w, h, d, x, y, z, rx, ry, rz) {
    return this.add(k, this.xf(new T.BoxGeometry(w, h, d), x, y, z, rx || 0, ry || 0, rz || 0));
  };
  Builder.prototype.cyl = function (k, rt, rb, h, seg, x, y, z, rx, ry, rz) {
    return this.add(k, this.xf(new T.CylinderGeometry(rt, rb, h, seg || 10), x, y, z, rx || 0, ry || 0, rz || 0));
  };
  Builder.prototype.sph = function (k, r, x, y, z, sx, sy, sz) {
    const g = new T.SphereGeometry(r, 12, 9);
    g.scale(sx || 1, sy || 1, sz || 1);
    g.translate(x, y, z);
    return this.add(k, g);
  };
  Builder.prototype.to = function (k, r, x0, y0, z0, x1, y1, z1, seg) {
    const dir = new T.Vector3(x1 - x0, y1 - y0, z1 - z0);
    const len = dir.length();
    if (len < 0.0001) return this;
    const g = new T.CylinderGeometry(r, r * 1.12, len, seg || 6);
    const q = new T.Quaternion().setFromUnitVectors(_up, dir.clone().normalize());
    const m = new T.Matrix4().makeRotationFromQuaternion(q);
    m.setPosition((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    g.applyMatrix4(m);
    return this.add(k, g);
  };
  Builder.prototype.torus = function (k, r, tube, x, y, z, rx, ry, rz) {
    const g = new T.TorusGeometry(r, tube, 6, 18);
    return this.add(k, this.xf(g, x, y, z, rx || 0, ry || 0, rz || 0));
  };
  Builder.prototype.build = function (parent, opt) {
    opt = opt || {};
    const skipO = opt.noOutline || [];
    this.parts.forEach(function (list, k) {
      const geo = mergeGeos(list);
      const mesh = new T.Mesh(geo, mat(k));
      mesh.castShadow = opt.cast !== false;
      mesh.receiveShadow = opt.receive !== false;
      if (skipO.indexOf(k) < 0) mesh.add(new T.Mesh(geo, OUTLINE));
      parent.add(mesh);
    });
    this.parts.clear();
    return parent;
  };

/* ==========================================================================
   积木小人：统一人物工厂（第 18 轮改版）
   旧版是「球头 + 锥台 + 分段圆柱四肢」的拟真路线 —— 做不像就只剩丑。
   现在改成刻意几何化的玩具人，棱角是风格而不是缺陷：
     voxel —— 全轴对齐方块 + 像素方点眼 + 古风幞头/发髻，国风体素积木
     lego  —— 圆柱头 + 头顶圆形凸粒 + 圆柱马蹄手，乐高 minifig
   所有部件只绕 Y 整体旋转、局部绝不倾斜：这样每个块面都干净，
   同材质合批后反向外壳只描一圈外轮廓，内部接缝不会露黑线。
   风格由 preset 的 figStyle 决定，也可用 window.FIG_STYLE 运行时覆盖。
   ========================================================================== */
function figStyleGlobal() {
  return (typeof window !== 'undefined' && window.FIG_STYLE) || PS.figStyle || 'voxel';
}

/* o: { b, x, y, z, ry, s, pose:'stand'|'sit'|'walk', style, mono, face,
        coat, pants, skin, hair, ink, belt, shoe, apron, hatKey, apronKey,
        hat:'none'|'fang'|'bun'|'cap', armFront, bag, bagKey } */
function buildFig(o) {
  const b = o.b, x = o.x || 0, y = o.y || 0, z = o.z || 0;
  const ry = o.ry || 0, s = o.s || 1;
  const sit = o.pose === 'sit', walk = o.pose === 'walk';
  const lego = (o.style || figStyleGlobal()) === 'lego';
  const mono = !!o.mono;
  const hat = o.hat || 'none';

  const coat = o.coat;
  const pants = mono ? coat : (o.pants || coat);
  const skin = mono ? coat : (o.skin || coat);
  const hair = mono ? coat : (o.hair || coat);
  const ink = mono ? coat : (o.ink || hair);
  const belt = mono ? coat : (o.belt || pants);
  const shoe = mono ? coat : (o.shoe || pants);
  const apronK = o.apronKey || skin;
  const hatK = o.hatKey || hair;

  const c = Math.cos(ry), sn = Math.sin(ry);
  function V(lx, ly, lz) {
    return [x + (lx * c + lz * sn) * s, y + ly * s, z + (-lx * sn + lz * c) * s];
  }
  function B(k, w, h, d, lx, ly, lz) {
    const p = V(lx, ly, lz);
    b.box(k, w * s, h * s, d * s, p[0], p[1], p[2], 0, ry, 0);
  }
  function CY(k, r, h, lx, ly, lz, seg) {
    const p = V(lx, ly, lz);
    b.cyl(k, r * s, r * s, h * s, seg || 12, p[0], p[1], p[2]);
  }
  /* 站 / 坐两套 y 常量。总高 1.70 米，和旧版人物持平，
     这样桌椅、门窗、楼板全都不用重新校准。 */
  const DY = sit ? -0.34 : 0;
  const torsoY = 0.99 + DY, armY = 0.98 + DY, handY = 0.73 + DY;
  const beltY = 0.755 + DY, headY = 1.42 + DY;

  /* ---- 腿与鞋：坐姿大腿水平前伸、小腿垂直下落；走姿前后错开 ---- */
  if (sit) {
    [-1, 1].forEach(function (sg) {
      B(pants, 0.16, 0.17, 0.42, sg * 0.105, 0.44, 0.20);
      B(pants, 0.16, 0.34, 0.18, sg * 0.105, 0.23, 0.40);
      B(shoe, 0.18, 0.11, 0.27, sg * 0.105, 0.055, 0.46);
    });
  } else {
    const sw = walk ? 0.085 : 0;
    [-1, 1].forEach(function (sg) {
      const f = sg < 0 ? sw : -sw;
      B(pants, 0.16, 0.42, 0.19, sg * 0.105, 0.52, f);
      B(shoe, 0.18, 0.11, 0.27, sg * 0.105, 0.055, f + 0.05);
    });
  }

  /* ---- 躯干：窄身 + 一道宽肩线 + 两条「留真缝」的手臂。
         手臂贴着躯干时，同色合批后反向外壳并成一整块方柱，剪影只剩一根棍；
         留出 5cm 真空隙，两臂各自描一圈边，积木人的三竖块才读得出来。
         领口与腰带用对比色横条，衣服层次不靠面数靠色块。 ---- */
  if (!mono) {
    B(belt, 0.44, 0.10, 0.28, 0, beltY - 0.01, 0);
    B(belt, 0.44, 0.05, 0.27, 0, torsoY + 0.215, 0);
  }
  B(coat, 0.40, 0.46, 0.26, 0, torsoY, 0);
  B(coat, 0.56, 0.09, 0.26, 0, torsoY + 0.16, 0);

  /* ---- 手臂：体素手是方块，乐高手是 C 形马蹄的圆柱近似 ---- */
  const az = sit ? 0.17 : (o.armFront ? 0.13 : 0);
  [-1, 1].forEach(function (sg) {
    const f = walk ? (sg < 0 ? 0.10 : -0.10) : az;
    const ax = sg * 0.30;
    B(coat, 0.10, 0.34, 0.15, ax, armY - 0.02, f * 0.55);
    if (lego) CY(skin, 0.062, 0.11, ax, handY, f, 8);
    else B(skin, 0.125, 0.13, 0.16, ax, handY - 0.01, f);
  });

  /* ---- 头：体素是立方体，乐高是圆柱 + 头顶那颗签名凸粒 ---- */
  if (lego) {
    CY(skin, 0.185, 0.34, 0, headY, 0, 16);
    CY(hair, 0.190, 0.085, 0, headY + 0.205, 0, 14);
    if (hat === 'none') CY(hair, 0.058, 0.045, 0, headY + 0.270, 0, 12);
  } else {
    B(skin, 0.38, 0.36, 0.36, 0, headY, 0);
    B(hair, 0.40, 0.095, 0.38, 0, headY + 0.215, -0.01);
  }

  /* ---- 头饰：古风幞头 / 发髻 / 店小二头巾 ---- */
  if (hat === 'fang') {
    B(hatK, 0.44, 0.14, 0.42, 0, headY + 0.245, -0.015);
    B(hatK, 0.17, 0.05, 0.085, -0.285, headY + 0.245, -0.02);
    B(hatK, 0.17, 0.05, 0.085, 0.285, headY + 0.245, -0.02);
  } else if (hat === 'bun') {
    B(hatK, 0.17, 0.15, 0.17, 0, headY + 0.260, -0.025);
    B(belt, 0.27, 0.032, 0.032, 0, headY + 0.280, -0.025);
  } else if (hat === 'cap') {
    B(hatK, 0.39, 0.10, 0.37, 0, headY + 0.225, -0.01);
    B(hatK, 0.41, 0.030, 0.12, 0, headY + 0.175, 0.155);
  }

  /* ---- 像素五官：两个方点眼 + 一条横线嘴，比球眼球嘴干净得多。
         圆柱头的脸是弧面，眼要按 x 处半径内收，否则会悬空。 ---- */
  if (!mono && o.face !== false) {
    const ez = lego ? 0.180 : 0.196;
    const ex = lego ? 0.072 : 0.088;
    B(ink, lego ? 0.048 : 0.058, 0.060, 0.022, -ex, headY + 0.012, ez);
    B(ink, lego ? 0.048 : 0.058, 0.060, 0.022, ex, headY + 0.012, ez);
    B(ink, 0.075, 0.018, 0.020, 0, headY - 0.078, lego ? 0.187 : 0.196);
  }

  /* ---- 身份物：围裙 / 手提袋 ---- */
  if (o.apron && !mono) {
    B(apronK, 0.30, 0.34, 0.03, 0, torsoY - 0.02, 0.145);
    B(apronK, 0.10, 0.05, 0.03, 0, torsoY + 0.16, 0.145);
  }
  if (o.bag && !mono) B(o.bagKey || belt, 0.17, 0.21, 0.09, 0.34, 0.62, 0.02);
}

  /* ================= 画布纹理 ================= */
  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    draw(x, w, h);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  const TEX = {};
  TEX.smoke = canvasTex(128, 128, function (c, w, h) {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.32)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  TEX.light = canvasTex(256, 256, function (c, w, h) {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    const cols = 5, rows = 4, p = 7;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = i * w / cols + p, y = j * h / rows + p;
        const ww = w / cols - p * 2, hh = h / rows - p * 2;
        const g = c.createLinearGradient(x, y, x + ww, y + hh);
        g.addColorStop(0, 'rgba(255,236,178,1)');
        g.addColorStop(1, 'rgba(255,198,120,0.55)');
        c.fillStyle = g;
        c.fillRect(x, y, ww, hh);
      }
    }
  });
  TEX.plaque = canvasTex(512, 152, function (c, w, h) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#5b3a24'); g.addColorStop(0.5, '#452a18'); g.addColorStop(1, '#38200f');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#c8a24e'; c.lineWidth = 5;
    c.strokeRect(9, 9, w - 18, h - 18);
    c.fillStyle = PS.plaqueColor || '#e6c67c';
    const ptext = cfg(PS.plaque, '听雨茶楼');
    const pfs = ptext.length > 4 ? Math.floor(430 / ptext.length) : 92;
    c.font = '600 ' + pfs + 'px KaiTi, STKaiti, SimSun, serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(ptext, w / 2, h / 2 + 4);
  });
  TEX.banner = canvasTex(192, 640, function (c, w, h) {
    const bg = PS.bannerBg || '#2d4f78';
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 12; i++) c.fillRect(0, i * h / 12, w, 3);
    c.strokeStyle = 'rgba(255,250,240,0.72)'; c.lineWidth = 4; c.strokeRect(14, 14, w - 28, h - 28);
    c.fillStyle = PS.bannerColor || '#f2ece0';
    c.font = '600 128px KaiTi, STKaiti, SimSun, serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const bp = PS.banner || {};
    c.fillText(cfg(bp.main, '茶'), w / 2, 118);
    const rest = cfg(bp.rest, ['聽', '雨', '歇', '腳']);
    c.font = '600 64px KaiTi, STKaiti, SimSun, serif';
    for (let i = 0; i < rest.length; i++) c.fillText(rest[i], w / 2, 268 + i * 80);
  });
  TEX.calico = canvasTex(192, 288, function (c, w, h) {
    c.fillStyle = PS.calicoBg || '#2f5480'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(240,240,232,0.92)';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 6; j++) {
        const x = 24 + i * 48, y = 24 + j * 48;
        c.beginPath();
        for (let k = 0; k < 4; k++) {
          const a = k * Math.PI / 2;
          c.moveTo(x, y);
          c.arc(x + Math.cos(a) * 11, y + Math.sin(a) * 11, 7, 0, Math.PI * 2);
        }
        c.fill();
        c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.fill();
      }
    }
  });
  TEX.paint = canvasTex(216, 400, function (c, w, h) {
    c.fillStyle = '#f2e8cf'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(60,55,48,0.18)'; c.lineWidth = 2;
    c.strokeRect(12, 12, w - 24, h - 24);
    c.fillStyle = 'rgba(150,120,80,0.10)';
    c.beginPath(); c.arc(w * 0.72, h * 0.2, 26, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(45,45,42,0.55)'; c.lineWidth = 3;
    c.beginPath();
    c.moveTo(20, h * 0.62);
    c.bezierCurveTo(w * 0.22, h * 0.44, w * 0.34, h * 0.66, w * 0.5, h * 0.5);
    c.bezierCurveTo(w * 0.64, h * 0.38, w * 0.76, h * 0.56, w * 0.94, h * 0.46);
    c.stroke();
    c.strokeStyle = 'rgba(45,45,42,0.30)'; c.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(w * 0.18 + i * 5, h * (0.68 + i * 0.05));
      c.bezierCurveTo(w * 0.38, h * (0.6 + i * 0.05), w * 0.6, h * (0.72 + i * 0.04), w * 0.86, h * (0.62 + i * 0.05));
      c.stroke();
    }
    c.fillStyle = 'rgba(45,45,42,0.6)';
    c.font = '46px KaiTi, serif';
    const pw = cfg(PS.paint, '雨窗');
    for (let i = 0; i < pw.length && i < 2; i++) c.fillText(pw[i], 30, 86 + i * 54);
  });

  /* ================= 底座 ================= */
  const BASE = 17, HB = 8.5;
  const RIV_X0 = 4.2, RIV_X1 = 7.5, WATER_Y = -0.28;

  function buildBase() {
    const g = new T.Group();
    const b = new Builder();

    // 展台
    b.box('woodDeep', 18.2, 0.30, 18.2, 0, -1.82, 0);
    b.box('woodDeep', 17.6, 0.16, 17.6, 0, -1.58, 0);

    // 陆地
    b.box('stoneD', 12.7, 1.5, 17, -2.15, -0.75, 0);
    b.box('stoneD', 1.0, 1.5, 17, 8.0, -0.75, 0);
    // 河床
    b.box('stoneD', 3.3, 1.22, 17, 5.85, -0.91, 0);

    // 岸边压顶
    b.box('stoneL', 0.46, 0.28, 17, 4.0, 0.03, 0);
    b.box('stoneL', 0.34, 0.20, 17, 8.32, 0.10, 0);
    // 水痕
    b.box('tile', 0.06, 0.16, 17, 4.19, -0.34, 0);
    b.box('tile', 0.06, 0.16, 17, 7.51, -0.34, 0);

    // 青石板
    const S = 0.86;
    let ix = 0;
    for (let x = -HB + S / 2; x < 4.16; x += S) {
      let iz = 0;
      for (let z = -HB + S / 2; z < HB; z += S) {
        const inHouse = (x > -5.15 && x < 1.95 && z > -3.75 && z < 2.95);
        const inTerr = (x > 1.7 && x < 4.3 && z > -2.4 && z < 2.85);
        if (!inHouse && !inTerr) {
          const hh = 0.055 + ((ix * 7 + iz * 3) % 4) * 0.011;
          const m = (ix * 5 + iz * 7) % 7;
          const k = m === 0 ? 'stoneL' : (m === 3 ? 'stoneD' : 'stone');
          b.box(k, S - 0.045, hh, S - 0.045, x, hh / 2, z);
        }
        iz++;
      }
      ix++;
    }
    // 远岸石板
    for (let z = -HB + 0.45; z < HB; z += 0.9) {
      b.box('stone', 0.8, 0.06, 0.84, 8.0, 0.03, z);
    }
    b.build(g);
    return g;
  }

  /* ================= 水面 ================= */
  const waterUni = { uTime: { value: 0 } };
  (function () {
    const W = PS.water || {};
    const d = cfg(W.deep, [0.196, 0.408, 0.451]);
    const sh = cfg(W.shal, [0.376, 0.588, 0.596]);
    const hi = cfg(W.hi, [0.784, 0.855, 0.808]);
    waterUni.uDeep = { value: new T.Vector3(d[0], d[1], d[2]) };
    waterUni.uShal = { value: new T.Vector3(sh[0], sh[1], sh[2]) };
    waterUni.uHi = { value: new T.Vector3(hi[0], hi[1], hi[2]) };
  })();
  function buildWater() {
    const geo = new T.PlaneGeometry(RIV_X1 - RIV_X0 + 0.1, 17, 1, 1);
    const m = new T.ShaderMaterial({
      uniforms: waterUni,
      vertexShader:
        'varying vec2 vUv;\n' +
        'void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform float uTime; uniform vec3 uDeep; uniform vec3 uShal; uniform vec3 uHi;\n' +
        'varying vec2 vUv;\n' +
        'void main(){\n' +
        '  float t = uTime;\n' +
        '  vec2 uv = vUv;\n' +
        '  float w1 = sin(uv.y*96.0 + t*0.62 + sin(uv.x*10.0)*1.5);\n' +
        '  float w2 = sin(uv.y*41.0 - t*0.40 + uv.x*6.5);\n' +
        '  float w3 = sin(uv.x*26.0 + uv.y*7.0 + t*0.5);\n' +
        '  float w4 = sin(uv.y*17.0 + uv.x*3.0 - t*0.25);\n' +
        '  float n = w1*0.40 + w2*0.30 + w3*0.16 + w4*0.14;\n' +
        '  float band = smoothstep(0.28, 0.60, n);\n' +
        '  float glint = smoothstep(0.82, 0.99, n);\n' +
        '  vec3 deep = uDeep;\n' +
        '  vec3 shal = uShal;\n' +
        '  vec3 hi   = uHi;\n' +
        '  vec3 col = mix(deep, shal, band*0.72+0.12);\n' +
        '  col = mix(col, hi, glint*0.55);\n' +
        '  float e = smoothstep(0.0,0.10,uv.x)*smoothstep(1.0,0.90,uv.x);\n' +
        '  col = mix(deep*0.82, col, e);\n' +
        '  float d = smoothstep(0.0,0.34,uv.y)*smoothstep(1.0,0.72,uv.y);\n' +
        '  col = mix(col*0.82, col, d);\n' +
        '  gl_FragColor = vec4(col,1.0);\n' +
        '}'
    });
    const mesh = new T.Mesh(geo, m);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((RIV_X0 + RIV_X1) / 2, WATER_Y, 0);
    return mesh;
  }

  /* ================= 茶楼 ================= */
  const HX0 = -4.9, HX1 = 1.7, HZ0 = -3.5, HZ1 = 2.7;
  const FL = 0.28, GF = 3.2, F2 = 3.45, GF2 = 5.35, RIDGE = 7.5;

  function latZ(b, x, z0, z1, y0, y1, key) {
    key = key || 'woodDark';
    const w = z1 - z0, h = y1 - y0;
    const nv = Math.max(3, Math.round(w / 0.265));
    for (let i = 0; i <= nv; i++) b.box(key, 0.036, h, 0.03, x, (y0 + y1) / 2, z0 + w * i / nv);
    const nh = Math.max(2, Math.round(h / 0.28));
    for (let i = 0; i <= nh; i++) b.box(key, 0.036, 0.03, w, x, y0 + h * i / nh, (z0 + z1) / 2);
  }
  function latX(b, z, x0, x1, y0, y1, key) {
    key = key || 'woodDark';
    const w = x1 - x0, h = y1 - y0;
    const nv = Math.max(3, Math.round(w / 0.265));
    for (let i = 0; i <= nv; i++) b.box(key, 0.03, h, 0.036, x0 + w * i / nv, (y0 + y1) / 2, z);
    const nh = Math.max(2, Math.round(h / 0.28));
    for (let i = 0; i <= nh; i++) b.box(key, w, 0.03, 0.036, (x0 + x1) / 2, y0 + h * i / nh, z);
  }

  function gaiwan(b, x, y, z, s) {
    b.cyl('paper', 0.085 * s, 0.075 * s, 0.018 * s, 12, x, y + 0.009 * s, z);
    b.cyl('paper', 0.072 * s, 0.05 * s, 0.07 * s, 12, x, y + 0.055 * s, z);
    b.cyl('paper', 0.076 * s, 0.076 * s, 0.012 * s, 12, x, y + 0.098 * s, z);
    b.sph('paper', 0.022 * s, x, y + 0.112 * s, z, 1, 0.7, 1);
    b.cyl('celadon', 0.074 * s, 0.074 * s, 0.006 * s, 12, x, y + 0.092 * s, z);
  }

  function buildHouse() {
    const g = new T.Group();
    const b = new Builder();
    const CX = (HX0 + HX1) / 2;

    /* --- 台基 / 地板 --- */
    b.box('stone', 7.3, 0.30, 6.9, CX, 0.02, -0.4);
    b.box('stoneL', 7.4, 0.06, 7.0, CX, 0.19, -0.4);
    // 地板板条
    for (let i = 0; i < 22; i++) {
      const z = HZ0 + 0.28 + i * 0.28;
      if (z > HZ1 - 0.1) break;
      b.box(i % 2 ? 'woodLight' : 'woodPale', 6.4, 0.08, 0.255, CX, 0.24, z);
    }

    /* --- 柱 --- */
    const colZ = [-3.4, -1.4, 0.6, 2.6];
    for (let i = 0; i < colZ.length; i++) {
      b.box('woodDark', 0.25, 2.94, 0.25, 1.52, FL + 1.47, colZ[i]);
      b.box('woodDark', 0.25, 2.94, 0.25, -4.76, FL + 1.47, colZ[i]);
      b.box('woodDeep', 0.34, 0.1, 0.34, 1.52, 0.36, colZ[i]);
    }
    b.box('woodDark', 0.22, 2.94, 0.22, -1.6, FL + 1.47, 2.62);
    b.box('woodDark', 0.22, 2.94, 0.22, -1.6, FL + 1.47, -3.42);

    /* --- 一层：正面墙 x=1.52 --- */
    const FX = 1.52;
    // 裙板
    b.box('wood', 0.1, 0.79, 1.96, FX, 0.675, -2.4);
    b.box('wood', 0.1, 0.79, 1.96, FX, 0.675, 1.6);
    b.box('wood', 0.1, 0.79, 0.44, FX, 0.675, -1.18);
    b.box('wood', 0.1, 0.79, 0.44, FX, 0.675, 0.38);
    // 窗台 / 窗楣
    for (let i = 0; i < 2; i++) {
      const z = i === 0 ? -2.4 : 1.6;
      b.box('woodLight', 0.2, 0.09, 2.06, FX, 1.075, z);
      b.box('woodDark', 0.16, 0.11, 2.06, FX, 2.63, z);
    }
    // 格心
    latZ(b, FX, -3.38, -1.42, 1.12, 2.58);
    latZ(b, FX, 0.62, 2.58, 1.12, 2.58);
    latZ(b, FX, -1.38, -0.97, 1.12, 2.58);
    latZ(b, FX, 0.17, 0.58, 1.12, 2.58);
    // 门上横批
    b.box('wood', 0.1, 0.6, 1.2, FX, 2.92, -0.4);
    latZ(b, FX, -0.97, 0.17, 2.64, 3.18);
    // 门框
    b.box('woodDark', 0.16, 2.4, 0.1, FX, 1.44, -0.95);
    b.box('woodDark', 0.16, 2.4, 0.1, FX, 1.44, 0.15);
    b.box('woodDark', 0.16, 0.14, 1.2, FX, 2.62, -0.4);
    b.box('stoneL', 0.26, 0.12, 1.3, FX, 0.33, -0.4);
    // 半开的门扇
    const dl = 0.95, dry = -0.95, th = -1.18;
    b.box('woodWarm', 0.055, 2.28, dl, FX + Math.sin(th) * (dl / 2), 1.42, dry + Math.cos(th) * (dl / 2), 0, th, 0);
    b.box('woodDark', 0.07, 0.09, 0.72, FX + Math.sin(th) * (dl / 2), 2.28, dry + Math.cos(th) * (dl / 2), 0, th, 0);

    // 正面檐枋
    b.box('woodDark', 0.26, 0.22, 6.4, FX, 3.12, -0.4);
    b.box('woodDeep', 0.3, 0.12, 6.5, FX, 3.26, -0.4);

    /* --- 一层：侧墙 z=2.66 --- */
    const SZ = 2.66;
    b.box('wood', 6.1, 0.79, 0.1, -1.58, 0.675, SZ);
    b.box('woodLight', 6.2, 0.09, 0.2, -1.58, 1.075, SZ);
    b.box('woodDark', 6.2, 0.11, 0.16, -1.58, 2.63, SZ);
    latX(b, SZ, -4.6, -1.7, 1.12, 2.58);
    latX(b, SZ, -1.5, 1.4, 1.12, 2.58);
    b.box('woodDark', 6.5, 0.22, 0.26, -1.58, 3.12, SZ);

    /* --- 后墙 / 左墙 --- */
    b.box('plaster', 0.16, 3.0, 6.1, -4.85, 1.78, -0.4);
    b.box('plaster', 6.4, 3.0, 0.16, CX, 1.78, -3.44);
    b.box('woodDark', 0.2, 2.9, 0.2, -4.86, 1.72, -3.44);
    b.box('woodDark', 0.2, 2.9, 0.2, -4.86, 1.72, 2.64);
    // 后墙高处小窗
    b.box('paper', 0.12, 0.62, 1.0, -4.9, 2.55, 1.1);
    latZ(b, -4.95, 0.58, 1.62, 2.2, 2.9);
    // 后墙木饰带
    b.box('woodDark', 0.07, 0.1, 6.1, -4.93, 3.05, -0.4);

    /* --- 二层楼板 --- */
    b.box('woodLight', 6.7, 0.15, 5.2, CX, F2 - 0.075, 0.1);
    b.box('woodLight', 3.2, 0.15, 1.0, -3.35, F2 - 0.075, -3.0);
    b.box('woodLight', 0.9, 0.15, 4.9, 2.17, F2 - 0.075, 0.25);
    b.box('woodDark', 0.2, 0.28, 6.5, 1.55, F2 - 0.22, -0.4);

    /* --- 二层墙：白墙 + 木格窗 --- */
    const WY0 = F2 + 0.06, WY1 = 5.22;
    const oy0 = F2 + 0.62, oy1 = 5.0;
    // 正立面 x=1.52
    b.box('plaster', 0.1, oy0 - WY0, 6.0, 1.52, (WY0 + oy0) / 2, -0.4);
    b.box('plaster', 0.1, WY1 - oy1, 6.0, 1.52, (oy1 + WY1) / 2, -0.4);
    const fw = [[-3.4, -2.9], [-1.55, -0.9], [0.05, 0.9], [2.25, 2.6]];
    for (let i = 0; i < fw.length; i++) {
      b.box('plaster', 0.1, oy1 - oy0, fw[i][1] - fw[i][0], 1.52, (oy0 + oy1) / 2, (fw[i][0] + fw[i][1]) / 2);
    }
    latZ(b, 1.5, -2.88, -1.57, oy0, oy1);
    latZ(b, 1.5, -0.88, 0.03, oy0, oy1);
    latZ(b, 1.5, 0.92, 2.23, oy0, oy1);
    b.box('woodDark', 0.16, 0.1, 6.0, 1.52, oy0 - 0.05, -0.4);
    b.box('woodDark', 0.16, 0.1, 6.0, 1.52, oy1 + 0.05, -0.4);
    b.box('woodDark', 0.24, 0.2, 6.4, 1.52, 5.28, -0.4);
    // 侧立面 z=2.66
    b.box('plaster', 6.0, oy0 - WY0, 0.1, -1.58, (WY0 + oy0) / 2, 2.66);
    b.box('plaster', 6.0, WY1 - oy1, 0.1, -1.58, (oy1 + WY1) / 2, 2.66);
    b.box('plaster', 0.34, oy1 - oy0, 0.1, -4.6, (oy0 + oy1) / 2, 2.66);
    b.box('plaster', 0.36, oy1 - oy0, 0.1, -1.82, (oy0 + oy1) / 2, 2.66);
    b.box('plaster', 0.34, oy1 - oy0, 0.1, 1.36, (oy0 + oy1) / 2, 2.66);
    latX(b, 2.64, -4.4, -1.98, oy0, oy1);
    latX(b, 2.64, -1.62, 1.18, oy0, oy1);
    b.box('woodDark', 6.0, 0.1, 0.16, -1.58, oy0 - 0.05, 2.66);
    b.box('woodDark', 6.0, 0.1, 0.16, -1.58, oy1 + 0.05, 2.66);
    b.box('woodDark', 6.4, 0.2, 0.24, -1.58, 5.28, 2.66);
    // 后/左 二层
    b.box('plaster2', 0.16, 2.0, 6.1, -4.85, F2 + 1.0, -0.4);
    b.box('plaster2', 6.4, 2.0, 0.16, CX, F2 + 1.0, -3.44);
    b.box('paper', 0.1, 0.7, 0.9, -4.9, 4.7, 0.9);
    latZ(b, -4.94, 0.45, 1.35, 4.35, 5.05);

    /* --- 二层美人靠阳台栏杆 --- */
    const by = F2;
    b.box('woodDark', 0.16, 0.16, 4.9, 2.58, by + 0.86, 0.25);
    b.box('woodDark', 0.14, 0.1, 4.9, 2.58, by + 0.42, 0.25);
    for (let i = 0; i <= 22; i++) {
      b.box('woodDark', 0.055, 0.86, 0.055, 2.58, by + 0.43, -2.15 + i * 4.8 / 22);
    }
    b.box('wood', 0.12, 0.5, 0.12, 2.58, by + 0.25, -2.18);
    b.box('wood', 0.12, 0.5, 0.12, 2.58, by + 0.25, 2.68);
    // 阳台侧挡板
    b.box('woodDark', 0.9, 0.9, 0.1, 2.17, by + 0.45, -2.2);

    /* --- 屋顶 --- */
    const zc = -0.4, depth = 7.4;
    const front = [[-1.6, RIDGE], [-0.55, 7.02], [0.45, 6.62], [1.4, 6.30], [2.2, 6.06], [2.9, 5.90]];
    const back = [[-1.6, RIDGE], [-2.65, 7.02], [-3.65, 6.62], [-4.6, 6.30], [-5.4, 6.06], [-6.1, 5.90]];
    function slope(pts) {
      for (let i = 0; i < pts.length - 1; i++) {
        const x0 = pts[i][0], y0 = pts[i][1], x1 = pts[i + 1][0], y1 = pts[i + 1][1];
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        const len = Math.hypot(x1 - x0, y1 - y0) * 1.05;
        const ang = Math.atan2(y1 - y0, x1 - x0);
        b.box('tile', len, 0.15, depth, mx, my, zc, 0, 0, ang);
        b.box('tileL', len, 0.04, 0.1, mx, my, zc - depth / 2 + 0.05, 0, 0, ang);
        b.box('tileL', len, 0.04, 0.1, mx, my, zc + depth / 2 - 0.05, 0, 0, ang);
        // 瓦垄
        let nx = -Math.sin(ang), ny = Math.cos(ang);
        if (ny < 0) { nx = -nx; ny = -ny; }
        const nz = Math.round(depth / 0.36);
        for (let k = 0; k <= nz; k++) {
          const zz = zc - depth / 2 + depth * k / nz;
          b.box('tileD', len * 0.99, 0.07, 0.07, mx + nx * 0.08, my + ny * 0.08, zz, 0, 0, ang);
        }
      }
    }
    slope(front); slope(back);
    // 正脊
    b.box('tileD', 0.36, 0.26, 7.5, -1.6, RIDGE + 0.06, zc);
    b.box('tileL', 0.16, 0.1, 7.5, -1.6, RIDGE + 0.22, zc);
    b.box('tileD', 0.32, 0.4, 0.5, -1.6, RIDGE + 0.26, zc - 3.62);
    b.box('tileD', 0.32, 0.4, 0.5, -1.6, RIDGE + 0.26, zc + 3.62);
    // 山墙（按屋面轮廓挤出，严丝合缝）
    const gsh = new T.Shape();
    gsh.moveTo(front[5][0], front[5][1]);
    for (let i = 4; i >= 0; i--) gsh.lineTo(front[i][0], front[i][1]);
    for (let i = 1; i <= 5; i++) gsh.lineTo(back[i][0], back[i][1]);
    gsh.lineTo(back[5][0], 5.3);
    gsh.lineTo(front[5][0], 5.3);
    gsh.closePath();
    if (!PS.matou) [-4.12, 2.68].forEach(function (gz) {
      const gg = new T.ExtrudeGeometry(gsh, { depth: 0.62, bevelEnabled: false });
      gg.translate(0, 0, gz);
      b.add('plaster2', gg);
      b.box('woodDeep', 9.05, 0.12, 0.7, -1.6, 5.3, gz + 0.31);
    });
    // 马头墙（徽派叠落山墙）——整体挤出，替代原山墙
    if (PS.matou) {
      const msh = new T.Shape();
      msh.moveTo(2.96, 5.20);
      msh.lineTo(2.96, 6.66);
      msh.lineTo(0.56, 6.66);
      msh.lineTo(0.56, 7.82);
      msh.lineTo(-3.72, 7.82);
      msh.lineTo(-3.72, 6.66);
      msh.lineTo(-6.14, 6.66);
      msh.lineTo(-6.14, 5.20);
      msh.closePath();
      // 每级水平段：压顶瓦 + 端头小翘
      const capW = [[2.96, 0.56, 6.66], [0.56, -3.72, 7.82], [-3.72, -6.14, 6.66]];
      [-4.12, 2.68].forEach(function (gz) {
        const mgg = new T.ExtrudeGeometry(msh, { depth: 0.62, bevelEnabled: false });
        mgg.translate(0, 0, gz);
        b.add('plaster2', mgg);
        b.box('woodDeep', 9.12, 0.1, 0.66, -1.6, 5.22, gz + 0.31);
        for (let i = 0; i < capW.length; i++) {
          const w = Math.abs(capW[i][0] - capW[i][1]) + 0.18;
          const cx = (capW[i][0] + capW[i][1]) / 2;
          const top = capW[i][2];
          b.box('tileD', w, 0.07, 0.7, cx, top + 0.035, gz + 0.31);
          b.box('tile', w - 0.05, 0.06, 0.63, cx, top + 0.095, gz + 0.31);
        }
        // 阶梯转角的"马头"（向低侧出挑）
        [[0.56, 7.82, 1], [-3.72, 7.82, -1]].forEach(function (mt) {
          const mx = mt[0], my = mt[1], dir = mt[2];
          b.box('plaster2', 0.3, 0.46, 0.7, mx + dir * 0.16, my - 0.23, gz + 0.31);
          b.box('tileD', 0.46, 0.085, 0.78, mx + dir * 0.24, my + 0.03, gz + 0.31, 0, 0, dir * 0.28);
          b.box('tile', 0.4, 0.07, 0.7, mx + dir * 0.29, my + 0.1, gz + 0.31, 0, 0, dir * 0.32);
        });

      });
    }
    // 博风板
    if (!PS.matou) [front, back].forEach(function (pts) {
      for (let i = 0; i < pts.length - 1; i++) {
        const x0 = pts[i][0], y0 = pts[i][1], x1 = pts[i + 1][0], y1 = pts[i + 1][1];
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - 0.1;
        const len = Math.hypot(x1 - x0, y1 - y0) * 1.06;
        const ang = Math.atan2(y1 - y0, x1 - x0);
        b.box('woodDeep', len, 0.18, 0.09, mx, my, -4.02, 0, 0, ang);
        b.box('woodDeep', len, 0.18, 0.09, mx, my, 3.22, 0, 0, ang);
      }
    });
    // 翘角（顺檐口向外挑出并上翘）—— 徽派不做
    if (!PS.matou) [-4.06, 3.26].forEach(function (cz) {
      const sz = cz > 0 ? 1 : -1;
      b.box('tileD', 0.2, 0.12, 0.95, 2.86, 6.02, cz + sz * 0.32, sz * -0.55, 0, 0);
      b.box('tileD', 0.2, 0.12, 0.95, -6.06, 6.02, cz + sz * 0.32, sz * -0.55, 0, 0);
      b.box('tileL', 0.14, 0.06, 0.5, 2.86, 6.16, cz + sz * 0.72, sz * -0.55, 0, 0);
      b.box('tileL', 0.14, 0.06, 0.5, -6.06, 6.16, cz + sz * 0.72, sz * -0.55, 0, 0);
    });
    // 檐口封板
    b.box('woodDeep', 0.14, 0.18, 8.9, 2.94, 5.86, zc);
    b.box('woodDeep', 0.14, 0.18, 8.9, -6.14, 5.86, zc);

    /* --- 半卷竹帘 --- */
    for (let i = 0; i < 2; i++) {
      const z = i === 0 ? -2.4 : 1.6;
      b.cyl('woodPale', 0.085, 0.085, 1.9, 10, 1.63, 2.6, z, 0, 0, Math.PI / 2);
      for (let k = 0; k < 16; k++) {
        b.box('woodPale', 0.022, 0.26, 0.022, 1.63, 2.44, z - 0.62 + k * 0.078);
      }
    }
    b.cyl('woodPale', 0.085, 0.085, 1.8, 10, -2.9, 2.6, 2.78, 0, Math.PI / 2, 0);

    /* --- 匾额 --- */
    b.box('woodDeep', 0.1, 0.5, 1.62, 1.66, 2.94, -0.4, 0, 0, 0);

    // 远岸点缀
    b.box('stone', 0.5, 0.3, 0.5, 8.0, 0.16, -2.4, 0, 0.3, 0);
    b.box('stoneL', 0.4, 0.24, 0.46, 8.05, 0.14, 0.9, 0, -0.2, 0);
    b.cyl('stoneD', 0.09, 0.11, 0.46, 8, 7.78, 0.23, 3.9);
    b.cyl('stoneL', 0.13, 0.13, 0.06, 8, 7.78, 0.47, 3.9);
    b.to('woodDeep', 0.03, 7.9, 0.1, 4.6, 7.86, 0.16, 4.0, 4);

    b.build(g);
    return g;
  }

  /* ================= 楼阁（滕王阁形制） ================= */
  function roof4(b, cx, cz, botH, topH, h, y, key, ribs) {
    // 举折：拆成下缓、上陡两段，呈现中国屋面的凹曲线
    const midH = topH + (botH - topH) * 0.46;
    const h1 = h * 0.34, h2 = h * 0.66;
    const g1 = new T.CylinderGeometry(midH * 1.41421, botH * 1.41421, h1, 4, 1);
    g1.rotateY(Math.PI / 4);
    g1.translate(cx, y + h1 / 2, cz);
    b.add(key, g1);
    const g2 = new T.CylinderGeometry(topH * 1.41421, midH * 1.41421, h2, 4, 1);
    g2.rotateY(Math.PI / 4);
    g2.translate(cx, y + h1 + h2 / 2, cz);
    b.add(key, g2);
    // 瓦垄：沿两段坡面各画一节，贴合举折曲线
    if (ribs) {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        const nx = d[0], nz = d[1], tx = -nz, tz = nx;
        for (let i = 1; i < ribs; i++) {
          const t = (i / ribs - 0.5) * 2;
          b.to('tileL', 0.055,
            cx + nx * botH + tx * t * botH, y + 0.01, cz + nz * botH + tz * t * botH,
            cx + nx * midH + tx * t * midH, y + h1 + 0.01, cz + nz * midH + tz * t * midH, 4);
          b.to('tileL', 0.055,
            cx + nx * midH + tx * t * midH, y + h1 + 0.01, cz + nz * midH + tz * t * midH,
            cx + nx * topH + tx * t * topH, y + h + 0.01, cz + nz * topH + tz * t * topH, 4);
        }
      });
    }
  }
  function upCorner(b, cx, cz, half, y, key) {
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) {
      const x0 = cx + s[0] * half * 0.86, z0 = cz + s[1] * half * 0.86;
      const xm = cx + s[0] * (half + 0.26), zm = cz + s[1] * (half + 0.26);
      const x1 = cx + s[0] * (half + 0.44), z1 = cz + s[1] * (half + 0.44);
      b.to(key, 0.1, x0, y - 0.04, z0, xm, y + 0.05, zm, 5);
      b.to(key, 0.082, xm, y + 0.05, zm, x1, y + 0.42, z1, 5);
      b.box(key, 0.13, 0.1, 0.13, x1, y + 0.46, z1, 0, 0.6, 0.32);
    });
  }
  function balus(b, cx, cz, half, y, key) {
    const n = 4;
    for (let i = 0; i <= n; i++) {
      const t = -half + (2 * half) * i / n;
      b.box(key, 0.08, 0.38, 0.08, cx + t, y + 0.19, cz - half);
      b.box(key, 0.08, 0.38, 0.08, cx + t, y + 0.19, cz + half);
      b.box(key, 0.08, 0.38, 0.08, cx - half, y + 0.19, cz + t);
      b.box(key, 0.08, 0.38, 0.08, cx + half, y + 0.19, cz + t);
    }
    b.box(key, half * 2 + 0.09, 0.065, 0.09, cx, y + 0.4, cz - half);
    b.box(key, half * 2 + 0.09, 0.065, 0.09, cx, y + 0.4, cz + half);
    b.box(key, 0.09, 0.065, half * 2 + 0.09, cx - half, y + 0.4, cz);
    b.box(key, 0.09, 0.065, half * 2 + 0.09, cx + half, y + 0.4, cz);
    b.box(key, half * 2, 0.045, 0.06, cx, y + 0.12, cz - half);
    b.box(key, half * 2, 0.045, 0.06, cx, y + 0.12, cz + half);
  }

  function buildTower() {
    const g = new T.Group();
    const b = new Builder();
    const CX = cfg(PS.towerCx, -2.05), CZ = cfg(PS.towerCz, -0.2);
    const PW = cfg(PS.towerBase, 4.35), PY = cfg(PS.towerPY, 1.05);

    /* --- 城墙式高台座 --- */
    b.box('stoneD', PW * 2 + 0.3, 0.14, PW * 2 + 0.3, CX, 0.07, CZ);
    b.box('stone', PW * 2, PY - 0.3, PW * 2, CX, (PY - 0.16) / 2 + 0.1, CZ);
    b.box('stoneL', PW * 2 + 0.26, 0.14, PW * 2 + 0.26, CX, PY - 0.07, CZ);
    b.box('stoneL', PW * 2 + 0.18, 0.1, PW * 2 + 0.18, CX, 0.66, CZ);
    b.box('stoneD', PW * 2 + 0.08, 0.12, PW * 2 + 0.08, CX, 0.36, CZ);
    // 台面铺砖
    for (let x = -PW + 0.5; x < PW - 0.3; x += 0.8) {
      for (let z = -PW + 0.5; z < PW - 0.3; z += 0.8) {
        b.box(((Math.round(x * 10) + Math.round(z * 10)) % 7) === 0 ? 'stoneL' : 'stone',
          0.72, 0.05, 0.72, CX + x, PY + 0.03, CZ + z);
      }
    }
    // 台座栏杆
    balus(b, CX, CZ, PW - 0.12, PY + 0.04, 'stoneL');
    // 四角望柱加粗
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (s) {
      b.box('stoneL', 0.18, 0.56, 0.18, CX + s[0] * (PW - 0.12), PY + 0.28, CZ + s[1] * (PW - 0.12));
      b.sph('stoneL', 0.11, CX + s[0] * (PW - 0.12), PY + 0.6, CZ + s[1] * (PW - 0.12), 1, 1, 1);
    });

    /* --- 三层楼身（逐层收分） --- */
    const LV = [
      { hw: 3.55, y: PY, ch: 2.6 },
      { hw: 2.98, y: PY + 3.47, ch: 2.35 },
      { hw: 2.42, y: PY + 6.60, ch: 2.15 }
    ];
    let topY = PY;

    for (let i = 0; i < LV.length; i++) {
      const L = LV[i], hw = L.hw, y0 = L.y, y1 = L.y + L.ch;
      // 台明 / 楼板
      b.box('stoneL', hw * 2 + 0.28, 0.12, hw * 2 + 0.28, CX, y0 - 0.05, CZ);
      b.box('woodPale', hw * 2 - 0.08, 0.07, hw * 2 - 0.08, CX, y0 + 0.04, CZ);
      // 裙板
      const wy0 = y0 + 0.92, wy1 = y1 - 0.2;
      [-1, 1].forEach(function (sd) {
        b.box('wood', 0.09, 0.84, hw * 2 - 0.1, CX + sd * hw, y0 + 0.44, CZ);
        b.box('wood', hw * 2 - 0.1, 0.84, 0.09, CX, y0 + 0.44, CZ + sd * hw);
        b.box('woodDark', 0.12, 0.06, hw * 2 - 0.1, CX + sd * hw, y0 + 0.88, CZ);
        b.box('woodDark', hw * 2 - 0.1, 0.06, 0.12, CX, y0 + 0.88, CZ + sd * hw);
      });
      // 窗纸
      b.box('paper', 0.035, wy1 - wy0, hw * 2 - 0.14, CX + hw, (wy0 + wy1) / 2, CZ);
      b.box('paper', 0.035, wy1 - wy0, hw * 2 - 0.14, CX - hw, (wy0 + wy1) / 2, CZ);
      b.box('paper', hw * 2 - 0.14, wy1 - wy0, 0.035, CX, (wy0 + wy1) / 2, CZ + hw);
      b.box('paper', hw * 2 - 0.14, wy1 - wy0, 0.035, CX, (wy0 + wy1) / 2, CZ - hw);
      // 格心
      latZ(b, CX + hw + 0.028, CZ - hw + 0.07, CZ + hw - 0.07, wy0, wy1, 'woodDark');
      latZ(b, CX - hw - 0.028, CZ - hw + 0.07, CZ + hw - 0.07, wy0, wy1, 'woodDark');
      latX(b, CZ + hw + 0.028, CX - hw + 0.07, CX + hw - 0.07, wy0, wy1, 'woodDark');
      latX(b, CZ - hw - 0.028, CX - hw + 0.07, CX + hw - 0.07, wy0, wy1, 'woodDark');
      // 朱柱
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (sd) {
        b.cyl('pillar', 0.1, 0.118, L.ch, 8, CX + sd[0] * hw, y0 + L.ch / 2, CZ + sd[1] * hw);
      });
      [-1, 0, 1].forEach(function (t) {
        b.cyl('pillar', 0.082, 0.094, L.ch, 8, CX + t * hw, y0 + L.ch / 2, CZ - hw);
        b.cyl('pillar', 0.082, 0.094, L.ch, 8, CX + t * hw, y0 + L.ch / 2, CZ + hw);
        b.cyl('pillar', 0.082, 0.094, L.ch, 8, CX - hw, y0 + L.ch / 2, CZ + t * hw);
      });
      // 正面中间开间留门，柱子外移
      [-1, -0.62, 0.62, 1].forEach(function (t) {
        b.cyl('pillar', 0.082, 0.094, L.ch, 8, CX + hw, y0 + L.ch / 2, CZ + t * hw);
      });
      // 首层正面大门
      if (i === 0) {
        const dw = 1.46;
        b.box('woodDeep', 0.1, 1.94, dw + 0.34, CX + hw + 0.02, y0 + 0.97, CZ);
        b.box('wood', 0.12, 1.76, dw, CX + hw + 0.06, y0 + 0.88, CZ);
        b.box('woodDark', 0.04, 1.76, 0.06, CX + hw + 0.14, y0 + 0.88, CZ);
        b.box('pillar', 0.2, 0.15, dw + 0.5, CX + hw + 0.05, y0 + 2.0, CZ);
        for (let a = 0; a < 3; a++) {
          for (let c = 0; c < 4; c++) {
            b.sph('brass', 0.028, CX + hw + 0.14, y0 + 0.46 + a * 0.5, CZ - 0.53 + c * 0.35, 1, 1, 1);
          }
        }
        b.box('stoneL', 0.42, 0.12, dw + 0.42, CX + hw + 0.12, y0 + 0.06, CZ);
      }
      // 额枋
      b.box('cai', hw * 2 + 0.26, 0.17, 0.13, CX, y1 - 0.09, CZ + hw);
      b.box('cai', hw * 2 + 0.26, 0.17, 0.13, CX, y1 - 0.09, CZ - hw);
      b.box('cai', 0.13, 0.17, hw * 2 + 0.26, CX + hw, y1 - 0.09, CZ);
      b.box('cai', 0.13, 0.17, hw * 2 + 0.26, CX - hw, y1 - 0.09, CZ);
      // 斗拱
      const nb = Math.max(3, Math.round(hw * 2 / 0.72));
      for (let k = 0; k <= nb; k++) {
        const t = -hw + (2 * hw) * k / nb;
        b.box('cai', 0.15, 0.19, 0.46, CX + t, y1 - 0.01, CZ + hw + 0.1);
        b.box('cai', 0.15, 0.19, 0.46, CX + t, y1 - 0.01, CZ - hw - 0.1);
        b.box('cai', 0.46, 0.19, 0.15, CX + hw + 0.1, y1 - 0.01, CZ + t);
        b.box('cai', 0.46, 0.19, 0.15, CX - hw - 0.1, y1 - 0.01, CZ + t);
      }
      // 腰檐 / 顶檐
      const out = i === 2 ? 0.78 : 0.9;
      const eh = i === 2 ? 0.9 : 0.8;
      b.box('tileD', (hw + out) * 2, 0.08, (hw + out) * 2, CX, y1 + 0.05, CZ);
      roof4(b, CX, CZ, hw + out, hw + 0.06, eh, y1 + 0.09, 'tile', 7);
      b.box('tileL', (hw + out) * 2 + 0.04, 0.055, (hw + out) * 2 + 0.04, CX, y1 + 0.095, CZ);
      upCorner(b, CX, CZ, hw + out, y1 + 0.1, 'tileL');
      topY = y1 + 0.09 + eh;
      // 平座栏杆
      if (i < 2) balus(b, CX, CZ, LV[i + 1].hw + 0.4, topY + 0.02, 'pillar');
    }

    /* --- 顶层歇山 + 正脊 + 宝顶 --- */
    roof4(b, CX, CZ, LV[2].hw + 0.1, 0.58, 1.2, topY, 'tile', 8);
    const ry = topY + 1.2;
    b.box('tileD', 0.44, 0.26, 2.3, CX, ry + 0.1, CZ);
    b.box('tileL', 0.2, 0.08, 2.34, CX, ry + 0.25, CZ);
    [-1, 1].forEach(function (sd) {
      b.box('tileD', 0.3, 0.34, 0.28, CX, ry + 0.19, CZ + sd * 1.05, sd * 0.3, 0, 0);
      b.box('tileD', 0.24, 0.16, 0.2, CX, ry + 0.4, CZ + sd * 1.14, sd * 0.6, 0, 0);
    });
    // 宝顶
    b.cyl('brass', 0.1, 0.13, 0.14, 8, CX, ry + 0.16, CZ);
    b.sph('brass', 0.15, CX, ry + 0.34, CZ, 1, 1.1, 1);
    b.cyl('brass', 0.03, 0.04, 0.22, 6, CX, ry + 0.55, CZ);
    b.sph('brass', 0.06, CX, ry + 0.68, CZ, 1, 1, 1);

    b.build(g);
    return g;
  }

  /* ================= 室内 ================= */
  function buildInterior() {
    const g = new T.Group();
    const b = new Builder();
    const FY = FL;

    /* 柜台 */
    b.box('int1', 0.86, 0.94, 2.42, -4.26, FY + 0.47, -0.3);
    b.box('int2', 1.0, 0.1, 2.56, -4.26, FY + 0.99, -0.3);
    b.box('woodDeep', 0.05, 0.7, 0.9, -3.82, FY + 0.5, -1.0);
    b.box('woodDeep', 0.05, 0.7, 0.9, -3.82, FY + 0.5, 0.35);
    // 柜台腿
    b.box('woodDeep', 0.08, 0.94, 0.08, -3.86, FY + 0.47, -1.42);
    b.box('woodDeep', 0.08, 0.94, 0.08, -3.86, FY + 0.47, 0.82);

    /* 茶罐架 */
    b.box('int4', 0.08, 1.6, 2.2, -4.78, FY + 1.85, -0.3);
    for (let i = 0; i < 3; i++) {
      b.box('int2', 0.3, 0.05, 2.16, -4.64, FY + 1.28 + i * 0.44, -0.3);
    }
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 6; j++) {
        b.cyl('int3', 0.062, 0.055, 0.17, 10, -4.64, FY + 1.39 + i * 0.44, -1.25 + j * 0.34);
        b.cyl('woodDeep', 0.064, 0.064, 0.022, 10, -4.64, FY + 1.485 + i * 0.44, -1.25 + j * 0.34);
      }
    }
    // 算盘
    b.box('woodDeep', 0.3, 0.03, 0.46, -4.2, FY + 1.06, 0.1);
    for (let i = 0; i < 9; i++) {
      b.box('brass', 0.02, 0.02, 0.44, -4.33 + i * 0.033, FY + 1.08, 0.1);
    }
    for (let i = 0; i < 7; i++) {
      b.box('woodDeep', 0.026, 0.026, 0.026, -4.33 + i * 0.033, FY + 1.1, 0.0);
      b.box('woodDeep', 0.026, 0.026, 0.026, -4.33 + i * 0.033, FY + 1.1, 0.2);
    }
    // 账本
    b.box('int3', 0.32, 0.03, 0.22, -4.05, FY + 1.1, 0.62, 0, 0.2, 0);
    b.box('int3', 0.3, 0.03, 0.21, -4.07, FY + 1.13, 0.66, 0, 0.26, 0);

    /* 长条茶桌 */
    const tx = -1.0, tz = 0.85;
    b.box('int1', 2.25, 0.09, 0.86, tx, FY + 0.72, tz);
    b.box('int4', 2.15, 0.05, 0.76, tx, FY + 0.66, tz);
    for (let i = 0; i < 4; i++) {
      const sx = i < 2 ? -1 : 1, sz = i % 2 ? -1 : 1;
      b.box('int4', 0.1, 0.68, 0.1, tx + sx * 1.0, FY + 0.34, tz + sz * 0.34);
    }
    // 条凳
    for (let i = 0; i < 2; i++) {
      const sz = i === 0 ? -0.78 : 0.78;
      b.box('int1', 1.95, 0.07, 0.28, tx, FY + 0.44, tz + sz);
      for (let k = 0; k < 2; k++) {
        b.box('int4', 0.08, 0.42, 0.26, tx + (k ? 0.75 : -0.75), FY + 0.21, tz + sz);
      }
    }
    gaiwan(b, tx - 0.62, FY + 0.77, tz - 0.12, 1);
    gaiwan(b, tx - 0.02, FY + 0.77, tz + 0.16, 1);
    gaiwan(b, tx + 0.62, FY + 0.77, tz - 0.16, 1);
    // 茶壶
    b.sph('int3', 0.13, tx - 0.95, FY + 0.87, tz + 0.2, 1, 0.85, 1);
    b.cyl('int3', 0.05, 0.05, 0.03, 8, tx - 0.95, FY + 0.99, tz + 0.2);
    b.to('int3', 0.018, tx - 0.84, FY + 0.9, tz + 0.2, tx - 0.72, FY + 0.99, tz + 0.26, 6);
    b.torus('int3', 0.07, 0.014, tx - 1.06, FY + 0.88, tz + 0.2, 0, Math.PI / 2, 0);

    /* 炭炉 + 铜壶 */
    const sx = -3.55, sz = -2.3;
    b.cyl('clay', 0.2, 0.23, 0.3, 10, sx, FY + 0.15, sz);
    b.cyl('clay', 0.21, 0.21, 0.03, 10, sx, FY + 0.31, sz);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.09;
      b.box('ink', 0.05, 0.08, 0.05, sx + Math.cos(a) * 0.14, FY + 0.03, sz + Math.sin(a) * 0.14);
    }
    // 铜壶
    b.cyl('brass', 0.15, 0.13, 0.22, 12, sx, FY + 0.44, sz);
    b.sph('brass', 0.15, sx, FY + 0.55, sz, 1, 0.45, 1);
    b.cyl('brass', 0.05, 0.04, 0.04, 8, sx, FY + 0.63, sz);
    b.to('brass', 0.022, sx + 0.12, FY + 0.56, sz, sx + 0.26, FY + 0.66, sz + 0.02, 6);
    b.torus('brass', 0.1, 0.016, sx, FY + 0.64, sz, Math.PI / 2, 0, 0);

    /* 蒸笼 */
    for (let i = 0; i < 3; i++) {
      b.cyl('woodPale', 0.21, 0.21, 0.13, 14, 0.62, FY + 0.07 + i * 0.135, 1.5);
      b.cyl('int2', 0.215, 0.215, 0.018, 14, 0.62, FY + 0.14 + i * 0.135, 1.5);
    }
    b.cyl('int2', 0.215, 0.215, 0.03, 14, 0.62, FY + 0.48, 1.5);
    // 小几
    b.box('int4', 0.6, 0.06, 0.6, 0.62, FY + 0.66, 1.5);
    for (let i = 0; i < 4; i++) {
      b.box('int4', 0.06, 0.64, 0.06, 0.62 + (i < 2 ? -0.24 : 0.24), FY + 0.32, 1.5 + (i % 2 ? -0.24 : 0.24));
    }

    /* 屏风 */
    const px = -2.6, pz = -2.72;
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 0.62;
      const ang = (i - 1) * 0.42;
      b.box('int4', 0.6, 1.95, 0.07, px + off, FY + 0.98, pz + Math.abs(i - 1) * 0.14, 0, ang, 0);
      b.box('int3', 0.44, 1.6, 0.02, px + off, FY + 0.98, pz + Math.abs(i - 1) * 0.14 + 0.04, 0, ang, 0);
      b.box('int4', 0.62, 0.07, 0.1, px + off, FY + 1.95, pz + Math.abs(i - 1) * 0.14, 0, ang, 0);
    }

    /* 楼梯 */
    const stX = 1.35, stZ = -3.0;
    for (let i = 0; i < 11; i++) {
      const y = FY + 0.02 + i * 0.29;
      b.box('int2', 0.3, 0.09, 0.92, stX - i * 0.272, y, stZ);
      b.box('int4', 0.3, 0.28, 0.06, stX - i * 0.272, y - 0.15, stZ + 0.44);
    }
    // 扶手
    b.box('int4', 3.3, 0.1, 0.1, stX - 1.36, FY + 1.95, stZ + 0.48, 0, 0, 0.29);
    for (let i = 0; i < 5; i++) {
      b.box('int4', 0.07, 0.85, 0.07, stX - i * 0.68, FY + 0.5 + i * 0.72, stZ + 0.48);
    }

    /* 挂画 */
    b.box('woodDeep', 0.06, 1.5, 0.78, -4.88, FY + 1.95, 1.15);
    b.box('int3', 0.03, 1.36, 0.66, -4.84, FY + 1.95, 1.15);
    b.cyl('woodDeep', 0.03, 0.03, 0.86, 8, -4.84, FY + 2.66, 1.15, 0, 0, Math.PI / 2);
    b.cyl('woodDeep', 0.03, 0.03, 0.86, 8, -4.84, FY + 1.26, 1.15, 0, 0, Math.PI / 2);

    /* 二层茶座 */
    b.box('int1', 0.52, 0.07, 0.52, 2.3, F2 + 0.62, -0.5);
    for (let i = 0; i < 4; i++) {
      b.box('int4', 0.05, 0.6, 0.05, 2.3 + (i < 2 ? -0.2 : 0.2), F2 + 0.3, -0.5 + (i % 2 ? -0.2 : 0.2));
    }
    gaiwan(b, 2.3, F2 + 0.68, -0.5, 0.85);
    for (let i = 0; i < 2; i++) {
      const zz = -0.5 + (i ? 0.62 : -0.62);
      b.cyl('int2', 0.15, 0.17, 0.06, 10, 2.3, F2 + 0.44, zz);
      b.cyl('int4', 0.18, 0.18, 0.04, 10, 2.3, F2 + 0.41, zz);
    }

    /* 窗台上的猫 */
    const cxp = 1.63, czp = -2.4, cyp = 1.14;
    b.sph('cat', 0.13, cxp, cyp + 0.09, czp, 1.05, 0.82, 1.35);
    b.sph('cat', 0.1, cxp, cyp + 0.1, czp + 0.15, 1, 0.92, 1);
    b.cyl('cat', 0.001, 0.048, 0.075, 4, cxp - 0.055, cyp + 0.17, czp + 0.13, 0, 0, 0.28);
    b.cyl('cat', 0.001, 0.048, 0.075, 4, cxp + 0.055, cyp + 0.17, czp + 0.13, 0, 0, -0.28);
    b.box('catD', 0.07, 0.012, 0.012, cxp - 0.035, cyp + 0.115, czp + 0.238);
    b.box('catD', 0.07, 0.012, 0.012, cxp + 0.035, cyp + 0.115, czp + 0.238);
    b.to('cat', 0.028, cxp + 0.03, cyp + 0.06, czp - 0.1, cxp - 0.05, cyp + 0.05, czp - 0.16, 6);

    /* 顶棚与梁 */
    b.box('int4', 6.5, 0.08, 6.05, -1.6, GF - 0.05, -0.4);
    for (let i = 0; i < 3; i++) {
      b.box('int1', 0.16, 0.2, 6.0, -4.0 + i * 1.55, GF - 0.16, -0.4);
    }
    b.box('int4', 6.4, 0.1, 0.14, -1.6, GF - 0.1, -2.0);
    /* 后墙护墙板 */
    b.box('int1', 0.07, 0.92, 6.0, -4.76, 0.72, -0.4);
    b.box('int4', 0.1, 0.07, 6.0, -4.75, 1.19, -0.4);

    /* 台面小物 */
    b.cyl('int3', 0.05, 0.045, 0.13, 10, -4.1, FY + 1.11, -0.75);
    b.cyl('int3', 0.05, 0.045, 0.13, 10, -4.1, FY + 1.11, -0.9);
    b.cyl('int3', 0.05, 0.045, 0.13, 10, -4.1, FY + 1.11, -1.05);
    b.cyl('woodLight', 0.1, 0.1, 0.16, 10, -3.95, FY + 1.12, 0.45);
    b.cyl('int3', 0.12, 0.1, 0.03, 12, -3.95, FY + 1.21, 0.45);
    /* 竹篮 */
    b.cyl('woodPale', 0.22, 0.17, 0.34, 14, -3.4, FY + 0.17, 1.25);
    b.cyl('woodLight', 0.23, 0.23, 0.04, 14, -3.4, FY + 0.35, 1.25);
    /* 小凳 */
    b.cyl('int2', 0.16, 0.17, 0.06, 10, 0.05, FY + 0.42, -1.35);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.09;
      b.cyl('int4', 0.02, 0.02, 0.42, 5, 0.05 + Math.cos(a) * 0.12, FY + 0.21, -1.35 + Math.sin(a) * 0.12);
    }
    /* 斗笠 */
    b.cyl('woodPale', 0.001, 0.3, 0.16, 14, -2.85, FY + 1.85, -3.3, 0.35, 0, 0);
    /* 墙上茶字 */
    b.box('int4', 0.05, 0.9, 0.9, -4.82, FY + 2.1, -2.4);
    b.box('int3', 0.03, 0.76, 0.76, -4.79, FY + 2.1, -2.4);
    /* 二楼小柜 */
    b.box('int1', 0.7, 0.8, 0.4, -4.3, F2 + 0.4, 1.6);
    b.box('int4', 0.74, 0.06, 0.44, -4.3, F2 + 0.82, 1.6);

    /* 内挂灯 */
    b.cyl('woodDeep', 0.005, 0.005, 0.5, 4, -1.0, GF - 0.25, -0.3);
    b.cyl('red', 0.12, 0.13, 0.22, 12, -1.0, GF - 0.6, -0.3);
    b.cyl('woodDeep', 0.05, 0.05, 0.04, 8, -1.0, GF - 0.47, -0.3);
    b.cyl('woodDeep', 0.05, 0.05, 0.04, 8, -1.0, GF - 0.73, -0.3);

    b.build(g);
    return g;
  }

  /* ================= 露台 ================= */
  function buildTerrace() {
    const g = new T.Group();
    const b = new Builder();
    const X0 = 1.7, X1 = 4.18, Z0 = -2.3, Z1 = 2.7, DY = 0.30;

    // 龙骨 + 甲板
    b.box('woodDeep', X1 - X0, 0.12, Z1 - Z0, (X0 + X1) / 2, DY - 0.12, (Z0 + Z1) / 2);
    for (let i = 0; i < 13; i++) {
      const x = X0 + 0.09 + i * 0.192;
      b.box(i % 2 ? 'woodLight' : 'woodPale', 0.18, 0.06, Z1 - Z0 - 0.06, x, DY - 0.03, (Z0 + Z1) / 2);
    }
    // 台边石
    b.box('stoneL', 0.3, 0.34, Z1 - Z0, X1 - 0.02, 0.12, (Z0 + Z1) / 2);

    // 美人靠
    const RXX = 4.02;
    b.box('woodDark', 0.14, 0.16, 4.7, RXX, DY + 0.92, 0.2);
    b.box('woodDark', 0.12, 0.9, 0.12, RXX, DY + 0.45, -2.15);
    b.box('woodDark', 0.12, 0.9, 0.12, RXX, DY + 0.45, 2.55);
    for (let i = 0; i <= 18; i++) {
      b.box('woodDark', 0.05, 0.9, 0.05, RXX, DY + 0.45, -2.15 + i * 4.7 / 18);
    }
    // 坐板
    b.box('woodWarm', 0.44, 0.07, 4.6, RXX - 0.34, DY + 0.42, 0.2);
    for (let i = 0; i < 5; i++) {
      b.box('woodDark', 0.08, 0.42, 0.08, RXX - 0.34, DY + 0.21, -2.1 + i * 1.15);
    }
    // 露台柱
    b.box('woodDark', 0.16, 2.9, 0.16, RXX, DY + 1.45, -2.2);
    b.box('woodDark', 0.16, 2.9, 0.16, RXX, DY + 1.45, 2.62);
    b.box('woodDark', 0.14, 0.14, 4.9, RXX, DY + 2.9, 0.2);

    // 下水石阶 + 河埠头
    for (let i = 0; i < 4; i++) {
      b.box('stoneL', 0.42, 0.16, 0.9, 4.4 + i * 0.06, -0.02 - i * 0.14, 1.75);
    }
    b.box('stone', 0.5, 0.5, 1.1, 4.55, -0.55, 1.75);
    // 系船石
    b.box('stone', 0.24, 0.34, 0.24, 4.32, 0.16, 1.05);
    b.cyl('stoneD', 0.05, 0.05, 0.3, 8, 4.32, 0.3, 1.05, 0, 0, Math.PI / 2);

    // 入口台阶
    for (let i = 0; i < 2; i++) {
      b.box('stoneL', 1.6 - i * 0.35, 0.1, 0.34, 3.2, DY - 0.06 - i * 0.1, 2.86 + i * 0.32);
    }

    // 门口水缸
    b.cyl('stoneD', 0.42, 0.34, 0.56, 16, 2.0, 0.58, -1.62);
    b.cyl('stoneL', 0.43, 0.43, 0.07, 16, 2.0, 0.87, -1.62);
    b.cyl('tile', 0.38, 0.38, 0.02, 16, 2.0, 0.8, -1.62);
    // 荷叶
    for (let i = 0; i < 4; i++) {
      const a = i * 1.6 + 0.3;
      b.sph('leaf2', 0.15, 2.0 + Math.cos(a) * 0.18, 0.84, -1.62 + Math.sin(a) * 0.18, 1, 0.16, 1);
    }
    b.sph('leaf1', 0.1, 2.08, 0.9, -1.5, 1, 0.18, 1);
    // 荷苞
    b.sph('red', 0.045, 2.13, 0.94, -1.5, 0.8, 1.3, 0.8);

    b.build(g);
    return g;
  }

  /* ================= 柳树 ================= */
  const willows = [];
  function hangingStrands(s) {
    const grp = new T.Group();
    const b = new Builder();
    // 蓬松树冠（细碎叶簇，避免出现扁球）
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * 6.2832;
      const r = Math.random() * 0.44 * s;
      const yy = 0.22 * s - r * 0.45 + Math.random() * 0.18 * s;
      b.box(i % 3 ? 'leaf1' : (i % 5 ? 'leaf2' : 'leaf3'),
        0.075 * s, 0.11 * s, 0.055 * s,
        Math.cos(a) * r, yy, Math.sin(a) * r,
        Math.random() * 0.9, Math.random() * 3.14, Math.random() * 0.9);
    }
    // 垂条
    for (let k = 0; k < 9; k++) {
      const a = k * 0.7 + Math.random() * 0.35;
      const rad = 0.08 + Math.random() * 0.3;
      const ox = Math.cos(a) * rad * s;
      const oz = Math.sin(a) * rad * s;
      const len = (1.15 + Math.random() * 1.15) * s;
      const steps = 20;
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const sway = Math.sin(t * 1.5) * 0.2 * s + t * t * 0.18 * s;
        const key = i % 3 === 0 ? 'leaf2' : (i % 3 === 1 ? 'leaf1' : 'leaf3');
        b.box(key, 0.024, 0.215 * s, 0.016,
          ox + Math.cos(a) * sway,
          -0.04 * s - t * len,
          oz + Math.sin(a) * sway,
          (Math.random() - 0.5) * 0.1, Math.random() * 3.1, (Math.random() - 0.5) * 0.12);
      }
    }
    b.build(grp, { noOutline: ['leaf1', 'leaf2', 'leaf3'] });
    return grp;
  }

  function willow(px, pz, s) {
    const g = new T.Group();
    g.position.set(px, 0, pz);
    const b = new Builder();
    let y = 0, r = 0.23 * s, cx = 0, cz = 0;
    for (let i = 0; i < 5; i++) {
      const h = 0.62 * s;
      b.to('bark', r * 0.85, cx, y, cz, cx + 0.05 * s, y + h, cz - 0.02 * s, 7);
      y += h; cx += 0.05 * s; cz -= 0.02 * s; r *= 0.87;
    }
    b.sph('bark', 0.27 * s, 0, 0.05, 0, 1, 0.45, 1);

    const N = 7;
    const tips = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + 0.35;
      const len = (0.55 + Math.random() * 0.45) * s;
      const tx = cx + Math.cos(a) * len;
      const ty = y + 0.05 * s + Math.random() * 0.5 * s;
      const tz = cz + Math.sin(a) * len;
      b.to('bark', 0.04 * s, cx, y - 0.3 * s, cz, tx, ty, tz, 5);
      tips.push([tx, ty, tz]);
    }
    b.build(g, { noOutline: [] });

    for (let i = 0; i < tips.length; i++) {
      const hg = hangingStrands(s);
      hg.position.set(tips[i][0], tips[i][1], tips[i][2]);
      hg.userData.ph = Math.random() * 6.28;
      g.add(hg);
      willows.push(hg);
    }
    return g;
  }

  /* ================= 乌篷船 ================= */
  let boatGroup = null;
  function buildBoat(px, pz, rotY) {
    const g = new T.Group();
    g.position.set(px, -0.03, pz);
    g.rotation.y = rotY;
    const b = new Builder();

    const hull = new T.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    hull.scale(0.5, 0.42, 1.55);
    b.geo ? 0 : 0;
    b.add('hull', hull.clone().translate(0, 0, 0));
    b.box('woodDeep', 0.82, 0.06, 2.5, 0, 0.02, 0);
    b.box('woodDeep', 0.9, 0.1, 0.16, 0, 0.03, -1.1);
    b.box('woodDeep', 0.9, 0.1, 0.16, 0, 0.03, 1.1);
    // 乌篷
    b.cyl('ink', 0.42, 0.42, 1.25, 14, 0, 0.12, -0.1, Math.PI / 2, 0, 0);
    b.cyl('woodDeep', 0.44, 0.44, 0.05, 14, 0, 0.12, 0.5, Math.PI / 2, 0, 0);
    b.cyl('woodDeep', 0.44, 0.44, 0.05, 14, 0, 0.12, -0.7, Math.PI / 2, 0, 0);
    // 橹
    b.to('woodWarm', 0.03, -0.1, 0.16, -1.15, 0.42, 0.3, -1.95, 6);
    b.box('woodWarm', 0.18, 0.03, 0.12, 0.3, 0.16, -1.2);
    // 竹篙
    b.to('bambooS', 0.025, 0.25, 0.1, 1.0, 0.05, 0.12, -0.9, 5);
    // 船头小凳
    b.box('woodLight', 0.26, 0.04, 0.2, 0, 0.1, 0.95);

    b.build(g, { noOutline: ['ink'] });
    return g;
  }

  /* ================= 石拱桥 ================= */
  function buildBridge() {
    const g = new T.Group();
    const b = new Builder();
    const x0 = 3.35, x1 = 8.45, N = 12, W = 1.75, ZC = -6.25;
    const yAt = function (t) { return 0.08 + 1.52 * Math.sin(Math.PI * t); };
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N;
      const ax = x0 + (x1 - x0) * t0, ay = yAt(t0);
      const bx = x0 + (x1 - x0) * t1, by = yAt(t1);
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const len = Math.hypot(bx - ax, by - ay) * 1.08;
      const ang = Math.atan2(by - ay, bx - ax);
      b.box('stone', len, 0.2, W, mx, my, ZC, 0, 0, ang);
      b.box('stone', len, 0.46, W * 0.97, mx, my - 0.33, ZC, 0, 0, ang);
      for (let s = -1; s <= 1; s += 2) {
        b.box('stone', len * 1.02, 0.32, 0.13, mx, my + 0.26, ZC + s * (W / 2 - 0.07), 0, 0, ang);
        b.box('stoneL', len * 1.02, 0.08, 0.2, mx, my + 0.45, ZC + s * (W / 2 - 0.07), 0, 0, ang);
      }
    }
    // 台阶
    for (let i = 0; i < 2; i++) {
      b.box('stoneL', 0.5, 0.14, W, x0 - 0.28 - i * 0.3, 0.06 + i * 0.05, ZC);
      b.box('stoneL', 0.5, 0.14, W, x1 + 0.28 + i * 0.3, 0.06 + i * 0.05, ZC);
    }
    // 桥头石
    b.box('stone', 0.4, 0.62, 0.4, x0 + 0.1, 0.2, ZC - W / 2 - 0.05);
    b.box('stone', 0.4, 0.62, 0.4, x1 - 0.1, 0.2, ZC - W / 2 - 0.05);
    b.build(g);
    return g;
  }

  /* ================= 植物 / 杂项 ================= */
  function bamboo(px, pz, s) {
    const g = new T.Group();
    g.position.set(px, 0, pz);
    const b = new Builder();
    b.box('stoneD', 1.0, 0.28, 1.0, 0, 0.1, 0);
    for (let i = 0; i < 7; i++) {
      const a = i * 1.05, r = 0.18 + (i % 3) * 0.1;
      const bx = Math.cos(a) * r * s, bz = Math.sin(a) * r * s;
      const h = (1.5 + (i % 4) * 0.45) * s;
      b.to('bambooS', 0.028 * s, bx, 0.2, bz, bx + 0.06 * s, 0.2 + h, bz + 0.03 * s, 5);
      for (let k = 0; k < 5; k++) {
        const t = 0.5 + k * 0.12;
        const lx = bx + Math.cos(a + k) * 0.22 * s;
        const lz = bz + Math.sin(a + k) * 0.22 * s;
        b.box(k % 2 ? 'leaf1' : 'leaf3', 0.34 * s, 0.014, 0.06 * s,
          lx, 0.2 + h * t, lz, 0, a + k, 0.25);
      }
    }
    b.build(g, { noOutline: ['leaf1', 'leaf3'] });
    return g;
  }

  function pot(px, pz) {
    const g = new T.Group();
    const b = new Builder();
    b.cyl('clay', 0.16, 0.12, 0.26, 12, px, 0.13, pz);
    b.cyl('clay', 0.175, 0.175, 0.04, 12, px, 0.27, pz);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1;
      b.box('leaf2', 0.06, 0.34, 0.02, px + Math.cos(a) * 0.07, 0.44, pz + Math.sin(a) * 0.07, Math.cos(a) * 0.2, a, Math.sin(a) * 0.2);
      b.sph('leaf1', 0.06, px + Math.cos(a) * 0.11, 0.62, pz + Math.sin(a) * 0.11, 1, 1.4, 1);
    }
    b.build(g, { noOutline: ['leaf1', 'leaf2'] });
    return g;
  }

  /* ================= 便利店（现代商业形制） ================= */
  TEX.shopSign = canvasTex(1200, 120, function (c, w, h) {
    c.fillStyle = '#f8f9f5'; c.fillRect(0, 0, w, h);
    // 左侧绿色标识块
    c.fillStyle = '#1f6b4a'; c.fillRect(0, 0, 132, h);
    c.fillStyle = '#ffffff';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 62px Arial, Helvetica, sans-serif';
    c.fillText('24', 66, 54);
    c.font = '600 17px Arial, Helvetica, sans-serif';
    c.fillText('HOURS', 66, 92);
    // 店名
    c.textAlign = 'left';
    c.fillStyle = '#1f6b4a';
    c.font = '700 76px "Microsoft YaHei", "PingFang SC", SimHei, sans-serif';
    c.fillText(cfg(PS.shopName, '拾光便利'), 166, 62);
    // 副标题
    c.fillStyle = '#7c8b84';
    c.font = '600 19px Arial, Helvetica, sans-serif';
    c.fillText('SHIGUANG  CONVENIENCE  STORE', 172, 97);
    // 右侧小字
    c.textAlign = 'right';
    c.fillStyle = '#1f6b4a';
    c.font = '700 26px "Microsoft YaHei", sans-serif';
    c.fillText('热食 · 咖啡 · 关东煮', w - 24, 40);
    c.fillStyle = '#b9a06a';
    c.font = '600 18px Arial, sans-serif';
    c.fillText('OPEN  24  HOURS', w - 24, 74);
    // 橙色条
    c.fillStyle = '#e8791f'; c.fillRect(0, h - 13, w, 13);
  });

  TEX.shopSide = canvasTex(320, 320, function (c, w, h) {
    c.fillStyle = '#1f6b4a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#f8f9f5'; c.lineWidth = 9;
    c.strokeRect(15, 15, w - 30, h - 30);
    c.fillStyle = '#ffffff';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 118px "Microsoft YaHei", SimHei, sans-serif';
    c.fillText('便利', w / 2, 128);
    c.fillStyle = '#e8791f';
    c.fillRect(58, 194, w - 116, 5);
    c.fillStyle = '#ffffff';
    c.font = '700 40px Arial, sans-serif';
    c.fillText('24H', w / 2, 238);
    c.font = '600 17px "Microsoft YaHei", sans-serif';
    c.fillText('拾 光 便 利', w / 2, 278);
  });

  TEX.shopPoster = canvasTex(380, 540, function (c, w, h) {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#f5a623'); gr.addColorStop(1, '#e2611a');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.16)';
    c.beginPath(); c.arc(w * 0.78, h * 0.20, 74, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(w * 0.22, h * 0.34, 34, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 62px "Microsoft YaHei", SimHei, sans-serif';
    c.fillText('夏日冰饮', w / 2, 108);
    c.font = '600 20px Arial, sans-serif';
    c.fillText('SUMMER  COLD  DRINK', w / 2, 158);
    c.fillStyle = '#ffe9c9';
    c.fillRect(52, 190, w - 104, 4);
    c.fillStyle = '#ffffff';
    c.font = '700 96px Arial, sans-serif';
    c.fillText('¥5.9', w / 2, 288);
    c.font = '600 24px "Microsoft YaHei", sans-serif';
    c.fillText('第 二 件 半 价', w / 2, 360);
    c.fillStyle = '#1f6b4a';
    c.fillRect(60, 404, w - 120, 62);
    c.fillStyle = '#ffffff';
    c.font = '700 30px "Microsoft YaHei", sans-serif';
    c.fillText('限 时 三 天', w / 2, 436);
    c.fillStyle = '#ffe9c9';
    c.font = '600 17px Arial, sans-serif';
    c.fillText('07.12 — 07.14', w / 2, 496);
  });

  // 第二款海报：热食便当，避免同一张海报在店里重复三次
  TEX.shopPoster2 = canvasTex(380, 540, function (c, w, h) {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#1f6b52'); gr.addColorStop(1, '#0f3f30');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.10)';
    c.beginPath(); c.arc(w * 0.20, h * 0.16, 90, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(w * 0.82, h * 0.62, 110, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffe6a8';
    c.fillRect(0, 0, w, 6); c.fillRect(0, h - 6, w, 6);
    c.fillStyle = '#ffffff';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 58px "Microsoft YaHei", SimHei, sans-serif';
    c.fillText('现煮热食', w / 2, 112);
    c.font = '600 19px Arial, sans-serif';
    c.fillText('HOT  SNACK  BAR', w / 2, 160);
    c.fillStyle = 'rgba(255,230,168,0.55)';
    c.fillRect(52, 192, w - 104, 3);
    c.fillStyle = '#ffe6a8';
    c.font = '700 34px "Microsoft YaHei", sans-serif';
    c.fillText('关 东 煮 · 茶 叶 蛋', w / 2, 244);
    c.fillStyle = '#ffffff';
    c.font = '700 92px Arial, sans-serif';
    c.fillText('¥3', w / 2, 330);
    c.font = '600 24px "Microsoft YaHei", sans-serif';
    c.fillText('任 选 三 串', w / 2, 392);
    c.fillStyle = '#ffe6a8';
    c.fillRect(56, 430, w - 112, 56);
    c.fillStyle = '#0f3f30';
    c.font = '700 30px "Microsoft YaHei", sans-serif';
    c.fillText('全 天 供 应', w / 2, 459);
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.font = '600 17px Arial, sans-serif';
    c.fillText('ALL  DAY  FRESH', w / 2, 508);
  });

  const SX0 = -5.15, SX1 = 1.05, SZ0 = -3.55, SZ1 = 4.55;
  const SY = 0.14, SH = 3.38;
  const ST_CX = (SX0 + SX1) / 2, ST_CZ = (SZ0 + SZ1) / 2;

  const GLASS_MAT = new T.MeshToonMaterial({
    color: 0xdcecee, transparent: true, opacity: 0.082,
    depthWrite: false, side: T.DoubleSide, gradientMap: GRAD
  });
  const GLARE_MAT = new T.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.09,
    blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide
  });

  function pane(g, w, h, x, y, z, ry) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), GLASS_MAT);
    m.position.set(x, y, z);
    m.rotation.y = ry || 0;
    m.renderOrder = 3;
    g.add(m);
    return m;
  }
  function glare(g, w, h, x, y, z, ry, rz) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), GLARE_MAT);
    m.position.set(x, y, z);
    m.rotation.set(0, ry || 0, rz || 0);
    m.renderOrder = 4;
    g.add(m);
  }

  /* ---------- 场地 ---------- */
  function buildStoreBase() {
    const g = new T.Group();
    const b = new Builder();

    /* 展台剖切 */
    b.box('sbBase2', 18.2, 0.30, 18.2, 0, -1.82, 0);
    b.box('sbBase', 17.6, 0.16, 17.6, 0, -1.58, 0);
    b.box('stoneD', 17.0, 1.50, 17.0, 0, -0.75, 0);

    /* 人行道（预制砖） */
    for (let x = 1.06; x < 3.10; x += 0.62) {
      for (let z = -8.40; z < 8.40; z += 0.62) {
        const m = (Math.round(x * 10) + Math.round(z * 10)) % 5;
        b.box(m === 0 ? 'walk3' : (m === 2 ? 'walk2' : 'walk'),
          0.58, 0.15, 0.58, x + 0.30, 0.075, z + 0.30);
      }
    }
    /* 路缘石 */
    b.box('stoneL', 0.18, 0.20, 17.0, 3.22, 0.06, 0);
    b.box('stoneD', 0.10, 0.10, 17.0, 3.34, 0.03, 0);

    /* 沥青停车场 */
    b.box('asphalt', 5.20, 0.07, 17.0, 5.85, 0.035, 0);
    /* 车位线 */
    for (let z = -6.2; z <= 6.21; z += 2.6) {
      b.box('line', 4.85, 0.02, 0.11, 5.92, 0.076, z);
    }
    b.box('line', 0.11, 0.02, 12.5, 8.30, 0.076, 0);
    /* 挡车器 */
    [-4.9, -2.3, 0.3, 2.9, 5.5].forEach(function (zz) {
      b.box('prod5', 0.16, 0.13, 1.30, 4.02, 0.10, zz);
      b.box('metalD', 0.10, 0.05, 1.36, 4.02, 0.10, zz);
    });

    /* 右山墙前铺装：把裸露的展台面接成小广场 */
    for (let x = -5.20; x < 0.80; x += 0.62) {
      for (let z = 4.62; z < 7.90; z += 0.62) {
        const m = (Math.round(x * 10) + Math.round(z * 10)) % 5;
        b.box(m === 0 ? 'walk3' : (m === 2 ? 'walk2' : 'walk'),
          0.58, 0.15, 0.58, x + 0.30, 0.075, z + 0.30);
      }
    }
    b.box('stoneL', 0.22, 0.16, 3.90, 0.94, 0.08, 6.44);   // 与正面前铺装接缝
    b.box('stoneL', 0.24, 0.16, 3.90, -5.34, 0.08, 6.44);  // 与沿墙石板路接缝
    b.box('stoneL', 6.40, 0.16, 0.24, -2.12, 0.08, 8.40);  // 外缘收边

    /* 建筑后巷 */
    b.box('asphalt', 6.40, 0.06, 4.60, -2.10, 0.03, -6.15);
    /* 后侧绿化带 + 沿墙石板路 */
    b.box('grass', 2.24, 0.10, 17.0, -7.30, 0.05, 0);
    b.box('stoneL', 0.14, 0.16, 17.0, -8.42, 0.06, 0);
    b.box('stoneL', 0.14, 0.16, 17.0, -6.16, 0.06, 0);
    for (let z = -8.30; z < 8.30; z += 0.72) {
      b.box('walk2', 0.62, 0.09, 0.66, -5.79, 0.045, z + 0.33);
    }
    b.box('stoneL', 0.10, 0.14, 17.0, -5.46, 0.05, 0);

    /* 井盖 */
    b.cyl('metalD', 0.34, 0.34, 0.03, 16, 4.60, 0.08, -5.10);
    b.cyl('metalD', 0.30, 0.30, 0.03, 16, -4.10, 0.07, -6.60);
    /* 排水沟 */
    for (let z = -8.2; z < 8.2; z += 0.55) {
      b.box('metalD', 0.05, 0.03, 0.44, 3.38, 0.085, z);
    }

    /* 绿化带灌木 */
    const bush = [[-6.68, -7.6, 0.31], [-7.92, -6.5, 0.26], [-6.32, -5.6, 0.23],
      [-7.55, -4.6, 0.28], [-6.74, -3.4, 0.25], [-7.98, -2.4, 0.22],
      [-6.40, -1.5, 0.30], [-7.72, -0.2, 0.25], [-6.60, 0.9, 0.23],
      [-7.94, 2.1, 0.29], [-6.30, 3.1, 0.26], [-7.60, 4.4, 0.24],
      [-6.66, 5.5, 0.30], [-7.88, 6.6, 0.25], [-6.36, 7.6, 0.22]];
    for (let i = 0; i < bush.length; i++) {
      const p = bush[i];
      b.sph(i % 2 ? 'grass2' : 'leaf2', p[2], p[0], 0.14 + p[2] * 0.38, p[1], 1.3, 0.82, 1.3);
      b.sph('leaf1', p[2] * 0.60, p[0] + 0.15, 0.20 + p[2] * 0.45, p[1] - 0.13, 1.2, 0.78, 1.2);
      b.sph('leaf3', p[2] * 0.42, p[0] - 0.16, 0.16 + p[2] * 0.5, p[1] + 0.12, 1.15, 0.75, 1.15);
    }
    /* 树 */
    [[-7.30, -4.40, 1.0], [-7.35, 3.80, 1.08]].forEach(function (t) {
      const S = t[2];
      b.cyl('bark', 0.10 * S, 0.17 * S, 2.35, 7, t[0], 1.18, t[1]);
      b.to('bark', 0.055, t[0], 2.05, t[1], t[0] + 0.34, 2.75, t[1] + 0.18, 5);
      b.to('bark', 0.05, t[0], 2.05, t[1], t[0] - 0.30, 2.70, t[1] - 0.22, 5);
      for (let k = 0; k < 26; k++) {
        const a = k * 2.399;
        const r = (0.20 + (k % 5) * 0.17) * S;
        b.sph(k % 3 === 0 ? 'leaf2' : (k % 3 === 1 ? 'leaf1' : 'leaf3'),
          (0.30 + (k % 4) * 0.075) * S,
          t[0] + Math.cos(a) * r, 2.62 + Math.sin(k * 1.31) * 0.42 * S, t[1] + Math.sin(a) * r,
          1.25, 0.82, 1.25);
      }
    });

    b.build(g);
    return g;
  }

  /* ---------- 建筑 ---------- */
  function buildStore() {
    const g = new T.Group();
    const b = new Builder();
    const W = SZ1 - SZ0;

    /* ===== 屋顶 ===== */
    b.box('sbRoof', SX1 - SX0 + 0.34, 0.20, W + 0.34, ST_CX, SH + 0.10, ST_CZ);
    for (let i = 1; i < 4; i++) {
      b.box('sbTrim2', 0.035, 0.012, W + 0.24, SX0 + 0.1 + i * 1.5, SH + 0.206, ST_CZ);
    }
    b.box('sbTrim2', SX1 - SX0 + 0.24, 0.012, 0.035, ST_CX, SH + 0.206, SZ0 + 1.9);
    b.box('sbTrim', 0.66, 0.10, 0.66, -0.55, SH + 0.25, 3.05);
    b.box('sbRoof', 0.54, 0.06, 0.54, -0.55, SH + 0.31, 3.05);
    b.box('sbTrim', SX1 - SX0 + 0.42, 0.09, 0.15, ST_CX, SH + 0.235, SZ0 - 0.135);
    b.box('sbTrim', SX1 - SX0 + 0.42, 0.09, 0.15, ST_CX, SH + 0.235, SZ1 + 0.135);
    b.box('sbTrim', 0.15, 0.09, W + 0.42, SX1 + 0.135, SH + 0.235, ST_CZ);
    b.box('sbTrim', 0.15, 0.09, W + 0.42, SX0 - 0.135, SH + 0.235, ST_CZ);
    // 女儿墙压顶
    b.box('sbRoof', 0.14, 0.20, W + 0.42, SX1 + 0.10, SH + 0.32, ST_CZ);
    b.box('sbRoof', SX1 - SX0 + 0.42, 0.20, 0.14, ST_CX, SH + 0.32, SZ0 - 0.14);
    b.box('sbRoof', SX1 - SX0 + 0.42, 0.20, 0.14, ST_CX, SH + 0.32, SZ1 + 0.14);
    // 屋顶排风机组
    [[-3.6, 0.1], [-1.4, 2.6], [0.0, -1.6]].forEach(function (p) {
      b.box('metalD', 0.62, 0.26, 0.52, p[0], SH + 0.33, p[1]);
      b.cyl('metal', 0.20, 0.20, 0.05, 12, p[0], SH + 0.48, p[1]);
    });

    /* ===== 墙体 ===== */
    // 后墙
    b.box('wallWhite', 0.28, SH, W, SX0 + 0.14, SH / 2, ST_CZ);
    // 左山墙
    b.box('wallWhite', SX1 - SX0, SH, 0.28, ST_CX, SH / 2, SZ0 + 0.14);
    // 右山墙
    b.box('wallWhite', SX1 - SX0, SH, 0.28, ST_CX, SH / 2, SZ1 - 0.14);
    // 前脸两端墙垛
    b.box('wallWhite', 0.28, SH, 0.52, SX1 - 0.14, SH / 2, SZ0 + 0.26);
    b.box('wallWhite', 0.28, SH, 0.52, SX1 - 0.14, SH / 2, SZ1 - 0.26);
    // 墙裙
    b.box('sbTrim', 0.10, 0.34, W, SX1 + 0.02, 0.17, ST_CZ);
    b.box('sbTrim', 0.10, 0.26, SZ1 - SZ0, SX1 + 0.02, SH - 0.13, ST_CZ);

    /* 正立面：门头梁 + 竖框 */
    b.box('sbTrim', 0.13, 0.20, W - 1.0, SX1, 2.98, ST_CZ);
    const mull = [-3.05, -1.62, -0.18, 1.26, 1.55, 3.15, 3.62, 4.05];
    for (let i = 0; i < mull.length; i++) {
      b.box('sbTrim', 0.075, 2.68, 0.07, SX1, 0.34 + 2.68 / 2, mull[i]);
    }
    // 门洞两侧包边
    b.box('sbTrim', 0.10, 2.75, 0.09, SX1, 1.38, 1.55);
    b.box('sbTrim', 0.10, 2.75, 0.09, SX1, 1.38, 3.15);
    // 门楣
    b.box('sbTrim', 0.10, 0.14, 1.70, SX1, 2.72, 2.35);

    /* 玻璃 */
    pane(g, 4.60, 2.62, 1.03, 1.72, -0.75, Math.PI / 2);
    pane(g, 0.90, 2.62, 1.03, 1.72, 3.58, Math.PI / 2);
    // 自动门两扇滑开，门洞敞着
    pane(g, 0.72, 2.55, 0.90, 1.42, 1.19, Math.PI / 2);
    pane(g, 0.72, 2.55, 0.90, 1.42, 3.51, Math.PI / 2);
    // 门扇边框
    [1.19, 3.51].forEach(function (zz) {
      b.box('sbTrim', 0.06, 2.58, 0.05, 0.90, 1.42, zz - 0.36);
      b.box('sbTrim', 0.06, 2.58, 0.05, 0.90, 1.42, zz + 0.36);
      b.box('sbTrim', 0.06, 0.05, 0.74, 0.90, 2.70, zz);
      b.box('sbTrim', 0.06, 0.05, 0.74, 0.90, 0.15, zz);
    });
    // 反光条
    glare(g, 3.0, 0.16, 1.04, 2.20, -1.30, Math.PI / 2, 0.62);
    glare(g, 0.6, 0.12, 1.04, 2.05, 3.58, Math.PI / 2, -0.55);

    /* 门口地垫 + 台阶 */
    b.box('matDark', 1.05, 0.04, 1.62, 1.60, 0.155, 2.35);
    b.box('stoneL', 0.30, 0.06, 1.90, 1.16, 0.03, 2.35);

    /* ===== 雨棚 ===== */
    b.box('sbTrim', 1.30, 0.10, 2.30, 1.82, 2.86, 2.35);
    b.box('sbRoof', 1.30, 0.05, 2.30, 1.82, 2.93, 2.35);
    b.box('tube', 1.16, 0.05, 0.09, 1.78, 2.80, 1.28);
    b.box('tube', 1.16, 0.05, 0.09, 1.78, 2.80, 3.42);
    [-1, 1].forEach(function (s) {
      const zz = 2.35 + s * 1.02;
      b.to('sbTrim2', 0.018, 1.12, 3.18, zz, 2.44, 2.90, zz, 4);
    });

    /* ===== 招牌灯箱 ===== */
    b.box('sbTrim', 0.44, 0.92, W + 0.06, 1.20, 3.86, ST_CZ);
    b.box('sbTrim2', 0.50, 0.06, W + 0.12, 1.20, 4.35, ST_CZ);
    // 灯箱面板（纹理）
    const signMat = new T.MeshBasicMaterial({ map: TEX.shopSign });
    const sign = new T.Mesh(new T.PlaneGeometry(W - 0.10, 0.80), signMat);
    sign.position.set(1.425, 3.86, ST_CZ);
    sign.rotation.y = Math.PI / 2;
    g.add(sign);
    // 侧招
    const sideMat = new T.MeshBasicMaterial({ map: TEX.shopSide, side: T.DoubleSide });
    const side = new T.Mesh(new T.PlaneGeometry(0.78, 0.78), sideMat);
    side.position.set(0.06, 3.86, SZ1 + 0.30);
    side.rotation.y = 0;
    g.add(side);
    b.box('sbTrim', 0.88, 0.88, 0.10, 0.06, 3.86, SZ1 + 0.24);
    b.box('sbTrim2', 0.94, 0.05, 0.16, 0.06, 4.30, SZ1 + 0.24);

    /* ===== 室内：地坪 ===== */
    b.box('floorIn', SX1 - SX0 - 0.20, 0.12, SZ1 - SZ0 - 0.20, ST_CX, SY - 0.06, ST_CZ);
    // 地砖缝
    for (let x = SX0 + 0.60; x < SX1 - 0.15; x += 0.92) {
      b.box('floorLine', 0.018, 0.012, SZ1 - SZ0 - 0.30, x, SY + 0.004, ST_CZ);
    }
    for (let z = SZ0 + 0.60; z < SZ1 - 0.15; z += 0.92) {
      b.box('floorLine', SX1 - SX0 - 0.30, 0.012, 0.018, ST_CX, SY + 0.004, z);
    }

    /* ===== 室内：墙裙 ===== */
    // 只在右山墙内侧做，正面玻璃要保持通透（这里以前多画了一道横墙，把橱窗下半截全挡了）
    b.box('shelfD', SX1 - SX0 - 0.22, 0.86, 0.06, ST_CX, SY + 0.43, SZ1 - 0.20);
    b.box('sbTrim2', SX1 - SX0 - 0.22, 0.05, 0.09, ST_CX, SY + 0.87, SZ1 - 0.20);

    /* ===== 室内：吊顶 / 灯带 ===== */
    b.box('ceil', SX1 - SX0 - 0.22, 0.08, SZ1 - SZ0 - 0.22, ST_CX, SH - 0.06, ST_CZ);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 4; j++) {
        b.box('tube', 0.16, 0.05, 1.46, -4.35 + i * 2.55, SH - 0.13, -2.55 + j * 1.75);
      }
    }

    /* ===== 室内：后墙冷藏柜 ===== */
    (function () {
      const FX0 = SX0 + 0.30, FX1 = SX0 + 1.08;
      const FZ0 = 0.18, FZ1 = 3.52;
      const H = 2.36, doors = 3;
      const dz = (FZ1 - FZ0) / doors;
      // 背板
      b.box('fridgeIn', 0.10, H - 0.34, FZ1 - FZ0, FX0 + 0.05, SY + (H - 0.34) / 2, (FZ0 + FZ1) / 2);
      // 顶板 / 底板 / 侧板（深色框）
      b.box('sbTrim', FX1 - FX0, 0.20, FZ1 - FZ0, (FX0 + FX1) / 2, SY + H - 0.10, (FZ0 + FZ1) / 2);
      b.box('sbTrim', FX1 - FX0, 0.30, FZ1 - FZ0, (FX0 + FX1) / 2, SY + 0.15, (FZ0 + FZ1) / 2);
      b.box('sbTrim', FX1 - FX0, H, 0.12, (FX0 + FX1) / 2, SY + H / 2, FZ0 + 0.06);
      b.box('sbTrim', FX1 - FX0, H, 0.12, (FX0 + FX1) / 2, SY + H / 2, FZ1 - 0.06);
      // 层板 / 灯带 / 饮料
      for (let s2 = 0; s2 < 4; s2++) {
        const sy = SY + 0.42 + s2 * 0.44;
        b.box('shelfD', FX1 - FX0 - 0.18, 0.03, FZ1 - FZ0 - 0.16, (FX0 + FX1) / 2, sy, (FZ0 + FZ1) / 2);
        b.box('tube', 0.05, 0.025, FZ1 - FZ0 - 0.28, FX1 - 0.15, sy + 0.33, (FZ0 + FZ1) / 2);
        for (let d = 0; d < doors; d++) {
          for (let k = 0; k < 5; k++) {
            const zz = FZ0 + 0.14 + d * dz + 0.13 + k * (dz - 0.26) / 4;
            const hh = 0.16 + ((d + s2 + k) % 3) * 0.020;
            b.cyl('prod' + (1 + ((d * 3 + (k > 2 ? 2 : 0)) % 8)), 0.038, 0.041, hh, 7,
              FX0 + 0.44, sy + 0.035 + hh / 2, zz);
          }
        }
      }
      // 玻璃门与门框
      for (let d = 0; d < doors; d++) {
        const z0 = FZ0 + d * dz;
        pane(g, dz - 0.08, H - 0.54, FX1 + 0.01, SY + (H - 0.28) / 2, z0 + dz / 2, Math.PI / 2);
        b.box('sbTrim', 0.06, H - 0.44, 0.05, FX1 + 0.02, SY + (H - 0.26) / 2, z0 + 0.03);
        b.box('metal', 0.048, 0.42, 0.032, FX1 + 0.07, SY + 1.02, z0 + dz * 0.85);
      }
      b.box('sbTrim', 0.06, H - 0.44, 0.05, FX1 + 0.02, SY + (H - 0.26) / 2, FZ1 - 0.03);
      // 柜顶灯箱
      b.box('tube', 0.10, 0.09, FZ1 - FZ0 - 0.22, FX1 - 0.15, SY + H + 0.05, (FZ0 + FZ1) / 2);
      b.box('sbTrim', 0.16, 0.26, FZ1 - FZ0, (FX0 + FX1) / 2, SY + H + 0.10, (FZ0 + FZ1) / 2);
    })();

    /* ===== 室内：中岛货架 ×2 ===== */
    function islandShelf(zc, seed) {
      const X0 = -3.74, X1 = -0.54, ZW = 0.92;
      b.box('shelfD', X1 - X0, 0.14, ZW, (X0 + X1) / 2, SY + 0.07, zc);
      [-1, 1].forEach(function (s) {
        const zz = zc + s * (ZW / 2 - 0.04);
        for (let i = 0; i < 4; i++) {
          b.box('shelfD', X1 - X0 - 0.06, 0.045, 0.40, (X0 + X1) / 2, SY + 0.34 + i * 0.31, zz);
        }
      });
      // 立柱与端头
      [-1, 1].forEach(function (s) {
        b.box('shelfD', 0.07, 1.30, ZW - 0.04, X0 + 0.05, SY + 0.65, zc);
        b.box('shelfD', 0.07, 1.30, ZW - 0.04, X1 - 0.05, SY + 0.65, zc);
      });
      // 中段立柱（3.2 米长没有支撑，层板会看着像浮空的板子）
      [0.34, 0.68].forEach(function (t) {
        b.box('metalD', 0.05, 1.26, ZW - 0.06, X0 + (X1 - X0) * t, SY + 0.63, zc);
      });
      b.box('shelfD', X1 - X0, 0.06, 0.10, (X0 + X1) / 2, SY + 1.30, zc - ZW / 2 + 0.05);
      b.box('shelfD', X1 - X0, 0.06, 0.10, (X0 + X1) / 2, SY + 1.30, zc + ZW / 2 - 0.05);
      // 商品
      [-1, 1].forEach(function (s) {
        const zz = zc + s * (ZW / 2 - 0.05);
        for (let i = 0; i < 4; i++) {
          const y = SY + 0.365 + i * 0.31;
          let px = X0 + 0.13;
          let n = 0;
          while (px < X1 - 0.14) {
            const w = 0.10 + ((seed + n * 7 + i * 3) % 3) * 0.032;
            const h = 0.15 + ((seed + n * 5 + i) % 4) * 0.048;
            const d = 0.26 + ((seed + n) % 3) * 0.03;
            b.box('prod' + (1 + ((seed + n * 11 + i * 5) % 8)),
              w, h, d, px + w / 2, y + h / 2, zz, 0, 0,
              ((seed + n) % 5 === 0) ? 0.05 : 0);
            px += w + 0.026;
            n++;
          }
        }
      });
      // 价格条
      [-1, 1].forEach(function (s) {
        for (let i = 0; i < 4; i++) {
          b.box('priceTag', X1 - X0 - 0.10, 0.045, 0.012, (X0 + X1) / 2, SY + 0.315 + i * 0.31, zc + s * (ZW / 2 + 0.005));
        }
      });
    }
    islandShelf(-2.98, 3);
    islandShelf(-1.48, 8);

    /* ===== 室内：吊旗 ===== */
    [[-3.30, -3.10, 'prod1'], [-2.10, -2.05, 'prod4'], [-1.05, -0.55, 'prod3']].forEach(function (q) {
      b.cyl('metalD', 0.014, 0.014, 0.46, 5, q[0], SH - 0.38, q[1]);
      b.box('metalD', 0.05, 0.05, 0.06, q[0], SH - 0.60, q[1]);
      b.box(q[2], 0.02, 0.36, 0.52, q[0], SH - 0.84, q[1]);
      b.box('prod7', 0.022, 0.05, 0.54, q[0], SH - 0.68, q[1]);
    });

    /* ===== 室内：卧式冰柜 ===== */
    (function () {
      const X0 = -1.58, X1 = -0.26, Z0 = 0.34, Z1 = 1.46;
      const H = 0.76, TH = 0.085;
      // 底板
      b.box('fridge', X1 - X0, 0.12, Z1 - Z0, (X0 + X1) / 2, SY + 0.06, (Z0 + Z1) / 2);
      // 四壁（空心）
      b.box('fridge', X1 - X0, H, TH, (X0 + X1) / 2, SY + H / 2, Z0 + TH / 2);
      b.box('fridge', X1 - X0, H, TH, (X0 + X1) / 2, SY + H / 2, Z1 - TH / 2);
      b.box('fridge', TH, H, Z1 - Z0, X0 + TH / 2, SY + H / 2, (Z0 + Z1) / 2);
      b.box('fridge', TH, H, Z1 - Z0, X1 - TH / 2, SY + H / 2, (Z0 + Z1) / 2);
      // 假底 + 商品（抬高一点，俯视时能从柜口看见）
      b.box('shelfD', X1 - X0 - 0.14, 0.06, Z1 - Z0 - 0.14, (X0 + X1) / 2, SY + 0.30, (Z0 + Z1) / 2);
      for (let i = 0; i < 3; i++) {
        for (let k = 0; k < 6; k++) {
          b.box('prod' + (1 + ((i * 3 + k) % 8)), 0.15, 0.36, 0.13,
            X0 + 0.23 + i * 0.42, SY + 0.51, Z0 + 0.19 + k * 0.175);
        }
      }
      // 柜口包边
      b.box('sbTrim2', X1 - X0 + 0.05, 0.07, 0.10, (X0 + X1) / 2, SY + H, Z0 + 0.02);
      b.box('sbTrim2', X1 - X0 + 0.05, 0.07, 0.10, (X0 + X1) / 2, SY + H, Z1 - 0.02);
      b.box('sbTrim2', 0.10, 0.07, Z1 - Z0, X0 + 0.02, SY + H, (Z0 + Z1) / 2);
      b.box('sbTrim2', 0.10, 0.07, Z1 - Z0, X1 - 0.02, SY + H, (Z0 + Z1) / 2);
      // 推拉玻璃盖（两扇）
      [-0.30, 0.24].forEach(function (dz2, i) {
        const lid = new T.Mesh(new T.PlaneGeometry(X1 - X0 - 0.14, (Z1 - Z0) / 2 - 0.06), GLASS_MAT);
        lid.rotation.x = -Math.PI / 2;
        lid.position.set((X0 + X1) / 2, SY + H + 0.03 + i * 0.006, (Z0 + Z1) / 2 + dz2);
        lid.renderOrder = 3;
        g.add(lid);
      });
      // 柜体下部踢脚与品牌条
      b.box('prod3', X1 - X0 - 0.06, 0.14, 0.02, (X0 + X1) / 2, SY + 0.34, Z0 - 0.01);
      b.box('sbTrim2', X1 - X0, 0.10, Z1 - Z0, (X0 + X1) / 2, SY + 0.05, (Z0 + Z1) / 2);
    })();

    /* ===== 室内：收银台 ===== */
    (function () {
      const X0 = 0.16, X1 = 1.00, Z0 = 3.16, Z1 = 4.32;
      b.box('counter', X1 - X0, 0.92, Z1 - Z0, (X0 + X1) / 2, SY + 0.46, (Z0 + Z1) / 2);
      b.box('counterTop', X1 - X0 + 0.10, 0.07, Z1 - Z0 + 0.10, (X0 + X1) / 2 + 0.02, SY + 0.955, (Z0 + Z1) / 2);
      b.box('sbTrim', 0.06, 0.16, Z1 - Z0, X0 - 0.02, SY + 0.10, (Z0 + Z1) / 2);
      // 收银机
      b.box('metalD', 0.26, 0.10, 0.30, 0.62, SY + 1.04, 3.56);
      b.box('metal', 0.05, 0.20, 0.05, 0.62, SY + 1.18, 3.56);
      b.box('screen', 0.05, 0.26, 0.38, 0.60, SY + 1.42, 3.56);
      b.box('sbTrim', 0.035, 0.24, 0.35, 0.575, SY + 1.42, 3.56);
      // 扫码枪
      b.box('metalD', 0.10, 0.07, 0.10, 0.78, SY + 1.04, 3.98);
      b.box('metalD', 0.06, 0.16, 0.06, 0.74, SY + 1.10, 4.04, 0, 0, 0.35);
      // 小票
      b.box('prod7', 0.10, 0.006, 0.22, 0.80, SY + 0.995, 3.46, 0, 0.2, 0);
      // 关东煮机
      b.box('metalD', 0.34, 0.14, 0.34, 0.70, SY + 1.42, 4.14);
      b.box('metal', 0.30, 0.16, 0.30, 0.70, SY + 1.57, 4.14);
      for (let i = 0; i < 3; i++) {
        for (let k = 0; k < 4; k++) {
          b.cyl('prod' + (2 + ((i + k) % 4)), 0.030, 0.030, 0.10, 6,
            0.60 + i * 0.09, SY + 1.62, 3.99 + k * 0.085);
        }
      }
      // 台面小物
      b.box('prod4', 0.16, 0.16, 0.10, 0.72, SY + 1.07, 3.82);
      b.cyl('prod7', 0.055, 0.05, 0.12, 8, 0.42, SY + 1.06, 4.20);
    })();

    /* ===== 室内：收银台后烟架 ===== */
    b.box('sbTrim2', 2.86, 1.10, 0.10, -0.42, SY + 1.85, SZ1 - 0.22);
    for (let i = 0; i < 6; i++) {
      for (let k = 0; k < 9; k++) {
        b.box('prod' + (1 + ((i * 4 + k * 3) % 8)), 0.10, 0.09, 0.06,
          -1.72 + k * 0.31, SY + 1.42 + i * 0.17, SZ1 - 0.16);
      }
    }
    // 顶部价目屏
    b.box('screen', 1.6, 0.34, 0.05, -0.42, SY + 2.62, SZ1 - 0.26);

    /* ===== 室内：促销海报（贴玻璃内侧） ===== */
    const postMat = new T.MeshBasicMaterial({ map: TEX.shopPoster });
    const postMat2 = new T.MeshBasicMaterial({ map: TEX.shopPoster2 });
    [[-2.10, 1.55, postMat], [0.55, 1.55, postMat2]].forEach(function (p) {
      const m = new T.Mesh(new T.PlaneGeometry(0.68, 0.96), p[2]);
      m.position.set(1.00, p[1], p[0]);
      m.rotation.y = Math.PI / 2;
      g.add(m);
    });

    /* ===== 后台小门 ===== */
    b.box('sbTrim2', 0.10, 2.10, 0.86, SX0 + 0.30, SY + 1.05, 2.60);
    b.box('matDark', 0.06, 1.94, 0.72, SX0 + 0.26, SY + 0.97, 2.60);

    /* ===== 外部：空调外机 / 垃圾桶 / 自行车 / 路灯 ===== */
    // 空调外机（右山墙外，贴地挂装）
    [-2.05, -3.62].forEach(function (cx) {
      const cy = 0.66, zz = SZ1 + 0.24;
      // 支架
      b.box('metalD', 0.05, 0.05, 0.40, cx - 0.34, cy - 0.24, zz + 0.02);
      b.box('metalD', 0.05, 0.05, 0.40, cx + 0.34, cy - 0.24, zz + 0.02);
      b.to('metalD', 0.028, cx - 0.32, cy - 0.50, SZ1 + 0.02, cx - 0.32, cy - 0.24, zz + 0.16, 4);
      b.to('metalD', 0.028, cx + 0.32, cy - 0.50, SZ1 + 0.02, cx + 0.32, cy - 0.24, zz + 0.16, 4);
      // 机体
      b.box('metal', 0.84, 0.58, 0.32, cx, cy, zz);
      b.cyl('metalD', 0.19, 0.19, 0.04, 14, cx, cy, zz + 0.17, Math.PI / 2, 0, 0);
      b.box('sbTrim2', 0.84, 0.05, 0.36, cx, cy + 0.32, zz);
      b.box('sbTrim2', 0.84, 0.05, 0.36, cx, cy - 0.32, zz);
      // 百叶
      for (let i = 0; i < 4; i++) {
        b.box('metalD', 0.62, 0.018, 0.02, cx, cy - 0.18 + i * 0.12, zz + 0.17);
      }
    });
    // 自动售货机
    (function () {
      const vx = -0.05, vz = SZ1 + 0.42, vy = 0.15;
      b.box('sbTrim', 0.92, 1.92, 0.74, vx, vy + 0.97, vz);
      b.box('sbTrim2', 0.98, 0.10, 0.80, vx, vy + 1.98, vz);
      b.box('prod7', 0.62, 1.30, 0.06, vx, vy + 1.24, vz + 0.37);
      // 商品窗
      b.box('screen', 0.58, 0.96, 0.04, vx, vy + 1.32, vz + 0.375);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          b.box('prod' + (1 + ((r * 3 + c * 2) % 8)), 0.13, 0.20, 0.06,
            vx - 0.21 + c * 0.21, vy + 1.62 - r * 0.29, vz + 0.395);
        }
      }
      // 取货口 / 投币
      b.box('metalD', 0.42, 0.16, 0.05, vx - 0.09, vy + 0.56, vz + 0.395);
      b.box('metal', 0.15, 0.22, 0.05, vx + 0.24, vy + 1.06, vz + 0.395);
      b.box('tube', 0.56, 0.05, 0.02, vx, vy + 1.88, vz + 0.395);
    })();
    /* ===== 后墙：后门 / 机外 / 电表 / 排水管 ===== */
    (function () {
      const BX = SX0 - 0.14;
      // 后门
      b.box('sbTrim', 0.09, 2.20, 1.04, BX - 0.05, 1.10, -0.10);
      b.box('metalD', 0.08, 2.04, 0.92, BX - 0.11, 1.02, -0.10);
      b.box('metal', 0.05, 0.22, 0.04, BX - 0.16, 1.06, 0.28);
      b.box('tube', 0.06, 0.09, 0.13, BX - 0.17, 2.00, -0.44);
      // 门檐
      b.box('sbTrim', 0.46, 0.06, 1.34, BX - 0.22, 2.32, -0.10);
      [-1, 1].forEach(function (sd) {
        b.to('sbTrim2', 0.018, BX - 0.06, 2.30, -0.10 + sd * 0.60, BX - 0.42, 2.32, -0.10 + sd * 0.60, 4);
      });
      // 台阶
      b.box('stoneL', 0.36, 0.13, 1.24, BX - 0.24, 0.065, -0.10);
      // 空调外机
      [[1.55, 0.66], [2.78, 0.66]].forEach(function (q) {
        b.box('metal', 0.36, 0.58, 0.82, BX - 0.19, q[1], q[0]);
        b.cyl('metalD', 0.21, 0.21, 0.04, 14, BX - 0.38, q[1], q[0], 0, 0, Math.PI / 2);
        b.box('metalD', 0.06, 0.06, 0.32, BX - 0.02, q[1] - 0.26, q[0] - 0.30);
        b.box('metalD', 0.06, 0.06, 0.32, BX - 0.02, q[1] - 0.26, q[0] + 0.30);
      });
      // 电表箱 / 配电
      b.box('metalD', 0.13, 0.46, 0.36, BX - 0.06, 1.92, -1.62);
      b.box('metal', 0.05, 0.38, 0.30, BX - 0.14, 1.92, -1.62);
      b.box('metalD', 0.11, 0.30, 0.22, BX - 0.05, 1.38, -2.10);
      // 排水管
      b.cyl('sbTrim2', 0.05, 0.05, SH, 8, BX - 0.08, SH / 2, SZ0 + 0.26);
      b.cyl('sbTrim2', 0.05, 0.05, SH, 8, BX - 0.08, SH / 2, SZ1 - 0.26);
    })();

    // 落水管
    b.cyl('sbTrim2', 0.05, 0.05, SH, 8, SZ1 + 0.16, SH / 2, SZ0 + 0.30);
    // 侧墙配电箱
    b.box('metalD', 0.34, 0.46, 0.16, -0.55, 2.05, SZ1 + 0.16);
    b.box('metal', 0.28, 0.40, 0.06, -0.55, 2.05, SZ1 + 0.24);
    // 侧墙排风扇
    b.cyl('metalD', 0.22, 0.22, 0.10, 12, -1.55, 2.45, SZ1 + 0.18, Math.PI / 2, 0, 0);
    b.cyl('sbTrim2', 0.25, 0.25, 0.03, 12, -1.55, 2.45, SZ1 + 0.24, Math.PI / 2, 0, 0);
    // 垃圾桶
    b.cyl('metalD', 0.24, 0.20, 0.78, 12, 2.98, 0.54, -3.62);
    b.cyl('sbTrim2', 0.26, 0.26, 0.06, 12, 2.98, 0.96, -3.62);
    b.cyl('metalD', 0.24, 0.20, 0.78, 12, 2.98, 0.54, -4.28);
    b.cyl('sbTrim2', 0.26, 0.26, 0.06, 12, 2.98, 0.96, -4.28);
    // 门口立牌
    b.box('sbTrim', 0.06, 1.16, 0.74, 2.52, 0.73, 4.55, 0, 0.5, 0.03);
    b.box('prod7', 0.03, 1.02, 0.64, 2.555, 0.75, 4.55, 0, 0.5, 0.03);
    (function () {
      const m = new T.Mesh(new T.PlaneGeometry(0.58, 0.94),
        new T.MeshBasicMaterial({ map: TEX.shopPoster }));
      m.position.set(2.574, 0.75, 4.544);
      m.rotation.y = Math.PI / 2 + 0.5;
      g.add(m);
    })();
    b.box('metalD', 0.28, 0.05, 0.58, 2.52, 0.175, 4.55, 0, 0.5, 0);
    // 路灯（避开门面）
    b.cyl('metalD', 0.09, 0.12, 4.20, 8, 3.58, 2.10, -7.35);
    b.to('metalD', 0.07, 3.58, 4.20, -7.35, 2.86, 4.20, -7.35, 5);
    b.box('metalD', 0.52, 0.10, 0.26, 3.10, 4.14, -7.35);
    b.box('tube', 0.42, 0.04, 0.20, 3.10, 4.08, -7.35);

    /* 购物车 */
    (function () {
      const cx2 = 2.52, cz2 = 1.28, cy = 0.15;
      b.box('metal', 0.44, 0.44, 0.52, cx2, cy + 0.66, cz2);
      b.box('metalD', 0.40, 0.06, 0.48, cx2, cy + 0.44, cz2);
      b.box('metalD', 0.05, 0.42, 0.05, cx2 + 0.20, cy + 0.66, cz2 + 0.24);
      b.box('metalD', 0.05, 0.42, 0.05, cx2 + 0.20, cy + 0.66, cz2 - 0.24);
      b.box('metalD', 0.28, 0.04, 0.50, cx2 + 0.20, cy + 0.24, cz2);
      b.box('metalD', 0.05, 0.30, 0.05, cx2 - 0.18, cy + 0.30, cz2 + 0.24);
      b.box('metalD', 0.05, 0.30, 0.05, cx2 - 0.18, cy + 0.30, cz2 - 0.24);
      b.cyl('metal', 0.025, 0.025, 0.46, 6, cx2 - 0.24, cy + 0.94, cz2, 0, 0, Math.PI / 2);
      b.box('metalD', 0.05, 0.05, 0.05, cx2 - 0.20, cy + 0.90, cz2 + 0.23);
      b.box('metalD', 0.05, 0.05, 0.05, cx2 - 0.20, cy + 0.90, cz2 - 0.23);
      [[0.16, 0.24], [0.16, -0.24], [-0.20, 0.24], [-0.20, -0.24]].forEach(function (w) {
        b.cyl('tire', 0.055, 0.055, 0.05, 8, cx2 + w[0], cy + 0.055, cz2 + w[1], Math.PI / 2, 0, 0);
      });
      // 车里的商品
      b.box('prod3', 0.20, 0.16, 0.22, cx2 - 0.02, cy + 0.86, cz2 + 0.02);
      b.box('prod2', 0.14, 0.20, 0.16, cx2 + 0.02, cy + 0.90, cz2 - 0.14);
    })();

    /* 自行车 */
    (function () {
      const bx = 2.20, bz = -4.85, by = 0.15;
      [[-0.34, 0.30], [0.34, 0.30]].forEach(function (w) {
        b.torus('metalD', 0.30, 0.018, bx + w[0], by + w[1], bz, 0, 0, 0);
        b.cyl('metalD', 0.035, 0.035, 0.05, 6, bx + w[0], by + w[1], bz, Math.PI / 2, 0, 0);
      });
      b.to('prod4', 0.022, bx - 0.34, by + 0.30, bz, bx - 0.02, by + 0.62, bz, 5);
      b.to('prod4', 0.022, bx - 0.02, by + 0.62, bz, bx + 0.22, by + 0.30, bz, 5);
      b.to('prod4', 0.022, bx + 0.22, by + 0.30, bz, bx + 0.34, by + 0.30, bz, 5);
      b.to('prod4', 0.022, bx - 0.02, by + 0.62, bz, bx + 0.30, by + 0.66, bz, 5);
      b.to('prod4', 0.022, bx + 0.30, by + 0.66, bz, bx + 0.34, by + 0.30, bz, 5);
      b.to('metalD', 0.020, bx + 0.30, by + 0.66, bz, bx + 0.36, by + 0.96, bz, 5);
      b.cyl('metalD', 0.018, 0.018, 0.30, 6, bx + 0.36, by + 0.98, bz, 0, 0, Math.PI / 2);
      b.box('metalD', 0.20, 0.05, 0.10, bx - 0.06, by + 0.80, bz);
      b.box('prod7', 0.22, 0.06, 0.12, bx - 0.06, by + 0.84, bz);
      b.cyl('metalD', 0.10, 0.10, 0.03, 8, bx - 0.34, by + 0.30, bz, Math.PI / 2, 0, 0);
    })();

    b.build(g, { noOutline: ['tube', 'screen'] });

    /* 玻璃另加（不描边） */
    return g;
  }

  /* ---------- 停靠的小车 ---------- */
  function buildCar(px, pz, ry, bk, sc) {
    const g = new T.Group();
    const b = new Builder();
    g.position.set(px, 0, pz);
    g.rotation.y = ry || 0;
    if (sc && sc !== 1) g.scale.setScalar(sc);
    const CB = bk || 'carBody';
    // 车身
    b.box(CB, 3.55, 0.62, 1.62, 0, 0.62, 0);
    b.box(CB, 3.10, 0.14, 1.56, 0, 0.94, 0);
    // 车头车尾斜面
    b.box(CB, 0.42, 0.42, 1.58, 1.70, 0.50, 0, 0, 0, -0.22);
    b.box(CB, 0.34, 0.46, 1.58, -1.76, 0.50, 0, 0, 0, 0.20);
    // 座舱
    b.box(CB, 1.96, 0.52, 1.48, -0.18, 1.22, 0);
    b.box('carGlassD', 1.72, 0.40, 1.52, -0.18, 1.28, 0);
    b.box('carGlassD', 0.60, 0.34, 1.50, 0.86, 1.22, 0, 0, 0, -0.42);
    b.box('carGlassD', 0.54, 0.32, 1.50, -1.16, 1.22, 0, 0, 0, 0.40);
    // 顶
    b.box(CB, 1.68, 0.10, 1.42, -0.18, 1.50, 0);
    // 灯
    b.box('prod5', 0.10, 0.16, 0.34, 1.79, 0.72, 0.52);
    b.box('prod5', 0.10, 0.16, 0.34, 1.79, 0.72, -0.52);
    b.box('prod1', 0.10, 0.14, 0.30, -1.90, 0.74, 0.54);
    b.box('prod1', 0.10, 0.14, 0.30, -1.90, 0.74, -0.54);
    // 轮
    [[1.18, 0.86], [1.18, -0.86], [-1.22, 0.86], [-1.22, -0.86]].forEach(function (w) {
      b.cyl('tire', 0.36, 0.36, 0.24, 14, w[0], 0.36, w[1], Math.PI / 2, 0, 0);
      b.cyl('metal', 0.19, 0.19, 0.26, 12, w[0], 0.36, w[1], Math.PI / 2, 0, 0);
    });
    b.build(g);
    return g;
  }

  /* ================= 仓储会员店（大卖场形制） ================= */

  /* logo：白圆底 + 蓝色仓房剪影 */
  function clubMark(c, cx, cy, r) {
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#0a4a85';
    const s = r / 74;
    c.beginPath();
    c.moveTo(cx - 46 * s, cy - 3 * s);
    c.lineTo(cx, cy - 44 * s);
    c.lineTo(cx + 46 * s, cy - 3 * s);
    c.closePath(); c.fill();
    c.fillRect(cx - 37 * s, cy - 1 * s, 74 * s, 45 * s);
    c.fillStyle = '#ffffff';
    c.fillRect(cx - 14 * s, cy + 15 * s, 28 * s, 29 * s);
    c.fillRect(cx - 37 * s, cy + 4 * s, 74 * s, 5 * s);
  }

  TEX.clubSign = canvasTex(2400, 240, function (c, w, h) {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#1163a8'); gr.addColorStop(0.58, '#0a4a85'); gr.addColorStop(1, '#073a6a');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.16)'; c.fillRect(0, 0, w, 4);
    c.fillStyle = '#e8873a'; c.fillRect(0, h - 13, w, 13);
    clubMark(c, 126, 120, 76);
    c.fillStyle = '#ffffff';
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.font = '700 112px "Microsoft YaHei", "PingFang SC", SimHei, sans-serif';
    c.fillText(cfg(PS.clubName, '山海仓'), 234, 100);
    c.fillStyle = 'rgba(255,255,255,0.68)';
    c.font = '600 25px Arial, Helvetica, sans-serif';
    c.fillText('S H A N H A I   W A R E H O U S E   C L U B', 240, 182);
    // 中部橙色徽标
    c.fillStyle = '#e8873a';
    c.fillRect(1080, 50, 480, 140);
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.font = '700 56px "Microsoft YaHei", "PingFang SC", sans-serif';
    c.fillText('整 箱 更 省', 1320, 108);
    c.font = '600 21px Arial, sans-serif';
    c.fillText('B U Y   M O R E     S A V E   M O R E', 1320, 158);
    // 右侧会员文案
    c.textAlign = 'right';
    c.fillStyle = '#ffffff';
    c.font = '700 42px "Microsoft YaHei", sans-serif';
    c.fillText('会员制仓储超市', w - 58, 96);
    c.fillStyle = 'rgba(255,255,255,0.62)';
    c.font = '600 22px Arial, sans-serif';
    c.fillText('B U L K   ·   S A V I N G S   ·   M E M B E R S   O N L Y', w - 58, 152);
  });

  TEX.clubSide = canvasTex(1680, 240, function (c, w, h) {
    c.fillStyle = '#0a4a85'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(0, 0, w, 6);
    clubMark(c, 130, 120, 80);
    c.fillStyle = '#ffffff';
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.font = '700 108px "Microsoft YaHei", SimHei, sans-serif';
    c.fillText(cfg(PS.clubName, '山海仓'), 246, 106);
    c.fillStyle = 'rgba(255,255,255,0.70)';
    c.font = '600 25px Arial, sans-serif';
    c.fillText('M E M B E R S H I P   W A R E H O U S E', 252, 186);
    c.textAlign = 'right';
    c.fillStyle = '#e8873a';
    c.font = '700 46px "Microsoft YaHei", sans-serif';
    c.fillText('会员专属', w - 50, 112);
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.font = '600 22px Arial, sans-serif';
    c.fillText('M E M B E R S   O N L Y', w - 50, 168);
  });

  TEX.clubPylon = canvasTex(440, 330, function (c, w, h) {
    c.fillStyle = '#f2f1ea'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#0a4a85'; c.fillRect(0, 0, w, 216);
    clubMark(c, 92, 92, 54);
    c.fillStyle = '#ffffff';
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.font = '700 74px "Microsoft YaHei", SimHei, sans-serif';
    c.fillText(cfg(PS.clubName, '山海仓'), 164, 82);
    c.font = '600 21px Arial, sans-serif';
    c.fillStyle = 'rgba(255,255,255,0.72)';
    c.fillText('WAREHOUSE  CLUB', 168, 132);
    c.fillStyle = '#e8873a';
    c.fillRect(0, 178, w, 8);
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.font = '700 34px "Microsoft YaHei", sans-serif';
    c.fillText('会员制仓储超市', w / 2, 205);
    c.fillStyle = '#2f3338';
    c.font = '700 44px Arial, sans-serif';
    c.fillText('AM 9:00 — PM 10:00', w / 2, 262);
    c.fillStyle = '#7b8085';
    c.font = '600 22px "Microsoft YaHei", sans-serif';
    c.fillText('免 费 办 卡 · 当 天 可 用', w / 2, 302);
  });

  TEX.clubEntry = canvasTex(660, 168, function (c, w, h) {
    c.fillStyle = '#0a4a85'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8873a'; c.fillRect(0, 0, 10, h);
    c.fillStyle = '#ffffff';
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.font = '700 82px "Microsoft YaHei", SimHei, sans-serif';
    c.fillText('入 口', 40, 72);
    c.fillStyle = 'rgba(255,255,255,0.66)';
    c.font = '600 24px Arial, sans-serif';
    c.fillText('E N T R A N C E', 46, 132);
    // 箭头
    c.fillStyle = '#e8873a';
    c.beginPath();
    c.moveTo(w - 100, 48); c.lineTo(w - 44, 84); c.lineTo(w - 100, 120);
    c.lineTo(w - 100, 98); c.lineTo(w - 160, 98); c.lineTo(w - 160, 70);
    c.lineTo(w - 100, 70); c.closePath(); c.fill();
  });

  TEX.clubExit = canvasTex(560, 150, function (c, w, h) {
    c.fillStyle = '#123f63'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 72px "Microsoft YaHei", SimHei, sans-serif';
    c.fillText('出 口', w / 2, 62);
    c.fillStyle = 'rgba(255,255,255,0.62)';
    c.font = '600 22px Arial, sans-serif';
    c.fillText('E X I T', w / 2, 116);
  });

  function clubHang(main, sub, bgc) {
    return canvasTex(420, 300, function (c, w, h) {
      c.fillStyle = bgc || '#0a4a85'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(0, 0, w, 6);
      c.fillStyle = '#e8873a'; c.fillRect(0, h - 12, w, 12);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '700 96px Arial, sans-serif';
      c.fillText(main, w / 2, 108);
      c.fillStyle = 'rgba(255,255,255,0.78)';
      c.font = '700 42px "Microsoft YaHei", SimHei, sans-serif';
      c.fillText(sub, w / 2, 206);
      c.fillStyle = 'rgba(255,255,255,0.42)';
      c.font = '600 20px Arial, sans-serif';
      c.fillText('A I S L E', w / 2, 258);
    });
  }
  TEX.clubHang1 = clubHang('01–08', '酒水 · 饮料');
  TEX.clubHang2 = clubHang('09–16', '粮油 · 日用');
  TEX.clubHang3 = clubHang('17–24', '生鲜 · 烘焙');

  TEX.clubPosterA = canvasTex(360, 520, function (c, w, h) {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0f5fa4'); gr.addColorStop(1, '#073a6a');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = '#e8873a'; c.fillRect(0, 0, w, 10);
    c.fillStyle = '#ffffff';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 54px "Microsoft YaHei", sans-serif';
    c.fillText('整箱特惠', w / 2, 86);
    c.fillStyle = 'rgba(255,255,255,0.62)';
    c.font = '600 18px Arial, sans-serif';
    c.fillText('BULK  SAVINGS', w / 2, 128);
    c.fillStyle = '#e8873a';
    c.fillRect(40, 164, w - 80, 4);
    c.fillStyle = '#ffe4b8';
    c.font = '700 128px Arial, sans-serif';
    c.fillText('−25%', w / 2, 272);
    c.fillStyle = '#ffffff';
    c.font = '700 34px "Microsoft YaHei", sans-serif';
    c.fillText('整 箱 购 更 划 算', w / 2, 372);
    c.fillStyle = 'rgba(255,255,255,0.72)';
    c.font = '600 20px "Microsoft YaHei", sans-serif';
    c.fillText('会 员 价 · 限 本 周', w / 2, 420);
    c.fillStyle = '#e8873a'; c.fillRect(0, h - 10, w, 10);
  });

  TEX.clubPosterB = canvasTex(360, 520, function (c, w, h) {
    c.fillStyle = '#f4f2ea'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#0a4a85'; c.fillRect(0, 0, w, 132);
    c.fillStyle = '#ffffff';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 50px "Microsoft YaHei", sans-serif';
    c.fillText('会员专享', w / 2, 74);
    c.fillStyle = 'rgba(255,255,255,0.60)';
    c.font = '600 17px Arial, sans-serif';
    c.fillText('M E M B E R   O N L Y', w / 2, 112);
    c.fillStyle = '#c8402f';
    c.font = '700 150px Arial, sans-serif';
    c.fillText('¥39', w / 2, 264);
    c.fillStyle = '#8d8a80';
    c.font = '600 20px "Microsoft YaHei", sans-serif';
    c.fillText('整 箱 24 罐 / 1.2L', w / 2, 356);
    c.fillStyle = '#0a4a85';
    c.fillRect(46, 396, w - 92, 58);
    c.fillStyle = '#ffffff';
    c.font = '700 28px "Microsoft YaHei", sans-serif';
    c.fillText('扫 码 查 价', w / 2, 426);
    c.fillStyle = '#b9b6ac';
    c.font = '600 16px Arial, sans-serif';
    c.fillText('WHILE  STOCKS  LAST', w / 2, 486);
  });

  const WX0 = -7.30, WX1 = 1.20, WZ0 = -7.10, WZ1 = 5.90;
  const WCX = (WX0 + WX1) / 2, WCZ = (WZ0 + WZ1) / 2;
  const WD = WX1 - WX0, WW = WZ1 - WZ0;
  const WGY = 0.12;     // 场地地坪
  const WFY = 0.30;     // 卖场地坪
  const WH = 6.30;      // 檐口高
  const SB0 = 4.95, SB1 = 6.25;   // 招牌带上下沿

  /* ---------- 场地 ---------- */
  function buildClubSite() {
    const g = new T.Group();
    const b = new Builder();

    /* 展台剖切 */
    b.box('wcBase2', 18.2, 0.30, 18.2, 0, -1.82, 0);
    b.box('wcBase', 17.6, 0.16, 17.6, 0, -1.58, 0);
    b.box('stoneD', 17.0, 1.50, 17.0, 0, -0.75, 0);

    /* 场地统一铺沥青 */
    b.box('wcAsphalt', 17.0, 0.12, 17.0, 0, 0.06, 0);

    /* 店前人行道 */
    b.box('wcWalk', 1.76, 0.16, 13.30, 2.08, 0.08, -0.60);
    for (let z = -7.15; z < 6.05; z += 0.56) {
      b.box('wcWalk2', 1.76, 0.012, 0.032, 2.08, 0.163, z);
    }
    for (let x = 1.32; x < 2.92; x += 0.56) {
      b.box('wcWalk2', 0.032, 0.012, 13.30, x, 0.163, -0.60);
    }
    /* 路缘石 */
    b.box('stoneL', 0.18, 0.22, 13.30, 3.04, 0.11, -0.60);
    b.box('stoneD', 0.09, 0.11, 13.30, 3.15, 0.055, -0.60);

    /* 停车位（车头朝店） */
    const PZ0 = -6.95, PST = 1.62, PN = 8;
    for (let i = 0; i <= PN; i++) {
      b.box('wcLine', 3.00, 0.02, 0.09, 4.66, 0.127, PZ0 + i * PST);
    }
    b.box('wcLine', 0.09, 0.02, PN * PST, 6.19, 0.127, PZ0 + PN * PST / 2);
    /* 挡车器 */
    for (let i = 0; i < PN; i++) {
      b.box('wcTrim2', 1.10, 0.11, 0.13, 3.44, 0.175, PZ0 + (i + 0.5) * PST);
    }

    /* 行车导向箭头 */
    function arrow(x, z, dir) {
      b.box('wcLine', 0.13, 0.02, 0.70, x, 0.128, z);
      b.box('wcLine', 0.13, 0.02, 0.40, x - 0.15, 0.128, z + dir * 0.28, 0, dir * 0.72, 0);
      b.box('wcLine', 0.13, 0.02, 0.40, x + 0.15, 0.128, z + dir * 0.28, 0, -dir * 0.72, 0);
    }
    arrow(7.25, -4.20, 1);
    arrow(7.25, 1.60, 1);

    /* 端头绿化 */
    b.box('wcWalk', 6.10, 0.17, 2.14, 5.10, 0.085, 7.18);
    b.box('stoneL', 6.26, 0.10, 2.30, 5.10, 0.17, 7.18);
    b.box('grass', 5.90, 0.08, 1.94, 5.10, 0.20, 7.18);
    const bush = [[3.05, 7.10, 0.30], [4.05, 6.85, 0.24], [5.05, 7.35, 0.27],
      [6.10, 6.95, 0.26], [7.05, 7.30, 0.31], [7.80, 6.80, 0.22]];
    for (let i = 0; i < bush.length; i++) {
      const p = bush[i];
      b.sph(i % 2 ? 'grass2' : 'leaf2', p[2], p[0], 0.26 + p[2] * 0.36, p[1], 1.28, 0.80, 1.28);
      b.sph('leaf1', p[2] * 0.58, p[0] + 0.14, 0.32 + p[2] * 0.44, p[1] - 0.12, 1.18, 0.76, 1.18);
      b.sph('leaf3', p[2] * 0.42, p[0] - 0.15, 0.28 + p[2] * 0.48, p[1] + 0.11, 1.12, 0.74, 1.12);
    }
    /* 树 */
    function clubTree(x, z, s) {
      b.cyl('bark', 0.115 * s, 0.175 * s, 2.55 * s, 7, x, 1.28 * s, z);
      b.to('bark', 0.05 * s, x, 2.05 * s, z, x + 0.30 * s, 2.72 * s, z + 0.20 * s, 5);
      b.to('bark', 0.045 * s, x, 2.05 * s, z, x - 0.27 * s, 2.64 * s, z - 0.21 * s, 5);
      for (let k = 0; k < 26; k++) {
        const a = k * 2.399;
        const r = (0.16 + (k % 5) * 0.165) * s;
        b.sph(k % 3 === 0 ? 'leaf2' : (k % 3 === 1 ? 'leaf1' : 'leaf3'),
          (0.24 + (k % 5) * 0.055) * s,
          x + Math.cos(a) * r, (2.52 + Math.sin(k * 1.7) * 0.36) * s, z + Math.sin(a) * r,
          1.20, 0.86, 1.20);
      }
    }
    clubTree(3.35, 7.18, 0.78);
    clubTree(6.85, 7.02, 0.70);

    /* 后场装卸站台 */
    b.box('wcWalk', 0.94, 0.26, 6.20, -7.78, 0.13, -1.20);
    b.box('wcTrim2', 0.10, 0.10, 6.20, -8.28, 0.26, -1.20);

    /* 排水沟 */
    for (let z = -7.0; z < 5.9; z += 0.60) {
      b.box('metalD', 0.05, 0.03, 0.46, 3.15, 0.135, z);
    }
    /* 井盖 */
    b.cyl('metalD', 0.34, 0.34, 0.03, 16, 6.85, 0.135, -5.60);
    b.cyl('metalD', 0.28, 0.28, 0.03, 16, -6.30, 0.135, -7.40);

    /* 消防栓 */
    b.cyl('prod1', 0.10, 0.11, 0.42, 8, 3.30, 0.33, -7.55);
    b.sph('prod1', 0.105, 3.30, 0.55, -7.55, 1, 0.8, 1);
    b.box('prod1', 0.34, 0.07, 0.09, 3.30, 0.44, -7.55);

    /* 立柱招牌 */
    (function () {
      const px = 7.55, pz = -7.35;
      b.box('wcWalk2', 1.24, 0.13, 1.24, px, 0.125, pz);
      b.box('wcTrim2', 0.98, 0.20, 0.98, px, 0.28, pz);
      b.box('wcMetalD', 0.26, 4.10, 0.26, px, 2.12, pz);
      b.box('wcMetalD', 0.36, 0.13, 0.36, px, 4.14, pz);
      b.box('wcTrim2', 0.20, 1.34, 1.68, px, 4.88, pz);
      b.box('wcBand', 0.23, 1.20, 1.60, px, 4.88, pz);
      const pk1 = new T.Mesh(new T.PlaneGeometry(1.52, 1.14),
        new T.MeshBasicMaterial({ map: TEX.clubPylon }));
      pk1.position.set(px + 0.122, 4.88, pz);
      pk1.rotation.y = Math.PI / 2;
      g.add(pk1);
      const pk2 = new T.Mesh(new T.PlaneGeometry(1.52, 1.14),
        new T.MeshBasicMaterial({ map: TEX.clubPylon }));
      pk2.position.set(px - 0.122, 4.88, pz);
      pk2.rotation.y = -Math.PI / 2;
      g.add(pk2);
    })();

    /* 停车场灯柱 */
    [[5.10, -7.85], [5.10, 6.95]].forEach(function (p) {
      b.cyl('wcTrim2', 0.075, 0.10, 4.20, 8, p[0], 2.10, p[1]);
      b.box('wcMetalD', 0.92, 0.07, 0.07, p[0] - 0.46, 4.22, p[1]);
      b.box('wcMetalD', 0.46, 0.13, 0.30, p[0] - 0.88, 4.14, p[1]);
      b.box('tube', 0.40, 0.04, 0.24, p[0] - 0.88, 4.06, p[1]);
      b.cyl('wcTrim2', 0.16, 0.20, 0.16, 8, p[0], 0.16, p[1]);
    });

    b.build(g);
    return g;
  }

  /* ---------- 建筑 ---------- */
  function buildClub() {
    const g = new T.Group();
    const b = new Builder();

    /* ===== 屋面 ===== */
    b.box('wcRoof', WD + 0.44, 0.24, WW + 0.44, WCX, WH + 0.12, WCZ);
    for (let x = WX0 + 0.42; x < WX1 - 0.06; x += 0.62) {
      b.box('wcRoof2', 0.036, 0.014, WW + 0.16, x, WH + 0.247, WCZ);
    }
    /* 女儿墙 */
    b.box('wcBody', WD + 0.44, 0.30, 0.14, WCX, WH + 0.27, WZ0 - 0.15);
    b.box('wcBody', WD + 0.44, 0.30, 0.14, WCX, WH + 0.27, WZ1 + 0.15);
    b.box('wcBody', 0.14, 0.30, WW + 0.44, WX0 - 0.15, WH + 0.27, WCZ);
    b.box('wcBody', 0.14, 0.30, WW + 0.44, WX1 + 0.15, WH + 0.27, WCZ);
    b.box('wcTrim2', WD + 0.54, 0.06, 0.22, WCX, WH + 0.45, WZ0 - 0.15);
    b.box('wcTrim2', WD + 0.54, 0.06, 0.22, WCX, WH + 0.45, WZ1 + 0.15);
    b.box('wcTrim2', 0.22, 0.06, WW + 0.54, WX0 - 0.15, WH + 0.45, WCZ);
    b.box('wcTrim2', 0.22, 0.06, WW + 0.54, WX1 + 0.15, WH + 0.45, WCZ);

    /* 屋面机组 */
    [[-5.60, -4.60], [-2.60, 0.20], [-6.10, 3.40], [-0.80, -2.60], [-3.90, 4.30]].forEach(function (p) {
      b.box('wcMetal', 1.30, 0.58, 0.96, p[0], WH + 0.53, p[1]);
      b.box('wcTrim2', 1.36, 0.07, 1.02, p[0], WH + 0.85, p[1]);
      b.cyl('wcMetalD', 0.31, 0.31, 0.06, 12, p[0], WH + 0.89, p[1]);
      b.cyl('wcTrim2', 0.09, 0.09, 0.09, 8, p[0], WH + 0.93, p[1]);
    });
    /* 天窗 */
    [[-6.10, -1.20], [-3.30, 1.90], [-1.20, -4.10], [-5.20, 4.60]].forEach(function (p) {
      b.box('wcTrim2', 1.04, 0.09, 1.50, p[0], WH + 0.29, p[1]);
      b.box('tube', 0.90, 0.05, 1.36, p[0], WH + 0.315, p[1]);
    });
    /* 检修口 */
    b.box('wcTrim2', 0.82, 0.09, 0.82, -4.20, WH + 0.29, -1.30);

    /* ===== 外墙 ===== */
    b.box('wcBody', 0.30, WH, WW + 0.30, WX0 + 0.15, WH / 2, WCZ);
    b.box('wcBody', WD, WH, 0.30, WCX, WH / 2, WZ0 + 0.15);
    b.box('wcBody', WD, WH, 0.30, WCX, WH / 2, WZ1 - 0.15);
    // 前脸门头墙（招牌带以上）
    b.box('wcBody', 0.30, WH - SB0, WW, WX1 - 0.15, (WH + SB0) / 2, WCZ);
    // 前脸墙垛
    [[-6.00, 2.20], [-1.60, 0.60], [3.95, 0.50], [5.525, 0.75]].forEach(function (p) {
      b.box('wcBody', 0.30, SB0 - WFY, p[1], WX1 - 0.15, (SB0 + WFY) / 2, p[0]);
    });
    // 基座
    b.box('wcTrim', 0.36, 0.30, WW, WX1 - 0.14, 0.15, WCZ);

    /* 墙面竖肋 */
    for (let x = WX0 + 0.58; x < WX1 - 0.18; x += 0.58) {
      b.box('wcBody2', 0.05, 4.55, 0.05, x, 2.58, WZ1 + 0.04);
      b.box('wcBody2', 0.05, 4.55, 0.05, x, 2.58, WZ0 - 0.04);
    }
    for (let z = WZ0 + 0.55; z < WZ1 - 0.20; z += 0.58) {
      b.box('wcBody2', 0.05, 4.55, 0.05, WX0 - 0.04, 2.58, z);
    }
    /* 玻璃边缘蓝色竖框 */
    [-1.30, 3.70].forEach(function (zz) {
      b.box('wcTrim2', 0.34, SB0 - WFY, 0.14, WX1 - 0.10, (SB0 + WFY) / 2, zz);
    });
    [-4.90, -1.90, 4.20, 5.15].forEach(function (zz) {
      b.box('wcBand', 0.38, SB0 - WFY, 0.15, WX1 - 0.10, (SB0 + WFY) / 2, zz);
    });

    /* ===== 招牌带 ===== */
    b.box('wcBand', 0.18, SB1 - SB0, WW + 0.06, WX1 + 0.05, (SB0 + SB1) / 2, WCZ);
    b.box('wcBand2', 0.22, 0.07, WW + 0.16, WX1 + 0.06, SB1 + 0.03, WCZ);
    const sm = new T.Mesh(new T.PlaneGeometry(WW - 0.14, (WW - 0.14) / 10),
      new T.MeshBasicMaterial({ map: TEX.clubSign }));
    sm.position.set(WX1 + 0.155, (SB0 + SB1) / 2, WCZ);
    sm.rotation.y = Math.PI / 2;
    g.add(sm);

    b.box('wcBand', WD + 0.06, SB1 - SB0, 0.18, WCX, (SB0 + SB1) / 2, WZ1 + 0.05);
    b.box('wcBand2', WD + 0.16, 0.07, 0.22, WCX, SB1 + 0.03, WZ1 + 0.06);
    const sd = new T.Mesh(new T.PlaneGeometry(WD - 0.06, (WD - 0.06) / 7),
      new T.MeshBasicMaterial({ map: TEX.clubSide }));
    sd.position.set(WCX, (SB0 + SB1) / 2, WZ1 + 0.155);
    g.add(sd);
    // 转角柱
    b.box('wcBand2', 0.26, SB1 - SB0 + 0.10, 0.26, WX1 + 0.05, (SB0 + SB1) / 2, WZ1 + 0.05);

    /* ===== 主玻璃幕 ===== */
    pane(g, 5.00, SB0 - WFY, WX1 - 0.02, (SB0 + WFY) / 2, 1.20, Math.PI / 2);
    [-0.05, 1.20, 2.45].forEach(function (zz) {
      b.box('wcMetal', 0.11, SB0 - WFY, 0.075, WX1 - 0.03, (SB0 + WFY) / 2, zz);
    });
    b.box('wcMetal', 0.11, 0.085, 5.00, WX1 - 0.03, 3.50, 1.20);
    b.box('wcMetal', 0.12, 0.10, 5.00, WX1 - 0.03, SB0 - 0.05, 1.20);
    b.box('wcMetal', 0.12, 0.10, 5.00, WX1 - 0.03, WFY + 0.05, 1.20);
    glare(g, 3.10, 0.18, WX1 + 0.02, 4.10, 0.55, Math.PI / 2, 0.58);
    glare(g, 1.30, 0.14, WX1 + 0.02, 2.60, 2.70, Math.PI / 2, -0.42);

    /* ===== 出口 ===== */
    pane(g, 0.91, 2.62, WX1 - 0.02, 1.61, 4.675, Math.PI / 2);
    b.box('wcMetal', 0.12, 2.70, 0.07, WX1 - 0.02, 1.65, 4.20);
    b.box('wcMetal', 0.12, 2.70, 0.07, WX1 - 0.02, 1.65, 5.15);
    b.box('wcBand', 0.16, 0.62, 1.16, WX1 + 0.02, 3.22, 4.675);
    const exitSign = new T.Mesh(new T.PlaneGeometry(0.92, 0.25),
      new T.MeshBasicMaterial({ map: TEX.clubExit }));
    exitSign.position.set(WX1 + 0.11, 3.22, 4.675);
    exitSign.rotation.y = Math.PI / 2;
    g.add(exitSign);
    b.box('matDark', 0.66, 0.035, 0.92, 1.55, WFY + 0.015, 4.675);

    /* ===== 入口门厅 ===== */
    const EZ0 = -4.90, EZ1 = -1.90, EX1 = 2.70, ETOP = 4.30;
    b.box('wcFloorIn', EX1 - WX1 + 0.10, 0.30, EZ1 - EZ0, (WX1 + EX1) / 2, 0.15, (EZ0 + EZ1) / 2);
    // 出挑雨棚
    b.box('wcBody', EX1 - WX1 + 0.40, 0.16, EZ1 - EZ0 + 0.20, (WX1 + EX1 + 0.30) / 2, ETOP + 0.08, (EZ0 + EZ1) / 2);
    // 蓝色檐口（三面）
    b.box('wcBand', 0.12, 0.40, EZ1 - EZ0 + 0.20, EX1 + 0.30, ETOP - 0.02, (EZ0 + EZ1) / 2);
    b.box('wcBand', EX1 - WX1 + 0.40, 0.40, 0.11, (WX1 + EX1 + 0.30) / 2, ETOP - 0.02, EZ0 - 0.05);
    b.box('wcBand', EX1 - WX1 + 0.40, 0.40, 0.11, (WX1 + EX1 + 0.30) / 2, ETOP - 0.02, EZ1 + 0.05);
    // 入口标识
    const enSign = new T.Mesh(new T.PlaneGeometry(1.86, 0.46),
      new T.MeshBasicMaterial({ map: TEX.clubEntry }));
    enSign.position.set(EX1 + 0.37, ETOP - 0.02, (EZ0 + EZ1) / 2);
    enSign.rotation.y = Math.PI / 2;
    g.add(enSign);

    // 玻璃：正面两段 + 两侧
    pane(g, 0.78, 3.98, EX1, 2.30, -4.51, Math.PI / 2);
    pane(g, 0.78, 3.98, EX1, 2.30, -2.29, Math.PI / 2);
    pane(g, EX1 - WX1, 3.98, (WX1 + EX1) / 2, 2.30, EZ0, 0);
    pane(g, EX1 - WX1, 3.98, (WX1 + EX1) / 2, 2.30, EZ1, 0);
    // 玻璃横档（不加框的话整个门厅会像一座公交站台）
    [4.26, 3.72, 0.46].forEach(function (yy) {
      b.box('wcMetal', 0.065, 0.065, EZ1 - EZ0, EX1 + 0.02, yy, (EZ0 + EZ1) / 2);
      b.box('wcMetal', EX1 - WX1, 0.065, 0.065, (WX1 + EX1) / 2, yy, EZ0);
      b.box('wcMetal', EX1 - WX1, 0.065, 0.065, (WX1 + EX1) / 2, yy, EZ1);
    });
    // 踢脚
    b.box('wcTrim2', 0.09, 0.16, EZ1 - EZ0, EX1 + 0.03, 0.38, (EZ0 + EZ1) / 2);
    // 门洞框
    b.box('wcBand', 0.15, 4.02, 0.11, EX1, 2.31, -4.10);
    b.box('wcBand', 0.15, 4.02, 0.11, EX1, 2.31, -2.70);
    b.box('wcBand', 0.15, 0.13, 1.44, EX1, 4.22, -3.40);
    // 自动门感应器
    b.box('wcMetalD', 0.16, 0.10, 0.34, EX1 - 0.06, 4.02, -3.40);
    b.box('screen', 0.04, 0.05, 0.10, EX1 - 0.14, 4.02, -3.40);
    // 门厅角柱
    [[EX1, EZ0], [EX1, EZ1]].forEach(function (p) {
      b.box('wcBand', 0.17, 4.06, 0.17, p[0], 2.33, p[1]);
    });
    // 地垫
    b.box('matDark', 0.86, 0.03, 0.92, 2.24, WFY + 0.015, -3.40);
    // 门厅海报
    const post1 = new T.Mesh(new T.PlaneGeometry(0.76, 1.10),
      new T.MeshBasicMaterial({ map: TEX.clubPosterA }));
    post1.position.set(1.70, 2.10, EZ0 + 0.07);
    post1.rotation.y = Math.PI / 2;
    g.add(post1);

    /* 后墙装饰带 */
    b.box('wcBand', 0.05, 0.38, WW - 0.40, WX0 + 0.175, 4.72, WCZ);
    b.box('wcBody2', 0.04, 0.07, WW - 0.40, WX0 + 0.17, 4.45, WCZ);

    /* ===== 室内：地坪 ===== */
    b.box('wcFloorIn', WD - 0.24, 0.30, WW - 0.24, WCX, 0.15, WCZ);
    // 通道线（沿 z）
    [-3.275, -5.425].forEach(function (xx) {
      b.box('wcFloorLine', 0.055, 0.014, 8.30, xx - 0.42, WFY + 0.006, -1.50);
      b.box('wcFloorLine', 0.055, 0.014, 8.30, xx + 0.42, WFY + 0.006, -1.50);
    });
    b.box('wcFloorLine', 0.055, 0.014, 8.30, -1.58, WFY + 0.006, -1.50);
    // 入口导向线
    b.box('wcFloorLine', 2.30, 0.014, 0.055, 0.05, WFY + 0.006, -3.40);

    /* ===== 室内：屋架 / 高天棚灯 ===== */
    b.box('wcCeil', WD - 0.22, 0.06, WW - 0.22, WCX, WH - 0.14, WCZ);
    for (let x = WX0 + 0.70; x < WX1 - 0.30; x += 1.55) {
      b.box('wcTruss', 0.09, 0.19, WW - 0.24, x, WH - 0.44, WCZ);
    }
    for (let z = WZ0 + 0.60; z < WZ1 - 0.30; z += 1.30) {
      b.box('wcTruss', WD - 0.24, 0.08, 0.07, WCX, WH - 0.33, z);
    }
    for (let x = -6.55; x < 0.00; x += 1.55) {
      for (let z = -6.20; z < 5.40; z += 1.30) {
        b.cyl('wcMetalD', 0.012, 0.012, 1.24, 4, x, WH - 1.02, z);
        b.box('wcMetalD', 0.44, 0.055, 0.19, x, 4.52, z);
        b.box('tube', 0.40, 0.042, 0.16, x, 4.475, z);
      }
    }

    /* ===== 室内：托盘货架 =====
       尺寸基准（按 SimReady 常用的 asset_extents 度量口径）：
       标准 GMA 托盘 1.219×1.016×0.144 m，选择性货架跨距 2.44 m（并排两托盘）、
       进深 1.067 m、横梁层高 1.5/2.5/3.5 m。本场景整体缩到 0.78，
       故托盘取 0.95×0.72×0.115，层高取 1.10/2.28/3.46 —— 保持件与件的比例，
       而不是把托盘做成跟纸箱一样大的「小方块」。 */
    const PLW = 0.72, PLD = 0.95, PLT = 0.115;

    // 单块托盘板（顶铺板 + 三根纵梁 + 底铺板），堆垛与载货共用
    function palletDeck(x, y, z) {
      b.box('wcPallet', PLD, 0.022, PLW, x, y + 0.104, z);
      b.box('wcPallet', PLD, 0.022, PLW, x, y + 0.024, z);
      for (let s3 = 0; s3 < 3; s3++) {
        b.box('wcPallet', PLD, 0.058, 0.072, x, y + 0.064, z + (s3 - 1) * (PLW * 0.40));
      }
    }

    function pallet(x, y, z, seed, kd) {
      palletDeck(x, y, z);
      for (let s2 = 0; s2 < 2; s2++) {
        const zz = z + (s2 ? PLW * 0.235 : -PLW * 0.235);
        const pk = 3;
        let yy = y + PLT;
        for (let i = 0; i < pk; i++) {
          // 层间净高约 1.05，整垛货高控制在 0.75~1.01，才不会「货架里飘着一层小盒子」
          const hh = 0.215 + ((seed + i * 3 + s2) % 3) * 0.040;
          const col = (i === pk - 1 && (seed + s2) % 4 === 0)
            ? 'prod' + (1 + ((seed + i + s2) % 8))
            : (kd ? 'wcCarton' : 'wcCarton2');
          b.box(col, PLD - 0.05 - i * 0.014, hh, PLW * 0.455, x, yy + hh / 2, zz);
          yy += hh + 0.006;
        }
      }
      b.box('wcFilm', PLD - 0.02, 0.028, PLW - 0.02, x, y + PLT + 0.014, z);
    }

    function clubRack(xc, z0, z1, seed) {
      const RW = 1.10, HW = 4.25;
      const bays = Math.max(3, Math.round((z1 - z0) / 1.62));
      const bayL = (z1 - z0) / bays;
      const lv = [1.10, 2.28, 3.46];
      for (let i = 0; i <= bays; i++) {
        const zz = z0 + i * bayL;
        [-1, 1].forEach(function (s) {
          b.box('wcUp', 0.085, HW, 0.10, xc + s * (RW / 2 - 0.05), WFY + HW / 2, zz);
        });
        for (let l = 0; l < lv.length; l++) {
          b.box('wcUp', RW - 0.12, 0.048, 0.05, xc, WFY + lv[l] - 0.13, zz);
        }
        b.box('wcUp', RW - 0.12, 0.048, 0.05, xc, WFY + HW - 0.09, zz);
      }
      for (let l = 0; l < lv.length; l++) {
        [-1, 1].forEach(function (s) {
          b.box('wcBeam', 0.10, 0.13, z1 - z0, xc + s * (RW / 2 - 0.05), WFY + lv[l], (z0 + z1) / 2);
        });
        if (!(l === 2 && seed % 3 === 0)) {
          for (let i = 0; i < bays * 2; i++) {
            const pz = z0 + 0.12 + (i + 0.5) * (z1 - z0 - 0.24) / (bays * 2);
            pallet(xc, WFY + lv[l] + 0.065, pz, seed + l * 17 + i * 7, l > 0);
          }
        }
      }
      // 地面层托盘（货架底部不能架空，否则整排像悬空置物架）
      for (let i = 0; i < bays * 2; i++) {
        const pz = z0 + 0.12 + (i + 0.5) * (z1 - z0 - 0.24) / (bays * 2);
        pallet(xc, WFY + 0.004, pz, seed + i * 11, false);
      }
      // 立柱防撞护角（黄黑相间），只在两端可见处做
      [z0, z1].forEach(function (zz) {
        [-1, 1].forEach(function (s) {
          const xx = xc + s * (RW / 2 - 0.05);
          b.box('wcYel', 0.135, 0.40, 0.135, xx, WFY + 0.20, zz);
          b.box('matDark', 0.142, 0.052, 0.142, xx, WFY + 0.30, zz);
          b.box('matDark', 0.142, 0.052, 0.142, xx, WFY + 0.12, zz);
        });
      });
    }
    clubRack(-2.20, -5.60, 0.70, 3);
    clubRack(-4.35, -5.60, 2.60, 9);
    clubRack(-6.50, -5.60, 2.60, 15);

    /* ===== 室内：空托盘堆垛 / 缠绕整垛 / 笼车 =====
       这三样是仓储卖场里「一看就知道是真在营业」的道具，
       之前只做了货架，后场一片空地反而像样板间。 */
    (function () {
      // 空托盘堆垛（8 块一组）
      const sx = -2.32, sz = 3.40;
      for (let i = 0; i < 8; i++) palletDeck(sx, WFY + 0.004 + i * 0.118, sz);

      // 缠绕膜整垛（已打包待出货的整托盘）
      const wx = -3.72, wz = 3.30;
      palletDeck(wx, WFY + 0.004, wz);
      b.box('wcFilm', PLD - 0.03, 1.24, PLW - 0.03, wx, WFY + PLT + 0.62, wz);
      b.box('wcCarton2', PLD - 0.02, 0.02, PLW - 0.02, wx, WFY + PLT + 0.30, wz);
      b.box('wcCarton2', PLD - 0.02, 0.02, PLW - 0.02, wx, WFY + PLT + 0.92, wz);
      b.box('wcBand', 0.02, 0.30, 0.34, wx + (PLD - 0.03) / 2 + 0.006, WFY + PLT + 0.44, wz);

      // 笼车（roll container）：底盘 + 四柱 + 网片 + 脚轮
      function cage(cx, cz, seed) {
        const CW = 0.78, CD = 0.68, CH = 1.58, BY = WFY + 0.30;
        b.box('wcMetalD', CD, 0.055, CW, cx, BY, cz);
        b.box('wcMetalD', CD - 0.06, 0.032, CW - 0.06, cx, BY + 0.62, cz);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) {
          b.box('wcMetalD', 0.042, CH, 0.042, cx + p[0] * (CD / 2 - 0.03), BY + CH / 2, cz + p[1] * (CW / 2 - 0.03));
        });
        b.box('wcMetalD', CD, 0.038, 0.038, cx, BY + CH, cz - (CW / 2 - 0.03));
        b.box('wcMetalD', CD, 0.038, 0.038, cx, BY + CH, cz + (CW / 2 - 0.03));
        b.box('wcMetalD', 0.038, 0.038, CW, cx - (CD / 2 - 0.03), BY + CH, cz);
        b.box('wcMetalD', 0.038, 0.038, CW, cx + (CD / 2 - 0.03), BY + CH, cz);
        for (let r = 0; r < 7; r++) {
          const yy = BY + 0.14 + r * 0.21;
          b.box('wcMetal', CD - 0.02, 0.016, 0.016, cx, yy, cz - (CW / 2 - 0.03));
          b.box('wcMetal', CD - 0.02, 0.016, 0.016, cx, yy, cz + (CW / 2 - 0.03));
          b.box('wcMetal', 0.016, 0.016, CW - 0.02, cx - (CD / 2 - 0.03), yy, cz);
          b.box('wcMetal', 0.016, 0.016, CW - 0.02, cx + (CD / 2 - 0.03), yy, cz);
        }
        for (let v = 0; v < 4; v++) {
          const zz = cz - (CW / 2 - 0.03) + v * (CW - 0.06) / 3;
          b.box('wcMetal', 0.016, CH - 0.10, 0.016, cx - (CD / 2 - 0.03), BY + CH / 2, zz);
          b.box('wcMetal', 0.016, CH - 0.10, 0.016, cx + (CD / 2 - 0.03), BY + CH / 2, zz);
        }
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) {
          b.cyl('tire', 0.058, 0.058, 0.036, 8,
            cx + p[0] * (CD / 2 - 0.06), WFY + 0.058, cz + p[1] * (CW / 2 - 0.06), Math.PI / 2, 0, 0);
        });
        // 笼内货物：分别落在底盘面与中层板上，不能悬空
        b.box(seed % 2 ? 'wcCarton' : 'wcCarton2', 0.34, 0.30, 0.40, cx, BY + 0.178, cz);
        b.box('wcCarton2', 0.36, 0.26, 0.36, cx, BY + 0.767, cz - 0.08);
        b.box('prod' + (1 + seed % 8), 0.30, 0.18, 0.30, cx - 0.02, BY + 0.987, cz + 0.12);
      }
      cage(-5.24, 3.32, 3);
      cage(-6.22, 3.30, 6);
    })();

    /* ===== 室内：冷藏冷冻玻璃门柜 ===== */
    (function () {
      const X0 = -2.75, X1 = -1.65, Z0 = 0.90, Z1 = 2.90;
      const H = 1.96, doors = 4, dz = (Z1 - Z0) / doors;
      b.box('wcCaseIn', 0.08, H - 0.30, Z1 - Z0, X0 + 0.05, WFY + H / 2, (Z0 + Z1) / 2);
      b.box('wcCase', X1 - X0, 0.18, Z1 - Z0, (X0 + X1) / 2, WFY + H - 0.09, (Z0 + Z1) / 2);
      b.box('wcCase', X1 - X0, 0.30, Z1 - Z0, (X0 + X1) / 2, WFY + 0.15, (Z0 + Z1) / 2);
      b.box('wcCase', X1 - X0, H, 0.10, (X0 + X1) / 2, WFY + H / 2, Z0 + 0.05);
      b.box('wcCase', X1 - X0, H, 0.10, (X0 + X1) / 2, WFY + H / 2, Z1 - 0.05);
      for (let s2 = 0; s2 < 3; s2++) {
        const sy = WFY + 0.50 + s2 * 0.46;
        b.box('wcShelf', X1 - X0 - 0.16, 0.04, Z1 - Z0 - 0.16, (X0 + X1) / 2, sy, (Z0 + Z1) / 2);
        b.box('tube', 0.032, 0.026, Z1 - Z0 - 0.26, X1 - 0.13, sy + 0.27, (Z0 + Z1) / 2);
        for (let d = 0; d < doors; d++) {
          for (let k = 0; k < 5; k++) {
            const zz = Z0 + 0.10 + d * dz + 0.16 + k * (dz - 0.32) / 4;
            const hh = 0.14 + ((d + s2 + k) % 3) * 0.028;
            b.box('prod' + (1 + ((d * 3 + k + s2 * 2) % 8)), 0.16, hh, 0.115,
              X1 - 0.24, sy + 0.02 + hh / 2, zz);
          }
        }
      }
      for (let d = 0; d < doors; d++) {
        const z0 = Z0 + d * dz;
        pane(g, dz - 0.09, H - 0.40, X1 + 0.01, WFY + (H - 0.22) / 2, z0 + dz / 2, Math.PI / 2);
        b.box('wcMetal', 0.05, H - 0.34, 0.05, X1 + 0.02, WFY + (H - 0.14) / 2, z0 + 0.04);
        b.box('wcMetal', 0.05, 0.38, 0.03, X1 + 0.06, WFY + 0.94, z0 + dz * 0.84);
      }
      b.box('wcMetal', 0.06, 0.06, Z1 - Z0, X1 + 0.03, WFY + H - 0.28, (Z0 + Z1) / 2);
      b.box('wcTrim2', 0.07, 0.14, Z1 - Z0, X1 + 0.03, WFY + 0.37, (Z0 + Z1) / 2);
      b.box('wcBand', X1 - X0 + 0.08, 0.22, Z1 - Z0 + 0.04, (X0 + X1) / 2, WFY + H + 0.10, (Z0 + Z1) / 2);
    })();

    /* ===== 室内：冷藏库 ===== */
    (function () {
      const X0 = -6.90, X1 = -5.10, Z0 = 4.05, Z1 = 5.55;
      const H = 2.55;
      b.box('wcCase', X1 - X0, H, 0.12, (X0 + X1) / 2, WFY + H / 2, Z1 - 0.06);
      b.box('wcCase', 0.12, H, Z1 - Z0, X0 + 0.06, WFY + H / 2, (Z0 + Z1) / 2);
      b.box('wcCase', 0.12, H, Z1 - Z0, X1 - 0.06, WFY + H / 2, (Z0 + Z1) / 2);
      b.box('wcCase', X1 - X0, 0.15, Z1 - Z0, (X0 + X1) / 2, WFY + H - 0.075, (Z0 + Z1) / 2);
      for (let k = 0; k < 3; k++) {
        b.box('wcShelf', X1 - X0 - 0.30, 0.05, 0.34, (X0 + X1) / 2, WFY + 0.62 + k * 0.66, 4.95);
        for (let i = 0; i < 5; i++) {
          b.box('wcCarton', 0.32, 0.28, 0.28, X0 + 0.40 + i * 0.42, WFY + 0.78 + k * 0.66, 4.95);
        }
      }
      pane(g, 1.55, 1.90, (X0 + X1) / 2, WFY + 1.02, Z0 - 0.02, 0);
      b.box('wcBand', 0.10, 2.10, 0.09, X0 + 0.32, WFY + 1.08, Z0 - 0.03);
      b.box('wcBand', 0.10, 2.10, 0.09, X1 - 0.32, WFY + 1.08, Z0 - 0.03);
      b.box('wcBand', X1 - X0, 0.10, 0.09, (X0 + X1) / 2, WFY + 2.14, Z0 - 0.03);
      b.box('wcBand', X1 - X0 + 0.10, 0.24, 0.14, (X0 + X1) / 2, WFY + 2.36, Z0 - 0.04);
    })();

    /* ===== 室内：烘焙 / 熟食区 ===== */
    (function () {
      const X0 = -4.85, X1 = -2.45, Z0 = 4.32, Z1 = 4.96;
      b.box('wcCounter', X1 - X0, 0.88, Z1 - Z0, (X0 + X1) / 2, WFY + 0.44, (Z0 + Z1) / 2);
      b.box('wcCounterTop', X1 - X0 + 0.06, 0.06, Z1 - Z0 + 0.08, (X0 + X1) / 2, WFY + 0.91, (Z0 + Z1) / 2);
      b.box('wcMetal', X1 - X0 - 0.10, 0.05, Z1 - Z0 - 0.10, (X0 + X1) / 2, WFY + 1.40, (Z0 + Z1) / 2);
      pane(g, X1 - X0 - 0.14, 0.46, (X0 + X1) / 2, WFY + 1.17, Z1 - 0.05, 0);
      for (let i = 0; i < 7; i++) {
        b.sph('prod2', 0.098, X0 + 0.26 + i * 0.30, WFY + 1.01, (Z0 + Z1) / 2, 1.5, 0.7, 1.1);
      }
      for (let i = 0; i < 6; i++) {
        b.box('wcCarton', 0.20, 0.13, 0.22, X0 + 0.30 + i * 0.33, WFY + 1.26, 4.48);
      }
      b.box('wcMetal', 1.16, 1.06, 0.48, -3.90, WFY + 0.53, 5.45);
      b.box('screen', 0.40, 0.24, 0.04, -3.90, WFY + 0.80, 5.68);
      b.box('wcShelf', 2.00, 0.05, 0.34, -3.30, WFY + 1.62, 5.50);
      for (let i = 0; i < 6; i++) {
        b.box('prod' + (1 + (i % 8)), 0.23, 0.21, 0.25, -4.10 + i * 0.34, WFY + 1.76, 5.50);
      }
    })();

    /* ===== 室内：收银线 ===== */
    function noTexMake(n) {
      return canvasTex(128, 128, function (c, w, h) {
        c.fillStyle = '#0a4a85'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#e8873a'; c.fillRect(0, h - 14, w, 14);
        c.fillStyle = '#ffffff';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '700 76px Arial, sans-serif';
        c.fillText(String(n), w / 2, 58);
      });
    }
    function checkout(xc, no) {
      const Z0 = 3.98, Z1 = 5.36;
      b.box('wcCounter', 0.60, 0.86, Z1 - Z0, xc, WFY + 0.43, (Z0 + Z1) / 2);
      b.box('wcCounterTop', 0.68, 0.06, Z1 - Z0 + 0.08, xc, WFY + 0.89, (Z0 + Z1) / 2);
      b.box('wcBelt', 0.42, 0.05, 0.92, xc, WFY + 0.925, 4.36);
      b.box('wcMetalD', 0.23, 0.09, 0.23, xc, WFY + 0.96, 4.98);
      b.box('wcMetalD', 0.06, 0.15, 0.06, xc, WFY + 1.03, 4.98);
      b.box('screen', 0.29, 0.23, 0.04, xc, WFY + 1.18, 5.00);
      b.box('wcMetalD', 0.05, 0.25, 0.05, xc - 0.34, WFY + 1.01, 4.56);
      b.box('screen', 0.04, 0.17, 0.21, xc - 0.34, WFY + 1.14, 4.56);
      b.cyl('wcMetal', 0.021, 0.021, 1.10, 5, xc - 0.30, WFY + 1.58, 5.22);
      b.box('wcBand', 0.27, 0.25, 0.05, xc - 0.30, WFY + 2.18, 5.22);
      const nm = new T.Mesh(new T.PlaneGeometry(0.23, 0.23),
        new T.MeshBasicMaterial({ map: noTexMake(no) }));
      nm.position.set(xc - 0.30, WFY + 2.18, 5.25);
      g.add(nm);
      b.box('prod7', 0.10, 0.12, 0.10, xc + 0.16, WFY + 0.98, 4.14);
      b.box('prod3', 0.12, 0.15, 0.13, xc - 0.02, WFY + 0.995, 4.06);
    }
    checkout(-1.30, 1);
    checkout(-0.50, 2);
    checkout(0.30, 3);
    b.box('wcMetal', 0.34, 0.58, 0.28, -1.30, WFY + 0.29, 5.55);
    b.box('prod7', 0.32, 0.26, 0.24, -1.30, WFY + 0.71, 5.55);

    /* ===== 室内：会员服务台 ===== */
    b.box('wcCounter', 0.50, 1.00, 1.14, 0.52, WFY + 0.50, -3.72);
    b.box('wcCounterTop', 0.58, 0.06, 1.20, 0.52, WFY + 1.03, -3.72);
    b.box('wcBand', 0.05, 0.38, 1.14, 0.78, WFY + 0.62, -3.72);
    b.box('wcMetalD', 0.05, 0.25, 0.05, 0.66, WFY + 1.13, -4.10);
    b.box('screen', 0.04, 0.23, 0.31, 0.66, WFY + 1.29, -4.10);
    b.box('prod7', 0.16, 0.02, 0.24, 0.44, WFY + 1.07, -3.50);

    /* ===== 室内：购物车 ===== */
    function cartAt(cx, cz) {
      b.box('wcMetal', 0.42, 0.33, 0.56, cx, 0.72, cz);
      b.box('wcMetalD', 0.35, 0.05, 0.50, cx, 0.53, cz);
      [[-0.18, 0.24], [-0.18, -0.24], [0.18, 0.24], [0.18, -0.24]].forEach(function (p) {
        b.box('wcMetalD', 0.035, 0.35, 0.035, cx + p[0], 0.36, cz + p[1]);
      });
      b.cyl('wcMetalD', 0.022, 0.022, 0.58, 6, cx - 0.24, 0.98, cz, Math.PI / 2, 0, 0);
      b.box('wcMetalD', 0.035, 0.31, 0.035, cx - 0.24, 0.84, cz + 0.26);
      b.box('wcMetalD', 0.035, 0.31, 0.035, cx - 0.24, 0.84, cz - 0.26);
      [[0.16, 0.22], [0.16, -0.22], [-0.16, 0.22], [-0.16, -0.22]].forEach(function (p) {
        b.cyl('tire', 0.046, 0.046, 0.04, 6, cx + p[0], 0.048, cz + p[1], Math.PI / 2, 0, 0);
      });
    }
    cartAt(0.86, -2.86);
    cartAt(0.86, -2.26);
    cartAt(0.86, -1.66);
    // 平板车
    b.box('wcYel', 0.54, 0.10, 0.90, -0.42, 0.36, -1.30);
    b.box('wcMetalD', 0.06, 0.40, 0.06, -0.42, 0.54, -0.84);
    b.box('wcMetalD', 0.48, 0.05, 0.06, -0.42, 0.72, -0.84);
    [[-0.58, -0.38], [-0.58, 0.38]].forEach(function (p) {
      b.cyl('tire', 0.10, 0.10, 0.06, 8, p[0], 0.10, -1.30 + p[1], Math.PI / 2, 0, 0);
    });

    /* ===== 室内：促销堆头 ===== */
    function promo(x, z, seed) {
      b.box('wcPallet', 0.80, 0.10, 0.90, x, WFY + 0.05, z);
      let yy = WFY + 0.10;
      for (let i = 0; i < 4; i++) {
        b.box('wcCarton', 0.72, 0.25, 0.82, x, yy + 0.125, z);
        if (i === 0) {
          b.box('prod' + (1 + ((seed) % 8)), 0.726, 0.10, 0.826, x, yy + 0.14, z);
        }
        yy += 0.255;
      }
      b.box('wcMetalD', 0.03, 1.00, 0.03, x - 0.42, WFY + 0.50, z + 0.48);
      b.box('wcCounter', 0.02, 0.28, 0.40, x - 0.42, WFY + 1.11, z + 0.48);
      b.box('prod1', 0.01, 0.09, 0.32, x - 0.432, WFY + 1.05, z + 0.48);
    }
    promo(-0.98, -1.05, 2);
    promo(-0.98, 0.15, 6);
    promo(-0.98, 1.55, 11);

    /* ===== 室内：悬挂导视 ===== */
    [[-3.275, 0.30, TEX.clubHang1], [-5.425, -2.20, TEX.clubHang2], [-3.275, -4.00, TEX.clubHang3]].forEach(function (q) {
      b.cyl('wcMetalD', 0.012, 0.012, 0.56, 4, q[0] - 0.52, 4.30, q[1]);
      b.cyl('wcMetalD', 0.012, 0.012, 0.56, 4, q[0] + 0.52, 4.30, q[1]);
      b.box('wcBand', 0.055, 0.96, 1.36, q[0] - 0.02, 3.56, q[1]);
      const m = new T.Mesh(new T.PlaneGeometry(1.30, 0.93),
        new T.MeshBasicMaterial({ map: q[2], side: T.DoubleSide }));
      m.position.set(q[0] + 0.01, 3.56, q[1]);
      m.rotation.y = Math.PI / 2;
      g.add(m);
    });

    /* ===== 室内：叉车 ===== */
    (function () {
      const fb = new Builder();
      fb.box('wcYel', 0.64, 0.48, 0.92, 0, 0.33, 0);
      fb.box('wcYel', 0.58, 0.15, 0.86, 0, 0.63, 0);
      fb.box('wcMetalD', 0.54, 0.42, 0.29, 0, 0.35, -0.54);
      fb.box('wcSeat', 0.29, 0.15, 0.27, 0, 0.77, -0.14);
      fb.box('wcSeat', 0.27, 0.32, 0.06, 0, 0.94, -0.29);
      [[-0.25, 0.30], [0.25, 0.30], [-0.25, -0.35], [0.25, -0.35]].forEach(function (p) {
        fb.box('wcMetalD', 0.043, 0.70, 0.043, p[0], 1.06, p[1]);
      });
      fb.box('wcMetalD', 0.60, 0.05, 0.75, 0, 1.42, -0.02);
      fb.box('wcMetalD', 0.085, 1.80, 0.085, -0.23, 1.00, 0.48);
      fb.box('wcMetalD', 0.085, 1.80, 0.085, 0.23, 1.00, 0.48);
      fb.box('wcMetalD', 0.48, 0.07, 0.07, 0, 1.88, 0.48);
      fb.box('wcMetalD', 0.09, 0.05, 0.88, -0.14, 0.16, 0.94);
      fb.box('wcMetalD', 0.09, 0.05, 0.88, 0.14, 0.16, 0.94);
      fb.box('wcMetalD', 0.40, 0.05, 0.10, 0, 0.16, 0.51);
      [[0.30, 0.29], [0.30, -0.29], [-0.30, 0.29], [-0.30, -0.29]].forEach(function (p) {
        fb.cyl('tire', 0.14, 0.14, 0.10, 10, p[0], 0.14, p[1], 0, 0, Math.PI / 2);
      });
      fb.box('prod5', 0.09, 0.07, 0.09, 0, 1.48, -0.29);
      const grp = new T.Group();
      fb.build(grp);
      grp.position.set(-5.425, WFY, 1.30);
      grp.rotation.y = -0.30;
      g.add(grp);
    })();

    /* ===== 外挂：落水管 / 壁灯 / 空调外机 ===== */
    [[WX1 + 0.10, WZ0 + 0.25], [WX1 + 0.10, WZ1 - 0.25], [WX0 - 0.10, WZ0 + 0.25], [WX0 - 0.10, WZ1 - 0.25]].forEach(function (p) {
      b.cyl('wcMetalD', 0.055, 0.055, WH - 0.10, 8, p[0], (WH - 0.10) / 2, p[1]);
    });
    // 壁灯（装在实墙上，不能悬在玻璃上）
    [[-6.00], [5.525]].forEach(function (p) {
      b.box('tube', 0.10, 0.15, 0.32, WX1 + 0.11, 3.36, p[0]);
      b.box('wcMetalD', 0.14, 0.06, 0.38, WX1 + 0.11, 3.47, p[0]);
    });
    // 侧墙装饰带 + 墙面标识
    b.box('wcBody2', WD - 0.30, 0.09, 0.06, WCX, 1.30, WZ1 + 0.05);
    b.box('wcBody2', 3.10, 0.055, 0.055, -3.20, 3.50, WZ1 + 0.07);
    b.box('wcBody2', 3.10, 0.055, 0.055, -3.20, 2.90, WZ1 + 0.07);
    const wsd = new T.Mesh(new T.PlaneGeometry(2.90, 0.50),
      new T.MeshBasicMaterial({ map: TEX.clubSide }));
    wsd.position.set(-3.20, 3.20, WZ1 + 0.095);
    g.add(wsd);
    // 侧墙空调外机
    [[-2.40], [0.60]].forEach(function (p) {
      b.box('wcMetal', 0.86, 0.58, 0.32, p[0], 2.90, WZ1 + 0.20);
      b.cyl('wcMetalD', 0.23, 0.23, 0.04, 12, p[0], 2.90, WZ1 + 0.37, Math.PI / 2, 0, 0);
      b.box('wcTrim2', 0.86, 0.05, 0.36, p[0], 3.21, WZ1 + 0.20);
      b.box('wcTrim2', 0.86, 0.05, 0.36, p[0], 2.59, WZ1 + 0.20);
      b.box('wcMetalD', 0.05, 0.05, 0.34, p[0] - 0.34, 2.54, WZ1 + 0.16);
      b.box('wcMetalD', 0.05, 0.05, 0.34, p[0] + 0.34, 2.54, WZ1 + 0.16);
      for (let i = 0; i < 4; i++) {
        b.box('wcMetalD', 0.68, 0.016, 0.02, p[0], 2.74 + i * 0.11, WZ1 + 0.37);
      }
    });

    /* ===== 后场装卸门 ===== */
    [-3.20, 0.60].forEach(function (p) {
      b.box('wcMetal', 0.10, 2.05, 1.86, WX0 - 0.05, WFY + 1.02, p);
      for (let i = 0; i < 9; i++) {
        b.box('wcTrim2', 0.035, 0.022, 1.86, WX0 - 0.108, WFY + 0.18 + i * 0.22, p);
      }
      b.box('matDark', 0.13, 0.34, 0.20, WX0 - 0.10, WFY + 0.55, p - 1.04);
      b.box('matDark', 0.13, 0.34, 0.20, WX0 - 0.10, WFY + 0.55, p + 1.04);
      b.box('tube', 0.11, 0.11, 0.24, WX0 - 0.12, WFY + 2.44, p);
      b.box('wcMetalD', 0.14, 0.05, 0.28, WX0 - 0.12, WFY + 2.53, p);
      b.box('wcTrim2', 0.14, 0.16, 2.06, WX0 - 0.06, WFY + 2.14, p);
      b.box('wcBand', 0.16, 0.20, 2.10, WX0 - 0.07, WFY + 2.28, p);
      b.box('matDark', 0.10, 0.30, 0.22, WX0 - 0.10, WFY - 0.05, p - 1.02);
      b.box('matDark', 0.10, 0.30, 0.22, WX0 - 0.10, WFY - 0.05, p + 1.02);
    });

    b.build(g);
    return g;
  }

  /* ================= 自动化工厂仓库（wh 形制） =================
     大盒子厂房 + 正面整片玻璃幕，从外面能直接看到：高位货架、环形输送线、
     料箱在线上走、机械臂工作站、叉车、托盘。地面是环氧地坪 + 全套安全标线。
  */
  const FX0 = -6.80, FX1 = 2.60, FZ0 = -6.80, FZ1 = 4.20;
  const FCX = (FX0 + FX1) / 2, FCZ = (FZ0 + FZ1) / 2;
  const FDX = FX1 - FX0, FDZ = FZ1 - FZ0;
  const FGY = 0.12;            // 场地混凝土面
  const FFL = 0.26;            // 室内地坪
  const FHT = 5.50;            // 柱高
  const FEV = FFL + FHT;       // 檐口 5.76
  const MOVERS = [];           // 动态物件（料箱 / 搬运车）

  /* 厂区标识贴图 */
  (function () {
    function tag(txt, sub) {
      return canvasTex(256, 168, function (c, w, h) {
        c.fillStyle = '#e9ece6'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#2f5f92'; c.fillRect(0, 0, w, 46);
        c.fillStyle = '#fff';
        c.font = '700 34px Arial, sans-serif';
        c.textAlign = 'center';
        c.fillText(sub, w / 2, 36);
        c.fillStyle = '#1f2c38';
        c.font = '700 76px Arial, sans-serif';
        c.fillText(txt, w / 2, 130);
      });
    }
    TEX.whTagA = tag('01-03', 'A 区 横梁货架');
    TEX.whTagB = tag('04-06', 'B 区 横梁货架');
    TEX.whTagC = tag('07-09', 'C 区 拣选货位');

    function zone(main, sub, bg) {
      return canvasTex(384, 96, function (c, w, h) {
        c.fillStyle = bg; c.fillRect(0, 0, w, h);
        c.fillStyle = '#f2f5ef';
        c.font = '700 40px "Microsoft YaHei", Arial, sans-serif';
        c.textAlign = 'left';
        c.fillText(main, 20, 58);
        c.font = '400 22px Arial, sans-serif';
        c.fillStyle = '#d6dcd4';
        c.fillText(sub, 20, 84);
        c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 3;
        c.strokeRect(4, 4, w - 8, h - 8);
      });
    }
    TEX.whZone1 = zone('存储区 A', 'STORAGE / ASRS', '#2f5f92');
    TEX.whZone2 = zone('拣选作业区', 'PICKING', '#3c6b52');
    TEX.whZone3 = zone('打包 · 复核', 'PACK & CHECK', '#8a5a2a');

    /* 外墙名牌 */
    TEX.whName = canvasTex(768, 200, function (c, w, h) {
      c.fillStyle = '#1d4c7c'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,.10)';
      c.fillRect(0, h - 46, w, 46);
      c.fillStyle = '#f4f7f5';
      c.font = '700 74px "Microsoft YaHei", Arial, sans-serif';
      c.textAlign = 'left';
      c.fillText('恒 仓 · 自动化立体仓库', 34, 96);
      c.fillStyle = '#9fc0d8';
      c.font = '400 30px Arial, sans-serif';
      c.fillText('HENGCANG  AUTOMATED  WAREHOUSE', 36, 146);
      /* 右侧标识块 */
      c.fillStyle = '#e8b23a';
      c.fillRect(w - 118, 30, 8, 108);
      c.fillStyle = '#f4f7f5';
      c.font = '700 40px Arial, sans-serif';
      c.textAlign = 'center';
      c.fillText('24H', w - 62, 78);
      c.font = '400 22px Arial, sans-serif';
      c.fillText('AS/RS', w - 62, 112);
    });

    /* 地面大字（消防通道） */
    TEX.whStencil = canvasTex(512, 176, function (c, w, h) {
      c.clearRect(0, 0, w, h);
      c.strokeStyle = 'rgba(214,176,58,0.96)';
      c.lineWidth = 7;
      c.strokeRect(10, 10, w - 20, h - 20);
      c.fillStyle = 'rgba(214,176,58,0.96)';
      c.textAlign = 'center';
      c.font = '700 62px "Microsoft YaHei", Arial, sans-serif';
      c.fillText('消防通道', w / 2, 80);
      c.font = '700 42px Arial, sans-serif';
      c.fillText('KEEP  CLEAR', w / 2, 138);
    });
  })();

  /* 地面标线：贴地薄片，抬 4mm 防 z-fighting */
  function lineBox(b, k, x0, z0, x1, z1, y) {
    b.box(k, Math.abs(x1 - x0) || 0.06, 0.008, Math.abs(z1 - z0) || 0.06,
      (x0 + x1) / 2, y, (z0 + z1) / 2);
  }
  /* 地面箭头（三段拼：杆 + 两个斜翼） */
  function lineArrow(b, k, x, z, dir, y, sc) {
    const s = sc || 1;
    b.box(k, 0.11 * s, 0.008, 0.46 * s, x, y, z - dir * 0.10 * s);
    b.box(k, 0.11 * s, 0.008, 0.34 * s, x - 0.15 * s, y, z + dir * 0.20 * s, 0, dir * 0.80, 0);
    b.box(k, 0.11 * s, 0.008, 0.34 * s, x + 0.15 * s, y, z + dir * 0.20 * s, 0, -dir * 0.80, 0);
  }

  /* ---------- 场地：混凝土场坪 / 装卸场 / 排水 ---------- */
  function buildWhSite() {
    const g = new T.Group();
    const b = new Builder();

    /* 展台剖切 */
    b.box('whBase2', 18.6, 0.30, 18.6, 0, -1.82, 0);
    b.box('whBase', 18.0, 0.16, 18.0, 0, -1.58, 0);
    b.box('stoneD', 17.4, 1.50, 17.4, 0, -0.75, 0);

    /* 场坪 */
    b.box('whApron', 17.4, 0.12, 17.4, 0, 0.06, 0);

    /* 混凝土分仓缝 */
    for (let z = -8.4; z < 8.5; z += 2.10) {
      b.box('whApron2', 17.4, 0.006, 0.035, 0, 0.122, z);
    }
    for (let x = -8.4; x < 8.5; x += 2.10) {
      b.box('whApron2', 0.035, 0.006, 17.4, x, 0.122, 0);
    }

    /* 装卸场：从 +Z 墙往外的混凝土站台 + 坡道 */
    b.box('whDockApron', 9.60, 0.14, 3.60, -3.20, 0.19, 6.10);
    b.box('whDockEdge', 9.60, 0.30, 0.14, -3.20, 0.15, 4.30);
    /* 站台边缘黄黑警示带 */
    for (let i = 0; i < 12; i++) {
      b.box(i % 2 ? 'whWarn' : 'matDark', 0.40, 0.012, 0.16, -7.60 + i * 0.80, 0.262, 4.28);
    }
    /* 坡道 */
    b.box('whDockApron', 3.40, 0.14, 1.30, 3.40, 0.19, 5.10, 0, 0, -0.055);

    /* 两个车位的导向线 + 车轮挡块 */
    const bays = [-5.55, -2.05];
    for (let i = 0; i < bays.length; i++) {
      const bx = bays[i];
      lineBox(b, 'whLineW', bx - 1.55, 5.10, bx - 1.45, 7.60, 0.268);
      lineBox(b, 'whLineW', bx + 1.45, 5.10, bx + 1.55, 7.60, 0.268);
      b.box('matDark', 0.26, 0.13, 0.14, bx - 1.05, 0.325, 7.30);
      b.box('matDark', 0.26, 0.13, 0.14, bx + 1.05, 0.325, 7.30);
    }
    /* 倒车入位箭头 */
    lineArrow(b, 'whLineW', -5.55, 6.05, 1, 0.268, 1.25);
    lineArrow(b, 'whLineW', -2.05, 6.05, 1, 0.268, 1.25);

    /* 场坪主车道中心虚线 */
    for (let z = -8.0; z < 4.0; z += 1.10) {
      lineBox(b, 'whLineW', 6.10, z, 6.28, z + 0.62, 0.127);
    }
    lineArrow(b, 'whLineW', 6.19, -1.60, 1, 0.127, 1.15);
    lineArrow(b, 'whLineW', 6.19, 1.90, 1, 0.127, 1.15);

    /* 场地照明杆 */
    function pole(px, pz) {
      b.box('whWalk2', 0.42, 0.09, 0.42, px, 0.165, pz);
      b.cyl('metalD', 0.075, 0.095, 5.10, 8, px, 2.65, pz);
      b.box('metalD', 0.10, 0.10, 0.86, px, 5.16, pz - 0.42);
      b.box('whLamp', 0.30, 0.13, 0.52, px, 5.02, pz - 0.80);
    }
    pole(7.35, -6.30);
    pole(7.35, 2.30);

    /* 排水明沟：暗色槽底 + 密排格栅，单排灰块会看成散落的砖 */
    b.box('matDark', 0.36, 0.006, 10.9, 3.18, 0.1235, -1.30);
    for (let z = -6.6; z < 4.0; z += 0.13) {
      b.box('metalD', 0.33, 0.009, 0.078, 3.18, 0.1295, z);
    }

    /* 人行横道：从正面人行门通向场坪 */
    for (let i = 0; i < 7; i++) {
      b.box('whLineW', 0.32, 0.008, 0.96, 3.32 + i * 0.46, 0.126, 1.28);
    }

    /* 装卸门前黄色网格（消防通道禁止占用） */
    for (let x = -7.30; x < -0.30; x += 0.36) {
      b.box('whWarn', 0.16, 0.008, 0.58, x, 0.2645, 4.70);
    }
    b.box('whWarn', 0.09, 0.008, 0.66, -7.62, 0.2645, 4.70);
    b.box('whWarn', 0.09, 0.008, 0.66, 0.02, 0.2645, 4.70);

    /* 雨水井 */
    b.cyl('metalD', 0.36, 0.36, 0.035, 16, 6.55, 0.135, 3.55);
    b.cyl('matDark', 0.30, 0.30, 0.012, 16, 6.55, 0.152, 3.55);

    /* 防撞柱：立在装卸站台边 */
    for (let i = 0; i < 4; i++) {
      const px = -6.85 + i * 2.98;
      b.cyl('whGuard', 0.085, 0.085, 0.72, 10, px, 0.62, 4.62);
      b.cyl('matDark', 0.088, 0.088, 0.10, 10, px, 0.86, 4.62);
    }

    /* 室外作业痕迹：待发托盘 / 周转箱 / 锥桶 */
    whPalletLoad(b, 0.72, 0.26, 5.75, 4, false);
    b.box('whBin', 0.50, 0.20, 0.38, 0.72, 0.26 + 0.86, 5.75);
    function whCone(x, z, y) {
      b.box('matDark', 0.20, 0.022, 0.20, x, y + 0.011, z);
      b.cyl('whWarn', 0.030, 0.078, 0.28, 8, x, y + 0.15, z);
      b.cyl('whSign', 0.055, 0.062, 0.045, 8, x, y + 0.185, z);
    }
    whCone(2.95, -0.30, 0.12);
    whCone(3.55, -0.30, 0.12);
    whCone(2.95, 4.95, 0.26);
    whCone(3.85, 5.05, 0.12);

    /* 地面大字 */
    (function () {
      const st = new T.Mesh(new T.PlaneGeometry(2.30, 0.80),
        new T.MeshBasicMaterial({ map: TEX.whStencil, transparent: true, depthWrite: false }));
      st.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
      st.position.set(4.52, 0.129, -3.10);
      g.add(st);
    })();

    b.build(g);
    return g;
  }

  /* ---------- 厂房外壳：地坪 / 墙 / 屋架 / 玻璃幕 / 装卸门 ---------- */
  function buildWhShell() {
    const g = new T.Group();
    const b = new Builder();

    /* 室内地坪（环氧） */
    b.box('whFloor', FDX + 0.30, 0.14, FDZ + 0.30, FCX, FFL - 0.07, FCZ);
    /* 地坪伸缩缝 */
    for (let x = FX0 + 2.0; x < FX1; x += 2.35) {
      b.box('whFloor2', 0.03, 0.008, FDZ + 0.20, x, FFL + 0.004, FCZ);
    }
    for (let z = FZ0 + 2.2; z < FZ1; z += 2.35) {
      b.box('whFloor2', FDX + 0.20, 0.008, 0.03, FCX, FFL + 0.004, z);
    }

    /* 外墙：背面 + 左端 + 右端（右端墙要按装卸门洞分段） */
    const T2 = 0.22;
    const DK = [-5.40, -2.40];       // 两个装卸门的中心 x
    const DWW = 2.60, DHH = 3.20;    // 门洞宽 / 高
    b.box('whWall', T2, FHT, FDZ, FX0 - T2 / 2, FFL + FHT / 2, FCZ);              // 背墙
    b.box('whWall', FDX, FHT, T2, FCX, FFL + FHT / 2, FZ0 - T2 / 2);              // 左端墙
    /* 右端墙：三段实墙 + 门楣，中间留出两个门洞 */
    (function () {
      const o0 = DK[0] - DWW / 2, o1 = DK[0] + DWW / 2;
      const p0 = DK[1] - DWW / 2, p1 = DK[1] + DWW / 2;
      const segs = [[FX0, o0], [o1, p0], [p1, FX1]];
      for (let i = 0; i < segs.length; i++) {
        const a = segs[i][0], bnd = segs[i][1];
        if (bnd - a < 0.02) continue;
        b.box('whWall', bnd - a, FHT, T2, (a + bnd) / 2, FFL + FHT / 2, FZ1 + T2 / 2);
      }
      /* 门楣 */
      for (let i = 0; i < DK.length; i++) {
        b.box('whWall', DWW, FHT - DHH, T2, DK[i], FFL + DHH + (FHT - DHH) / 2, FZ1 + T2 / 2);
      }
    })();
    /* 墙裙（右端墙不铺，避免横穿门洞） */
    b.box('whBaseB', 0.06, 0.62, FDZ - 0.1, FX0 + 0.03, FFL + 0.31, FCZ);
    b.box('whBaseB', FDX - 0.1, 0.62, 0.06, FCX, FFL + 0.31, FZ0 + 0.03);

    /* 墙面竖肋（压型钢板观感） */
    for (let z = FZ0 + 0.34; z < FZ1; z += 0.38) {
      b.box('whWall2', 0.05, FHT - 0.12, 0.055, FX0 + 0.04, FFL + FHT / 2, z);
    }
    for (let x = FX0 + 0.34; x < FX1; x += 0.38) {
      b.box('whWall2', 0.055, FHT - 0.12, 0.05, x, FFL + FHT / 2, FZ0 + 0.04);
      /* 右端墙的肋要避开门洞 */
      let inDoor = false;
      for (let d = 0; d < DK.length; d++) {
        if (Math.abs(x - DK[d]) < DWW / 2) inDoor = true;
      }
      if (!inDoor) b.box('whWall2', 0.055, FHT - 0.12, 0.05, x, FFL + FHT / 2, FZ1 - 0.04);
    }

    /* 抗风柱 */
    for (let i = 0; i <= 4; i++) {
      const z = FZ0 + 0.30 + i * (FDZ - 0.60) / 4;
      b.box('whSteel', 0.20, FHT, 0.24, FX0 + 0.24, FFL + FHT / 2, z);
    }

    /* 屋架（每 2.7m 一榀，横跨 X） */
    const TRZ = [FZ0 + 0.30, FZ0 + 3.00, FZ0 + 5.70, FZ0 + 8.40, FZ1 - 0.30];
    for (let i = 0; i < TRZ.length; i++) {
      const z = TRZ[i];
      /* 下弦 / 上弦 */
      b.box('whTruss', FDX - 0.20, 0.13, 0.11, FCX, FEV - 0.62, z);
      b.box('whTruss', FDX - 0.20, 0.13, 0.11, FCX, FEV - 0.05, z);
      /* 腹杆 */
      const N = 10;
      for (let k = 0; k < N; k++) {
        const x = FX0 + 0.30 + k * (FDX - 0.60) / N;
        const x2 = FX0 + 0.30 + (k + 1) * (FDX - 0.60) / N;
        b.to('whTruss', 0.038, x, FEV - 0.62, z, x2, FEV - 0.05, z, 4);
        b.to('whTruss', 0.030, x, FEV - 0.62, z, x, FEV - 0.05, z, 4);
      }
      /* 柱 */
      [FX0 + 1.05, FCX, FX1 - 1.35].forEach(function (cx) {
        b.box('whSteel', 0.19, FHT, 0.19, cx, FFL + FHT / 2, z);
        b.box('whSteel2', 0.30, 0.10, 0.30, cx, FFL + 0.05, z);
      });
    }
    /* 檩条 */
    for (let x = FX0 + 0.60; x < FX1; x += 0.92) {
      b.box('whTruss', 0.09, 0.09, FDZ - 0.30, x, FEV - 0.02, FCZ);
    }

    /* 屋面：分条铺板，留出采光带 */
    const SKY = [[-6.60, -5.10], [-4.30, -2.30], [-1.50, 0.50], [1.30, 2.50]];
    /* 沿 X 的实铺带 */
    const solid = [[FX0 - 0.30, -6.60], [-5.10, -4.30], [-2.30, -1.50], [0.50, 1.30], [2.50, FX1 + 0.30]];
    for (let i = 0; i < solid.length; i++) {
      const s = solid[i];
      b.box('whRoof', s[1] - s[0], 0.14, FDZ + 0.30, (s[0] + s[1]) / 2, FEV + 0.10, FCZ);
    }
    for (let i = 0; i < SKY.length; i++) {
      const s = SKY[i];
      b.box('whRoof2', s[1] - s[0], 0.10, FDZ + 0.30, (s[0] + s[1]) / 2, FEV + 0.16, FCZ);
      b.box('whSky', s[1] - s[0] - 0.16, 0.06, FDZ + 0.10, (s[0] + s[1]) / 2, FEV + 0.20, FCZ);
    }
    /* 女儿墙 */
    b.box('whWall2', FDX + 0.30, 0.42, 0.12, FCX, FEV + 0.40, FZ0 - 0.10);
    b.box('whWall2', FDX + 0.30, 0.42, 0.12, FCX, FEV + 0.40, FZ1 + 0.10);
    b.box('whWall2', 0.12, 0.42, FDZ + 0.30, FX0 - 0.10, FEV + 0.40, FCZ);

    /* 屋面机组 */
    [[-4.40, -4.20, 1.5, 1.1], [-1.20, 0.90, 1.3, 0.9], [1.10, -2.40, 1.2, 0.8]]
      .forEach(function (u) {
        b.box('metalD', u[2], 0.34, u[3], u[0], FEV + 0.34, u[1]);
        b.box('metal', u[2] - 0.14, 0.10, u[3] - 0.14, u[0], FEV + 0.53, u[1]);
        b.cyl('matDark', 0.24, 0.24, 0.05, 12, u[0], FEV + 0.59, u[1]);
      });

    /* ---- 正面玻璃幕 ---- */
    /* 竖梃 */
    for (let z = FZ0; z <= FZ1 + 0.01; z += 1.10) {
      b.box('whSteel', 0.12, FHT, 0.085, FX1 - 0.05, FFL + FHT / 2, z);
    }
    /* 横档 */
    [0.10, 1.62, 2.98, 4.32, FHT - 0.10].forEach(function (h) {
      b.box('whSteel', 0.11, 0.075, FDZ, FX1 - 0.05, FFL + h, FCZ);
    });
    /* 玻璃压条（下沿） */
    b.box('whSteel2', 0.14, 0.14, FDZ, FX1 - 0.06, FFL + 0.07, FCZ);
    /* 玻璃本体：单独 Mesh，不进 Builder */
    const glassMat = new T.MeshToonMaterial({
      color: 0xcfe6ee, gradientMap: GRAD, transparent: true,
      opacity: 0.10, depthWrite: false, side: T.DoubleSide
    });
    const glass = new T.Mesh(new T.PlaneGeometry(FDZ - 0.10, FHT - 0.24), glassMat);
    glass.rotation.y = -Math.PI / 2;
    glass.position.set(FX1 - 0.06, FFL + FHT / 2, FCZ);
    glass.renderOrder = 3;
    g.add(glass);
    /* 斜向反光条 */
    const glareMat = new T.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.15,
      blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide
    });
    for (let i = 0; i < 7; i++) {
      const gl = new T.Mesh(new T.PlaneGeometry(0.28, 5.0), glareMat);
      gl.rotation.set(0, -Math.PI / 2, 0.42);
      gl.position.set(FX1 - 0.04, FFL + 2.4, FZ0 + 0.9 + i * 1.55);
      gl.renderOrder = 4;
      g.add(gl);
    }

    /* 正面人行门（靠右端）：门框 + 玻璃门扇，不能做成一整块实心板 */
    (function () {
      const dz = 1.28;
      b.box('whSteel2', 0.18, 2.26, 0.10, FX1 - 0.04, FFL + 1.13, dz - 0.58);
      b.box('whSteel2', 0.18, 2.26, 0.10, FX1 - 0.04, FFL + 1.13, dz + 0.58);
      b.box('whSteel2', 0.18, 0.10, 1.26, FX1 - 0.04, FFL + 2.26, dz);
      /* 门扇边框 */
      b.box('whDoor', 0.06, 2.10, 0.06, FX1 - 0.10, FFL + 1.10, dz - 0.46);
      b.box('whDoor', 0.06, 2.10, 0.06, FX1 - 0.10, FFL + 1.10, dz + 0.46);
      b.box('whDoor', 0.06, 0.09, 1.00, FX1 - 0.10, FFL + 2.11, dz);
      b.box('whDoor', 0.06, 0.30, 1.00, FX1 - 0.10, FFL + 0.15, dz);
      /* 玻璃芯：必须是真透明片。用浅色实心 box 会读成一块白板，门就没了 */
      const dG = new T.Mesh(new T.PlaneGeometry(0.90, 1.70),
        new T.MeshToonMaterial({
          color: 0xcfe6ee, gradientMap: GRAD, transparent: true,
          opacity: 0.16, depthWrite: false, side: T.DoubleSide
        }));
      dG.rotation.y = -Math.PI / 2;
      dG.position.set(FX1 - 0.10, FFL + 1.20, dz);
      dG.renderOrder = 3;
      g.add(dG);
      /* 推杆 + 把手 */
      b.box('metal', 0.05, 0.05, 0.70, FX1 - 0.145, FFL + 1.02, dz);
      b.box('metal', 0.05, 0.16, 0.05, FX1 - 0.145, FFL + 1.02, dz + 0.34);
    })();

    /* 正面檐下招牌带 */
    b.box('whBand', 0.12, 0.66, FDZ + 0.10, FX1 + 0.16, FEV - 0.40, FCZ);
    b.box('whSteel2', 0.16, 0.05, FDZ + 0.16, FX1 + 0.17, FEV - 0.06, FCZ);
    b.box('whSteel2', 0.16, 0.05, FDZ + 0.16, FX1 + 0.17, FEV - 0.73, FCZ);
    (function () {
      const sgn = new T.Mesh(new T.PlaneGeometry(3.10, 0.56),
        new T.MeshBasicMaterial({ map: TEX.whName }));
      sgn.rotation.y = Math.PI / 2;
      sgn.position.set(FX1 + 0.225, FEV - 0.40, -1.30);
      g.add(sgn);
      /* 檐口泛光条 */
      b.box('whLamp', 0.06, 0.05, FDZ - 0.30, FX1 + 0.10, FEV - 0.80, FCZ);
    })();

    /* ---- 装卸门（右端墙 +Z）：门扇做在开出来的洞里 ---- */
    for (let i = 0; i < DK.length; i++) {
      const dx = DK[i];
      /* 洞内包边（左右 + 顶） */
      b.box('whSteel2', 0.10, DHH, T2 + 0.04, dx - DWW / 2 + 0.05, FFL + DHH / 2, FZ1 + T2 / 2);
      b.box('whSteel2', 0.10, DHH, T2 + 0.04, dx + DWW / 2 - 0.05, FFL + DHH / 2, FZ1 + T2 / 2);
      b.box('whSteel2', DWW, 0.10, T2 + 0.04, dx, FFL + DHH - 0.05, FZ1 + T2 / 2);
      /* 卷帘门扇：贴着洞内侧 */
      b.box('whDoor', DWW - 0.20, DHH - 0.10, 0.07, dx, FFL + (DHH - 0.10) / 2, FZ1 + 0.06);
      for (let k = 0; k < 12; k++) {
        b.box(k % 2 ? 'whDoor2' : 'whDoor', DWW - 0.22, 0.115, 0.04,
          dx, FFL + 0.16 + k * 0.245, FZ1 + 0.105);
      }
      /* 卷轴罩 */
      b.box('metalD', DWW + 0.10, 0.28, 0.26, dx, FFL + DHH + 0.16, FZ1 + 0.22);
      /* 侧导轨 */
      [-1, 1].forEach(function (s) {
        b.box('metalD', 0.07, DHH, 0.09, dx + s * (DWW / 2 - 0.06), FFL + DHH / 2, FZ1 + 0.16);
      });
      /* 防撞垫（洞外两侧） */
      b.box('matDark', 0.22, 0.72, 0.24, dx - DWW / 2 - 0.16, FFL + 0.56, FZ1 + T2 + 0.10);
      b.box('matDark', 0.22, 0.72, 0.24, dx + DWW / 2 + 0.16, FFL + 0.56, FZ1 + T2 + 0.10);
      /* 门楣编号牌 */
      b.box('whSign', 0.86, 0.40, 0.06, dx, FFL + DHH + 0.62, FZ1 + T2 + 0.05);
      /* 门灯（雨棚下） */
      b.box('whLamp', 0.24, 0.10, 0.14, dx, FFL + DHH + 0.40, FZ1 + 0.62);
      /* 登车桥（洞内地坪凹槽 + 唇板） */
      b.box('whSlab', DWW - 0.24, 0.02, 0.90, dx, FFL - 0.005, FZ1 + 0.42);
      b.box('metal', DWW - 0.30, 0.06, 0.22, dx, FFL + 0.02, FZ1 - 0.42, 0, 0, 0);
    }
    /* 装卸雨棚：出挑收短 + 端头封檐 + 拉杆，否则从侧视看像一片悬空的翼 */
    const CY0 = FFL + 3.92, CDP = 1.55;
    b.box('whSteel', 7.40, 0.16, CDP, -3.95, CY0, FZ1 + CDP / 2);
    b.box('whSteel2', 7.40, 0.30, 0.10, -3.95, CY0 - 0.14, FZ1 + CDP);
    [DK[0] - 1.65, DK[1] + 1.78].forEach(function (px) {
      b.box('whSteel', 0.12, CY0 - FFL - 0.10, 0.12, px, FFL + (CY0 - FFL) / 2 - 0.05, FZ1 + CDP - 0.14);
      b.to('whSteel2', 0.030, px, CY0 - 0.12, FZ1 + CDP - 0.14, px, FFL + 4.62, FZ1 + 0.10, 4);
    });

    /* 外墙标识带 */
    b.box('whBand', FDX - 0.60, 0.86, 0.10, FCX, FEV - 1.05, FZ1 + T2 + 0.05);
    b.box('whBand', 0.10, 0.86, FDZ - 0.60, FX0 - T2 - 0.05, FEV - 1.05, FCZ);
    /* 外墙名牌 */
    (function () {
      const m1 = new T.Mesh(new T.PlaneGeometry(2.86, 0.74),
        new T.MeshBasicMaterial({ map: TEX.whName }));
      m1.position.set(1.05, FEV - 1.05, FZ1 + T2 + 0.115);
      g.add(m1);
      const m2 = new T.Mesh(new T.PlaneGeometry(2.86, 0.74),
        new T.MeshBasicMaterial({ map: TEX.whName }));
      m2.position.set(FX0 - T2 - 0.115, FEV - 1.05, FCZ + 1.60);
      m2.rotation.y = -Math.PI / 2;
      g.add(m2);
    })();

    /* 落水管 */
    [[FX0 + 0.04, FZ1 - 0.30], [FX0 + 0.04, FZ0 + 0.30]].forEach(function (p) {
      b.cyl('metalD', 0.06, 0.06, FHT, 8, p[0], FFL + FHT / 2, p[1]);
    });

    b.build(g);
    return g;
  }

  /* ---------- 高位货架 ---------- */
  /* 托盘：1200×1000 木托，顶铺板 + 纵梁 + 底铺板 */
  function whPalletDeck(b, x, y, z, k) {
    const PZ = 1.02, PX = 0.86;
    b.box(k || 'whPallet', PX, 0.030, PZ, x, y + 0.108, z);
    for (let i = 0; i < 3; i++) {
      b.box('whPallet2', PX - 0.06, 0.078, 0.075, x, y + 0.055, z + (i - 1) * (PZ / 2 - 0.08));
    }
    b.box('whPallet2', PX, 0.024, PZ, x, y + 0.012, z);
  }
  /* 整托盘货：托盘 + 3 层纸箱（上面再压一层蓝色周转箱） */
  function whPalletLoad(b, x, y, z, seed, tall) {
    whPalletDeck(b, x, y, z);
    const H = tall ? 1.10 : 0.72;
    const n = tall ? 3 : 2;
    let yy = y + 0.124;
    for (let i = 0; i < n; i++) {
      const h = (H - 0.02) / n;
      const k = ((seed + i) % 4 === 0) ? 'prod' + (1 + ((seed + i * 3) % 8))
        : (((seed + i) % 3 === 0) ? 'whCarton2' : 'whCarton');
      b.box(k, 0.80 - i * 0.012, h - 0.008, 0.96 - i * 0.012, x, yy + h / 2, z);
      yy += h;
    }
    if (seed % 3 === 1) {
      b.box('whBin', 0.66, 0.22, 0.78, x, yy + 0.11, z);
    } else if (seed % 3 === 2) {
      b.box('whFilm', 0.84, 0.10, 0.99, x, yy + 0.05, z);
    }
  }

  function whRack(b, xc, z0, z1, seed, lv) {
    const RW = 1.10, HW = 4.24;
    const bays = Math.max(3, Math.round((z1 - z0) / 2.55));
    const bayL = (z1 - z0) / bays;
    const levels = lv || [0.14, 1.36, 2.58, 3.80];
    /* 立柱（每跨两根 + 顶部横撑） */
    for (let i = 0; i <= bays; i++) {
      const zz = z0 + i * bayL;
      [-1, 1].forEach(function (s) {
        b.box('whUp', 0.085, HW, 0.105, xc + s * (RW / 2 - 0.05), FFL + HW / 2, zz);
        /* 斜撑 */
        b.to('whUp', 0.026, xc + s * (RW / 2 - 0.05), FFL + 0.30, zz,
          xc + s * (RW / 2 - 0.05), FFL + 1.05, zz - i * 0.0, 4);
      });
      for (let l = 0; l < levels.length; l++) {
        b.box('whUp', RW - 0.14, 0.042, 0.045, xc, FFL + levels[l] + 1.12, zz);
      }
    }
    /* 横梁 + 托盘 */
    for (let l = 0; l < levels.length; l++) {
      [-1, 1].forEach(function (s) {
        b.box('whBeam', 0.075, 0.135, z1 - z0, xc + s * (RW / 2 - 0.05), FFL + levels[l] + 0.10, (z0 + z1) / 2);
      });
      /* 每跨放 3 个托盘位（单深居中） */
      for (let i = 0; i < bays; i++) {
        const zz = z0 + (i + 0.5) * bayL;
        const empty = ((seed + l * 7 + i * 3) % 5 === 0);
        if (!empty) whPalletLoad(b, xc, FFL + levels[l] + 0.175, zz, seed + l * 13 + i * 5,
          l === 0 ? false : ((seed + i) % 3 === 1));
      }
    }
    /* 立柱防撞护角（两端） */
    [z0, z1].forEach(function (zz) {
      [-1, 1].forEach(function (s) {
        b.box('whGuard', 0.115, 0.34, 0.135, xc + s * (RW / 2 - 0.05), FFL + 0.17, zz);
        b.box('matDark', 0.118, 0.09, 0.138, xc + s * (RW / 2 - 0.05), FFL + 0.42, zz);
      });
    });
  }

  /* ---------- 输送线 ---------- */
  /* 一段滚筒输送机：沿 Z 走 */
  function conveyorRun(b, x, z0, z1, y, w) {
    const RY = y, W = w || 0.52;
    const len = Math.abs(z1 - z0), zz = (z0 + z1) / 2;
    /* 侧梁 */
    [-1, 1].forEach(function (s) {
      b.box('whFrame', 0.075, 0.16, len, x + s * W / 2, RY - 0.02, zz);
      b.box('whFrame2', 0.055, 0.055, len, x + s * W / 2, RY - 0.115, zz);
    });
    /* 滚筒 */
    const nR = Math.max(3, Math.round(len / 0.135));
    for (let i = 0; i <= nR; i++) {
      const rz = z0 + (i / nR) * (z1 - z0);
      b.cyl('whRoller', 0.026, 0.026, W - 0.02, 6, x, RY + 0.045, rz, 0, 0, Math.PI / 2);
    }
    /* 支腿 */
    const nL = Math.max(2, Math.round(len / 1.35));
    for (let i = 0; i <= nL; i++) {
      const lz = z0 + (i / nL) * (z1 - z0);
      [-1, 1].forEach(function (s) {
        b.box('whFrame2', 0.055, RY - FFL - 0.10, 0.055, x + s * W / 2, FFL + (RY - FFL) / 2 - 0.05, lz);
      });
      b.box('whFrame2', W, 0.045, 0.045, x, FFL + 0.10, lz);
      b.box('metalD', 0.14, 0.022, 0.14, x, FFL + 0.012, lz);
    }
    /* 挡边 */
    [-1, 1].forEach(function (s) {
      b.box('whGuard', 0.02, 0.10, len, x + s * (W / 2 + 0.02), RY + 0.10, zz);
    });
  }
  /* 沿 X 走的一段 */
  function conveyorRunX(b, z, x0, x1, y, w) {
    const RY = y, W = w || 0.52;
    const len = Math.abs(x1 - x0), xx = (x0 + x1) / 2;
    [-1, 1].forEach(function (s) {
      b.box('whFrame', len, 0.16, 0.075, xx, RY - 0.02, z + s * W / 2);
      b.box('whFrame2', len, 0.055, 0.055, xx, RY - 0.115, z + s * W / 2);
    });
    const nR = Math.max(3, Math.round(len / 0.135));
    for (let i = 0; i <= nR; i++) {
      const rx = x0 + (i / nR) * (x1 - x0);
      b.cyl('whRoller', 0.026, 0.026, W - 0.02, 6, rx, RY + 0.045, z, Math.PI / 2, 0, 0);
    }
    [[x0 + 0.3], [x1 - 0.3]].forEach(function (p) {
      [-1, 1].forEach(function (s) {
        b.box('whFrame2', 0.055, RY - FFL - 0.10, 0.055, p[0], FFL + (RY - FFL) / 2 - 0.05, z + s * W / 2);
      });
    });
  }

  /* ---------- 叉车 ---------- */
  function buildWhForklift(px, pz, ry) {
    const g = new T.Group();
    const b = new Builder();
    const Y = 0.0;
    /* 车体 */
    b.box('whBody', 1.02, 0.52, 1.55, 0, Y + 0.62, 0.10);
    b.box('whBodyD', 1.02, 0.14, 1.55, 0, Y + 0.39, 0.10);
    b.box('whBody', 0.94, 0.36, 0.62, 0, Y + 0.98, -0.36);
    /* 配重（尾部） */
    b.box('matDark', 1.06, 0.72, 0.52, 0, Y + 0.66, -0.92);
    b.box('metalD', 1.00, 0.16, 0.42, 0, Y + 0.94, -0.90);
    /* 座椅 + 方向盘 */
    b.box('whSeat', 0.44, 0.10, 0.40, 0, Y + 1.18, -0.10);
    b.box('whSeat', 0.42, 0.40, 0.10, 0, Y + 1.38, -0.30);
    b.cyl('matDark', 0.028, 0.028, 0.34, 6, 0, Y + 1.34, 0.16, 0.5, 0, 0);
    b.torus('matDark', 0.13, 0.022, 0, Y + 1.48, 0.20, 0.5, 0, 0);
    /* 护顶架 */
    [-1, 1].forEach(function (s) {
      b.box('matDark', 0.06, 1.02, 0.06, s * 0.46, Y + 1.78, -0.30);
      b.box('matDark', 0.06, 1.02, 0.06, s * 0.46, Y + 1.78, 0.24);
    });
    b.box('matDark', 1.02, 0.055, 0.06, 0, Y + 2.28, -0.30);
    b.box('matDark', 1.02, 0.055, 0.06, 0, Y + 2.28, 0.24);
    for (let i = 0; i < 4; i++) {
      b.box('matDark', 0.05, 0.05, 0.56, -0.42 + i * 0.28, Y + 2.28, -0.03);
    }
    /* 警示灯 */
    b.cyl('whLamp', 0.055, 0.055, 0.12, 8, 0.40, Y + 2.34, 0.24);
    /* 门架 */
    [-1, 1].forEach(function (s) {
      b.box('matDark', 0.10, 2.05, 0.12, s * 0.34, Y + 1.30, 0.94);
    });
    b.box('matDark', 0.78, 0.10, 0.10, 0, Y + 2.30, 0.94);
    b.box('matDark', 0.78, 0.10, 0.10, 0, Y + 1.20, 0.94);
    /* 货叉架 */
    b.box('matDark', 0.86, 0.34, 0.10, 0, Y + 0.90, 1.02);
    /* 货叉 */
    [-0.22, 0.22].forEach(function (fx) {
      b.box('metal', 0.10, 0.045, 0.86, fx, Y + 0.62, 1.42);
    });
    /* 轮子 */
    b.cyl('whTire', 0.26, 0.26, 0.20, 12, -0.46, Y + 0.26, 0.52, 0, 0, Math.PI / 2);
    b.cyl('whTire', 0.26, 0.26, 0.20, 12, 0.46, Y + 0.26, 0.52, 0, 0, Math.PI / 2);
    b.cyl('whTire', 0.20, 0.20, 0.18, 10, -0.44, Y + 0.20, -0.62, 0, 0, Math.PI / 2);
    b.cyl('whTire', 0.20, 0.20, 0.18, 10, 0.44, Y + 0.20, -0.62, 0, 0, Math.PI / 2);
    b.build(g);
    g.position.set(px, FFL, pz);
    g.rotation.y = ry || 0;
    return g;
  }

  /* ---------- 料箱（输送线上的动态件） ---------- */
  function whTote(geoKey, w, h, d) {
    const b = new Builder();
    b.box(geoKey, w, h, d, 0, h / 2, 0);
    b.box('whCarton2', w + 0.012, 0.028, 0.055, 0, h * 0.62, 0);
    b.box('whSign', 0.10, 0.07, 0.002, w * 0.22, h * 0.42, d / 2 + 0.002);
    const g = new T.Group();
    b.build(g);
    return g;
  }

  /* ---------- 厂内：货架 / 输送线 / 工作站 / 标线 ---------- */
  function buildWhInterior() {
    const g = new T.Group();
    const b = new Builder();

    /* ===== 地面标线 ===== */
    const LY = FFL + 0.004;
    /* 主通道（叉车）黄色双线 */
    [-5.30, -3.32].forEach(function (x) {
      lineBox(b, 'whLine', x, -6.35, x + 0.10, 1.55, LY);
    });
    /* 通道内箭头 */
    for (let z = -5.60; z < 1.40; z += 1.85) {
      lineArrow(b, 'whLine', -4.26, z, 1, LY, 1.0);
    }
    /* 通道两侧黄色斑马（限位块） */
    for (let z = -6.30; z < 1.50; z += 0.30) {
      lineBox(b, 'whLine', -5.30, z, -5.18, z + 0.16, LY);
      lineBox(b, 'whLine', -3.44, z, -3.32, z + 0.16, LY);
    }
    /* 拣货通道（窄）白线 */
    [-2.20, -1.78].forEach(function (x) {
      lineBox(b, 'whLineW', x, -6.35, x + 0.06, 1.55, LY);
    });
    /* 人行通道：绿色带 + 白虚线 */
    b.box('whWalk', 0.94, 0.006, 10.10, 1.86, LY, -2.15);
    lineBox(b, 'whLineW', 1.40, -7.15, 1.46, 3.00, LY);
    lineBox(b, 'whLineW', 2.26, -7.15, 2.32, 3.00, LY);
    for (let z = -7.10; z < 2.95; z += 0.90) {
      lineBox(b, 'whLineW', 1.82, z, 1.90, z + 0.42, LY);
    }
    /* 人行横穿警戒块（黄黑斜纹） */
    function hatchBlock(x0, z0, x1, z1) {
      const w = x1 - x0, d = z1 - z0;
      const n = 7;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        b.box(i % 2 ? 'matDark' : 'whWarn', w / n * 0.92, 0.008, d, x0 + w * (t + 0.5 / n),
          LY, (z0 + z1) / 2, 0, 0, 0);
      }
    }
    hatchBlock(-5.36, -1.30, -3.26, -0.72);
    hatchBlock(-5.36, 0.30, -3.26, 0.88);
    /* 托盘暂存位（白框 + 角标） */
    function bayBox(x, z, w, d, k) {
      const t = 0.06;
      lineBox(b, k || 'whLineW', x - w / 2, z - d / 2, x - w / 2 + t + 0.10, z - d / 2 + t, LY);
      lineBox(b, k || 'whLineW', x + w / 2 - t - 0.10, z - d / 2, x + w / 2, z - d / 2 + t, LY);
      lineBox(b, k || 'whLineW', x - w / 2, z + d / 2 - t, x - w / 2 + t + 0.10, z + d / 2, LY);
      lineBox(b, k || 'whLineW', x + w / 2 - t - 0.10, z + d / 2 - t, x + w / 2, z + d / 2, LY);
    }
    for (let i = 0; i < 3; i++) {
      bayBox(-4.30, -0.30 + i * 1.55, 1.90, 1.32);
    }
    /* 机械臂工作站安全区 */
    hatchBlock(-0.40, 2.55, 2.20, 2.72);
    hatchBlock(-0.40, 3.92, 2.20, 4.09);
    lineBox(b, 'whWarn', -0.40, 2.55, -0.28, 4.09, LY);
    lineBox(b, 'whWarn', 2.08, 2.55, 2.20, 4.09, LY);

    /* ===== 高位货架 3 排 ===== */
    whRack(b, -5.90, -6.35, 1.45, 3);
    whRack(b, -3.05, -6.35, 1.45, 9);
    whRack(b, -1.25, -5.20, 1.45, 15);

    /* 货架端头区位牌 */
    function rackTag(x, z, tex) {
      b.box('whSign', 0.06, 0.34, 0.52, x, FFL + 3.95, z);
      const m = new T.Mesh(new T.PlaneGeometry(0.50, 0.32),
        new T.MeshBasicMaterial({ map: tex }));
      m.position.set(x - 0.035, FFL + 3.95, z);
      m.rotation.y = -Math.PI / 2;
      g.add(m);
    }
    rackTag(-5.35, 1.60, TEX.whTagA);
    rackTag(-2.50, 1.60, TEX.whTagB);
    rackTag(-0.70, 1.60, TEX.whTagC);

    /* ===== 环形输送线 ===== */
    const CY = FFL + 0.86;      // 台面高
    const AX = 0.10, BX = 0.86;
    const CZ0 = -5.95, CZ1 = 1.75;
    conveyorRun(b, AX, CZ0, CZ1, CY);
    conveyorRun(b, BX, CZ0, CZ1, CY);
    /* 两端 90° 转运段 */
    conveyorRunX(b, CZ1 + 0.30, AX, BX, CY);
    conveyorRunX(b, CZ0 - 0.30, AX, BX, CY);
    /* 转运段外罩 */
    [-1, 1].forEach(function (sd) {
      b.box('whFrame2', 1.24, 0.26, 0.03, (AX + BX) / 2, CY + 0.16, CZ1 + 0.30 + sd * 0.29);
      b.box('whFrame2', 1.24, 0.26, 0.03, (AX + BX) / 2, CY + 0.16, CZ0 - 0.30 + sd * 0.29);
    });
    /* 输送线立柱防撞 */
    [[AX, -3.10], [AX, 0.20], [BX, -3.10], [BX, 0.20]].forEach(function (p) {
      b.box('whGuard', 0.09, 0.72, 0.09, p[0] + 0.30, FFL + 0.36, p[1]);
    });
    /* 线体上方的扫描门（龙门） */
    (function () {
      const zz = -3.60;
      [-1, 1].forEach(function (s) {
        b.box('whFrame2', 0.06, 1.05, 0.06, AX + s * 0.34, CY + 0.52, zz);
      });
      b.box('whFrame2', 0.74, 0.06, 0.06, AX, CY + 1.04, zz);
      b.box('whScan', 0.30, 0.16, 0.34, AX, CY + 1.00, zz);
      b.box('whLamp', 0.26, 0.02, 0.30, AX, CY + 0.91, zz);
    })();

    /* 输送线上的料箱（动态） */
    const tobak = ['whCarton', 'whCarton2', 'whTote', 'whCarton'];
    for (let i = 0; i < 11; i++) {
      const key = tobak[i % tobak.length];
      const m = whTote(key, 0.34, 0.24 + (i % 3) * 0.035, 0.30);
      m.userData.t = i / 11;
      g.add(m);
      MOVERS.push({ o: m, loop: 'conv', t: i / 11, sp: 0.052 + (i % 2) * 0.004, y: CY + 0.075 });
    }

    /* ===== 机械臂工作站（NVIDIA UR10e） ===== */
    (function () {
      const RX = 1.26, RZ = 3.40;
      /* 基座 */
      b.box('whSlab', 1.06, 0.22, 1.06, RX, FFL + 0.11, RZ);
      b.box('metalD', 0.90, 0.14, 0.90, RX, FFL + 0.28, RZ);
      b.cyl('metal', 0.34, 0.34, 0.06, 14, RX, FFL + 0.37, RZ);
      /* 护栏（三面） */
      const GX0 = -0.62, GX1 = 1.92, GZ0 = 2.62, GZ1 = 4.02;
      function fencePost(x, z) {
        b.box('whGuard', 0.075, 1.02, 0.075, x, FFL + 0.51, z);
        b.box('matDark', 0.10, 0.06, 0.10, x, FFL + 1.03, z);
      }
      for (let x = GX0; x <= GX1 + 0.01; x += 0.555) {
        fencePost(x, GZ1);
      }
      for (let z = GZ0; z <= GZ1 + 0.01; z += 0.70) {
        fencePost(GX0, z);
      }
      /* 横杆 + 网片 */
      [0.30, 0.66, 0.98].forEach(function (h) {
        b.box('whGuard', GX1 - GX0, 0.045, 0.035, (GX0 + GX1) / 2, FFL + h, GZ1);
        b.box('whGuard', 0.035, 0.045, GZ1 - GZ0, GX0, FFL + h, (GZ0 + GZ1) / 2);
      });
      for (let x = GX0 + 0.06; x < GX1; x += 0.075) {
        b.box('whMesh', 0.008, 0.72, 0.012, x, FFL + 0.63, GZ1);
      }
      for (let z = GZ0 + 0.06; z < GZ1; z += 0.075) {
        b.box('whMesh', 0.012, 0.72, 0.008, GX0, FFL + 0.63, z);
      }
      /* 安全门（缺口，供人进出） */
      b.box('whGuard', 0.075, 1.02, 0.075, GX1, FFL + 0.51, GZ0);
      /* 安全光幕 */
      b.box('whScan', 0.09, 0.86, 0.09, GX1, FFL + 0.46, GZ0 + 0.34);
      b.box('whScan', 0.09, 0.86, 0.09, GX1, FFL + 0.46, GZ1 - 0.34);

      /* 目标托盘 */
      whPalletDeck(b, 0.06, FFL, 3.42);
      for (let i = 0; i < 3; i++) {
        b.box(i === 1 ? 'whCarton2' : 'whCarton', 0.62, 0.28, 0.42, 0.06, FFL + 0.30 + i * 0.29, 3.42);
      }
      /* 待取料箱 */
      b.box('whTote', 0.36, 0.26, 0.32, 0.62, FFL + 0.26, 2.92);
    })();

    /* 机械臂本体（外部资产） */
    if (window.NVR) {
      addNV(g, window.NVR, 1.26, FFL + 0.40, 3.40, 1.0, 1.95);
    }

    /* ===== 叉车 ===== */
    const fk = buildWhForklift(-4.26, 0.30, 0.06);
    /* 货叉上驮一托盘：先建成独立 Group 再整体抬到货叉面，
       直接往 fk 里 build 会按材质拆成多个子节点，只能挪动最后一个。 */
    (function () {
      const fkLoadG = new T.Group();
      const fb = new Builder();
      whPalletLoad(fb, 0, 0, 0, 5, false);
      fb.build(fkLoadG);
      fkLoadG.position.set(0, 0.645, 1.30);
      fk.add(fkLoadG);
    })();
    g.add(fk);

    /* ===== 地面存货 ===== */
    /* 托盘暂存位 */
    whPalletLoad(b, -4.30, FFL, -0.30, 2, true);
    whPalletLoad(b, -4.30, FFL, 1.25, 6, false);
    /* 空托盘堆垛 */
    for (let i = 0; i < 7; i++) {
      whPalletDeck(b, -4.30, FFL + i * 0.128, -1.55);
    }
    /* 缠膜整垛 */
    (function () {
      const x = -3.05, z = -1.90;
      whPalletDeck(b, x, FFL, z);
      b.box('whFilm', 0.90, 1.16, 1.04, x, FFL + 0.70, z);
      b.box('whCarton2', 0.92, 0.06, 1.06, x, FFL + 0.50, z);
      b.box('whCarton2', 0.92, 0.06, 1.06, x, FFL + 0.96, z);
      b.box('whBlue', 0.30, 0.22, 0.02, x + 0.30, FFL + 0.73, z + 0.53);
    })();
    /* 周转箱堆 */
    for (let i = 0; i < 4; i++) {
      b.box('whTote', 0.54, 0.20, 0.40, -1.90, FFL + 0.10 + i * 0.205, 2.35);
      b.box('whBin', 0.50, 0.06, 0.36, -1.90, FFL + 0.09 + i * 0.205, 2.35);
    }

    /* ===== 打包台 ===== */
    (function () {
      const x = -2.05, z = -2.60;
      b.box('whCounter', 1.42, 0.06, 0.90, x, FFL + 0.88, z);
      [[-0.62, -0.36], [0.62, -0.36], [-0.62, 0.36], [0.62, 0.36]].forEach(function (p) {
        b.box('whFrame2', 0.06, 0.88, 0.06, x + p[0], FFL + 0.44, z + p[1]);
      });
      b.box('whFrame2', 1.36, 0.05, 0.84, x, FFL + 0.34, z);
      /* 台面物件 */
      b.box('whCarton', 0.34, 0.24, 0.30, x - 0.38, FFL + 1.03, z - 0.10);
      b.box('whTote', 0.30, 0.16, 0.26, x + 0.10, FFL + 0.99, z + 0.14);
      b.box('whScan', 0.14, 0.10, 0.12, x + 0.46, FFL + 0.96, z - 0.16);
      /* 静电椅 */
      b.cyl('matDark', 0.22, 0.22, 0.06, 10, x - 0.30, FFL + 0.50, z - 0.92);
      b.box('matDark', 0.42, 0.06, 0.42, x - 0.30, FFL + 0.54, z - 0.92);
      b.box('matDark', 0.38, 0.42, 0.05, x - 0.30, FFL + 0.76, z - 1.10);
    })();

    /* ===== 充电桩（叉车） ===== */
    (function () {
      const x = -5.05, z = 2.45;
      b.box('whFrame2', 0.40, 1.24, 0.30, x, FFL + 0.62, z);
      b.box('whScan', 0.26, 0.30, 0.04, x, FFL + 0.86, z - 0.17);
      b.box('whLamp', 0.16, 0.05, 0.05, x, FFL + 1.10, z - 0.17);
      lineBox(b, 'whLine', x - 0.62, z - 0.62, x + 0.62, z + 0.62, LY);
    })();

    /* ===== 悬挂导视 ===== */
    [[-4.26, -2.20, TEX.whZone1], [-4.26, 1.10, TEX.whZone2], [1.86, -4.60, TEX.whZone3]]
      .forEach(function (p) {
        b.box('whSign', 1.62, 0.44, 0.05, p[0], FFL + 3.62, p[1]);
        const m = new T.Mesh(new T.PlaneGeometry(1.58, 0.40),
          new T.MeshBasicMaterial({ map: p[2] }));
        m.position.set(p[0], FFL + 3.62, p[1] + 0.028);
        g.add(m);
        /* 吊杆 */
        [p[0] - 0.62, p[0] + 0.62].forEach(function (hx) {
          b.to('metalD', 0.012, hx, FFL + 3.84, p[1], hx, FEV - 0.10, p[1], 4);
        });
      });

    /* ===== 消防设施 ===== */
    b.box('whRed', 0.42, 0.12, 0.03, -5.90, FFL + 1.42, -6.66);
    b.cyl('whRed', 0.11, 0.11, 0.56, 10, -6.10, FFL + 0.28, -6.62);
    b.box('whRed', 0.42, 0.30, 0.16, -6.10, FFL + 0.44, -6.62);
    b.box('whSign', 0.46, 0.14, 0.02, -6.10, FFL + 1.30, -6.62);

    b.build(g);
    return g;
  }

  /* ---------- 动态件沿路径推进 ---------- */
  const CONV_PATH = [
    [0.10, -5.95], [0.10, 1.75], [0.86, 1.75], [0.86, -5.95]
  ];
  (function () {
    let L = 0;
    for (let i = 0; i < CONV_PATH.length; i++) {
      const a = CONV_PATH[i], c = CONV_PATH[(i + 1) % CONV_PATH.length];
      L += Math.hypot(c[0] - a[0], c[1] - a[1]);
    }
    CONV_PATH.len = L;
  })();

  function stepMover(m, dt) {
    m.t = (m.t + dt * m.sp) % 1;
    let s = m.t * CONV_PATH.len;
    for (let i = 0; i < CONV_PATH.length; i++) {
      const a = CONV_PATH[i], c = CONV_PATH[(i + 1) % CONV_PATH.length];
      const seg = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (s <= seg) {
        const k = seg > 0 ? s / seg : 0;
        m.o.position.set(a[0] + (c[0] - a[0]) * k, m.y, a[1] + (c[1] - a[1]) * k);
        m.o.rotation.y = Math.atan2(c[0] - a[0], c[1] - a[1]) - Math.PI;
        return;
      }
      s -= seg;
    }
  }

  /* ================= 周边：院墙 / 巷子 / 井 ================= */
  function buildSurroundings() {
    const g = new T.Group();
    const b = new Builder();

    /* 后侧院墙（留门洞） */
    b.box('plaster2', 3.55, 2.25, 0.34, -6.72, 1.12, -8.14);
    b.box('plaster2', 6.85, 2.25, 0.34, 0.02, 1.12, -8.14);
    b.box('plaster2', 1.5, 0.4, 0.34, -4.2, 2.05, -8.14);
    b.box('stoneD', 12.0, 0.42, 0.44, -2.55, 0.2, -8.14);
    /* 后门 */
    b.box('stoneL', 1.7, 0.12, 0.5, -4.2, 0.06, -8.0);
    b.box('woodDark', 0.16, 2.2, 0.16, -4.95, 1.1, -8.14);
    b.box('woodDark', 0.16, 2.2, 0.16, -3.45, 1.1, -8.14);
    b.box('woodDark', 1.7, 0.16, 0.2, -4.2, 2.14, -8.14);
    b.box('tileD', 2.3, 0.12, 0.9, -4.2, 2.34, -8.06);
    b.box('tile', 2.3, 0.14, 0.62, -4.2, 2.44, -8.01);
    b.box('woodWarm', 0.06, 1.9, 0.72, -4.55, 0.96, -7.86, 0, -0.7, 0);
    b.box('tileD', 12.1, 0.12, 0.86, -2.55, 2.3, -8.14);
    b.box('tile', 12.1, 0.18, 0.56, -2.55, 2.42, -8.14);
    // 墙后人家（只露上半截）
    b.box('plaster2', 3.4, 1.2, 0.32, -6.0, 2.85, -8.2);
    b.box('tileD', 3.6, 0.12, 0.64, -6.0, 3.5, -8.2);
    b.box('tile', 3.6, 0.16, 0.44, -6.0, 3.6, -8.2);
    b.box('woodDark', 0.86, 0.66, 0.06, -6.0, 2.92, -8.02);
    b.box('plaster2', 2.6, 0.95, 0.32, -1.3, 2.62, -8.2);
    b.box('tileD', 2.8, 0.12, 0.64, -1.3, 3.14, -8.2);
    b.box('tile', 2.8, 0.14, 0.44, -1.3, 3.24, -8.2);

    /* 左侧院墙 + 门洞 */
    b.box('plaster2', 0.34, 2.3, 9.1, -7.6, 1.15, -3.6);
    b.box('plaster2', 0.34, 2.3, 1.3, -7.6, 1.15, 3.15);
    b.box('stoneD', 0.44, 0.44, 10.6, -7.6, 0.21, -2.2);
    b.box('tileD', 0.86, 0.12, 10.7, -7.6, 2.34, -2.2);
    b.box('tile', 0.56, 0.18, 10.7, -7.6, 2.46, -2.2);
    // 门洞
    b.box('stoneL', 0.5, 0.16, 1.7, -7.6, 2.3, 1.8);
    b.box('stoneL', 0.42, 2.2, 0.18, -7.6, 1.1, 0.98);
    b.box('stoneL', 0.42, 2.2, 0.18, -7.6, 1.1, 2.62);
    b.box('tileD', 0.9, 0.1, 2.1, -7.6, 2.5, 1.8);
    b.box('tile', 0.7, 0.14, 2.1, -7.6, 2.58, 1.8);
    // 半开的木门
    b.box('woodWarm', 0.06, 2.0, 0.82, -7.35, 1.1, 1.05, 0, 0.9, 0);

    /* 院内汀步 */
    for (let i = 0; i < 4; i++) {
      b.box('stoneL', 0.6, 0.07, 0.5, -7.0 + i * 0.62, 0.06, 1.7 + (i % 2 ? 0.16 : -0.1));
    }
    /* 石灯笼 */
    b.box('stoneD', 0.34, 0.12, 0.34, -6.55, 0.07, -1.4);
    b.cyl('stoneD', 0.08, 0.1, 0.5, 8, -6.55, 0.38, -1.4);
    b.box('stoneL', 0.3, 0.3, 0.3, -6.55, 0.76, -1.4);
    b.cyl('stoneL', 0.001, 0.28, 0.2, 4, -6.55, 1.0, -1.4);
    b.sph('stoneL', 0.06, -6.55, 1.13, -1.4);

    /* 酒坛 */
    for (let i = 0; i < 3; i++) {
      const zz = 5.5 + i * 0.52;
      b.cyl('woodDeep', 0.19, 0.15, 0.42, 12, -7.0 + i * 0.1, 0.21, zz);
      b.cyl('woodDeep', 0.1, 0.16, 0.1, 12, -7.0 + i * 0.1, 0.46, zz);
      b.cyl('paper', 0.1, 0.1, 0.02, 12, -7.0 + i * 0.1, 0.52, zz);
    }
    /* 木凳 */
    b.box('woodWarm', 1.3, 0.07, 0.3, -6.3, 0.44, 4.2);
    b.box('woodDark', 0.08, 0.42, 0.24, -6.8, 0.21, 4.2);
    b.box('woodDark', 0.08, 0.42, 0.24, -5.8, 0.21, 4.2);

    /* 石井 */
    b.cyl('stone', 0.52, 0.5, 0.5, 16, -1.6, 0.25, 6.6);
    b.cyl('stoneD', 0.44, 0.44, 0.1, 16, -1.6, 0.52, 6.6);
    b.cyl('tile', 0.42, 0.42, 0.02, 16, -1.6, 0.47, 6.6);
    b.box('woodDark', 0.1, 1.1, 0.1, -1.6, 1.05, 5.95);
    b.box('woodDark', 0.1, 1.1, 0.1, -1.6, 1.05, 7.25);
    b.cyl('woodDark', 0.05, 0.05, 1.35, 6, -1.6, 1.5, 6.6, Math.PI / 2, 0, 0);
    b.cyl('brass', 0.16, 0.16, 0.1, 10, -1.6, 1.4, 6.6, 0, 0, Math.PI / 2);
    b.to('woodPale', 0.012, -1.55, 1.25, 6.6, -1.6, 0.62, 6.6, 4);

    /* 板车 */
    b.box('woodWarm', 1.55, 0.08, 0.86, -4.3, 0.78, 6.3);
    b.box('woodLight', 1.5, 0.06, 0.82, -4.3, 0.84, 6.3);
    b.cyl('woodDark', 0.36, 0.36, 0.1, 14, -4.55, 0.4, 5.86, Math.PI / 2, 0, 0);
    b.cyl('woodDark', 0.36, 0.36, 0.1, 14, -4.55, 0.4, 6.74, Math.PI / 2, 0, 0);
    b.cyl('woodPale', 0.1, 0.1, 0.14, 8, -4.55, 0.4, 5.86, Math.PI / 2, 0, 0);
    b.cyl('woodPale', 0.1, 0.1, 0.14, 8, -4.55, 0.4, 6.74, Math.PI / 2, 0, 0);
    b.to('woodWarm', 0.045, -3.9, 0.8, 6.15, -3.05, 0.66, 6.15, 5);
    b.to('woodWarm', 0.045, -3.9, 0.8, 6.45, -3.05, 0.66, 6.45, 5);
    b.box('woodLight', 0.7, 0.32, 0.62, -4.45, 1.02, 6.3);
    /* 花圃与灌木 */
    b.box('stone', 3.0, 0.22, 1.15, -2.0, 0.11, 7.75);
    b.box('tile', 2.8, 0.06, 0.95, -2.0, 0.23, 7.75);
    for (let i = 0; i < 7; i++) {
      const px2 = -3.25 + i * 0.42 + (i % 2) * 0.12;
      const pz2 = 7.6 + (i % 3) * 0.14;
      b.sph(i % 2 ? 'leaf2' : 'leaf1', 0.17 + (i % 3) * 0.04, px2, 0.36, pz2, 1.15, 0.85, 1.15);
    }
    b.sph('red', 0.045, -2.9, 0.52, 7.62, 1, 1, 1);
    b.sph('red', 0.04, -1.55, 0.5, 7.78, 1, 1, 1);
    b.sph('red', 0.04, -0.72, 0.48, 7.68, 1, 1, 1);
    /* 木箱 */
    b.box('woodWarm', 0.5, 0.42, 0.5, -7.05, 0.24, 3.05);
    b.box('woodLight', 0.44, 0.36, 0.44, -7.02, 0.62, 3.12, 0, 0.3, 0);
    b.box('woodWarm', 0.44, 0.38, 0.44, -6.5, 0.22, 3.5, 0, -0.2, 0);

    b.build(g);
    return g;
  }


  /* ================= 胶东农村屋舍（jd 形制） ================= */
  /* 荣成海草房：花岗岩毛石墙 + 厚海草顶 + 院落 + 菜园 + 辘轳井 */
  const JD = !!PS.jd;
  /* 场地：小院 —— 面宽收窄、进深压到 10 米，院外留一圈场院 */
  const JD_X0 = -7.20, JD_X1 = 2.40, JD_Z0 = -6.50, JD_Z1 = 6.30;
  const JD_WW = 0.32;            // 院墙厚
  const JD_WH = 1.78;            // 侧 / 后院墙高（胶东院墙偏矮，不压人）
  const JD_WHF = 1.12;           // 前院墙（再矮一截，剖切让相机看得进院）
  const JD_GATE = -0.30;         // 门楼 / 甬道中心线（正对明间）
  const JD_GW = 1.72;            // 门洞宽
  const JD_GH = 2.10;            // 门洞高
  const DH0 = -7.05, DH1 = -2.75;   // 正房进深（x）
  const DW0 = -4.10, DW1 = 3.50;    // 正房面阔（z）—— 三开间 7.6 米
  const DH_BASE = 0.34;             // 台基顶
  const DH_EV = 2.86;               // 檐口
  const DH_RG = 5.20;               // 屋脊
  const DH_TK = 0.52;               // 海草厚（真实 40–50cm，做厚才像海草房）
  const DH_WT = 0.44;               // 墙厚
  const DHCX = (DH0 + DH1) / 2;
  const DH_EVX0 = DH0 - 0.26, DH_EVX1 = DH1 + 0.26;   // 檐口出挑

  /* 三开间：西次间（炕）· 明间（门 + 灶）· 东次间（炕） */
  const JD_BAY = (DW1 - DW0) / 3;              // 2.533
  const JD_ZA = DW0 + JD_BAY * 0.5;            // 西次间中心 -2.833
  const JD_ZM = DW0 + JD_BAY * 1.5;            // 明间中心 -0.300
  const JD_ZB = DW0 + JD_BAY * 2.5;            // 东次间中心 2.233
  const JD_WINW = 1.32;                        // 窗宽
  const JD_DW = 1.12;                          // 门宽
  const JD_WINS = DH_BASE + 0.64;              // 窗台 0.98（略高于炕面）
  const JD_WINT = DH_BASE + 2.00;              // 窗顶 2.34

  /* 室内浅腔：只做 1.95 米进深就够看，后面全是实心墙芯 */
  const JD_IN_D = 1.95;
  const JD_IN_X0 = DH1 - DH_WT - JD_IN_D;      // -5.14
  const JD_IN_X1 = DH1 - DH_WT;                // -3.19
  const JD_IN_H = 2.08;                        // 净高
  const JD_KANG = DH_BASE + 0.58;              // 炕面 0.92

  /* 厢房（院北 · 近侧 +z）：脊与正房垂直，面阔 2.60（沿 z）、进深 1.48 */
  const JD_WG_X0 = -2.75, JD_WG_X1 = -0.15;
  const JD_WG_Z0 = 4.20, JD_WG_Z1 = JD_Z1 - JD_WW - 0.30;
  const JD_WG_H = 1.98, JD_WG_RG = 3.30;

  /* 平房（院南 · 远侧 -z）：平屋顶 + 外挂楼梯，正面朝院子 */
  const JD_FL_X0 = -2.75, JD_FL_X1 = 0.95;
  const JD_FL_Z0 = JD_Z0 + JD_WW, JD_FL_Z1 = -4.20;
  const JD_FL_H = 2.34;

  function jdRnd(s) {
    let x = (s >>> 0) || 7;
    return function () { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
  }

  if (JD) {
    TEX.jdPlaque = canvasTex(420, 120, function (c, w, h) {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#4a3323'); gr.addColorStop(0.55, '#3a2718'); gr.addColorStop(1, '#2b1c11');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#b9945a'; c.lineWidth = 4;
      c.strokeRect(7, 7, w - 14, h - 14);
      c.fillStyle = '#e8cf9a';
      c.font = '600 62px KaiTi, STKaiti, SimSun, serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(cfg(PS.jdPlaque, '耕讀傳家'), w / 2, h / 2 + 3);
    });
  }

  /* 毛石贴面：axis='x' 时面法线沿 X，a 轴是 z；axis='z' 时法线沿 Z，a 轴是 x */
  function jdStoneFace(b, axis, at, dir, y0, y1, a0, a1, seed, skips, rh, rw) {
    const R = jdRnd(seed);
    const H = rh || 0.46, W = rw || 0.92;
    const pal = ['jdStone', 'jdStone', 'jdStone', 'jdStoneL', 'jdStoneD', 'jdStoneL'];
    const TH = 0.06;
    /* 把每块石头被洞口切开后的空余段算出来，而不是整块丢掉——
       否则洞口旁会露出一大片灰浆，墙面就花了 */
    function freeParts(s0, s1, y, h) {
      let parts = [[s0, s1]];
      if (!skips) return parts;
      for (let i = 0; i < skips.length; i++) {
        const k = skips[i];
        if (!(y + h > k[2] + 0.010 && y < k[3] - 0.010)) continue;
        const out = [];
        for (let j = 0; j < parts.length; j++) {
          const p = parts[j];
          if (k[1] <= p[0] || k[0] >= p[1]) { out.push(p); continue; }
          if (k[0] > p[0] + 0.01) out.push([p[0], k[0]]);
          if (k[1] < p[1] - 0.01) out.push([k[1], p[1]]);
        }
        parts = out;
      }
      return parts;
    }
    let y = y0, row = 0;
    while (y < y1 - 0.01) {
      const h = Math.min(H * (0.84 + R() * 0.30), y1 - y);
      let a = a0 - (row % 2 ? W * 0.48 : 0);
      while (a < a1 - 0.02) {
        const w = W * (0.70 + R() * 0.58);
        const s0 = Math.max(a, a0), s1 = Math.min(a + w, a1);
        if (s1 - s0 > 0.10) {
          const ps = freeParts(s0, s1, y, h);
          for (let j = 0; j < ps.length; j++) {
            const p = ps[j], pw = p[1] - p[0];
            if (pw < 0.10) continue;
            const kk = pal[Math.floor(R() * pal.length)];
            const mc = (p[0] + p[1]) / 2;
            if (axis === 'x') b.box(kk, TH, h - 0.026, pw - 0.026, at + dir * TH / 2, y + h / 2, mc);
            else b.box(kk, pw - 0.026, h - 0.026, TH, mc, y + h / 2, at + dir * TH / 2);
          }
        }
        a += w;
      }
      y += h;
      row++;
    }
  }

  /* 一段石墙：灰浆芯 + 四面毛石 */
  function jdWallRun(b, x0, x1, z0, z1, y0, h, seed) {
    const TH = 0.06;
    b.box('jdMortar', Math.max(0.03, x1 - x0 - TH * 2), h, Math.max(0.03, z1 - z0 - TH * 2),
      (x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2);
    jdStoneFace(b, 'x', x1, 1, y0, y0 + h, z0, z1, seed + 11, null, 0.32, 0.58);
    jdStoneFace(b, 'x', x0, -1, y0, y0 + h, z0, z1, seed + 23, null, 0.32, 0.58);
    jdStoneFace(b, 'z', z1, 1, y0, y0 + h, x0, x1, seed + 37, null, 0.32, 0.58);
    jdStoneFace(b, 'z', z0, -1, y0, y0 + h, x0, x1, seed + 41, null, 0.32, 0.58);
  }

  /* 海草坡：从脊点 (xr,yr) 到檐点 (xe,ye)，厚 t，沿 z 铺
     oi = 两端内缩量：草顶本体出挑，但搭茬条 / 檐口卷边 / 草穗必须在山墙内收，
     否则会伸到山墙外面变成一块悬空的薄板 */
  function jdThatchSlope(b, xr, yr, xe, ye, z0, z1, t, oi) {
    const dx = xe - xr, dy = ye - yr;
    const L = Math.hypot(dx, dy);
    const ux = dx / L, uy = dy / L;
    /* 外法线必须朝上：(-uy, ux) 只对右坡朝外朝上，对左坡（dx<0）会朝内朝下，
       于是 -n*t/2 把整片草顶推到坡线之上，山墙三角从底下露出来变成一排台阶石块 */
    let nx = -uy, ny = ux;
    if (ny < 0) { nx = -nx; ny = -ny; }
    const ang = Math.atan2(dy, dx);
    const zl = z1 - z0, zc = (z0 + z1) / 2;
    const cx = (xr + xe) / 2 - nx * t / 2;
    const cy = (yr + ye) / 2 - ny * t / 2;
    b.box('jdThatch', L, t, zl, cx, cy, zc, 0, 0, ang);
    const IN = oi === undefined ? 0.30 : oi;     // 两端内缩
    const zd0 = z0 + IN, zd1 = z1 - IN;
    const zdl = Math.max(0.4, zd1 - zd0), zdc = (zd0 + zd1) / 2;
    /* 只留腰上一道搭茬，别做成一排板条——卡通渲染里草顶靠剪影和檐穗说话
       注意：草顶上表面就在 (xr,yr)-(xe,ye) 这条线上，法线只偏移一点点即可；
       写成 +n*(t/2) 会让它整条浮在坡面上方 0.25，变成一块悬空薄板 */
    const fx = xr + dx * 0.70 + nx * 0.008;
    const fy = yr + dy * 0.70 + ny * 0.008;
    b.box('jdThatchD', L * 0.46, 0.020, zdl + 0.01, fx, fy, zdc, 0, 0, ang);
    /* 檐口厚卷边 */
    b.box('jdThatchD', 0.24, t * 0.94, zdl + 0.05, xe + nx * 0.02, ye + ny * 0.02, zdc, 0, 0, ang);
    b.cyl('jdThatchD', 0.150, 0.150, zdl + 0.06, 8, xe + ux * 0.02, ye + uy * 0.02, zdc, Math.PI / 2, 0, 0);
    /* 草檐：两绺错落的草穗垂下来 */
    const nF = Math.max(10, Math.round(zdl / 0.085));
    for (let i = 0; i < nF; i++) {
      const fz = zd0 + (i + 0.5) * (zdl / nF);
      const jl = 0.15 + ((i * 53) % 11) * 0.016;
      const jx = xe + ux * 0.05 + nx * (0.02 + ((i * 31) % 5) * 0.008);
      b.cyl('jdThatchD', 0.014, 0.006, jl, 4, jx, ye + uy * 0.05 - jl * 0.44, fz, 0.05, 0, 0);
      if (i % 2 === 0) {
        b.cyl('jdThatch', 0.011, 0.005, jl * 0.72, 4, jx + ux * 0.055, ye + uy * 0.05 - jl * 0.34, fz + 0.04, 0.09, 0, 0);
      }
    }
  }

  /* 山墙三角（逐皮收分） */
  function jdGable(b, z, y0, y1, x0, x1, seed, th, dir) {
    const R = jdRnd(seed);
    const W = x1 - x0, cx = (x0 + x1) / 2, HH = y1 - y0;
    /* 粒径要比正房墙再小一档：山墙是三角，用大方砖会读成砖砌山墙 */
    const RH = 0.21, RW = 0.40;
    let y = y0, row = 0;
    while (y < y1 - 0.02) {
      const h = Math.min(RH * (0.86 + R() * 0.28), y1 - y);
      /* 按「上沿」而不是皮中心算收分：坡线是斜的，用中心值会让每皮上沿比坡线
         宽出约 0.09，一皮一个台阶探到草顶之上，远看像屋顶裂了一排缝 */
      const f = 1 - (y + h - y0) / HH;
      const hwM = Math.max(0.10, (W / 2) * f + 0.005);
      /* 石头贴面沿斜边再内缩 0.17：草顶只盖到坡线，石头齐边会从檐口缝里探出
         一排亮色台阶，读起来像破损。轮廓交给灰浆芯，石头只负责质感 */
      const hw = hwM - 0.17;
      /* 灰浆芯随行收分，天然就是三角 */
      b.box('jdMortar', hwM * 2, h - 0.01, th - 0.02, cx, y + h / 2, z);
      let a = cx - hw - (row % 2 ? RW * 0.5 : 0);
      while (a < cx + hw - 0.04) {
        const w = RW * (0.68 + R() * 0.62);
        const s0 = Math.max(a, cx - hw), s1 = Math.min(a + w, cx + hw);
        if (s1 - s0 > 0.09) {
          const k = ['jdStone', 'jdStone', 'jdStoneL', 'jdStoneD'][Math.floor(R() * 4)];
          b.box(k, (s1 - s0) - 0.028, h - 0.028, 0.055,
            (s0 + s1) / 2, y + h / 2, z + dir * (th / 2 + 0.018));
        }
        a += w;
      }
      y += h; row++;
    }
  }

  /* ---------- 树 ---------- */
  function jdTree(b, px, pz, s, kind) {
    const R = jdRnd(Math.round(px * 97 + pz * 31 + 13));
    const base = 0.08;
    let y = base, r = 0.20 * s, cx = px, cz = pz;
    const segs = kind === 'poplar' ? 5 : 4;
    for (let i = 0; i < segs; i++) {
      const h = (kind === 'poplar' ? 0.72 : 0.52) * s;
      const nx = cx + (R() - 0.5) * 0.085 * s;
      const nz = cz + (R() - 0.5) * 0.085 * s;
      b.to('bark', r * 0.86, cx, y, cz, nx, y + h, nz, 6);
      y += h; cx = nx; cz = nz; r *= 0.84;
    }
    const tipY = y;
    if (kind === 'poplar') {
      for (let i = 0; i < 4; i++) {
        b.sph(i % 2 ? 'leaf2' : 'leaf3', 0.52 * s, cx + (i - 1.5) * 0.09 * s,
          tipY + 0.30 * s + i * 0.34 * s, cz + (R() - 0.5) * 0.12 * s, 0.80, 1.55, 0.80);
      }
      return;
    }
    const NB = kind === 'jujube' ? 5 : 6;
    const tips = [];
    for (let i = 0; i < NB; i++) {
      const a = (i / NB) * Math.PI * 2 + 0.4;
      const len = (0.72 + R() * 0.46) * s;
      const tx = cx + Math.cos(a) * len;
      const ty = tipY + (0.10 + R() * 0.34) * s;
      const tz = cz + Math.sin(a) * len;
      b.to('bark', 0.055 * s, cx, tipY - 0.18 * s, cz, tx, ty, tz, 5);
      tips.push([tx, ty, tz]);
    }
    /* 冠幅 */
    const NR = kind === 'jujube' ? 6 : 8;
    const blobs = [];
    for (let i = 0; i < NR; i++) {
      const t = tips[i % tips.length];
      const rr = (0.40 + R() * 0.20) * s;
      const bx = t[0] + (R() - 0.5) * 0.34 * s;
      const by = t[1] + (0.10 + R() * 0.26) * s;
      const bz = t[2] + (R() - 0.5) * 0.34 * s;
      b.sph(i % 3 === 0 ? 'leaf1' : (i % 3 === 1 ? 'leaf2' : 'leaf3'), rr,
        bx, by, bz, 1.10, 0.84, 1.10);
      blobs.push([bx, by, bz, rr]);
    }
    /* 果 */
    /* 果挂在冠幅外表面，不然全埋进叶子里 */
    if (kind === 'persimmon') {
      for (let i = 0; i < 17; i++) {
        const bl = blobs[Math.floor(R() * blobs.length)];
        const a = R() * Math.PI * 2, e = (R() - 0.42) * 1.15;
        b.sph('jdPersimmon', 0.072 * s,
          bl[0] + Math.cos(a) * Math.cos(e) * bl[3] * 1.02,
          bl[1] + Math.sin(e) * bl[3] * 0.80,
          bl[2] + Math.sin(a) * Math.cos(e) * bl[3] * 1.02, 1, 1.14, 1);
      }
    } else if (kind === 'jujube') {
      for (let i = 0; i < 10; i++) {
        const bl = blobs[Math.floor(R() * blobs.length)];
        const a = R() * Math.PI * 2, e = (R() - 0.45) * 1.1;
        b.sph('jdJujube', 0.030 * s,
          bl[0] + Math.cos(a) * Math.cos(e) * bl[3] * 1.0,
          bl[1] + Math.sin(e) * bl[3] * 0.82,
          bl[2] + Math.sin(a) * Math.cos(e) * bl[3] * 1.0, 1, 1.3, 1);
      }
    }
  }

  /* ---------- 石碾 ---------- */
  function jdRoller(b, px, pz) {
    const y = 0.08;
    b.cyl('jdEarth2', 1.30, 1.34, 0.10, 20, px, y + 0.05, pz);
    b.cyl('jdStoneD', 1.18, 1.20, 0.16, 20, px, y + 0.16, pz);
    b.cyl('jdStone', 1.10, 1.10, 0.06, 20, px, y + 0.26, pz);
    /* 碾砣 */
    b.cyl('jdStoneL', 0.40, 0.40, 0.70, 14, px + 0.62, y + 0.62, pz, 0, 0, Math.PI / 2);
    b.cyl('jdStoneD', 0.41, 0.41, 0.08, 14, px + 0.62, y + 0.62, pz + 0.31, 0, 0, Math.PI / 2);
    b.cyl('jdStoneD', 0.41, 0.41, 0.08, 14, px + 0.62, y + 0.62, pz - 0.31, 0, 0, Math.PI / 2);
    /* 碾架 */
    b.box('woodDark', 0.10, 0.10, 1.02, px + 0.62, y + 1.04, pz);
    b.to('woodDark', 0.045, px + 0.62, y + 1.02, pz + 0.50, px - 0.10, y + 1.10, pz + 0.66, 5);
    b.to('woodDark', 0.045, px + 0.62, y + 1.02, pz - 0.50, px - 0.10, y + 1.10, pz - 0.66, 5);
    b.box('woodWarm', 0.86, 0.07, 0.09, px - 0.30, y + 1.12, pz + 0.66, 0, 0.08, 0);
    b.box('woodWarm', 0.86, 0.07, 0.09, px - 0.30, y + 1.12, pz - 0.66, 0, -0.08, 0);
    b.cyl('jdStoneL', 0.11, 0.11, 0.16, 8, px - 0.20, y + 1.02, pz);
  }

  /* ---------- 辘轳井 ---------- */
  function jdWell(b, px, pz) {
    const y = 0.12;
    b.cyl('jdStoneD', 0.92, 0.98, 0.14, 16, px, y + 0.07, pz);
    b.cyl('jdStone', 0.66, 0.72, 0.30, 16, px, y + 0.29, pz);
    b.cyl('jdStoneL', 0.68, 0.68, 0.06, 16, px, y + 0.46, pz);
    b.cyl('jdWellIn', 0.44, 0.44, 0.05, 16, px, y + 0.45, pz);
    /* 井台石板 */
    for (let i = 0; i < 3; i++) {
      b.box('jdFlag', 0.60, 0.05, 0.52, px - 1.10, y + 0.02, pz + (i - 1) * 0.60);
    }
    /* 辘轳架 */
    b.box('woodDark', 0.11, 1.42, 0.11, px, y + 0.71, pz - 0.62);
    b.box('woodDark', 0.11, 1.42, 0.11, px, y + 0.71, pz + 0.62);
    b.box('woodDark', 0.11, 0.10, 1.34, px, y + 1.42, pz);
    b.cyl('woodWarm', 0.105, 0.105, 1.10, 10, px, y + 1.14, pz, Math.PI / 2, 0, 0);
    b.cyl('woodDark', 0.145, 0.145, 0.07, 10, px, y + 1.14, pz + 0.40, Math.PI / 2, 0, 0);
    b.cyl('woodDark', 0.145, 0.145, 0.07, 10, px, y + 1.14, pz - 0.40, Math.PI / 2, 0, 0);
    /* 摇把 */
    b.cyl('metalD', 0.026, 0.026, 0.30, 6, px, y + 1.14, pz - 0.70, Math.PI / 2, 0, 0);
    b.to('metalD', 0.024, px, y + 1.14, pz - 0.84, px + 0.22, y + 1.14, pz - 0.84, 6);
    b.cyl('woodDark', 0.036, 0.036, 0.17, 6, px + 0.22, y + 1.22, pz - 0.84);
    /* 绳 + 木桶 */
    b.to('jdRope', 0.012, px + 0.10, y + 1.14, pz + 0.02, px + 0.10, y + 0.62, pz + 0.02, 4);
    b.cyl('woodWarm', 0.19, 0.16, 0.30, 10, px + 0.10, y + 0.46, pz + 0.02);
    b.torus('metalD', 0.19, 0.014, px + 0.10, y + 0.56, pz + 0.02, Math.PI / 2, 0, 0);
    b.torus('metalD', 0.17, 0.014, px + 0.10, y + 0.37, pz + 0.02, Math.PI / 2, 0, 0);
    b.torus('metalD', 0.10, 0.011, px + 0.10, y + 0.62, pz + 0.02, 0, 0, 0);
    /* 井边水桶 */
    b.cyl('woodWarm', 0.14, 0.12, 0.26, 10, px + 0.62, y + 0.13, pz - 0.42);
    b.cyl('jdWellIn', 0.12, 0.12, 0.02, 10, px + 0.62, y + 0.27, pz - 0.42);
    b.torus('metalD', 0.14, 0.012, px + 0.62, y + 0.20, pz - 0.42, Math.PI / 2, 0, 0);
    b.to('woodDark', 0.018, px - 0.38, y + 0.16, pz + 0.70, px + 0.30, y + 0.16, pz + 1.02, 4);
    /* 旁边石槽 */
    b.box('jdStoneD', 0.56, 0.24, 1.00, px - 1.06, y + 0.12, pz + 0.96);
    b.box('jdWellIn', 0.42, 0.06, 0.84, px - 1.06, y + 0.24, pz + 0.96);
  }

  /* ---------- 陶缸（水缸 / 酱缸 / 咸菜缸） ---------- */
  function jdJarFn(b, px, pz, s, k, kd) {
    b.cyl(k, 0.30 * s, 0.22 * s, 0.56 * s, 14, px, 0.08 + 0.28 * s, pz);
    b.cyl(kd, 0.24 * s, 0.28 * s, 0.10 * s, 14, px, 0.08 + 0.58 * s, pz);
    b.cyl('jdWellIn', 0.22 * s, 0.22 * s, 0.02, 14, px, 0.08 + 0.62 * s, pz);
  }

  /* ---------- 菜园 ---------- */
  /* ---------- 菜园：畦沿 z 排，萝卜白菜一行行 ---------- */
  function jdGarden(b, x0, x1, z0, z1) {
    const R = jdRnd(131);
    const xc = (x0 + x1) / 2, wx = x1 - x0;
    /* 石埂 */
    b.box('jdStoneD', wx + 0.26, 0.32, 0.16, xc, 0.16, z0 - 0.08);
    b.box('jdStoneD', wx + 0.26, 0.32, 0.16, xc, 0.16, z1 + 0.08);
    b.box('jdStoneD', 0.16, 0.32, z1 - z0, x0 - 0.08, 0.16, (z0 + z1) / 2);
    b.box('jdStoneD', 0.16, 0.32, z1 - z0, x1 + 0.08, 0.16, (z0 + z1) / 2);
    b.box('jdEarth2', wx, 0.10, z1 - z0, xc, 0.05, (z0 + z1) / 2);

    const NB = 4, gap = 0.15;
    const bd = (z1 - z0 - gap * (NB - 1)) / NB;
    const bl = wx - 0.26;

    for (let i = 0; i < NB; i++) {
      const bz0 = z0 + i * (bd + gap), bz1 = bz0 + bd;
      const bc = (bz0 + bz1) / 2;
      b.box('jdSoil', bl, 0.22, bd, xc, 0.20, bc);
      b.box('jdSoilD', bl, 0.04, bd, xc, 0.30, bc);

      if (i === 0) {
        /* 大葱：山东人的命根子，白茎绿缨成垄 */
        for (let r = 0; r < 2; r++) {
          const rz = bc + (r ? 0.16 : -0.16);
          b.box('jdOnionW', bl - 0.10, 0.16, 0.09, xc, 0.40, rz);
          for (let k = 0; k < 11; k++) {
            const kx = x0 + 0.30 + k * ((bl - 0.22) / 10);
            b.cyl('jdOnionW', 0.021, 0.027, 0.30, 5, kx, 0.45, rz);
            /* 葱缨团成两团，不用细圆锥——0.004 半径的锥在描边下会糊成一排黑锯齿 */
            b.sph('jdOnionG', 0.078, kx, 0.66, rz + 0.01, 1.0, 1.12, 1.0);
            b.sph('jdOnionG', 0.056, kx + 0.02, 0.75, rz - 0.03, 0.92, 1.05, 0.92);
          }
        }
      } else if (i === 1) {
        /* 白菜 */
        for (let k = 0; k < 6; k++) {
          const kx = x0 + 0.38 + k * ((bl - 0.30) / 5);
          b.sph('jdCabbage', 0.19, kx, 0.45, bc + (k % 2 ? 0.10 : -0.10), 1.05, 0.90, 1.05);
          b.sph('jdCabbageL', 0.13, kx, 0.51, bc + (k % 2 ? 0.10 : -0.10), 1.10, 0.76, 1.10);
        }
      } else if (i === 2) {
        /* 萝卜 + 辣椒 */
        for (let k = 0; k < 6; k++) {
          const kx = x0 + 0.36 + k * ((bl - 0.28) / 5);
          b.sph('jdRadish', 0.072, kx, 0.39, bc - 0.10, 1, 1.2, 1);
          b.sph('leaf2', 0.15, kx, 0.48, bc - 0.10, 1.05, 0.55, 1.05);
          b.sph('leaf1', 0.12, kx, 0.51, bc - 0.04, 1, 0.6, 1);
        }
        for (let k = 0; k < 4; k++) {
          const kx = x0 + 0.52 + k * ((bl - 0.60) / 3);
          b.sph('leaf2', 0.17, kx, 0.46, bc + 0.16, 1, 0.9, 1);
          b.sph('jdChili', 0.030, kx + 0.09, 0.52, bc + 0.20, 1, 1.7, 1);
          b.sph('jdChili', 0.028, kx - 0.08, 0.50, bc + 0.13, 1, 1.7, 1);
        }
      } else {
        /* 豆角架：竹竿人字 + 爬藤 */
        for (let k = 0; k < 6; k++) {
          const kx = x0 + 0.40 + k * ((bl - 0.34) / 5);
          b.to('bambooS', 0.017, kx, 0.30, bc - 0.18, kx + 0.10, 1.44, bc - 0.04, 4);
          b.to('bambooS', 0.017, kx, 0.30, bc + 0.18, kx + 0.10, 1.44, bc + 0.04, 4);
        }
        b.cyl('bambooS', 0.015, 0.015, bl - 0.30, 4, xc, 1.44, bc, 0, 0, Math.PI / 2);
        for (let k = 0; k < 18; k++) {
          b.sph('leaf1', 0.052, x0 + 0.35 + R() * (bl - 0.24),
            0.52 + R() * 0.92, bc + (R() - 0.5) * 0.34, 1, 1.4, 1);
        }
        for (let k = 0; k < 7; k++) {
          b.cyl('jdBean', 0.011, 0.011, 0.15, 4, x0 + 0.36 + k * ((bl - 0.30) / 6),
            0.80 + (k % 3) * 0.14, bc + 0.12, 0.16, 0, 0.10);
        }
      }
    }
  }

  /* ---------- 正房：荣成海草房 ---------- */
  function buildJdHouse() {
    const g = new T.Group();
    const b = new Builder();
    const Y0 = DH_BASE, Y1 = DH_EV;
    const TW = DH_WT;

    /* 台基 */
    b.box('jdStoneD', DH1 - DH0 + 0.64, Y0, DW1 - DW0 + 0.64, DHCX, Y0 / 2, (DW0 + DW1) / 2);
    b.box('jdStoneL', DH1 - DH0 + 0.72, 0.07, DW1 - DW0 + 0.72, DHCX, Y0 - 0.035, (DW0 + DW1) / 2);

    /* 正面墙：门窗洞口 */
    const FX0 = DH1 - TW, FX1 = DH1;
    const opA = [JD_ZA - JD_WINW / 2, JD_ZA + JD_WINW / 2, JD_WINS, JD_WINT];
    const opB = [JD_ZB - JD_WINW / 2, JD_ZB + JD_WINW / 2, JD_WINS, JD_WINT];
    const opD = [JD_ZM - JD_DW / 2, JD_ZM + JD_DW / 2, Y0, 2.34];
    const ops = [opA, opB, opD];
    /* 灰浆芯（按洞口挖空）
       注意：不能只按「窗与窗之间」分段——门洞正好落在两窗中间，那样整扇门会被填成灰浆板 */
    /* 墙裙带 Y0..窗台：门洞要断开 */
    [[DW0, opD[0]], [opD[1], DW1]].forEach(function (s) {
      b.box('jdMortar', TW - 0.12, JD_WINS - Y0, s[1] - s[0], (FX0 + FX1) / 2, (Y0 + JD_WINS) / 2, (s[0] + s[1]) / 2);
    });
    /* 顶部带 窗顶..Y1（顺带做门楣上那 0.04 的缝） */
    b.box('jdMortar', TW - 0.12, Y1 - JD_WINT, DW1 - DW0, (FX0 + FX1) / 2, (JD_WINT + Y1) / 2, (DW0 + DW1) / 2);
    /* 中段 窗台..窗顶：按 窗A / 门 / 窗B 分成四段实墙 */
    [[DW0, opA[0]], [opA[1], opD[0]], [opD[1], opB[0]], [opB[1], DW1]].forEach(function (s) {
      if (s[1] - s[0] < 0.02) return;
      b.box('jdMortar', TW - 0.12, JD_WINT - JD_WINS, s[1] - s[0], (FX0 + FX1) / 2, (JD_WINS + JD_WINT) / 2, (s[0] + s[1]) / 2);
    });
    /* 毛石面 */
    jdStoneFace(b, 'x', FX1, 1, Y0, Y1, DW0, DW1, 301, ops, 0.40, 0.82);

    /* 背墙 + 两侧山墙 */
    jdWallRun(b, DH0, DH0 + TW, DW0, DW1, Y0, Y1 - Y0, 311);
    jdWallRun(b, DH0 + TW, DH1 - TW, DW0, DW0 + TW, Y0, Y1 - Y0, 321);
    jdWallRun(b, DH0 + TW, DH1 - TW, DW1 - TW, DW1, Y0, Y1 - Y0, 331);

    /* 山墙三角 */
    jdGable(b, DW1 - TW / 2, Y1, DH_RG, DH0, DH1, 341, TW, 1);
    jdGable(b, DW0 + TW / 2, Y1, DH_RG, DH0, DH1, 351, TW, -1);

    /* 海草顶 */
    jdThatchSlope(b, DHCX, DH_RG, DH_EVX1, DH_EV - 0.06, DW0 - 0.08, DW1 + 0.08, DH_TK, 0.04);
    jdThatchSlope(b, DHCX, DH_RG, DH_EVX0, DH_EV - 0.06, DW0 - 0.08, DW1 + 0.08, DH_TK, 0.04);
    /* 圆脊 */
    b.cyl('jdThatchD', 0.34, 0.34, DW1 - DW0 + 0.66, 12, DHCX, DH_RG + 0.04, (DW0 + DW1) / 2, Math.PI / 2, 0, 0);
    b.cyl('jdThatch', 0.24, 0.24, DW1 - DW0 + 0.62, 12, DHCX, DH_RG + 0.10, (DW0 + DW1) / 2, Math.PI / 2, 0, 0);

    /* 烟囱（山墙侧穿草而出） */
    b.box('jdStoneD', 0.46, 1.90, 0.46, DHCX + 0.30, DH_RG - 0.30, DW1 - 0.62);
    b.box('jdStoneL', 0.54, 0.10, 0.54, DHCX + 0.30, DH_RG + 0.70, DW1 - 0.62);
    b.box('jdChimneyIn', 0.30, 0.06, 0.30, DHCX + 0.30, DH_RG + 0.76, DW1 - 0.62);

    /* 大窗：下段敞开（能看见炕），上段细棂——胶东「半炕窗」，窗台压到炕沿上方 */
    function jdWindow(zc) {
      const hw = JD_WINW / 2, xs = DH1 - TW + 0.07;
      const h = JD_WINT - JD_WINS, yc = (JD_WINS + JD_WINT) / 2;
      /* 外框 */
      b.box('jdWinFrame', 0.11, h, 0.10, xs, yc, zc - hw + 0.05);
      b.box('jdWinFrame', 0.11, h, 0.10, xs, yc, zc + hw - 0.05);
      b.box('jdWinFrame', 0.11, 0.10, JD_WINW, xs, JD_WINT - 0.05, zc);
      b.box('jdWinFrame', 0.12, 0.11, JD_WINW, xs, JD_WINS + 0.045, zc);
      /* 中横档：上 40% 细格，下 60% 只留一根竖棂 —— 视线直进炕上 */
      const yMid = JD_WINS + h * 0.60;
      b.box('jdWinFrame', 0.10, 0.07, JD_WINW - 0.10, xs, yMid, zc);
      b.box('jdWinFrame', 0.055, h * 0.60 - 0.07, 0.032, xs, JD_WINS + h * 0.30, zc);
      for (let i = 1; i < 5; i++) {
        b.box('jdWinFrame', 0.05, h * 0.40 - 0.06, 0.022, xs - 0.01,
          yMid + h * 0.20, zc - hw + 0.05 + i * (JD_WINW - 0.10) / 5);
      }
      b.box('jdWinFrame', 0.05, 0.022, JD_WINW - 0.10, xs - 0.01, yMid + h * 0.20, zc);
    }
    jdWindow(JD_ZA);
    jdWindow(JD_ZB);

    /* 板门：双扇，左扇大敞、右扇半开，门洞里能直接看到灶台 */
    (function () {
      const zc = JD_ZM, hw = JD_DW / 2;
      b.box('jdDoorFrame', 0.15, 2.34 - Y0, 0.08, DH1 - 0.075, (Y0 + 2.34) / 2, zc - hw + 0.04);
      b.box('jdDoorFrame', 0.15, 2.34 - Y0, 0.08, DH1 - 0.075, (Y0 + 2.34) / 2, zc + hw - 0.04);
      b.box('jdDoorFrame', 0.15, 0.09, hw * 2, DH1 - 0.075, 2.34, zc);
      /* 左扇：绕左侧门轴转到近乎贴内壁 */
      (function () {
        const t = -1.40, lz = zc - hw + 0.03, ox = DH1 - 0.17;
        b.box('jdDoor', 0.065, 1.94, hw - 0.03, ox + (hw / 2) * Math.sin(t), Y0 + 1.00,
          lz + (hw / 2) * Math.cos(t), 0, t, 0);
        b.box('jdDoorD', 0.07, 0.10, hw - 0.06, ox + (hw / 2) * Math.sin(t), Y0 + 1.72,
          lz + (hw / 2) * Math.cos(t), 0, t, 0);
        b.box('jdDoorD', 0.07, 0.10, hw - 0.06, ox + (hw / 2) * Math.sin(t), Y0 + 0.30,
          lz + (hw / 2) * Math.cos(t), 0, t, 0);
      })();
      /* 右扇：开 40° */
      (function () {
        const t = 0.62, lz = zc + hw - 0.03, ox = DH1 - 0.17;
        b.box('jdDoor', 0.065, 1.94, hw - 0.03, ox - (hw / 2) * Math.sin(t), Y0 + 1.00,
          lz - (hw / 2) * Math.cos(t), 0, t, 0);
        b.box('jdDoorD', 0.07, 0.10, hw - 0.06, ox - (hw / 2) * Math.sin(t), Y0 + 1.72,
          lz - (hw / 2) * Math.cos(t), 0, t, 0);
        b.box('jdDoorD', 0.07, 0.10, hw - 0.06, ox - (hw / 2) * Math.sin(t), Y0 + 0.30,
          lz - (hw / 2) * Math.cos(t), 0, t, 0);
        /* 门环 */
        b.torus('brass', 0.058, 0.010, ox - 0.06, Y0 + 1.02, lz - 0.30, 0, Math.PI / 2, 0.62);
      })();
      /* 门槛 + 门枕石 */
      b.box('jdDoorFrame', 0.30, 0.13, hw * 2 + 0.10, DH1 - 0.16, Y0 + 0.055, zc);
      b.box('jdStoneL', 0.34, 0.24, 0.20, DH1 + 0.04, Y0 + 0.14, zc - hw - 0.10);
      b.box('jdStoneL', 0.34, 0.24, 0.20, DH1 + 0.04, Y0 + 0.14, zc + hw + 0.10);
    })();

    /* 门前踏步 */
    b.box('jdStoneL', 0.42, 0.11, 2.00, DH1 + 0.36, Y0 - 0.13, JD_GATE);
    b.box('jdStone', 0.40, 0.11, 1.86, DH1 + 0.56, Y0 - 0.24, JD_GATE);

    /* 檐下门灯：门口那盏暖光必须有可见光源，否则墙上会出现一块无主光斑 */
    (function () {
      const x0 = DH1, zc = JD_GATE;
      b.box('metalD', 0.04, 0.20, 0.18, x0 + 0.02, 2.74, zc);        // 墙底板
      b.box('metalD', 0.40, 0.045, 0.045, x0 + 0.21, 2.74, zc);      // 挑臂
      b.cyl('metalD', 0.020, 0.020, 0.10, 6, x0 + 0.38, 2.69, zc);   // 吊杆
      b.cyl('metalD', 0.055, 0.135, 0.11, 8, x0 + 0.38, 2.62, zc);   // 灯罩
      b.sph('jdWinIn', 0.052, x0 + 0.38, 2.545, zc, 1.0, 1.15, 1.0); // 灯泡
    })();

    /* 檐下挂玉米 */
    for (let i = 0; i < 2; i++) {
      const zz = DW0 + 1.05 + i * 2.55;
      b.box('jdRope', 0.014, 0.16, 0.014, DH1 + 0.10, 2.86, zz);
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        b.cyl('jdCorn', 0.036, 0.030, 0.34, 6, DH1 + 0.10 + Math.cos(a) * 0.055,
          2.60 + (k % 2) * 0.05, zz + Math.sin(a) * 0.055, 0.10, 0, 0.12 * Math.cos(a));
      }
      b.cyl('jdCornLeaf', 0.10, 0.13, 0.12, 6, DH1 + 0.10, 2.80, zz);
    }
    /* 门旁干辣椒串（细圆锥在描边下会糊成一排红螺丝，改成小串珠） */
    for (let i = 0; i < 2; i++) {
      const zz = JD_GATE + (i ? 0.86 : -0.86);
      b.box('jdRope', 0.014, 0.70, 0.014, DH1 + 0.10, 1.98, zz);
      for (let k = 0; k < 7; k++) {
        b.sph('jdChiliD', 0.030, DH1 + 0.12 + (k % 2) * 0.022, 2.22 - k * 0.085, zz + (k % 2 ? 0.026 : -0.014), 0.8, 1.5, 0.8);
      }
    }

    b.build(g, { noOutline: ['jdThatchD'] });
    return g;
  }

  /* ---------- 室内：进门灶间（大锅）+ 两次间（炕） ----------
     只做 1.95 米进深的浅腔。窗口压到炕沿上方、下段窗棂敞开，
     相机从斜上方看进来正好扫到炕面和锅台——不追求完整室内，
     只要门窗里「有东西」就成立了。 */
  function buildJdRoom() {
    const g = new T.Group();
    const b = new Builder();
    const Y = DH_BASE;
    const H = JD_IN_H;
    const x0 = JD_IN_X0, x1 = JD_IN_X1 + 0.10;      // 略微探进墙芯，免得留缝
    const z0 = DW0 + DH_WT, z1 = DW1 - DH_WT;
    const cx = (x0 + x1) / 2, dz = z1 - z0, cz = (z0 + z1) / 2;
    const W = x1 - x0;

    /* 六面：地 / 顶 / 后壁 / 两山 / 两道隔墙 */
    b.box('jdInFloor', W, 0.05, dz, cx, Y + 0.02, cz);
    b.box('jdInCeil', W, 0.10, dz, cx, Y + H + 0.05, cz);
    b.box('jdInWall', 0.07, H, dz, x0 + 0.035, Y + H / 2, cz);
    b.box('jdInWall', W, H, 0.07, cx, Y + H / 2, z0 + 0.035);
    b.box('jdInWall', W, H, 0.07, cx, Y + H / 2, z1 - 0.035);
    [DW0 + JD_BAY, DW0 + JD_BAY * 2].forEach(function (zz) {
      b.box('jdInWall', W, H, 0.12, cx, Y + H / 2, zz);
    });
    /* 顶棚梁 */
    [-4.60, -3.86].forEach(function (xx) {
      b.box('woodDark', 0.11, 0.13, dz - 0.10, xx, Y + H - 0.02, cz);
    });

    /* ===== 明间：灶台 + 大锅 + 风箱 + 水缸 + 碗柜 ===== */
    const MZ0 = DW0 + JD_BAY, MZ1 = DW0 + JD_BAY * 2;   // 明间 z 范围
    const sx0 = -5.05, sx1 = -4.08, sz0 = MZ0 + 0.06, sz1 = sz0 + 1.10;
    const scx = (sx0 + sx1) / 2, scz = (sz0 + sz1) / 2;
    const TOP = Y + 0.70;
    /* 灶体（砖砌）+ 灶膛口 */
    b.box('jdBrick', sx1 - sx0, 0.68, sz1 - sz0, scx, Y + 0.34, scz);
    b.box('jdBrick2', sx1 - sx0 + 0.05, 0.06, sz1 - sz0 + 0.05, scx, TOP + 0.01, scz);
    b.box('jdChimneyIn', sx1 - sx0 - 0.24, 0.26, 0.10, scx, Y + 0.26, sz1 - 0.03);
    b.box('jdFire', sx1 - sx0 - 0.34, 0.17, 0.03, scx, Y + 0.24, sz1 + 0.01);
    b.box('jdChimneyIn', sx1 - sx0 - 0.34, 0.05, 0.04, scx, Y + 0.40, sz1 - 0.01);
    /* 大锅（八印锅直径约 0.66）+ 锅沿 + 锅盖 */
    b.sph('jdIron', 0.315, scx, TOP - 0.02, scz, 1.0, 0.46, 1.0);
    b.cyl('jdIron', 0.325, 0.325, 0.055, 18, scx, TOP + 0.045, scz);
    b.cyl('jdPotLid', 0.335, 0.315, 0.055, 18, scx, TOP + 0.105, scz);
    b.cyl('jdWoodIn', 0.045, 0.045, 0.05, 8, scx, TOP + 0.16, scz);
    /* 灶口旁的柴 */
    [0.16, 0.30, 0.44].forEach(function (dy, i) {
      b.cyl('woodWarm', 0.035, 0.040, 0.46, 5, sx1 + 0.16 + (i % 2) * 0.06,
        Y + 0.05 + dy * 0.10, sz1 + 0.10 + i * 0.09, 0, 0, Math.PI / 2);
    });
    /* 烟囱：从灶台背后直上顶棚 */
    b.box('jdBrick', 0.30, H - 0.10, 0.30, sx0 + 0.16, Y + (H - 0.10) / 2, sz0 + 0.18);
    /* 风箱 */
    b.box('jdWoodIn', 0.34, 0.28, 0.62, sx1 - 0.20, Y + 0.20, sz1 + 0.36);
    b.cyl('metalD', 0.026, 0.026, 0.30, 6, sx1 - 0.20, Y + 0.36, sz1 + 0.70, 0, 0, Math.PI / 2);
    /* 水缸 + 葫芦瓢 */
    b.cyl('jdJar', 0.26, 0.30, 0.62, 14, -3.58, Y + 0.31, MZ1 - 0.34);
    b.cyl('jdWellIn', 0.24, 0.26, 0.05, 14, -3.58, Y + 0.58, MZ1 - 0.34);
    b.sph('jdGourd', 0.10, -3.58, Y + 0.66, MZ1 - 0.34, 1, 0.7, 1);
    /* 碗柜（靠东隔墙） */
    b.box('jdWoodIn', 0.34, 1.06, 0.72, -3.44, Y + 0.53, MZ0 + 0.42);
    b.box('jdWoodInD', 0.36, 0.05, 0.74, -3.44, Y + 1.08, MZ0 + 0.42);
    b.box('jdWoodInD', 0.02, 0.92, 0.60, -3.26, Y + 0.55, MZ0 + 0.42);
    /* 小饭桌 + 两个小板凳：进门右手 */
    b.box('jdWoodIn', 0.62, 0.05, 0.62, -3.60, Y + 0.56, MZ1 - 0.62);
    [[-3.84, MZ1 - 0.86], [-3.36, MZ1 - 0.86], [-3.84, MZ1 - 0.38], [-3.36, MZ1 - 0.38]]
      .forEach(function (p) {
        b.box('jdWoodInD', 0.05, 0.54, 0.05, p[0], Y + 0.28, p[1]);
      });
    b.box('jdWoodW', 0.26, 0.04, 0.26, -3.92, Y + 0.28, MZ1 - 0.20);
    b.box('jdWoodW', 0.26, 0.04, 0.26, -3.32, Y + 0.28, MZ1 - 0.16);
    /* 墙上的锅盖、笊篱 */
    b.cyl('jdPotLid', 0.20, 0.20, 0.035, 14, x0 + 0.12, Y + 1.52, sz0 + 0.42, 0, 0, Math.PI / 2);
    b.box('jdWoodInD', 0.03, 0.30, 0.03, x0 + 0.10, Y + 1.14, sz1 - 0.14);

    /* ===== 两次间：炕（占满窗下一整间） =====
       物件必须贴着窗摆：相机俯角 38°，窗台 0.98 / 炕面 0.945，
       从窗口进来的视线只扫得到「窗前 1.8 米内的炕面」——
       被褥卷靠后墙就只剩一条缝，摆到窗根底下整扇窗才「有东西」 */
    function jdKang(zA, zB) {
      const kz0 = zA + 0.09, kz1 = zB - 0.09, kcz = (kz0 + kz1) / 2;
      const kx0 = x0 + 0.10, kx1 = x1 - 0.02, kcx = (kx0 + kx1) / 2;
      const kw = kx1 - kx0, kd = kz1 - kz0;
      const YS = Y + 0.605;                        // 炕席面
      /* 炕体（土坯）+ 炕沿 + 炕席 */
      b.box('jdKang', kw, 0.56, kd, kcx, Y + 0.28, kcz);
      b.box('jdWoodIn', 0.10, 0.10, kd, kx1 - 0.03, Y + 0.575, kcz);
      b.box('jdMat', kw - 0.06, 0.035, kd - 0.04, kcx - 0.02, Y + 0.585, kcz);
      /* 炕洞（烧火的灶眼，朝室内） */
      b.box('jdChimneyIn', 0.06, 0.20, 0.44, kx1 - 0.01, Y + 0.24, kcz);

      /* 窗根底下的被褥卷：正对窗口 */
      const qx = kx1 - 0.40;
      b.cyl('jdQuilt', 0.175, 0.175, kd * 0.44, 10, qx, YS + 0.175, kcz - kd * 0.02, Math.PI / 2, 0, 0);
      b.cyl('jdQuilt2', 0.135, 0.135, kd * 0.34, 10, qx + 0.13, YS + 0.15, kcz + kd * 0.26, Math.PI / 2, 0, 0);
      /* 枕头搁在被卷上 */
      b.box('jdQuiltW', 0.30, 0.13, 0.42, qx - 0.05, YS + 0.395, kcz + kd * 0.18);
      /* 靠后墙摞着的换季被褥 */
      (function () {
        let yb = YS;
        [['jdQuiltW', 0.17], ['jdQuilt2', 0.15], ['jdQuilt', 0.13]].forEach(function (q) {
          b.box(q[0], kw * 0.74, q[1], kd * 0.50, kx0 + kw * 0.40, yb + q[1] / 2, kcz + kd * 0.16);
          yb += q[1];
        });
      })();
      /* 炕桌 + 针线笸箩 */
      b.box('jdWoodIn', 0.44, 0.05, 0.50, kcx + 0.20, Y + 0.86, kcz - kd * 0.22);
      [[-0.16, -0.19], [0.16, -0.19], [-0.16, 0.19], [0.16, 0.19]].forEach(function (o) {
        b.box('jdWoodInD', 0.045, 0.22, 0.045, kcx + 0.20 + o[0], Y + 0.74, kcz - kd * 0.22 + o[1]);
      });
      b.cyl('jdBasket', 0.125, 0.10, 0.10, 12, kcx + 0.20, Y + 0.935, kcz - kd * 0.22);
      /* 炕梢的小柜 */
      b.box('jdWoodIn', 0.34, 0.44, 0.40, kx0 + 0.24, Y + 0.80, kcz + kd * 0.40);
      b.box('jdWoodInD', 0.36, 0.04, 0.42, kx0 + 0.24, Y + 1.03, kcz + kd * 0.40);
    }
    jdKang(z0, DW0 + JD_BAY);
    jdKang(DW0 + JD_BAY * 2, z1);

    /* 东次间墙上挂的年画 */
    b.box('jdPaper', 0.02, 0.44, 0.32, x0 + 0.09, Y + 1.52, DW0 + JD_BAY * 2.5);

    /* 炕上吊的灯泡：窗里得有个明确的光源，否则那块暖光没有出处 */
    [JD_ZA, JD_ZB].forEach(function (zc) {
      b.cyl('metalD', 0.008, 0.008, 0.66, 4, -3.60, 2.09, zc);
      b.cyl('metalD', 0.060, 0.078, 0.07, 8, -3.60, 1.80, zc);
      b.sph('jdWinIn', 0.058, -3.60, 1.71, zc, 1, 1.2, 1);
    });

    b.build(g, { noOutline: ['jdMat', 'jdInCeil'] });
    return g;
  }

  /* ---------- 厢房（东侧，脊与正房垂直） ----------
     在局部坐标里按「脊沿 z」建，再整体转 90° —— 这样能直接复用
     正房那套 jdThatchSlope / jdGable / jdStoneFace，不用为横向写第二套 */
  function buildJdWing() {
    const g = new T.Group();
    const inner = new T.Group();
    const b = new Builder();
    const L = JD_WG_X1 - JD_WG_X0;      // 面阔 3.30（局部 z）
    const D = JD_WG_Z1 - JD_WG_Z0;      // 进深 1.83（局部 x）
    const WT = 0.36, BASE = 0.24;
    const EV = JD_WG_H, RG = JD_WG_RG, TK = 0.44;
    const Y0 = BASE, zA = -L / 2, zB = L / 2;
    const FX0 = D / 2 - WT, FX1 = D / 2;

    /* 台基 */
    b.box('jdStoneD', D + 0.40, BASE, L + 0.40, 0, BASE / 2, 0);
    b.box('jdStoneL', D + 0.48, 0.05, L + 0.48, 0, BASE - 0.025, 0);

    /* 前墙：一门一窗 */
    const ySill = Y0 + 0.70, yTop = Y0 + 1.72;
    const opD = [-0.95, -0.15, Y0, yTop];
    const opW = [0.18, 0.84, ySill, yTop];
    const ops = [opD, opW];
    [[zA, opD[0]], [opD[1], opW[0]], [opW[1], zB]].forEach(function (s) {
      if (s[1] - s[0] < 0.02) return;
      b.box('jdMortar', WT - 0.10, ySill - Y0, s[1] - s[0], (FX0 + FX1) / 2, (Y0 + ySill) / 2, (s[0] + s[1]) / 2);
      b.box('jdMortar', WT - 0.10, EV - yTop, s[1] - s[0], (FX0 + FX1) / 2, (yTop + EV) / 2, (s[0] + s[1]) / 2);
    });
    b.box('jdMortar', WT - 0.10, EV - ySill, opD[1] - opD[0], (FX0 + FX1) / 2, (ySill + EV) / 2, (opD[0] + opD[1]) / 2);
    b.box('jdMortar', WT - 0.10, EV - ySill, opW[1] - opW[0], (FX0 + FX1) / 2, (ySill + EV) / 2, (opW[0] + opW[1]) / 2);
    jdStoneFace(b, 'x', FX1, 1, Y0, EV, zA, zB, 701, ops, 0.30, 0.56);

    /* 后墙 / 山墙 */
    jdWallRun(b, -D / 2, -D / 2 + WT, zA, zB, Y0, EV - Y0, 711);
    /* 东山墙：开门朝院子（相机从 +x 看得到这张脸） */
    (function () {
      const dw = 0.80, dx0 = -dw / 2, dx1 = dw / 2, dTop = Y0 + 1.58;
      [[-D / 2 + WT, dx0], [dx1, D / 2 - WT]].forEach(function (s) {
        b.box('jdMortar', s[1] - s[0], EV - Y0, WT - 0.10, (s[0] + s[1]) / 2, (Y0 + EV) / 2, zA + WT / 2);
      });
      b.box('jdMortar', dw, EV - dTop, WT - 0.10, 0, (dTop + EV) / 2, zA + WT / 2);
      jdStoneFace(b, 'z', zA, -1, Y0, EV, -D / 2 + WT, D / 2 - WT, 721,
        [[dx0, dx1, Y0, dTop]], 0.30, 0.56);
      b.box('jdDoorFrame', 0.06, dTop - Y0, 0.09, dx0 + 0.03, (Y0 + dTop) / 2, zA + 0.035);
      b.box('jdDoorFrame', 0.06, dTop - Y0, 0.09, dx1 - 0.03, (Y0 + dTop) / 2, zA + 0.035);
      b.box('jdDoorFrame', dw, 0.08, 0.09, 0, dTop, zA + 0.035);
      b.box('jdDoor', dw - 0.08, 1.44, 0.05, 0, Y0 + 0.73, zA + 0.11);
      b.box('jdDoorD', dw - 0.16, 0.08, 0.055, 0, Y0 + 1.20, zA + 0.11);
      b.box('jdDoorD', dw - 0.16, 0.08, 0.055, 0, Y0 + 0.28, zA + 0.11);
      b.torus('brass', 0.045, 0.008, 0.24, Y0 + 0.74, zA + 0.14, 0, Math.PI / 2, 0);
      /* 门槛踏步 */
      b.box('jdStoneL', 0.96, 0.08, 0.34, 0, Y0 - 0.10, zA - 0.20);
    })();
    jdWallRun(b, -D / 2 + WT, D / 2 - WT, zB - WT, zB, Y0, EV - Y0, 731);

    /* 山墙三角 + 海草顶 */
    jdGable(b, zB - WT / 2, EV, RG, -D / 2, D / 2, 741, WT, 1);
    jdGable(b, zA + WT / 2, EV, RG, -D / 2, D / 2, 751, WT, -1);
    jdThatchSlope(b, 0, RG - 0.18, D / 2 + 0.20, EV - 0.05, zA - 0.06, zB + 0.06, TK, 0.03);
    jdThatchSlope(b, 0, RG - 0.18, -D / 2 - 0.20, EV - 0.05, zA - 0.06, zB + 0.06, TK, 0.03);
    b.cyl('jdThatchD', 0.30, 0.30, L + 0.02, 12, 0, RG + 0.02, 0, Math.PI / 2, 0, 0);
    b.sph('jdThatchD', 0.30, 0, RG + 0.02, zB, 1, 0.82, 1);
    b.sph('jdThatchD', 0.30, 0, RG + 0.02, zA, 1, 0.82, 1);
    b.cyl('jdThatch', 0.20, 0.20, L + 0.01, 12, 0, RG + 0.06, 0, Math.PI / 2, 0, 0);

    /* 门窗 */
    b.box('jdDoorFrame', 0.10, yTop - Y0, 0.07, D / 2 - 0.08, (Y0 + yTop) / 2, opD[0] + 0.035);
    b.box('jdDoorFrame', 0.10, yTop - Y0, 0.07, D / 2 - 0.08, (Y0 + yTop) / 2, opD[1] - 0.035);
    b.box('jdDoorFrame', 0.10, 0.08, opD[1] - opD[0], D / 2 - 0.08, yTop, (opD[0] + opD[1]) / 2);
    b.box('jdDoor', 0.06, 1.60, 0.80, D / 2 - 0.16, Y0 + 0.82, (opD[0] + opD[1]) / 2);
    b.box('jdDoorD', 0.065, 0.09, 0.72, D / 2 - 0.16, Y0 + 1.30, (opD[0] + opD[1]) / 2);
    b.box('jdDoorD', 0.065, 0.09, 0.72, D / 2 - 0.16, Y0 + 0.36, (opD[0] + opD[1]) / 2);
    b.torus('brass', 0.05, 0.009, D / 2 - 0.19, Y0 + 0.92, opD[1] - 0.16, 0, Math.PI / 2, 0);
    /* 窗：小方格，旧窗纸 */
    const wcx = (opW[0] + opW[1]) / 2, whw = (opW[1] - opW[0]) / 2;
    b.box('jdWinFrame', 0.09, yTop - ySill, 0.08, D / 2 - 0.07, (ySill + yTop) / 2, opW[0] + 0.04);
    b.box('jdWinFrame', 0.09, yTop - ySill, 0.08, D / 2 - 0.07, (ySill + yTop) / 2, opW[1] - 0.04);
    b.box('jdWinFrame', 0.09, 0.08, opW[1] - opW[0], D / 2 - 0.07, yTop - 0.04, wcx);
    b.box('jdWinFrame', 0.09, 0.08, opW[1] - opW[0], D / 2 - 0.07, ySill + 0.04, wcx);
    for (let i = 1; i < 4; i++) {
      b.box('jdWinFrame', 0.05, yTop - ySill - 0.08, 0.024, D / 2 - 0.09,
        (ySill + yTop) / 2, opW[0] + 0.04 + i * (whw * 2 - 0.08) / 4);
    }
    b.box('jdWinFrame', 0.05, 0.024, opW[1] - opW[0] - 0.08, D / 2 - 0.09, (ySill + yTop) / 2, wcx);
    b.box('jdWinIn', 0.02, yTop - ySill - 0.06, opW[1] - opW[0] - 0.06, D / 2 - 0.13, (ySill + yTop) / 2, wcx);

    /* 门前踏步 */
    b.box('jdStoneL', 0.44, 0.09, 1.00, D / 2 + 0.24, Y0 - 0.10, (opD[0] + opD[1]) / 2);

    /* 墙根腌菜坛 */
    b.cyl('jdJar', 0.20, 0.23, 0.46, 12, D / 2 + 0.42, Y0 + 0.23, zA + 0.55);
    b.cyl('jdJarD', 0.21, 0.21, 0.05, 12, D / 2 + 0.42, Y0 + 0.47, zA + 0.55);

    b.build(inner, { noOutline: ['jdThatchD'] });
    /* -90°：局部 +x（前墙）转到世界 +z，正面朝院子 */
    inner.rotation.y = -Math.PI / 2;
    inner.position.set((JD_WG_X0 + JD_WG_X1) / 2, 0, (JD_WG_Z0 + JD_WG_Z1) / 2);
    g.add(inner);
    return g;
  }

  /* ---------- 平房（西侧）：平屋顶 + 外挂楼梯，屋顶晾晒 ---------- */
  function buildJdFlat() {
    const g = new T.Group();
    const b = new Builder();
    const Y = 0.12;                       // 院内地坪
    const x0 = JD_FL_X0, x1 = JD_FL_X1, z0 = JD_FL_Z0, z1 = JD_FL_Z1;
    const WT = 0.36, BASE = 0.22, H = JD_FL_H;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const W = x1 - x0, D = z1 - z0;
    const BY = Y + BASE;                  // 墙脚
    const TY = BY + H;                    // 墙顶 / 屋面

    /* 台基 + 四面毛石墙 */
    b.box('jdStoneD', W + 0.24, BASE, D + 0.24, cx, Y + BASE / 2, cz);
    b.box('jdStoneL', W + 0.30, 0.05, D + 0.30, cx, Y + BASE - 0.02, cz);
    jdWallRun(b, x0, x1, z0, z0 + WT, BY, H, 801);          // 后墙（贴院墙）
    jdWallRun(b, x0, x1, z1 - WT, z1, BY, H, 811);          // 前墙（朝院子，被楼梯贴着）
    jdWallRun(b, x0, x0 + WT, z0 + WT, z1 - WT, BY, H, 821); // 西山墙
    /* 东山墙：不开洞（楼梯走另一侧） */
    jdWallRun(b, x1 - WT, x1, z0 + WT, z1 - WT, BY, H, 831);

    /* 前墙（朝院子）：开一扇门 */
    const dW = 0.80, dX0 = x0 + 0.25, dX1 = dX0 + dW, dT = BY + 1.92;
    [[x0 + WT, dX0], [dX1, x1 - WT]].forEach(function (s) {
      b.box('jdMortar', s[1] - s[0], H, WT - 0.10, (s[0] + s[1]) / 2, BY + H / 2, z1 - WT / 2);
    });
    b.box('jdMortar', dW, H - (dT - BY), WT - 0.10, (dX0 + dX1) / 2, (dT + BY + H) / 2, z1 - WT / 2);
    jdStoneFace(b, 'z', z1, 1, BY, BY + H, x0 + WT, x1 - WT, 811,
      [[dX0, dX1, BY, dT]], 0.32, 0.60);
    /* 门框 + 门扇 */
    b.box('jdDoorFrame', 0.07, 1.96, 0.08, dX0 + 0.035, BY + 0.98, z1 - 0.04);
    b.box('jdDoorFrame', 0.07, 1.96, 0.08, dX1 - 0.035, BY + 0.98, z1 - 0.04);
    b.box('jdDoorFrame', dW, 0.08, 0.08, (dX0 + dX1) / 2, dT, z1 - 0.04);
    b.box('jdDoor', dW - 0.08, 1.76, 0.05, (dX0 + dX1) / 2, BY + 0.92, z1 - 0.11);
    b.box('jdDoorD', dW - 0.16, 0.09, 0.055, (dX0 + dX1) / 2, BY + 1.50, z1 - 0.11);
    b.box('jdDoorD', dW - 0.16, 0.09, 0.055, (dX0 + dX1) / 2, BY + 0.34, z1 - 0.11);

    /* 平屋顶：石灰炉渣面 + 女儿墙 */
    b.box('jdFlatRoof', W + 0.16, 0.16, D + 0.16, cx, TY + 0.08, cz);
    b.box('jdFlatEdge', W + 0.24, 0.05, D + 0.24, cx, TY + 0.18, cz);
    const ph = 0.26, pw = 0.12;
    /* 女儿墙：靠楼梯一侧（z0 前墙）留缺口，其余三面 */
    b.box('jdStoneD', W + 0.24, ph, pw, cx, TY + 0.18 + ph / 2, z0 + pw / 2);
    b.box('jdStoneD', pw, ph, D + 0.24, x0 - 0.06 + pw / 2, TY + 0.18 + ph / 2, cz);
    b.box('jdStoneD', pw, ph, D * 0.55, x1 + 0.06 - pw / 2, TY + 0.18 + ph / 2, z0 + D * 0.30);
    b.box('jdStoneL', W + 0.30, 0.05, pw + 0.06, cx, TY + 0.18 + ph + 0.02, z0 + pw / 2);

    /* 屋顶晾晒：玉米棒 + 笸箩（挪开楼梯口那一角） */
    for (let i = 0; i < 16; i++) {
      const rx = x0 + 0.35 + (i % 6) * 0.13, rz = z0 + 0.42 + Math.floor(i / 6) * 0.16;
      b.cyl('jdCorn', 0.045, 0.038, 0.24, 6, rx, TY + 0.30 + (i % 2) * 0.03, rz, 0.1, i, 0.12);
    }
    b.cyl('jdBasket', 0.30, 0.24, 0.12, 14, x0 + 0.90, TY + 0.24, z1 - 0.66);
    b.cyl('jdChiliD', 0.16, 0.14, 0.10, 12, x0 + 0.90, TY + 0.27, z1 - 0.66);

    /* ===== 外挂楼梯：贴平房东端，从院子沿 -z 爬上去 =====
       砌成实心砖踏步。原先的「薄踏面 + 斜梁 + 金属扶手」在描边材质下
       整排糊成黑横杆、扶手斜杆还会穿出女儿墙，实心台阶最稳，
       也是胶东农房上房晾晒的实际做法。 */
    const N = 12, stW = 0.86, rstX = x1 - stW / 2 - 0.02;
    const zStart = z1 + 2.16, zEnd = z1 + 0.07;
    const runZ = zStart - zEnd, rise = TY + 0.16 - Y;
    const stD = runZ / N, stH = rise / N;
    for (let i = 0; i < N; i++) {
      const pz = zStart - i * stD - stD / 2;
      const hh = (i + 1) * stH;
      b.box('jdStair', stW, hh, stD + 0.02, rstX, Y + hh / 2, pz);
      /* 外沿一级压边，免得侧面看是一整块灰 */
      b.box('jdStairD', 0.07, 0.04, stD + 0.02, rstX + stW / 2 - 0.035, Y + hh + 0.02, pz);
    }
    /* 楼梯下砌个台，堵住底下的空当 */
    b.box('jdStairD', stW, 0.34, 0.60, rstX, Y + 0.17, zStart - 0.30);

    /* 楼梯下的杂物：一口大缸 */
    b.cyl('jdJar', 0.22, 0.25, 0.48, 12, x0 + 0.55, Y + 0.24, zStart + 0.30);
    b.cyl('jdJarD', 0.23, 0.23, 0.05, 12, x0 + 0.55, Y + 0.49, zStart + 0.30);

    b.build(g);
    return g;
  }

  /* ---------- 场地 ---------- */
  function buildJdSite() {
    const g = new T.Group();
    const b = new Builder();

    /* 展台 */
    b.box('woodDeep', 18.0, 0.34, 18.0, 0, -1.86, 0);
    b.box('woodDeep', 17.4, 0.18, 17.4, 0, -1.60, 0);
    b.box('stoneD', 17.0, 1.50, 17.0, 0, -0.73, 0);
    /* 地表夯土 */
    b.box('jdEarth', 16.7, 0.10, 16.7, 0, 0.03, 0);
    /* 院内夯土（略抬） */
    b.box('jdEarth2', JD_X1 - JD_X0 + 0.30, 0.12, JD_Z1 - JD_Z0 + 0.30, (JD_X0 + JD_X1) / 2, 0.07, (JD_Z0 + JD_Z1) / 2);

    /* 场院车辙 */
    [-3.05, -2.55].forEach(function (zz) {
      for (let i = 0; i < 9; i++) {
        b.box('jdEarth2', 0.52, 0.03, 0.22, 3.10 + i * 0.56, 0.10, zz);
      }
    });
    /* 场院散石 */
    [[3.30, 5.10, 0.22], [3.62, 5.52, 0.16], [6.20, 1.30, 0.20], [7.60, 3.40, 0.24]]
      .forEach(function (s) {
        b.sph('jdStoneD', s[2], s[0], 0.08, s[1], 1.2, 0.7, 1.0);
        b.sph('jdStone', s[2] * 0.7, s[0] + 0.16, 0.14, s[1] + 0.10, 1.1, 0.7, 1.0);
      });
    /* 排水明沟（沿院墙外侧） */
    for (let i = 0; i < 9; i++) {
      b.box('jdStoneD', 0.62, 0.06, 0.62, 2.86, 0.03, JD_Z0 + 0.5 + i * 1.42);
      b.box('jdWellIn', 0.50, 0.05, 0.50, 2.86, 0.055, JD_Z0 + 0.5 + i * 1.42);
    }

    /* 院外小菜园：胶东人家常在门前墙外开一片 */
    jdGarden(b, 3.05, 6.20, 0.30, 4.30);

    /* 石碾 */
    jdRoller(b, 5.55, -3.55);

    /* 玉米秸垛：只留一座，贴屋后矮墙，露半个尖就够（放近处会被画框切掉） */
    [[1.35, 7.20, 0.82, 1.38]].forEach(function (c, ci) {
      b.cyl('jdStackBase', c[2], c[2] * 1.02, 0.22, 12, c[0], 0.19, c[1]);
      b.cyl('jdStalk', c[2] * 0.30, c[2], c[3], 12, c[0], 0.30 + c[3] / 2, c[1]);
      b.cyl('jdStalkD', 0.06, c[2] * 0.30, 0.34, 10, c[0], 0.30 + c[3] + 0.10, c[1]);
      for (let k = 0; k < 5; k++) {
        const a = k * 1.257 + ci;
        /* 垛脚横躺的秸秆：竖插会变成一把天线 */
        b.cyl('jdStalk', 0.024, 0.024, 0.66, 4,
          c[0] + Math.cos(a) * c[2] * 1.10, 0.33 + (k % 3) * 0.05,
          c[1] + Math.sin(a) * c[2] * 1.10, Math.PI / 2, a, 0);
      }
    });

    /* 柴火垛 */
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 5; k++) {
        b.cyl('woodWarm', 0.055, 0.065, 1.30, 5, 5.05 + k * 0.12 + (r % 2) * 0.05,
          0.16 + r * 0.20, 7.30 + (r - 1.5) * 0.10, 0, 0, Math.PI / 2);
      }
    }

    /* 手推车 */
    (function () {
      const px = 4.10, pz = -6.35;
      b.box('woodWarm', 0.86, 0.10, 0.58, px, 0.62, pz);
      b.box('woodLight', 0.90, 0.36, 0.06, px, 0.76, pz - 0.30);
      b.box('woodLight', 0.06, 0.36, 0.60, px - 0.42, 0.76, pz);
      b.box('woodLight', 0.06, 0.36, 0.60, px + 0.42, 0.76, pz);
      b.cyl('jdTire', 0.30, 0.30, 0.09, 14, px, 0.40, pz - 0.34, Math.PI / 2, 0, 0);
      b.cyl('metal', 0.10, 0.10, 0.12, 8, px, 0.40, pz - 0.34, Math.PI / 2, 0, 0);
      b.to('woodWarm', 0.032, px - 0.32, 0.66, pz + 0.10, px - 0.62, 0.62, pz + 0.86, 5);
      b.to('woodWarm', 0.032, px + 0.32, 0.66, pz + 0.10, px + 0.62, 0.62, pz + 0.86, 5);
      b.box('jdStalkD', 0.60, 0.30, 0.40, px, 0.82, pz + 0.04);
    })();

    /* 拴马石 */
    b.box('jdStoneL', 0.20, 0.92, 0.20, 2.98, 0.46, -3.95);
    b.box('jdStoneD', 0.34, 0.12, 0.34, 2.98, 0.06, -3.95);
    b.torus('metalD', 0.075, 0.016, 2.98, 0.80, -3.83, 0, Math.PI / 2, 0);

    /* 水缸 */
    jdJarFn(b, 2.80, 4.20, 1.0, 'jdJar', 'jdJarD');
    jdJarFn(b, 2.88, 4.68, 0.74, 'jdJar', 'jdJarD');

    /* 院外老槐 */
    jdTree(b, 8.10, -6.40, 1.35, 'toon');
    jdTree(b, -8.00, 6.60, 1.05, 'poplar');
    jdTree(b, -4.30, 7.15, 0.90, 'jujube');

    /* 秫秸篱笆 */
    for (let i = 0; i < 10; i++) {
      b.cyl('jdStalk', 0.022, 0.026, 1.05, 4, 5.90 + i * 0.24, 0.60, 8.05, 0.06, 0, 0.05);
    }
    b.cyl('jdStalkD', 0.018, 0.018, 2.42, 4, 7.00, 1.02, 8.05, 0, 0, Math.PI / 2);

    /* 鸡 */
    function jdHen(px, pz, a, k) {
      b.sph(k, 0.15, px, 0.30, pz, 1.25, 0.95, 0.85);
      b.sph(k, 0.085, px + 0.14 * Math.cos(a), 0.46, pz + 0.14 * Math.sin(a), 1, 1, 1);
      b.box('jdBeak', 0.05, 0.03, 0.03, px + 0.22 * Math.cos(a), 0.46, pz + 0.22 * Math.sin(a));
      b.box('jdComb', 0.05, 0.06, 0.02, px + 0.12 * Math.cos(a), 0.54, pz + 0.12 * Math.sin(a));
      b.cyl('jdBeak', 0.012, 0.012, 0.16, 4, px, 0.16, pz - 0.02);
    }
    jdHen(2.75, 4.30, 0.5, 'jdHenW');
    jdHen(3.05, 4.62, 2.3, 'jdHenB');
    jdHen(4.55, 5.10, -0.9, 'jdHenW');
    jdHen(3.60, -5.10, 1.9, 'jdHenB');

    b.build(g);
    return g;
  }

  /* ---------- 院落：院墙 / 门楼 / 井 / 菜园 / 树 ---------- */
  function buildJdYard() {
    const g = new T.Group();
    const b = new Builder();
    const Y = 0.12;
    const gz0 = JD_GATE - JD_GW / 2, gz1 = JD_GATE + JD_GW / 2;
    const HW = 1.22;                      // 门楼半宽（沿 z）

    /* 院墙：前墙矮、后墙高 —— 不这么做相机永远看不进院子 */
    jdWallRun(b, JD_X1 - JD_WW, JD_X1, JD_Z0, JD_GATE - HW, Y, JD_WHF, 401);
    jdWallRun(b, JD_X1 - JD_WW, JD_X1, JD_GATE + HW, JD_Z1, Y, JD_WHF, 421);
    jdWallRun(b, JD_X0, JD_X0 + JD_WW, JD_Z0, JD_Z1, Y, JD_WH, 461);
    jdWallRun(b, JD_X0, JD_X1 - JD_WW, JD_Z1 - JD_WW, JD_Z1, Y, JD_WH, 481);
    jdWallRun(b, JD_X0, JD_X1 - JD_WW, JD_Z0, JD_Z0 + JD_WW, Y, JD_WH, 501);

    /* 墙帽（小瓦压顶） */
    function cap(x0, x1, z0, z1, h) {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const w = x1 - x0, d = z1 - z0;
      b.box('jdMortar', w + 0.08, 0.05, d + 0.08, cx, Y + h + 0.025, cz);
      b.box('tileD', w + 0.20, 0.055, d + 0.20, cx, Y + h + 0.075, cz);
      b.box('tile', w + 0.08, 0.07, d + 0.08, cx, Y + h + 0.135, cz);
    }
    cap(JD_X1 - JD_WW, JD_X1, JD_Z0, JD_GATE - HW, JD_WHF);
    cap(JD_X1 - JD_WW, JD_X1, JD_GATE + HW, JD_Z1, JD_WHF);
    cap(JD_X0, JD_X0 + JD_WW, JD_Z0, JD_Z1, JD_WH);
    cap(JD_X0, JD_X1 - JD_WW, JD_Z1 - JD_WW, JD_Z1, JD_WH);
    cap(JD_X0, JD_X1 - JD_WW, JD_Z0, JD_Z0 + JD_WW, JD_WH);

    /* 门楼：比院墙高出一截，是这户人家的脸面 */
    (function () {
      const MW = 0.44, MX0 = JD_X1 - MW - 0.02, MX1 = JD_X1 + MW - 0.02;
      const mz0 = gz0 - 0.14, mz1 = gz1 + 0.14, MH = 2.58;
      const mc = (MX0 + MX1) / 2, mzc = (mz0 + mz1) / 2;
      /* 芯：必须跟着门洞掏空，否则整块灰浆把门道堵死（贴石掏了洞没用） */
      b.box('jdMortar', MW - 0.12, MH, gz0 - mz0, mc, Y + MH / 2, (mz0 + gz0) / 2);
      b.box('jdMortar', MW - 0.12, MH, mz1 - gz1, mc, Y + MH / 2, (gz1 + mz1) / 2);
      b.box('jdMortar', MW - 0.12, MH - JD_GH, gz1 - gz0, mc, Y + (JD_GH + MH) / 2, (gz0 + gz1) / 2);
      /* 两面贴石，掏出门洞 */
      const sk = [[gz0, gz1, Y, Y + JD_GH]];
      jdStoneFace(b, 'x', MX1, 1, Y, Y + MH, mz0, mz1, 601, sk, 0.34, 0.58);
      jdStoneFace(b, 'x', MX0, -1, Y, Y + MH, mz0, mz1, 621, sk, 0.34, 0.58);
      jdStoneFace(b, 'z', mz1, 1, Y, Y + MH, MX0, MX1, 641, null, 0.34, 0.58);
      jdStoneFace(b, 'z', mz0, -1, Y, Y + MH, MX0, MX1, 661, null, 0.34, 0.58);
      /* 门洞侧壁 */
      b.box('jdMortar', MW - 0.10, JD_GH, 0.05, mc, Y + JD_GH / 2, gz0 + 0.025);
      b.box('jdMortar', MW - 0.10, JD_GH, 0.05, mc, Y + JD_GH / 2, gz1 - 0.025);
      /* 门框 + 门楣 */
      b.box('jdDoorFrame', 0.11, JD_GH, 0.10, MX1 - 0.03, Y + JD_GH / 2, gz0 + 0.05);
      b.box('jdDoorFrame', 0.11, JD_GH, 0.10, MX1 - 0.03, Y + JD_GH / 2, gz1 - 0.05);
      b.box('jdDoorFrame', 0.13, 0.15, gz1 - gz0 + 0.20, MX1 - 0.03, Y + JD_GH + 0.075, JD_GATE);
      /* 两扇门（一扇半开） */
      b.box('jdDoor', 0.07, 2.04, 0.78, MX1 - 0.10, Y + 1.03, gz0 + 0.42, 0, 1.18, 0);
      b.box('jdDoor', 0.07, 2.04, 0.78, MX1 - 0.14, Y + 1.03, gz1 - 0.40, 0, -1.18, 0);
      b.box('jdDoorD', 0.075, 2.04, 0.07, MX1 - 0.10, Y + 1.03, gz0 + 0.38, 0, 0.66, 0);
      b.box('jdDoorD', 0.075, 2.04, 0.07, MX1 - 0.14, Y + 1.03, gz1 - 0.74);
      b.torus('brass', 0.052, 0.010, MX1 - 0.19, Y + 1.02, gz1 - 0.50, 0, Math.PI / 2, 0);
      /* 门槛 + 门枕石 */
      b.box('woodDark', 0.24, 0.13, JD_GW, MX1 - 0.10, Y + 0.065, JD_GATE);
      b.box('jdStoneL', 0.32, 0.26, 0.19, MX1 + 0.02, Y + 0.13, gz0 - 0.05);
      b.box('jdStoneL', 0.32, 0.26, 0.19, MX1 + 0.02, Y + 0.13, gz1 + 0.05);
      /* 门楼顶：真双坡小瓦，别做成一块平板 */
      const ry = Y + MH + 0.44, ev = Y + MH + 0.15, ex = 0.64;
      b.box('woodDark', MW + 0.12, 0.10, mz1 - mz0 + 0.12, mc, Y + MH + 0.05, mzc);
      [-1, 1].forEach(function (sg) {
        const dx = sg * ex, dy = ev - ry;
        const L = Math.hypot(dx, dy) + 0.05;
        const ang = Math.atan2(dy, dx);
        const sx = mc + dx / 2, sy = (ev + ry) / 2;
        b.box('tile', L, 0.085, mz1 - mz0 + 0.24, sx, sy, mzc, 0, 0, ang);
        b.box('tileD', L, 0.045, mz1 - mz0 + 0.24, sx, sy - 0.065, mzc, 0, 0, ang);
        for (let i = 0; i < 8; i++) {
          b.cyl('tileD', 0.026, 0.026, L * 0.92, 4, sx + 0.03, sy + 0.055,
            mz0 - 0.09 + i * ((mz1 - mz0 + 0.18) / 7), 0, 0, ang + Math.PI / 2);
        }
        /* 檐口滴水 */
        b.box('tileD', 0.10, 0.09, mz1 - mz0 + 0.26, mc + dx + sg * 0.02, ev - 0.02, mzc, 0, 0, ang);
      });
      b.box('tileD', 0.14, 0.11, mz1 - mz0 + 0.28, mc, ry + 0.03, mzc);
      b.cyl('tileD', 0.055, 0.055, mz1 - mz0 + 0.30, 6, mc, ry + 0.10, mzc, Math.PI / 2, 0, 0);
      /* 匾 */
      const pMat = new T.MeshBasicMaterial({ map: TEX.jdPlaque });
      const pl = new T.Mesh(new T.PlaneGeometry(1.04, 0.30), pMat);
      pl.rotation.y = Math.PI / 2;
      pl.position.set(MX1 + 0.105, Y + JD_GH + 0.22, JD_GATE);
      g.add(pl);
      /* 门灯（红灯笼） */
      const ly = Y + JD_GH + 0.16;
      b.cyl('jdRope', 0.008, 0.008, 0.20, 4, MX1 + 0.17, ly + 0.20, JD_GATE - 0.70);
      b.sph('jdLantern', 0.13, MX1 + 0.17, ly, JD_GATE - 0.70, 1, 1.16, 1);
      b.cyl('brass', 0.065, 0.065, 0.028, 8, MX1 + 0.17, ly + 0.14, JD_GATE - 0.70);
      b.cyl('brass', 0.065, 0.065, 0.028, 8, MX1 + 0.17, ly - 0.14, JD_GATE - 0.70);
      b.cyl('jdTassel', 0.010, 0.018, 0.14, 4, MX1 + 0.17, ly - 0.22, JD_GATE - 0.70);
    })();

    /* 门前踏跺 */
    b.box('jdStoneL', 0.46, 0.10, JD_GW + 0.66, JD_X1 + 0.40, Y - 0.01, JD_GATE);
    b.box('jdStone', 0.42, 0.10, JD_GW + 0.44, JD_X1 + 0.62, Y - 0.10, JD_GATE);

    /* 甬道：从门楼直通正房门（院子收小，八块板就到檐下） */
    for (let i = 0; i < 8; i++) {
      const px = JD_X1 - 0.46 - i * 0.58;
      b.box('jdFlag', 0.54, 0.08, 1.06, px, Y, JD_GATE);
      if (i % 2 === 0) b.box('jdFlag2', 0.50, 0.02, 1.00, px, Y + 0.045, JD_GATE);
    }

    /* 井：小院正中偏东，辘轳架正对门楼 */
    jdWell(b, 0.30, 0.55);

    /* 院东空地上的独轮车：秋收推玉米用的家伙，比种一棵树更不挡厢房 */
    (function () {
      const px = 1.25;
      b.cyl('jdTire', 0.235, 0.235, 0.075, 14, px, Y + 0.25, 4.44, 0, 0, Math.PI / 2);
      b.cyl('woodDark', 0.075, 0.075, 0.10, 8, px, Y + 0.25, 4.44, 0, 0, Math.PI / 2);
      /* 车架 + 车厢 */
      b.box('woodDark', 0.05, 0.44, 0.05, px - 0.20, Y + 0.44, 4.46);
      b.box('woodDark', 0.05, 0.44, 0.05, px + 0.20, Y + 0.44, 4.46);
      b.box('woodWarm', 0.60, 0.055, 0.88, px, Y + 0.64, 4.86);
      b.box('woodWarm', 0.045, 0.20, 0.88, px - 0.28, Y + 0.74, 4.86);
      b.box('woodWarm', 0.045, 0.20, 0.88, px + 0.28, Y + 0.74, 4.86);
      /* 车把 + 支脚 */
      b.cyl('woodWarm', 0.026, 0.030, 0.74, 5, px - 0.22, Y + 0.70, 5.52, Math.PI / 2, 0, 0);
      b.cyl('woodWarm', 0.026, 0.030, 0.74, 5, px + 0.22, Y + 0.70, 5.52, Math.PI / 2, 0, 0);
      b.box('woodDark', 0.05, 0.56, 0.05, px - 0.22, Y + 0.30, 5.44);
      b.box('woodDark', 0.05, 0.56, 0.05, px + 0.22, Y + 0.30, 5.44);
      /* 车里横着几棒玉米 */
      for (let k = 0; k < 5; k++) {
        b.cyl('jdCorn', 0.046, 0.040, 0.40, 6, px - 0.16 + k * 0.075, Y + 0.70 + (k % 2) * 0.04, 4.80 + (k % 3) * 0.07, 0, 0, Math.PI / 2);
      }
    })();

    /* 墙根酱缸 / 咸菜缸：挪到西次间窗下，别堵门 */
    jdJarFn(b, -2.42, 2.06, 0.84, 'jdJar', 'jdJarD');
    jdJarFn(b, -2.44, 2.44, 0.68, 'jdJar', 'jdJarD');
    jdJarFn(b, -2.40, 2.78, 0.60, 'jdJar', 'jdJarD');

    /* 石磨（树东侧的空地） */
    (function () {
      const px = -1.70, pz = 2.55;
      b.cyl('jdStoneD', 0.62, 0.66, 0.16, 18, px, Y + 0.08, pz);
      b.cyl('jdStone', 0.56, 0.56, 0.24, 18, px, Y + 0.28, pz);
      b.cyl('jdStone', 0.54, 0.54, 0.05, 18, px, Y + 0.42, pz);
      b.cyl('jdWellIn', 0.10, 0.10, 0.04, 8, px + 0.18, Y + 0.42, pz - 0.10);
      b.box('woodDark', 0.09, 0.09, 0.86, px + 0.58, Y + 0.56, pz);
      b.box('woodWarm', 0.055, 0.055, 0.34, px + 0.58, Y + 0.64, pz + 0.52);
      b.cyl('jdStoneL', 0.09, 0.09, 0.14, 8, px + 0.18, Y + 0.50, pz - 0.10);
    })();

    /* 鸡窝（挪到院外场院，院内让给厢房） */
    (function () {
      const px = 3.28, pz = -3.62;
      b.box('jdStoneD', 0.84, 0.68, 0.64, px, Y + 0.34, pz);
      b.box('jdStoneL', 0.92, 0.08, 0.72, px, Y + 0.71, pz);
      b.box('tileD', 0.96, 0.08, 0.78, px - 0.04, Y + 0.78, pz + 0.02);
      b.box('jdWellIn', 0.38, 0.32, 0.06, px, Y + 0.42, pz - 0.33);
      b.box('jdStalk', 0.44, 0.05, 0.44, px, Y + 0.06, pz + 0.05);
    })();

    /* 柴火垛（院子东南角，靠前墙） */
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 6; k++) {
        b.cyl('woodWarm', 0.052, 0.062, 1.16, 5, -2.30,
          Y + 0.10 + r * 0.19, 3.28 + k * 0.11 + (r % 2) * 0.05, 0, 0, Math.PI / 2);
      }
    }

    /* 晾衣绳（院子东侧，绳沿 x，布面朝 x 才不会跟绳平行） */
    (function () {
      const zz = 2.92;
      b.cyl('woodDark', 0.05, 0.06, 2.02, 6, 1.18, Y + 1.01, zz);
      b.cyl('woodDark', 0.05, 0.06, 2.02, 6, 2.36, Y + 1.01, zz);
      b.cyl('jdRope', 0.008, 0.008, 1.12, 4, 1.77, Y + 1.96, zz, 0, 0, Math.PI / 2);
      b.box('jdCloth', 0.04, 0.52, 0.56, 1.52, Y + 1.68, zz);
      b.box('jdCloth2', 0.04, 0.42, 0.50, 2.06, Y + 1.73, zz);
    })();

    /* 院角石堆 + 农具 */
    b.box('jdStoneD', 0.44, 0.28, 0.48, -6.72, Y + 0.14, -5.55);
    b.box('jdStone', 0.38, 0.24, 0.42, -6.68, Y + 0.40, -5.59, 0, 0.4, 0);
    b.to('woodWarm', 0.026, -6.52, Y + 0.88, -5.05, -6.22, Y + 0.10, -5.15, 5);
    b.box('metal', 0.09, 0.20, 0.24, -6.50, Y + 0.92, -5.05);

    b.build(g);
    return g;
  }

  /* ================= 赛博朋克 · 日式横丁（cyber） =================
     坐标约定与 store/club/wh/jd 一致：建筑沿 -x 一侧排开、立面朝 +X，
     街道朝 +x，相机从 +x / +z 方向看进来（+z 在画面左侧）。
     夜景的关键不是「把灯调暗」，而是：主光压到很低、辨识度全交给
     霓虹自发光 + 加色发光片 + 湿沥青上的倒影。
  */
  const CYB = !!PS.cyber;

  const CY_FX = -1.60;            // 建筑立面（x）
  const CY_BK = -7.40;            // 建筑后墙（x）
  const CY_GY = 0.16;             // 人行道面标高
  const CY_SW1 = -0.30;           // 人行道外沿
  const CY_RD1 = 4.60;            // 车行道外沿
  const CY_FW1 = 5.70;            // 对侧人行道外沿
  const CY_XR = -4.50;            // 屋脊（x）
  const CY_HDF = 3.30, CY_HDB = 2.90;   // 前 / 后坡半深

  const CY_A = { z0: -6.40, z1: -3.20, eave: 4.58, rg: 6.15 };  // 拉面屋（2F）
  const CY_B = { z0: -2.95, z1: -0.30, top: 7.45 };             // 三阶霓虹楼
  const CY_AL = { z0: -0.30, z1: 1.55 };                        // 小巷（1.85 宽）
  const CY_C = { z0: 1.55, z1: 5.00, eave: 4.62, rg: 6.10 };    // 酒屋（2F）
  const CY_D = { z0: 5.25, z1: 6.95, top: 2.75 };               // 章鱼烧小摊

  /* 柔光圆斑：霓虹光晕、地面倒影、路灯光池都用它 */
  const CY_GLOW = canvasTex(128, 128, function (c, w, h) {
    const g2 = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g2.addColorStop(0, 'rgba(255,255,255,0.95)');
    g2.addColorStop(0.26, 'rgba(255,255,255,0.40)');
    g2.addColorStop(0.60, 'rgba(255,255,255,0.11)');
    g2.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g2;
    c.fillRect(0, 0, w, h);
  });

  /* 霓虹字：透明底 + 彩色辉光 + 白色亮芯（加色混合，黑＝无贡献） */
  function cyTextTex(text, color, vertical, aspect) {
    const n = text.length;
    /* 横排画布的宽高比要跟着牌面走，否则字会被拉扁/拉长 */
    const W = vertical ? 220 : Math.max(256, Math.round(256 * (aspect || n * 1.2)));
    const H = vertical ? Math.max(220, n * 196 + 56) : 256;
    return canvasTex(W, H, function (c, w, h) {
      c.clearRect(0, 0, w, h);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const fs = vertical ? 148 : Math.min(h * 0.82, (w * 0.92) / n);
      c.font = '900 ' + fs + 'px "Yu Gothic","Meiryo","MS Gothic","Noto Sans JP",sans-serif';
      const ys = vertical ? 98 : h / 2;
      /* ★ 横排必须逐字横向排开：以前全画在 w/2，字叠成一坨读不出来 */
      const sp = vertical ? 196 : fs * 1.06;
      const x0 = w / 2 - (n - 1) * sp / 2;
      c.shadowColor = color;
      c.shadowBlur = vertical ? 42 : 30;
      c.fillStyle = color;
      for (let i = 0; i < n; i++) c.fillText(text[i], vertical ? w / 2 : x0 + i * sp, vertical ? ys + i * 196 : ys);
      c.shadowBlur = 8;
      c.fillStyle = 'rgba(255,255,255,0.94)';
      for (let i = 0; i < n; i++) c.fillText(text[i], vertical ? w / 2 : x0 + i * sp, vertical ? ys + i * 196 : ys);
    });
  }

  /* 霓虹灯牌：贴面（ry = Math.PI/2 朝 +x，ry = 0 朝 +z） */
  function cySign(text, colorHex, x, y, z, pw, ph, ry, vertical, glowOp) {
    const tex = cyTextTex(text, '#' + ('000000' + colorHex.toString(16)).slice(-6), vertical !== false, pw / ph);
    const m = new T.Mesh(new T.PlaneGeometry(pw, ph), new T.MeshBasicMaterial({
      map: tex, transparent: true, blending: T.AdditiveBlending,
      depthWrite: false, side: T.DoubleSide
    }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.renderOrder = 5;
    scene.add(m);
    if (glowOp) {
      const s = new T.Sprite(new T.SpriteMaterial({
        map: CY_GLOW, color: new T.Color(colorHex), transparent: true,
        opacity: glowOp, blending: T.AdditiveBlending, depthWrite: false
      }));
      s.position.set(x + Math.sin(ry) * 0.05, y, z + Math.cos(ry) * 0.05);
      s.scale.set(Math.max(pw, ph) * 1.7, Math.max(pw, ph) * 1.7, 1);
      s.renderOrder = 4;
      scene.add(s);
    }
    return m;
  }

  /* 湿地面上的倒影光斑（贴地加色片） */
  function cyWet(x, z, sx, sz, colorHex, op, rot) {
    const m = new T.Mesh(new T.PlaneGeometry(sx, sz), new T.MeshBasicMaterial({
      map: CY_GLOW, color: new T.Color(colorHex), transparent: true,
      opacity: op, blending: T.AdditiveBlending, depthWrite: false, fog: false
    }));
    /* Rz 先于 Rx 作用于局部，所以这是「在自身平面内转向」，不是歪掉 */
    m.rotation.set(-Math.PI / 2, 0, rot || 0);
    m.position.set(x, 0.028, z);
    m.renderOrder = 2;
    scene.add(m);
    return m;
  }

  /* 积水：压深的一小片，边缘不规则靠两个椭圆叠出来 */
  function cyPuddle(x, z, r, sy, rot) {
    const g = new T.Group();
    [[1, 1], [0.62, 0.86]].forEach(function (q, i) {
      const m = new T.Mesh(new T.CircleGeometry(r * q[0], 16), new T.MeshBasicMaterial({
        color: i ? 0x141c28 : 0x0b1018, transparent: true, opacity: i ? 0.55 : 0.80,
        fog: false
      }));
      m.rotation.x = -Math.PI / 2;
      m.position.set((i ? 0.22 : 0) * r, i * 0.002, (i ? -0.16 : 0) * r);
      m.scale.set(1, sy, 1);
      m.rotation.z = rot || 0;
      g.add(m);
    });
    g.position.set(x, 0.026, z);
    scene.add(g);
    return g;
  }

  /* ---------- 小件 ---------- */
  function cyAC(b, x, y, z, d) {
    /* 空调外机：机体 + 风扇圈 + 支架 + 冷媒管 */
    const w = d || 0.52;
    b.box('cyMetal', 0.26, 0.38, w, x, y, z);
    b.torus('cyMetalD', 0.125, 0.018, x + 0.135, y, z, 0, Math.PI / 2, 0);
    b.cyl('cyMetalD', 0.03, 0.03, 0.02, 8, x + 0.14, y, z, 0, 0, Math.PI / 2);
    b.box('cyMetalD', 0.30, 0.04, w + 0.06, x, y - 0.21, z);
    b.cyl('cyPipeD', 0.028, 0.028, 0.34, 5, x - 0.02, y - 0.40, z + w / 2 - 0.06);
  }

  function cyPipe(b, x, z, y0, y1, key) {
    b.cyl(key || 'cyPipe', 0.045, 0.045, y1 - y0, 6, x, (y0 + y1) / 2, z);
    b.box(key || 'cyPipe', 0.12, 0.05, 0.12, x, y1, z);
  }

  /* 自动售货机：独立 Group + 独立 Builder（不能用共享 Builder 的局部坐标） */
  function cyVend(parent, x, z, ry) {
    const g = new T.Group();
    const b = new Builder();
    const w = 0.86, h = 1.82, d = 0.68;
    b.box('cyVendBody', d, h, w, 0, h / 2, 0);
    b.box('cyMetalD', d + 0.03, 0.10, w + 0.03, 0, h + 0.03, 0);      // 顶檐
    b.box('cyVendIn', 0.03, 1.06, w - 0.12, d / 2 + 0.005, 1.30, 0);  // 展示面（自发光）
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 4; i++) {
        const zz = -w / 2 + 0.15 + i * ((w - 0.30) / 3);
        b.box(i % 2 ? 'cyCan2' : 'cyCan', 0.05, 0.20, 0.10, d / 2 + 0.03, 0.88 + r * 0.34, zz);
      }
      b.box('cyMetalD', 0.04, 0.02, w - 0.16, d / 2 + 0.02, 0.76 + r * 0.34, 0);
    }
    b.box('cyMetalD', 0.06, 0.26, w - 0.20, d / 2 + 0.02, 0.42, 0);   // 取物口
    b.box('cyVendIn', 0.04, 0.10, w - 0.34, d / 2 + 0.02, 0.12, 0);
    b.build(g);
    g.position.set(x, CY_GY, z);
    g.rotation.y = ry || 0;
    parent.add(g);
    return g;
  }

  /* ---------- 屋顶：双坡 + 瓦垄 + 檐口 + 山墙 ---------- */
  function cyRoof(b, z0, z1, yE, yG, hdF, hdB) {
    const dy = yG - yE;
    const Lf = Math.hypot(hdF, dy), Lb = Math.hypot(hdB, dy);
    const af = Math.atan2(dy, -hdF), ab = Math.atan2(dy, hdB);
    const zc = (z0 + z1) / 2, zl = z1 - z0;
    b.box('cyTile', Lf + 0.12, 0.22, zl + 0.34, CY_XR + hdF / 2, (yE + yG) / 2, zc, 0, 0, af);
    b.box('cyTile', Lb + 0.12, 0.22, zl + 0.34, CY_XR - hdB / 2, (yE + yG) / 2, zc, 0, 0, ab);
    /* 瓦垄：沿坡各 12 道圆辊，法线方向抬 0.11 */
    const nf = [dy / Lf, hdF / Lf], nb = [-dy / Lb, hdB / Lb];
    const NF = 13;
    for (let i = 0; i <= NF; i++) {
      const z = z0 - 0.12 + (zl + 0.24) * i / NF;
      b.to('cyTileL', 0.040,
        CY_XR + nf[0] * 0.12, yG + nf[1] * 0.12, z,
        CY_XR + hdF + nf[0] * 0.12, yE + nf[1] * 0.12, z, 4);
      b.to('cyTileL', 0.040,
        CY_XR + nb[0] * 0.12, yG + nb[1] * 0.12, z,
        CY_XR - hdB + nb[0] * 0.12, yE + nb[1] * 0.12, z, 4);
    }
    /* 檐口封边 + 檐沟 + 圆脊 */
    [1, -1].forEach(function (s) {
      const xe = CY_XR + s * (s > 0 ? hdF : hdB);
      b.box('cyTileD', 0.16, 0.16, zl + 0.36, xe, yE - 0.02, zc);
      b.cyl('cyMetalD', 0.070, 0.070, zl + 0.30, 6, xe - 0.03, yE - 0.13, zc, Math.PI / 2, 0, 0);
    });
    b.cyl('cyTileD', 0.135, 0.135, zl + 0.36, 8, CY_XR, yG + 0.05, zc, Math.PI / 2, 0, 0);
    b.sph('cyTileD', 0.135, CY_XR, yG + 0.05, z0 - 0.18, 1, 1, 0.9);
    b.sph('cyTileD', 0.135, CY_XR, yG + 0.05, z1 + 0.18, 1, 1, 0.9);
  }

  /* 屋面在某个 x 处的高度：屋顶小件贴坡用，别再手写一个 y 让它悬空 */
  function cyRoofY(x, yE, yG) {
    const dy = yG - yE;
    if (x >= CY_XR) return yG - Math.min(1, (x - CY_XR) / CY_HDF) * dy;
    return yG - Math.min(1, (CY_XR - x) / CY_HDB) * dy;
  }

  function cyGable(b, key, z, th, yE, yG, hdF, hdB) {
    const sh = new T.Shape();
    sh.moveTo(CY_XR - hdB, yE);
    sh.lineTo(CY_XR + hdF, yE);
    sh.lineTo(CY_XR, yG);
    sh.closePath();
    const g = new T.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false });
    g.translate(0, 0, z);
    b.add(key, g);
  }

  /* ---------- 店面小件 ---------- */
  /* 竖棂窗：木格栅 + 背后的暖光面（x 是格栅所在平面，光面自动往里退 0.06） */
  function cyLatticeWin(b, x, zc, w, y0, y1, n, glowKey) {
    /* 暖光面必须落在「窗棂背后、墙面之前」这 3cm 的缝里，否则会被抹灰墙吃掉 */
    b.box(glowKey || 'cyWinW', 0.05, y1 - y0, w, x - 0.045, (y0 + y1) / 2, zc);
    const n2 = n || Math.max(3, Math.round(w / 0.115));
    for (let i = 0; i <= n2; i++) {
      b.box('cyWoodD', 0.055, y1 - y0, 0.042, x, (y0 + y1) / 2, zc - w / 2 + w * i / n2);
    }
    b.box('cyWoodD', 0.075, 0.075, w + 0.06, x, y1, zc);
    b.box('cyWoodD', 0.075, 0.075, w + 0.06, x, y0, zc);
  }

  /* 暖帘：几片布 + 中间一个圆纹 */
  function cyNoren(b, x, zc, w, y0, y1, key, badge) {
    const n = 3, gap = 0.035;
    const pw = (w - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      const z = zc - w / 2 + pw / 2 + i * (pw + gap);
      b.box(key || 'cyNoren', 0.035, y1 - y0, pw, x, (y0 + y1) / 2, z);
      b.cyl('cyWoodD', 0.016, 0.016, pw, 4, x, y0 - 0.012, z, 0, 0, Math.PI / 2);
    }
    if (badge) {
      b.cyl(badge, 0.085, 0.085, 0.012, 10, x + 0.024, (y0 + y1) / 2 + 0.04, zc, 0, 0, Math.PI / 2);
    }
  }

  /* 提灯（发光筒 + 上下盖 + 吊绳） */
  function cyLantern(b, x, y, z, r, h) {
    b.cyl('cyLantern', r, r, h, 12, x, y, z);
    b.cyl('cyWoodD', r * 0.72, r * 0.72, 0.05, 10, x, y + h / 2 + 0.02, z);
    b.cyl('cyWoodD', r * 0.72, r * 0.72, 0.05, 10, x, y - h / 2 - 0.02, z);
    b.cyl('cyWoodD', 0.012, 0.012, 0.18, 4, x, y + h / 2 + 0.14, z);
  }

  /* ---------- 地台 / 街道 ---------- */
  function buildCyBase() {
    const g = new T.Group();
    const b = new Builder();

    /* 展台做成「长条形」而不是正方：街本来就是线性的，
       17×17 的方台会在近侧留出一大片没内容的沥青 */
    b.box('cyBaseD', 15.9, 0.34, 17.9, -0.55, -1.86, 0);
    b.box('cyBaseD', 15.3, 0.20, 17.3, -0.55, -1.60, 0);
    /* 地台：路面整体压到 y=0 */
    b.box('cyAsphalt', 14.9, 0.42, 16.9, -0.55, -0.21, 0);

    /* 沥青补丁 + 接缝（低饱和大块，不要做成马赛克） */
    const patches = [
      [1.35, -2.05, 2.30, 1.60, 'cyAsphalt2'], [3.30, 4.10, 1.70, 2.40, 'cyAsphalt2'],
      [-0.05, 5.55, 1.20, 1.90, 'cyAsphalt3'], [4.05, -5.30, 2.10, 1.50, 'cyAsphalt2'],
      [0.95, 0.55, 1.45, 1.10, 'cyAsphalt3']
    ];
    patches.forEach(function (q) {
      b.box(q[4], q[2], 0.012, q[3], q[0], 0.006, q[1]);
    });
    for (let i = 0; i < 5; i++) {
      b.box('cyAsphalt3', 0.05, 0.014, 2.2 + i * 0.7, -0.1 + i * 0.9, 0.008, -1.4 + i * 1.9, 0, 0.06 * i, 0);
    }

    /* 人行道（近侧）：顶面 0.16 */
    b.box('cyWalk', 1.30, 0.16, 17.0, -0.95, 0.08, 0);
    for (let z = -7.5; z < 7.6; z += 0.72) {
      b.box('cyWalk2', 1.28, 0.012, 0.035, -0.95, 0.162, z);
    }
    b.box('cyWalk2', 0.035, 0.012, 17.0, -0.62, 0.162, 0);
    /* 路缘石 */
    b.box('cyCurb', 0.16, 0.20, 17.0, -0.30, 0.10, 0);
    b.box('cyCurb', 0.20, 0.06, 17.0, -0.32, 0.185, 0);

    /* 对侧人行道 + 路缘 */
    b.box('cyWalk', 1.10, 0.16, 17.0, 5.15, 0.08, 0);
    for (let z = -7.5; z < 7.6; z += 0.72) {
      b.box('cyWalk2', 1.08, 0.012, 0.035, 5.15, 0.162, z);
    }
    b.box('cyCurb', 0.16, 0.20, 17.0, 4.58, 0.10, 0);
    b.box('cyCurb', 0.20, 0.06, 17.0, 4.56, 0.185, 0);
    /* 对面再往外一点：压低的地坪，收到展台边 */
    b.box('cyWalk2', 1.30, 0.10, 17.0, 6.30, 0.05, 0);

    /* 中心虚线（白）+ 边线 */
    for (let z = -7.6; z < 7.6; z += 2.30) {
      b.box('cyPaintW', 0.13, 0.012, 1.20, 2.15, 0.010, z);
    }
    b.box('cyPaintW', 0.10, 0.012, 15.2, 0.32, 0.010, 0);
    b.box('cyPaintW', 0.10, 0.012, 15.2, 3.98, 0.010, 0);
    /* 斑马线（近侧路口） */
    for (let i = 0; i < 6; i++) {
      b.box('cyPaintW', 0.62, 0.012, 0.46, 0.72 + i * 0.66, 0.011, 6.30);
    }
    b.box('cyPaintW', 3.60, 0.012, 0.14, 1.80, 0.011, 5.72);
    /* 停止线 */
    b.box('cyPaintW', 3.60, 0.012, 0.16, 1.80, 0.011, 7.10);

    /* 井盖 + 雨水篦子 */
    [[1.55, -2.30, 0.34], [3.20, 2.55, 0.30], [1.10, 5.05, 0.28]].forEach(function (q) {
      b.cyl('cyPlate', q[2], q[2], 0.02, 14, q[0], 0.012, q[1]);
      b.torus('cyMetalD', q[2] * 0.86, 0.022, q[0], 0.022, q[1], Math.PI / 2, 0, 0);
    });
    for (let z = -6.4; z < 7.0; z += 2.7) {
      b.box('cyMetalD', 0.34, 0.03, 0.62, -0.10, 0.012, z);
      for (let k = 0; k < 4; k++) {
        b.box('cyPlate', 0.28, 0.02, 0.035, -0.10, 0.03, z - 0.22 + k * 0.145);
      }
    }

    b.build(g);
    return g;
  }

  /* ---------- 拉面屋 A（2F 町家） ---------- */
  function buildCyA() {
    const g = new T.Group();
    const b = new Builder();
    const z0 = CY_A.z0, z1 = CY_A.z1, zc = (z0 + z1) / 2, W = z1 - z0;
    const E = CY_A.eave, G = CY_A.rg;

    /* 主体（实心，靠贴面做立面） */
    b.box('cyWallA', 5.60, E, W, -4.60, E / 2, zc);

    /* 一层：墙裙 + 木框 */
    b.box('cyWoodD', 0.20, 0.52, W, -1.68, 0.26, zc);
    b.box('cyWoodD', 0.22, 0.16, W + 0.10, -1.66, 2.52, zc);
    [-6.22, -5.42, -4.18, -3.38].forEach(function (z) {
      b.box('cyWoodD', 0.20, 2.34, 0.11, -1.66, 1.30, z);
    });
    /* 门洞（z -5.30..-4.30）+ 门内暖光 + 半开的格子拉门 */
    b.box('cyWinW', 0.05, 2.10, 1.00, -1.78, 1.21, -4.80);
    b.box('cyWoodD', 0.06, 2.16, 0.10, -1.72, 1.20, -5.30);
    b.box('cyWoodD', 0.06, 2.16, 0.10, -1.72, 1.20, -4.30);
    b.box('cyWoodD', 0.06, 2.20, 1.06, -1.72, 2.28, -4.80);
    /* 拉门：左侧半开，格栅 */
    b.box('cyWoodD', 0.05, 2.02, 0.06, -1.70, 1.17, -4.66);
    for (let i = 0; i < 4; i++) {
      b.box('cyWoodD', 0.045, 1.94, 0.035, -1.70, 1.17, -5.22 + i * 0.13);
    }
    /* 两侧格窗 */
    cyLatticeWin(b, -1.66, -5.86, 0.62, 0.86, 2.10, 5);
    cyLatticeWin(b, -1.66, -3.78, 0.66, 0.86, 2.10, 5);
    /* 窗台板 + 门口踏步 */
    b.box('cyWood', 0.26, 0.07, 0.74, -1.62, 0.86, -5.86);
    b.box('cyWood', 0.26, 0.07, 0.78, -1.62, 0.86, -3.78);
    b.box('cyStone', 0.42, 0.16, 1.24, -1.38, CY_GY + 0.03, -4.80);
    b.box('cyStoneD', 0.30, 0.10, 1.10, -1.30, CY_GY + 0.14, -4.80);

    /* 暖帘 + 提灯 */
    cyNoren(b, -1.30, -4.80, 1.14, 2.02, 2.42, 'cyNoren', 'cyCream');
    cyLantern(b, -1.34, 2.62, -5.52, 0.155, 0.42);
    cyLantern(b, -1.34, 2.62, -4.08, 0.155, 0.42);
    b.box('cyWoodD', 0.05, 0.05, 1.70, -1.34, 2.90, -4.80);

    /* 菜单木牌 + 门口长凳 */
    b.box('cyWood', 0.06, 0.62, 0.40, -1.24, 1.42, -3.34, 0, 0, 0.04);
    b.box('cyWoodD', 0.05, 0.52, 0.30, -1.20, 1.42, -3.34);
    b.box('cyWood', 0.34, 0.08, 0.90, -1.28, 0.60, -5.86);
    b.box('cyWoodD', 0.30, 0.44, 0.10, -1.28, 0.38, -6.20);

    /* 二层：灰泥墙 + 两扇格窗 */
    b.box('cyPlaster', 0.18, 1.95, W, -1.70, 3.50, zc);
    cyLatticeWin(b, -1.555, -5.62, 1.02, 3.02, 3.98, 8);
    cyLatticeWin(b, -1.555, -4.02, 1.02, 3.02, 3.98, 8);
    b.box('cyWoodD', 0.24, 0.10, W + 0.06, -1.62, 2.94, zc);
    b.box('cyWoodD', 0.22, 0.12, W + 0.06, -1.62, 4.18, zc);

    /* 竖招牌：拉麺（洋红） */
    b.box('cySignBox', 0.10, 1.62, 0.86, -1.50, 3.62, -3.52);
    b.box('cyMetalD', 0.16, 0.08, 0.92, -1.50, 4.44, -3.52);
    cySign('拉麺', 0xff3d8f, -1.44, 3.62, -3.52, 0.78, 1.50, Math.PI / 2, true, 0.30);

    /* 屋檐下的小瓦披 + 正脊 */
    b.box('cyTileD', 0.44, 0.055, W + 0.16, -1.50, 2.56, zc, 0, 0, -0.30);
    cyRoof(b, z0, z1, E, G, CY_HDF, CY_HDB);
    cyGable(b, 'cyWallA', z0, 0.18, E, G, CY_HDF, CY_HDB);
    cyGable(b, 'cyWallA', z1 - 0.18, 0.18, E, G, CY_HDF, CY_HDB);

    /* 屋顶小件：排气管 + 电视天线（都按坡面高度落地） */
    const ry1 = cyRoofY(-3.10, E, G), ry2 = cyRoofY(-5.70, E, G);
    b.cyl('cyPipe', 0.06, 0.06, 0.62, 6, -3.10, ry1 + 0.24, -5.10);
    b.cyl('cyMetalD', 0.16, 0.16, 0.06, 8, -3.10, ry1 + 0.56, -5.10);
    b.cyl('cyMetal', 0.016, 0.016, 1.20, 4, -5.70, ry2 + 0.58, -3.70);
    b.box('cyMetal', 0.02, 0.02, 1.05, -5.70, ry2 + 1.10, -3.70);
    b.box('cyMetal', 0.02, 0.02, 0.78, -5.70, ry2 + 0.94, -3.70);

    b.build(g);
    return g;
  }

  /* ---------- 霓虹楼 B（3F） ---------- */
  function buildCyB() {
    const g = new T.Group();
    const b = new Builder();
    const z0 = CY_B.z0, z1 = CY_B.z1, zc = (z0 + z1) / 2, W = z1 - z0;
    const TOP = CY_B.top;

    b.box('cyWallB', 5.60, TOP, W, -4.60, TOP / 2, zc);
    /* 三层腰线 */
    [3.02, 5.18].forEach(function (y) {
      b.box('cyMetalD', 0.22, 0.16, W, -1.70, y, zc);
      b.box('cyWallB2', 0.16, 0.34, W, -1.72, y + 0.25, zc);
    });
    /* 一层：卷帘门 + 侧门 + 墙面小广告 */
    b.box('cyShutter', 0.16, 2.30, 1.30, -1.70, 1.31, -2.10);
    for (let i = 0; i < 12; i++) {
      b.box('cyMetalD', 0.19, 0.035, 1.26, -1.68, 0.28 + i * 0.185, -2.10);
    }
    b.box('cyWoodD', 0.20, 2.36, 0.10, -1.68, 1.34, -2.78);
    b.box('cyWoodD', 0.20, 2.36, 0.10, -1.68, 1.34, -1.42);
    b.box('cyWoodD', 0.20, 0.12, 1.44, -1.68, 2.50, -2.10);
    /* 卷帘门上的涂鸦条 */
    b.box('cyGraffiti', 0.06, 0.30, 0.90, -1.60, 1.30, -2.10, 0, 0, 0.10);
    b.box('cyGraffiti2', 0.06, 0.14, 0.55, -1.59, 1.66, -2.34, 0, 0, -0.07);

    /* 二层 / 三层：横向带窗 */
    [[3.72, 4.90], [5.90, 7.02]].forEach(function (q, fi) {
      const y0 = q[0], y1 = q[1];
      b.box('cyWinC', 0.05, y1 - y0, 2.10, -1.74, (y0 + y1) / 2, -1.55);
      const n2 = 4;
      for (let i = 0; i <= n2; i++) {
        b.box('cyMetalD', 0.10, y1 - y0, 0.055, -1.67, (y0 + y1) / 2, -2.60 + i * 0.525);
      }
      b.box('cyMetalD', 0.12, 0.07, 2.16, -1.67, y1, -1.55);
      b.box('cyMetalD', 0.12, 0.07, 2.16, -1.67, y0, -1.55);
      /* 窗内隐约的书架/机房剪影 */
      b.box('cyWallB2', 0.04, 0.30, 1.90, -1.72, y0 + 0.36, -1.55);
      if (fi) {
        b.box('cyWallB2', 0.04, 0.22, 0.80, -1.72, y0 + 0.88, -2.10);
      }
    });

    /* 空调 + 立管 + 电表箱 */
    cyAC(b, -1.66, 3.35, -0.62, 0.62);
    cyAC(b, -1.66, 5.55, -2.62, 0.56);
    cyPipe(b, -1.74, -0.18, 0.10, 5.10, 'cyPipe');
    cyPipe(b, -1.74, -2.86, 0.10, 7.00, 'cyPipeD');
    b.box('cyMetal', 0.10, 0.32, 0.26, -1.66, 2.20, -1.28);

    /* 竖招牌：電脳酒場（青） */
    b.box('cySignBox', 0.10, 3.60, 0.90, -1.52, 4.98, -1.02);
    b.box('cyMetalD', 0.16, 0.10, 0.96, -1.52, 6.80, -1.02);
    cySign('電脳酒場', 0x35e0ff, -1.46, 4.98, -1.02, 0.82, 3.46, Math.PI / 2, true, 0.26);

    /* 挑出式灯箱（袖看板）：面向 +z，正对相机 */
    b.box('cySignBox', 0.62, 1.34, 0.09, -1.28, 4.86, CY_B.z1 + 0.03);
    b.box('cyMetalD', 0.66, 0.06, 0.13, -1.28, 5.56, CY_B.z1 + 0.03);
    b.box('cyMetalD', 0.06, 0.06, 0.13, -1.58, 5.56, CY_B.z1 + 0.03);
    cySign('BAR', 0xff3d8f, -1.28, 4.86, CY_B.z1 + 0.085, 0.52, 1.20, 0, true, 0.22);
    cySign('BAR', 0xff3d8f, -1.28, 4.86, CY_B.z1 - 0.025, 0.52, 1.20, Math.PI, true, 0);

    /* 楼顶：女儿墙 + 水箱 + 风机 + 天线阵 */
    b.box('cyWallB2', 0.20, 0.44, W, -1.70, TOP + 0.22, zc);
    b.box('cyWallB2', 5.60, 0.44, 0.18, -4.60, TOP + 0.22, z0 + 0.09);
    b.box('cyWallB2', 5.60, 0.44, 0.18, -4.60, TOP + 0.22, z1 - 0.09);
    b.box('cyMetalD', 0.26, 0.07, W + 0.10, -1.70, TOP + 0.47, zc);
    /* 不锈钢水箱 */
    b.cyl('cyTank', 0.52, 0.52, 1.05, 14, -5.55, TOP + 0.98, -1.05);
    b.cyl('cyTankD', 0.54, 0.54, 0.07, 14, -5.55, TOP + 1.54, -1.05);
    b.cyl('cyTankD', 0.54, 0.54, 0.07, 14, -5.55, TOP + 0.45, -1.05);
    [[-5.95, -1.45], [-5.15, -1.45], [-5.95, -0.65], [-5.15, -0.65]].forEach(function (q) {
      b.box('cyMetalD', 0.07, 0.42, 0.07, q[0], TOP + 0.21, q[1]);
    });
    /* 屋顶风机 + 天线 */
    b.box('cyMetal', 0.62, 0.34, 0.62, -3.20, TOP + 0.62, 0.05);
    b.cyl('cyMetalD', 0.26, 0.26, 0.05, 12, -3.20, TOP + 0.80, 0.05);
    b.cyl('cyMetal', 0.022, 0.022, 2.10, 4, -2.60, TOP + 1.30, -2.35);
    b.box('cyMetal', 0.03, 0.03, 1.30, -2.60, TOP + 2.05, -2.35);
    b.box('cyMetal', 0.03, 0.03, 0.95, -2.60, TOP + 1.70, -2.35);
    b.cyl('cyMetalD', 0.10, 0.10, 0.10, 8, -2.60, TOP + 0.42, -2.35);

    b.build(g);
    return g;
  }

  /* ---------- 酒屋 C（2F）+ 便利店式发光店面 ---------- */
  function buildCyC() {
    const g = new T.Group();
    const b = new Builder();
    const z0 = CY_C.z0, z1 = CY_C.z1, zc = (z0 + z1) / 2, W = z1 - z0;
    const E = CY_C.eave, G = CY_C.rg;

    b.box('cyWallC', 5.60, E, W, -4.60, E / 2, zc);

    /* 一层：大玻璃 + 白色内光 + 货架剪影 */
    const oz0 = 2.08, oz1 = 4.52, oy0 = 0.28, oy1 = 2.52;
    b.box('cyShopW', 0.05, oy1 - oy0, oz1 - oz0, -1.79, (oy0 + oy1) / 2, (oz0 + oz1) / 2);
    /* 货架：横板 + 立板 + 彩色商品。只有板没有货，读起来就是个白柜子 */
    [0.86, 1.42, 1.98].forEach(function (y, ri) {
      b.box('cyShopD', 0.04, 0.09, oz1 - oz0 - 0.10, -1.72, y, (oz0 + oz1) / 2);
      b.box('cyShopD', 0.05, 0.14, oz1 - oz0 - 0.10, -1.71, y + 0.20, (oz0 + oz1) / 2);
      for (let i = 0; i < 9; i++) {
        const zz = oz0 + 0.22 + i * ((oz1 - oz0 - 0.44) / 8);
        b.box(i % 3 === 0 ? 'cyCan2' : (i % 3 === 1 ? 'cyCan' : 'cyCream'),
          0.05, 0.15, 0.13, -1.695, y + 0.10, zz);
      }
    });
    for (let i = 0; i < 5; i++) {
      b.box('cyShopD', 0.05, 2.10, 0.05, -1.71, 1.40, oz0 + 0.35 + i * 0.55);
    }
    /* 收银台 */
    b.box('cyShopD', 0.34, 0.92, 0.70, -1.62, 0.62, 4.04);
    b.box('cyShopW', 0.06, 0.26, 0.62, -1.44, 0.90, 4.04);
    /* 玻璃竖梃 + 横档 */
    [oz0, 3.02, 3.96, oz1].forEach(function (z) {
      b.box('cyMetalD', 0.10, oy1 - oy0, 0.075, -1.59, (oy0 + oy1) / 2, z);
    });
    b.box('cyMetalD', 0.10, 0.075, oz1 - oz0, -1.59, oy1, (oz0 + oz1) / 2);
    b.box('cyMetalD', 0.10, 0.09, oz1 - oz0, -1.59, oy0, (oz0 + oz1) / 2);
    b.box('cyMetalD', 0.10, 0.06, oz1 - oz0, -1.59, 1.30, (oz0 + oz1) / 2);
    /* 自动门：中间两片 + 感应器 */
    b.box('cyShopIn', 0.05, 1.94, 1.06, -1.74, 1.30, 3.30);
    b.box('cyShopW', 0.04, 1.88, 0.96, -1.71, 1.30, 3.30);
    b.box('cyMetalD', 0.10, 2.06, 0.075, -1.58, 1.30, 2.76);
    b.box('cyMetalD', 0.10, 2.06, 0.075, -1.58, 1.30, 3.84);
    b.box('cyMetalD', 0.10, 0.075, 1.14, -1.58, 2.32, 3.30);
    b.box('cyMetalD', 0.10, 0.06, 1.14, -1.58, 0.32, 3.30);
    b.box('cyGlassD', 0.05, 1.94, 0.48, -1.585, 1.30, 3.06);
    b.box('cyGlassD', 0.05, 1.94, 0.48, -1.585, 1.30, 3.54);
    b.box('cyMetalD', 0.07, 0.05, 0.44, -1.55, 1.06, 3.06);
    b.box('cyMetalD', 0.07, 0.05, 0.44, -1.55, 1.06, 3.54);
    b.box('cyMetalD', 0.12, 0.10, 0.20, -1.56, 2.46, 3.30);
    b.box('cyNeonA', 0.04, 0.04, 0.94, -1.55, 2.40, 3.30);
    /* 门口地垫 + 立式广告牌 + 营业中灯牌 */
    b.box('cySignBox', 0.06, 0.26, 0.62, -1.58, 2.70, 3.92);
    cySign('営業中', 0x35e0ff, -1.54, 2.70, 3.92, 0.54, 0.17, Math.PI / 2, false, 0.14);
    b.box('cyWalk2', 0.52, 0.02, 1.30, -1.32, CY_GY + 0.012, 3.30);
    b.box('cySignBox', 0.06, 0.80, 0.46, -1.10, 0.55, 2.62, 0, 0.26, 0.02);
    b.box('cyNeonA', 0.03, 0.04, 0.40, -1.07, 0.92, 2.62, 0, 0.26, 0.02);
    b.box('cyNeonA', 0.03, 0.04, 0.40, -1.07, 0.18, 2.62, 0, 0.26, 0.02);

    /* 招牌带：白底灯箱 + 酒処（琥珀） */
    b.box('cyMetalD', 0.24, 0.66, W - 0.24, -1.68, 3.02, zc);
    b.box('cySignBox', 0.06, 0.50, W - 0.38, -1.55, 3.02, zc);
    b.box('cyNeonA', 0.03, 0.04, W - 0.42, -1.51, 3.28, zc);
    b.box('cyNeonA', 0.03, 0.04, W - 0.42, -1.51, 2.76, zc);
    cySign('酒処', 0xffa62e, -1.50, 3.02, 3.42, 0.86, 0.40, Math.PI / 2, false, 0.24);
    cySign('たばこ', 0xfff0d0, -1.50, 3.02, 2.30, 0.76, 0.26, Math.PI / 2, false, 0.16);

    /* 挑出式袖看板「居酒屋」：垂直挑出立面，转到任何角度都看得见 */
    b.box('cyMetalD', 0.42, 0.05, 0.05, -1.40, 4.48, 1.94);
    b.box('cyMetalD', 0.42, 0.05, 0.05, -1.40, 3.40, 1.94);
    b.box('cySignBox', 0.62, 1.18, 0.09, -1.22, 3.94, 1.94);
    b.box('cyMetalD', 0.66, 0.05, 0.11, -1.22, 4.55, 1.94);
    b.box('cyMetalD', 0.66, 0.05, 0.11, -1.22, 3.33, 1.94);
    cySign('居酒屋', 0xffa62e, -1.22, 3.94, 1.988, 0.54, 1.10, 0, true, 0.20);
    cySign('居酒屋', 0xffa62e, -1.22, 3.94, 1.892, 0.54, 1.10, Math.PI, true, 0);

    /* 赤提灯 ×2：酒屋最认得出的记号，门两侧各挂一盏 */
    [2.42, 4.16].forEach(function (lz) {
      b.box('cyMetalD', 0.36, 0.035, 0.035, -1.42, 2.72, lz);
      b.box('cyMetalD', 0.03, 0.13, 0.03, -1.26, 2.64, lz);
      b.cyl('cyLantern', 0.23, 0.23, 0.52, 12, -1.26, 2.32, lz);
      [2.20, 2.32, 2.44].forEach(function (y) {
        b.cyl('cyWoodD', 0.236, 0.236, 0.018, 12, -1.26, y, lz);
      });
      b.cyl('cyWoodD', 0.12, 0.14, 0.07, 10, -1.26, 2.60, lz);
      b.cyl('cyWoodD', 0.14, 0.12, 0.07, 10, -1.26, 2.04, lz);
      cySign('酒', 0xfff0d0, -1.022, 2.32, lz, 0.32, 0.36, Math.PI / 2, false, 0);
    });

    /* 二层：住宅感 —— 两扇暖窗 + 晾衣 + 空调 + 卫星锅 */
    b.box('cyPlaster', 0.18, 1.30, W, -1.70, 3.75, zc);
    cyLatticeWin(b, -1.555, 2.28, 0.92, 3.40, 4.04, 7);
    cyLatticeWin(b, -1.555, 4.10, 0.92, 3.40, 4.04, 7);
    b.box('cyWoodD', 0.24, 0.09, W + 0.06, -1.62, 3.30, zc);
    b.box('cyWoodD', 0.22, 0.10, W + 0.06, -1.62, 4.12, zc);
    /* 晾衣杆 + 一件白毛巾：三块彩色布会读成「贴在窗上的色板」 */
    b.box('cyMetal', 0.03, 0.03, 1.00, -1.38, 4.24, 3.18);
    b.box('cyCream', 0.04, 0.40, 0.30, -1.36, 4.02, 3.38);
    b.box('cyCream', 0.04, 0.02, 0.32, -1.36, 4.21, 3.38);
    cyAC(b, -1.64, 3.60, 4.62, 0.54);
    b.cyl('cyTank', 0.24, 0.24, 0.06, 12, -1.56, 4.06, 1.72, 0, 0, 0.5);
    b.cyl('cyTank', 0.16, 0.16, 0.05, 10, -1.52, 4.06, 1.72, 0, 0, 0.5);

    /* 屋顶 */
    cyRoof(b, z0, z1, E, G, CY_HDF, CY_HDB);
    cyGable(b, 'cyWallC', z0, 0.18, E, G, CY_HDF, CY_HDB);
    cyGable(b, 'cyWallC', z1 - 0.18, 0.18, E, G, CY_HDF, CY_HDB);
    const ryC = cyRoofY(-6.10, E, G);
    b.cyl('cyPipe', 0.05, 0.05, 0.55, 6, -6.10, ryC + 0.20, 4.30);
    b.cyl('cyMetalD', 0.13, 0.13, 0.05, 8, -6.10, ryC + 0.46, 4.30);

    /* 菰樽（草包酒桶）堆：酒屋最认得出的体量，替掉原来的塑料周转箱 */
    [[-1.36, 4.50, 0], [-1.36, 4.86, 0], [-1.36, 4.68, 0.47]].forEach(function (q) {
      const y0 = CY_GY + q[2];
      b.cyl('cyStraw', 0.215, 0.215, 0.46, 12, q[0], y0 + 0.23, q[1]);
      b.cyl('cyRope', 0.219, 0.219, 0.042, 12, q[0], y0 + 0.11, q[1]);
      b.cyl('cyRope', 0.219, 0.219, 0.042, 12, q[0], y0 + 0.35, q[1]);
      b.cyl('cyWoodD', 0.20, 0.20, 0.04, 12, q[0], y0 + 0.47, q[1]);
      b.box('cySake', 0.03, 0.16, 0.26, q[0] + 0.205, y0 + 0.24, q[1]);
    });

    b.build(g);
    return g;
  }

  /* ---------- 章鱼烧小摊 D ---------- */
  function buildCyD() {
    const g = new T.Group();
    const b = new Builder();
    const z0 = CY_D.z0, z1 = CY_D.z1, zc = (z0 + z1) / 2, W = z1 - z0;
    const TOP = CY_D.top;

    /* 小房体 */
    b.box('cyWallC', 2.70, TOP, W, -3.15, TOP / 2, zc);
    b.box('cyWallC2', 0.16, 0.30, W, -3.10, TOP - 0.15, zc);
    /* 平屋顶 + 女儿墙 + 屋顶杂物 */
    b.box('cyRoofFlat', 2.90, 0.18, W + 0.20, -3.15, TOP + 0.09, zc);
    b.box('cyRoofEdge', 0.14, 0.24, W + 0.20, -1.76, TOP + 0.28, zc);
    b.box('cyMetal', 0.46, 0.30, 0.46, -3.10, TOP + 0.32, 6.35);
    b.box('cyCrate', 0.36, 0.28, 0.42, -3.05, TOP + 0.30, 5.70);

    /* 面向街道的售卖口：台面 + 帘 + 灯串 */
    b.box('cyWood', 0.30, 0.10, 1.60, -1.62, 1.10, zc);
    b.box('cyWoodD', 0.26, 0.98, 0.10, -1.62, 0.60, z0 + 0.34);
    b.box('cyWoodD', 0.26, 0.98, 0.10, -1.62, 0.60, z1 - 0.34);
    b.box('cyShopW', 0.06, 0.56, 1.44, -1.72, 1.82, zc);
    /* 铁板 + 竹签筒 + 酱瓶 */
    b.box('cyMetalD', 0.42, 0.05, 1.10, -1.62, 1.18, zc);
    b.cyl('cyMetal', 0.07, 0.07, 0.26, 8, -1.58, 1.28, 5.86);
    b.cyl('cyCream', 0.05, 0.05, 0.20, 8, -1.58, 1.25, 6.34);
    /* 遮阳篷：斜板 + 前端檐口 */
    b.box('cyAwning', 0.92, 0.08, W - 0.10, -1.18, 2.44, zc, 0, 0, -0.26);
    b.box('cyAwning2', 0.10, 0.26, W - 0.10, -0.74, 2.30, zc);
    b.box('cyMetalD', 0.06, 0.06, W - 0.20, -0.76, 2.16, zc);
    /* 灯串 */
    for (let i = 0; i < 6; i++) {
      b.sph('cyBulb', 0.045, -0.80 + (i % 2) * 0.05, 2.12 - (i % 3) * 0.03, z0 + 0.30 + i * 0.26);
    }
    /* 招牌：たこ焼 */
    b.box('cySignBox', 0.08, 0.46, 1.30, -0.72, 2.30, zc);
    cySign('たこ焼', 0xffb347, -0.67, 2.30, zc, 1.16, 0.38, Math.PI / 2, false, 0.24);

    /* 高脚凳 ×2 */
    [5.78, 6.44].forEach(function (z) {
      b.cyl('cyMetalD', 0.035, 0.035, 0.62, 6, -0.94, 0.47, z);
      b.cyl('cyWood', 0.16, 0.15, 0.055, 10, -0.94, 0.80, z);
      b.torus('cyMetalD', 0.13, 0.014, -0.94, 0.30, z, Math.PI / 2, 0, 0);
    });

    b.build(g);
    return g;
  }

  /* ---------- 巷子：鸟居 + 稻荷社 + 酒吧后门 ---------- */
  function buildCyAlley() {
    const g = new T.Group();
    const b = new Builder();
    const z0 = CY_AL.z0, z1 = CY_AL.z1, zc = (z0 + z1) / 2;

    /* 巷底（比人行道低一点，有排水沟） */
    b.box('cyAlley', 5.80, 0.16, 1.40, -4.50, 0.08, zc);
    b.box('cyAlley2', 0.22, 0.05, 1.40, -2.90, 0.19, zc);
    b.box('cyAlley2', 0.22, 0.05, 1.40, -5.60, 0.19, zc);
    /* 巷内落水管与灯带 */
    b.cyl('cyPipe', 0.05, 0.05, 2.60, 6, -3.90, 1.30, z0 + 0.10);
    b.box('cyNeonC', 2.40, 0.055, 0.055, -4.90, 2.62, z0 + 0.10);
    b.box('cyMetalD', 2.50, 0.05, 0.14, -4.90, 2.66, z0 + 0.09);
    cyWet(-4.60, zc - 0.32, 3.0, 1.1, 0x2fe8ff, 0.12);

    /* 鸟居：两根柱 + 笠木 + 贯 + 额束 */
    const tz0 = zc - 0.62, tz1 = zc + 0.62, tx = -2.42;
    b.cyl('cyTorii', 0.075, 0.085, 1.72, 8, tx, 0.16 + 0.86, tz0);
    b.cyl('cyTorii', 0.075, 0.085, 1.72, 8, tx, 0.16 + 0.86, tz1);
    b.box('cyToriiD', 0.14, 0.10, 1.62, tx, 0.16 + 1.72, zc);
    b.box('cyTorii', 0.16, 0.11, 1.84, tx, 0.16 + 1.86, zc);
    b.box('cyToriiD', 0.12, 0.09, 1.70, tx, 0.16 + 1.96, zc);
    b.box('cyTorii', 0.16, 0.13, 1.90, tx, 0.16 + 2.02, zc, 0, 0, 0.03);
    b.box('cyToriiD', 0.10, 0.30, 0.14, tx, 0.16 + 1.62, zc);
    b.box('cyStoneD', 0.26, 0.14, 0.26, tx, 0.16 + 0.06, tz0);
    b.box('cyStoneD', 0.26, 0.14, 0.26, tx, 0.16 + 0.06, tz1);
    cySign('稲荷', 0xff5a5a, tx - 0.055, 0.16 + 1.62, zc, 0.26, 0.20, -Math.PI / 2, false, 0.16);

    /* 巷底稻荷社：石座 + 社殿 + 小屋顶 + 石灯笼 ×2 + 赛钱箱 */
    const sx = -6.20, sz = zc;
    b.box('cyStone', 0.86, 0.24, 0.92, sx, 0.16 + 0.12, sz);
    b.box('cyStoneD', 0.70, 0.16, 0.76, sx, 0.16 + 0.32, sz);
    b.box('cyTorii', 0.56, 0.52, 0.62, sx, 0.16 + 0.66, sz);
    b.box('cyWoodD', 0.40, 0.36, 0.06, sx + 0.29, 0.16 + 0.62, sz);
    b.box('cyToriiD', 0.72, 0.09, 0.78, sx, 0.16 + 0.96, sz);
    b.box('cyWoodD', 0.10, 0.16, 0.68, sx, 0.16 + 1.05, sz, 0, 0, 0.30);
    b.box('cyWoodD', 0.44, 0.10, 0.86, sx, 0.16 + 1.14, sz, 0, 0, 0.30);
    b.box('cyToriiD', 0.06, 0.10, 0.82, sx, 0.16 + 1.24, sz, 0, 0, 0.30);
    b.box('cyWoodD', 0.36, 0.20, 0.28, sx + 0.34, 0.16 + 0.10, sz);
    b.cyl('cyLantern', 0.085, 0.085, 0.14, 8, sx, 0.16 + 0.48, sz);
    [sz - 0.50, sz + 0.50].forEach(function (z, i) {
      const lx = sx + 0.62;
      b.box('cyStone', 0.20, 0.10, 0.20, lx, 0.16 + 0.05, z);
      b.cyl('cyStone', 0.045, 0.055, 0.34, 6, lx, 0.16 + 0.28, z);
      b.box('cyStone', 0.20, 0.12, 0.20, lx, 0.16 + 0.50, z);
      b.cyl('cyLantern', 0.065, 0.065, 0.10, 8, lx, 0.16 + 0.50, z);
      b.box('cyStoneD', 0.24, 0.06, 0.24, lx, 0.16 + 0.60, z);
      b.sph('cyStoneD', 0.04, lx, 0.16 + 0.65, z);
    });

    /* B 的侧墙：酒吧后门 + 暖帘 + 青灯 */
    b.box('cyWinC', 0.90, 1.76, 0.05, -3.20, 1.06, z0 + 0.025);
    b.box('cyWoodD', 0.10, 1.84, 0.12, -3.72, 1.00, z0 + 0.05);
    b.box('cyWoodD', 0.10, 1.84, 0.12, -2.68, 1.00, z0 + 0.05);
    b.box('cyWoodD', 0.98, 0.10, 0.12, -3.20, 1.90, z0 + 0.05);
    b.box('cyNeonC', 0.04, 0.05, 0.72, -3.20, 2.14, z0 + 0.05);
    b.box('cyMetal', 0.26, 0.14, 0.10, -2.60, 2.32, z0 + 0.06);
    cyNoren(b, -3.20, z0 + 0.12, 0.94, 1.96, 2.30, 'cyNoren', 'cyCream');
    cySign('営業中', 0x35e0ff, -3.20, 2.42, z0 + 0.08, 0.62, 0.16, 0, false, 0);
    b.box('cyStone', 0.44, 0.12, 0.70, -3.20, 0.16 + 0.06, z0 + 0.36);

    /* 巷壁海报 + 灯下的地面 */
    b.box('cyCream', 0.02, 0.62, 0.44, -4.20, 1.62, z1 - 0.06, 0, 0, 0.03);
    b.box('cyNoren2', 0.02, 0.44, 0.34, -5.40, 1.40, z1 - 0.06, 0, 0, -0.04);
    b.box('cyNeonM', 0.02, 0.03, 0.40, -4.20, 1.96, z1 - 0.07);

    /* 巷口不放贩卖机：巷宽只有 1.85，机器会正好挡住鸟居 */
    b.build(g);
    return g;
  }

  /* ---------- 街道道具：电线杆 / 电缆 / 车 / 自行车 ---------- */
  function buildCyStreet() {
    const g = new T.Group();
    const b = new Builder();

    /* 电线杆：杆 + 双横担 + 变压器 + 路灯挑臂 */
    function pole(px, pz, h, armDir) {
      b.cyl('cyConcrete', 0.10, 0.14, h, 8, px, h / 2, pz);
      b.box('cyConcrete', 0.30, 0.36, 0.30, px, 0.18, pz);
      b.box('cyMetalD', 1.30, 0.07, 0.10, px, h - 0.55, pz);
      b.box('cyMetalD', 1.05, 0.07, 0.10, px, h - 0.95, pz);
      for (let i = 0; i < 4; i++) {
        const ox = -0.58 + i * 0.39;
        b.cyl('cyPorc', 0.035, 0.045, 0.12, 6, px + ox, h - 0.46, pz);
        b.cyl('cyPorc', 0.030, 0.040, 0.11, 6, px + ox, h - 0.86, pz);
      }
      b.cyl('cyMetal', 0.20, 0.20, 0.62, 10, px + 0.22, h - 1.62, pz);
      b.cyl('cyMetalD', 0.22, 0.22, 0.06, 10, px + 0.22, h - 1.28, pz);
      if (armDir) {
        const dx = armDir * 0.62;
        b.box('cyMetalD', Math.abs(dx) + 0.10, 0.06, 0.06, px + dx / 2, h - 1.90, pz);
        b.box('cyLampHead', 0.34, 0.12, 0.20, px + dx, h - 1.98, pz);
        b.box('cyLampGlow', 0.28, 0.03, 0.16, px + dx, h - 2.05, pz);
      }
    }
    pole(-0.52, -3.08, 8.62, 1);
    pole(5.42, -5.70, 8.20, -1);
    pole(-0.56, -6.40, 7.60, 1);

    /* 电缆：折两段做垂弧（半径 0.022，细于此会被描边吃掉） */
    function wire(x0, y0, z0, x1, y1, z1, sag) {
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const my = (y0 + y1) / 2 - sag;
      b.to('cyCable', 0.022, x0, y0, z0, mx, my, mz, 4);
      b.to('cyCable', 0.022, mx, my, mz, x1, y1, z1, 4);
    }
    wire(-0.52, 8.28, -3.08, 5.42, 7.90, -5.70, 1.15);
    wire(-0.52, 7.92, -3.08, 5.42, 7.54, -5.70, 1.38);
    wire(-0.52, 8.28, -3.08, -0.56, 7.30, -6.40, 1.00);
    wire(-0.52, 7.92, -3.08, -0.56, 6.94, -6.40, 1.20);

    /* 自行车（靠拉面屋） */
    (function () {
      const bx = -0.92, bz = -3.55;
      [bz - 0.48, bz + 0.48].forEach(function (z) {
        b.torus('cyTire', 0.22, 0.035, bx, 0.38, z, 0, Math.PI / 2, 0);
        b.cyl('cyMetalD', 0.03, 0.03, 0.10, 8, bx, 0.38, z, 0, 0, Math.PI / 2);
      });
      b.to('cyMetal', 0.024, bx, 0.38, bz - 0.48, bx, 0.72, bz - 0.05, 4);
      b.to('cyMetal', 0.024, bx, 0.72, bz - 0.05, bx, 0.38, bz + 0.16, 4);
      b.to('cyMetal', 0.024, bx, 0.38, bz + 0.48, bx, 0.72, bz + 0.30, 4);
      b.to('cyMetal', 0.024, bx, 0.72, bz + 0.30, bx, 0.74, bz - 0.05, 4);
      b.box('cyMetalD', 0.06, 0.05, 0.28, bx, 0.84, bz - 0.02);
      b.box('cyNoren', 0.10, 0.05, 0.20, bx, 0.90, bz + 0.26);
      b.box('cyMetal', 0.34, 0.03, 0.03, bx, 0.94, bz - 0.36);
      b.box('cyMetalD', 0.22, 0.26, 0.30, bx, 0.63, bz + 0.52);
    })();

    /* 轻卡（街对面，压在画面右缘） */
    (function () {
      const cx = 4.42, cz = -2.05;
      b.box('cyBody', 1.52, 0.52, 2.90, cx, 0.72, cz);
      b.box('cyBody', 1.46, 0.46, 1.06, cx, 1.18, cz - 0.86);
      b.box('cyGlassD', 1.34, 0.38, 0.07, cx, 1.24, cz - 1.36);
      b.box('cyGlassD', 0.07, 0.34, 0.70, cx + 0.74, 1.24, cz - 0.86);
      b.box('cyGlassD', 0.07, 0.34, 0.70, cx - 0.74, 1.24, cz - 0.86);
      b.box('cyBody2', 1.50, 0.14, 1.70, cx, 1.00, cz + 0.56);
      b.box('cyMetalD', 1.44, 0.06, 1.60, cx, 0.90, cz + 0.56);
      b.box('cyCrate', 0.60, 0.42, 0.60, cx - 0.30, 1.24, cz + 0.60);
      b.box('cyCrate2', 0.52, 0.36, 0.52, cx + 0.34, 1.21, cz + 0.44);
      b.box('cyLampGlow', 0.30, 0.10, 0.06, cx + 0.62, 0.86, cz - 1.42);
      b.box('cyLampGlow', 0.30, 0.10, 0.06, cx - 0.62, 0.86, cz - 1.42);
      /* 尾灯（朝 -z，也就是画面左侧），给车一个能读出来的剪影 */
      b.box('cyTail', 0.26, 0.14, 0.05, cx + 0.62, 0.74, cz + 1.46);
      b.box('cyTail', 0.26, 0.14, 0.05, cx - 0.62, 0.74, cz + 1.46);
      b.box('cyLampGlow', 0.10, 0.10, 0.04, cx + 0.62, 0.44, cz + 1.46);
      b.box('cyLampGlow', 0.10, 0.10, 0.04, cx - 0.62, 0.44, cz + 1.46);
      /* 驾驶室里的仪表微光 */
      b.box('cyLampGlow', 0.40, 0.10, 0.03, cx, 1.10, cz - 1.30);
      [[-0.72, -0.94], [0.72, -0.94], [-0.72, 0.94], [0.72, 0.94]].forEach(function (q) {
        b.torus('cyTire', 0.24, 0.075, cx + q[0], 0.28, cz + q[1], 0, Math.PI / 2, 0);
        b.cyl('cyMetalD', 0.10, 0.10, 0.14, 8, cx + q[0], 0.28, cz + q[1], 0, 0, Math.PI / 2);
      });
    })();

    /* 施工围栏 + 路锥 + 水马（近侧路口，起地面锚点作用） */
    [5.55, 6.05].forEach(function (z, i) {
      b.box('cyCone', 0.28, 0.06, 0.28, 4.90, 0.06, z);
      b.cyl('cyCone', 0.055, 0.16, 0.62, 8, 4.90, 0.36, z);
      b.cyl('cyConeW', 0.085, 0.115, 0.12, 8, 4.90, 0.30, z);
    });
    b.box('cyMetalD', 0.10, 0.90, 0.10, 4.90, 0.45, 6.55);
    b.box('cyMetalD', 0.10, 0.90, 0.10, 4.90, 0.45, 7.55);
    b.box('cyConeW', 0.06, 0.16, 1.10, 4.90, 0.82, 7.05);
    b.box('cyConeW', 0.06, 0.16, 1.10, 4.90, 0.52, 7.05);

    /* 门口的垃圾袋堆 + 立式烟灰缸 */
    [[-0.72, 1.62, 0.30], [-0.86, 1.86, 0.26], [-0.66, 1.44, 0.22]].forEach(function (q) {
      b.sph('cyTrash', q[2], q[0], CY_GY + q[2] * 0.82, q[1], 1, 0.82, 1);
      b.cyl('cyTrash', q[2] * 0.5, q[2] * 0.62, 0.05, 8, q[0], CY_GY + q[2] * 1.62, q[1]);
    });
    b.cyl('cyMetalD', 0.11, 0.13, 0.78, 8, -0.92, CY_GY + 0.39, 0.42);
    b.cyl('cyMetal', 0.14, 0.14, 0.06, 8, -0.92, CY_GY + 0.79, 0.42);

    /* 自动售货机（拉面屋前 + 路口） */

    /* 护栏（对侧人行道，分段留口） */
    [[-6.80, -2.20], [0.60, 3.40]].forEach(function (q) {
      for (let z = q[0]; z <= q[1]; z += 1.10) {
        b.cyl('cyMetalD', 0.045, 0.045, 0.90, 6, 4.92, 0.16 + 0.45, z);
      }
      b.box('cyMetalD', 0.06, 0.06, q[1] - q[0] + 0.10, 4.92, 0.16 + 0.84, (q[0] + q[1]) / 2);
      b.box('cyMetalD', 0.05, 0.05, q[1] - q[0] + 0.10, 4.92, 0.16 + 0.46, (q[0] + q[1]) / 2);
    });

    /* 地面：积水 + 霓虹倒影 */
    cyPuddle(1.05, -1.30, 1.05, 0.52, 0.4);
    cyPuddle(3.55, 4.55, 0.86, 0.44, -0.3);
    cyPuddle(1.90, 6.10, 0.62, 0.40, 0.9);
    cyPuddle(-0.62, 2.60, 0.55, 0.34, 0.2);
    /* 霓虹倒影：湿沥青是这一形制的第二块画布。
       做法是「顺着相机方位拉一条长条」，不是往地上拍一个圆斑——
       圆斑看起来像路灯的光池，长条才像湿地面上的倒影。 */
    function cyStreak(zS, color, op, wid, len) {
      len = len || 4.8;
      const t = 0.62, L = len * 0.5;
      cyWet(-1.46 + Math.cos(t) * L, zS + Math.sin(t) * L,
        wid || 0.92, len, color, op, Math.atan2(-Math.cos(t), -Math.sin(t)));
    }
    cyStreak(-4.86, 0xffa64d, 0.34, 1.10, 4.2);
    cyStreak(-3.52, 0xff3d8f, 0.40, 0.95, 5.2);
    cyStreak(-1.55, 0x35e0ff, 0.34, 0.85, 5.4);
    cyStreak(-1.02, 0xff3d8f, 0.30, 0.75, 5.0);
    cyStreak(-0.32, 0xff3d8f, 0.26, 0.70, 4.4);
    cyStreak(0.62, 0x8f7bff, 0.30, 0.80, 4.8);
    cyStreak(2.30, 0xfff0d0, 0.26, 0.95, 4.2);
    cyStreak(3.34, 0xffa62e, 0.40, 1.00, 5.2);
    cyStreak(3.86, 0xfff1d2, 0.34, 1.10, 4.4);
    cyStreak(6.15, 0xffb347, 0.40, 1.00, 4.6);
    /* 一整层极淡的冷光，把路面从死黑里抬起来 */
    cyWet(2.30, 1.20, 7.20, 9.60, 0x3f4a8f, 0.10);
    cyWet(0.10, -3.08, 2.00, 2.00, 0xffc46a, 0.26);

    b.build(g);
    cyVend(g, -1.14, -3.02, 0);
    /* 对侧人行道不再放整台贩卖机：它背面朝相机，渲染出来是一个 1.8 米高的黑箱子 */
    b.box('cyCrate', 0.52, 0.44, 0.62, 5.02, 0.16 + 0.22, 4.90);
    b.box('cyCrate2', 0.46, 0.36, 0.54, 5.04, 0.16 + 0.60, 4.88);
    b.box('cyCrateD', 0.56, 0.06, 0.66, 5.02, 0.16 + 0.45, 4.90);
    /* 这里原本想再加一台贩卖机压右下角，但它落在画框下沿、永远只露半截，
       删掉。右下角交给湿沥青上的倒影就够。 */
    return g;
  }

  /* ---------- 屋顶霓虹广告牌 ---------- */
  function cyBBTex() {
    return canvasTex(1024, 512, function (c, w, h) {
      const bg = c.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#1a0b22'); bg.addColorStop(0.55, '#241033'); bg.addColorStop(1, '#0b1622');
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      /* 扫描线 */
      c.fillStyle = 'rgba(120,220,255,0.06)';
      for (let y = 0; y < h; y += 6) c.fillRect(0, y, w, 2);
      /* 大圆（落日）+ 环 */
      const cx = w * 0.28, cy = h * 0.52;
      const rg = c.createRadialGradient(cx, cy, 10, cx, cy, 190);
      rg.addColorStop(0, 'rgba(255,90,180,0.95)');
      rg.addColorStop(0.55, 'rgba(255,60,140,0.55)');
      rg.addColorStop(1, 'rgba(255,60,140,0)');
      c.fillStyle = rg;
      c.beginPath(); c.arc(cx, cy, 190, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(120,235,255,0.85)';
      c.lineWidth = 4;
      c.beginPath(); c.arc(cx, cy, 148, 0, Math.PI * 2); c.stroke();
      c.lineWidth = 2;
      c.beginPath(); c.arc(cx, cy, 116, 0, Math.PI * 2); c.stroke();
      /* 横向光束 */
      for (let i = 0; i < 7; i++) {
        c.fillStyle = i % 2 ? 'rgba(120,235,255,0.10)' : 'rgba(255,80,170,0.10)';
        c.fillRect(cx - 230, cy - 60 + i * 18, 460, 7);
      }
      /* 文字 */
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '900 128px "Yu Gothic","Meiryo","MS Gothic",sans-serif';
      c.shadowColor = '#ff3d8f'; c.shadowBlur = 34;
      c.fillStyle = '#ff8ec4';
      c.fillText('電脳', w * 0.63, h * 0.42);
      c.shadowBlur = 10; c.fillStyle = '#ffffff';
      c.fillText('電脳', w * 0.63, h * 0.42);
      c.shadowBlur = 0;
      c.font = '700 44px "Consolas",monospace';
      c.fillStyle = 'rgba(120,235,255,0.92)';
      c.fillText('NEON ALLEY 2099', w * 0.63, h * 0.70);
      c.font = '500 26px "Consolas",monospace';
      c.fillStyle = 'rgba(255,255,255,0.40)';
      c.fillText('24H  OPEN', w * 0.63, h * 0.83);
      /* 边框 */
      c.strokeStyle = 'rgba(120,235,255,0.55)';
      c.lineWidth = 6;
      c.strokeRect(10, 10, w - 20, h - 20);
    });
  }

  function buildCyBoard() {
    const g = new T.Group();
    const b = new Builder();
    const by = 8.42, bz = -3.40, bw = 3.60, bh = 1.92, bx = -3.05;

    /* 支架 */
    [bz - bw / 2 + 0.20, bz + bw / 2 - 0.20].forEach(function (z) {
      b.cyl('cyMetalD', 0.075, 0.075, 2.30, 6, bx - 0.30, CY_B.top + 1.05, z);
      b.box('cyMetalD', 0.10, 0.10, 1.00, bx - 0.30, CY_B.top + 0.60, z, 0, 0, 0.55);
      b.box('cyMetalD', 0.10, 0.10, 1.00, bx - 0.30, CY_B.top + 1.65, z, 0, 0, -0.55);
    });
    b.box('cyMetalD', 0.12, 0.12, bw + 0.20, bx - 0.30, by + bh / 2 + 0.05, bz);
    b.box('cyMetalD', 0.12, 0.12, bw + 0.20, bx - 0.30, by - bh / 2 - 0.05, bz);
    /* 板体 + 边框 */
    b.box('cySignBox', 0.12, bh + 0.14, bw + 0.14, bx, by, bz);
    b.box('cyMetalD', 0.18, 0.07, bw + 0.22, bx, by + bh / 2 + 0.09, bz);
    b.box('cyMetalD', 0.18, 0.07, bw + 0.22, bx, by - bh / 2 - 0.09, bz);

    b.build(g);

    const m = new T.Mesh(new T.PlaneGeometry(bw, bh), new T.MeshBasicMaterial({
      map: cyBBTex(), toneMapped: false
    }));
    m.position.set(bx + 0.075, by, bz);
    m.rotation.y = Math.PI / 2;
    m.renderOrder = 3;
    g.add(m);

    const s = new T.Sprite(new T.SpriteMaterial({
      map: CY_GLOW, color: new T.Color(0xff4d9e), transparent: true,
      opacity: 0.16, blending: T.AdditiveBlending, depthWrite: false
    }));
    s.position.set(bx + 0.20, by, bz);
    s.scale.set(6.2, 4.4, 1);
    g.add(s);
    return g;
  }
  /* ================= 赛博朋克 · 日本城市（city） =================
     cyber 是「一条街」，city 是「一座城」。坐标同 cyber：
     +x 朝画面右前，+z 朝画面左前，相机从 +x / +z 俯看进来。
     六块街区按「后排高、前排低」的梯度排布，中间的塔群做天际线，
     前景压到 6~10 米，视线才能越过前排看到街谷。
  */
  const CTY = !!PS.city;

  const CT_PL = { x0: -30, x1: 34, z0: -32, z1: 28 };   // 展台范围
  const CT_GY = 0.16;                                   // 人行道标高
  const CT_AVE = [4.0, 15.5];                           // 主街（沿 z）
  const CT_ARC = [5.5, 10.0];                           // 商店街（沿 x，带顶棚）
  const CT_ALZ = [-9.0, -5.5];                          // 横巷（沿 x）
  const CT_SID = [-14.5, -11.5];                        // 侧巷（沿 z）

  const CT_B = {
    A: { x0: -29.0, x1: -14.5, z0: -27.5, z1: -9.0 },   // 塔楼群
    B: { x0: -11.5, x1: 4.0, z0: -27.5, z1: -9.0 },     // 巨构商厦
    C: { x0: 15.5, x1: 33.0, z0: -27.5, z1: -5.5 },     // 霓虹商厦
    D: { x0: -29.0, x1: -11.5, z0: -5.5, z1: 5.5 },     // 市场街区
    E: { x0: -29.0, x1: 4.0, z0: 10.0, z1: 27.5 },      // 南市集
    F: { x0: 15.5, x1: 33.0, z0: -5.5, z1: 27.5 }       // 东南商街
  };
  const CT_SKY = { z0: -32.0, z1: -28.0 };              // 远景塔群

  /* 动态件（全息广告缓慢旋转 / 霓虹闪烁） */
  const CT_ANIM = [];
  /* 体块登记：招牌系统要按「哪面朝相机」自动挂霓虹 */
  const CT_BM = [];

  /* ---------- 窗格贴图 ----------
     加色混合下黑色＝不贡献，所以只画「亮的窗」，
     墙体的暗色交给背后那个 box 自己撑。 */
  const CT_TEX = {};

  function ctRnd(seed) {
    let s = (seed * 2654435761) % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  }

  function ctWinTex(cols, rows, seed, style, dens) {
    cols = Math.max(2, Math.min(64, cols | 0));
    rows = Math.max(2, Math.min(110, rows | 0));
    dens = dens === undefined ? 0.44 : dens;
    const id = 'w' + cols + '_' + rows + '_' + seed + '_' + style + '_' + dens;
    if (CT_TEX[id]) return CT_TEX[id];

    const t = canvasTex(512, 1024, function (c, w, h) {
      c.clearRect(0, 0, w, h);
      const cw = w / cols, chh = h / rows;
      const rnd = ctRnd(seed * 977 + 13);

      /* 极淡的窗格底：只为了给墙面一点「格」的秩序，压到几乎看不见 */
      c.fillStyle = 'rgba(96,120,175,0.026)';
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < cols; i++) {
          c.fillRect(i * cw + cw * 0.17, r * chh + chh * 0.26, cw * 0.66, chh * 0.46);
        }
      }

      /* 暖色压低亮度、提高饱和度：紫蓝基调里唯一能拉出对比的就是钠灯橙。
         原来的暖色偏白，混在冷窗里根本分不出来，整座城就成了一片紫。 */
      const WARM = [[255, 168, 70], [255, 196, 96], [255, 218, 150], [246, 138, 48]];
      const COOL = [[176, 214, 255], [126, 232, 240], [208, 224, 255], [104, 170, 216]];
      const PINK = [[255, 122, 186], [196, 112, 255], [255, 96, 138]];

      for (let r = 0; r < rows; r++) {
        /* ★ 远景城市最先读到的信息是「哪几层亮着」，不是单扇窗。
           先给整层定一个亮度档，再在层内撒窗。 */
        const fr = rnd();
        let lf, pd;
        if (fr < 0.20) { lf = 0.20; pd = dens * 0.34; }      // 熄灯层
        else if (fr < 0.54) { lf = 0.58; pd = dens * 0.80; }  // 半亮
        else if (fr < 0.87) { lf = 0.95; pd = dens; }
        else { lf = 1.25; pd = dens + 0.42; }                 // 整层加班

        for (let i = 0; i < cols; i++) {
          if (rnd() > pd) continue;
          const pk = rnd();
          let col;
          if (style === 1) col = pk < 0.96 ? WARM[(rnd() * 4) | 0] : COOL[(rnd() * 4) | 0];
          else if (style === 0) col = pk < 0.78 ? WARM[(rnd() * 4) | 0]
            : (pk < 0.93 ? COOL[(rnd() * 4) | 0] : PINK[(rnd() * 3) | 0]);
          else col = pk < 0.74 ? WARM[(rnd() * 4) | 0]
            : (pk < 0.93 ? COOL[(rnd() * 4) | 0] : PINK[(rnd() * 3) | 0]);

          const k = Math.min(0.95, (0.30 + rnd() * 0.62) * lf).toFixed(2);
          c.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + k + ')';
          c.fillRect(i * cw + cw * 0.18, r * chh + chh * 0.28, cw * 0.64, chh * 0.44);
        }
      }

      /* ★ 窗框：横向楼板压线 + 竖向竖梃。没有这两笔，一格格发光方块
         只是贴在墙上的色片；有了框，才读成「凹进墙里的窗」。
         成本为零（同一张 canvas 多画几十笔），收益比换分辨率大得多。 */
      c.fillStyle = 'rgba(8,10,20,0.44)';
      for (let r = 0; r <= rows; r++) c.fillRect(0, r * chh - chh * 0.058, w, chh * 0.116);
      c.fillStyle = 'rgba(8,10,20,0.28)';
      for (let i = 0; i <= cols; i++) c.fillRect(i * cw - cw * 0.046, 0, cw * 0.092, h);

      /* 竖向光带：电梯井 / 楼梯间，给高楼一根「骨」 */
      const bands = 1 + ((rnd() * 2) | 0);
      for (let i = 0; i < bands; i++) {
        const bx = (0.10 + rnd() * 0.74) * w;
        const bw = w * (0.012 + rnd() * 0.018);
        const g2 = c.createLinearGradient(0, 0, 0, h);
        g2.addColorStop(0, 'rgba(255,232,186,0)');
        g2.addColorStop(0.28, 'rgba(255,224,168,0.16)');
        g2.addColorStop(0.76, 'rgba(255,210,148,0.08)');
        g2.addColorStop(1, 'rgba(255,232,186,0)');
        c.fillStyle = g2;
        c.fillRect(bx, 0, bw, h);
      }
    });
    CT_TEX[id] = t;
    return t;
  }

  /* ---------- 贴面 / 光晕 / 霓虹字 ---------- */
  function ctPlane(tex, w, h, x, y, z, ry, op, ord) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({
      map: tex, transparent: true, blending: T.AdditiveBlending,
      depthWrite: false, fog: false,
      opacity: op === undefined ? 1 : op
    }));
    m.position.set(x, y, z);
    m.rotation.y = ry || 0;
    m.renderOrder = ord || 3;
    scene.add(m);
    return m;
  }

  function ctGlow(x, y, z, color, size, op) {
    const s = new T.Sprite(new T.SpriteMaterial({
      map: CY_GLOW, color: new T.Color(color), transparent: true,
      opacity: op === undefined ? 0.3 : op,
      blending: T.AdditiveBlending, depthWrite: false, fog: false
    }));
    s.position.set(x, y, z);
    s.scale.set(size, size, 1);
    s.renderOrder = 4;
    scene.add(s);
    return s;
  }

  /* 霓虹字：纹理分辨率跟着牌面比例走，字永远不被拉扁 */
  function ctSign(text, colorHex, x, y, z, pw, ph, ry, vertical, op) {
    const col = '#' + ('000000' + colorHex.toString(16)).slice(-6);
    const n = Math.max(1, text.length);
    const W = 256;
    const H = Math.max(64, Math.min(1536, Math.round(W * ph / pw)));
    const tex = canvasTex(W, H, function (c, w, h) {
      c.clearRect(0, 0, w, h);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      let fs, stepY, stepX;
      if (vertical) {
        stepY = h / n;
        fs = Math.min(w * 0.84, stepY * 0.82);
      } else {
        stepX = w / n;
        fs = Math.min(h * 0.80, stepX * 0.92);
      }
      c.font = '900 ' + Math.round(fs) + 'px "Yu Gothic","Meiryo","MS Gothic","Noto Sans JP",sans-serif';
      c.shadowColor = col;
      c.shadowBlur = 26;
      c.fillStyle = col;
      for (let i = 0; i < n; i++) {
        c.fillText(text[i], vertical ? w / 2 : stepX * (i + 0.5), vertical ? stepY * (i + 0.5) : h / 2);
      }
      c.shadowBlur = 6;
      c.fillStyle = 'rgba(255,255,255,0.92)';
      for (let i = 0; i < n; i++) {
        c.fillText(text[i], vertical ? w / 2 : stepX * (i + 0.5), vertical ? stepY * (i + 0.5) : h / 2);
      }
    });
    const m = new T.Mesh(new T.PlaneGeometry(pw, ph), new T.MeshBasicMaterial({
      map: tex, transparent: true, blending: T.AdditiveBlending,
      depthWrite: false, fog: false, side: T.DoubleSide,
      opacity: op === undefined ? 1 : op
    }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.renderOrder = 6;
    scene.add(m);
    return m;
  }

  /* 霓虹灯管（细长条自带光晕，夜景里最省的一招）
     ry 要跟着桥轴走，否则斜桥底下的灯带是正的、桥是斜的 */
  function ctNeonBar(x, y, z, w, h, d, color, op, ry) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshBasicMaterial({
      color: new T.Color(color), transparent: true, opacity: op === undefined ? 0.9 : op,
      blending: T.AdditiveBlending, depthWrite: false, fog: false
    }));
    m.position.set(x, y, z);
    m.rotation.y = ry || 0;
    m.renderOrder = 5;
    scene.add(m);
    return m;
  }

  /* ---------- 店面橱窗 ----------
     原来店面是一块纯色发光板，远了看就是一张白纸。
     这里用画布补上室内暖光、货架、竖梃和门洞，一眼能认出「这是店铺」。 */
  const CT_SHOP = {};
  function ctShopTex(seed, kind) {
    const id = 's' + seed + '_' + kind;
    if (CT_SHOP[id]) return CT_SHOP[id];
    const t = canvasTex(512, 256, function (c, w, h) {
      const rnd = ctRnd(seed * 613 + 31);
      const bg = c.createLinearGradient(0, 0, 0, h);
      if (kind === 1) {
        bg.addColorStop(0, '#233642'); bg.addColorStop(0.5, '#6fa6b8');
        bg.addColorStop(1, '#2c4048');
      } else if (kind === 2) {
        bg.addColorStop(0, '#3a1c30'); bg.addColorStop(0.5, '#9c5074');
        bg.addColorStop(1, '#4a2438');
      } else {
        bg.addColorStop(0, '#402c14'); bg.addColorStop(0.5, '#a87a3a');
        bg.addColorStop(1, '#5a3d1e');
      }
      c.fillStyle = bg; c.fillRect(0, 0, w, h);

      /* 顶部灯槽 */
      c.fillStyle = 'rgba(255,248,226,0.85)';
      c.fillRect(0, 0, w, h * 0.055);
      c.fillStyle = 'rgba(255,236,196,0.22)';
      c.fillRect(0, h * 0.055, w, h * 0.05);

      /* 货架：三层横板 + 一排排小色块 */
      for (let r = 0; r < 3; r++) {
        const y = h * (0.34 + r * 0.19);
        c.fillStyle = 'rgba(24,18,12,0.55)';
        c.fillRect(w * 0.05, y, w * 0.90, 4);
        for (let i = 0; i < 11; i++) {
          if (rnd() < 0.22) continue;
          const bw = w * (0.030 + rnd() * 0.022);
          const bh = h * (0.055 + rnd() * 0.055);
          const pal = [[255, 214, 150], [230, 120, 90], [140, 210, 220], [230, 230, 210], [220, 160, 220]];
          const q = pal[(rnd() * pal.length) | 0];
          c.fillStyle = 'rgba(' + q[0] + ',' + q[1] + ',' + q[2] + ',' + (0.55 + rnd() * 0.4).toFixed(2) + ')';
          c.fillRect(w * 0.06 + i * w * 0.081, y - bh, bw, bh);
        }
      }

      /* 柜台 / 踢脚 */
      c.fillStyle = 'rgba(18,13,9,0.72)';
      c.fillRect(0, h * 0.90, w, h * 0.10);

      /* 竖梃：把大玻璃分成几格 */
      const n = 3 + ((rnd() * 2) | 0);
      c.fillStyle = 'rgba(14,11,8,0.88)';
      for (let i = 1; i < n; i++) c.fillRect(w * i / n - 3, 0, 6, h);

      /* 门洞：右下角一块更暗的竖条 */
      if (rnd() < 0.55) {
        c.fillStyle = 'rgba(10,8,6,0.80)';
        c.fillRect(w * 0.70, h * 0.16, w * 0.22, h * 0.74);
      }
      c.strokeStyle = 'rgba(10,8,6,0.9)';
      c.lineWidth = 8;
      c.strokeRect(4, 4, w - 8, h - 8);
    });
    CT_SHOP[id] = t;
    return t;
  }

  function ctShopFront(pw, ph, x, y, z, ry, seed, kind, op) {
    const m = new T.Mesh(new T.PlaneGeometry(pw, ph), new T.MeshBasicMaterial({
      map: ctShopTex(seed, kind || 0), transparent: true,
      blending: T.AdditiveBlending, depthWrite: false, fog: false,
      opacity: op === undefined ? 0.95 : op
    }));
    m.position.set(x, y, z);
    m.rotation.y = ry || 0;
    m.renderOrder = 3;
    scene.add(m);
    return m;
  }

  /* 局部坐标放置：轴为 +z，用于摊位 / 车 / 桥 */
  function ctBox(b, k, w, h, d, lx, ly, lz, cx, y0, cz, ry) {
    const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
    return b.box(k, w, h, d, cx + lx * c + lz * s, y0 + ly, cz - lx * s + lz * c, 0, ry || 0, 0);
  }

  /* ---------- 高层体块 ---------- */
  function ctFacadeOn(x, z, w, d, y0, h, seed, style, dens, op) {
    op = op === undefined ? 1 : op;
    const bw = 0.50, fl = 0.62;
    const cF = Math.max(2, Math.round(w / bw));
    const cS = Math.max(2, Math.round(d / bw));
    const rw = Math.max(2, Math.round(h / fl));
    const tF = ctWinTex(cF, rw, seed, style, dens);
    const tS = ctWinTex(cS, rw, seed + 7, style, dens);
    const e = 0.05;
    ctPlane(tF, w - 0.18, h - 0.18, x, y0 + h / 2, z + d / 2 + e, 0, op);
    ctPlane(tF, w - 0.18, h - 0.18, x, y0 + h / 2, z - d / 2 - e, Math.PI, op * 0.50);
    ctPlane(tS, d - 0.18, h - 0.18, x + w / 2 + e, y0 + h / 2, z, Math.PI / 2, op);
    ctPlane(tS, d - 0.18, h - 0.18, x - w / 2 - e, y0 + h / 2, z, -Math.PI / 2, op * 0.50);
  }

  function ctTower(b, o) {
    const key = o.key || 'ctT1';
    let y = o.y0 || 0;
    const segs = o.segs || [{ h: o.h }];
    let w = o.w, d = o.d;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const sw = w * (s.w || 1), sd = d * (s.d || 1);
      const sh = s.h;
      b.box(s.key || key, sw, sh, sd, o.x, y + sh / 2, o.z);
      /* 屋顶板：楼体是暗的，屋顶再不铺一层浅灰，俯视角下每个屋顶
         都是一个黑洞 —— 而屋顶恰恰是这张图里面积最大的东西。 */
      b.box('ctWalk', sw - 0.10, 0.05, sd - 0.10, o.x, y + sh + 0.015, o.z);
      if (sw > 3.2 && sd > 3.2 && sh > 4) {
        ctRoofSkin(b, o.x, o.z, sw, sd, y + sh, (o.seed || 3) + i * 7);
      }
      /* 腰线：每段顶上一圈压边，退台才读得出来 */
      b.box('ctSteelD', sw + 0.14, 0.20, sd + 0.14, o.x, y + sh - 0.05, o.z);
      ctFacadeOn(o.x, o.z, sw, sd, y, sh - 0.20, (o.seed || 3) + i * 11,
        o.style || 0, o.dens || 0.44, o.op);
      /* ★ 檐口霓虹：俯视时唯一能读出建筑体量的东西。
         没有这道线，所有楼在画面上就是一个连成一片的暗块。
         但只有够高的楼才配全亮霓虹 —— 矮楼一律用暗边，
         否则满城等宽的亮线会把画面拉成「一堆线框盒子」。 */
      if (o.rim !== false) {
        const hot = (y + sh) > 13.5;
        const rk = o.rimKey || (hot
          ? (((i + (o.seed || 0)) % 3 === 0) ? 'ctNeonM' : 'ctNeonC')
          : (((i + (o.seed || 0)) % 3 === 0) ? 'ctNeonMd' : 'ctNeonCd'));
        ctRim(b, o.x, o.z, sw, sd, y + sh + 0.06, rk, hot ? 0.13 : 0.10);
      }
      y += sh;
      w = sw; d = sd;
    }
    if (o.reg !== false) CT_BM.push({ x: o.x, z: o.z, w: o.w, d: o.d, y0: o.y0 || 0, top: y });
    /* 屋顶陈设：只做看得见屋顶的那一层（< 26 米），
       塔顶已经在云端了，再撒水箱只是白饶面数 */
    if (o.dress !== false && o.reg !== false && y < 26 && w * d > 9) {
      ctRoofDress(b, o.x, o.z, w * 0.78, d * 0.78, y, (o.seed || 3) + 3, y);
    }
    /* 塔冠：方盒本体不用动，只把收头换掉，天际线的识别度就变了 */
    if (o.crown) ctCrown(b, o.x, o.z, w, d, y, o.crown, o.seed || 3);
    return { top: y, w: w, d: d };
  }

  /* ================================================================
     造型塔原型
     ctTower 只会画「方盒 + 等比例退台」，全城都用同一套就变成一排
     方形立柱。下面每个函数是一种独立的建筑原型：各自负责体块、窗、
     檐口和塔冠，最后统一交给 Builder 按材质合批。
     共同约定：o = { x, z, w, d, h, y0, seed, ... }，返回 {top,w,d}。
     ================================================================ */

  /* 环形窗带：圆柱 / 棱柱没有平立面可以贴 ctFacadeOn，
     改成每隔 step 米一圈薄发光环。每 4 圈压一道粗腰带，
     塔身才有「楼层」的节奏，而不是一整根灯管。 */
  function ctRingBands(b, x, z, r, y0, h, seg, rot, seed, step) {
    step = step || 2.7;
    const n = Math.max(1, Math.floor(h / step));
    for (let i = 1; i <= n; i++) {
      const yy = y0 + (h * i) / (n + 1);
      const fat = (i % 4 === 0);
      const k = fat ? 'ctSteelD'
        : (((i + (seed || 0)) % 5 < 2) ? 'ctBandA' : 'ctBandW');
      b.cyl(k, r + 0.035, r + 0.035, fat ? 0.20 : 0.11, seg,
        x, yy, z, 0, rot || 0, 0);
    }
  }

  /* 棱柱竖棱：八棱 / 六棱塔不加这几条线，俯视下就只是一个圆 */
  function ctRibs(b, x, z, r, y0, h, seg, rot, key) {
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2 + (rot || 0);
      b.box(key || 'ctSteel', 0.13, h, 0.13,
        x + Math.cos(a) * r, y0 + h / 2, z + Math.sin(a) * r, 0, -a, 0);
    }
  }

  /* 四角巨柱，骨架塔 / 架空层用 */
  function ctCornerCols(b, x, z, w, d, y0, h, key, t) {
    t = t || 0.52;
    [-1, 1].forEach(function (sx) {
      [-1, 1].forEach(function (sz) {
        b.box(key || 'ctSteel', t, h, t,
          x + sx * (w / 2 - t / 2), y0 + h / 2, z + sz * (d / 2 - t / 2));
      });
    });
  }

  /* 塔冠分发：给保留下来的方盒塔换顶。
     金字塔 / 圆冠 / 飞碟 / 刀片 / 立环 / 针尖 / 开敞框架 / 错层收头。 */
  function ctCrown(b, x, z, w, d, y, kind, seed) {
    const s = Math.min(w, d);
    const rnd = ctRnd((seed || 5) * 977 + 31);
    if (kind === 'pyramid') {
      const ph = s * 0.46;
      b.cyl('ctCrown', 0.02, s * 0.60, ph, 4, x, y + ph / 2, z, 0, Math.PI / 4, 0);
      ctRim(b, x, z, w, d, y + 0.06, 'ctNeonM', 0.12);
      b.cyl('ctSteelD', 0.05, 0.09, 1.5, 5, x, y + ph + 0.75, z);
      b.box('ctTail', 0.14, 0.14, 0.14, x, y + ph + 1.55, z);
    } else if (kind === 'dome') {
      b.cyl('ctSteelD', s * 0.44, s * 0.44, 0.30, 14, x, y + 0.15, z);
      b.sph('ctCrown', s * 0.42, x, y + 0.30, z, 1, 0.62, 1);
      b.torus('ctNeonC', s * 0.42, 0.07, x, y + 0.32, z, Math.PI / 2, 0, 0);
      b.cyl('ctSteelD', 0.04, 0.06, 1.2, 5, x, y + s * 0.62 + 0.6, z);
    } else if (kind === 'disc') {
      b.cyl('ctCrown', s * 0.72, s * 0.72, 0.36, 16, x, y + 0.60, z);
      b.cyl('ctGlassB', s * 0.62, s * 0.62, 1.25, 16, x, y + 1.40, z);
      b.cyl('ctCrown', s * 0.68, s * 0.68, 0.30, 16, x, y + 2.18, z);
      b.torus('ctNeonM', s * 0.72, 0.07, x, y + 0.60, z, Math.PI / 2, 0, 0);
      b.torus('ctNeonC', s * 0.68, 0.06, x, y + 2.34, z, Math.PI / 2, 0, 0);
    } else if (kind === 'blade') {
      [-1, 1].forEach(function (sgn) {
        b.box('ctFin', 0.20, s * 0.86, s * 0.44,
          x + sgn * s * 0.20, y + s * 0.43, z, 0, 0, sgn * 0.26);
        b.box('ctNeonC', 0.06, s * 0.86, 0.07,
          x + sgn * (s * 0.20 + s * 0.20), y + s * 0.43, z + s * 0.22,
          0, 0, sgn * 0.26);
      });
    } else if (kind === 'ring') {
      b.torus('ctSteel', s * 0.46, 0.14, x, y + s * 0.46, z, 0, Math.PI / 2, 0);
      b.torus('ctNeonM', s * 0.38, 0.05, x, y + s * 0.46, z, 0, Math.PI / 2, 0);
      b.box('ctSteelD', 0.16, s * 0.46, 0.16, x, y + s * 0.23, z);
    } else if (kind === 'spire') {
      b.cyl('ctSteelD', 0.10, 0.28, s * 0.80, 6, x, y + s * 0.40, z);
      b.torus('ctNeonC', s * 0.34, 0.06, x, y + 0.10, z, Math.PI / 2, 0, 0);
      b.box('ctTail', 0.16, 0.16, 0.16, x, y + s * 0.82, z);
    } else if (kind === 'frame') {
      const fh = 2.2;
      ctCornerCols(b, x, z, w * 0.86, d * 0.86, y, fh, 'ctSteel', 0.20);
      ctRim(b, x, z, w * 0.86, d * 0.86, y + fh, 'ctNeonC', 0.14);
    } else if (kind === 'step') {
      [0, 1, 2].forEach(function (i) {
        const k = 1 - i * 0.26;
        b.box('ctCrown', w * k, 0.9, d * k,
          x + (rnd() - 0.5) * 0.5, y + 0.45 + i * 0.9, z + (rnd() - 0.5) * 0.5);
      });
      ctRim(b, x, z, w * 0.48, d * 0.48, y + 2.75, 'ctNeonM', 0.10);
    }
  }

  /* ① 收分八棱塔 —— 全场制高点。八棱柱 + 逐段收分 +
     飞碟观景盘 + 针尖，不再是「四段方盒叠起来」。 */
  function ctArtNeedle(b, o) {
    const y0 = o.y0 || 0, seed = o.seed || 3;
    const R = Math.min(o.w, o.d) * 0.54;
    const seg = 8, rot = Math.PI / 8;
    const parts = [
      { h: o.h * 0.46, r: 1.00 },
      { h: o.h * 0.24, r: 0.84 },
      { h: o.h * 0.20, r: 0.62 },
      { h: o.h * 0.10, r: 0.38 }
    ];
    let y = y0;
    parts.forEach(function (p, i) {
      const r = R * p.r, h = p.h;
      b.cyl(i % 2 ? 'ctT2' : 'ctT1', r, r, h, seg, o.x, y + h / 2, o.z, 0, rot, 0);
      ctRingBands(b, o.x, o.z, r, y, h, seg, rot, seed + i * 3, 2.9);
      ctRibs(b, o.x, o.z, r + 0.02, y, h, seg, rot + Math.PI / seg, 'ctSteel');
      b.cyl('ctSteelD', r + 0.26, r + 0.26, 0.24, seg, o.x, y + h, o.z, 0, rot, 0);
      /* 亮环只在两段接缝上给，四个接缝全挂彩环就成了一根螺纹管 */
      if (i === 0 || i === 2) {
        b.torus('ctNeonM', r + 0.26, 0.07, o.x, y + h + 0.14, o.z, Math.PI / 2, 0, 0);
      }
      y += h;
    });
    const dy = y0 + parts[0].h + parts[1].h * 0.55;
    b.cyl('ctCrown', R * 1.46, R * 1.46, 0.44, 16, o.x, dy, o.z);
    b.cyl('ctGlassB', R * 1.30, R * 1.30, 1.05, 16, o.x, dy + 0.72, o.z);
    b.cyl('ctCrown', R * 1.40, R * 1.40, 0.30, 16, o.x, dy + 1.38, o.z);
    b.torus('ctNeonC', R * 1.46, 0.08, o.x, dy - 0.20, o.z, Math.PI / 2, 0, 0);
    ctGlow(o.x, dy + 0.6, o.z, 0x22e6ff, 9.0, 0.14);
    b.cyl('ctSteelD', 0.08, 0.34, 6.2, 6, o.x, y + 3.1, o.z);
    b.box('ctTail', 0.18, 0.18, 0.18, o.x, y + 6.3, o.z);
    ctGlow(o.x, y + 1.0, o.z, 0xff2d7a, 6.0, 0.18);
    return { top: y, w: R * 2, d: R * 2 };
  }

  /* ② 外露钢骨架塔 —— 四角巨柱 + 每层横梁 + X 斜撑 +
     中央发光玻璃核心筒。整栋是透空的「笼子」，
     和实心方盒的剪影完全相反。 */
  function ctArtFrame(b, o) {
    const y0 = o.y0 || 0, h = o.h, w = o.w, d = o.d;
    const cw = w * 0.52, cd = d * 0.52;
    b.box('ctCore', cw, h, cd, o.x, y0 + h / 2, o.z);
    ctFacadeOn(o.x, o.z, cw, cd, y0, h - 0.2, o.seed || 3, 2, 0.34, 0.75);
    ctCornerCols(b, o.x, o.z, w, d, y0, h, 'ctSteel', 0.55);
    const n = Math.max(2, Math.round(h / 3.1)), fh = h / n;
    for (let i = 0; i <= n; i++) {
      ctRim(b, o.x, o.z, w, d, y0 + i * fh, 'ctSteelD', 0.22);
    }
    for (let i = 0; i < n; i++) {
      const ya = y0 + i * fh + 0.12, yb = y0 + (i + 1) * fh - 0.12;
      [-1, 1].forEach(function (sx) {
        const xx = o.x + sx * (w / 2 - 0.10);
        b.to('ctSteelD', 0.065, xx, ya, o.z - d / 2 + 0.10, xx, yb, o.z + d / 2 - 0.10, 4);
        b.to('ctSteelD', 0.065, xx, ya, o.z + d / 2 - 0.10, xx, yb, o.z - d / 2 + 0.10, 4);
      });
      [-1, 1].forEach(function (sz) {
        const zz = o.z + sz * (d / 2 - 0.10);
        b.to('ctSteelD', 0.065, o.x - w / 2 + 0.10, ya, zz, o.x + w / 2 - 0.10, yb, zz, 4);
        b.to('ctSteelD', 0.065, o.x + w / 2 - 0.10, ya, zz, o.x - w / 2 + 0.10, yb, zz, 4);
      });
    }
    const fy = y0 + h;
    ctCornerCols(b, o.x, o.z, w * 0.84, d * 0.84, fy, 3.0, 'ctSteel', 0.24);
    ctRim(b, o.x, o.z, w * 0.84, d * 0.84, fy + 3.0, 'ctNeonC', 0.16);
    ctRim(b, o.x, o.z, w * 0.84, d * 0.84, fy + 1.5, 'ctSteelD', 0.12);
    ctGlow(o.x, fy + 1.6, o.z, 0x22e6ff, 5.0, 0.12);
    return { top: fy + 3.0, w: w, d: d };
  }

  /* ③ 圆柱塔 —— 一圈圈发光窗环 + 飞碟观景层 + 半球冠 */
  function ctArtCyl(b, o) {
    const y0 = o.y0 || 0, h = o.h;
    const R = Math.min(o.w, o.d) * 0.46;
    const seg = 14;
    b.cyl('ctT4', R, R, h * 0.86, seg, o.x, y0 + h * 0.43, o.z);
    ctRingBands(b, o.x, o.z, R, y0, h * 0.86, seg, 0, o.seed || 5, 1.85);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      b.box('ctGlassB', 0.16, h * 0.86, 0.16,
        o.x + Math.cos(a) * R * 1.02, y0 + h * 0.43, o.z + Math.sin(a) * R * 1.02, 0, -a, 0);
    }
    const dy = y0 + h * 0.68;
    b.cyl('ctCrown', R * 1.52, R * 1.52, 0.34, 18, o.x, dy, o.z);
    b.cyl('ctGlassB', R * 1.38, R * 1.38, 1.30, 18, o.x, dy + 0.82, o.z);
    b.cyl('ctCrown', R * 1.48, R * 1.48, 0.28, 18, o.x, dy + 1.60, o.z);
    b.torus('ctNeonM', R * 1.52, 0.075, o.x, dy - 0.16, o.z, Math.PI / 2, 0, 0);
    b.torus('ctNeonC', R * 1.48, 0.065, o.x, dy + 1.75, o.z, Math.PI / 2, 0, 0);
    const ty = y0 + h * 0.86;
    b.cyl('ctSteelD', R * 0.96, R * 0.96, 0.26, seg, o.x, ty + 0.13, o.z);
    b.sph('ctCrown', R * 0.94, o.x, ty + 0.26, o.z, 1, 0.58, 1);
    b.cyl('ctSteelD', 0.05, 0.10, 2.4, 6, o.x, ty + 1.8, o.z);
    b.box('ctTail', 0.14, 0.14, 0.14, o.x, ty + 3.05, o.z);
    ctGlow(o.x, dy + 0.8, o.z, 0x22e6ff, 8.0, 0.15);
    return { top: ty + 3.0, w: R * 3.0, d: R * 3.0 };
  }

  /* ④ 双塔连体 —— 左塔八棱柱、右塔方盒，形状本身先对撞一次，
     再靠三道空中连廊和顶部横跨门框把两者绑成一栋。
     两根都是方柱的话，从俯视角看只会连成一整块方盒。 */
  function ctArtTwin(b, o) {
    const y0 = o.y0 || 0, seed = o.seed || 7;
    const gap = o.w * 0.72, tw = o.w * 0.27, td = o.d * 0.70;
    const hA = o.h, hB = o.h * 0.78;
    const ax = o.x - gap / 2, bx = o.x + gap / 2;

    /* 左塔：八棱柱 + 环形窗带 + 三道亮腰环 */
    const R = tw * 0.58, seg = 8, rot = Math.PI / 8;
    b.cyl('ctT2', R, R, hA, seg, ax, y0 + hA / 2, o.z, 0, rot, 0);
    ctRingBands(b, ax, o.z, R, y0, hA, seg, rot, seed, 2.5);
    ctRibs(b, ax, o.z, R + 0.02, y0, hA, seg, rot + Math.PI / seg, 'ctSteel');
    for (let k = 1; k <= 3; k++) {
      const ky = y0 + (hA * k) / 4;
      b.cyl('ctSteelD', R + 0.18, R + 0.18, 0.22, seg, ax, ky, o.z, 0, rot, 0);
      b.torus('ctNeonC', R + 0.18, 0.06, ax, ky + 0.13, o.z, Math.PI / 2, 0, 0);
    }
    b.cyl('ctWalk', R - 0.1, R - 0.1, 0.05, seg, ax, y0 + hA + 0.02, o.z, 0, rot, 0);

    /* 右塔：方盒，保留原来的窗格质感作为对照 */
    b.box('ctT5', tw, hB, td, bx, y0 + hB / 2, o.z);
    b.box('ctWalk', tw - 0.1, 0.05, td - 0.1, bx, y0 + hB + 0.02, o.z);
    ctFacadeOn(bx, o.z, tw, td, y0, hB - 0.2, seed + 13, 0, 0.5, 1);
    const n = Math.max(2, Math.round(hB / 3.4));
    for (let k = 1; k < n; k++) {
      ctRim(b, bx, o.z, tw + 0.10, td + 0.10, y0 + (hB * k) / n,
        (k % 3 === 0) ? 'ctNeonC' : 'ctSteelD', 0.10);
    }
    ctRim(b, bx, o.z, tw, td, y0 + hB + 0.06, 'ctNeonM', 0.13);

    /* 三道连廊：加宽 + 上下各一条亮边，俯视下才不会消失在两塔之间 */
    const span = gap - R - tw / 2 + 0.4;
    const cx = (ax + R + bx - tw / 2) / 2;
    [0.32, 0.56, 0.80].forEach(function (f) {
      const yy = y0 + Math.min(hA, hB) * f;
      b.box('ctGlassB', span, 1.7, 2.6, cx, yy, o.z);
      b.box('ctSteelD', span + 0.2, 0.18, 2.8, cx, yy - 0.95, o.z);
      b.box('ctBandW', span, 0.14, 2.7, cx, yy - 1.06, o.z);
      b.box('ctNeonC', span, 0.10, 0.10, cx, yy + 0.75, o.z + 1.32);
      b.box('ctNeonC', span, 0.10, 0.10, cx, yy + 0.75, o.z - 1.32);
      ctGlow(cx, yy, o.z, 0x22e6ff, 5.0, 0.10);
    });

    /* 顶部横跨门框 */
    const yy = y0 + hA - 1.2;
    b.box('ctSteel', gap + tw * 0.9, 0.50, 1.0, ax + gap * 0.28, yy, o.z);
    b.box('ctNeonM', gap + tw * 0.9, 0.09, 0.10, ax + gap * 0.28, yy - 0.30, o.z + 0.51);
    ctCrown(b, ax, o.z, tw, tw, y0 + hA, 'blade', seed);
    ctCrown(b, bx, o.z, tw, td, y0 + hB, 'disc', seed + 2);
    return { top: y0 + hA, w: o.w, d: td };
  }

  /* ⑤ 错层悬挑 —— 四层板楼逐层平移 + 交替转向，
     每层底面挑出一块暗板，俯视下像一摞错开的书 */
  function ctArtStagger(b, o) {
    const y0 = o.y0 || 0, n = 4, fh = o.h / n;
    let last = { x: o.x, z: o.z, w: o.w, d: o.d };
    for (let i = 0; i < n; i++) {
      const swap = (i % 2 === 1);
      const w = swap ? o.d * 0.72 : o.w;
      const d = swap ? o.w * 0.72 : o.d;
      const xx = o.x + (i - 1.5) * 0.95;
      const zz = o.z + (i % 2 ? -0.55 : 0.55);
      b.box('ctSteelD', w + 0.9, 0.26, d + 0.9, xx, y0 + i * fh + 0.13, zz);
      b.box(i % 2 ? 'ctT3' : 'ctT1', w, fh - 0.3, d, xx, y0 + i * fh + fh / 2, zz);
      ctFacadeOn(xx, zz, w, d, y0 + i * fh + 0.3, fh - 0.5, (o.seed || 3) + i * 17, 1, 0.5, 1);
      ctRim(b, xx, zz, w + 0.9, d + 0.9, y0 + i * fh + 0.28,
        (i % 2) ? 'ctNeonC' : 'ctNeonM', 0.12);
      for (let k = 0; k < 3; k++) {
        b.box('ctFin', 0.10, fh - 0.6, 0.16,
          xx - w / 2 - 0.06, y0 + i * fh + fh / 2, zz - d / 2 + (d * (k + 1)) / 4);
      }
      last = { x: xx, z: zz, w: w, d: d };
    }
    const ty = y0 + o.h;
    b.box('ctCrown', last.w + 1.8, 0.28, last.d + 1.8, last.x, ty + 0.14, last.z);
    ctRim(b, last.x, last.z, last.w + 1.8, last.d + 1.8, ty + 0.30, 'ctNeonM', 0.14);
    ctCrown(b, last.x, last.z, last.w * 0.6, last.d * 0.6, ty + 0.32, 'step', o.seed || 3);
    return { top: ty, w: o.w, d: o.d };
  }

  /* ⑥ 镂空门洞塔 —— 底部四柱架空，中部整层挖空做空中花园，
     上部才是实体。俯视下是一个「有洞的楼」。 */
  function ctArtVoid(b, o) {
    const y0 = o.y0 || 0, h = o.h, w = o.w, d = o.d;
    const legH = h * 0.28, voidH = h * 0.26, solidH = h - legH - voidH;
    b.box('ctSteelD', w + 0.4, 0.30, d + 0.4, o.x, y0 + 0.15, o.z);
    ctCornerCols(b, o.x, o.z, w, d, y0, legH, 'ctSteel', 0.62);
    b.box('ctCrown', w, 0.34, d, o.x, y0 + legH, o.z);
    ctCornerCols(b, o.x, o.z, w, d, y0 + legH, voidH, 'ctSteelD', 0.34);
    const gy = y0 + legH + voidH * 0.34;
    b.box('ctWalk2', w * 0.56, 0.20, d * 0.56, o.x, gy, o.z);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const px = o.x + Math.cos(a) * w * 0.20, pz = o.z + Math.sin(a) * d * 0.20;
      b.cyl('ctPlant', 0.10, 0.10, 0.8, 5, px, gy + 0.50, pz);
      b.sph('ctBandA', 0.34, px, gy + 1.05, pz, 1, 0.8, 1);
    }
    const sy = y0 + legH + voidH;
    b.box('ctCrown', w, 0.34, d, o.x, sy, o.z);
    b.box('ctT2', w, solidH, d, o.x, sy + solidH / 2, o.z);
    b.box('ctWalk', w - 0.1, 0.05, d - 0.1, o.x, sy + solidH + 0.02, o.z);
    ctFacadeOn(o.x, o.z, w, d, sy, solidH - 0.2, o.seed || 3, 2, 0.52, 1);
    ctRim(b, o.x, o.z, w, d, sy + solidH + 0.06, 'ctNeonC', 0.14);
    ctRim(b, o.x, o.z, w, d, y0 + legH + 0.20, 'ctNeonM', 0.10);
    ctRim(b, o.x, o.z, w, d, sy - 0.20, 'ctNeonM', 0.10);
    ctCrown(b, o.x, o.z, w, d, sy + solidH, 'frame', o.seed || 3);
    ctGlow(o.x, y0 + legH + voidH * 0.6, o.z, 0x4dff9a, 6.0, 0.12);
    return { top: sy + solidH + 2.2, w: w, d: d };
  }

  /* ⑦ 螺旋坡道塔 —— 中央实心筒 + 一圈绕升的悬挑板，
     外缘挂发光边。从任何角度看都有一条斜向上的线。 */
  function ctArtHelix(b, o) {
    const y0 = o.y0 || 0, h = o.h, w = o.w, d = o.d;
    const cw = w * 0.52, cd = d * 0.52;
    b.cyl('ctT4', cw * 0.56, cw * 0.56, h, 8, o.x, y0 + h / 2, o.z, 0, Math.PI / 8, 0);
    ctRingBands(b, o.x, o.z, cw * 0.56, y0, h, 8, Math.PI / 8, o.seed || 5, 3.6);
    const R = Math.min(w, d) * 0.46, n = 26;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 * 1.6;
      const yy = y0 + 0.8 + (h - 2.0) * (i / (n - 1));
      const px = o.x + Math.cos(a) * R, pz = o.z + Math.sin(a) * R;
      /* 踏板必须用亮金属：暗色板在俯视下被压成一条线，
         整座塔就只剩「脚手架包着一根柱子」，看不出在旋。 */
      b.box('ctFin', R * 1.02, 0.20, 0.86, px, yy, pz, 0, -a, 0);
      b.box('ctNeonC', 0.30, 0.14, 0.86,
        o.x + Math.cos(a) * (R + R * 0.42), yy + 0.12,
        o.z + Math.sin(a) * (R + R * 0.42), 0, -a, 0);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      b.cyl('ctSteelD', 0.09, 0.11, h, 6,
        o.x + Math.cos(a) * R * 1.38, y0 + h / 2, o.z + Math.sin(a) * R * 1.38);
    }
    ctCrown(b, o.x, o.z, cw, cd, y0 + h, 'disc', o.seed || 5);
    return { top: y0 + h + 2.3, w: w, d: d };
  }

  /* ⑧ 楔形斜切塔 —— 方盒基座 + 四棱台收顶 + 一片斜挑檐。
     斜线是这张图里最缺的东西。 */
  function ctArtWedge(b, o) {
    const y0 = o.y0 || 0, h = o.h, w = o.w, d = o.d;
    const baseH = h * 0.62;
    b.box('ctT3', w, baseH, d, o.x, y0 + baseH / 2, o.z);
    ctFacadeOn(o.x, o.z, w, d, y0, baseH - 0.2, o.seed || 7, 1, 0.54, 1);
    ctRim(b, o.x, o.z, w, d, y0 + baseH + 0.05, 'ctNeonM', 0.14);
    const rt = Math.min(w, d) * 0.36, rb = Math.min(w, d) * 0.71;
    const ph = h - baseH;
    b.cyl('ctGlassB', rt, rb, ph, 4, o.x, y0 + baseH + ph / 2, o.z, 0, Math.PI / 4, 0);
    for (let i = 1; i <= 3; i++) {
      const f = i / 4, r = rb + (rt - rb) * f;
      b.cyl('ctSteelD', r + 0.04, r + 0.04, 0.10, 4,
        o.x, y0 + baseH + ph * f, o.z, 0, Math.PI / 4, 0);
    }
    b.box('ctCrown', w * 0.92, 0.26, d * 1.15, o.x, y0 + h + 0.30, o.z, 0, 0, 0.13);
    ctRim(b, o.x, o.z, w * 0.92, d * 1.15, y0 + h + 0.45, 'ctNeonC', 0.12);
    [-1, 1].forEach(function (s) {
      b.to('ctSteelD', 0.09, o.x + s * w * 0.34, y0 + h - 1.4, o.z - d * 0.40,
        o.x + s * w * 0.40, y0 + h + 0.25, o.z + d * 0.50, 5);
    });
    ctGlow(o.x, y0 + h * 0.8, o.z, 0x22e6ff, 7.0, 0.10);
    return { top: y0 + h + 0.5, w: w, d: d };
  }

  /* 远景背板里也混两根圆柱 / 六棱塔，
     否则远处一整排方盒会把近处造型塔的轮廓吃回去。 */
  function ctArtFar(b, x, z, w, d, h, seed, kind) {
    const R = Math.min(w, d) * 0.48;
    if (kind === 'cyl') {
      b.cyl('ctT3', R, R, h * 0.86, 12, x, h * 0.43, z);
      ctRingBands(b, x, z, R, 0, h * 0.86, 12, 0, seed, 3.0);
      b.cyl('ctCrown', R * 1.24, R * 1.24, 0.30, 12, x, h * 0.86, z);
      b.cyl('ctSteelD', 0.05, 0.16, h * 0.14, 6, x, h * 0.93, z);
    } else {
      const seg = 6, rot = Math.PI / 6;
      b.cyl('ctT2', R, R * 1.04, h * 0.80, seg, x, h * 0.40, z, 0, rot, 0);
      ctRingBands(b, x, z, R * 1.04, 0, h * 0.80, seg, rot, seed, 3.0);
      ctRibs(b, x, z, R * 1.05, 0, h * 0.80, seg, rot + Math.PI / seg, 'ctSteelD');
      b.cyl('ctCrown', 0.02, R * 0.92, h * 0.20, 4, x, h * 0.90, z, 0, Math.PI / 4, 0);
    }
    return { top: h };
  }

  /* 檐口霓虹：四条细边，贴着女儿墙顶走一圈 */
  function ctRim(b, x, z, w, d, y, key, th) {
    th = th || 0.13;
    const e = th / 2;
    b.box(key, w, th, th, x, y, z + d / 2 - e);
    b.box(key, w, th, th, x, y, z - d / 2 + e);
    b.box(key, th, th, d, x + w / 2 - e, y, z);
    b.box(key, th, th, d, x - w / 2 + e, y, z);
  }

  /* ---------- 屋顶陈设 ----------
     俯视角下屋顶是画面里面积最大的一块东西。全是光板的话，
     整座城就像一堆没做完的盒体；撒上水箱群、棚架、广告牌、
     管道和晾衣杆，屋顶才成「有人住的地方」。 */
  /* 屋面分区 / 卷材拼缝 / 女儿墙内阴影
     俯视角下屋顶是画面里面积最大的东西。一整块平板读起来就是
     「一块灰」；加几条暗缝 + 一块设备区色差 + 内侧一圈阴影，
     它立刻变成「屋顶」。全是薄板，合批后几乎不增加开销。 */
  function ctRoofSkin(b, x, z, w, d, y, seed) {
    const rnd = ctRnd(seed * 173 + 7);
    const nx = 2 + ((rnd() * 2) | 0), nz = 1 + ((rnd() * 2) | 0);
    /* 卷材拼接缝 */
    for (let i = 1; i <= nx; i++) {
      b.box('ctSteelD', w - 0.24, 0.014, 0.038, x, y + 0.040, z - d / 2 + (d * i) / (nx + 1));
    }
    for (let i = 1; i <= nz; i++) {
      b.box('ctSteelD', 0.038, 0.014, d - 0.24, x - w / 2 + (w * i) / (nz + 1), y + 0.040, z);
    }
    /* 设备区：一块略亮的方形，屋顶就有了「分区」而不是一整块毡 */
    const pw = Math.max(0.8, w * (0.22 + rnd() * 0.18));
    const pd = Math.max(0.8, d * (0.20 + rnd() * 0.18));
    b.box('ctWalk2', pw, 0.026, pd,
      x + (rnd() - 0.5) * Math.max(0.1, w - pw - 0.5), y + 0.028,
      z + (rnd() - 0.5) * Math.max(0.1, d - pd - 0.5));
    /* 女儿墙内侧阴影：四条贴边的暗带，屋顶才像「凹进去」的一块 */
    b.box('ctSteelD', w - 0.14, 0.02, 0.16, x, y + 0.042, z + d / 2 - 0.16);
    b.box('ctSteelD', w - 0.14, 0.02, 0.16, x, y + 0.042, z - d / 2 + 0.16);
    b.box('ctSteelD', 0.16, 0.02, d - 0.14, x + w / 2 - 0.16, y + 0.042, z);
    b.box('ctSteelD', 0.16, 0.02, d - 0.14, x - w / 2 + 0.16, y + 0.042, z);
  }

  function ctRoofDress(b, x, z, w, d, y, seed, hgt) {
    const rnd = ctRnd((seed || 7) * 31 + 11);
    const area = w * d;
    if (area < 9) return;
    const n = Math.min(7, Math.max(2, Math.round(area / 9)));

    for (let i = 0; i < n; i++) {
      const t = rnd();
      const px = x + (rnd() - 0.5) * Math.max(0.4, w - 2.0);
      const pz = z + (rnd() - 0.5) * Math.max(0.4, d - 2.0);

      if (t < 0.26) {
        /* 水箱群：2~4 只一簇，比单只更有「 rooftop 乱」的味道 */
        const k = 1 + ((rnd() * 4) | 0);
        for (let j = 0; j < k; j++) {
          const ox = (j % 2) * 0.82 - 0.40, oz = ((j / 2) | 0) * 0.82 - 0.40;
          const rr = 0.34 + rnd() * 0.16;
          b.cyl('ctTank', rr, rr, 1.05, 8, px + ox, y + 0.72, pz + oz);
          b.cyl('ctTankD', rr + 0.05, rr + 0.05, 0.08, 8, px + ox, y + 1.28, pz + oz);
          b.box('ctSteelD', rr * 2.1, 0.06, 0.06, px + ox, y + 0.98, pz + oz);
        }
      } else if (t < 0.44) {
        /* 棚架：四柱 + 平顶 + 一块防水布，晾着东西 */
        const sw = 1.5 + rnd() * 1.4, sd = 1.3 + rnd() * 1.2, sh = 1.5 + rnd() * 0.6;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
          b.cyl('ctSteelD', 0.04, 0.045, sh, 5, px + q[0] * sw / 2, y + sh / 2, pz + q[1] * sd / 2);
        });
        b.box(rnd() < 0.5 ? 'ctAwning' : 'ctCloth1', sw + 0.16, 0.07, sd + 0.16,
          px, y + sh + 0.04, pz);
        b.box('ctSteelD', sw + 0.2, 0.04, 0.04, px, y + sh + 0.10, pz - sd / 2);
      } else if (t < 0.60) {
        /* 屋顶广告牌：斜撑铁架 + 发光板，朝 +x / +z 两面 */
        const bwid = 1.8 + rnd() * 2.2, bhei = 1.1 + rnd() * 1.3;
        const ax = px, az = pz;
        b.box('ctSteelD', 0.10, 0.10, 1.5, ax - bwid * 0.28, y + 0.55, az);
        b.box('ctSteelD', 0.10, 0.10, 1.5, ax + bwid * 0.28, y + 0.55, az);
        b.box('ctSignBox', bwid, bhei, 0.14, ax, y + 1.1 + bhei / 2, az);
        const pal = [0xff2d7a, 0x22e6ff, 0xffd23f, 0x9a6bff, 0x4dff9a];
        const cc = pal[(rnd() * pal.length) | 0];
        ctPlane(ctBoardTex(cc, cc, '夜', ''), bwid - 0.2, bhei - 0.16,
          ax, y + 1.1 + bhei / 2, az + 0.10, 0, 1, 5);
        ctGlow(ax, y + 1.1 + bhei / 2, az + 0.3, cc, bwid * 2.2, 0.16);
      } else if (t < 0.76) {
        /* 通风管阵列：一排矮圆筒，最省件又最像工业屋面 */
        const k = 2 + ((rnd() * 4) | 0);
        for (let j = 0; j < k; j++) {
          b.cyl('ctPipe', 0.14, 0.16, 0.44 + rnd() * 0.3, 7, px + j * 0.46 - k * 0.23, y + 0.30, pz);
          b.cyl('ctSteelD', 0.19, 0.19, 0.05, 7, px + j * 0.46 - k * 0.23, y + 0.52, pz);
        }
      } else if (t < 0.90) {
        /* 晾衣杆：两根立杆 + 一根横杆，挂几片布 */
        const lw = 1.8 + rnd() * 1.4;
        b.cyl('ctSteelD', 0.035, 0.04, 1.5, 5, px - lw / 2, y + 0.75, pz);
        b.cyl('ctSteelD', 0.035, 0.04, 1.5, 5, px + lw / 2, y + 0.75, pz);
        b.box('ctSteelD', lw, 0.035, 0.035, px, y + 1.46, pz);
        for (let j = 0; j < 4; j++) {
          if (rnd() < 0.3) continue;
          b.box(rnd() < 0.5 ? 'ctCloth1' : 'ctCloth2', 0.26, 0.42 + rnd() * 0.2, 0.03,
            px - lw / 2 + 0.3 + j * (lw - 0.5) / 3.6, y + 1.24, pz);
        }
      } else {
        /* 卫星天线：一口锅，最抓眼的屋顶符号 */
        const rr = 0.34 + rnd() * 0.18;
        b.cyl('ctSteelD', 0.05, 0.06, 0.55, 5, px, y + 0.28, pz);
        const dish = new T.Mesh(
          new T.SphereGeometry(rr, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.42),
          mat('ctPorc')
        );
        dish.position.set(px, y + 0.62, pz);
        dish.rotation.set(0.9, rnd() * 6.28, 0);
        scene.add(dish);
      }
    }

    /* 大屋顶（> 60 ㎡）沿女儿墙再挂一条横向灯带，压住整块板 */
    if (area > 60) {
      const cc = rnd() < 0.5 ? 0x22e6ff : 0xff2d7a;
      b.box('ctSignBox', w * 0.62, 0.62, 0.16, x, y + 0.34, z + d / 2 - 0.3);
      ctNeonBar(x, y + 0.68, z + d / 2 - 0.3, w * 0.62, 0.05, 0.05, cc, 0.42);
    }
  }

  /* 屋顶杂件：水箱 / 空调 / 天线 / 航空障碍灯 */
  function ctRoofKit(b, x, z, w, d, y, seed) {
    const rnd = ctRnd(seed || 5);
    /* 楼梯间出屋面 */
    const bw = Math.min(2.8, w * 0.30), bd = Math.min(2.4, d * 0.28);
    b.box('ctConcrete2', bw, 2.10, bd, x + w * 0.16, y + 1.05, z - d * 0.16);
    b.box('ctSteelD', bw + 0.14, 0.12, bd + 0.14, x + w * 0.16, y + 2.14, z - d * 0.16);
    /* 水箱：只给一半屋顶，全配就成了「一排同款凳子」 */
    if (rnd() > 0.42) {
      const tx = x - w * 0.24, tz = z + d * 0.20;
      b.cyl('ctTank', 0.60, 0.60, 1.45, 10, tx, y + 1.55, tz);
      b.cyl('ctTankD', 0.64, 0.64, 0.10, 10, tx, y + 2.30, tz);
      b.cyl('ctTankD', 0.64, 0.64, 0.10, 10, tx, y + 0.80, tz);
      [[-0.40, -0.40], [0.40, -0.40], [-0.40, 0.40], [0.40, 0.40]].forEach(function (q) {
        b.box('ctSteelD', 0.09, 0.86, 0.09, tx + q[0], y + 0.43, tz + q[1]);
      });
    }
    /* 空调外机排：两台的更常见 */
    for (let i = 0; i < 2; i++) {
      b.box('ctSteel', 0.66, 0.46, 0.48, x - w * 0.10 + i * 0.84, y + 0.24, z - d * 0.40);
    }
    /* 天线：只有约六成屋顶立杆，高度也压短 —— 俯视时满城的细黑棍
       会变成一层噪点，盖住檐口霓虹 */
    if (rnd() > 0.40) {
      const ax = x + w * 0.30, az = z + d * 0.28;
      const ah = 1.5 + rnd() * 1.4;
      b.cyl('ctSteelD', 0.032, 0.045, ah, 5, ax, y + ah / 2, az);
      b.box('ctTail', 0.09, 0.09, 0.09, ax, y + ah + 0.06, az);
    }
  }

  /* ---------- 天桥 ---------- */
  function ctBridge(b, x0, z0, x1, z1, y, w, h, kind) {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.2) return;
    const ry = Math.atan2(dx, dz);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;

    /* 桥面板 + 底部封板 */
    ctBox(b, 'ctConcrete2', w, 0.30, len, 0, -0.15, 0, cx, y, cz, ry);
    ctBox(b, 'ctSteelD', w + 0.10, 0.14, len, 0, -0.34, 0, cx, y, cz, ry);

    if (kind === 'glass') {
      /* 玻璃管：两片侧墙 + 顶板 + 竖框 + 内里灯带 */
      ctBox(b, 'ctGlassB', 0.10, h, len, w / 2 - 0.06, h / 2, 0, cx, y, cz, ry);
      ctBox(b, 'ctGlassB', 0.10, h, len, -w / 2 + 0.06, h / 2, 0, cx, y, cz, ry);
      ctBox(b, 'ctSteelD', w, 0.20, len, 0, h, 0, cx, y, cz, ry);
      const nRib = Math.max(2, Math.round(len / 1.9));
      for (let i = 0; i <= nRib; i++) {
        const lz = -len / 2 + len * i / nRib;
        ctBox(b, 'ctSteelD', w + 0.12, h + 0.16, 0.14, 0, h / 2, lz, cx, y, cz, ry);
      }
      /* 桥内灯带：贴在顶板下，隔着玻璃透出来 */
      ctBox(b, 'ctWinC', w - 0.30, 0.08, len - 0.30, 0, h - 0.16, 0, cx, y, cz, ry);
    } else {
      /* 桁架人行桥：上弦 + 下弦 + 斜撑 */
      ctBox(b, 'ctSteel', w, 0.10, len, 0, h - 0.10, 0, cx, y, cz, ry);
      [w / 2 - 0.06, -w / 2 + 0.06].forEach(function (lx) {
        ctBox(b, 'ctSteel', 0.09, 0.09, len, lx, h * 0.55, 0, cx, y, cz, ry);
        const nD = Math.max(3, Math.round(len / 1.3));
        for (let i = 0; i < nD; i++) {
          const lz0 = -len / 2 + len * i / nD;
          const lz1 = -len / 2 + len * (i + 1) / nD;
          const yy = h * 0.55;
          const c2 = Math.cos(ry), s2 = Math.sin(ry);
          function W(lx2, lz2) {
            return [cx + lx2 * c2 + lz2 * s2, cz - lx2 * s2 + lz2 * c2];
          }
          const p0 = W(lx, lz0), p1 = W(lx, lz1);
          b.to('ctSteelD', 0.045, p0[0], y + (i % 2 ? 0.04 : yy * 2), p0[1],
            p1[0], y + (i % 2 ? yy * 2 : 0.04), p1[1], 4);
        }
      });
    }

    /* 桥底霓虹 + 端头光晕。桥底那条线是俯视角下唯一能把「桥」
       从楼群里拎出来的东西，必须够粗够亮（0.07/0.28 那版看不见）。 */
    ctNeonBar(cx, y - 0.46, cz, 0.18, 0.18, len - 0.3, 0x2fe8ff, 0.62, ry);
    ctNeonBar(cx, y + (kind === 'glass' ? h - 0.22 : 0.18), cz, 0.09, 0.09, len - 0.3,
      0x2fe8ff, 0.34, ry);
    ctGlow(x0, y - 0.2, z0, 0x2fa8ff, 3.2, 0.22);
    ctGlow(x1, y - 0.2, z1, 0x2fa8ff, 3.2, 0.22);
  }

  /* 高架步道：面板 + 栏杆 + 立柱 + 檐下灯带 */
  function ctDeck(b, x0, x1, z0, z1, y, railKey) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const w = x1 - x0, d = z1 - z0;
    b.box('ctConcrete', w, 0.26, d, cx, y - 0.13, cz);
    b.box('ctSteelD', w + 0.16, 0.12, d + 0.16, cx, y - 0.34, cz);
    /* 栏杆：只做外侧（+x 侧）和两端，内侧贴墙 */
    const rx = x1 - 0.06;
    for (let z = z0 + 0.4; z <= z1 - 0.3; z += 1.05) {
      b.cyl('ctSteelD', 0.038, 0.038, 0.92, 5, rx, y + 0.46, z);
    }
    b.box('ctSteelD', 0.07, 0.07, d - 0.2, rx, y + 0.90, cz);
    b.box('ctSteelD', 0.05, 0.05, d - 0.2, rx, y + 0.50, cz);
    /* 立柱 */
    const nP = Math.max(2, Math.round(d / 4.2));
    for (let i = 0; i <= nP; i++) {
      const z = z0 + d * i / nP;
      b.cyl('ctSteel', 0.13, 0.16, y - 0.34, 8, x0 + 0.35, (y - 0.34) / 2, z);
      b.box('ctSteelD', 0.36, 0.10, 0.36, x0 + 0.35, 0.05, z);
    }
    /* 檐下灯带：步道底面一条冷白，夜里就是一条「光带」 */
    b.box('ctWinC', w - 0.5, 0.05, d - 0.9, cx - 0.1, y - 0.35, cz);
  }

  /* ---------- 拱顶商店街 ---------- */
  function ctVault(b, key, ribKey, x0, x1, zc, halfW, yE, rise, n, ribStep) {
    const cx = (x0 + x1) / 2, len = x1 - x0;
    const t = 0.14;
    for (let i = 0; i < n; i++) {
      const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n;
      const z0 = zc + halfW * Math.cos(a0), y0 = yE + rise * Math.sin(a0);
      const z1 = zc + halfW * Math.cos(a1), y1 = yE + rise * Math.sin(a1);
      const L = Math.hypot(z1 - z0, y1 - y0);
      const phi = Math.atan2(-(y1 - y0), z1 - z0);
      b.box(key, len, t, L + 0.02, cx, (y0 + y1) / 2, (z0 + z1) / 2, phi, 0, 0);
    }
    /* 两端是拱形开口，不需要封板 —— 只补一道端头拱肋收边（由下面的 rib 循环负责） */
    /* 横向拱肋 */
    const step = ribStep || 3.2;
    const nRib = Math.max(1, Math.round(len / step));
    for (let r = 0; r <= nRib; r++) {
      const rx = x0 + len * r / nRib;
      for (let i = 0; i < n; i++) {
        const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n;
        const z0b = zc + halfW * Math.cos(a0), y0b = yE + rise * Math.sin(a0);
        const z1b = zc + halfW * Math.cos(a1), y1b = yE + rise * Math.sin(a1);
        const L = Math.hypot(z1b - z0b, y1b - y0b);
        const phi = Math.atan2(-(y1b - y0b), z1b - z0b);
        b.box(ribKey, 0.13, t + 0.07, L + 0.02, rx, (y0b + y1b) / 2, (z0b + z1b) / 2, phi, 0, 0);
      }
    }
    /* 两侧檐口霓虹 */
    ctNeonBar(cx, yE + 0.02, zc + halfW + 0.02, len, 0.06, 0.06, 0xff4d9e, 0.35);
    ctNeonBar(cx, yE + 0.02, zc - halfW - 0.02, len, 0.06, 0.06, 0xff4d9e, 0.35);
  }

  /* ---------- 摊位 ---------- */
  function ctStall(b, x, z, ry, o) {
    o = o || {};
    const w = o.w || 1.55, d = o.d || 1.00, h = o.h || 2.05;
    /* 台面 + 台裙 + 四腿 */
    ctBox(b, 'ctWood', w, 0.08, d, 0, 0.86, 0, x, CT_GY, z, ry);
    ctBox(b, 'ctWoodD', w, 0.62, 0.07, 0, 0.55, -d / 2 + 0.03, x, CT_GY, z, ry);
    [[-w / 2 + 0.08, -d / 2 + 0.08], [w / 2 - 0.08, -d / 2 + 0.08],
     [-w / 2 + 0.08, d / 2 - 0.08], [w / 2 - 0.08, d / 2 - 0.08]].forEach(function (q) {
      ctBox(b, 'ctSteelD', 0.05, 0.86, 0.05, q[0], 0.43, q[1], x, CT_GY, z, ry);
    });
    /* 立柱 + 顶棚 */
    ctBox(b, 'ctSteelD', 0.05, h, 0.05, -w / 2 + 0.06, h / 2, -d / 2 + 0.06, x, CT_GY, z, ry);
    ctBox(b, 'ctSteelD', 0.05, h, 0.05, w / 2 - 0.06, h / 2, -d / 2 + 0.06, x, CT_GY, z, ry);
    ctBox(b, o.awk || 'ctAwning', w + 0.16, 0.07, d + 0.20, 0, h + 0.03, 0.02, x, CT_GY, z, ry);
    /* 棚下灯 */
    ctBox(b, 'ctBulb', w * 0.66, 0.05, 0.05, 0, h - 0.10, 0.06, x, CT_GY, z, ry);
    /* 台面货 */
    if (o.goods !== false) {
      for (let i = 0; i < 4; i++) {
        const lx = -w / 2 + 0.22 + i * (w - 0.44) / 3;
        ctBox(b, i % 3 === 0 ? 'ctCrate' : (i % 3 === 1 ? 'ctCrate2' : 'ctCream'),
          0.20, 0.14, 0.16, lx, 0.97, 0.02, x, CT_GY, z, ry);
      }
    }
  }

  /* ---------- 小汽车 ---------- */
  function ctCar(b, x, z, ry, body, o) {
    o = o || {};
    const s = o.s || 1;
    const L = 3.05 * s, W = 1.42 * s, H = 0.55 * s;
    ctBox(b, body, W, H, L, 0, 0.62 * s, 0, x, 0, z, ry);
    ctBox(b, body, W * 0.94, H * 0.86, L * 0.50, 0, 1.14 * s, -0.12 * s, x, 0, z, ry);
    ctBox(b, 'ctGlassT', W * 0.84, H * 0.62, L * 0.46, 0, 1.18 * s, -0.12 * s, x, 0, z, ry);
    /* 尾灯（朝 +z）/ 头灯（朝 -z） */
    [W * 0.34, -W * 0.34].forEach(function (lx) {
      ctBox(b, 'ctTail', 0.26 * s, 0.10 * s, 0.05, lx, 0.70 * s, L / 2 + 0.01, x, 0, z, ry);
      ctBox(b, 'ctHead', 0.24 * s, 0.10 * s, 0.05, lx, 0.66 * s, -L / 2 - 0.01, x, 0, z, ry);
    });
    /* 轮 */
    [[-W / 2 + 0.06, -L / 2 + 0.62 * s], [W / 2 - 0.06, -L / 2 + 0.62 * s],
     [-W / 2 + 0.06, L / 2 - 0.62 * s], [W / 2 - 0.06, L / 2 - 0.62 * s]].forEach(function (q) {
      const c = Math.cos(ry || 0), sn = Math.sin(ry || 0);
      const wx = x + q[0] * c + q[1] * sn, wz = z - q[0] * sn + q[1] * c;
      b.torus('ctTire', 0.26 * s, 0.075 * s, wx, 0.27 * s, wz, 0, Math.PI / 2 + ry, 0);
    });
  }

  /* ---------- 路灯 ---------- */
  function ctLamp(b, x, z, h, dir) {
    b.cyl('ctSteelD', 0.075, 0.10, h, 7, x, h / 2, z);
    b.box('ctSteelD', 0.30, 0.10, 0.30, x, 0.05, z);
    const dx = (dir || 1) * 0.62;
    b.box('ctSteelD', Math.abs(dx) + 0.08, 0.06, 0.06, x + dx / 2, h - 0.06, z);
    b.box('ctLampHead', 0.36, 0.10, 0.18, x + dx, h - 0.14, z);
    b.box('ctLampGlow', 0.30, 0.035, 0.14, x + dx, h - 0.20, z);
  }

  /* ---------- 湿地面倒影：顺相机方位拉长条 ---------- */
  function ctStreak(x, z, len, wid, color, op) {
    const t = 0.72, L = len * 0.5;
    cyWet(x + Math.cos(t) * L, z + Math.sin(t) * L, wid, len, color, op,
      Math.atan2(-Math.cos(t), -Math.sin(t)));
  }

  /* ================= 展台与路面 ================= */
  function buildCtBase() {
    const g = new T.Group();
    const b = new Builder();
    const cPX = (CT_PL.x0 + CT_PL.x1) / 2, cPZ = (CT_PL.z0 + CT_PL.z1) / 2;
    const PW = CT_PL.x1 - CT_PL.x0, PD = CT_PL.z1 - CT_PL.z0;

    /* 三层托台，底大上小 */
    b.box('ctRock', PW, 0.44, PD, cPX, -1.66, cPZ);
    b.box('ctRock2', PW - 0.7, 0.40, PD - 0.7, cPX, -1.24, cPZ);
    b.box('ctRock2', PW - 1.5, 0.36, PD - 1.5, cPX, -0.86, cPZ);
    /* 路面：顶面 y = 0 */
    b.box('ctRoad', PW - 2.0, 0.68, PD - 2.0, cPX, -0.34, cPZ);

    /* 沥青补丁 */
    const patches = [
      [7.2, -14.0, 2.6, 3.4], [10.4, 3.0, 2.0, 2.6], [6.0, 12.0, 2.4, 3.0],
      [-2.0, -2.0, 2.2, 2.4], [-20.0, 2.0, 2.6, 2.0], [18.0, 14.0, 2.4, 2.2],
      [8.0, 20.0, 2.0, 2.8], [-8.0, -12.0, 2.2, 2.0]
    ];
    patches.forEach(function (q, i) {
      b.box(i % 2 ? 'ctRoad2' : 'ctRoad3', q[2], 0.014, q[3], q[0], 0.007, q[1]);
    });

    /* ---- 主街路面标线 ---- */
    /* 中线用暗青灯带而不是白漆：白漆在夜景里会变成一条灰线，
       灯带才能把「街是通的」这件事从黑底上拎出来 */
    for (let z = -26.5; z < 27.0; z += 2.6) {
      b.box('ctNeonCd', 0.16, 0.016, 1.55, 9.75, 0.013, z);
    }
    b.box('ctPaint', 0.10, 0.014, 55.0, 5.30, 0.012, 0);
    b.box('ctPaint', 0.10, 0.014, 55.0, 14.20, 0.012, 0);
    /* 斑马线（横巷口 + 商店街口） */
    [-9.2, 5.2].forEach(function (z0) {
      for (let i = 0; i < 10; i++) {
        b.box('ctPaint', 0.62, 0.014, 0.44, 5.05 + i * 1.02, 0.013, z0);
      }
    });
    /* 停止线 */
    b.box('ctPaint', 10.6, 0.014, 0.18, 9.75, 0.013, -10.4);
    b.box('ctPaint', 10.6, 0.014, 0.18, 9.75, 0.013, 6.4);

    /* ---- 人行道 ---- */
    /* 主街西侧（贴 B / 广场），东侧（贴 C / F） */
    [[3.30, 1.30], [14.94, 1.14]].forEach(function (q, i) {
      b.box('ctWalk', q[1], 0.16, 55.0, q[0], 0.08, 0);
      for (let z = -26.5; z < 27.0; z += 0.78) {
        b.box('ctWalk2', q[1] - 0.04, 0.012, 0.036, q[0], 0.163, z);
      }
      const ex = q[0] + (i ? -1 : 1) * (q[1] / 2);
      b.box('ctCurb', 0.16, 0.22, 55.0, ex, 0.11, 0);
      /* ★ 路缘灯带：贴着马路牙子走的一条冷光。
         街道被楼挡住大半没关系 —— 只要这圈线露出来，
         俯视角就能读出「街网」，否则整座城就是一坨楼。 */
      b.box('ctNeonCd', 0.07, 0.05, 54.6, ex + (i ? -0.11 : 0.11), 0.175, 0);
    });

    /* 商店街（步行街）：铺砖 + 两侧收边 */
    const az0 = CT_ARC[0], az1 = CT_ARC[1];
    b.box('ctWalk', 33.0, 0.16, az1 - az0, -12.5, 0.08, (az0 + az1) / 2);
    for (let x = -28.6; x < 4.0; x += 0.82) {
      b.box('ctWalk2', 0.038, 0.012, az1 - az0 - 0.06, x, 0.163, (az0 + az1) / 2);
    }
    for (let z = az0 + 0.5; z < az1; z += 0.9) {
      b.box('ctWalk2', 32.9, 0.012, 0.034, -12.5, 0.163, z);
    }

    /* 横巷（沥青，脏一点）+ 两侧路缘灯带 */
    b.box('ctRoad3', 33.0, 0.14, CT_ALZ[1] - CT_ALZ[0], -12.5, 0.07, (CT_ALZ[0] + CT_ALZ[1]) / 2);
    b.box('ctNeonCd', 32.6, 0.05, 0.06, -12.5, 0.152, CT_ALZ[0] + 0.14);
    b.box('ctNeonCd', 32.6, 0.05, 0.06, -12.5, 0.152, CT_ALZ[1] - 0.14);
    /* 侧巷 */
    b.box('ctRoad3', CT_SID[1] - CT_SID[0], 0.14, 18.5, (CT_SID[0] + CT_SID[1]) / 2, 0.07, -18.25);
    b.box('ctNeonCd', 0.06, 0.05, 18.2, CT_SID[0] + 0.12, 0.152, -18.25);
    b.box('ctNeonCd', 0.06, 0.05, 18.2, CT_SID[1] - 0.12, 0.152, -18.25);

    /* 广场（B 以南 / 主街以西）：一块整铺装，给市集腾地方 */
    b.box('ctWalk', 15.5, 0.15, 11.0, -3.75, 0.075, 0.0);
    for (let x = -11.2; x < 4.0; x += 1.1) {
      b.box('ctWalk2', 0.03, 0.012, 10.9, x, 0.153, 0.0);
    }

    /* 井盖 / 雨水篦子 */
    [[7.6, -18.2, 0.36], [9.9, -3.0, 0.32], [6.4, 9.4, 0.34], [10.8, 17.5, 0.30],
     [-4.0, -2.4, 0.30], [-17.0, 2.6, 0.32], [16.5, 6.0, 0.30]].forEach(function (q) {
      b.cyl('ctPlate', q[2], q[2], 0.02, 14, q[0], 0.013, q[1]);
      b.torus('ctSteelD', q[2] * 0.86, 0.024, q[0], 0.024, q[1], Math.PI / 2, 0, 0);
    });
    for (let z = -25.0; z < 26.0; z += 3.4) {
      b.box('ctSteelD', 0.36, 0.03, 0.66, 4.9, 0.013, z);
      for (let k = 0; k < 4; k++) {
        b.box('ctPlate', 0.30, 0.02, 0.038, 4.9, 0.032, z - 0.24 + k * 0.155);
      }
    }

    b.build(g);
    return g;
  }

  /* ==================================================================
     外环扩展（city 专用）
     老城 64×60 的展台坐标一个不动，向外铺 134×124 的新底座。
     挖 L 形运河（西河 + 南湖），四片新区填内容，六座不同结构的桥
     把两岸接起来。水面比老城低 1.05 米，所有陆地垫到 y=0，
     于是老城/新区是浮在水上的台地，岸墙就是台地的侧面。
     ================================================================== */
  const CT_EX = {
    x0: -64, x1: 70, z0: -58, z1: 66,
    wy: -1.05, bed: -1.80,
    W: { x0: -46, x1: -34, z0: -54, z1: 50 },   // 西河（南北向，宽 12）
    S: { x0: -34, x1: 70,  z0: 32,  z1: 50 }    // 南湖（东西向，宽 18）
  };

  let _ctWTex = null, _ctRTex = null;
  function ctWaterTexOnce() {
    if (_ctWTex) return _ctWTex;
    _ctWTex = canvasTex(256, 256, function (c, w, h) {
      c.fillStyle = '#101f3c'; c.fillRect(0, 0, w, h);
      let s = 12345;
      function r() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
      for (let i = 0; i < 220; i++) {
        c.fillStyle = 'rgba(110,175,235,' + (0.05 + r() * 0.13).toFixed(3) + ')';
        c.fillRect(r() * w, r() * h, 8 + r() * 62, 0.6 + r() * 1.4);
      }
      for (let i = 0; i < 30; i++) {
        c.fillStyle = 'rgba(160,210,255,' + (0.02 + r() * 0.05).toFixed(3) + ')';
        c.fillRect(r() * w, r() * h, 1 + r() * 3, 1);
      }
    });
    _ctWTex.wrapS = _ctWTex.wrapT = T.RepeatWrapping;
    return _ctWTex;
  }
  function ctReflTexOnce() {
    if (_ctRTex) return _ctRTex;
    _ctRTex = canvasTex(256, 256, function (c, w, h) {
      c.clearRect(0, 0, w, h);
      const cols = ['255,45,122', '34,230,255', '255,210,63', '154,107,255', '255,110,60'];
      let s = 9876;
      function r() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
      for (let i = 0; i < 34; i++) {
        const x = r() * w, ww = 2 + r() * 11, col = cols[i % cols.length];
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(' + col + ',0)');
        g.addColorStop(0.18, 'rgba(' + col + ',' + (0.13 + r() * 0.20).toFixed(2) + ')');
        g.addColorStop(0.55, 'rgba(' + col + ',0.05)');
        g.addColorStop(1, 'rgba(' + col + ',0)');
        c.fillStyle = g; c.fillRect(x, 0, ww, h);
      }
    });
    _ctRTex.wrapS = _ctRTex.wrapT = T.RepeatWrapping;
    return _ctRTex;
  }
  function ctWSlab(x0, x1, z0, z1, g) {
    const t = ctWaterTexOnce().clone(); t.needsUpdate = true;
    t.repeat.set((x1 - x0) / 14, (z1 - z0) / 14);
    const m = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0),
      new T.MeshBasicMaterial({ map: t, color: 0xc8d8f0 }));
    m.rotation.x = -Math.PI / 2;
    m.position.set((x0 + x1) / 2, CT_EX.wy, (z0 + z1) / 2);
    g.add(m);
    /* 霓虹倒影：一整张加色贴图盖在水面上，比几十个亮片省 draw call */
    const rt = ctReflTexOnce().clone(); rt.needsUpdate = true;
    rt.repeat.set((x1 - x0) / 18, (z1 - z0) / 18);
    const r = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0),
      new T.MeshBasicMaterial({
        map: rt, transparent: true, opacity: 0.88,
        blending: T.AdditiveBlending, depthWrite: false, fog: false
      }));
    r.rotation.x = -Math.PI / 2;
    r.position.set((x0 + x1) / 2, CT_EX.wy + 0.016, (z0 + z1) / 2);
    r.renderOrder = 2;
    g.add(r);
  }
  function ctWGlow(x, z, sx, sz, color, op, rot) {
    const m = new T.Mesh(new T.PlaneGeometry(sx, sz), new T.MeshBasicMaterial({
      map: CY_GLOW, color: new T.Color(color), transparent: true, opacity: op,
      blending: T.AdditiveBlending, depthWrite: false, fog: false
    }));
    m.rotation.set(-Math.PI / 2, 0, rot || 0);
    m.position.set(x, CT_EX.wy + 0.034, z);
    m.renderOrder = 3;
    scene.add(m);
    return m;
  }

  /* 驳岸贴面：地台侧面本身是沥青色，贴一层石砌 + 压顶灯带才像河岸 */
  function ctQuayRun(b, x0, z0, x1, z1, seed) {
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz);
    const ry = Math.atan2(dx, dz);
    const n = Math.max(1, Math.round(L / 7));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const ax = x0 + dx * t0, az = z0 + dz * t0;
      const bx = x0 + dx * t1, bz = z0 + dz * t1;
      const cx = (ax + bx) / 2, cz = (az + bz) / 2, seg = L / n;
      ctBox(b, 'ctQuay', 0.62, 2.08, seg + 0.02, 0, -0.76, 0, cx, 0, cz, ry);
      ctBox(b, 'ctQuayD', 0.88, 0.16, seg + 0.02, 0, 0.30, 0, cx, 0, cz, ry);
      ctBox(b, 'ctQuayL', 0.10, 0.06, seg - 0.12, 0, 0.22, 0, cx, 0, cz, ry);
      if (i % 2 === 0) {
        ctBox(b, 'ctBol', 0.22, 0.36, 0.22, 0, 0.48, 0, cx, 0, cz, ry);
        ctBox(b, 'ctSteelD', 0.30, 0.05, 0.30, 0, 0.66, 0, cx, 0, cz, ry);
      }
      if (i % 3 === 1) {
        for (let k = 0; k < 5; k++) {
          ctBox(b, 'ctQuayD', 0.34, 0.10, 0.90,
            0.62 + k * 0.30, 0.22 - k * 0.34, 0, cx, 0, cz, ry);
        }
      }
    }
  }

  function ctLand(b, x0, x1, z0, z1, key) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    b.box('ctConcrete2', w, 1.80, d, cx, -0.90, cz);
    b.box(key || 'ctRoad3', w - 0.10, 0.04, d - 0.10, cx, 0.012, cz);
    b.box('ctCurb', w - 0.10, 0.06, 0.10, cx, 0.05, z0 + 0.06);
    b.box('ctCurb', w - 0.10, 0.06, 0.10, cx, 0.05, z1 - 0.06);
    b.box('ctNeonCd', w - 0.30, 0.04, 0.05, cx, 0.09, z0 + 0.14);
  }

  function buildCtExterior() {
    const g = new T.Group();
    const b = new Builder();
    const E = CT_EX, cX = (E.x0 + E.x1) / 2, cZ = (E.z0 + E.z1) / 2;
    /* 大底座：顶面 -1.80，正好托住老展台的底（-1.88） */
    b.box('ctRock', E.x1 - E.x0, 0.72, E.z1 - E.z0, cX, -2.16, cZ);
    b.box('ctRock2', E.x1 - E.x0 - 1.4, 0.22, E.z1 - E.z0 - 1.4, cX, -1.69, cZ);
    /* 展台外沿一圈收边灯，微缩模型的「托盘」感全靠这条线 */
    b.box('ctNeonCd', E.x1 - E.x0 - 1.0, 0.05, 0.06, cX, -1.55, E.z0 + 0.5);
    b.box('ctNeonCd', E.x1 - E.x0 - 1.0, 0.05, 0.06, cX, -1.55, E.z1 - 0.5);

    ctWSlab(E.W.x0, E.W.x1, E.W.z0, E.W.z1, g);
    ctWSlab(E.S.x0, E.S.x1, E.S.z0, E.S.z1, g);

    /* 陆地：严格避开两块水面，边界相切不重叠 */
    ctLand(b, -64, -46, -54, 50, 'ctRoad3');   // 西新区 · 集装箱港
    ctLand(b, -64, -34, 50, 66, 'ctWalk');     // 西南岸
    ctLand(b, -34, 70, 50, 66, 'ctWalk');      // 南岸灯市
    ctLand(b, -30, 34, -58, -32, 'ctRoad3');   // 北新区
    ctLand(b, 34, 70, -58, -32, 'ctRoad3');    // 东北
    ctLand(b, 38, 70, -32, 28, 'ctRoad3');     // 东新区
    ctLand(b, -34, -30, -54, 28, 'ctWalk');    // 西岸步道 + 西北连接
    ctLand(b, -34, 70, 28, 32, 'ctWalk');      // 南岸步道
    ctLand(b, 34, 38, -32, 28, 'ctWalk');      // 东岸连接

    /* 驳岸 */
    ctQuayRun(b, -46, -54, -46, 50, 11);
    ctQuayRun(b, -34, -54, -34, 32, 13);
    ctQuayRun(b, -34, 32, 70, 32, 17);
    ctQuayRun(b, -64, 50, -46, 50, 19);
    ctQuayRun(b, -34, 50, 70, 50, 23);
    ctQuayRun(b, -46, -54, -34, -54, 29);
    ctQuayRun(b, 70, 32, 70, 50, 31);

    /* 水波纹：几百条细亮线合批成一个 mesh，不逐个建对象 */
    const rnd = ctRnd(20261106);
    function ripples(x0, x1, z0, z1, n) {
      for (let i = 0; i < n; i++) {
        const x = x0 + 0.8 + rnd() * (x1 - x0 - 1.6);
        const z = z0 + 0.8 + rnd() * (z1 - z0 - 1.6);
        b.box('ctWaterRip', 0.8 + rnd() * 3.4, 0.012, 0.05 + rnd() * 0.07,
          x, CT_EX.wy + 0.024, z, 0, (rnd() - 0.5) * 0.9, 0);
      }
    }
    ripples(E.W.x0, E.W.x1, E.W.z0, E.W.z1, 130);
    ripples(E.S.x0, E.S.x1, E.S.z0, E.S.z1, 170);

    /* 浮标灯：沿岸每隔十米一对，只给一半配光晕 */
    let bi = 0;
    function buoy(x, z) {
      b.cyl('ctSteelD', 0.11, 0.15, 0.55, 6, x, CT_EX.wy + 0.16, z);
      b.sph('ctLantern', 0.15, x, CT_EX.wy + 0.50, z);
      if (bi++ % 2 === 0) ctGlow(x, CT_EX.wy + 0.55, z, 0xffb45a, 2.4, 0.16);
    }
    for (let z = -48; z <= 28; z += 10) { buoy(-44.4, z); buoy(-35.4, z); }
    for (let x = -28; x <= 66; x += 10) { buoy(x, 33.6); buoy(x, 48.4); }

    /* 岸边霓虹在水里的局部倒影：贴图给大面，亮片给节奏 */
    const cols = [0xff2d7a, 0x22e6ff, 0xffd23f, 0x9a6bff];
    let k = 0;
    for (let z = -46; z < 28; z += 9) ctWGlow(-36.6, z, 2.8, 6.2, cols[k++ % 4], 0.30, Math.PI / 2);
    for (let x = -28; x < 68; x += 9) ctWGlow(x, 35.4, 2.6, 5.8, cols[k++ % 4], 0.28, 0);

    /* 西河北端水闸：两扇闸板 + 发光格栅，给水系一个「源头」 */
    b.box('ctQuayD', 12.4, 0.50, 0.9, -40, 0.25, -53.6);
    for (let i = 0; i < 9; i++) b.box('ctSteel', 0.16, 2.5, 0.22, -45.2 + i * 1.3, -0.25, -53.6);
    b.box('ctWaterRip', 11.6, 0.07, 0.10, -40, -0.86, -53.1);
    ctGlow(-40, 0.9, -53.0, 0x22e6ff, 7.0, 0.18);

    b.build(g);
    return g;
  }

  /* ================= 六座跨水结构 =================
     一条水系如果只配一座桥，读起来还是「一条沟」。六座桥六种结构，
     而且必须分高低：拱桥 0.85 / 太鼓 0.7 / 轻轨 5.4 / 斜拉 1.1 /
     玻璃廊桥 3.2 / 浮桥 -0.6，俯视才看得出层次。 */
  function ctArchBridge(b, x0, x1, z, y, w) {
    const len = x1 - x0, n = 14, cx = (x0 + x1) / 2, rise = 1.55;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const xa = x0 + len * t0, xb = x0 + len * t1;
      const ya = y + rise * Math.sin(Math.PI * t0), yb = y + rise * Math.sin(Math.PI * t1);
      const sl = Math.hypot(xb - xa, yb - ya), ang = Math.atan2(yb - ya, xb - xa);
      const mx = (xa + xb) / 2, my = (ya + yb) / 2;
      b.box('ctDeck2', sl + 0.04, 0.30, w, mx, my, z, 0, 0, ang);
      b.box('ctSteelD', sl + 0.04, 0.10, w + 0.26, mx, my - 0.20, z, 0, 0, ang);
      b.box('ctPaint', sl * 0.46, 0.02, 0.12, mx, my + 0.17, z, 0, 0, ang);
    }
    [-w / 2 - 0.18, w / 2 + 0.18].forEach(function (off) {
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        const xa = x0 + len * t0, xb = x0 + len * t1;
        const ya = y + 1.0 + rise * 1.55 * Math.sin(Math.PI * t0);
        const yb = y + 1.0 + rise * 1.55 * Math.sin(Math.PI * t1);
        b.to('ctArch', 0.13, xa, ya, z + off, xb, yb, z + off, 6);
        if (i % 2 === 0) {
          b.to('ctCable2', 0.035, xa, ya, z + off,
            xa, y + rise * Math.sin(Math.PI * t0) + 0.22, z + off, 4);
        }
      }
    });
    [x0, x1].forEach(function (x) {
      b.cyl('ctSteel', 0.09, 0.12, 3.2, 6, x, y + 1.6, z - w / 2 - 0.34);
      b.sph('ctLantern', 0.22, x, y + 3.2, z - w / 2 - 0.34);
      ctGlow(x, y + 3.2, z - w / 2 - 0.34, 0xffcf8a, 3.0, 0.20);
    });
    ctNeonBar(cx, y - 0.44, z, len - 0.6, 0.16, 0.16, 0x2fe8ff, 0.55, 0);
  }

  function ctTaiko(b, x0, x1, z, w) {
    const len = x1 - x0, n = 12, rise = 2.15, y = 0.70;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const xa = x0 + len * t0, xb = x0 + len * t1;
      const ya = y + rise * Math.sin(Math.PI * t0), yb = y + rise * Math.sin(Math.PI * t1);
      const sl = Math.hypot(xb - xa, yb - ya), ang = Math.atan2(yb - ya, xb - xa);
      b.box('ctTorii', sl + 0.05, 0.22, w, (xa + xb) / 2, (ya + yb) / 2, z, 0, 0, ang);
      b.box('ctRedD', sl + 0.05, 0.08, w + 0.12, (xa + xb) / 2, (ya + yb) / 2 - 0.15, z, 0, 0, ang);
    }
    [-w / 2, w / 2].forEach(function (off) {
      for (let i = 0; i <= n; i++) {
        const t = i / n, xx = x0 + len * t, yy = y + rise * Math.sin(Math.PI * t);
        b.box('ctTorii', 0.10, 0.82, 0.10, xx, yy + 0.44, z + off);
      }
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        b.to('ctTorii', 0.055,
          x0 + len * t0, y + rise * Math.sin(Math.PI * t0) + 0.84, z + off,
          x0 + len * t1, y + rise * Math.sin(Math.PI * t1) + 0.84, z + off, 4);
      }
    });
    for (let i = 1; i < n; i += 3) {
      const t = i / n, xx = x0 + len * t, yy = y + rise * Math.sin(Math.PI * t);
      b.sph('ctLantern', 0.20, xx, yy + 1.25, z - w / 2 - 0.1);
      ctGlow(xx, yy + 1.25, z - w / 2 - 0.1, 0xff7a4a, 2.2, 0.18);
    }
    ctNeonBar((x0 + x1) / 2, 0.26, z, len - 1.0, 0.10, 0.10, 0xff4d6a, 0.42, 0);
  }

  function ctCableStay(b, x, z0, z1, y, w) {
    const len = z1 - z0, n = 16, cz = (z0 + z1) / 2;
    for (let i = 0; i < n; i++) {
      b.box('ctDeck2', w, 0.28, len / n + 0.03, x, y, z0 + len * (i + 0.5) / n);
    }
    b.box('ctSteelD', w + 0.34, 0.12, len, x, y - 0.22, cz);
    b.box('ctPaint', 0.12, 0.02, len - 0.6, x, y + 0.16, cz);
    [0.28, 0.72].forEach(function (cf) {
      const tz = z0 + len * cf;
      [-w / 2 - 0.55, w / 2 + 0.55].forEach(function (px) {
        b.box('ctSteel', 0.80, 11.5, 0.80, px, y + 5.75, tz);
      });
      b.box('ctSteelD', w + 2.3, 0.50, 0.92, x, y + 11.0, tz);
      b.box('ctTail', 0.18, 0.18, 0.18, x, y + 11.6, tz);
      /* 每侧只拉 3 根，塔也压矮。10 根自发光索在俯视下会叠成
         两坨实心三角形，看着像两棵圣诞树，完全不像斜拉桥。 */
      for (let i = 1; i <= 3; i++) {
        const f = i / 4;
        [cf - f * 0.26, cf + f * 0.26].forEach(function (ff) {
          if (ff < 0.02 || ff > 0.98) return;
          b.to('ctCable2', 0.026, x, y + 11.0, tz, x, y + 0.30, z0 + len * ff, 4);
        });
      }
    });
    ctNeonBar(x, y - 0.42, cz, 0.16, 0.16, len - 0.6, 0xff2d7a, 0.50, 0);
    ctGlow(x, y + 11.6, z0 + len * 0.28, 0xff2d7a, 4.2, 0.16);
    ctGlow(x, y + 11.6, z0 + len * 0.72, 0xff2d7a, 4.2, 0.16);
  }

  function ctPontoon(b, x, z0, z1, w) {
    const len = z1 - z0, n = Math.round(len / 1.6);
    for (let i = 0; i < n; i++) {
      const z = z0 + len * (i + 0.5) / n;
      b.box('ctFloat', w, 0.20, len / n - 0.07, x, -0.58, z);
      b.cyl('ctPier', 0.26, 0.26, 0.52, 8, x - w / 2 + 0.18, -0.88, z);
      b.cyl('ctPier', 0.26, 0.26, 0.52, 8, x + w / 2 - 0.18, -0.88, z);
      if (i % 3 === 0) {
        b.box('ctSteelD', 0.07, 0.80, 0.07, x - w / 2, -0.10, z);
        b.box('ctSteelD', 0.07, 0.80, 0.07, x + w / 2, -0.10, z);
      }
    }
    [z0, z1].forEach(function (z, qi) {
      for (let k = 0; k < 4; k++) {
        b.box('ctQuayD', w, 0.14, 0.36, x, -0.44 + k * 0.16, z + (qi ? -0.18 - k * 0.36 : 0.18 + k * 0.36));
      }
    });
    ctNeonBar(x - w / 2, -0.42, (z0 + z1) / 2, 0.08, 0.08, len, 0x22e6ff, 0.40, 0);
    ctNeonBar(x + w / 2, -0.42, (z0 + z1) / 2, 0.08, 0.08, len, 0x22e6ff, 0.40, 0);
  }

  function ctMonoBridge(b, x0, x1, z, y) {
    const len = x1 - x0, cx = (x0 + x1) / 2;
    b.box('ctMono', len, 0.55, 1.60, cx, y, z);
    b.box('ctRail', len, 0.10, 0.20, cx, y + 0.34, z - 0.44);
    b.box('ctRail', len, 0.10, 0.20, cx, y + 0.34, z + 0.44);
    for (let i = 0; i <= 8; i++) {
      const x = x0 + len * i / 8;
      b.box('ctSteelD', 0.14, 2.6, 0.14, x, y + 1.3, z - 0.86);
      b.box('ctSteelD', 0.14, 2.6, 0.14, x, y + 1.3, z + 0.86);
      b.box('ctMonoD', 1.9, 0.12, 0.12, x, y + 2.6, z);
      if (i % 2 === 0) {
        b.to('ctSteelD', 0.045, x, y + 0.28, z - 0.86, x, y + 2.6, z + 0.86, 4);
      }
    }
    /* 河心两根桥墩，一直扎到河床 */
    [-42, -38].forEach(function (x) {
      b.cyl('ctPier', 0.42, 0.55, y - CT_EX.bed - 0.2, 8, x, (y + CT_EX.bed) / 2 - 0.1, z);
      b.box('ctQuayD', 1.5, 0.28, 2.2, x, CT_EX.bed + 0.14, z);
    });
    ctNeonBar(cx, y - 0.40, z, len - 0.4, 0.14, 0.14, 0xffd23f, 0.48, 0);
  }

  function buildCtSpanBridges() {
    const g = new T.Group();
    const b = new Builder();
    /* 西河：车行拱桥 / 太鼓人行桥 / 轻轨桁架桥 */
    ctArchBridge(b, -48, -30, -18, 0.85, 4.6);
    ctTaiko(b, -48, -30, 7, 3.0);
    ctMonoBridge(b, -48, -30, 24, 5.4);
    /* 南湖：斜拉桥 / 开敞桁架桥 / 浮桥
       中间那座原来用 glass 天桥，不透明顶板从俯视把 18 米宽的水面
       切成一条实心紫带 —— 跨水的桥必须能透下去，一律改开敞桁架。 */
    ctCableStay(b, -24, 28, 52, 1.10, 3.8);
    ctBridge(b, 30, 28, 30, 52, 2.60, 3.0, 2.2, 'truss');
    [[30, 28], [30, 52]].forEach(function (q) {
      b.cyl('ctSteel', 0.20, 0.26, 2.6, 8, q[0], 1.30, q[1]);
      b.box('ctQuayD', 1.2, 0.24, 1.2, q[0], 0.12, q[1]);
    });
    ctPontoon(b, 52, 30, 52, 2.8);
    /* 斜拉桥两端引桥的护栏 */
    [-24].forEach(function (x) {
      [28.4, 51.6].forEach(function (z) {
        b.box('ctSteelD', 0.12, 0.90, 0.12, x - 2.6, 1.55, z);
        b.box('ctSteelD', 0.12, 0.90, 0.12, x + 2.6, 1.55, z);
      });
    });
    b.build(g);
    return g;
  }

  /* ================= 新区内容 ================= */
  function ctFarmTower(b, x, z, h) {
    b.cyl('ctSteelD', 0.62, 0.80, h, 10, x, h / 2, z);
    for (let i = 0; i < 6; i++) {
      const y = 3.0 + i * (h - 4.0) / 5, R = 3.4 - i * 0.22;
      b.cyl('ctFarm', R, R, 0.24, 14, x, y, z);
      b.torus('ctFarmG', R - 0.12, 0.10, x, y + 0.16, z, Math.PI / 2, 0, 0);
      for (let j = 0; j < 8; j++) {
        const a = j / 8 * Math.PI * 2;
        b.box('ctFarmG', 0.30, 0.55, 0.30,
          x + Math.cos(a) * (R - 0.55), y + 0.42, z + Math.sin(a) * (R - 0.55));
      }
    }
    b.cyl('ctCrown', 0.10, 1.0, 1.6, 8, x, h + 0.8, z);
    ctGlow(x, h * 0.62, z, 0x64ff9c, 9.0, 0.16);
  }

  function ctTorii(b, x, z, s) {
    const H = 6.2 * s, W = 7.4 * s;
    [-W / 2, W / 2].forEach(function (dx) {
      b.cyl('ctTorii', 0.30 * s, 0.40 * s, H, 10, x + dx, CT_EX.wy + H / 2, z);
      b.cyl('ctSteelD', 0.48 * s, 0.52 * s, 0.30, 10, x + dx, CT_EX.wy + 0.15, z);
    });
    b.box('ctTorii', W + 2.5 * s, 0.52 * s, 0.72 * s, x, CT_EX.wy + H - 0.10, z);
    b.box('ctRedD', W + 3.1 * s, 0.20 * s, 0.90 * s, x, CT_EX.wy + H + 0.28 * s, z);
    b.box('ctTorii', W + 0.5 * s, 0.34 * s, 0.50 * s, x, CT_EX.wy + H - 1.5 * s, z);
    for (let i = -2; i <= 2; i++) {
      b.box('ctLantern', 0.34 * s, 0.60 * s, 0.34 * s,
        x + i * 1.35 * s, CT_EX.wy + H - 0.9 * s, z);
    }
    ctGlow(x, CT_EX.wy + H - 0.6 * s, z, 0xff3b3b, 10.0 * s, 0.20);
    for (let i = -1; i <= 1; i++) {
      ctWGlow(x + i * 2.0 * s, z + 2.2, 1.8 * s, 7.0, 0xff3b3b, 0.30, 0);
    }
  }

  function ctCrane(b, x, z, seed) {
    const H = 12.0;
    [-3.2, 3.2].forEach(function (dx) {
      [-2.2, 2.2].forEach(function (dz) {
        b.box('ctCrane', 0.42, H, 0.42, x + dx, H / 2, z + dz);
      });
    });
    b.box('ctCrane', 7.4, 0.55, 0.55, x, H, z - 2.2);
    b.box('ctCrane', 7.4, 0.55, 0.55, x, H, z + 2.2);
    b.box('ctSteelD', 7.8, 0.30, 5.0, x, H + 0.42, z);
    /* 吊臂伸出水面 + 两根拉索 + 吊具 */
    b.box('ctCrane', 7.0, 0.40, 0.40, x + 3.6, H - 1.2, z);
    b.to('ctCable2', 0.045, x, H + 2.0, z, x + 7.0, H - 1.0, z, 4);
    b.to('ctCable2', 0.045, x, H - 1.0, z, x + 6.4, H - 1.0, z, 4);
    b.to('ctCable2', 0.035, x + 6.4, H - 1.0, z, x + 6.4, 4.2, z, 4);
    b.box('ctCont4', 2.4, 0.55, 1.2, x + 6.4, 3.9, z);
    b.box('ctTail', 0.14, 0.14, 0.14, x, H + 0.8, z);
    ctGlow(x, H + 0.8, z, 0xffd23f, 4.0, 0.18);
  }

  function ctContainer(b, x, z, key, ry, y) {
    b.box(key, 2.5, 1.15, 1.15, x, (y || 0) + 0.58, z, 0, ry || 0, 0);
    for (let i = -1; i <= 1; i++) {
      b.box('ctSteelD', 0.06, 1.05, 1.18, x + i * 0.8, (y || 0) + 0.58, z, 0, ry || 0, 0);
    }
  }

  function ctFerrisWheel(b, g, x, z, R, cy) {
    /* 立在水上的摩天轮：支座扎到水面，轮子单独成组才能转 */
    [-3.6, 3.6].forEach(function (dx) {
      [-2.8, 2.8].forEach(function (dz) {
        b.to('ctSteel', 0.38, x + dx, CT_EX.wy + 0.1, z + dz, x, cy, z, 8);
        b.box('ctQuayD', 1.6, 0.40, 1.6, x + dx, CT_EX.wy + 0.20, z + dz);
      });
    });
    b.box('ctSteelD', 0.70, 0.70, 6.2, x, cy, z);
    const wb = new Builder();
    /* 轮面在 YZ 平面：torus 默认 XY，绕 y 转 90°。
       外圈再套一道霓虹，不然深紫夜空里轮圈就是一圈黑线。 */
    wb.torus('ctFerris', R, 0.30, 0, 0, 0, 0, Math.PI / 2, 0);
    wb.torus('ctFerris', R * 0.70, 0.14, 0, 0, 0, 0, Math.PI / 2, 0);
    wb.torus('ctNeonC', R + 0.16, 0.11, 0, 0, 0, 0, Math.PI / 2, 0);
    wb.torus('ctNeonM', R - 0.20, 0.06, 0, 0, 0, 0, Math.PI / 2, 0);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      const yy = Math.sin(a) * R, zz = Math.cos(a) * R;
      wb.to('ctSteelD', 0.055, 0, 0, 0, 0, yy, zz, 5);
      wb.box('ctSteelD', 0.10, 0.52, 0.10, 0, yy + 0.62, zz);
      wb.box('ctFerrisC', 1.15, 0.82, 1.22, 0, yy + 0.05, zz);
      wb.box('ctNeonM', 1.18, 0.07, 0.07, 0, yy + 0.50, zz + 0.62);
    }
    const wheel = new T.Group();
    wb.build(wheel, { noOutline: ['ctFerrisC', 'ctNeonM', 'ctNeonC'] });
    wheel.position.set(x, cy, z);
    g.add(wheel);
    CT_ANIM.push(function (t) { wheel.rotation.x = t * 0.052; });
    ctGlow(x, cy + R + 1.0, z, 0x22e6ff, 13.0, 0.18);
    ctGlow(x, cy - R * 0.5, z, 0xff2d7a, 10.0, 0.14);
    for (let i = -1; i <= 1; i++) {
      ctWGlow(x + i * 2.2, z, 2.0, R * 1.8, i ? 0xff2d7a : 0x22e6ff, 0.26, 0);
    }
  }

  function ctMonoLine(b, ax, az, bx, bz, y) {
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    const alongX = Math.abs(dx) > Math.abs(dz);
    const cx = (ax + bx) / 2, cz = (az + bz) / 2;
    if (alongX) {
      b.box('ctMono', L, 0.55, 1.60, cx, y, cz);
      b.box('ctRail', L, 0.10, 0.20, cx, y + 0.34, cz - 0.44);
      b.box('ctRail', L, 0.10, 0.20, cx, y + 0.34, cz + 0.44);
    } else {
      b.box('ctMono', 1.60, 0.55, L, cx, y, cz);
      b.box('ctRail', 0.20, 0.10, L, cx - 0.44, y + 0.34, cz);
      b.box('ctRail', 0.20, 0.10, L, cx + 0.44, y + 0.34, cz);
    }
    const n = Math.max(2, Math.round(L / 6));
    for (let i = 0; i <= n; i++) {
      const f = i / n, px = ax + dx * f, pz = az + dz * f;
      if (alongX) {
        b.cyl('ctPier', 0.32, 0.42, y - 0.4, 8, px, (y - 0.4) / 2, pz);
        b.box('ctQuayD', 1.2, 0.22, 1.2, px, 0.11, pz);
      } else {
        b.cyl('ctPier', 0.32, 0.42, y - 0.4, 8, px, (y - 0.4) / 2, pz);
        b.box('ctQuayD', 1.2, 0.22, 1.2, px, 0.11, pz);
      }
    }
    b.box('ctNeonCd', alongX ? L : 0.06, 0.05, alongX ? 0.06 : L,
      cx, y - 0.32, cz);
  }

  function ctStallRow(b, x0, x1, z, seed) {
    const n = Math.round((x1 - x0) / 6.2);
    const rnd = ctRnd(seed || 5);
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + 0.5) * (x1 - x0) / n;
      const k = CT_AWNK[i % CT_AWNK.length];
      const yy = 1.85 + rnd() * 0.25;
      b.box('ctWoodD', 3.4, 0.12, 2.0, x, 0.86, z);
      [[-1.6, -0.9], [1.6, -0.9], [-1.6, 0.9], [1.6, 0.9]].forEach(function (q) {
        b.box('ctWoodD', 0.10, 0.86, 0.10, x + q[0], 0.43, z + q[1]);
      });
      b.box(k, 3.8, 0.10, 2.4, x, yy, z);
      b.box('ctSteelD', 0.06, 0.42, 2.42, x - 1.9, yy - 0.22, z);
      b.box('ctSteelD', 0.06, 0.42, 2.42, x + 1.9, yy - 0.22, z);
      b.box('ctFoam', 0.9, 0.42, 0.7, x - 0.8, 1.13, z);
      b.box('ctCrate3', 0.8, 0.44, 0.7, x + 0.7, 1.14, z);
      b.sph('ctLantern', 0.18, x, yy - 0.42, z + 1.0);
      if (i % 2 === 0) ctGlow(x, yy - 0.4, z + 1.0, 0xffb45a, 2.6, 0.18);
    }
  }

  function buildCtNewTown() {
    const g = new T.Group();
    const b = new Builder();

    /* ---- 北新区：高架单轨 + 垂直农场 + 造型塔群 ---- */
    ctMonoLine(b, -28, -34.5, 52, -34.5, 11.6);
    ctMonoLine(b, 52, -34.5, 52, 26, 11.6);
    /* 两座车站：站台 + 顶棚 + 发光站牌 */
    [[2, -34.5, '北', 0x22e6ff], [52, -6, '東', 0xff2d7a]].forEach(function (q) {
      b.box('ctWalk', 9.0, 0.30, 3.6, q[0], 11.9, q[1]);
      b.box('ctSteelD', 9.6, 0.20, 4.2, q[0], 13.9, q[1]);
      [[-4.4, -1.8], [4.4, -1.8], [-4.4, 1.8], [4.4, 1.8]].forEach(function (p) {
        b.box('ctSteel', 0.16, 2.0, 0.16, q[0] + p[0], 12.9, q[1] + p[1]);
      });
      b.box('ctSignBox', 3.2, 0.70, 0.16, q[0], 12.9, q[1] + 1.9);
      ctSign(q[2] + '駅', q[3], q[0], 12.9, q[1] + 2.0, 2.9, 0.60, 0, false, 1);
      ctGlow(q[0], 12.9, q[1] + 2.1, q[3], 5.0, 0.18);
    });
    ctFarmTower(b, -18, -48, 22);
    ctArtCyl(b,   { x: -24, z: -43, w: 7.4, d: 7.4, h: 25, seed: 211 });
    ctArtTwin(b,  { x: 4,   z: -44, w: 11.0, d: 8.0, h: 29, seed: 223 });
    ctArtWedge(b, { x: 24,  z: -43, w: 7.0, d: 8.2, h: 21, seed: 227 });
    ctArtFrame(b, { x: 32,  z: -50, w: 7.6, d: 7.0, h: 26, seed: 229 });
    /* 东北：冷却塔 + 两根远景塔，避免角落空着 */
    ctArtFar(b, 44, -46, 8.0, 7.0, 24, 233, 'cyl');
    ctArtFar(b, 60, -46, 7.6, 7.0, 29, 239, 'hex');
    b.cyl('ctConcrete2', 3.4, 4.6, 6.4, 14, 62, 3.2, -34);
    b.torus('ctNeonC', 3.5, 0.12, 62, 6.4, -34, Math.PI / 2, 0, 0);
    ctGlow(62, 6.8, -34, 0x22e6ff, 7.0, 0.16);

    /* ---- 东新区：造型塔群 + 滨水店街 ---- */
    /* 摩天轮改立在南湖东段水面上：放楼群里会被前后两栋塔夹成一条缝，
       从全景完全看不见。水上才有完整的圆和倒影。 */
    b.cyl('ctWalk', 5.4, 5.4, 0.16, 20, 60, 0.08, -10);
    b.torus('ctNeonM', 5.2, 0.10, 60, 0.18, -10, Math.PI / 2, 0, 0);
    b.cyl('ctCore', 0.55, 0.85, 5.0, 10, 60, 2.6, -10);
    ctGlow(60, 5.2, -10, 0x22e6ff, 8.0, 0.18);
    ctArtHelix(b,   { x: 44, z: -22, w: 8.0, d: 8.0, h: 30, seed: 241 });
    ctArtNeedle(b,  { x: 64, z: -24, w: 8.4, d: 8.4, h: 40, seed: 251 });
    ctArtVoid(b,    { x: 43, z: 10,  w: 8.0, d: 8.6, h: 21, seed: 257 });
    ctArtStagger(b, { x: 63, z: 12,  w: 7.6, d: 8.0, h: 23, seed: 263 });
    /* 滨水一层小店：贴南湖北岸，别高过老城前景 */
    for (let i = 0; i < 5; i++) {
      const x = 40 + i * 6.0;
      b.box(i % 2 ? 'ctT3' : 'ctT5', 5.0, 3.6 + (i % 3) * 0.9, 4.4, x, 2.0 + (i % 3) * 0.45, 25.0);
      b.box('ctShopW', 3.8, 1.5, 0.10, x, 1.8, 22.76);
      ctRim(b, x, 25.0, 5.0, 4.4, 3.9 + (i % 3) * 0.9, i % 2 ? 'ctNeonM' : 'ctNeonC', 0.12);
      b.sph('ctLantern', 0.20, x - 1.8, 3.4, 22.6);
      b.sph('ctLantern', 0.20, x + 1.8, 3.4, 22.6);
    }

    /* ---- 西新区：集装箱港 ---- */
    ctCrane(b, -56, -30, 271);
    ctCrane(b, -56, 12, 277);
    const ck = ['ctCont1', 'ctCont2', 'ctCont3', 'ctCont4', 'ctCont5'];
    for (let row = 0; row < 14; row++) {
      const z = -50 + row * 6.8;
      for (let j = 0; j < 4; j++) {
        const x = -61.2 + j * 2.9;
        ctContainer(b, x, z, ck[(row + j) % 5], 0, 0);
        if ((row + j) % 3 === 0) ctContainer(b, x, z, ck[(row + j + 2) % 5], 0, 1.18);
      }
    }
    /* 堆场标线 + 灯柱 + 三辆集卡：18×86 的空地不填就成了停机坪 */
    for (let z = -50; z <= 40; z += 6.8) {
      b.box('ctPaint', 12.6, 0.014, 0.06, -56.0, 0.026, z + 2.9);
    }
    for (let z = -48; z <= 38; z += 14) {
      b.cyl('ctSteel', 0.10, 0.14, 7.0, 6, -47.2, 3.5, z);
      b.box('ctLampGlow', 1.1, 0.24, 0.5, -47.2, 7.0, z);
      ctGlow(-47.2, 7.0, z, 0xffd9a0, 5.0, 0.16);
    }
    [[-58, -20], [-55, -4], [-59, 26]].forEach(function (q, i) {
      b.box('ctSteelD', 2.0, 0.55, 3.6, q[0], 0.42, q[1]);
      b.box(['ctCont2', 'ctCont4', 'ctCont1'][i], 1.9, 1.2, 2.2, q[0], 1.28, q[1] - 0.4);
      b.box('ctTail', 0.16, 0.14, 0.10, q[0], 0.55, q[1] + 1.85);
    });
    /* 两栋仓库 + 港招牌 */
    [-42, 20].forEach(function (z, i) {
      b.box('ctT3', 12.0, 5.2, 8.0, -57, 2.6, z);
      b.box('ctTile', 12.6, 0.30, 8.6, -57, 5.3, z);
      b.box('ctShopW', 5.0, 2.0, 0.10, -57, 2.4, z - 4.06);
      ctRim(b, -57, z, 12.0, 8.0, 5.4, i ? 'ctNeonC' : 'ctNeonM', 0.12);
    });
    ctSign('港', 0xffd23f, -46.1, 6.0, -6.0, 1.4, 3.0, Math.PI / 2, true, 1);
    ctGlow(-46.0, 6.0, -6.0, 0xffd23f, 7.0, 0.20);

    /* ---- 南岸：灯市 + 大鸟居 + 水上舞台 + 水上摩天轮 ---- */
    ctStallRow(b, -60, 68, 58, 281);
    ctFerrisWheel(b, g, 62, 41, 8.8, 9.2);
    ctTorii(b, 8, 41, 2.2);
    /* 圆形浮台：一圈浮筒 + 环形灯 + 中央全息柱 */
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      b.cyl('ctPier', 0.42, 0.42, 0.8, 8,
        36 + Math.cos(a) * 4.2, CT_EX.wy + 0.1, 41 + Math.sin(a) * 4.2);
    }
    b.cyl('ctFloat', 4.4, 4.4, 0.28, 18, 36, CT_EX.wy + 0.34, 41);
    b.torus('ctNeonC', 4.2, 0.10, 36, CT_EX.wy + 0.50, 41, Math.PI / 2, 0, 0);
    b.cyl('ctCore', 0.50, 0.80, 6.0, 10, 36, CT_EX.wy + 3.4, 41);
    ctGlow(36, CT_EX.wy + 6.6, 41, 0x22e6ff, 9.0, 0.20);
    /* 南岸背后几栋矮楼：一栋一尺寸一塔冠，等距同形会读成一排积木 */
    const SB = [
      [-58, 62.2, 9.0, 6.0, 4.2, 'ctT2', 'step'],
      [-47, 61.2, 6.8, 7.2, 6.2, 'ctT4', 'blade'],
      [-36, 62.6, 11.0, 5.4, 3.6, 'ctT3', 'blade'],
      [-22, 61.0, 8.0, 8.0, 7.4, 'ctT5', 'disc'],
      [-9, 62.4, 6.5, 6.0, 4.8, 'ctT1', 'spire'],
      [4, 61.2, 11.0, 6.6, 5.6, 'ctT2', 'frame'],
      [18, 62.6, 7.5, 7.0, 3.8, 'ctT4', 'step'],
      [32, 61.0, 9.5, 6.0, 6.8, 'ctT3', 'step'],
      [46, 62.4, 8.0, 8.0, 4.4, 'ctT5', 'pyramid'],
      [60, 61.2, 10.0, 6.4, 5.2, 'ctT1', 'frame']
    ];
    SB.forEach(function (q, i) {
      const x = q[0], z = q[1], w = q[2], d = q[3], h = q[4];
      b.box(q[5], w, h, d, x, h / 2, z);
      ctFacadeOn(x, z, w, d, 0, h - 0.2, 300 + i * 7, i % 3, 0.45, 0.62);
      ctRim(b, x, z, w, d, h + 0.05, i % 2 ? 'ctNeonMd' : 'ctNeonCd', 0.10);
      ctCrown(b, x, z, w, d, h, q[6], 311 + i);
      b.box('ctWoodD', w * 0.72, 0.14, 1.5, x, 2.45, z - d / 2 - 0.7);
      b.box('ctShopW', w * 0.42, 0.62, 0.10, x, 2.05, z - d / 2 - 0.06);
    });
    /* 南岸前缘：栏杆 + 灯柱 + 铺装分隔线，把 16 米深的空地填出尺度 */
    for (let x = -62; x <= 68; x += 3.2) b.box('ctSteelD', 0.07, 1.0, 0.07, x, 0.50, 51.0);
    b.box('ctSteelD', 130.0, 0.06, 0.06, 3.0, 0.98, 51.0);
    for (let x = -58; x <= 66; x += 8) {
      b.cyl('ctSteel', 0.08, 0.11, 3.4, 6, x, 1.70, 54.6);
      b.sph('ctLantern', 0.22, x, 3.45, 54.6);
      if ((x + 58) % 16 === 0) ctGlow(x, 3.45, 54.6, 0xffb45a, 3.2, 0.16);
    }
    for (let x = -60; x <= 66; x += 2.6) b.box('ctWalk2', 0.04, 0.012, 12.0, x, 0.035, 58.0);
    /* 南岸灯笼串 */
    for (let x = -60; x <= 68; x += 2.4) {
      b.box('ctCable', 2.4, 0.03, 0.03, x + 1.2, 3.1, 52.6);
      b.sph('ctLantern', 0.16, x, 2.92, 52.6);
    }

    b.build(g);
    return g;
  }

  /* ================= 扩展区的动态生命 =================
     列车 / 驳船 / 新桥车流 / 行人 / 摩天轮（轮子在上面的组里转）。
     移动单元一律独立成 T.Group，绝不进 Builder 的合并池。 */
  function ctTrainUnit() {
    const g = new T.Group();
    const b = new Builder();
    /* 三节车厢沿局部 +z 排开 */
    for (let i = 0; i < 3; i++) {
      const z = (i - 1) * 2.45;
      b.box('ctTrain', 1.7, 1.5, 2.25, 0, 1.18, z);
      b.box('ctTrainW', 1.42, 0.52, 2.05, 0, 1.35, z);
      b.box('ctSteelD', 1.76, 0.18, 2.30, 0, 0.50, z);
      b.box('ctNeonM', 0.10, 0.12, 2.30, 0.88, 0.62, z);
      b.box('ctHead', 0.24, 0.18, 0.10, 0, 0.78, z + (i === 2 ? 1.18 : 0));
    }
    b.build(g, { noOutline: ['ctTrainW', 'ctNeonM', 'ctHead'] });
    return g;
  }
  function ctBargeUnit() {
    const g = new T.Group();
    const b = new Builder();
    b.box('ctBoat', 3.4, 0.85, 9.0, 0, 0.42, 0);
    b.box('ctSteelD', 3.6, 0.14, 9.2, 0, 0.06, 0);
    b.box('ctBoatC', 2.4, 1.15, 2.6, 0, 1.42, -2.4);
    for (let i = 0; i < 3; i++) {
      const k = ['ctCont1', 'ctCont3', 'ctCont5'][i];
      b.box(k, 2.6, 1.0, 2.2, 0, 1.35, 0.4 + i * 2.35);
    }
    b.box('ctNeonC', 3.4, 0.08, 0.08, 0, 0.88, 4.5);
    b.box('ctTail', 0.20, 0.20, 0.20, 0, 2.05, -2.4);
    b.build(g, { noOutline: ['ctBoatC', 'ctNeonC', 'ctTail'] });
    return g;
  }
  function buildCtExtLife() {
    const g = new T.Group();
    /* 两列单轨：北线沿 x，东线沿 z */
    const TR = [
      [-28, -34.5, 50, -34.5, 12.45, 5.6, 0.00],
      [-28, -34.5, 50, -34.5, 12.45, 5.6, 0.52],
      [52, -32, 52, 24, 12.45, 5.0, 0.16],
      [52, -32, 52, 24, 12.45, 5.0, 0.70]
    ];
    TR.forEach(function (q) {
      const u = ctTrainUnit(); g.add(u);
      ctTrack(u, { x0: q[0], z0: q[1], x1: q[2], z1: q[3],
        y: q[4], speed: q[5], phase: q[6], cull: 0.02 });
    });
    /* 两艘驳船：一艘走西河，一艘走南湖 */
    [[-40, -46, -40, 44], [-28, 41, 64, 41]].forEach(function (q, i) {
      const u = ctBargeUnit(); g.add(u);
      ctTrack(u, { x0: q[0], z0: q[1], x1: q[2], z1: q[3],
        y: CT_EX.wy + 0.10, speed: i ? 3.4 : 2.8, phase: i ? 0.3 : 0.0, cull: 0.015 });
    });
    /* 斜拉桥上的车流（平桥，不会穿模） */
    [[-25.0, 28.5, -25.0, 51.5], [-23.0, 51.5, -23.0, 28.5]].forEach(function (q, i) {
      const u = ctCarUnit(i ? 'ctBodyL' : 'ctBodyL2', 0.92); g.add(u);
      ctTrack(u, { x0: q[0], z0: q[1], x1: q[2], z1: q[3],
        y: 1.26, speed: 7.0, phase: i ? 0.52 : 0.0, cull: 0.03 });
    });
    /* 开敞桁架桥上的两辆车 */
    [[30, 28.5, 30, 51.5], [30, 51.5, 30, 28.5]].forEach(function (q, i) {
      const u = ctCarUnit(i ? 'ctBody4' : 'ctBody', 0.86); g.add(u);
      ctTrack(u, { x0: q[0], z0: q[1], x1: q[2], z1: q[3],
        y: 2.76, speed: 6.4, phase: i ? 0.48 : 0.0, cull: 0.03 });
    });
    /* 桥上 / 岸上行人 */
    const PW = [
      [-48, -17.7, -30, -17.7, 1.10, 0.00], [-30, -18.3, -48, -18.3, 1.10, 0.55],
      [-48, 6.7, -30, 6.7, 1.20, 0.20], [-30, 7.3, -48, 7.3, 1.20, 0.72],
      [52, 31, 52, 51, -0.42, 0.10], [52, 51, 52, 31, -0.42, 0.60],
      [-24, 30.0, 12, 30.0, 0.05, 0.15], [12, 30.6, -24, 30.6, 0.05, 0.65],
      [-62, 55.0, -20, 55.0, 0.05, 0.30], [20, 56.0, 66, 56.0, 0.05, 0.80],
      [40, -12, 40, 18, 0.05, 0.40], [64, 18, 64, -12, 0.05, 0.05]
    ];
    PW.forEach(function (q, i) {
      const u = ctPedUnit(['ctPedA', 'ctPedB', 'ctPedC', 'ctPedD'][i % 4], 1.06);
      g.add(u);
      ctTrack(u, { x0: q[0], z0: q[1], x1: q[2], z1: q[3], y: q[4],
        speed: 1.15 + (i % 3) * 0.12, phase: q[5], walk: true, bob: 0.035, cull: 0.01 });
    });
    scene.add(g);
    return g;
  }


  /* ================= 远景天际线 =================
     后排一圈又高又暗的塔，只给稀疏的窗点。
     没有这一层，六块街区看起来像摆在桌上的六个盒子。 */
  function buildCtSkyline() {
    const g = new T.Group();
    const b = new Builder();
    /* 远景塔群只做「背板」，绝不能高过城内主塔（T1 = 56 米），
       否则一眼看过去最高的是远景，主次就反了。间距也要拉开，
       8 栋紧挨着会连成一堵墙。 */
    const row = [
      [-26.0, -30.2, 7.0, 6.0, 26], [-16.0, -30.8, 6.2, 5.4, 35],
      [-5.0, -31.0, 7.4, 5.6, 30], [6.0, -30.4, 6.6, 5.2, 38],
      [17.0, -30.8, 7.2, 5.6, 29], [26.0, -30.2, 6.4, 5.4, 33]
    ];
    row.forEach(function (q, i) {
      const h = q[4];
      let r;
      /* 背板里也混两根圆柱 / 六棱塔，否则远处一整排方盒
         会把近处造型塔的轮廓重新吃回去 */
      if (i === 1) {
        r = ctArtFar(b, q[0], q[1], q[2], q[3], h, 40 + i * 7, 'cyl');
      } else if (i === 4) {
        r = ctArtFar(b, q[0], q[1], q[2], q[3], h, 40 + i * 7, 'hex');
      } else {
        r = ctTower(b, {
          x: q[0], z: q[1], w: q[2], d: q[3], h: h,
          segs: [{ h: h * 0.62 }, { h: h * 0.22, w: 0.86, d: 0.86 },
            { h: h * 0.16, w: 0.68, d: 0.68 }],
          key: i % 2 ? 'ctT3' : 'ctT2', style: 2, dens: 0.25, seed: 40 + i * 7,
          op: 0.72, y0: 0.0, reg: false,
          crown: ['spire', '', 'dome', 'disc', '', 'blade'][i]
        });
      }
      /* 顶部航空灯 */
      b.box('ctTail', 0.12, 0.12, 0.12, q[0], r.top + 0.5, q[1]);
      b.cyl('ctSteelD', 0.03, 0.05, 1.0, 5, q[0], r.top + 0.2, q[1]);
    });
    /* 后排脚下压一条暗色裙房，别让塔直接站在地面上 */
    b.box('ctT3', 58.0, 5.2, 3.6, -1.0, 2.6, -29.6);
    b.build(g);
    return g;
  }

  /* ================= A · 塔楼群 ================= */
  function buildCtA() {
    const g = new T.Group();
    const b = new Builder();

    /* 裙房：一整块 2 层商业基座，把三根塔串起来 */
    b.box('ctPodium', 13.6, 7.2, 17.6, -21.8, 3.6, -18.2);
    b.box('ctSteelD', 13.75, 0.22, 17.75, -21.8, 7.2, -18.2);
    ctFacadeOn(-21.8, -18.2, 13.6, 17.6, 0.0, 7.0, 21, 2, 0.55, 1);
    /* 裙房顶上的设备层 */
    [[-26.5, -24.0], [-17.6, -24.0], [-26.5, -12.4], [-17.6, -12.4]].forEach(function (q, i) {
      b.box('ctSteel', 1.5, 0.9, 1.5, q[0], 7.75, q[1]);
      b.cyl('ctTank', 0.42, 0.42, 0.85, 8, q[0], 8.5, q[1]);
    });

    /* T1：主塔 —— 收分八棱塔 + 飞碟观景盘 + 针尖，56 米仍是唯一制高点 */
    ctArtNeedle(b, {
      x: -24.4, z: -23.2, w: 7.6, d: 7.6, h: 56, seed: 11
    });

    /* T2：次塔 —— 外露钢骨架，透空的「笼子」，和 T1 的实心棱柱对撞 */
    ctArtFrame(b, {
      x: -24.2, z: -13.6, w: 6.6, d: 6.6, h: 31, seed: 17
    });

    /* T3：靠侧巷的小塔 —— 四层错层悬挑，俯视像一摞错开的书 */
    ctArtStagger(b, {
      x: -17.0, z: -23.4, w: 5.4, d: 7.0, h: 24, seed: 23
    });

    /* 塔间连廊 */
    ctBridge(b, -24.4, -19.3, -24.2, -16.9, 24.5, 2.0, 2.2, 'glass');
    ctBridge(b, -14.7, -21.0, -11.3, -20.6, 13.5, 1.9, 2.0, 'truss');

    /* 裙房沿街店面（朝 +x，面向侧巷） */
    for (let z = -26.0; z < -10.0; z += 3.4) {
      b.box('ctSignBox', 0.10, 0.60, 2.4, -14.48, 3.10, z + 1.4);
      ctShopFront(2.6, 1.50, -14.46, 1.55, z + 1.4, Math.PI / 2, 300 + z, 0);
      b.box('ctWoodD', 0.12, 0.20, 2.8, -14.46, 2.42, z + 1.4);
    }

    /* 竖向霓虹：塔身上的长条招牌。T1 换成八棱柱后，
       原来的 x/z 会飘到塔身外面，重新贴回棱面与骨架塔东立面。 */
    ctSign('新宿', 0xff2d7a, -20.55, 18.0, -21.0, 1.5, 7.6, Math.PI / 2, true, 0.95);
    ctGlow(-20.35, 18.0, -21.0, 0xff2d7a, 7.0, 0.20);
    ctSign('電脳', 0x22e6ff, -20.86, 12.0, -13.6, 1.0, 4.6, Math.PI / 2, true, 0.9);
    ctNeonBar(-20.70, 26.5, -21.5, 0.10, 0.10, 7.4, 0xff2d7a, 0.30);

    b.build(g);
    return g;
  }

  /* ================= B · 巨构商厦 =================
     阶梯式退台 + 面向主街的两层商业裙房，是全场的视觉中心之一。 */
  function buildCtB() {
    const g = new T.Group();
    const b = new Builder();

    /* 商业裙房：贴到 x=4.0，直接站在主街边上 */
    b.box('ctPodium', 15.4, 7.4, 18.2, -3.70, 3.70, -18.25);
    b.box('ctSteelD', 15.55, 0.24, 18.35, -3.70, 7.4, -18.25);
    ctFacadeOn(-3.70, -18.25, 15.4, 18.2, 0.0, 7.2, 31, 2, 0.62, 1);

    /* 双塔连体：两根不等高细塔 + 三道空中连廊 + 顶部横跨门框。
       原来这里是一块 15×14 的三段退台方盒，和 A 区的塔读起来一模一样；
       拆成双塔之后，中间透出的天空成了这块地的「形状」。 */
    ctArtTwin(b, {
      x: -3.90, z: -18.60, w: 15.0, d: 14.2, h: 28.1, y0: 7.4, seed: 33
    });

    /* 裙房沿街雨棚 + 二层通廊（贴在立面上，别悬空） */
    b.box('ctAwning', 1.7, 0.10, 17.6, 4.55, 3.44, -18.2);
    b.box('ctSteelD', 0.12, 0.12, 17.6, 5.32, 3.40, -18.2);
    for (let z = -26.0; z < -10.0; z += 2.2) {
      b.box('ctSteelD', 1.55, 0.08, 0.08, 4.55, 3.36, z);
    }
    /* 一层店面：发光橱窗 + 招牌带 */
    for (let z = -26.2; z < -10.0; z += 2.6) {
      ctShopFront(2.20, 1.85, 4.06, 1.44, z + 1.1, Math.PI / 2, 320 + z, 0);
      b.box('ctWoodD', 0.13, 0.16, 2.35, 4.00, 2.44, z + 1.1);
      b.box('ctSignBox', 0.12, 0.52, 2.35, 3.98, 2.78, z + 1.1);
    }
    /* 二层橱窗 */
    for (let z = -25.6; z < -10.0; z += 3.2) {
      b.box('ctWinC', 0.07, 1.30, 2.0, 4.02, 5.55, z);
    }

    /* 主街一侧的超长竖招牌（B 的招牌） */
    ctSign('歌舞伎', 0xffd23f, 4.06, 19.0, -12.6, 1.35, 9.6, Math.PI / 2, true, 1);
    ctGlow(4.3, 19.0, -12.6, 0xffd23f, 8.0, 0.20);
    ctSign('カラオケ', 0x22e6ff, 4.06, 11.4, -12.6, 1.6, 3.0, Math.PI / 2, false, 0.95);

    /* 挑出式灯箱（垂直于立面） */
    [[-15.4, 0xff2d7a, 'BAR'], [-21.6, 0x22e6ff, '24H']].forEach(function (q, i) {
      b.box('ctSignBox', 0.9, 1.1, 0.18, 4.55, 6.0, q[0]);
      ctSign(q[2], q[1], 4.55, 6.0, q[0] + 0.10, 0.78, 0.92, 0, false, 1);
      ctSign(q[2], q[1], 4.55, 6.0, q[0] - 0.10, 0.78, 0.92, Math.PI, false, 1);
      ctGlow(4.55, 6.0, q[0], q[1], 2.6, 0.22);
    });

    /* 屋顶广告牌：贴在右塔朝 +x 的立面上，正对相机 */
    b.box('ctSteelD', 0.18, 4.6, 7.0, 3.15, 20.5, -18.6);
    const bbTex = ctBoardTex(0xff2d7a, 0x22e6ff, 'ネオン', 'JAPANTOWN');
    ctPlane(bbTex, 6.6, 4.3, 3.26, 20.5, -18.6, Math.PI / 2, 1, 6);
    ctGlow(3.30, 20.5, -18.6, 0xff2d7a, 9.0, 0.18);

    b.build(g);
    return g;
  }

  /* 广告牌画布：底色渐变 + 扫描线 + 两行字 + 装饰环 */
  function ctBoardTex(c1, c2, big, small) {
    const hex = function (h) { return '#' + ('000000' + h.toString(16)).slice(-6); };
    return canvasTex(512, 288, function (c, w, h) {
      const g2 = c.createLinearGradient(0, 0, w, h);
      g2.addColorStop(0, '#0a0614');
      g2.addColorStop(0.5, '#120a20');
      g2.addColorStop(1, '#06101a');
      c.fillStyle = g2; c.fillRect(0, 0, w, h);
      /* 装饰环 */
      c.strokeStyle = hex(c2);
      c.globalAlpha = 0.55;
      c.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(w * 0.80, h * 0.44, 26 + i * 22, 0.4, 4.6);
        c.stroke();
      }
      c.globalAlpha = 1;
      /* 大字 */
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.shadowColor = hex(c1);
      c.shadowBlur = 34;
      c.fillStyle = hex(c1);
      c.font = '900 92px "Yu Gothic","Meiryo","MS Gothic",sans-serif';
      c.fillText(big, w * 0.06, h * 0.46);
      c.shadowBlur = 6;
      c.fillStyle = 'rgba(255,255,255,0.90)';
      c.fillText(big, w * 0.06, h * 0.46);
      /* 小字 */
      c.shadowColor = hex(c2);
      c.shadowBlur = 18;
      c.fillStyle = hex(c2);
      c.font = '700 30px "Arial Narrow",Arial,sans-serif';
      c.fillText(small, w * 0.07, h * 0.80);
      /* 扫描线 */
      c.shadowBlur = 0;
      c.fillStyle = 'rgba(0,0,0,0.30)';
      for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1.5);
      c.strokeStyle = 'rgba(255,255,255,0.16)';
      c.lineWidth = 4;
      c.strokeRect(2, 2, w - 4, h - 4);
    });
  }

  /* ================= C · 霓虹商厦 =================
     主街东侧：两栋中层 + 一栋矮楼，中间留出天桥落点。 */
  function buildCtC() {
    const g = new T.Group();
    const b = new Builder();

    /* C1：北段塔楼。往街区里退 2.8 米 —— 临街的「墙」交给裙房，
       高处才轮到塔。不这么退，主街在俯视角下永远被墙体封死。 */
    /* C1：北段塔楼 —— 圆柱塔 + 飞碟观景层 + 半球冠。
       原来是一根 25 米方柱，换成圆柱后这片天际线才有曲线。 */
    ctArtCyl(b, { x: 20.2, z: -22.8, w: 7.4, d: 9.0, h: 25.0, seed: 51 });

    /* C2：北端第二栋，稍矮 —— 方盒 + 金字塔顶 */
    ctTower(b, {
      x: 26.6, z: -21.0, w: 6.4, d: 8.0, h: 17.0,
      segs: [{ h: 11.0 }, { h: 6.0, w: 0.86, d: 0.86 }],
      key: 'ctT3', style: 1, dens: 0.51, seed: 57, dress: false, crown: 'pyramid'
    });

    /* C3：中段 —— 镂空门洞塔，底部架空、中部整层透空做空中花园 */
    ctArtVoid(b, { x: 19.8, z: -11.6, w: 7.6, d: 12.2, h: 17.4, seed: 63 });

    /* C4：东侧补一栋 —— 方盒 + 圆冠，把天际线拉满 */
    ctTower(b, {
      x: 26.8, z: -10.4, w: 6.2, d: 7.6, h: 12.6,
      key: 'ctT1', style: 1, dens: 0.48, seed: 69, dress: false, crown: 'dome'
    });

    /* ★ 临街裙房：3.4 米进深的一排矮店屋，压到 6.5~9.5 米。
       它们才是「街墙」。有了这道矮墙，俯视角能一路看到街对面；
       没有它，25 米的塔会把整条主街的影子吃掉。 */
    const cRow = [
      [-26.4, 5.2, 7.4, 'ctT3'], [-20.8, 4.8, 9.2, 'ctT5'],
      [-15.6, 5.4, 6.8, 'ctT2'], [-9.8, 5.0, 8.6, 'ctT4'],
      [-4.2, 4.6, 7.2, 'ctT3']
    ];
    cRow.forEach(function (q, i) {
      const zc = q[0] + q[1] / 2, hh = q[2];
      b.box(q[3], 2.4, hh, q[1], 16.9, hh / 2, zc);
      b.box('ctSteelD', 2.54, 0.16, q[1] + 0.14, 16.9, hh - 0.02, zc);
      ctFacadeOn(16.9, zc, 2.3, q[1] - 0.2, 0, hh - 0.2, 260 + i * 13, 1, 0.30, 1);
      ctRim(b, 16.9, zc, 2.4, q[1], hh + 0.05, i % 2 ? 'ctNeonMd' : 'ctNeonCd', 0.10);
      ctRoofKit(b, 16.9, zc, 1.8, q[1] * 0.6, hh, 60 + i * 4);
      /* 雨棚 + 招牌带，压在橱窗上方 */
      b.box('ctAwning', 0.9, 0.09, q[1] - 0.4, 15.0, 3.30, zc);
      b.box('ctSignBox', 0.14, 0.52, q[1] - 0.5, 15.62, 2.90, zc);
    });

    /* 临街店面（朝 -x，面向主街） */
    for (let z = -26.0; z < -1.0; z += 2.8) {
      ctShopFront(2.30, 1.90, 15.66, 1.46, z + 1.2, -Math.PI / 2, 340 + z, 1);
      b.box('ctWoodD', 0.14, 0.18, 2.46, 15.70, 2.50, z + 1.2);
      b.box('ctSignBox', 0.13, 0.55, 2.46, 15.68, 2.86, z + 1.2);
    }

    /* 巨型竖招牌：主街东侧的主角，朝西正对街谷（挂在裙房外沿） */
    ctSign('電脳', 0xff2d7a, 15.60, 15.4, -20.2, 1.9, 8.8, -Math.PI / 2, true, 1);
    ctGlow(15.4, 15.4, -20.2, 0xff2d7a, 10.0, 0.22);
    ctSign('ネオン', 0x22e6ff, 15.60, 9.0, -8.2, 1.5, 5.4, -Math.PI / 2, true, 0.95);
    ctGlow(15.4, 9.0, -8.2, 0x22e6ff, 6.5, 0.18);
    ctSign('居酒屋', 0xffd23f, 15.60, 5.6, -14.6, 2.4, 0.86, -Math.PI / 2, false, 1);
    ctGlow(15.4, 5.6, -14.6, 0xffd23f, 4.0, 0.16);

    /* 楼顶 LED 大屏：C1 改成圆柱后，原来挂在 22 米的那块会穿进半球冠，
       降到塔身中段、贴到圆柱南缘才挂得住 */
    b.box('ctSteelD', 6.4, 3.2, 0.20, 20.2, 11.5, -19.42);
    const led = ctBoardTex(0x22e6ff, 0xff2d7a, '東京', 'SECTOR 07');
    ctPlane(led, 5.9, 2.9, 20.2, 11.5, -19.54, Math.PI, 1, 6);
    ctGlow(20.2, 11.5, -19.8, 0x22e6ff, 9.0, 0.16);

    /* C5/C6：把东侧补满。主街加宽后右半城空出一大片，
       没有这两栋，展台右缘会露出一块光秃秃的地。 */
    /* C5：螺旋坡道塔 —— 一条斜向上的线，和满城竖线错开 */
    ctArtHelix(b, { x: 30.4, z: -19.4, w: 5.6, d: 8.4, h: 21.0, seed: 73 });
    /* C6：方盒 + 斜切发光鳍 */
    ctTower(b, {
      x: 30.2, z: -7.6, w: 5.4, d: 6.8, h: 14.2,
      key: 'ctT3', style: 1, dens: 0.50, seed: 79, dress: false, crown: 'blade'
    });

    b.build(g);
    return g;
  }

  /* ================= D · 市场街区 =================
     两栋中层把商店街围住，底层全是店面。 */
  function buildCtD() {
    const g = new T.Group();
    const b = new Builder();

    const d1 = ctTower(b, {
      x: -25.0, z: 0.0, w: 7.4, d: 9.0, h: 15.2,
      segs: [{ h: 9.0 }, { h: 6.2, w: 0.86, d: 0.88 }],
      key: 'ctT3', style: 1, dens: 0.54, seed: 71
    });
    ctRoofKit(b, -25.0, 0.0, 6.4, 7.9, d1.top, 31);

    const d2 = ctTower(b, {
      x: -16.4, z: 0.2, w: 6.6, d: 8.4, h: 11.0,
      key: 'ctT5', style: 2, dens: 0.57, seed: 77
    });
    ctRoofKit(b, -16.4, 0.2, 5.8, 7.4, d2.top, 35);

    /* 朝商店街的店面 */
    for (let x = -28.0; x < -12.0; x += 2.5) {
      ctShopFront(2.10, 1.80, x, 1.40, 5.52, Math.PI, 360 + x, 2);
      b.box('ctWoodD', 2.24, 0.16, 0.13, x, 2.42, 5.54);
      b.box('ctAwning', 2.10, 0.09, 0.95, x, 2.62, 5.10);
      b.box('ctBulb', 1.8, 0.05, 0.05, x, 2.50, 5.20);
    }
    /* 朝横巷一侧的卷帘门 */
    for (let x = -27.0; x < -12.0; x += 3.0) {
      b.box('ctShutter', 2.4, 2.1, 0.08, x, 1.05, -5.54);
      b.box('ctSteelD', 2.5, 0.12, 0.12, x, 2.16, -5.52);
    }

    /* 挑出灯箱 */
    b.box('ctSignBox', 0.20, 1.30, 0.90, -19.4, 4.4, 5.60);
    ctSign('酒', 0xff2d7a, -19.4, 4.4, 6.10, 0.76, 1.10, 0, false, 1);
    ctGlow(-19.4, 4.4, 6.14, 0xff2d7a, 3.0, 0.26);

    /* 门口堆的酒箱 + 自动贩卖机 */
    [[-27.4, 4.4], [-13.2, 4.2]].forEach(function (q, i) {
      for (let k = 0; k < 3; k++) {
        b.box(i ? 'ctCrate2' : 'ctCrate', 0.42, 0.30, 0.34, q[0], CT_GY + 0.15 + k * 0.30, q[1]);
      }
    });

    b.build(g);
    return g;
  }

  /* ================= E · 南市集（密集低层） =================
     前景左手边，全部压到 6~11 米，保证视线能越过它看到街谷。 */
  function buildCtE() {
    const g = new T.Group();
    const b = new Builder();

    /* 沿商店街南侧的一排低层店屋（面朝 -z） */
    const rowS = [
      [-27.0, 11.9, 4.6, 3.4, 4.4, 'ctT3'],
      [-22.0, 12.1, 4.2, 3.8, 3.6, 'ctT5'],
      [-17.2, 11.8, 4.6, 3.2, 4.8, 'ctT2'],
      [-12.2, 12.0, 4.4, 3.6, 3.8, 'ctT4'],
      [-7.2, 12.2, 4.2, 3.0, 4.2, 'ctT3'],
      [-2.2, 11.9, 4.4, 3.4, 3.4, 'ctT5']
    ];
    rowS.forEach(function (q, i) {
      b.box(q[5], q[2], q[4], q[3], q[0], q[4] / 2, q[1]);
      b.box('ctSteelD', q[2] + 0.14, 0.16, q[3] + 0.14, q[0], q[4] - 0.02, q[1]);
      ctFacadeOn(q[0], q[1], q[2], q[3], 0.0, q[4] - 0.2, 80 + i * 9, 1, 0.56, 1);
      /* 矮楼屋顶：小披檐 + 几个箱子。按高楼那套「水箱 + 2.4 米天线」
         来配，3.4 米的房子会被压成蘑菇。 */
      b.box('ctRoof', q[2] * 0.56, 0.10, q[3] * 0.60, q[0] - q[2] * 0.13,
        q[4] + 0.34, q[1], 0.15, 0, 0);
      b.box('ctSteelD', 0.05, 0.36, 0.05, q[0] - q[2] * 0.30, q[4] + 0.17, q[1] + q[3] * 0.19);
      b.box('ctSteelD', 0.05, 0.36, 0.05, q[0] - q[2] * 0.30, q[4] + 0.17, q[1] - q[3] * 0.19);
      if (i % 2 === 0) {
        b.box('ctTank', 0.40, 0.40, 0.50, q[0] + q[2] * 0.26, q[4] + 0.40, q[1] - q[3] * 0.16);
      } else {
        b.box('ctSteel', 0.52, 0.34, 0.40, q[0] + q[2] * 0.24, q[4] + 0.17, q[1] + q[3] * 0.14);
      }
      /* 底层店面：朝 -z */
      ctShopFront(q[2] - 0.9, 1.70, q[0], 1.35, q[1] - q[3] / 2 - 0.06, Math.PI, 380 + i * 9, 0);
      b.box('ctBulb', q[2] - 1.1, 0.05, 0.05, q[0], 2.30, q[1] - q[3] / 2 - 0.16);
    });

    /* 后排一簇错落的小楼，把深度撑起来 */
    const back = [
      [-26.0, 18.6, 5.2, 5.4, 6.2, 'ctT2'],
      [-20.2, 19.4, 4.4, 5.0, 5.2, 'ctT4'],
      [-14.6, 18.2, 5.0, 4.6, 5.8, 'ctT3'],
      [-8.8, 19.8, 4.6, 5.2, 4.8, 'ctT5'],
      [-3.4, 18.4, 4.8, 4.4, 5.4, 'ctT1']
    ];
    back.forEach(function (q, i) {
      b.box(q[5], q[2], q[4], q[3], q[0], q[4] / 2, q[1]);
      b.box('ctSteelD', q[2] + 0.14, 0.18, q[3] + 0.14, q[0], q[4] - 0.02, q[1]);
      ctFacadeOn(q[0], q[1], q[2], q[3], 0.0, q[4] - 0.2, 110 + i * 8, 1, 0.52, 0.92);
      b.box('ctRoof', q[2] * 0.54, 0.10, q[3] * 0.56, q[0] + q[2] * 0.12,
        q[4] + 0.32, q[1], -0.13, 0, 0);
      b.box('ctSteelD', 0.05, 0.34, 0.05, q[0] + q[2] * 0.28, q[4] + 0.16, q[1] + q[3] * 0.18);
      b.box('ctSteelD', 0.05, 0.34, 0.05, q[0] + q[2] * 0.28, q[4] + 0.16, q[1] - q[3] * 0.18);
      if (i % 2 === 0) {
        b.box('ctTank', 0.44, 0.44, 0.54, q[0] - q[2] * 0.24, q[4] + 0.42, q[1] + q[3] * 0.14);
      }
    });

    /* 稻荷小社：一把鸟居 + 石灯笼，藏在楼缝里 */
    (function () {
      const sx = -20.6, sz = 24.4;
      b.box('ctStone', 3.0, 0.16, 2.6, sx, 0.08 + CT_GY, sz);
      /* 鸟居 */
      [sx - 1.10, sx + 1.10].forEach(function (px) {
        b.cyl('ctRed', 0.115, 0.135, 2.75, 8, px, CT_GY + 1.375, sz + 0.55);
        b.cyl('ctStoneD', 0.17, 0.19, 0.20, 8, px, CT_GY + 0.10, sz + 0.55);
      });
      b.box('ctRed', 2.90, 0.16, 0.22, sx, CT_GY + 2.62, sz + 0.55);
      b.box('ctRedD', 3.30, 0.12, 0.28, sx, CT_GY + 2.80, sz + 0.55);
      b.box('ctRed', 2.50, 0.11, 0.17, sx, CT_GY + 2.15, sz + 0.55);
      b.box('ctRed', 0.15, 0.42, 0.15, sx, CT_GY + 2.40, sz + 0.55);
      /* 社殿 */
      b.box('ctWood', 1.30, 1.05, 1.10, sx, CT_GY + 0.68, sz - 0.55);
      b.box('ctWoodD', 1.62, 0.14, 1.34, sx, CT_GY + 1.26, sz - 0.55);
      b.box('ctTile', 1.70, 0.13, 1.40, sx, CT_GY + 1.38, sz - 0.55, 0.10, 0, 0);
      b.box('ctWinW', 0.62, 0.42, 0.05, sx, CT_GY + 0.72, sz - 1.11);
      /* 石灯笼 ×2 */
      [sx - 1.55, sx + 1.55].forEach(function (px) {
        b.cyl('ctStone', 0.16, 0.20, 0.14, 8, px, CT_GY + 0.07, sz + 1.30);
        b.cyl('ctStoneD', 0.075, 0.075, 0.62, 6, px, CT_GY + 0.45, sz + 1.30);
        b.box('ctStone', 0.30, 0.10, 0.30, px, CT_GY + 0.80, sz + 1.30);
        b.box('ctBulb', 0.20, 0.20, 0.20, px, CT_GY + 0.95, sz + 1.30);
        b.box('ctStoneD', 0.34, 0.10, 0.34, px, CT_GY + 1.10, sz + 1.30);
      });
      ctSign('稲荷', 0xffd23f, sx, CT_GY + 2.30, sz + 0.68, 0.86, 0.34, 0, false, 1);
    })();

    /* 晾衣杆 + 阳台：住宅感 */
    [[-24.6, 20.4, 3.0], [-2.8, 21.0, 2.6]].forEach(function (q) {
      b.cyl('ctSteelD', 0.028, 0.028, q[2], 5, q[0], 5.55, q[1], 0, 0, Math.PI / 2);
      b.box('ctCloth1', 0.04, 0.62, 0.42, q[0] - q[2] * 0.30, 5.20, q[1]);
      b.box('ctCloth2', 0.04, 0.48, 0.36, q[0] + q[2] * 0.18, 5.27, q[1]);
    });

    /* 街边绿化：几盆灌木，给纯霓虹的画面留一点暗绿 */
    [[-9.4, 11.2], [2.6, 12.6], [-28.2, 9.4]].forEach(function (q) {
      b.cyl('ctStoneD', 0.24, 0.20, 0.36, 8, q[0], CT_GY + 0.18, q[1]);
      b.sph('ctPlant', 0.30, q[0], CT_GY + 0.58, q[1], 1, 0.9, 1);
    });

    b.build(g);
    return g;
  }

  /* ================= F · 东南商街 =================
     近景右手边：北高南低，最南端压到 6 米以下，不挡视线。 */
  function buildCtF() {
    const g = new T.Group();
    const b = new Builder();

    /* 北段：临主街的商厦（同样退到裙房之后） */
    /* F1：楔形斜切塔 —— 方盒基座 + 四棱台收顶 + 斜挑檐，
       南半城最缺的就是斜线 */
    ctArtWedge(b, { x: 21.6, z: 0.6, w: 11.4, d: 11.0, h: 15.6, seed: 131 });

    /* 中段：两栋小楼拉开高差，塔冠也各不一样 */
    ctTower(b, {
      x: 21.0, z: 11.6, w: 7.0, d: 8.6, h: 9.6,
      key: 'ctT5', style: 1, dens: 0.56, seed: 137, dress: false, crown: 'step'
    });
    ctTower(b, {
      x: 26.4, z: 10.2, w: 5.6, d: 7.4, h: 12.4,
      key: 'ctT2', style: 0, dens: 0.48, seed: 139, dress: false, crown: 'frame'
    });

    /* 南段：矮楼 + 游戏厅，压到 6.4 米 */
    b.box('ctPodium2', 10.6, 6.4, 9.6, 21.4, 3.2, 21.6);
    b.box('ctSteelD', 10.75, 0.18, 9.75, 21.4, 6.4, 21.6);
    ctFacadeOn(21.4, 21.6, 10.6, 9.6, 0.0, 6.2, 141, 2, 0.62, 1);
    ctRoofKit(b, 21.4, 21.6, 7.4, 6.7, 6.4, 53);

    /* ★ 临街裙房：F 区这一排比 C 区更矮（5.6~8.4 米），
       把南半条街压平，天桥和塔才有东西可「拔起来」。 */
    const fRow = [
      [-4.6, 5.6, 6.2, 'ctT5'], [1.4, 5.0, 8.0, 'ctT3'],
      [7.0, 5.8, 5.8, 'ctT2'], [13.2, 6.0, 7.6, 'ctT4'],
      [19.8, 6.4, 6.6, 'ctT3']
    ];
    fRow.forEach(function (q, i) {
      const zc = q[0] + q[1] / 2, hh = q[2];
      b.box(q[3], 2.4, hh, q[1], 16.9, hh / 2, zc);
      b.box('ctSteelD', 2.54, 0.16, q[1] + 0.14, 16.9, hh - 0.02, zc);
      ctFacadeOn(16.9, zc, 2.3, q[1] - 0.2, 0, hh - 0.2, 560 + i * 11, 1, 0.32, 1);
      ctRim(b, 16.9, zc, 2.4, q[1], hh + 0.05, i % 2 ? 'ctNeonCd' : 'ctNeonMd', 0.10);
      ctRoofKit(b, 16.9, zc, 1.8, q[1] * 0.6, hh, 70 + i * 5);
      b.box('ctAwning', 0.9, 0.09, q[1] - 0.4, 15.0, 3.05, zc);
      b.box('ctSignBox', 0.14, 0.48, q[1] - 0.5, 15.62, 2.68, zc);
    });

    /* 游戏厅霓虹门头（朝 -x，正对主街） */
    for (let i = 0; i < 3; i++) {
      ctNeonBar(15.66, 4.9 + i * 0.42, 18.0, 0.07, 0.10, 8.6,
        [0xff2d7a, 0x22e6ff, 0xffd23f][i], 0.55);
    }
    ctSign('パチンコ', 0xff2d7a, 15.62, 3.4, 21.6, 1.1, 4.4, -Math.PI / 2, true, 1);
    ctGlow(15.5, 3.4, 21.6, 0xff2d7a, 6.4, 0.24);
    ctShopFront(7.4, 2.2, 15.64, 1.20, 21.4, -Math.PI / 2, 470, 2);

    /* 临主街东侧的连续店面 */
    for (let z = -3.4; z < 8.0; z += 2.7) {
      ctShopFront(2.20, 1.85, 15.66, 1.42, z + 1.1, -Math.PI / 2, 490 + z, 1);
      b.box('ctBulb', 0.06, 0.05, 1.9, 15.74, 3.02, z + 1.1);
    }

    /* 楼顶大广告牌（朝 -x，落在主街视线上） */
    b.box('ctSteelD', 0.22, 6.4, 8.8, 16.4, 11.4, 1.0);
    const bb = ctBoardTex(0xffd23f, 0xff2d7a, '夜城', 'NIGHT CITY');
    ctPlane(bb, 8.2, 6.0, 16.26, 11.4, 1.0, -Math.PI / 2, 1, 6);
    ctGlow(16.1, 11.4, 1.0, 0xffd23f, 11.0, 0.16);

    /* 南端露天停车场：几道白线 + 两辆车 */
    for (let i = 0; i < 4; i++) {
      b.box('ctPaint', 0.10, 0.014, 4.2, 17.6 + i * 2.3, 0.013, 25.6);
    }
    b.box('ctPaint', 7.0, 0.014, 0.10, 21.0, 0.013, 23.5);
    ctCar(b, 18.7, 25.6, 0, 'ctBody', { s: 0.94 });
    ctCar(b, 23.3, 25.6, 0, 'ctBody3', { s: 0.94 });

    /* F4：东南角补一栋，别让展台右缘空着 */
    /* F4：东南角补一栋 —— 方盒 + 飞碟冠，别让展台右缘空着 */
    ctTower(b, {
      x: 30.0, z: 14.2, w: 5.8, d: 9.0, h: 10.8,
      key: 'ctT1', style: 2, dens: 0.52, seed: 143, dress: false, crown: 'disc'
    });

    /* F5：东南角商厦 + 屋顶广告塔。
       这块是画面的右下重角，一直空着会让整个构图往左上塌。 */
    b.box('ctPodium', 11.0, 8.2, 8.0, 25.6, 4.1, 23.0);
    b.box('ctSteelD', 11.15, 0.22, 8.15, 25.6, 8.2, 23.0);
    ctFacadeOn(25.6, 23.0, 11.0, 8.0, 0.0, 8.0, 147, 2, 0.58, 1);
    ctRim(b, 25.6, 23.0, 11.0, 8.0, 8.26, 'ctNeonC', 0.14);
    ctRoofKit(b, 25.6, 23.0, 7.7, 5.6, 8.2, 59);
    /* 广告塔：两根立柱 + 双面灯箱，朝主街 */
    b.box('ctSteelD', 0.22, 5.2, 0.22, 22.2, 10.8, 20.4);
    b.box('ctSteelD', 0.22, 5.2, 0.22, 22.2, 10.8, 25.6);
    b.box('ctSignBox', 0.30, 3.4, 5.8, 22.2, 15.0, 23.0);
    const ab = ctBoardTex(0xff2d7a, 0xffd23f, '夜景', 'AKARI');
    ctPlane(ab, 5.4, 3.1, 22.04, 15.0, 23.0, -Math.PI / 2, 1, 6);
    ctPlane(ab, 5.4, 3.1, 22.36, 15.0, 23.0, Math.PI / 2, 1, 6);
    ctGlow(22.2, 15.0, 23.0, 0xff2d7a, 9.0, 0.18);
    /* 裙房底层：一排卷帘门 + 便利店门头 */
    for (let i = 0; i < 4; i++) {
      b.box(i === 1 ? 'ctShopW' : 'ctShutter', 2.2, 2.0, 0.08, 21.4 + i * 2.6, 1.1, 18.92);
      b.box('ctAwning', 2.4, 0.10, 0.7, 21.4 + i * 2.6, 2.60, 18.62);
    }
    ctSign('24H', 0x4dff9a, 24.0, 2.95, 18.86, 1.3, 0.62, 0, false, 1);
    ctGlow(24.0, 2.95, 18.7, 0x4dff9a, 3.0, 0.18);

    b.build(g);
    return g;
  }


  /* ================= 主街西侧：连续店面 =================
     相机永远在 +x 一侧，主街东墙（C / F 的西立面）是背对的 ——
     想让街谷有「亮的一面」，就必须在西侧补一排朝 +x 的店面。
     这排房子同时把广场围合起来，市集才有「街」的感觉。 */
  function buildCtAveRow() {
    const g = new T.Group();
    const b = new Builder();
    const rnd = ctRnd(131);
    const PAL4 = [0xff2d7a, 0x22e6ff, 0xffd23f, 0x4dff9a];
    const TXT4 = ['酒場', '電器', '喫茶', '質屋'];
    let z = -4.9, idx = 0;
    while (z < 26.6) {
      if (z > 4.2 && z < 10.8) { z = 10.8; continue; }   /* 让开商店街口 */
      const d = 2.5 + rnd() * 1.4;
      const h = 5.4 + rnd() * 4.4;
      const x = 2.15, w = 3.1;
      const zc = z + d / 2;
      const key = ['ctT3', 'ctT5', 'ctT2', 'ctT4'][idx % 4];

      b.box(key, w, h, d, x, h / 2, zc);
      b.box('ctSteelD', w + 0.14, 0.18, d + 0.14, x, h - 0.04, zc);
      ctFacadeOn(x, zc, w, d, 0, h - 0.2, 200 + idx * 7, 1, 0.34, 1);
      ctRim(b, x, zc, w, d, h + 0.05, idx % 3 === 0 ? 'ctNeonM' : 'ctNeonC', 0.12);

      /* 底层店面，朝 +x */
      ctShopFront(d - 0.5, 1.70, 3.78, 1.32, zc, Math.PI / 2, 520 + idx * 11, idx % 3);
      b.box('ctWoodD', 0.15, 0.16, d - 0.36, 3.72, 2.28, zc);
      b.box('ctAwning', 1.05, 0.09, d - 0.3, 3.18, 2.50, zc);
      b.box('ctBulb', 0.05, 0.05, d - 0.7, 2.70, 2.42, zc);
      b.box('ctSignBox', 0.13, 0.44, d - 0.5, 3.68, 2.66, zc);

      /* 每两栋挂一个竖招牌：灯箱薄片贴在立面上，字面朝 +x */
      if (idx % 2 === 0) {
        b.box('ctSignBox', 0.16, 1.58, 0.66, 3.80, 4.10, zc);
        ctSign(TXT4[idx % 4], PAL4[idx % 4], 3.90, 4.10, zc, 0.52, 1.42, Math.PI / 2, true, 1);
        ctGlow(3.96, 4.10, zc, PAL4[idx % 4], 3.0, 0.18);
      }
      z += d + 0.05;
      idx++;
    }
    b.build(g);
    return g;
  }


  /* ================= 招牌系统 =================
     赛博味有一半来自「招牌密度」。按登记过的体块，
     在朝向相机的那两个立面（+x / +z）上自动挂霓虹，
     避免手摆漏掉某栋楼、也避免全挂在看不见的背面上。 */
  function ctBoard(b, x, y, z, pw, ph, ry, text, color, vertical) {
    const sn = Math.sin(ry), cs = Math.cos(ry);
    b.box('ctSignBox', pw + 0.18, ph + 0.18, 0.26, x, y, z, 0, ry, 0);
    ctSign(text, color, x + sn * 0.15, y, z + cs * 0.15, pw, ph, ry, vertical, 1);
    ctGlow(x + sn * 0.36, y, z + cs * 0.36, color, Math.max(pw, ph) * 1.9, 0.17);
  }

  function buildCtSigns() {
    const g = new T.Group();
    const b = new Builder();
    const rnd = ctRnd(4242);
    const COL = [0xff2d7a, 0x22e6ff, 0xffd23f, 0x9a6bff, 0x4dff9a, 0xff7a2d];
    /* 词库够大只是前提；真正决定「像不像街」的是**不重复**。
       同一面墙上一排「夜景 / 夜 / 夜景」，一眼就露馅。
       所以改成洗牌发牌：抽完一副再洗，保证 N 块招牌内不撞词。 */
    const VW = [
      'ラーメン', '居酒屋', 'カラオケ', '焼肉', '麻雀', '喫茶', '整体', '質屋',
      '酒場', '薬局', '占い', '電脳', '寿司', '天ぷら', 'うどん', '串焼',
      '珈琲', '書店', '銭湯', '映画', '占星', '食堂', '中華', 'おでん',
      'スナック', 'バー', '花屋', '時計', '眼鏡', '古着', '模型', '玩具',
      '電器', '携帯', '無線', 'パチンコ', 'クラブ', '旅館', '質流', '夜食'
    ];
    const HW = [
      '商店', '市場', '夜城', 'ネオン', '東京', '新宿', '電気', '古書',
      '歌舞伎', '横丁', '歓楽街', '電子街', '霓虹街', '中央通', '新世界',
      '不夜城', '電気街', '卸問屋', '大衆酒場', '夜光'
    ];
    const deckV = VW.slice(), deckH = HW.slice();
    let dv = 0, dh = 0;
    const reshuffle = function (a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = (rnd() * (i + 1)) | 0;
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
    };
    const drawV = function () {
      if (dv >= deckV.length) { reshuffle(deckV); dv = 0; }
      return deckV[dv++];
    };
    const drawH = function () {
      if (dh >= deckH.length) { reshuffle(deckH); dh = 0; }
      return deckH[dh++];
    };

    CT_BM.forEach(function (o, i) {
      const hh = o.top - o.y0;
      if (hh < 8.5) return;

      /* 朝南（+z）立面：竖招牌 */
      if (rnd() < 0.80) {
        const col = COL[(rnd() * COL.length) | 0];
        const pw = 0.85 + rnd() * 0.55;
        const ph = 2.6 + rnd() * 2.2;
        const span = Math.max(0.4, Math.min(hh - 6.6, 7.0));
        const y = o.y0 + 3.6 + rnd() * span;
        const x = o.x + (rnd() - 0.5) * Math.max(0.2, o.w - pw - 1.2);
        ctBoard(b, x, y, o.z + o.d / 2 + 0.04, pw, ph, 0, drawV(), col, true);
      }

      /* 朝东（+x）立面：横招牌 */
      if (rnd() < 0.64) {
        const col = COL[(rnd() * COL.length) | 0];
        const pw = 1.7 + rnd() * 1.6;
        const ph = 0.70 + rnd() * 0.42;
        const span = Math.max(0.4, Math.min(hh - 5.4, 4.0));
        const y = o.y0 + 3.3 + rnd() * span;
        const z = o.z + (rnd() - 0.5) * Math.max(0.2, o.d - pw - 1.2);
        ctBoard(b, o.x + o.w / 2 + 0.04, y, z, pw, ph, Math.PI / 2, drawH(), col, false);
      }

      /* 高楼再补一条纵向长招牌，压住塔身 */
      if (hh > 19 && rnd() < 0.6) {
        const col = COL[(rnd() * COL.length) | 0];
        ctBoard(b, o.x + (rnd() - 0.5) * Math.max(0.3, o.w - 2.2), o.y0 + hh * 0.56,
          o.z + o.d / 2 + 0.04, 1.25, Math.min(8.5, hh * 0.40), 0,
          drawV(), col, true);
      }
    });

    b.build(g);
    return g;
  }

  /* ================= 天桥 / 高架步道 ================= */
  /* ================= 路边立式霓虹 =================
     2077 日本区最认得出的一件东西：不挂在墙上，直接立在马路边上的
     细高灯箱。俯视角下它们是一串发光的竖条，等于把整条街点亮，
     比任何调色都有效 —— 而且刚好补上「街道被楼挡住」的损失。 */
  function buildCtPylons() {
    const g = new T.Group();
    const b = new Builder();
    const rnd = ctRnd(9091);
    const COL = [0xff2d7a, 0x22e6ff, 0xffd23f, 0x9a6bff, 0x4dff9a];
    const TXT = ['酒場', '薬', '麻雀', '喫茶', '焼肉', '電器', '占い', '質屋', '整体', '漫画'];

    /* 西侧立在西人行道上（x 3.9），东侧立在裙房前（x 15.9） */
    [[3.95, 1], [15.75, -1]].forEach(function (side, si) {
      const px = side[0];
      let z = -25.6 + (si ? 2.6 : 0);
      let k = si * 3;
      while (z < 26.2) {
        /* 让开横巷口、商店街口、南段路口 */
        const blocked = (z > -10.6 && z < -4.2) || (z > 8.6 && z < 16.4);
        if (blocked || z > 3.4 && z < 11.2) { z += 2.2; continue; }

        const h = 3.2 + rnd() * 2.4;
        const col = COL[(rnd() * COL.length) | 0];
        const w = 0.62 + rnd() * 0.22;
        const fw = 0.9 + rnd() * 0.7;   /* 外挑的幅度 */

        /* 立柱 + 底座 */
        b.cyl('ctSteelD', 0.075, 0.10, h, 6, px, h / 2 + 0.16, z);
        b.box('ctSteelD', 0.46, 0.16, 0.46, px, 0.24, z);

        /* 灯箱：沿街心方向外挑，双面发光 */
        const bx = px - side[1] * fw * 0.5;
        b.box('ctSignBox', fw, h * 0.72, 0.16, bx, h * 0.58, z);
        ctSign(TXT[k % TXT.length], col, bx, h * 0.58, z + 0.10,
          fw * 0.84, h * 0.54, 0, true, 1);
        ctSign(TXT[k % TXT.length], col, bx, h * 0.58, z - 0.10,
          fw * 0.84, h * 0.54, Math.PI, true, 0.75);
        ctGlow(bx, h * 0.58, z, col, h * 1.5, 0.20);

        /* 灯箱顶上的小挑臂，让轮廓不那么「一块板」 */
        b.box('ctSteelD', fw + 0.10, 0.06, 0.06, bx, h * 0.94, z);

        z += 4.6 + rnd() * 2.6;
        k++;
      }
    });

    b.build(g);
    return g;
  }

  /* 发光灯箱贴图：整块亮底 + 深色字。
     之前用「深底板 + 发光线字」，近看没问题，一到全景就只剩一个黑方块 ——
     远距离最先读到的永远是「面积 × 亮度」，不是笔画。所以反过来：
     让牌子本身成为光源，字挖空成暗色。 */
  function ctLitTex(text, colHex, vertical, sub) {
    const hex = '#' + ('000000' + colHex.toString(16)).slice(-6);
    const n = Math.max(1, text.length);
    const W = vertical ? 256 : 768;
    const H = vertical ? Math.max(256, Math.min(1400, 300 * n)) : 256;
    return canvasTex(W, H, function (c, w, h) {
      c.fillStyle = hex; c.fillRect(0, 0, w, h);
      /* 灯管的明暗：上亮下暗，中间一道白光，才有「背光板」的感觉 */
      const lg = c.createLinearGradient(0, 0, 0, h);
      lg.addColorStop(0.00, 'rgba(255,255,255,0.42)');
      lg.addColorStop(0.34, 'rgba(255,255,255,0.10)');
      lg.addColorStop(0.72, 'rgba(0,0,0,0.10)');
      lg.addColorStop(1.00, 'rgba(0,0,0,0.30)');
      c.fillStyle = lg; c.fillRect(0, 0, w, h);
      /* 灯管条纹：横向细线，近看才有，远看会糊成一层亮气 */
      c.fillStyle = 'rgba(255,255,255,0.10)';
      for (let y = 0; y < h; y += 9) c.fillRect(0, y, w, 2);

      const ink = 'rgba(10,6,18,0.90)';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      if (vertical) {
        const stepY = h / n;
        const fs = Math.min(w * 0.80, stepY * 0.80);
        c.font = '900 ' + Math.round(fs) + 'px "Yu Gothic","Meiryo","MS Gothic",sans-serif';
        c.fillStyle = ink;
        for (let i = 0; i < n; i++) c.fillText(text[i], w / 2, stepY * (i + 0.5));
      } else {
        const stepX = w / n;
        const fs = Math.min(h * (sub ? 0.56 : 0.72), stepX * 0.88);
        c.font = '900 ' + Math.round(fs) + 'px "Yu Gothic","Meiryo","MS Gothic",sans-serif';
        c.fillStyle = ink;
        for (let i = 0; i < n; i++) c.fillText(text[i], stepX * (i + 0.5), sub ? h * 0.40 : h * 0.50);
        if (sub) {
          c.font = '700 ' + Math.round(h * 0.14) + 'px "Arial Narrow",Arial,sans-serif';
          c.fillStyle = 'rgba(10,6,18,0.72)';
          c.fillText(sub, w / 2, h * 0.78);
        }
      }
      /* 边框 */
      c.strokeStyle = 'rgba(255,255,255,0.55)';
      c.lineWidth = 6;
      c.strokeRect(3, 3, w - 6, h - 6);
    });
  }

  /* ================= 巨幅招牌（landmark）=================
     在这个尺度下，1~2 米的小招牌只占几个像素，等于不存在。
     要让画面一眼读出「2077 日本区」，必须放 6~12 米的大件：
     塔身竖招、楼顶 LED 大屏、临街大灯箱。
     全部只挂 +x / +z 两个面 —— 相机永远在这两个象限里，
     朝 -x 的招牌只会把字背面翻给观众看。 */
  function buildCtLandmarks() {
    const g = new T.Group();
    const b = new Builder();
    const BR = 0xff2d7a, CY = 0x22e6ff, YL = 0xffd23f, PR = 0x9a6bff;

    /* 大灯箱：外框 + 发光字 + 光晕，一次成型 */
    function boxSign(text, col, x, y, z, pw, ph, ry, vertical, gl, sub) {
      b.box('ctSteelD', pw + 0.30, ph + 0.28, 0.26, x, y, z, 0, ry, 0);
      ctPlane(ctLitTex(text, col, vertical, sub), pw, ph,
        x + Math.sin(ry) * 0.16, y, z + Math.cos(ry) * 0.16, ry, 1, 6);
      if (gl !== false) {
        ctGlow(x + Math.sin(ry) * 0.9, y, z + Math.cos(ry) * 0.9,
          col, Math.max(pw, ph) * 1.35, 0.26);
      }
    }

    /* 楼顶大屏：斜撑铁架 + 发光板 */
    /* 楼顶大屏。baseY = 屋面标高：必须画两根落地立柱，
       否则一块亮板挂在立面外侧，看着就是「悬在半空的一张纸」。 */
    function roofScreen(c1, c2, big, small, x, y, z, pw, ph, ry, baseY) {
      const by = baseY === undefined ? y - ph * 0.5 - 1.2 : baseY;
      const top = y - ph * 0.5;
      const lh = Math.max(0.4, top - by);
      const dx = Math.cos(ry) * pw * 0.30, dz = -Math.sin(ry) * pw * 0.30;
      [1, -1].forEach(function (sgn) {
        b.box('ctSteelD', 0.16, lh, 0.16, x + sgn * dx, by + lh / 2, z + sgn * dz);
        /* 斜撑：一根斜杆把立柱和后墙拉住，架子才不像筷子 */
        b.box('ctSteelD', 0.10, 0.10, 0.9, x + sgn * dx, by + lh * 0.55, z + sgn * dz - 0.42);
      });
      b.box('ctSteelD', pw + 0.3, ph + 0.3, 0.20, x, y, z, 0, ry, 0);
      ctPlane(ctLitTex(big, c1, false, small), pw, ph,
        x + Math.sin(ry) * 0.13, y, z + Math.cos(ry) * 0.13, ry, 1, 6);
      ctGlow(x + Math.sin(ry) * 1.4, y, z + Math.cos(ry) * 1.4, c1, Math.max(pw, ph) * 1.3, 0.18);
    }

    /* ---- 1. T1 塔身：全场最高的那块竖招，两字最稳 ---- */
    boxSign('新宿', BR, -26.10, 32.6, -19.90, 4.0, 12.4, 0, true);

    /* ---- 2. B 巨构东墙：正对相机的大 LED，画面中景的锚点 ---- */
    roofScreen(CY, BR, '歌舞伎町', 'KABUKICHO 24H', 3.72, 20.6, -17.6, 8.6, 3.9, Math.PI / 2, 17.4);

    /* ---- 3. C 区东缘：一条竖招，把右侧塔群点亮 ---- */
    boxSign('電脳', CY, 29.96, 8.4, -10.4, 2.8, 7.6, Math.PI / 2, true);

    /* ---- 4. F 区临街：拉面店的竖招，右下角的主色 ---- */
    boxSign('ラーメン', YL, 27.34, 9.4, 1.8, 2.6, 7.8, Math.PI / 2, true);

    /* ---- 5. 南市集前排：三块临街灯箱，把前景从黑里拉出来 ---- */
    boxSign('居酒屋', BR, -27.00, 6.30, 13.66, 3.4, 1.3, 0, false);
    boxSign('麻雀', CY, -17.20, 6.90, 13.46, 3.2, 1.3, 0, false);
    boxSign('喫茶', YL, -7.20, 5.10, 13.76, 3.2, 1.3, 0, false);

    /* ---- 6. 南市集后排屋顶：大屏比招牌更抗距离 ---- */
    roofScreen(PR, YL, '夜市', 'NIGHT MARKET', -26.00, 12.30, 19.70, 3.6, 1.7, 0, 10.60);
    roofScreen(YL, BR, '占い', 'FORTUNE', -14.60, 11.10, 19.30, 3.2, 1.6, 0, 9.40);
    roofScreen(CY, PR, 'パチンコ', 'PACHINKO', -3.40, 10.40, 19.40, 3.2, 1.6, 0, 8.60);

    b.build(g);
    return g;
  }

  function buildCtBridges() {
    const g = new T.Group();
    const b = new Builder();

    /* 主天桥：横跨主街，玻璃管，全场最能读出「立体城市」的一件。
       抬到 12.8 米 + 加宽到 3.4 米，才不会被两侧楼体吃掉。 */
    ctBridge(b, 4.05, -14.8, 15.45, -14.8, 12.8, 3.4, 2.8, 'glass');
    /* 斜廊：一横一斜叠在一起，城市立刻从「一层平面」变成「多层交通」 */
    ctBridge(b, 4.05, -13.5, 15.45, -6.5, 17.6, 2.6, 2.4, 'glass');
    /* 低层桁架桥，靠北，拉开层次 */
    ctBridge(b, 4.05, -23.4, 15.45, -23.4, 6.4, 2.4, 2.1, 'truss');
    /* 南段低桥：给前景补一层横向切割，否则南半城只有竖线 */
    ctBridge(b, 4.05, 16.6, 15.45, 16.6, 7.2, 2.6, 2.2, 'truss');

    /* 高架步道：贴着 B 的立面走，悬在主街西侧上方 */
    ctDeck(b, 4.05, 5.55, -26.6, -9.6, 4.55);
    /* 步道尽端的下行楼梯 */
    for (let i = 0; i < 9; i++) {
      b.box('ctConcrete', 1.30, 0.16, 0.34, 4.75, 4.40 - i * 0.46, -9.9 - (8 - i) * 0.36);
    }
    b.box('ctSteelD', 1.40, 0.10, 0.10, 4.75, 4.62, -9.7);
    /* 楼梯扶手 */
    b.to('ctSteelD', 0.045, 5.40, 4.62, -9.9, 5.40, 0.60, -12.8, 4);

    /* 步道上的小件：花箱 / 灯箱 / 贩卖机 */
    [[-24.0, 'ctPlant'], [-19.0, 'ctPlant'], [-13.4, 'ctPlant']].forEach(function (q, i) {
      b.box('ctStoneD', 1.0, 0.42, 0.52, 4.80, 4.55 + 0.21, q[0]);
      b.sph(q[1], 0.30, 4.80, 4.55 + 0.52, q[0], 1.2, 0.8, 1);
    });
    b.box('ctSignBox', 0.20, 0.90, 1.60, 5.40, 5.35, -16.6);
    ctSign('市場', 0xffd23f, 5.55, 5.35, -16.6, 1.4, 0.72, Math.PI / 2, false, 1);
    ctGlow(5.6, 5.35, -16.6, 0xffd23f, 3.4, 0.20);

    /* 跨街横幅：横在主街上空的两条钢索 + 一块发光布。
       2077 的日本街就是被这种东西切成一节一节的 —— 抬头是招牌，
       低头是湿路，中间才是人。 */
    [[-7.6, 7.4, '商店街', 0xff2d7a], [3.0, 8.2, '电气街', 0x22e6ff],
     [17.4, 6.8, '夜市場', 0xffd23f]].forEach(function (q) {
      const z = q[0], y = q[1];
      b.box('ctCable', 11.6, 0.05, 0.05, 9.75, y + 0.55, z);
      b.box('ctSignBox', 8.6, 1.05, 0.20, 9.75, y, z);
      ctSign(q[2], q[3], 9.75, y, z + 0.13, 8.0, 0.88, 0, false, 1);
      ctSign(q[2], q[3], 9.75, y, z - 0.13, 8.0, 0.88, Math.PI, false, 0.7);
      ctGlow(9.75, y, z, q[3], 9.0, 0.16);
      /* 横幅两端的挂点 */
      b.box('ctSteelD', 0.16, 0.16, 0.16, 4.10, y + 0.55, z);
      b.box('ctSteelD', 0.16, 0.16, 0.16, 15.40, y + 0.55, z);
    });

    /* 桥底吊挂的管线和招牌，城市感全在这些碎件上 */
    for (let z = -13.0; z < -9.8; z += 0.9) {
      b.cyl('ctPipe', 0.09, 0.09, 0.42, 5, 4.6, 4.30, z);
    }
    b.box('ctPipe', 0.10, 0.10, 17.0, 4.62, 4.22, -18.1);
    b.box('ctPipe', 0.08, 0.08, 17.0, 4.80, 4.14, -18.1);

    b.build(g);
    return g;
  }

  /* ================= 商店街：拱顶 + 牌楼 + 摊位 ================= */
    /* ================= 市场：把商店街做成画面里的兴趣点 =================
     一条 40 米长的市场，光靠 22 个 1.5 米小摊撑不起来 —— 它们在俯视角
     下只是一排小方盒。真正让它读成「市场」的是三件事的密度：
     ① 头顶连成一片的彩色棚布  ② 一面墙上一口气二十块招牌
     ③ 地上铺开的箱、筐、布摊。缺一件，它就还是一排摊子；
     三件齐了，它是画面里唯一一处「热闹」。 */

  /* ---- 招牌墙贴图：一张 canvas 装 15 块招牌 ----
     全景里 1 米以下的招牌只占几个像素。与其一块块挂（每块一个贴图、
     一次 draw call），不如把十几块画进同一张图再平铺。远处看到的
     本来就是「一片彩色小块」，不是字。 */
  function ctSignWallTex(seed) {
    const rnd = ctRnd(seed || 7);
    const PAL = [
      [255, 45, 122], [34, 230, 255], [255, 210, 63],
      [77, 255, 154], [154, 107, 255], [255, 138, 60],
      [235, 235, 240], [255, 96, 32]
    ];
    /* 一行六条竖招牌 —— 不是六宫格。商店街墙上的招牌本来就是竖长条，
       做成方格平铺出来像一张马赛克贴纸，一眼就假。 */
    return canvasTex(300, 200, function (c, w, h) {
      c.fillStyle = '#07070d';
      c.fillRect(0, 0, w, h);
      const cols = 6;
      const cw = w / cols;
      for (let i = 0; i < cols; i++) {
        /* 有的格子关着灯（空店面），dens 高一点画面才透气 */
        if (rnd() < 0.16) continue;
        const q = PAL[(rnd() * PAL.length) | 0];
        const pad = 1.5 + rnd() * 1.5;
        const x0 = i * cw + pad;
        const ww = cw - pad * 2;
        const y0 = 2 + rnd() * 5;
        const hh = h - y0 - 2 - rnd() * 6;
        /* 灯箱底：上亮下暗 + 一条提亮的灯管边 */
        const gr = c.createLinearGradient(x0, y0, x0, y0 + hh);
        gr.addColorStop(0.00, 'rgb(' + q[0] + ',' + q[1] + ',' + q[2] + ')');
        gr.addColorStop(0.32, 'rgb(' + ((q[0] * 0.82) | 0) + ',' + ((q[1] * 0.82) | 0) + ',' + ((q[2] * 0.82) | 0) + ')');
        gr.addColorStop(1.00, 'rgb(' + ((q[0] * 0.42) | 0) + ',' + ((q[1] * 0.42) | 0) + ',' + ((q[2] * 0.42) | 0) + ')');
        c.fillStyle = gr;
        c.fillRect(x0, y0, ww, hh);
        /* 竖排字：随机横竖笔画。远处只认黑块与留白的比例。 */
        c.fillStyle = 'rgba(5,4,10,0.90)';
        const nch = 2 + ((rnd() * 3) | 0);
        const fs2 = Math.min(ww * 0.66, hh / (nch + 0.5));
        const cy = y0 + (hh - fs2 * nch) / 2;
        for (let k = 0; k < nch; k++) {
          const bx = x0 + (ww - fs2 * 0.82) / 2;
          const by = cy + k * fs2;
          const st = Math.max(1.5, fs2 * 0.13);
          for (let n = 0; n < 5; n++) {
            if (rnd() < 0.28) continue;
            if (rnd() < 0.5) c.fillRect(bx, by + fs2 * rnd() * 0.80, fs2 * 0.82, st);
            else c.fillRect(bx + fs2 * rnd() * 0.70, by, st, fs2 * 0.88);
          }
        }
        /* 灯管边：招牌外侧一圈白提亮，俯视角下这条边是「招牌在发光」的证据 */
        c.strokeStyle = 'rgba(255,255,255,0.36)';
        c.lineWidth = 1.6;
        c.strokeRect(x0 + 0.8, y0 + 0.8, ww - 1.6, hh - 1.6);
      }
    });
  }

  /* 长条招牌墙：一张贴图平铺 rep 次。十几米的招牌密度只要一个 mesh。 */
  function ctSignStrip(len, hgt, x, y, z, ry, rep, seed, op) {
    const tex = ctSignWallTex(seed);
    tex.wrapS = T.RepeatWrapping;
    tex.repeat.set(Math.max(1, rep), 1);
    const m = new T.Mesh(new T.PlaneGeometry(len, hgt), new T.MeshBasicMaterial({
      map: tex, transparent: true, blending: T.AdditiveBlending,
      depthWrite: false, fog: false, side: T.DoubleSide,
      opacity: op === undefined ? 1 : op
    }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.renderOrder = 6;
    scene.add(m);
    return m;
  }

  /* ---- 连续棚布：市场头顶那层彩色波浪顶 ----
     一段一段接起来，每段长度、高度、颜色都抖一下。整齐的雨棚看着像
     工地围挡，错落的才像「有人在这里摆了很多年摊」。 */
  const CT_AWNK = ['ctAwn1', 'ctAwn2', 'ctAwn3', 'ctAwn4', 'ctAwn5', 'ctAwn6'];
  function ctAwningRun(b, x0, x1, zEdge, dir, yBase, wid, seed) {
    const rnd = ctRnd(seed || 3);
    const RX = 0.20;
    const drop = Math.sin(RX) * wid;
    let x = x0, i = 0;
    while (x < x1 - 0.35) {
      const seg = 1.30 + rnd() * 0.55;
      const w2 = Math.min(seg, x1 - x);
      const y = yBase + (rnd() - 0.5) * 0.30;
      /* 每七段空一段：节奏均匀的缺口，比随机更像「有人在这儿摆摊」 */
      if (i % 7 === 3) { x += seg; i++; continue; }
      const k = CT_AWNK[(i + ((rnd() * 2) | 0)) % CT_AWNK.length];
      /* 棚布本体（向外倾斜 11°） */
      b.box(k, w2 - 0.07, 0.055, wid, x + w2 / 2, y - drop / 2,
        zEdge + dir * wid / 2, dir * RX, 0, 0);
      /* 外沿垂边：没有这一条，棚布就只是一块斜板 */
      b.box(k, w2 - 0.07, 0.34, 0.05, x + w2 / 2, y - drop - 0.17,
        zEdge + dir * wid, 0, 0, 0);
      /* 内沿固定杆 */
      b.box('ctSteelD', 0.05, 0.05, 0.26, x + 0.07, y, zEdge + dir * 0.12);
      x += seg; i++;
    }
  }

  /* 遮阳伞：市场里少数几个「立起来」的东西，撑开空间 */
  function ctUmb(b, x, z, key) {
    const y = CT_GY;
    b.cyl('ctSteelD', 0.028, 0.038, 2.10, 6, x, y + 1.05, z);
    b.cyl(key, 0.03, 0.62, 0.30, 8, x, y + 2.11, z);
    b.cyl(key, 0.62, 0.67, 0.07, 8, x, y + 1.97, z);
    b.cyl('ctSteelD', 0.024, 0.024, 0.12, 5, x, y + 2.28, z);
  }

  /* 泡沫鱼箱堆：水产摊的标志。走 emit 表，夜里是市场最亮的一团白。 */
  function ctFoamStack(b, x, z, n, seed) {
    const rnd = ctRnd(seed || 5);
    for (let i = 0; i < n; i++) {
      const ox = (rnd() - 0.5) * 0.14, oz = (rnd() - 0.5) * 0.14;
      const ry = (rnd() - 0.5) * 0.34;
      const yy = CT_GY + 0.15 + i * 0.29;
      b.box('ctFoam', 0.62, 0.27, 0.44, x + ox, yy, z + oz, 0, ry, 0);
      b.box('ctFoam', 0.58, 0.05, 0.40, x + ox, yy + 0.145, z + oz, 0, ry, 0);
    }
  }

  /* 地摊：一块布 + 堆在布上的货。没有顶、没有腿，就是「铺开」 */
  function ctGroundStall(b, x, z, seed) {
    const rnd = ctRnd(seed || 9);
    b.box('ctCloth2', 1.15, 0.04, 0.72, x, CT_GY + 0.021, z);
    b.box('ctCloth1', 0.94, 0.035, 0.58, x, CT_GY + 0.039, z);
    for (let i = 0; i < 5; i++) {
      const lx = -0.40 + i * 0.20 + (rnd() - 0.5) * 0.05;
      const lz = (rnd() - 0.5) * 0.42;
      const k = rnd() < 0.42 ? 'ctFoam' : (rnd() < 0.5 ? 'ctCrate3' : 'ctCrate');
      b.box(k, 0.17, 0.14, 0.16, x + lx, CT_GY + 0.12, z + lz, 0, (rnd() - 0.5) * 0.5, 0);
    }
  }

  /* 价格牌：一块斜靠的小黑板。市场里最便宜也最有效的「人味」 */
  function ctPriceTag(b, x, z, side) {
    const sg = side || 1;
    b.box('ctWoodD', 0.44, 0.33, 0.05, x, CT_GY + 0.24, z, -0.20 * sg, 0, 0);
    b.box('ctCream', 0.38, 0.25, 0.02, x, CT_GY + 0.24, z + 0.038 * sg, -0.20 * sg, 0, 0);
  }

  /* 城市行人：远处只有十来个像素，细节没意义，但「方盒身 + 肩膀横杠」
     的剪影太生硬。改成锥台躯干 + 两条分开的腿 + 圆肩 + 细手臂，
     材质仍严格保持 3 桶（衣 / 裤 / 肤），不增加动画 Group 的 draw call。 */
  /* 城市行人：远景只有十来像素，严格保持 3 个材质桶（衣 / 裤 / 肤），
     不画面部，一个人一个动画 Group 才不会把 draw call 翻上去。 */
  function ctPed(b, x, z, ry, o) {
    o = o || {};
    const s = o.s || 1;
    const y0 = o.y === undefined ? CT_GY : o.y;
    const ck = o.coat || 'ctPedA';
    buildFig({
      b: b, x: x, y: y0, z: z, ry: ry, s: s, face: false,
      coat: ck, pants: 'ctPedP', skin: 'ctPedS', hair: ck,
      ink: ck, belt: 'ctPedP', shoe: 'ctPedP'
    });
  }

  /* ================= 车流与行人：让城市动起来 =================
     Builder 把同材质的几何合批成一个 mesh —— 那是静态场景的最优解，
     代价是动不了。移动单元只能各自成组：一辆车一个 Group，一个人
     一个 Group，每帧改 position。
     为了压住 draw call：车只留四个材质、人只留三个，并且全部关掉
     描边 —— 远处十来像素的东西，描边只会变成一层噪点。 */

  /* 沿线段平移。两端都收在楼体里，所以用 visible 在端点附近掐掉，
     看起来就是「开进楼里了」，不会凭空消失或闪现。 */
  function ctTrack(g, o) {
    const dx = o.x1 - o.x0, dz = o.z1 - o.z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.5) return;
    const ry = o.walk ? Math.atan2(dx, dz) : Math.atan2(-dx, -dz);
    g.rotation.y = ry;
    const T = len / o.speed;
    const bob = o.bob || 0;
    const ph = o.phase || 0;
    const cull = o.cull || 0;
    CT_ANIM.push(function (t) {
      const u = (t / T + ph) % 1;
      const wob = bob ? Math.abs(Math.sin(t * 6.6 + ph * 9.0)) * bob : 0;
      g.position.set(o.x0 + dx * u, o.y + wob, o.z0 + dz * u);
      if (bob) g.rotation.z = Math.sin(t * 6.6 + ph * 9.0) * 0.030;
      if (cull) g.visible = u > cull && u < 1 - cull;
    });
  }

  function ctCarUnit(body, s) {
    const g = new T.Group();
    const b = new Builder();
    ctCar(b, 0, 0, 0, body, { s: s });
    b.build(g, { noOutline: ['ctTire', 'ctGlassT', 'ctTail', 'ctHead', body] });
    /* 车头推到地面上的一片光。加色混合、不写深度、不吃雾。
       夜景里车身几乎看不见，能证明「有车在跑」的就是这片移动的亮斑。 */
    const ll = new T.Mesh(new T.PlaneGeometry(2.6 * s, 4.2 * s), new T.MeshBasicMaterial({
      map: CY_GLOW, color: new T.Color(0xffe0b0), transparent: true,
      opacity: 0.62, blending: T.AdditiveBlending, depthWrite: false, fog: false
    }));
    ll.rotation.x = -Math.PI / 2;
    ll.position.set(0, 0.05, -2.6 * s);
    ll.renderOrder = 2;
    g.add(ll);
    return g;
  }

  function ctPedUnit(coat, s) {
    const g = new T.Group();
    const b = new Builder();
    ctPed(b, 0, 0, 0, { coat: coat, s: s, y: 0 });
    b.build(g, { noOutline: ['ctPedP', 'ctPedS', coat] });
    return g;
  }

  /* 桥上车流 + 街面车流 + 桥上/街上行人 */
  function buildCtTraffic() {
    const g = new T.Group();

    /* ---- 1. 天桥车流 ----
       四座桥各跑两辆（一向一辆），从西端开进东端的楼里再回来。
       玻璃管桥从侧面能看见车在管子里走，这是「立体交通」唯一
       能动的证据。 */
    const BR = [
      [4.30, -14.60, 15.20, -14.60, 12.80, 2.30, 'ctBodyL2', 0.98, 0.00],
      [4.30, -15.02, 15.20, -15.02, 12.80, 2.30, 'ctBodyL', 0.98, 0.52],
      [4.30, -13.20, 15.20, -6.90, 17.60, 2.60, 'ctBody4', 0.84, 0.18],
      [4.30, -23.58, 15.20, -23.58, 6.40, 2.10, 'ctBody2', 0.86, 0.66],
      [4.30, 16.42, 15.20, 16.42, 7.20, 2.10, 'ctBody',  0.86, 0.34]
    ];
    BR.forEach(function (q) {
      const c = ctCarUnit(q[6], q[7]);
      ctTrack(c, {
        x0: q[0], z0: q[1], x1: q[2], z1: q[3], y: q[4],
        speed: q[5], phase: q[8], cull: 0.055
      });
      g.add(c);
    });

    /* ---- 2. 街面车流 ----
       主街两条车道。街面比桥上重要得多 —— 全景里唯一能看出
       「这座城在运转」的就是这条会动的光带。 */
    const AV = [
      [7.0, 27.0, 7.0, -26.0, 3.10, 'ctBody2', 0.94, 0.00],
      [7.0, 27.0, 7.0, -26.0, 3.10, 'ctBody4', 0.94, 0.42],
      [12.6, -26.0, 12.6, 27.0, 3.10, 'ctBody', 0.94, 0.20],
      [12.6, -26.0, 12.6, 27.0, 3.10, 'ctBody3', 0.94, 0.72]
    ];
    AV.forEach(function (q) {
      const c = ctCarUnit(q[5], q[6]);
      ctTrack(c, {
        x0: q[0], z0: q[1], x1: q[2], z1: q[3], y: CT_GY,
        speed: q[4], phase: q[7], cull: 0.03
      });
      g.add(c);
    });

    /* ---- 3. 桥上行人 ----
       玻璃桥两侧各留 0.55 米給人走。人是「城市还活着」最直接的
       信号：一串缓慢移动的小点，比任何霓虹都有效。 */
    const PED = [
      /* 主桥（南侧步道 / 北侧步道） */
      [4.55, -14.05, 15.05, -14.05, 12.80, 0.96, 0.00, 'ctPedB'],
      [4.55, -14.05, 15.05, -14.05, 12.80, 0.96, 0.38, 'ctPedD'],
      [15.05, -15.55, 4.55, -15.55, 12.80, 0.92, 0.15, 'ctPedC'],
      [15.05, -15.55, 4.55, -15.55, 12.80, 0.92, 0.62, 'ctPedA'],
      /* 斜廊 */
      [4.55, -12.70, 15.05, -7.40, 17.60, 0.98, 0.28, 'ctPedA'],
      [15.05, -7.40, 4.55, -12.70, 17.60, 0.94, 0.75, 'ctPedD'],
      /* 北桁架桥 */
      [4.55, -23.72, 15.05, -23.72, 6.40, 0.90, 0.44, 'ctPedC'],
      /* 南桥 */
      [15.05, 16.88, 4.55, 16.88, 7.20, 0.90, 0.08, 'ctPedB']
    ];
    PED.forEach(function (q) {
      const p = ctPedUnit(q[7], 1.14);
      ctTrack(p, {
        x0: q[0], z0: q[1], x1: q[2], z1: q[3], y: q[4],
        speed: q[5], phase: q[6], bob: 0.035, walk: true, cull: 0.03
      });
      g.add(p);
    });

    /* ---- 4. 街上行人 ----
       主街两侧人行道 + 市场走道 + 南市集。人行道 3.30 / 14.94 是
       贴店铺的那两条，人走在檐下，影子落在湿路上。 */
    const WALK = [
      /* 主街西侧人行道（向南流） */
      [3.32, -26.0, 3.32, 26.5, 0.94, 0.00, 'ctPedA'],
      [3.32, -26.0, 3.32, 26.5, 0.94, 0.21, 'ctPedC'],
      [3.32, -26.0, 3.32, 26.5, 0.94, 0.47, 'ctPedD'],
      [3.32, -26.0, 3.32, 26.5, 0.94, 0.73, 'ctPedB'],
      /* 主街东侧人行道（向北流） */
      [14.94, 26.5, 14.94, -26.0, 1.00, 0.12, 'ctPedB'],
      [14.94, 26.5, 14.94, -26.0, 1.00, 0.36, 'ctPedD'],
      [14.94, 26.5, 14.94, -26.0, 1.00, 0.58, 'ctPedA'],
      [14.94, 26.5, 14.94, -26.0, 1.00, 0.82, 'ctPedC'],
      /* 市场走道（沿 x 来回） */
      [3.40, 7.55, -27.0, 7.55, 0.80, 0.06, 'ctPedD'],
      [3.40, 7.95, -27.0, 7.95, 0.80, 0.44, 'ctPedA'],
      [-27.0, 7.95, 3.40, 7.95, 0.80, 0.18, 'ctPedC'],
      [-27.0, 7.55, 3.40, 7.55, 0.80, 0.68, 'ctPedB'],
      /* 南市集 */
      [-28.0, 14.60, 1.60, 14.60, 0.88, 0.30, 'ctPedA'],
      [-28.0, 15.20, 1.60, 15.20, 0.88, 0.70, 'ctPedC']
    ];
    WALK.forEach(function (q) {
      const p = ctPedUnit(q[6], 1.14);
      ctTrack(p, {
        x0: q[0], z0: q[1], x1: q[2], z1: q[3], y: CT_GY,
        speed: q[4], phase: q[5], bob: 0.035, walk: true, cull: 0.02
      });
      g.add(p);
    });

    scene.add(g);
    return g;
  }

  function buildCtMarket() {
    const g = new T.Group();
    const b = new Builder();
    const zc = (CT_ARC[0] + CT_ARC[1]) / 2;
    const X0 = -29.0, X1 = 3.6;

    /* ---- 1. 头顶的彩色棚布（南北两侧各一排，把走道盖成「通道」）---- */
    ctAwningRun(b, X0, -14.6, CT_ARC[0], 1, 3.44, 1.32, 41);
    ctAwningRun(b, -14.4, X1, CT_ARC[0], 1, 3.44, 1.32, 43);
    ctAwningRun(b, X0, -14.6, CT_ARC[1], -1, 3.38, 1.32, 47);
    ctAwningRun(b, -14.4, X1, CT_ARC[1], -1, 3.38, 1.32, 53);

    /* ---- 2. 招牌墙：挂在棚布垂边下，一段段错开长度 ----
       只做南北两个面 —— 相机永远在 +x / +z 象限，朝 -x 的招牌
       只会把字背面翻给观众。 */
    [[-28.2, 5.0], [-22.6, 5.4], [-16.8, 5.2], [-11.0, 6.0], [-4.4, 6.2], [1.4, 3.4]]
      .forEach(function (q, i) {
        ctSignStrip(q[1], 0.86, q[0] + q[1] / 2, 3.98, CT_ARC[0] - 0.06, Math.PI,
          Math.round(q[1] / 2.6), 310 + i * 7, 1);
      });
    [[-27.4, 4.8], [-21.8, 5.2], [-15.6, 5.0], [-9.6, 5.6], [-3.0, 6.0], [1.2, 3.2]]
      .forEach(function (q, i) {
        ctSignStrip(q[1], 0.80, q[0] + q[1] / 2, 3.94, CT_ARC[1] + 0.06, 0,
          Math.round(q[1] / 2.6), 330 + i * 7, 0.90);
      });

    /* ---- 3. 袖看板：垂直伸出墙面的一排小竖招 ----
       这是「招牌群」的骨。装在小臂长的横杆上，两三个字一路排过去，
       俯视角下形成一排等距的彩色竖条 —— 密集感全靠它。 */
    const SLEEVE = [
      [-27.6, 3.30, '鮮魚', 0x22e6ff], [-24.4, 3.62, '青果', 0x4dff9a],
      [-21.2, 3.38, '酒処', 0xff2d7a], [-18.0, 3.66, '焼鳥', 0xffd23f],
      [-14.9, 3.34, '乾物', 0x9a6bff], [-11.6, 3.58, '茶', 0x4dff9a],
      [-8.4, 3.36, '菓子', 0xff8a3c], [-5.2, 3.64, '鮮魚', 0x22e6ff],
      [-2.0, 3.40, '青果', 0x4dff9a], [1.0, 3.56, '大衆酒場', 0xff2d7a]
    ];
    SLEEVE.forEach(function (q, i) {
      const x = q[0], y = q[1];
      /* 横杆：从墙面伸进走道 */
      b.box('ctSteelD', 0.06, 0.06, 1.24, x, y + 0.92, CT_ARC[0] + 0.62);
      /* 竖招牌本体（暗底，让 ctSign 的发光字有衬底） */
      b.box('ctSignBox', 0.16, 1.34, 0.58, x, y + 0.06, CT_ARC[0] + 1.10);
      ctSign(q[2], q[3], x + 0.09, y + 0.10, CT_ARC[0] + 1.10,
        0.52, 1.26, Math.PI / 2, true, 1);
      ctSign(q[2], q[3], x - 0.09, y + 0.10, CT_ARC[0] + 1.10,
        0.52, 1.26, -Math.PI / 2, true, 0.85);
      ctGlow(x, y + 0.12, CT_ARC[0] + 1.13, q[3], 2.2, 0.18);
    });

    /* ---- 4. 地上的货 ---- */
    /* 泡沫箱沿着南墙根堆，一排白箱子是水产市场的签名 */
    [[-27.0, 5.90], [-24.0, 5.90], [-19.4, 5.90], [-12.2, 5.90],
     [-7.0, 5.90], [-1.4, 5.90]].forEach(function (q, i) {
      ctFoamStack(b, q[0], q[1], 2 + (i % 3), 60 + i * 5);
    });
    /* 北墙根的木箱 */
    [[-25.4, 9.66], [-18.2, 9.66], [-11.0, 9.66], [-4.4, 9.66]].forEach(function (q, i) {
      const n = 2 + (i % 2);
      for (let k = 0; k < n; k++) {
        b.box('ctCrate3', 0.56, 0.30, 0.42, q[0] + (k % 2) * 0.06,
          CT_GY + 0.15 + k * 0.30, q[1]);
      }
    });
    /* 走道上的地摊：只放三处，把通道「挤窄」——拥挤本身就是市场的质感 */
    ctGroundStall(b, -23.4, zc, 71);
    ctGroundStall(b, -13.2, zc, 73);
    ctGroundStall(b, -5.4, zc, 77);
    /* 遮阳伞 */
    ctUmb(b, -20.6, zc + 0.16, 'ctUmb');
    ctUmb(b, -10.2, zc - 0.14, 'ctUmb2');
    ctUmb(b, 0.4, zc + 0.16, 'ctUmb');
    /* 价格板 */
    [[-25.6, 6.55, -1], [-16.0, 9.32, 1], [-6.6, 6.58, -1], [0.6, 9.28, 1]]
      .forEach(function (q) { ctPriceTag(b, q[0], q[1], q[2]); });

    /* ---- 5. 灯串：三道横跨走道的灯串，把头顶缝起来 ---- */
    [-22.4, -9.2, -3.0].forEach(function (x) {
      b.box('ctCable', 0.028, 0.028, CT_ARC[1] - CT_ARC[0] - 0.5, x, 3.56, zc);
      for (let z = CT_ARC[0] + 0.45; z < CT_ARC[1] - 0.35; z += 0.52) {
        const u = (z - CT_ARC[0]) / (CT_ARC[1] - CT_ARC[0]);
        b.box('ctBulb', 0.075, 0.075, 0.075, x,
          3.52 - Math.sin(u * Math.PI) * 0.16, z);
      }
    });

    /* ---- 6. 市场大门：全景里唯一能指出「市场在这儿」的东西 ----
       市场夹在南市集和商铺街之间，从任何俯视角都被南北两排楼吃掉。
       棚布再艳，高度只有 3.4 米，压在 7~9 米的楼后面连一条缝都不露。
       所以必须立一座高过棚布的牌楼：它是地标，也是「兴趣点」的入口。 */
    (function () {
      const GX = 1.55;
      const Z0 = CT_ARC[0] + 0.30, Z1 = CT_ARC[1] - 0.30;
      const ZC = (Z0 + Z1) / 2;
      [Z0, Z1].forEach(function (z) {
        b.box('ctSteelD', 0.34, 7.00, 0.34, GX, 3.50, z);
        /* 柱脚与柱身两道霓虹箍，夜里才立得住 */
        b.box('ctNeonM', 0.42, 0.10, 0.42, GX, 0.26, z);
        b.box('ctNeonC', 0.42, 0.09, 0.42, GX, 3.10, z);
      });
      /* 横梁 + 檐口 */
      b.box('ctSteelD', 0.46, 0.38, Z1 - Z0 + 0.62, GX, 6.95, ZC);
      b.box('ctNeonM', 0.52, 0.09, Z1 - Z0 + 0.70, GX, 7.18, ZC);
      /* 大横匾：双面，朝主街一面最亮 */
      b.box('ctSignBox', 0.26, 1.70, 3.70, GX, 5.85, ZC);
      ctSign('市場', 0xff2d7a, GX + 0.16, 5.85, ZC, 3.40, 1.52, Math.PI / 2, false, 1);
      ctSign('市場', 0x22e6ff, GX - 0.16, 5.85, ZC, 3.40, 1.52, -Math.PI / 2, false, 0.82);
      ctGlow(GX, 5.85, ZC, 0xff2d7a, 8.0, 0.24);
      ctGlow(GX, 7.10, ZC, 0xffd23f, 6.0, 0.16);
      /* 檐下一排灯管 */
      for (let z = Z0 + 0.28; z < Z1; z += 0.60) {
        b.box('ctBulb', 0.11, 0.11, 0.11, GX, 7.28, z);
      }
      /* 红灯笼：三串，从横匾底下垂下来 */
      [-1.55, 0, 1.55].forEach(function (dz) {
        const z = ZC + dz;
        b.cyl('ctCable', 0.016, 0.016, 0.36, 4, GX, 4.84, z);
        b.sph('ctUmb', 0.152, GX, 4.44, z, 1, 1.18, 1);
        b.sph('ctUmb', 0.152, GX, 4.02, z, 1, 1.18, 1);
      });
    })();

    /* ---- 7. 摊主：站在摊位后面，一头一肩就是「有人」 ---- */
    [[-27.4, 5.98, 'ctPedB'], [-24.6, 5.98, 'ctPedC'], [-20.2, 5.98, 'ctPedD'],
     [-16.4, 5.98, 'ctPedA'], [-12.4, 9.62, 'ctPedC'], [-7.8, 9.62, 'ctPedB'],
     [-2.8, 9.62, 'ctPedD'], [0.6, 9.62, 'ctPedA']
    ].forEach(function (q) { ctPed(b, q[0], q[1], 0, { coat: q[2] }); });

    b.build(g);
    return g;
  }

  function buildCtArcade() {
    const g = new T.Group();
    const b = new Builder();

    const zc = (CT_ARC[0] + CT_ARC[1]) / 2;
    const halfW = (CT_ARC[1] - CT_ARC[0]) / 2;

    /* 拱顶只盖西段（x −29…−14.6），东段敞开 —— 全盖住就看不见摊位了 */
    ctVault(b, 'ctRoof', 'ctSteelD', -29.0, -14.6, zc, halfW - 0.1, 4.30, 1.35, 9, 3.0);

    /* 牌楼 ×2：东口 / 西口 —— 立在拱顶之外，才不会被屋顶吃掉上半截 */
    [[-14.1, 0xff2d7a, 1], [-28.6, 0x22e6ff, -1]].forEach(function (q) {
      const x = q[0];
      b.box('ctSteelD', 0.28, 4.30, 0.28, x, 2.15, zc - halfW + 0.18);
      b.box('ctSteelD', 0.28, 4.30, 0.28, x, 2.15, zc + halfW - 0.18);
      b.box('ctSteelD', 0.34, 0.34, (halfW - 0.18) * 2, x, 4.40, zc);
      b.box('ctSignBox', 0.30, 0.92, halfW * 2.0, x, 5.05, zc);
      b.box(q[1] === 0xff2d7a ? 'ctNeonM' : 'ctNeonC', 0.36, 0.06, halfW * 2.0, x, 5.55, zc);
      ctSign('商店街', q[1], x + q[2] * 0.18, 5.05, zc,
        halfW * 1.7, 0.72, q[2] > 0 ? Math.PI / 2 : -Math.PI / 2, false, 1);
      ctGlow(x, 5.05, zc, q[1], 5.0, 0.22);
    });

    /* 拱顶下垂的横断幕 */
    for (let x = -28.2; x < -14.6; x += 3.2) {
      b.box('ctCloth1', 0.10, 0.72, halfW * 1.7, x, 4.02, zc);
      b.box('ctBulb', 0.12, 0.05, halfW * 1.7, x, 3.64, zc);
    }


  /* 摊位：西段在拱顶下，东段敞着（东段才是能看清的那批） */
    const stalls = [
      [-27.4, 6.6, 0], [-24.6, 6.7, 0.06], [-21.8, 6.6, -0.05],
      [-19.0, 6.7, 0.04], [-16.4, 6.6, 0],
      [-28.0, 8.9, Math.PI], [-25.2, 8.9, Math.PI + 0.05], [-22.4, 8.9, Math.PI],
      [-19.6, 8.9, Math.PI - 0.04], [-16.8, 8.9, Math.PI],
      [-13.4, 6.5, 0], [-10.6, 6.6, 0.06], [-7.8, 6.5, -0.04],
      [-5.0, 6.6, 0.03], [-2.2, 6.5, 0], [0.6, 6.6, -0.05],
      [-13.6, 9.0, Math.PI], [-10.8, 9.0, Math.PI + 0.04], [-8.0, 8.9, Math.PI],
      [-5.2, 9.0, Math.PI - 0.03], [-2.4, 8.9, Math.PI], [0.4, 9.0, Math.PI]
    ];
    stalls.forEach(function (q, i) {
      ctStall(b, q[0], q[1], q[2], {
        w: 1.5, d: 0.95, h: 2.05,
        awk: i % 3 === 0 ? 'ctAwning' : (i % 3 === 1 ? 'ctAwning2' : 'ctCloth1')
      });
    });

    /* 摊位上方的灯串 */
    for (let x = -13.6; x < 3.6; x += 1.4) {
      b.box('ctBulb', 0.10, 0.10, 0.10, x, 3.55, zc - halfW + 0.55);
      b.box('ctBulb', 0.10, 0.10, 0.10, x, 3.55, zc + halfW - 0.55);
    }
    b.box('ctCable', 0.03, 0.03, halfW * 2 - 0.8, -14.6, 3.62, zc, 0, Math.PI / 2, 0);
    b.to('ctCable', 0.024, -14.6, 3.62, 5.62, 3.6, 3.62, 5.62, 4);
    b.to('ctCable', 0.024, -14.6, 3.62, 9.88, 3.6, 3.62, 9.88, 4);

    /* 市场口的招牌与横幅 */
    ctSign('鮮魚', 0x22e6ff, -8.2, 3.30, 5.56, 1.1, 0.62, 0, false, 1);
    ctSign('青果', 0x4dff9a, -3.0, 3.30, 5.56, 1.1, 0.62, 0, false, 1);
    ctGlow(-8.2, 3.30, 5.62, 0x22e6ff, 2.6, 0.18);
    ctGlow(-3.0, 3.30, 5.62, 0x4dff9a, 2.6, 0.18);

    b.build(g);
    return g;
  }

  /* ================= 街道层 ================= */
  function buildCtStreet() {
    const g = new T.Group();
    const b = new Builder();

    /* 电线杆 + 电缆：日式街景的骨架 */
    function pole(px, pz, h, armDir) {
      b.cyl('ctConcrete', 0.10, 0.14, h, 8, px, h / 2, pz);
      b.box('ctConcrete', 0.30, 0.36, 0.30, px, 0.18, pz);
      b.box('ctSteelD', 1.40, 0.07, 0.10, px, h - 0.55, pz);
      b.box('ctSteelD', 1.10, 0.07, 0.10, px, h - 0.95, pz);
      for (let i = 0; i < 4; i++) {
        const ox = -0.62 + i * 0.42;
        b.cyl('ctPorc', 0.035, 0.045, 0.12, 6, px + ox, h - 0.46, pz);
        b.cyl('ctPorc', 0.030, 0.040, 0.11, 6, px + ox, h - 0.86, pz);
      }
      b.cyl('ctSteel', 0.20, 0.20, 0.62, 10, px + 0.24, h - 1.62, pz);
      if (armDir) {
        const dx = armDir * 0.70;
        b.box('ctSteelD', Math.abs(dx) + 0.10, 0.06, 0.06, px + dx / 2, h - 1.90, pz);
        b.box('ctLampHead', 0.36, 0.12, 0.20, px + dx, h - 1.98, pz);
        b.box('ctLampGlow', 0.30, 0.035, 0.16, px + dx, h - 2.05, pz);
      }
    }
    pole(3.62, -11.2, 9.2, 1);
    pole(3.62, -20.6, 8.8, 1);
    pole(15.36, -18.0, 9.0, -1);
    pole(-11.2, -4.90, 8.4, 1);

    function wire(x0, y0, z0, x1, y1, z1, sag) {
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const my = (y0 + y1) / 2 - sag;
      b.to('ctCable', 0.022, x0, y0, z0, mx, my, mz, 4);
      b.to('ctCable', 0.022, mx, my, mz, x1, y1, z1, 4);
    }
    wire(3.62, 8.70, -11.2, 3.62, 8.30, -20.6, 1.05);
    wire(3.62, 8.34, -11.2, 3.62, 7.94, -20.6, 1.25);
    wire(3.62, 8.70, -11.2, 15.36, 8.50, -18.0, 1.30);
    wire(3.62, 8.34, -11.2, 15.36, 8.14, -18.0, 1.55);
    wire(-11.2, 7.90, -4.90, 3.62, 8.20, -11.2, 1.20);

    /* 路灯：沿主街两侧交错 */
    for (let z = -24.0; z < 26.0; z += 9.4) {
      ctLamp(b, 5.05, z, 6.6, 1);
      ctLamp(b, 14.55, z + 4.6, 6.6, -1);
    }

    /* 车辆：主街上三辆，朝向各异，有尾灯就有纵深 */
    ctCar(b, 7.10, -6.2, Math.PI, 'ctBody', { s: 1.0 });
    ctCar(b, 12.40, 4.4, 0, 'ctBody2', { s: 1.0 });
    ctCar(b, 7.30, 15.8, Math.PI, 'ctBody4', { s: 0.96 });
    ctCar(b, 12.50, 22.6, 0, 'ctBody3', { s: 1.02 });
    /* 巷子里一辆停着的 */
    ctCar(b, -8.4, -7.2, Math.PI / 2, 'ctBody2', { s: 0.92 });

    /* 自行车 + 垃圾袋 + 路锥 + 围栏 */
    (function () {
      const bx = 4.30, bz = -17.4;
      [bz - 0.48, bz + 0.48].forEach(function (z) {
        b.torus('ctTire', 0.22, 0.035, bx, 0.38, z, 0, Math.PI / 2, 0);
      });
      b.to('ctSteel', 0.024, bx, 0.38, bz - 0.48, bx, 0.74, bz - 0.05, 4);
      b.to('ctSteel', 0.024, bx, 0.38, bz + 0.48, bx, 0.74, bz + 0.30, 4);
      b.box('ctSteelD', 0.06, 0.05, 0.28, bx, 0.86, bz - 0.02);
      b.box('ctCloth2', 0.10, 0.05, 0.20, bx, 0.92, bz + 0.26);
    })();

    [[-11.8, -6.4, 0.30], [-12.0, -6.9, 0.26], [12.9, 3.6, 0.28], [4.2, 3.2, 0.24]].forEach(function (q) {
      b.sph('ctTrash', q[2], q[0], CT_GY + q[2] * 0.82, q[1], 1, 0.82, 1);
      b.cyl('ctTrash', q[2] * 0.5, q[2] * 0.62, 0.05, 8, q[0], CT_GY + q[2] * 1.62, q[1]);
    });
    [[5.6, 2.2], [5.9, 2.9], [12.9, -3.4]].forEach(function (q) {
      b.box('ctCone', 0.26, 0.06, 0.26, q[0], 0.06, q[1]);
      b.cyl('ctCone', 0.055, 0.15, 0.60, 8, q[0], 0.35, q[1]);
      b.cyl('ctConeW', 0.082, 0.112, 0.11, 8, q[0], 0.29, q[1]);
    });

    /* 贩卖机（成组出现，单台太孤） */
    [[4.55, -9.2, 0], [4.55, -8.2, 0], [12.20, 12.0, Math.PI]].forEach(function (q, i) {
      const vg = new T.Group();
      const vb = new Builder();
      const vw = 0.86, vh = 1.82, vd = 0.68;
      vb.box('ctVendBody', vd, vh, vw, 0, vh / 2, 0);
      vb.box('ctSteelD', vd + 0.03, 0.10, vw + 0.03, 0, vh + 0.03, 0);
      vb.box('ctVendIn', 0.03, 1.06, vw - 0.12, vd / 2 + 0.005, 1.30, 0);
      for (let r = 0; r < 3; r++) {
        for (let k = 0; k < 4; k++) {
          const zz = -vw / 2 + 0.15 + k * ((vw - 0.30) / 3);
          vb.box(k % 2 ? 'ctCrate2' : 'ctCrate', 0.05, 0.20, 0.10, vd / 2 + 0.03, 0.88 + r * 0.34, zz);
        }
        vb.box('ctSteelD', 0.04, 0.02, vw - 0.16, vd / 2 + 0.02, 0.76 + r * 0.34, 0);
      }
      vb.box('ctSteelD', 0.06, 0.26, vw - 0.20, vd / 2 + 0.02, 0.42, 0);
      vb.box('ctVendIn', 0.04, 0.10, vw - 0.34, vd / 2 + 0.02, 0.12, 0);
      vb.build(vg);
      vg.position.set(q[0], CT_GY, q[1]);
      vg.rotation.y = q[2];
      g.add(vg);
      ctGlow(q[0] + Math.sin(q[2] + Math.PI / 2) * 0.35, CT_GY + 1.3,
        q[1] + Math.cos(q[2] + Math.PI / 2) * 0.35, 0xcfeaff, 2.2, 0.16);
    });

    b.build(g);
    return g;
  }

  /* ================= 全息广告 · 锦鲤 ================= */
  /* ================= 城市辉光 =================
     一座百万人口的城市，夜空是被自己照亮的。塔群后面挂一片
     自下而上的暖紫渐变，远处楼影就「沉」进去了，画面立刻有纵深。
     这一片的成本只有一张 64×256 的贴图。 */
  function buildCtHaze() {
    const g = new T.Group();
    const tex = canvasTex(256, 256, function (c, w, h) {
      /* 径向渐变（圆心压在底边中点）：矩形平面的四边会自然淡出，
         线性渐变那版会在天空里切出两条斜直线，非常出戏 */
      const rg = c.createRadialGradient(w / 2, h, 0, w / 2, h, w * 0.62);
      rg.addColorStop(0.00, 'rgba(255,140,110,0.60)');
      rg.addColorStop(0.30, 'rgba(198,84,152,0.30)');
      rg.addColorStop(0.62, 'rgba(104,70,178,0.10)');
      rg.addColorStop(1.00, 'rgba(40,30,90,0.00)');
      c.fillStyle = rg; c.fillRect(0, 0, w, h);
    });
    [[0.0, -70.0, 268, 96, 0.90], [0.0, -52.0, 190, 58, 0.52]].forEach(function (q) {
      const m = new T.Mesh(new T.PlaneGeometry(q[2], q[3]), new T.MeshBasicMaterial({
        map: tex, transparent: true, opacity: q[4],
        blending: T.AdditiveBlending, depthWrite: false, fog: false
      }));
      m.position.set(q[0], q[3] * 0.30, q[1]);
      m.renderOrder = -2;
      g.add(m);
    });
    return g;
  }

  function ctKoiTex() {
    return canvasTex(512, 512, function (c, w, h) {
      c.clearRect(0, 0, w, h);
      const g2 = c.createLinearGradient(0, 0, w, h);
      g2.addColorStop(0, 'rgba(150,248,255,0.95)');
      g2.addColorStop(0.45, 'rgba(80,180,255,0.88)');
      g2.addColorStop(1, 'rgba(255,110,200,0.85)');
      c.fillStyle = g2;

      /* 身体 */
      c.beginPath();
      c.moveTo(w * 0.14, h * 0.52);
      c.bezierCurveTo(w * 0.24, h * 0.24, w * 0.56, h * 0.20, w * 0.70, h * 0.38);
      c.bezierCurveTo(w * 0.80, h * 0.50, w * 0.76, h * 0.72, w * 0.58, h * 0.80);
      c.bezierCurveTo(w * 0.38, h * 0.88, w * 0.20, h * 0.76, w * 0.14, h * 0.52);
      c.closePath();
      c.fill();

      /* 尾鳍 */
      c.beginPath();
      c.moveTo(w * 0.68, h * 0.40);
      c.quadraticCurveTo(w * 0.92, h * 0.16, w * 0.97, h * 0.32);
      c.quadraticCurveTo(w * 0.86, h * 0.50, w * 0.97, h * 0.68);
      c.quadraticCurveTo(w * 0.92, h * 0.84, w * 0.68, h * 0.62);
      c.closePath();
      c.fill();

      /* 胸鳍 + 背鳍 */
      c.beginPath();
      c.moveTo(w * 0.40, h * 0.26);
      c.quadraticCurveTo(w * 0.50, h * 0.10, w * 0.62, h * 0.24);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(w * 0.42, h * 0.74);
      c.quadraticCurveTo(w * 0.44, h * 0.94, w * 0.60, h * 0.80);
      c.closePath();
      c.fill();

      /* 眼 */
      c.globalCompositeOperation = 'destination-out';
      c.beginPath();
      c.arc(w * 0.235, h * 0.475, 9, 0, 6.29);
      c.fill();
      /* 扫描线 */
      for (let y = 0; y < h; y += 5) c.fillRect(0, y, w, 2.0);
      c.globalCompositeOperation = 'source-over';

      /* 外框刻度 */
      c.strokeStyle = 'rgba(150,240,255,0.55)';
      c.lineWidth = 2;
      c.strokeRect(10, 10, w - 20, h - 20);
    });
  }

  function buildCtHolo() {
    const g = new T.Group();
    const tex = ctKoiTex();

    /* 第一条锦鲤原来悬在主天桥正前方，加色混合一糊，桥里的车和行人全看不见。往东南挪开。 */
    [[10.9, 16.4, -9.6, 4.2, 0.9], [7.6, 20.0, 3.5, 3.4, 1.6], [11.0, 12.0, -24.5, 2.8, 2.4]].forEach(function (q, i) {
      const m = new T.Mesh(new T.PlaneGeometry(q[3], q[3] * 0.78), new T.MeshBasicMaterial({
        map: tex, transparent: true, blending: T.AdditiveBlending,
        depthWrite: false, fog: false, side: T.DoubleSide,
        opacity: 0.62 - i * 0.10
      }));
      m.position.set(q[0], q[1], q[2]);
      m.renderOrder = 7;
      scene.add(m);
      ctGlow(q[0], q[1], q[2], 0x5ad8ff, q[3] * 1.7, 0.10 - i * 0.02);
      const ph = i * 2.1;
      CT_ANIM.push(function (t) {
        m.rotation.y = Math.sin(t * 0.22 + ph) * 0.55 + (i === 1 ? 0.9 : 0);
        m.position.y = q[1] + Math.sin(t * 0.55 + ph) * 0.22;
        m.material.opacity = (0.58 - i * 0.10) * (0.86 + Math.sin(t * 2.2 + ph) * 0.14);
      });
    });
    return g;
  }

  /* ================= 地面倒影与积水 =================
     城市尺度的倒影不能一格一格摆，按「每个发光体一条长痕」铺。 */
  function buildCtWet() {
    const g = new T.Group();
    const b = new Builder();
    const zs = [
      /* 主街：沿街店面的光一路铺到路心。俯视角下街面几乎是唯一
         能证明「这里有一条街」的东西，所以条带要宽、要密、要亮。 */
      [5.4, -26.0, 0xff2d7a, 0.30, 8.0], [7.0, -24.0, 0x22e6ff, 0.24, 7.0],
      [5.6, -21.5, 0xffd23f, 0.26, 7.5], [7.4, -19.5, 0xff2d7a, 0.26, 6.0],
      [5.5, -16.5, 0x22e6ff, 0.30, 8.5], [7.2, -14.0, 0xffd23f, 0.24, 6.5],
      [5.6, -11.0, 0xff2d7a, 0.26, 7.0], [7.0, -8.5, 0x22e6ff, 0.22, 6.0],
      [5.5, -5.0, 0xffd23f, 0.24, 7.5], [7.2, -2.0, 0x9a6bff, 0.22, 6.0],
      [5.6, 2.0, 0x22e6ff, 0.26, 7.0], [7.0, 5.0, 0xff2d7a, 0.24, 6.5],
      [5.5, 8.5, 0xffd23f, 0.26, 7.5], [7.2, 11.5, 0x22e6ff, 0.22, 6.0],
      [5.6, 15.0, 0xff2d7a, 0.26, 7.0], [7.0, 18.0, 0xffd23f, 0.24, 6.5],
      [5.5, 21.5, 0x9a6bff, 0.22, 6.0], [7.2, 24.5, 0xff2d7a, 0.20, 5.5],
      /* 东侧反射 */
      [14.0, -25.0, 0x22e6ff, 0.24, 6.0], [13.6, -21.0, 0xff2d7a, 0.22, 5.5],
      [14.2, -16.0, 0xffd23f, 0.24, 6.5], [13.7, -12.0, 0xff2d7a, 0.22, 5.5],
      [14.1, -6.0, 0x22e6ff, 0.22, 5.5], [13.6, 2.0, 0xffd23f, 0.20, 5.0],
      [14.2, 8.0, 0x22e6ff, 0.22, 5.5], [13.6, 14.0, 0xff2d7a, 0.20, 5.0],
      [14.0, 21.0, 0xffd23f, 0.18, 4.5]
    ];
    zs.forEach(function (q) {
      ctStreak(q[0], q[1], q[4], 1.70, q[2], Math.min(0.74, q[3] * 2.45));
    });

    /* 整层冷光：把路面从死黑里抬起来 */
    cyWet(9.75, -6.0, 10.6, 30.0, 0x3f4a8f, 0.16);
    cyWet(9.75, 18.0, 10.6, 26.0, 0x3f3a7f, 0.14);
    cyWet(-13.0, 7.7, 30.0, 3.6, 0x6a3f8f, 0.14);
    cyWet(-3.7, 0.0, 15.0, 10.0, 0x3f4a8f, 0.13);
    /* 商店街拱顶下的粉色底光 */
    cyWet(-21.5, 7.7, 14.0, 3.8, 0xff2d7a, 0.14);

    /* 积水：只在路口和低洼处，别铺满 */
    cyPuddle(9.6, -9.4, 1.30, 0.55, 0.35);
    cyPuddle(6.6, 3.2, 1.05, 0.48, -0.25);
    cyPuddle(13.2, 19.6, 0.95, 0.44, 0.7);
    cyPuddle(-6.2, -7.0, 0.85, 0.40, 0.2);
    cyPuddle(-18.0, 7.8, 0.78, 0.42, -0.4);
    cyPuddle(19.0, 12.2, 0.90, 0.40, 0.5);

    b.build(g);
    return g;
  }

  /* ================= 肯德基 · 快餐店（独立形制 kfc） =================
     正面朝 +X（与 store / club / wh 一致），相机从 +X/+Z 象限斜俯看进来。
     屋顶前半剖开 —— 微缩模型展示室内的常规做法，用餐区、点餐台、后厨
     才能同时被读出来；后半只留一带平顶放设备，避免「没盖完的房子」。 */
  const KFC = !!PS.kfc;
  const KX0 = -7.40, KX1 = 2.30, KZ0 = -5.40, KZ1 = 5.40;
  const KGY = 0.14, KH = 4.05, KS0 = 4.05, KS1 = 4.95;
  const KROOF_X1 = -5.20;                 // 屋顶只盖后墙这一带
  const KNAME = cfg(PS.kfcName, 'KFC');

  /* ---------- 画布招牌：一店能被认出来，靠的是身份物 ---------- */
  function kfStripes(c, x0, y0, w, h, n, c1, c2) {
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? c1 : c2;
      c.fillRect(x0 + (w * i) / n, y0, w / n + 0.6, h);
    }
  }

  /* 简笔上校：白发 / 白胡 / 黑框眼镜 / 黑领结。
     远景只认「白块 + 两个黑点」的比例，画太细反而糊成一团。 */
  function kfColonel(c, cx, cy, r) {
    c.save(); c.translate(cx, cy);
    c.fillStyle = '#f6f2e8';
    c.beginPath(); c.ellipse(0, 0.02 * r, 0.60 * r, 0.70 * r, 0, 0, Math.PI * 2); c.fill();
    /* 西装肩 */
    c.fillStyle = '#22262c';
    c.beginPath();
    c.moveTo(-0.72 * r, 0.98 * r); c.lineTo(-0.48 * r, 0.52 * r);
    c.lineTo(0.48 * r, 0.52 * r); c.lineTo(0.72 * r, 0.98 * r);
    c.closePath(); c.fill();
    /* 白发：顶部 + 两鬓 */
    c.fillStyle = '#ffffff';
    c.beginPath(); c.ellipse(0, -0.48 * r, 0.62 * r, 0.36 * r, 0, Math.PI, 0); c.fill();
    c.beginPath(); c.ellipse(-0.56 * r, -0.08 * r, 0.16 * r, 0.34 * r, 0.18, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(0.56 * r, -0.08 * r, 0.16 * r, 0.34 * r, -0.18, 0, Math.PI * 2); c.fill();
    /* 白胡：八字 + 下巴 */
    c.beginPath(); c.ellipse(-0.19 * r, 0.30 * r, 0.26 * r, 0.15 * r, 0.24, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(0.19 * r, 0.30 * r, 0.26 * r, 0.15 * r, -0.24, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(0, 0.56 * r, 0.30 * r, 0.22 * r, 0, 0, Math.PI * 2); c.fill();
    /* 眼镜 */
    c.strokeStyle = '#20242a'; c.lineWidth = 0.075 * r;
    [[-0.25, -0.10], [0.25, -0.10]].forEach(function (q) {
      c.beginPath(); c.arc(q[0] * r, q[1] * r, 0.20 * r, 0, Math.PI * 2); c.stroke();
    });
    c.beginPath(); c.moveTo(-0.05 * r, -0.10 * r); c.lineTo(0.05 * r, -0.10 * r); c.stroke();
    c.fillStyle = '#20242a';
    [[-0.25, -0.10], [0.25, -0.10]].forEach(function (q) {
      c.beginPath(); c.arc(q[0] * r, q[1] * r, 0.062 * r, 0, Math.PI * 2); c.fill();
    });
    /* 领结 */
    c.fillStyle = '#1f2329';
    c.beginPath(); c.moveTo(-0.05 * r, 0.72 * r); c.lineTo(-0.34 * r, 0.60 * r);
    c.lineTo(-0.34 * r, 0.86 * r); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(0.05 * r, 0.72 * r); c.lineTo(0.34 * r, 0.60 * r);
    c.lineTo(0.34 * r, 0.86 * r); c.closePath(); c.fill();
    c.restore();
  }

  TEX.kfSign = canvasTex(1600, 220, function (c, w, h) {
    c.fillStyle = '#c8102e'; c.fillRect(0, 0, w, h);
    /* 上下两道白细边，灯箱才有厚度 */
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, 9); c.fillRect(0, h - 9, w, 9);
    /* 左侧头像圆章 */
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(118, h / 2, 88, 0, Math.PI * 2); c.fill();
    kfColonel(c, 118, h / 2 - 6, 78);
    /* KFC 大字 */
    c.fillStyle = '#ffffff';
    c.textAlign = 'left'; c.textBaseline = 'middle';
    c.font = '900 156px Arial Black, Arial, sans-serif';
    c.fillText(KNAME, 232, h / 2 + 2);
    /* 右侧中英文字 */
    c.textAlign = 'right';
    c.font = '700 52px "Microsoft YaHei", SimHei, sans-serif';
    c.fillText('肯德基', w - 40, 78);
    c.fillStyle = 'rgba(255,255,255,0.78)';
    c.font = '600 24px Arial, sans-serif';
    c.fillText('KENTUCKY  FRIED  CHICKEN', w - 40, 140);
    c.fillText('SINCE  1952  ·  FINGER  LICKIN  GOOD', w - 40, 178);
  });

  TEX.kfBucket = canvasTex(512, 512, function (c, w, h) {
    kfStripes(c, 0, 0, w, h, 14, '#ffffff', '#c8102e');
    c.fillStyle = 'rgba(255,255,255,0.94)';
    c.beginPath(); c.ellipse(w / 2, h / 2, 168, 128, 0, 0, Math.PI * 2); c.fill();
    kfColonel(c, w / 2, h / 2 - 40, 74);
    c.fillStyle = '#c8102e'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 82px Arial Black, Arial, sans-serif';
    c.fillText(KNAME, w / 2, h / 2 + 76);
  });

  TEX.kfPylon = canvasTex(420, 760, function (c, w, h) {
    c.fillStyle = '#c8102e'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, 12); c.fillRect(0, h - 12, w, 12);
    c.fillStyle = '#ffffff';
    c.beginPath(); c.arc(w / 2, 132, 96, 0, Math.PI * 2); c.fill();
    kfColonel(c, w / 2, 128, 84);
    c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 132px Arial Black, Arial, sans-serif';
    c.fillText(KNAME, w / 2, 306);
    c.font = '700 40px "Microsoft YaHei", SimHei, sans-serif';
    c.fillText('全 家 桶 · 吮 指 原 味 鸡', w / 2, 386);
    c.fillStyle = 'rgba(255,255,255,0.20)'; c.fillRect(40, 430, w - 80, 3);
    c.fillStyle = '#ffffff';
    c.font = '900 56px Arial, sans-serif';
    c.fillText('24 HOURS', w / 2, 492);
    c.font = '700 38px "Microsoft YaHei", SimHei, sans-serif';
    c.fillText('得 来 速 车 道', w / 2, 560);
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(w / 2 - 90, 640); c.lineTo(w / 2 + 90, 640);
    c.lineTo(w / 2 + 90, 668); c.lineTo(w / 2 + 136, 668);
    c.lineTo(w / 2, 726); c.lineTo(w / 2 - 136, 668);
    c.lineTo(w / 2 - 90, 668); c.closePath(); c.fill();
  });

  TEX.kfSide = canvasTex(440, 300, function (c, w, h) {
    c.fillStyle = '#c8102e'; c.fillRect(0, 0, w, h);
    kfStripes(c, 0, h - 34, w, 34, 14, '#ffffff', '#c8102e');
    c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 112px Arial Black, Arial, sans-serif';
    c.fillText(KNAME, w / 2, 96);
    c.font = '700 34px "Microsoft YaHei", SimHei, sans-serif';
    c.fillText('得 来 速  DRIVE  THRU', w / 2, 186);
    c.font = '600 22px Arial, sans-serif';
    c.fillText('ORDER  ·  PAY  ·  PICK  UP', w / 2, 230);
  });

  TEX.kfMenu = canvasTex(680, 460, function (c, w, h) {
    c.fillStyle = '#f8f5ec'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#c8102e'; c.fillRect(0, 0, w, 78);
    c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.font = '900 46px Arial Black, Arial, sans-serif'; c.fillText('MENU', 28, 40);
    c.font = '700 34px "Microsoft YaHei", SimHei, sans-serif';
    c.textAlign = 'right'; c.fillText('点 餐 单', w - 28, 40);
    const items = [
      ['香辣鸡腿堡', '¥ 21', '#d99a3c'], ['吮指原味鸡', '¥ 12', '#c8762e'],
      ['新奥尔良烤翅', '¥ 16', '#c05a2e'], ['全家桶', '¥ 89', '#c8102e'],
      ['薯条（大）', '¥ 12', '#e0b64a'], ['可乐 / 雪碧', '¥ 9', '#4a6a8a']
    ];
    for (let i = 0; i < items.length; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 28 + col * 330, y = 108 + row * 112;
      c.fillStyle = items[i][2]; c.fillRect(x, y, 62, 62);
      c.fillStyle = '#2a2a30'; c.textAlign = 'left';
      c.font = '700 30px "Microsoft YaHei", SimHei, sans-serif';
      c.fillText(items[i][0], x + 78, y + 22);
      c.fillStyle = '#c8102e'; c.font = '800 30px Arial, sans-serif';
      c.fillText(items[i][1], x + 78, y + 54);
      c.fillStyle = 'rgba(0,0,0,0.10)'; c.fillRect(x, y + 88, 292, 2);
    }
  });

  TEX.kfPoster = canvasTex(360, 500, function (c, w, h) {
    c.fillStyle = '#c8102e'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 52px "Microsoft YaHei", SimHei, sans-serif';
    c.fillText('吮 指 原 味 鸡', w / 2, 62);
    c.font = '600 20px Arial, sans-serif';
    c.fillText('ORIGINAL  RECIPE', w / 2, 108);
    /* 炸鸡：三块不规则金黄团 */
    c.fillStyle = '#d99a3c';
    [[180, 250, 76, 62], [128, 316, 58, 48], [232, 322, 62, 52]].forEach(function (q) {
      c.beginPath(); c.ellipse(q[0], q[1], q[2], q[3], 0.3, 0, Math.PI * 2); c.fill();
    });
    c.fillStyle = '#f0c070';
    [[168, 236, 22], [196, 268, 16], [122, 306, 14], [240, 312, 15]].forEach(function (q) {
      c.beginPath(); c.arc(q[0], q[1], q[2], 0, Math.PI * 2); c.fill();
    });
    c.fillStyle = '#ffffff';
    c.font = '900 64px Arial Black, Arial, sans-serif';
    c.fillText('¥ 12', w / 2, 418);
    c.font = '600 20px "Microsoft YaHei", SimHei, sans-serif';
    c.fillText('限 时 特 惠  ·  每 日 供 应', w / 2, 466);
  });

  TEX.kfLane = canvasTex(1024, 128, function (c, w, h) {
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.86)';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 76px Arial Black, Arial, sans-serif';
    c.fillText('D R I V E   T H R U   →', w / 2, h / 2);
  });

  TEX.kfEntry = canvasTex(360, 140, function (c, w, h) {
    c.fillStyle = '#c8102e'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 62px Arial Black, Arial, sans-serif'; c.fillText('OPEN', w / 2, 54);
    c.font = '700 26px "Microsoft YaHei", SimHei, sans-serif';
    c.fillText('营 业 中  ·  24H', w / 2, 108);
  });

  /* 立起来的贴图面（法线朝 +X 用 ry=Math.PI/2；贴地用 kfGround） */
  function kfPlane(g, tex, w, h, x, y, z, ry, dbl) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({
      map: tex, side: dbl ? T.DoubleSide : T.FrontSide
    }));
    m.position.set(x, y, z); m.rotation.y = ry || 0; m.renderOrder = 3;
    g.add(m); return m;
  }
  function kfGround(g, tex, w, d, x, y, z, rz) {
    const m = new T.Mesh(new T.PlaneGeometry(w, d), new T.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, side: T.DoubleSide
    }));
    m.rotation.set(-Math.PI / 2, 0, rz || 0);
    m.position.set(x, y, z); m.renderOrder = 2;
    g.add(m); return m;
  }

  /* ---------- 通用小件 ---------- */
  /* 红白条纹柱：快餐店的经典识别件，四面都贴条纹才抗旋转 */
  function kfStripePost(b, x, z, y0, h, w) {
    b.box('kfWhite', w, h, w, x, y0 + h / 2, z);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const yy = y0 + (h * (i + 0.5)) / n;
      b.box('kfRed', w + 0.02, h / n * 0.44, w + 0.02, x, yy, z);
    }
    b.box('kfTrimD', w + 0.10, 0.10, w + 0.10, x, y0 + 0.05, z);
    b.box('kfTrimD', w + 0.10, 0.10, w + 0.10, x, y0 + h - 0.05, z);
  }

  /* 圆桌 + 四椅：桌面必须比椅背高一档，俯视才读得出「一组座」 */
  function kfTableSet(b, x, z, seatKey, sc) {
    sc = sc || 1;
    b.cyl('kfTable', 0.54 * sc, 0.54 * sc, 0.07 * sc, 12, x, 0.76 * sc, z);
    b.cyl('kfTableD', 0.46 * sc, 0.46 * sc, 0.03 * sc, 12, x, 0.715 * sc, z);
    b.cyl('kfTrimD', 0.055 * sc, 0.075 * sc, 0.70 * sc, 8, x, 0.38 * sc, z);
    b.cyl('kfTrimD', 0.30 * sc, 0.30 * sc, 0.035 * sc, 10, x, 0.045 * sc, z);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const px = x + Math.cos(a) * 0.86 * sc, pz = z + Math.sin(a) * 0.86 * sc;
      b.box(seatKey, 0.40 * sc, 0.06 * sc, 0.40 * sc, px, 0.45 * sc, pz, 0, -a, 0);
      b.box(seatKey, 0.40 * sc, 0.44 * sc, 0.055 * sc,
        px - Math.cos(a) * 0.19 * sc, 0.68 * sc, pz - Math.sin(a) * 0.19 * sc, 0, -a, 0);
      b.cyl('kfTrimD', 0.025 * sc, 0.025 * sc, 0.42 * sc, 6, px, 0.22 * sc, pz);
    }
    /* 桌上托盘 + 一杯可乐，让「有人在吃」有出处 */
    b.box('kfCream', 0.30 * sc, 0.018 * sc, 0.22 * sc, x + 0.08 * sc, 0.805 * sc, z);
    b.cyl('kfCup', 0.055 * sc, 0.045 * sc, 0.17 * sc, 10, x + 0.02 * sc, 0.895 * sc, z);
    b.cyl('kfCupL', 0.058 * sc, 0.058 * sc, 0.025 * sc, 10, x + 0.02 * sc, 0.99 * sc, z);
    b.box('kfFries', 0.10 * sc, 0.13 * sc, 0.05 * sc, x + 0.19 * sc, 0.88 * sc, z);
  }

  /* 遮阳伞：红伞 + 白伞尖 + 白伞沿。伞面不铺满是为了不盖住桌上的东西 */
  function kfUmbrella(b, x, z, sc) {
    sc = sc || 1;
    b.cyl('kfTrimD', 0.035 * sc, 0.035 * sc, 2.30 * sc, 8, x, 1.15 * sc, z);
    b.cyl('kfRed', 0.045 * sc, 1.02 * sc, 0.34 * sc, 12, x, 2.34 * sc, z);
    b.cyl('kfWhite', 1.02 * sc, 1.02 * sc, 0.025 * sc, 12, x, 2.18 * sc, z);
    b.cyl('kfWhite', 0.055 * sc, 0.055 * sc, 0.14 * sc, 8, x, 2.58 * sc, z);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      b.box('kfWhite', 0.05 * sc, 0.012 * sc, 1.00 * sc,
        x + Math.cos(a) * 0.50 * sc, 2.28 * sc, z + Math.sin(a) * 0.50 * sc,
        0, -a, 0);
    }
    b.cyl('kfTrimD', 0.24 * sc, 0.24 * sc, 0.06 * sc, 10, x, 0.03 * sc, z);
  }

  /* ── 人物 v3 ─────────────────────────────────────────────────────
     拟真路线（锥台 + 球 + 分段圆柱四肢）做不像就只剩丑，已整体废弃。
     现在全部委托给统一积木人工厂 buildFig()：乐高圆头 + 头顶凸粒 +
     圆柱马蹄手，身份靠红帽白围裙 / 手提袋这些色块区分，不靠面数。 */
  const KF_PEDK = ['kfPedA', 'kfPedB', 'kfPedC', 'kfPedD'];
  const KF_SKIN = ['kfSkin1', 'kfSkin2', 'kfSkin3'];
  const KF_HAIR = ['kfHair1', 'kfHair2', 'kfHair3', 'kfHair4'];

  /* 店员顾客：乐高小人 + 红帽白围裙 / 顾客手提袋，身份靠色块不靠面数。 */
  function kfPed(b, x, z, y, coat, s, ry, opt) {
    s = s || 1; ry = ry || 0; opt = opt || {};
    const sit = opt.pose === 'sit', walk = opt.pose === 'walk';
    const staff = opt.role === 'staff';
    const sk = KF_SKIN[(opt.skin || 0) % 3];
    const hk = KF_HAIR[(opt.hair || 0) % 4];
    buildFig({
      b: b, x: x, y: y || 0, z: z, ry: ry, s: s,
      pose: sit ? 'sit' : (walk ? 'walk' : 'stand'),
      coat: coat, pants: opt.pants || 'kfPedP', skin: sk, hair: hk,
      ink: 'kfEye', belt: 'kfPedP', shoe: 'kfShoe',
      hat: staff ? 'cap' : 'none', hatKey: 'kfRed',
      apron: staff, apronKey: 'kfApron', bag: opt.bag, bagKey: 'kfBag'
    });
  }

  /* 球形行道树：低模三团叶 + 一根干，不用 willow/竹（那是水乡形制的） */
  function kfTree(b, x, z, s) {
    s = s || 1;
    b.cyl('kfBark', 0.10 * s, 0.15 * s, 1.45 * s, 8, x, 0.72 * s, z);
    [[0, 1.70, 0, 0.72, 'kfLeaf1'], [-0.42, 1.50, 0.14, 0.50, 'kfLeaf2'],
     [0.40, 1.56, -0.12, 0.54, 'kfLeaf3'], [0.06, 2.14, 0, 0.44, 'kfLeaf1']].forEach(function (q) {
      b.sph(q[4], q[3] * s, x + q[0] * s, q[1] * s, z + q[2] * s, 1, 0.86, 1);
    });
    b.cyl('kfGrass', 0.70 * s, 0.70 * s, 0.06 * s, 12, x, 0.03 * s, z);
  }

  /* ================= 1. Site：室外场地 ================= */
  function buildKfcSite() {
    const g = new T.Group(), b = new Builder();

    /* 展台三层剖切 */
    b.box('kfBase2', 21.0, 0.30, 19.6, 0.80, -1.82, 0);
    b.box('kfBase', 20.4, 0.16, 19.0, 0.80, -1.58, 0);
    b.box('stoneD', 19.8, 1.50, 18.4, 0.80, -0.75, 0);

    /* 人行道：预制砖，三色随机 */
    for (let x = 2.36; x < 3.52; x += 0.58) {
      for (let z = -9.10; z < 9.10; z += 0.58) {
        const m = (Math.round(x * 10) + Math.round(z * 10)) % 5;
        b.box(m === 0 ? 'kfCream' : (m === 2 ? 'kfWalk2' : 'kfWalk'),
          0.55, 0.14, 0.55, x + 0.28, 0.07, z + 0.28);
      }
    }
    /* 路缘 */
    b.box('kfCurb', 0.18, 0.20, 18.2, 3.58, 0.06, 0);
    b.box('stoneD', 0.10, 0.10, 18.2, 3.70, 0.03, 0);

    /* 沥青：停车场 + 得来速车道分开铺，颜色分两阶才有「车道」的读感 */
    b.box('kfAsphalt', 6.60, 0.08, 18.2, 6.90, 0.04, -0.30);
    b.box('kfLane', 18.4, 0.09, 2.60, 1.00, 0.045, 7.28);

    /* 车位线：6 格沿 z 排，车头朝店面（-X） */
    for (let i = 0; i <= 6; i++) {
      const z = -8.60 + i * 1.62;
      b.box('kfLine', 4.10, 0.012, 0.055, 6.05, 0.086, z);
    }
    b.box('kfLine', 0.055, 0.012, 9.72, 8.10, 0.086, -3.74);
    /* 无障碍车位：黄斜纹 + 轮椅位留白 */
    for (let i = 0; i < 5; i++) b.box('kfLineY', 0.30, 0.012, 0.055, 4.42 + i * 0.62, 0.088, 0.05, 0, 0.62, 0);

    /* 得来速车道：双黄边线 + 三个方向箭头 + 地面字 */
    b.box('kfLineY', 18.2, 0.012, 0.075, 1.00, 0.096, 6.02);
    b.box('kfLine', 18.2, 0.012, 0.055, 1.00, 0.096, 8.54);
    for (let i = 0; i < 3; i++) {
      const x = 4.60 - i * 4.30;
      b.box('kfLine', 0.90, 0.012, 0.09, x, 0.097, 7.28);
      b.box('kfLine', 0.26, 0.012, 0.30, x - 0.48, 0.097, 7.28, 0, 0.70, 0);
      b.box('kfLine', 0.26, 0.012, 0.30, x - 0.48, 0.097, 7.28, 0, -0.70, 0);
    }
    kfGround(g, TEX.kfLane, 4.80, 0.86, 5.30, 0.101, 7.28, 0);

    /* 户外用餐区：一块浅色铺装把它从停车场里划出来 */
    b.box('kfWalk2', 5.30, 0.09, 4.30, 6.20, 0.09, 1.90);
    for (let i = 0; i < 6; i++) b.box('kfWalk', 5.20, 0.012, 0.035, 6.20, 0.138, -0.10 + i * 0.80);

    /* 绿化带：建筑北侧（远侧），填掉否则是一大片空沥青 */
    b.box('kfGrass2', 3.10, 0.10, 12.0, -7.85, 0.05, -0.20);
    b.box('kfGrass', 12.6, 0.10, 2.30, -1.60, 0.05, -8.15);
    b.box('kfGrass2', 2.10, 0.10, 3.40, 9.55, 0.05, -7.30);
    /* 灌木：一排小球，比单棵树更填得住边角 */
    for (let i = 0; i < 11; i++) {
      const z = -8.40 + i * 1.10;
      b.sph(i % 3 === 0 ? 'kfLeaf3' : 'kfLeaf2', 0.34 + (i % 3) * 0.06,
        -8.30, 0.30, z, 1, 0.78, 1);
    }
    kfTree(b, -7.60, -6.90, 1.00);
    kfTree(b, -7.60, 5.90, 0.86);
    kfTree(b, 9.60, -7.20, 0.82);

    /* 门口无障碍坡道 + 地垫 */
    b.box('kfWalk', 1.10, 0.10, 1.60, 2.86, 0.10, -1.90, 0, 0, -0.09);
    b.box('kfRedD', 0.90, 0.02, 1.70, 2.55, 0.155, 0.10);

    b.build(g);
    return g;
  }

  /* ================= 2. Shell：店壳、招牌、屋顶 ================= */
  function buildKfcShell() {
    const g = new T.Group(), b = new Builder();

    /* 地坪：整块室内地面，四周留 0.1 边给墙 */
    b.box('kfFloorIn', KX1 - KX0 - 0.10, 0.12, KZ1 - KZ0 - 0.10,
      (KX0 + KX1) / 2, KGY - 0.06, 0);
    for (let x = KX0 + 0.70; x < KX1 - 0.20; x += 0.94)
      b.box('kfFloorLine', 0.016, 0.012, KZ1 - KZ0 - 0.30, x, KGY + 0.003, 0);
    for (let z = KZ0 + 0.70; z < KZ1 - 0.20; z += 0.94)
      b.box('kfFloorLine', KX1 - KX0 - 0.30, 0.012, 0.016, (KX0 + KX1) / 2, KGY + 0.003, z);

    /* 后墙（实墙）+ 墙裙 */
    b.box('kfWall', 0.24, KH, KZ1 - KZ0, KX0 + 0.12, KH / 2, 0);
    b.box('kfRedD', 0.055, 0.92, KZ1 - KZ0 - 0.10, KX0 + 0.27, 0.46, 0);
    /* 后墙竖肋 + 排风口 */
    for (let i = 0; i < 6; i++) b.box('kfWallD', 0.04, KH - 1.0, 0.10, KX0 + 0.26, KH / 2 + 0.4, -4.20 + i * 1.68);
    b.box('kfMetalD', 0.10, 0.70, 1.20, KX0 + 0.30, 2.90, 3.20);
    for (let i = 0; i < 5; i++) b.box('kfMetal', 0.06, 0.06, 1.08, KX0 + 0.36, 2.62 + i * 0.14, 3.20);

    /* 北墙（远侧实墙） */
    b.box('kfWall', KX1 - KX0, KH, 0.24, (KX0 + KX1) / 2, KH / 2, KZ0 + 0.12);
    b.box('kfRedD', KX1 - KX0 - 0.10, 0.92, 0.055, (KX0 + KX1) / 2, 0.46, KZ0 + 0.27);

    /* 南墙（近侧）：得来速取餐窗要开洞，按 x 拆三段 + 门楣 */
    const WX0 = -3.30, WX1 = -1.40, WY0 = 1.28, WY1 = 2.46;
    b.box('kfWall', WX0 - KX0, KH, 0.24, (KX0 + WX0) / 2, KH / 2, KZ1 - 0.12);
    b.box('kfWall', KX1 - WX1, KH, 0.24, (WX1 + KX1) / 2, KH / 2, KZ1 - 0.12);
    b.box('kfWall', WX1 - WX0, WY0, 0.24, (WX0 + WX1) / 2, WY0 / 2, KZ1 - 0.12);
    b.box('kfWall', WX1 - WX0, KH - WY1, 0.24, (WX0 + WX1) / 2, (KH + WY1) / 2, KZ1 - 0.12);
    /* 窗框 + 台板 + 推拉玻璃（玻璃独立 mesh，不进 Builder） */
    b.box('kfTrim', 0.09, WY1 - WY0, 0.10, WX0, (WY0 + WY1) / 2, KZ1 + 0.04);
    b.box('kfTrim', 0.09, WY1 - WY0, 0.10, WX1, (WY0 + WY1) / 2, KZ1 + 0.04);
    b.box('kfTrim', WX1 - WX0, 0.09, 0.10, (WX0 + WX1) / 2, WY0, KZ1 + 0.04);
    b.box('kfTrim', WX1 - WX0, 0.09, 0.10, (WX0 + WX1) / 2, WY1, KZ1 + 0.04);
    b.box('kfTrim', WX1 - WX0, 0.10, 0.44, (WX0 + WX1) / 2, WY0 - 0.04, KZ1 + 0.26);
    pane(g, WX1 - WX0 - 0.12, WY1 - WY0 - 0.14, (WX0 + WX1) / 2, (WY0 + WY1) / 2, KZ1 + 0.045, 0);
    /* 取餐窗上的小灯箱 */
    b.box('kfSignBox', 2.30, 0.44, 0.10, (WX0 + WX1) / 2, 2.92, KZ1 + 0.14);
    kfPlane(g, TEX.kfSide, 2.24, 0.38, (WX0 + WX1) / 2, 2.92, KZ1 + 0.20, 0);

    /* 正面玻璃幕：竖梃 + 横档 + 独立玻璃。中间两扇是自动门 */
    const GX = KX1 + 0.02, GY0 = 0.14, GY1 = KH - 0.10;
    pane(g, KZ1 - KZ0 - 0.20, GY1 - GY0, GX, (GY0 + GY1) / 2, 0, Math.PI / 2);
    glare(g, 1.10, GY1 - GY0 - 0.20, GX + 0.015, (GY0 + GY1) / 2, -3.30, Math.PI / 2, 0.30);
    glare(g, 0.70, GY1 - GY0 - 0.20, GX + 0.015, (GY0 + GY1) / 2, 2.60, Math.PI / 2, 0.30);
    for (let i = 0; i <= 6; i++) {
      const z = KZ0 + 0.10 + (KZ1 - KZ0 - 0.20) * i / 6;
      b.box('kfTrim', 0.11, GY1 - GY0, 0.11, GX, (GY0 + GY1) / 2, z);
    }
    [1.02, 2.18, 3.34].forEach(function (y) {
      b.box('kfTrim', 0.09, 0.075, KZ1 - KZ0 - 0.10, GX, y, 0);
    });
    /* 自动门：红框 + 两扇玻璃 + 推杆 + 门楣 OPEN 灯箱 */
    b.box('kfRed', 0.16, 2.42, 0.10, GX + 0.04, 1.30, -1.02);
    b.box('kfRed', 0.16, 2.42, 0.10, GX + 0.04, 1.30, 1.02);
    b.box('kfRed', 0.16, 0.12, 2.14, GX + 0.04, 2.48, 0);
    b.box('kfTrimD', 0.08, 0.045, 0.82, GX + 0.10, 1.08, -0.55);
    b.box('kfTrimD', 0.08, 0.045, 0.82, GX + 0.10, 1.08, 0.55);
    b.box('kfSignBox', 0.20, 0.46, 1.70, GX + 0.10, 2.78, 0);
    kfPlane(g, TEX.kfEntry, 1.62, 0.40, GX + 0.205, 2.78, 0, Math.PI / 2);

    /* 招牌带：左右两块灯箱，中间整段留空 —— 背板也必须跟着拆，
       否则俯视时一条 1.3 米高的红板会把用餐区前半压掉。 */
    const SX = KX1 + 0.58;   // 招牌挑出立面，俯视投影落在人行道上，不再横切室内
    [[-3.62, 3.30], [3.62, 3.30]].forEach(function (q) {
      b.box('kfRedD', 0.30, KS1 - KS0, q[1] + 0.16, SX, (KS0 + KS1) / 2, q[0]);
      b.box('kfTrim', 0.08, 0.80, q[1] + 0.10, SX + 0.17, (KS0 + KS1) / 2, q[0]);
      kfPlane(g, TEX.kfSign, q[1], 0.78, SX + 0.22, (KS0 + KS1) / 2, q[0], Math.PI / 2);
    });
    [-3.62, 3.62].forEach(function (z) {
      b.to('kfTrimD', 0.04, KX1 + 0.10, KS0 - 0.42, z, SX, KS0 - 0.02, z, 6);
    });
    /* 顶檐也按两段拆，中间 4.2 米彻底通透，门正上方才看得进店里 */
    [-3.62, 3.62].forEach(function (z) {
      b.box('kfRed', 0.20, 0.20, 3.46, SX, KS1 + 0.10, z);
    });
    /* 招牌带下沿一排红白竖条（门店最经典的那一道），两侧才有 */
    for (let i = 0; i < 22; i++) {
      const z = KZ0 + 0.20 + (KZ1 - KZ0 - 0.40) * i / 22;
      if (Math.abs(z) < 2.10) continue;
      b.box(i % 2 ? 'kfWhite' : 'kfRed', 0.10, 0.30, 0.42, SX + 0.06, KS0 - 0.16, z);
    }

    /* 正面雨棚：只做门上方 3.4 米一段。做成整条会像一块 1.5 米宽的
       悬挑板，30° 俯视下能把室内整整 2.6 米进深盖住。 */
    b.box('kfTrimD', 1.50, 0.10, 3.50, KX1 + 0.72, 3.42, 0);
    for (let i = 0; i < 6; i++) {
      const z = -1.46 + i * 0.58;
      b.box(i % 2 ? 'kfWhite' : 'kfRed', 1.46, 0.055, 0.57, KX1 + 0.72, 3.48, z);
    }
    b.box('kfWhite', 1.56, 0.10, 0.10, KX1 + 1.46, 3.40, 0);
    [-1.60, 1.60].forEach(function (z) {
      b.to('kfTrimD', 0.035, KX1 + 0.10, 3.92, z, KX1 + 1.40, 3.44, z, 6);
    });

    /* 四角条纹柱 + 侧墙腰线 */
    kfStripePost(b, KX1 + 0.16, KZ0 + 0.16, 0, KH, 0.36);
    kfStripePost(b, KX1 + 0.16, KZ1 - 0.16, 0, KH, 0.36);
    b.box('kfRed', KX1 - KX0, 0.18, 0.06, (KX0 + KX1) / 2, 2.92, KZ0 + 0.26);
    b.box('kfRed', KX1 - WX1, 0.18, 0.06, (WX1 + KX1) / 2, 2.92, KZ1 - 0.26);

    /* 屋顶：只盖后墙一带（剖切式），上面放设备 */
    b.box('kfRoof', KROOF_X1 - KX0 + 0.30, 0.16, KZ1 - KZ0 + 0.30,
      (KX0 + KROOF_X1) / 2, KH + 0.08, 0);
    b.box('kfTrimD', KROOF_X1 - KX0 + 0.36, 0.16, 0.14, (KX0 + KROOF_X1) / 2, KH + 0.21, KZ1 - 0.06);
    /* 檐框只有正面那条是红的。两条沿 x 的红色长边在俯视下会斜穿
       整个室内，把用餐区切成条状 —— 改深灰并压到 0.14 高。 */
    b.box('kfRed', 0.20, 0.20, KZ1 - KZ0 + 0.36, KX1 + 0.08, KH + 0.18, 0);
    b.box('kfTrimD', KX1 - KX0, 0.14, 0.16, (KX0 + KX1) / 2, KH + 0.15, KZ0 + 0.08);
    b.box('kfTrimD', KX1 - KX0, 0.14, 0.16, (KX0 + KX1) / 2, KH + 0.15, KZ1 - 0.08);
    /* 空调机组 + 排烟管 + 太阳能板，屋顶才不是一块光板 */
    [-3.60, 0.40, 3.60].forEach(function (z, i) {
      b.box('kfMetalD', 1.10, 0.62, 1.00, KX0 + 1.10, KH + 0.48, z);
      b.box('kfMetal', 1.16, 0.07, 1.06, KX0 + 1.10, KH + 0.82, z);
      b.cyl('kfTrimD', 0.30, 0.30, 0.06, 12, KX0 + 1.10, KH + 0.89, z);
      b.box('kfTrimD', 0.16, 0.16, 0.16, KX0 + 1.10, KH + 0.96, z);
    });
    b.cyl('kfMetal', 0.22, 0.22, 0.94, 10, KX0 + 1.90, KH + 0.62, -1.90);
    b.cyl('kfTrimD', 0.30, 0.24, 0.26, 10, KX0 + 1.90, KH + 1.18, -1.90);
    b.box('kfTrimD', 1.70, 0.06, 1.20, KX0 + 1.40, KH + 0.34, 2.00, 0, 0, 0.22);
    /* 敞口区上方三道钢梁 + 吊灯杆：暗示屋顶被剖开，也给室内一层横向线条 */
    for (let i = 0; i < 3; i++) {
      const x = -4.40 + i * 2.20;
      b.box('kfBeam', 0.12, 0.14, KZ1 - KZ0 - 0.20, x, KH - 0.06, 0);
    }

    /* 屋顶小全家桶（独立 mesh 才能贴条纹 UV） */
    (function () {
      const bx = -3.30, bz = -3.60;
      b.cyl('kfTrimD', 0.09, 0.09, 1.60, 8, bx, KH + 0.96, bz);
      const bucket = new T.Mesh(new T.CylinderGeometry(0.86, 0.62, 1.28, 20, 1, true),
        new T.MeshBasicMaterial({ map: TEX.kfBucket, side: T.DoubleSide }));
      bucket.position.set(bx, KH + 2.36, bz);
      g.add(bucket);
      b.cyl('kfWhite', 0.88, 0.88, 0.10, 20, bx, KH + 3.04, bz);
      b.cyl('kfRed', 0.90, 0.90, 0.06, 20, bx, KH + 3.12, bz);
    })();

    b.build(g, { noOutline: ['kfTube'] });
    return g;
  }

  /* ================= 3. Interior：点餐台 / 后厨 / 用餐区 ================= */
  function buildKfcInterior() {
    const g = new T.Group(), b = new Builder();

    /* 吊顶灯带：只沿后厨 + 用餐区两列，压在梁下不贴顶 */
    [-5.60, -2.20, 0.90].forEach(function (z) {
      for (let x = -6.60; x < 1.90; x += 1.70) {
        b.box('kfTube', 1.20, 0.055, 0.13, x, KH - 0.24, z);
      }
    });
    /* 后厨天花（唯一有顶的一段） */
    b.box('kfCeil', KROOF_X1 - KX0 - 0.10, 0.08, KZ1 - KZ0 - 0.20,
      (KX0 + KROOF_X1) / 2, KH - 0.10, 0);

    /* ---- 点餐台：L 形，横段沿 z，纵段沿 x ---- */
    const CX = -3.30, CZ = 0.0;
    b.box('kfCounter', 0.78, 1.02, 6.60, CX, KGY + 0.51, CZ);
    b.box('kfRed', 0.06, 0.68, 6.52, CX + 0.42, KGY + 0.52, CZ);
    b.box('kfCounterTop', 1.02, 0.09, 6.80, CX + 0.12, KGY + 1.06, CZ);
    b.box('kfTrimD', 1.04, 0.04, 6.86, CX + 0.12, KGY + 1.12, CZ);
    /* 纵段（靠北墙） */
    b.box('kfCounter', 2.60, 1.02, 0.76, CX - 1.20, KGY + 0.51, -3.30);
    b.box('kfCounterTop', 2.72, 0.09, 0.96, CX - 1.20, KGY + 1.06, -3.30);
    /* 三台收银机 + 托盘架 + 桌面餐盘 */
    [-2.30, 0, 2.30].forEach(function (z, i) {
      b.box('kfScreen', 0.10, 0.44, 0.52, CX - 0.10, KGY + 1.36, z, 0, 0, -0.22);
      b.box('kfMenuW', 0.03, 0.32, 0.42, CX - 0.16, KGY + 1.37, z, 0, 0, -0.22);
      b.box('kfTrimD', 0.30, 0.16, 0.34, CX + 0.16, KGY + 1.20, z);
      b.box('kfCream', 0.34, 0.02, 0.26, CX + 0.30, KGY + 1.14, z + 0.70);
      if (i === 1) {
        b.box('kfBucket', 0.26, 0.30, 0.26, CX + 0.30, KGY + 1.30, z + 0.70);
        b.cyl('kfWhite', 0.14, 0.14, 0.03, 10, CX + 0.30, KGY + 1.47, z + 0.70);
      }
    });
    /* 后墙三块菜单屏：店内最有信息量的一面墙 */
    [-3.30, 0, 3.30].forEach(function (z) {
      b.box('kfSignBox', 0.12, 1.52, 2.10, KX0 + 0.34, 2.62, z);
      kfPlane(g, TEX.kfMenu, 2.00, 1.42, KX0 + 0.42, 2.62, z, Math.PI / 2);
      b.box('kfTube', 0.06, 0.05, 2.16, KX0 + 0.42, 3.42, z);
    });
    /* 海报 + 墙上 KFC 圆章 */
    kfPlane(g, TEX.kfPoster, 1.10, 1.54, KX1 - 0.34, 2.30, KZ0 + 0.30, -Math.PI / 2, true);

    /* ---- 后厨：炸炉 / 保温柜 / 组装台 / 油烟罩 / 冷柜 ---- */
    [-4.20, -2.70].forEach(function (z) {
      b.box('kfSteelD', 1.10, 0.90, 1.10, -6.20, KGY + 0.45, z);
      b.box('kfSteel', 1.16, 0.08, 1.16, -6.20, KGY + 0.94, z);
      b.box('kfFryer', 0.86, 0.10, 0.86, -6.20, KGY + 1.00, z);
      b.box('kfOil', 0.70, 0.02, 0.70, -6.20, KGY + 1.06, z);
      b.box('kfTrimD', 0.08, 0.42, 0.08, -6.62, KGY + 1.18, z);
      b.box('kfTrimD', 0.08, 0.42, 0.08, -5.78, KGY + 1.18, z);
      b.box('kfTrimD', 0.94, 0.06, 0.08, -6.20, KGY + 1.40, z);
      /* 炸篮里的鸡块 */
      for (let i = 0; i < 3; i++)
        b.sph('kfChicken', 0.11, -6.42 + i * 0.22, KGY + 1.10, z - 0.12 + (i % 2) * 0.20, 1, 0.8, 1);
    });
    /* 油烟罩 + 排烟管 */
    b.box('kfMetal', 2.20, 0.30, 3.00, -6.20, 2.74, -3.45);
    b.box('kfMetalD', 2.30, 0.08, 3.10, -6.20, 2.56, -3.45);
    b.box('kfMetalD', 0.60, 1.10, 0.60, -6.20, 3.40, -3.45);
    /* 保温柜（透过玻璃能看到一排炸鸡） */
    b.box('kfSteelD', 0.90, 1.10, 2.40, -4.72, KGY + 0.55, -2.10);
    b.box('kfWarm', 0.82, 0.06, 2.30, -4.72, KGY + 0.94, -2.10);
    for (let i = 0; i < 6; i++)
      b.sph('kfChicken', 0.16, -4.72, KGY + 1.06, -3.10 + i * 0.40, 1, 0.72, 1);
    b.box('kfSteel', 0.10, 0.90, 2.46, -4.20, KGY + 1.56, -2.10);
    /* 汉堡组装台 + 面包 / 生菜 / 肉饼色块 */
    b.box('kfSteelD', 1.40, 0.86, 2.00, -4.40, KGY + 0.43, 1.70);
    b.box('kfSteel', 1.48, 0.08, 2.08, -4.40, KGY + 0.90, 1.70);
    [['kfBun', -4.80], ['kfLeaf2', -4.35], ['kfChickenD', -3.90]].forEach(function (q) {
      for (let i = 0; i < 3; i++) b.box(q[0], 0.28, 0.06, 0.28, q[1], KGY + 0.97, 1.10 + i * 0.58);
    });
    /* 冷柜：空壳（背板 + 层板 + 商品），不能写成整块 box */
    b.box('kfSteelD', 0.10, 1.70, 1.90, -6.60, KGY + 0.85, 3.30);
    [-6.20].forEach(function (x) {
      [0.30, 0.85, 1.40].forEach(function (y) {
        b.box('kfSteel', 0.72, 0.05, 1.86, x, KGY + y, 3.30);
        for (let i = 0; i < 5; i++)
          b.cyl('kfCup', 0.075, 0.065, 0.24, 8, x, KGY + y + 0.15, 2.60 + i * 0.36);
      });
    });

    /* ---- 用餐区：4 组圆桌 + 1 组卡座 + 儿童区 ---- */
    [[-1.10, -3.60], [-1.10, -1.20], [-1.10, 1.30], [0.90, -3.60], [0.90, 1.30]].forEach(function (q, i) {
      kfTableSet(b, q[0], q[1], i % 2 ? 'kfSeatD' : 'kfSeat', 0.92);
    });
    /* 卡座：长凳 + 长桌 + 靠背，沿南墙 */
    b.box('kfBooth', 0.52, 0.44, 3.20, 1.42, KGY + 0.22, 2.90);
    b.box('kfBooth', 0.14, 0.92, 3.20, 1.68, KGY + 0.64, 2.90);
    b.box('kfBooth', 0.52, 0.44, 3.20, -0.30, KGY + 0.22, 2.90);
    b.box('kfTable', 1.90, 0.08, 3.00, 0.56, KGY + 0.76, 2.90);
    b.box('kfTableD', 1.94, 0.03, 3.04, 0.56, KGY + 0.71, 2.90);
    b.cyl('kfTrimD', 0.10, 0.12, 0.72, 8, 0.56, KGY + 0.36, 2.90);
    /* 儿童游乐区：小滑梯 + 球池 + 彩球，是「家庭快餐店」的身份物 */
    b.box('kfPlay3', 2.20, 0.16, 1.90, -0.20, KGY + 0.08, KZ0 + 1.20);
    b.box('kfPlay1', 0.16, 0.42, 1.90, -1.26, KGY + 0.29, KZ0 + 1.20);
    b.box('kfPlay2', 0.16, 0.42, 1.90, 0.86, KGY + 0.29, KZ0 + 1.20);
    b.box('kfPlay1', 1.40, 1.10, 0.50, -0.20, KGY + 0.55, KZ0 + 0.34);
    b.box('kfPlay2', 1.20, 0.10, 1.10, -0.20, KGY + 1.05, KZ0 + 0.92, 0, 0, -0.42);
    for (let i = 0; i < 14; i++) {
      const a = i * 2.40;
      b.sph(['kfPlay1', 'kfPlay2', 'kfPlay3'][i % 3], 0.11,
        -0.80 + (i % 5) * 0.30, KGY + 0.25, KZ0 + 1.00 + Math.sin(a) * 0.55, 1, 1, 1);
    }
    /* 自助饮料机 + 纸巾台 + 托盘回收 + 垃圾桶 */
    b.box('kfRed', 0.62, 1.70, 1.30, KX1 - 0.70, KGY + 0.85, -2.20);
    b.box('kfScreen', 0.07, 0.52, 0.94, KX1 - 0.34, KGY + 1.30, -2.20);
    for (let i = 0; i < 3; i++) b.box('kfTrimD', 0.09, 0.16, 0.16, KX1 - 0.28, KGY + 0.86, -2.56 + i * 0.36);
    b.box('kfSteelD', 0.58, 0.86, 0.58, KX1 - 0.70, KGY + 0.43, -0.60);
    b.box('kfSteel', 0.62, 0.06, 0.62, KX1 - 0.70, KGY + 0.89, -0.60);
    b.box('kfTrimD', 0.44, 0.50, 0.44, KX1 - 0.72, KGY + 0.25, 0.42);

    /* 店员 2（围裙 + 红帽）+ 顾客 4（不同肤色 / 发型 / 走姿 / 手提袋） */
    kfPed(b, -3.72, -1.80, KGY, KF_PEDK[0], 1.0, 0.3, { role: 'staff', skin: 0, hair: 0 });
    kfPed(b, -3.72, 1.90, KGY, KF_PEDK[1], 0.98, -0.3, { role: 'staff', skin: 2, hair: 1 });
    kfPed(b, -0.60, -1.20, KGY, KF_PEDK[2], 0.96, 1.4, { pose: 'walk', skin: 1, hair: 2, bag: 1 });
    kfPed(b, -0.60, 1.30, KGY, KF_PEDK[3], 0.94, -1.2, { skin: 0, hair: 3 });
    kfPed(b, 1.28, -3.10, KGY, KF_PEDK[1], 0.92, 0.8, { pose: 'walk', skin: 2, hair: 0 });
    kfPed(b, 2.90, 0.10, KGY, KF_PEDK[0], 0.96, Math.PI, { skin: 1, hair: 1, bag: 1 });

    /* ---- NVIDIA SimReady 开源资产（CC BY 4.0）----------------------
       来源：NVIDIA/simready-foundation · sample_content/common_assets/props_general
         obs_workbench_tool_a01        电工工作台
         gen_appliance_toaster_v01_01 烤面包机
         coffee_cup_grasp_a01         咖啡杯
       tools/usd2nvr.py 把 geometries.usd 减面 + 按高度分段染色成
       window.KFC_*，由 build.js 的 preset.asset 内联，仍是单文件离线。
       几何层只有纯灰 displayColor，颜色是按高度重分的，不是资产自带材质。 */
    function kfNV(A, x, yBase, z, ry, sc) {
      if (!A) return;
      sc = sc || 1;
      /* NVR 保留资产原始坐标，底面未必在 0，按 bbox 把底面补到 yBase */
      const bottom = A.bb[1] - A.bb[4] / 2;
      addNV(g, A, x, yBase - bottom * sc, z, sc, ry || 0);
    }
    if (window.KFC_BENCH)  kfNV(window.KFC_BENCH, -6.20, KGY, 0.55, Math.PI / 2, 0.80);
    if (window.KFC_TOASTER) kfNV(window.KFC_TOASTER, -4.02, KGY + 0.94, 2.55, 0.30, 1.0);
    if (window.KFC_CUP) {
      /* 室内桌 sc=0.92 → 台面约 0.735；户外桌 sc=1 → 0.795 */
      kfNV(window.KFC_CUP, -0.90, 0.735, -3.78, 0.4, 1.0);
      kfNV(window.KFC_CUP, 1.10, 0.735, 1.12, 1.2, 1.0);
      kfNV(window.KFC_CUP, 5.83, 0.795, 2.54, 2.0, 1.0);
    }

    b.build(g);
    return g;
  }

  /* ================= 4. Props：室外道具与得来速 ================= */
  function buildKfcProps() {
    const g = new T.Group(), b = new Builder();

    /* ---- 得来速：点餐亭 + 格栅雨棚（不铺满，否则俯视把车道全盖住） ---- */
    const PX = 3.30;
    b.box('kfTrimD', 0.62, 0.16, 0.62, PX, 0.08, 8.62);
    b.box('kfRed', 0.16, 2.60, 0.16, PX, 1.38, 8.62);
    b.box('kfSignBox', 0.20, 1.65, 1.50, PX, 2.30, 8.62);
    kfPlane(g, TEX.kfSide, 1.44, 1.55, PX + 0.11, 2.30, 8.62, Math.PI / 2);
    b.box('kfTrimD', 0.24, 0.52, 0.26, PX - 0.42, 1.30, 8.62);
    b.box('kfScreen', 0.06, 0.34, 0.18, PX - 0.30, 1.34, 8.62);
    /* 雨棚：只有横梁 + 几片条板，留缝 */
    [-4.40, 1.50].forEach(function (x) {
      b.cyl('kfTrimD', 0.055, 0.055, 3.10, 8, x, 1.55, 7.60);
      b.box('kfTrimD', 0.20, 0.14, 2.40, x, 3.10, 6.64);
    });
    b.box('kfTrimD', 6.10, 0.12, 0.12, -1.45, 3.10, KZ1 + 0.16);
    b.box('kfTrimD', 6.10, 0.12, 0.12, -1.45, 3.10, 7.60);
    for (let i = 0; i < 6; i++) {
      const x = -4.30 + i * 1.02;
      b.box(i % 2 ? 'kfWhite' : 'kfRed', 0.42, 0.055, 0.94, x, 3.18, 7.10);
    }
    /* 取餐窗口外的一块小站牌 */
    b.box('kfRedD', 0.12, 1.30, 0.12, -2.30, 0.65, 8.70);
    b.box('kfSignBox', 0.10, 0.52, 0.86, -2.30, 1.46, 8.70);
    kfPlane(g, TEX.kfEntry, 0.80, 0.46, -2.24, 1.46, 8.70, Math.PI / 2, true);

    /* ---- 立柱招牌：双面 + 顶上一个会转的全家桶 ---- */
    (function () {
      const px = 10.00, pz = 0.60;
      b.box('kfWalk2', 1.50, 0.16, 1.50, px, 0.08, pz);
      b.box('kfTrimD', 1.16, 0.22, 1.16, px, 0.27, pz);
      b.box('kfRed', 0.42, 5.20, 0.42, px, 2.98, pz);
      /* 贴片必须落在立柱外侧：柱宽 0.42，贴片放 ±0.14 时柱会从
         牌面正中穿过，把 KFC 的 F 吃掉，读成「K | C」。 */
      b.box('kfTrimD', 0.56, 2.34, 1.96, px, 4.86, pz);
      kfPlane(g, TEX.kfPylon, 1.78, 2.26, px + 0.30, 4.86, pz, Math.PI / 2);
      kfPlane(g, TEX.kfPylon, 1.78, 2.26, px - 0.30, 4.86, pz, -Math.PI / 2);
      b.box('kfRed', 0.34, 0.34, 1.94, px, 6.10, pz);
      /* 顶部旋转桶：独立 Group，用 CT_ANIM 推 rotation */
      const bg = new T.Group();
      const bm = new T.Mesh(new T.CylinderGeometry(0.50, 0.36, 0.84, 20, 1, true),
        new T.MeshBasicMaterial({ map: TEX.kfBucket, side: T.DoubleSide }));
      bg.add(bm);
      const cap = new T.Mesh(new T.CylinderGeometry(0.52, 0.52, 0.08, 20),
        new T.MeshToonMaterial({ color: PAL.kfWhite !== undefined ? PAL.kfWhite : 0xffffff, gradientMap: GRAD }));
      cap.position.y = 0.46; bg.add(cap);
      bg.position.set(px, 7.00, pz);
      g.add(bg);
      CT_ANIM.push(function (t) { bg.rotation.y = t * 0.22; });
      b.box('kfTube', 0.10, 0.10, 1.96, px, 6.28, pz);
    })();

    /* ---- 户外座位：3 组圆桌 + 2 把伞 ---- */
    [[4.60, 0.35], [6.70, 0.35], [5.65, 2.70]].forEach(function (q, i) {
      kfTableSet(b, q[0], q[1], i % 2 ? 'kfSeat' : 'kfSeatD', 1.0);
    });
    kfUmbrella(b, 4.60, 0.35, 1.0);
    kfUmbrella(b, 6.70, 0.35, 0.94);
    /* 坐姿两人必须放在「没有遮阳伞」的第三组圆桌：伞沿 1.02 m > 椅距 0.86 m，
       放在有伞的桌子会把人的上半身整片切掉。椅子在桌心 ±0.608 处，座面 y=0.45 */
    kfPed(b, 5.04, 2.09, 0.14, KF_PEDK[2], 0.96, 0.785, { pose: 'sit', skin: 0, hair: 2 });
    kfPed(b, 6.26, 3.31, 0.14, KF_PEDK[0], 0.94, -2.356, { pose: 'sit', skin: 2, hair: 0 });
    kfPed(b, 5.20, -1.30, 0.14, KF_PEDK[2], 0.98, 0.4, { pose: 'walk', skin: 1, hair: 3, bag: 1 });
    kfPed(b, 6.10, 1.40, 0.14, KF_PEDK[3], 0.94, -0.8, { pose: 'walk', skin: 0, hair: 1 });

    /* ---- 停车场：3 辆车（车头朝店面）+ 灯柱 ---- */
    [[5.90, -7.40, 'kfCarA'], [5.90, -4.16, 'kfCarB'], [5.90, -2.54, 'kfCarC']].forEach(function (q) {
      b.box(q[2], 3.40, 0.60, 1.52, q[0], 0.42, q[1]);
      b.box(q[2], 2.10, 0.50, 1.40, q[0] - 0.20, 0.96, q[1]);
      b.box('kfCarGlass', 1.90, 0.36, 1.42, q[0] - 0.20, 1.00, q[1]);
      [[1.10, 0.72], [1.10, -0.72], [-1.10, 0.72], [-1.10, -0.72]].forEach(function (w) {
        b.cyl('kfTire', 0.30, 0.30, 0.18, 10, q[0] + w[0], 0.30, q[1] + w[1], Math.PI / 2, 0, 0);
      });
      b.box('kfCream', 0.06, 0.12, 0.30, q[0] - 1.72, 0.50, q[1] + 0.50);
      b.box('kfRed', 0.06, 0.12, 0.30, q[0] + 1.72, 0.50, q[1] + 0.50);
    });
    /* 得来速车道上一辆正在取餐的车 */
    (function () {
      const cx = -0.60, cz = 7.28;
      b.box('kfCarB', 3.40, 0.60, 1.52, cx, 0.42, cz);
      b.box('kfCarB', 2.10, 0.50, 1.40, cx - 0.20, 0.96, cz);
      b.box('kfCarGlass', 1.90, 0.36, 1.42, cx - 0.20, 1.00, cz);
      [[1.10, 0.72], [1.10, -0.72], [-1.10, 0.72], [-1.10, -0.72]].forEach(function (w) {
        b.cyl('kfTire', 0.30, 0.30, 0.18, 10, cx + w[0], 0.30, cz + w[1], Math.PI / 2, 0, 0);
      });
    })();

    /* 灯柱：只在场地端头，不挡正面玻璃 */
    [[9.60, -5.60], [9.60, 4.60], [-8.30, 7.90]].forEach(function (q) {
      b.cyl('kfTrimD', 0.075, 0.10, 5.20, 8, q[0], 2.60, q[1]);
      b.box('kfTrimD', 0.90, 0.10, 0.14, q[0] - 0.42, 5.18, q[1]);
      b.box('kfLamp', 0.46, 0.10, 0.30, q[0] - 0.78, 5.10, q[1]);
      b.box('kfTrimD', 0.42, 0.20, 0.42, q[0], 0.10, q[1]);
    });

    /* 门口：垃圾桶 / 外卖取餐柜 / 立牌 / 外卖电动车 */
    b.box('kfTrimD', 0.46, 0.82, 0.46, 2.90, 0.55, -3.30);
    b.box('kfRed', 0.48, 0.10, 0.48, 2.90, 1.00, -3.30);
    b.box('kfSignBox', 0.12, 0.56, 0.82, 2.86, 1.86, 2.40);
    kfPlane(g, TEX.kfEntry, 0.78, 0.50, 2.92, 1.86, 2.40, Math.PI / 2, true);
    b.box('kfTrimD', 0.10, 0.44, 0.10, 2.86, 1.52, 2.40);
    /* 外卖取餐柜：一格一格的小门 */
    b.box('kfRed', 0.56, 1.70, 1.40, 2.86, 0.99, 3.80);
    /* 小门必须贴在朝相机的 +x / +z 两面；贴在背面等于一块纯红板 */
    for (let i = 0; i < 6; i++) {
      const yy = 0.52 + (i % 3) * 0.50, zz = 3.24 + Math.floor(i / 3) * 0.66;
      b.box('kfWhite', 0.04, 0.40, 0.56, 3.16, yy, zz);
      b.box('kfWhite', 0.56, 0.40, 0.04, 2.86, yy, 4.52);
      b.box('kfTrimD', 0.05, 0.05, 0.12, 3.19, yy, zz - 0.18);
    }
    b.box('kfSignBox', 0.60, 0.30, 1.44, 2.86, 1.92, 3.80);
    kfPlane(g, TEX.kfEntry, 1.38, 0.26, 3.18, 1.92, 3.80, Math.PI / 2);
    /* 外卖电动车 + 骑手 */
    (function () {
      const ex = 3.02, ez = -5.60;
      b.cyl('kfTire', 0.26, 0.26, 0.12, 10, ex - 0.52, 0.26, ez, Math.PI / 2, 0, 0);
      b.cyl('kfTire', 0.26, 0.26, 0.12, 10, ex + 0.56, 0.26, ez, Math.PI / 2, 0, 0);
      b.box('kfTrimD', 1.20, 0.09, 0.16, ex, 0.48, ez);
      b.box('kfRed', 0.44, 0.44, 0.44, ex - 0.20, 0.78, ez);
      b.box('kfTrimD', 0.08, 0.56, 0.08, ex + 0.44, 0.74, ez);
      b.box('kfTrimD', 0.36, 0.05, 0.36, ex + 0.44, 1.02, ez);
      kfPed(b, ex - 0.10, ez + 0.52, 0.14, KF_PEDK[1], 0.96, 0.2,
        { skin: 1, hair: 0, bag: 1, role: 'staff' });
    })();

    /* 旗杆：两面上校旗（用贴图 plane 做双面） */
    [[-9.00, -3.20], [-9.00, 2.60]].forEach(function (q) {
      b.cyl('kfTrimD', 0.045, 0.055, 4.60, 8, q[0], 2.30, q[1]);
      b.box('kfTrimD', 0.40, 0.20, 0.40, q[0], 0.10, q[1]);
      kfPlane(g, TEX.kfSide, 0.74, 0.52, q[0] + 0.39, 4.10, q[1], Math.PI / 2, true);
    });

    /* 侧墙小招牌（北墙朝 -z，相机看不到，只做南墙与正面） */
    kfPlane(g, TEX.kfSide, 2.30, 1.50, 1.10, 2.42, KZ1 + 0.32, 0, true);
    /* 背板必须和贴片同向：贴片 ry=0 时宽度沿 x，背板若沿 z 铺就会
       露出一块没贴图的纯红大板 */
    b.box('kfSignBox', 2.36, 1.56, 0.10, 1.10, 2.42, KZ1 + 0.26);
    /* 侧墙一道红白竖条腰线：一面白墙太空，给个能读出「连锁店」的横带 */
    for (let i = 0; i < 12; i++) {
      const x = -4.20 + i * 0.52;
      b.box(i % 2 ? 'kfWhite' : 'kfRed', 0.50, 0.16, 0.06, x, 3.42, KZ1 + 0.27);
    }

    b.build(g);
    return g;
  }

/* =====================================================================
   寒江雪形制（rainlake / RL）——柳宗元《江雪》
   「千山鸟飞绝，万径人踪灭。孤舟蓑笠翁，独钓寒江雪。」

   与江南烟雨盆景相反：这里主角是「空」。116×92 米江面向四周渐隐进
   雪雾，不露托盘边界；群山四层递远、只在断续的高处覆雪；人踪只剩雪
   雾里将灭的两株枯枝与一座极小远亭；一叶孤舟是全画面唯一浓墨。

   构图关键：相机 theta≈1.50（正对 -z），phi≈1.32（近水平俯角），
   远山横贯上缘、江面占下半、孤舟在近景偏左 —— 立轴式三段，不是俯视盆景。
   ===================================================================== */
/* =====================================================================
   千灯 · 上元灯会（lantern / LN）—— 第 13 套独立形制
   ---------------------------------------------------------------------
   与寒江雪恰好相反：那边是「极静 / 留白 / 一点浓墨」，
   这边是「极闹 / 满铺 / 万点暖光」。主角不是房子，是灯。
   构图：暮色远山 + 落日在上，临水灯街在中，寒河与河灯在下；
   石拱桥斜跨，桥上人潮只作单色剪影（不画脸、不画肤色）。
   三类 GPU 粒子：花灯辉光呼吸 / 河灯顺流 / 孔明灯升空。
   ===================================================================== */
const LN = !!PS.lantern;
const LN_X0 = -34.0, LN_X1 = 34.0;
const LN_Z0 = -24.0, LN_Z1 = 17.5;
const LN_WY = -0.12;      // 河面
const LN_LY = 0.16;       // 岸顶
const LN_BT = -0.66;      // 底座顶
const LN_BB = -1.62;      // 底座底
const LN_RZ0 = -1.60, LN_RZ1 = 9.60;   // 河道（沿 x 横贯）

/* 黄昏描边压成暖墨褐，别用民居的纯黑、也别用雪景的冷灰 */
if (LN) OUTLINE.uniforms.uColor.value.set(0x402c30);

/* 确定性伪随机：每轮构建、每张截图完全一致 */
function lnR(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* 任意折线 → 水平棱柱（Shape 在 XY，绕 X -90° 后挤出量变成世界 y） */
function lnSlab(b, key, pts, y0, y1) {
  const sh = new T.Shape();
  sh.moveTo(pts[0][0], -pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], -pts[i][1]);
  sh.closePath();
  const g = new T.ExtrudeGeometry(sh, {
    depth: y1 - y0, bevelEnabled: false, curveSegments: 1, steps: 1
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  b.add(key, g);
}

/* 竖立山板：折线画在 XY，沿 z 挤出厚度 */
function lnRidge(b, key, xs, hs, z, dep, foot) {
  /* 山脚一律沉到 -6，只留脊线在画面里；两端延伸到 ±72 出画，
     否则 Shape 两端的竖直边会在画面里形成「台阶状纸片」。 */
  const sh = new T.Shape();
  sh.moveTo(xs[0], foot);
  for (let i = 0; i < xs.length; i++) sh.lineTo(xs[i], hs[i]);
  sh.lineTo(xs[xs.length - 1], foot);
  sh.closePath();
  const g = new T.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: false, curveSegments: 1, steps: 1 });
  g.translate(0, 0, z);
  b.add(key, g);
}

/* ------------------------------------------------------------ 柔光纹理 */
const lnSoftTex = canvasTex(128, 128, function (c, w, h) {
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.16, 'rgba(255,255,255,0.82)');
  g.addColorStop(0.42, 'rgba(255,255,255,0.28)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
const lnCloudTex = canvasTex(256, 96, function (c, w, h) {
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.72)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.26)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
const lnPlaqueTex = canvasTex(512, 168, function (c, w, h) {
  c.fillStyle = '#4a2318'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#d8a44c'; c.lineWidth = 7;
  c.strokeRect(10, 10, w - 20, h - 20);
  c.strokeStyle = 'rgba(216,164,76,0.45)'; c.lineWidth = 2;
  c.strokeRect(22, 22, w - 44, h - 44);
  c.fillStyle = '#f4d489';
  c.font = '600 104px KaiTi, STKaiti, SimSun, serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('上元燈市', w / 2, h / 2 + 5);
});
const lnRiddleTex = canvasTex(160, 200, function (c, w, h) {
  c.fillStyle = '#f2d9a2'; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#9b4b2c'; c.lineWidth = 8;
  c.strokeRect(7, 7, w - 14, h - 14);
  c.fillStyle = '#6d2a1c';
  c.font = '600 106px KaiTi, STKaiti, SimSun, serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('謎', w / 2, h / 2 + 6);
});

/* 加色光片：不吃雾、不写深度，压在几何之上 */
function lnGlowPlane(w, h, x, y, z, color, op, ry) {
  const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({
    map: lnSoftTex, color: color, transparent: true, opacity: op,
    blending: T.AdditiveBlending, depthWrite: false, fog: false,
    side: T.DoubleSide
  }));
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  m.renderOrder = 4;
  scene.add(m);
  return m;
}

/* ------------------------------------------------------------ 灯位登记 */
/* 每个实体灯笼登记一个光点，交给一个 Points 统一画辉光 + 呼吸，
   否则几百盏灯要么没光、要么要几百个点光把场景洗成白天。 */
const LN_LAMPS = [];
function lnLamp(b, x, y, z, r, key, tassel) {
  const k = key || 'lnLantern';
  b.sph(k, r, x, y, z, 1, 1.16, 1);
  b.cyl('lnLanternD', r * 0.42, r * 0.42, 0.055, 8, x, y + r * 1.10, z);
  b.cyl('lnLanternD', r * 0.38, r * 0.38, 0.050, 8, x, y - r * 1.10, z);
  if (tassel !== false) {
    b.to('lnTassel', 0.017, x, y - r * 1.14, z, x, y - r * 1.14 - r * 0.78, z, 4);
  }
  const ci = k === 'lnLanternW' ? 2 : (k === 'lnLanternY' ? 1 : 0);
  LN_LAMPS.push([x, y, z, r * 3.55, ci]);
}

/* ---------------------------------------------------------------- 底座 */
function lnBase(b) {
  /* 漆盘式底座：暗赭而不是纯黑，侧沿压一线暖金，别出现「托盘黑框」 */
  b.box('lnBase', 88.0, 0.46, 60.0, 0, (LN_BT + LN_BB) / 2 + 0.06, -3.25);
  b.box('lnBaseD', 88.0, 0.11, 60.0, 0, LN_BB + 0.06, -3.25);
  b.box('lnBaseL', 88.3, 0.040, 60.3, 0, LN_BT - 0.02, -3.25);

  /* 远岸（灯街）与近岸两块台地，中间留出河道；顶面与水面的落差就是驳岸 */
  lnSlab(b, 'lnQuay', [
    [LN_X0, LN_Z0], [LN_X1, LN_Z0], [LN_X1, LN_RZ0], [LN_X0, LN_RZ0]
  ], LN_BT, LN_LY);
  lnSlab(b, 'lnQuay', [
    [LN_X0, LN_RZ1], [LN_X1, LN_RZ1], [LN_X1, LN_Z1], [LN_X0, LN_Z1]
  ], LN_BT, LN_LY);

  /* 驳岸压边：一条深色石线，别做成一圈白珍珠 */
  b.box('lnQuayD', 68.0, 0.16, 0.34, 0, LN_LY - 0.06, LN_RZ0 - 0.15);
  b.box('lnQuayD', 68.0, 0.16, 0.34, 0, LN_LY - 0.06, LN_RZ1 + 0.15);

  /* 临水石板街：横向铺装，用错缝避免「条纹地毯」 */
  for (let i = 0; i < 27; i++) {
    const x = -32.4 + i * 2.48;
    for (let j = 0; j < 3; j++) {
      const z = -5.9 + j * 1.42;
      const k = (i + j) % 5 === 0 ? 'lnPaveD' : 'lnPave';
      b.box(k, 2.34, 0.045, 1.30, x, LN_LY + 0.022, z);
    }
  }
  /* 近岸步道 */
  for (let i = 0; i < 27; i++) {
    b.box('lnPaveD', 2.34, 0.045, 1.20, -32.4 + i * 2.48, LN_LY + 0.022, 11.05);
  }
}

/* ------------------------------------------------- 暮色：落日 / 云 / 远山 */
function lnSky() {
  /* 落日：加色柔盘沉在远山之后，被山脊自然切掉下缘。
     用加色而非纯色板，才不会在暮色里变成一块贴纸。 */
  const sun = new T.Mesh(new T.PlaneGeometry(15.0, 15.0), new T.MeshBasicMaterial({
    map: lnSoftTex, color: 0xffb96a, transparent: true, opacity: 0.92,
    blending: T.AdditiveBlending, depthWrite: false, fog: false
  }));
  sun.position.set(-13.0, 15.2, -43.0);
  sun.renderOrder = 1;
  scene.add(sun);
  const core = new T.Mesh(new T.PlaneGeometry(5.4, 5.4), new T.MeshBasicMaterial({
    map: lnSoftTex, color: 0xffe6b0, transparent: true, opacity: 0.85,
    blending: T.AdditiveBlending, depthWrite: false, fog: false
  }));
  core.position.set(-13.0, 15.2, -42.8);
  core.renderOrder = 2;
  scene.add(core);

  /* 暮云：普通半透明片（不加色，会过曝），横向拉长、错落三层 */
  const clouds = [
    [-24, 17.2, -41, 20, 3.0, 0.30], [4, 15.4, -40, 25, 2.5, 0.24],
    [22, 18.6, -42, 18, 2.2, 0.20], [-6, 20.4, -43, 27, 2.0, 0.16]
  ];
  for (let i = 0; i < clouds.length; i++) {
    const q = clouds[i];
    const m = new T.Mesh(new T.PlaneGeometry(q[3], q[4]), new T.MeshBasicMaterial({
      map: lnCloudTex, color: 0x8b5c72, transparent: true, opacity: q[5],
      depthWrite: false, fog: false, side: T.DoubleSide
    }));
    m.position.set(q[0], q[1], q[2]);
    m.renderOrder = 1;
    scene.add(m);
  }
}

function lnMountains(b) {
  function ridge(base, amp, f1, f2, f3, seed) {
    const X = [], H = [];
    for (let x = -72.0; x <= 72.001; x += 0.86) {
      X.push(x);
      H.push(Math.max(1.4, base
        + amp * Math.sin(x * f1 + 0.7 + seed)
        + amp * 0.47 * Math.sin(x * f2 - 1.1 + seed * 0.6)
        + amp * 0.21 * Math.sin(x * f3 + 2.2)
        + 2.9 * Math.exp(-Math.pow((x + 17.0) / 11.0, 2))));
    }
    return { x: X, h: H };
  }
  const L3 = ridge(11.6, 2.45, 0.087, 0.191, 0.413, 0.4);
  const L2 = ridge(8.40, 1.92, 0.121, 0.263, 0.547, 1.7);
  const L1 = ridge(5.60, 1.36, 0.173, 0.361, 0.733, 3.1);
  lnRidge(b, 'lnMtn3', L3.x, L3.h, -38.4, 0.70, -6.0);
  lnRidge(b, 'lnMtn2', L2.x, L2.h, -34.0, 0.80, -6.0);
  lnRidge(b, 'lnMtn1', L1.x, L1.h, -29.6, 0.95, -6.0);
}

/* ---------------------------------------------- 临水灯街：一栋二层楼阁 */
function lnHouse(b, x, z, w, d, ev, seed) {
  const y0 = LN_LY;
  const rg = ev + 1.55;
  const x0 = x - w / 2, x1 = x + w / 2;
  const zf = z + d / 2, zb = z - d / 2;      // 正面朝 +z（朝河）

  b.box('lnStoneD', w + 0.30, 0.26, d + 0.30, x, y0 + 0.13, z);
  /* 一层：木柱 + 粉墙 + 暖格窗（窗走 emit，夜里自己亮） */
  b.box('lnWall', w - 0.22, ev - 0.30, d - 0.22, x, y0 + 0.26 + (ev - 0.30) / 2, z);
  for (let i = 0; i < 4; i++) {
    const px = x0 + 0.16 + i * (w - 0.32) / 3;
    b.cyl('lnPillar', 0.115, 0.13, ev - 0.10, 7, px, y0 + 0.26 + (ev - 0.10) / 2, zf - 0.08);
  }
  /* 一层格窗：三开间，每间一块发光面 + 两根竖棂 */
  for (let i = 0; i < 3; i++) {
    const wx = x0 + w * (0.20 + i * 0.30);
    b.box('lnWin', w * 0.215, 1.44, 0.055, wx, y0 + 1.28, zf + 0.025);
    for (let j = -1; j <= 1; j++) {
      b.box('lnWoodD', 0.045, 1.50, 0.075, wx + j * w * 0.072, y0 + 1.28, zf + 0.07);
    }
    b.box('lnWoodD', w * 0.235, 0.06, 0.075, wx, y0 + 2.02, zf + 0.07);
  }
  /* 门洞：中间开一门，深色内胆 + 半扇暖光 */
  const dx = x0 + w * 0.50;
  b.box('lnDoor', w * 0.20, 1.86, 0.075, dx, y0 + 1.06, zf + 0.05);
  b.box('lnWinW', w * 0.085, 1.60, 0.030, dx + w * 0.045, y0 + 1.02, zf + 0.095);

  /* 二层挑廊：腰檐 + 栏杆 + 上层墙 + 一排格窗 */
  b.box('lnTileD', w + 0.66, 0.16, d + 0.62, x, y0 + ev - 0.02, z);
  b.box('lnWood', w + 0.42, 0.16, 0.62, x, y0 + ev + 0.10, zf + 0.16);
  for (let i = 0; i <= 8; i++) {
    const px = x0 + 0.12 + i * (w - 0.24) / 8;
    b.cyl('lnRail', 0.030, 0.034, 0.66, 5, px, y0 + ev + 0.49, zf + 0.42);
  }
  b.box('lnRail', w - 0.10, 0.070, 0.085, x, y0 + ev + 0.80, zf + 0.42);
  const h2 = 1.62;
  b.box('lnWallD', w - 0.42, h2, d - 0.50, x, y0 + ev + 0.20 + h2 / 2, z - 0.10);
  for (let i = 0; i < 3; i++) {
    const wx = x0 + w * (0.24 + i * 0.26);
    b.box('lnWinW', w * 0.17, 0.94, 0.05, wx, y0 + ev + 1.02, zf + 0.06);
    b.box('lnWoodD', 0.040, 1.00, 0.07, wx, y0 + ev + 1.02, zf + 0.095);
  }

  /* 双坡瓦顶：两片旋转 box 做真坡面 + 正脊 + 两端翘角 */
  const half = (d + 1.10) / 2;
  const slope = Math.atan2(rg - (ev + 0.20 + h2), half);
  const L = Math.sqrt(half * half + Math.pow(rg - (ev + 0.20 + h2), 2));
  const cy = y0 + ev + 0.20 + h2 + (rg - (ev + 0.20 + h2)) / 2;
  for (const s of [-1, 1]) {
    b.box('lnTile', w + 0.72, 0.20, L, x, cy, z + s * half / 2,
      s > 0 ? slope : -slope, 0, 0);
  }
  b.cyl('lnTileD', 0.135, 0.135, w + 0.92, 8, x, y0 + rg, z, 0, 0, Math.PI / 2);
  for (const s of [-1, 1]) {
    b.to('lnTileL', 0.075, x - w / 2 - 0.36, y0 + rg - 0.05, z + s * half / 2,
      x - w / 2 - 0.72, y0 + rg + 0.42, z + s * (half + 0.30) / 2, 5);
    b.to('lnTileL', 0.075, x + w / 2 + 0.36, y0 + rg - 0.05, z + s * half / 2,
      x + w / 2 + 0.72, y0 + rg + 0.42, z + s * (half + 0.30) / 2, 5);
  }
  /* 瓦垄：每坡 5 道，半径 0.055 才不会被描边吃掉 */
  for (let i = 1; i <= 5; i++) {
    const px = x0 + i * w / 6;
    for (const s of [-1, 1]) {
      b.to('lnTileL', 0.055, px, y0 + rg - 0.02, z,
        px, y0 + ev + 0.20 + h2 + 0.10, z + s * half, 5);
    }
  }

  /* 檐下灯笼：一栋 4 盏，色分朱 / 蜜 / 白，不搞彩虹 */
  const keys = ['lnLantern', 'lnLanternY', 'lnLanternW', 'lnLanternY',
    'lnLantern', 'lnLanternW'];
  for (let i = 0; i < 6; i++) {
    const lx = x0 + 0.52 + i * (w - 1.04) / 5;
    const ly = y0 + ev - 0.44;
    b.to('lnCord', 0.014, lx, y0 + ev - 0.10, zf + 0.30,
      lx, ly + 0.30, zf + 0.30, 4);
    lnLamp(b, lx, ly, zf + 0.30, 0.235 + lnR(seed + i) * 0.035, keys[i], true);
  }
  return { x: x, z: z, w: w, d: d, ev: ev, rg: rg };
}

/* ------------------------------------------------------------ 灯街总成 */
function lnStreet(b) {
  const HS = [];
  /* 第 4 项是前后错落量。九栋等高排成一条线会变成舞台布景，
     必须让檐口高低起伏、临河面前后参差，才有「街」的纵深。 */
  const specs = [
    [-29.2, 6.6, 4.62, 0.55], [-22.0, 7.4, 5.35, -0.75], [-14.4, 6.2, 4.30, 0.30],
    [-6.80, 7.8, 6.55, 0.00], [1.20, 6.8, 4.46, -0.85], [8.60, 7.2, 5.10, 0.45],
    [16.2, 6.4, 4.24, -0.65], [23.4, 7.6, 5.75, 0.25], [30.2, 6.0, 3.92, -0.40]
  ];
  for (let i = 0; i < specs.length; i++) {
    const q = specs[i];
    HS.push(lnHouse(b, q[0], -9.70 + q[3], q[1], 6.60, q[2], i * 3.7 + 1.3));
  }

  /* 跨街灯串：沿 x 铺 9 段垂弧，每段挂 6 盏小灯。
     灯串要「连成片」才有灯会感，但每段之间留缺口，别做成一整块彩色顶棚。 */
  for (let s = 0; s < 9; s++) {
    const x0 = -33.0 + s * 7.4, x1 = x0 + 7.4;
    if (s === 4) continue;             // 给牌楼让出一段天
    const spans = 10;
    let px = x0, py = 6.55;
    for (let j = 0; j <= spans; j++) {
      const nx = x0 + (x1 - x0) * j / spans;
      const ny = 6.55 - 1.05 * Math.sin(Math.PI * j / spans);
      if (j > 0) b.to('lnCord', 0.017, px, py, -3.05, nx, ny, -3.05, 4);
      px = nx; py = ny;
    }
    for (let j = 1; j < spans; j++) {
      if (j % 5 === 0) continue;
      const nx = x0 + (x1 - x0) * j / spans;
      const ny = 6.55 - 1.05 * Math.sin(Math.PI * j / spans);
      const k = j % 3 === 0 ? 'lnLanternY' : (j % 3 === 1 ? 'lnLantern' : 'lnLanternW');
      lnLamp(b, nx, ny - 0.32, -3.05, 0.155, k, false);
    }
  }
  /* 灯串两端立柱 */
  for (let s = 0; s <= 9; s++) {
    const x = -33.0 + s * 7.4;
    b.cyl('lnWoodD', 0.070, 0.095, 6.60, 6, x, 3.30, -3.05);
    b.box('lnStoneD', 0.34, 0.22, 0.34, x, 0.11, -3.05);
  }

  /* 临河灯柱：每 6.2 米一根，柱顶一盏大灯 + 柱身灯谜牌 */
  for (let i = 0; i < 11; i++) {
    const x = -31.0 + i * 6.2;
    const z = -1.95;
    b.box('lnStoneD', 0.44, 0.20, 0.44, x, LN_LY + 0.10, z);
    b.cyl('lnWoodDeep', 0.075, 0.10, 3.55, 6, x, LN_LY + 1.98, z);
    b.box('lnWoodDeep', 0.12, 0.10, 0.72, x, LN_LY + 3.70, z + 0.30);
    lnLamp(b, x, LN_LY + 3.32, z + 0.60, 0.30, i % 4 === 0 ? 'lnLanternW' : 'lnLantern', true);
    if (i % 2 === 0) {
      const p = new T.Mesh(new T.PlaneGeometry(0.52, 0.65), new T.MeshBasicMaterial({
        map: lnRiddleTex, side: T.DoubleSide
      }));
      p.position.set(x, LN_LY + 2.42, z + 0.14);
      scene.add(p);
    }
  }
  return HS;
}

/* --------------------------------------------------------- 上元牌楼 */
function lnGate(b) {
  const x = -6.60, z = -2.55, W = 8.40, H = 7.25;
  for (const s of [-1, 1]) {
    const px = x + s * W / 2;
    b.box('lnStoneD', 0.92, 0.34, 0.92, px, LN_LY + 0.17, z);
    b.cyl('lnPillar', 0.235, 0.275, H - 0.30, 9, px, LN_LY + 0.30 + (H - 0.30) / 2, z);
    b.box('lnGateD', 0.60, 0.22, 0.60, px, LN_LY + H - 0.18, z);
  }
  b.box('lnGate', W + 1.10, 0.42, 0.52, x, LN_LY + H - 0.70, z);
  b.box('lnGate', W + 0.40, 0.28, 0.44, x, LN_LY + H - 1.72, z);
  /* 双坡小顶 */
  const half = 1.30, rise = 0.92;
  const L = Math.sqrt(half * half + rise * rise);
  for (const s of [-1, 1]) {
    b.box('lnTile', W + 1.70, 0.18, L, x, LN_LY + H + rise / 2 + 0.10,
      z + s * half / 2, s > 0 ? Math.atan2(rise, half) : -Math.atan2(rise, half), 0, 0);
  }
  b.cyl('lnTileD', 0.12, 0.12, W + 1.90, 8, x, LN_LY + H + rise + 0.12, z, 0, 0, Math.PI / 2);

  /* 匾额：真字 + 挑出式，牌楼是本场景唯一「一句话定性」的身份物 */
  const pl = new T.Mesh(new T.PlaneGeometry(3.55, 1.16), new T.MeshBasicMaterial({
    map: lnPlaqueTex, side: T.DoubleSide
  }));
  pl.position.set(x, LN_LY + H - 1.23, z + 0.31);
  scene.add(pl);
  lnGlowPlane(5.6, 2.5, x, LN_LY + H - 1.23, z + 0.16, 0xffb260, 0.20);

  for (let i = 0; i < 5; i++) {
    const lx = x - 2.70 + i * 1.35;
    lnLamp(b, lx, LN_LY + H - 2.20, z + 0.34, 0.215,
      i % 2 ? 'lnLanternY' : 'lnLantern', true);
  }
}

/* --------------------------------------------------------- 石拱桥 */
/* 人只做单色剪影：锥台身 + 球头，不画脸、不画四肢。
   远景里 1 米高只有十几像素，剪影比细节更有效，也避开「人物太丑」。 */
/* 灯会人潮：单色方块剪影。s 乘 0.58 是让新积木人维持原来约 1.0 米的
    crowd 身高 —— 不缩放会突然长高七成，把桥和灯摊全挡掉。 */
function lnFigure(b, x, y, z, s, key) {
  buildFig({
    b: b, x: x, y: y, z: z, s: (s || 1) * 0.58,
    mono: true, coat: key || 'lnFigure', pose: 'stand'
  });
}

function lnBridge(b) {
  /* 桥沿 z 跨河，正面机位下会被透视压成一条竖线。
     让桥轴线在 x 上斜移 10 米，屏幕上才是一条能读出桥面的斜带。 */
  const z0 = LN_RZ0 - 1.30, z1 = LN_RZ1 + 1.30;
  const X0 = 4.60, X1 = 15.40;
  const W = 5.40, N = 16;
  const bX = function (u) { return X0 + (X1 - X0) * u; };
  const deckY = function (u) { return LN_LY + 0.30 + 3.05 * (1 - Math.pow(2 * u - 1, 2)); };
  const DX = X1 - X0, DZ = z1 - z0;
  const ry = Math.atan2(DX, DZ);
  const HYP = Math.sqrt(DX * DX + DZ * DZ);

  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N;
    const za = z0 + DZ * u0, zb = z0 + DZ * u1;
    const xa = bX(u0), xb = bX(u1);
    const ya = deckY(u0), yb = deckY(u1);
    const len = Math.sqrt(Math.pow(xb - xa, 2) + Math.pow(zb - za, 2) + Math.pow(yb - ya, 2));
    const ang = Math.atan2(yb - ya, HYP / N);
    const cx = (xa + xb) / 2, cz = (za + zb) / 2, cy = (ya + yb) / 2;
    b.box('lnStoneL', W, 0.30, len + 0.12, cx, cy, cz, -ang, ry, 0);
    b.box('lnBridgeD', W + 0.05, 0.045, 0.080, cx, cy + 0.165,
      za + 0.03, -ang, ry, 0);
  }
  /* 桥墩与拱券立柱 */
  for (const u of [0.045, 0.955]) {
    b.box('lnBridgeD', W + 0.28, 1.30, 1.00, bX(u), LN_WY + 0.28, z0 + DZ * u, 0, ry, 0);
  }
  for (let i = 1; i <= 3; i++) {
    const u = i / 4, yy = deckY(u);
    for (const sg of [-1, 1]) {
      const o = sg * (W / 2 - 0.16);
      b.box('lnBridgeD', 0.30, 0.52, 0.46,
        bX(u) + o * Math.cos(ry), yy - 0.28,
        z0 + DZ * u - o * Math.sin(ry), 0, ry, 0);
    }
  }
  for (const u of [-0.045, 1.045]) {
    b.box('lnStoneL', W + 0.65, 0.16, 0.78, bX(u), LN_LY + 0.08,
      z0 + DZ * u, 0, ry, 0);
  }
  /* 栏杆：立柱 / 横杆 / 每两柱一盏灯 */
  for (const sg of [-1, 1]) {
    for (let i = 0; i <= 15; i++) {
      const u = i / 15, z = z0 + DZ * u, yy = deckY(u);
      const px = bX(u) + sg * (W / 2 - 0.10) * Math.cos(ry);
      const pz = z - sg * (W / 2 - 0.10) * Math.sin(ry);
      b.cyl('lnStoneL', 0.055, 0.068, 0.80, 5, px, yy + 0.51, pz);
      b.sph('lnStoneL', 0.080, px, yy + 0.93, pz);
      if (i % 2 === 0) lnLamp(b, px, yy + 1.30, pz, 0.180, 'lnLanternY', false);
    }
    for (let i = 0; i < 15; i++) {
      const u0 = i / 15, u1 = (i + 1) / 15;
      const o = sg * (W / 2 - 0.10);
      b.to('lnStoneL', 0.040,
        bX(u0) + o * Math.cos(ry), deckY(u0) + 0.71, z0 + DZ * u0 - o * Math.sin(ry),
        bX(u1) + o * Math.cos(ry), deckY(u1) + 0.71, z0 + DZ * u1 - o * Math.sin(ry), 5);
    }
  }
  /* 桥上人潮：细剪影 + 提灯，别铺成一排黑柱 */
  for (let i = 0; i < 26; i++) {
    const u = 0.05 + 0.90 * lnR(i * 2.7 + 4.1);
    const off = (lnR(i * 5.3 + 1.2) - 0.5) * (W - 1.30);
    const x = bX(u) + off * Math.cos(ry);
    const z = z0 + DZ * u - off * Math.sin(ry);
    const sc = 0.84 + lnR(i * 7.9 + 2.6) * 0.26;
    lnFigure(b, x, deckY(u) + 0.15, z, sc, i % 5 === 0 ? 'lnFigureD' : 'lnFigure');
    if (i % 3 === 0) {
      b.sph('lnLanternY', 0.095 * sc, x + 0.26 * sc,
        deckY(u) + 0.55 * sc, z + 0.06, 1, 1.08, 1);
    }
  }
}

/* ------------------------------------------------------- 近岸与配景 */
function lnTree(b, x, z, s) {
  const y = LN_LY;
  b.to('lnBark', 0.135 * s, x, y, z, x + 0.10 * s, y + 2.30 * s, z, 6);
  const blobs = [[-0.90, 0.20, 3.05, 1.10], [0.85, -0.15, 2.90, 1.02],
    [0.05, 0.55, 3.55, 1.16], [-0.30, -0.72, 2.82, 0.92]];
  for (let i = 0; i < blobs.length; i++) {
    const q = blobs[i];
    b.sph(i % 2 ? 'lnTree' : 'lnTreeD', 0.94 * s * q[3],
      x + q[0] * s, y + q[2] * s, z + q[1] * s, 1.15, 0.78, 1.05);
  }
  /* 垂枝只给 5 根粗一些的，别做成黑色流苏 */
  for (let i = 0; i < 5; i++) {
    const a = i * 1.31;
    const bx = x + Math.cos(a) * 1.05 * s, bz = z + Math.sin(a) * 0.85 * s;
    b.to('lnTree', 0.032 * s, bx, y + 2.72 * s, bz,
      bx + 0.10 * s, y + 1.62 * s, bz + 0.05 * s, 4);
  }
}

function lnStall(b, x, z, idx) {
  const cw = 3.50, cd = 2.20, y = LN_LY;
  const awning = ['lnStall1', 'lnStall2', 'lnStall3'][idx % 3];
  b.box('lnStoneD', cw + 0.20, 0.14, cd + 0.20, x, y + 0.07, z);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.cyl('lnWoodD', 0.055, 0.065, 2.42, 5,
        x + sx * (cw / 2 - 0.16), y + 1.28, z + sz * (cd / 2 - 0.14));
    }
  }
  /* 柜台朝河（+z），台上摆货，别做成空盒子 */
  b.box('lnWood', cw - 0.34, 0.72, 0.58, x, y + 0.44, z + cd / 2 - 0.42);
  b.box('lnWoodDeep', cw - 0.34, 0.08, 0.66, x, y + 0.83, z + cd / 2 - 0.42);
  for (let j = 0; j < 5; j++) {
    const gx = x - 1.20 + j * 0.60;
    b.box(j % 2 ? 'lnLanternY' : 'lnLantern', 0.26, 0.30, 0.26,
      gx, y + 1.02, z + cd / 2 - 0.42);
  }
  /* 双坡棚布：每四座空一座，连续盖满就是一块彩色地板 */
  if (idx % 4 !== 3) {
    const half = cd / 2 + 0.24, rise = 0.62;
    const L = Math.sqrt(half * half + rise * rise);
    const a = Math.atan2(rise, half);
    for (const sg of [-1, 1]) {
      b.box(awning, cw + 0.24, 0.09, L, x, y + 2.46 + rise / 2,
        z + sg * half / 2, sg > 0 ? a : -a, 0, 0);
    }
    b.box('lnWoodDeep', cw + 0.30, 0.10, 0.14, x, y + 2.46 + rise, z);
  }
  /* 檐下三盏灯 + 一片地面暖光 */
  for (let j = 0; j < 3; j++) {
    const lx = x - 1.10 + j * 1.10;
    b.to('lnCord', 0.014, lx, y + 2.40, z + cd / 2, lx, y + 2.06, z + cd / 2, 4);
    lnLamp(b, lx, y + 1.86, z + cd / 2 + 0.05, 0.20,
      j === 1 ? 'lnLanternW' : 'lnLantern', false);
  }
  lnGlowPlane(4.6, 3.2, x, y + 0.035, z + 1.20, 0xffa648, 0.16);
}

function lnNearBank(b) {
  /* 下河石阶 + 系船石 */
  for (let i = 0; i < 5; i++) {
    b.box('lnStone', 3.10, 0.14, 0.56, -19.0, LN_LY - i * 0.13, LN_RZ1 + 0.42 + i * 0.50);
  }
  for (let i = 0; i < 3; i++) {
    b.cyl('lnStoneD', 0.24, 0.30, 0.52, 7, -22.0 + i * 3.4, LN_LY + 0.26, LN_RZ1 + 0.34);
  }
  /* 临河石栏：柱距 2.4 米，隔三根挂一盏灯 */
  for (let i = 0; i <= 28; i++) {
    const x = -33.6 + i * 2.40;
    if (x > 12.4 && x < 19.0) continue;    // 让开斜桥桥头 x≈13~18
    b.cyl('lnStoneL', 0.062, 0.078, 0.92, 5, x, LN_LY + 0.46, LN_RZ1 + 0.36);
    if (i > 0 && i % 3 === 0) lnLamp(b, x - 1.20, LN_LY + 1.30,
      LN_RZ1 + 0.36, 0.185, i % 2 ? 'lnLanternY' : 'lnLantern', false);
  }
  for (let i = 0; i < 28; i++) {
    const x0 = -33.6 + i * 2.40, x1 = x0 + 2.40;
    if (x1 > 12.4 && x0 < 19.0) continue;
    b.to('lnStoneL', 0.040, x0, LN_LY + 0.70, LN_RZ1 + 0.36,
      x1, LN_LY + 0.70, LN_RZ1 + 0.36, 5);
  }
  /* 灯市：九座摊子沿 z=13.4 铺开 */
  for (let i = 0; i < 9; i++) {
    lnStall(b, -29.0 + i * 7.25, 13.40, i);
  }
  /* 树：错开摊子，别堵在正中 */
  lnTree(b, -32.0, 16.0, 0.94);
  lnTree(b, -4.20, 16.2, 0.80);
  lnTree(b, 26.0, 15.8, 0.90);
  lnTree(b, 32.0, 11.6, 0.72);
  /* 近岸落地灯 */
  for (let i = 0; i < 7; i++) {
    const x = -31.0 + i * 10.2;
    b.box('lnStoneD', 0.40, 0.18, 0.40, x, LN_LY + 0.09, 10.30);
    b.cyl('lnWoodDeep', 0.065, 0.085, 2.55, 6, x, LN_LY + 1.40, 10.30);
    lnLamp(b, x, LN_LY + 2.92, 10.30, 0.265,
      i % 3 === 0 ? 'lnLanternW' : 'lnLantern', true);
  }
  /* 看灯人潮：成组、带提灯，剪影单色不画脸 */
  for (let i = 0; i < 38; i++) {
    const x = -32.0 + 64.0 * lnR(i * 3.31 + 7.7);
    const z = 10.9 + 5.6 * lnR(i * 6.71 + 2.2);
    if (x > 12.4 && x < 19.0) continue;
    const sc = 0.82 + lnR(i * 4.43 + 1.1) * 0.24;
    lnFigure(b, x, LN_LY, z, sc, i % 4 === 0 ? 'lnFigureD' : 'lnFigure');
    if (i % 3 === 0) {
      b.sph('lnLanternY', 0.105 * sc, x + 0.30 * sc, LN_LY + 0.58 * sc, z + 0.06, 1, 1.08, 1);
    }
  }
  /* 灯市洒在石板上的暖光：屏幕下半留出呼吸，但别是一整块素色 */
  for (let i = 0; i < 6; i++) {
    lnGlowPlane(8.2, 4.6, -27.0 + i * 10.8, LN_LY + 0.038, 15.90,
      0xffa04c, 0.11);
  }
  for (let i = 0; i < 14; i++) {
    const x = -31.0 + 62.0 * lnR(i * 8.13 + 3.7);
    const z = 15.10 + 1.80 * lnR(i * 4.77 + 6.2);
    if (x > 12.4 && x < 19.0) continue;
    const sc = 0.80 + lnR(i * 2.91) * 0.22;
    lnFigure(b, x, LN_LY, z, sc, i % 3 === 0 ? 'lnFigureD' : 'lnFigure');
  }

  /* 街面行人剪影 */
  for (let i = 0; i < 30; i++) {
    const x = -31.0 + 62.0 * lnR(i * 3.13 + 7.7);
    const z = -5.6 + 2.4 * lnR(i * 6.71 + 2.2);
    lnFigure(b, x, LN_LY, z, 0.82 + lnR(i * 4.4) * 0.22,
      i % 4 === 0 ? 'lnFigureD' : 'lnFigure');
    if (i % 4 === 0) {
      b.sph('lnLanternY', 0.095, x + 0.24, LN_LY + 0.52, z + 0.05, 1, 1.08, 1);
    }
  }
}

/* ------------------------------------------------------ 河面（灯影） */
const lnWaterUni = { uTime: { value: 0 } };
function lnWater() {
  const W = PS.lnWater || {};
  const d = cfg(W.deep, [0.105, 0.118, 0.215]);
  const sh = cfg(W.shal, [0.190, 0.190, 0.275]);
  const gl = cfg(W.glow, [1.000, 0.610, 0.270]);
  const fg = cfg(W.fog, [0.290, 0.250, 0.330]);
  lnWaterUni.uDeep = { value: new T.Vector3(d[0], d[1], d[2]) };
  lnWaterUni.uShal = { value: new T.Vector3(sh[0], sh[1], sh[2]) };
  lnWaterUni.uGlow = { value: new T.Vector3(gl[0], gl[1], gl[2]) };
  lnWaterUni.uFog = { value: new T.Vector3(fg[0], fg[1], fg[2]) };
  const m = new T.ShaderMaterial({
    uniforms: lnWaterUni,
    vertexShader:
      'varying vec2 vUv;\n' +
      'void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:
      'uniform float uTime; uniform vec3 uDeep,uShal,uGlow,uFog; varying vec2 vUv;\n' +
      'void main(){\n' +
      '  vec2 uv=vUv; float t=uTime;\n' +
      /* 暮色寒河：极低频横纹，别做成条纹地毯 */
      '  float band=sin(uv.y*18.0+t*0.20+sin(uv.x*5.0)*0.8)*0.5\n' +
      '         +sin(uv.y*7.0-t*0.13+uv.x*2.6)*0.5;\n' +
      '  vec3 col=mix(uDeep,uShal,smoothstep(0.0,1.0,uv.y)*0.62+0.10);\n' +
      '  col+=vec3(0.055,0.048,0.052)*smoothstep(0.55,0.98,band)*0.20;\n' +
      /* 对岸灯火的竖长抖动倒影：22 列，每列独立闪烁，越近越强 */
      '  float cidx=floor(uv.x*22.0);\n' +
      '  float cx=fract(uv.x*22.0);\n' +
      '  float lamp=exp(-pow((cx-0.5)*5.6,2.0));\n' +
      '  float flick=0.62+0.38*sin(t*2.1+cidx*1.73);\n' +
      '  float shk=0.55+0.45*sin(uv.y*42.0+t*1.6+cidx*2.3)*0.5\n' +
      '           +0.22*sin(uv.y*17.0-t*0.9);\n' +
      '  float vm=1.0-smoothstep(0.30,0.98,uv.y);\n' +
      '  col+=uGlow*lamp*flick*shk*vm*0.36;\n' +
      /* 河灯自身的小光晕：稀疏同心点，跟实体河灯对上 */
      '  float e=smoothstep(0.0,0.045,uv.x)*smoothstep(1.0,0.955,uv.x)\n' +
      '         *smoothstep(0.0,0.05,uv.y)*smoothstep(1.0,0.95,uv.y);\n' +
      '  col=mix(uFog,col,0.20+0.80*e);\n' +
      '  gl_FragColor=vec4(col,1.0);\n' +
      '}'
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(68.0, 11.20, 1, 1), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, LN_WY, (LN_RZ0 + LN_RZ1) / 2);
  mesh.renderOrder = 0;
  CT_ANIM.push(function (t) { lnWaterUni.uTime.value = t; });
  return mesh;
}

/* ------------------------------------------- GPU 粒子：花灯辉光呼吸 */
const LN_PT_COLORS = [[1.00, 0.52, 0.26], [1.00, 0.76, 0.36], [1.00, 0.91, 0.70]];
function lnLampGlow() {
  const n = LN_LAMPS.length;
  if (!n) return;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const size = new Float32Array(n), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const q = LN_LAMPS[i];
    pos[i * 3] = q[0]; pos[i * 3 + 1] = q[1]; pos[i * 3 + 2] = q[2];
    const c = LN_PT_COLORS[q[4]] || LN_PT_COLORS[0];
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    size[i] = q[3]; ph[i] = lnR(i * 1.71 + 0.3) * 6.283;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('aCol', new T.BufferAttribute(col, 3));
  g.setAttribute('aSize', new T.BufferAttribute(size, 1));
  g.setAttribute('aPh', new T.BufferAttribute(ph, 1));
  const uni = { uTime: { value: 0 } };
  const m = new T.ShaderMaterial({
    uniforms: uni,
    vertexShader:
      'attribute vec3 aCol; attribute float aSize; attribute float aPh;\n' +
      'uniform float uTime; varying vec3 vCol; varying float vA;\n' +
      'void main(){ vec4 mv=modelViewMatrix*vec4(position,1.0);\n' +
      '  float br=0.84+0.16*sin(uTime*2.0+aPh);\n' +
      '  vCol=aCol; vA=br;\n' +
      '  gl_PointSize=clamp(aSize*br*1500.0/max(1.0,-mv.z),3.0,72.0);\n' +
      '  gl_Position=projectionMatrix*mv; }',
    fragmentShader:
      'varying vec3 vCol; varying float vA;\n' +
      'void main(){ vec2 p=gl_PointCoord-0.5; float r=length(p);\n' +
      '  float a=exp(-r*r*10.0)*vA*0.86;\n' +
      '  if(a<0.006) discard;\n' +
      '  gl_FragColor=vec4(vCol*a,a); }',
    transparent: true, blending: T.AdditiveBlending, depthWrite: false
  });
  const pts = new T.Points(g, m);
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  scene.add(pts);
  CT_ANIM.push(function (t) { uni.uTime.value = t; });
}

/* ---------------------------------------------- GPU 粒子：河灯顺流 */
function lnRiverLamps() {
  const N = cfg(PS.lnRiverN, 190);
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const spd = new Float32Array(N), size = new Float32Array(N), ph = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = -33.0 + 66.0 * lnR(i * 2.13 + 1.7);
    const z = LN_RZ0 + 0.7 + (LN_RZ1 - LN_RZ0 - 1.4) * lnR(i * 5.77 + 4.2);
    pos[i * 3] = x; pos[i * 3 + 1] = LN_WY + 0.06; pos[i * 3 + 2] = z;
    col[i * 3] = 1.0; col[i * 3 + 1] = 0.66 + 0.22 * lnR(i * 3.9); col[i * 3 + 2] = 0.34;
    spd[i] = 0.42 + 0.55 * lnR(i * 7.31 + 2.4);
    size[i] = 0.55 + 1.05 * Math.pow(lnR(i * 4.47 + 9.1), 1.6);
    ph[i] = lnR(i * 8.19 + 0.8) * 6.283;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('aCol', new T.BufferAttribute(col, 3));
  g.setAttribute('aSpd', new T.BufferAttribute(spd, 1));
  g.setAttribute('aSize', new T.BufferAttribute(size, 1));
  g.setAttribute('aPh', new T.BufferAttribute(ph, 1));
  const uni = { uTime: { value: 0 } };
  const m = new T.ShaderMaterial({
    uniforms: uni,
    vertexShader:
      'attribute vec3 aCol; attribute float aSpd,aSize,aPh;\n' +
      'uniform float uTime; varying vec3 vCol; varying float vA;\n' +
      'void main(){ vec3 p=position;\n' +
      '  p.x=mod(p.x+uTime*aSpd+34.0,68.0)-34.0;\n' +
      '  p.z+=sin(uTime*0.65+aPh)*0.14;\n' +
      '  vec4 mv=modelViewMatrix*vec4(p,1.0);\n' +
      '  vCol=aCol; vA=0.72+0.28*sin(uTime*1.7+aPh);\n' +
      '  gl_PointSize=clamp(aSize*430.0/max(1.0,-mv.z),1.6,11.0);\n' +
      '  gl_Position=projectionMatrix*mv; }',
    fragmentShader:
      'varying vec3 vCol; varying float vA;\n' +
      'void main(){ vec2 p=gl_PointCoord-0.5; float r=length(p);\n' +
      '  float core=exp(-r*r*30.0); float halo=exp(-r*r*7.0)*0.34;\n' +
      '  float a=(core+halo)*vA; if(a<0.008) discard;\n' +
      '  gl_FragColor=vec4(vCol*a,a); }',
    transparent: true, blending: T.AdditiveBlending, depthWrite: false
  });
  const pts = new T.Points(g, m);
  pts.frustumCulled = false; pts.renderOrder = 5;
  scene.add(pts);
  CT_ANIM.push(function (t) { uni.uTime.value = t; });

  /* 近景 10 只实体纸河灯：小纸船 + 一簇火，让「漂流」有可读的形状。
     每只一个 Group，靠 CT_ANIM 逐帧推 x，端点回卷。 */
  for (let i = 0; i < 10; i++) {
    const g2 = new T.Group();
    const bb = new Builder();
    bb.box('lnBoat', 0.52, 0.10, 0.34, 0, 0, 0);
    bb.box('lnBoatD', 0.34, 0.16, 0.24, 0, 0.11, 0);
    bb.sph('lnLanternY', 0.105, 0, 0.24, 0, 1, 1.05, 1);
    bb.build(g2, { noOutline: ['lnLanternY', 'lnBoatD'] });
    const x0 = -30.0 + 6.2 * i;
    const z = 1.1 + 6.6 * lnR(i * 3.7 + 5.5);
    g2.position.set(x0, LN_WY + 0.05, z);
    scene.add(g2);
    const sp = 0.42 + 0.36 * lnR(i * 9.3 + 1.1);
    CT_ANIM.push(function (t) {
      g2.position.x = -34.0 + ((x0 + 34.0 + t * sp) % 68.0);
      g2.position.y = LN_WY + 0.05 + Math.sin(t * 1.4 + i) * 0.012;
    });
  }
}

/* -------------------------------------------- GPU 粒子：孔明灯升空 */
function lnSkyLanterns() {
  const N = cfg(PS.lnSkyN, 110);
  const pos = new Float32Array(N * 3), spd = new Float32Array(N);
  const size = new Float32Array(N), ph = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = -33.0 + 66.0 * lnR(i * 2.91 + 3.3);
    pos[i * 3 + 1] = 1.0 + 27.0 * lnR(i * 6.13 + 7.7);
    pos[i * 3 + 2] = -30.0 + 34.0 * lnR(i * 4.29 + 1.9);
    spd[i] = 0.55 + 0.85 * lnR(i * 8.77 + 2.8);
    size[i] = 0.55 + 1.10 * Math.pow(lnR(i * 5.31 + 4.4), 1.5);
    ph[i] = lnR(i * 9.71 + 0.6) * 6.283;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('aSpd', new T.BufferAttribute(spd, 1));
  g.setAttribute('aSize', new T.BufferAttribute(size, 1));
  g.setAttribute('aPh', new T.BufferAttribute(ph, 1));
  const uni = { uTime: { value: 0 } };
  const m = new T.ShaderMaterial({
    uniforms: uni,
    vertexShader:
      'attribute float aSpd,aSize,aPh; uniform float uTime;\n' +
      'varying float vA;\n' +
      'void main(){ vec3 p=position;\n' +
      '  float u=mod(p.y+uTime*aSpd,28.0);\n' +
      '  p.y=u+1.0;\n' +
      '  p.x+=sin(uTime*0.31+aPh)*1.55;\n' +
      '  p.z+=sin(uTime*0.22+aPh*1.7)*0.85;\n' +
      '  vec4 mv=modelViewMatrix*vec4(p,1.0);\n' +
      '  vA=(0.55+0.45*sin(uTime*1.5+aPh))*(0.55+0.45*smoothstep(0.0,7.0,u))\n' +
      '     *(1.0-smoothstep(21.0,28.0,u)*0.72);\n' +
      '  gl_PointSize=clamp(aSize*1150.0/max(1.0,-mv.z),2.4,21.0);\n' +
      '  gl_Position=projectionMatrix*mv; }',
    fragmentShader:
      'varying float vA;\n' +
      'void main(){ vec2 p=gl_PointCoord-0.5; float r=length(p);\n' +
      '  float a=exp(-r*r*9.0)*vA*0.92; if(a<0.008) discard;\n' +
      '  gl_FragColor=vec4(vec3(1.0,0.68,0.36)*a,a); }',
    transparent: true, blending: T.AdditiveBlending, depthWrite: false
  });
  const pts = new T.Points(g, m);
  pts.frustumCulled = false; pts.renderOrder = 5;
  scene.add(pts);
  CT_ANIM.push(function (t) { uni.uTime.value = t; });

  /* 近景 9 盏实体孔明灯：圆台纸罩 + 发光芯，独立 Group 循环上升 */
  for (let i = 0; i < 7; i++) {
    const g2 = new T.Group();
    const bb = new Builder();
    bb.sph('lnLantern', 0.36, 0, 0, 0, 1, 1.22, 1);
    bb.cyl('lnLanternD', 0.19, 0.19, 0.045, 10, 0, -0.42, 0);
    bb.sph('lnLanternW', 0.13, 0, -0.30, 0, 1, 1, 1);
    bb.build(g2, { noOutline: ['lnLantern', 'lnLanternW', 'lnLanternD'] });
    const x = -26.0 + 6.4 * i + 2.0 * lnR(i * 3.3);
    const z = -14.0 - 9.0 * lnR(i * 5.1);
    const y0 = 3.0 + 16.0 * lnR(i * 7.7);
    const sp = 0.30 + 0.24 * lnR(i * 4.9);
    g2.position.set(x, y0, z);
    scene.add(g2);
    CT_ANIM.push(function (t) {
      g2.position.y = 2.0 + ((y0 - 2.0 + t * sp) % 20.0);
      g2.position.x = x + Math.sin(t * 0.28 + i) * 0.85;
      g2.rotation.z = Math.sin(t * 0.5 + i) * 0.045;
    });
  }
}

/* ------------------------------------------ 移动提灯人：让街真的在动 */
function lnWalkers() {
  const paths = [
    [-31, -4.6, 31, -4.6, 22.0], [-30, -2.9, 30, -2.9, 26.0],
    [-28, 11.1, 28, 11.1, 30.0], [5.00, -2.4, 15.00, 10.0, 15.0]
  ];
  for (let i = 0; i < paths.length; i++) {
    const q = paths[i];
    for (let j = 0; j < 2; j++) {
      const g2 = new T.Group();
      const bb = new Builder();
      lnFigure(bb, 0, 0, 0, 0.84, 'lnFigureD');
      /* 手里一盏提灯：移动的光比移动的形体更能证明「有人在走」 */
      bb.sph('lnLanternY', 0.105, 0.18, 0.38, 0.10, 1, 1.1, 1);
      bb.build(g2, { noOutline: ['lnFigureD', 'lnLanternY'] });
      const y = q[4] === 15.0 ? LN_LY + 1.0 : LN_LY;
      g2.position.set(q[0], y, q[1]);
      scene.add(g2);
      const dx = q[2] - q[0], dz = q[3] - q[1];
      const len = Math.sqrt(dx * dx + dz * dz);
      const T0 = len / (0.85 + 0.18 * i);
      const ph = (i * 0.37 + j * 0.51) % 1;
      g2.rotation.y = Math.atan2(dx, dz);
      CT_ANIM.push(function (t) {
        const u = (t / T0 + ph) % 1;
        g2.position.x = q[0] + dx * u;
        g2.position.z = q[1] + dz * u;
        g2.position.y = y + Math.abs(Math.sin(t * 5.2 + ph * 9)) * 0.035;
        g2.visible = u > 0.02 && u < 0.98;
      });
    }
  }
}

/* ------------------------------------------------------------- 组装 */
function buildLnAll() {
  /* 屏幕空间暖色底光：写在 CSS 里而不是 3D 平面，
     永远不会像平面那样在天空里露出边缘。 */
  const haze = document.createElement('div');
  haze.style.cssText = 'position:fixed;inset:0;pointer-events:none;' +
    'background:linear-gradient(to top, rgba(255,146,64,0.14) 0%,' +
    'rgba(186,84,96,0.065) 20%, rgba(0,0,0,0) 46%)';
  document.body.appendChild(haze);

  const b = new Builder();
  lnBase(b);
  lnMountains(b);
  const HS = lnStreet(b);
  lnGate(b);
  lnBridge(b);
  lnNearBank(b);
  b.build(scene, {
    noOutline: ['lnMtn1', 'lnMtn2', 'lnMtn3', 'lnCord', 'lnTassel',
      'lnTree', 'lnTreeD', 'lnFigure', 'lnFigureD', 'lnWin', 'lnWinW',
      'lnLantern', 'lnLanternY', 'lnLanternW']
  });
  lnSky();
  scene.add(lnWater());
  lnLampGlow();
  lnRiverLamps();
  lnSkyLanterns();
  lnWalkers();

  /* 灯街的暖点光只放 6 盏，其余亮度全交给自发光 + 加色辉光。
     点光一多，黄昏的暗部被抬平，「夜」就没了。 */
  const LK = cfg(PS.lampK, 1);
  const pts = [
    [-24, 3.6, -4.4, 12, 12], [-8, 4.2, -3.0, 15, 14],
    [8, 3.8, -4.0, 12, 12], [22, 4.0, -4.4, 11, 11],
    [10.6, 3.4, 3.6, 10, 10], [-6.6, 6.0, -2.2, 12, 11]
  ];
  for (let i = 0; i < pts.length; i++) {
    const q = pts[i];
    const lp = new T.PointLight(0xffb066, q[3] * LK, q[4], 2);
    lp.position.set(q[0], q[1], q[2]);
    scene.add(lp);
  }
  if (window.__expose) window.__lnLamps = LN_LAMPS.length;
}

const RL = !!PS.rainlake;
const RL_X0 = -58.0, RL_X1 = 58.0, RL_Z0 = -46.0, RL_Z1 = 46.0;
const RL_WY = -0.10;      // 江面标高
const RL_LY = 0.16;       // 远岸雪面
const RL_BT = -0.62;      // 底座顶
const RL_BB = -1.90;      // 底座底

/* 雪天描边用淡墨，不要民居那套暖褐黑，也不要阴雨的青黑 */
if (RL) OUTLINE.uniforms.uColor.value.set(0x647277);

/* 任意折线多边形 → 水平棱柱。Shape 在 XY，绕 X 轴 -90° 后
   挤出的 z 变成世界 y，shape 的 -y 变成世界 z。 */
function rlSlab(b, key, pts, y0, y1) {
  const sh = new T.Shape();
  sh.moveTo(pts[0][0], -pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], -pts[i][1]);
  sh.closePath();
  const g = new T.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false, curveSegments: 1, steps: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  b.add(key, g);
}

/* 确定性伪随机：布点每帧、每次构建一致，截图可复现 */
function rlR(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* 竖立山板 + 断续雪盖。
   教训：沿整条脊线画连续白带 = 三层「等高线面条」，假得扎眼。
   这里只在高于雪线的局部峰段生成不规则雪块，雪线随 x 起伏、时断时续，
   近山少雪、远山多雪，才有「千山覆雪」的体积而不是描边。 */
function rlRidge(b, key, xs, hs, z, dep, snowKey, line, amp, seed) {
  const base = RL_WY - 1.60;   /* 山脚沉进水下，交给山前雾吃掉 */
  const sh = new T.Shape();
  sh.moveTo(xs[0], base);
  for (let i = 0; i < xs.length; i++) sh.lineTo(xs[i], base + hs[i]);
  sh.lineTo(xs[xs.length - 1], base);
  sh.closePath();
  const g = new T.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: false, curveSegments: 1, steps: 1 });
  g.translate(0, 0, z);
  b.add(key, g);

  if (!snowKey || !amp) return;
  const f = z + dep + 0.06;
  /* 只找局部最高的峰，每峰盖一小撮纺锤形雪帽。
     沿整条脊线铺雪 = 被前层山切出白色斜胶带，务必别改回去。 */
  let last = -99;
  for (let i = 2; i < xs.length - 2; i++) {
    /* 必须是明显高出两侧的主峰：斜坡上一个小小局部极大值
       会生成一条贴在山坡上的白色斜片，像撕坏的胶带。 */
    if (!(hs[i] > hs[i - 1] && hs[i] >= hs[i + 1] && hs[i] > line + 0.80)) continue;
    if (hs[i - 2] > hs[i] - 0.55 || hs[i + 2] > hs[i] - 0.55) continue;
    if (i - last < 12) continue;
    last = i;
    const R = 2, i0 = i - R, i1 = i + R;
    const cap = new T.Shape();
    cap.moveTo(xs[i0], base + hs[i0]);
    for (let j = i0 + 1; j <= i1; j++) cap.lineTo(xs[j], base + hs[j]);
    for (let j = i1; j >= i0; j--) {
      const u = 1 - Math.abs(j - i) / (R + 1);
      cap.lineTo(xs[j], base + hs[j] - (0.80 + amp * 0.80) * u * u);
    }
    cap.closePath();
    const cg = new T.ExtrudeGeometry(cap, { depth: 0.04, bevelEnabled: false, curveSegments: 1, steps: 1 });
    cg.translate(0, 0, f);
    b.add(snowKey, cg);
  }
}

/* ---------------------------------------------------------------- 底座 */
/* 116×92 米的薄雪盘，颜色压到接近雾白；江面 plane 略小于盘，
   四边由水面 shader 渐隐进雾色，默认机位看不到托盘边框。 */
function rlBase(b) {
  b.box('rlBase', 116.2, 0.90, 92.2, 0, (RL_BT + RL_BB) / 2 + 0.12, 0);
  b.box('rlBaseD', 116.2, 0.20, 92.2, 0, RL_BB + 0.10, 0);
}

/* ------------------------------------------------------------ 寒江水面 */
const rlWaterUni = { uTime: { value: 0 } };
function rlWater() {
  const W = PS.rlWater || {};
  const d = cfg(W.deep, [0.660, 0.722, 0.742]);
  const sh = cfg(W.shal, [0.806, 0.852, 0.864]);
  const hi = cfg(W.hi, [0.925, 0.945, 0.945]);
  const fg = cfg(W.fog, [0.900, 0.932, 0.936]);
  rlWaterUni.uDeep = { value: new T.Vector3(d[0], d[1], d[2]) };
  rlWaterUni.uShal = { value: new T.Vector3(sh[0], sh[1], sh[2]) };
  rlWaterUni.uHi = { value: new T.Vector3(hi[0], hi[1], hi[2]) };
  rlWaterUni.uFog = { value: new T.Vector3(fg[0], fg[1], fg[2]) };
  const m = new T.ShaderMaterial({
    uniforms: rlWaterUni,
    vertexShader:
      'varying vec2 vUv;\n' +
      'void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:
      'uniform float uTime; uniform vec3 uDeep,uShal,uHi,uFog; varying vec2 vUv;\n' +
      'void main(){\n' +
      '  vec2 uv=vUv; float t=uTime;\n' +
      /* 寒江镜面：极低频、极低对比的横纹，只在近侧隐约可见 */
      '  float band=sin(uv.y*23.0+t*0.16+sin(uv.x*6.0)*1.0)*0.5\n' +
      '         +sin(uv.y*10.0-t*0.10+uv.x*3.1)*0.5;\n' +
      '  float sheen=smoothstep(0.66,0.99,band)*0.085;\n' +
      '  vec3 col=mix(uDeep,uShal,smoothstep(0.0,0.94,uv.y)*0.60+0.14);\n' +
      '  col=mix(col,uHi,sheen);\n' +
      /* 近处几道极淡墨线：留白不是纯色板，要有「江」的呼吸 */
      '  float ink=smoothstep(0.90,0.997,sin(uv.y*8.0+sin(uv.x*2.6)*0.7)*0.5+0.5);\n' +
      '  col=mix(col,uDeep*0.84,ink*0.105*(1.0-smoothstep(0.34,0.80,uv.y)));\n' +
      /* 远侧天光 + 极淡群山倒影，把「天—山—江」连起来 */
      '  col=mix(col,uFog,exp(-pow((uv.y-0.70)*5.4,2.0))*0.14);\n' +
      '  float refl=sin(uv.x*7.4)*0.5+0.5;\n' +
      '  float rz=smoothstep(0.60,0.86,uv.y)*(1.0-smoothstep(0.90,1.0,uv.y));\n' +
      '  col=mix(col,uDeep*0.93,rz*refl*0.085);\n' +
      /* 远侧整片沉进雪雾：留白不是纯色，是渐隐 */
      '  col=mix(col,uFog,smoothstep(0.64,1.0,uv.y)*0.26);\n' +
      /* 四边渐隐到雾白 —— 没有硬边，就没有「托盘」 */
      '  float e=smoothstep(0.0,0.075,uv.x)*smoothstep(1.0,0.925,uv.x)\n' +
      '         *smoothstep(0.0,0.075,uv.y)*smoothstep(1.0,0.925,uv.y);\n' +
      '  col=mix(uFog,col,0.06+0.94*e);\n' +
      '  gl_FragColor=vec4(col,1.0);\n' +
      '}'
  });
  const mesh = new T.Mesh(new T.PlaneGeometry(114.0, 90.0, 1, 1), m);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, RL_WY, 0);
  mesh.renderOrder = 0;
  CT_ANIM.push(function (t) { rlWaterUni.uTime.value = t; });
  return mesh;
}

/* ------------------------------------------------------------- 千山覆雪 */
function rlMountains(b) {
  /* 四层连绵山脊：加两层高频小起伏打碎「圆馒头」轮廓，
     越远越高越淡、雪越多；近层压低且几乎不覆雪。 */
  function ridge(amp, base, f1, f2, f3, f4, peakX, peakW, peakH, seed) {
    const X = [], H = [];
    for (let x = -66.0; x <= 66.001; x += 0.92) {
      X.push(x);
      const h = base
        + amp * Math.sin(x * f1 + 0.70)
        + amp * 0.46 * Math.sin(x * f2 - 1.10)
        + amp * 0.22 * Math.sin(x * f3 + 2.20)
        + amp * 0.11 * Math.sin(x * f4 + seed)
        + amp * 0.075 * Math.sin(x * (f4 * 1.9) - seed * 2.1)
        + peakH * Math.exp(-Math.pow((x - peakX) / peakW, 2));
      H.push(Math.max(1.6, h));
    }
    return { x: X, h: H };
  }
  const L4 = ridge(3.10, 14.2, 0.091, 0.207, 0.413, 1.31, -22.0, 10.5, 5.2, 0.4);
  const L3 = ridge(2.65, 10.8, 0.124, 0.271, 0.531, 1.57, 25.0, 8.4, 3.9, 1.9);
  const L2 = ridge(2.05, 7.70, 0.163, 0.349, 0.681, 1.93, -6.0, 6.2, 2.6, 3.3);
  const L1 = ridge(1.45, 4.50, 0.211, 0.443, 0.872, 2.31, 32.0, 5.4, 1.8, 5.1);
  rlRidge(b, 'rlMtn4', L4.x, L4.h, -40.60, 0.85, 'rlSnow',   15.0, 0.70, 0.7);
  rlRidge(b, 'rlMtn3', L3.x, L3.h, -36.90, 0.95, 'rlSnowD',  12.0, 0.45, 2.1);
  rlRidge(b, 'rlMtn2', L2.x, L2.h, -33.20, 1.05, null,         0,   0,    0);
  rlRidge(b, 'rlMtn1', L1.x, L1.h, -29.60, 1.15, null,         0,   0,    0);
}

/* ------------------------------------------------------- 远岸雪坡 / 薄冰 */
const RL_BANK = [
  [-58.0, -46.0], [58.0, -46.0], [58.0, -28.2],
  [46.0, -28.9], [34.0, -27.8], [22.0, -29.1], [10.0, -27.9],
  [-2.0, -29.2], [-14.0, -28.0], [-26.0, -29.3], [-38.0, -27.7],
  [-50.0, -28.8], [-58.0, -28.1]
];

function rlShore(b) {
  /* 岸沉到几乎与江面齐平且改暗灰：不要任何白色顶面。
     「千山鸟飞绝」不需要一条亮闪闪的雪岸，群山直接没入寒江。 */
  const Y = RL_WY - 0.015;
  rlSlab(b, 'rlBankD', RL_BANK, RL_BT - 0.02, Y);
  const capes = [
    [[-58.0, -28.1], [-50.0, -28.8], [-46.0, -25.6], [-51.5, -23.8], [-58.0, -24.9]],
    [[58.0, -28.2], [46.0, -28.9], [43.0, -25.4], [49.0, -23.6], [58.0, -24.7]]
  ];
  for (let i = 0; i < capes.length; i++) {
    rlSlab(b, 'rlBankD', capes[i], RL_BT - 0.02, Y);
  }
}

/* ------------------------------------------- 万径人踪灭：枯枝 / 极小远亭 */
function rlBareTree(b, x, z, s) {
  const y = RL_LY;
  b.to('rlWoodD', 0.042 * s, x, y, z, x - 0.10 * s, y + 2.10 * s, z + 0.05 * s, 5);
  const limbs = [[-0.72, 0.30, 1.72], [0.78, -0.24, 1.82], [-0.44, -0.58, 1.98]];
  for (let i = 0; i < limbs.length; i++) {
    const q = limbs[i];
    const sy = y + (0.96 + i * 0.26) * s;
    b.to('rlWoodD', 0.021 * s, x, sy, z,
      x + q[0] * s, sy + q[2] * 0.40 * s, z + q[1] * s, 4);
  }
}

/* 《江雪》里人踪须灭：只留雪雾深处一座小到快看不见的亭，
   作为「将灭」的痕迹，而不是岸边凉亭那个兴趣点。 */
function rlFarPavilion(b) {
  const CX = -39.0, CZ = -30.4, R = 0.82;
  const FLOOR = RL_LY + 0.12, EAVE = FLOOR + 1.24;
  b.cyl('rlStoneD', R + 0.12, R + 0.15, 0.14, 6, CX, RL_LY + 0.07, CZ, 0, Math.PI / 6, 0);
  const SIX = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3;
    SIX.push([CX + R * Math.cos(a), CZ + R * Math.sin(a)]);
  }
  for (let i = 0; i < 6; i++) {
    const p = SIX[i];
    b.cyl('rlWoodD', 0.036, 0.042, 1.24, 5, p[0], FLOOR + 0.62, p[1]);
  }
  const RR = R + 0.30;
  b.cyl('rlSnowD', 0.045, RR, 0.80, 6, CX, EAVE + 0.40, CZ, 0, Math.PI / 6, 0);
}

function rlFlora(b) {
  /* 只留两株将没入雪雾的枯枝；不设远亭 —— 它的白色攒尖顶
     被雾切剩一角时会在画面左侧变成一片突兀的白色斜碎片。 */
  rlBareTree(b, -25.0, -28.4, 1.05);
  rlBareTree(b, 18.0, -28.7, 0.88);
}

/* ------------------------------------------------------ 孤舟 + 蓑笠翁 */
/* 蓑笠翁：纯背影剪影，不画脸、不画肤色。
   S 是人物整体尺度 —— 人高约 1.45×S / 船长 5.4 ≈ 27%，
   近景机位下能读出「宽斗笠 → 驼背 → 蓬松蓑衣下摆 → 一条垂腿 → 执竿的手」。 */
function rlAngler(b, S) {
  const P = function (v) { return v * S; };
  const PX = P(-1.32), PY = 0.12;
  const lean = P(-0.12);

  const HX = PX + lean * 0.66;
  /* 蓑衣：更宽更矮的锥台，坐着的渔翁不是立着的圆锥 */
  b.cyl('rlStraw', P(0.23), P(0.58), P(0.66), 12,
    PX + lean * 0.30, PY + P(0.40), 0, 0, 0, lean);
  for (let k = 0; k < 10; k++) {
    const a = k * Math.PI * 2 / 10 + 0.21;
    const len = 0.52 + 0.16 * Math.sin(k * 2.7);
    b.to('rlStrawD', P(0.024),
      PX + Math.cos(a) * P(0.38) + lean * 0.16, PY + P(0.16), Math.sin(a) * P(0.36),
      PX + Math.cos(a) * P(0.64) * len / 0.52, PY - P(0.02 + 0.02 * (k % 3)),
      Math.sin(a) * P(0.58) * len / 0.52, 5);
  }
  /* 蓑衣正面的稻草束：z 必须落在锥台表面外侧，
     贴着中轴画会整根埋进几何里，等于没画。 */
  for (let k = -2; k <= 2; k++) {
    const fx = k * P(0.15);
    b.to('rlStrawD', P(0.014),
      PX + lean * 0.30 + fx * 0.52, PY + P(0.62), P(0.27),
      PX + lean * 0.30 + fx, PY + P(0.03), P(0.52), 4);
  }
  /* 一整片驼背 + 略低的肩线：不要两个对称圆球，
     俯视下那会变成「一张有耳朵的脸」，而不是背影。 */
  b.sph('rlStraw', P(0.36), HX + lean * 0.10, PY + P(0.72), -P(0.09), 1.0, 0.60, 1.0);
  b.sph('rlStrawD', P(0.20), HX - P(0.30), PY + P(0.66), -P(0.10), 1.0, 0.58, 0.86);
  b.sph('rlStrawD', P(0.20), HX + P(0.30), PY + P(0.66), -P(0.10), 1.0, 0.58, 0.86);
  /* 后颈：斗笠与肩之间留一小段深墨，避免上下连成一坨蘑菇 */
  b.cyl('rlInk', P(0.105), P(0.120), P(0.17), 8, HX, PY + P(0.87), -P(0.04));

  /* 斗笠：宽扁锥 + 帽檐，深墨压住全画唯一浓色块 */
  b.cyl('rlInk', P(0.046), P(0.56), P(0.25), 16, HX, PY + P(1.10), -P(0.04));
  b.cyl('rlInk', P(0.56), P(0.56), P(0.034), 16, HX, PY + P(0.980), -P(0.04));
  b.sph('rlStrawD', P(0.070), HX, PY + P(1.24), -P(0.04));

  /* 一条腿垂出船舷：细、褐色、贴船帮，别做成一个黑浮筒 */
  b.to('rlStrawD', P(0.062), PX + P(0.30), PY + P(0.10), P(0.24),
    PX + P(0.44), PY - P(0.20), P(0.76), 6);
  b.sph('rlInk', P(0.070), PX + P(0.45), PY - P(0.21), P(0.79), 1.3, 0.55, 1.0);

  /* 只留一条右臂：从右肩外侧细长地斜向右上，明确接到竿根。
     左臂藏进蓑衣，避免俯视下形成对称的「五官」。 */
  b.to('rlInk', P(0.048), HX + P(0.30), PY + P(0.66), P(0.02),
    HX + P(0.56), PY + P(0.62), P(0.44), 6);
  b.sph('rlInk', P(0.060), HX + P(0.56), PY + P(0.62), P(0.44));
  return { hx: HX, py: PY };
}

function rlBoat() {
  const g = new T.Group();
  const b = new Builder();
  const HULL = [
    [-1.90, 0], [-1.60, 0.24], [-0.86, 0.40], [0.18, 0.43], [1.18, 0.34],
    [1.76, 0.09], [1.92, 0], [1.76, -0.09], [1.18, -0.34], [0.18, -0.43],
    [-0.86, -0.40], [-1.60, -0.24]
  ];
  rlSlab(b, 'rlBoatD', HULL, -0.17, 0.09);
  const inner = HULL.map(function (p) { return [p[0] * 0.88, p[1] * 0.72]; });
  rlSlab(b, 'rlBoat', inner, 0.09, 0.12);
  for (let i = 0; i < HULL.length; i++) {
    const p = HULL[i], q = HULL[(i + 1) % HULL.length];
    b.to('rlBoatL', 0.046, p[0], 0.18, p[1], q[0], 0.18, q[1], 5);
  }
  b.to('rlBoatL', 0.062, -1.90, 0.16, 0, -2.08, 0.40, 0, 6);
  b.to('rlBoatL', 0.042, 1.92, 0.16, 0, 2.06, 0.28, 0, 6);
  for (let i = 0; i < 2; i++) {
    b.box('rlBoatL', 0.085, 0.045, 0.72, -0.90 + i * 1.05, 0.145, 0);
  }
  /* 船舷一线薄雪 */
  b.to('rlSnow', 0.026, -1.55, 0.20, 0.23, 1.55, 0.20, 0.33, 5);

  const A = rlAngler(b, 1.12);
  /* 钓竿：从手部斜向上挑出船头，竿尖再垂线入水 —— 不是水平晾衣杆 */
  const RX = A.hx + 0.56, RY = A.py + 0.70, RZ = 0.50;
  const TX = 3.30, TY = 1.78, TZ = 1.16;
  b.to('rlRod', 0.032, RX, RY, RZ, TX, TY, TZ, 7);
  b.to('rlRod', 0.017, TX, TY, TZ, TX + 0.40, TY - 0.16, TZ + 0.16, 5);

  b.build(g, {
    noOutline: ['rlStraw', 'rlStrawD', 'rlInk', 'rlRod', 'rlSnow', 'rlBoatL']
  });
  /* 孤舟在近景偏左：靠透视放大，而不是把整条江缩小；
     大片右侧留白才托得住「独钓」。 */
  g.position.set(-11.0, RL_WY, 15.0);
  g.scale.setScalar(1.82);
  g.rotation.y = 0.30;
  scene.add(g);
  CT_ANIM.push(function (t) {
    g.position.y = RL_WY + Math.sin(t * 0.62) * 0.018;
    g.rotation.z = Math.sin(t * 0.47 + 0.4) * 0.010;
    g.rotation.x = Math.sin(t * 0.39 + 1.2) * 0.008;
  });

  /* 钓线：竿尖 → 江面，独立 Line，不进 Builder */
  const lg = new T.BufferGeometry();
  lg.setAttribute('position', new T.BufferAttribute(new Float32Array([
    TX + 0.40, TY - 0.16, TZ + 0.16, TX + 0.86, 0.02, TZ + 0.62
  ]), 3));
  g.add(new T.Line(lg, new T.LineBasicMaterial({
    color: 0x8b9a9d, transparent: true, opacity: 0.58, depthWrite: false, fog: false
  })));
  /* 入水处一枚极小白点 + 一圈将散未散的涟漪：寒江是静的 */
  const q = new T.Mesh(
    new T.TorusGeometry(0.20, 0.010, 4, 20),
    new T.MeshBasicMaterial({
      color: 0xf2f6f6, transparent: true, opacity: 0.30,
      depthWrite: false, fog: false
    })
  );
  q.rotation.x = Math.PI / 2;
  q.position.set(TX + 0.86, 0.012, TZ + 0.62);
  q.renderOrder = 3;
  g.add(q);
  CT_ANIM.push(function (t) {
    const u = (t * 0.28) % 1;
    q.scale.setScalar(0.6 + u * 1.1);
    q.material.opacity = 0.30 * (1 - u);
  });
  return g;
}

/* ------------------------------------------------------------- 飘雪 / 雪雾 */
function rlSnowFall() {
  const N = cfg(PS.rlSnowN, 900);
  const H = 28.0, W = 124.0, D = 100.0;
  const pos = new Float32Array(N * 3);
  const base = new Float32Array(N);
  const phase = new Float32Array(N);
  const size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (rlR(i * 1.7 + 1) - 0.5) * W;
    pos[i * 3 + 1] = rlR(i * 2.3 + 5) * H;
    pos[i * 3 + 2] = (rlR(i * 3.1 + 9) - 0.5) * D - 3.0;
    base[i] = pos[i * 3 + 1];
    phase[i] = rlR(i * 5.3 + 11) * 6.283;
    /* 大小拉开 5 倍：均匀圆点阵会像屏幕噪点，不像斜风雪 */
    size[i] = 0.55 + Math.pow(rlR(i * 7.9 + 3), 2.1) * 2.75;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('aBase', new T.BufferAttribute(base, 1));
  g.setAttribute('aPhase', new T.BufferAttribute(phase, 1));
  g.setAttribute('aSize', new T.BufferAttribute(size, 1));
  const m = new T.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uH: { value: H }, uSpd: { value: 1.15 },
      uCol: { value: new T.Color(0xf6fafb) },
      uOp: { value: cfg(PS.rlSnowOp, 0.40) }
    },
    vertexShader:
      'attribute float aBase,aPhase,aSize; uniform float uTime,uH,uSpd;\n' +
      'varying float vFade;\n' +
      'void main(){\n' +
      '  vec3 p=position;\n' +
      /* 每片雪独立循环下落 + 斜风横移，零逐帧对象 */
      '  p.y=mod(aBase-uTime*uSpd,uH)+(position.y-aBase);\n' +
      '  p.x=mod(p.x+sin(uTime*0.38+aPhase)*1.30+uTime*0.62+62.0,124.0)-62.0;\n' +
      '  p.z+=cos(uTime*0.29+aPhase*1.7)*0.62;\n' +
      '  vec4 mv=modelViewMatrix*vec4(p,1.0);\n' +
      '  gl_Position=projectionMatrix*mv;\n' +
      '  float d=max(-mv.z,1.0);\n' +
      '  gl_PointSize=clamp(aSize*860.0/d,1.2,11.0);\n' +
      '  vFade=clamp(1.0-(d-55.0)/230.0,0.10,1.0);\n' +
      '}',
    fragmentShader:
      'uniform vec3 uCol; uniform float uOp; varying float vFade;\n' +
      'void main(){\n' +
      '  float r=length(gl_PointCoord-vec2(0.5));\n' +
      '  float a=smoothstep(0.5,0.08,r)*uOp*vFade;\n' +
      '  if(a<0.01) discard;\n' +
      '  gl_FragColor=vec4(uCol,a);\n' +
      '}',
    transparent: true, depthWrite: false, fog: false
  });
  const pts = new T.Points(g, m);
  pts.frustumCulled = false;
  pts.renderOrder = 4;
  scene.add(pts);
  CT_ANIM.push(function (t) { m.uniforms.uTime.value = t; });
}

function rlMist() {
  /* 底浓顶淡的横向雪雾：吃掉山脚那条水—山硬直线。
     上一版把浓区放在渐变 0.38（靠顶），结果山脚反而全露，白改。 */
  const tex = canvasTex(64, 128, function (c, w, h) {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(236,243,244,0)');
    gr.addColorStop(0.26, 'rgba(236,243,244,0.08)');
    gr.addColorStop(0.48, 'rgba(236,243,244,0.48)');
    gr.addColorStop(0.66, 'rgba(236,243,244,0.72)');
    gr.addColorStop(0.84, 'rgba(236,243,244,0.28)');
    gr.addColorStop(1, 'rgba(236,243,244,0)');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
  });
  const bands = [[-28.0, 11.0, 0.42], [-25.2, 8.0, 0.28], [-22.0, 5.6, 0.16]];
  for (let i = 0; i < bands.length; i++) {
    const q = bands[i];
    const p = new T.Mesh(new T.PlaneGeometry(120.0, q[1]),
      new T.MeshBasicMaterial({
        map: tex, transparent: true, opacity: q[2], depthWrite: false,
        side: T.DoubleSide, fog: false
      }));
    p.position.set(0, RL_WY - 1.20 + q[1] * 0.5, q[0]);
    p.renderOrder = 1;
    scene.add(p);
  }
}

/* ------------------------------------------------------------------ 装配 */
function buildRlAll() {
  const g = new T.Group();
  const b = new Builder();
  rlBase(b);
  rlMountains(b);
  rlShore(b);
  rlFlora(b);
  b.build(g, {
    noOutline: ['rlMtn1', 'rlMtn2', 'rlMtn3', 'rlMtn4',
      'rlSnow', 'rlSnowD', 'rlInk', 'rlStoneD', 'rlWoodD',
      'rlBase', 'rlBaseD', 'rlBankD', 'rlBoat', 'rlBoatD']
  });
  scene.add(g);
  scene.add(rlWater());
  rlBoat();
  rlMist();
  rlSnowFall();
}

/* ============================================================
   废墟 · 春回（ruin / RW）—— 第 14 套形制
   半塌的两层水泥小屋：背墙与左墙还站着，前墙与右墙垮了一半，
   二层楼板断成 L 形，一块大板斜插进瓦砾堆。一棵树从楼板缺口里
   长出来，树冠盖过残墙；藤蔓垂落、野花铺满、积水映天光，
   逆光里飘着花瓣与尘埃。
   主角不是房子，是「没有人之后，春天照样来了」。
   ============================================================ */
const RW = !!PS.ruin;

const RW_X0 = -10.2, RW_X1 = 10.2;
const RW_Z0 = -8.2, RW_Z1 = 8.2;
const RW_GY = 0.14;       // 草地顶面
const RW_BT = -1.10;      // 展台底

const R_X0 = -5.80, R_X1 = 5.20;   // 主屋外轮廓
const R_Z0 = -4.70, R_Z1 = 4.50;
const R_T  = 0.36;                 // 墙厚
const R_FL = 0.20;                 // 室内地坪
const R_H1 = 3.46;                 // 一层墙顶
const R_SB = 3.24, R_SL = 3.46;    // 二层楼板底 / 面
const R_H2 = 6.40;                 // 二层墙顶

/* 春日废墟的描边压成冷灰墨绿，别用民居的纯黑 */
if (RW) OUTLINE.uniforms.uColor.value.set(0x38413c);

/* 确定性伪随机：每轮构建、每张截图完全一致 */
function rwR(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* 任意折线 → 水平棱柱（pts 是 [x,z]） */
function rwSlab(b, key, pts, y0, y1) {
  const sh = new T.Shape();
  sh.moveTo(pts[0][0], -pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], -pts[i][1]);
  sh.closePath();
  const g = new T.ExtrudeGeometry(sh, {
    depth: y1 - y0, bevelEnabled: false, curveSegments: 1, steps: 1
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  b.add(key, g);
}

/* 断墙：整面墙做成「带洞口的挤出多边形」。
   ★ 不要用一堆小盒子拼：每块盒子都有自己的反向外壳，接缝处会漏出
     一圈圈深色描边，远看就是满墙砖缝。整块挤出只有一个轮廓。 */
function rwWall(b, key, axis, at, a0, a1, y0, y1, holes, opt) {
  opt = opt || {};
  const thick = opt.thick !== undefined ? opt.thick : R_T;
  const amp = opt.amp || 0;
  const slope = opt.slope || 0;
  const dir = opt.dir || 0;
  const seed = opt.seed || 1;
  holes = holes || [];

  /* 顶边控制点：每 0.92 米一个，中间线性过渡。
     逐点独立抖动会变成「梳子」，低频起伏才像整片墙塌下来。 */
  const cn = Math.max(4, Math.ceil((a1 - a0) / 0.92));
  const ctrl = [];
  for (let k = 0; k <= cn; k++) {
    const t = k / cn;
    const free = dir > 0 ? t : (dir < 0 ? 1 - t : 0.5);
    ctrl.push(y1 - slope * free * free
      - amp * (0.06 + 0.52 * rwR(seed + k * 3.17) + 0.95 * free * free)
      + (rwR(seed * 2.3 + k * 7.31) - 0.5) * 0.20);
  }
  const topAt = function (a, i) {
    const u = (a - a0) / Math.max(0.001, a1 - a0) * cn;
    const k = Math.min(cn - 1, Math.floor(u));
    const f = u - k;
    let v = ctrl[k] * (1 - f) + ctrl[k + 1] * f;
    v += (rwR(seed + i * 4.7) - 0.5) * 0.09;
    if (rwR(seed * 1.9 + i * 7.31) < 0.055) v -= 0.16 + rwR(seed + i) * 0.26;
    return Math.max(y0 + 0.22, v);
  };

  /* 洞口上沿必须留在顶边以下，否则 hole 会破出轮廓 */
  let holeTop = y0;
  for (let i = 0; i < holes.length; i++) holeTop = Math.max(holeTop, holes[i][3]);

  const N = Math.max(10, Math.ceil((a1 - a0) / 0.20));
  const sh = new T.Shape();
  sh.moveTo(a0, y0);
  sh.lineTo(a1, y0);
  for (let i = N; i >= 0; i--) {
    const a = a0 + (a1 - a0) * i / N;
    sh.lineTo(a, Math.max(topAt(a, i), holeTop + 0.14));
  }
  sh.closePath();

  for (let i = 0; i < holes.length; i++) {
    const q = holes[i];
    const hp = new T.Path();
    hp.moveTo(q[0], q[2]);
    hp.lineTo(q[1], q[2]);
    hp.lineTo(q[1], q[3]);
    hp.lineTo(q[0], q[3]);
    hp.closePath();
    sh.holes.push(hp);
  }

  const g = new T.ExtrudeGeometry(sh, {
    depth: thick, bevelEnabled: false, curveSegments: 1, steps: 1
  });
  if (axis === 'x') {
    g.translate(0, 0, at - thick * 0.5);
  } else {
    g.rotateY(-Math.PI * 0.5);
    g.translate(at + thick * 0.5, 0, 0);
  }
  b.add(key, g);

  /* 断口上的碎石块：打散过于干净的顶边 */
  const rn = Math.round((a1 - a0) * 0.55);
  for (let i = 0; i < rn; i++) {
    const a = a0 + rwR(seed * 5.1 + i * 2.71) * (a1 - a0);
    const t = (a - a0) / Math.max(0.001, a1 - a0);
    const free = dir > 0 ? t : (dir < 0 ? 1 - t : 0.5);
    if (rwR(seed * 7.3 + i * 3.91) > 0.25 + 0.35 * free) continue;
    const top = topAt(a, i);
    const w = 0.12 + rwR(seed + i * 1.7) * 0.26;
    const h = 0.08 + rwR(seed + i * 2.9) * 0.22;
    if (axis === 'x') {
      b.box(i % 3 ? 'rwCon' : 'rwConD', w, h, thick * (0.66 + rwR(seed + i) * 0.4),
        a, top + h * 0.16, at + (rwR(seed + i * 4.3) - 0.5) * 0.12,
        0, rwR(seed + i * 5.1) * 0.6, rwR(seed + i * 6.7) * 0.22);
    } else {
      b.box(i % 3 ? 'rwCon' : 'rwConD', thick * (0.66 + rwR(seed + i) * 0.4), h, w,
        at + (rwR(seed + i * 4.3) - 0.5) * 0.12, top + h * 0.16, a,
        0, rwR(seed + i * 5.1) * 0.6, rwR(seed + i * 6.7) * 0.22);
    }
  }
}

/* 一根外露钢筋：两段折线，端点带一点随机 */
function rwRebar(b, x, y, z, dx, dy, dz, len, r) {
  const mx = x + dx * len * 0.55, my = y + dy * len * 0.55, mz = z + dz * len * 0.55;
  const ex = x + dx * len + (rwR(x * 9.1 + z * 3.3) - 0.5) * 0.26;
  const ey = y + dy * len + len * 0.22;
  const ez = z + dz * len + (rwR(y * 7.7 + x * 5.1) - 0.5) * 0.26;
  b.to('rwRebar', r, x, y, z, mx, my, mz, 5);
  b.to('rwRebar', r * 0.92, mx, my, mz, ex, ey, ez, 5);
}

/* 一团藤：垂挂 4~6 节，节点带叶 */
function rwVine(b, x, y, z, len, seed, side) {
  const n = 4 + Math.floor(rwR(seed) * 3);
  let px = x, py = y, pz = z;
  for (let i = 0; i < n; i++) {
    const k = (i + 1) / n;
    const wob = Math.sin(seed + i * 1.7) * 0.10;
    const nx = x + wob * k * 1.4 + (side || 1) * 0.10 * k;
    const ny = y - len * k;
    const nz = z + Math.cos(seed * 1.3 + i * 1.5) * 0.09 * k;
    b.to('rwVine', 0.028, px, py, pz, nx, ny, nz, 4);
    b.sph(i % 2 ? 'rwLeaf2' : 'rwLeaf3', 0.115,
      nx + (rwR(seed + i * 3.1) - 0.5) * 0.28,
      ny + 0.03,
      nz + (rwR(seed + i * 5.7) - 0.5) * 0.24, 1.5, 0.42, 1.0);
    px = nx; py = ny; pz = nz;
  }
}

/* 一丛草：三片叶，细锥不进描边 */
function rwTuft(b, x, z, h, seed) {
  for (let i = 0; i < 3; i++) {
    const a = rwR(seed + i * 2.3) * 6.283;
    const lean = 0.18 + rwR(seed + i * 5.1) * 0.30;
    const hh = h * (0.72 + rwR(seed + i * 7.7) * 0.55);
    b.cyl(i === 0 ? 'rwGrassL' : (i === 1 ? 'rwGrass' : 'rwGrassD'),
      0.006, 0.030, hh, 4,
      x + Math.cos(a) * 0.045, RW_GY + hh * 0.5, z + Math.sin(a) * 0.045,
      Math.cos(a) * lean, 0, -Math.sin(a) * lean);
  }
}

/* 一朵野花：细茎 + 花冠 + 花心 */
function rwFlower(b, x, z, h, key, seed) {
  const lean = (rwR(seed) - 0.5) * 0.22;
  b.cyl('rwVineD', 0.010, 0.013, h, 4, x, RW_GY + h * 0.5, z, lean, 0, lean * 0.7, 4);
  const hx = x + lean * h * 0.5, hz = z + lean * h * 0.35;
  b.sph(key, 0.085, hx, RW_GY + h, hz, 1, 0.52, 1);
  b.sph('rwFlowerC', 0.030, hx, RW_GY + h + 0.022, hz);
}

/* ------------------------------------------------------------ 场地 */
function rwBase(b) {
  const X0 = RW_X0, X1 = RW_X1, Z0 = RW_Z0, Z1 = RW_Z1;

  /* 切角八边形展台：不是一块薄托盘，而是一截「切开的土」。
     地表混凝土薄边 → 表土 → 心土 → 碎石层，四层颜色各不相同，
     侧面才有厚度，模型才不像浮在空中的贴纸。 */
  const OUT = [
    [X0 + 1.6, Z0], [X1 - 1.6, Z0], [X1, Z0 + 1.6], [X1, Z1 - 1.6],
    [X1 - 1.6, Z1], [X0 + 1.6, Z1], [X0, Z1 - 1.6], [X0, Z0 + 1.6]
  ];
  rwSlab(b, 'rwBase', OUT, RW_GY - 0.24, RW_GY - 0.03);
  rwSlab(b, 'rwEarthD', OUT, RW_GY - 0.62, RW_GY - 0.24);
  rwSlab(b, 'rwEarth', OUT, RW_GY - 0.94, RW_GY - 0.62);
  rwSlab(b, 'rwRubbleD', OUT, RW_BT, RW_GY - 0.94);

  /* 土层里的碎石与树根，把平整的剖面切碎 */
  for (let i = 0; i < 26; i++) {
    const side = i % 4;
    const t = rwR(i * 3.1 + 1);
    const x = side < 2 ? X0 + 1.6 + t * (X1 - X0 - 3.2) : (side === 2 ? X0 : X1);
    const z = side < 2 ? (side ? Z1 : Z0) : Z0 + 1.6 + t * (Z1 - Z0 - 3.2);
    const y = RW_GY - 0.30 - rwR(i * 5.3 + 2) * 0.55;
    const r = 0.09 + rwR(i * 7.7) * 0.17;
    b.box('rwStone', r * 1.7, r * 1.1, r * 1.3,
      x + (rwR(i * 9.1) - 0.5) * 0.2, y, z + (rwR(i * 11.3) - 0.5) * 0.2,
      0, rwR(i * 13.1) * 3.14, rwR(i * 15.7) * 0.5);
  }

  /* 草地：内缩一圈，露出混凝土边 */
  rwSlab(b, 'rwGrass', [
    [X0 + 1.7, Z0 + 0.28], [X1 - 1.7, Z0 + 0.28], [X1 - 0.28, Z0 + 1.7],
    [X1 - 0.28, Z1 - 1.7], [X1 - 1.7, Z1 - 0.28], [X0 + 1.7, Z1 - 0.28],
    [X0 + 0.28, Z1 - 1.7], [X0 + 0.28, Z0 + 1.7]
  ], RW_GY - 0.14, RW_GY);

  /* 草地色斑：大块不规则深浅，打破「一块绿毯」 */
  for (let i = 0; i < 7; i++) {
    const cx = -7.0 + rwR(i * 3.1 + 1) * 14.0;
    const cz = -5.6 + rwR(i * 5.3 + 2) * 11.2;
    const rx = 1.30 + rwR(i * 7.7) * 1.55, rz = 0.95 + rwR(i * 9.1) * 1.15;
    const pts = [];
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * 6.283;
      const j = 0.72 + rwR(i * 13.7 + k * 2.3) * 0.5;
      pts.push([cx + Math.cos(a) * rx * j, cz + Math.sin(a) * rz * j]);
    }
    rwSlab(b, i % 3 === 0 ? 'rwGrassL' : 'rwGrassD', pts, RW_GY, RW_GY + 0.012);
  }

  /* 主屋地坪：碎成三块的混凝土，裂缝里全是草 */
  const FY = R_FL;
  rwSlab(b, 'rwConD', [
    [R_X0 - 0.55, R_Z0 - 0.55], [R_X1 + 0.55, R_Z0 - 0.55],
    [R_X1 + 0.55, -1.55], [3.05, -1.20], [3.05, 1.10],
    [R_X1 + 0.20, 1.55], [R_X1 + 0.20, R_Z1 + 0.55],
    [R_X0 - 0.55, R_Z1 + 0.55]
  ], FY - 0.08, FY);

  rwSlab(b, 'rwCon', [
    [-1.10, R_Z0 - 0.40], [R_X1 + 0.40, R_Z0 - 0.40],
    [R_X1 + 0.40, 0.15], [1.45, 0.45], [1.35, R_Z1 + 0.40],
    [-1.10, R_Z1 + 0.40]
  ], FY + 0.002, FY + 0.035);

  /* 塌到草地上的那段墙板：屋子塌的时候飞出去的，
     一半陷进草里，苔藓从上面长起来——废墟才不是只在墙里塌。 */
  const SX = -7.15, SZ = 2.55, SR = -0.42;
  b.box('rwCon', 2.45, 0.24, 1.55, SX, RW_GY + 0.10, SZ, 0.06, SR, 0.04);
  b.box('rwConD', 1.30, 0.20, 0.90, SX + 0.95, RW_GY + 0.06, SZ - 0.85, 0.12, SR + 0.35, -0.06);
  b.box('rwMoss', 1.10, 0.03, 0.70, SX - 0.35, RW_GY + 0.235, SZ + 0.18, 0, SR, 0);
  b.box('rwMoss', 0.60, 0.03, 0.95, SX + 0.55, RW_GY + 0.235, SZ - 0.25, 0, SR + 0.2, 0);
  for (let i = 0; i < 7; i++) {
    rwRebar(b, SX + (rwR(i * 3.1) - 0.5) * 1.9, RW_GY + 0.22, SZ + (rwR(i * 5.3) - 0.5) * 1.2,
      (rwR(i * 7.7) - 0.5) * 0.9, 0.82, (rwR(i * 9.1) - 0.5) * 0.9,
      0.20 + rwR(i * 11.3) * 0.24, 0.028);
  }
  for (let i = 0; i < 10; i++) {
    const r = 0.10 + rwR(i * 13.7) * 0.18;
    b.box(i % 4 ? 'rwRubble' : 'rwBrick', r * 1.7, r, r * 1.4,
      SX + (rwR(i * 15.1) - 0.5) * 3.4, RW_GY + r * 0.4,
      SZ + (rwR(i * 17.3) - 0.5) * 2.4, 0, rwR(i * 19.1) * 3.14, 0);
  }

  /* 塌口甩到屋前草地上的碎块：从右下角一路散到院子里，
     不然屋前那片草地就是一块干净的绿毯 */
  for (let i = 0; i < 22; i++) {
    const a = rwR(i * 3.7 + 11) * 6.283;
    const rr = 2.0 + rwR(i * 5.9 + 4) * 4.6;
    const r = 0.08 + rwR(i * 7.3) * 0.24;
    b.box(i % 6 === 0 ? 'rwBrick' : (i % 3 ? 'rwRubbleD' : 'rwRubble'), r * 1.8, r, r * 1.5,
      3.2 + Math.cos(a) * rr, RW_GY + r * 0.4, 5.0 + Math.sin(a) * rr * 0.70,
      0, rwR(i * 9.1) * 3.14, 0);
  }

  /* 断掉的院栅栏：柱子还在，横杆掉了一半，界才划得出来 */
  const FZ = [-1.15, 0.05, 1.25, 2.45, 3.65, 4.85];
  for (let i = 0; i < FZ.length; i++) {
    const lean = i === 2 ? 0.22 : (i === 4 ? -0.14 : 0.03);
    b.box('rwWoodD', 0.11, 1.02 - (i % 3) * 0.10, 0.11,
      -8.55 + (rwR(i * 3.3) - 0.5) * 0.12, RW_GY + 0.50, FZ[i], 0, 0, lean);
  }
  b.box('rwWood', 0.07, 0.09, 2.35, -8.55, RW_GY + 0.78, -0.55, 0, 0, 0.02);
  b.box('rwWood', 0.07, 0.08, 1.55, -8.55, RW_GY + 0.74, 3.02, 0, 0.04, -0.03);
  b.box('rwWoodD', 0.07, 0.09, 1.60, -8.28, RW_GY + 0.05, 4.35, 0, 0.62, 0.02);

  /* 门口踩秃的一小片土：只在门边上，别再铺成一块泥斑 */
  rwSlab(b, 'rwEarth', [
    [R_X1 + 0.25, -3.30], [R_X1 + 2.15, -3.55], [R_X1 + 2.55, -0.75],
    [R_X1 + 1.55, 0.95], [R_X1 + 0.25, 0.55]
  ], RW_GY - 0.004, RW_GY + 0.016);

  /* 门前碎石小径：从门口弯出画外，一条就够，铺成广场就不像废墟了 */
  const PX = [4.85, 6.05, 7.20, 8.35, 9.55];
  const PZ = [-2.45, -1.70, -0.35, 1.15, 2.75];
  const PW = 0.72;
  const pl = [], pr = [];
  for (let i = 0; i < PX.length; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(PX.length - 1, i + 1);
    const dx = PX[i1] - PX[i0], dz = PZ[i1] - PZ[i0];
    const L = Math.sqrt(dx * dx + dz * dz) || 1;
    const nx = -dz / L, nz = dx / L;
    pl.push([PX[i] + nx * PW, PZ[i] + nz * PW]);
    pr.push([PX[i] - nx * PW, PZ[i] - nz * PW]);
  }
  rwSlab(b, 'rwPath', pl.concat(pr.reverse()), RW_GY + 0.004, RW_GY + 0.024);

  /* 路边石：歪的、缺的、半埋的，别排成等距的齿 */
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    b.box('rwStone', 0.22 + rwR(i) * 0.10, 0.07, 0.26,
      5.05 + t * 3.55, RW_GY + 0.032, -3.15 + t * 4.10,
      0, rwR(i * 3.3) * 0.8, (rwR(i * 5.1) - 0.5) * 0.3);
  }

  /* 场地边缘的矮草带，压住底座硬边 */
  for (let i = 0; i < 52; i++) {
    const a = rwR(i * 3.1 + 1) * 6.283;
    const rx = 9.9 + rwR(i * 5.3) * 0.5;
    const rz = 7.6 + rwR(i * 7.1) * 0.5;
    rwTuft(b, Math.cos(a) * rx, Math.sin(a) * rz, 0.20 + rwR(i * 9.7) * 0.16, i * 2.7 + 3);
  }
}

/* ------------------------------------------------------------ 废墟本体 */
function rwRuin(b) {
  const ZB = R_Z0 + R_T * 0.5;
  const XL = R_X0 + R_T * 0.5;
  const XR = R_X1 - R_T * 0.5;
  const ZF = R_Z1 - R_T * 0.5;

  /* 背墙：两层，五个窗洞，只有顶部掉了一点 */
  rwWall(b, 'rwCon', 'x', ZB, R_X0, R_X1, R_FL, R_H2, [
    [-4.55, -3.05, 1.15, 2.35],
    [-2.35, -1.05, 1.15, 2.35],
    [0.05, 1.45, 1.15, 2.35],
    [2.55, 3.70, 1.15, 2.35],
    [-4.45, -3.05, 4.15, 5.42],
    [-1.65, -0.25, 4.15, 5.42],
    [1.95, 3.45, 4.15, 5.42]
  ], { amp: 0.34, slope: 0.18, seed: 11 });

  /* 顶上的烟囱：塌了一半，屋脊线才不是一条平滑的斜边 */
  b.box('rwConD', 0.66, 1.55, 0.60, -0.35, R_H2 + 0.62, R_Z0 + 0.62);
  b.box('rwCon', 0.78, 0.14, 0.72, -0.35, R_H2 + 1.42, R_Z0 + 0.62);
  b.box('rwBrick', 0.30, 0.16, 0.26, -0.30, R_H2 + 1.52, R_Z0 + 0.55, 0, 0.4, 0.10);
  for (let i = 0; i < 3; i++) {
    rwRebar(b, -0.35 + (i - 1) * 0.20, R_H2 + 1.46, R_Z0 + 0.62,
      (rwR(i * 3.7) - 0.5) * 0.4, 0.9, (rwR(i * 5.9) - 0.5) * 0.4, 0.26, 0.026);
  }

  /* 左墙：顶边一路向前塌成斜口 */
  rwWall(b, 'rwCon', 'z', XL, R_Z0, R_Z1, R_FL, R_H2, [
    [-2.95, -1.55, 1.15, 2.35],
    [1.35, 2.75, 1.15, 2.35],
    [-3.45, -2.05, 4.15, 5.40],
    /* 前段的大窗：这面墙太长，少一个洞就是一整片光板 */
    [3.15, 4.20, 1.30, 3.05]
  ], { amp: 0.88, slope: 2.55, dir: 1, seed: 17 });

  /* 右墙：只剩后半截，门洞一个 */
  rwWall(b, 'rwCon', 'z', XR, R_Z0, -0.55, R_FL, 4.02, [
    [-3.62, -2.28, R_FL, 2.55]
  ], { amp: 0.85, slope: 1.35, dir: 1, seed: 23 });

  /* 前墙：只剩左段矮墙，右段整片垮塌 */
  rwWall(b, 'rwCon', 'x', ZF, R_X0, -2.55, R_FL, 1.95, [],
    { amp: 0.60, slope: 0.55, dir: 1, seed: 29 });

  /* 三处自由端补「破口块」：竖直切口太齐，一眼就是模型 */
  const chunks = [
    [XR + 0.05, 1.55, -0.62, 0.55, 0.90, 0.42, 0.30],
    [XR - 0.10, 0.55, -0.72, 0.40, 0.62, 0.36, -0.22],
    [-2.60, 1.35, ZF + 0.02, 0.62, 0.80, 0.46, 0.20],
    [-3.15, 0.50, ZF - 0.06, 0.46, 0.55, 0.40, -0.26],
    [-5.55, 4.35, -1.95, 0.42, 0.62, 0.38, 0.18],
    [-4.95, 5.55, -1.92, 0.34, 0.48, 0.32, -0.20]
  ];
  for (let i = 0; i < chunks.length; i++) {
    const q = chunks[i];
    b.box(i % 2 ? 'rwConD' : 'rwCon', q[3], q[4], q[5], q[0], q[1], q[2],
      q[6], rwR(i * 3.7) * 1.2, q[6] * 0.7);
  }

  /* 窗洞里的旧木框：只留两樘，其余全空，空才像废墟 */
  const frame = function (x, y, z, w, h) {
    const g = new T.Group();
    const fb = new Builder();
    fb.box('rwWoodD', w, 0.09, 0.11, 0, h * 0.5, 0);
    fb.box('rwWoodD', w, 0.09, 0.11, 0, -h * 0.5, 0);
    fb.box('rwWood', 0.09, h, 0.11, -w * 0.5, 0, 0);
    fb.box('rwWood', 0.09, h, 0.11, w * 0.5, 0, 0);
    fb.box('rwWood', 0.06, h, 0.09, 0, 0, 0);
    fb.box('rwWood', w, 0.06, 0.09, 0, h * 0.12, 0);
    fb.build(g);
    g.position.set(x, y, z);
    scene.add(g);
  };
  frame(-3.80, 1.75, ZB + 0.10, 1.34, 1.10);
  frame(-0.90, 4.78, ZB + 0.10, 1.24, 1.18);

  /* 二层楼板：L 形，边缘参差，树从缺口里穿出去 */
  rwSlab(b, 'rwConD', [
    [R_X0, R_Z0], [1.95, R_Z0], [1.95, -3.28], [0.32, -3.20],
    [0.36, -1.92], [-1.86, -1.98], [-1.90, -1.62], [-3.72, -1.70],
    [-3.68, -2.02], [R_X0, -1.94]
  ], R_SB, R_SL);

  /* 板底一道深色梁，让厚度读得出来 */
  b.box('rwConD', 7.4, 0.16, 0.22, -2.05, R_SB - 0.06, -1.86);

  /* 斜插进瓦砾的大板：塌落的瞬间被冻住 */
  b.box('rwConD', 3.95, 0.22, 2.85, 2.78, 2.34, -0.52, 0, 0.20, -0.62);
  b.box('rwCon', 1.30, 0.22, 1.10, 3.86, 1.36, 0.72, 0, 0.55, -0.52);
  b.box('rwCon', 1.05, 0.20, 0.90, 1.72, 2.96, -1.02, 0, -0.30, -0.40);

  /* 断柱：柱头炸开，钢筋朝上 */
  b.box('rwCon', 0.38, 2.62, 0.38, 2.42, R_FL + 1.31, -1.42);
  b.box('rwCon', 0.42, 0.20, 0.34, 2.44, R_FL + 2.66, -1.42, 0, 0.30, 0.14);
  for (let i = 0; i < 5; i++) {
    rwRebar(b, 2.42 + (rwR(i * 3.1) - 0.5) * 0.24, R_FL + 2.70, -1.42 + (rwR(i * 5.7) - 0.5) * 0.24,
      (rwR(i * 7.3) - 0.5) * 0.5, 1, (rwR(i * 9.1) - 0.5) * 0.5, 0.34 + rwR(i * 3.9) * 0.36, 0.036);
  }

  /* 断口钢筋：前墙、右墙、楼板缺口、斜板边缘 */
  const rebarRun = function (x, y, z, n, dx, dz, seed) {
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) - 0.5 : 0;
      rwRebar(b, x + dz * t * 1.15, y, z + dx * t * 1.15,
        (rwR(seed + i * 3.3) - 0.5) * 0.75, 0.85 + rwR(seed + i * 5.1) * 0.5,
        (rwR(seed + i * 7.7) - 0.5) * 0.75, 0.30 + rwR(seed + i * 9.3) * 0.34, 0.034);
    }
  };
  rebarRun(-3.05, 2.52, ZF, 5, 1, 0, 41);
  rebarRun(XR, 3.95, -1.35, 4, 0, 1, 47);
  rebarRun(1.95, R_SL, -2.60, 5, 0, 1, 53);
  rebarRun(0.34, R_SL, -2.55, 4, 0, 1, 59);
  rebarRun(3.55, 2.42, 0.20, 4, 1, 0, 61);

  /* 墙面水痕：竖向深色条，长度不一，别做均匀分布。
     ★ 要画在能看见的那一面（内表面），画在外墙上等于没画。 */
  for (let i = 0; i < 11; i++) {
    const x = R_X0 + 0.55 + rwR(i * 3.3 + 1) * (R_X1 - R_X0 - 1.1);
    const y0 = R_FL + 0.55 + rwR(i * 5.1 + 2) * 2.9;
    b.box(i % 3 ? 'rwMoss' : 'rwConD', 0.11 + rwR(i * 7.7) * 0.12,
      0.55 + rwR(i * 9.1) * 1.5, 0.020, x, y0, R_Z0 + R_T + 0.008);
  }
  for (let i = 0; i < 6; i++) {
    const z = R_Z0 + 0.55 + rwR(i * 4.1 + 3) * (R_Z1 - R_Z0 - 1.1);
    b.box(i % 2 ? 'rwMoss' : 'rwConD', 0.020, 0.70 + rwR(i * 6.3) * 1.4,
      0.10 + rwR(i * 8.1) * 0.10, R_X0 + R_T + 0.008,
      R_FL + 0.70 + rwR(i * 9.7) * 2.2, z);
  }

  /* 瓦砾堆：前排与右前角最密，室内只留零散几块 */
  const rub = [
    [4.35, 3.55, 1.05, 0.62, 0.86], [3.35, 2.35, 0.78, 0.44, 0.66],
    [2.15, 3.45, 0.92, 0.50, 0.74], [4.62, 2.05, 0.66, 0.38, 0.58],
    [3.90, 1.20, 0.55, 0.30, 0.48], [1.55, 1.85, 0.64, 0.34, 0.52],
    [0.65, 3.35, 0.72, 0.40, 0.60], [-1.35, 3.62, 0.58, 0.32, 0.50],
    [-2.35, 3.10, 0.48, 0.26, 0.42], [-4.35, 3.85, 0.62, 0.36, 0.54],
    [-3.15, 4.02, 0.44, 0.24, 0.38], [4.82, 4.05, 0.74, 0.42, 0.62],
    [2.95, 0.45, 0.40, 0.24, 0.34], [1.20, -0.55, 0.36, 0.22, 0.30],
    [-1.55, 0.95, 0.42, 0.24, 0.36], [-4.85, 1.35, 0.38, 0.22, 0.32],
    [0.15, 2.65, 0.30, 0.18, 0.26], [3.65, -1.75, 0.34, 0.20, 0.30]
  ];
  for (let i = 0; i < rub.length; i++) {
    const q = rub[i];
    b.box(i % 6 === 3 ? 'rwBrick' : (i % 3 === 0 ? 'rwRubble' : 'rwRubbleD'),
      q[2], q[3], q[4], q[0], R_FL + q[3] * 0.42, q[1],
      rwR(i * 3.1) * 0.5, rwR(i * 5.3) * 3.14, rwR(i * 7.7) * 0.5);
  }
  for (let i = 0; i < 30; i++) {
    const r = 0.10 + rwR(i * 3.3) * 0.16;
    b.box(i % 7 === 0 ? 'rwBrick' : 'rwRubbleD', r * 1.6, r, r * 1.3,
      3.15 + (rwR(i * 5.1) - 0.5) * 3.4, R_FL + r * 0.4,
      1.35 + (rwR(i * 7.3) - 0.5) * 3.0,
      0, rwR(i * 9.7) * 3.14, 0);
  }

  /* 挂在门框上的铁皮门：只剩一个合页 */
  b.box('rwRust', 0.07, 2.26, 1.24, 4.66, R_FL + 1.16, -3.06, 0, 0.92, 0.06);
  b.box('rwRust', 0.05, 0.07, 1.10, 4.62, R_FL + 1.78, -3.06, 0, 0.92, 0);
  b.box('rwRust', 0.05, 0.07, 1.10, 4.62, R_FL + 0.58, -3.06, 0, 0.92, 0);

  /* 靠左墙的楼梯：走到一半就断了，是这栋房子最刺眼的一处。
     ★ 台阶不能一级用一个 box 拼——每块盒子都有自己的外壳，
       十几次叠加就是满梯子砖缝。整段做成一个锯齿挤出，只留一圈轮廓。 */
  const ST0 = 1.78, STD = 0.285, STH = 0.255, STN = 11, STW = 1.12;
  const st = new T.Shape();
  st.moveTo(ST0, R_FL);
  let sz = ST0, sy = R_FL;
  for (let i = 0; i < STN; i++) {
    sz -= STD;
    st.lineTo(sz, sy);
    sy += STH;
    st.lineTo(sz, sy);
  }
  /* 断口：顶上一级碎掉，边线不再是干净的台阶 */
  st.lineTo(sz + 0.10, sy - 0.16);
  st.lineTo(sz - 0.06, sy - 0.05);
  st.lineTo(sz - 0.02, sy - 0.34);
  st.lineTo(sz - 0.14, R_FL);
  st.closePath();
  const stg = new T.ExtrudeGeometry(st, {
    depth: STW, bevelEnabled: false, curveSegments: 1, steps: 1
  });
  stg.rotateY(-Math.PI * 0.5);
  /* ★ rotateY(-90°) 会把挤出方向翻到 -x，只平移一个墙厚会整段跑到墙外面去 */
  stg.translate(R_X0 + R_T + STW, 0, 0);
  b.add('rwCon', stg);

  /* 梯段斜梁：藏在踏步下面的那道混凝土板，让楼梯不是贴墙的积木 */
  b.box('rwConD', 0.20, 0.24, 3.60, R_X0 + R_T + 0.16, R_FL + 1.30, 0.10,
    -0.72, 0, 0);

  /* 断口钢筋：三级没了，钢筋还伸在原处 */
  for (let i = 0; i < 4; i++) {
    rwRebar(b, R_X0 + R_T + 0.18 + i * 0.26, R_FL + 2.92, -1.10,
      0.10, 0.92, -0.16, 0.30 + rwR(i * 3.1) * 0.26, 0.030);
  }

  /* 内墙残留的抹灰：不规则多边形，边缘是崩开的，不是四个角一刀切 */
  rwPlaster(b, 'rwPatchL', -3.25, 2.62, R_Z0 + R_T + 0.014, 2.15, 1.75, 3.3, 'z');
  rwPlaster(b, 'rwPatchL', -1.02, 1.42, R_Z0 + R_T + 0.014, 1.20, 1.00, 7.9, 'z');
  rwPlaster(b, 'rwPatchD', -4.50, 4.72, R_Z0 + R_T + 0.014, 1.00, 0.92, 11.1, 'z');
  rwPlaster(b, 'rwPatchL', 0.72, 3.02, R_Z0 + R_T + 0.014, 0.86, 1.30, 15.7, 'z');
  rwPlaster(b, 'rwPatchD', R_X0 + R_T + 0.014, 2.35, 0.55, 1.45, 1.60, 19.3, 'x');
  rwPlaster(b, 'rwPatchL', R_X0 + R_T + 0.014, 1.02, 2.32, 0.90, 1.05, 23.1, 'x');

  /* 屋里那把没搬走的椅子 */
  const CH = { x: -3.35, z: 1.42, ry: 0.62 };
  const cos = Math.cos(CH.ry), sin = Math.sin(CH.ry);
  const cp = function (lx, lz) { return [CH.x + lx * cos + lz * sin, CH.z - lx * sin + lz * cos]; };
  let p;
  for (let i = 0; i < 4; i++) {
    p = cp(i < 2 ? -0.22 : 0.22, i % 2 ? -0.20 : 0.20);
    b.box('rwWoodD', 0.055, 0.68, 0.055, p[0], R_FL + 0.34, p[1], 0, CH.ry, 0);
  }
  p = cp(0, 0);
  b.box('rwWood', 0.52, 0.06, 0.46, p[0], R_FL + 0.70, p[1], 0, CH.ry, 0);
  p = cp(0, -0.22);
  b.box('rwWood', 0.50, 0.42, 0.055, p[0], R_FL + 0.98, p[1], 0, CH.ry, 0);
  b.box('rwWood', 0.46, 0.05, 0.05, p[0], R_FL + 1.16, p[1], 0, CH.ry, 0);
}

/* ------------------------------------------------------------ 树冠工具 */
/* 三维正弦噪声：只依赖坐标，所以非索引几何的重复顶点会得到同样位移，不会裂开 */
function rwNoise(x, y, z, seed) {
  return Math.sin(x * 2.9 + seed) * 0.34
    + Math.cos(y * 3.4 + seed * 1.7) * 0.33
    + Math.sin(z * 3.1 + seed * 2.3) * 0.33;
}

/* 一整团被噪声撑开的叶体：一个球，一圈轮廓，不会变成「一堆绿球」 */
function rwBlob(b, key, c, r, seed, wob) {
  const g = new T.IcosahedronGeometry(1, 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = 1 + wob * rwNoise(x, y, z, seed);
    pos.setXYZ(i, x * r[0] * k, y * r[1] * k, z * r[2] * k);
  }
  g.computeVertexNormals();
  g.translate(c[0], c[1], c[2]);
  b.add(key, g);
}

/* 一片压扁的叶簇：法线贴着球面走。
   ★ 叶簇如果一律水平摆放，俯视下全是同样亮度的椭圆，就像贴上去的荷叶；
     让它的法线沿球面径向，顶面被正面看到、侧面近乎侧视，明暗才有变化。 */
function rwPad(b, key, r, x, y, z, sy, nx, ny, nz, tw) {
  const g = new T.SphereGeometry(r, 10, 7);
  g.scale(1.42, sy, 1.22);
  const n = new T.Vector3(nx, ny, nz).normalize();
  const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), n);
  if (tw) q.multiply(new T.Quaternion().setFromAxisAngle(n, tw));
  const m = new T.Matrix4().makeRotationFromQuaternion(q);
  m.setPosition(x, y, z);
  g.applyMatrix4(m);
  b.add(key, g);
}

/* 墙上一块崩开的抹灰：不规则多边形挤出，贴在内墙面上。
   axis 'z' = 朝 +z 的墙面（shape 用 x/y）；axis 'x' = 朝 +x 的墙面（shape 用 z/y） */
function rwPlaster(b, key, cx, cy, cz, w, h, seed, axis) {
  const sh = new T.Shape();
  const n = 15;
  for (let i = 0; i < n; i++) {
    const t = i / n * 6.283;
    const k = 0.70 + rwR(seed + i * 2.71) * 0.38;
    const u = Math.cos(t) * w * 0.5 * k;
    const v = Math.sin(t) * h * 0.5 * k;
    const a = axis === 'x' ? cz + u : cx + u;
    if (i === 0) sh.moveTo(a, cy + v); else sh.lineTo(a, cy + v);
  }
  sh.closePath();
  const g = new T.ExtrudeGeometry(sh, {
    depth: 0.022, bevelEnabled: false, curveSegments: 1, steps: 1
  });
  if (axis === 'x') {
    g.rotateY(-Math.PI * 0.5);
    g.translate(cx + 0.022, 0, 0);
  } else {
    g.translate(0, 0, cz);
  }
  b.add(key, g);
}

/* ------------------------------------------------------------ 树与藤 */
function rwTree(b) {
  const TX = 1.14, TZ = -2.62;

  /* 主干：三段，带一点弯；根部放大做出板根 */
  b.to('rwBark', 0.72, TX, R_FL - 0.05, TZ, TX - 0.12, R_FL + 1.55, TZ - 0.06, 10);
  b.to('rwBark', 0.50, TX - 0.14, R_FL + 1.48, TZ - 0.07, TX + 0.02, R_FL + 3.15, TZ + 0.02, 9);
  b.to('rwBark', 0.37, TX + 0.02, R_FL + 3.08, TZ + 0.02, TX + 0.16, R_FL + 4.85, TZ - 0.14, 8);
  b.to('rwBarkD', 0.28, TX + 0.14, R_FL + 4.80, TZ - 0.13, TX + 0.24, R_FL + 5.95, TZ - 0.28, 7);

  /* 主枝：从 5 米处分叉，朝四周撑开 */
  const fork = [TX + 0.22, R_FL + 5.80, TZ - 0.24];
  const tips = [
    [-2.90, 7.85, -2.10, 0.25], [2.95, 8.10, -0.30, 0.27],
    [0.55, 8.65, -3.30, 0.23], [-1.10, 7.55, 1.85, 0.21],
    [3.55, 7.15, -2.35, 0.19], [-3.45, 7.05, 0.55, 0.18]
  ];
  for (let i = 0; i < tips.length; i++) {
    const t = tips[i];
    const mx = (fork[0] + t[0]) * 0.5 + (rwR(i * 3.1) - 0.5) * 0.4;
    const my = (fork[1] + t[1]) * 0.5 + 0.35;
    const mz = (fork[2] + t[2]) * 0.5 + (rwR(i * 5.3) - 0.5) * 0.4;
    b.to('rwBark', t[3], fork[0], fork[1], fork[2], mx, my, mz, 7);
    b.to('rwBarkD', t[3] * 0.62, mx, my, mz, t[0], t[1], t[2], 6);
  }

  /* 树冠：一整块被噪声撑开的叶团，而不是几十个球。
     ★ toon 材质会给每个球描一圈黑边，几十个球叠起来就是「一堆绿球」。
       这里只留 4 个位移球做体积（轮廓只有 4 圈），表面再撒扁平叶簇打碎明暗。 */
  const CC = [0.18, 8.32, -1.22], CR = [3.80, 1.62, 3.00];
  rwBlob(b, 'rwLeaf1', CC, CR, 2.7, 0.185);

  /* 三块副团：让树冠不是一颗对称的蛋 */
  rwBlob(b, 'rwLeaf1', [CC[0] - 2.75, CC[1] - 0.72, CC[2] - 0.28], [1.42, 1.04, 1.32], 5.3, 0.24);
  rwBlob(b, 'rwLeaf1', [CC[0] + 2.92, CC[1] - 0.58, CC[2] + 0.26], [1.30, 0.98, 1.22], 9.1, 0.24);
  rwBlob(b, 'rwLeaf1', [CC[0] - 0.55, CC[1] - 0.95, CC[2] - 1.82], [1.48, 0.88, 1.08], 13.7, 0.22);

  /* 叶簇：贴在球面上，扁平、随机朝向，把整块的明暗切碎 */
  const clumps = [];
  for (let i = 0; i < 86; i++) {
    const a = rwR(i * 1.73 + 3) * 6.283;
    const v = Math.acos(2 * rwR(i * 2.91 + 5) - 1);
    const nx = Math.sin(v) * Math.cos(a), ny = Math.cos(v), nz = Math.sin(v) * Math.sin(a);
    const k = 1 + 0.185 * rwNoise(nx, ny, nz, 2.7);
    const rr = k * (1.00 + rwR(i * 5.31 + 1) * 0.05);
    const x = CC[0] + nx * CR[0] * rr;
    const y = CC[1] + ny * CR[1] * rr;
    const z = CC[2] + nz * CR[2] * rr;
    const up = (y - CC[1]) / CR[1];
    const key = up > 0.36 ? 'rwLeaf3' : (up > -0.24 ? 'rwLeaf1T' : 'rwLeaf2');
    const r = 0.175 + rwR(i * 7.71 + 2) * 0.185;
    rwPad(b, key, r, x, y, z, 0.30,
      nx + (rwR(i * 11.1) - 0.5) * 1.0,
      ny + (rwR(i * 13.3) - 0.5) * 1.0,
      nz + (rwR(i * 17.7) - 0.5) * 1.0, rwR(i * 3.9) * 3.14);
    clumps.push([x, y, z, r]);
  }

  /* 冠底一圈下垂的小团：树冠下沿不能是干净的球面 */
  for (let i = 0; i < 26; i++) {
    const a = rwR(i * 3.37 + 7) * 6.283;
    const rr = 0.80 + rwR(i * 5.11 + 3) * 0.30;
    const x = CC[0] + Math.cos(a) * CR[0] * rr;
    const z = CC[2] + Math.sin(a) * CR[2] * rr;
    const r = 0.18 + rwR(i * 9.13) * 0.20;
    rwPad(b, i % 2 ? 'rwLeaf2' : 'rwLeaf1T', r, x, 7.06 + rwR(i * 7.7) * 0.56, z,
      0.40, Math.cos(a), -0.55, Math.sin(a), rwR(i * 5.5) * 3.14);
    clumps.push([x, 7.42, z, r]);
  }

  /* 露出冠外的枝梢：让树不是「一根杆顶一团菜」 */
  const tips2 = [
    [-4.95, 8.35, -1.25, 0.13], [4.75, 8.45, -0.65, 0.12],
    [-1.55, 7.15, 2.25, 0.11], [2.65, 7.20, 1.45, 0.10],
    [1.35, 10.15, -3.05, 0.10]
  ];
  for (let i = 0; i < tips2.length; i++) {
    const q = tips2[i];
    b.to('rwBarkD', q[3], 0.4, 8.55, -1.2,
      (0.4 + q[0]) * 0.55, 8.45 + (q[1] - 8.45) * 0.45, (-1.2 + q[2]) * 0.55, 5);
    b.to('rwBarkD', q[3] * 0.8, (0.4 + q[0]) * 0.55, 8.45 + (q[1] - 8.45) * 0.45, (-1.2 + q[2]) * 0.55,
      q[0], q[1], q[2], 4);
    b.sph('rwLeaf3', 0.40 + rwR(i * 3.7) * 0.18, q[0], q[1] + 0.10, q[2], 1.3, 0.55, 1.2);
  }

  /* 花：成簇挂在树冠外缘，别撒成波点 */
  for (let i = 0; i < 24; i++) {
    const q = clumps[Math.floor(rwR(i * 2.3 + 1) * clumps.length) % clumps.length];
    for (let k = 0; k < 4; k++) {
      const a = rwR(i * 5.1 + k * 2.7) * 6.283;
      const e = (rwR(i * 7.3 + k * 3.1) - 0.25) * 1.4;
      b.sph(k % 2 ? 'rwBlossom' : 'rwBlossomD', 0.075 + rwR(i * 9.7 + k) * 0.065,
        q[0] + Math.cos(a) * Math.cos(e) * q[3] * 1.25,
        q[1] + Math.sin(e) * q[3] * 0.62,
        q[2] + Math.sin(a) * Math.cos(e) * q[3] * 1.15, 1.25, 0.70, 1.10);
    }
  }

  /* 气生根 / 板根：从树脚爬上瓦砾与楼板 */
  const roots = [
    [-2.55, 0.20, -1.60], [-3.85, 0.16, -3.25], [0.10, 0.22, -0.75],
    [3.05, 0.18, -3.45], [2.75, 0.20, -0.05], [-0.35, 0.18, 1.85],
    [3.45, 0.16, -1.95]
  ];
  for (let i = 0; i < roots.length; i++) {
    const q = roots[i];
    b.to('rwBark', 0.155, TX, R_FL + 0.18, TZ,
      (TX + q[0]) * 0.5, R_FL + 0.10, (TZ + q[1]) * 0.5, 6);
    b.to('rwBarkD', 0.075, (TX + q[0]) * 0.5, R_FL + 0.10, (TZ + q[1]) * 0.5,
      q[0], q[1], q[2], 5);
  }
  b.to('rwBark', 0.14, TX, R_FL + 3.20, TZ, -0.90, R_SL + 0.06, -2.30, 6);
  b.to('rwBarkD', 0.07, -0.90, R_SL + 0.06, -2.30, -3.55, R_SL + 0.05, -2.55, 5);

  /* 楼板上长起来的小树：生命不止一棵 */
  b.to('rwBarkD', 0.10, -4.35, R_SL, -3.85, -4.55, R_SL + 1.55, -3.75, 5);
  b.to('rwBarkD', 0.06, -4.55, R_SL + 1.48, -3.75, -4.72, R_SL + 2.35, -3.55, 5);
  b.sph('rwLeaf1', 0.72, -4.62, R_SL + 2.45, -3.62, 1.15, 0.90, 1.05);
  b.sph('rwLeaf3', 0.52, -4.28, R_SL + 2.72, -3.82, 1.10, 0.85, 1.00);
  b.sph('rwLeaf2', 0.44, -4.85, R_SL + 2.25, -3.42, 1.10, 0.80, 1.00);

  /* 背墙上的爬山虎：两列，一列爬到窗洞边 */
  const ivy = function (x0, z0, top, seed, dr) {
    let px = x0, py = R_FL + 0.10, pz = z0;
    for (let i = 1; i <= 9; i++) {
      const t = i / 9;
      const nx = x0 + Math.sin(seed + t * 5.2) * 0.30 + dr * t * 0.55;
      const ny = R_FL + 0.10 + top * t;
      const nz = z0 + Math.cos(seed + t * 4.1) * 0.06;
      b.to('rwVine', 0.030, px, py, pz, nx, ny, nz, 4);
      for (let k = 0; k < 2; k++) {
        b.sph(k ? 'rwLeaf2' : 'rwLeaf3', 0.13 + rwR(seed + i + k) * 0.06,
          nx + (rwR(seed + i * 2.1 + k) - 0.5) * 0.46,
          ny + (rwR(seed + i * 4.3 + k) - 0.5) * 0.24,
          nz + 0.08, 1.5, 0.55, 1.0);
      }
      px = nx; py = ny; pz = nz;
    }
  };
  ivy(-2.15, R_Z0 + 0.06, 4.55, 2.3, 1);
  ivy(3.30, R_Z0 + 0.06, 3.60, 5.1, -1);

  /* 楼板边缘垂下来的藤帘 */
  for (let i = 0; i < 11; i++) {
    const x = -5.35 + i * 0.68;
    rwVine(b, x, R_SL - 0.04, -1.95 + (rwR(i * 3.3) - 0.5) * 0.16,
      1.10 + rwR(i * 5.7) * 1.55, i * 2.1 + 7, i % 2 ? 1 : -1);
  }
  /* 斜板上也挂两条，把「塌」和「生」缝在一起 */
  rwVine(b, 2.55, 2.72, -0.12, 1.35, 13.7, 1);
  rwVine(b, 3.35, 1.48, 0.62, 1.05, 19.3, -1);
}

/* ------------------------------------------------------------ 草花 */
function rwFlora(b) {
  /* 草：废墟里比草地上更密，裂缝里全是 */
  for (let i = 0; i < 210; i++) {
    const inside = i < 110;
    let x, z;
    if (inside) {
      x = R_X0 + 0.25 + rwR(i * 3.1 + 2) * (R_X1 - R_X0 - 0.5);
      z = R_Z0 + 0.25 + rwR(i * 5.3 + 4) * (R_Z1 - R_Z0 - 0.5);
    } else {
      x = -9.9 + rwR(i * 7.1 + 1) * 19.8;
      z = -7.9 + rwR(i * 9.3 + 5) * 15.6;
    }
    if (x > 1.0 && x < 4.6 && z > 0.9 && z < 3.6) continue;   // 让开积水
    rwTuft(b, x, z, 0.20 + rwR(i * 11.3) * 0.34, i * 1.7 + 11);
  }

  /* 墙根的荒草：更高更密，压住墙与地的硬交线 */
  for (let i = 0; i < 40; i++) {
    const back = i < 22;
    const t = rwR(i * 3.9 + 1);
    const x = back ? R_X0 + 0.3 + t * (R_X1 - R_X0 - 0.6) : R_X0 + 0.25;
    const z = back ? (R_Z0 + 0.22) : R_Z0 + 0.3 + t * (R_Z1 - R_Z0 - 0.6);
    rwTuft(b, x + (rwR(i * 5.1) - 0.5) * 0.34, z + (rwR(i * 7.3) - 0.5) * 0.30,
      0.32 + rwR(i * 9.7) * 0.28, i * 2.3 + 31);
  }

  /* 野花：白 / 黄 / 粉 / 紫，四色就够，再多就成花毯。
     成簇长，三到六朵一窝，比均匀撒点自然。 */
  const fk = ['rwFlowerW', 'rwFlowerY', 'rwFlowerP', 'rwFlowerV'];
  for (let i = 0; i < 30; i++) {
    const q = i % 4;
    let cx, cz;
    if (i < 20) {
      cx = R_X0 + 0.6 + rwR(i * 3.7 + 3) * (R_X1 - R_X0 - 1.2);
      cz = R_Z0 + 0.6 + rwR(i * 5.9 + 6) * (R_Z1 - R_Z0 - 1.2);
    } else {
      cx = -8.7 + rwR(i * 7.9 + 2) * 17.4;
      cz = -6.9 + rwR(i * 9.7 + 8) * 13.4;
    }
    if (cx > 0.9 && cx < 4.7 && cz > 0.8 && cz < 3.7) continue;
    const n = 3 + Math.floor(rwR(i * 11.1) * 4);
    for (let k = 0; k < n; k++) {
      const a = rwR(i * 13.3 + k * 2.7) * 6.283;
      const r = 0.18 + rwR(i * 15.1 + k * 4.1) * 0.46;
      rwFlower(b, cx + Math.cos(a) * r, cz + Math.sin(a) * r,
        0.16 + rwR(i * 17.3 + k) * 0.20, fk[(q + k) % 4], i * 2.3 + k * 5.7 + 3);
    }
  }

  /* 枯草斑：草地不能是一种绿到底，几块被晒黄的补丁就有了季节 */
  for (let i = 0; i < 9; i++) {
    const cx = -7.0 + rwR(i * 3.1 + 6) * 14.0;
    const cz = -5.4 + rwR(i * 5.7 + 2) * 10.8;
    const rx = 0.85 + rwR(i * 7.3) * 1.25, rz = 0.62 + rwR(i * 9.1) * 0.85;
    const pts = [];
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * 6.283;
      const j = 0.68 + rwR(i * 11.7 + k * 3.1) * 0.52;
      pts.push([cx + Math.cos(a) * rx * j, cz + Math.sin(a) * rz * j]);
    }
    rwSlab(b, i % 4 === 3 ? 'rwGrassD' : 'rwGrassY', pts, RW_GY, RW_GY + 0.010);
  }

  /* 落叶：树底下最密，往外越稀，一片片小扁片，不描边 */
  for (let i = 0; i < 110; i++) {
    const a = rwR(i * 1.7 + 2) * 6.283;
    const rr = Math.pow(rwR(i * 2.9 + 5), 0.55) * 7.6;
    const x = 0.3 + Math.cos(a) * rr;
    const z = -1.4 + Math.sin(a) * rr * 0.9;
    if (x > R_X0 && x < R_X1 && z > R_Z0 && z < R_Z1) continue;
    b.box(i % 5 === 0 ? 'rwBrick' : (i % 3 ? 'rwLitter' : 'rwLitterD'),
      0.10 + rwR(i * 3.3) * 0.10, 0.012, 0.06 + rwR(i * 5.1) * 0.07,
      x, RW_GY + 0.006, z, 0, rwR(i * 7.7) * 3.14, 0);
  }

  /* 碎石：被脚步带到草地里的混凝土渣 */
  for (let i = 0; i < 54; i++) {
    const a = rwR(i * 2.3 + 7) * 6.283;
    const rr = 3.2 + rwR(i * 4.1 + 3) * 6.2;
    const r = 0.05 + rwR(i * 6.7) * 0.12;
    b.box(i % 4 ? 'rwRubbleD' : 'rwStone', r * 1.7, r, r * 1.4,
      Math.cos(a) * rr, RW_GY + r * 0.4, Math.sin(a) * rr * 0.82,
      0, rwR(i * 8.9) * 3.14, 0);
  }

  /* 倒木：横在后景草地上，给左半边一点重量 */
  b.to('rwBarkD', 0.19, -7.60, RW_GY + 0.16, -5.55, -4.55, RW_GY + 0.13, -6.75, 7);
  b.to('rwBarkD', 0.14, -4.75, RW_GY + 0.13, -6.70, -3.75, RW_GY + 0.10, -6.20, 6);
  b.box('rwMoss', 1.30, 0.04, 0.34, -6.20, RW_GY + 0.30, -6.02, 0, 0.32, 0);
  b.box('rwMoss', 0.70, 0.035, 0.28, -4.95, RW_GY + 0.26, -6.45, 0, 0.12, 0);

  /* 高草墩：成簇，不撒点 */
  const drift = [[-8.30, 5.40], [-6.60, 6.85], [-3.10, 6.95], [0.60, 7.30],
    [3.30, 6.55], [7.60, 5.90], [8.55, 0.35], [7.95, -3.20],
    [-8.60, -0.90], [-5.30, -6.90], [1.90, -7.20], [5.80, -6.60]];
  for (let i = 0; i < drift.length; i++) {
    for (let k = 0; k < 7; k++) {
      const a = rwR(i * 3.7 + k * 2.3) * 6.283;
      const rr = 0.20 + rwR(i * 5.1 + k * 4.1) * 0.85;
      rwTuft(b, drift[i][0] + Math.cos(a) * rr, drift[i][1] + Math.sin(a) * rr,
        0.34 + rwR(i * 9.7 + k) * 0.30, i * 3.3 + k * 7.1 + 5);
    }
  }

  /* 地坪上的泥斑：从门口与塌口带进来的土，把整片灰地打散 */
  for (let i = 0; i < 10; i++) {
    const cx = R_X0 + 0.6 + rwR(i * 3.7 + 1) * (R_X1 - R_X0 - 1.2);
    const cz = R_Z0 + 0.6 + rwR(i * 5.3 + 2) * (R_Z1 - R_Z0 - 1.2);
    const rx = 0.45 + rwR(i * 7.1) * 0.95, rz = 0.32 + rwR(i * 9.3) * 0.62;
    const pts = [];
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * 6.283;
      const j = 0.66 + rwR(i * 11.1 + k * 2.9) * 0.54;
      pts.push([cx + Math.cos(a) * rx * j, cz + Math.sin(a) * rz * j]);
    }
    rwSlab(b, i % 3 ? 'rwEarthD' : 'rwEarth', pts, R_FL + 0.040, R_FL + 0.052);
  }

  /* 地坪裂缝：细长折线，只画几道，多了就像地砖缝 */
  for (let i = 0; i < 7; i++) {
    let px = R_X0 + 0.8 + rwR(i * 3.1 + 4) * (R_X1 - R_X0 - 1.6);
    let pz = R_Z0 + 0.8 + rwR(i * 5.7 + 5) * (R_Z1 - R_Z0 - 1.6);
    for (let k = 0; k < 5; k++) {
      const nx = px + (rwR(i * 7.3 + k * 3.1) - 0.5) * 1.15;
      const nz = pz + (rwR(i * 9.1 + k * 5.3) - 0.5) * 1.15;
      b.box('rwConD', Math.abs(nx - px) + 0.035, 0.012, Math.abs(nz - pz) + 0.035,
        (px + nx) * 0.5, R_FL + 0.046, (pz + nz) * 0.5, 0, 0, 0);
      px = nx; pz = nz;
    }
  }

  /* 苔藓：墙根、断口、背阴面 */
  for (let i = 0; i < 26; i++) {
    const onWall = i < 14;
    if (onWall) {
      const x = R_X0 + 0.4 + rwR(i * 3.3) * (R_X1 - R_X0 - 0.8);
      const y = R_FL + 0.25 + rwR(i * 5.1) * 1.9;
      b.box(i % 3 ? 'rwMoss' : 'rwMossL', 0.36 + rwR(i * 7.7) * 0.62,
        0.24 + rwR(i * 9.1) * 0.36, 0.03, x, y, R_Z0 + R_T + 0.012);
    } else {
      /* 地面苔藓：不规则斑片，方片贴在土上像一块绿胶带 */
      const x = R_X0 + 0.5 + rwR(i * 3.9) * (R_X1 - R_X0 - 1.0);
      const z = -1.6 + rwR(i * 6.1) * (R_Z1 + 1.2);
      const r = 0.26 + rwR(i * 8.3) * 0.44;
      const pts = [];
      const m = 7;
      for (let k = 0; k < m; k++) {
        const a = k / m * 6.283;
        const j = 0.62 + rwR(i * 12.7 + k * 3.3) * 0.58;
        pts.push([x + Math.cos(a) * r * j, z + Math.sin(a) * r * 0.78 * j]);
      }
      rwSlab(b, i % 4 ? 'rwMoss' : 'rwMossL', pts, R_FL + 0.036, R_FL + 0.050);
    }
  }

  /* 院外的灌木：两丛压两侧，别挡主体 */
  /* 灌木：也用刻面叶团，几个光球叠在一起太像贴图里的绿化带 */
  const bush = function (x, z, s, seed) {
    rwBlob(b, 'rwBush', [x, RW_GY + s * 0.66, z], [s * 1.00, s * 0.78, s * 0.92], seed, 0.26);
    rwBlob(b, 'rwBushD', [x + s * 0.52, RW_GY + s * 0.44, z + s * 0.26],
      [s * 0.62, s * 0.55, s * 0.58], seed + 3.7, 0.30);
    rwBlob(b, 'rwBush', [x - s * 0.46, RW_GY + s * 0.40, z - s * 0.28],
      [s * 0.55, s * 0.50, s * 0.50], seed + 7.1, 0.30);
  };
  bush(-7.55, -3.35, 1.30, 3.3);
  bush(7.85, 4.45, 1.10, 7.7);
  bush(-8.30, 4.95, 0.85, 9.1);
  bush(6.20, -6.30, 0.95, 13.9);

  /* 远处两棵小树，给背景一点纵深 */
  const sapling = function (x, z, h, s, seed) {
    b.to('rwBark', 0.13 * s, x, RW_GY, z, x + 0.10, RW_GY + h, z - 0.08, 6);
    for (let i = 0; i < 4; i++) {
      const a = rwR(seed + i * 2.7) * 6.283;
      b.sph(i % 2 ? 'rwLeaf1' : 'rwLeaf2', (0.75 + rwR(seed + i * 3.9) * 0.5) * s,
        x + Math.cos(a) * 0.75 * s, RW_GY + h + (rwR(seed + i * 5.1) - 0.2) * 0.9 * s,
        z + Math.sin(a) * 0.75 * s, 1.1, 0.85, 1.05);
    }
  };
  sapling(-8.55, -5.75, 2.6, 1.0, 15.1);
  sapling(8.85, 1.35, 2.2, 0.86, 21.7);
}

/* ------------------------------------------------------------ 背景山 */
function rwHills(b) {
  const ridge = function (key, z, base, amp, ph, dep) {
    const sh = new T.Shape();
    sh.moveTo(-78, -8);
    for (let x = -78; x <= 78; x += 1.2) {
      const h = base + Math.sin(x * 0.046 + ph) * amp
        + Math.sin(x * 0.102 + ph * 1.7) * amp * 0.30
        + Math.sin(x * 0.027 + ph * 0.6) * amp * 0.55;
      sh.lineTo(x, h);
    }
    sh.lineTo(78, -8);
    sh.closePath();
    const g = new T.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: false, curveSegments: 1, steps: 1 });
    g.translate(0, 0, z);
    b.add(key, g);
  };
  /* ★ 山要退得够远才像远景，但也不能远到被雾吃掉。
     60~104 米、山脚沉到 -8 米，只留一层淡青色的地平线在房子背后。 */
  ridge('rwHill3', -104, 7.4, 2.1, 1.3, 0.5);
  ridge('rwHill2', -80, 5.6, 1.7, 3.1, 0.42);
  ridge('rwHill1', -60, 3.4, 1.2, 5.2, 0.36);
}

/* ------------------------------------------------------------ 墙根污渍 */
/* 一条从地面往上爬的潮气带：苔藓团、泥点、竖向流痕。
   直接给墙做整体污渍会把窗洞也糊住（洞是几何洞，贴图不认），
   所以只做窗台以下这一条，正好是潮气最重的位置。 */
const rwGrimeTex = canvasTex(512, 128, function (c, w, h) {
  c.clearRect(0, 0, w, h);
  /* 底部整体压深 */
  const g = c.createLinearGradient(0, h, 0, 0);
  g.addColorStop(0, 'rgba(58,66,50,0.60)');
  g.addColorStop(0.34, 'rgba(74,82,62,0.30)');
  g.addColorStop(0.66, 'rgba(92,100,78,0.10)');
  g.addColorStop(1, 'rgba(92,100,78,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  /* 苔藓团：底部密、越往上越稀 */
  for (let i = 0; i < 190; i++) {
    const x = rwR(i * 1.73 + 1) * w;
    const t = Math.pow(rwR(i * 2.91 + 5), 1.9);
    const y = h - t * h * 0.92;
    const r = 1.6 + rwR(i * 3.77 + 2) * 5.2;
    c.fillStyle = 'rgba(' + (44 + Math.floor(rwR(i * 5.1) * 34)) + ','
      + (62 + Math.floor(rwR(i * 7.3) * 40)) + ','
      + (40 + Math.floor(rwR(i * 9.7) * 26)) + ','
      + (0.30 + rwR(i * 11.3) * 0.45).toFixed(2) + ')';
    c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
  }
  /* 竖向流痕 */
  for (let i = 0; i < 34; i++) {
    const x = rwR(i * 13.1 + 3) * w;
    const hh = 20 + rwR(i * 15.7 + 4) * 70;
    c.fillStyle = 'rgba(62,64,52,' + (0.10 + rwR(i * 17.3) * 0.20).toFixed(2) + ')';
    c.fillRect(x, h - hh, 0.8 + rwR(i * 19.1) * 1.6, hh);
  }
});

function rwGrimeBand(x, y, z, w, h, ry) {
  const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshToonMaterial({
    map: rwGrimeTex, gradientMap: GRAD, transparent: true, opacity: 0.95,
    depthWrite: false, side: T.DoubleSide, color: 0xffffff
  }));
  m.position.set(x, y, z);
  m.rotation.y = ry || 0;
  m.renderOrder = 1;
  scene.add(m);
}

/* ------------------------------------------------------------ 室内明暗 */
/* ★ 混凝土墙如果整面一个亮度，无论加多少窗都还是「一块光板」。
   室内真正缺的是明暗关系：越靠近楼板越暗，墙角最暗，楼板下有一道投影。
   这里用两张带 alpha 的黑片补上，比再加一百个小盒子有效。 */
const rwShadeTex = canvasTex(8, 128, function (c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(24,30,26,0.52)');
  g.addColorStop(0.45, 'rgba(28,34,30,0.24)');
  g.addColorStop(1, 'rgba(30,36,32,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

function rwShade(x, y, z, w, h, ry, op) {
  const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({
    map: rwShadeTex, transparent: true, opacity: op === undefined ? 1 : op,
    depthWrite: false, fog: false, side: T.DoubleSide
  }));
  m.position.set(x, y, z);
  m.rotation.y = ry || 0;
  m.renderOrder = 1;
  scene.add(m);
}

/* ------------------------------------------------------------ 积水 */
const rwWaterTex = canvasTex(128, 128, function (c, w, h) {
  const g = c.createRadialGradient(w * 0.38, h * 0.32, 3, w * 0.50, h * 0.52, w * 0.64);
  g.addColorStop(0, 'rgba(226,243,236,1)');
  g.addColorStop(0.40, 'rgba(178,208,199,1)');
  g.addColorStop(0.76, 'rgba(128,162,155,1)');
  g.addColorStop(1, 'rgba(92,122,117,1)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

function rwPuddle(cx, cz, rx, rz, seed, op) {
  const pts = [];
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = i / n * 6.283;
    const k = 0.74 + rwR(seed + i * 2.7) * 0.40;
    pts.push([cx + Math.cos(a) * rx * k, cz + Math.sin(a) * rz * k]);
  }
  const mk = function (scale) {
    const sh = new T.Shape();
    const p0 = pts[0];
    sh.moveTo(cx + (p0[0] - cx) * scale, -(cz + (p0[1] - cz) * scale));
    for (let i = 1; i < n; i++) {
      const p = pts[i];
      sh.lineTo(cx + (p[0] - cx) * scale, -(cz + (p[1] - cz) * scale));
    }
    sh.closePath();
    return new T.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false, curveSegments: 1, steps: 1 });
  };

  /* 泥边：比水面大 7%，深褐一圈，水才不是「贴在地上的色块」 */
  const edge = new T.Mesh(mk(1.07), new T.MeshBasicMaterial({ color: 0x554c3a }));
  edge.geometry.rotateX(-Math.PI / 2);
  edge.position.y = R_FL + 0.030;
  scene.add(edge);

  /* 水面用带渐变的贴图：Shape 的 UV 按世界坐标走，这里直接把 UV 归一化 */
  const wg = mk(1.0);
  wg.computeBoundingBox();
  const bb = wg.boundingBox;
  const uv = wg.attributes.uv;
  const pos = wg.attributes.position;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i,
      (pos.getX(i) - bb.min.x) / Math.max(0.001, bb.max.x - bb.min.x),
      (pos.getZ(i) - bb.min.z) / Math.max(0.001, bb.max.z - bb.min.z));
  }
  const water = new T.Mesh(wg, new T.MeshBasicMaterial({
    map: rwWaterTex, transparent: true, opacity: op, depthWrite: false
  }));
  water.geometry.rotateX(-Math.PI / 2);
  water.position.y = R_FL + 0.046;
  water.renderOrder = 2;
  scene.add(water);

  /* 树影：水里的深色倒影，没有它水就是一摊浅色油漆 */
  const sh2 = new T.Mesh(new T.PlaneGeometry(rx * 1.20, rz * 1.05), new T.MeshBasicMaterial({
    map: lnSoftTex, color: 0x33443a, transparent: true, opacity: 0.34,
    depthWrite: false, fog: false, side: T.DoubleSide
  }));
  sh2.rotation.x = -Math.PI / 2;
  sh2.position.set(cx + rx * 0.24, R_FL + 0.052, cz + rz * 0.18);
  sh2.renderOrder = 3;
  scene.add(sh2);

  /* 天光拉丝：两道细长的高光，水面才有「反光」而不只是「浅色」 */
  for (let i = 0; i < 2; i++) {
    const st = new T.Mesh(new T.PlaneGeometry(rx * 1.15, 0.10 + i * 0.06), new T.MeshBasicMaterial({
      map: lnSoftTex, color: 0xf8fffb, transparent: true, opacity: 0.34 - i * 0.10,
      blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide
    }));
    st.rotation.x = -Math.PI / 2;
    st.rotation.z = -0.42;
    st.position.set(cx - rx * 0.22 + i * 0.30, R_FL + 0.058 + i * 0.002, cz - rz * 0.26 - i * 0.22);
    st.renderOrder = 3;
    scene.add(st);
  }

  /* 天光：两片加色柔光压在水面上 */
  const gl = new T.Mesh(new T.PlaneGeometry(rx * 1.5, rz * 1.2), new T.MeshBasicMaterial({
    map: lnSoftTex, color: 0xf4fbf6, transparent: true, opacity: 0.24,
    blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide
  }));
  gl.rotation.x = -Math.PI / 2;
  gl.position.set(cx - rx * 0.22, R_FL + 0.056, cz - rz * 0.18);
  gl.renderOrder = 3;
  scene.add(gl);

  /* 两圈涟漪：静止的，春日废墟只需一点，别做成喷泉 */
  for (let i = 0; i < 3; i++) {
    const ring = new T.Mesh(new T.TorusGeometry(0.30 + i * 0.26, 0.010, 4, 22),
      new T.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.26 - i * 0.07,
        blending: T.AdditiveBlending, depthWrite: false, fog: false
      }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(cx + 0.35 - i * 0.22, R_FL + 0.054, cz + 0.18 + i * 0.16);
    ring.renderOrder = 3;
    scene.add(ring);
  }
}

/* ------------------------------------------------------------ 光柱 */
const rwShaftTex = canvasTex(128, 256, function (c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.30, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.72, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const hg = c.createLinearGradient(0, 0, w, 0);
  hg.addColorStop(0, 'rgba(0,0,0,0)');
  hg.addColorStop(0.30, 'rgba(255,255,255,1)');
  hg.addColorStop(0.70, 'rgba(255,255,255,1)');
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalCompositeOperation = 'destination-in';
  c.fillStyle = hg; c.fillRect(0, 0, w, h);
});

function rwShaft(p0, p1, w, op, col) {
  const a = new T.Vector3(p0[0], p0[1], p0[2]);
  const b2 = new T.Vector3(p1[0], p1[1], p1[2]);
  const dir = b2.clone().sub(a);
  const len = dir.length();
  dir.normalize();
  const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), dir);
  for (let k = 0; k < 2; k++) {
    const m = new T.Mesh(new T.PlaneGeometry(w, len), new T.MeshBasicMaterial({
      map: rwShaftTex, color: col || 0xfff1cc, transparent: true, opacity: op,
      blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide
    }));
    m.position.copy(a).add(b2).multiplyScalar(0.5);
    m.quaternion.copy(q);
    if (k) m.rotateY(Math.PI / 2);
    m.renderOrder = 4;
    scene.add(m);
  }
}

/* ------------------------------------------------------------ 花瓣 */
function rwPetals() {
  const N = cfg(PS.rwPetalN, 150);
  const pos = new Float32Array(N * 3);
  const base = new Float32Array(N);
  const ph = new Float32Array(N);
  const sp = new Float32Array(N);
  const sz = new Float32Array(N);
  const col = new Float32Array(N * 3);
  const C1 = new T.Color(0xf6cdd8), C2 = new T.Color(0xfff3ef), C3 = new T.Color(0xe9aec2);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = -10.0 + rwR(i * 1.7 + 2) * 20.0;
    pos[i * 3 + 1] = rwR(i * 2.3 + 7) * 12.0 + 1.0;
    pos[i * 3 + 2] = -7.6 + rwR(i * 3.1 + 5) * 15.2;
    base[i] = pos[i * 3 + 1];
    ph[i] = rwR(i * 5.3 + 3) * 6.283;
    sp[i] = 0.26 + rwR(i * 7.1 + 9) * 0.30;
    sz[i] = 0.9 + Math.pow(rwR(i * 9.7 + 1), 1.7) * 2.4;
    const c = i % 3 === 0 ? C2 : (i % 3 === 1 ? C1 : C3);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('aBase', new T.BufferAttribute(base, 1));
  g.setAttribute('aPh', new T.BufferAttribute(ph, 1));
  g.setAttribute('aSpd', new T.BufferAttribute(sp, 1));
  g.setAttribute('aSize', new T.BufferAttribute(sz, 1));
  g.setAttribute('aCol', new T.BufferAttribute(col, 3));

  const m = new T.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uH: { value: 12.0 } },
    vertexShader:
      'attribute float aBase,aPh,aSpd,aSize; attribute vec3 aCol;\n' +
      'uniform float uTime,uH; varying vec3 vC; varying float vA;\n' +
      'void main(){\n' +
      '  vec3 p=position;\n' +
      '  p.y=mod(aBase-uTime*aSpd,uH)+1.0;\n' +
      '  p.x=mod(p.x+sin(uTime*0.55+aPh)*1.55+uTime*0.28+12.0,24.0)-12.0;\n' +
      '  p.z+=cos(uTime*0.42+aPh*1.4)*1.05;\n' +
      '  vec4 mv=modelViewMatrix*vec4(p,1.0);\n' +
      '  gl_Position=projectionMatrix*mv;\n' +
      '  float d=max(-mv.z,1.0);\n' +
      '  gl_PointSize=clamp(aSize*150.0/d,0.8,5.0);\n' +
      '  vC=aCol; vA=clamp(1.0-(d-30.0)/150.0,0.12,1.0);\n' +
      '}',
    fragmentShader:
      'varying vec3 vC; varying float vA;\n' +
      'void main(){\n' +
      '  vec2 q=gl_PointCoord-vec2(0.5);\n' +
      '  float r=length(q*vec2(1.0,1.5));\n' +
      '  if(r>0.5) discard;\n' +
      '  float a=smoothstep(0.5,0.10,r)*vA*0.92;\n' +
      '  gl_FragColor=vec4(vC,a);\n' +
      '}',
    transparent: true, depthWrite: false
  });
  const p = new T.Points(g, m);
  p.frustumCulled = false;
  p.renderOrder = 6;
  scene.add(p);
  CT_ANIM.push(function (t) { m.uniforms.uTime.value = t; });
}

/* ------------------------------------------------------------ 尘埃 */
function rwDust() {
  const N = 100;
  const pos = new Float32Array(N * 3);
  const ph = new Float32Array(N);
  const sz = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = -5.6 + rwR(i * 1.9 + 3) * 10.6;
    pos[i * 3 + 1] = 0.4 + rwR(i * 2.7 + 6) * 6.4;
    pos[i * 3 + 2] = -4.4 + rwR(i * 3.3 + 8) * 8.4;
    ph[i] = rwR(i * 5.1 + 4) * 6.283;
    sz[i] = 0.8 + rwR(i * 7.3 + 2) * 1.8;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('aPh', new T.BufferAttribute(ph, 1));
  g.setAttribute('aSize', new T.BufferAttribute(sz, 1));
  const m = new T.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader:
      'attribute float aPh,aSize; uniform float uTime; varying float vA;\n' +
      'void main(){\n' +
      '  vec3 p=position;\n' +
      '  p.y+=sin(uTime*0.22+aPh)*0.55+mod(uTime*0.035,0.9);\n' +
      '  p.x+=sin(uTime*0.17+aPh*1.7)*0.42;\n' +
      '  p.z+=cos(uTime*0.14+aPh*1.3)*0.36;\n' +
      '  vec4 mv=modelViewMatrix*vec4(p,1.0);\n' +
      '  gl_Position=projectionMatrix*mv;\n' +
      '  float d=max(-mv.z,1.0);\n' +
      '  gl_PointSize=clamp(aSize*56.0/d,0.8,3.2);\n' +
      '  vA=clamp(1.0-(d-14.0)/60.0,0.06,1.0)*0.55;\n' +
      '}',
    fragmentShader:
      'varying float vA;\n' +
      'void main(){\n' +
      '  float r=length(gl_PointCoord-vec2(0.5));\n' +
      '  if(r>0.5) discard;\n' +
      '  gl_FragColor=vec4(1.0,0.96,0.86,smoothstep(0.5,0.05,r)*vA);\n' +
      '}',
    transparent: true, depthWrite: false
  });
  const p = new T.Points(g, m);
  p.frustumCulled = false;
  p.renderOrder = 6;
  scene.add(p);
  CT_ANIM.push(function (t) { m.uniforms.uTime.value = t; });
}

/* ------------------------------------------------------------ 蝴蝶 */
function rwButterflies() {
  const specs = [
    [2.55, 1.55, 2.35, 2.4, 2.0, 0xfff0c0],
    [-1.55, 2.15, 1.15, 2.0, 1.6, 0xffe1a8],
    [0.65, 2.85, -1.85, 2.8, 2.2, 0xfff6e6],
    [-3.55, 1.85, 2.55, 2.2, 1.8, 0xffd6c2]
  ];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const g = new T.Group();
    const wg = new T.PlaneGeometry(0.30, 0.22);
    wg.rotateX(-Math.PI / 2);
    wg.translate(0.15, 0, 0);
    const wl = new T.Mesh(wg, new T.MeshBasicMaterial({
      color: s[5], side: T.DoubleSide, transparent: true, opacity: 0.94
    }));
    const wgr = new T.PlaneGeometry(0.30, 0.22);
    wgr.rotateX(-Math.PI / 2);
    wgr.translate(-0.15, 0, 0);
    const wr = new T.Mesh(wgr, new T.MeshBasicMaterial({
      color: s[5], side: T.DoubleSide, transparent: true, opacity: 0.94
    }));
    const body = new T.Mesh(new T.BoxGeometry(0.055, 0.045, 0.20),
      new T.MeshBasicMaterial({ color: 0x4a4038 }));
    g.add(wl); g.add(wr); g.add(body);
    g.position.set(s[0], s[1], s[2]);
    scene.add(g);
    const ph = i * 1.73;
    CT_ANIM.push(function (t) {
      const u = t * 0.42 + ph;
      g.position.set(
        s[0] + Math.cos(u) * s[3],
        s[1] + Math.sin(u * 1.9 + ph) * 0.55,
        s[2] + Math.sin(u * 0.83 + ph) * s[4]
      );
      g.rotation.y = -u * 1.2;
      const f = 0.45 + Math.sin(t * 11.0 + ph) * 0.55;
      wl.rotation.z = f;
      wr.rotation.z = -f;
    });
  }
}

/* ------------------------------------------------------------ 组装 */
function buildRwAll() {
  const g = new T.Group();
  const b = new Builder();
  rwBase(b);
  rwRuin(b);
  rwTree(b);
  rwFlora(b);
  /* 这个俯角下远景落不进画面，山只会露出一条楔形边，所以不做山，
     靠展台土层剖面 + 大雾来交代「这是一块被端起来的土地」。 */
  b.build(g, {
    noOutline: ['rwGrass', 'rwGrassL', 'rwGrassD', 'rwVine', 'rwVineD',
      'rwRebar', 'rwRust', 'rwBlossom', 'rwBlossomD', 'rwFlowerW',
      'rwFlowerY', 'rwFlowerP', 'rwFlowerV', 'rwFlowerC',
      'rwLeaf1T', 'rwLeaf2', 'rwLeaf3', 'rwMoss', 'rwMossL',
      'rwHill1', 'rwHill2', 'rwHill3', 'rwPath', 'rwBush', 'rwBushD',
      'rwEarth', 'rwStone', 'rwPatchL', 'rwPatchD', 'rwLitter', 'rwLitterD']
  });
  scene.add(g);

  /* 室内上部的压深：靠近楼板与墙角最暗 */
  /* ★ 遮罩片必须完全落在墙体轮廓以内，否则会从屋顶上沿露出来，
     变成一块浮在天上的灰板。顶边压到最低墙顶之下。 */
  rwShade(-0.30, 4.90, R_Z0 + R_T + 0.020, 10.7, 2.10, 0, 0.85);
  /* 左墙前段是塌下来的斜口，遮罩只能盖后半截，否则会从矮墙上方露出来 */
  rwShade(R_X0 + R_T + 0.020, 4.90, -2.30, 4.70, 2.10, Math.PI * 0.5, 0.70);

  /* 楼板底下的投影：一道横着的软黑，墙与板才咬得住 */
  const slabShadow = new T.Mesh(new T.PlaneGeometry(7.4, 1.10), new T.MeshBasicMaterial({
    map: lnSoftTex, color: 0x1e2622, transparent: true, opacity: 0.42,
    depthWrite: false, fog: false, side: T.DoubleSide
  }));
  slabShadow.position.set(-2.10, R_SB - 0.28, R_Z0 + R_T + 0.018);
  slabShadow.renderOrder = 1;
  scene.add(slabShadow);

  /* 墙角竖着的一道暗：两面墙相交处最深 */
  const cnr = new T.Mesh(new T.PlaneGeometry(1.35, 5.40), new T.MeshBasicMaterial({
    map: lnSoftTex, color: 0x1c231f, transparent: true, opacity: 0.40,
    depthWrite: false, fog: false, side: T.DoubleSide
  }));
  cnr.position.set(R_X0 + R_T + 0.024, 2.95, R_Z0 + R_T + 0.75);
  cnr.rotation.y = Math.PI * 0.5;
  cnr.renderOrder = 1;
  scene.add(cnr);

  /* 墙根潮气带：窗台以下一条，室内两面墙各一条 */
  rwGrimeBand(-0.30, R_FL + 0.60, R_Z0 + R_T + 0.022, 10.9, 1.05, 0);
  rwGrimeBand(R_X0 + R_T + 0.022, R_FL + 0.60, -0.20, 9.0, 1.05, Math.PI * 0.5);

  rwPuddle(2.75, 2.10, 1.85, 1.20, 4.7, 0.92);
  rwPuddle(-2.55, 2.70, 0.90, 0.62, 9.3, 0.86);

  /* 三道光：从楼板缺口与断墙顶斜插到地面 */
  rwShaft([1.35, 6.05, -2.45], [-0.35, R_FL + 0.10, -0.35], 2.35, 0.30, 0xfff2d2);
  rwShaft([0.55, 6.35, -3.10], [-1.55, R_FL + 0.10, -1.30], 1.80, 0.20, 0xfff6de);
  rwShaft([-2.35, 4.95, 3.95], [-3.35, R_FL + 0.10, 1.95], 1.65, 0.18, 0xfff7e2);

  /* 光柱落地的那一小片亮斑 */
  const patch = new T.Mesh(new T.PlaneGeometry(3.2, 2.6), new T.MeshBasicMaterial({
    map: lnSoftTex, color: 0xfff4d6, transparent: true, opacity: 0.09,
    blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide
  }));
  patch.rotation.x = -Math.PI / 2;
  patch.position.set(-0.35, R_FL + 0.06, -0.35);
  patch.renderOrder = 3;
  scene.add(patch);

  rwPetals();
  rwDust();
  rwButterflies();

  if (window.__expose) {
    window.__rw = { tree: [1.14, -2.62], petals: cfg(PS.rwPetalN, 150) };
  }
}

/* ============================================================
   城市剖面（section / SEC）—— 第 15 套形制
   一块被竖直切开的地籍块。三个深度层次：
     前缘 z = SC_ZH（4.40）   地下土层层理 + 地铁隧道（切面正对相机）
     中景 z = 0.40            街道路面
     后景 z = 0.40            6 层混合用途楼的室内剖面
   主角是那两道切面：它把一座城市在同一秒的六种生活并排摊开。
   ============================================================ */
const SEC = !!PS.section;

const SC_X0 = -9.6, SC_X1 = 9.6;   // 地块左右
const SC_Z0 = -7.4;                // 后缘
const SC_ZH = 4.40;                // 前缘 = 剖切面
const SC_GY = 0.14;                // 室外地面
const SC_BT = -5.85;               // 台底

const S_W = 4.55;                  // 主楼半宽
const S_ZB = -6.95;                // 后墙外面
const S_ZF = 0.40;                 // 前切面
const S_T = 0.34;                  // 墙厚
const S_FL = 3.20;                 // 层高
const S_SL = 0.26;                 // 楼板厚
const S_N = 6;                     // 层数
const S_TOP = SC_GY + S_N * S_FL;  // 19.34

const SH_X0 = 5.35, SH_X1 = 9.20;  // 右侧三店小楼
const SH_Z0 = -5.80, SH_Z1 = 0.30;
const SH_FL = 3.10, SH_N = 3;

/* 地铁：沿 x 贯穿，近侧壁刚好落在切面上，切面里能直接看进隧道 */
const T_ZF = SC_ZH;                // 近壁 = 切面
const T_ZB = -1.45;                // 远壁
const T_FL = -4.32;                // 轨面
const T_TY = -1.58;                // 顶板底

/* 确定性伪随机 */
function scR(seed) {
  const x = Math.sin(seed * 113.7 + 271.3) * 43758.5453;
  return x - Math.floor(x);
}

/* 描边压成冷灰，别用民居的纯黑 */
if (SEC) OUTLINE.uniforms.uColor.value.set(0x3a3f46);

/* 任意多边形棱柱（(x,z) 折线 + 上下高度） */
function scSlab(b, key, pts, y0, y1) {
  const sh = new T.Shape();
  sh.moveTo(pts[0][0], -pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], -pts[i][1]);
  sh.closePath();
  const g = new T.ExtrudeGeometry(sh, {
    depth: Math.max(0.002, y1 - y0), bevelEnabled: false, curveSegments: 1, steps: 1
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  b.add(key, g);
  return g;
}

/* 矩形棱柱：按「两个角 + 两个高度」给 */
function scBlock(b, key, x0, x1, z0, z1, y0, y1) {
  return scSlab(b, key, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y0, y1);
}

/* 一段台阶：整个梯段一次挤出，绝不一级一个盒子（不然满梯子砖缝） */
function scSteps(b, key, x0, x1, zFront, y0, n, run, rise) {
  const sh = new T.Shape();
  sh.moveTo(zFront, y0);
  let z = zFront, y = y0;
  for (let i = 0; i < n; i++) {
    z -= run;
    sh.lineTo(z, y);
    y += rise;
    sh.lineTo(z, y);
  }
  sh.lineTo(z, y0);
  sh.closePath();
  const g = new T.ExtrudeGeometry(sh, {
    depth: x1 - x0, bevelEnabled: false, curveSegments: 1, steps: 1
  });
  g.rotateY(-Math.PI * 0.5);
  g.translate(x1, 0, 0);
  b.add(key, g);
  return [z, y];
}

/* ------------------------------------------------------------ 地下土方 */
/* 土方绕开隧道：隧道那一段只留远侧的土。
   ★ 整块挤出，绝不用盒子拼 —— 盒子接缝会漏出一圈描边，剖面像砖墙。 */
function scEarth(b) {
  const ALL = [[SC_X0, SC_Z0], [SC_X1, SC_Z0], [SC_X1, SC_ZH], [SC_X0, SC_ZH]];
  const BACK = [[SC_X0, SC_Z0], [SC_X1, SC_Z0], [SC_X1, T_ZB], [SC_X0, T_ZB]];

  /* 路面结构层 */
  scBlock(b, 'scAsphalt', SC_X0, SC_X1, SC_Z0, SC_ZH, SC_GY - 0.20, SC_GY);
  scBlock(b, 'scBase', SC_X0, SC_X1, SC_Z0, SC_ZH, SC_GY - 0.50, SC_GY - 0.20);

  /* 隧道顶板以上：整块填土 */
  scSlab(b, 'scSoil1', ALL, T_TY, SC_GY - 0.50);
  /* 隧道高度范围：只留远侧（z < T_ZB）那一截 */
  scSlab(b, 'scSoil2', BACK, T_FL, T_TY);
  /* 隧道地板以下 */
  scSlab(b, 'scSoil3', ALL, -4.95, T_FL);
  scSlab(b, 'scRock', ALL, SC_BT, -4.95);

  /* 切面上的石子：一层层排，深浅不一 */
  for (let i = 0; i < 132; i++) {
    const y = SC_GY - 0.58 - scR(i * 3.1 + 1) * 3.95;
    if (y < T_TY && y > T_FL) continue;                 // 让开隧道
    const x = SC_X0 + 0.32 + scR(i * 5.3 + 2) * (SC_X1 - SC_X0 - 0.64);
    const r = 0.042 + scR(i * 7.7) * 0.105;
    b.box(scR(i * 9.1) < 0.14 ? 'scStoneP' : (i % 3 ? 'scStone' : 'scStoneD'),
      r * 1.9, r * 1.2, 0.05, x, y, SC_ZH - 0.008,
      0, 0, scR(i * 11.3) * 3.14);
  }

  /* 三根横穿的管线：水 / 燃气 / 电 */
  const runs = [
    [-0.70, 0.082, 'scPipeA'], [-0.96, 0.066, 'scPipeB'], [-1.20, 0.050, 'scPipeC']
  ];
  for (let i = 0; i < runs.length; i++) {
    const q = runs[i];
    /* 管子沿 x 走、贴着切面：剖面里看到的是半根管子鼓出来，正是一根被切开的管 */
    const pz = SC_ZH - 0.035;
    b.to(q[2], q[1], SC_X0, q[0], pz, SC_X1, q[0], pz, 8);
    for (let k = 0; k < 5; k++) {
      b.cyl(q[2], q[1] * 1.45, q[1] * 1.45, 0.10, 8,
        SC_X0 + 1.7 + k * 3.5, q[0], pz, 0, 0, Math.PI * 0.5);
    }
  }
  /* 从楼里下来的排水立管，一路穿到隧道顶板上方 */
  b.to('scPipeC', 0.070, 3.95, SC_GY - 0.40, -6.20, 3.95, T_TY + 0.10, -6.20, 8);

  /* 台底混凝土基座 */
  scSlab(b, 'scBase', [[SC_X0 - 0.24, SC_Z0 - 0.24], [SC_X1 + 0.24, SC_Z0 - 0.24],
    [SC_X1 + 0.24, SC_ZH + 0.24], [SC_X0 - 0.24, SC_ZH + 0.24]], SC_BT - 0.30, SC_BT);

  /* 左端立一根水准标尺，坐在土里，不要伸出台座 —— 伸出去了就像一根插错位置的杆子 */
  b.box('scMetalD', 0.06, 4.10, 0.06, SC_X0 + 0.52, SC_BT + 2.30, SC_ZH + 0.06);
  for (let i = 0; i < 4; i++) {
    b.box(i % 2 ? 'scPaintW' : 'scPaintR', 0.16, 1.00, 0.02,
      SC_X0 + 0.52, SC_BT + 0.65 + i * 1.02, SC_ZH + 0.09);
  }
}

/* ------------------------------------------------------------ 地铁 */
function scTunnel(b) {
  const X0 = SC_X0, X1 = SC_X1;

  /* 底板 / 顶板 / 远壁：三块板围出一个盒子，近侧就是切面 */
  scBlock(b, 'scConD', X0, X1, T_ZB - 0.28, T_ZF, T_FL - 0.26, T_FL);
  scBlock(b, 'scConD', X0, X1, T_ZB - 0.28, T_ZF, T_TY, T_TY + 0.26);
  scBlock(b, 'scCon', X0, X1, T_ZB - 0.28, T_ZB, T_FL - 0.26, T_TY + 0.26);

  /* 远壁上的电缆桥架与一排检修灯 */
  for (let i = 0; i < 2; i++) {
    b.box('scMetalD', X1 - X0 - 0.1, 0.10, 0.16, 0, -2.10 - i * 0.46, T_ZB + 0.06);
  }
  for (let i = 0; i < 7; i++) {
    const x = X0 + 1.2 + i * 2.55;
    b.box('scNeonC', 0.42, 0.10, 0.10, x, T_TY - 0.10, T_ZB + 0.22);
  }

  /* 顶板下的两列吊灯：靠切面这一列最亮，给隧道内部一点纵深 */
  for (let i = 0; i < 6; i++) {
    const x = X0 + 1.5 + i * 2.9;
    b.box('scMetalD', 0.06, 0.16, 0.06, x, T_TY - 0.16, 2.55);
    b.box('scNeonW', 0.90, 0.06, 0.24, x, T_TY - 0.26, 2.55);
  }

  /* 双轨：枕木 + 钢轨 + 道床 */
  const TR = [2.55, 0.95];
  for (let t = 0; t < TR.length; t++) {
    const tz = TR[t];
    scBlock(b, 'scBallast', X0, X1, tz - 0.82, tz + 0.82, T_FL, T_FL + 0.10);
    for (let i = 0; i < 26; i++) {
      const x = X0 + 0.35 + i * 0.74;
      b.box('scSleeper', 0.24, 0.07, 1.42, x, T_FL + 0.13, tz);
    }
    b.box('scRail', X1 - X0, 0.11, 0.09, 0, T_FL + 0.21, tz - 0.56);
    b.box('scRail', X1 - X0, 0.11, 0.09, 0, T_FL + 0.21, tz + 0.56);
    b.box('scRailD', X1 - X0, 0.05, 0.16, 0, T_FL + 0.10, tz - 0.56);
    b.box('scRailD', X1 - X0, 0.05, 0.16, 0, T_FL + 0.10, tz + 0.56);
    /* 第三轨 */
    b.box('scRail', X1 - X0, 0.07, 0.07, 0, T_FL + 0.36, tz - 0.74);
  }

  /* 一列地铁停在远轨上：正面看是侧面长条，窗里透暖光 */
  const cx = -0.4, cl = 7.4;
  b.box('scTrain', cl, 1.62, 2.42, cx, T_FL + 1.02, 0.95);
  b.box('scTrainD', cl, 0.24, 2.46, cx, T_FL + 0.32, 0.95);
  b.box('scTrainD', cl - 0.3, 0.10, 2.30, cx, T_FL + 1.86, 0.95);
  /* 车窗：两排，靠切面这一侧最清楚 */
  for (let i = 0; i < 6; i++) {
    const x = cx - 2.55 + i * 1.02;
    b.box('scTrainWin', 0.72, 0.62, 0.06, x, T_FL + 1.28, 0.95 - 1.23);
    b.box('scTrainWin', 0.72, 0.62, 0.06, x, T_FL + 1.28, 0.95 + 1.23);
    b.box('scTrainWin', 0.06, 0.62, 0.86, x + 0.38, T_FL + 1.28, 0.95);
  }
  /* 车门 */
  b.box('scTrainD', 0.10, 1.46, 0.86, cx + 1.62, T_FL + 1.00, 0.95 - 1.21);
  b.box('scTrainD', 0.10, 1.46, 0.86, cx + 1.62, T_FL + 1.00, 0.95 + 1.21);
  /* 车头灯与侧面腰线 */
  b.box('scNeonW', 0.10, 0.26, 0.30, cx - cl * 0.5, T_FL + 0.80, 0.95 - 0.86);
  b.box('scNeonW', 0.10, 0.26, 0.30, cx - cl * 0.5, T_FL + 0.80, 0.95 + 0.86);
  b.box('scTrainStr', cl, 0.12, 2.44, cx, T_FL + 1.52, 0.95);
  /* 转向架 */
  for (let i = 0; i < 2; i++) {
    b.box('scMetalD', 1.10, 0.34, 1.70, cx - 2.5 + i * 5.0, T_FL + 0.24, 0.95);
  }

  /* 站台：远壁一侧贴一条站台边，带黄线 */
  scBlock(b, 'scPlatform', X0, X1, T_ZB + 0.02, T_ZB + 0.62, T_FL + 0.06, T_FL + 0.42);
  b.box('scPaintY', X1 - X0, 0.03, 0.14, 0, T_FL + 0.44, T_ZB + 0.52);

  /* 隧道口两端的暗：让隧道看起来是通的，不是一截盒子 */
  for (let i = 0; i < 2; i++) {
    b.box('scTunnelDark', 0.5, T_TY - T_FL - 0.2, T_ZF - T_ZB - 0.1,
      i ? X1 - 0.25 : X0 + 0.25, (T_TY + T_FL) * 0.5, (T_ZF + T_ZB) * 0.5);
  }
}

/* ------------------------------------------------------------ 街道 */
function scStreet(b) {
  /* 人行道：沿楼前一条，比车行道高 0.14 */
  scBlock(b, 'scWalk', SC_X0, SC_X1, S_ZF, 1.55, SC_GY, SC_GY + 0.14);
  b.box('scCurb', SC_X1 - SC_X0, 0.16, 0.10, 0, SC_GY + 0.06, 1.55);

  /* 车行道：两条车道 + 中间虚线 */
  scBlock(b, 'scAsphalt', SC_X0, SC_X1, 1.55, SC_ZH, SC_GY - 0.02, SC_GY);
  for (let i = 0; i < 9; i++) {
    b.box('scPaintW', 0.70, 0.02, 0.10, SC_X0 + 1.0 + i * 2.15, SC_GY + 0.012, 2.95);
  }

  /* 斑马线：一块灰沥青最难读的就是「这是条路」，几道白条就够 */
  for (let i = 0; i < 7; i++) {
    b.box('scPaintW', 0.44, 0.02, 2.40, -8.55 + i * 0.78, SC_GY + 0.012, 2.95);
  }
  /* 停止线 */
  b.box('scPaintW', 5.20, 0.02, 0.14, -4.90, SC_GY + 0.012, 1.85);

  /* 井盖、雨水箅子、路面裂缝 */
  for (let i = 0; i < 3; i++) {
    b.cyl('scMetalD', 0.32, 0.32, 0.03, 12, -5.4 + i * 6.0, SC_GY + 0.008, 2.05);
  }
  b.box('scMetalD', 0.86, 0.03, 0.40, 3.05, SC_GY + 0.008, 1.72);
  for (let i = 0; i < 4; i++) {
    b.box('scAsphaltD', 1.30 + scR(i * 3.1) * 1.6, 0.012, 0.05,
      -6.0 + i * 3.4, SC_GY + 0.006, 2.3 + scR(i * 5.7) * 1.2, 0, scR(i * 7.3) * 0.5, 0);
  }

  /* 人行道上：一棵行道树、一盏路灯、一个公交站牌、一张长椅、两辆自行车 */
  scTree(b, -3.30, 0.95, 2.05, 1.0);
  scTree(b, 6.15, 0.95, 2.30, 0.86);

  /* 路灯：灯杆在楼前，灯头挑出来压在车行道上 */
  b.cyl('scMetalD', 0.055, 0.075, 4.30, 8, 4.95, SC_GY + 2.15, 1.05);
  b.to('scMetalD', 0.052, 4.95, SC_GY + 4.28, 1.05, 4.95, SC_GY + 4.46, 2.35, 6);
  b.box('scMetalD', 0.20, 0.14, 0.62, 4.95, SC_GY + 4.40, 2.45);
  b.box('scNeonW', 0.16, 0.05, 0.46, 4.95, SC_GY + 4.32, 2.45);

  /* 公交站牌 */
  b.cyl('scMetalD', 0.045, 0.045, 2.55, 8, -6.85, SC_GY + 1.42, 1.05);
  b.box('scSignB', 0.72, 0.44, 0.05, -6.85, SC_GY + 2.62, 1.05);
  b.box('scMetalD', 0.86, 0.06, 0.06, -6.85, SC_GY + 2.86, 1.05);

  /* 长椅（朝街） */
  const bx = -8.20, bz = 1.10;
  for (let i = 0; i < 2; i++) {
    b.box('scMetalD', 0.08, 0.42, 0.42, bx + (i ? 0.86 : -0.86), SC_GY + 0.35, bz);
  }
  for (let i = 0; i < 3; i++) {
    b.box('scWood', 2.10, 0.07, 0.13, bx, SC_GY + 0.58, bz - 0.16 + i * 0.16);
  }
  for (let i = 0; i < 2; i++) {
    b.box('scWood', 2.10, 0.13, 0.06, bx, SC_GY + 0.82 + i * 0.20, bz + 0.30);
  }

  /* 自行车：两个轮 + 车架，靠在树边 */
  for (let i = 0; i < 2; i++) {
    const z = 1.15 + i * 0.45;
    b.torus('scTire', 0.30, 0.035, -1.95 + i * 0.1, SC_GY + 0.44, z, 0, 0, 0);
    b.torus('scTire', 0.30, 0.035, -1.05 + i * 0.1, SC_GY + 0.44, z, 0, 0, 0);
    b.to('scMetalL', 0.028, -1.95, SC_GY + 0.44, z, -1.55, SC_GY + 0.86, z, 5);
    b.to('scMetalL', 0.028, -1.55, SC_GY + 0.86, z, -1.05, SC_GY + 0.44, z, 5);
    b.to('scMetalL', 0.028, -1.62, SC_GY + 0.44, z, -1.48, SC_GY + 0.90, z, 5);
    b.box('scMetalL', 0.30, 0.03, 0.03, -1.52, SC_GY + 0.93, z);
  }

  /* 街上停三辆车：空的街道一眼就是模型 */
  const cars = [
    [-6.30, 2.45, 0, 'scCarA'], [1.55, 3.55, Math.PI, 'scCarB'],
    [6.55, 3.55, 0, 'scCarC']
  ];
  for (let i = 0; i < cars.length; i++) {
    const q = cars[i];
    const cx = q[0], cz = q[1], ry = q[2];
    const c = Math.cos(ry), sn = Math.sin(ry);
    const P = function (lx, lz) { return [cx + lx * c + lz * sn, cz - lx * sn + lz * c]; };
    b.box(q[3], 3.60, 0.62, 1.58, cx, SC_GY + 0.52, cz, 0, ry, 0);
    b.box(q[3], 2.10, 0.46, 1.50, cx, SC_GY + 0.98, cz, 0, ry, 0);
    b.box('scGlass', 1.94, 0.40, 1.40, cx, SC_GY + 1.02, cz, 0, ry, 0);
    b.box('scMetalD', 2.16, 0.06, 1.54, cx, SC_GY + 1.24, cz, 0, ry, 0);
    b.box('scNeonW', 0.10, 0.16, 0.34, P(1.80, -0.52)[0], SC_GY + 0.62, P(1.80, -0.52)[1], 0, ry, 0);
    b.box('scNeonW', 0.10, 0.16, 0.34, P(1.80, 0.52)[0], SC_GY + 0.62, P(1.80, 0.52)[1], 0, ry, 0);
    b.box('scTail', 0.08, 0.14, 0.30, P(-1.80, -0.54)[0], SC_GY + 0.66, P(-1.80, -0.54)[1], 0, ry, 0);
    b.box('scTail', 0.08, 0.14, 0.30, P(-1.80, 0.54)[0], SC_GY + 0.66, P(-1.80, 0.54)[1], 0, ry, 0);
    for (let j = 0; j < 4; j++) {
      const lx = j < 2 ? 1.16 : -1.16, lz = (j % 2) ? 0.74 : -0.74;
      const pp = P(lx, lz);
      b.cyl('scTire', 0.28, 0.28, 0.20, 10, pp[0], SC_GY + 0.28, pp[1], 0, ry, Math.PI * 0.5);
    }
  }

  /* 街上的人：人行道上散步的、等车的、正过马路的 */
  scPed(b, -2.05, SC_GY + 0.14, 1.05, 1.55, 'scShirtB', 'scSkin1');
  scPed(b, -1.35, SC_GY + 0.14, 1.18, 1.25, 'scShirtD', 'scSkin2');
  scPed(b, -6.75, SC_GY + 0.14, 1.02, 0.30, 'scShirtC', 'scSkin1');
  scPed(b, 7.35, SC_GY + 0.14, 1.05, 4.10, 'scShirtA', 'scSkin2');
  scPed(b, -5.05, SC_GY, 2.55, 3.05, 'scShirtD', 'scSkin1');
  scPed(b, 2.75, SC_GY + 0.14, 0.95, 2.60, 'scShirtC', 'scSkin2');

  /* 路边的垃圾桶 */
  b.cyl('scMetalD', 0.20, 0.17, 0.72, 10, -3.05, SC_GY + 0.50, 0.90);
  b.cyl('scMetalD', 0.23, 0.23, 0.06, 10, -3.05, SC_GY + 0.88, 0.90);
}

/* ------------------------------------------------------------ 树 */
function scTree(b, x, z, h, s) {
  const y0 = SC_GY + (z > 1.5 ? 0 : 0.10);
  b.to('scBark', 0.11 * s, x, y0, z, x + 0.06, y0 + h * 0.62, z - 0.04, 7);
  for (let i = 0; i < 3; i++) {
    const a = 0.6 + i * 2.0;
    b.to('scBarkD', 0.06 * s,
      x + 0.05, y0 + h * 0.55, z - 0.03,
      x + Math.cos(a) * 0.55 * s, y0 + h * 0.86, z + Math.sin(a) * 0.55 * s, 5);
  }
  const cy = y0 + h * 0.92;
  for (let i = 0; i < 5; i++) {
    const a = i * 1.27 + 0.4;
    const r = (0.52 + scR(i * 3.7 + x) * 0.26) * s;
    b.sph(i % 2 ? 'scLeaf1' : 'scLeaf2', r,
      x + Math.cos(a) * 0.52 * s, cy + (scR(i * 5.3) - 0.4) * 0.42 * s,
      z + Math.sin(a) * 0.52 * s, 1.15, 0.86, 1.05);
  }
}

/* ------------------------------------------------------------ 主楼外壳 */
function scShell(b) {
  const ZB = S_ZB, ZF = S_ZF;
  const XL = -S_W, XR = S_W;

  /* 后墙：留一排窗洞（不真切洞，用内凹的窗框 + 深色玻璃块） */
  scBlock(b, 'scCon', XL, XR, ZB, ZB + S_T, SC_GY - 0.30, S_TOP);

  /* 左右侧墙 */
  scBlock(b, 'scCon', XL, XL + S_T, ZB + S_T, ZF, SC_GY - 0.30, S_TOP);
  scBlock(b, 'scCon', XR - S_T, XR, ZB + S_T, ZF, SC_GY - 0.30, S_TOP);

  /* 楼板 + 前切面 */
  for (let k = 0; k <= S_N; k++) {
    const y = SC_GY + k * S_FL;
    scBlock(b, 'scConD', XL, XR, ZB + S_T, ZF, y - S_SL, y);
    /* 切面：楼板端头一条略深的断面，加几颗露出来的骨料 */
    b.box('scCut', XR - XL, S_SL * 0.94, 0.05, 0, y - S_SL * 0.5, ZF + 0.02);
    for (let i = 0; i < 9; i++) {
      b.box('scStoneP', 0.05 + scR(k * 7.1 + i) * 0.07, 0.04, 0.03,
        -S_W + 0.5 + scR(k * 3.3 + i * 2.7) * (S_W * 2 - 1.0),
        y - S_SL * (0.25 + scR(k * 5.9 + i) * 0.5), ZF + 0.045);
    }
    /* 侧墙的断面也压一条 */
    b.box('scCut', 0.05, S_SL * 0.94, ZF - ZB, XL + S_T + 0.02, y - S_SL * 0.5, (ZF + ZB) * 0.5);
    b.box('scCut', 0.05, S_SL * 0.94, ZF - ZB, XR - S_T - 0.02, y - S_SL * 0.5, (ZF + ZB) * 0.5);
  }

  /* 屋顶：女儿墙 + 设备 + 楼梯出屋面 */
  scBlock(b, 'scCon', XL, XR, ZB + S_T, ZF, S_TOP, S_TOP + 0.16);
  for (let i = 0; i < 2; i++) {
    const z = ZB + 0.4 + i * (ZF - ZB - 0.8);
    b.box('scConL', XR - XL - 0.4, 0.52, 0.24, 0, S_TOP + 0.42, z);
  }
  b.box('scConL', 0.24, 0.52, 0.30, XL + 0.14, S_TOP + 0.42, (ZF + ZB) * 0.5);
  b.box('scConL', 0.24, 0.52, 0.30, XR - 0.14, S_TOP + 0.42, (ZF + ZB) * 0.5);
  /* 楼梯出屋面小房 */
  b.box('scConD', 1.70, 1.35, 1.90, -2.75, S_TOP + 0.70, ZB + 1.6);
  b.box('scCon', 1.90, 0.16, 2.10, -2.75, S_TOP + 1.44, ZB + 1.6);
  /* 空调外机与水箱 */
  b.box('scMetal', 1.10, 0.62, 0.86, 2.35, S_TOP + 0.48, ZB + 1.5);
  b.box('scMetalD', 0.90, 0.08, 0.70, 2.35, S_TOP + 0.82, ZB + 1.5);
  b.cyl('scTank', 0.72, 0.72, 0.90, 12, 2.30, S_TOP + 1.30, ZB + 3.1);
  b.cyl('scTankD', 0.76, 0.76, 0.10, 12, 2.30, S_TOP + 1.78, ZB + 3.1);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57 + 0.6;
    b.to('scMetalD', 0.045, 2.30 + Math.cos(a) * 0.42, S_TOP + 0.16,
      ZB + 3.1 + Math.sin(a) * 0.42, 2.30 + Math.cos(a) * 0.42, S_TOP + 0.86,
      ZB + 3.1 + Math.sin(a) * 0.42, 5);
  }
}

/* ------------------------------------------------------------ 外立面 */
/* ★ 侧墙如果不开窗，从外面看就是一块两百像素见方的水泥板。
   窗做「贴在墙面上的凹窗」：深色玻璃 + 四道浅色窗框 + 一块窗台，
   比真切洞便宜得多，远看一样是窗。 */
function scFacade(b, x, dir) {
  const ZB = S_ZB + S_T, ZF = S_ZF;
  for (let k = 0; k < S_N; k++) {
    const y = SC_GY + k * S_FL + 1.62;
    for (let i = 0; i < 3; i++) {
      const z = ZB + 1.15 + i * 1.95;
      const fx = x + dir * 0.012;
      b.box('scGlass', 0.04, 1.52, 1.30, fx, y, z);
      b.box('scConL', 0.06, 0.10, 1.46, fx + dir * 0.012, y + 0.80, z);
      b.box('scConL', 0.06, 0.10, 1.46, fx + dir * 0.012, y - 0.80, z);
      b.box('scConL', 0.06, 1.70, 0.09, fx + dir * 0.012, y, z - 0.68);
      b.box('scConL', 0.06, 1.70, 0.09, fx + dir * 0.012, y, z + 0.68);
      b.box('scConW', 0.14, 0.08, 1.52, x + dir * 0.05, y - 0.86, z);
    }
    /* 楼层之间一道分隔线，立面才有层数 */
    b.box('scConL', 0.04, 0.07, ZF - ZB, x + dir * 0.012,
      SC_GY + k * S_FL + 0.10, (ZF + ZB) * 0.5);
  }
  /* 立面上的空调外机与落水管 */
  for (let i = 0; i < 3; i++) {
    const y = SC_GY + (0.6 + i * 2) * S_FL + 0.95;
    b.box('scMetal', 0.42, 0.54, 0.76, x + dir * 0.24, y, ZB + 4.55);
    b.box('scMetalD', 0.06, 0.44, 0.64, x + dir * 0.44, y, ZB + 4.55);
  }
  b.cyl('scMetalD', 0.06, 0.06, S_TOP - SC_GY, 7,
    x + dir * 0.12, (S_TOP + SC_GY) * 0.5, ZB + 0.42);
}

/* ------------------------------------------------------------ 电梯井与楼梯 */
function scCore(b) {
  const EX0 = 2.55, EX1 = 3.95, EZ0 = -2.35, EZ1 = -1.05;

  /* 井道：只砌三面，切面那面敞开，能看到轿厢 */
  scBlock(b, 'scConL', EX0, EX1, EZ0, EZ0 + 0.16, SC_GY, S_TOP);
  scBlock(b, 'scConL', EX0, EX0 + 0.14, EZ0, EZ1, SC_GY, S_TOP);
  scBlock(b, 'scConL', EX1 - 0.14, EX1, EZ0, EZ1, SC_GY, S_TOP);

  /* 轿厢停在第 3 层：红色厢体 + 内灯 + 楼层显示 */
  const cy = SC_GY + 2 * S_FL + 0.10;
  b.box('scElev', 1.24, 2.30, 1.16, (EX0 + EX1) * 0.5, cy + 1.15, (EZ0 + EZ1) * 0.5);
  b.box('scElevD', 1.24, 0.16, 1.16, (EX0 + EX1) * 0.5, cy + 0.08, (EZ0 + EZ1) * 0.5);
  b.box('scElevD', 1.10, 2.10, 0.05, (EX0 + EX1) * 0.5, cy + 1.15, EZ1 - 0.04);
  b.box('scNeonW', 0.80, 0.05, 0.05, (EX0 + EX1) * 0.5, cy + 2.22, EZ1 - 0.02);
  b.box('scNeonC', 0.34, 0.16, 0.04, (EX0 + EX1) * 0.5, cy + 2.42, EZ1 - 0.02);

  /* 井道钢缆 */
  for (let i = 0; i < 3; i++) {
    b.box('scMetalD', 0.02, S_TOP - cy - 2.4, 0.02,
      (EX0 + EX1) * 0.5 - 0.30 + i * 0.30, (S_TOP + cy + 2.4) * 0.5, (EZ0 + EZ1) * 0.5);
  }

  /* 楼梯：贴着左墙，每层两跑 + 一个平台 */
  for (let k = 0; k < S_N; k++) {
    const y = SC_GY + k * S_FL;
    const r1 = scSteps(b, 'scConD', -S_W + S_T + 0.10, -S_W + S_T + 1.32,
      0.05, y + 0.06, 7, 0.20, 0.232);
    /* 平台 */
    scBlock(b, 'scConD', -S_W + S_T + 0.10, -S_W + S_T + 1.32,
      r1[0] - 0.90, r1[0], y + r1[1] - 0.06, y + r1[1]);
    /* 第二跑朝回走 */
    const sh2 = new T.Shape();
    sh2.moveTo(r1[0] - 0.90, y + r1[1] - 0.06);
    let z2 = r1[0] - 0.90, y2 = y + r1[1] - 0.06;
    for (let i = 0; i < 7; i++) {
      z2 -= 0.20;
      sh2.lineTo(z2, y2);
      y2 += 0.232;
      sh2.lineTo(z2, y2);
    }
    sh2.lineTo(z2, y + r1[1] - 0.06);
    sh2.closePath();
    const g2 = new T.ExtrudeGeometry(sh2, {
      depth: 1.22, bevelEnabled: false, curveSegments: 1, steps: 1
    });
    g2.rotateY(-Math.PI * 0.5);
    g2.translate(-S_W + S_T + 1.32, 0, 0);
    b.add('scConD', g2);

    /* 扶手：一道斜线，够读就行 */
    b.to('scMetalD', 0.026, -S_W + S_T + 1.26, y + 0.96, 0.05,
      -S_W + S_T + 1.26, y + 2.62, r1[0] + 0.10, 5);
    b.to('scMetalD', 0.026, -S_W + S_T + 1.26, y + 2.62, r1[0] - 0.10,
      -S_W + S_T + 1.26, y + 3.84, r1[0] - 0.95, 5);
  }
}

/* ------------------------------------------------------------ 人物 */
/* 城市剖面居民：体素方块小人，站在切面附近才看得见。 */
function scPed(b, x, y, z, ry, key, skin, pose) {
  buildFig({
    b: b, x: x, y: y, z: z, ry: ry,
    pose: pose === 'sit' ? 'sit' : 'stand',
    coat: key, pants: 'scClothB', skin: skin, hair: 'scHair',
    ink: 'scHair', belt: 'scClothB', shoe: 'scHair'
  });
}

/* ------------------------------------------------------------ 室内：每层一种生活 */
function scFloor(b, k) {
  const y0 = SC_GY + k * S_FL + 0.02;
  const ZB = S_ZB + S_T, ZF = S_ZF;
  const XL = -S_W + S_T, XR = S_W - S_T;

  /* 地面材质每层不同；靠切面一条踢脚线，边界才清 */
  scBlock(b, 'scFl' + k, XL, XR, ZB, ZF, y0 - 0.03, y0);
  b.box('scSkirt', XR - XL, 0.10, 0.035, 0, y0 + 0.05, ZF - 0.02);

  /* 顶棚：暗色顶面 + 一排筒灯（靠切面那排照出来） */
  b.box('scCeil', XR - XL, 0.04, ZF - ZB, 0, y0 + S_FL - S_SL - 0.06, (ZB + ZF) * 0.5);
  for (let i = 0; i < 3; i++) {
    b.box('scNeonW', 0.30, 0.05, 0.30, XL + 1.4 + i * 2.8,
      y0 + S_FL - S_SL - 0.10, ZF - 1.5);
  }

  /* 后墙踢脚 */
  b.box('scSkirt', XR - XL, 0.16, 0.03, 0, y0 + 0.08, ZB + 0.02);

  /* 墙上的画：一堵空墙挂两幅画，室内立刻有「住过人」的味道 */
  const art = ['scArt1', 'scArt2', 'scArt3'];
  const aw = 0.62 + scR(k * 3.3) * 0.34;
  b.box('scArtF', aw + 0.10, 0.50 + scR(k * 5.7) * 0.22, 0.04,
    -S_W + 1.30 + scR(k * 7.1) * 1.20, y0 + 1.84, ZB + 0.05);
  b.box(art[k % 3], aw, 0.42 + scR(k * 5.7) * 0.20, 0.03,
    -S_W + 1.30 + scR(k * 7.1) * 1.20, y0 + 1.84, ZB + 0.075);
  b.box('scArtF', 0.44, 0.62, 0.04, S_W - 1.55, y0 + 1.72, ZB + 0.05);
  b.box(art[(k + 1) % 3], 0.36, 0.54, 0.03, S_W - 1.55, y0 + 1.72, ZB + 0.075);

  if (k === 0) {
    /* ---- 一层：便利店 + 咖啡吧 ---- */
    /* 岛式货架：立在店中间。贴后墙摆，上面那块楼板会把上半截整片切掉 */
    for (let i = 0; i < 3; i++) {
      const x = -3.45 + i * 1.42;
      b.box('scShelf', 1.16, 1.62, 0.44, x, y0 + 0.83, -3.05);
      for (let r = 0; r < 4; r++) {
        b.box('scShelfD', 1.12, 0.05, 0.50, x, y0 + 0.26 + r * 0.40, -3.05);
        for (let c = 0; c < 4; c++) {
          b.box(['scGoodsA', 'scGoodsB', 'scGoodsC'][(r + c + i) % 3],
            0.20, 0.22, 0.32, x - 0.42 + c * 0.28,
            y0 + 0.39 + r * 0.40, -3.05);
        }
      }
    }
    /* 冷柜 */
    b.box('scFridge', 1.10, 1.94, 0.58, 2.95, y0 + 0.98, -3.55, 0, Math.PI * 0.5, 0);
    b.box('scGlass', 0.04, 1.76, 1.00, 2.65, y0 + 1.00, -3.55);
    for (let i = 0; i < 3; i++) {
      b.box('scNeonC', 0.05, 0.04, 0.98, 2.64, y0 + 0.28 + i * 0.58, -3.55);
    }
    /* 收银台 */
    b.box('scCounter', 2.30, 0.98, 0.72, -1.20, y0 + 0.49, -1.05);
    b.box('scCounterD', 2.34, 0.10, 0.78, -1.20, y0 + 0.98, -1.05);
    b.box('scMetal', 0.42, 0.30, 0.34, -1.95, y0 + 1.14, -1.05);
    b.box('scNeonC', 0.34, 0.16, 0.03, -1.95, y0 + 1.26, -0.86);
    /* 咖啡吧：吧台 + 两台机器 + 高脚凳 */
    b.box('scCounter', 2.10, 1.06, 0.68, 2.55, y0 + 0.53, -2.15);
    b.box('scMetal', 0.52, 0.56, 0.44, 2.10, y0 + 1.34, -2.15);
    b.box('scMetalD', 0.46, 0.34, 0.38, 2.92, y0 + 1.22, -2.15);
    for (let i = 0; i < 3; i++) {
      const x = 1.90 + i * 0.66;
      b.cyl('scMetalD', 0.035, 0.035, 0.62, 6, x, y0 + 0.31, -1.55);
      b.sph('scStool', 0.16, x, y0 + 0.66, -1.55, 1, 0.42, 1);
    }
    /* 门头的菜单灯箱：一层原来太暗，一块自发光板就够把它点亮 */
    b.box('scMenuBox', 1.42, 0.60, 0.07, -1.95, y0 + 2.46, -0.72);
    b.box('scNeonW', 1.32, 0.50, 0.03, -1.95, y0 + 2.46, -0.68);
    for (let i = 0; i < 3; i++) {
      b.box('scMenuLine', 0.96, 0.05, 0.02, -1.95, y0 + 2.60 - i * 0.15, -0.66);
    }
    /* 门口地垫与两人 */
    b.box('scRug', 1.90, 0.02, 1.10, 0.55, y0 + 0.015, -3.95);
    scPed(b, -0.55, y0, -1.95, 2.9, 'scShirtA', 'scSkin1');
    scPed(b, 0.10, y0, -1.70, 3.5, 'scShirtB', 'scSkin2');
    scPed(b, -1.35, y0, -0.72, 0.1, 'scShirtC', 'scSkin1', 'sit');
  } else if (k === 1) {
    /* ---- 二层：联合办公 ---- */
    for (let i = 0; i < 2; i++) {
      const z = -3.55 + i * 2.05;
      b.box('scDesk', 5.60, 0.08, 1.05, -0.55, y0 + 0.74, z);
      for (let j = 0; j < 2; j++) {
        const lx = j ? 2.05 : -3.15;
        b.box('scMetalD', 0.10, 0.72, 0.90, -0.55 + lx * 0.5 + (j ? 0 : 0), y0 + 0.36, z);
      }
      for (let m = 0; m < 4; m++) {
        const x = -3.05 + m * 1.60;
        b.box('scMetalD', 0.06, 0.34, 0.30, x, y0 + 1.06, z - 0.22);
        b.box('scNeonC', 0.52, 0.30, 0.02, x, y0 + 1.06, z - 0.375);
        b.box('scMetalD', 0.24, 0.02, 0.16, x, y0 + 0.86, z - 0.16);
        /* 椅子 */
        b.box('scChair', 0.42, 0.07, 0.42, x, y0 + 0.45, z + 0.62);
        b.box('scChair', 0.42, 0.44, 0.07, x, y0 + 0.66, z + 0.82);
        b.to('scMetalD', 0.022, x, y0 + 0.44, z + 0.62, x, y0 + 0.02, z + 0.68, 5);
      }
    }
    /* 白板 + 会议区 */
    b.box('scBoard', 0.10, 1.30, 2.20, -3.85, y0 + 2.00, -5.30);
    b.box('scBoardD', 0.13, 1.36, 2.26, -3.87, y0 + 2.00, -5.30);
    b.box('scDesk', 1.90, 0.07, 0.90, 0.55, y0 + 0.74, -5.55);
    /* 绿植与一盏落地灯 */
    b.cyl('scPot', 0.24, 0.20, 0.42, 8, 3.35, y0 + 0.21, -5.55);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.6;
      b.sph(i % 2 ? 'scLeaf1' : 'scLeaf2', 0.30,
        3.35 + Math.cos(a) * 0.20, y0 + 0.62 + i * 0.12, -5.55 + Math.sin(a) * 0.20,
        1.1, 0.8, 1.05);
    }
    b.cyl('scMetalD', 0.035, 0.035, 1.55, 6, 3.55, y0 + 0.78, -1.35);
    b.cyl('scLampShade', 0.26, 0.16, 0.26, 10, 3.55, y0 + 1.62, -1.35);
    scPed(b, -1.30, y0, -1.75, 3.1, 'scShirtD', 'scSkin2');
    scPed(b, 1.05, y0, -1.10, 3.4, 'scShirtA', 'scSkin1', 'sit');
  } else if (k === 2) {
    /* ---- 三层：健身房 ---- */
    for (let i = 0; i < 3; i++) {
      const x = -3.15 + i * 1.85;
      b.box('scGym', 0.78, 0.22, 1.90, x, y0 + 0.42, -3.35);
      b.box('scGymD', 0.66, 0.10, 1.30, x, y0 + 0.56, -3.35);
      b.to('scMetalD', 0.035, x, y0 + 0.50, -4.02, x, y0 + 1.42, -3.70, 5);
      b.box('scMetalD', 0.50, 0.06, 0.06, x, y0 + 1.42, -3.70);
      b.box('scNeonC', 0.34, 0.20, 0.03, x, y0 + 1.24, -3.60);
    }
    /* 哑铃架 */
    b.box('scMetalD', 2.10, 0.14, 0.62, -1.55, y0 + 0.62, -2.15);
    for (let i = 0; i < 5; i++) {
      b.cyl('scMetal', 0.10, 0.10, 0.34, 8, -2.35 + i * 0.40, y0 + 0.78, -2.15,
        0, 0, Math.PI * 0.5);
    }
    /* 镜墙 + 训练区地胶 */
    b.box('scMirror', 3.60, 2.10, 0.05, 2.20, y0 + 1.35, -6.45);
    b.box('scMatG', 3.10, 0.02, 2.10, 2.20, y0 + 0.015, -4.75);
    /* 沙袋 */
    b.cyl('scMetalD', 0.05, 0.05, 0.70, 6, 3.65, y0 + 2.55, -3.60);
    b.cyl('scBag', 0.26, 0.26, 1.10, 10, 3.65, y0 + 1.65, -3.60);
    scPed(b, -1.20, y0, -4.95, 3.1, 'scShirtB', 'scSkin2');
    scPed(b, 2.30, y0, -3.40, 1.2, 'scShirtA', 'scSkin1');
  } else if (k === 3) {
    /* ---- 四层：客厅 ---- */
    b.box('scRug', 3.60, 0.02, 2.70, -0.55, y0 + 0.015, -3.15);
    /* 沙发（背朝后墙，面朝切面） */
    b.box('scSofa', 2.60, 0.44, 0.92, -0.85, y0 + 0.24, -4.55);
    b.box('scSofa', 2.60, 0.52, 0.24, -0.85, y0 + 0.62, -4.96);
    b.box('scSofaD', 0.26, 0.46, 0.92, -2.28, y0 + 0.34, -4.55);
    b.box('scSofaD', 0.26, 0.46, 0.92, 0.58, y0 + 0.34, -4.55);
    for (let i = 0; i < 2; i++) {
      b.box('scCushion', 0.56, 0.34, 0.20, -1.55 + i * 1.40, y0 + 0.52, -4.62, 0, 0.12, 0);
    }
    /* 茶几 + 书本 */
    b.box('scWood', 1.50, 0.36, 0.80, -0.85, y0 + 0.20, -3.15);
    b.box('scWoodL', 1.56, 0.07, 0.86, -0.85, y0 + 0.40, -3.15);
    b.box('scBookA', 0.30, 0.05, 0.24, -1.15, y0 + 0.45, -3.20, 0, 0.3, 0);
    b.cyl('scPot', 0.10, 0.08, 0.16, 8, -0.35, y0 + 0.50, -3.05);
    /* 电视 + 电视柜（贴后墙） */
    b.box('scWood', 2.20, 0.40, 0.46, 1.05, y0 + 0.20, -6.15);
    b.box('scGlass', 2.00, 1.10, 0.06, 1.05, y0 + 1.30, -6.30);
    b.box('scMetalD', 1.60, 0.10, 0.10, 1.05, y0 + 0.78, -6.22);
    /* 落地灯 + 书架 */
    b.cyl('scMetalD', 0.035, 0.035, 1.62, 6, -3.05, y0 + 0.82, -5.60);
    b.cyl('scLampShade', 0.30, 0.18, 0.30, 10, -3.05, y0 + 1.72, -5.60);
    b.box('scShelf', 1.30, 1.90, 0.36, 3.55, y0 + 0.96, -5.70);
    for (let r = 0; r < 3; r++) {
      b.box('scShelfD', 1.26, 0.05, 0.40, 3.55, y0 + 0.42 + r * 0.52, -5.70);
      for (let c = 0; c < 5; c++) {
        b.box(['scBookA', 'scBookB', 'scBookC'][(r + c) % 3],
          0.09, 0.28, 0.28, 3.12 + c * 0.20, y0 + 0.62 + r * 0.52, -5.70);
      }
    }
    scPed(b, -2.05, y0, -4.45, 0.2, 'scShirtC', 'scSkin1', 'sit');
    scPed(b, 1.35, y0, -3.35, 4.2, 'scShirtD', 'scSkin2');
  } else if (k === 4) {
    /* ---- 五层：卧室 + 书桌 ---- */
    /* 床：床头靠左墙 */
    b.box('scBedBase', 2.05, 0.42, 1.62, -2.35, y0 + 0.21, -4.55);
    b.box('scBed', 2.05, 0.26, 1.58, -2.35, y0 + 0.52, -4.55);
    b.box('scQuilt', 1.42, 0.22, 1.62, -2.10, y0 + 0.70, -4.55, 0, 0, -0.03);
    b.box('scPillow', 0.46, 0.18, 1.10, -3.05, y0 + 0.76, -4.55);
    b.box('scWoodD', 0.14, 1.10, 1.72, -3.42, y0 + 0.55, -4.55);
    /* 床头柜 + 台灯 */
    b.box('scWood', 0.48, 0.46, 0.44, -3.20, y0 + 0.23, -3.30);
    b.cyl('scMetalD', 0.028, 0.028, 0.34, 6, -3.20, y0 + 0.62, -3.30);
    b.cyl('scLampShade', 0.17, 0.12, 0.22, 10, -3.20, y0 + 0.84, -3.30);
    /* 衣柜 */
    b.box('scWardrobe', 0.62, 2.10, 1.85, -3.86, y0 + 1.06, -5.55);
    b.box('scWardrobeD', 0.05, 2.06, 0.04, -3.54, y0 + 1.06, -5.55);
    for (let i = 0; i < 2; i++) {
      b.cyl('scMetalL', 0.022, 0.022, 0.44, 6, -3.52, y0 + 1.06, -5.75 + i * 0.42);
    }
    /* 书桌朝切面 */
    b.box('scDesk', 1.90, 0.07, 0.70, 1.35, y0 + 0.74, -1.60);
    for (let i = 0; i < 2; i++) {
      b.box('scMetalD', 0.07, 0.72, 0.62, 0.48 + i * 1.74, y0 + 0.36, -1.60);
    }
    b.box('scNeonC', 0.56, 0.34, 0.03, 1.35, y0 + 1.08, -1.90);
    b.box('scChair', 0.44, 0.07, 0.44, 1.35, y0 + 0.46, -1.02);
    b.box('scChair', 0.44, 0.46, 0.07, 1.35, y0 + 0.68, -0.82);
    b.cyl('scPot', 0.11, 0.09, 0.18, 8, 2.55, y0 + 0.85, -1.85);
    for (let i = 0; i < 3; i++) {
      b.sph(i % 2 ? 'scLeaf1' : 'scLeaf2', 0.16,
        2.55 + (i - 1) * 0.12, y0 + 1.02 + i * 0.06, -1.85, 1.1, 0.8, 1);
    }
    b.box('scRug2', 2.20, 0.02, 1.50, 1.35, y0 + 0.015, -2.65);
    scPed(b, 1.55, y0, -2.55, 3.3, 'scShirtA', 'scSkin2');
    scPed(b, -2.30, y0, -4.40, 1.6, 'scShirtD', 'scSkin1', 'sit');
  } else {
    /* ---- 六层：工作室 + 屋顶花园 ---- */
    /* 大工作台 */
    b.box('scDesk', 3.30, 0.08, 1.20, -1.10, y0 + 0.80, -3.40);
    for (let i = 0; i < 3; i++) {
      b.box('scMetalD', 0.08, 0.78, 1.10, -2.60 + i * 1.50, y0 + 0.40, -3.40);
    }
    /* 台面上的东西：卷起的图纸、模型、显示器 */
    for (let i = 0; i < 3; i++) {
      b.cyl('scPaper', 0.07, 0.07, 0.90, 8, -2.10 + i * 0.55, y0 + 0.90, -3.15,
        0, 0, Math.PI * 0.5);
    }
    b.box('scMetalD', 0.06, 0.34, 0.30, 0.95, y0 + 1.12, -3.55);
    b.box('scNeonC', 0.54, 0.30, 0.02, 0.95, y0 + 1.12, -3.71);
    b.box('scModelBase', 0.90, 0.10, 0.90, -0.95, y0 + 0.90, -3.05);
    for (let i = 0; i < 3; i++) {
      b.box('scModel', 0.24, 0.30 + i * 0.10, 0.24,
        -1.20 + i * 0.28, y0 + 1.05 + i * 0.05, -3.05);
    }
    /* 画架 */
    b.to('scWood', 0.032, 2.15, y0 + 0.02, -2.30, 2.32, y0 + 1.55, -2.42, 5);
    b.to('scWood', 0.032, 2.62, y0 + 0.02, -2.30, 2.45, y0 + 1.55, -2.42, 5);
    b.to('scWood', 0.030, 2.38, y0 + 0.02, -2.05, 2.38, y0 + 1.50, -2.40, 5);
    b.box('scCanvas', 0.86, 1.06, 0.05, 2.38, y0 + 1.28, -2.46, 0, 0, -0.04);
    /* 书架 + 植物 */
    b.box('scShelf', 1.10, 1.80, 0.34, 3.55, y0 + 0.92, -5.80);
    for (let r = 0; r < 3; r++) {
      b.box('scShelfD', 1.06, 0.05, 0.38, 3.55, y0 + 0.42 + r * 0.50, -5.80);
      for (let c = 0; c < 4; c++) {
        b.box(['scBookA', 'scBookB', 'scBookC'][(r + c + 1) % 3],
          0.12, 0.26, 0.26, 3.18 + c * 0.24, y0 + 0.60 + r * 0.50, -5.80);
      }
    }
    for (let i = 0; i < 3; i++) {
      b.cyl('scPot', 0.16, 0.13, 0.28, 8, -3.40 + i * 0.62, y0 + 0.14, -1.30);
      for (let j = 0; j < 3; j++) {
        b.sph(j % 2 ? 'scLeaf1' : 'scLeaf2', 0.24,
          -3.40 + i * 0.62 + (j - 1) * 0.10, y0 + 0.48 + j * 0.10, -1.30,
          1.1, 0.85, 1.05);
      }
    }
    /* 天窗：屋面上开两个洞，切成可见的玻璃框 */
    b.box('scGlassW', 1.40, 0.06, 1.60, -1.60, y0 + S_FL - S_SL + 0.05, -4.20);
    b.box('scGlassW', 1.40, 0.06, 1.60, 2.10, y0 + S_FL - S_SL + 0.05, -4.20);
    scPed(b, -1.95, y0, -2.55, 0.4, 'scShirtB', 'scSkin2');
    scPed(b, 2.60, y0, -2.90, 2.7, 'scShirtC', 'scSkin1');
  }
}

/* ------------------------------------------------------------ 右侧三层小楼 */
function scShop(b) {
  const X0 = SH_X0, X1 = SH_X1, Z0 = SH_Z0, Z1 = SH_Z1;
  const TOP = SC_GY + SH_N * SH_FL;

  /* 背墙与两侧墙 */
  scBlock(b, 'scCream', X0, X1, Z0, Z0 + 0.30, SC_GY - 0.30, TOP);
  scBlock(b, 'scCream', X0, X0 + 0.28, Z0, Z1, SC_GY - 0.30, TOP);
  scBlock(b, 'scCream', X1 - 0.28, X1, Z0, Z1, SC_GY - 0.30, TOP);

  /* 楼板 + 切面 */
  for (let k = 0; k <= SH_N; k++) {
    const y = SC_GY + k * SH_FL;
    scBlock(b, 'scConD', X0, X1, Z0 + 0.30, Z1, y - 0.22, y);
    b.box('scCut', X1 - X0, 0.20, 0.04, (X0 + X1) * 0.5, y - 0.11, Z1 + 0.02);
  }

  /* 屋顶：女儿墙 + 花箱 */
  b.box('scCream', X1 - X0, 0.40, 0.20, (X0 + X1) * 0.5, TOP + 0.20, Z1 - 0.10);
  b.box('scBrickW', X1 - X0, 0.46, 0.24, (X0 + X1) * 0.5, TOP + 0.23, Z0 + 0.42);
  for (let i = 0; i < 3; i++) {
    b.box('scPot', 0.62, 0.34, 0.34, X0 + 0.75 + i * 1.25, TOP + 0.17, Z1 - 0.62);
    for (let j = 0; j < 3; j++) {
      b.sph(j % 2 ? 'scLeaf1' : 'scLeaf3', 0.20,
        X0 + 0.75 + i * 1.25 + (j - 1) * 0.16, TOP + 0.48, Z1 - 0.62, 1.05, 0.9, 1);
    }
  }

  /* 一层：花店（台面全部靠切面摆，不然全藏在板底下） */
  let y0 = SC_GY + 0.02;
  scBlock(b, 'scFl0', X0 + 0.28, X1 - 0.28, Z0 + 0.30, Z1, y0 - 0.03, y0);
  for (let i = 0; i < 3; i++) {
    const x = X0 + 0.85 + i * 1.12;
    b.box('scMetalD', 0.86, 0.10, 0.62, x, y0 + 0.56, -1.85);
    b.box('scMetalD', 0.86, 0.62, 0.10, x, y0 + 0.86, -2.14);
    for (let j = 0; j < 5; j++) {
      b.cyl('scLeaf3', 0.035, 0.030, 0.34, 5,
        x - 0.30 + j * 0.15, y0 + 0.78, -1.85 + (j % 2) * 0.12);
      b.sph(['scFlA', 'scFlB', 'scFlC', 'scFlD'][j % 4], 0.10,
        x - 0.30 + j * 0.15, y0 + 0.96, -1.85 + (j % 2) * 0.12, 1, 0.7, 1);
    }
  }
  b.box('scCounter', 1.40, 0.94, 0.62, X1 - 1.35, y0 + 0.47, -1.45);
  b.box('scWoodD', 0.60, 0.34, 0.30, X1 - 1.35, y0 + 1.06, -1.45);
  b.box('scNeonC', 0.44, 0.22, 0.03, X1 - 1.35, y0 + 1.28, -1.16);
  /* 门口外摆：三个花桶，摆在切面外面的人行道上 */
  for (let i = 0; i < 3; i++) {
    const x = X0 + 0.55 + i * 0.72;
    b.cyl('scBucket', 0.16, 0.13, 0.36, 8, x, SC_GY + 0.32, Z1 + 0.42);
    for (let j = 0; j < 4; j++) {
      const a = j * 1.6;
      b.cyl('scLeaf3', 0.02, 0.02, 0.40, 4,
        x + Math.cos(a) * 0.06, SC_GY + 0.70, Z1 + 0.42 + Math.sin(a) * 0.06);
      b.sph(['scFlA', 'scFlB', 'scFlC', 'scFlD'][(i + j) % 4], 0.07,
        x + Math.cos(a) * 0.07, SC_GY + 0.92, Z1 + 0.42 + Math.sin(a) * 0.07, 1, 0.7, 1);
    }
  }
  /* 招牌 */
  b.box('scSignA', 3.20, 0.52, 0.12, (X0 + X1) * 0.5, SC_GY + 2.78, Z1 + 0.06);
  for (let i = 0; i < 5; i++) {
    b.box('scPaintW', 0.30, 0.26, 0.03, X0 + 0.95 + i * 0.55, SC_GY + 2.78, Z1 + 0.13);
  }

  /* 二层：理发店 */
  y0 = SC_GY + SH_FL + 0.02;
  scBlock(b, 'scFl2', X0 + 0.28, X1 - 0.28, Z0 + 0.30, Z1, y0 - 0.03, y0);
  for (let i = 0; i < 2; i++) {
    const x = X0 + 1.30 + i * 1.75;
    b.box('scChair', 0.56, 0.10, 0.56, x, y0 + 0.52, -1.55);
    b.box('scChair', 0.56, 0.58, 0.12, x, y0 + 0.82, -1.82);
    b.cyl('scMetalD', 0.05, 0.05, 0.50, 6, x, y0 + 0.26, -1.55);
    b.cyl('scMetalD', 0.28, 0.28, 0.04, 10, x, y0 + 0.03, -1.55);
    /* 镜台就在椅子正前方（朝切面） */
    b.box('scMirror', 0.86, 1.10, 0.05, x, y0 + 1.46, -2.55);
    b.box('scCounter', 0.92, 0.82, 0.34, x, y0 + 0.41, -2.55);
  }
  b.box('scCounter', 1.30, 0.94, 0.58, X1 - 1.00, y0 + 0.47, -0.72);
  for (let i = 0; i < 3; i++) {
    b.box('scNeonC', 0.80, 0.10, 0.04, X0 + 1.30 + i * 1.72, y0 + 2.56, -0.60);
  }
  scPed(b, X0 + 1.30, y0, -1.22, 0.1, 'scShirtD', 'scSkin2', 'sit');
  scPed(b, X0 + 3.05, y0, -2.05, 3.1, 'scShirtA', 'scSkin1');

  /* 三层：住户 */
  y0 = SC_GY + SH_FL * 2 + 0.02;
  scBlock(b, 'scFl4', X0 + 0.28, X1 - 0.28, Z0 + 0.30, Z1, y0 - 0.03, y0);
  /* 床：床头贴左墙 */
  b.box('scBedBase', 1.72, 0.36, 1.38, X0 + 1.28, y0 + 0.18, -2.05);
  b.box('scBed', 1.72, 0.24, 1.34, X0 + 1.28, y0 + 0.46, -2.05);
  b.box('scQuilt', 1.12, 0.20, 1.36, X0 + 1.58, y0 + 0.62, -2.05, 0, 0, 0);
  b.box('scPillow', 0.40, 0.16, 1.00, X0 + 0.66, y0 + 0.66, -2.05);
  b.box('scWoodD', 0.12, 1.02, 1.46, X0 + 0.40, y0 + 0.48, -2.05);
  b.box('scWood', 0.42, 0.44, 0.42, X0 + 0.58, y0 + 0.22, -0.85);
  b.cyl('scMetalD', 0.024, 0.024, 0.30, 6, X0 + 0.58, y0 + 0.60, -0.85);
  b.cyl('scLampShade', 0.14, 0.10, 0.20, 10, X0 + 0.58, y0 + 0.80, -0.85);
  /* 书桌 */
  b.box('scDesk', 1.10, 0.06, 0.62, X1 - 1.25, y0 + 0.74, -1.60);
  for (let i = 0; i < 2; i++) {
    b.box('scMetalD', 0.06, 0.72, 0.56, X1 - 1.75 + i * 1.00, y0 + 0.37, -1.60);
  }
  b.box('scChair', 0.40, 0.06, 0.40, X1 - 1.25, y0 + 0.44, -2.15);
  b.box('scChair', 0.40, 0.42, 0.06, X1 - 1.25, y0 + 0.64, -2.33);
  b.box('scGlass', 0.60, 0.40, 0.04, X1 - 1.25, y0 + 0.96, -1.85);
  b.box('scRug2', 1.60, 0.02, 1.10, X1 - 1.55, y0 + 0.014, -3.30);
  scPed(b, X1 - 1.25, y0, -2.55, 3.2, 'scShirtB', 'scSkin1');

  /* 楼间的一线天空：小楼与主楼之间留的窄缝，种一丛爬藤 */
  for (let i = 0; i < 6; i++) {
    b.cyl('scLeaf2', 0.02, 0.02, 1.10, 4,
      S_W + 0.30 + scR(i * 3.7) * 0.42, SC_GY + 0.55 + i * 0.30,
      -1.60 + scR(i * 5.1) * 1.60);
    b.sph(i % 2 ? 'scLeaf1' : 'scLeaf3', 0.16,
      S_W + 0.42 + scR(i * 7.3) * 0.30, SC_GY + 1.05 + i * 0.30,
      -1.60 + scR(i * 9.7) * 1.60, 1.1, 0.8, 1);
  }
}

/* ------------------------------------------------------------ 左侧广场 */
function scPlaza(b) {
  const X0 = SC_X0, X1 = -S_W - 0.30;
  scBlock(b, 'scPaving', X0, X1, SC_Z0, SC_ZH, SC_GY - 0.06, SC_GY);

  /* 铺装分缝 */
  for (let i = 0; i < 7; i++) {
    b.box('scPavingD', X1 - X0, 0.012, 0.05, (X0 + X1) * 0.5, SC_GY + 0.002,
      SC_Z0 + 0.9 + i * 1.55);
  }
  for (let i = 0; i < 4; i++) {
    b.box('scPavingD', 0.05, 0.012, SC_ZH - SC_Z0, X0 + 0.9 + i * 1.35,
      SC_GY + 0.002, (SC_Z0 + SC_ZH) * 0.5);
  }

  /* 广场中心一块圆形花坛：三圈矮墙 + 一棵树 + 花 */
  const cx = -7.05, cz = -1.55;
  b.cyl('scStoneW', 1.32, 1.38, 0.42, 20, cx, SC_GY + 0.21, cz);
  b.cyl('scSoil1', 1.10, 1.10, 0.06, 20, cx, SC_GY + 0.40, cz);
  scTree(b, cx, cz, 3.90, 1.35);
  for (let i = 0; i < 14; i++) {
    const a = scR(i * 3.3) * 6.283;
    const r = 0.35 + scR(i * 5.7) * 0.62;
    b.sph(['scFlA', 'scFlB', 'scFlC', 'scFlD'][i % 4], 0.09,
      cx + Math.cos(a) * r, SC_GY + 0.48, cz + Math.sin(a) * r, 1, 0.7, 1);
  }

  /* 两张长椅（对着花坛） */
  for (let i = 0; i < 2; i++) {
    const z = cz + (i ? 2.10 : -2.10);
    b.box('scWood', 2.00, 0.07, 0.42, cx, SC_GY + 0.44, z);
    b.box('scWood', 0.42, 0.07, 0.44, cx - 1.20, SC_GY + 0.22, z, 0, 0, Math.PI * 0.5);
    for (let j = 0; j < 2; j++) {
      b.box('scMetalD', 0.07, 0.44, 0.40, cx + (j ? 0.80 : -0.80), SC_GY + 0.22, z);
    }
  }

  /* 一盏草坪灯 + 一个垃圾分类亭 */
  b.cyl('scMetalD', 0.04, 0.04, 1.40, 6, X0 + 0.85, SC_GY + 0.70, 2.35);
  b.cyl('scLampShade', 0.20, 0.13, 0.22, 10, X0 + 0.85, SC_GY + 1.46, 2.35);
  b.box('scShed', 1.55, 1.28, 0.92, X0 + 1.15, SC_GY + 0.64, -4.85);
  b.box('scShedD', 1.65, 0.10, 1.02, X0 + 1.15, SC_GY + 1.32, -4.85);
  for (let i = 0; i < 2; i++) {
    b.cyl('scMetalD', 0.16, 0.14, 0.42, 8, X0 + 0.85 + i * 0.62, SC_GY + 0.21, -4.55);
  }

  /* 广场与楼之间的窄巷：堆几个纸箱与一辆推车 */
  b.box('scCarton', 0.44, 0.36, 0.40, -4.98, SC_GY + 0.18, -5.55);
  b.box('scCarton', 0.36, 0.30, 0.34, -4.95, SC_GY + 0.50, -5.62, 0, 0.28, 0);
  b.box('scCarton', 0.40, 0.32, 0.36, -4.72, SC_GY + 0.16, -4.95, 0, 0.6, 0);
  for (let i = 0; i < 2; i++) {
    b.torus('scTire', 0.16, 0.035, -5.20, SC_GY + 0.18, -3.60 + i * 0.62, 0, 0, 0);
  }
  b.box('scMetalL', 0.60, 0.05, 0.62, -5.20, SC_GY + 0.36, -3.30);
  b.to('scMetalL', 0.022, -5.20, SC_GY + 0.36, -3.00, -5.20, SC_GY + 0.86, -2.70, 5);
  b.box('scMetalL', 0.30, 0.04, 0.30, -5.20, SC_GY + 0.88, -2.68);
}

/* ------------------------------------------------------------ 左邻：四层小楼 */
/* 只做剖切面这一侧：它和主楼之间留 0.9 米缝，两栋楼才分得开。
   一栋楼只是「楼剖面」，两栋才是「城市剖面」。 */
function scLeftBlock(b) {
  const X0 = -9.35, X1 = -5.45, ZB = -6.30, ZF = 0.10;
  const FL = 3.05, N = 4, T = 0.30;
  const TOP = SC_GY + N * FL;
  const XL = X0 + T, XR = X1 - T;

  /* 后墙、左外墙、右外墙（右墙朝主楼，只有一条缝，但得在） */
  /* 立面用砖：一条街上三栋楼全是同一种水泥色，最先垮掉的就是「城市」这件事 */
  scBlock(b, 'scBrickW2', X0, X1, ZB, ZB + T, SC_GY - 0.26, TOP);
  scBlock(b, 'scBrickW2', X0, X0 + T, ZB + T, ZF, SC_GY - 0.26, TOP);
  scBlock(b, 'scBrickW2', X1 - T, X1, ZB + T, ZF, SC_GY - 0.26, TOP);

  /* 楼板与切面 */
  for (let k = 0; k <= N; k++) {
    const y = SC_GY + k * FL;
    scBlock(b, 'scConD', X0, X1, ZB + T, ZF, y - 0.22, y);
    b.box('scCut', X1 - X0, 0.20, 0.04, (X0 + X1) * 0.5, y - 0.11, ZF + 0.02);
    for (let i = 0; i < 5; i++) {
      b.box('scStoneP', 0.05, 0.04, 0.03,
        X0 + 0.55 + scR(k * 5.1 + i * 2.3) * (X1 - X0 - 1.1),
        y - 0.11 + (scR(k * 7.3 + i) - 0.5) * 0.10, ZF + 0.042);
    }
  }

  /* 屋顶：女儿墙 + 晒衣绳 + 太阳能热水器 */
  b.box('scBrickW2', X1 - X0, 0.44, 0.20, (X0 + X1) * 0.5, TOP + 0.22, ZF - 0.10);
  b.box('scBrickW2', X1 - X0, 0.44, 0.20, (X0 + X1) * 0.5, TOP + 0.22, ZB + 0.42);
  b.box('scBrickW2', 0.20, 0.44, ZF - ZB, X0 + 0.10, TOP + 0.22, (ZF + ZB) * 0.5);
  for (let i = 0; i < 2; i++) {
    b.cyl('scMetalD', 0.035, 0.035, 2.30, 6, X0 + 0.75 + i * 1.55, TOP + 1.15, ZB + 2.20);
  }
  b.to('scRope', 0.012, X0 + 0.55, TOP + 1.62, ZB + 2.20,
    X0 + 2.35, TOP + 1.58, ZB + 2.20, 4);
  for (let i = 0; i < 4; i++) {
    b.box(['scClothA', 'scClothB', 'scClothC', 'scClothA'][i], 0.38, 0.62, 0.03,
      X0 + 0.85 + i * 0.42, TOP + 1.32, ZB + 2.21);
  }
  b.box('scMetal', 1.30, 0.12, 0.90, X1 - 1.30, TOP + 0.72, ZB + 1.30, 0.42, 0, 0);
  b.box('scMetalD', 1.10, 0.30, 0.70, X1 - 1.30, TOP + 0.55, ZB + 1.70);

  /* ---- 一层：门厅 + 快递柜 + 自行车 ---- */
  /* ★ 剖面里的家具必须靠切面摆。摆在后墙边，上面那块楼板会把它整片挡住 ——
     剖面模型最容易犯的错，就是一屋子东西全藏在板底下。 */
  let y0 = SC_GY + 0.02;
  scBlock(b, 'scFl2', XL, XR, ZB + T, ZF, y0 - 0.03, y0);
  /* 快递柜：贴着右墙，正面朝切面 */
  b.box('scLocker', 1.10, 1.85, 0.44, XR - 0.60, y0 + 0.94, -1.55, 0, Math.PI * 0.5, 0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      b.box('scLockerD', 0.04, 0.44, 0.30, XR - 0.82,
        y0 + 0.42 + r * 0.58, -2.00 + c * 0.34);
    }
  }
  /* 信箱墙：挂左墙，正对切面 */
  b.box('scMetalD', 0.50, 1.10, 0.14, XL + 0.30, y0 + 1.40, -1.90, 0, Math.PI * 0.5, 0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      b.box('scMetalL', 0.14, 0.28, 0.30, XL + 0.52,
        y0 + 1.02 + r * 0.34, -2.10 + c * 0.34);
    }
  }
  /* 后墙挂画 */
  b.box('scArtF', 0.60, 0.46, 0.04, (XL + XR) * 0.5, y0 + 1.72, ZB + 0.36);
  b.box('scArt2', 0.52, 0.38, 0.03, (XL + XR) * 0.5, y0 + 1.72, ZB + 0.385);
  /* 楼梯（贴左墙，一跑到顶） */
  for (let k = 0; k < N; k++) {
    const y = SC_GY + k * FL;
    scSteps(b, 'scConD', XL + 0.06, XL + 1.02, ZF - 0.75, y + 0.06, 8, 0.25, 0.372);
  }
  /* 自行车 + 门垫 */
  b.box('scRug', 1.40, 0.02, 0.90, XR - 1.05, y0 + 0.012, ZF - 0.85);
  b.torus('scTire', 0.28, 0.032, XR - 0.55, y0 + 0.42, ZF - 1.95, 0, 0, 0);
  b.torus('scTire', 0.28, 0.032, XR - 1.35, y0 + 0.42, ZF - 1.95, 0, 0, 0);
  b.to('scMetalL', 0.026, XR - 0.55, y0 + 0.42, ZF - 1.95, XR - 0.95, y0 + 0.84, ZF - 1.95, 5);
  b.to('scMetalL', 0.026, XR - 0.95, y0 + 0.84, ZF - 1.95, XR - 1.35, y0 + 0.42, ZF - 1.95, 5);
  b.box('scMetalL', 0.32, 0.04, 0.04, XR - 0.95, y0 + 0.86, ZF - 1.95);

  /* ---- 二层：厨房 + 餐桌 ---- */
  y0 = SC_GY + FL + 0.02;
  scBlock(b, 'scFl1', XL, XR, ZB + T, ZF, y0 - 0.03, y0);
  /* 灶台沿右墙一长条，台面朝室内 */
  b.box('scCounter', 0.64, 0.86, 2.55, XR - 0.34, y0 + 0.43, -1.85);
  b.box('scCounterD', 0.68, 0.08, 2.59, XR - 0.34, y0 + 0.88, -1.85);
  for (let i = 0; i < 2; i++) {
    b.cyl('scMetalD', 0.13, 0.13, 0.05, 10, XR - 0.34, y0 + 0.90, -1.10 - i * 0.86);
  }
  b.box('scMetalD', 0.26, 1.20, 0.44, XR - 0.62, y0 + 0.60, -0.62);
  /* 吊柜 + 油烟机 */
  b.box('scCabinet', 0.36, 0.60, 2.40, XR - 0.20, y0 + 2.10, -1.85);
  b.box('scMetalD', 0.44, 0.28, 0.66, XR - 0.66, y0 + 2.00, -1.10);
  /* 冰箱放到前角 */
  b.box('scFridge', 0.66, 1.70, 0.68, XR - 0.80, y0 + 0.85, -3.30);
  b.box('scFridgeD', 0.64, 0.03, 0.66, XR - 0.80, y0 + 1.04, -3.30);
  /* 餐桌四椅，摆在窗前 */
  b.box('scDesk', 0.94, 0.06, 1.34, XL + 1.35, y0 + 0.74, -1.55);
  for (let i = 0; i < 4; i++) {
    const cx = XL + 1.35 + (i < 2 ? -0.66 : 0.66);
    const cz = -1.55 + (i % 2 ? -0.40 : 0.40);
    b.box('scChair', 0.32, 0.06, 0.32, cx, y0 + 0.44, cz);
    b.box('scChair', 0.32, 0.40, 0.05, cx, y0 + 0.64, cz + (i % 2 ? -0.15 : 0.15));
    b.to('scMetalD', 0.018, cx, y0 + 0.42, cz, cx, y0 + 0.02, cz, 4);
  }
  b.cyl('scPot', 0.10, 0.08, 0.18, 8, XL + 0.30, y0 + 0.84, ZF - 0.55);
  for (let i = 0; i < 3; i++) {
    b.sph(i % 2 ? 'scLeaf1' : 'scLeaf3', 0.13,
      XL + 0.30 + (i - 1) * 0.09, y0 + 0.99 + i * 0.05, ZF - 0.55, 1.1, 0.8, 1);
  }
  scPed(b, XL + 1.62, y0, -3.00, 0.5, 'scShirtD', 'scSkin1');

  /* ---- 三层：卧室 ---- */
  y0 = SC_GY + FL * 2 + 0.02;
  scBlock(b, 'scFl4', XL, XR, ZB + T, ZF, y0 - 0.03, y0);
  /* 床：床头贴右墙，床身朝左伸，从切面一眼看到整张床 */
  b.box('scBedBase', 1.72, 0.36, 1.42, XR - 0.98, y0 + 0.18, -1.72);
  b.box('scBed', 1.72, 0.24, 1.38, XR - 0.98, y0 + 0.46, -1.72);
  b.box('scQuilt', 1.10, 0.20, 1.40, XR - 1.28, y0 + 0.62, -1.72, 0, 0, 0);
  b.box('scPillow', 0.40, 0.16, 1.04, XR - 0.36, y0 + 0.66, -1.72);
  b.box('scWoodD', 0.12, 1.02, 1.50, XR - 0.10, y0 + 0.48, -1.72);
  /* 床头柜 + 台灯 */
  b.box('scWood', 0.42, 0.44, 0.42, XR - 0.28, y0 + 0.22, -2.72);
  b.cyl('scMetalD', 0.024, 0.024, 0.30, 6, XR - 0.28, y0 + 0.60, -2.72);
  b.cyl('scLampShade', 0.14, 0.10, 0.20, 10, XR - 0.28, y0 + 0.80, -2.72);
  /* 衣柜只能贴后墙：摆在切面附近会把整层挡成一块木板 */
  b.box('scWardrobe', 1.16, 1.94, 0.50, XL + 2.35, y0 + 0.98, -3.30);
  b.box('scWardrobeD', 1.12, 1.90, 0.04, XL + 2.35, y0 + 0.98, -3.56);
  b.box('scWood', 0.50, 0.42, 0.46, XL + 0.55, y0 + 0.22, -2.55);
  b.cyl('scMetalD', 0.024, 0.024, 0.26, 6, XL + 0.55, y0 + 0.56, -2.55);
  b.cyl('scLampShade', 0.15, 0.11, 0.20, 10, XL + 0.55, y0 + 0.74, -2.55);
  b.box('scRug2', 1.40, 0.02, 0.90, XL + 1.45, y0 + 0.014, -1.05);
  scPed(b, XR - 1.05, y0, -1.72, 1.2, 'scShirtA', 'scSkin2', 'sit');

  /* ---- 四层：起居 + 露台门 ---- */
  y0 = SC_GY + FL * 3 + 0.02;
  scBlock(b, 'scFl3', XL, XR, ZB + T, ZF, y0 - 0.03, y0);
  /* 沙发面朝切面，背靠后墙 */
  b.box('scSofa', 1.86, 0.42, 0.84, XL + 1.35, y0 + 0.23, -3.55);
  b.box('scSofa', 1.86, 0.50, 0.22, XL + 1.35, y0 + 0.60, -3.95);
  b.box('scSofaD', 0.22, 0.44, 0.84, XL + 0.50, y0 + 0.32, -3.55);
  b.box('scSofaD', 0.22, 0.44, 0.84, XL + 2.20, y0 + 0.32, -3.55);
  b.box('scCushion', 0.42, 0.28, 0.16, XL + 0.95, y0 + 0.48, -3.60, 0, 0.10, 0);
  b.box('scCushion', 0.42, 0.28, 0.16, XL + 1.75, y0 + 0.48, -3.60, 0, -0.10, 0);
  /* 茶几 */
  b.box('scWood', 0.94, 0.32, 0.66, XL + 1.35, y0 + 0.18, -2.35);
  b.box('scWoodL', 1.00, 0.06, 0.72, XL + 1.35, y0 + 0.36, -2.35);
  /* 电视挂右墙 */
  b.box('scGlass', 0.06, 0.86, 1.30, XR - 0.06, y0 + 1.34, -2.10);
  b.box('scWood', 0.42, 0.34, 1.50, XR - 0.28, y0 + 0.17, -2.10);
  /* 露台门：朝着切面开 */
  b.box('scGlass', 1.00, 1.92, 0.06, XL + 2.60, y0 + 1.00, ZF - 0.05);
  b.box('scConL', 1.16, 0.10, 0.10, XL + 2.60, y0 + 2.00, ZF - 0.05);
  b.box('scConL', 0.10, 2.00, 0.10, XL + 2.08, y0 + 1.00, ZF - 0.05);
  b.box('scConL', 0.10, 2.00, 0.10, XL + 3.12, y0 + 1.00, ZF - 0.05);
  b.cyl('scPot', 0.14, 0.11, 0.26, 8, XL + 0.42, y0 + 0.14, ZF - 0.60);
  for (let i = 0; i < 3; i++) {
    b.sph(i % 2 ? 'scLeaf1' : 'scLeaf2', 0.20,
      XL + 0.42 + (i - 1) * 0.11, y0 + 0.46 + i * 0.09, ZF - 0.60, 1.05, 0.9, 1);
  }
  scPed(b, XL + 1.70, y0, -2.55, 3.4, 'scShirtC', 'scSkin1');
}

/* ------------------------------------------------------------ 组装 */
function buildSecAll() {
  const g = new T.Group();
  const b = new Builder();
  scEarth(b);
  scTunnel(b);
  scStreet(b);
  scLeftBlock(b);
  scShell(b);
  scFacade(b, S_W, 1);
  scFacade(b, -S_W, -1);
  scCore(b);
  for (let k = 0; k < S_N; k++) scFloor(b, k);
  scShop(b);
  b.build(g, {
    noOutline: ['scLeaf1', 'scLeaf2', 'scLeaf3', 'scSoil1', 'scSoil2', 'scSoil3',
      'scRock', 'scStone', 'scStoneD', 'scStoneP', 'scAsphalt', 'scAsphaltD',
      'scPaving', 'scPavingD', 'scPaintW', 'scPaintR', 'scPaintY',
      'scNeonW', 'scNeonC', 'scTrainWin', 'scSignA', 'scSignB',
      'scGoodsA', 'scGoodsB', 'scGoodsC', 'scFlA', 'scFlB', 'scFlC', 'scFlD',
      'scCut', 'scRug', 'scRug2', 'scMatG', 'scMirror', 'scGlassW',
      'scTunnelDark', 'scSkirt']
  });
  scene.add(g);

  /* 每层一盏室内灯：暖白，压在切面内侧的顶棚下 */
  for (let k = 0; k < S_N; k++) {
    const y = SC_GY + k * S_FL + S_FL - 0.55;
    const lp = new T.PointLight(k === 4 || k === 5 ? 0xffe6c2 : 0xf4f6ff,
      4.6, 7.4, 2);
    lp.position.set(-0.6, y + 0.30, -1.60);
    scene.add(lp);
  }
  /* 隧道两盏冷光 + 路灯一盏暖光 */
  [[-4.6], [3.2]].forEach(function (q) {
    const lp = new T.PointLight(0xdff0ff, 5.0, 5.6, 2);
    lp.position.set(q[0], T_TY - 0.30, 1.20);
    scene.add(lp);
  });
  const sl = new T.PointLight(0xffd9a0, 6.0, 6.4, 2);
  sl.position.set(4.95, SC_GY + 4.05, 2.45);
  scene.add(sl);

  if (window.__expose) {
    window.__sec = { floors: S_N, top: S_TOP, cut: SC_ZH };
  }
}

/* ============================================================
   桌面上的世界（desk / DK）—— 第 16 套形制
   深夜的书桌。只有一盏台灯亮着，光圈里是一本摊开的书，
   书页上是一座城：一小片咖啡渍是它的湖，回形针是它的环线，
   笔筒里那几支笔，是它的摩天楼。

   比例：桌面 2.0×1.4 米，杯子 8.5 厘米，城里最高的一栋 3.5 厘米。
   光只有一个来源 —— 台灯下的 SpotLight。光圈之外不是「暗」，是黑。
   ============================================================ */
const DK = !!PS.desk;

const DK_W = 1.00, DK_D = 0.72;      // 桌面半宽 / 半深
const DK_Y = 0;                       // 桌面上表面
const BK_X = -0.05, BK_Z = 0.02;      // 书心
const BK_A = 0.20;                    // 书绕 y 的转角

/* 确定性伪随机 */
function dkR(seed) {
  const x = Math.sin(seed * 97.3 + 211.7) * 43758.5453;
  return x - Math.floor(x);
}

/* 描边压成暖黑 */
if (DK) OUTLINE.uniforms.uColor.value.set(0x2a211c);

/* 任意多边形棱柱 */
function dkSlab(b, key, pts, y0, y1) {
  const sh = new T.Shape();
  sh.moveTo(pts[0][0], -pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], -pts[i][1]);
  sh.closePath();
  const g = new T.ExtrudeGeometry(sh, {
    depth: Math.max(0.0004, y1 - y0), bevelEnabled: false, curveSegments: 1, steps: 1
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  b.add(key, g);
  return g;
}

function dkBox(b, key, x0, x1, z0, z1, y0, y1) {
  return dkSlab(b, key, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], y0, y1);
}

/* 书的局部坐标：绕书心转 BK_A */
function bk(cx, cz) {
  const c = Math.cos(BK_A), s = Math.sin(BK_A);
  return [BK_X + cx * c - cz * s, BK_Z + cx * s + cz * c];
}

/* 光锥的竖向渐隐：靠近灯罩亮，落到桌面就化开 */
const dkConeTex = canvasTex(8, 64, function (c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,1)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});

/* ------------------------------------------------------------ 桌面 */
function dkDesk(b) {
  /* 一整块实木。桌沿要超出画幅，不然会看见「一块浮着的板」 */
  dkBox(b, 'dkDesk', -DK_W, DK_W, -DK_D, DK_D, DK_Y - 0.045, DK_Y);
  /* 木纹：几道很浅的长条，色差极小，只在光里透出来 */
  for (let i = 0; i < 16; i++) {
    const z = -DK_D + 0.06 + i * (DK_D * 2 - 0.12) / 15 + (dkR(i * 9.1) - 0.5) * 0.03;
    const w = 0.004 + dkR(i * 3.1) * 0.026;
    b.box(i % 3 ? 'dkDeskD' : 'dkDeskL', DK_W * 2, 0.0010, w,
      0, DK_Y + 0.0005, z);
  }
}

/* ------------------------------------------------------------ 书 */
function dkBook(b) {
  const PW = 0.118, PD = 0.300;      // 单页宽 / 页深
  const TH = 0.014;                  // 页厚（整本书的厚度）

  /* 书脊方向的页块：两页各一块，微微向上翘 1.2° */
  for (let s = -1; s <= 1; s += 2) {
    const cx = s * PW * 0.5;
    const p = bk(cx, 0);
    b.box('dkPaper', PW * 0.94, TH, PD, p[0], DK_Y + TH * 0.5 + 0.001, p[1],
      0, BK_A, s * 0.021);
    /* 页边的层叠：三条很薄的深色缝，书才有厚度 */
    for (let i = 0; i < 3; i++) {
      const pp = bk(cx, 0);
      b.box('dkPaperD', PW * 0.94, 0.0012, PD * 0.998,
        pp[0], DK_Y + 0.0035 + i * 0.0038, pp[1], 0, BK_A, s * 0.021);
    }
    /* 封面在下面露一圈 */
    const pc = bk(cx, 0);
    b.box('dkCover', PW * 1.02, 0.0035, PD * 1.04,
      pc[0], DK_Y - 0.0003, pc[1], 0, BK_A, s * 0.021);
  }
  /* 书底的一层软阴影：没有它，书是「贴」在桌上而不是「放」在桌上 */
  const ao = new T.Mesh(new T.PlaneGeometry(0.30, 0.36), new T.MeshBasicMaterial({
    map: lnSoftTex, color: 0x120c08, transparent: true, opacity: 0.55,
    depthWrite: false, fog: false, side: T.DoubleSide
  }));
  ao.rotation.x = -Math.PI / 2;
  ao.rotation.z = BK_A;
  ao.position.set(BK_X, DK_Y + 0.0002, BK_Z);
  ao.renderOrder = 2;
  scene.add(ao);

  /* 书脊 */
  const ps = bk(0, 0);
  b.box('dkCover', 0.010, TH + 0.004, PD * 1.04, ps[0], DK_Y + TH * 0.5, ps[1], 0, BK_A, 0);

  /* 文字：每页 16 行，行高 0.0035；只有光里的那几行看得见 */
  for (let s = -1; s <= 1; s += 2) {
    for (let i = 0; i < 34; i++) {
      const cz = -PD * 0.44 + i * 0.0076;
      if (dkR(i * 3.7 + s) < 0.12) continue;
      const w = PW * (0.42 + dkR(i * 5.1 + s) * 0.44);
      const p = bk(s * PW * 0.5, cz);
      b.box('dkInk', w, 0.0006, 0.0016, p[0], DK_Y + 0.0151, p[1], 0, BK_A, s * 0.021);
    }
  }
}

/* ------------------------------------------------------------ 咖啡杯 */
function dkCup(b) {
  const cx = 0.335, cz = -0.145;
  /* 杯垫 */
  b.cyl('dkSaucer', 0.062, 0.058, 0.006, 18, cx, DK_Y + 0.003, cz);
  b.cyl('dkSaucerD', 0.063, 0.063, 0.0016, 18, cx, DK_Y + 0.0062, cz);
  /* 杯身：下窄上宽 */
  b.cyl('dkCup', 0.043, 0.033, 0.082, 18, cx, DK_Y + 0.047, cz);
  b.cyl('dkCupD', 0.0445, 0.0445, 0.004, 18, cx, DK_Y + 0.088, cz);
  /* 咖啡液面 */
  b.cyl('dkCoffee', 0.0395, 0.0395, 0.002, 16, cx, DK_Y + 0.081, cz);
  /* 把手：一个竖立的圆环，套在杯身外侧 */
  b.torus('dkCup', 0.021, 0.0046, cx + 0.040, DK_Y + 0.050, cz, 0, Math.PI * 0.5, 0);
  /* 杯口的一缕热气：三片极淡的加色片 */
  for (let i = 0; i < 3; i++) {
    const m = new T.Mesh(new T.PlaneGeometry(0.03, 0.10), new T.MeshBasicMaterial({
      map: lnSoftTex, color: 0xfff0d8, transparent: true, opacity: 0.10 - i * 0.02,
      blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide
    }));
    m.position.set(cx + (i - 1) * 0.012, DK_Y + 0.135 + i * 0.008, cz);
    m.rotation.y = 0.4 + i * 0.5;
    scene.add(m);
  }
}

/* ------------------------------------------------------------ 笔筒 */
function dkHold(b) {
  const cx = -0.475, cz = -0.235;
  b.cyl('dkSteel', 0.047, 0.041, 0.105, 14, cx, DK_Y + 0.0525, cz);
  b.cyl('dkSteelD', 0.048, 0.048, 0.004, 14, cx, DK_Y + 0.103, cz);
  b.cyl('dkSteelD', 0.042, 0.042, 0.004, 14, cx, DK_Y + 0.002, cz);
  /* 里面插的几支笔 —— 从远处看，它们就是这座城的摩天楼 */
  const pens = [
    [-0.020, 0.008, 0.075, 0.10, 'dkPenA', 0.03],
    [0.014, -0.010, 0.205, 0.00, 'dkPenB', 0.00],
    [-0.006, 0.018, 0.150, -0.05, 'dkPenC', 0.00],
    [0.020, 0.014, 0.180, 0.04, 'dkPenD', 0.00],
    [-0.018, -0.014, 0.120, 0.02, 'dkPenB', 0.00],
    [0.004, 0.004, 0.235, -0.02, 'dkPenA', 0.00]
  ];
  for (let i = 0; i < pens.length; i++) {
    const p = pens[i];
    const x = cx + p[0], z = cz + p[1];
    b.cyl(p[4], 0.0042, 0.0042, p[2], 6, x + p[3] * 0.02, DK_Y + 0.10 + p[2] * 0.5, z,
      p[3], 0, i * 0.4);
    /* 笔尖/笔帽 */
    b.cyl(i % 2 ? 'dkPenTip' : 'dkPenCap', 0.0044, 0.0044, 0.016, 6,
      x + p[3] * 0.024, DK_Y + 0.10 + p[2] + 0.006, z, p[3], 0, i * 0.4);
  }
}

/* ------------------------------------------------------------ 文具 */
function dkTools(b) {
  /* 橡皮：粉白块，带一截纸套 */
  b.box('dkEraser', 0.056, 0.021, 0.028, 0.415, DK_Y + 0.0105, 0.255, 0, 0.22, 0);
  b.box('dkEraserS', 0.036, 0.0215, 0.0285, 0.404, DK_Y + 0.011, 0.252, 0, 0.22, 0);

  /* 铅笔：横躺在便利贴旁，笔杆六棱用六段薄板近似 */
  const py = DK_Y + 0.0074, pz = 0.335;
  b.cyl('dkPencil', 0.0072, 0.0072, 0.165, 6, -0.075, py, pz, 0, 0, Math.PI * 0.5);
  /* 笔尖 */
  b.cyl('dkPencilTip', 0.0072, 0.0008, 0.022, 6, -0.169, py, pz, 0, 0, Math.PI * 0.5);
  b.cyl('dkPencilLead', 0.0022, 0.0004, 0.006, 6, -0.183, py, pz, 0, 0, Math.PI * 0.5);
  /* 笔尾金属箍 + 橡皮头 */
  b.cyl('dkSteel', 0.0076, 0.0076, 0.012, 8, 0.014, py, pz, 0, 0, Math.PI * 0.5);
  b.cyl('dkEraser', 0.0068, 0.0068, 0.010, 8, 0.025, py, pz, 0, 0, Math.PI * 0.5);

  /* 便利贴：微微翘起的一角 */
  b.box('dkNote', 0.078, 0.0016, 0.078, -0.305, DK_Y + 0.0009, 0.310, 0, -0.16, 0);
  b.box('dkNoteD', 0.078, 0.0017, 0.012, -0.305, DK_Y + 0.0010, 0.271, 0, -0.16, 0);
  /* 翘起的那一角：一块小三角板 */
  const cn = bk;
  b.box('dkNote', 0.030, 0.0016, 0.030, -0.268, DK_Y + 0.0086, 0.344, 0.42, -0.16, 0.30);

  /* 尺子：半透明塑料，带刻度 */
  b.box('dkRuler', 0.310, 0.0026, 0.034, 0.115, DK_Y + 0.0014, -0.375, 0, 0.03, 0);
  for (let i = 0; i < 26; i++) {
    b.box('dkRulerM', 0.0012, 0.0006, (i % 5 ? 0.008 : 0.014),
      0.115 - 0.145 + i * 0.0118, DK_Y + 0.0028, -0.375 + 0.010, 0, 0.03, 0);
  }

  /* 回形针：三段弯折的细钢丝，斜放在桌角 —— 它是这座城的环线 */
  const cxc = -0.545, czc = 0.145;
  for (let i = 0; i < 3; i++) {
    const off = i * 0.0025;
    b.to('dkClip', 0.0016, cxc - 0.022 + off * 2, DK_Y + 0.0017, czc + off,
      cxc + 0.024 + off * 2, DK_Y + 0.0017, czc + off, 4);
    b.to('dkClip', 0.0016, cxc + 0.024 + off * 2, DK_Y + 0.0017, czc + off,
      cxc + 0.024 + off * 2, DK_Y + 0.0017, czc + 0.020 + off, 4);
    b.to('dkClip', 0.0016, cxc + 0.024 + off * 2, DK_Y + 0.0017, czc + 0.020 + off,
      cxc - 0.014 + off * 2, DK_Y + 0.0017, czc + 0.020 + off, 4);
  }
}

/* ------------------------------------------------------------ 台灯 */
function dkLamp(b) {
  const bx = 0.640, bz = -0.360;
  /* 底盘 */
  b.cyl('dkLampBase', 0.098, 0.106, 0.016, 20, bx, DK_Y + 0.008, bz);
  b.cyl('dkLampBaseD', 0.100, 0.100, 0.003, 20, bx, DK_Y + 0.0175, bz);
  /* 灯杆：两节，中间一个关节 */
  b.to('dkLampArm', 0.011, bx, DK_Y + 0.016, bz, bx - 0.045, DK_Y + 0.300, bz + 0.035, 8);
  b.sph('dkLampJoint', 0.016, bx - 0.045, DK_Y + 0.300, bz + 0.035);
  b.to('dkLampArm', 0.010, bx - 0.045, DK_Y + 0.300, bz + 0.035,
    bx - 0.255, DK_Y + 0.372, bz + 0.235, 8);
  b.sph('dkLampJoint', 0.014, bx - 0.255, DK_Y + 0.372, bz + 0.235);

  /* 灯罩：一个上窄下阔的锥台，内壁自发光 */
  const sx = bx - 0.255, sy = DK_Y + 0.360, sz = bz + 0.235;
  /* 灯罩：一条车削轮廓。
     ★ 不要用几个圆柱叠出弧度 —— 每段圆柱各带一圈描边，叠起来就是三层绿饼。 */
  const prof = [];
  for (let i = 0; i <= 7; i++) {
    const t = i / 7;
    prof.push(new T.Vector2(0.048 + 0.052 * Math.pow(t, 0.82), 0.046 - t * 0.094));
  }
  const shg = new T.LatheGeometry(prof, 22);
  shg.translate(sx, sy, sz);
  b.add('dkShade', shg);
  b.cyl('dkShadeIn', 0.046, 0.093, 0.004, 20, sx, sy - 0.047, sz);
  b.cyl('dkShadeD', 0.050, 0.050, 0.006, 20, sx, sy + 0.048, sz);
  b.sph('dkBulb', 0.020, sx, sy - 0.032, sz);

  /* 光锥：从灯罩口到桌面的一截空气。★ 必须上下渐隐，
     否则它就是一个硬边的三角形贴在桌面上，一眼假 */
  const cone = new T.Mesh(
    new T.CylinderGeometry(0.098, 0.42, sy - DK_Y - 0.02, 26, 1, true),
    new T.MeshBasicMaterial({
      map: dkConeTex, color: 0xffd9a0, transparent: true, opacity: 0.065,
      blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false
    }));
  cone.position.set(sx, DK_Y + (sy - DK_Y) * 0.5, sz);
  cone.renderOrder = 4;
  scene.add(cone);

  /* 灯下的光圈：一圈暖色加色片，压出「桌面被照亮的一块」 */
  const pool = new T.Mesh(new T.PlaneGeometry(0.78, 0.78), new T.MeshBasicMaterial({
    map: lnSoftTex, color: 0xffcf92, transparent: true, opacity: 0.07,
    blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide
  }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(sx - 0.16, DK_Y + 0.0016, sz + 0.12);
  pool.renderOrder = 3;
  scene.add(pool);

  return { x: sx, y: sy, z: sz };
}

/* ------------------------------------------------------------ 书页上的城 */
function dkCity(b) {
  const PW = 0.118, PD = 0.300;
  const GY = DK_Y + 0.0152;          // 城市地面 = 书页顶面（别浮起来）

  /* 街道：先用格子定好街网，楼再往格子里坐。
     ★ 不要手写一堆坐标去「摆」城市 —— 摆出来一定是散的。
       格子决定街，街决定城；空格就是街，湖就是挖掉的几格。 */
  const CX0 = -0.090, CX1 = 0.106, CZ0 = -0.136, CZ1 = 0.136;
  const NX = 7, NZ = 9;
  const DXX = (CX1 - CX0) / NX, DZZ = (CZ1 - CZ0) / NZ;
  const LK = [0.082, 0.052];          // 湖心（书的局部坐标）

  /* 街：沿格线铺细条，横竖各一套 */
  for (let i = 1; i < NX; i++) {
    const x = CX0 + DXX * i, p = bk(x, 0);
    b.box('dkRoad', 0.0035, 0.0006, CZ1 - CZ0 - 0.006, p[0], GY + 0.0004, p[1], 0, BK_A, 0);
  }
  for (let i = 1; i < NZ; i++) {
    const z = CZ0 + DZZ * i, p = bk(0, z);
    b.box('dkRoad', CX1 - CX0 - 0.006, 0.0006, 0.0035, p[0], GY + 0.0004, p[1], 0, BK_A, 0);
  }

  const put = function (cx, cz, w, d, h, key) {
    const p = bk(cx, cz);
    b.box(key, w, h, d, p[0], GY + h * 0.5, p[1], 0, BK_A, 0);
    /* 屋面压深一圈，楼顶才不是一块平顶 */
    b.box('dkRoof', w * 0.88, 0.0007, d * 0.88, p[0], GY + h + 0.0003, p[1], 0, BK_A, 0);
    if (h > 0.026) {
      b.cyl('dkSteelD', 0.0005, 0.0005, 0.006, 4, p[0], GY + h + 0.003, p[1]);
    }
    /* 窗：只在朝向相机的那一面画几道，够读就行 */
    const rows = Math.floor(h / 0.0055);
    for (let i = 0; i < rows; i++) {
      b.box('dkWin', w * 0.90, 0.0011, 0.0004,
        p[0], GY + 0.0035 + i * 0.0055, p[1] + d * 0.5, 0, BK_A, 0);
      b.box('dkWin', 0.0004, 0.0011, d * 0.90,
        p[0] + w * 0.5, GY + 0.0035 + i * 0.0055, p[1], 0, BK_A, 0);
    }
  };

  const keys = ['dkBld1', 'dkBld2', 'dkBld3', 'dkBld4', 'dkBld5', 'dkBld6'];

  /* 逐格生成：一格一到两栋，剩下的格留给湖、广场、公园 */
  for (let ix = 0; ix < NX; ix++) {
    for (let iz = 0; iz < NZ; iz++) {
      const cx = CX0 + DXX * (ix + 0.5);
      const cz = CZ0 + DZZ * (iz + 0.5);
      const seed = ix * 17.3 + iz * 5.7;
      const r0 = dkR(seed + 1.0);

      /* 湖：挖掉湖心周围的几格 */
      const dl = Math.sqrt((cx - LK[0]) * (cx - LK[0]) + (cz - LK[1]) * (cz - LK[1]));
      if (dl < DXX * 1.30) continue;

      /* 留白：广场与街心公园 */
      if (r0 < 0.17) {
        if (r0 < 0.08) {
          const p = bk(cx, cz);
          b.box('dkPlaza', DXX * 0.62, 0.0005, DZZ * 0.62, p[0], GY + 0.0004, p[1], 0, BK_A, 0);
        } else {
          for (let t = 0; t < 3; t++) {
            const p = bk(cx + (dkR(seed + t * 3.3) - 0.5) * DXX * 0.30,
              cz + (dkR(seed + t * 7.1) - 0.5) * DZZ * 0.30);
            const ts = 0.0026 + dkR(seed + t * 5.1) * 0.0012;
            b.cyl('dkTreeD', 0.0004, 0.0005, ts * 1.3, 4, p[0], GY + ts * 0.65, p[1]);
            b.sph(t % 2 ? 'dkTree' : 'dkTreeD', ts, p[0], GY + ts * 1.5, p[1], 1.1, 0.95, 1.05);
          }
        }
        continue;
      }

      const w = DXX * (0.46 + dkR(seed + 2.3) * 0.22);
      const d = DZZ * (0.46 + dkR(seed + 5.3) * 0.22);
      /* 高度差别要够狠：绝大多数是矮房，少数几栋冒出来，才像城 */
      let h = 0.009 + Math.pow(dkR(seed + 6.1), 3.1) * 0.034;
      const dc = Math.sqrt((cx + 0.010) * (cx + 0.010) + (cz + 0.010) * (cz + 0.010));
      if (dc < 0.055) h *= 1.45;              // 市中心一撮高楼
      if (dkR(seed + 21.7) < 0.07) h *= 1.9;  // 偶尔冒出一栋塔
      put(cx, cz, w, d, h, keys[Math.floor(dkR(seed + 8.9) * 6) % 6]);
      /* 少数格子裂成两栋，城市才有密度差 */
      if (dkR(seed + 11.3) < 0.26) {
        const w2 = DXX * 0.26, d2 = DZZ * 0.26;
        put(cx + (dkR(seed + 13.1) - 0.5) * DXX * 0.30,
          cz + (dkR(seed + 14.7) - 0.5) * DZZ * 0.30,
          w2, d2, 0.010 + dkR(seed + 16.3) * 0.012,
          keys[Math.floor(dkR(seed + 18.5) * 6) % 6]);
      }
    }
  }

  /* 全城最高的地标，立在湖的西北岸 */
  put(0.056, 0.014, 0.018, 0.018, 0.042, 'dkBld1');
  put(0.056, 0.014, 0.011, 0.011, 0.010, 'dkBld6');

  /* 湖：右页偏南的一片咖啡渍。★ 一定要放在「前排没有楼」的地方，
     不然从机位看过去，湖被自己城里的房子挡得一点不剩。 */
  const qy = bk(0.082, 0.052);
  b.cyl('dkQuay', 0.0330, 0.0330, 0.0006, 20, qy[0], GY + 0.0004, qy[1]);
  b.cyl('dkStainD', 0.0292, 0.0292, 0.0006, 20, qy[0], GY + 0.0006, qy[1]);
  b.cyl('dkStain', 0.0262, 0.0262, 0.0006, 20, qy[0], GY + 0.0008, qy[1]);
  b.cyl('dkShore', 0.0240, 0.0240, 0.0007, 20, qy[0], GY + 0.0009, qy[1]);
  b.cyl('dkWater', 0.0226, 0.0226, 0.0007, 20, qy[0], GY + 0.0011, qy[1]);
  /* 两条小船：一叶扁舟，比楼还小 */
  for (let i = 0; i < 2; i++) {
    const bx2 = qy[0] + (i ? 0.008 : -0.007), bz2 = qy[1] + (i ? -0.006 : 0.007);
    b.box('dkBoat', 0.0090, 0.0014, 0.0034, bx2, GY + 0.0019, bz2, 0, BK_A + 0.5 * i, 0);
    b.box('dkBoatD', 0.0030, 0.0018, 0.0026, bx2, GY + 0.0030, bz2, 0, BK_A + 0.5 * i, 0);
  }

  /* 跨湖的桥：一段极薄的板 + 两边栏杆 */
  const pb = bk(0.082, 0.052);
  b.box('dkDeck', 0.062, 0.0016, 0.010, pb[0], GY + 0.0086, pb[1], 0, BK_A, 0);
  for (let i = 0; i < 2; i++) {
    b.box('dkSteelD', 0.052, 0.0012, 0.0008,
      pb[0], GY + 0.0092, pb[1] + (i ? 0.0052 : -0.0052), 0, BK_A, 0);
  }

  /* 树：小绿球，成排种在街边 */
  const trees = [
    [-0.062, -0.062], [-0.028, -0.058], [0.008, -0.064], [0.044, -0.060],
    [-0.064, 0.056], [-0.020, 0.062], [0.006, -0.008], [0.078, 0.060],
    [-0.056, 0.126], [-0.018, 0.128], [0.022, 0.124], [0.070, 0.126],
    [-0.092, 0.004], [0.092, -0.044], [-0.036, -0.118], [0.048, -0.120]
  ];
  for (let i = 0; i < trees.length; i++) {
    const p = bk(trees[i][0], trees[i][1]);
    const s = 0.0026 + dkR(i * 3.3) * 0.0014;
    b.cyl('dkTreeD', 0.0004, 0.0005, s * 1.3, 4, p[0], GY + s * 0.65, p[1]);
    b.sph(i % 2 ? 'dkTree' : 'dkTreeD', s, p[0], GY + s * 1.5, p[1], 1.1, 0.95, 1.05);
  }

  /* 车：街上的小方盒，红白蓝三种 */
  const cars = [
    [-0.070, -0.115, 0.000, 'dkCarA'], [-0.020, -0.115, 0.000, 'dkCarB'],
    [0.030, -0.115, 0.000, 'dkCarC'], [0.070, 0.075, 0.000, 'dkCarA'],
    [-0.055, 0.030, 0.000, 'dkCarB'], [0.062, -0.060, 0.000, 'dkCarC']
  ];
  for (let i = 0; i < cars.length; i++) {
    const q = cars[i];
    const p = bk(q[0], q[1]);
    b.box(q[3], 0.0052, 0.0018, 0.0026, p[0], GY + 0.0024, p[1], 0, BK_A + 0.02 * i, 0);
    b.box('dkGlass', 0.0026, 0.0014, 0.0027, p[0], GY + 0.0036, p[1], 0, BK_A + 0.02 * i, 0);
  }
}

/* ------------------------------------------------------------ 组装 */
function buildDkAll() {
  const g = new T.Group();
  const b = new Builder();
  dkDesk(b);
  dkBook(b);
  dkCity(b);
  dkCup(b);
  dkHold(b);
  dkTools(b);
  const lamp = dkLamp(b);
  b.build(g, {
    noOutline: ['dkDesk', 'dkDeskD', 'dkDeskL', 'dkPaper', 'dkPaperD', 'dkInk',
      'dkField', 'dkRoad', 'dkWin', 'dkStain', 'dkStainD', 'dkWater',
      'dkTree', 'dkTreeD', 'dkShadeIn', 'dkBulb', 'dkNote', 'dkCoffee',
      'dkRulerM', 'dkGlass', 'dkField']
  });
  scene.add(g);

  /* ★ 全场只有一个光源：灯罩里的那一盏。
     其余位置不是「暗」，是黑 —— 所以面光只留一丝，够勾出轮廓就行。 */
  /* ★ 光要落在书上，不是落在杯子上 —— 杯子只是配角 */
  const spot = new T.SpotLight(0xffd9a0, 1.45, 3.0, 0.68, 0.72, 1.55);
  spot.position.set(lamp.x, lamp.y - 0.035, lamp.z);
  spot.target.position.set(BK_X, DK_Y, BK_Z + 0.02);
  scene.add(spot);
  scene.add(spot.target);

  /* 灯罩自身的暖光：让灯是「亮着的」，不是一块黑铁 */
  const glow = new T.PointLight(0xffc98a, 0.55, 0.5, 2);
  glow.position.set(lamp.x, lamp.y - 0.06, lamp.z);
  scene.add(glow);
  /* 灯臂与底座的补光：没有它，灯罩就是浮在空中的一个绿锥体 */
  const rim = new T.PointLight(0xffb877, 0.20, 0.62, 2);
  rim.position.set(lamp.x + 0.08, lamp.y - 0.24, lamp.z + 0.10);
  scene.add(rim);

  if (window.__expose) {
    window.__dk = { lamp: lamp, deskW: DK_W, deskD: DK_D };
  }
}

/* ==================================================================
   醉仙楼 · 三层古代酒楼（第 17 套 / TV）
   正面朝 +X。三条「看得见里面」的通道：
     ① 门与窗都是真洞口（整面墙一个带洞挤出多边形），不糊窗纸不贴亮板；
     ② 右山墙（+Z）整面剖开，只留柱梁与槛墙，三层室内从侧面一览无余；
     ③ 屋顶只留后坡 + 前檐一小段，前坡掀开，顶层不被瓦盖住。
   ================================================================== */
const TV = !!PS.tavern;

const TV_X0 = -6.20, TV_X1 = 2.60;    // 进深 8.80（正面 +X）
const TV_Z0 = -5.60, TV_Z1 = 5.60;    // 面阔 11.20
const TV_T  = 0.26;                    // 墙厚
const TV_GY = 0.34;                    // 台基顶 = 一层地坪
const TV_Y1 = 3.94;                    // 二层楼面
const TV_Y2 = 7.14;                    // 三层楼面
const TV_Y3 = 10.04;                   // 顶层檐口
const TV_RG = 12.62;                   // 屋脊
const TV_XR = -1.80;                   // 脊的 x（偏后，前坡才掀得开）
const TV_EF = 1.16;                    // 屋面出挑
const TV_BX = 9.70, TV_BZ = 8.40;      // 展台半尺寸
const TV_BT = -1.26, TV_GD = 0.02;     // 台底 / 场院地面

/* 黄昏酒楼的描边压成暖褐墨，别用民居的纯黑 */
if (TV) OUTLINE.uniforms.uColor.value.set(0x3b2a22);

function tvR(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/* 局部坐标零件 → 整体绕 y 旋转再平移（人物、家具、斜置道具共用） */
function tvAdd(b, key, geo, x, y, z, ry, lx, ly, lz) {
  if (lx || ly || lz) geo.translate(lx, ly, lz);
  if (ry) geo.rotateY(ry);
  geo.translate(x, y, z);
  return b.add(key, geo);
}
function tvB(b, key, w, h, d, x, y, z, ry, lx, ly, lz) {
  return tvAdd(b, key, new T.BoxGeometry(w, h, d), x, y, z, ry, lx, ly, lz);
}

/* 带洞口的整面墙：一个挤出多边形，绝不用几十个小盒子拼。
   axis 'x' = 法线沿 X（正面 / 后墙，a 轴是 z）；'z' = 法线沿 Z（山墙，a 轴是 x）。 */
function tvWall(b, key, axis, at, a0, a1, y0, y1, holes, thick) {
  const th = thick === undefined ? TV_T : thick;
  const sh = new T.Shape();
  sh.moveTo(a0, y0); sh.lineTo(a1, y0); sh.lineTo(a1, y1); sh.lineTo(a0, y1); sh.closePath();
  (holes || []).forEach(function (q) {
    const p = new T.Path();
    p.moveTo(q[0], q[2]); p.lineTo(q[1], q[2]);
    p.lineTo(q[1], q[3]); p.lineTo(q[0], q[3]); p.closePath();
    sh.holes.push(p);
  });
  const g = new T.ExtrudeGeometry(sh, {
    depth: th, bevelEnabled: false, curveSegments: 1, steps: 1
  });
  if (axis === 'x') {
    g.rotateY(-Math.PI * 0.5);
    g.translate(at + th * 0.5, 0, 0);
  } else {
    g.translate(0, 0, at - th * 0.5);
  }
  return b.add(key, g);
}

/* 稀疏格棂：只留竖棂 + 两道横档，透得进视线才是这套形制的目的 */
function tvLattice(b, x, z0, z1, y0, y1, dense) {
  const k = 'tvLattice', t = 0.055;
  b.box(k, 0.075, y1 - y0, 0.075, x, (y0 + y1) / 2, z0);
  b.box(k, 0.075, y1 - y0, 0.075, x, (y0 + y1) / 2, z1);
  b.box(k, 0.075, 0.075, z1 - z0, x, y0, (z0 + z1) / 2);
  b.box(k, 0.075, 0.075, z1 - z0, x, y1, (z0 + z1) / 2);
  const n = Math.max(3, Math.round((z1 - z0) / (dense ? 0.28 : 0.36)));
  for (let i = 1; i < n; i++) {
    const z = z0 + (z1 - z0) * i / n;
    b.box(k, 0.048, y1 - y0, 0.048, x, (y0 + y1) / 2, z);
  }
  for (let j = 1; j <= 2; j++) {
    b.box(k, 0.045, 0.045, z1 - z0, x, y0 + (y1 - y0) * j / 3, (z0 + z1) / 2);
  }
}

/* 门扇绕铰链真正敞开，不是一块贴上去的板 */
function tvDoorLeaf(b, x, y, zH, side, ang) {
  const g = new T.BoxGeometry(0.085, 2.48, 1.30);
  g.translate(0, 0, side * 0.65);
  g.rotateY(ang);
  g.translate(x, y, zH);
  b.add('tvDoor', g);
  /* 门上的门钹与横带 */
  const m = new T.BoxGeometry(0.10, 0.055, 0.94);
  m.translate(0.02, 0.55, side * 0.62);
  m.rotateY(ang);
  m.translate(x, y, zH);
  b.add('tvDoorD', m);
}

/* 屋面一段：把长边沿坡线的厚板压到坡线下侧，上表面贴坡线 */
function tvSlope(b, key, x0, y0, x1, y1, z0, z1, th) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.sqrt(dx * dx + dy * dy);
  let nx = -dy / L, ny = dx / L;
  if (ny < 0) { nx = -nx; ny = -ny; }
  const cx = (x0 + x1) / 2 - nx * th * 0.5;
  const cy = (y0 + y1) / 2 - ny * th * 0.5;
  b.box(key, L, th, z1 - z0, cx, cy, (z0 + z1) / 2, 0, 0, Math.atan2(dy, dx));
}
/* 两坡举折（下缓上陡）+ 瓦垄；只画指定 x 区间，前坡因此能只留檐口那一截 */
function tvRoofRun(b, xA, yA, xB, yB, z0, z1, seg) {
  /* seg=true 时只做一小段直坡（掀开后留下的前檐），不做举折两段 */
  if (seg) {
    tvSlope(b, 'tvTile', xA, yA, xB, yB, z0, z1, 0.19);
    for (let z = z0 + 0.18; z < z1; z += 0.36)
      b.to('tvTileD', 0.055, xA, yA + 0.045, z, xB, yB + 0.045, z, 6);
    return;
  }
  const mx = xA + (xB - xA) * 0.34, my = yA - (yA - yB) * 0.66;
  tvSlope(b, 'tvTile', xA, yA, mx, my, z0, z1, 0.19);
  tvSlope(b, 'tvTileL', mx, my, xB, yB, z0, z1, 0.17);
  for (let z = z0 + 0.18; z < z1; z += 0.36) {
    b.to('tvTileD', 0.055, xA, yA + 0.045, z, mx, my + 0.045, z, 6);
    b.to('tvTileD', 0.052, mx, my + 0.045, z, xB, yB + 0.045, z, 6);
  }
}

/* 树冠：噪声位移的刻面球，不是一堆带黑边的小球 */
function tvBlob(b, key, x, y, z, rx, ry, rz, seed) {
  const g = new T.IcosahedronGeometry(1, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
    const n = 0.84 + 0.20 * Math.sin(vx * 5.3 + vy * 3.1 + seed)
      + 0.12 * Math.sin(vz * 7.7 - vy * 4.2 + seed * 1.7);
    p.setXYZ(i, vx * n, vy * n, vz * n);
  }
  g.computeVertexNormals();
  g.scale(rx, ry, rz);
  g.translate(x, y, z);
  b.add(key, g);
}

/* 人：锥台袍身 + 球头 + 分段四肢，剪影先像人，再谈细节 */
/* 人：统一积木小人。帽型按坐标散列，三层几十号人不会全戴同一顶。 */
function tvPed(b, x, y, z, ry, mode, robe) {
  const K = robe || 'tvRobeA';
  const h = Math.abs(Math.round((x * 7.3 + z * 13.7 + y * 3.1) * 10)) % 3;
  const hats = ['fang', 'bun', 'cap'];
  buildFig({
    b: b, x: x, y: y, z: z, ry: ry,
    pose: mode === 'sit' ? 'sit' : (mode === 'walk' ? 'walk' : 'stand'),
    coat: K, pants: 'tvRobeC', skin: 'tvSkin', hair: 'tvHair',
    ink: 'tvHair', belt: 'tvRobeC', shoe: 'tvShoe',
    hat: hats[h], hatKey: h === 2 ? 'tvApron' : 'tvHair',
    apron: h === 2, apronKey: 'tvApron', armFront: h === 2
  });
}
function tvCylAt(b, key, rt, rb, h, seg, x, y, z, ry, lx, ly, lz) {
  return tvAdd(b, key, new T.CylinderGeometry(rt, rb, h, seg || 9), x, y, z, ry, lx, ly, lz);
}

/* ------------------------------------------------------------ 场院与台基 */
function tvBase(b) {
  /* 展台：切角土台，侧面四层剖面（别让模型像浮在空中的贴纸） */
  b.box('tvBaseD', TV_BX * 2, 0.22, TV_BZ * 2, 0, TV_BT + 0.11, 0);
  b.box('tvBase', TV_BX * 2 - 0.16, 0.14, TV_BZ * 2 - 0.16, 0, TV_BT + 0.29, 0);
  b.box('tvSoil', TV_BX * 2 - 0.30, 0.72, TV_BZ * 2 - 0.30, 0, TV_BT + 0.72, 0);
  b.box('tvSoilD', TV_BX * 2 - 0.30, 0.30, TV_BZ * 2 - 0.30, 0, TV_BT + 1.10, 0);
  b.box('tvPave', TV_BX * 2 - 0.30, 0.10, TV_BZ * 2 - 0.30, 0, TV_GD - 0.05, 0);

  /* 门前广场石板：三阶明度抖动，进 noOutline 免得整片砖缝 */
  const S = 0.86;
  let ix = 0;
  for (let x = TV_X1 + 1.15; x < TV_BX - 0.35; x += S) {
    let iz = 0;
    for (let z = -TV_BZ + 0.45; z < TV_BZ - 0.35; z += S) {
      const m = (ix * 5 + iz * 7) % 9;
      const k = m === 0 ? 'tvPaveL' : (m === 4 ? 'tvPaveD' : 'tvPave');
      b.box(k, S - 0.055, 0.045, S - 0.055, x, TV_GD + 0.022, z);
      iz++;
    }
    ix++;
  }
  /* 楼两侧与后侧的窄石板 */
  for (let z = -TV_BZ + 0.45; z < TV_BZ - 0.35; z += S) {
    for (let x = -TV_BX + 0.55; x < TV_X1 + 1.10; x += S) {
      if (x > TV_X0 - 1.0 && x < TV_X1 + 0.4 && z > TV_Z0 - 0.6 && z < TV_Z1 + 0.6) continue;
      b.box('tvPaveD', S - 0.07, 0.038, S - 0.07, x, TV_GD + 0.019, z);
    }
  }

  /* 台基：须弥座线脚 + 台面 */
  b.box('tvStoneD', TV_X1 - TV_X0 + 1.10, 0.20, TV_Z1 - TV_Z0 + 1.10, (TV_X0 + TV_X1) / 2, 0.12, 0);
  b.box('tvStone', TV_X1 - TV_X0 + 0.86, 0.20, TV_Z1 - TV_Z0 + 0.86, (TV_X0 + TV_X1) / 2, 0.25, 0);
  b.box('tvStoneL', TV_X1 - TV_X0 + 0.72, 0.055, TV_Z1 - TV_Z0 + 0.72, (TV_X0 + TV_X1) / 2, TV_GY - 0.03, 0);
  /* 台基四边压线 */
  for (let i = 0; i < 4; i++) {
    const zz = TV_Z0 - 0.55 + i * (TV_Z1 - TV_Z0 + 1.10) / 3;
    b.box('tvStoneD', TV_X1 - TV_X0 + 1.10, 0.045, 0.055, (TV_X0 + TV_X1) / 2, 0.20, zz);
  }
  /* 门前台阶 3 级 */
  for (let i = 0; i < 3; i++) {
    const w = 0.42;
    b.box('tvStoneL', w, 0.11, 3.70, TV_X1 + 0.72 - i * w, TV_GD + 0.165 - i * 0.095, 0);
  }
  b.box('tvStoneD', 1.42, 0.06, 4.10, TV_X1 + 0.55, TV_GD + 0.03, 0);
}

/* ------------------------------------------------------------ 楼身外壳 */
function tvShell(b) {
  const F = TV_X1, Bk = TV_X0, L = TV_Z0, R = TV_Z1;
  const FL = [TV_GY, TV_Y1, TV_Y2, TV_Y3];

  /* 楼板：整层一块，剖口侧留一道深色断面收边 */
  for (let f = 1; f <= 2; f++) {
    const y = FL[f];
    b.box('tvFloor', F - Bk, 0.20, R - L, (F + Bk) / 2, y - 0.10, 0);
    b.box('tvFloorD', F - Bk, 0.045, R - L, (F + Bk) / 2, y + 0.005, 0);
    b.box('tvCut', 0.10, 0.20, R - L, F - 0.05, y - 0.10, 0);
    /* 楼板底下的梁（沿 z 方向） */
    for (let i = 0; i < 5; i++)
      b.box('tvBeam', F - Bk, 0.16, 0.15, (F + Bk) / 2, y - 0.27, L + (R - L) * i / 4);
    /* 顶棚：让下一层天花板不是一团黑 */
    b.box('tvCeil', F - Bk - 0.30, 0.035, R - L - 0.30, (F + Bk) / 2, y - 0.30, 0);
  }
  /* 一层木地板：稍亮一档 + 板缝。斜视角下没有缝线会读成一块斜坡 */
  b.box('tvFloor', F - Bk, 0.05, R - L, (F + Bk) / 2, TV_GY + 0.02, 0);
  for (let z = L + 0.25; z < R; z += 0.44)
    b.box('tvFloorD', F - Bk - 0.40, 0.014, 0.026, (F + Bk) / 2, TV_GY + 0.053, z);
  for (let x = Bk + 0.60; x < F; x += 1.30)
    b.box('tvFloorD', 0.026, 0.014, R - L - 0.40, x, TV_GY + 0.054, 0);

  /* 后墙 / 左山墙：实心整块（室内背板），不做洞，家具有背景才不穿帮 */
  for (let f = 0; f < 3; f++) {
    tvWall(b, 'tvWall', 'x', Bk, L, R, FL[f], FL[f + 1] - 0.16, [], 0.24);
    tvWall(b, 'tvWallD', 'z', L, Bk, F, FL[f], FL[f + 1] - 0.16, [], 0.24);
  }
  /* 室内背板：自发光暖灰，室内才不会死黑 */
  for (let f = 0; f < 3; f++)
    b.box('tvWallIn', 0.055, FL[f + 1] - FL[f] - 0.40, R - L - 0.5,
      Bk + 0.17, (FL[f] + FL[f + 1]) / 2, 0);

  /* 正面墙：三层各一整块，门窗是真洞 */
  const doorHole = [-1.48, 1.48, TV_GY + 0.018, TV_GY + 2.62];
  const w1 = [[-4.70, -2.10, TV_GY + 0.92, TV_GY + 2.56], [2.10, 4.70, TV_GY + 0.92, TV_GY + 2.56]];
  const w2 = [[-4.70, -2.25, TV_Y1 + 1.00, TV_Y1 + 2.48],
              [-1.12, 1.12, TV_Y1 + 1.00, TV_Y1 + 2.48],
              [2.25, 4.70, TV_Y1 + 1.00, TV_Y1 + 2.48]];
  const w3 = [[-4.35, -2.05, TV_Y2 + 0.98, TV_Y2 + 2.36],
              [-1.00, 1.00, TV_Y2 + 0.98, TV_Y2 + 2.36],
              [2.05, 4.35, TV_Y2 + 0.98, TV_Y2 + 2.36]];
  tvWall(b, 'tvWall', 'x', F, L, R, TV_GY, TV_Y1 - 0.16, [doorHole, w1[0], w1[1]], TV_T);
  tvWall(b, 'tvWall', 'x', F, L, R, TV_Y1, TV_Y2 - 0.16, w2, TV_T);
  tvWall(b, 'tvWall', 'x', F, L, R, TV_Y2, TV_Y3 - 0.16, w3, TV_T);

  /* 窗棂 / 门扇：全部在洞口里，稀疏透视线 */
  [w1, w2, w3].forEach(function (arr, fi) {
    arr.forEach(function (q, i) {
      tvLattice(b, F + 0.02, q[0] + 0.04, q[1] - 0.04, q[2] + 0.04, q[3] - 0.04, fi === 0);
      /* 窗楣与窗台：把洞口「框」出来 */
      b.box('tvWoodL', 0.16, 0.09, q[1] - q[0] + 0.26, F + 0.12, q[3] + 0.07, (q[0] + q[1]) / 2);
      b.box('tvWoodD', 0.20, 0.10, q[1] - q[0] + 0.30, F + 0.14, q[2] - 0.06, (q[0] + q[1]) / 2);
    });
  });
  /* ★ 两扇都必须朝室内（-x）开：左铰链门扇往 +z 伸、右铰链往 -z 伸，
     旋转角因此相反。写成同号会两块板一起斜插到门前，把门洞糊死。 */
  tvDoorLeaf(b, F - 0.02, TV_GY + 1.26, -1.44, 1, -1.48);
  tvDoorLeaf(b, F - 0.02, TV_GY + 1.26, 1.44, -1, 1.48);
  b.box('tvWoodD', 0.30, 0.20, 3.50, F + 0.10, TV_GY + 2.72, 0);
  b.box('tvWoodL', 0.34, 0.09, 3.70, F + 0.12, TV_GY + 2.86, 0);

  /* 右山墙：整面剖开 —— 只有 0.82 高的槛墙 + 柱梁，三层室内全露出来 */
  for (let f = 0; f < 3; f++) {
    b.box('tvWallD', F - Bk, 0.82, TV_T, (F + Bk) / 2, FL[f] + 0.41, R - 0.02);
    b.box('tvCut', F - Bk, 0.075, TV_T + 0.05, (F + Bk) / 2, FL[f] + 0.86, R - 0.02);
    /* 剖口上沿的额枋 */
    b.box('tvBeam', F - Bk, 0.20, 0.22, (F + Bk) / 2, FL[f + 1] - 0.28, R - 0.02);
  }

  /* 柱网：每层 4 角柱 + 正面 2 中柱，朱红 */
  for (let f = 0; f < 3; f++) {
    const y0 = FL[f], y1 = FL[f + 1] - 0.16, h = y1 - y0;
    const pl = [[Bk + 0.20, L + 0.20], [Bk + 0.20, R - 0.20],
                [F - 0.20, L + 0.20], [F - 0.20, R - 0.20],
                [F - 0.20, -1.83], [F - 0.20, 1.83],
                [Bk + 0.20, -1.83], [Bk + 0.20, 1.83]];
    for (let i = 0; i < pl.length; i++) {
      b.cyl('tvPillar', 0.175, 0.195, h, 10, pl[i][0], y0 + h / 2, pl[i][1]);
      b.cyl('tvStoneD', 0.235, 0.255, 0.16, 10, pl[i][0], y0 + 0.08, pl[i][1]);
      /* 柱头斗拱：一横两斜，青绿彩画 */
      b.box('tvBracket', 0.44, 0.13, 0.44, pl[i][0], y1 - 0.06, pl[i][1]);
      b.box('tvBracketR', 0.30, 0.075, 0.30, pl[i][0], y1 - 0.16, pl[i][1]);
    }
    /* 额枋：四面各一道 */
    b.box('tvBeam', 0.20, 0.22, R - L, F - 0.14, y1 - 0.30, 0);
    b.box('tvBeam', 0.20, 0.22, R - L, Bk + 0.14, y1 - 0.30, 0);
    b.box('tvBeam', F - Bk, 0.22, 0.20, (F + Bk) / 2, y1 - 0.30, L + 0.14);
    b.box('tvBeam', F - Bk, 0.22, 0.20, (F + Bk) / 2, y1 - 0.30, R - 0.14);
    /* 腰檐：在下一层窗台之下，绝不压住窗洞 */
    if (f < 2) {
      const ey = FL[f + 1] - 0.42;
      tvSlope(b, 'tvTile', F - 0.10, ey + 0.34, F + 0.62, ey, L - 0.45, R + 0.45, 0.14);
      tvSlope(b, 'tvTile', Bk + 0.10, ey + 0.34, Bk - 0.62, ey, L - 0.45, R + 0.45, 0.14);
      /* 左右山墙的腰檐：平板出挑，不沿 x 起坡 */
      b.box('tvTile', F - Bk + 1.24, 0.13, 0.62, (F + Bk) / 2, ey + 0.05, L - 0.31);
      b.box('tvTile', F - Bk + 1.24, 0.13, 0.62, (F + Bk) / 2, ey + 0.05, R + 0.31);
      b.box('tvEave', 0.14, 0.13, R - L + 0.9, F + 0.64, ey - 0.02, 0);
      b.box('tvEave', 0.14, 0.13, R - L + 0.9, Bk - 0.64, ey - 0.02, 0);
      for (let z = L - 0.4; z < R + 0.4; z += 0.38) {
        b.to('tvTileD', 0.045, F - 0.10, ey + 0.37, z, F + 0.62, ey + 0.03, z, 6);
        b.to('tvTileD', 0.045, Bk + 0.10, ey + 0.37, z, Bk - 0.62, ey + 0.03, z, 6);
      }
    }
  }

  /* 二、三层正面平坐（回廊）+ 低栏杆：栏杆只挡窗下沿 0.6 米 */
  for (let f = 1; f <= 2; f++) {
    const y = FL[f];
    b.box('tvDeck', 1.00, 0.13, R - L + 0.30, F + 0.50, y - 0.065, 0);
    b.box('tvWoodD', 1.06, 0.055, R - L + 0.34, F + 0.50, y - 0.16, 0);
    for (let z = L - 0.1; z <= R + 0.1; z += 0.62)
      b.box('tvRail', 0.065, 0.58, 0.065, F + 0.96, y + 0.29, z);
    b.box('tvRail', 0.085, 0.075, R - L + 0.30, F + 0.96, y + 0.60, 0);
    b.box('tvRail', 0.065, 0.055, R - L + 0.30, F + 0.96, y + 0.30, 0);
    /* 平坐下挂落（细斜撑） */
    for (let z = L + 0.1; z < R; z += 1.24)
      b.box('tvBracketR', 0.09, 0.09, 0.30, F + 0.82, y - 0.24, z);
  }

  /* 顶层屋顶：后坡完整，前坡只留檐口一截，中间掀开 */
  const zA = L - TV_EF, zB = R + TV_EF;
  const xBack = Bk - TV_EF, xFront = F + TV_EF;
  tvRoofRun(b, TV_XR, TV_RG, xBack, TV_Y3 + 0.10, zA, zB);
  tvRoofRun(b, xFront - 1.28, TV_Y3 + 0.72, xFront, TV_Y3 + 0.10, zA, zB, true);
  /* 掀开区露出的椽子 + 两道檩：把「屋顶被剖开」这条边读出来，
     否则从斜上方只看到一个三角黑洞，像穿帮 */
  for (let z = zA + 0.20; z < zB; z += 0.45)
    b.to('tvWoodD', 0.060, TV_XR, TV_RG - 0.14, z, xFront - 1.20, TV_Y3 + 0.74, z, 7);
  [TV_XR + 0.55, xFront - 1.75].forEach(function (cx) {
    const t = (cx - TV_XR) / (xFront - 1.20 - TV_XR);
    const cy = TV_RG - 0.14 + (TV_Y3 + 0.74 - (TV_RG - 0.14)) * t;
    b.cyl('tvBeam', 0.075, 0.075, zB - zA, 8, cx, cy - 0.06, 0, Math.PI / 2, 0, 0);
  });
  b.box('tvCut', 0.12, 0.16, zB - zA, xFront - 1.28, TV_Y3 + 0.70, 0);
  /* 正脊、垂脊、宝顶 */
  b.cyl('tvRidge', 0.135, 0.135, zB - zA, 9, TV_XR, TV_RG + 0.05, 0, Math.PI / 2, 0, 0);
  b.cyl('tvRidge', 0.075, 0.075, zB - zA + 0.16, 8, TV_XR, TV_RG + 0.17, 0, Math.PI / 2, 0, 0);
  [zA, zB].forEach(function (z) {
    b.to('tvRidge', 0.085, TV_XR, TV_RG + 0.08, z, xBack, TV_Y3 + 0.14, z, 7);
    b.to('tvRidge', 0.075, TV_XR, TV_RG + 0.08, z, xFront, TV_Y3 + 0.14, z, 7);
    b.sph('tvFinial', 0.135, xFront, TV_Y3 + 0.24, z, 1, 1.3, 1);
    b.sph('tvFinial', 0.135, xBack, TV_Y3 + 0.24, z, 1, 1.3, 1);
  });
  b.cyl('tvGold', 0.10, 0.16, 0.34, 10, TV_XR, TV_RG + 0.42, 0);
  b.sph('tvGold', 0.16, TV_XR, TV_RG + 0.70, 0, 1, 1.15, 1);
  b.sph('tvGold', 0.10, TV_XR, TV_RG + 0.90, 0, 1, 1.1, 1);
  /* 前檐瓦当一排 */
  for (let z = zA + 0.15; z < zB; z += 0.34)
    b.cyl('tvTileL', 0.055, 0.055, 0.09, 7, xFront + 0.02, TV_Y3 + 0.06, z, Math.PI / 2, 0, 0);
  /* 檐下椽头与匾托 */
  b.box('tvEave', 0.24, 0.20, zB - zA, xFront - 0.06, TV_Y3 + 0.02, 0);
  b.box('tvEave', 0.22, 0.20, zB - zA, xBack + 0.06, TV_Y3 + 0.02, 0);
}

/* ------------------------------------------------------------ 三层室内 */
function tvTableSet(b, x, z, y, ry, round, s) {
  s = s || 1;
  const K = 'tvTable', D = 'tvTableD';
  if (round) {
    b.cyl(K, 0.62 * s, 0.62 * s, 0.075 * s, 14, x, y + 0.74 * s, z);
    b.cyl(D, 0.11 * s, 0.15 * s, 0.74 * s, 9, x, y + 0.37 * s, z);
    b.cyl(D, 0.36 * s, 0.36 * s, 0.055 * s, 12, x, y + 0.03 * s, z);
  } else {
    b.box(K, 1.16 * s, 0.085 * s, 1.16 * s, x, y + 0.76 * s, z, 0, ry || 0, 0);
    for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2)
      tvB(b, D, 0.10 * s, 0.76 * s, 0.10 * s, x, y, z, ry || 0, i * 0.47 * s, 0.38 * s, j * 0.47 * s);
  }
  /* 桌上：酒壶、两只碗、一碟菜 */
  b.cyl('tvPot', 0.115 * s, 0.085 * s, 0.23 * s, 10, x - 0.20 * s, y + 0.90 * s, z - 0.10 * s);
  b.cyl('tvPotD', 0.045 * s, 0.045 * s, 0.10 * s, 8, x - 0.20 * s, y + 1.06 * s, z - 0.10 * s);
  for (let i = 0; i < 2; i++) {
    b.cyl('tvCupW', 0.105 * s, 0.072 * s, 0.10 * s, 10,
      x + (0.14 + i * 0.26) * s, y + 0.83 * s, z + (i ? 0.20 : -0.18) * s);
  }
  b.cyl('tvDish', 0.20 * s, 0.17 * s, 0.045 * s, 12, x + 0.02 * s, y + 0.81 * s, z + 0.30 * s);
  b.sph('tvFood', 0.085 * s, x + 0.02 * s, y + 0.86 * s, z + 0.30 * s, 1, 0.6, 1);
}
function tvStool(b, x, y, z, ry) {
  b.cyl('tvStool', 0.20, 0.20, 0.075, 10, x, y + 0.42, z);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + (ry || 0);
    b.cyl('tvStoolD', 0.035, 0.042, 0.40, 6, x + Math.cos(a) * 0.14, y + 0.20, z + Math.sin(a) * 0.14);
  }
}
function tvJar(b, x, y, z, s, k) {
  b.cyl(k || 'tvJar', 0.16 * s, 0.24 * s, 0.50 * s, 12, x, y + 0.25 * s, z);
  b.cyl('tvJarD', 0.13 * s, 0.16 * s, 0.12 * s, 12, x, y + 0.54 * s, z);
  b.cyl('tvJarL', 0.175 * s, 0.175 * s, 0.045 * s, 12, x, y + 0.61 * s, z);
  b.box('tvPaper', 0.17 * s, 0.20 * s, 0.012, x, y + 0.30 * s, z + 0.225 * s);
}
function tvScreen(b, x, y, z, w, h, ry) {
  b.box('tvScreen', 0.10, h, w, x, y + h / 2, z, 0, ry || 0, 0);
  const n = Math.max(3, Math.round(w / 0.26));
  for (let i = 1; i < n; i++)
    tvB(b, 'tvScreenD', 0.12, h - 0.18, 0.045, x, y, z, ry || 0, 0, h / 2, -w / 2 + w * i / n);
  b.box('tvWoodD', 0.14, 0.09, w + 0.10, x, y + h - 0.02, z, 0, ry || 0, 0);
}

/* ------------------------------------------------------------ 后半堂填充
   ★ 教训：家具若全挤在靠正面门窗的一半（x > -2.4），从剖开的 +Z 山墙
     看进去，进深后半 3.5 米就是一整片空地板，每层「只有一半有内容」。
     补齐四条：① 每层后半至少两席，且一席贴剖口侧（z > 2.5）保证第一眼
     看得见；② 补一件面朝剖口的竖向背景（屏风 ry=π/2 让宽沿 X）；
     ③ 人物错开朝向；④ 后半必须单独补点光，否则补了家具也是黑的。 */
function tvBackHall(b) {
  const Bk = TV_X0, G = TV_GY, Y1 = TV_Y1, Y2 = TV_Y2;

  /* ---- 一层后堂：两席散座 + 大酒瓮 + 掌柜跑堂 ---- */
  tvTableSet(b, -3.30, 3.05, G, 0.10, false, 0.94);
  [[-3.30, 1.95], [-3.30, 4.15], [-4.40, 3.05], [-2.20, 3.05]].forEach(function (q) {
    tvStool(b, q[0], G, q[1], 0);
  });
  tvPed(b, -3.30, G, 1.95, 0.15, 'sit', 'tvRobeA');
  tvPed(b, -3.30, G, 4.15, Math.PI, 'sit', 'tvRobeC');
  tvTableSet(b, -3.55, -2.55, G, 0, true, 0.88);
  for (let i = 0; i < 3; i++)
    tvStool(b, -3.55 + Math.cos(i * 2.1) * 0.86, G, -2.55 + Math.sin(i * 2.1) * 0.86, 0);
  tvPed(b, -3.55, G, -3.42, 0, 'sit', 'tvRobeB');
  tvPed(b, -2.68, G, -2.55, -1.1, 'sit', 'tvRobeA');
  /* 大酒瓮：塞进两席之间的空档 */
  b.box('tvWoodD', 0.76, 0.08, 2.20, -4.72, G + 0.02, 0.08);
  for (let i = 0; i < 3; i++)
    tvJar(b, -4.92 + (i % 2) * 0.56, G + 0.05, -0.72 + i * 0.62, 1.06,
      i === 1 ? 'tvJarL' : 'tvJar');
  tvPed(b, -5.15, G, 1.62, 0.5, 'stand', 'tvRobeB');
  tvPed(b, -2.38, G, 0.68, -0.8, 'stand', 'tvRobeC');
  /* 后堂落地罩：面朝剖口，宽沿 X，打破左端的空旷 */
  tvScreen(b, -5.18, G, -3.82, 1.72, 1.62, Math.PI / 2);

  /* ---- 二层后雅间：两席圆桌 + 屏风 + 花几 + 侍者 ---- */
  tvTableSet(b, -3.35, 3.12, Y1, 0, true, 0.90);
  for (let i = 0; i < 3; i++)
    tvStool(b, -3.35 + Math.cos(i * 2.1) * 0.88, Y1, 3.12 + Math.sin(i * 2.1) * 0.88, 0);
  tvPed(b, -3.35, Y1, 4.00, Math.PI, 'sit', 'tvRobeB');
  tvPed(b, -2.47, Y1, 3.12, -1.1, 'sit', 'tvRobeA');
  tvTableSet(b, -3.62, -2.52, Y1, 0, true, 0.88);
  for (let i = 0; i < 3; i++)
    tvStool(b, -3.62 + Math.cos(i * 2.1) * 0.86, Y1, -2.52 + Math.sin(i * 2.1) * 0.86, 0);
  tvPed(b, -3.62, Y1, -3.38, 0, 'sit', 'tvRobeC');
  tvPed(b, -2.76, Y1, -2.52, -1.1, 'sit', 'tvRobeB');
  tvScreen(b, -5.10, Y1, -3.90, 2.30, 1.68, Math.PI / 2);
  /* 花几上的盆景 */
  b.cyl('tvWoodD', 0.19, 0.25, 0.62, 9, -2.42, Y1 + 0.31, 0.55);
  b.cyl('tvJarD', 0.22, 0.18, 0.20, 10, -2.42, Y1 + 0.72, 0.55);
  tvBlob(b, 'tvLeaf2', -2.42, Y1 + 1.02, 0.55, 0.31, 0.25, 0.31, 3.7);
  tvBlob(b, 'tvLeaf1', -2.42, Y1 + 1.22, 0.55, 0.25, 0.21, 0.25, 8.3);
  tvPed(b, -2.52, Y1, 1.72, -0.7, 'stand', 'tvRobeC');
  /* 二层左端（靠后墙角）补一组花架，填掉剖口最左边的空当 */
  b.box('tvWoodD', 0.46, 0.075, 1.55, Bk + 0.62, Y1 + 0.50, -4.45);
  b.box('tvWoodD', 0.46, 0.075, 1.55, Bk + 0.62, Y1 + 1.10, -4.45);
  for (let i = 0; i < 3; i++) {
    const zz = -4.95 + i * 0.52;
    b.cyl('tvJarD', 0.15, 0.13, 0.18, 9, Bk + 0.62, Y1 + 0.62, zz);
    tvBlob(b, i % 2 ? 'tvLeaf1' : 'tvLeaf3', Bk + 0.62, Y1 + 0.86, zz,
      0.22, 0.20, 0.22, i * 3.3 + 2.1);
  }

  /* ---- 三层后雅阁：棋桌 + 琴案 + 卧榻 + 第二列博古架 ---- */
  tvTableSet(b, -3.32, 2.98, Y2, 0, true, 0.84);
  [[-3.32, 3.80], [-3.32, 2.16], [-2.52, 2.98]].forEach(function (q) {
    tvStool(b, q[0], Y2, q[1], 0);
  });
  tvPed(b, -3.32, Y2, 3.80, Math.PI, 'sit', 'tvRobeA');
  tvPed(b, -3.32, Y2, 2.16, 0, 'sit', 'tvRobeC');
  /* 琴案：案面 + 琴身 + 五根弦 */
  b.box('tvTable', 1.46, 0.085, 0.64, -4.16, Y2 + 0.74, -2.46);
  for (let i = -1; i <= 1; i += 2)
    b.box('tvTableD', 0.10, 0.74, 0.56, -4.16 + i * 0.60, Y2 + 0.37, -2.46);
  b.box('tvInk', 1.18, 0.055, 0.28, -4.16, Y2 + 0.81, -2.46);
  for (let i = 0; i < 5; i++)
    b.box('tvPaper', 1.08, 0.012, 0.014, -4.16, Y2 + 0.844, -2.58 + i * 0.062);
  /* 卧榻 + 靠枕 */
  b.box('tvWoodD', 1.72, 0.16, 0.88, -4.86, Y2 + 0.34, 0.36);
  b.box('tvTableD', 1.72, 0.28, 0.10, -4.86, Y2 + 0.48, -0.04);
  b.box('tvPaper', 0.60, 0.14, 0.30, -4.44, Y2 + 0.51, 0.36);
  /* 博古架第二列（原来只有 z=3.10 一列，z 负侧全空） */
  for (let f = 0; f < 3; f++)
    b.box('tvWoodD', 0.40, 0.07, 1.80, Bk + 0.46, Y2 + 0.55 + f * 0.62, -2.55);
  for (let f = 0; f < 2; f++)
    for (let z = -3.18; z < -1.86; z += 0.66)
      tvJar(b, Bk + 0.48, Y2 + 0.62 + f * 0.62, z, 0.40, f ? 'tvJarL' : 'tvJar');
  tvScreen(b, -5.12, Y2, -4.05, 1.86, 1.52, Math.PI / 2);
  tvPed(b, -2.30, Y2, 4.62, -1.3, 'stand', 'tvRobeA');
  tvPed(b, -5.05, Y2, -1.20, 0.6, 'stand', 'tvRobeC');
}

function tvInterior(b) {
  const F = TV_X1, Bk = TV_X0, L = TV_Z0, R = TV_Z1;
  tvBackHall(b);

  /* ---- 一层：大堂。柜台正对门，两桌靠窗，酒坛靠后墙 ---- */
  b.box('tvCounter', 0.78, 1.06, 3.30, -1.20, TV_GY + 0.53, -2.60);
  b.box('tvCounterD', 0.94, 0.10, 3.50, -1.20, TV_GY + 1.10, -2.60);
  b.box('tvWoodL', 0.10, 0.55, 3.10, -0.78, TV_GY + 0.80, -2.60);
  for (let i = 0; i < 3; i++) {
    b.box('tvAbacus', 0.30, 0.035, 0.20, -1.20, TV_GY + 1.17, -3.55 + i * 0.85);
    for (let j = 0; j < 5; j++)
      b.cyl('tvGold', 0.017, 0.017, 0.16, 6, -1.20 + (j - 2) * 0.048, TV_GY + 1.20, -3.55 + i * 0.85);
  }
  /* 柜台后酒架：三层横板 + 一排酒坛 */
  for (let f = 0; f < 3; f++)
    b.box('tvWoodD', 0.42, 0.075, 4.20, Bk + 0.48, TV_GY + 0.66 + f * 0.68, 1.75);
  for (let z = -0.15; z < 3.75; z += 0.62) {
    tvJar(b, Bk + 0.50, TV_GY + 0.70, z, 0.72, 'tvJar');
    tvJar(b, Bk + 0.50, TV_GY + 1.38, z + 0.22, 0.62, 'tvJarL');
  }
  /* 门轴正后方必须有东西：不然门洞敞开了，看进去只是一块空地板 */
  tvTableSet(b, 0.55, 0.15, TV_GY, 0.08, false, 0.92);
  [[0.55, -0.75], [0.55, 1.05], [-0.35, 0.15]].forEach(function (q) {
    tvStool(b, q[0], TV_GY, q[1], 0);
  });
  tvPed(b, -0.55, TV_GY, 0.15, Math.PI * 0.15, 'stand', 'tvRobeB');
  /* 两张八仙桌靠正面窗（视线从窗进来先撞到它们） */
  tvTableSet(b, 0.92, -3.25, TV_GY, 0.12, false, 1.0);
  tvTableSet(b, 0.92, 3.25, TV_GY, -0.10, false, 1.0);
  [[0.92, -4.30], [0.92, -2.20], [-0.10, -3.25], [1.94, -3.25],
   [0.92, 2.20], [0.92, 4.30], [-0.10, 3.25], [1.94, 3.25]].forEach(function (q) {
    tvStool(b, q[0], TV_GY, q[1], 0);
  });
  /* 剖口侧（+Z）再摆一桌，从侧面能读到一层是「吃饭的地方」 */
  tvTableSet(b, -1.60, 4.30, TV_GY, 0.3, true, 0.86);
  for (let i = 0; i < 3; i++) tvStool(b, -1.60 + Math.cos(i * 2.1) * 0.86, TV_GY, 4.30 + Math.sin(i * 2.1) * 0.86, 0);
  /* 楼梯：沿 -X 向 -Z 爬，整段实心踏步 */
  for (let i = 0; i < 11; i++) {
    const xx = Bk + 0.70 + i * 0.30;
    b.box('tvWoodD', 0.30, 0.16 + i * 0.145, 1.05, xx, TV_GY + (0.16 + i * 0.145) / 2, L + 1.05);
  }
  b.box('tvRail', 3.40, 0.07, 0.075, Bk + 2.35, TV_GY + 1.75, L + 0.56, 0, 0, 0.34);
  /* 一层的人：店小二（白围裙）+ 三位酒客 */
  tvPed(b, -0.42, TV_GY, -2.60, 0.2, 'stand', 'tvRobeB');
  tvPed(b, 0.92, TV_GY, -4.30, 0.0, 'sit', 'tvRobeC');
  tvPed(b, 0.92, TV_GY, -2.20, Math.PI, 'sit', 'tvRobeA');
  tvPed(b, 0.92, TV_GY, 4.30, Math.PI, 'sit', 'tvRobeB');
  tvPed(b, 2.05, TV_GY, 0.10, -0.7, 'stand', 'tvRobeC');

  /* ---- 二层：雅座。屏风分间，两桌圆席靠窗，一桌靠剖口 ---- */
  tvScreen(b, -1.90, TV_Y1, -2.35, 2.70, 2.05, 0);
  tvScreen(b, -1.90, TV_Y1, 2.35, 2.70, 2.05, 0);
  tvTableSet(b, 0.70, -3.30, TV_Y1, 0, true, 0.94);
  tvTableSet(b, 0.70, 3.30, TV_Y1, 0, true, 0.94);
  tvTableSet(b, -1.90, 4.25, TV_Y1, 0, true, 0.82);
  for (let c = 0; c < 2; c++) {
    const zc = c ? 3.30 : -3.30;
    for (let i = 0; i < 3; i++)
      tvStool(b, 0.70 + Math.cos(i * 2.1) * 0.90, TV_Y1, zc + Math.sin(i * 2.1) * 0.90, 0);
  }
  /* 墙上挂画（在后墙的室内背板上） */
  for (let i = 0; i < 2; i++) {
    const zz = i ? 2.20 : -2.20;
    b.box('tvWoodD', 0.055, 1.10, 0.86, Bk + 0.22, TV_Y1 + 1.75, zz);
    b.box('tvScroll', 0.062, 0.96, 0.72, Bk + 0.26, TV_Y1 + 1.75, zz);
    b.box('tvInk', 0.068, 0.055, 0.80, Bk + 0.27, TV_Y1 + 2.23, zz);
    b.box('tvInk', 0.068, 0.055, 0.80, Bk + 0.27, TV_Y1 + 1.27, zz);
  }
  tvPed(b, 0.70, TV_Y1, -4.20, 0, 'sit', 'tvRobeA');
  tvPed(b, 0.70, TV_Y1, 4.20, Math.PI, 'sit', 'tvRobeC');
  tvPed(b, F - 0.85, TV_Y1, 0.30, -0.9, 'stand', 'tvRobeB');

  /* ---- 三层：雅阁。一席大圆桌 + 书案 + 博古架 ---- */
  tvTableSet(b, 0.55, 0.10, TV_Y2, 0, true, 1.18);
  for (let i = 0; i < 5; i++)
    tvStool(b, 0.55 + Math.cos(i * 1.26) * 1.12, TV_Y2, 0.10 + Math.sin(i * 1.26) * 1.12, 0);
  /* 书案 */
  b.box('tvTable', 1.50, 0.09, 0.72, -2.35, TV_Y2 + 0.76, -3.45);
  for (let i = -1; i <= 1; i += 2)
    b.box('tvTableD', 0.10, 0.76, 0.62, -2.35 + i * 0.62, TV_Y2 + 0.38, -3.45);
  b.box('tvPaper', 0.66, 0.012, 0.46, -2.35, TV_Y2 + 0.815, -3.45);
  b.cyl('tvBrush', 0.028, 0.028, 0.30, 7, -2.05, TV_Y2 + 0.90, -3.20, 0, 0, Math.PI / 2);
  b.cyl('tvInk', 0.09, 0.11, 0.10, 10, -2.72, TV_Y2 + 0.85, -3.20);
  /* 博古架：三格 + 几件摆设 */
  for (let f = 0; f < 3; f++)
    b.box('tvWoodD', 0.40, 0.07, 2.00, Bk + 0.46, TV_Y2 + 0.55 + f * 0.62, 3.10);
  for (let f = 0; f < 2; f++)
    for (let z = 2.35; z < 3.90; z += 0.72)
      tvJar(b, Bk + 0.48, TV_Y2 + 0.62 + f * 0.62, z, 0.42, f ? 'tvJarL' : 'tvJar');
  tvScreen(b, -0.15, TV_Y2, 3.35, 2.20, 1.85, Math.PI / 2);
  /* 剖口侧也留一席：三层从 +Z 看进去不能是空的 */
  tvTableSet(b, 0.05, 4.25, TV_Y2, 0, true, 0.80);
  for (let i = 0; i < 3; i++)
    tvStool(b, 0.05 + Math.cos(i * 2.1) * 0.80, TV_Y2, 4.25 + Math.sin(i * 2.1) * 0.80, 0);
  tvPed(b, 0.05, TV_Y2, 3.35, Math.PI, 'sit', 'tvRobeC');
  tvPed(b, 0.55, TV_Y2, -1.10, 0, 'sit', 'tvRobeB');
  tvPed(b, 1.70, TV_Y2, 0.55, Math.PI * 0.8, 'sit', 'tvRobeA');
  tvPed(b, F - 0.90, TV_Y2, -0.80, -1.2, 'stand', 'tvRobeC');

  /* 梁下宫灯的吊绳：挂在正面檐下，正对下面那排灯笼 */
  for (let f = 0; f < 3; f++) {
    const ey = FLX(f) - (f === 0 ? 0.28 : 0.32);
    [-2.00, 2.00].forEach(function (z) {
      b.cyl('tvRope', 0.014, 0.014, 0.46, 5, TV_X1 + 0.80, ey - 0.23, z);
    });
  }
}
function FLX(f) { return f === 0 ? TV_Y1 : (f === 1 ? TV_Y2 : TV_Y3); }

/* ------------------------------------------------------------ 室外陈设 */
function tvProps(b) {
  const F = TV_X1;
  /* 门前石狮两只 */
  [-2.30, 2.30].forEach(function (z) {
    b.box('tvStoneD', 0.82, 0.30, 0.82, 3.55, TV_GD + 0.15, z);
    b.box('tvLion', 0.52, 0.52, 0.62, 3.55, TV_GD + 0.56, z);
    b.sph('tvLion', 0.24, 3.55, TV_GD + 0.96, z + 0.20, 1, 1, 0.9);
    b.sph('tvLionD', 0.085, 3.55, TV_GD + 1.00, z + 0.42, 1, 0.8, 0.6);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05;
      b.sph('tvLionD', 0.095, 3.55 + Math.cos(a) * 0.19, TV_GD + 0.99 + Math.sin(a) * 0.13, z + 0.10, 1, 1, 1);
    }
    b.box('tvLion', 0.16, 0.30, 0.16, 3.55 - 0.18, TV_GD + 0.48, z + 0.20);
  });
  /* 门两侧楹联木柱 + 幌子挑杆 */
  [-1.92, 1.92].forEach(function (z) {
    b.cyl('tvWoodD', 0.075, 0.085, 3.30, 8, F + 0.62, TV_GY + 1.65, z);
    b.box('tvGold', 0.08, 0.08, 0.08, F + 0.62, TV_GY + 3.34, z);
  });
  /* ★ 匾额必须挑在腰檐之外：腰檐外沿 F+0.62，牌面放 F+0.72 才不会被整条瓦檐吃掉 */
  b.box('tvSignBox', 0.13, 0.62, 3.10, F + 0.72, TV_GY + 2.98, 0);
  b.box('tvGold', 0.15, 0.045, 3.24, F + 0.73, TV_GY + 3.32, 0);
  b.box('tvGold', 0.15, 0.045, 3.24, F + 0.73, TV_GY + 2.64, 0);
  /* 楹联同样挑出柱前 */
  [-1.92, 1.92].forEach(function (z) {
    b.box('tvSignBox', 0.10, 2.05, 0.38, F + 0.70, TV_GY + 1.72, z);
  });

  /* 酒旗：杆 + 底座 + 横挑（布面是独立 Group，见 tvBanners） */
  b.cyl('tvWoodD', 0.085, 0.105, 4.60, 8, 6.60, TV_GD + 2.30, -5.55);
  b.box('tvStoneD', 0.46, 0.20, 0.46, 6.60, TV_GD + 0.10, -5.55);
  b.box('tvWoodD', 0.07, 0.07, 1.00, 6.60, TV_GD + 4.48, -5.05);
  b.cyl('tvGold', 0.075, 0.075, 0.10, 8, 6.60, TV_GD + 4.66, -5.55);

  /* 拴马桩 + 一匹马（放在远侧，别挡正面） */
  b.cyl('tvStoneD', 0.10, 0.13, 1.15, 8, 7.80, TV_GD + 0.58, -2.35);
  b.torus('tvMetal', 0.13, 0.028, 7.80, TV_GD + 1.05, -2.35, Math.PI / 2, 0, 0);
  b.box('tvHorse', 0.52, 0.62, 1.30, 6.70, TV_GD + 1.05, -2.35);
  b.box('tvHorseD', 0.34, 0.42, 0.42, 7.02, TV_GD + 1.42, -2.35);
  b.box('tvHorseD', 0.28, 0.26, 0.48, 7.28, TV_GD + 1.30, -2.35);
  for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2)
    b.box('tvHorseD', 0.13, 0.72, 0.14, 6.70 + i * 0.18, TV_GD + 0.36, -2.35 + j * 0.50);
  b.to('tvHorseD', 0.055, 6.36, TV_GD + 1.30, -2.35, 6.06, TV_GD + 1.78, -2.35, 6);
  b.cyl('tvRope', 0.012, 0.012, 1.20, 5, 7.42, TV_GD + 1.25, -2.35, 0, 0, Math.PI / 2);

  /* 街边货担（近侧压到 1.3 米以下，免得被画框切） */
  [5.10, 3.10].forEach(function (x, i) {
    const z = 6.10;
    b.cyl('tvJar', 0.34, 0.27, 0.40, 10, x, TV_GD + 0.22, z);
    b.cyl('tvJarD', 0.36, 0.36, 0.055, 10, x, TV_GD + 0.44, z);
    b.box('tvWoodD', 0.045, 0.045, 1.90, x + 0.95, TV_GD + 0.82, z, 0, 0, 0);
    for (let j = 0; j < 5; j++)
      b.sph(i ? 'tvFood' : 'tvFruit', 0.11, x, TV_GD + 0.48, z - 0.24 + j * 0.12, 1, 0.75, 1);
  });
  /* 门两侧酒坛堆：填掉台阶旁的空地，也点明这是酒楼（高度压在 0.8 米内） */
  [-3.85, 3.85].forEach(function (z, k) {
    for (let i = 0; i < 3; i++)
      tvJar(b, 3.45 + (i % 2) * 0.48, TV_GD, z + (i - 1) * 0.42, 0.86,
        i === 1 ? 'tvJarL' : 'tvJar');
    b.box('tvWoodD', 0.95, 0.08, 1.30, 3.68, TV_GD + 0.04, z);
  });
  /* 水缸 + 井台 */
  b.cyl('tvJarD', 0.44, 0.38, 0.72, 12, 4.50, TV_GD + 0.36, -6.30);
  b.cyl('tvWater', 0.40, 0.40, 0.03, 12, 4.50, TV_GD + 0.73, -6.30);
  b.torus('tvStoneL', 0.44, 0.055, 4.50, TV_GD + 0.72, -6.30, Math.PI / 2, 0, 0);

  /* 槐树：两棵都放远侧（-z），近侧留给广场 */
  tvTree(b, 5.30, -5.90, 1.00);
  tvTree(b, -8.20, -2.40, 0.78);
  /* 行人：三个，站在广场与台阶之间 */
  tvPed(b, 4.90, TV_GD, 1.05, -0.55, 'stand', 'tvRobeA');
  tvPed(b, 5.90, TV_GD, -0.65, 0.35, 'stand', 'tvRobeC');
  tvPed(b, 4.35, TV_GD, -3.70, 1.10, 'stand', 'tvRobeB');
  /* 地面落叶 / 石缝草：只在广场边缘，别铺满 */
  for (let i = 0; i < 26; i++) {
    const x = 3.40 + tvR(i * 3.1) * 5.80, z = -7.60 + tvR(i * 7.7) * 15.20;
    b.sph(i % 3 ? 'tvLeaf2' : 'tvLeaf3', 0.075, x, TV_GD + 0.055, z, 1, 0.35, 1.4);
  }
}
function tvTree(b, x, z, s) {
  b.cyl('tvBark', 0.16 * s, 0.24 * s, 2.20 * s, 9, x, TV_GD + 1.10 * s, z);
  for (let i = 0; i < 4; i++)
    b.to('tvBark', 0.075 * s, x, TV_GD + 1.80 * s, z,
      x + Math.cos(i * 1.6) * 0.72 * s, TV_GD + (2.60 + tvR(i + 3) * 0.45) * s,
      z + Math.sin(i * 1.6) * 0.72 * s, 6);
  const cols = ['tvLeaf1', 'tvLeaf2', 'tvLeaf3', 'tvLeaf1'];
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57;
    tvBlob(b, cols[i], x + Math.cos(a) * 0.62 * s,
      TV_GD + (2.95 + tvR(i * 2.3 + 1) * 0.38) * s,
      z + Math.sin(a) * 0.62 * s, 1.02 * s, 0.76 * s, 0.98 * s, i * 2.7 + 1.3);
  }
  tvBlob(b, 'tvLeaf1', x, TV_GD + 3.55 * s, z, 1.05 * s, 0.78 * s, 1.00 * s, 8.1);
}

/* ------------------------------------------------------------ 文字牌匾 */
function tvText(w, h, draw) { return canvasTex(w, h, draw); }
function tvPlane(parent, w, h, x, y, z, ry, tex, op) {
  const m = new T.MeshBasicMaterial({
    map: tex, side: T.DoubleSide, transparent: op !== undefined, opacity: op === undefined ? 1 : op
  });
  const p = new T.Mesh(new T.PlaneGeometry(w, h), m);
  p.position.set(x, y, z);
  if (ry) p.rotation.y = ry;
  parent.add(p);
  return p;
}
function tvSigns(g) {
  const F = TV_X1;
  /* 横匾「醉仙樓」：黑底金字，字要真写 */
  const plaque = tvText(768, 176, function (c, w, h) {
    c.fillStyle = '#241a13'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#b98d45'; c.lineWidth = 8; c.strokeRect(12, 12, w - 24, h - 24);
    c.strokeStyle = 'rgba(216,178,90,0.45)'; c.lineWidth = 2; c.strokeRect(24, 24, w - 48, h - 48);
    c.fillStyle = '#e2bf72';
    c.font = '600 108px KaiTi, STKaiti, SimSun, serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('醉仙樓', w / 2, h / 2 + 6);
  });
  tvPlane(g, 2.96, 0.56, F + 0.805, TV_GY + 2.98, 0, Math.PI / 2, plaque);

  /* 楹联：两句七字，竖排 */
  const lines = ['勸君更盡一杯酒', '與爾同銷萬古愁'];
  [-1.92, 1.92].forEach(function (z, i) {
    const t = tvText(128, 640, function (c, w, h) {
      c.fillStyle = '#2d2018'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#8d6c38'; c.lineWidth = 5; c.strokeRect(9, 9, w - 18, h - 18);
      c.fillStyle = '#dcc088';
      c.font = '600 68px KaiTi, STKaiti, SimSun, serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let k = 0; k < lines[i].length; k++)
        c.fillText(lines[i][k], w / 2, 66 + k * 74);
    });
    tvPlane(g, 0.34, 1.94, F + 0.765, TV_GY + 1.72, z, Math.PI / 2, t);
  });

  /* 一层柜台后的菜牌（贴在室内背板上，不挡窗） */
  const menu = tvText(256, 384, function (c, w, h) {
    c.fillStyle = '#e7dcc0'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#5c4630'; c.lineWidth = 9; c.strokeRect(12, 12, w - 24, h - 24);
    c.fillStyle = '#3b2c20';
    c.font = '600 66px KaiTi, STKaiti, SimSun, serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const s = ['酒', '菜', '茶', '飯'];
    for (let k = 0; k < s.length; k++) c.fillText(s[k], w / 2, 64 + k * 88);
  });
  tvPlane(g, 0.62, 0.92, TV_X0 + 0.245, TV_GY + 2.25, -0.05, Math.PI / 2, menu);
}

/* ------------------------------------------------------------ 灯笼 / 布幡 / 灯光 */
function tvLanterns(g) {
  const items = [];
  /* 正面檐下 4 盏 + 门口 2 盏 + 剖口侧 2 盏 */
  const pos = [
    [TV_X1 + 0.78, TV_GY + 2.62, -2.00, 1.00], [TV_X1 + 0.78, TV_GY + 2.62, 2.00, 1.00],
    [TV_X1 + 0.90, TV_Y1 + 2.62, -3.30, 0.86], [TV_X1 + 0.90, TV_Y1 + 2.62, 3.30, 0.86],
    [TV_X1 + 0.90, TV_Y2 + 2.48, -3.10, 0.80], [TV_X1 + 0.90, TV_Y2 + 2.48, 3.10, 0.80],
    [TV_X1 - 0.90, TV_Y1 + 2.20, 4.30, 0.72], [TV_X1 - 0.90, TV_Y2 + 2.10, 4.30, 0.72]
  ];
  for (let i = 0; i < pos.length; i++) {
    const q = pos[i], s = q[3];
    const grp = new T.Group();
    grp.position.set(q[0], q[1], q[2]);
    const b = new Builder();
    b.cyl('tvRope', 0.014, 0.014, 0.30 * s, 5, 0, 0.15 * s, 0);
    b.cyl('tvLantern', 0.27 * s, 0.27 * s, 0.44 * s, 12, 0, -0.22 * s, 0, 0, 0, 0);
    b.cyl('tvLantern', 0.18 * s, 0.27 * s, 0.12 * s, 12, 0, 0.03 * s, 0);
    b.cyl('tvLantern', 0.27 * s, 0.18 * s, 0.12 * s, 12, 0, -0.47 * s, 0);
    b.cyl('tvGold', 0.29 * s, 0.29 * s, 0.045 * s, 12, 0, 0.09 * s, 0);
    b.cyl('tvGold', 0.29 * s, 0.29 * s, 0.045 * s, 12, 0, -0.53 * s, 0);
    for (let j = 0; j < 7; j++)
      b.cyl('tvTassel', 0.014 * s, 0.008 * s, 0.26 * s, 5,
        Math.cos(j * 0.9) * 0.16 * s, -0.68 * s, Math.sin(j * 0.9) * 0.16 * s);
    /* 灯笼上的「酒」字：一小片加色亮芯，远看是暖光点 */
    b.sph('tvCandle', 0.11 * s, 0.26 * s, -0.22 * s, 0, 0.35, 1, 1);
    b.build(grp, { noOutline: ['tvRope', 'tvTassel', 'tvCandle'] });
    g.add(grp);
    grp.userData.ph = i * 0.83;
    items.push(grp);
  }
  CT_ANIM.push(function (t) {
    for (let i = 0; i < items.length; i++)
      items[i].rotation.z = Math.sin(t * 0.85 + items[i].userData.ph) * 0.055;
  });
}
function tvBanners(g) {
  const tex = tvText(192, 640, function (c, w, h) {
    c.fillStyle = '#a83c2c'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,225,180,0.10)';
    for (let i = 0; i < 14; i++) c.fillRect(0, i * h / 14, w, 3);
    c.strokeStyle = '#e8c98a'; c.lineWidth = 7; c.strokeRect(13, 13, w - 26, h - 26);
    c.fillStyle = '#f3dda8';
    c.font = '600 150px KaiTi, STKaiti, SimSun, serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('酒', w / 2, 200);
    c.font = '600 78px KaiTi, STKaiti, SimSun, serif';
    const s = ['佳', '醞', '三', '杯'];
    for (let i = 0; i < s.length; i++) c.fillText(s[i], w / 2, 360 + i * 70);
  });
  const grp = new T.Group();
  grp.position.set(6.62, TV_GD + 3.38, -5.05);
  const p = tvPlane(grp, 0.62, 2.05, 0, 0, 0, Math.PI / 2, tex);
  p.geometry = new T.PlaneGeometry(0.62, 2.05, 3, 8);
  g.add(grp);
  CT_ANIM.push(function (t) {
    grp.rotation.y = Math.sin(t * 0.72) * 0.13;
    grp.rotation.z = Math.sin(t * 1.05 + 0.4) * 0.035;
  });
  /* 门楣两侧各一面小三角旗 */
  const flagTex = tvText(192, 256, function (c, w, h) {
    c.fillStyle = '#c25a36'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#f4e0b4';
    c.font = '600 128px KaiTi, STKaiti, SimSun, serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('酒', w / 2, h / 2);
  });
  [-3.35, 3.35].forEach(function (z, i) {
    const fg = new T.Group();
    fg.position.set(TV_X1 + 0.30, TV_Y1 - 0.55, z);
    tvPlane(fg, 0.42, 0.56, 0, 0, 0, Math.PI / 2, flagTex);
    g.add(fg);
    CT_ANIM.push(function (t) { fg.rotation.z = Math.sin(t * 1.3 + i) * 0.07; });
  });
}
function tvLights() {
  /* 三层各四盏暖点光：前半两盏照门窗视线，后半两盏照新补的后堂。
     ★ 只把灯放在 x>-1 会让进深后半死黑，视觉上就是「半层楼是空的」。
     第 5 项是单独的衰减距离，后堂灯压小一点，免得串到相邻楼层。 */
  const L = [
    [-1.10, TV_GY + 2.55, -2.60, 4.8, 7.2], [0.60, TV_GY + 2.55, 2.80, 4.5, 7.2],
    [-1.10, TV_Y1 + 2.45, -2.60, 4.4, 7.2], [0.60, TV_Y1 + 2.45, 2.80, 4.2, 7.2],
    [-1.10, TV_Y2 + 2.30, -2.60, 4.0, 7.2], [0.60, TV_Y2 + 2.30, 2.80, 3.8, 7.2],
    [-4.05, TV_GY + 2.40, 1.30, 3.6, 6.0], [-3.55, TV_GY + 2.35, -2.55, 3.0, 5.4],
    [-4.05, TV_Y1 + 2.35, 1.30, 3.4, 6.0], [-3.55, TV_Y1 + 2.30, -2.55, 2.9, 5.4],
    [-4.05, TV_Y2 + 2.20, 1.30, 3.2, 6.0], [-3.55, TV_Y2 + 2.15, -2.55, 2.8, 5.4]
  ];
  for (let i = 0; i < L.length; i++) {
    const q = L[i];
    const lp = new T.PointLight(0xffcf92, q[3] * cfg(PS.lampK, 1), q[4] || 7.2, 2);
    lp.position.set(q[0], q[1], q[2]);
    scene.add(lp);
  }
  const door = new T.PointLight(0xffdcae, 3.6 * cfg(PS.lampK, 1), 6.0, 2);
  door.position.set(TV_X1 + 1.15, TV_GY + 2.30, 0);
  scene.add(door);
  const court = new T.PointLight(0xffbc83, 2.2 * cfg(PS.lampK, 1), 8.0, 2);
  court.position.set(5.20, 3.20, -2.0);
  scene.add(court);
}

/* ------------------------------------------------------------ 组装 */
const TV_NO = [
  'tvLattice', 'tvWallIn', 'tvFloor', 'tvFloorD', 'tvCeil', 'tvPave', 'tvPaveD',
  'tvPaveL', 'tvSoil', 'tvSoilD', 'tvLeaf1', 'tvLeaf2', 'tvLeaf3', 'tvTuft',
  'tvRope', 'tvTassel', 'tvCandle', 'tvPaper', 'tvAbacus', 'tvBrush', 'tvInk',
  'tvCupW', 'tvDish', 'tvFood', 'tvFruit', 'tvWater', 'tvScroll', 'tvMetal'
];
function buildTvAll() {
  const g = new T.Group();
  const b = new Builder();
  tvBase(b);
  tvShell(b);
  tvInterior(b);
  tvProps(b);
  b.build(g, { noOutline: TV_NO });
  scene.add(g);
  tvSigns(g);
  tvLanterns(g);
  tvBanners(g);
  tvLights();
  if (window.__expose) {
    window.__tv = { floors: 3, eave: TV_Y3, ridge: TV_RG, cutSide: '+Z' };
  }
}

  /* ================= 组装 ================= */
  const TOWER = !!PS.tower;
  const STORE = !!PS.store;
  const CLUB = !!PS.club;
  const WRH = !!PS.wh;
  if (TV) {
    buildTvAll();
  } else if (DK) {
    buildDkAll();
  } else if (SEC) {
    buildSecAll();
  } else if (RW) {
    buildRwAll();
  } else if (LN) {
    buildLnAll();
  } else if (RL) {
    buildRlAll();
  } else if (KFC) {
    scene.add(buildKfcSite());
    scene.add(buildKfcShell());
    scene.add(buildKfcInterior());
    scene.add(buildKfcProps());
  } else   if (CTY) {
    scene.add(buildCtBase());
    scene.add(buildCtExterior());
    scene.add(buildCtSkyline());
    scene.add(buildCtA());
    scene.add(buildCtB());
    scene.add(buildCtC());
    scene.add(buildCtD());
    scene.add(buildCtE());
    scene.add(buildCtF());
    scene.add(buildCtAveRow());
    scene.add(buildCtSigns());
    scene.add(buildCtLandmarks());
    scene.add(buildCtBridges());
    scene.add(buildCtArcade());
    scene.add(buildCtMarket());
    scene.add(buildCtPylons());
    scene.add(buildCtStreet());
    scene.add(buildCtWet());
    scene.add(buildCtHolo());
    scene.add(buildCtSpanBridges());
    scene.add(buildCtNewTown());
    buildCtTraffic();
    buildCtExtLife();
  } else if (CYB) {
    scene.add(buildCyBase());
    scene.add(buildCyA());
    scene.add(buildCyB());
    scene.add(buildCyC());
    scene.add(buildCyD());
    scene.add(buildCyAlley());
    scene.add(buildCyStreet());
    scene.add(buildCyBoard());
  } else if (JD) {
    scene.add(buildJdSite());
    scene.add(buildJdHouse());
    scene.add(buildJdRoom());
    scene.add(buildJdWing());
    scene.add(buildJdFlat());
    scene.add(buildJdYard());
  } else if (WRH) {
    scene.add(buildWhSite());
    scene.add(buildWhShell());
    scene.add(buildWhInterior());
    if (window.__expose) window.__mv = MOVERS;
  } else if (CLUB) {
        scene.add(buildClubSite());
        scene.add(buildClub());
    // 停车场：车头朝店面，部分车位留空
    const PZ0 = -6.95, PST = 1.62;
    const cars = [
      [0, 'carBody', 0.72], [1, 'carBody3', 0.72], [2, 'carBody2', 0.72],
      [4, 'carBody4', 0.72], [5, 'carBody5', 0.72], [7, 'carBody', 0.72]
    ];
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      scene.add(buildCar(4.70, PZ0 + (c[0] + 0.5) * PST, Math.PI, c[1], c[2]));
    }
  } else if (STORE) {
    scene.add(buildStoreBase());
    scene.add(buildStore());
    scene.add(buildCar(5.90, -2.30, Math.PI));
    scene.add(buildCar(5.95, -4.90, Math.PI, 'carBody2'));
  } else {
    scene.add(buildBase());
    scene.add(buildWater());
    if (!TOWER) scene.add(buildSurroundings());
    if (TOWER) {
      scene.add(buildTower());
    } else {
      scene.add(buildHouse());
      scene.add(buildInterior());
      scene.add(buildTerrace());
      scene.add(buildBridge());
    }
  }

  /* 室内暖光 */
  const LAMPK = cfg(PS.lampK, 1);
  if (TV) {
    /* 三层暖点光与门口补光已在 buildTvAll() 内按灯位布好 */
  } else if (DK) {
    /* 全场唯一的光源是灯罩里的聚光灯，已在 buildDkAll() 内布好 */
  } else if (SEC) {
    /* 每层一盏室内灯 + 隧道两盏 + 路灯一盏，都在 buildSecAll() 里按位置布好 */
  } else if (RW) {
    /* 春日上午的散射光已经够亮，不设点光；一放暖灯就变成傍晚了 */
  } else if (LN) {
    /* 灯街的 6 盏暖点光已在 buildLnAll() 内按灯位布置 */
  } else if (RL) {
    /* 寒江雪不设任何点光：暖光会毁掉「寒」，全靠天光 + 低饱和材质 */
  } else if (KFC) {
    /* 店内冷白顶光 + 门口暖光 + 招牌泛光。点光压在梁下，别贴吊顶 */
    const kfL = [
      [-6.20, 3.20, -3.30, 16, 7.0], [-6.20, 3.20, 1.80, 15, 7.0],
      [-3.20, 3.20, -3.00, 14, 7.0], [-3.20, 3.20, 2.60, 13, 7.0],
      [-0.40, 3.20, -2.60, 14, 7.0], [-0.40, 3.20, 2.20, 13, 7.0],
      [1.60, 3.20, -0.40, 12, 6.0]
    ];
    for (let i = 0; i < kfL.length; i++) {
      const q = kfL[i];
      const lp = new T.PointLight(0xf4f8ff, q[3] * LAMPK, q[4], 2);
      lp.position.set(q[0], q[1], q[2]); scene.add(lp);
    }
    const kd = new T.PointLight(0xfff2dc, 9 * LAMPK, 5.0, 2);
    kd.position.set(2.90, 2.60, 0.10); scene.add(kd);
    [[-3.40], [3.40]].forEach(function (q) {
      const lp = new T.PointLight(0xffe6d0, 7 * LAMPK, 5.4, 2);
      lp.position.set(2.90, 4.90, q[0]); scene.add(lp);
    });
  } else   if (CTY) {
    /* 城市尺度的点光：只放在「有招牌的地方」，靠自发光和加色片铺满全场 */
    const ctL = [
      [-3.70, 6.50, 0.00, 0xffb060, 26.0, 22.0],   // 广场钠灯
      [-20.00, 4.40, 7.70, 0xff2d7a, 16.0, 14.0],  // 商店街拱顶下
      [-8.00, 3.40, 7.70, 0xffcf8a, 14.0, 12.0],   // 市场东段
      [8.20, 9.00, -14.80, 0x2fe8ff, 22.0, 18.0],  // 主天桥
      [5.00, 13.00, -12.60, 0xffd23f, 26.0, 20.0], // B 竖招牌
      [12.20, 12.00, -20.20, 0xff2d7a, 24.0, 20.0],// C 竖招牌
      [8.20, 6.50, 16.00, 0xff2d7a, 20.0, 18.0],   // 南段街口
      [14.00, 3.20, 21.00, 0xff2d7a, 16.0, 12.0],  // パチンコ 门头
      [-20.60, 1.80, 23.00, 0xffb060, 8.0, 7.0],   // 稻荷社
      [4.05, 5.20, -18.00, 0xffe0a8, 14.0, 12.0],  // 高架步道
      [-4.00, 20.00, -19.00, 0x6a8fff, 22.0, 24.0],// 巨构冷光
      [17.40, 21.00, -18.60, 0x22e6ff, 22.0, 20.0], // 楼顶 LED 屏
      /* 外环：只在「有东西亮」的位置补光，别把夜景洗成白天 */
      [-40.0, 3.20, -18.0, 0x2fe8ff, 22.0, 20.0],  // 西河拱桥
      [8.0, 7.00, 41.0, 0xff3b3b, 28.0, 24.0],     // 水中大鸟居
      [36.0, 4.00, 41.0, 0x22e6ff, 22.0, 20.0],    // 水上舞台
      [60.0, 16.0, -10.0, 0x22e6ff, 26.0, 24.0],   // 摩天轮
      [-18.0, 14.0, -48.0, 0x64ff9c, 20.0, 18.0],  // 垂直农场
      [-56.0, 8.00, -6.0, 0xffd23f, 20.0, 18.0]    // 集装箱港
    ];
    for (let i = 0; i < ctL.length; i++) {
      const q = ctL[i];
      const lp = new T.PointLight(q[3], q[4] * LAMPK, q[5], 2);
      lp.position.set(q[0], q[1], q[2]);
      scene.add(lp);
    }
  } else if (CYB) {
    /* 霓虹点光：每盏都贴着自己那块招牌，颜色决定这一片的墙面偏色 */
    const cyL = [
      [-2.10, 3.60, -3.52, 0xff3d8f, 5.0, 4.4],   // 拉麺 洋红
      [-2.20, 4.80, -1.02, 0x35e0ff, 7.0, 5.2],   // 電脳酒場 青
      [-2.10, 5.10, 0.30, 0xff3d8f, 3.4, 3.4],    // 袖看板 BAR
      [-2.30, 3.00, 3.28, 0xffa62e, 5.0, 4.0],    // 酒処 琥珀
      [-1.90, 1.90, 3.30, 0xfff2d8, 6.0, 4.2],    // 店铺白
      [-2.20, 2.30, -4.80, 0xffc070, 3.6, 3.4],   // 拉面屋暖帘
      [-2.10, 2.20, 6.10, 0xffb347, 3.6, 3.2],    // 章鱼烧
      [-3.60, 1.70, 0.85, 0x8f7bff, 3.0, 3.4],    // 巷内紫
      [-6.10, 0.85, 0.85, 0xff9a5a, 1.6, 2.4],    // 稻荷社
      [1.20, 5.40, -1.20, 0xff4d9e, 6.0, 6.5]     // 屋顶广告牌
    ];
    for (let i = 0; i < cyL.length; i++) {
      const q = cyL[i];
      const lp = new T.PointLight(q[3], q[4] * LAMPK, q[5], 2);
      lp.position.set(q[0], q[1], q[2]);
      scene.add(lp);
    }
    /* 街口一盏低色温钠灯，给湿沥青一点暖底 */
    const sl = new T.PointLight(0xffb060, 5.5 * LAMPK, 7.5, 2);
    sl.position.set(-0.90, 6.40, 4.35);
    scene.add(sl);
  } else if (JD) {
    // 农家：檐下门灯 + 门楼灯笼 + 室内灶火/炕头灯
    const jd1 = new T.PointLight(0xffcf9a, 0.55 * LAMPK, 2.2, 2);
    jd1.position.set(DH1 + 0.30, 2.56, JD_ZM);
    scene.add(jd1);
    const jd2 = new T.PointLight(0xffd9a8, 1.1 * LAMPK, 2.2, 2);
    jd2.position.set(JD_X1 + 0.95, 2.45, JD_GATE - 0.55);
    scene.add(jd2);
    /* 室内三处：明间灶火偏橙、两次间炕头灯偏暖白
       —— 农村屋里本来就暗，灯只要够「看出有东西」，不能把墙照平 */
    [[-4.32, 1.80, JD_ZM - 0.52, 0xffb877, 1.35, 2.7],
     [-4.05, 1.74, JD_ZA, 0xffcf9a, 0.62, 2.3],
     [-4.05, 1.74, JD_ZB, 0xffcf9a, 0.62, 2.3]].forEach(function (q) {
      const lp = new T.PointLight(q[3], q[4] * LAMPK, q[5], 2);
      lp.position.set(q[0], q[1], q[2]);
      scene.add(lp);
    });
  } else if (WRH) {
    // 厂房高天棚冷白光源：避开屋架、压在柱网中间
    const whLights = [
      [-5.20, 4.60, -4.40, 20], [-5.20, 4.60, -0.60, 20], [-5.20, 4.60, 2.60, 16],
      [-2.10, 4.60, -4.40, 18], [-2.10, 4.60, -0.60, 18], [-2.10, 4.60, 2.60, 15],
      [0.90, 4.60, -4.40, 17], [0.90, 4.60, -0.60, 17], [1.00, 4.20, 3.10, 15]
    ];
    for (let i = 0; i < whLights.length; i++) {
      const q = whLights[i];
      const lp = new T.PointLight(0xf2f7ff, q[3] * LAMPK, 8.0, 2);
      lp.position.set(q[0], q[1], q[2]);
      scene.add(lp);
    }
    // 玻璃幕外侧补光，压住日光让室内可读
    const gl = new T.PointLight(0xeaf4ff, 14 * LAMPK, 6.0, 2);
    gl.position.set(3.60, 3.10, -1.20);
    scene.add(gl);
    // 装卸门雨棚下
    const dk = new T.PointLight(0xfff2dd, 10 * LAMPK, 5.0, 2);
    dk.position.set(-3.90, 3.40, 5.30);
    scene.add(dk);
  } else if (CLUB) {
    // 卖场高天棚照明
    const clubLights = [
      [-6.10, 4.85, -3.40, 22], [-3.30, 4.85, -3.40, 22], [-0.60, 4.85, -3.40, 18],
      [-6.10, 4.85, 0.60, 22], [-3.30, 4.85, 0.60, 22], [-0.60, 4.85, 0.60, 18],
      [-4.60, 4.85, 3.40, 17], [-1.30, 4.85, 3.40, 15]
    ];
    for (let i = 0; i < clubLights.length; i++) {
      const q = clubLights[i];
      const lp = new T.PointLight(0xf4f8ff, q[3] * LAMPK, 9.5, 2);
      lp.position.set(q[0], q[1], q[2]);
      scene.add(lp);
    }
    // 入口补光（压住外部强光，让门内可读）
    const dl = new T.PointLight(0xfff3e0, 12 * LAMPK, 5.0, 2);
    dl.position.set(2.10, 3.30, -2.95);
    scene.add(dl);
    // 招牌泛光
    const sl1 = new T.PointLight(0xffeccf, 10 * LAMPK, 5.2, 2);
    sl1.position.set(2.30, 6.90, -0.60);
    scene.add(sl1);
    const sl2 = new T.PointLight(0xffeccf, 7 * LAMPK, 4.4, 2);
    sl2.position.set(2.30, 6.90, 3.40);
    scene.add(sl2);
  } else if (STORE) {
    // 冷白卖场照明
    const lightPos = [[-3.4, 3.05, -1.9], [-0.6, 3.05, -1.9], [-3.4, 3.05, 1.6], [-0.6, 3.05, 1.6]];
    for (let i = 0; i < lightPos.length; i++) {
      const lp = new T.PointLight(0xf2f6ff, 6.5 * LAMPK, 5.0, 2);
      lp.position.set(lightPos[i][0], lightPos[i][1], lightPos[i][2]);
      scene.add(lp);
    }
    // 门口补光（让门内不被外部强光压死）
    const doorL = new T.PointLight(0xfff4e2, 10 * LAMPK, 4.4, 2);
    doorL.position.set(1.85, 2.55, 2.35);
    scene.add(doorL);
    // 招牌灯箱泛光
    const signL = new T.PointLight(0xfff0d8, 7 * LAMPK, 4.6, 2);
    signL.position.set(2.15, 3.86, 0.6);
    scene.add(signL);
    const signL2 = new T.PointLight(0xfff0d8, 5 * LAMPK, 3.8, 2);
    signL2.position.set(2.15, 3.86, -2.4);
    scene.add(signL2);
  } else if (TOWER) {
    const tc = [[-2.05, 2.3, -0.2, 15], [-2.05, 5.1, -0.2, 12], [-2.05, 7.7, -0.2, 9]];
    for (let i = 0; i < tc.length; i++) {
      const lp = new T.PointLight(0xffd8ae, tc[i][3] * LAMPK, 5.4, 2);
      lp.position.set(tc[i][0] + cfg(PS.towerCx, -2.05) + 2.05, tc[i][1], tc[i][2] + cfg(PS.towerCz, -0.2) + 0.2);
      scene.add(lp);
    }
  } else {
  const lamp1 = new T.PointLight(0xffd2a0, 17 * LAMPK, 6.5, 2);
  lamp1.position.set(-1.1, 2.55, -0.3);
  scene.add(lamp1);
  const lamp2 = new T.PointLight(0xffc890, 7 * LAMPK, 4.6, 2);
  lamp2.position.set(-4.0, 2.2, 0.2);
  scene.add(lamp2);
  const lamp3 = new T.PointLight(0xffca96, 10 * LAMPK, 5.5, 2);
  lamp3.position.set(-0.9, 4.55, -0.3);
  scene.add(lamp3);
  const lamp4 = new T.PointLight(0xffcf9c, 5 * LAMPK, 3.2, 2);
  lamp4.position.set(1.9, 1.5, 1.2);
  scene.add(lamp4);
  }

  const VEG = PS.veg || {};
  const willowPos = cfg(VEG.willows, (STORE || CLUB || JD || CYB || KFC || RL || LN || RW || SEC || DK || TV) ? [] : [[4.0, -4.35, 0.95], [-6.5, 1.95, 0.72]]);
  for (let i = 0; i < willowPos.length; i++) {
    scene.add(willow(willowPos[i][0], willowPos[i][1], willowPos[i][2]));
  }

  if (!STORE && !CLUB && !WRH && !JD && !CYB && !KFC && !RL && !LN && !RW && !SEC && !DK && !TV) {
    boatGroup = buildBoat(5.9, 1.15, Math.PI / 2 + 0.05);
    scene.add(boatGroup);
  }

  const bamPos = cfg(VEG.bamboo, (STORE || CLUB || WRH || JD || CYB || KFC || RL || LN || RW || SEC || DK || TV) ? [] : [[-7.0, -4.6, 1.0], [-6.9, 6.9, 0.75]]);
  for (let i = 0; i < bamPos.length; i++) scene.add(bamboo(bamPos[i][0], bamPos[i][1], bamPos[i][2]));
  const potPos = cfg(VEG.pots, (STORE || CLUB || WRH || JD || CYB || KFC || RL || LN || RW || SEC || DK || TV) ? [] : [[1.85, 2.35], [2.1, -2.55]]);
  for (let i = 0; i < potPos.length; i++) scene.add(pot(potPos[i][0], potPos[i][1]));

  /* ================= 招牌 / 布幡 / 晾布 ================= */
  if (!STORE && !CLUB && !WRH && !JD && !CYB && !KFC && !RL && !LN && !RW && !SEC && !DK && !TV) {
  const plaqueMat = new T.MeshBasicMaterial({ map: TEX.plaque });
  const psz = cfg(PS.plaqueSize, [1.55, 0.46]);
  const plaque = new T.Mesh(new T.PlaneGeometry(psz[0], psz[1]), plaqueMat);
  const ppos = cfg(PS.plaquePos, [1.73, 2.94, -0.4]);
  plaque.position.set(ppos[0], ppos[1], ppos[2]);
  plaque.rotation.y = cfg(PS.plaqueRot, Math.PI / 2);
  scene.add(plaque);
  }

  // 布幡
  const bannerUni = { uTime: { value: 0 }, uAmp: { value: 0.1 } };
  const clothVert =
    'uniform float uTime; uniform float uAmp; varying vec2 vUv;\n' +
    'void main(){ vUv = uv; vec3 p = position;\n' +
    '  float k = 1.0 - uv.y;\n' +
    '  p.z += sin(uTime*1.7 + position.y*3.4 + position.x*2.0) * uAmp * (0.15+k);\n' +
    '  p.x += sin(uTime*1.1 + position.y*2.2) * uAmp * 0.35 * k;\n' +
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);\n' +
    '}';
  const clothFrag =
    'uniform sampler2D map; varying vec2 vUv;\n' +
    'void main(){ gl_FragColor = texture2D(map, vUv); }';

  if (!TOWER && !STORE && !CLUB && !WRH && !JD && !CYB && !KFC && !RL && !LN && !RW && !SEC && !DK && !TV) {
  const bannerMat = new T.ShaderMaterial({
    uniforms: { uTime: bannerUni.uTime, uAmp: { value: 0.11 }, map: { value: TEX.banner } },
    vertexShader: clothVert, fragmentShader: clothFrag, side: T.DoubleSide
  });
  const banner = new T.Mesh(new T.PlaneGeometry(0.5, 1.65, 4, 8), bannerMat);
  banner.position.set(1.92, 2.62, 3.06);
  banner.rotation.y = Math.PI / 2;
  scene.add(banner);

  // 幡杆
  (function () {
    const b = new Builder();
    const g = new T.Group();
    b.cyl('woodDark', 0.055, 0.07, 4.1, 8, 1.92, 2.05, 2.98);
    b.box('woodDark', 0.07, 0.07, 0.55, 1.92, 4.08, 3.22);
    b.box('stoneD', 0.3, 0.16, 0.3, 1.92, 0.08, 2.98);
    b.build(g);
    scene.add(g);
  })();
  }

  // 晾晒蓝印花布
  const clothMat = new T.ShaderMaterial({
    uniforms: { uTime: bannerUni.uTime, uAmp: { value: 0.09 }, map: { value: TEX.calico } },
    vertexShader: clothVert, fragmentShader: clothFrag, side: T.DoubleSide
  });
  const cloths = [];
  if (!TOWER && !STORE && !CLUB && !WRH && !JD && !CYB && !KFC && !RL && !LN && !RW && !SEC && !DK && !TV) for (let i = 0; i < 2; i++) {
    const c = new T.Mesh(new T.PlaneGeometry(0.7, 1.05, 4, 6), clothMat);
    c.position.set(2.62 + i * 0.86, 1.5 - i * 0.05, -1.95);
    c.rotation.y = -0.04 + i * 0.08;
    scene.add(c);
    cloths.push(c);
  }
  if (!TOWER && !STORE && !CLUB && !WRH && !JD && !CYB && !KFC && !RL && !LN && !RW && !SEC && !DK && !TV) (function () {
    const b = new Builder();
    const g = new T.Group();
    b.cyl('woodDark', 0.055, 0.065, 2.15, 6, 2.24, 1.07, -1.95);
    b.cyl('woodDark', 0.055, 0.065, 2.15, 6, 4.0, 1.07, -1.95);
    b.cyl('woodPale', 0.014, 0.014, 1.85, 4, 3.12, 2.09, -1.95, 0, 0, Math.PI / 2);
    b.build(g);
    scene.add(g);
  })();

  // 门口竹竿
  (function () {
    const b = new Builder();
    const g = new T.Group();
    b.build(g, { noOutline: ['bambooS'] });
    scene.add(g);
  })();

  /* ================= 屋檐铜铃 ================= */
  const bells = [];
  (function () {
    const pos = (STORE || CLUB || JD || CYB || KFC || RL || LN || RW || SEC || DK || TV) ? [] : cfg(PS.bellPos, [[2.78, 5.86, 3.08], [2.78, 5.86, -3.86], [-5.98, 5.86, 3.08], [-5.98, 5.86, -3.86]]);
    for (let i = 0; i < pos.length; i++) {
      const g = new T.Group();
      g.position.set(pos[i][0], pos[i][1], pos[i][2]);
      const b = new Builder();
      b.cyl('woodDeep', 0.006, 0.006, 0.26, 4, 0, -0.13, 0);
      b.cyl('brass', 0.055, 0.085, 0.14, 10, 0, -0.32, 0);
      b.sph('brass', 0.03, 0, -0.4, 0, 1, 1, 1);
      b.box('brass', 0.1, 0.02, 0.02, 0, -0.25, 0);
      b.build(g);
      g.userData.ph = i * 1.7;
      scene.add(g);
      bells.push(g);
    }
  })();

  /* ================= 窗内光斑 ================= */
  const patches = [];
  function addPatch(w, h, x, y, z, ry, op) {
    const m = new T.MeshBasicMaterial({
      map: TEX.light, transparent: true, opacity: op,
      blending: T.AdditiveBlending, depthWrite: false
    });
    const p = new T.Mesh(new T.PlaneGeometry(w, h), m);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = ry || 0;
    p.position.set(x, y, z);
    scene.add(p);
    patches.push({ m: p, base: op, x0: x, z0: z });
    return p;
  }
  if (STORE || CLUB || KFC || RL || LN || RW || SEC || DK || TV) {
    // 玻璃幕面，不做木格窗光斑
  } else if (TOWER) {
    addPatch(4.4, 4.4, -2.05 + 3.2, 1.24, -0.2, 0.1, 0.18);
    addPatch(3.2, 3.2, -2.05 + 3.7, 4.26, -0.2, -0.1, 0.24);
  } else if (CYB) {
    /* 夜景：地面光斑由 cyWet() 的霓虹倒影负责，不再铺民居那套窗格光 */
  } else if (JD) {
    /* 农家单层：不做地面光斑。下面那套是给两层民居按楼面定位的
       （y=FL+0.775 那块悬空、x 全在 -1~0.2 等于糊在院子正中），
       搬进单层农舍就是院子里几片飘着的格子。农舍的光影交给门灯与窗内透光 */
  } else {
    addPatch(2.6, 2.9, 0.15, FL + 0.02, -0.3, 0.08, 0.2);
    addPatch(1.3, 1.1, -1.0, FL + 0.775, 0.85, 0.35, 0.22);
    addPatch(1.9, 2.2, 0.2, F2 + 0.02, -0.4, -0.1, 0.36);
  }

  /* ================= 茶烟 ================= */
  const smokes = [];
  function Smoke(x, y, z, sc, n) {
    this.items = [];
    this.ox = x; this.oy = y; this.oz = z; this.sc = sc;
    for (let i = 0; i < n; i++) {
      const m = new T.SpriteMaterial({
        map: TEX.smoke, transparent: true, opacity: 0, depthWrite: false, color: 0xf6f2e8
      });
      const s = new T.Sprite(m);
      s.position.set(x, y, z);
      s.scale.setScalar(0.1);
      scene.add(s);
      this.items.push({ s: s, t: i / n, sp: 0.13 + Math.random() * 0.05, dx: (Math.random() - 0.5) * 0.05, dz: (Math.random() - 0.5) * 0.05 });
    }
  }
  Smoke.prototype.update = function (dt) {
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      it.t += dt * it.sp;
      if (it.t > 1) it.t -= 1;
      const t = it.t;
      it.s.position.set(
        this.ox + it.dx * t * 2 + Math.sin(t * 5 + i) * 0.05 * t,
        this.oy + t * 1.15 * this.sc,
        this.oz + it.dz * t * 2
      );
      const o = Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.42;
      it.s.material.opacity = o;
      it.s.scale.setScalar((0.08 + t * 0.42) * this.sc);
    }
  };
  if (KFC) {
    /* 厨房油烟罩一缕，锚点挂在排烟管口，别挂在屋脊正中 */
    smokes.push(new Smoke(-5.50, KH + 1.60, -1.90, 0.85, 7));
  } else   if (CTY) {
    /* 城市里的蒸汽：市场口、井盖、拉面摊，三缕就够，多了糊成雾 */
    smokes.push(new Smoke(-8.40, 1.10, 7.70, 1.30, 8));
    smokes.push(new Smoke(8.60, 0.10, -9.40, 1.50, 7));
    smokes.push(new Smoke(6.40, 0.10, 3.20, 1.20, 6));
    smokes.push(new Smoke(19.20, 0.10, 12.60, 1.10, 5));
  } else if (CYB) {
    smokes.push(new Smoke(-1.06, 2.36, -4.72, 0.95, 8));
    smokes.push(new Smoke(1.62, 0.10, 3.20, 1.10, 7));
    smokes.push(new Smoke(-3.10, 2.20, 6.10, 0.70, 5));
  } else if (JD) {
    smokes.push(new Smoke(DHCX + 0.30, DH_RG + 0.92, DW1 - 0.62, 1.15, 7));
  } else if (!TOWER && !STORE && !CLUB && !WRH && !CYB && !KFC && !RL && !LN && !RW && !SEC && !DK && !TV) {
    smokes.push(new Smoke(-1.62, FL + 0.88, 0.73, 1.0, 6));
    smokes.push(new Smoke(-3.55, FL + 0.66, -2.3, 1.2, 7));
    smokes.push(new Smoke(2.3, F2 + 0.8, -0.5, 0.9, 5));
  }

  /* ================= 相机控制：自由视角 ================= */
  const CAM = PS.cam || {};
  const cth = cfg(CAM.theta, 0.74), cph = cfg(CAM.phi, 1.2), cd = cfg(CAM.dist, 37);
  const ctg = cfg(CAM.target, [-0.5, 1.95, 0.2]);

  /* 自由视角边界：phi 越小越接近正俯视，1.52 基本贴到视平线 */
  const PHI_MIN = 0.12, PHI_MAX = 1.522, DIST_MIN = 3.2;
  /* 城市尺度的模型横跨 60 米，默认的 72 / 13 会把镜头锁死在近处 */
  const DIST_MAX = cfg(PS.distMax, 72);
  const TARGET_R = cfg(PS.targetR, 13);   // 目标点可自由平移的半径（防止把模型推出视野）

  const home = {
    theta: cth, phi: cph, dist: cd,
    target: new T.Vector3(ctg[0], ctg[1], ctg[2])
  };

  const ctrl = {
    theta: cth, phi: cph, dist: cd,
    tTheta: cth, tPhi: cph, tDist: cd,
    target: home.target.clone(),
    auto: cfg(CAM.auto, true)
  };

  /* 竖屏 / 窄屏：水平视野变窄，按宽高比把相机等比拉远，模型才不会被左右切掉。
     桌面（aspect ≥ 1.45）恒为 1，不影响已定稿的构图。 */
  function viewK() {
    const a = camera.aspect || 1.6;
    return a >= 1.45 ? 1 : Math.min(2.6, 1.45 / a);
  }

  function updateCamera(dt) {
    /* 无 dt（脚本直接调用）＝立即到位；有 dt ＝与帧率无关的阻尼跟随 */
    const k = dt ? 1 - Math.exp(-dt * 10) : 1;
    ctrl.theta += (ctrl.tTheta - ctrl.theta) * k;
    ctrl.phi += (ctrl.tPhi - ctrl.phi) * k;
    ctrl.dist += (ctrl.tDist - ctrl.dist) * k;
    const sp = Math.sin(ctrl.phi), cp = Math.cos(ctrl.phi);
    const d = ctrl.dist * viewK();
    camera.position.set(
      ctrl.target.x + d * sp * Math.cos(ctrl.theta),
      ctrl.target.y + d * cp,
      ctrl.target.z + d * sp * Math.sin(ctrl.theta)
    );
    camera.lookAt(ctrl.target);
  }

  function clampTarget() {
    const d = ctrl.target.distanceTo(home.target);
    if (d > TARGET_R) {
      ctrl.target.sub(home.target).multiplyScalar(TARGET_R / d).add(home.target);
    }
  }

  /* ---- 复位 / 聚焦：用飞行动画而不是瞬间跳 ---- */
  let tween = null;
  function flyTo(to, dur) {
    tween = {
      t: 0, dur: dur || 0.8,
      f: { theta: ctrl.theta, phi: ctrl.phi, dist: ctrl.dist, target: ctrl.target.clone() },
      o: {
        theta: to.theta !== undefined ? to.theta : ctrl.theta,
        phi: to.phi !== undefined ? to.phi : ctrl.phi,
        dist: to.dist !== undefined ? to.dist : ctrl.dist,
        target: to.target ? to.target.clone() : ctrl.target.clone()
      }
    };
  }
  function stepTween(dt) {
    if (!tween) return;
    tween.t = Math.min(1, tween.t + dt / tween.dur);
    const u = tween.t;
    const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    ctrl.theta = ctrl.tTheta = tween.f.theta + (tween.o.theta - tween.f.theta) * e;
    ctrl.phi = ctrl.tPhi = tween.f.phi + (tween.o.phi - tween.f.phi) * e;
    ctrl.dist = ctrl.tDist = tween.f.dist + (tween.o.dist - tween.f.dist) * e;
    ctrl.target.lerpVectors(tween.f.target, tween.o.target, e);
    if (tween.t >= 1) tween = null;
  }

  /* ---- UI 浮层（截图模式 __expose 下不创建，避免污染画面） ---- */
  let ui = null, uiTimer = 0, uiAutoBtn = null;
  function syncAuto() {
    if (uiAutoBtn) uiAutoBtn.classList.toggle('cd-on', !!ctrl.auto);
  }
  function pokeUI() {
    if (!ui) return;
    ui.classList.remove('cd-off');
    clearTimeout(uiTimer);
    uiTimer = setTimeout(function () { ui.classList.add('cd-off'); }, 3600);
  }
  function resetView() {
    ctrl.auto = cfg(CAM.auto, true);
    syncAuto();
    flyTo({ theta: home.theta, phi: home.phi, dist: home.dist, target: home.target }, 0.85);
  }

  const pointers = new Map();
  let pinchDist = 0, pinchMid = null;
  const el = renderer.domElement;
  el.style.touchAction = 'none';
  el.style.cursor = 'grab';

  function panBy(dx, dy) {
    const h = 2 * Math.tan(camera.fov * Math.PI / 360) * ctrl.dist * viewK() / Math.max(1, el.clientHeight);
    camera.updateMatrixWorld();
    const m = camera.matrix.elements;
    ctrl.target.x += (-dx * m[0] + dy * m[4]) * h;
    ctrl.target.y += (-dx * m[1] + dy * m[5]) * h;
    ctrl.target.z += (-dx * m[2] + dy * m[6]) * h;
    clampTarget();
  }

  el.addEventListener('pointerdown', function (e) {
    pointers.set(e.pointerId, {
      x: e.clientX, y: e.clientY,
      mode: (e.button === 2 || e.button === 1 || e.shiftKey) ? 'pan' : 'orbit'
    });
    el.setPointerCapture(e.pointerId);
    tween = null;
    ctrl.auto = false; syncAuto();
    el.style.cursor = 'grabbing';
    pokeUI();
  });
  el.addEventListener('pointermove', function (e) {
    const p = pointers.get(e.pointerId);
    if (!p) { pokeUI(); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 1) {
      if (p.mode === 'pan') {
        panBy(dx, dy);
      } else {
        ctrl.tTheta -= dx * 0.0058;
        ctrl.tPhi -= dy * 0.0052;
        ctrl.tPhi = Math.max(PHI_MIN, Math.min(PHI_MAX, ctrl.tPhi));
      }
    } else if (pointers.size === 2) {
      const a = Array.from(pointers.values());
      const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      const mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2;
      if (pinchDist) {
        ctrl.tDist = Math.max(DIST_MIN, Math.min(DIST_MAX, ctrl.tDist * (pinchDist / d)));
        panBy(mx - pinchMid.x, my - pinchMid.y);
      }
      pinchDist = d; pinchMid = { x: mx, y: my };
    }
  });
  el.addEventListener('pointerup', function (e) {
    pointers.delete(e.pointerId);
    pinchDist = 0; pinchMid = null;
    if (pointers.size === 0) el.style.cursor = 'grab';
  });
  el.addEventListener('pointercancel', function (e) {
    pointers.delete(e.pointerId); pinchDist = 0; pinchMid = null;
  });
  el.addEventListener('wheel', function (e) {
    e.preventDefault();
    tween = null;
    ctrl.auto = false; syncAuto();
    ctrl.tDist = Math.max(DIST_MIN, Math.min(DIST_MAX,
      ctrl.tDist * Math.exp(e.deltaY * 0.0009)));
    pokeUI();
  }, { passive: false });
  el.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ---- 双击聚焦：把点中的位置拉到画面中心并推近 ---- */
  const raycaster = new T.Raycaster();
  const ndc = new T.Vector2();
  function pickAt(cx, cy) {
    const r = el.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(scene, true);
    for (let i = 0; i < hits.length; i++) {
      const o = hits[i].object, m = o.material;
      if (!m || o.isSprite || o.isPoints || o.isLine || o.isLineSegments) continue;
      if (m.transparent && m.opacity !== undefined && m.opacity < 0.9) continue;
      if (o.userData && o.userData.noPick) continue;
      return hits[i];
    }
    return null;
  }
  el.addEventListener('dblclick', function (e) {
    const hit = pickAt(e.clientX, e.clientY);
    if (!hit) return;
    ctrl.auto = false; syncAuto();
    /* 按「命中点到相机的距离」定推近距离：远处的目标不会被一下拉到跟前，
       近处的细节又能凑到位。下限定在当前距离的 35% —— 点到前景的树时
       若按命中距离算会贴到 3 米，镜头直接钻进树冠里 */
    const want = Math.max(DIST_MIN, Math.min(ctrl.tDist,
      Math.max(ctrl.tDist * 0.35, hit.distance * 0.62)));
    flyTo({ target: hit.point, dist: want }, 0.8);
    pokeUI();
  });

  /* ---- 键盘：← → 转，↑ ↓ 抬头低头，+ − 推拉，空格暂停自转，R 复位 ---- */
  window.addEventListener('keydown', function (e) {
    const tg = e.target;
    if (tg && tg.tagName && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) return;
    const K = e.key;
    if (K === 'r' || K === 'R') { resetView(); pokeUI(); e.preventDefault(); return; }
    if (K === ' ') { ctrl.auto = !ctrl.auto; syncAuto(); pokeUI(); e.preventDefault(); return; }
    let used = true;
    if (K === 'ArrowLeft') ctrl.tTheta += 0.09;
    else if (K === 'ArrowRight') ctrl.tTheta -= 0.09;
    else if (K === 'ArrowUp') ctrl.tPhi = Math.max(PHI_MIN, ctrl.tPhi - 0.06);
    else if (K === 'ArrowDown') ctrl.tPhi = Math.min(PHI_MAX, ctrl.tPhi + 0.06);
    else if (K === '+' || K === '=') ctrl.tDist = Math.max(DIST_MIN, ctrl.tDist * 0.9);
    else if (K === '-' || K === '_') ctrl.tDist = Math.min(DIST_MAX, ctrl.tDist * 1.1);
    else used = false;
    if (used) { tween = null; ctrl.auto = false; syncAuto(); pokeUI(); e.preventDefault(); }
  });

  const ICON_SPIN = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
    '<path d="M20.2 12a8.2 8.2 0 1 1-2.4-5.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M20.4 4.2v5h-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_HOME = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
    '<path d="M4 11.1 12 4l8 7.1V20a1 1 0 0 1-1 1h-4.4v-5.9h-5.2V21H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

  function buildUI() {
    if (ui || !document.body) return;
    const st = document.createElement('style');
    st.textContent = [
      '.cd-ui{position:fixed;left:0;right:0;bottom:0;z-index:9;display:flex;align-items:flex-end;',
      'justify-content:space-between;gap:12px;padding:14px 16px;pointer-events:none;',
      'font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;',
      'transition:opacity .6s ease;}',
      '.cd-ui.cd-off{opacity:0;}',
      '.cd-hint{font-size:12px;line-height:1.15;letter-spacing:.02em;color:#57513f;',
      'background:rgba(255,252,245,.62);border:1px solid rgba(120,110,90,.20);',
      'padding:8px 14px;border-radius:999px;',
      '-webkit-backdrop-filter:blur(10px) saturate(1.08);backdrop-filter:blur(10px) saturate(1.08);',
      'box-shadow:0 2px 10px rgba(60,50,30,.06);white-space:nowrap;}',
      '.cd-btns{display:flex;gap:8px;pointer-events:auto;}',
      '.cd-btn{width:34px;height:34px;border-radius:50%;border:1px solid rgba(120,110,90,.20);',
      'background:rgba(255,252,245,.70);color:#57513f;display:flex;align-items:center;',
      'justify-content:center;padding:0;cursor:pointer;',
      'transition:background .2s,color .2s,transform .2s,box-shadow .2s;',
      '-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);',
      'box-shadow:0 2px 10px rgba(60,50,30,.06);}',
      '.cd-btn:hover{background:rgba(255,255,250,.94);transform:translateY(-1px);}',
      '.cd-btn.cd-on{background:#5b6b52;color:#f7f3e6;border-color:#5b6b52;}',
      '@media (max-width:700px){.cd-ui{padding:10px 12px;}',
      '.cd-hint{font-size:11px;padding:7px 11px;}.cd-btn{width:31px;height:31px;}}'
    ].join('');
    document.head.appendChild(st);

    const touch = (window.matchMedia && window.matchMedia('(hover: none)').matches) || window.innerWidth < 720;
    ui = document.createElement('div');
    ui.className = 'cd-ui';
    ui.innerHTML =
      '<div class="cd-hint">' + (touch
        ? '单指旋转 · 双指缩放 / 平移 · 双击聚焦'
        : '拖拽旋转 · 滚轮缩放 · 右键平移 · 双击聚焦') + '</div>' +
      '<div class="cd-btns">' +
      '<button class="cd-btn" data-act="auto" type="button" aria-label="自动旋转">' + ICON_SPIN + '</button>' +
      '<button class="cd-btn" data-act="home" type="button" aria-label="复位视角">' + ICON_HOME + '</button>' +
      '</div>';
    document.body.appendChild(ui);

    uiAutoBtn = ui.querySelector('[data-act="auto"]');
    syncAuto();
    uiAutoBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      ctrl.auto = !ctrl.auto;
      syncAuto();
      pokeUI();
    });
    ui.querySelector('[data-act="home"]').addEventListener('click', function (e) {
      e.stopPropagation();
      resetView();
      pokeUI();
    });

    /* 开场给 5.2 秒记住操作方式，之后淡出，鼠标一动再回来 */
    pokeUI();
    clearTimeout(uiTimer);
    uiTimer = setTimeout(function () { ui.classList.add('cd-off'); }, 5200);
  }

  /* ================= 循环 ================= */
  const clock = new T.Clock();
  let time = 0;

  function loop() {
    requestAnimationFrame(loop);
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    time += dt;

    if (ctrl.auto) ctrl.tTheta += dt * 0.032;
    /* 飞行动画与镜头跟随用「真实帧时长」（上限放宽到 0.25 / 0.1）：
       软渲染或低端机上帧率可能只有 6 fps，用 clamp 到 0.05 的 dt 会让
       0.85 秒的复位动画拖成 6 秒。 */
    stepTween(Math.min(rawDt, 0.25));
    updateCamera(Math.min(rawDt, 0.1));

    waterUni.uTime.value = time;
    bannerUni.uTime.value = time;

    // 船
    if (boatGroup) {
      boatGroup.position.y = -0.03 + Math.sin(time * 0.85) * 0.028;
      boatGroup.rotation.z = Math.sin(time * 0.62 + 0.4) * 0.028;
      boatGroup.rotation.x = Math.sin(time * 0.47 + 1.2) * 0.016;
    }

    // 柳枝
    for (let i = 0; i < willows.length; i++) {
      const w = willows[i];
      const ph = w.userData.ph;
      w.rotation.x = Math.sin(time * 0.95 + ph) * 0.055 + Math.sin(time * 1.9 + ph * 2) * 0.018;
      w.rotation.z = Math.cos(time * 0.78 + ph) * 0.05 + Math.sin(time * 2.3 + ph) * 0.014;
    }

    // 铜铃
    for (let i = 0; i < bells.length; i++) {
      const g = bells[i];
      const p = (time * 0.5 + g.userData.ph) % 9;
      let a = 0;
      if (p < 2.4) { const k = p / 2.4; a = Math.sin(p * 8.5) * 0.3 * (1 - k) * (1 - k); }
      g.rotation.z = a;
      g.rotation.x = a * 0.4;
    }

    // 光斑
    for (let i = 0; i < patches.length; i++) {
      const p = patches[i];
      p.m.material.opacity = p.base * (0.9 + Math.sin(time * 0.32 + i) * 0.1);
      p.m.position.x = p.x0 + Math.sin(time * 0.11 + i * 2) * 0.09;
      p.m.position.z = p.z0 + Math.cos(time * 0.09 + i) * 0.07;
    }

    // 烟雾
    for (let i = 0; i < smokes.length; i++) smokes[i].update(dt);

    // 全息广告 / 霓虹闪烁
    for (let i = 0; i < CT_ANIM.length; i++) CT_ANIM[i](time);

    // 输送线上的料箱
    for (let i = 0; i < MOVERS.length; i++) stepMover(MOVERS[i], dt);

    renderer.render(scene, camera);
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateCamera();
  }
  window.addEventListener('resize', onResize);

  updateCamera();
  if (!window.__expose || window.__ui) buildUI();
  if (window.__expose) { window.__ctrl = ctrl; window.__cam = updateCamera; window.__camera = camera; window.__scene = scene; window.__buildUI = buildUI; window.__pickAt = pickAt; }
  if (window.__expose) {
    scene.traverse(function (o) {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      const arr = o.geometry.attributes.position.array;
      for (let i = 0; i < arr.length; i++) {
        if (!isFinite(arr[i])) {
          console.error('NANGEO hex=' + (o.material && o.material.color ? o.material.color.getHexString() : '?') + ' verts=' + o.geometry.attributes.position.count);
          return;
        }
      }
    });
  }
  if (window.__expose) {
    scene.updateMatrixWorld(true);
    const _bb = new T.Box3();
    scene.traverse(function (o) {
      if (!o.isMesh || !o.material || !o.material.color) return;
      if (o.material.color.getHex() !== 0xff00ff) return;
      _bb.setFromObject(o);
      console.error('MAGENTA verts=' + o.geometry.attributes.position.count +
        ' min=' + _bb.min.x.toFixed(2) + ',' + _bb.min.y.toFixed(2) + ',' + _bb.min.z.toFixed(2) +
        ' max=' + _bb.max.x.toFixed(2) + ',' + _bb.max.y.toFixed(2) + ',' + _bb.max.z.toFixed(2));
    });
  }
  loop();
})();
