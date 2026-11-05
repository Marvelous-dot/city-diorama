/* =========================================================
   城市微缩场景预设库
   每个预设只覆盖「与默认不同的部分」，未写项继承模板默认值。
   ========================================================= */
(function (root, factory) {
  var o = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = o;
  else root.PRESETS = o;
})(typeof self !== 'undefined' ? self : this, function () {
  return {

    /* ---------------------------------------------------------
       江南 · 临水茶楼（模板基准）
       --------------------------------------------------------- */
    jiangnan: {
      id: 'jiangnan',
      title: '江南 · 临水茶楼',
      plaque: '听雨茶楼',
      banner: { main: '茶', rest: ['聽', '雨', '歇', '腳'] },
      bannerBg: '#2d4f78',
      calicoBg: '#2f5480',
      paint: '雨窗',
      sky: ['#fdf9f0', '#eeeade', '#d7dfd9', '#c3cfca'],
      vig: 'rgba(38,48,44,0.20)',
      light: {
        sun: { color: 0xfff1d0, i: 2.15, pos: [17.5, 16.5, 12.0] },
        fill: { color: 0x8fc0da, i: 0.62, pos: [-13, 9, -11] },
        hemi: { sky: 0xa9d2e4, ground: 0xcfc3a0, i: 0.78 },
        amb: { color: 0x8fb0bd, i: 0.22 }
      },
      water: {
        deep: [0.196, 0.408, 0.451],
        shal: [0.376, 0.588, 0.596],
        hi: [0.784, 0.855, 0.808]
      },
      veg: {
        willows: [[4.0, -4.35, 0.95], [-6.5, 1.95, 0.72]],
        bamboo: [[-7.0, -4.6, 1.0], [-6.9, 6.9, 0.75]],
        pots: [[1.85, 2.35], [2.1, -2.55]]
      },
      cam: { theta: 0.74, phi: 1.2, dist: 37, target: [-0.5, 1.95, 0.2] }
    },

    /* ---------------------------------------------------------
       徽州 · 马头墙茶栈
       白墙黛瓦、叠落山墙、黄昏斜照、竹影
       --------------------------------------------------------- */
    huizhou: {
      id: 'huizhou',
      title: '徽州 · 马头墙茶栈',
      plaque: '徽州茶栈',
      banner: { main: '茶', rest: ['徽', '州', '歇', '腳'] },
      bannerBg: '#1f3d63',
      bannerColor: '#f4eee0',
      plaqueColor: '#e8cd8a',
      calicoBg: '#1f3d63',
      paint: '黃山',
      matou: true,
      emis: 1.08,
      lampK: 1.16,
      sky: ['#fdf3e2', '#f3e2c6', '#d8c3a8', '#a8b0ae'],
      vig: 'rgba(46,38,30,0.24)',
      palette: {
        plaster: 0xf6f3ea, plaster2: 0xfaf7ef,
        tile: 0x3b424b, tileD: 0x272d36, tileL: 0x4e5762,
        wood: 0x7f5d3f, woodDark: 0x553d29, woodDeep: 0x33241a,
        woodLight: 0x9a7a5c, woodPale: 0xc6ae8c, woodWarm: 0x6e4f35,
        stone: 0x8d9591, stoneD: 0x656d6a, stoneL: 0xa4aca6,
        leaf1: 0x5f8340, leaf2: 0x455f2f, leaf3: 0x7d9c55,
        bambooS: 0x7d9455,
        bark: 0x5e4a37,
        hull: 0x4b3222
      },
      light: {
        sun: { color: 0xffe3b4, i: 2.25, pos: [14.0, 10.8, 13.5] },
        fill: { color: 0x7fa8c8, i: 0.5, pos: [-12, 7, -13] },
        hemi: { sky: 0xa2c2d8, ground: 0xcbb693, i: 0.72 },
        amb: { color: 0x7a94a4, i: 0.2 }
      },
      water: {
        deep: [0.125, 0.272, 0.295],
        shal: [0.258, 0.435, 0.443],
        hi: [0.722, 0.796, 0.756]
      },
      veg: {
        willows: [[4.0, -4.35, 0.86]],
        bamboo: [[-7.0, -4.62, 1.05], [-6.92, 6.9, 0.95], [-6.55, -6.7, 0.7]],
        pots: [[1.85, 2.35], [2.1, -2.55]]
      },
      cam: { theta: 0.66, phi: 1.16, dist: 36, target: [-0.5, 2.15, 0.2] }
    },

    /* ---------------------------------------------------------
       川西 · 锦江茶铺
       黄泥墙、小青瓦、秋日暖黄树、晨雾柔光
       --------------------------------------------------------- */
    chuanxi: {
      id: 'chuanxi',
      title: '川西 · 锦江茶铺',
      plaque: '锦江茶铺',
      banner: { main: '茶', rest: ['錦', '江', '歇', '腳'] },
      bannerBg: '#2a4a70',
      calicoBg: '#2a4a70',
      paint: '蜀',
      emis: 0.94,
      lampK: 1.3,
      sky: ['#f7f4ea', '#e9e6d9', '#cfd2cc', '#b6bcb8'],
      vig: 'rgba(44,44,40,0.22)',
      palette: {
        plaster: 0xd3b082, plaster2: 0xc9a577,
        tile: 0x5c5d57, tileD: 0x45463f, tileL: 0x6f7169,
        wood: 0x8d5c37, woodDark: 0x5e3c23, woodDeep: 0x3a2415,
        woodLight: 0xa88058, woodPale: 0xc8a878, woodWarm: 0x7a4f30,
        stone: 0xa09a8a, stoneD: 0x7a7568, stoneL: 0xb0aa9a,
        leaf1: 0xb9a24e, leaf2: 0x8f7c38, leaf3: 0xd2b968,
        bambooS: 0x9aa35a,
        bark: 0x6a5540,
        hull: 0x513626
      },
      emit: {
        int1: { c: 0x7d5c3e, e: 0x1c1006 },
        int2: { c: 0x94724d, e: 0x1a1108 },
        int3: { c: 0xd6c9a8, e: 0x241d12 },
        int4: { c: 0x4c3320, e: 0x120b04 }
      },
      light: {
        sun: { color: 0xffeccb, i: 1.72, pos: [16.0, 20.5, 10.5] },
        fill: { color: 0x94a9be, i: 0.72, pos: [-13, 10, -12] },
        hemi: { sky: 0xb2c6d2, ground: 0xd2c6a6, i: 0.92 },
        amb: { color: 0x8a9aa6, i: 0.28 }
      },
      water: {
        deep: [0.176, 0.322, 0.306],
        shal: [0.345, 0.478, 0.443],
        hi: [0.760, 0.812, 0.760]
      },
      veg: {
        willows: [[4.0, -4.35, 1.0], [-6.5, 1.95, 0.8]],
        bamboo: [[-6.95, -4.6, 0.92]],
        pots: [[1.85, 2.35], [2.1, -2.55], [-0.4, 7.9]]
      },
      cam: { theta: 0.78, phi: 1.22, dist: 37, target: [-0.5, 1.95, 0.2] }
    },

    /* ---------------------------------------------------------
       滕王阁 · 南昌
       三层四重檐楼阁、城墙式高台座、绿琉璃瓦、朱红柱
       --------------------------------------------------------- */
    tengwang: {
      id: 'tengwang',
      title: '滕王阁 · 落霞孤鹜',
      tower: true,
      towerBase: 4.35,
      towerCx: -2.05,
      towerCz: -0.2,
      plaque: '滕王阁',
      plaquePos: [1.58, 3.42, -0.2],
      plaqueSize: [1.72, 0.5],
      paint: '落霞',
      banner: { main: '閣', rest: ['滕', '王', '高', '閣'] },
      bannerBg: '#2c4a63',
      calicoBg: '#2c4a63',
      emis: 1.05,
      lampK: 1.1,
      sky: ['#fdfaf1', '#efeada', '#d2d9d1', '#b8c3bd'],
      vig: 'rgba(40,46,42,0.22)',
      palette: {
        plaster: 0xf3efe4, plaster2: 0xf7f4ea, paper: 0xdccfad,
        tile: 0x3f7f5e, tileD: 0x2a5f45, tileL: 0x66a681,
        pillar: 0xa8342a,
        cai: 0x3d6b60,
        wood: 0x6b4632, woodDark: 0x4e3122, woodDeep: 0x33200f,
        woodLight: 0x8e6544, woodPale: 0xbfa27e, woodWarm: 0x5c3b28,
        stone: 0xb3afa4, stoneD: 0x8b887e, stoneL: 0xc8c5b9,
        leaf1: 0x6f9048, leaf2: 0x506f34, leaf3: 0x8aa85c,
        bambooS: 0x879a58,
        bark: 0x6a5540,
        brass: 0xc2a15a,
        hull: 0x4f3524
      },
      light: {
        sun: { color: 0xfff0d4, i: 2.2, pos: [17.0, 17.0, 11.0] },
        fill: { color: 0x9ab8cc, i: 0.7, pos: [-12, 8, -12] },
        hemi: { sky: 0xb4d0dc, ground: 0xd0c6a8, i: 0.84 },
        amb: { color: 0x93aab6, i: 0.24 }
      },
      water: {
        deep: [0.180, 0.342, 0.330],
        shal: [0.345, 0.500, 0.470],
        hi: [0.780, 0.830, 0.790]
      },
      veg: {
        willows: [[3.62, 6.4, 0.8], [-8.0, -5.8, 0.66]],
        bamboo: [[-7.7, -3.5, 0.8]],
        pots: [[3.5, -3.4], [3.45, 1.6]]
      },
      bellPos: [[2.45, 4.55, 4.3], [2.45, 4.55, -4.7], [-6.55, 4.55, 4.3], [-6.55, 4.55, -4.7]],
      cam: { theta: 0.6, phi: 1.21, dist: 40, target: [-0.5, 4.2, -0.1] }
    },

    /* ---------------------------------------------------------
       拾光便利 · 现代便利店（玻璃盒子形制）
       --------------------------------------------------------- */
    store: {
      id: 'store',
      title: '拾光便利 · 午后',
      store: true,
      shopName: '拾光便利',
      emis: 1.0,
      lampK: 1.0,
      palette: {
        sbBase: 0x4c5157, sbBase2: 0x3b4045,
        asphalt: 0x565a5e, walk: 0xbcbab0, walk2: 0xaeaca2, walk3: 0xc7c5bb,
        line: 0xdcd9c8, grass: 0x6d844e, grass2: 0x5b7139,
        stone: 0xa8a9a4, stoneD: 0x8a8b86, stoneL: 0xc2c3bd,
        wallWhite: 0xf1f0e9, sbRoof: 0xdcdbd3,
        sbTrim: 0x36434c, sbTrim2: 0x5d6a72,
        floorIn: 0xbdb9ab, floorLine: 0xbcb8ab, ceil: 0xf4f4ef, tube: 0xffffff,
        shelf: 0xe6e5de, shelfD: 0xa4a9aa,
        fridge: 0xeff0ec, fridgeIn: 0xcfd9db,
        counter: 0x394750, counterTop: 0xded9cb,
        metal: 0x848c90, metalD: 0x5c6367,
        screen: 0x2f4a58, priceTag: 0xe8a33d, matDark: 0x45413c,
        prod1: 0xd0534a, prod2: 0xe8a33d, prod3: 0x4e9b6a, prod4: 0x4a7fb5,
        prod5: 0xdcc44a, prod6: 0x9a6cae, prod7: 0xe9e6dc, prod8: 0x6f8f9e,
        carBody: 0xd8d3c8, carBody2: 0x4c6c7c, carGlassD: 0x5d7480, tire: 0x35353a,
        leaf1: 0x7d9c50, leaf2: 0x5f7c3c, leaf3: 0x97b064, bark: 0x6a5742
      },
      emit: {
        tube:    { c: 0xffffff, e: 0xffffff },
        ceil:    { c: 0xf4f4ef, e: 0x2c2c28 },
        floorIn: { c: 0xbdb9ab, e: 0x141418 },
        shelf:   { c: 0xe6e5de, e: 0x1e1e18 },
        fridge:  { c: 0xeff0ec, e: 0x262622 },
        fridgeIn:{ c: 0xcfd9db, e: 0x222d30 },
        screen:  { c: 0x2f4a58, e: 0x24485c }
      },
      light: {
        sun: { color: 0xffeecb, i: 2.05, pos: [16.0, 18.5, 13.0] },
        fill: { color: 0x9ec0d8, i: 0.58, pos: [-13, 9, -12] },
        hemi: { sky: 0xc0d9e7, ground: 0xd8d2c2, i: 0.9 },
        amb: { color: 0x9bb0bc, i: 0.27 }
      },
      veg: { willows: [], bamboo: [], pots: [] },
      cam: { theta: 0.36, phi: 1.315, dist: 24.5, target: [-2.2, 0.85, 2.4] }
    },

    /* ---------------------------------------------------------
       山海仓 · 会员制仓储大卖场（大盒子形制）
       挑高卖场 + 托盘货架 + 大片停车场
       --------------------------------------------------------- */
    club: {
      id: 'club',
      title: '山海仓 · 会员大卖场',
      club: true,
      clubName: '山海仓',
      emis: 1.0,
      lampK: 1.0,
      sky: ['#fdfaf2', '#eeeade', '#d8dfe2', '#c2cdd2'],
      vig: 'rgba(34,46,52,0.22)',
      palette: {
        wcBase: 0x3f4449, wcBase2: 0x31363a,
        wcAsphalt: 0x56595c, wcLine: 0xe0dbc6,
        wcWalk: 0xbcbab1, wcWalk2: 0xaeaca3,
        wcBody: 0xeceae2, wcBody2: 0xd6d4ca,
        wcBand: 0x0c5192, wcBand2: 0x083a68,
        wcTrim: 0x2f3438, wcTrim2: 0x555b60,
        wcRoof: 0xa2a49f, wcRoof2: 0x8b8d8c,
        wcFloorIn: 0x8f8e86, wcFloorLine: 0xd8b23c,
        wcCeil: 0x70757a, wcTruss: 0x515760,
        wcUp: 0x27598f, wcBeam: 0xcf7a2f,
        wcPallet: 0xa8875b, wcCarton: 0xc09a63, wcCarton2: 0xa98352, wcFilm: 0xd9dbd8,
        wcCase: 0xe9eae4, wcCaseIn: 0x7d949c, wcShelf: 0xdfe1dc,
        wcCounter: 0xdfdbd0, wcCounterTop: 0x93989c, wcBelt: 0x3b3e42,
        wcMetal: 0x9aa0a4, wcMetalD: 0x5c6266,
        wcYel: 0xd8a72e, wcSeat: 0x33383d,
        grass: 0x6f8751, grass2: 0x5c7339,
        leaf1: 0x7f9d52, leaf2: 0x617f3d, leaf3: 0x99b266, bark: 0x6a5742,
        stoneD: 0x8f9089, stoneL: 0xc4c5be,
        metal: 0x9aa0a4, metalD: 0x5c6266, matDark: 0x44403b,
        screen: 0x2f4a58, tube: 0xffffff,
        prod1: 0xd0534a, prod2: 0xe8a33d, prod3: 0x4e9b6a, prod4: 0x4a7fb5,
        prod5: 0xdcc44a, prod6: 0x9a6cae, prod7: 0xe9e6dc, prod8: 0x6f8f9e,
        carBody: 0xd6d1c5, carBody2: 0x3f5d74, carBody3: 0xb5503f,
        carBody4: 0x8d9296, carBody5: 0x2f3a44,
        carGlassD: 0x5d7480, tire: 0x35353a
      },
      emit: {
        tube:      { c: 0xffffff, e: 0xffffff },
        screen:    { c: 0x2f4a58, e: 0x24485c },
        wcCeil:    { c: 0x70757a, e: 0x2a2c2c },
        wcFloorIn: { c: 0x8f8e86, e: 0x131316 },
        wcUp:      { c: 0x27598f, e: 0x0d1a28 },
        wcBeam:    { c: 0xcf7a2f, e: 0x1a1208 },
        wcPallet:  { c: 0xa8875b, e: 0x140f08 },
        wcCarton:  { c: 0xc19a67, e: 0x171008 },
        wcCarton2: { c: 0xb08a5c, e: 0x150f08 },
        wcCase:    { c: 0xe9eae4, e: 0x1e2020 },
        wcCaseIn:  { c: 0x7d949c, e: 0x162024 },
        wcShelf:   { c: 0xdfe1dc, e: 0x181818 },
        wcCounter: { c: 0xdfdbd0, e: 0x151515 },
        wcMetal:   { c: 0x9aa0a4, e: 0x111315 }
      },
      light: {
        sun: { color: 0xfff2d6, i: 2.05, pos: [17.0, 19.0, 12.5] },
        fill: { color: 0x9cbfd8, i: 0.60, pos: [-14, 10, -12] },
        hemi: { sky: 0xc4dbe8, ground: 0xd6d0c0, i: 0.92 },
        amb: { color: 0x9cb2be, i: 0.26 }
      },
      veg: { willows: [], bamboo: [], pots: [] },
      cam: { theta: 0.46, phi: 1.302, dist: 29.5, target: [0.55, 1.85, -0.35] }
    },

    /* ---------------------------------------------------------
       自动化工厂仓库（wh 形制）
       外部资产：NVIDIA SimReady UR10e（mjcf 分件 + 运动学摆姿，见 tools/obj2toon.py）
       --------------------------------------------------------- */
    wh: {
      id: 'wh',
      title: '恒仓 · 自动化工厂仓库',
      wh: true,
      emis: 1.0,
      lampK: 1.0,
      asset: 'nv_assets/ur10.js',
      sky: ['#f6f8f7', '#e7ecec', '#d2dade', '#bcc6cc'],
      vig: 'rgba(30,40,46,0.22)',
      palette: {
        whBase: 0x4a4f52, whBase2: 0x3a3f42,
        whApron: 0x8f918b, whApron2: 0x7d7f79,
        whDockApron: 0x9a9c95, whDockEdge: 0xb0b1a9,
        whSlab: 0xa9aba3,
        whLine: 0xd8b23c, whLineW: 0xe2e4dc, whWarn: 0xd8b23c,
        whWalk: 0x5d7f63, whWalk2: 0x9fa39b,

        whFloor: 0x7f867f, whFloor2: 0x6c736c,
        whWall: 0xb4b8b1, whWall2: 0x9ba19a, whBaseB: 0x5c625c,
        whSteel: 0x5a646c, whSteel2: 0x3f4750, whTruss: 0x6d777e,
        whRoof: 0x8d949a, whRoof2: 0x757c82, whSky: 0xdae9f2,

        whUp: 0x2c5f93, whBeam: 0xcf7a2f,
        whPallet: 0xb08a58, whPallet2: 0x93714a,
        whCarton: 0xc09a63, whCarton2: 0xa98352, whFilm: 0xdde4e2,
        whTote: 0x3d6fa8, whBin: 0x2c527d,

        whFrame: 0x8d959b, whFrame2: 0x5f676d, whRoller: 0xb6bdc2,
        whGuard: 0xd8b13a, whMesh: 0xb9c0c4,
        whBody: 0xd9a318, whBodyD: 0x8f6c10, whSeat: 0x333639, whTire: 0x2e3033,
        whDoor: 0x9aa2a8, whDoor2: 0x878f95, whBand: 0x1d4c7c,
        whCounter: 0xdcded7, whSign: 0xe9ece6, whGlassP: 0xb9d2dc, whLamp: 0xf2f7fd,
        whScan: 0x2f4a58, whRed: 0xb3452f, whBlue: 0x35618c,

        stoneD: 0x8f9089, stoneL: 0xc4c5be,
        metal: 0x9aa0a4, metalD: 0x5c6266, matDark: 0x44403b,
        screen: 0x2f4a58, tube: 0xffffff,
        prod1: 0xd0534a, prod2: 0xe8a33d, prod3: 0x4e9b6a, prod4: 0x4a7fb5,
        prod5: 0xdcc44a, prod6: 0x9a6cae, prod7: 0xe9e6dc, prod8: 0x6f8f9e
      },
      emit: {
        whSky:     { c: 0xdae9f2, e: 0x9fc2d6 },
        whLamp:    { c: 0xf2f7fd, e: 0xdfeaf6 },
        whFloor:   { c: 0x7f867f, e: 0x14171a },
        whFloor2:  { c: 0x6c736c, e: 0x0e1012 },
        whUp:      { c: 0x2c5f93, e: 0x0e1a26 },
        whBeam:    { c: 0xcf7a2f, e: 0x1a1208 },
        whPallet:  { c: 0xb08a58, e: 0x14100a },
        whPallet2: { c: 0x93714a, e: 0x110d08 },
        whCarton:  { c: 0xc09a63, e: 0x171109 },
        whCarton2: { c: 0xa98352, e: 0x140f08 },
        whTote:    { c: 0x3d6fa8, e: 0x0d1a28 },
        whBin:     { c: 0x2c527d, e: 0x0a1420 },
        whCounter: { c: 0xdcded7, e: 0x161818 },
        whSign:    { c: 0xe9ece6, e: 0x232623 },
        whScan:    { c: 0x2f4a58, e: 0x1d3a48 },
        whWall:    { c: 0xc4c8c1, e: 0x1a1c1a },
        whMesh:    { c: 0xb9c0c4, e: 0x141618 },
        whRoller:  { c: 0xb6bdc2, e: 0x121415 },
        whFrame:   { c: 0x8d959b, e: 0x101213 }
      },
      light: {
        sun: { color: 0xfff4dc, i: 2.10, pos: [17.0, 18.0, 12.0] },
        fill: { color: 0x9dbfd6, i: 0.62, pos: [-14, 10, -12] },
        hemi: { sky: 0xc6dce8, ground: 0xd2cec2, i: 0.94 },
        amb: { color: 0x9ab0bc, i: 0.26 }
      },
      veg: { willows: [], bamboo: [], pots: [] },
      cam: { theta: 0.47, phi: 1.292, dist: 28.3, target: [0.05, 1.95, 0.22] }
    },

    /* ---------------------------------------------------------
       胶东农村屋舍（jd 形制）
       荣成海草房：花岗岩毛石墙 + 厚海草顶 + 院落 + 菜园 + 辘轳井
       --------------------------------------------------------- */
    jiaodong: {
      id: 'jiaodong',
      title: '胶东 · 海草房农家院',
      jd: true,
      jdPlaque: '耕讀傳家',
      emis: 1.0,
      lampK: 1.0,
      sky: ['#fbf7ee', '#efeade', '#dadfe1', '#c1ccd1'],
      vig: 'rgba(46,42,34,0.20)',
      palette: {
        /* 毛石墙：灰浆浅、石色沉，胶东花岗岩偏暖灰 */
        jdStone: 0xa8a398, jdStoneD: 0x8a867c, jdStoneL: 0xc3beb2,
        jdMortar: 0xcdc6b6,
        /* 海草顶：晒过的大叶藻，银灰褐 */
        jdThatch: 0x938e83, jdThatchD: 0x8a857b,
        /* 地面 */
        jdEarth: 0xb09a78, jdEarth2: 0x9c8768,
        jdFlag: 0xb0aca0, jdFlag2: 0x9d988c,
        jdSoil: 0x5d4635, jdSoilD: 0x4a372a,
        /* 木作 */
        jdDoor: 0x704c2f, jdDoorD: 0x54381f, jdDoorFrame: 0x5d3f28,
        jdWinFrame: 0x4e3a26, jdWinIn: 0xe4c48c,
        /* 井 */
        jdWellIn: 0x2a2b28, jdRope: 0xb9a276,
        /* 菜园 */
        jdOnionW: 0xeceee0, jdOnionG: 0x5f8c43,
        jdCabbage: 0xb7cd88, jdCabbageL: 0xd6e2b0,
        jdRadish: 0xdcdcd0, jdChili: 0xbf3a26, jdChiliD: 0x9e2c1c,
        jdBean: 0x8fae5a,
        /* 秋收 */
        jdCorn: 0xdcb94c, jdCornLeaf: 0xc2b070,
        jdPersimmon: 0xd96a2b, jdJujube: 0x9c3b2a,
        jdStalk: 0xc4a96e, jdStalkD: 0x9c8451, jdStackBase: 0xa8905c,
        /* 家什 */
        jdJar: 0x6b5443, jdJarD: 0x4f3d31,
        jdHenW: 0xe8e2d2, jdHenB: 0x8a5a3a, jdBeak: 0xd09b3c, jdComb: 0xb7382a,
        jdLantern: 0xc23a2c, jdTassel: 0xd6b24a,
        jdCloth: 0xdcd8ca, jdCloth2: 0x8fa8bc,
        jdTire: 0x2f2f2c, jdChimneyIn: 0x2a2724,

        /* 室内：灶间 + 炕 */
        jdInWall: 0xb2a286, jdInFloor: 0x7d6a55, jdInCeil: 0x5f4d38,
        jdBrick: 0x9b6a4e, jdBrick2: 0x88593f, jdIron: 0x33352f, jdPotLid: 0xc2a068,
        jdWoodIn: 0x7a5636, jdWoodInD: 0x5a3d24, jdWoodW: 0xa87848,
        jdKang: 0x9c7f5e, jdMat: 0xc2a463,
        jdQuilt: 0xa8442f, jdQuilt2: 0x5d7690, jdQuiltW: 0xe6dcc4,
        jdBasket: 0xc4a468, jdGourd: 0xc9a35f, jdPaper: 0xd8b464,
        /* 厢房 / 平房 / 楼梯 */
        jdFlatRoof: 0x9d9a8f, jdFlatEdge: 0x8b887e,
        jdStair: 0xa8a294, jdStairD: 0x8b877c,

        stoneD: 0x8a867c, stoneL: 0xc3beb2,
        woodDark: 0x5d3f28, woodWarm: 0x8a5a34, woodLight: 0xbb8f5f,
        tile: 0x6d6a61, tileD: 0x55524a,
        bark: 0x6b5540, leaf1: 0x7c9a4c, leaf2: 0x5f7f3c, leaf3: 0x97ae62,
        bambooS: 0x9aa46a, brass: 0xb9964d, metal: 0x9aa0a4, metalD: 0x5c6266
      },
      emit: {
        jdWinIn:   { c: 0xe4c48c, e: 0x3a2712 },
        jdLantern: { c: 0xc23a2c, e: 0x4a0f08 },
        jdFire:    { c: 0xd4632a, e: 0x8a2a08 }
      },
      light: {
        sun: { color: 0xfff0d2, i: 2.25, pos: [16.0, 15.0, 11.0] },
        fill: { color: 0xa8c0d2, i: 0.55, pos: [-15, 9, -13] },
        hemi: { sky: 0xd6e0e6, ground: 0xd8cfb8, i: 0.92 },
        amb: { color: 0x9aa8b0, i: 0.24 }
      },
      veg: { willows: [], bamboo: [], pots: [] },
      cam: { theta: 0.62, phi: 0.93, dist: 31.4, target: [1.28, -0.60, 0.36] }
    },

    /* ---------------------------------------------------------
       霓虹 · 日式横丁（赛博朋克夜街）
       --------------------------------------------------------- */
    cyber: {
      id: 'cyber',
      title: '霓虹 · 日式横丁',
      cyber: true,
      sky: ['#3a3058', '#251d3e', '#131024', '#07060f'],
      vig: 'rgba(3,2,10,0.66)',
      palette: {
        /* 展台 / 路面 */
        cyBaseD: 0x0e0e14,
        cyAsphalt: 0x22222c, cyAsphalt2: 0x2a2a34, cyAsphalt3: 0x1a1a22,
        cyWalk: 0x33333e, cyWalk2: 0x2a2a34, cyCurb: 0x44444f,
        cyAlley: 0x1f1f28, cyAlley2: 0x2b2b35,
        cyPaintW: 0x9aa2b0, cyPlate: 0x2b2b34,
        /* 建筑：三栋各有色相偏移，不然整排是一块灰 */
        cyWallA: 0x453a4a, cyWallB: 0x353240, cyWallB2: 0x464153,
        cyWallC: 0x3f3748, cyWallC2: 0x4d4458,
        cyPlaster: 0x4f455c,
        cyWood: 0x5b4632, cyWoodD: 0x32251a,
        cyTile: 0x353443, cyTileD: 0x25242f, cyTileL: 0x44435a,
        cyShutter: 0x3a3d47, cyGraffiti: 0x2f6f7a, cyGraffiti2: 0x7a2f5c,
        cyRoofFlat: 0x3a3742, cyRoofEdge: 0x2e2b35,
        cyGlassD: 0x21303f, cyShopIn: 0x2a2620,
        cyShopD: 0x22242b,
        /* 金属 / 管 / 车 */
        cyMetal: 0x4a4d58, cyMetalD: 0x2a2c35,
        cyPipe: 0x44474f, cyPipeD: 0x2e3138,
        cyConcrete: 0x3c3c46, cyPorc: 0xb6b9c2, cyCable: 0x0f1015,
        cyTank: 0x69707a, cyTankD: 0x464c55,
        cyBody: 0x3d6f88, cyBody2: 0x30596d, cyTire: 0x15161c,
        cyVendBody: 0x2a2e38, cyCan: 0x3f6f8a, cyCan2: 0x8a3f4a,
        /* 布 / 木作小件 */
        cyNoren: 0x2b3a5a, cyNoren2: 0x5a2b3a, cyCream: 0xd6cdb6,
        cySignBox: 0x191920, cyAwning: 0x6a2f34, cyAwning2: 0x4a2126,
        cyTorii: 0xa8382c, cyToriiD: 0x7a2820,
        cyStone: 0x4a4a54, cyStoneD: 0x37373f,
        cyCrate: 0x4a3a2a, cyCrate2: 0x3b5a4a, cyCrateD: 0x2a2017,
        cyStraw: 0x7d6a42, cyRope: 0x2f2a1e, cySake: 0xb8a678,
        cyTrash: 0x1a1b21, cyCone: 0xc9502a, cyConeW: 0xd6d4cc,
        /* 灯 */
        cyLampHead: 0x33363d, cyLantern: 0x8a2a18, cyTail: 0x3a0c0a,
        cyWinW: 0x3a2a18, cyWinC: 0x18242e, cyShopW: 0x2a2620,
        cyVendIn: 0x102030, cyNeonC: 0x0a1a20, cyNeonA: 0x1e1408, cyNeonM: 0x1a0c14,
        cyLampGlow: 0x1a1508, cyBulb: 0x1a1408
      },
      emit: {
        cyWinW:    { c: 0x3a2a18, e: 0xffb867 },
        cyWinC:    { c: 0x18242e, e: 0x7fc4e6 },
        cyShopW:   { c: 0x2a2620, e: 0xfff1d2 },
        cyVendIn:  { c: 0x102030, e: 0xcfeaff },
        cyLantern: { c: 0x8a2a18, e: 0xff6a30 },
        cyNeonA:   { c: 0x1e1408, e: 0xffa62e },
        cyNeonM:   { c: 0x1a0c14, e: 0xff3d8f },
        cyTail:    { c: 0x3a0c0a, e: 0xff2a18 },
        cyNeonC:   { c: 0x0a1a20, e: 0x2fe8ff },
        cyLampGlow:{ c: 0x1a1508, e: 0xffc46a },
        cyBulb:    { c: 0x1a1408, e: 0xffcf88 }
      },
      light: {
        sun:  { color: 0x9aa6ff, i: 1.00, pos: [-12.0, 15.0, 9.0] },
        fill: { color: 0xff6a9f, i: 0.50, pos: [12.0, 4.5, 9.0] },
        hemi: { sky: 0x44447e, ground: 0x171020, i: 1.05 },
        amb:  { color: 0x3b4276, i: 0.52 }
      },
      veg: { willows: [], bamboo: [], pots: [] },
      cam: { theta: 0.62, phi: 1.02, dist: 27.8, target: [0.55, 3.30, 0.35] }
    },

    /* ---------------------------------------------------------
       霓虹 · 日本街（赛博朋克城，六街区 + 天桥 + 市场）
       --------------------------------------------------------- */
    city: {
      id: 'city',
      title: '霓虹 · 日本街',
      city: true,
      sky: ['#2a2350', '#1b1736', '#0c0a1c', '#04030a'],
      vig: 'rgba(2,1,8,0.70)',
      distMax: 200,
      targetR: 36,
      shadowSpan: 40,
      shadowFar: 170,
      palette: {
        /* 展台 / 路面。沥青不能压太暗 —— 俯视角下街面几乎是唯一
           能读出「这里有一座城」的负空间，太黑就和展台融成一片。 */
        ctRock: 0x22222c, ctRock2: 0x2c2c38,
        ctRoad: 0x4a4a5a, ctRoad2: 0x555566, ctRoad3: 0x3e3e4c,
        ctWalk: 0x52525e, ctWalk2: 0x5e5e6c, ctCurb: 0x6a6a78,
        ctPaint: 0xb9c2d2, ctPlate: 0x464652,

        /* 楼体：五个色相各差一点，一排楼才不会是一块灰。
           刻意分成「暖褐 / 蓝紫 / 青灰 / 紫红 / 墨绿」五路，
           这样整片楼群在紫调天空下也有冷暖对撞。 */
        ctT1: 0x5a4462, ctT2: 0x4a5078, ctT3: 0x4e4640,
        ctT4: 0x3f6270, ctT5: 0x465a4e,
        ctPodium: 0x5c4a5e, ctPodium2: 0x474050,

        /* 金属 / 混凝土 / 玻璃 */
        ctSteel: 0x6c7084, ctSteelD: 0x44464f,
        ctConcrete: 0x595b6c, ctConcrete2: 0x4a4b58,
        ctGlassB: 0x3e6a8e, ctGlassT: 0x2a4260,
        ctPorc: 0xc8ccd6, ctCable: 0x1c1e26,
        ctTank: 0x585e6a, ctTankD: 0x3c424c, ctPipe: 0x565a64,

        /* 木作 / 布 / 杂货 */
        ctWood: 0x6e563c, ctWoodD: 0x453324, ctCream: 0xd8cfba,
        ctTile: 0x44434f, ctRoof: 0x383744,
        ctRed: 0xc04a38, ctRedD: 0x8a3024,
        ctCloth1: 0x3a5480, ctCloth2: 0x8a3a4a,
        ctAwning: 0x864054, ctAwning2: 0x5e2c38,
        /* 市场棚布：五种高饱和色，靠密度和色相对比抢眼 */
        ctAwn1: 0xb84f66, ctAwn2: 0xcc8a2c, ctAwn3: 0x2e9a86,
        ctAwn4: 0x3a6cb8, ctAwn5: 0xd2c8a6, ctAwn6: 0x9a4ec0,
        /* 市集木作 / 泡沫鱼箱 / 遮阳伞 */
        ctCrate3: 0x7a6242, ctFoam: 0xdfe2dc, ctUmb: 0xc84a58, ctUmb2: 0x3f8ea8,
        /* 人物：上衣四色 + 裤 + 肤 */
        ctPedA: 0x4a5872, ctPedB: 0xa85c6a, ctPedC: 0x6c7c60, ctPedD: 0xc0a882,
        ctPedP: 0x24262e, ctPedS: 0xc0a084,
        ctSWall: 0x14141c,
        ctShutter: 0x4e5260, ctSignBox: 0x24242c,
        ctCrate: 0x5e4a36, ctCrate2: 0x4a6e5a,
        ctTrash: 0x2a2c34, ctPlant: 0x4e6e48,
        ctStone: 0x5e5e6c, ctStoneD: 0x474751,
        ctCone: 0xd8603a, ctConeW: 0xe0ded6,

        /* 车 */
        ctBody: 0x4e88a6, ctBody2: 0x3e6c86,
        ctBody3: 0x86485e, ctBody4: 0xa8843a, ctTire: 0x22232a,

        /* 灯：这些键都在 emit 里被覆盖成自发光，这里只给底色 */
        ctLampHead: 0x33363d, ctVendBody: 0x2a2e38,
        ctWinW: 0x3a2a18, ctWinC: 0x18242e, ctShopW: 0x2a2620,
        ctLampGlow: 0x1a1508, ctBulb: 0x1a1408,
        ctTail: 0x3a0c0a, ctHead: 0x2a2a1a,
        ctNeonM: 0x1a0c14, ctNeonC: 0x0a1a20, ctVendIn: 0x102030,
        ctNeonMd: 0x1a1c24, ctNeonCd: 0x161c24
      },
      emit: {
        ctWinW:    { c: 0x3a2a18, e: 0xffb867 },
        ctWinC:    { c: 0x18242e, e: 0x7fc4e6 },
        ctShopW:   { c: 0x2a2620, e: 0xfff1d2 },
        ctLampGlow:{ c: 0x1a1508, e: 0xffc46a },
        ctBulb:    { c: 0x1a1408, e: 0xffcf88 },
        ctTail:    { c: 0x3a0c0a, e: 0xff2a18 },
        ctHead:    { c: 0x2a2a1a, e: 0xfff6d8 },
        ctNeonM:   { c: 0x1a0c14, e: 0xff2d7a },
        ctNeonC:   { c: 0x0a1a20, e: 0x22e6ff },
        ctVendIn:  { c: 0x102030, e: 0xcfeaff },
        ctNeonMd: { c: 0x1a1c24, e: 0x8a1e42 },
        ctNeonCd: { c: 0x161c24, e: 0x146876 },
        ctCrate3:  { c: 0x2a2218, e: 0x8a6a3c },
        ctFoam:    { c: 0x3a3e3a, e: 0xb8c4bc },
        /* 市场棚布：透光的布，被底下灯泡照得整块发亮。这是全城唯一
           一处「大面积高饱和平色」，市场能不能成为视觉焦点全看这条。 */
        ctAwn1: { c: 0x8e3c50, e: 0x9c3a52 },
        ctAwn2: { c: 0x9a6820, e: 0xa87422 },
        ctAwn3: { c: 0x22786a, e: 0x1e8a78 },
        ctAwn4: { c: 0x2a5288, e: 0x2c6098 },
        ctAwn5: { c: 0x9a9478, e: 0xa8a084 },
        ctAwn6: { c: 0x74408e, e: 0x8048a0 },
        /* 天桥里的车：玻璃管内部本来就暗，普通 toon 车身全糊成黑的。 */
        ctBodyL:  { c: 0x2a4a5e, e: 0x4c8aa8 },
        ctBodyL2: { c: 0x5a4a20, e: 0xa8863a }
      },
      fog: { color: 0x1c1734, near: 92.0, far: 400.0 },
      light: {
        sun:  { color: 0x93a0ff, i: 1.15, pos: [26.0, 46.0, 24.0] },
        fill: { color: 0xff5a8a, i: 0.95, pos: [-30.0, 12.0, -26.0] },
        hemi: { sky: 0x4a4a88, ground: 0x241726, i: 1.55 },
        amb:  { color: 0x3a3c78, i: 0.80 }
      },
      veg: { willows: [], bamboo: [], pots: [] },
      cam: { theta: 0.90, phi: 1.14, dist: 163.0, target: [2.0, 24.0, -1.0] }
    }

  };
});
