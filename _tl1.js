/* ================= 第 20 套：福建土楼（tulou / TL） =================
   圆形夯土巨构：外径 30.4 米、墙厚 1.5、四层、36 开间环廊，
   内院一座祠堂，门前半月池。坐标以楼心为原点，大门朝 +z（南）。
   ==================================================================== */
const TL_R = 15.2, TL_T = 1.5, TL_RI = TL_R - TL_T;
const TL_H = 13.2, TL_FLOOR = 3.0, TL_N = 36;
const TL_X0 = -22.0, TL_X1 = 22.0, TL_Z0 = -22.0, TL_Z1 = 22.0;
const TL_GY = 0.55, TL_BB = -1.60;

function tlR(n) { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); }

/* 平放的圆环（用于回廊地板、墙顶、铺地） */
function tlRing(b, key, r0, r1, y) {
  const g = new T.RingGeometry(r0, r1, 64);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  b.add(key, g);
}

/* ---------------- 展台与院外石坪 ---------------- */
function tlBase(b) {
  const w = TL_X1 - TL_X0, d = TL_Z1 - TL_Z0;
  b.box('tlBaseD', w, TL_GY - TL_BB, d, 0, (TL_GY + TL_BB) / 2, 0);
  const layers = [
    ['tlSoil', TL_GY, TL_GY - 0.52],
    ['tlSoilD', TL_GY - 0.52, TL_GY - 1.10],
    ['tlBaseD', TL_GY - 1.10, TL_BB]
  ];
  layers.forEach(function (q) {
    const hh = q[1] - q[2], yy = (q[1] + q[2]) / 2;
    b.box(q[0], w - 0.02, hh, 0.03, 0, yy, TL_Z1 - 0.015);
    b.box(q[0], w - 0.02, hh, 0.03, 0, yy, TL_Z0 + 0.015);
    b.box(q[0], 0.03, hh, d - 0.02, TL_X1 - 0.015, yy, 0);
    b.box(q[0], 0.03, hh, d - 0.02, TL_X0 + 0.015, yy, 0);
  });
  /* 院外：草地 + 楼前石坪 */
  b.box('tlGrass', w - 0.1, 0.10, d - 0.1, 0, TL_GY + 0.04, 0);
  b.cyl('tlPave', 15.6, 15.8, 0.12, 48, 0, TL_GY + 0.12, 0);
  for (let i = 0; i < 9; i++) {
    b.box('tlPaveD', 4.2, 0.02, 0.06, 0, TL_GY + 0.19, 16.4 + i * 0.52);
  }
  /* 门前石坪向半月池延伸 */
  b.box('tlPave', 6.5, 0.10, 3.2, 0, TL_GY + 0.09, 16.6);
}

/* ---------------- 环形夯土外墙：外皮 + 内皮 + 勒脚 + 墙顶 ---------------- */
function tlOuterWall(b) {
  /* 外皮：下大上小，收分 0.15 */
  const g1 = new T.CylinderGeometry(TL_R, TL_R + 0.18, TL_H, 64, 1, true);
  g1.translate(0, TL_GY + 0.55 + TL_H / 2, 0);
  b.add('tlEarth', g1);
  /* 内皮：翻转法线，院内才看得见 */
  const g2 = new T.CylinderGeometry(TL_RI, TL_RI + 0.12, TL_H, 64, 1, true);
  g2.scale(-1, 1, 1);
  g2.translate(0, TL_GY + 0.55 + TL_H / 2, 0);
  b.add('tlEarthD', g2);
  /* 石砌勒脚 */
  const g3 = new T.CylinderGeometry(TL_R + 0.34, TL_R + 0.52, 0.72, 64, 1, false);
  g3.translate(0, TL_GY + 0.36, 0);
  b.add('tlStone', g3);
  /* 墙顶环面（被屋顶压住，只露出一圈） */
  tlRing(b, 'tlEarthL', TL_RI, TL_R + 0.05, TL_GY + 0.55 + TL_H);
  /* 夯土雨痕：竖向深浅条，白墙才不假 */
  for (let i = 0; i < 46; i++) {
    const a = tlR(i * 3.1) * Math.PI * 2;
    const w = 0.10 + tlR(i * 5.7) * 0.24;
    const hh = 2.2 + tlR(i * 7.3) * 7.5;
    b.box(i % 3 ? 'tlEarthD' : 'tlEarthL', w, hh, 0.05,
      Math.cos(a) * (TL_R + 0.11), TL_GY + 1.4 + tlR(i * 9.1) * 5.2, Math.sin(a) * (TL_R + 0.11),
      0, -a + Math.PI / 2, 0);
  }
}

/* ---------------- 环形双坡瓦顶（贴图瓦垄） ---------------- */
function tlRoof(b, g) {
  const yEave = TL_GY + 0.55 + TL_H;
  const rEave = TL_R + 1.30, rRidge = TL_R - 1.50;
  const yRidge = yEave + 2.25;
  /* 瓦垄贴图：u 沿圆周，画竖向深条 = 一圈瓦垄 */
  const tex = canvasTex(256, 64, function (c, w, h) {
    c.fillStyle = '#5b635e'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      c.fillStyle = '#3f4744'; c.fillRect(i * 32 + 6, 0, 7, h);
      c.fillStyle = '#6d756f'; c.fillRect(i * 32 + 13, 0, 3, h);
    }
  });
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(26, 1);
  const mat = new T.MeshToonMaterial({ map: tex, gradientMap: GRAD, side: T.DoubleSide });
  /* 外坡 */
  const g1 = new T.CylinderGeometry(rRidge, rEave, 2.25, 72, 1, true);
  g1.translate(0, (yEave + yRidge) / 2, 0);
  g.add(new T.Mesh(g1, mat));
  /* 内坡 */
  const g2 = new T.CylinderGeometry(rRidge, TL_RI + 0.55, 1.45, 72, 1, true);
  g2.translate(0, yRidge - 0.66, 0);
  g.add(new T.Mesh(g2, mat));
  /* 环形脊 */
  const g3 = new T.TorusGeometry(rRidge, 0.16, 8, 72);
  g3.rotateX(Math.PI / 2);
  g3.translate(0, yRidge + 0.03, 0);
  b.add('tlRidge', g3);
  /* 檐口瓦当 */
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * Math.PI * 2;
    b.box('tlTileD', 0.26, 0.10, 0.14, Math.cos(a) * rEave, yEave + 0.02, Math.sin(a) * rEave, 0, -a + Math.PI / 2, 0);
  }
  /* 檐下椽头 */
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * Math.PI * 2;
    b.box('tlWoodD', 0.10, 0.10, 0.55, Math.cos(a) * (rEave - 0.45), yEave - 0.16, Math.sin(a) * (rEave - 0.45), 0, -a + Math.PI / 2, 0);
  }
}

/* ---------------- 四层环形柱廊 ---------------- */
function tlCloister(b) {
  for (let f = 1; f <= 3; f++) {
    const y = TL_GY + 0.55 + f * TL_FLOOR;
    /* 回廊地板：宽 2.0 的环 */
    tlRing(b, 'tlWood', TL_RI - 2.0, TL_RI - 0.05, y);
    tlRing(b, 'tlWoodD', TL_RI - 2.0, TL_RI - 1.92, y + 0.02);
    /* 每层 36 根檐柱 */
    for (let i = 0; i < TL_N; i++) {
      const a = i / TL_N * Math.PI * 2;
      b.cyl('tlWoodD', 0.13, 0.14, TL_FLOOR - 0.35, 8,
        Math.cos(a) * (TL_RI - 1.85), y + (TL_FLOOR - 0.35) / 2, Math.sin(a) * (TL_RI - 1.85));
    }
    /* 栏杆：36 段，留出上楼梯口 */
    for (let i = 0; i < TL_N; i++) {
      if (i % 9 === 0) continue;
      const a0 = i / TL_N * Math.PI * 2, a1 = (i + 1) / TL_N * Math.PI * 2;
      const x0 = Math.cos(a0) * (TL_RI - 1.92), z0 = Math.sin(a0) * (TL_RI - 1.92);
      const x1 = Math.cos(a1) * (TL_RI - 1.92), z1 = Math.sin(a1) * (TL_RI - 1.92);
      const len = Math.hypot(x1 - x0, z1 - z0);
      const ry = Math.atan2(-(z1 - z0), x1 - x0);
      b.box('tlWoodR', len, 0.08, 0.09, (x0 + x1) / 2, y + 0.62, (z0 + z1) / 2, 0, ry, 0);
      b.box('tlWoodR', len, 0.06, 0.07, (x0 + x1) / 2, y + 0.26, (z0 + z1) / 2, 0, ry, 0);
    }
    /* 房间门板：贴内墙，每开间一樘（部分关） */
    for (let i = 0; i < TL_N; i++) {
      if (i % 4 === 1) continue;
      const a = (i + 0.5) / TL_N * Math.PI * 2;
      b.box(i % 5 === 0 ? 'tlDoor' : 'tlDoorD', 1.05, 2.05, 0.10,
        Math.cos(a) * (TL_RI - 0.08), y + 1.02, Math.sin(a) * (TL_RI - 0.08), 0, -a + Math.PI / 2, 0);
    }
    /* 层间腰檐：一圈小披檐，四层才有土楼的层次 */
    if (f < 3) {
      const gr = new T.CylinderGeometry(TL_RI - 2.05, TL_RI - 1.55, 0.42, 64, 1, true);
      gr.translate(0, y + TL_FLOOR - 0.22, 0);
      b.add('tlTileD', gr);
    }
  }
  /* 一层：地面环廊 + 房门 */
  const y0 = TL_GY + 0.55;
  tlRing(b, 'tlWood', TL_RI - 1.9, TL_RI - 0.05, y0 + 0.10);
  for (let i = 0; i < TL_N; i++) {
    const a = (i + 0.5) / TL_N * Math.PI * 2;
    if (i % 6 === 0) continue;
    b.box('tlDoorD', 1.10, 2.20, 0.10, Math.cos(a) * (TL_RI - 0.08), y0 + 1.15, Math.sin(a) * (TL_RI - 0.08), 0, -a + Math.PI / 2, 0);
  }
}

/* ---------------- 大门：石框 + 双扇木门 + 匾额 + 台阶 ---------------- */
function tlGate(b) {
  const y0 = TL_GY + 0.55;
  /* 门洞两侧条石 */
  [-1.7, 1.7].forEach(function (s) {
    b.box('tlStoneL', 0.55, 3.1, 0.62, s, y0 + 1.55, TL_R + 0.06);
  });
  b.box('tlStoneL', 4.0, 0.42, 0.62, 0, y0 + 3.30, TL_R + 0.06);
  b.box('tlStoneL', 4.4, 0.20, 0.75, 0, y0 + 3.60, TL_R + 0.12);
  /* 门楣与匾 */
  b.box('tlSignBox', 2.6, 0.56, 0.12, 0, y0 + 4.05, TL_R + 0.30);
  b.box('tlGold', 2.75, 0.05, 0.14, 0, y0 + 4.36, TL_R + 0.30);
  b.box('tlGold', 2.75, 0.05, 0.14, 0, y0 + 3.74, TL_R + 0.30);
  /* 两扇木门（半开） */
  [-1, 1].forEach(function (s) {
    b.box('tlDoor', 1.35, 2.85, 0.12, s * 0.95, y0 + 1.45, TL_R + 0.18, 0, s * 0.42, 0);
    for (let i = 0; i < 3; i++) {
      b.box('tlIron', 0.05, 0.05, 0.14, s * (0.55 + i * 0.28), y0 + 1.10 + i * 0.55, TL_R + 0.25);
    }
  });
  /* 门前三级台阶 */
  for (let i = 0; i < 3; i++) {
    b.box('tlStoneL', 4.6 - i * 0.4, 0.18, 0.52, 0, y0 + 0.36 - i * 0.18, TL_R + 1.0 + i * 0.50);
  }
  /* 两只灯笼 */
  [-2.3, 2.3].forEach(function (s) {
    b.cyl('tlLantern', 0.22, 0.26, 0.46, 10, s, y0 + 3.10, TL_R + 0.55);
    b.box('tlGold', 0.05, 0.30, 0.05, s, y0 + 3.42, TL_R + 0.55);
  });
}

/* ---------------- 二至四层小窗：每层 36 个 ---------------- */
function tlWindows(b) {
  for (let f = 1; f <= 3; f++) {
    const y = TL_GY + 0.55 + f * TL_FLOOR + 1.35;
    for (let i = 0; i < TL_N; i++) {
      if (i % 3 === 2) continue;
      const a = (i + 0.5) / TL_N * Math.PI * 2;
      const x = Math.cos(a) * (TL_R + 0.02), z = Math.sin(a) * (TL_R + 0.02);
      b.box('tlWin', 0.46, 0.58, 0.08, x, y, z, 0, -a + Math.PI / 2, 0);
      b.box('tlWinFrame', 0.56, 0.66, 0.05, x, y, z - 0.01, 0, -a + Math.PI / 2, 0);
      /* 窗上小披檐 */
      b.box('tlTileD', 0.56, 0.06, 0.18, x, y + 0.40, z + 0.04, 0, -a + Math.PI / 2, 0);
    }
  }
}
