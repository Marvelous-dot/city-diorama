/* ---------------- 木柱底座（土楼版） ---------------- */
function tlPost(b, x, z, y0, h, r) {
  b.cyl('tlWoodD', r || 0.14, r || 0.15, h, 8, x, y0 + h / 2, z);
  b.cyl('tlStoneD', (r || 0.14) * 1.5, (r || 0.14) * 1.6, 0.14, 8, x, y0 + 0.07, z);
}

/* ---------------- 内院：铺地 + 祠堂 + 水井 + 杂物 ---------------- */
function tlCourtyard(b) {
  const FY = TL_GY + 0.65;
  /* 院内卵石地 */
  b.cyl('tlPave', TL_RI - 1.95, TL_RI - 1.90, 0.12, 64, 0, FY - 0.06, 0);
  /* 铺地石缝：放射状细线，内院才不是一块灰饼 */
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2;
    b.box('tlPaveD', 0.05, 0.02, TL_RI - 4.6, Math.cos(a) * (TL_RI - 2.4) * 0.5, FY + 0.015, Math.sin(a) * (TL_RI - 2.4) * 0.5, 0, -a + Math.PI / 2, 0);
  }
  /* 排水沟：一圈细槽 */
  const g = new T.TorusGeometry(TL_RI - 2.4, 0.10, 6, 64);
  g.rotateX(Math.PI / 2);
  g.translate(0, FY + 0.01, 0);
  b.add('tlStoneD', g);

  /* 中心祠堂：面阔三间、前廊、硬山 */
  const cx = 0, cz = -3.4, W = 8.2, D = 5.0;
  b.box('tlStoneL', W + 1.1, 0.52, D + 1.1, cx, TL_GY + 0.26, cz);
  b.box('tlPave', W + 1.0, 0.06, D + 1.0, cx, TL_GY + 0.55, cz);
  [[-W / 2, D / 2], [W / 2, D / 2], [-W / 2, -D / 2], [W / 2, -D / 2]].forEach(function (q) {
    tlPost(b, cx + q[0], cz + q[1], FY, 4.1, 0.15);
  });
  b.box('tlWall', W, 4.1, 0.30, cx, FY + 2.05, cz - D / 2 + 0.15);
  b.box('tlWall', 0.30, 4.1, D, cx - W / 2 + 0.15, FY + 2.05, cz);
  b.box('tlWall', 0.30, 4.1, D, cx + W / 2 - 0.15, FY + 2.05, cz);
  for (let i = 0; i < 3; i++) {
    const x0 = -W / 2 + i * W / 3;
    b.box('tlLattice', W / 3 - 0.30, 3.2, 0.08, cx + x0 + W / 6, FY + 1.60, cz + D / 2 - 0.10);
    b.box('tlDoor', W / 3 - 0.30, 0.10, 0.10, cx + x0 + W / 6, FY + 3.22, cz + D / 2 - 0.10);
  }
  gdGableRoof(b, 'tlTile', 'tlRidge', cx, cz, W + 0.7, D + 0.7, FY + 4.1, FY + 5.6, 'z');
  b.box('tlSignBox', 2.4, 0.52, 0.12, cx, FY + 3.55, cz + D / 2 + 0.16);
  /* 供桌与香炉 */
  b.box('tlWoodD', 3.0, 0.12, 1.0, cx, FY + 0.82, cz - 1.4);
  b.cyl('tlIron', 0.24, 0.20, 0.42, 10, cx, FY + 1.05, cz - 0.9);
  b.cyl('tlLantern', 0.05, 0.05, 0.30, 6, cx, FY + 1.35, cz - 0.9);
  /* 两侧灯笼 */
  [-2.9, 2.9].forEach(function (dx) {
    b.cyl('tlLantern', 0.20, 0.24, 0.42, 10, cx + dx, FY + 3.35, cz + D / 2 + 0.30);
  });

  /* 水井：石圈 + 井台 + 木架 */
  const wx = 4.4, wz = 2.6;
  b.cyl('tlStoneD', 0.78, 0.84, 0.62, 16, wx, FY + 0.31, wz);
  b.cyl('tlStoneL', 0.66, 0.66, 0.10, 16, wx, FY + 0.64, wz);
  b.cyl('tlBaseD', 0.52, 0.52, 0.06, 16, wx, FY + 0.62, wz);
  [-0.85, 0.85].forEach(function (s) {
    b.box('tlWoodD', 0.09, 1.45, 0.09, wx + s, FY + 0.72, wz);
  });
  b.box('tlWoodD', 1.85, 0.09, 0.09, wx, FY + 1.42, wz);
  b.cyl('tlWoodR', 0.05, 0.05, 1.5, 8, wx, FY + 1.10, wz, 0, 0, Math.PI / 2);
  b.cyl('tlWoodD', 0.20, 0.17, 0.28, 10, wx, FY + 0.62, wz + 0.05);

  /* 石桌石凳 */
  b.cyl('tlStoneL', 0.62, 0.66, 0.12, 14, -4.2, FY + 0.72, 2.2);
  b.cyl('tlStoneD', 0.17, 0.21, 0.68, 10, -4.2, FY + 0.36, 2.2);
  [[-3.2, 2.3], [-5.2, 2.1]].forEach(function (q) {
    b.cyl('tlStoneL', 0.25, 0.27, 0.40, 10, q[0], FY + 0.20, q[1]);
  });

  /* 晾衣杆先撤掉：斜条在内院太抢眼，等几何定位准了再加回来 */

  /* 贴内墙的柴房与谷仓：两间小木屋 */
  [[-9.6, -6.4, 0.5], [8.8, -7.2, -0.6]].forEach(function (q) {
    b.box('tlWoodD', 3.0, 2.4, 2.2, q[0], FY + 1.2, q[1], 0, q[2], 0);
    b.box('tlTileD', 3.3, 0.10, 2.5, q[0], FY + 2.45, q[1], 0, q[2], 0);
    b.box('tlDoorD', 0.9, 1.8, 0.08, q[0] + 0.9, FY + 0.9, q[1] + 1.12, 0, q[2], 0);
  });

  /* 石磨、水缸、鸡笼 */
  b.cyl('tlStoneD', 0.55, 0.58, 0.18, 14, 6.2, FY + 0.35, -1.2);
  b.cyl('tlStoneL', 0.50, 0.52, 0.16, 14, 6.2, FY + 0.52, -1.2);
  b.box('tlWoodD', 1.6, 0.10, 0.10, 6.2, FY + 0.62, -1.2);
  b.cyl('tlJar', 0.48, 0.42, 0.82, 14, -6.8, FY + 0.41, 5.6);
  b.cyl('tlJar', 0.36, 0.32, 0.62, 12, -7.4, FY + 0.31, 4.9);
  b.box('tlBamboo', 1.4, 1.0, 1.0, 7.6, FY + 0.50, 4.2);
  for (let i = 0; i < 3; i++) {
    b.sph('tlChicken', 0.16, 7.6 + (tlR(i * 3.1) - 0.5) * 0.9, FY + 0.16, 4.2 + (tlR(i * 5.7) - 0.5) * 0.6, 1.2, 0.9, 1.0);
  }
}

/* ---------------- 门前半月池：半圆水面 + 石栏 ---------------- */
function tlHalfPond(b) {
  const cz = 16.2, R = 5.2;
  /* 池沿：抬到草地之上，否则水面被地面整个盖住 */
  const gb = new T.CylinderGeometry(R + 0.5, R + 0.5, 0.42, 40, 1, false, 0, Math.PI);
  gb.translate(0, TL_GY + 0.21, cz);
  b.add('tlStone', gb);
  /* 水面：比草地高 4cm，才看得见 */
  /* 水面用矩形，半月形状交给外面的弧形石栏去定 */
  const gw = new T.PlaneGeometry(R * 2, 3.6);
  gw.rotateX(-Math.PI / 2);
  gw.translate(0, TL_GY + 0.30, 20.0);
  b.add('tlWaterD', gw);
  /* 池沿石栏 */
  for (let i = 0; i <= 22; i++) {
    const a = Math.PI + (i / 22) * Math.PI;
    b.box('tlStoneL', 0.24, 0.50, 0.24, Math.cos(a) * (R + 0.42), TL_GY + 0.55, cz + Math.sin(a) * (R + 0.42), 0, -a, 0);
  }
  /* 浮沫 */
  for (let i = 0; i < 26; i++) {
    const a = Math.PI + tlR(i * 3.1) * Math.PI;
    const r = 2.0 + tlR(i * 5.7) * 5.6;
    b.box('tlFoam', 0.30 + tlR(i * 7.3) * 0.34, 0.02, 0.05,
      Math.cos(a) * r, TL_GY + 0.35, cz + Math.sin(a) * r);
  }
}

/* ---------------- 院外：旗杆石、石狮、竹林、菜地、柴垛、老樟 ---------------- */
function tlOutdoor(b) {
  /* 旗杆石两对 */
  [[-7.6, 18.2], [7.6, 18.2]].forEach(function (q) {
    b.box('tlStoneL', 1.15, 0.42, 1.15, q[0], TL_GY + 0.21, q[1]);
    b.box('tlStoneD', 1.35, 0.14, 1.35, q[0], TL_GY + 0.46, q[1]);
    b.cyl('tlWoodD', 0.15, 0.19, 5.0, 8, q[0], TL_GY + 2.95, q[1]);
    b.sph('tlWoodD', 0.19, q[0], TL_GY + 5.55, q[1], 1, 1.2, 1);
  });
  /* 石狮一对 */
  [[-6.2, 17.0], [6.2, 17.0]].forEach(function (q) {
    b.box('tlStoneL', 0.82, 0.50, 1.00, q[0], TL_GY + 0.40, q[1]);
    b.box('tlStone', 0.56, 0.76, 0.78, q[0], TL_GY + 1.03, q[1] + 0.04);
    b.sph('tlStone', 0.34, q[0], TL_GY + 1.56, q[1] + 0.16, 1, 1, 1);
    b.box('tlStoneD', 0.30, 0.14, 0.12, q[0], TL_GY + 1.58, q[1] + 0.44);
    b.box('tlStoneD', 0.12, 0.10, 0.10, q[0] - 0.11, TL_GY + 1.66, q[1] + 0.40);
    b.box('tlStoneD', 0.12, 0.10, 0.10, q[0] + 0.11, TL_GY + 1.66, q[1] + 0.40);
  });
  /* 东侧竹林 */
  for (let i = 0; i < 26; i++) {
    const x = 17.0 + tlR(i * 3.1) * 4.2, z = -12.0 + tlR(i * 5.7) * 24.0;
    const h = 4.0 + tlR(i * 7.3) * 3.0;
    b.cyl('tlBamboo', 0.06, 0.07, h, 6, x, TL_GY + h / 2, z);
    for (let j = 0; j < 4; j++) {
      const a = tlR(i * 11.7 + j * 3.1) * Math.PI * 2;
      b.box('tlLeaf1', 0.55, 0.04, 0.12, x + Math.cos(a) * 0.28, TL_GY + h * (0.62 + j * 0.08), z + Math.sin(a) * 0.28, 0, -a, 0.34);
    }
  }
  /* 西侧菜地：畦 + 菜叶点 */
  for (let i = 0; i < 5; i++) {
    b.box('tlSoilD', 2.2, 0.16, 1.1, -17.6, TL_GY + 0.08, -10.0 + i * 2.0);
    for (let j = 0; j < 8; j++) {
      b.sph('tlLeaf3', 0.18, -18.4 + j * 0.55, TL_GY + 0.24, -10.0 + i * 2.0 + (tlR(j * 3.1 + i) - 0.5) * 0.5, 1.2, 0.8, 1.1);
    }
  }
  /* 柴垛：两堆 */
  [[-13.2, 12.6], [-14.4, 11.0]].forEach(function (q) {
    for (let i = 0; i < 7; i++) {
      b.cyl('tlStraw', 0.10, 0.10, 1.9, 6, q[0] + (i % 3) * 0.22, TL_GY + 0.30 + Math.floor(i / 3) * 0.20, q[1], 0, 0, Math.PI / 2);
    }
  });
  /* 老樟树：东南 */
  const tx = 13.6, tz = 15.2;
  b.cyl('tlBark', 0.65, 0.95, 4.6, 12, tx, TL_GY + 2.3, tz);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    b.sph('tlLeaf2', 2.0 - i * 0.15, tx + Math.cos(a) * 1.7, TL_GY + 5.2 + (i % 2) * 0.7, tz + Math.sin(a) * 1.7, 1.15, 0.72, 1.1);
  }
  b.sph('tlLeaf2', 1.6, tx, TL_GY + 6.2, tz, 1.1, 0.7, 1.1);
  /* 院外散石与草丛 */
  for (let i = 0; i < 14; i++) {
    const a = tlR(i * 3.7) * Math.PI * 2, r = 18.0 + tlR(i * 5.1) * 3.0;
    b.sph('tlGrassL', 0.24 + tlR(i * 7.3) * 0.18, Math.cos(a) * r, TL_GY + 0.14, Math.sin(a) * r, 1.3, 0.6, 1.2);
  }
}

/* ---------------- 人物 ---------------- */
function tlPeople(b) {
  const base = { skin: 'tlSkin', hair: 'tlHair', ink: 'tlInk', belt: 'tlBelt', shoe: 'tlShoe', hat: 'none' };
  function F(o) {
    const q = {};
    for (const k in base) q[k] = base[k];
    for (const k in o) q[k] = o[k];
    q.b = b;
    buildFig(q);
  }
  const FY = TL_GY + 0.65;
  /* 门口晒太阳的老人与挑担汉子 */
  F({ x: -1.9, y: TL_GY + 0.62, z: 17.6, ry: 0.35, s: 0.95, coat: 'tlRobeA', hat: 'cap', hatKey: 'tlHat' });
  F({ x: 2.4, y: TL_GY + 0.62, z: 18.6, ry: 2.9, s: 1.0, pose: 'walk', coat: 'tlRobeC' });
  /* 院内：小孩追鸡、妇人在井边、两人在石桌旁 */
  F({ x: 5.4, y: FY, z: 4.4, ry: -1.2, s: 0.72, coat: 'tlRobeB' });
  F({ x: 3.5, y: FY, z: 3.4, ry: 1.9, s: 0.95, coat: 'tlRobeC', hat: 'bun', hatKey: 'tlHair' });
  F({ x: -3.6, y: FY, z: 3.0, ry: 2.5, s: 0.96, pose: 'sit', coat: 'tlRobeA' });
  F({ x: -4.8, y: FY, z: 1.6, ry: 0.6, s: 0.96, pose: 'sit', coat: 'tlRobeD' });
  /* 二层廊上倚栏的妇人 */
  F({ x: -6.2, y: TL_GY + 0.55 + 3.0 + 0.12, z: 10.2, ry: 0.8, s: 0.92, coat: 'tlRobeB', hat: 'bun', hatKey: 'tlHair' });
  /* 菜地里的人 */
  F({ x: -16.8, y: TL_GY + 0.10, z: -3.0, ry: 1.5, s: 0.94, coat: 'tlRobeD' });
  /* 祠堂前上香 */
  F({ x: 0.8, y: FY, z: -0.4, ry: 3.1, s: 0.95, coat: 'tlRobeA', hat: 'cap', hatKey: 'tlHat' });
}

/* ---------------- 匾额 / 灯光 / 总装 ---------------- */
function tlTextTex(txt) {
  return canvasTex(512, 128, function (c, w, h) {
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#e6c978';
    c.font = 'bold 78px "KaiTi","STKaiti","Microsoft YaHei",serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(txt, w / 2, h / 2 + 2);
  });
}

function tlPlaque(g, txt, x, y, z, w, h) {
  const tex = tlTextTex(txt);
  const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false
  }));
  m.position.set(x, y, z);
  g.add(m);
}

function tlLights() {
  const L = [
    [0, TL_GY + 5.4, 6.0, 6.5, 12.0],
    [0, TL_GY + 4.0, 16.0, 4.5, 8.0],
    [0, TL_GY + 1.6, -3.4, 3.0, 7.0],
    [9.0, TL_GY + 1.6, 6.0, 2.6, 7.0],
    [-9.0, TL_GY + 1.6, 6.0, 2.6, 7.0]
  ];
  L.forEach(function (q) {
    const lp = new T.PointLight(0xffd9a8, q[3], q[4], 2);
    lp.position.set(q[0], q[1], q[2]);
    scene.add(lp);
  });
}

function buildTlAll() {
  const g = new T.Group();
  scene.add(g);
  const b = new Builder();

  tlBase(b);
  tlOuterWall(b);
  tlRoof(b, g);
  tlCloister(b);
  tlGate(b);
  tlWindows(b);
  tlCourtyard(b);
  tlHalfPond(b);
  tlOutdoor(b);
  tlPeople(b);

  b.build(g, {
    noOutline: ['tlGrass', 'tlGrassL', 'tlLeaf1', 'tlLeaf2', 'tlLeaf3', 'tlFlower',
      'tlFoam', 'tlChicken', 'tlJar']
  });

  tlPlaque(g, '承启楼', 0, TL_GY + 0.55 + 4.05, TL_R + 0.37, 2.3, 0.52);
  tlPlaque(g, '祖堂', 0, TL_GY + 0.65 + 3.55, -3.4 + 2.5 + 0.23, 1.7, 0.42);

  tlLights();
}
