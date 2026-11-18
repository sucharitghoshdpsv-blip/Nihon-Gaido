import * as THREE from 'three';
import { SHISHI_REST_ANGLE, type ShishiOdoshiState } from '../utils/biomeMechanics';
import { type ArashiyamaMonumentId } from '../utils/shrineSceneConfig';

export interface ArashiyamaTextureBundle {
  bambooMap: THREE.CanvasTexture;
  bambooBump: THREE.CanvasTexture;
  graniteMap: THREE.CanvasTexture;
  graniteBump: THREE.CanvasTexture;
  mossMap: THREE.CanvasTexture;
  fenceMap: THREE.CanvasTexture;
  sunbeamMap: THREE.CanvasTexture;
  leafMap: THREE.CanvasTexture;
  sprayMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
}

export interface ArashiyamaSceneHandle {
  group: THREE.Group;
  textures: ArashiyamaTextureBundle;
  sunbeamMeshes: THREE.Mesh[];
  sunbeamMaterial: THREE.MeshBasicMaterial;
  shishiPivotGroup: THREE.Group;
  shishiWaterStream: THREE.Mesh;
  shishiSplashRing: THREE.Mesh;
  shishiSplashMat: THREE.MeshBasicMaterial;
  bambooStalks: {
    mesh: THREE.InstancedMesh;
    baseX: Float32Array;
    baseZ: Float32Array;
    heights: Float32Array;
    radii: Float32Array;
    phases: Float32Array;
    leans: Float32Array;
    dummy: THREE.Object3D;
  };
  canopyClusters: {
    mesh: THREE.InstancedMesh;
    baseX: Float32Array;
    baseY: Float32Array;
    baseZ: Float32Array;
    scales: Float32Array;
    phases: Float32Array;
    dummy: THREE.Object3D;
  };
  fallingLeaves: {
    mesh: THREE.InstancedMesh;
    material: THREE.MeshStandardMaterial;
    baseX: Float32Array;
    baseY: Float32Array;
    baseZ: Float32Array;
    phases: Float32Array;
    speeds: Float32Array;
    scales: Float32Array;
    dummy: THREE.Object3D;
  };
  triggerSplash: () => void;
  updateFrame: (
    dt: number,
    elapsedSec: number,
    shishiState: ShishiOdoshiState,
    timeOfDay: string,
    particleColorHex: number
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

export function bambooPathCenterX(z: number): number {
  return Math.sin(z * 0.14) * 0.65;
}

function createArashiyamaTextures(maxAnisotropy: number): ArashiyamaTextureBundle {
  const rand = seededRand(7153);

  // 1. Segmented Bamboo Culm Albedo + Node Bump (512x512)
  const [bCanvas, bCtx] = makeCanvas(512, 512);
  const [bbCanvas, bbCtx] = makeCanvas(512, 512);
  const bGrad = bCtx.createLinearGradient(0, 0, 512, 0);
  bGrad.addColorStop(0, '#3e6e34');
  bGrad.addColorStop(0.35, '#598d44');
  bGrad.addColorStop(0.7, '#4c7c3a');
  bGrad.addColorStop(1, '#3e6e34');
  bCtx.fillStyle = bGrad;
  bCtx.fillRect(0, 0, 512, 512);

  bbCtx.fillStyle = '#808080';
  bbCtx.fillRect(0, 0, 512, 512);

  // Fine vertical culm fibers
  for (let i = 0; i < 420; i++) {
    const x = rand() * 512;
    const w = 0.8 + rand() * 1.8;
    bCtx.fillStyle = rand() > 0.5 ? 'rgba(130, 178, 86, 0.22)' : 'rgba(28, 56, 24, 0.22)';
    bCtx.fillRect(x, 0, w, 512);
    bbCtx.fillStyle = rand() > 0.5 ? 'rgba(145,145,145,0.28)' : 'rgba(110,110,110,0.28)';
    bbCtx.fillRect(x, 0, w, 512);
  }
  // Pronounced horizontal bamboo internode rings every ~128px
  for (const ny of [64, 192, 320, 448]) {
    bCtx.fillStyle = 'rgba(22, 42, 18, 0.68)';
    bCtx.fillRect(0, ny - 4, 512, 5);
    bCtx.fillStyle = 'rgba(182, 210, 134, 0.58)';
    bCtx.fillRect(0, ny + 1, 512, 4);

    bbCtx.fillStyle = '#ffffff';
    bbCtx.fillRect(0, ny - 2, 512, 5);
    bbCtx.fillStyle = '#383838';
    bbCtx.fillRect(0, ny - 6, 512, 4);
  }
  const bambooMap = new THREE.CanvasTexture(bCanvas);
  bambooMap.colorSpace = THREE.SRGBColorSpace;
  bambooMap.wrapS = THREE.RepeatWrapping;
  bambooMap.wrapT = THREE.RepeatWrapping;
  bambooMap.repeat.set(1, 3);
  bambooMap.anisotropy = maxAnisotropy;

  const bambooBump = new THREE.CanvasTexture(bbCanvas);
  bambooBump.wrapS = THREE.RepeatWrapping;
  bambooBump.wrapT = THREE.RepeatWrapping;
  bambooBump.repeat.set(1, 3);
  bambooBump.anisotropy = maxAnisotropy;

  // 2. Weathered Kyoto Granite Paver Albedo & Bump (512x512)
  const [gCanvas, gCtx] = makeCanvas(512, 512);
  const [gbCanvas, gbCtx] = makeCanvas(512, 512);
  gCtx.fillStyle = '#737975';
  gCtx.fillRect(0, 0, 512, 512);
  gbCtx.fillStyle = '#808080';
  gbCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 6200; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const sz = 1 + rand() * 2.4;
    const c = Math.floor(82 + rand() * 75);
    gCtx.fillStyle = `rgb(${c}, ${c + 2}, ${c - 2})`;
    gCtx.fillRect(x, y, sz, sz);
    const bc = Math.floor(60 + rand() * 135);
    gbCtx.fillStyle = `rgb(${bc}, ${bc}, ${bc})`;
    gbCtx.fillRect(x, y, sz, sz);
  }
  // Subtle damp moss edge mottling
  for (let i = 0; i < 36; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const rad = 14 + rand() * 34;
    const grad = gCtx.createRadialGradient(x, y, 2, x, y, rad);
    grad.addColorStop(0, 'rgba(65, 92, 48, 0.3)');
    grad.addColorStop(1, 'rgba(65, 92, 48, 0)');
    gCtx.fillStyle = grad;
    gCtx.beginPath();
    gCtx.arc(x, y, rad, 0, Math.PI * 2);
    gCtx.fill();
  }
  const graniteMap = new THREE.CanvasTexture(gCanvas);
  graniteMap.colorSpace = THREE.SRGBColorSpace;
  graniteMap.wrapS = THREE.RepeatWrapping;
  graniteMap.wrapT = THREE.RepeatWrapping;
  graniteMap.repeat.set(2, 2);
  graniteMap.anisotropy = maxAnisotropy;

  const graniteBump = new THREE.CanvasTexture(gbCanvas);
  graniteBump.wrapS = THREE.RepeatWrapping;
  graniteBump.wrapT = THREE.RepeatWrapping;
  graniteBump.repeat.set(2, 2);
  graniteBump.anisotropy = maxAnisotropy;

  // 3. Forest Floor Moss & Fallen Bamboo Leaf Litter (512x512)
  const [mCanvas, mCtx] = makeCanvas(512, 512);
  mCtx.fillStyle = '#253b22';
  mCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 160; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 12 + rand() * 36;
    const grad = mCtx.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, rand() > 0.35 ? 'rgba(64, 98, 42, 0.45)' : 'rgba(116, 102, 68, 0.28)');
    grad.addColorStop(1, 'rgba(37, 59, 34, 0)');
    mCtx.fillStyle = grad;
    mCtx.beginPath();
    mCtx.arc(x, y, r, 0, Math.PI * 2);
    mCtx.fill();
  }
  // Tiny scattered golden dry bamboo leaves
  for (let i = 0; i < 380; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    mCtx.save();
    mCtx.translate(x, y);
    mCtx.rotate(rand() * Math.PI);
    mCtx.fillStyle = rand() > 0.4 ? 'rgba(154, 134, 82, 0.55)' : 'rgba(90, 122, 56, 0.5)';
    mCtx.fillRect(-5, -1, 10, 2);
    mCtx.restore();
  }
  const mossMap = new THREE.CanvasTexture(mCanvas);
  mossMap.colorSpace = THREE.SRGBColorSpace;
  mossMap.wrapS = THREE.RepeatWrapping;
  mossMap.wrapT = THREE.RepeatWrapping;
  mossMap.repeat.set(16, 16);
  mossMap.anisotropy = maxAnisotropy;

  // 4. Woven Takegaki Bamboo Fence Texture (512x256)
  const [fCanvas, fCtx] = makeCanvas(512, 256);
  fCtx.fillStyle = '#7b6844';
  fCtx.fillRect(0, 0, 512, 256);
  for (let x = 0; x < 512; x += 16) {
    const shade = 104 + Math.floor(rand() * 28);
    fCtx.fillStyle = `rgb(${shade}, ${Math.floor(shade * 0.86)}, ${Math.floor(shade * 0.58)})`;
    fCtx.fillRect(x, 0, 13, 256);
    fCtx.fillStyle = 'rgba(28, 22, 12, 0.72)';
    fCtx.fillRect(x + 13, 0, 3, 256);
  }
  // Horizontal weave & black hemp lashing bands
  for (const hy of [38, 128, 218]) {
    fCtx.fillStyle = '#927f54';
    fCtx.fillRect(0, hy - 7, 512, 14);
    fCtx.fillStyle = '#1b1815';
    for (let x = 32; x < 512; x += 96) {
      fCtx.fillRect(x - 6, hy - 9, 12, 18);
    }
  }
  const fenceMap = new THREE.CanvasTexture(fCanvas);
  fenceMap.colorSpace = THREE.SRGBColorSpace;
  fenceMap.wrapS = THREE.RepeatWrapping;
  fenceMap.wrapT = THREE.ClampToEdgeWrapping;
  fenceMap.repeat.set(3, 1);
  fenceMap.anisotropy = maxAnisotropy;

  // 5. Soft Vertical Sunbeam Shaft Gradient (256x256)
  const [sbCanvas, sbCtx] = makeCanvas(256, 256);
  sbCtx.clearRect(0, 0, 256, 256);
  const vGrad = sbCtx.createLinearGradient(0, 0, 0, 256);
  vGrad.addColorStop(0, 'rgba(255, 250, 215, 0.0)');
  vGrad.addColorStop(0.22, 'rgba(255, 248, 208, 0.72)');
  vGrad.addColorStop(0.68, 'rgba(240, 250, 212, 0.45)');
  vGrad.addColorStop(1, 'rgba(220, 242, 205, 0.0)');
  sbCtx.fillStyle = vGrad;
  sbCtx.fillRect(0, 0, 256, 256);

  // Subtle vertical volumetric streaks
  sbCtx.globalCompositeOperation = 'destination-in';
  const hGrad = sbCtx.createLinearGradient(0, 0, 256, 0);
  hGrad.addColorStop(0, 'rgba(255,255,255,0)');
  hGrad.addColorStop(0.28, 'rgba(255,255,255,0.72)');
  hGrad.addColorStop(0.5, 'rgba(255,255,255,1)');
  hGrad.addColorStop(0.72, 'rgba(255,255,255,0.72)');
  hGrad.addColorStop(1, 'rgba(255,255,255,0)');
  sbCtx.fillStyle = hGrad;
  sbCtx.fillRect(0, 0, 256, 256);
  sbCtx.globalCompositeOperation = 'source-over';
  const sunbeamMap = new THREE.CanvasTexture(sbCanvas);
  sunbeamMap.colorSpace = THREE.SRGBColorSpace;

  // 6. Slender Bamboo Leaf Alpha Sprite (64x64)
  const [lCanvas, lCtx] = makeCanvas(64, 64);
  lCtx.clearRect(0, 0, 64, 64);
  lCtx.fillStyle = '#ffffff';
  lCtx.beginPath();
  lCtx.moveTo(32, 4);
  lCtx.quadraticCurveTo(46, 32, 32, 60);
  lCtx.quadraticCurveTo(18, 32, 32, 4);
  lCtx.fill();
  const leafMap = new THREE.CanvasTexture(lCanvas);

  // 7. Feathery Multi-Leaf Bamboo Canopy Spray Sprite (256x256 alpha foliage texture)
  const [spCanvas, spCtx] = makeCanvas(256, 256);
  spCtx.clearRect(0, 0, 256, 256);
  spCtx.strokeStyle = 'rgba(46, 78, 32, 0.88)';
  spCtx.lineWidth = 3;
  // Delicate arching bamboo twigs
  for (const angle of [-0.55, -0.18, 0.22, 0.58]) {
    spCtx.save();
    spCtx.translate(128, 224);
    spCtx.rotate(angle);
    spCtx.beginPath();
    spCtx.moveTo(0, 0);
    spCtx.quadraticCurveTo(12, -85, 22, -168);
    spCtx.stroke();
    // Draw 7 slender pointed bamboo leaves along each twig
    for (let k = 0; k < 7; k++) {
      const ly = -38 - k * 21;
      const lx = k * 3;
      const side = k % 2 === 0 ? 1 : -1;
      spCtx.save();
      spCtx.translate(lx, ly);
      spCtx.rotate(side * (0.42 + (k % 3) * 0.14));
      spCtx.fillStyle = k % 2 === 0 ? 'rgba(116, 178, 78, 0.94)' : 'rgba(84, 146, 56, 0.92)';
      spCtx.beginPath();
      spCtx.moveTo(0, 0);
      spCtx.quadraticCurveTo(9 * side, -22, 0, -48);
      spCtx.quadraticCurveTo(-7 * side, -22, 0, 0);
      spCtx.fill();
      spCtx.restore();
    }
    spCtx.restore();
  }
  const sprayMap = new THREE.CanvasTexture(spCanvas);
  sprayMap.colorSpace = THREE.SRGBColorSpace;
  sprayMap.anisotropy = maxAnisotropy;

  // 8. Contact Shadow Disc
  const [shCanvas, shCtx] = makeCanvas(128, 128);
  const shGrad = shCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
  shGrad.addColorStop(0, 'rgba(5, 16, 8, 0.58)');
  shGrad.addColorStop(0.55, 'rgba(5, 16, 8, 0.25)');
  shGrad.addColorStop(1, 'rgba(5, 16, 8, 0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shCanvas);

  return {
    bambooMap,
    bambooBump,
    graniteMap,
    graniteBump,
    mossMap,
    fenceMap,
    sunbeamMap,
    leafMap,
    sprayMap,
    contactShadowMap,
  };
}

function attachCollider(
  parent: THREE.Object3D,
  pos: [number, number, number],
  size: [number, number, number],
  monumentId: ArashiyamaMonumentId
) {
  const collider = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  collider.position.set(pos[0], pos[1], pos[2]);
  collider.layers.set(1);
  collider.userData.monumentId = monumentId;
  parent.add(collider);
}

/**
 * Composite Arashiyama stone-paved path, raised moss berms, woven takegaki fences,
 * towering swaying bamboo culms, vertical sunbeams, and an interactive Shishi-odoshi fountain.
 */
export function buildArashiyamaBiome(maxAnisotropy: number): ArashiyamaSceneHandle {
  const group = new THREE.Group();
  const textures = createArashiyamaTextures(maxAnisotropy);
  const rand = seededRand(1904);

  // 1. Forest Floor & Gentle Flanking Moss Banks (extending cleanly to fog horizon)
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.mossMap,
    roughness: 0.92,
    metalness: 0.02,
  });
  const groundPlane = new THREE.Mesh(new THREE.CircleGeometry(115, 64), groundMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.receiveShadow = true;
  group.add(groundPlane);

  // Sculpted raised moss mounds flanking left & right edges of the stone trail
  const moundGeo = new THREE.PlaneGeometry(44, 52, 44, 52);
  moundGeo.rotateX(-Math.PI / 2);
  const mPos = moundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < mPos.count; i++) {
    const x = mPos.getX(i);
    const z = mPos.getZ(i);
    const center = bambooPathCenterX(z);
    const distFromPath = Math.max(0, Math.abs(x - center) - 1.9);
    const rise = Math.min(1.15, distFromPath * 0.24) + Math.sin(z * 0.32 + x * 0.4) * 0.12 * Math.min(1, distFromPath);
    mPos.setY(i, distFromPath > 0 ? Math.max(0, rise) : 0);
  }
  moundGeo.computeVertexNormals();
  const mossBerms = new THREE.Mesh(moundGeo, groundMat);
  mossBerms.receiveShadow = true;
  group.add(mossBerms);

  // 2. Winding Granite Flagstone Pathway (crisp flat pavers + fine dark gravel bedding)
  const gravelMat = new THREE.MeshStandardMaterial({
    color: 0x3b403c,
    map: textures.graniteMap,
    bumpMap: textures.graniteBump,
    bumpScale: 0.035,
    roughness: 0.88,
  });
  const pathBedGeo = new THREE.PlaneGeometry(3.4, 38, 8, 48);
  pathBedGeo.rotateX(-Math.PI / 2);
  const pbPos = pathBedGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pbPos.count; i++) {
    const z = pbPos.getZ(i) - 2.0;
    pbPos.setZ(i, z);
    pbPos.setX(i, pbPos.getX(i) + bambooPathCenterX(z));
  }
  pathBedGeo.computeVertexNormals();
  const pathBed = new THREE.Mesh(pathBedGeo, gravelMat);
  pathBed.position.y = 0.025;
  pathBed.receiveShadow = true;
  group.add(pathBed);

  // Hand-laid granite flagstones via InstancedMesh
  const paverGeo = new THREE.BoxGeometry(1.18, 0.09, 0.82);
  const paverMat = new THREE.MeshStandardMaterial({
    color: 0xadb4ae,
    map: textures.graniteMap,
    bumpMap: textures.graniteBump,
    bumpScale: 0.04,
    roughness: 0.74,
    metalness: 0.04,
  });
  const paverRows = 38;
  const paverCount = paverRows * 2 + 12;
  const paverMesh = new THREE.InstancedMesh(paverGeo, paverMat, paverCount);
  paverMesh.receiveShadow = true;
  const paverDummy = new THREE.Object3D();
  const paverColor = new THREE.Color();
  let paverIdx = 0;

  for (let r = 0; r < paverRows; r++) {
    const z = 14.5 - r * 0.92;
    const cx = bambooPathCenterX(z);
    for (const side of [-0.62, 0.62]) {
      if (paverIdx >= paverCount) break;
      const sx = 0.88 + rand() * 0.28;
      const sz = 0.82 + rand() * 0.25;
      paverDummy.position.set(cx + side + (rand() - 0.5) * 0.14, 0.045, z + (rand() - 0.5) * 0.08);
      paverDummy.rotation.set(0, (rand() - 0.5) * 0.09, 0);
      paverDummy.scale.set(sx, 1, sz);
      paverDummy.updateMatrix();
      paverMesh.setMatrixAt(paverIdx, paverDummy.matrix);
      const shade = 0.85 + rand() * 0.24;
      paverColor.setRGB(shade, shade * 1.01, shade * 0.98);
      paverMesh.setColorAt(paverIdx, paverColor);
      paverIdx++;
    }
  }
  while (paverIdx < paverCount) {
    paverDummy.position.set(0, -5, 0);
    paverDummy.scale.setScalar(0.01);
    paverDummy.updateMatrix();
    paverMesh.setMatrixAt(paverIdx, paverDummy.matrix);
    paverIdx++;
  }
  paverMesh.instanceMatrix.needsUpdate = true;
  if (paverMesh.instanceColor) paverMesh.instanceColor.needsUpdate = true;
  group.add(paverMesh);

  attachCollider(group, [0, 0.35, -3.5], [3.5, 0.85, 22], 'bamboo_pathway');

  // 3. Traditional Woven Takegaki Bamboo Path Fences (along both borders)
  const fencePanelMat = new THREE.MeshStandardMaterial({
    color: 0xcbb894,
    map: textures.fenceMap,
    roughness: 0.82,
    metalness: 0.02,
  });
  const fenceRailMat = new THREE.MeshStandardMaterial({
    color: 0x8f7b52,
    roughness: 0.72,
  });
  const twineMat = new THREE.MeshStandardMaterial({
    color: 0x1c1a17,
    roughness: 0.9,
  });

  for (const side of [-1, 1]) {
    for (let seg = 0; seg < 10; seg++) {
      const z1 = 13.5 - seg * 3.1;
      const z2 = z1 - 3.1;
      // Leave a natural alcove opening around the Shishi-odoshi fountain on right foreground (+X, z=1..4)
      if (side === 1 && z1 > 0.2 && z2 < 4.4) continue;

      const x1 = bambooPathCenterX(z1) + side * 1.85;
      const x2 = bambooPathCenterX(z2) + side * 1.85;
      const midX = (x1 + x2) * 0.5;
      const midZ = (z1 + z2) * 0.5;
      const len = Math.hypot(x2 - x1, z2 - z1);
      const yaw = Math.atan2(x2 - x1, z2 - z1);

      const segGroup = new THREE.Group();
      segGroup.position.set(midX, 0.04, midZ);
      segGroup.rotation.y = yaw;

      // Woven reed/bamboo screen body
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.82, len), fencePanelMat);
      body.position.y = 0.44;
      body.castShadow = true;
      body.receiveShadow = true;
      segGroup.add(body);

      // Rounded horizontal top coping bamboo pole
      const topPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, len + 0.08, 8),
        fenceRailMat
      );
      topPole.rotation.x = Math.PI / 2;
      topPole.position.y = 0.87;
      topPole.castShadow = true;
      segGroup.add(topPole);

      // End support post + dark twine collar
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 1.0, 8), fenceRailMat);
      post.position.set(0, 0.5, len * 0.5);
      post.castShadow = true;
      segGroup.add(post);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.07, 8), twineMat);
      collar.position.set(0, 0.86, len * 0.5);
      segGroup.add(collar);

      group.add(segGroup);
    }
  }

  // 4. Towering Swaying Bamboo Grove (InstancedMesh culms pivoted at ground roots)
  const stalkCount = 260;
  // Unit-height 1.0 segmented culm pivoted at y=0 so rotation tilts stalk from ground
  const culmGeo = new THREE.CylinderGeometry(0.095, 0.125, 1.0, 10, 8);
  culmGeo.translate(0, 0.5, 0);

  const culmMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.bambooMap,
    bumpMap: textures.bambooBump,
    bumpScale: 0.045,
    roughness: 0.46,
    metalness: 0.04,
  });

  const stalkMesh = new THREE.InstancedMesh(culmGeo, culmMat, stalkCount);
  stalkMesh.castShadow = true;
  stalkMesh.receiveShadow = true;

  const baseX = new Float32Array(stalkCount);
  const baseZ = new Float32Array(stalkCount);
  const heights = new Float32Array(stalkCount);
  const radii = new Float32Array(stalkCount);
  const phases = new Float32Array(stalkCount);
  const leans = new Float32Array(stalkCount);
  const stalkDummy = new THREE.Object3D();
  const stalkCol = new THREE.Color();

  for (let i = 0; i < stalkCount; i++) {
    let sx = 0;
    let sz = 0;
    if (i < 210) {
      // Deep flanking left & right bamboo walls framing the walking corridor out to |x|=15m
      const side = i % 2 === 0 ? -1 : 1;
      sz = 15.0 - (i / 210) * 38.0 + (rand() - 0.5) * 1.4;
      const offsetOut = 2.25 + Math.pow(rand(), 0.72) * 13.5;
      sx = bambooPathCenterX(sz) + side * offsetOut;
      // Keep alcove clear around Shishi-odoshi at (+1.68, 2.15)
      if (side === 1 && Math.hypot(sx - 1.68, sz - 2.15) < 2.2) {
        sx += 2.4;
      }
    } else {
      // Distant closing grove backdrop spanning full horizon width
      sz = -17.0 - rand() * 10.5;
      sx = (rand() - 0.5) * 28.0;
    }

    baseX[i] = sx;
    baseZ[i] = sz;
    heights[i] = 10.0 + rand() * 6.2;
    radii[i] = 0.8 + rand() * 0.58;
    phases[i] = rand() * Math.PI * 2;
    leans[i] = (rand() - 0.5) * 0.045;

    stalkDummy.position.set(sx, 0, sz);
    stalkDummy.rotation.set(leans[i], rand() * Math.PI * 2, leans[i] * 0.7);
    stalkDummy.scale.set(radii[i], heights[i], radii[i]);
    stalkDummy.updateMatrix();
    stalkMesh.setMatrixAt(i, stalkDummy.matrix);

    // Rich emerald-jade-moss bamboo tint per culm
    const tint = rand();
    if (tint < 0.35) {
      stalkCol.setHex(0x63a64b);
    } else if (tint < 0.72) {
      stalkCol.setHex(0x4b8e41);
    } else if (tint < 0.9) {
      stalkCol.setHex(0x7ab855);
    } else {
      stalkCol.setHex(0x88ab66);
    }
    stalkMesh.setColorAt(i, stalkCol);
  }
  stalkMesh.instanceMatrix.needsUpdate = true;
  if (stalkMesh.instanceColor) stalkMesh.instanceColor.needsUpdate = true;
  group.add(stalkMesh);

  // 5. Overhead Swaying Feathery Bamboo Leaf Spray Canopy (crossed foliage sprays, zero cone umbrellas!)
  const canopyCount = 156;
  const canopyGeo = new THREE.PlaneGeometry(2.6, 2.6);
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0xb7e48f,
    map: textures.sprayMap,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
    roughness: 0.68,
    metalness: 0.02,
  });
  const canopyMesh = new THREE.InstancedMesh(canopyGeo, canopyMat, canopyCount);
  const cBaseX = new Float32Array(canopyCount);
  const cBaseY = new Float32Array(canopyCount);
  const cBaseZ = new Float32Array(canopyCount);
  const cScales = new Float32Array(canopyCount);
  const cPhases = new Float32Array(canopyCount);
  const cDummy = new THREE.Object3D();
  const cCol = new THREE.Color();

  for (let i = 0; i < canopyCount; i++) {
    const srcIdx = Math.floor((i / canopyCount) * stalkCount);
    cBaseX[i] = baseX[srcIdx] + (rand() - 0.5) * 1.1;
    cBaseY[i] = 5.2 + rand() * 6.4;
    cBaseZ[i] = baseZ[srcIdx] + (rand() - 0.5) * 1.1;
    cScales[i] = 0.85 + rand() * 0.85;
    cPhases[i] = phases[srcIdx] + (i % 2) * 1.15;

    cDummy.position.set(cBaseX[i], cBaseY[i], cBaseZ[i]);
    cDummy.rotation.set(
      (rand() - 0.5) * 0.48,
      (i % 2 === 0 ? 0 : Math.PI * 0.5) + rand() * 0.8,
      (rand() - 0.5) * 0.42
    );
    cDummy.scale.setScalar(cScales[i]);
    cDummy.updateMatrix();
    canopyMesh.setMatrixAt(i, cDummy.matrix);

    cCol.setHex(rand() > 0.4 ? 0xaee287 : 0x8ad072);
    canopyMesh.setColorAt(i, cCol);
  }
  canopyMesh.instanceMatrix.needsUpdate = true;
  if (canopyMesh.instanceColor) canopyMesh.instanceColor.needsUpdate = true;
  group.add(canopyMesh);

  // 6. Vertical Filtered Sunbeams (soft golden shafts spaced cleanly without additive white-out)
  const sunbeamMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe9a6,
    map: textures.sunbeamMap,
    transparent: true,
    opacity: 0.17,
    blending: THREE.NormalBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const beamCoords: Array<[number, number, number, number]> = [
    [-1.4, 6.4, 0.9, 0.13],
    [1.3, 3.0, 1.0, 0.12],
    [-0.9, -1.6, 1.1, 0.11],
    [1.1, -5.8, 1.15, 0.12],
    [-1.7, -10.2, 1.1, 0.1],
    [0.2, -13.8, 1.2, 0.11],
  ];

  const sunbeamMeshes: THREE.Mesh[] = [];
  for (const [bx, bz, bScale, tilt] of beamCoords) {
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45 * bScale, 2.25 * bScale, 19.5, 16, 1, true),
      sunbeamMaterial
    );
    shaft.position.set(bx + bambooPathCenterX(bz), 8.2, bz);
    shaft.rotation.z = -tilt;
    shaft.rotation.x = 0.06;
    group.add(shaft);
    sunbeamMeshes.push(shaft);
  }

  attachCollider(group, [-3.0, 3.8, -2.5], [3.6, 5.8, 9.0], 'sunlit_canopy');

  // 7. Interactive Composite Shishi-odoshi Deer Chaser Fountain
  const shishiGroup = new THREE.Group();
  shishiGroup.position.set(1.75, 0, 2.15);
  shishiGroup.rotation.y = -Math.PI * 0.22;

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x5c635f,
    map: textures.graniteMap,
    bumpMap: textures.graniteBump,
    bumpScale: 0.05,
    roughness: 0.72,
  });
  const agedBambooMat = new THREE.MeshStandardMaterial({
    color: 0x6f9446,
    map: textures.bambooMap,
    bumpMap: textures.bambooBump,
    bumpScale: 0.03,
    roughness: 0.48,
  });
  const wetCedarMat = new THREE.MeshStandardMaterial({
    color: 0x3b2a1c,
    roughness: 0.76,
  });

  // Ground contact shadow
  const shishiShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    })
  );
  shishiShadow.rotation.x = -Math.PI / 2;
  shishiShadow.position.y = 0.03;
  shishiGroup.add(shishiShadow);

  // Carved tsukubai stone water basin + glistening water surface
  const basinOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.48, 0.34, 14), stoneMat);
  basinOuter.position.set(-0.34, 0.17, 0);
  basinOuter.castShadow = true;
  basinOuter.receiveShadow = true;
  shishiGroup.add(basinOuter);

  const basinWater = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 18),
    new THREE.MeshPhysicalMaterial({
      color: 0x2a564f,
      roughness: 0.08,
      clearcoat: 0.95,
      clearcoatRoughness: 0.05,
    })
  );
  basinWater.rotation.x = -Math.PI / 2;
  basinWater.position.set(-0.34, 0.345, 0);
  shishiGroup.add(basinWater);

  // Dynamic splash ripple ring when water pours/knocks
  const shishiSplashMat = new THREE.MeshBasicMaterial({
    color: 0xdff7ec,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shishiSplashRing = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.14, 24),
    shishiSplashMat
  );
  shishiSplashRing.rotation.x = -Math.PI / 2;
  shishiSplashRing.position.set(-0.34, 0.352, 0);
  shishiSplashRing.visible = false;
  shishiGroup.add(shishiSplashRing);

  // Kakehi water feed post + spout feeding into upper end of Shishi-odoshi
  const feedPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 1.05, 10), agedBambooMat);
  feedPost.position.set(0.48, 0.52, -0.22);
  feedPost.castShadow = true;
  shishiGroup.add(feedPost);

  const feedArm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.62, 10), agedBambooMat);
  feedArm.rotation.z = Math.PI * 0.44;
  feedArm.position.set(0.24, 0.96, -0.14);
  feedArm.castShadow = true;
  shishiGroup.add(feedArm);

  const shishiWaterStream = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.028, 0.38, 8),
    new THREE.MeshPhysicalMaterial({
      color: 0xb6eef7,
      emissive: new THREE.Color(0x5ca4b0),
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.78,
      roughness: 0.1,
    })
  );
  shishiWaterStream.position.set(-0.04, 0.72, -0.06);
  shishiGroup.add(shishiWaterStream);

  // Pair of Y-shaped wooden upright pivot posts
  for (const pz of [-0.14, 0.14]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.045, 0.74, 8), wetCedarMat);
    post.position.set(0.1, 0.37, pz);
    post.castShadow = true;
    shishiGroup.add(post);
  }
  const axlePin = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 8), twineMat);
  axlePin.rotation.x = Math.PI / 2;
  axlePin.position.set(0.1, 0.66, 0);
  shishiGroup.add(axlePin);

  // Pivoting Shishi-odoshi hollow bamboo seesaw arm
  const shishiPivotGroup = new THREE.Group();
  shishiPivotGroup.position.set(0.1, 0.66, 0);
  shishiPivotGroup.rotation.z = SHISHI_REST_ANGLE;

  const bambooTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.076, 1.04, 12),
    agedBambooMat
  );
  bambooTube.rotation.z = Math.PI / 2;
  bambooTube.position.set(-0.08, 0, 0);
  bambooTube.castShadow = true;
  shishiPivotGroup.add(bambooTube);

  // Dark hollow open pouring mouth toward basin side (-X local)
  const hollowMouth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.056, 0.056, 0.04, 10),
    new THREE.MeshStandardMaterial({ color: 0x162112, roughness: 0.8 })
  );
  hollowMouth.rotation.z = Math.PI / 2;
  hollowMouth.position.set(-0.59, 0, 0);
  shishiPivotGroup.add(hollowMouth);

  // Twin hemp lashing knots around fulcrum
  for (const kx of [-0.08, 0.08]) {
    const knot = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 12), twineMat);
    knot.rotation.y = Math.PI / 2;
    knot.position.set(kx, 0, 0);
    shishiPivotGroup.add(knot);
  }
  shishiGroup.add(shishiPivotGroup);

  // Dark wet strike anvil stone underneath tail end (+X side of pivot)
  const strikeStone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 1), stoneMat);
  strikeStone.scale.set(1.25, 0.78, 1.1);
  strikeStone.position.set(0.36, 0.16, 0);
  strikeStone.castShadow = true;
  strikeStone.receiveShadow = true;
  shishiGroup.add(strikeStone);

  attachCollider(shishiGroup, [0, 0.72, 0], [2.1, 1.8, 1.9], 'shishi_odoshi');
  group.add(shishiGroup);

  // 8. Drifting Bamboo Leaves (sun-kissed instanced leaves floating gently on wind gusts)
  const leafCount = 64;
  const leafGeo = new THREE.PlaneGeometry(0.18, 0.32);
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0xaed973,
    emissive: new THREE.Color(0x3b6324),
    emissiveIntensity: 0.25,
    map: textures.leafMap,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
    roughness: 0.55,
  });
  const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
  leafMesh.frustumCulled = false;

  const lBaseX = new Float32Array(leafCount);
  const lBaseY = new Float32Array(leafCount);
  const lBaseZ = new Float32Array(leafCount);
  const lPhases = new Float32Array(leafCount);
  const lSpeeds = new Float32Array(leafCount);
  const lScales = new Float32Array(leafCount);
  const lDummy = new THREE.Object3D();

  for (let i = 0; i < leafCount; i++) {
    lBaseX[i] = (rand() - 0.5) * 14;
    lBaseY[i] = 0.8 + rand() * 8.5;
    lBaseZ[i] = (rand() - 0.5) * 22 - 1.5;
    lPhases[i] = rand() * Math.PI * 2;
    lSpeeds[i] = 0.65 + rand() * 0.75;
    lScales[i] = 0.65 + rand() * 0.55;
  }
  group.add(leafMesh);

  let splashAge = -1;
  const triggerSplash = () => {
    splashAge = 0;
  };

  const targetLeafCol = new THREE.Color();

  const updateFrame = (
    dt: number,
    elapsedSec: number,
    shishiState: ShishiOdoshiState,
    timeOfDay: string,
    particleColorHex: number
  ) => {
    // 1. Apply Shishi-odoshi rock angle (local +Z tilt dips -X spout downward when positive!)
    // Negate rockAngle so positive state.rockAngle tips the -X pouring mouth DOWN toward the basin
    shishiPivotGroup.rotation.z = -shishiState.rockAngle;

    // Subtle shimmer on water feed trickle
    shishiWaterStream.scale.set(
      1 + Math.sin(elapsedSec * 16) * 0.08,
      1,
      1 + Math.cos(elapsedSec * 15) * 0.08
    );

    if (splashAge >= 0) {
      splashAge += dt;
      if (splashAge < 1.15) {
        shishiSplashRing.visible = true;
        const p = splashAge / 1.15;
        shishiSplashRing.scale.setScalar(1 + p * 3.1);
        shishiSplashMat.opacity = (1 - p) * 0.68;
      } else {
        splashAge = -1;
        shishiSplashRing.visible = false;
        shishiSplashMat.opacity = 0;
      }
    }

    // 2. Tune Vertical Sunbeams between Misty Morning (soft mist shafts) and Emerald Canopy (rich crisp golden shafts)
    const beamTargetOpacity =
      timeOfDay === 'emerald_canopy'
        ? 0.23
        : timeOfDay === 'misty_morning'
        ? 0.16
        : timeOfDay === 'dawn'
        ? 0.19
        : 0.1;
    sunbeamMaterial.opacity = THREE.MathUtils.lerp(sunbeamMaterial.opacity, beamTargetOpacity, 0.14);

    // 3. Gentle swaying animation across bamboo grove stalks driven by wind gust envelope
    const gustAmp = 0.016 + shishiState.gustStrength * 0.042;
    const waveSpeed = 1.15 + shishiState.gustStrength * 1.4;

    for (let i = 0; i < stalkCount; i++) {
      const swayX =
        leans[i] +
        Math.sin(elapsedSec * waveSpeed + phases[i] + baseZ[i] * 0.18) * gustAmp;
      const swayZ =
        leans[i] * 0.7 +
        Math.cos(elapsedSec * (waveSpeed * 0.85) + phases[i] + baseX[i] * 0.2) * gustAmp * 0.75;
      stalkDummy.position.set(baseX[i], 0, baseZ[i]);
      stalkDummy.rotation.set(swayX, phases[i], swayZ);
      stalkDummy.scale.set(radii[i], heights[i], radii[i]);
      stalkDummy.updateMatrix();
      stalkMesh.setMatrixAt(i, stalkDummy.matrix);
    }
    stalkMesh.instanceMatrix.needsUpdate = true;

    // Canopy clusters drift softly in phase with bamboo tops
    for (let i = 0; i < canopyCount; i++) {
      const drift =
        Math.sin(elapsedSec * waveSpeed + cPhases[i]) * (0.14 + shishiState.gustStrength * 0.28);
      cDummy.position.set(cBaseX[i] + drift, cBaseY[i], cBaseZ[i] + drift * 0.5);
      cDummy.rotation.set(drift * 0.3, cPhases[i], -drift * 0.25);
      cDummy.scale.setScalar(cScales[i]);
      cDummy.updateMatrix();
      canopyMesh.setMatrixAt(i, cDummy.matrix);
    }
    canopyMesh.instanceMatrix.needsUpdate = true;

    // Falling sun-dappled bamboo leaves accelerate subtly during wind gusts
    targetLeafCol.setHex(particleColorHex);
    leafMat.color.lerp(targetLeafCol, 0.1);
    const windDriftX = 0.9 + shishiState.gustStrength * 2.2;
    for (let i = 0; i < leafCount; i++) {
      const ph = lPhases[i];
      const sp = lSpeeds[i];
      const yRange = 8.8;
      const ly = (((lBaseY[i] - elapsedSec * sp * 0.55) % yRange) + yRange) % yRange + 0.35;
      const lx = lBaseX[i] + Math.sin(elapsedSec * sp + ph) * windDriftX;
      const lz = lBaseZ[i] + Math.cos(elapsedSec * sp * 0.85 + ph) * 0.85;
      lDummy.position.set(lx, ly, lz);
      lDummy.rotation.set(elapsedSec * 1.1 + ph, elapsedSec * 0.9 + ph, ph);
      lDummy.scale.setScalar(lScales[i]);
      lDummy.updateMatrix();
      leafMesh.setMatrixAt(i, lDummy.matrix);
    }
    leafMesh.instanceMatrix.needsUpdate = true;
  };

  return {
    group,
    textures,
    sunbeamMeshes,
    sunbeamMaterial,
    shishiPivotGroup,
    shishiWaterStream,
    shishiSplashRing,
    shishiSplashMat,
    bambooStalks: {
      mesh: stalkMesh,
      baseX,
      baseZ,
      heights,
      radii,
      phases,
      leans,
      dummy: stalkDummy,
    },
    canopyClusters: {
      mesh: canopyMesh,
      baseX: cBaseX,
      baseY: cBaseY,
      baseZ: cBaseZ,
      scales: cScales,
      phases: cPhases,
      dummy: cDummy,
    },
    fallingLeaves: {
      mesh: leafMesh,
      material: leafMat,
      baseX: lBaseX,
      baseY: lBaseY,
      baseZ: lBaseZ,
      phases: lPhases,
      speeds: lSpeeds,
      scales: lScales,
      dummy: lDummy,
    },
    triggerSplash,
    updateFrame,
  };
}
