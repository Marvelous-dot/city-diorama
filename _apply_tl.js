/* 把 _tl1/2.js 注入已含 garden 的 src/scene.js。单次执行 */
const fs = require('fs');
const p = 'src/scene.js';
let s = fs.readFileSync(p, 'utf8');

if (s.indexOf('const TL = !!PS.tulou;') >= 0) {
  console.error('✗ 已注入过 TL，请先从 git 恢复 scene.js');
  process.exit(1);
}

const mod = ['_tl1.js', '_tl2.js'].map(function (f) {
  return fs.readFileSync(f, 'utf8');
}).join('\n');

/* 1. 形制开关 */
if (s.indexOf('const GD = !!PS.garden;') < 0) throw new Error('缺少 GD 开关');
s = s.replace('const GD = !!PS.garden;', 'const GD = !!PS.garden;\nconst TL = !!PS.tulou;');

/* 2. 模块插到「组装」之前 */
const anchor = '  /* ================= 组装 ================= */';
if (s.indexOf(anchor) < 0) throw new Error('装配锚点缺失');
s = s.replace(anchor, mod + '\n' + anchor);

/* 3. 装配链：土楼排最顶 */
const asm = '  if (GD) {\n    buildGdAll();';
if (s.indexOf(asm) < 0) throw new Error('装配链锚点缺失');
s = s.replace(asm, '  if (TL) {\n    buildTlAll();\n  } else if (GD) {\n    buildGdAll();');

/* 4. 灯光链 */
const lamp = '  if (GD) {\n    /* 园林的暖点光已在 buildGdAll() 内按位置布好 */';
if (s.indexOf(lamp) < 0) throw new Error('灯光链锚点缺失');
s = s.replace(lamp, '  if (TL) {\n    /* 土楼的暖点光已在 buildTlAll() 内按位置布好 */\n  } else if (GD) {\n    /* 园林的暖点光已在 buildGdAll() 内按位置布好 */');

/* 5. 共享装饰守卫 */
s = s.split('|| GD').join('|| GD || TL');
s = s.split('!GD').join('!GD && !TL');

fs.writeFileSync(p, s);
console.log('✓ 注入完成，scene.js =', s.length, 'bytes');
