/* 构建器：把「预设 + 场景模板 + three.js」打包成可离线双击的单文件 HTML
   用法：node build.js [presetId ...]     不传则构建全部
*/
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');

const PRESETS = require(path.join(SRC, 'presets.js'));
const scene = fs.readFileSync(path.join(SRC, 'scene.js'), 'utf8');

let three = fs.readFileSync(path.join(SRC, 'three.min.js'), 'utf8');
three = three.replace(/^console\.warn\([^;]*\);\s*/, '');

const ids = process.argv.slice(2);
const targets = ids.length ? ids : Object.keys(PRESETS);

for (const id of targets) {
  const p = PRESETS[id];
  if (!p) {
    console.error('未知预设：' + id);
    process.exit(1);
  }

  const sky = p.sky || ['#fdf9f0', '#eeeade', '#d7dfd9', '#c3cfca'];
  const vig = p.vig || 'rgba(38,48,44,0.20)';
  const title = p.title || id;

  const presetJson = JSON.stringify(p, null, 2);

  /* 外部资产（如 USD 转出的紧凑几何）随包内联，保证单文件离线可用 */
  let assetJs = '';
  if (p.asset) {
    const ap = path.join(ROOT, p.asset);
    if (fs.existsSync(ap)) {
      assetJs = fs.readFileSync(ap, 'utf8');
    } else {
      console.warn('  ! 资产缺失：' + p.asset);
    }
  }

  /* 夜景城市：屏幕底部叠一层暖色光污染。
     这是屏幕空间的，不跟着相机转 —— 但天空本来就是背景板，
     看上去完全一样，而且永远不会像 3D 平面那样在天空里露出边缘。 */
  const haze = p.city
    ? `  #haze { position: fixed; inset: 0; pointer-events: none;
           background: linear-gradient(to top,
             rgba(255,118,86,0.15) 0%,
             rgba(198,84,150,0.085) 18%,
             rgba(120,70,180,0.030) 34%,
             rgba(0,0,0,0) 52%); }
`
    : '';
  const hazeDiv = p.city ? '<div id="haze"></div>' : '';

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${title}</title>
<style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: ${sky[3]}; }
  body { background: radial-gradient(120% 100% at 50% 24%, ${sky[0]} 0%, ${sky[1]} 38%, ${sky[2]} 72%, ${sky[3]} 100%); }
  canvas { display: block; }
  #vig { position: fixed; inset: 0; pointer-events: none;
         background: radial-gradient(78% 72% at 50% 44%, rgba(0,0,0,0) 52%, ${vig} 100%); }
${haze}</style>
</head>
<body>
<div id="vig"></div>
${hazeDiv}
<script>
${three}
</script>
<script>
window.PRESET = ${presetJson};
</script>
${assetJs ? '<script>\n' + assetJs + '</script>\n' : ''}<script>
${scene}
</script>
</body>
</html>
`;

  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, title.replace(/[\\/:*?"<>|]/g, '_').replace(/\s·\s/g, '_') + '.html');
  fs.writeFileSync(file, html, 'utf8');
  console.log('✓ ' + path.basename(file) + '  ' + (html.length / 1024).toFixed(0) + ' KB');
}
