import * as THREE from "three";

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const remap = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => t * t * (3 - 2 * t);
/** Посадка элемента: быстрый подвод и мягкая остановка без отскока. */
export const settle = (t: number) => 1 - Math.pow(1 - t, 4);

export type Quality = "high" | "low";
export type Variant = "main" | "forest" | "water" | "family";
export type Vec3 = [number, number, number];

/**
 * Единая дорожка анимации. Каждый элемент знает свой отрезок [a, b] общей шкалы
 * скролла и пересчитывается только тогда, когда его локальный прогресс изменился.
 */
export class Track {
  private items: { a: number; b: number; apply: (t: number) => void; last: number }[] = [];

  add(a: number, b: number, apply: (t: number) => void) {
    this.items.push({ a, b, apply, last: -1 });
  }

  update(p: number) {
    for (const item of this.items) {
      const t = remap(p, item.a, item.b);
      if (t !== item.last) {
        item.last = t;
        item.apply(t);
      }
    }
  }
}

/** Коробка с UV в метрах: текстура не растягивается на элементах разного размера. */
export function boxGeometry(w: number, h: number, d: number, uvScale = 0.5) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const faces: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  faces.forEach(([su, sv], f) => {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * su * uvScale, uv.getY(i) * sv * uvScale);
    }
  });
  return g;
}

export type PieceAnim = "rise" | "drop" | "slideX" | "slideZ" | "grow" | "fade";

export interface PieceOptions {
  center: Vec3;
  size: Vec3;
  material: THREE.MeshStandardMaterial;
  anim: PieceAnim;
  a: number;
  b: number;
  /** Дистанция подвода в метрах (со знаком для сдвигов). */
  dist?: number;
  cast?: boolean;
  receive?: boolean;
  uvScale?: number;
}

/** Отдельный конструктивный элемент с архитектурно точной траекторией. */
export function addPiece(parent: THREE.Object3D, track: Track, o: PieceOptions) {
  const [w, h, d] = o.size;
  const needsFade = o.anim === "drop" || o.anim === "slideX" || o.anim === "slideZ" || o.anim === "fade";
  const material = needsFade ? o.material.clone() : o.material;
  const baseOpacity = o.material.opacity;
  const baseTransparent = o.material.transparent;
  const mesh = new THREE.Mesh(boxGeometry(w, h, d, o.uvScale), material);
  const [x, y, z] = o.center;
  mesh.position.set(x, y, z);
  mesh.castShadow = o.cast ?? true;
  mesh.receiveShadow = o.receive ?? true;
  mesh.visible = false;
  parent.add(mesh);

  const dist = o.dist ?? 6;
  track.add(o.a, o.b, (raw) => {
    mesh.visible = raw > 0;
    if (raw <= 0) return;
    const t = settle(raw);
    switch (o.anim) {
      case "rise":
        mesh.scale.y = Math.max(t, 0.001);
        mesh.position.y = y + (h / 2) * (t - 1);
        break;
      case "grow":
        mesh.scale.setScalar(Math.max(t, 0.001));
        mesh.position.y = y + (h / 2) * (t - 1);
        break;
      case "drop":
        mesh.position.y = y + (1 - t) * dist;
        break;
      case "slideX":
        mesh.position.x = x + (1 - t) * dist;
        break;
      case "slideZ":
        mesh.position.z = z + (1 - t) * dist;
        break;
    }
    if (needsFade) {
      const f = easeInOut(clamp01(raw / 0.45));
      material.opacity = baseOpacity * f;
      material.transparent = baseTransparent || f < 1;
      material.depthWrite = !baseTransparent && f > 0.6;
    }
  });
  return { mesh, material };
}

export interface InstanceItem {
  center: Vec3;
  size: Vec3;
  a: number;
  b: number;
  tint?: number;
}

/** Набор одинаковых деталей (ламели, камень, доски) — один draw call, своя задержка у каждой. */
export function addInstances(
  parent: THREE.Object3D,
  track: Track,
  material: THREE.Material,
  items: InstanceItem[],
  cast = true,
) {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, items.length);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.visible = false;
  const color = new THREE.Color();
  items.forEach((item, i) => {
    const v = item.tint ?? 1;
    mesh.setColorAt(i, color.setRGB(v, v, v));
  });
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  parent.add(mesh);

  const a = Math.min(...items.map((i) => i.a));
  const b = Math.max(...items.map((i) => i.b));
  const m = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quat = new THREE.Quaternion();

  track.add(a, b, (global) => {
    mesh.visible = global > 0;
    if (global <= 0) return;
    const p = a + (b - a) * global;
    items.forEach((item, i) => {
      const t = settle(remap(p, item.a, item.b));
      const h = item.size[1];
      pos.set(item.center[0], item.center[1] + (h / 2) * (t - 1), item.center[2]);
      scale.set(t > 0 ? item.size[0] : 0, Math.max(h * t, 0.0001), t > 0 ? item.size[2] : 0);
      mesh.setMatrixAt(i, m.compose(pos, quat, scale));
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return mesh;
}

/** Детерминированный псевдослучайный генератор: картинка одинакова при каждом запуске. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Плавный двумерный шум для рельефа и пятен на текстурах. */
export function noise2(x: number, y: number) {
  const hash = (ix: number, iy: number) => {
    const v = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy) * (1 - ux) + hash(ix + 1, iy) * ux;
  const b = hash(ix, iy + 1) * (1 - ux) + hash(ix + 1, iy + 1) * ux;
  return a * (1 - uy) + b * uy;
}

export function fbm(x: number, y: number, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x * f, y * f) * amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum;
}
