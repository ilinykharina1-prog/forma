import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { addInstances, addPiece, fbm, InstanceItem, Quality, rng, settle, Track, Variant, Vec3 } from "./core";
import type { Materials } from "./materials";

/** Рельеф: площадка ровная, дальше холмы, закрывающие горизонт. */
export function terrainHeight(x: number, z: number) {
  const r = Math.hypot(x, z);
  const fade = THREE.MathUtils.smoothstep(r, 30, 80);
  const hills = THREE.MathUtils.smoothstep(r, 150, 310) * 15;
  return (fbm(x * 0.02 + 5, z * 0.02 + 9) - 0.45) * 7 * fade + hills * (0.5 + fbm(x * 0.012, z * 0.012));
}

function paint(geo: THREE.BufferGeometry, color: THREE.Color) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) color.toArray(arr, i * 3);
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return geo;
}

function pineGeometry(low: boolean) {
  const parts: THREE.BufferGeometry[] = [];
  const seg = low ? 6 : 11;
  const r = rng(low ? 2 : 3);
  const trunk = new THREE.CylinderGeometry(0.07, 0.26, 15, 5);
  trunk.translate(0, 7.5, 0);
  parts.push(paint(trunk, new THREE.Color("#2e261f")));
  const layers = low ? 6 : 15;
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const radius = 2.5 * Math.pow(1 - t, 0.85) + 0.16;
    const cone = new THREE.ConeGeometry(radius, 2.4 - t * 1.1, seg, 1, true);
    // Рваный нижний край ветвей вместо ровного конуса.
    const p = cone.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < p.count; v++) {
      if (p.getY(v) < 0) {
        const k = 0.62 + r() * 0.62;
        p.setXYZ(v, p.getX(v) * k, p.getY(v) - r() * 0.45, p.getZ(v) * k);
      }
    }
    cone.computeVertexNormals();
    cone.rotateY(i * 2.1);
    cone.translate((r() - 0.5) * 0.2, 2.6 + t * 12.2, (r() - 0.5) * 0.2);
    parts.push(paint(cone, new THREE.Color().setHSL(0.31, 0.2, 0.095 + t * 0.075 + r() * 0.02)));
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
}

function broadleafGeometry(low: boolean) {
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.08, 0.17, 2.6, 5);
  trunk.translate(0, 1.3, 0);
  parts.push(paint(trunk, new THREE.Color("#5b4b3c")));
  const r = rng(4);
  const blobs: [number, number, number, number][] = [[0, 3.9, 0, 1.7], [1.1, 3.3, 0.3, 1.15], [-0.9, 3.4, -0.5, 1.2], [0.2, 3.1, 1, 1], [-0.2, 5, 0.1, 1.05]];
  blobs.forEach(([x, y, z, s], i) => {
    const b = new THREE.IcosahedronGeometry(s, low ? 2 : 4);
    const p = b.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < p.count; v++) {
      const k = 1 + Math.sin(p.getX(v) * 3 + i) * Math.cos(p.getZ(v) * 3) * 0.1 + Math.sin(p.getY(v) * 9 + p.getX(v) * 7) * 0.05;
      p.setXYZ(v, p.getX(v) * k, p.getY(v) * k * 0.9, p.getZ(v) * k);
    }
    const n = b.attributes.normal as THREE.BufferAttribute;
    for (let v = 0; v < p.count; v++) {
      const l = Math.hypot(p.getX(v), p.getY(v), p.getZ(v));
      n.setXYZ(v, p.getX(v) / l, p.getY(v) / l, p.getZ(v) / l);
    }
    b.translate(x, y, z);
    parts.push(paint(b, new THREE.Color().setHSL(0.24, 0.24, 0.2 + i * 0.016)));
  });
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
}

function bladeGeometry() {
  const g = new THREE.BufferGeometry();
  const w = 0.016;
  const verts = [-w, 0, 0, w, 0, 0, -w * 0.6, 0.09, 0.012, w * 0.6, 0.09, 0.012, 0, 0.2, 0.05];
  g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4]);
  g.computeVertexNormals();
  return g;
}

interface Placed {
  x: number;
  z: number;
  scale: number;
  tint: THREE.Color;
}

function instanceAll(geometry: THREE.BufferGeometry, material: THREE.Material, list: Placed[], parent: THREE.Object3D, cast: boolean) {
  const mesh = new THREE.InstancedMesh(geometry, material, list.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  list.forEach((t, i) => {
    q.setFromAxisAngle(up, (t.x * 7.31 + t.z * 3.17) % 6.28);
    m.compose(new THREE.Vector3(t.x, terrainHeight(t.x, t.z) - 0.05, t.z), q, new THREE.Vector3(t.scale, t.scale * 1.05, t.scale));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, t.tint);
  });
  mesh.castShadow = cast;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  parent.add(mesh);
  return mesh;
}

export function buildLandscape(root: THREE.Group, track: Track, m: Materials, quality: Quality, variant: Variant) {
  const low = quality === "low";
  const r = rng(21);

  const terrain = new THREE.Group();
  terrain.name = "terrain";
  root.add(terrain);
  const landscaping = new THREE.Group();
  landscaping.name = "landscaping";
  root.add(landscaping);

  /* ── Рельеф ───────────────────────────────────────────────── */
  const seg = low ? 90 : 180;
  const ground = new THREE.PlaneGeometry(640, 640, seg, seg);
  ground.rotateX(-Math.PI / 2);
  const pos = ground.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const a = new THREE.Color("#79805a");
  const b = new THREE.Color("#8f9268");
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z));
    c.lerpColors(a, b, THREE.MathUtils.clamp((fbm(x * 0.08, z * 0.08) - 0.3) * 2.4, 0, 1));
    c.toArray(colors, i * 3);
  }
  ground.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  ground.computeVertexNormals();
  m.textures.grass.repeat.set(80, 80);
  const groundMesh = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ vertexColors: true, map: m.textures.grass, roughness: 1 }));
  groundMesh.receiveShadow = true;
  terrain.add(groundMesh);

  /* ── Лес ──────────────────────────────────────────────────── */
  const pineMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const pine = pineGeometry(low);
  const tint = () => new THREE.Color().setHSL(0.2, 0.06, 0.62 + r() * 0.36);

  const near: Placed[] = [];
  const nearSpots: [number, number][] = [[-52, -30], [-44, -38], [-33, -46], [-19, -50], [-8, -56], [7, -52], [21, -49], [34, -44], [47, -33], [55, -21], [-60, -18], [-26, -60], [16, -63], [41, -57], [-48, -55], [62, -40]];
  for (const [x, z] of nearSpots) near.push({ x: x * 1.7, z: z * 1.7, scale: 0.72 + r() * 0.34, tint: tint() });
  instanceAll(pine, pineMat, near, terrain, !low);

  const far: Placed[] = [];
  const count = low ? 420 : 1700;
  for (let i = 0; i < count; i++) {
    // Лес стоит полукольцом позади: перед домом — открытый вид и воздух.
    const angle = -Math.PI * 0.5 + (r() - 0.5) * Math.PI * 1.7;
    const radius = 112 + Math.pow(r(), 0.8) * 190;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    far.push({ x, z, scale: 0.6 + r() * 0.42, tint: tint() });
  }
  instanceAll(low ? pine : pineGeometry(true), pineMat, far, terrain, false);

  /* ── Подготовка площадки ──────────────────────────────────── */
  const plate = (material: THREE.MeshStandardMaterial, y: number, size: [number, number], center: [number, number]) => {
    const g = new THREE.PlaneGeometry(size[0], size[1]);
    g.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(g, material);
    mesh.position.set(center[0], y, center[1]);
    mesh.receiveShadow = true;
    return mesh;
  };
  terrain.add(plate(m.soil, 0.05, [52, 46], [0, 3]));
  track.add(0.095, 0.15, (t) => (m.soil.opacity = t));

  /* ── Газон и трава ────────────────────────────────────────── */
  m.lawn.map = m.textures.grass.clone();
  m.lawn.map.repeat.set(5, 5);
  terrain.add(plate(m.lawn, 0.09, [66, 58], [0, 5]));
  track.add(0.885, 0.935, (t) => (m.lawn.opacity = t));

  const bladeMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, side: THREE.DoubleSide });
  const blade = bladeGeometry();
  const makeBlades = (total: number, accept: (x: number, z: number) => boolean, sample: () => [number, number]) => {
    const list: Placed[] = [];
    let guard = 0;
    while (list.length < total && guard++ < total * 8) {
      const [x, z] = sample();
      if (!accept(x, z)) continue;
      list.push({ x, z, scale: 0.7 + r() * 1.1, tint: new THREE.Color().setHSL(0.215 + r() * 0.04, 0.3, 0.2 + r() * 0.12) });
    }
    return list;
  };
  const inFootprint = (x: number, z: number) =>
    (x > -12.6 && x < 11.5 && z > -6 && z < 12.4) || (x > -0.5 && x < 2.8 && z > 6);
  const inSite = (x: number, z: number) => x > -26 && x < 26 && z > -22 && z < 30;

  // Дикая трава за границей площадки — есть с самого начала.
  const wild = makeBlades(low ? 3000 : 26000, (x, z) => !inSite(x, z), () => [(r() - 0.5) * 120, 30 + r() * -90 + (r() > 0.5 ? 30 : 0)]);
  instanceAll(blade, bladeMat, wild, terrain, false);

  // Газон вокруг дома вырастает на последнем этапе.
  const lawnBlades = makeBlades(low ? 7000 : 70000, (x, z) => !inFootprint(x, z) && x > -30 && x < 30 && z > -20 && z < 32, () => [(r() - 0.5) * 60, -20 + r() * 52]);
  const lawn = instanceAll(blade, bladeMat, lawnBlades, landscaping, false);
  lawn.visible = false;
  track.add(0.9, 0.96, (t) => {
    lawn.visible = t > 0;
    lawn.scale.y = Math.max(0.001, settle(t));
  });

  /* ── Дорожки ──────────────────────────────────────────────── */
  const pavers: InstanceItem[] = [];
  for (let i = 0; i < 16; i++) {
    const z = 7.6 + i * 1.3;
    const start = 0.895 + i * 0.0024;
    pavers.push({ center: [1.1, 0.12, z], size: [2.2, 0.08, 1.1], tint: 0.9 + r() * 0.1, a: start, b: start + 0.018 });
  }
  addInstances(landscaping, track, m.paver, pavers);
  addPiece(landscaping, track, { center: [9, 0.09, 11], size: [5.4, 0.1, 40], material: m.paver, anim: "rise", a: 0.895, b: 0.925, uvScale: 0.25, cast: false });

  /* ── Живые изгороди ───────────────────────────────────────── */
  const hedges: [Vec3, Vec3][] = [
    [[-13.2, 0.55, 3], [0.8, 1.1, 18]],
    [[-3.4, 0.45, 14.4], [0.8, 0.9, 5.4]],
    [[12.5, 0.55, 14], [0.8, 1.1, 18]],
  ];
  hedges.forEach(([center, size], i) => {
    const s = 0.905 + i * 0.008;
    addPiece(landscaping, track, { center, size, material: m.hedge, anim: "rise", a: s, b: s + 0.03 });
  });

  /* ── Деревья сада: растут из земли на месте ───────────────── */
  const broadleaf = broadleafGeometry(low);
  const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const gardenSpots: [number, number, number][] = [[-17, -8, 1.5], [15.5, -3, 1.7], [16, 9, 1.25], [-18, 3, 1.15], [-7, -12, 1.5], [5, -12, 1.35], [17.5, 18, 1.45]];
  gardenSpots.forEach(([x, z, s], i) => {
    const mesh = new THREE.Mesh(broadleaf, treeMat);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = i * 1.7;
    mesh.castShadow = true;
    mesh.visible = false;
    landscaping.add(mesh);
    const start = 0.91 + i * 0.005;
    track.add(start, start + 0.05, (t) => {
      mesh.visible = t > 0;
      const k = Math.max(0.001, settle(t)) * s;
      mesh.scale.set(k, k, k);
    });
  });

  /* ── Бассейн и вода ───────────────────────────────────────── */
  addPiece(landscaping, track, { center: [-8, 0.1, 15.2], size: [9.4, 0.2, 5], material: m.paver, anim: "rise", a: 0.905, b: 0.93, uvScale: 0.25 });
  addPiece(landscaping, track, { center: [-8, 0.205, 15.2], size: [8.4, 0.02, 4], material: m.water, anim: "fade", a: 0.925, b: 0.95, cast: false });

  if (variant === "water") {
    const lake = plate(m.water, 0.2, [420, 300], [0, 180]);
    (lake as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: "#c98f69", fog: false });
    lake.receiveShadow = false;
    terrain.add(lake);
  }

  /* ── Уличные светильники ──────────────────────────────────── */
  const lampItems: InstanceItem[] = [];
  for (let i = 0; i < 8; i++) {
    for (const x of [-0.25, 2.45]) {
      const s = 0.93 + i * 0.002;
      lampItems.push({ center: [x, 0.35, 8.2 + i * 2.5], size: [0.09, 0.7, 0.09], a: s, b: s + 0.015 });
    }
  }
  addInstances(landscaping, track, m.lamp, lampItems, false);
  // Световая линия под консолью и вдоль ступеней.
  addPiece(landscaping, track, { center: [3.7, 3.65, 6.72], size: [13, 0.03, 0.05], material: m.lamp, anim: "fade", a: 0.92, b: 0.945, cast: false });
  addPiece(landscaping, track, { center: [-6.5, 0.32, 11.05], size: [10.5, 0.03, 0.04], material: m.lamp, anim: "fade", a: 0.92, b: 0.945, cast: false });

  return { terrain, landscaping };
}
