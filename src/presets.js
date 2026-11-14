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
      distMax: 340,
      targetR: 80,
      camFar: 1000,
      shadowSpan: 78,
      shadowFar: 320,
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
        /* 造型塔专用：塔冠金属要比楼体亮一档，俯视时轮廓才跳得出来；
           竖鳍是最亮的一路金属，用来在方盒上划出斜线。 */
        ctCrown: 0x7c6a88, ctFin: 0x8a90a6,

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
        ctNeonMd: 0x1a1c24, ctNeonCd: 0x161c24,

        /* ---- 外环水系：驳岸 / 桥 / 单轨 ---- */
        ctQuay: 0x3c4254, ctQuayD: 0x565d70, ctBol: 0x2e3340,
        ctDeck2: 0x4b5060, ctArch: 0x7c8296, ctCable2: 0x9aa6bc,
        ctFloat: 0x6b5540, ctPier: 0x3e4452,
        ctMono: 0x5a6074, ctMonoD: 0x41465a, ctRail: 0x8a90a0,
        ctCrane: 0x8a7048, ctFarm: 0x3e5a48,
        ctFerris: 0x9aa6c0, ctTrain: 0x4a5c78, ctBoat: 0x3a4658,
        /* 集装箱：五种高饱和，港区能不能读成「港」全看这排色块 */
        ctCont1: 0xb84f4f, ctCont2: 0x3a7ea8, ctCont3: 0x4e9a6e,
        ctCont4: 0xc8a24a, ctCont5: 0x8a5aa8
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
        ctBodyL2: { c: 0x5a4a20, e: 0xa8863a },
        /* 造型塔：玻璃核心筒必须自发光，否则骨架塔中间是一个黑洞；
           环形窗带分冷/暖两路，圆柱塔才不会读成一根均匀灯管。 */
        ctCore:   { c: 0x142a3e, e: 0x2e6c92 },
        ctBandW:  { c: 0x182634, e: 0x4f9ac4 },
        ctBandA:  { c: 0x2a2014, e: 0xc08a4a },
        /* ---- 外环自发光 ---- */
        ctQuayL:    { c: 0x102028, e: 0x2a8ea8 },
        ctWaterRip: { c: 0x0a1a2c, e: 0x4a9ad0 },
        ctLantern:  { c: 0x3a1e10, e: 0xffa050 },
        ctTorii:    { c: 0x6a1e1e, e: 0xd83a32 },
        ctFarmG:    { c: 0x143a24, e: 0x4ce884 },
        ctFerrisC:  { c: 0x2a1a30, e: 0xff5aa8 },
        ctTrainW:   { c: 0x16283a, e: 0x9fe0ff },
        ctBoatC:    { c: 0x1a2a38, e: 0x6fc4e0 }
      },
      fog: { color: 0x1c1734, near: 130.0, far: 520.0 },
      light: {
        sun:  { color: 0x93a0ff, i: 1.15, pos: [26.0, 46.0, 24.0] },
        fill: { color: 0xff5a8a, i: 0.95, pos: [-30.0, 12.0, -26.0] },
        hemi: { sky: 0x4a4a88, ground: 0x241726, i: 1.55 },
        amb:  { color: 0x3a3c78, i: 0.80 }
      },
      veg: { willows: [], bamboo: [], pots: [] },
      cam: { theta: 0.90, phi: 1.06, dist: 232.0, target: [3.0, 13.0, 3.0] }
    },

    /* ---------------------------------------------------------
       肯德基 · 得来速店（快餐店形制）
       红白招牌 + 剖开的前半屋顶（室内全可见）+ 户外座位 + 得来速车道
       --------------------------------------------------------- */
    kfc: {
      id: 'kfc',
      title: '肯德基 · 得来速店',
      kfc: true,
      kfcName: 'KFC',
      asset: 'src/kfc_assets.js',
      emis: 1.0,
      lampK: 1.0,
      sky: ['#fdfaf2', '#f1ede2', '#d9e0e3', '#c2cdd2'],
      vig: 'rgba(34,46,52,0.20)',
      distMax: 90,
      targetR: 20,
      shadowSpan: 18,
      shadowFar: 90,
      palette: {
        /* 展台 / 场地 */
        kfBase: 0x4c5157, kfBase2: 0x3b4045,
        kfAsphalt: 0x56595d, kfLane: 0x484c52,
        kfLine: 0xe8e5d8, kfLineY: 0xdcb23c,
        kfWalk: 0xc0beb2, kfWalk2: 0xaeaca2, kfCurb: 0xc8c6ba,
        kfGrass: 0x6d844e, kfGrass2: 0x5b7139,
        kfLeaf1: 0x7d9c50, kfLeaf2: 0x5f7c3c, kfLeaf3: 0x97b064, kfBark: 0x6a5742,
        /* 品牌三色：红是唯一重色，白与米白负责留出呼吸 */
        kfRed: 0xc8102e, kfRedD: 0x9c0d24,
        kfWhite: 0xfaf8f2, kfCream: 0xf0ece0,
        kfWall: 0xf1eee5, kfWallD: 0xdcd8cc,
        kfTrim: 0x3a4048, kfTrimD: 0x262b31,
        kfRoof: 0x9a9d9a,
        /* 室内 */
        kfFloorIn: 0xc9c5b8, kfFloorLine: 0xb0aca0,
        kfCeil: 0xf0efe9, kfBeam: 0x8a8d90, kfTube: 0xffffff,
        kfCounter: 0xc8102e, kfCounterTop: 0xe8e3d6,
        kfMenuW: 0x2f4a58, kfScreen: 0x243746, kfSignBox: 0xc8102e,
        kfLamp: 0xfff2d0,
        /* 后厨不锈钢与食物 */
        kfSteel: 0xb8bec2, kfSteelD: 0x7e858a,
        kfMetal: 0xb0b6ba, kfMetalD: 0x6e757a,
        kfFryer: 0x596066, kfOil: 0xc89530, kfWarm: 0xffc970,
        kfChicken: 0xd99a3c, kfChickenD: 0xa9662c,
        kfBucket: 0xc8102e, kfCup: 0xe8e2d4, kfCupL: 0xffffff,
        kfFries: 0xe8b83c, kfBun: 0xd9a860,
        /* 家具 / 儿童区 */
        kfTable: 0xd8cbb0, kfTableD: 0xa89472,
        kfSeat: 0xc8102e, kfSeatD: 0x3f6a86, kfBooth: 0x8a5c42,
        kfPlay1: 0xe8b83c, kfPlay2: 0x3aa0c8, kfPlay3: 0x63b46a,
        /* 人 / 车 */
        kfPedA: 0x4a5872, kfPedB: 0xa85c6a, kfPedC: 0x6c7c60, kfPedD: 0xc0a882,
        kfPedP: 0x24262e, kfPedS: 0xc0a084,
        /* 人物 v2：肤色 / 发色 / 鞋 / 五官 / 围裙 / 手提袋 */
        kfSkin1: 0xf3cba8, kfSkin2: 0xd8a274, kfSkin3: 0xa9744d,
        kfHair1: 0x2b2522, kfHair2: 0x6a4630, kfHair3: 0xa8834f, kfHair4: 0x4a4a52,
        kfShoe: 0x2b2c32, kfEye: 0x2a2522, kfApron: 0xf6f2e7, kfBag: 0xd9b25c,
        kfCarA: 0xd8d3c8, kfCarB: 0x4c6c7c, kfCarC: 0xb8503c,
        kfCarGlass: 0x5d7480, kfTire: 0x35353a
      },
      emit: {
        /* 玻璃外面是强光，室内不给底光会被压成灰黑；
           e 取很低的值，只是防死黑，不是提亮 */
        kfTube:     { c: 0xffffff, e: 0xffffff },
        kfCeil:     { c: 0xf0efe9, e: 0x2a2a26 },
        kfFloorIn:  { c: 0xc9c5b8, e: 0x141418 },
        kfMenuW:    { c: 0x2f4a58, e: 0x2a4c60 },
        kfScreen:   { c: 0x243746, e: 0x24485c },
        kfSignBox:  { c: 0xc8102e, e: 0x40101a },
        kfLamp:     { c: 0xfff2d0, e: 0xfff0c8 },
        kfCounter:  { c: 0xc8102e, e: 0x220408 },
        kfSteel:    { c: 0xb8bec2, e: 0x1e2224 },
        kfTable:    { c: 0xd8cbb0, e: 0x1c1a16 },
        kfSeat:     { c: 0xc8102e, e: 0x1c0408 },
        kfCupL:     { c: 0xffffff, e: 0x303030 },
        kfWarm:     { c: 0xffc970, e: 0x60401a },
        kfCarGlass: { c: 0x5d7480, e: 0x101820 }
      },
      light: {
        sun:  { color: 0xffeed0, i: 2.00, pos: [16.0, 18.5, 13.0] },
        fill: { color: 0x9ec0d8, i: 0.60, pos: [-13, 9, -12] },
        hemi: { sky: 0xc0d9e7, ground: 0xd8d2c2, i: 0.90 },
        amb:  { color: 0x9bb0bc, i: 0.30 }
      },
      veg: { willows: [], bamboo: [], pots: [] },
      cam: { theta: 0.62, phi: 0.98, dist: 32.0, target: [0.0, 1.70, 0.60] }
    },

    /* ---------------------------------------------------------
       寒江雪 · 孤舟独钓（rainlake 形制）
       柳宗元《江雪》：千山鸟飞绝，万径人踪灭。
       88×64 米江面几乎不留岸，六层递远覆雪山脊，人踪只剩远角一座
       将没入雪雾的小亭与三株枯树，一叶孤舟是全画面唯一浓墨。
       「寒」靠留白 + 低饱和冷灰，不靠把灯调暗。
       --------------------------------------------------------- */
    rainlake: {
      id: 'rainlake',
      title: '寒江雪 · 孤舟独钓',
      rainlake: true,
      emis: 0.92,
      lampK: 0.85,
      sky: ['#f6f9fa', '#e8eff1', '#d5e0e3', '#bccbd0'],
      vig: 'rgba(52,68,74,0.14)',
      distMax: 340,
      targetR: 130,
      shadowSpan: 76,
      shadowFar: 340,
      camFar: 1200,
      fog: { color: 0xdde6e8, near: 46.0, far: 250.0 },
      rlSnowN: 900,
      rlSnowOp: 0.40,
      rlWater: {
        deep: [0.660, 0.722, 0.742],
        shal: [0.806, 0.852, 0.864],
        hi: [0.925, 0.945, 0.945],
        fog: [0.802, 0.845, 0.854]
      },
      palette: {
        /* 底座：淡墨压边，避免 88 米大盘出现黑框 */
        rlBase: 0xbcc9cb, rlBaseD: 0xa9b8ba, rlBaseL: 0xd2dcdd,
        /* 千山六层：越远越淡，最远一层几乎与雪天同色 */
        rlMtn1: 0x5f757b, rlMtn2: 0x879da2, rlMtn3: 0xafbfc3,
        rlMtn4: 0xc8d6d9, rlMtn5: 0xd8e2e4, rlMtnL: 0xe6eeef,
        rlSnow: 0xf2f7f7, rlSnowD: 0xdde7e8, rlInk: 0x2c3436,
        rlPine: 0x4a6660,
        /* 远岸 / 石板 / 礁石 */
        rlBank: 0x9aa8ab, rlBankD: 0x9dacae,
        rlPave: 0xaab7b9, rlPaveD: 0x92a1a4, rlPaveW: 0xcbd7d8,
        rlStone: 0x8e9b9e, rlStoneD: 0x647276, rlStoneL: 0xa8b5b7,
        /* 远处小亭：木作压到近乎剪影，顶覆雪 */
        rlWood: 0x6c7b7e, rlWoodD: 0x465356, rlWoodL: 0x87969a,
        rlPillar: 0x4d5b5e, rlTile: 0x6a7a7e, rlTileD: 0x4b5a5e,
        rlTileL: 0x85959a, rlBrass: 0x9aa6a8,
        /* 孤舟与蓑笠翁：浓墨 + 唯一一点暖褐蓑衣 */
        rlBoat: 0x606b6d, rlBoatD: 0x2e383a, rlBoatL: 0x242c2e,
        rlStraw: 0x7d6b4c, rlStrawD: 0x4d4331,
        rlCanopy: 0x4d5a58, rlCanopyR: 0xb9c6bd,
        rlSkin: 0xd8b492, rlCloth: 0x4e5a5c,
        rlRod: 0x7b8789, rlBasket: 0xa4854e,
        /* 旧形制遗留键：保留以防材质 fallback 成洋红 */
        rlLeaf: 0x6f8a5e, rlLeafD: 0x5b7650, rlWillowW: 0x769265,
        rlBark: 0x615345, rlReed: 0x7f9266, rlReedD: 0xa8a071,
        rlPad: 0x5d8068, rlPadD: 0x7f9c7e,
        rlBloom: 0xd9a6ad, rlBloomD: 0xe8d09a,
        rlLamp: 0xffd9a2, rlSail: 0xd7e0dc
      },
      emit: {
        /* 雪要真的白：自发光只用来防死黑，不用来提亮整体 */
        rlSnow:   { c: 0xe9f1f2, e: 0x2a3436 },
        rlSnowD:  { c: 0xe6eeef, e: 0x1e282a },
        rlLamp:   { c: 0xffd9a2, e: 0x6a4520 },
        rlSail:   { c: 0xd7e0dc, e: 0x20282a },
        rlPaveW:  { c: 0xc3cdc6, e: 0x151c1c }
      },
      light: {
        sun:  { color: 0xf2f7f8, i: 0.88, pos: [26.0, 38.0, 22.0] },
        fill: { color: 0xb8cbd0, i: 0.46, pos: [-24, 18, -20] },
        hemi: { sky: 0xeaf1f2, ground: 0x8e9c9e, i: 1.26 },
        amb:  { color: 0xcbd8da, i: 0.32 }
      },
      veg: { willows: [], bamboo: [], pots: [] },
      /* 立轴式三段构图：theta≈1.50 正对 -z 群山，近水平俯角，
         孤舟在近景偏左，右侧大片留白。theta=0 会变成从 +x 侧看，
         横贯的群山会被拧成右侧一条斜带 —— 别再改回去。 */
      cam: { theta: 1.50, phi: 1.32, dist: 70.0, target: [0.0, 3.0, -2.0] }
    },

    /* ---------------------------------------------------------
       千灯 · 上元灯会（第 13 套）
       与寒江雪相反：极闹 / 满铺 / 万点暖光。暮色远山 + 落日在天，
       临水灯街在中，寒河与河灯在下，石拱桥斜跨、人潮只作单色剪影。
       三类 GPU 粒子：花灯辉光呼吸 / 河灯顺流 / 孔明灯升空。
       --------------------------------------------------------- */
    lantern: {
      id: 'lantern',
      title: '千灯 · 上元灯会',
      lantern: true,
      emis: 1.15,
      lampK: 1.0,
      /* 暮色四段：中心暖橙落日，外缘靛蓝夜幕 */
      sky: ['#ffd9a0', '#e8a274', '#8a637e', '#2b2b4c'],
      vig: 'rgba(28,20,42,0.38)',
      distMax: 220,
      targetR: 90,
      shadowSpan: 52,
      shadowFar: 200,
      camFar: 700,
      fog: { color: 0x6a5064, near: 42.0, far: 185.0 },
      lnRiverN: 190,
      lnSkyN: 108,
      lnWater: {
        deep: [0.105, 0.118, 0.215],
        shal: [0.190, 0.190, 0.275],
        glow: [1.000, 0.610, 0.270],
        fog:  [0.290, 0.250, 0.330]
      },
      palette: {
        /* 漆盘底座与岸台：暗赭而不是纯黑，别出现托盘黑框 */
        lnBase: 0x5a4a4e, lnBaseD: 0x453a52, lnBaseL: 0x6b5458,
        lnQuay: 0x6a5850, lnQuayD: 0x453b3c,
        lnPave: 0x8a7566, lnPaveD: 0x766254,
        lnStone: 0x8d7d72, lnStoneD: 0x574c48, lnStoneL: 0xa39383,
        /* 远山：近深远淡，靛紫剪影 */
        lnMtn1: 0x423c56, lnMtn2: 0x574c66, lnMtn3: 0x6f5d74,
        /* 临水楼阁 */
        lnWall: 0xb59a83, lnWallD: 0x967c6c,
        lnWood: 0x7a4a34, lnWoodD: 0x552f24, lnWoodDeep: 0x3d241e,
        lnPillar: 0x8c3a2c, lnRail: 0x7c4a32, lnDoor: 0x38251f,
        lnTile: 0x39404f, lnTileD: 0x272c39, lnTileL: 0x4e5566,
        /* 灯 */
        lnLanternD: 0x7a2a1c, lnTassel: 0xd8a03c, lnCord: 0x3a2a26,
        /* 牌楼 / 桥 / 人 / 树 / 船 */
        lnGate: 0x9b3a2c, lnGateD: 0x6d2a20,
        lnBridge: 0x8b7d70, lnBridgeD: 0x5f564f,
        lnFigure: 0x413343, lnFigureD: 0x5b4552,
        lnTree: 0x3b4438, lnTreeD: 0x2f3830, lnBark: 0x4a3830,
        lnBoat: 0x6a4433, lnBoatD: 0x452c24,
        /* 灯市棚布：暖红 / 赭橙 / 米白，只此三色，第四色整条街就散了 */
        lnStall1: 0xa8442e, lnStall2: 0xc47a3a, lnStall3: 0xd8b78a
      },
      emit: {
        /* 灯会的辨识度全部来自自发光：三色灯 + 两色窗，漏一个就是死黑 */
        lnLantern:  { c: 0xe8572c, e: 0xa83a12 },
        lnLanternY: { c: 0xffc257, e: 0xb06a18 },
        lnLanternW: { c: 0xffe6b4, e: 0xc08a48 },
        lnLanternD: { c: 0x7a2a1c, e: 0x1e0804 },
        lnWin:      { c: 0xffb45e, e: 0x8c4a16 },
        lnWinW:     { c: 0xffd08a, e: 0xa05e20 },
        lnTassel:   { c: 0xd8a03c, e: 0x3a2008 },
        /* 灯市棚布要透光，否则暮色里是一排暗瓦片 */
        lnStall1:   { c: 0xa8442e, e: 0x3a1008 },
        lnStall2:   { c: 0xc47a3a, e: 0x3a2008 },
        lnStall3:   { c: 0xd8b78a, e: 0x3a2810 }
      },
      light: {
        /* 黄昏强光比：主光从落日方向低角度逆打，补光给冷紫，别把暗部抬平 */
        sun:  { color: 0xffb070, i: 1.18, pos: [-22.0, 18.0, -12.0] },
        fill: { color: 0x7a86b8, i: 0.55, pos: [18.0, 12.0, 20.0] },
        hemi: { sky: 0x8f8fae, ground: 0x6b4a40, i: 0.95 },
        amb:  { color: 0x8a7a90, i: 0.30 }
      },
      veg: { willows: [], bamboo: [], pots: [] },
      /* theta≈1.50 正对 -z 的灯街与远山；phi 1.26 近水平，
         让天—街—河三段都进画框。theta=0 会把横贯的街拧成右侧斜带。 */
      cam: { theta: 1.50, phi: 1.24, dist: 62.0, target: [0.0, 4.8, -1.0] }
    }
,
    /* ---------------------------------------------------------
       废墟 · 春回（第 14 套）
       半塌的两层水泥小屋，树从楼板缺口里长出来。
       冷灰混凝土 / 新绿 / 一点粉花，春日侧逆光 + 花瓣与尘埃。
       主角不是房子，是「没有人之后，春天照样来了」。
       --------------------------------------------------------- */
    ruin: {
      id: 'ruin',
      title: '废墟 · 春回',
      ruin: true,
      emis: 1.0,
      lampK: 1.0,
      /* 春日清晨：天光偏青绿，地平线一层暖白 */
      sky: ['#f8f9ee', '#e8f0e1', '#cfe0d7', '#b4cbc5'],
      vig: 'rgba(40,52,44,0.20)',
      distMax: 160,
      targetR: 44,
      shadowSpan: 32,
      shadowFar: 140,
      camFar: 620,
      fog: { color: 0xc9dcd3, near: 44.0, far: 190.0 },
      rwPetalN: 150,
      palette: {
        /* 展台与土：冷灰的混凝土，暖褐的土，别调成同一色 */
        rwBase: 0x70766c, rwBaseD: 0x555b52, rwBaseL: 0x878d81,
        rwEarth: 0x6f5f49, rwEarthD: 0x4e4436,
        /* 草地三阶：嫩绿 / 深绿 / 受光 */
        rwGrass: 0x7f9b56, rwGrassD: 0x607a41, rwGrassL: 0x9cb972,
        rwGrassY: 0x9b9a5c,
        /* 混凝土四阶：废墟的主色，必须冷、必须脏 */
        rwCon: 0xadae9f, rwConD: 0x8b8d80, rwConL: 0xc5c5b4, rwConW: 0xd8d6c4,
        rwPath: 0xb5ae97, rwStone: 0x9b9c8e,
        rwRubble: 0x9fa093, rwRubbleD: 0x7e8074, rwBrick: 0xa26b50,
        /* 墙上残存的抹灰：比混凝土更白，和脏墙形成两块面 */
        rwPatchL: 0xd2cfba, rwPatchD: 0x8f9184,
        /* 苔藓与藤：整场最暗的绿，压住画面下缘 */
        rwMoss: 0x5c7a43, rwMossL: 0x78975a,
        rwVine: 0x557b41, rwVineD: 0x3f6030,
        /* 锈：唯一偏暖的暗色，用来点断口 */
        rwRebar: 0x8c5a3e, rwRust: 0x7d4a34,
        /* 树与花 */
        rwBark: 0x6a5540, rwBarkD: 0x4c3d2e,
        /* 叶体偏中间调，叶簇一深一亮，树冠才有层次 */
        rwLeaf1: 0x6a8e4c, rwLeaf1T: 0x7ba05a, rwLeaf2: 0x4d7337, rwLeaf3: 0x93b56b,
        rwBlossom: 0xf4c8d4, rwBlossomD: 0xe3a6b8,
        rwFlowerW: 0xf7f2e2, rwFlowerY: 0xf2cf5c, rwFlowerP: 0xe2a8c6,
        rwFlowerV: 0xa9a2d8, rwFlowerC: 0xe6b64a,
        rwBush: 0x64884a, rwBushD: 0x4a6a37,
        /* 落叶：两种旧了的黄褐，铺在树底下 */
        rwLitter: 0x8e7a48, rwLitterD: 0x6b5b38,
        /* 旧木与铁：椅子和门 */
        rwWood: 0x8a6a4a, rwWoodD: 0x5d4733, rwMetal: 0x6f766f,
        /* 远景丘陵：越远越淡，最后融进雾 */
        rwHill1: 0x86a086, rwHill2: 0xa3b8a2, rwHill3: 0xbfcfc2
      },
      light: {
        /* 侧逆光：太阳在相机右后上方，光柱从楼板缺口斜插进屋里 */
        sun:  { color: 0xffecc4, i: 2.20, pos: [17.0, 25.0, 15.0] },
        fill: { color: 0x9dc6dc, i: 0.58, pos: [-16.0, 10.0, -14.0] },
        hemi: { sky: 0xe4f0e8, ground: 0x93a06e, i: 1.05 },
        amb:  { color: 0x9db2ab, i: 0.24 }
      },
      veg: { willows: [], bamboo: [], pots: [] },
      cam: { theta: 0.80, phi: 1.11, dist: 28.0, target: [0.4, 3.90, -0.3] }
    },
    /* ---------------------------------------------------------
       城市剖面（第 15 套）
       一块被竖直切开的地籍块：地下土层层理 + 地铁 / 街道 / 六层楼剖面。
       主角是那两道切面 —— 一座城市在同一秒的六种生活并排摊开。
       冷灰混凝土 + 每层不同的室内色温，下午侧光把切面照亮。
       --------------------------------------------------------- */
    section: {
      id: 'section',
      title: '城市剖面',
      section: true,
      emis: 1.0,
      lampK: 1.0,
      sky: ['#e6eff7', '#cfe0ee', '#b0c8dd', '#94b0c6'],
      vig: 'rgba(28,38,48,0.20)',
      distMax: 150,
      targetR: 46,
      shadowSpan: 42,
      shadowFar: 150,
      camFar: 700,
      fog: { color: 0xcfd8dc, near: 72.0, far: 230.0 },
      palette: {
        /* 地面与土：路面的冷灰，土的四层由暖到冷 */
        scAsphalt: 0x4c5057, scAsphaltD: 0x3d4147,
        scWalk: 0x9d9a92, scCurb: 0xb8b5ab,
        scPaving: 0xa8a49a, scPavingD: 0x8e8a80,
        scBase: 0x74766f,
        scSoil1: 0x7a6247, scSoil2: 0x6a5540, scSoil3: 0x5a4838, scRock: 0x555b60,
        scStone: 0x8b8d88, scStoneD: 0x6f726e, scStoneP: 0xb9b9b0, scStoneW: 0xc0beb2,
        /* 管线三色：水蓝 / 气黄 / 电灰 */
        scPipeA: 0x3f6f8c, scPipeB: 0xc9a13b, scPipeC: 0x7d838a,
        /* 标线 */
        scPaintW: 0xf2f0e8, scPaintR: 0xc4473c, scPaintY: 0xe3b93c,
        /* 隧道与列车 */
        scBallast: 0x6e6a63, scSleeper: 0x6b5b4a,
        scRail: 0xb9bcc0, scRailD: 0x6d7176,
        scTrain: 0xdfe3e6, scTrainD: 0x8f979e, scTrainStr: 0x2f6fa8,
        scPlatform: 0x9a9c98, scTunnelDark: 0x14181c,
        /* 混凝土：整场主色，要冷、要脏 */
        scCon: 0xb9b7ae, scConD: 0x9b9a92, scConL: 0xcdcbc1, scCut: 0x8f8f86,
        scConW: 0xdcdad0,
        scCeil: 0xe6e4da, scSkirt: 0x7c7b74,
        /* 金属与木 */
        scMetal: 0x8d939a, scMetalD: 0x5f666d, scMetalL: 0xb9bec3,
        scWood: 0x9a7148, scWoodD: 0x6d4f33, scWoodL: 0xb98d5f,
        scBark: 0x6b5540, scBarkD: 0x4d3d2c,
        scLeaf1: 0x6f9b52, scLeaf2: 0x527a3d, scLeaf3: 0x8cb96a,
        /* 屋顶设备 */
        scTank: 0x9fa8ad, scTankD: 0x7d868c,
        scElev: 0xb8452f, scElevD: 0x8d3324,
        /* 每层地面：便利店的浅灰砖、办公的米色、健身的深胶、住宅的木 */
        scFl0: 0xa8a196, scFl1: 0xa8a191, scFl2: 0x777d78,
        scFl3: 0xb08a5c, scFl4: 0xa8815a, scFl5: 0x8f8578,
        /* 货架与商品 */
        scShelf: 0xb6b3a8, scShelfD: 0x8e8b81,
        scGoodsA: 0xd8552f, scGoodsB: 0x2f7fb8, scGoodsC: 0xe0a92e,
        scFridge: 0xcfd6d8, scGlass: 0x8fb6c4, scGlassW: 0xfff3d4,
        scCounter: 0xa88a5f, scCounterD: 0x7d6444,
        scStool: 0x7a4a3a, scRug: 0x8f6a52, scRug2: 0x6d7f8a,
        /* 办公 */
        scDesk: 0xc0b49c, scChair: 0x4a5058,
        scBoard: 0xf0efe6, scBoardD: 0x8a8b84,
        scPot: 0xb06a48, scLampShade: 0xf0e2b8,
        /* 健身 */
        scGym: 0x3f444b, scGymD: 0x2b3036, scMirror: 0xbfd6dc,
        scMatG: 0x3d5a52, scBag: 0x8a3b32,
        /* 客厅与卧室 */
        scSofa: 0x6d7f76, scSofaD: 0x55665e, scCushion: 0xd8c28a,
        scBookA: 0xb04a3a, scBookB: 0x3f6f8a, scBookC: 0xd8c06a,
        scBedBase: 0x8a6a4a, scBed: 0xe6e0d0, scQuilt: 0x7f93a8,
        scPillow: 0xf2ece0, scWardrobe: 0x9a7a56, scWardrobeD: 0x775c40,
        /* 工作室 */
        scPaper: 0xe8e4d4, scModelBase: 0xb0aa98, scModel: 0xd8d2c0,
        scCanvas: 0xf0ead8,
        /* 花店 */
        scFlA: 0xe07a8a, scFlB: 0xe8c04a, scFlC: 0xb07ac8, scFlD: 0xf0eee0,
        scBucket: 0x7d848a, scSignA: 0x2f6b52, scSignB: 0x2f5d8a,
        scShed: 0x6f7a72, scShedD: 0x535d57, scCarton: 0xb08e62,
        scTire: 0x2b2b2e, scBrickW: 0xc8c3b4,
        scCarA: 0xc9503e, scCarB: 0xdfe2e4, scCarC: 0x2f4f6b, scTail: 0xc0392b,
        scLocker: 0xd8c86a, scLockerD: 0x9a8f4a, scCabinet: 0xdad3c2,
        scArtF: 0x6d5a44, scArt1: 0xcf7a4a, scArt2: 0x4a7f9a, scArt3: 0xc8b05a,
        /* 一街三色：主楼冷灰、左楼旧砖、右店米白 */
        scBrickW2: 0xa8705c, scCream: 0xe0d8c4,
        scMenuBox: 0x3a3f46, scMenuLine: 0x7a6a52,
        scFridgeD: 0xb9c1c3, scRope: 0x8a8378,
        scClothA: 0xe6e0d0, scClothB: 0xa8c0d8, scClothC: 0xd8a8b0,
        /* 人物 */
        scHair: 0x2f2a26, scSkin1: 0xe8bd9a, scSkin2: 0xc98f66,
        scShirtA: 0x2f5d8a, scShirtB: 0x8a3f4f, scShirtC: 0x4a6b52,
        scShirtD: 0xb08a4a, scClothB: 0x3b4048
      },
      emit: {
        scNeonW:   { c: 0xfff8ea, e: 0xfff2d6 },
        scNeonC:   { c: 0xeaf6ff, e: 0xbfe6ff },
        scTrainWin:{ c: 0xfff0cc, e: 0xffe6b0 },
        scGlassW:  { c: 0xfffaf0, e: 0xfff3d4 }
      },
      light: {
        /* 下午的斜光从左后上方来，正好把朝 +z 的切面照亮 */
        sun:  { color: 0xffe6bc, i: 2.90, pos: [-19.0, 25.0, 21.0] },
        fill: { color: 0x9fbdd6, i: 0.44, pos: [14.0, 9.0, 10.0] },
        hemi: { sky: 0xd8e6f2, ground: 0x9a8f7a, i: 0.86 },
        amb:  { color: 0x9aa6b0, i: 0.22 }
      },
      veg: { willows: [], bamboo: [], pots: [] },
      cam: { theta: 1.20, phi: 1.245, dist: 51.0, target: [0.0, 7.45, -0.40] }
    },
    /* ---------------------------------------------------------
       桌面上的世界（第 16 套）
       深夜，一盏台灯。光圈里一本摊开的书，书页上是一座城：
       咖啡渍是它的湖，回形针是它的环线，笔筒里的笔是它的摩天楼。
       全场只有一个光源 —— 灯罩里的 SpotLight。光圈之外不是暗，是黑。
       --------------------------------------------------------- */
    desk: {
      id: 'desk',
      title: '桌面上的世界',
      desk: true,
      emis: 1.0,
      lampK: 1.0,
      sky: ['#07080a', '#080a0d', '#0a0c10', '#0b0e12'],
      vig: 'rgba(0,0,0,0.52)',
      distMax: 3.4,
      targetR: 0.46,
      shadowSpan: 0.90,
      shadowFar: 4.0,
      camFar: 40,
      palette: {
        /* 桌面：深胡桃木，光里才见红 */
        dkDesk: 0x4a3428, dkDeskD: 0x3b2a20, dkDeskL: 0x5a4032,
        /* 书：米白纸、深蓝封面、墨色文字 */
        dkPaper: 0xd9d0ba, dkPaperD: 0xbcb39c, dkCover: 0x27364b, dkInk: 0x6a6459,
        dkField: 0xc9c0ab,
        /* 咖啡：白瓷、深褐液面、浅褐渍 */
        dkSaucer: 0xe8e3d8, dkSaucerD: 0xcfc8ba,
        dkCup: 0xc8c1b0, dkCupD: 0xa8a294,
        dkCoffee: 0x3a2216, dkWater: 0x3a2112, dkShore: 0xd8c8a8,
        dkStain: 0x7a5636, dkStainD: 0x553a24,
        /* 金属与文具 */
        dkSteel: 0x9aa0a6, dkSteelD: 0x6b7178,
        dkPenA: 0x2f4f6b, dkPenB: 0xb0442f, dkPenC: 0x3f6b4a, dkPenD: 0xc9a13b,
        dkPenTip: 0x2a2c30, dkPenCap: 0x8d9298,
        dkEraser: 0xe4b7b0, dkEraserS: 0xe8e4d8,
        dkPencil: 0xd9a441, dkPencilTip: 0xd8c8a8, dkPencilLead: 0x2f3136,
        dkNote: 0xf2dd6a, dkNoteD: 0xd8c451,
        dkRuler: 0xcfe0e4, dkRulerM: 0x8fa4ac,
        dkClip: 0xc2c8ce,
        /* 台灯 */
        dkLampBase: 0x3c4046, dkLampBaseD: 0x2a2d32,
        dkLampArm: 0x4a4f56, dkLampJoint: 0x6b7178,
        dkShade: 0x2c554d, dkShadeD: 0x1e3b36, dkShadeIn: 0xfff0c8,
        dkBulb: 0xfff6dc,
        /* 城：沥青、屋面、六种楼、窗、树、车 */
        dkRoad: 0x4e4b46, dkRoof: 0x35332f, dkWin: 0x6f685c,
        dkBld1: 0xa89f8c, dkBld2: 0x9a5f4a, dkBld3: 0xc2b8a2,
        dkBld4: 0x7f7466, dkBld5: 0x7f94a0, dkBld6: 0x6e6458,
        dkDeck: 0xa8a094, dkQuay: 0xc4bba4, dkPlaza: 0xcabfa8, dkBoat: 0xe0d8c4, dkBoatD: 0x8e8472,
        dkTree: 0x6f9450, dkTreeD: 0x527a3b,
        dkCarA: 0xc9503e, dkCarB: 0xdfe2e4, dkCarC: 0x2f4f6b,
        dkGlass: 0x9fc0cc
      },
      emit: {
        dkShadeIn: { c: 0xfff4d8, e: 0xffe0a8 },
        dkBulb:    { c: 0xfffaf0, e: 0xfff0cc }
      },
      light: {
        /* 太阳只留一丝：它唯一的作用是让暗部不至于死黑，别抢灯 */
        sun:  { color: 0xffd9a0, i: 0.16, pos: [0.9, 2.4, 0.7] },
        fill: { color: 0x6f88a8, i: 0.16, pos: [-0.8, 0.7, -0.6] },
        hemi: { sky: 0x2a3340, ground: 0x1a1512, i: 0.22 },
        amb:  { color: 0x39414d, i: 0.16 }
      },
      veg: { willows: [], bamboo: [], pots: [] },
      cam: { theta: 0.88, phi: 1.012, dist: 1.09, target: [-0.03, 0.050, 0.02] }
    },

    /* ---------------------------------------------------------
       醉仙楼 · 三层酒肆（第 17 套）
       正立面的门窗全是真洞口，右山墙整面剖开，屋顶掀掉前坡：
       门里、窗里、剖口里，三层的堂食 / 雅座 / 雅阁都看得见。
       黄昏暖光，室内靠低强度宫灯与自发光背板提亮，不糊窗纸。
       --------------------------------------------------------- */
    tavern: {
      id: 'tavern',
      title: '醉仙楼 · 三层酒肆',
      tavern: true,
      emis: 1.0,
      lampK: 1.0,
      sky: ['#fbe9c8', '#f2cd9e', '#d99a7a', '#7e5f68'],
      vig: 'rgba(52,34,26,0.26)',
      shadowSpan: 12.0,
      shadowFar: 80,
      palette: {
        /* 展台与场院 */
        tvBaseD: 0x3b2c22, tvBase: 0x58412f,
        tvSoil: 0x7a6144, tvSoilD: 0x5d4a35,
        tvPave: 0xa8a294, tvPaveD: 0x8b877b, tvPaveL: 0xc0bbac,
        tvStone: 0xb3ad9e, tvStoneD: 0x847e70, tvStoneL: 0xcfc8b6,
        /* 墙与室内背板 */
        tvWall: 0xd8cdb4, tvWallD: 0xb4a992, tvWallIn: 0xc8b08a,
        tvFloor: 0x9a7042, tvFloorD: 0x8a6339, tvCeil: 0xc0a983,
        tvCut: 0x5e4229, tvDeck: 0x8a6238,
        /* 木构：朱柱 / 梁 / 斗拱青绿彩画 / 栏杆 / 门窗 */
        tvWoodD: 0x5a3a24, tvWoodL: 0xb98a55,
        tvPillar: 0xa63c2c, tvBeam: 0x7a4e2e,
        tvBracket: 0x3f6b60, tvBracketR: 0xb45a38,
        tvRail: 0x9a3c2a, tvLattice: 0x6b452a,
        tvDoor: 0x8b4f2c, tvDoorD: 0x51301c,
        /* 青灰瓦三阶 */
        tvTile: 0x4d5a60, tvTileD: 0x354047, tvTileL: 0x68777c,
        tvRidge: 0x30383d, tvEave: 0x6b4a30, tvFinial: 0x8a6a3a,
        tvGold: 0xd4ae5c, tvSignBox: 0x2b2018,
        /* 家具 */
        tvTable: 0xa57643, tvTableD: 0x6d4a2c,
        tvStool: 0x8a5c34, tvStoolD: 0x5d3d24,
        tvCounter: 0x8f5f34, tvCounterD: 0x6a4325,
        tvScreen: 0xd6c6a4, tvScreenD: 0x7a5a38,
        tvScroll: 0xeee2c6, tvInk: 0x3b332a, tvPaper: 0xe8ddc2,
        tvBrush: 0x4a3a2c, tvAbacus: 0x70492c,
        /* 酒器与吃食 */
        tvJar: 0x8a6a4c, tvJarD: 0x4a3828, tvJarL: 0xa88154,
        tvPot: 0x9fb8a6, tvPotD: 0x6d8a7e,
        tvCupW: 0xe4dcc6, tvDish: 0xd8cdb4,
        tvFood: 0xc05a38, tvFruit: 0xd9a13b, tvWater: 0x5f8a92,
        /* 灯火 */
        tvLantern: 0xd94a2c, tvTassel: 0xd8a63c, tvCandle: 0xffe6b0,
        tvRope: 0x6a5438,
        /* 人物：衣袍三色 + 肤色发色 */
        tvSkin: 0xe8bd9a, tvHair: 0x2e2823,
        tvRobeA: 0x4a6b78, tvRobeB: 0x9a4638, tvRobeC: 0x6f6a8c,
        tvShoe: 0x3a312a,
        /* 室外陈设 */
        tvLion: 0xb9b2a2, tvLionD: 0x8c8678,
        tvBark: 0x6b5540, tvLeaf1: 0x6f8f4a, tvLeaf2: 0x517038,
        tvLeaf3: 0x8faa5a, tvTuft: 0x7d9a52,
        tvHorse: 0x8a6242, tvHorseD: 0x5f422c, tvMetal: 0x8d8f92
      },
      emit: {
        tvWallIn:  { c: 0xc8b08a, e: 0x3a2814 },
        tvLantern: { c: 0xd94a2c, e: 0x8a2510 },
        tvCandle:  { c: 0xffe6b0, e: 0xffd080 }
      },
      light: {
        /* 黄昏斜光从相机同侧来，正面门窗才不逆光 */
        sun:  { color: 0xffd9a8, i: 2.45, pos: [18.0, 20.0, 14.0] },
        fill: { color: 0x8a9cc0, i: 0.55, pos: [-14.0, 8.0, -12.0] },
        hemi: { sky: 0xd8c4b0, ground: 0x8a7258, i: 0.86 },
        amb:  { color: 0x9c8c86, i: 0.26 }
      },
      veg: { willows: [], bamboo: [], pots: [] },
      cam: { theta: 0.95, phi: 1.19, dist: 34, target: [0.0, 5.40, 0.0] }
    }
  };
});
