const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  const exe = process.env.CHROME_EXE;
  const W = 1500, H = 940;
  const browser = await chromium.launch({
    executablePath: exe,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.addInitScript(() => { window.__expose = 1; });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(6000);

  const probe = async (c) => page.evaluate((c) => {
    const ctrl = window.__ctrl, cam = window.__camera, scene = window.__scene;
    if (c.theta !== undefined) { ctrl.theta = c.theta; ctrl.tTheta = c.theta; }
    if (c.phi !== undefined) { ctrl.phi = c.phi; ctrl.tPhi = c.phi; }
    if (c.dist !== undefined) { ctrl.dist = c.dist; ctrl.tDist = c.dist; }
    if (c.target) ctrl.target.set(c.target[0], c.target[1], c.target[2]);
    ctrl.auto = false;
    window.__cam();
    cam.updateMatrixWorld(true);
    scene.updateMatrixWorld(true);

    const P = cam.projectionMatrix.elements, E = cam.matrixWorldInverse.elements;
    let mnx = 9, mxx = -9, mny = 9, mxy = -9, n = 0;
    scene.traverse(function (o) {
      if (!o.isMesh || !o.geometry) return;
      const at = o.geometry.attributes.position;
      if (!at) return;
      const arr = at.array, st = at.itemSize;
      if (arr.length > 4000000) return;
      const m = o.matrixWorld.elements;
      const step = Math.max(1, Math.floor(at.count / 20000));
      for (let i = 0; i < at.count; i += step) {
        const lx = arr[i * st], ly = arr[i * st + 1], lz = arr[i * st + 2];
        const x = m[0] * lx + m[4] * ly + m[8] * lz + m[12];
        const y = m[1] * lx + m[5] * ly + m[9] * lz + m[13];
        const z = m[2] * lx + m[6] * ly + m[10] * lz + m[14];
        const cx = E[0] * x + E[4] * y + E[8] * z + E[12];
        const cy = E[1] * x + E[5] * y + E[9] * z + E[13];
        const cz = E[2] * x + E[6] * y + E[10] * z + E[14];
        const w = P[3] * cx + P[7] * cy + P[11] * cz + P[15];
        if (w <= 0.001) continue;
        const nx = (P[0] * cx + P[4] * cy + P[8] * cz + P[12]) / w;
        const ny = (P[1] * cx + P[5] * cy + P[9] * cz + P[13]) / w;
        if (nx < mnx) mnx = nx; if (nx > mxx) mxx = nx;
        if (ny < mny) mny = ny; if (ny > mxy) mxy = ny;
        n++;
      }
    });
    return {
      minX: +mnx.toFixed(3), maxX: +mxx.toFixed(3),
      minY: +mny.toFixed(3), maxY: +mxy.toFixed(3),
      w: +(mxx - mnx).toFixed(3), h: +(mxy - mny).toFixed(3), n
    };
  }, c);

  const args = process.argv.slice(3);
  const fmt = (o) => JSON.stringify(o);

  if (args[0] === '--solve') {
    const theta = parseFloat(args[1]);
    const phi = parseFloat(args[2]);
    const topY = parseFloat(args[3] || '0.90');   // 想要的最高点 NDC
    let ty = parseFloat(args[4] || '13');
    let dist = parseFloat(args[5] || '132');

    for (let it = 0; it < 8; it++) {
      const r = await probe({ theta, phi, dist, target: [2, ty, -1] });
      const h = r.h;
      console.log(`it${it} dist=${dist.toFixed(1)} ty=${ty.toFixed(2)} h=${h} w=${r.w} y[${r.minY},${r.maxY}]`);
      // 竖向比例：把"总高"收到 2.20（顶部留 0.10 + 底部允许裁 1.30）
      const kh = 2.20 / h;
      // 偏移：让最高点落到 topY
      const shift = r.maxY - topY;          // 正 = 太高了
      dist = dist * Math.pow(kh, 0.90);
      ty += shift * dist * 0.105;
      ty = Math.max(-5, Math.min(45, ty));
      if (Math.abs(kh - 1) < 0.012 && Math.abs(shift) < 0.012) break;
    }
    console.log('FINAL dist=' + dist.toFixed(1) + ' ty=' + ty.toFixed(2));
  } else {
    console.log(fmt(await probe(JSON.parse(args[0] || '{}'))));
  }
  await browser.close();
})();
