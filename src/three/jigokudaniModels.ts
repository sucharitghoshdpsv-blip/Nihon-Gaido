import * as THREE from 'three';
import { ONSEN_POOL_RADIUS, MAX_ONSEN_RIPPLES, type OnsenRippleSlot } from '../utils/onsenRipple';
import { type JigokudaniMonumentId } from '../utils/shrineSceneConfig';

export interface JigokudaniTextureBundle {
  snowBump: THREE.CanvasTexture;
  rockMap: THREE.CanvasTexture;
  rockBump: THREE.CanvasTexture;
  steamMap: THREE.CanvasTexture;
  snowflakeMap: THREE.CanvasTexture;
  woodBump: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
}

export interface JigokudaniSteamSystem {
  mesh: THREE.InstancedMesh;
  material: THREE.MeshBasicMaterial;
  alphaAttr: THREE.InstancedBufferAttribute;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  age: Float32Array;
  life: Float32Array;
  speedY: Float32Array;
  driftPhase: Float32Array;
  baseScale: Float32Array;
  warmth: Float32Array;
  dummy: THREE.Object3D;
  colorScratch: THREE.Color;
  amberColor: THREE.Color;
  coolColor: THREE.Color;
}

export interface JigokudaniSnowSystem {
  points: THREE.Points;
  material: THREE.PointsMaterial;
  baseX: Float32Array;
  baseY: Float32Array;
  baseZ: Float32Array;
  phases: Float32Array;
  speeds: Float32Array;
}

export interface JigokudaniSceneHandle {
  group: THREE.Group;
  waterMesh: THREE.Mesh;
  waterMaterial: THREE.MeshPhysicalMaterial;
  steamSystem: JigokudaniSteamSystem;
  snowSystem: JigokudaniSnowSystem;
  pourStream: THREE.Mesh;
  lanternLights: THREE.PointLight[];
  poolAmberLight: THREE.PointLight;
  lanternEmissiveMat: THREE.MeshStandardMaterial;
  textures: JigokudaniTextureBundle;
  updateRipples: (slots: OnsenRippleSlot[], elapsedSec: number) => void;
  spawnSteamBurst: (worldX: number, worldZ: number) => void;
  updateFrame: (
    dt: number,
    elapsedSec: number,
    camera: THREE.Camera,
    lanternIntensity: number,
    amberHex: number,
    particleHex: number
  ) => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Deterministic organic pool rim radius & ravine terrain elevation so every rock,
 * pine trunk, lantern, snowbank, and bamboo spout sits flush on the terrain surface.
 */
export function poolRimRadiusAtAngle(theta: number): number {
  return (
    ONSEN_POOL_RADIUS +
    0.42 * Math.sin(theta * 2.0 + 0.5) +
    0.26 * Math.cos(theta * 3.0 - 0.8)
  );
}

export function terrainHeightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const theta = Math.atan2(z, x);
  const rimR = poolRimRadiusAtAngle(theta);

  // Smoothly carved geothermal basin inside the stone rim
  if (r < rimR - 0.5) {
    const t = r / Math.max(0.5, rimR - 0.5);
    return -0.78 + t * t * 0.48;
  }
  if (r < rimR + 1.1) {
    const edgeT = (r - (rimR - 0.5)) / 1.6;
    const smooth = edgeT * edgeT * (3 - 2 * edgeT);
    return -0.3 + smooth * 0.62;
  }

  // Soft snow-blanketed valley floor transitioning smoothly into rugged ravine walls
  let h = 0.32 + Math.sin(x * 0.24 + 0.6) * Math.cos(z * 0.22 - 0.3) * 0.22;

  // Steep back (-Z) & side (+/-X) mountain ravine walls, keeping front-right (+X,+Z) open for camera vista
  const wallStartZ = -5.5;
  if (z < wallStartZ) {
    const dz = wallStartZ - z;
    const ridgeNoise =
      1.0 + 0.28 * Math.sin(x * 0.35 + z * 0.25) + 0.16 * Math.cos(x * 0.72 - z * 0.4);
    h += Math.pow(dz, 1.32) * 0.38 * ridgeNoise;
  }

  // Flanking ravine slopes
  const sideDist = Math.abs(x) - 8.2;
  const frontMask = z > 4.5 ? Math.max(0.18, 1.0 - (z - 4.5) * 0.08) : 1.0;
  if (sideDist > 0) {
    const flankNoise = 1.0 + 0.24 * Math.sin(z * 0.38 + x * 0.28);
    h += Math.pow(sideDist, 1.24) * 0.32 * flankNoise * frontMask;
  }

  return Math.min(18.0, h);
}

function createJigokudaniTextures(maxAnisotropy: number): JigokudaniTextureBundle {
  const rand = seededRand(4219);

  // 1. Soft Sparkle Snow Micro-Relief Bump Map
  const [snowCanvas, sCtx] = makeCanvas(256, 256);
  sCtx.fillStyle = '#808080';
  sCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2400; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const rad = 1 + rand() * 3.5;
    const v = Math.floor(96 + rand() * 88);
    sCtx.fillStyle = `rgba(${v},${v},${v},0.35)`;
    sCtx.beginPath();
    sCtx.arc(x, y, rad, 0, Math.PI * 2);
    sCtx.fill();
  }
  const snowBump = new THREE.CanvasTexture(snowCanvas);
  snowBump.wrapS = THREE.RepeatWrapping;
  snowBump.wrapT = THREE.RepeatWrapping;
  snowBump.repeat.set(14, 14);
  snowBump.anisotropy = maxAnisotropy;

  // 2. Dark Volcanic Andesite/Basalt Rock Map + Bump (512x512 crisp grain, tiled)
  const [rockCanvas, rCtx] = makeCanvas(512, 512);
  rCtx.fillStyle = '#22262e';
  rCtx.fillRect(0, 0, 512, 512);
  const [rockBumpCanvas, rbCtx] = makeCanvas(512, 512);
  rbCtx.fillStyle = '#808080';
  rbCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6500; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const sz = 1 + rand() * 2.2;
    const v = Math.floor(24 + rand() * 38);
    rCtx.fillStyle = `rgb(${v}, ${v + 3}, ${v + 7})`;
    rCtx.fillRect(x, y, sz, sz);
    const bv = Math.floor(55 + rand() * 145);
    rbCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    rbCtx.fillRect(x, y, sz, sz);
  }
  // Subtle stratified volcanic mineral fissures
  for (let i = 0; i < 64; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 8 + rand() * 22;
    const grad = rCtx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(92, 84, 72, 0.22)');
    grad.addColorStop(1, 'rgba(92, 84, 72, 0)');
    rCtx.fillStyle = grad;
    rCtx.beginPath();
    rCtx.arc(x, y, r, 0, Math.PI * 2);
    rCtx.fill();
  }

  const rockMap = new THREE.CanvasTexture(rockCanvas);
  rockMap.colorSpace = THREE.SRGBColorSpace;
  rockMap.wrapS = THREE.RepeatWrapping;
  rockMap.wrapT = THREE.RepeatWrapping;
  rockMap.repeat.set(3, 3);
  rockMap.anisotropy = maxAnisotropy;

  const rockBump = new THREE.CanvasTexture(rockBumpCanvas);
  rockBump.wrapS = THREE.RepeatWrapping;
  rockBump.wrapT = THREE.RepeatWrapping;
  rockBump.repeat.set(3, 3);
  rockBump.anisotropy = maxAnisotropy;

  // 3. Soft Lush Billowing Steam Cloud Sprite (no hard box edges)
  const [steamCanvas, stCtx] = makeCanvas(256, 256);
  stCtx.clearRect(0, 0, 256, 256);
  const lobes = [
    { x: 128, y: 128, r: 98, a: 0.86 },
    { x: 94, y: 120, r: 70, a: 0.68 },
    { x: 162, y: 122, r: 66, a: 0.66 },
    { x: 124, y: 158, r: 64, a: 0.60 },
    { x: 132, y: 92, r: 60, a: 0.58 },
  ];
  for (const lobe of lobes) {
    const grad = stCtx.createRadialGradient(lobe.x, lobe.y, 6, lobe.x, lobe.y, lobe.r);
    grad.addColorStop(0, `rgba(255, 252, 246, ${lobe.a})`);
    grad.addColorStop(0.5, `rgba(255, 248, 240, ${lobe.a * 0.52})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    stCtx.fillStyle = grad;
    stCtx.beginPath();
    stCtx.arc(lobe.x, lobe.y, lobe.r, 0, Math.PI * 2);
    stCtx.fill();
  }
  const steamMap = new THREE.CanvasTexture(steamCanvas);
  steamMap.colorSpace = THREE.SRGBColorSpace;

  // 4. Delicate Winter Snowflake Sprite
  const [flakeCanvas, flCtx] = makeCanvas(64, 64);
  const flGrad = flCtx.createRadialGradient(32, 32, 2, 32, 32, 28);
  flGrad.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
  flGrad.addColorStop(0.45, 'rgba(225, 240, 255, 0.65)');
  flGrad.addColorStop(1, 'rgba(225, 240, 255, 0)');
  flCtx.fillStyle = flGrad;
  flCtx.fillRect(0, 0, 64, 64);
  const snowflakeMap = new THREE.CanvasTexture(flakeCanvas);
  snowflakeMap.colorSpace = THREE.SRGBColorSpace;

  // 5. Cedar / Hinoki Wood Bump
  const [woodCanvas, wCtx] = makeCanvas(128, 128);
  wCtx.fillStyle = '#808080';
  wCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 90; i++) {
    const x = rand() * 128;
    wCtx.fillStyle = rand() > 0.5 ? 'rgba(40,40,40,0.35)' : 'rgba(215,215,215,0.28)';
    wCtx.fillRect(x, 0, 1 + rand() * 2, 128);
  }
  const woodBump = new THREE.CanvasTexture(woodCanvas);
  woodBump.wrapS = THREE.RepeatWrapping;
  woodBump.wrapT = THREE.RepeatWrapping;

  // 6. Contact Shadow Disc
  const [shadowCanvas, shCtx] = makeCanvas(128, 128);
  const shGrad = shCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
  shGrad.addColorStop(0, 'rgba(6, 10, 20, 0.65)');
  shGrad.addColorStop(0.55, 'rgba(6, 10, 20, 0.28)');
  shGrad.addColorStop(1, 'rgba(6, 10, 20, 0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);

  return {
    snowBump,
    rockMap,
    rockBump,
    steamMap,
    snowflakeMap,
    woodBump,
    contactShadowMap,
  };
}

function attachCollider(
  group: THREE.Group,
  size: [number, number, number],
  centerY: number,
  monumentId: JigokudaniMonumentId
) {
  const colliderGeo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const colliderMat = new THREE.MeshBasicMaterial({ visible: false });
  const collider = new THREE.Mesh(colliderGeo, colliderMat);
  collider.position.set(0, centerY, 0);
  collider.layers.set(1);
  collider.userData.monumentId = monumentId;
  group.add(collider);
}

/**
 * Builds rugged Jigokudani snow-blanketed mountain ravine with exposed dark basalt cliffs
 * around steep ridges and a recessed hot-spring basin in the center.
 */
function buildRavineTerrain(
  textures: JigokudaniTextureBundle,
  basaltMat: THREE.MeshStandardMaterial
): THREE.Group {
  const group = new THREE.Group();

  // Detailed active ravine terrain mesh (84x84m sculpted ridges + basin)
  const size = 86;
  const segs = 112;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const snowCol = new THREE.Color(0xeef5ff);
  const shadowSnowCol = new THREE.Color(0xc9dcf2);
  const rockCol = new THREE.Color(0x232933);
  const basinFloorCol = new THREE.Color(0x1f363c);
  const tmpCol = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = terrainHeightAt(x, z);
    pos.setY(i, y);
  }
  geo.computeVertexNormals();

  const norms = geo.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = norms.getY(i); // 1 = flat, < 0.72 = steep cliff face
    const r = Math.hypot(x, z);

    if (y < 0.06 && r < 6.4) {
      tmpCol.copy(basinFloorCol);
    } else if (ny < 0.74) {
      // Exposed dark volcanic basalt on steep ravine walls with snow dusting near gentler ledges
      const snowBlend = THREE.MathUtils.smoothstep(ny, 0.42, 0.76);
      tmpCol.copy(rockCol).lerp(shadowSnowCol, snowBlend * 0.85);
    } else {
      // Soft twilight blue-white snow with subtle height variation
      const driftTint = THREE.MathUtils.clamp((y - 0.3) * 0.14, 0, 1);
      tmpCol.copy(shadowSnowCol).lerp(snowCol, 0.55 + driftTint * 0.45);
    }

    colors[i * 3] = tmpCol.r;
    colors[i * 3 + 1] = tmpCol.g;
    colors[i * 3 + 2] = tmpCol.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    bumpMap: textures.snowBump,
    bumpScale: 0.035,
    roughness: 0.88,
    metalness: 0.02,
  });

  const terrainMesh = new THREE.Mesh(geo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  // Far horizon winter snow skirt merging seamlessly into FogExp2
  const farSkirt = new THREE.Mesh(
    new THREE.RingGeometry(40, 125, 48),
    new THREE.MeshStandardMaterial({
      color: 0xbdd1e8,
      roughness: 0.94,
      metalness: 0.0,
    })
  );
  farSkirt.rotation.x = -Math.PI / 2;
  farSkirt.position.y = 0.28;
  group.add(farSkirt);

  // Angular sculpted volcanic basalt cliff strata jutting from back & flank ravine ridges
  const rand = seededRand(8831);
  const cliffCoords: Array<[number, number, number, number, number]> = [
    [-11.2, -10.4, 3.6, 5.8, 0.35],
    [-4.8, -11.8, 4.2, 6.8, -0.22],
    [1.8, -12.6, 4.6, 7.6, 0.18],
    [8.2, -11.0, 3.9, 6.2, -0.35],
    [12.4, -6.8, 3.4, 4.8, 0.42],
    [-13.2, -3.8, 3.8, 5.2, -0.28],
    [-12.6, 3.2, 2.9, 3.6, 0.2],
  ];

  const snowCapMat = new THREE.MeshStandardMaterial({
    color: 0xe6f0fc,
    bumpMap: textures.snowBump,
    bumpScale: 0.025,
    roughness: 0.9,
    metalness: 0.01,
  });

  for (const [cx, cz, sx, sy, rot] of cliffCoords) {
    const baseY = terrainHeightAt(cx, cz) - 1.1;
    // Craggy tapered basalt column ridge (6-sided angular spire, not spherical balls!)
    const spireGeo = new THREE.CylinderGeometry(sx * 0.34, sx * 0.98, sy, 6);
    const spire = new THREE.Mesh(spireGeo, basaltMat);
    spire.position.set(cx, baseY + sy * 0.45, cz);
    spire.scale.set(1.18, 1.0, 0.78 + rand() * 0.22);
    spire.rotation.set((rand() - 0.5) * 0.14, rot, (rand() - 0.5) * 0.16);
    spire.castShadow = true;
    spire.receiveShadow = true;
    group.add(spire);

    // Secondary jagged basalt shoulder
    const shoulder = new THREE.Mesh(
      new THREE.CylinderGeometry(sx * 0.2, sx * 0.65, sy * 0.65, 5),
      basaltMat
    );
    shoulder.position.set(cx + (rand() - 0.5) * 1.4, baseY + sy * 0.28, cz + 0.75);
    shoulder.rotation.set(0.12, rot + 0.8, -0.15);
    shoulder.castShadow = true;
    shoulder.receiveShadow = true;
    group.add(shoulder);

    // Crisp faceted snow cornice crowning ridge peak
    const cap = new THREE.Mesh(new THREE.ConeGeometry(sx * 0.46, sy * 0.28, 6), snowCapMat);
    cap.position.set(cx, baseY + sy * 0.94, cz);
    cap.scale.set(1.12, 1.0, 0.78);
    cap.rotation.y = rot;
    cap.receiveShadow = true;
    group.add(cap);
  }

  return group;
}

/**
 * Interactive Onsen mineral pool with MeshPhysicalMaterial + onBeforeCompile multi-ripple displacement
 * and dynamic perturbed normals so click ripples catch twilight sky and amber lantern highlights.
 */
function buildInteractiveOnsenPool(
  waterUniforms: {
    uTime: { value: number };
    uRipples: { value: THREE.Vector4[] };
  }
): {
  mesh: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
} {
  const geo = new THREE.PlaneGeometry(11.6, 11.6, 72, 72);
  geo.rotateX(-Math.PI / 2);

  const material = new THREE.MeshPhysicalMaterial({
    color: 0x265f68,
    emissive: new THREE.Color(0x162b30),
    emissiveIntensity: 0.45,
    roughness: 0.11,
    metalness: 0.04,
    clearcoat: 0.92,
    clearcoatRoughness: 0.08,
    reflectivity: 0.9,
    transparent: true,
    opacity: 0.88,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime;
    shader.uniforms.uRipples = waterUniforms.uRipples;

    const ripplePrelude = `
      uniform float uTime;
      uniform vec4 uRipples[${MAX_ONSEN_RIPPLES}];

      float evalRippleHeight(vec2 xz) {
        float h = sin(xz.x * 1.45 + uTime * 0.95) * cos(xz.y * 1.35 - uTime * 0.72) * 0.011;
        h += sin((xz.x + xz.y) * 2.1 - uTime * 1.3) * 0.006;
        for (int i = 0; i < ${MAX_ONSEN_RIPPLES}; i++) {
          vec4 rp = uRipples[i];
          if (rp.z > -50.0) {
            float age = uTime - rp.z;
            if (age >= 0.0 && age < 4.6) {
              float dist = length(xz - rp.xy);
              float waveFront = age * 2.4;
              float ringDelta = dist - waveFront;
              float env = exp(-dist * 0.36) * exp(-age * 0.85) * exp(-(ringDelta * ringDelta) * 0.8);
              h += sin(dist * 7.5 - age * 11.5) * 0.088 * rp.w * env;
            }
          }
        }
        return h;
      }
    `;

    shader.vertexShader =
      `varying vec3 vWaterLocalPos;\nvarying float vWaveHeight;\n${ripplePrelude}\n` +
      shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `
      #include <beginnormal_vertex>
      float hCenter = evalRippleHeight(position.xz);
      float eps = 0.08;
      float hRight = evalRippleHeight(position.xz + vec2(eps, 0.0));
      float hForward = evalRippleHeight(position.xz + vec2(0.0, eps));
      objectNormal = normalize(vec3(hCenter - hRight, eps, hCenter - hForward));
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      transformed.y += hCenter;
      vWaterLocalPos = transformed;
      vWaveHeight = hCenter;
      `
    );

    shader.fragmentShader =
      `varying vec3 vWaterLocalPos;\nvarying float vWaveHeight;\n` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `
      #include <emissivemap_fragment>
      float crest = smoothstep(0.015, 0.075, abs(vWaveHeight));
      float rPool = length(vWaterLocalPos.xz);
      float centerGlow = exp(-rPool * 0.28);
      totalEmissiveRadiance += vec3(0.42, 0.24, 0.09) * centerGlow * 0.32;
      totalEmissiveRadiance += vec3(0.55, 0.78, 0.88) * crest * 0.65;
      `
    );
  };

  const waterMesh = new THREE.Mesh(geo, material);
  waterMesh.position.set(0, 0.08, 0);
  waterMesh.receiveShadow = true;
  waterMesh.layers.enable(1); // Directly raycastable at exact click point!
  waterMesh.userData.monumentId = 'onsen_pool';

  return { mesh: waterMesh, material };
}

/**
 * Dark volcanic basalt boulder ring & snow-dusted coping stones seated around the organic shoreline.
 */
function buildVolcanicRockRim(
  textures: JigokudaniTextureBundle,
  basaltMat: THREE.MeshStandardMaterial
): THREE.Group {
  const group = new THREE.Group();
  group.userData.monumentId = 'volcanic_rock';

  const snowCapMat = new THREE.MeshStandardMaterial({
    color: 0xebf3ff,
    bumpMap: textures.snowBump,
    bumpScale: 0.025,
    roughness: 0.9,
    metalness: 0.01,
  });
  const wetBasaltMat = new THREE.MeshStandardMaterial({
    color: 0x3b424c,
    map: textures.rockMap,
    bumpMap: textures.rockBump,
    bumpScale: 0.055,
    roughness: 0.58,
    metalness: 0.03,
  });

  const rand = seededRand(5123);
  const boulderCount = 28;

  for (let i = 0; i < boulderCount; i++) {
    const theta = (i / boulderCount) * Math.PI * 2 + (rand() - 0.5) * 0.1;
    const rimR = poolRimRadiusAtAngle(theta) + (rand() - 0.5) * 0.38;
    const bx = Math.cos(theta) * rimR;
    const bz = Math.sin(theta) * rimR;
    const radius = 0.62 + rand() * 0.48;
    const yGround = terrainHeightAt(bx, bz);

    const boulderCluster = new THREE.Group();
    boulderCluster.position.set(bx, Math.max(-0.08, yGround - 0.14), bz);
    boulderCluster.rotation.y = rand() * Math.PI * 2;

    // Flat-topped angular volcanic coping rock kissing the steaming shoreline
    const rockBody = new THREE.Mesh(
      new THREE.DodecahedronGeometry(radius, 0),
      i % 2 === 0 ? basaltMat : wetBasaltMat
    );
    rockBody.scale.set(1.24, 0.52 + rand() * 0.16, 0.96);
    rockBody.position.y = radius * 0.25;
    rockBody.castShadow = true;
    rockBody.receiveShadow = true;
    boulderCluster.add(rockBody);

    if (i % 3 === 0) {
      const subRock = new THREE.Mesh(new THREE.DodecahedronGeometry(radius * 0.58, 0), basaltMat);
      subRock.position.set(radius * 0.62, radius * 0.14, 0.16);
      subRock.scale.set(1.05, 0.48, 0.88);
      subRock.castShadow = true;
      subRock.receiveShadow = true;
      boulderCluster.add(subRock);
    }

    // Soft snow cushion dusting the outer stone rim
    if (rand() > 0.28) {
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 0.68, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.36),
        snowCapMat
      );
      cap.position.y = radius * 0.32;
      cap.scale.set(1.08, 0.38, 0.86);
      cap.receiveShadow = true;
      boulderCluster.add(cap);
    }

    group.add(boulderCluster);
  }

  // Flagship overlook volcanic rock outcrop on right foreground (+X,+Z rim) for easy clicking
  attachCollider(group, [3.2, 1.8, 3.2], 0.7, 'volcanic_rock');
  group.children[group.children.length - 1].position.set(4.8, 0.6, 2.2);

  return group;
}

/**
 * Composite frost-tipped evergreen pines (trunk + 4 spruce bough tiers + 4 snow-frosted mantles)
 * placed strictly along ridges & perimeter flanks so the onsen pool view stays crystal clear.
 */
function buildFrostTippedPines(textures: JigokudaniTextureBundle): THREE.Group {
  const group = new THREE.Group();
  group.userData.monumentId = 'frost_pines';

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x3b2a20,
    bumpMap: textures.woodBump,
    bumpScale: 0.03,
    roughness: 0.88,
    metalness: 0.02,
  });
  const pineNeedleMat = new THREE.MeshStandardMaterial({
    color: 0x1d3b32,
    roughness: 0.85,
    metalness: 0.02,
  });
  const frostNeedleMat = new THREE.MeshStandardMaterial({
    color: 0xddeaf8,
    bumpMap: textures.snowBump,
    bumpScale: 0.02,
    roughness: 0.9,
    metalness: 0.01,
  });
  const contactMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowMap,
    transparent: true,
    depthWrite: false,
    opacity: 0.58,
  });

  const treeCoords: Array<[number, number, number]> = [
    [-8.4, -5.2, 1.18],
    [-10.2, -1.8, 1.05],
    [-9.2, 2.2, 0.95],
    [-7.5, -7.8, 1.32],
    [-3.6, -8.4, 1.24],
    [0.8, -8.9, 1.35],
    [5.2, -8.2, 1.2],
    [8.8, -6.5, 1.15],
    [10.2, -2.4, 1.04],
    [9.4, 2.1, 0.92],
    [-12.4, -7.2, 1.3],
    [-5.8, -12.6, 1.42],
    [3.8, -12.8, 1.38],
    [12.0, -9.2, 1.26],
    [-13.5, 0.6, 1.12],
    [13.4, -0.5, 1.08],
    [-6.6, 7.6, 0.88],
  ];

  const rand = seededRand(6421);

  for (const [tx, tz, scale] of treeCoords) {
    const ty = terrainHeightAt(tx, tz);
    const tree = new THREE.Group();
    tree.position.set(tx, ty - 0.12, tz);
    tree.scale.setScalar(scale * (0.94 + rand() * 0.14));
    tree.rotation.y = rand() * Math.PI * 2;

    // 1. Contact shadow beneath trunk
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), contactMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.15;
    tree.add(shadow);

    // 2. Tapering pine trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 2.2, 8), trunkMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    // 3. Four tiered spruce foliage cones + frost-tipped snow mantles perched on each tier
    const tiers = [
      { r: 1.55, h: 1.45, y: 1.95 },
      { r: 1.26, h: 1.35, y: 2.85 },
      { r: 0.94, h: 1.2, y: 3.7 },
      { r: 0.58, h: 0.95, y: 4.45 },
    ];

    for (const tier of tiers) {
      const foliage = new THREE.Mesh(new THREE.ConeGeometry(tier.r, tier.h, 8), pineNeedleMat);
      foliage.position.y = tier.y;
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      tree.add(foliage);

      // Frost-tipped upper snow cap offset slightly up along each pine bough cone
      const frostCap = new THREE.Mesh(
        new THREE.ConeGeometry(tier.r * 0.86, tier.h * 0.62, 8),
        frostNeedleMat
      );
      frostCap.position.y = tier.y + tier.h * 0.22;
      frostCap.rotation.y = 0.22;
      frostCap.receiveShadow = true;
      tree.add(frostCap);
    }

    group.add(tree);
  }

  // Clickable proxy on pine ridge (-8.4, -5.2)
  const collider = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 5.5, 4.4),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  collider.position.set(-8.6, terrainHeightAt(-8.6, -4.5) + 2.5, -4.5);
  collider.layers.set(1);
  collider.userData.monumentId = 'frost_pines';
  group.add(collider);

  return group;
}

/**
 * Builds traditional Kakehi bamboo thermal water spout + cedar deck shelf + hinoki bath bucket,
 * plus two glowing snow-capped stone Yukimi lanterns casting warm amber light on the steam.
 */
function buildKakehiAndLanterns(
  textures: JigokudaniTextureBundle,
  basaltMat: THREE.MeshStandardMaterial
): {
  group: THREE.Group;
  pourStream: THREE.Mesh;
  lanternLights: THREE.PointLight[];
  lanternEmissiveMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();

  const cedarMat = new THREE.MeshStandardMaterial({
    color: 0x8d633d,
    bumpMap: textures.woodBump,
    bumpScale: 0.03,
    roughness: 0.68,
    metalness: 0.04,
  });
  const bambooMat = new THREE.MeshStandardMaterial({
    color: 0x72834b,
    roughness: 0.48,
    metalness: 0.04,
  });
  const copperBandMat = new THREE.MeshStandardMaterial({
    color: 0xb87333,
    roughness: 0.3,
    metalness: 0.85,
  });
  const snowCapMat = new THREE.MeshStandardMaterial({
    color: 0xeef5ff,
    bumpMap: textures.snowBump,
    bumpScale: 0.025,
    roughness: 0.9,
  });
  const lanternEmissiveMat = new THREE.MeshStandardMaterial({
    color: 0xffe4ad,
    emissive: new THREE.Color(0xff9636),
    emissiveIntensity: 2.6,
    roughness: 0.35,
  });

  // 1. Kakehi Bamboo Spout on North-West basalt shelf
  const spoutGroup = new THREE.Group();
  spoutGroup.position.set(-3.1, 0.25, -3.1);
  spoutGroup.rotation.y = Math.PI * 0.24;

  const pedestalRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 1), basaltMat);
  pedestalRock.scale.set(1.1, 0.78, 0.95);
  pedestalRock.position.set(0, 0.32, -0.45);
  pedestalRock.castShadow = true;
  pedestalRock.receiveShadow = true;
  spoutGroup.add(pedestalRock);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.25, 10), bambooMat);
  post.position.set(0, 0.85, -0.5);
  post.castShadow = true;
  spoutGroup.add(post);

  const spoutPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 1.55, 10), bambooMat);
  spoutPipe.rotation.x = Math.PI * 0.44;
  spoutPipe.position.set(0, 1.22, 0.12);
  spoutPipe.castShadow = true;
  spoutGroup.add(spoutPipe);

  for (const bz of [-0.25, 0.25, 0.65]) {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.014, 6, 14), copperBandMat);
    collar.position.set(0, 1.25 - bz * 0.16, bz);
    spoutGroup.add(collar);
  }

  // Animated cascading water pour stream falling into the hot spring pool
  const streamMat = new THREE.MeshPhysicalMaterial({
    color: 0xa4e2eb,
    emissive: new THREE.Color(0x4a7b84),
    emissiveIntensity: 0.35,
    roughness: 0.12,
    transparent: true,
    opacity: 0.78,
  });
  const pourStream = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.068, 1.05, 10), streamMat);
  pourStream.position.set(0, 0.56, 0.86);
  spoutGroup.add(pourStream);

  // Small weathered cedar bath plank + hinoki bucket + folded white towel
  const bathDeck = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.14, 0.9), cedarMat);
  bathDeck.position.set(-1.35, 0.2, 0.65);
  bathDeck.castShadow = true;
  bathDeck.receiveShadow = true;
  spoutGroup.add(bathDeck);

  const bucketBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.15, 0.18, 14, 1, true),
    cedarMat
  );
  bucketBody.position.set(-1.15, 0.36, 0.65);
  spoutGroup.add(bucketBody);

  const towel = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.06, 0.19),
    new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.92 })
  );
  towel.position.set(-1.62, 0.3, 0.72);
  spoutGroup.add(towel);

  attachCollider(spoutGroup, [2.8, 2.0, 2.4], 0.9, 'kakehi_spout');
  group.add(spoutGroup);

  // 2. Two Snow-Dusted Yukimi Onsen Lanterns casting warm amber twilight contrast
  const lanternLights: THREE.PointLight[] = [];
  const lanternSpots: Array<[number, number]> = [
    [-4.9, 1.8],
    [4.4, -2.5],
  ];

  for (const [lx, lz] of lanternSpots) {
    const ly = Math.max(0.28, terrainHeightAt(lx, lz));
    const lantern = new THREE.Group();
    lantern.position.set(lx, ly + 0.18, lz);

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.54, 0.26, 6), basaltMat);
    plinth.position.y = -0.05;
    lantern.add(plinth);

    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 0.52, 4), basaltMat);
    legs.position.y = 0.32;
    legs.rotation.y = Math.PI / 4;
    lantern.add(legs);

    const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.14, 6), basaltMat);
    basePlate.position.y = 0.62;
    lantern.add(basePlate);

    const firebox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.38, 6),
      lanternEmissiveMat
    );
    firebox.position.y = 0.88;
    lantern.add(firebox);

    const umbrellaRoof = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.3, 6), basaltMat);
    umbrellaRoof.position.y = 1.18;
    umbrellaRoof.castShadow = true;
    lantern.add(umbrellaRoof);

    const roofSnow = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.2, 6), snowCapMat);
    roofSnow.position.y = 1.24;
    lantern.add(roofSnow);

    const pLight = new THREE.PointLight(0xff9b38, 7.6, 13.5, 1.35);
    pLight.position.set(0, 0.92, 0);
    lantern.add(pLight);
    lanternLights.push(pLight);

    group.add(lantern);
  }

  return { group, pourStream, lanternLights, lanternEmissiveMat };
}

/**
 * Instanced softly billowing steam clouds rising from the hot spring, transitioning
 * smoothly from warm amber glow at the water surface to cool twilight mist higher up.
 */
function buildSteamSystem(textures: JigokudaniTextureBundle): JigokudaniSteamSystem {
  const count = 84;
  const geo = new THREE.PlaneGeometry(1, 1);

  const alphas = new Float32Array(count);
  const alphaAttr = new THREE.InstancedBufferAttribute(alphas, 1);
  alphaAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aSteamAlpha', alphaAttr);

  const material = new THREE.MeshBasicMaterial({
    map: textures.steamMap,
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
    fog: true,
  });

  material.onBeforeCompile = (shader) => {
    shader.vertexShader =
      `attribute float aSteamAlpha;\nvarying float vSteamAlpha;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vSteamAlpha = aSteamAlpha;
      `
    );
    shader.fragmentShader = `varying float vSteamAlpha;\n` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>
      gl_FragColor.a *= vSteamAlpha;
      `
    );
  };

  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.frustumCulled = false;

  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const z = new Float32Array(count);
  const age = new Float32Array(count);
  const life = new Float32Array(count);
  const speedY = new Float32Array(count);
  const driftPhase = new Float32Array(count);
  const baseScale = new Float32Array(count);
  const warmth = new Float32Array(count);
  const dummy = new THREE.Object3D();
  const colorScratch = new THREE.Color();
  const amberColor = new THREE.Color(0xff9b38);
  const coolColor = new THREE.Color(0xd2e4f8);
  const rand = seededRand(9142);

  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand()) * (ONSEN_POOL_RADIUS - 0.8);
    x[i] = Math.cos(angle) * rad;
    z[i] = Math.sin(angle) * rad;
    life[i] = 3.0 + rand() * 2.4;
    age[i] = rand() * life[i];
    speedY[i] = 0.45 + rand() * 0.4;
    y[i] = 0.2 + (age[i] / life[i]) * 2.2;
    driftPhase[i] = rand() * Math.PI * 2;
    baseScale[i] = 1.65 + rand() * 1.55;
    warmth[i] = 0.6 + rand() * 0.4;

    dummy.position.set(x[i], y[i], z[i]);
    dummy.scale.setScalar(baseScale[i]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, amberColor);
    alphas[i] = 0.65;
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();

  return {
    mesh,
    material,
    alphaAttr,
    x,
    y,
    z,
    age,
    life,
    speedY,
    driftPhase,
    baseScale,
    warmth,
    dummy,
    colorScratch,
    amberColor,
    coolColor,
  };
}

/**
 * Gentle drifting winter snowfall catching cool moonlight/twilight across the ravine.
 */
function buildSnowSystem(textures: JigokudaniTextureBundle): JigokudaniSnowSystem {
  const count = 170;
  const positions = new Float32Array(count * 3);
  const baseX = new Float32Array(count);
  const baseY = new Float32Array(count);
  const baseZ = new Float32Array(count);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const rand = seededRand(3379);

  for (let i = 0; i < count; i++) {
    baseX[i] = (rand() - 0.5) * 26;
    baseY[i] = 0.8 + rand() * 11;
    baseZ[i] = (rand() - 0.5) * 26 - 1.5;
    phases[i] = rand() * Math.PI * 2;
    speeds[i] = 0.5 + rand() * 0.65;
    positions[i * 3] = baseX[i];
    positions[i * 3 + 1] = baseY[i];
    positions[i * 3 + 2] = baseZ[i];
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xf0f6ff,
    map: textures.snowflakeMap,
    size: 0.24,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;

  return { points, material, baseX, baseY, baseZ, phases, speeds };
}

export function buildJigokudaniBiome(maxAnisotropy: number): JigokudaniSceneHandle {
  const group = new THREE.Group();
  const textures = createJigokudaniTextures(maxAnisotropy);

  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.rockMap,
    bumpMap: textures.rockBump,
    bumpScale: 0.065,
    roughness: 0.84,
    metalness: 0.06,
  });

  const waterUniforms = {
    uTime: { value: 0 },
    uRipples: {
      value: Array.from({ length: MAX_ONSEN_RIPPLES }, () => new THREE.Vector4(0, 0, -100, 0)),
    },
  };

  const ravineTerrain = buildRavineTerrain(textures, basaltMat);
  group.add(ravineTerrain);

  const rockRim = buildVolcanicRockRim(textures, basaltMat);
  group.add(rockRim);

  const frostPines = buildFrostTippedPines(textures);
  group.add(frostPines);

  const { mesh: waterMesh, material: waterMaterial } = buildInteractiveOnsenPool(waterUniforms);
  group.add(waterMesh);

  const kakehi = buildKakehiAndLanterns(textures, basaltMat);
  group.add(kakehi.group);

  // Warm amber geothermal underglow centered right over the hot spring basin
  const poolAmberLight = new THREE.PointLight(0xffa648, 4.8, 13.5, 1.4);
  poolAmberLight.position.set(0, 1.25, 0);
  group.add(poolAmberLight);

  const steamSystem = buildSteamSystem(textures);
  group.add(steamSystem.mesh);

  const snowSystem = buildSnowSystem(textures);
  group.add(snowSystem.points);

  let nextBurstSlot = 0;

  const updateRipples = (slots: OnsenRippleSlot[], elapsedSec: number) => {
    waterUniforms.uTime.value = elapsedSec;
    for (let i = 0; i < MAX_ONSEN_RIPPLES; i++) {
      const slot = slots[i];
      waterUniforms.uRipples.value[i].set(slot.x, slot.z, slot.startTime, slot.amplitude);
    }
  };

  const spawnSteamBurst = (worldX: number, worldZ: number) => {
    // Redirect 8 steam puffs directly to click coordinates so splash steam rises immediately
    const count = steamSystem.x.length;
    for (let k = 0; k < 8; k++) {
      const idx = (nextBurstSlot + k) % count;
      const jitterAngle = (k / 8) * Math.PI * 2;
      steamSystem.x[idx] = worldX + Math.cos(jitterAngle) * 0.28;
      steamSystem.z[idx] = worldZ + Math.sin(jitterAngle) * 0.28;
      steamSystem.y[idx] = 0.16;
      steamSystem.age[idx] = 0.05;
      steamSystem.life[idx] = 2.6 + (k % 3) * 0.45;
      steamSystem.speedY[idx] = 0.95 + (k % 4) * 0.18;
      steamSystem.warmth[idx] = 0.95;
    }
    nextBurstSlot = (nextBurstSlot + 8) % count;
  };

  const updateFrame = (
    dt: number,
    elapsedSec: number,
    camera: THREE.Camera,
    lanternIntensity: number,
    amberHex: number,
    particleHex: number
  ) => {
    waterUniforms.uTime.value = elapsedSec;

    // Gentle flicker on snow lanterns & amber geothermal steam glow
    const flicker = 1 + Math.sin(elapsedSec * 3.8) * 0.05 + Math.sin(elapsedSec * 7.9) * 0.025;
    for (let i = 0; i < kakehi.lanternLights.length; i++) {
      kakehi.lanternLights[i].intensity = lanternIntensity * (i === 0 ? flicker : 2 - flicker);
    }
    kakehi.lanternEmissiveMat.emissiveIntensity = Math.max(1.2, lanternIntensity * 0.55);
    poolAmberLight.intensity = Math.max(2.6, lanternIntensity * 0.72) * flicker;

    // Subtle shimmer on Kakehi bamboo water pour stream
    kakehi.pourStream.scale.set(
      1 + Math.sin(elapsedSec * 14) * 0.06,
      1,
      1 + Math.cos(elapsedSec * 13) * 0.06
    );

    // Update rising steam puffs (zero heap allocations)
    steamSystem.amberColor.setHex(amberHex);
    const sCount = steamSystem.x.length;
    const alphaArray = steamSystem.alphaAttr.array as Float32Array;

    for (let i = 0; i < sCount; i++) {
      let a = steamSystem.age[i] + dt;
      if (a >= steamSystem.life[i]) {
        a = 0;
        // Deterministic re-seed inside pool basin without allocating closures
        const seedAngle = (elapsedSec * 1.7 + i * 2.399) % (Math.PI * 2);
        const seedR = ((i * 37) % 100) / 100;
        const rad = Math.sqrt(seedR) * (ONSEN_POOL_RADIUS - 0.9);
        steamSystem.x[i] = Math.cos(seedAngle) * rad;
        steamSystem.z[i] = Math.sin(seedAngle) * rad;
        steamSystem.y[i] = 0.16;
        steamSystem.speedY[i] = 0.52 + ((i * 19) % 10) * 0.045;
      }
      steamSystem.age[i] = a;

      const t = a / steamSystem.life[i];
      const curY = 0.16 + a * steamSystem.speedY[i];
      steamSystem.y[i] = curY;

      const swayX = Math.sin(elapsedSec * 0.75 + steamSystem.driftPhase[i]) * (0.28 + t * 0.55);
      const swayZ = Math.cos(elapsedSec * 0.62 + steamSystem.driftPhase[i]) * (0.24 + t * 0.45);
      const scale = steamSystem.baseScale[i] * (0.65 + t * 1.25);

      steamSystem.dummy.position.set(steamSystem.x[i] + swayX, curY, steamSystem.z[i] + swayZ);
      steamSystem.dummy.quaternion.copy(camera.quaternion);
      steamSystem.dummy.scale.setScalar(scale);
      steamSystem.dummy.updateMatrix();
      steamSystem.mesh.setMatrixAt(i, steamSystem.dummy.matrix);

      // Warm amber glow near mineral surface -> soft twilight winter mist higher up
      const amberMix = Math.max(0.24, 1 - t * 1.1) * steamSystem.warmth[i];
      steamSystem.colorScratch
        .copy(steamSystem.coolColor)
        .lerp(steamSystem.amberColor, amberMix);
      steamSystem.mesh.setColorAt(i, steamSystem.colorScratch);

      const fadeIn = Math.min(1, t / 0.14);
      const fadeOut = Math.max(0, 1 - Math.max(0, t - 0.22) / 0.78);
      alphaArray[i] = fadeIn * fadeOut * 0.86;
    }
    steamSystem.mesh.instanceMatrix.needsUpdate = true;
    if (steamSystem.mesh.instanceColor) steamSystem.mesh.instanceColor.needsUpdate = true;
    steamSystem.alphaAttr.needsUpdate = true;

    // Update winter snowfall drift
    snowSystem.material.color.setHex(particleHex);
    const posAttr = snowSystem.points.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const fCount = snowSystem.baseX.length;
    for (let i = 0; i < fCount; i++) {
      const sp = snowSystem.speeds[i];
      const ph = snowSystem.phases[i];
      const yRange = 11.2;
      const fy = (((snowSystem.baseY[i] - elapsedSec * sp * 0.72) % yRange) + yRange) % yRange + 0.4;
      const fx = snowSystem.baseX[i] + Math.sin(elapsedSec * 0.6 + ph) * 0.8;
      const fz = snowSystem.baseZ[i] + Math.cos(elapsedSec * 0.5 + ph) * 0.7;
      arr[i * 3] = fx;
      arr[i * 3 + 1] = fy;
      arr[i * 3 + 2] = fz;
    }
    posAttr.needsUpdate = true;
  };

  return {
    group,
    waterMesh,
    waterMaterial,
    steamSystem,
    snowSystem,
    pourStream: kakehi.pourStream,
    lanternLights: kakehi.lanternLights,
    poolAmberLight,
    lanternEmissiveMat: kakehi.lanternEmissiveMat,
    textures,
    updateRipples,
    spawnSteamBurst,
    updateFrame,
  };
}
