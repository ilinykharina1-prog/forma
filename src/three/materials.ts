import * as THREE from "three";
import { fbm, Quality, rng, Variant } from "./core";

function canvasTexture(size: number, paint: (ctx: CanvasRenderingContext2D, s: number) => void, srgb = true) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  paint(canvas.getContext("2d")!, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function speckle(ctx: CanvasRenderingContext2D, s: number, base: [number, number, number], range: number, scale: number) {
  const img = ctx.createImageData(s, s);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const n = fbm((x / s) * scale, (y / s) * scale, 5) - 0.47;
      const grain = (Math.random() - 0.5) * 0.28;
      const i = (y * s + x) * 4;
      for (let c = 0; c < 3; c++) img.data[i + c] = base[c] + (n + grain) * range;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

const woodTexture = (size: number) =>
  canvasTexture(size, (ctx, s) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, s, s);
    const r = rng(11);
    for (let i = 0; i < 520; i++) {
      const x = r() * s;
      ctx.strokeStyle = `rgba(40,20,8,${0.03 + r() * 0.16})`;
      ctx.lineWidth = 0.5 + r() * 2.4;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + r() * 12 - 6, s * 0.33, x + r() * 12 - 6, s * 0.66, x, s);
      ctx.stroke();
    }
  });

const concreteTexture = (size: number) =>
  canvasTexture(size, (ctx, s) => {
    speckle(ctx, s, [205, 202, 195], 26, 9);
    ctx.fillStyle = "rgba(60,58,54,.5)";
    for (const [x, y] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
      ctx.beginPath();
      ctx.arc(x * s, y * s, s * 0.009, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(70,68,62,.28)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, s, s);
  });

const blockTexture = (size: number) =>
  canvasTexture(size, (ctx, s) => {
    speckle(ctx, s, [182, 174, 162], 24, 16);
    ctx.strokeStyle = "rgba(90,84,76,.75)";
    ctx.lineWidth = 2;
    const rows = 8;
    for (let row = 0; row < rows; row++) {
      const y = (row / rows) * s;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y);
      ctx.stroke();
      for (let c = 0; c < 4; c++) {
        const x = ((c + (row % 2) * 0.5) / 4) * s;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + s / rows);
        ctx.stroke();
      }
    }
  });

const flatNoise = (size: number, base: [number, number, number], range: number, scale: number) =>
  canvasTexture(size, (ctx, s) => speckle(ctx, s, base, range, scale));

/** Мягкая маска с размытым краем для пятен грунта и газона. */
const softMask = (size: number) =>
  canvasTexture(
    size,
    (ctx, s) => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, s, s);
      ctx.filter = `blur(${s * 0.05}px)`;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(s * 0.13, s * 0.13, s * 0.74, s * 0.74, s * 0.16);
      ctx.fill();
      ctx.filter = "none";
    },
    false,
  );

/** Тёплое свечение комнаты: пятна света по стене, а не ровная заливка. */
const roomGlow = (size: number) =>
  canvasTexture(size, (ctx, s) => {
    ctx.fillStyle = "#3a2312";
    ctx.fillRect(0, 0, s, s);
    for (const x of [0.16, 0.5, 0.84]) {
      const g = ctx.createRadialGradient(x * s, s * 0.18, 0, x * s, s * 0.18, s * 0.42);
      g.addColorStop(0, "rgba(255,226,180,1)");
      g.addColorStop(1, "rgba(255,170,90,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    }
  });

export function createMaterials(quality: Quality, variant: Variant) {
  // Текстуры генерируются на главном потоке, поэтому на сайте они скромного размера.
  const size = (globalThis as { __formaTextureSize?: number }).__formaTextureSize ?? (quality === "high" ? 512 : 256);
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);

  const wood = woodTexture(size);
  const concrete = concreteTexture(size);
  const block = blockTexture(size);
  const soil = flatNoise(size / 2, [120, 102, 82], 46, 10);
  const grass = flatNoise(size / 2, [226, 226, 216], 42, 22);
  const mask = softMask(256);

  const woodColor = variant === "family" ? "#d3a878" : variant === "water" ? "#b98a5e" : "#a4764c";
  const metalColor = variant === "family" ? "#4a4a46" : "#24262a";
  const stoneColor = variant === "family" ? "#d0cabc" : "#a8a193";

  return {
    textures: { grass, mask },
    block: std({ map: block, roughness: 0.95 }),
    rawConcrete: std({ map: concrete, color: "#c9c5bb", roughness: 0.9 }),
    foundation: std({ map: concrete, color: "#b4afa4", roughness: 0.92 }),
    rebar: std({ color: "#6a4c38", roughness: 0.6, metalness: 0.6 }),
    column: std({ color: "#b9b4a9", map: concrete, roughness: 0.85, metalness: 0 }),
    steel: std({ color: "#3a3b3d", roughness: 0.5, metalness: 0.8 }),
    roofDeck: std({ color: "#34363a", roughness: 0.55, metalness: 0.6 }),
    gravel: std({ color: "#8d897e", map: grass, roughness: 1 }),
    frame: std({ color: "#17181a", roughness: 0.4, metalness: 0.85 }),
    glass: std({ color: "#8fa3ad", roughness: 0.04, metalness: 0.95, transparent: true, opacity: 0.42, envMapIntensity: 1.6 }),
    door: std({ map: wood, color: "#6d4629", roughness: 0.55 }),
    wood: std({ map: wood, color: woodColor, roughness: 0.62 }),
    deck: std({ map: wood, color: "#b08a64", roughness: 0.8 }),
    stone: std({ map: concrete, color: stoneColor, roughness: 0.96 }),
    metal: std({ color: metalColor, roughness: 0.42, metalness: 0.82 }),
    concrete: std({ map: concrete, color: "#d4d0c6", roughness: 0.82 }),
    plaster: std({
      color: "#d9d2c4",
      roughness: 0.9,
      emissive: "#ffb877",
      emissiveMap: roomGlow(256),
      emissiveIntensity: 0,
    }),
    ceiling: std({ color: "#e8e2d6", roughness: 0.9, emissive: "#ffd9a8", emissiveIntensity: 0 }),
    fabric: std({ color: "#b9ad9b", roughness: 1 }),
    furniture: std({ color: "#3c3a36", roughness: 0.8 }),
    lamp: std({ color: "#f5e8d0", emissive: "#ffc98a", emissiveIntensity: 0, roughness: 0.4 }),
    paver: std({ map: concrete, color: "#c6c1b5", roughness: 0.9 }),
    hedge: std({ color: "#46583a", map: grass, roughness: 1 }),
    water: std({ color: "#2c4650", roughness: 0.06, metalness: 1, envMapIntensity: 1.5 }),
    soil: std({ map: soil, alphaMap: mask, transparent: true, opacity: 0, roughness: 1, depthWrite: false }),
    lawn: std({ map: grass, color: "#74895a", alphaMap: mask, transparent: true, opacity: 0, roughness: 1, depthWrite: false }),
  };
}

export type Materials = ReturnType<typeof createMaterials>;
