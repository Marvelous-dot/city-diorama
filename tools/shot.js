const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const url = process.argv[2];
  const out = process.argv[3] || 'shot.png';
  const wait = parseInt(process.argv[4] || '5000', 10);
  const W = parseInt(process.argv[5] || '1500', 10);
  const H = parseInt(process.argv[6] || '940', 10);
  const camArg = process.argv[7];

  const exe = process.env.CHROME_EXE;
  const browser = await chromium.launch({
    executablePath: exe,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

  await page.addInitScript(() => { window.__expose = 1; });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(wait);

  if (camArg) {
    const c = JSON.parse(camArg);
    await page.evaluate((c) => {
      const ctrl = window.__ctrl;
      if (!ctrl) return;
      if (c.theta !== undefined) { ctrl.theta = c.theta; ctrl.tTheta = c.theta; }
      if (c.phi !== undefined) { ctrl.phi = c.phi; ctrl.tPhi = c.phi; }
      if (c.dist !== undefined) { ctrl.dist = c.dist; ctrl.tDist = c.dist; }
      if (c.target) ctrl.target.set(c.target[0], c.target[1], c.target[2]);
      ctrl.auto = false;
      window.__cam();
    }, c);
    await page.waitForTimeout(700);
  }

  const info = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return { w: c ? c.width : 0, h: c ? c.height : 0, title: document.title };
  });

  await page.screenshot({ path: out });
  await browser.close();
  console.log(JSON.stringify({ out: path.basename(out), canvas: info, errors: errs }));
})();
