import * as THREE from "three";
import { clamp01, easeInOut, Quality, remap, Track, Variant } from "./core";
import { buildBlueprint, buildHouse } from "./house";
import { buildLandscape } from "./landscape";
import { createMaterials } from "./materials";

export interface CameraKey {
  p: number;
  pos: [number, number, number];
  target: [number, number, number];
}

/** Кадры камеры: непрерывный облёт, без скачков между этапами. */
export const CAMERA_KEYS: CameraKey[] = [
  { p: 0, pos: [-21, 3, 47], target: [1, 6.4, 0] },
  { p: 0.11, pos: [-17, 7, 38], target: [0, 3, 0] },
  { p: 0.25, pos: [-6, 7.5, 34], target: [-1, 3.4, 0] },
  { p: 0.4, pos: [15, 5.4, 34], target: [0, 4.2, 0] },
  { p: 0.52, pos: [30, 6.5, 26], target: [1, 5.2, 0] },
  { p: 0.65, pos: [33, 12.5, 16], target: [1, 6.6, 0] },
  { p: 0.77, pos: [19, 4, 33], target: [3, 4.2, 2] },
  { p: 0.88, pos: [-9, 3.4, 37], target: [1, 4.3, 2] },
  { p: 1, pos: [-25, 2.3, 35], target: [0.5, 5, 1] },
];

const posCurve = new THREE.CatmullRomCurve3(CAMERA_KEYS.map((k) => new THREE.Vector3(...k.pos)), false, "centripetal");
const targetCurve = new THREE.CatmullRomCurve3(CAMERA_KEYS.map((k) => new THREE.Vector3(...k.target)), false, "centripetal");

export function cameraAt(p: number, position: THREE.Vector3, target: THREE.Vector3, aspect: number) {
  let i = 0;
  while (i < CAMERA_KEYS.length - 2 && p > CAMERA_KEYS[i + 1].p) i++;
  const a = CAMERA_KEYS[i].p;
  const b = CAMERA_KEYS[i + 1].p;
  const u = (i + easeInOut(remap(p, a, b)) * 0.55 + remap(p, a, b) * 0.45) / (CAMERA_KEYS.length - 1);
  posCurve.getPoint(u, position);
  targetCurve.getPoint(u, target);
  // На узких экранах камера отходит назад, чтобы дом целиком оставался в кадре.
  const pull = aspect < 0.8 ? 2.2 : aspect < 1.2 ? 1.5 : aspect < 1.5 ? 1.12 : 1;
  if (pull !== 1) position.sub(target).multiplyScalar(pull).add(target);
  position.y = Math.max(position.y, 1.8);
}

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAG = /* glsl */ `
  uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float glow;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, 0.0, 1.0);
    vec3 c = mix(horizon, mid, smoothstep(0.0, 0.17, h));
    c = mix(c, top, smoothstep(0.13, 0.52, h));
    float s = max(dot(d, sunDir), 0.0);
    c += sunColor * (pow(s, 6.0) * 0.32 + pow(s, 90.0) * 0.8) * glow;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

const c = (hex: string) => new THREE.Color(hex);

const DAY = {
  top: c("#e4e2da"),
  mid: c("#ece8df"),
  horizon: c("#f3ece0"),
  fog: c("#ece6da"),
  sun: c("#ffe9cf"),
  hemiSky: c("#f4efe6"),
  hemiGround: c("#8a8166"),
  sunI: 3.6,
  hemiI: 0.72,
  env: 0.42,
};
const DUSK = {
  top: c("#272c3a"),
  mid: c("#7c6265"),
  horizon: c("#eaa56c"),
  fog: c("#b58766"),
  sun: c("#ffb27a"),
  hemiSky: c("#6a6f88"),
  hemiGround: c("#3f3429"),
  sunI: 1.5,
  hemiI: 0.5,
  env: 0.34,
};

export interface World {
  scene: THREE.Scene;
  update: (p: number) => void;
  setDrawing: (v: number) => void;
  setDuskOverride: (v: number | null) => void;
  dispose: () => void;
}

export function createWorld(renderer: THREE.WebGLRenderer, quality: Quality, variant: Variant = "main"): World {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(DAY.fog.clone(), 70, 400);
  const track = new Track();
  const m = createMaterials(quality, variant);

  /* Небо */
  const skyUniforms = {
    top: { value: DAY.top.clone() },
    mid: { value: DAY.mid.clone() },
    horizon: { value: DAY.horizon.clone() },
    sunDir: { value: new THREE.Vector3(-0.6, 0.3, 0.3).normalize() },
    sunColor: { value: DUSK.sun.clone() },
    glow: { value: 0 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(430, 32, 16),
    new THREE.ShaderMaterial({ uniforms: skyUniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false }),
  );
  sky.name = "sky";
  scene.add(sky);

  /* Окружение для отражений в стекле и металле, без внешних HDR-файлов */
  const envScene = new THREE.Scene();
  envScene.background = c("#b9b4a8");
  const stripe = (color: string, y: number, h: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(40, h, 40), new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }));
    mesh.position.y = y;
    envScene.add(mesh);
  };
  stripe("#f6efe3", 12, 8);
  stripe("#55604a", -12, 8);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(envScene, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = DAY.env;

  /* Свет */
  const hemi = new THREE.HemisphereLight(DAY.hemiSky.clone(), DAY.hemiGround.clone(), DAY.hemiI);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(DAY.sun.clone(), DAY.sunI);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(quality === "high" ? 3072 : 1024);
  const s = sun.shadow.camera;
  s.left = -44;
  s.right = 44;
  s.top = 44;
  s.bottom = -44;
  s.near = 5;
  s.far = 200;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  const warm: THREE.PointLight[] = [];
  const spill: [number, number, number, number][] = [
    [-4.5, 2.3, 7.2, 34],
    [4.8, 2.3, 7.2, 22],
    [3.5, 5.5, 8.8, 30],
    [1.1, 1.2, 9, 12],
  ];
  if (quality === "high") {
    for (const [x, y, z] of spill) {
      const light = new THREE.PointLight("#ffbe82", 0, 18, 1.8);
      light.position.set(x, y, z);
      scene.add(light);
      warm.push(light);
    }
  }

  /* Модель */
  const root = new THREE.Group();
  root.name = "FORMA_house";
  scene.add(root);
  const { groups } = buildHouse(root, track, m, quality);
  buildLandscape(root, track, m, quality, variant);

  /* Контур будущего дома */
  const blueprint = buildBlueprint();
  const blueprintMat = new THREE.LineBasicMaterial({ color: "#20211f", transparent: true, opacity: 0.62, fog: false });
  const lines = new THREE.LineSegments(blueprint.geometry, blueprintMat);
  lines.name = "blueprint";
  lines.frustumCulled = false;
  scene.add(lines);
  let drawing = 1;
  const setDrawing = (v: number) => {
    drawing = v;
    const n = Math.floor((blueprint.vertexCount * clamp01(v)) / 2) * 2;
    blueprint.geometry.setDrawRange(0, n);
  };

  // Колонны меняют материал: сырой бетон уходит в тёмный металл на этапе фасада.
  const raw = m.column.color.clone();
  const finished = c("#1b1c1e");
  track.add(0.8, 0.875, (t) => {
    m.column.color.lerpColors(raw, finished, t);
    m.column.metalness = t * 0.8;
    m.column.roughness = 0.85 - t * 0.42;
  });

  let duskOverride: number | null = null;
  const lastGlass = { v: -1 };
  const allGlass: THREE.MeshStandardMaterial[] = [];
  groups.windows.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && (mesh.material as THREE.MeshStandardMaterial).opacity < 1 && mesh.geometry) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.roughness < 0.1) allGlass.push(mat);
    }
  });

  const sunPos = new THREE.Vector3();
  const update = (p: number) => {
    track.update(p);

    // Контур растворяется, когда начинается реальная стройка.
    const fade = 1 - remap(p, 0.055, 0.125);
    lines.visible = fade > 0 && drawing > 0;
    blueprintMat.opacity = 0.62 * fade;

    const d = duskOverride ?? easeInOut(remap(p, 0.84, 0.985));
    skyUniforms.top.value.lerpColors(DAY.top, DUSK.top, d);
    skyUniforms.mid.value.lerpColors(DAY.mid, DUSK.mid, d);
    skyUniforms.horizon.value.lerpColors(DAY.horizon, DUSK.horizon, d);
    skyUniforms.glow.value = d;
    const fog = scene.fog as THREE.Fog;
    fog.color.lerpColors(DAY.fog, DUSK.fog, d);
    // Утренний туман над пустым участком рассеивается с началом стройки.
    const mist = 1 - easeInOut(remap(p, 0.06, 0.22));
    fog.near = 70 - mist * 34;
    fog.far = 400 - mist * 262;
    hemi.color.lerpColors(DAY.hemiSky, DUSK.hemiSky, d);
    hemi.groundColor.lerpColors(DAY.hemiGround, DUSK.hemiGround, d);
    hemi.intensity = THREE.MathUtils.lerp(DAY.hemiI, DUSK.hemiI, d);
    sun.color.lerpColors(DAY.sun, DUSK.sun, d);
    sun.intensity = THREE.MathUtils.lerp(DAY.sunI, DUSK.sunI, d);
    scene.environmentIntensity = THREE.MathUtils.lerp(DAY.env, DUSK.env, d);

    // Солнце опускается к горизонту слева от главного фасада.
    sunPos.set(THREE.MathUtils.lerp(-46, -92, d), THREE.MathUtils.lerp(58, 15, d), THREE.MathUtils.lerp(44, 26, d));
    sun.position.copy(sunPos);
    skyUniforms.sunDir.value.copy(sunPos).normalize();

    const lit = easeInOut(remap(d, 0.25, 0.95));
    m.plaster.emissiveIntensity = lit * 4.2;
    m.ceiling.emissiveIntensity = lit * 4.5;
    m.lamp.emissiveIntensity = lit * 5;
    warm.forEach((light, i) => (light.intensity = lit * spill[i][3]));
    // К вечеру стекло становится прозрачнее, и в окнах читается тёплый свет.
    if (p > 0.72 && lit !== lastGlass.v) {
      lastGlass.v = lit;
      for (const g of allGlass) g.opacity = 0.42 - lit * 0.26;
    }
  };

  return {
    scene,
    update,
    setDrawing,
    setDuskOverride: (v) => (duskOverride = v),
    dispose() {
      envTarget.dispose();
      pmrem.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
    },
  };
}
