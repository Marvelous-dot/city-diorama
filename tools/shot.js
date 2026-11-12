/* 截图 + 运行时探针（单文件 HTML 微缩场景专用）
 *
 * 用法：
 *   node shot.js <url|相对路径> <out.png> [waitMs] [W] [H] ['{"theta":..,"phi":..,"dist":..,"target":[..]}']
 *   node shot.js dist/烟雨_湖亭独钓.html shot.png 5000 1500 940
 *
 * 依赖：playwright-core（回退 playwright）。浏览器优先 CHROME_EXE，
 * 其次自动探测 ms-playwright / 系统 Chrome / Edge，最后交给 playwright 默认。
 * 输出 JSON：canvas 尺寸、mesh 数、三角数、洋红材质（缺失材质）、页面错误。
 * 交付前必须 errors 为空且 magenta 为空，再用 ViewImage 目视复核。
 */
const path = require('path');
const fs = require('fs');

let chromium;
try {
  chromium = require('playwright-core').chromium;
} catch (e) {
  chromium = require('playwright').chromium;
}

function findChrome() {
  if (process.env.CHROME_EXE) return process.env.CHROME_EXE;
  const cands = [];
  const la = process.env.LOCALAPPDATA;
  if (la) {
    const root = path.join(la, 'ms-playwright');
    try {
      const dirs = fs.readdirSync(root).filter(d => /^chromium-/.test(d)).sort().reverse();
      for (const d of dirs) {
        cands.push(path.join(root, d, 'chrome-win64', 'chrome.exe'));
        cands.push(path.join(root, d, 'chrome-linux', 'chrome'));
      }
    } catch (e) { /* 目录不存在 */ }
  }
  cands.push('C:/Program Files/Google/Chrome/Application/chrome.exe');
  cands.push('C:/Program Files (x86)/Google/Chrome/Application/chrome.exe');
  cands.push('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe');
  cands.push('/usr/bin/chromium', '/usr/bin/google-chrome');
  for (const p of cands) if (fs.existsSync(p)) return p;
  return undefined; // 交给 playwright 自带浏览器
}

(async () => {
  const url = process.argv[2];
  if (!url) throw new Error('用法: node shot.js <url> <out.png> [wait] [W] [H] [cam-json]');
  const out = process.argv[3] || 'shot.png';
  const wait = parseInt(process.argv[4] || '5000', 10);
  const W = parseInt(process.argv[5] || '1500', 10);
  const H = parseInt(process.argv[6] || '940', 10);
  const cam = process.argv[7] ? JSON.parse(process.argv[7]) : null;

  const exe = findChrome();
  const browser = await chromium.launch({
    ...(exe ? { executablePath: exe } : {}),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--disable-gpu-sandbox', '--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });

  await page.addInitScript(() => { window.__expose = 1; });
  const nav = /^(https?:|file:)/i.test(url)
    ? url : 'file:///' + path.resolve(url).replace(/\\/g, '/');
  await page.goto(nav, { waitUntil: 'load' });

  // 相机必须在等待前注入：auto 关掉，避免缓动把机位拉回预设值
  await page.evaluate(c => {
    const k = window.__ctrl;
    if (!k) return;
    k.auto = false;
    if (c) {
      if (c.theta !== undefined) { k.theta = k.tTheta = c.theta; }
      if (c.phi !== undefined) { k.phi = k.tPhi = c.phi; }
      if (c.dist !== undefined) { k.dist = k.tDist = c.dist; }
      if (c.target) k.target.set(c.target[0], c.target[1], c.target[2]);
    }
    if (window.__cam) window.__cam();
  }, cam);
  await page.waitForTimeout(wait);

  const stat = await page.evaluate(() => {
    let meshes = 0, tris = 0;
    const magenta = [];
    if (window.__scene) window.__scene.traverse(o => {
      if (!o.isMesh) return;
      meshes++;
      const g = o.geometry;
      if (g && g.attributes.position) tris += g.attributes.position.count / 3;
      const m = o.material;
      if (m && m.color && m.color.getHex && m.color.getHex() === 0xff00ff)
        magenta.push(o.name || 'unnamed');
    });
    const cv = document.querySelector('canvas');
    return {
      canvas: { w: cv ? cv.width : 0, h: cv ? cv.height : 0 },
      meshes, tris: Math.round(tris), magenta: magenta.slice(0, 8)
    };
  });

  await page.screenshot({ path: out });
  await browser.close();
  console.log(JSON.stringify({ out: path.basename(out), ...stat, errors: errs.slice(0, 8) }));
})().catch(e => { console.error(e); process.exit(1); });
