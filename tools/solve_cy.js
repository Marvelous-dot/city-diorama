/* 构图求解器：迭代把「展台四角 + 各建筑顶点」的屏幕包围盒拉到画布中心，
   再缩放相机距离，让包围盒占满画布到指定比例。
   用法：node solve.js <html> <W> <H> '<start cam json>' <fill> [both|w]
     both  —— 宽高都塞进去（整台入框，两侧留白）
     w     —— 只按宽度撑满（顶对齐 5%，底部出血，适合方展台 + 宽画框）
   前置：页面需要 window.__expose = 1（shot.js 用 addInitScript 注入），
         场景里要暴露 window.__ctrl / window.__cam / window.__camera。
*/
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  const W = parseInt(process.argv[3] || '1500', 10);
  const H = parseInt(process.argv[4] || '940', 10);
  const start = JSON.parse(process.argv[5]);
  const fill = parseFloat(process.argv[6] || '0.90');
  const mode = process.argv[7] || 'both';

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_EXE,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.addInitScript(() => { window.__expose = 1; });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  await page.evaluate((m) => { window.__mode = m; }, mode);
  const out = await page.evaluate(({ start, fill, W, H }) => {
    const T = window.THREE, cam = window.__camera, ctrl = window.__ctrl;
    const P = [[-8.50, -1.95, -8.95], [7.40, -1.95, -8.95], [-8.50, -1.95, 8.95], [7.40, -1.95, 8.95],
      [-7.40, 6.15, -6.40], [-7.40, 6.10, 5.00], [-1.60, 4.58, -6.40], [-1.60, 4.62, 5.00],
      [-4.50, 6.15, -6.40], [-4.50, 6.10, 5.00],
      [-2.60, 9.80, -2.35],                                   // 天线顶（全场最高）
      [-3.05, 9.48, -5.27], [-3.05, 9.48, -1.53],              // 广告牌上沿两角
      [-5.55, 9.03, -1.05],                                    // 屋顶水箱顶
      [-1.60, 7.45, -2.95], [-1.60, 7.45, -0.30],              // B 楼女儿墙
      [-1.60, 2.80, 6.95], [-0.74, 2.55, 6.95],                // 章鱼烧摊
      [-0.90, 2.40, 6.20]];
    ctrl.auto = false;
    ctrl.theta = ctrl.tTheta = start.theta;
    ctrl.phi = ctrl.tPhi = start.phi;
    ctrl.dist = ctrl.tDist = start.dist;
    ctrl.target.set(start.target[0], start.target[1], start.target[2]);

    function measure() {
      window.__cam(); window.__cam(); window.__cam();
      cam.updateMatrixWorld(true);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      P.forEach(function (q) {
        const v = new T.Vector3(q[0], q[1], q[2]).project(cam);
        const px = (v.x * 0.5 + 0.5) * W, py = (-v.y * 0.5 + 0.5) * H;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px);
        y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      });
      return { x0, x1, y0, y1 };
    }

    const dir = new T.Vector3(), right = new T.Vector3(), up = new T.Vector3();
    const mode = window.__mode || 'both';
    for (let it = 0; it < 12; it++) {
      const b = measure();
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      const bw = b.x1 - b.x0, bh = b.y1 - b.y0;
      /* 目标距离平面的「每米像素数」（竖直方向） */
      const pxPerM = (H / 2) / (ctrl.dist * Math.tan(cam.fov * Math.PI / 360));
      dir.set(0, 0, -1).applyQuaternion(cam.quaternion);
      right.set(1, 0, 0).applyQuaternion(cam.quaternion);
      up.set(0, 1, 0).applyQuaternion(cam.quaternion);
      /* 平移：横向拉到画布中心；纵向按模式定 */
      ctrl.target.addScaledVector(right, (cx - W / 2) / pxPerM);
      const wantCy = mode === 'w' ? (0.05 * H + bh / 2) : H / 2;
      ctrl.target.addScaledVector(up, -(cy - wantCy) / pxPerM);
      /* 缩放：让包围盒落在 fill 比例内 */
      const s = mode === 'w' ? (fill * W / bw) : Math.min(fill * W / bw, fill * H / bh);
      ctrl.dist = ctrl.dist / s;
    }
    const b = measure();
    return {
      cam: { theta: +ctrl.theta.toFixed(3), phi: +ctrl.phi.toFixed(3), dist: +ctrl.dist.toFixed(2),
             target: ctrl.target.toArray().map(function (v) { return +v.toFixed(2); }) },
      bbox: [Math.round(b.x0), Math.round(b.y0), Math.round(b.x1), Math.round(b.y1)],
      fill: [+((b.x1 - b.x0) / W).toFixed(3), +((b.y1 - b.y0) / H).toFixed(3)]
    };
  }, { start, fill, W, H });

  console.log(JSON.stringify(out));
  await browser.close();
})();
