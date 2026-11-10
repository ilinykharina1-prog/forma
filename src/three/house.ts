import * as THREE from "three";
import { addInstances, addPiece, InstanceItem, Quality, rng, Track, Vec3 } from "./core";
import type { Materials } from "./materials";

/** Именованные группы модели. Те же имена ожидаются в будущем house.glb. */
export const HOUSE_GROUPS = [
  "foundation",
  "groundWalls",
  "columns",
  "floorSlab",
  "upperWalls",
  "roofStructure",
  "roofCovering",
  "windows",
  "doors",
  "facade",
  "terrace",
] as const;
export type HouseGroup = (typeof HOUSE_GROUPS)[number];

const F = 0.5; // отметка чистого пола
const WALL = 0.3;
const G_TOP = 3.7;
const SLAB_TOP = 4;
const U_TOP = 7;

type Finish = "stone" | "wood" | "metal" | "concrete";
type Opening = { from: number; to: number; kind: "glass" | "door" };

interface Run {
  axis: "x" | "z";
  fixed: number; // координата наружной плоскости
  normal: 1 | -1;
  from: number;
  to: number;
  y0: number;
  h: number;
  openings: Opening[];
  finish: Finish[]; // отделка каждого простенка по порядку
}

const glass = (from: number, to: number): Opening => ({ from, to, kind: "glass" });

const GROUND_RUNS: Run[] = [
  { axis: "x", fixed: 5, normal: 1, from: -9, to: 7, y0: F, h: G_TOP - F, openings: [glass(-7.4, -1.6), { from: 0.2, to: 2, kind: "door" }, glass(3.2, 6.4)], finish: ["stone", "concrete", "wood", "concrete"] },
  { axis: "x", fixed: -5, normal: -1, from: -9, to: 7, y0: F, h: G_TOP - F, openings: [glass(-6, -2), glass(2, 5)], finish: ["concrete", "concrete", "concrete"] },
  { axis: "z", fixed: -9, normal: -1, from: -4.7, to: 4.7, y0: F, h: G_TOP - F, openings: [glass(-2.5, 3)], finish: ["stone", "stone"] },
  { axis: "z", fixed: 7, normal: 1, from: -4.7, to: 4.7, y0: F, h: G_TOP - F, openings: [glass(-3, 3)], finish: ["wood", "wood"] },
];

const UPPER_RUNS: Run[] = [
  { axis: "x", fixed: 6.5, normal: 1, from: -3, to: 10.5, y0: SLAB_TOP, h: U_TOP - SLAB_TOP, openings: [glass(-2, 4.5), glass(5.5, 9.5)], finish: ["metal", "wood", "metal"] },
  { axis: "x", fixed: -4.5, normal: -1, from: -3, to: 10.5, y0: SLAB_TOP, h: U_TOP - SLAB_TOP, openings: [glass(0, 3), glass(5, 8)], finish: ["metal", "metal", "metal"] },
  { axis: "z", fixed: -3, normal: -1, from: -4.2, to: 6.2, y0: SLAB_TOP, h: U_TOP - SLAB_TOP, openings: [glass(-2, 5)], finish: ["wood", "wood"] },
  { axis: "z", fixed: 10.5, normal: 1, from: -4.2, to: 6.2, y0: SLAB_TOP, h: U_TOP - SLAB_TOP, openings: [glass(-2.5, 5)], finish: ["metal", "metal"] },
];

/** Простенки между проёмами. */
function piers(run: Run) {
  const list: [number, number][] = [];
  let cursor = run.from;
  for (const o of run.openings) {
    if (o.from > cursor) list.push([cursor, o.from]);
    cursor = o.to;
  }
  if (run.to > cursor) list.push([cursor, run.to]);
  return list;
}

/** Точка на плоскости стены: along — вдоль стены, depth — от наружной плоскости внутрь. */
function place(run: Run, along: number, y: number, depth: number): Vec3 {
  const offset = run.fixed - run.normal * depth;
  return run.axis === "x" ? [along, y, offset] : [offset, y, along];
}
function sized(run: Run, length: number, h: number, thick: number): Vec3 {
  return run.axis === "x" ? [length, h, thick] : [thick, h, length];
}

export function buildHouse(root: THREE.Group, track: Track, m: Materials, quality: Quality) {
  const group = (name: HouseGroup) => {
    const g = new THREE.Group();
    g.name = name;
    root.add(g);
    return g;
  };
  const groups = Object.fromEntries(HOUSE_GROUPS.map((n) => [n, group(n)])) as Record<HouseGroup, THREE.Group>;
  const r = rng(7);
  const low = quality === "low";

  /* ── 02 Фундамент ─────────────────────────────────────────── */
  const rebars: InstanceItem[] = [];
  const step = low ? 1.6 : 0.8;
  for (let x = -9.2; x <= 7.2; x += step) {
    rebars.push({ center: [x, 0.3, 0], size: [0.05, 0.05, 10.6], a: 0.115 + (x + 9.2) * 0.0018, b: 0.15 + (x + 9.2) * 0.0018 });
  }
  for (let z = -5.2; z <= 5.2; z += step) {
    rebars.push({ center: [-1, 0.34, z], size: [16.6, 0.05, 0.05], a: 0.13 + (z + 5.2) * 0.002, b: 0.165 + (z + 5.2) * 0.002 });
  }
  addInstances(groups.foundation, track, m.rebar, rebars, false);
  addPiece(groups.foundation, track, { center: [-1, 0.25, 0], size: [17, 0.5, 11], material: m.foundation, anim: "rise", a: 0.165, b: 0.245, uvScale: 0.25 });
  for (const z of [-4.2, 1, 6.2]) {
    addPiece(groups.foundation, track, { center: [10.15, 0.2, z], size: [1, 0.4, 1], material: m.foundation, anim: "rise", a: 0.2, b: 0.245 });
  }

  /* ── 03 Несущие стены и колонны ───────────────────────────── */
  const wallsOf = (runs: Run[], parent: THREE.Group, start: number, end: number) => {
    const all = runs.flatMap((run) => piers(run).map((pier) => ({ run, pier })));
    all.forEach(({ run, pier }, i) => {
      const a = start + ((end - start) * 0.62 * i) / all.length;
      const length = pier[1] - pier[0];
      addPiece(parent, track, {
        center: place(run, (pier[0] + pier[1]) / 2, run.y0 + run.h / 2, WALL / 2),
        size: sized(run, length, run.h, WALL),
        material: m.block,
        anim: "rise",
        a,
        b: a + (end - start) * 0.38,
      });
    });
  };
  wallsOf(GROUND_RUNS, groups.groundWalls, 0.26, 0.385);
  wallsOf(UPPER_RUNS, groups.upperWalls, 0.455, 0.52);

  const columns: [number, number, number, number][] = [
    [10.15, -4.2, 0.4, G_TOP],
    [10.15, 1, 0.4, G_TOP],
    [10.15, 6.2, 0.4, G_TOP],
    [-4.5, 4.85, F, G_TOP],
    [4.8, 4.85, F, G_TOP],
  ];
  columns.forEach(([x, z, y0, y1], i) => {
    const a = 0.27 + i * 0.016;
    addPiece(groups.columns, track, { center: [x, (y0 + y1) / 2, z], size: [0.26, y1 - y0, 0.26], material: m.column, anim: "rise", a, b: a + 0.05 });
  });

  /* ── 04 Перекрытие ────────────────────────────────────────── */
  const slabs: { x: [number, number]; z: [number, number] }[] = [
    { x: [-9.3, -3.3], z: [-5.3, 5.3] },
    { x: [-3.3, 7.3], z: [-5.3, 6.8] },
    { x: [7.3, 10.8], z: [-4.8, 6.8] },
  ];
  slabs.forEach((s, i) => {
    const a = 0.4 + i * 0.016;
    addPiece(groups.floorSlab, track, {
      center: [(s.x[0] + s.x[1]) / 2, (G_TOP + SLAB_TOP) / 2, (s.z[0] + s.z[1]) / 2],
      size: [s.x[1] - s.x[0], SLAB_TOP - G_TOP, s.z[1] - s.z[0]],
      material: m.rawConcrete,
      anim: "drop",
      a,
      b: a + 0.05,
      dist: 7,
      uvScale: 0.25,
    });
  });

  /* ── 05 Кровля ────────────────────────────────────────────── */
  const beamCount = Math.round((10.5 + 3) / 1.5);
  for (let i = 0; i <= beamCount; i++) {
    const a = 0.525 + i * 0.0045;
    addPiece(groups.roofStructure, track, { center: [-3 + i * 1.5, U_TOP + 0.15, 1], size: [0.14, 0.3, 11], material: m.steel, anim: "drop", a, b: a + 0.03, dist: 5 });
  }
  const strips = 6;
  const roofX: [number, number] = [-3.7, 11.2];
  for (let i = 0; i < strips; i++) {
    const w = (roofX[1] - roofX[0]) / strips;
    const a = 0.585 + i * 0.006;
    addPiece(groups.roofCovering, track, { center: [roofX[0] + w * (i + 0.5), U_TOP + 0.38, 1], size: [w, 0.16, 12.6], material: m.roofDeck, anim: "drop", a, b: a + 0.03, dist: 4 });
  }
  const fascia = (c: Vec3, s: Vec3, i: number) => {
    const a = 0.62 + i * 0.004;
    addPiece(groups.roofCovering, track, { center: c, size: s, material: m.frame, anim: "rise", a, b: a + 0.022 });
  };
  fascia([3.75, U_TOP + 0.3, 7.34], [15.1, 0.42, 0.08], 0);
  fascia([3.75, U_TOP + 0.3, -5.34], [15.1, 0.42, 0.08], 1);
  fascia([-3.74, U_TOP + 0.3, 1], [0.08, 0.42, 12.6], 2);
  fascia([11.24, U_TOP + 0.3, 1], [0.08, 0.42, 12.6], 3);
  addPiece(groups.roofCovering, track, { center: [-6.25, SLAB_TOP + 0.05, 0], size: [5.9, 0.1, 10.4], material: m.gravel, anim: "rise", a: 0.61, b: 0.645, cast: false });

  addPiece(groups.roofCovering, track, { center: [1.5, U_TOP + 0.95, -2.2], size: [0.8, 1.05, 1.5], material: m.metal, anim: "rise", a: 0.625, b: 0.648 });

  /* ── 06 Окна и двери ──────────────────────────────────────── */
  const allRuns = [...GROUND_RUNS, ...UPPER_RUNS];
  let windowIndex = 0;
  for (const run of allRuns) {
    for (const o of run.openings) {
      if (o.kind === "door") {
        const c = (o.from + o.to) / 2;
        const w = o.to - o.from;
        const doorH = 2.75;
        addPiece(groups.doors, track, { center: place(run, c, run.y0 + doorH / 2, WALL * 0.7), size: sized(run, w, doorH, 0.09), material: m.door, anim: "slideZ", a: 0.715, b: 0.765, dist: 2.4 });
        addPiece(groups.doors, track, { center: place(run, c, run.y0 + doorH + (run.h - doorH) / 2, WALL * 0.7), size: sized(run, w, run.h - doorH, 0.09), material: m.frame, anim: "drop", a: 0.725, b: 0.77, dist: 1.5 });
        addPiece(groups.doors, track, { center: place(run, o.to - 0.2, run.y0 + 1.3, WALL * 0.3), size: sized(run, 0.05, 1.3, 0.05), material: m.lamp, anim: "fade", a: 0.75, b: 0.775, cast: false });
        continue;
      }
      const a = 0.655 + windowIndex * 0.0048;
      const b = a + 0.038;
      windowIndex += 1;
      const slideAnim = run.axis === "x" ? "slideX" : "slideZ";
      const dist = run.normal * 3.2;
      const length = o.to - o.from;
      const mid = (o.from + o.to) / 2;
      const yMid = run.y0 + run.h / 2;
      const depth = WALL * 0.55;
      addPiece(groups.windows, track, { center: place(run, mid, yMid, depth), size: sized(run, length - 0.08, run.h - 0.08, 0.03), material: m.glass, anim: slideAnim, a, b, dist, cast: false, receive: false });
      const bars: { c: number; y: number; l: number; h: number }[] = [
        { c: mid, y: run.y0 + 0.035, l: length, h: 0.07 },
        { c: mid, y: run.y0 + run.h - 0.035, l: length, h: 0.07 },
      ];
      const panes = Math.max(1, Math.round(length / 1.9));
      for (let i = 0; i <= panes; i++) {
        bars.push({ c: o.from + (length * i) / panes, y: yMid, l: 0.07, h: run.h });
      }
      for (const bar of bars) {
        addPiece(groups.windows, track, { center: place(run, bar.c, bar.y, depth), size: sized(run, bar.l, bar.h, 0.1), material: m.frame, anim: slideAnim, a, b, dist, cast: false });
      }
    }
  }

  /* ── 07 Фасад ─────────────────────────────────────────────── */
  const clad: Record<Finish, InstanceItem[]> = { stone: [], wood: [], metal: [], concrete: [] };
  const window_: Record<Finish, [number, number]> = {
    stone: [0.775, 0.855],
    concrete: [0.785, 0.862],
    wood: [0.795, 0.872],
    metal: [0.805, 0.88],
  };
  const OUT = -0.03; // облицовка чуть выходит за наружную плоскость
  for (const run of allRuns) {
    piers(run).forEach(([s, e], i) => {
      const finish = run.finish[i] ?? run.finish[0];
      const [a0, b0] = window_[finish];
      const span = b0 - a0 - 0.03;
      const timing = (along: number, y: number) => {
        const n = (along + 12) / 26 * 0.7 + ((y - run.y0) / run.h) * 0.3;
        const a = a0 + span * Math.min(1, n);
        return { a, b: a + 0.03 };
      };
      if (finish === "wood" || finish === "metal") {
        const w = finish === "wood" ? (low ? 0.2 : 0.11) : low ? 0.75 : 0.5;
        const gap = finish === "wood" ? (low ? 0.05 : 0.035) : 0.012;
        for (let x = s + w / 2; x < e; x += w + gap) {
          const width = Math.min(w, (e - x) * 2);
          clad[finish].push({
            center: place(run, x, run.y0 + run.h / 2, OUT),
            size: sized(run, width, run.h, 0.06),
            tint: 0.84 + r() * 0.16,
            ...timing(x, run.y0),
          });
        }
      } else if (finish === "stone") {
        const rowH = low ? 0.44 : 0.22;
        for (let row = 0; row * rowH < run.h - 0.01; row++) {
          let x = s;
          while (x < e - 0.02) {
            const len = Math.min((low ? 1 : 0.5) + r() * 0.65, e - x);
            const y = run.y0 + rowH * (row + 0.5);
            clad.stone.push({
              center: place(run, x + len / 2, y, OUT - r() * 0.02),
              size: sized(run, len - 0.012, rowH - 0.012, 0.07),
              tint: 0.72 + r() * 0.28,
              ...timing(x, y),
            });
            x += len;
          }
        }
      } else {
        const panelH = run.h / 2;
        const length = e - s;
        const cols = Math.max(1, Math.round(length / 1.5));
        for (let row = 0; row < 2; row++) {
          for (let c = 0; c < cols; c++) {
            const pw = length / cols;
            const x = s + pw * (c + 0.5);
            const y = run.y0 + panelH * (row + 0.5);
            clad.concrete.push({
              center: place(run, x, y, OUT),
              size: sized(run, pw - 0.015, panelH - 0.015, 0.05),
              tint: 0.92 + r() * 0.08,
              ...timing(x, y),
            });
          }
        }
      }
    });
  }
  addInstances(groups.facade, track, m.stone, clad.stone);
  addInstances(groups.facade, track, m.concrete, clad.concrete);
  addInstances(groups.facade, track, m.wood, clad.wood);
  addInstances(groups.facade, track, m.metal, clad.metal);

  // Обвязка перекрытия и деревянный потолок под консолью.
  const band = (c: Vec3, s: Vec3, material = m.frame, a = 0.84) =>
    addPiece(groups.facade, track, { center: c, size: s, material, anim: "rise", a, b: a + 0.03 });
  band([0.75, 3.85, 6.84], [20.2, 0.3, 0.06]);
  band([-6.3, 3.85, 5.34], [6.1, 0.3, 0.06]);
  band([-9.34, 3.85, 0], [0.06, 0.3, 10.7]);
  band([10.84, 3.85, 1], [0.06, 0.3, 11.7]);
  addPiece(groups.facade, track, { center: [0.75, 3.68, 5.9], size: [20.1, 0.04, 1.8], material: m.wood, anim: "fade", a: 0.85, b: 0.885, cast: false, uvScale: 1 });

  // Стеклянное ограждение террасы на кровле первого этажа.
  addPiece(groups.facade, track, { center: [-9.05, 4.55, 0], size: [0.02, 1, 10.2], material: m.glass, anim: "fade", a: 0.855, b: 0.885, cast: false });
  addPiece(groups.facade, track, { center: [-6.05, 4.55, 5.05], size: [6, 1, 0.02], material: m.glass, anim: "fade", a: 0.86, b: 0.885, cast: false });

  /* ── Интерьер: виден через остекление ─────────────────────── */
  const interior = new THREE.Group();
  interior.name = "interior";
  root.add(interior);
  const inPiece = (c: Vec3, s: Vec3, material: THREE.MeshStandardMaterial, a = 0.64, b = 0.68) =>
    addPiece(interior, track, { center: c, size: s, material, anim: "fade", a, b, cast: false });
  inPiece([-1, G_TOP / 2 + 0.25, -0.6], [15.4, G_TOP - F, 0.1], m.plaster);
  inPiece([3.7, 5.5, 1], [12.9, 3, 0.1], m.plaster);
  inPiece([-1, G_TOP - 0.02, 2.2], [15.4, 0.02, 5.4], m.ceiling);
  inPiece([3.7, U_TOP - 0.02, 3.8], [12.9, 0.02, 5.2], m.ceiling);
  if (!low) {
    inPiece([-4.8, 0.92, 2.1], [3.2, 0.42, 0.95], m.fabric, 0.68, 0.72);
    inPiece([-4.8, 1.2, 1.7], [3.2, 0.55, 0.22], m.fabric, 0.68, 0.72);
    inPiece([-1.6, 1.2, 2.2], [0.05, 1.4, 0.05], m.furniture, 0.68, 0.72);
    inPiece([4.8, 1.25, 2.3], [2.4, 0.06, 1], m.furniture, 0.68, 0.72);
    inPiece([4.8, 0.87, 2.3], [0.1, 0.72, 0.5], m.furniture, 0.68, 0.72);
    inPiece([1.5, 5.1, 3.8], [2.6, 0.5, 2], m.fabric, 0.68, 0.72);
    for (const x of [-7.1, -1.9, 3.5, 6.1]) inPiece([x, 2.1, 4.4], [0.34, 3.1, 0.08], m.fabric, 0.68, 0.72);
    for (const x of [-1.7, 9.2]) inPiece([x, 5.5, 5.9], [0.34, 2.9, 0.08], m.fabric, 0.68, 0.72);
  }

  /* ── 08 Терраса ───────────────────────────────────────────── */
  addPiece(groups.terrace, track, { center: [-6.5, 0.2, 8.2], size: [11, 0.4, 5.8], material: m.foundation, anim: "rise", a: 0.875, b: 0.9 });
  const boards: InstanceItem[] = [];
  const bw = low ? 0.38 : 0.19;
  let bi = 0;
  for (let z = 5.35; z < 11.05; z += bw) {
    const a = 0.885 + bi * (low ? 0.0016 : 0.0008);
    boards.push({ center: [-6.5, 0.45, z + bw / 2], size: [11.2, 0.09, bw - 0.015], tint: 0.82 + r() * 0.18, a, b: a + 0.016 });
    bi += 1;
  }
  addInstances(groups.terrace, track, m.deck, boards);
  addPiece(groups.terrace, track, { center: [-6.5, 0.14, 11.55], size: [8, 0.28, 0.9], material: m.paver, anim: "rise", a: 0.91, b: 0.93 });
  addPiece(groups.terrace, track, { center: [1.1, 0.24, 5.9], size: [3.2, 0.48, 1.8], material: m.paver, anim: "rise", a: 0.905, b: 0.93 });
  if (!low) {
    for (const x of [-10, -8.2]) {
      addPiece(groups.terrace, track, { center: [x, 0.72, 9.1], size: [0.8, 0.26, 2.05], material: m.fabric, anim: "fade", a: 0.93, b: 0.955 });
    }
    addPiece(groups.terrace, track, { center: [-4.2, 0.92, 8.7], size: [2.4, 0.06, 1.1], material: m.furniture, anim: "fade", a: 0.93, b: 0.955 });
    addPiece(groups.terrace, track, { center: [-4.2, 0.68, 8.7], size: [0.12, 0.44, 0.7], material: m.furniture, anim: "fade", a: 0.93, b: 0.955 });
  }

  return { groups, interior };
}

/** Контур будущего дома: линии, которые вычерчиваются на первом экране. */
export function buildBlueprint() {
  const boxes: [Vec3, Vec3][] = [
    [[-9, 0.5, -5], [7, 3.7, 5]],
    [[-3, 4, -4.5], [10.5, 7, 6.5]],
    [[-3.7, 7.3, -5.3], [11.2, 7.46, 7.3]],
    [[-9.5, 0, -5.5], [7.5, 0.5, 5.5]],
    [[-12, 0.1, 5.3], [-1, 0.5, 11]],
    [[-9.3, 3.7, -5.3], [-3.3, 4, 5.3]],
  ];
  const points: number[] = [];
  const line = (a: Vec3, b: Vec3) => points.push(...a, ...b);
  for (const [min, max] of boxes) {
    const [x0, y0, z0] = min;
    const [x1, y1, z1] = max;
    const c: Vec3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) line(c[i], c[j]);
  }
  for (const run of [...GROUND_RUNS, ...UPPER_RUNS]) {
    for (const o of run.openings) {
      const top = run.y0 + run.h;
      const p = (a: number, y: number) => place(run, a, y, 0);
      line(p(o.from, run.y0), p(o.from, top));
      line(p(o.to, run.y0), p(o.to, top));
      const panes = o.kind === "glass" ? Math.round((o.to - o.from) / 1.9) : 1;
      for (let i = 1; i < panes; i++) {
        const x = o.from + ((o.to - o.from) * i) / panes;
        line(p(x, run.y0), p(x, top));
      }
    }
  }
  // Оси здания, вынесенные за контур, как на генплане.
  for (const x of [-9, -3, 2, 7, 10.5]) line([x, 0.02, -8], [x, 0.02, 13]);
  for (const z of [-5, 0, 5, 6.5]) line([-13, 0.02, z], [14, 0.02, z]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return { geometry, vertexCount: points.length / 3 };
}
