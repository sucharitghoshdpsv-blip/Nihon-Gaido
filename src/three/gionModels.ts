import * as THREE from 'three';
import { type GionMonumentId } from '../utils/shrineSceneConfig';

export interface GionTextureBundle {
  cobbleMap: THREE.CanvasTexture;
  cobbleBump: THREE.CanvasTexture;
  cobbleRoughness: THREE.CanvasTexture;
  cedarMap: THREE.CanvasTexture;
  koshiMap: THREE.CanvasTexture;
  shojiMap: THREE.CanvasTexture;
  roofTileMap: THREE.CanvasTexture;
  chochinMap: THREE.CanvasTexture;
  norenIndigoMap: THREE.CanvasTexture;
  norenVermilionMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
}

export interface GionSceneHandle {
  group: THREE.Group;
  textures: GionTextureBundle;
  chochinGroups: THREE.Group[];
  chochinPhases: Float32Array;
  lanternLights: THREE.PointLight[];
  chochinEmissiveMat: THREE.MeshStandardMaterial;
  shojiEmissiveMat: THREE.MeshStandardMaterial;
  cobbleMaterial: THREE.MeshPhysicalMaterial;
  updateFrame: (
    dt: number,
    elapsedSec: number,
    lanternsOn: boolean,
    lanternIntensity: number
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

function createGionTextures(maxAnisotropy: number): GionTextureBundle {
  const rand = seededRand(8247);

  // 1. Rain-Slick Hanamikoji Cobblestones: Albedo + Bump + Puddle Roughness Map (512x512)
  const [cCanvas, cCtx] = makeCanvas(512, 512);
  const [cbCanvas, cbCtx] = makeCanvas(512, 512);
  const [crCanvas, crCtx] = makeCanvas(512, 512);

  // Wet dark mortar joints
  cCtx.fillStyle = '#181d26';
  cCtx.fillRect(0, 0, 512, 512);
  cbCtx.fillStyle = '#2c2c2c';
  cbCtx.fillRect(0, 0, 512, 512);
  // Roughness: dark (~32) = glossy puddle reflection, bright (~175) = damp stone
  crCtx.fillStyle = '#5a5a5a';
  crCtx.fillRect(0, 0, 512, 512);

  const rows = 8;
  const rowH = 512 / rows;
  for (let row = 0; row < rows; row++) {
    const y = row * rowH;
    const cols = row % 2 === 0 ? 5 : 6;
    const offset = row % 2 === 0 ? 0 : 32;
    const colW = 512 / cols;
    for (let col = -1; col <= cols; col++) {
      const x = col * colW + offset;
      const pad = 4;
      const v = Math.floor(42 + rand() * 34);
      cCtx.fillStyle = `rgb(${v}, ${v + 4}, ${v + 11})`;
      cCtx.fillRect(x + pad, y + pad, colW - pad * 2, rowH - pad * 2);

      // Subtle mineral highlight bevel
      cCtx.fillStyle = `rgba(115, 130, 152, 0.16)`;
      cCtx.fillRect(x + pad, y + pad, colW - pad * 2, 4);

      const bv = Math.floor(145 + rand() * 55);
      cbCtx.fillStyle = `rgb(${bv}, ${bv}, ${bv})`;
      cbCtx.fillRect(x + pad + 2, y + pad + 2, colW - pad * 2 - 4, rowH - pad * 2 - 4);

      const rv = Math.floor(85 + rand() * 75);
      crCtx.fillStyle = `rgb(${rv}, ${rv}, ${rv})`;
      crCtx.fillRect(x + pad, y + pad, colW - pad * 2, rowH - pad * 2);
    }
  }
  // Rainwater puddles glossy patches in roughness map
  for (let i = 0; i < 10; i++) {
    const px = rand() * 512;
    const py = rand() * 512;
    const rad = 38 + rand() * 64;
    const grad = crCtx.createRadialGradient(px, py, 6, px, py, rad);
    grad.addColorStop(0, 'rgba(18, 18, 18, 0.88)');
    grad.addColorStop(0.65, 'rgba(32, 32, 32, 0.52)');
    grad.addColorStop(1, 'rgba(90, 90, 90, 0)');
    crCtx.fillStyle = grad;
    crCtx.beginPath();
    crCtx.arc(px, py, rad, 0, Math.PI * 2);
    crCtx.fill();
  }

  const cobbleMap = new THREE.CanvasTexture(cCanvas);
  cobbleMap.colorSpace = THREE.SRGBColorSpace;
  cobbleMap.wrapS = THREE.RepeatWrapping;
  cobbleMap.wrapT = THREE.RepeatWrapping;
  cobbleMap.repeat.set(3, 12);
  cobbleMap.anisotropy = maxAnisotropy;

  const cobbleBump = new THREE.CanvasTexture(cbCanvas);
  cobbleBump.wrapS = THREE.RepeatWrapping;
  cobbleBump.wrapT = THREE.RepeatWrapping;
  cobbleBump.repeat.set(3, 12);
  cobbleBump.anisotropy = maxAnisotropy;

  const cobbleRoughness = new THREE.CanvasTexture(crCanvas);
  cobbleRoughness.wrapS = THREE.RepeatWrapping;
  cobbleRoughness.wrapT = THREE.RepeatWrapping;
  cobbleRoughness.repeat.set(3, 12);
  cobbleRoughness.anisotropy = maxAnisotropy;

  // 2. Charred Yakisugi Cedar Planks (512x512)
  const [ceCanvas, ceCtx] = makeCanvas(512, 512);
  ceCtx.fillStyle = '#2b201b';
  ceCtx.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 32) {
    const shade = 34 + Math.floor(rand() * 18);
    ceCtx.fillStyle = `rgb(${shade + 8}, ${shade}, ${shade - 4})`;
    ceCtx.fillRect(x, 0, 30, 512);
    ceCtx.fillStyle = '#120d0a';
    ceCtx.fillRect(x + 30, 0, 2, 512);
  }
  for (let i = 0; i < 320; i++) {
    const gx = rand() * 512;
    ceCtx.fillStyle = rand() > 0.5 ? 'rgba(72, 50, 38, 0.28)' : 'rgba(12, 8, 6, 0.35)';
    ceCtx.fillRect(gx, 0, 1 + rand() * 2, 512);
  }
  const cedarMap = new THREE.CanvasTexture(ceCanvas);
  cedarMap.colorSpace = THREE.SRGBColorSpace;
  cedarMap.wrapS = THREE.RepeatWrapping;
  cedarMap.wrapT = THREE.RepeatWrapping;
  cedarMap.anisotropy = maxAnisotropy;

  // 3. Machiya Vertical Koshi Wooden Lattice Screen over warm dim interior glow (512x512)
  const [kCanvas, kCtx] = makeCanvas(512, 512);
  const kBg = kCtx.createLinearGradient(0, 0, 0, 512);
  kBg.addColorStop(0, '#5a3a1e');
  kBg.addColorStop(0.55, '#8c5a28');
  kBg.addColorStop(1, '#402916');
  kCtx.fillStyle = kBg;
  kCtx.fillRect(0, 0, 512, 512);
  // Crisp vertical wooden slats
  for (let x = 0; x < 512; x += 16) {
    kCtx.fillStyle = '#241913';
    kCtx.fillRect(x, 0, 10, 512);
    kCtx.fillStyle = 'rgba(130, 95, 65, 0.32)';
    kCtx.fillRect(x + 9, 0, 2, 512);
  }
  // Horizontal rail battens
  for (const hy of [18, 172, 340, 492]) {
    kCtx.fillStyle = '#1f1510';
    kCtx.fillRect(0, hy - 8, 512, 16);
  }
  const koshiMap = new THREE.CanvasTexture(kCanvas);
  koshiMap.colorSpace = THREE.SRGBColorSpace;
  koshiMap.anisotropy = maxAnisotropy;

  // 4. Warm Backlit Washi Shoji Paper Screen with Kumiko Grid (512x512)
  const [sCanvas, sCtx] = makeCanvas(512, 512);
  const sBg = sCtx.createRadialGradient(256, 260, 25, 256, 256, 310);
  sBg.addColorStop(0, '#fff0c4');
  sBg.addColorStop(0.65, '#f2b868');
  sBg.addColorStop(1, '#c97e38');
  sCtx.fillStyle = sBg;
  sCtx.fillRect(0, 0, 512, 512);
  sCtx.fillStyle = '#261a14';
  for (let x = 0; x <= 512; x += 64) {
    sCtx.fillRect(x - 4, 0, 8, 512);
  }
  for (let y = 0; y <= 512; y += 64) {
    sCtx.fillRect(0, y - 4, 512, 8);
  }
  sCtx.lineWidth = 14;
  sCtx.strokeStyle = '#1f140f';
  sCtx.strokeRect(0, 0, 512, 512);
  const shojiMap = new THREE.CanvasTexture(sCanvas);
  shojiMap.colorSpace = THREE.SRGBColorSpace;
  shojiMap.anisotropy = maxAnisotropy;

  // 5. Traditional Dark Kawara Slate Roof Tiles (512x512)
  const [rtCanvas, rtCtx] = makeCanvas(512, 512);
  rtCtx.fillStyle = '#1c212b';
  rtCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) {
    rtCtx.fillStyle = 'rgba(92, 108, 134, 0.25)';
    rtCtx.fillRect(0, y, 512, 4);
    rtCtx.fillStyle = 'rgba(8, 11, 16, 0.55)';
    rtCtx.fillRect(0, y + 26, 512, 6);
  }
  for (let x = 0; x < 512; x += 32) {
    rtCtx.fillStyle = 'rgba(72, 84, 104, 0.28)';
    rtCtx.fillRect(x, 0, 6, 512);
    rtCtx.fillStyle = 'rgba(6, 9, 14, 0.45)';
    rtCtx.fillRect(x + 26, 0, 6, 512);
  }
  const roofTileMap = new THREE.CanvasTexture(rtCanvas);
  roofTileMap.colorSpace = THREE.SRGBColorSpace;
  roofTileMap.wrapS = THREE.RepeatWrapping;
  roofTileMap.wrapT = THREE.RepeatWrapping;
  roofTileMap.repeat.set(3, 2);
  roofTileMap.anisotropy = maxAnisotropy;

  // 6. Hand-Ribbed Red & Amber Paper Chochin Lantern Texture (512x512)
  const [chCanvas, chCtx] = makeCanvas(512, 512);
  const chGrad = chCtx.createLinearGradient(0, 0, 0, 512);
  chGrad.addColorStop(0, '#d62f1e');
  chGrad.addColorStop(0.5, '#ff8d36');
  chGrad.addColorStop(1, '#cc291b');
  chCtx.fillStyle = chGrad;
  chCtx.fillRect(0, 0, 512, 512);
  // Horizontal spiral bamboo ribs
  for (let y = 24; y < 500; y += 26) {
    chCtx.fillStyle = 'rgba(42, 10, 6, 0.42)';
    chCtx.fillRect(0, y, 512, 4);
  }
  // Bold Kyoto tea house crest / kanji brushstroke emblem on front & back faces
  for (const cx of [128, 384]) {
    chCtx.fillStyle = 'rgba(20, 8, 6, 0.88)';
    chCtx.beginPath();
    chCtx.arc(cx, 256, 56, 0, Math.PI * 2);
    chCtx.lineWidth = 8;
    chCtx.strokeStyle = 'rgba(20, 8, 6, 0.85)';
    chCtx.stroke();
    chCtx.fillRect(cx - 10, 175, 20, 162);
    chCtx.fillRect(cx - 38, 246, 76, 20);
  }
  const chochinMap = new THREE.CanvasTexture(chCanvas);
  chochinMap.colorSpace = THREE.SRGBColorSpace;
  chochinMap.anisotropy = maxAnisotropy;

  // 7. Dyed Cotton Noren Curtains (Indigo & Vermilion)
  const makeNoren = (bg: string) => {
    const [nCan, nCtx] = makeCanvas(256, 256);
    nCtx.fillStyle = bg;
    nCtx.fillRect(0, 0, 256, 256);
    // Split curtain vertical seams
    nCtx.fillStyle = '#090b10';
    nCtx.fillRect(83, 28, 5, 228);
    nCtx.fillRect(168, 28, 5, 228);
    // Crisp white Kyoto kamon crest ring
    nCtx.strokeStyle = '#f2ede2';
    nCtx.lineWidth = 7;
    nCtx.beginPath();
    nCtx.arc(128, 128, 30, 0, Math.PI * 2);
    nCtx.stroke();
    const tex = new THREE.CanvasTexture(nCan);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  const norenIndigoMap = makeNoren('#1b2e4d');
  const norenVermilionMap = makeNoren('#7d241b');

  // 8. Soft Contact Shadow
  const [shCanvas, shCtx] = makeCanvas(128, 128);
  const shGrad = shCtx.createRadialGradient(64, 64, 8, 64, 64, 62);
  shGrad.addColorStop(0, 'rgba(4, 6, 14, 0.68)');
  shGrad.addColorStop(1, 'rgba(4, 6, 14, 0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shCanvas);

  return {
    cobbleMap,
    cobbleBump,
    cobbleRoughness,
    cedarMap,
    koshiMap,
    shojiMap,
    roofTileMap,
    chochinMap,
    norenIndigoMap,
    norenVermilionMap,
    contactShadowMap,
  };
}

function attachCollider(
  parent: THREE.Object3D,
  pos: [number, number, number],
  size: [number, number, number],
  monumentId: GionMonumentId
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

export function buildGionBiome(maxAnisotropy: number): GionSceneHandle {
  const group = new THREE.Group();
  const textures = createGionTextures(maxAnisotropy);
  const rand = seededRand(5039);

  // 1. Extended Dusk Courtyard Apron + Rain-Slick Hanamikoji Cobblestone Street
  const outerApron = new THREE.Mesh(
    new THREE.CircleGeometry(115, 64),
    new THREE.MeshStandardMaterial({
      color: 0x151a24,
      roughness: 0.72,
      metalness: 0.04,
    })
  );
  outerApron.rotation.x = -Math.PI / 2;
  outerApron.position.y = -0.02;
  group.add(outerApron);

  const cobbleMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xbac4d4,
    map: textures.cobbleMap,
    bumpMap: textures.cobbleBump,
    bumpScale: 0.045,
    roughnessMap: textures.cobbleRoughness,
    roughness: 0.42,
    metalness: 0.06,
    clearcoat: 0.85,
    clearcoatRoughness: 0.14,
    reflectivity: 0.92,
  });

  const streetLane = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 38, 12, 32), cobbleMaterial);
  streetLane.rotation.x = -Math.PI / 2;
  streetLane.position.set(0, 0.01, -2.5);
  streetLane.receiveShadow = true;
  group.add(streetLane);

  // Granite rain drainage stone curbs lining left & right house fronts
  const curbMat = new THREE.MeshStandardMaterial({
    color: 0x4b515b,
    roughness: 0.56,
    metalness: 0.04,
  });
  for (const side of [-1, 1]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 36), curbMat);
    curb.position.set(side * 2.85, 0.06, -2.5);
    curb.receiveShadow = true;
    group.add(curb);
  }

  attachCollider(group, [0, 0.25, -2.5], [4.8, 0.6, 26], 'cobblestone_lane');

  // Shared Architectural Materials
  const cedarMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.cedarMap,
    roughness: 0.78,
    metalness: 0.04,
  });
  const koshiMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.koshiMap,
    emissive: new THREE.Color(0xff9d42),
    emissiveMap: textures.koshiMap,
    emissiveIntensity: 0.35,
    roughness: 0.65,
  });
  const shojiEmissiveMat = new THREE.MeshStandardMaterial({
    color: 0xffe4b8,
    map: textures.shojiMap,
    emissive: new THREE.Color(0xffa947),
    emissiveMap: textures.shojiMap,
    emissiveIntensity: 1.45,
    roughness: 0.48,
  });
  const plasterMat = new THREE.MeshStandardMaterial({
    color: 0xd9d4ca,
    roughness: 0.88,
  });
  const roofTileMat = new THREE.MeshStandardMaterial({
    color: 0x3b4454,
    map: textures.roofTileMap,
    roughness: 0.58,
    metalness: 0.12,
  });
  const norenIndigoMat = new THREE.MeshStandardMaterial({
    map: textures.norenIndigoMap,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  const norenVermilionMat = new THREE.MeshStandardMaterial({
    map: textures.norenVermilionMap,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x16181e,
    roughness: 0.42,
    metalness: 0.72,
  });
  const chochinEmissiveMat = new THREE.MeshStandardMaterial({
    color: 0xffd2b8,
    map: textures.chochinMap,
    emissive: new THREE.Color(0xff6b24),
    emissiveMap: textures.chochinMap,
    emissiveIntensity: 2.35,
    roughness: 0.42,
  });

  const foliageUrnMat = new THREE.MeshStandardMaterial({ color: 0x2f5e36, roughness: 0.78 });
  const graniteBaseMat = new THREE.MeshStandardMaterial({ color: 0x575d66, roughness: 0.72 });

  // 2. Flanking 2-Story Machiya Ochaya Tea Houses + Hanging Chochin Lanterns
  const chochinGroups: THREE.Group[] = [];
  const chochinPhasesArr: number[] = [];

  const machiyaBaysZ = [8.2, 2.2, -3.8, -9.8];
  const bayWidth = 5.9;

  for (const side of [-1, 1]) {
    // Facing direction toward central alley (x=0)
    const dirToStreet = -side;

    for (let idx = 0; idx < machiyaBaysZ.length; idx++) {
      const bz = machiyaBaysZ[idx];
      const house = new THREE.Group();
      house.position.set(side * 4.55, 0, bz);
      // Orient local +Z toward street center
      house.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;

      const bodyDepth = 3.4;
      const wallZ = bodyDepth * 0.5;

      // Stone foundation plinth
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(bayWidth, 0.26, bodyDepth + 0.15),
        graniteBaseMat
      );
      plinth.position.y = 0.13;
      plinth.receiveShadow = true;
      house.add(plinth);

      // Dark cedar main timber shell
      const mainBox = new THREE.Mesh(
        new THREE.BoxGeometry(bayWidth - 0.12, 5.2, bodyDepth),
        cedarMat
      );
      mainBox.position.y = 2.86;
      mainBox.castShadow = true;
      mainBox.receiveShadow = true;
      house.add(mainBox);

      // Vertical timber corner & bay divider pillars along street face
      for (const px of [-2.82, -0.95, 0.95, 2.82]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.25, 0.18), cedarMat);
        post.position.set(px, 2.86, wallZ + 0.04);
        house.add(post);
      }

      // Ground floor: Koshi vertical lattice bay + Warm glowing Shoji sliding doorway
      const leftKoshi = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.15, 0.08), koshiMat);
      leftKoshi.position.set(-1.88, 1.38, wallZ + 0.02);
      house.add(leftKoshi);

      const centerShoji = new THREE.Mesh(new THREE.BoxGeometry(1.72, 2.08, 0.06), shojiEmissiveMat);
      centerShoji.position.set(0, 1.32, wallZ + 0.015);
      house.add(centerShoji);

      const rightKoshi = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.15, 0.08), koshiMat);
      rightKoshi.position.set(1.88, 1.38, wallZ + 0.02);
      house.add(rightKoshi);

      // Stone threshold step + hanging Noren linen curtain across doorway
      const doorStep = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.14, 0.65), graniteBaseMat);
      doorStep.position.set(0, 0.07, wallZ + 0.28);
      house.add(doorStep);

      const noren = new THREE.Mesh(
        new THREE.PlaneGeometry(1.62, 1.05),
        (idx + (side > 0 ? 1 : 0)) % 2 === 0 ? norenIndigoMat : norenVermilionMat
      );
      noren.position.set(0, 2.05, wallZ + 0.26);
      house.add(noren);

      // Projecting Ground-Floor Hisashi Eaves Roof overhanging the alley
      const hisashiRoof = new THREE.Mesh(
        new THREE.BoxGeometry(bayWidth + 0.08, 0.14, 1.25),
        roofTileMat
      );
      hisashiRoof.position.set(0, 2.88, wallZ + 0.56);
      hisashiRoof.rotation.x = 0.24;
      hisashiRoof.castShadow = true;
      house.add(hisashiRoof);

      // 2nd Floor: White shikkui plaster band + twin Mushiko-mado / glowing Shoji windows
      const plasterBand = new THREE.Mesh(
        new THREE.BoxGeometry(bayWidth - 0.3, 1.78, 0.08),
        plasterMat
      );
      plasterBand.position.set(0, 4.48, wallZ + 0.01);
      house.add(plasterBand);

      for (const wx of [-1.7, 0, 1.7]) {
        const winShoji = new THREE.Mesh(
          new THREE.BoxGeometry(1.18, 1.05, 0.08),
          shojiEmissiveMat
        );
        winShoji.position.set(wx, 4.45, wallZ + 0.05);
        house.add(winShoji);

        const winKoshi = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.07, 0.05), cedarMat);
        winKoshi.position.set(wx, 4.45, wallZ + 0.07);
        house.add(winKoshi);
        const winVert = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.12, 0.05), cedarMat);
        winVert.position.set(wx, 4.45, wallZ + 0.07);
        house.add(winVert);
      }

      // Upper 2nd-Story Pitched Kawara Slate Roof & Ridge
      const upperRoofSlope = new THREE.Mesh(
        new THREE.BoxGeometry(bayWidth + 0.14, 0.22, 2.6),
        roofTileMat
      );
      upperRoofSlope.position.set(0, 5.75, wallZ + 0.22);
      upperRoofSlope.rotation.x = 0.34;
      upperRoofSlope.castShadow = true;
      house.add(upperRoofSlope);

      const ridgeBeam = new THREE.Mesh(
        new THREE.BoxGeometry(bayWidth + 0.16, 0.22, 0.32),
        roofTileMat
      );
      ridgeBeam.position.set(0, 6.18, wallZ - 0.85);
      house.add(ridgeBeam);

      // Potted sculpted Japanese garden planter with layered rounded foliage sprays
      const px = idx % 2 === 0 ? -1.45 : 1.45;
      const pz = wallZ + 0.36;
      const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.36, 12), ironMat);
      urn.position.set(px, 0.22, pz);
      house.add(urn);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.38, 6), cedarMat);
      stem.position.set(px, 0.48, pz);
      house.add(stem);
      for (const [ox, oy, oz, rad] of [
        [0, 0.62, 0, 0.22],
        [-0.12, 0.56, 0.08, 0.17],
        [0.12, 0.58, -0.06, 0.16],
      ]) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), foliageUrnMat);
        puff.scale.set(1.15, 0.78, 1.05);
        puff.position.set(px + ox, oy, pz + oz);
        house.add(puff);
      }

      // Twin Hanging Chochin Paper Lanterns suspended from eaves timber brackets (total 12 lanterns)
      if (idx < 3) {
        for (const lx of [-1.42, 1.42]) {
          const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), cedarMat);
          bracket.position.set(lx, 2.66, wallZ + 0.58);
          house.add(bracket);

          const chochinGroup = new THREE.Group();
          chochinGroup.position.set(lx, 2.62, wallZ + 0.82);

          const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6), ironMat);
          cord.position.y = -0.12;
          chochinGroup.add(cord);

          const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.06, 12), ironMat);
          topCap.position.y = -0.24;
          chochinGroup.add(topCap);

          const paperBody = new THREE.Mesh(
            new THREE.SphereGeometry(0.24, 16, 12),
            chochinEmissiveMat
          );
          paperBody.scale.set(0.88, 1.28, 0.88);
          paperBody.position.y = -0.51;
          chochinGroup.add(paperBody);

          const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.06, 12), ironMat);
          botCap.position.y = -0.78;
          chochinGroup.add(botCap);

          house.add(chochinGroup);
          chochinGroups.push(chochinGroup);
          chochinPhasesArr.push(rand() * Math.PI * 2);
        }
      }

      // Subtle standing timber street lamp (andon) near mid-alley threshold for extra detail
      if (idx === 1 && side === 1) {
        const andonGroup = new THREE.Group();
        andonGroup.position.set(-2.35, 0, wallZ + 0.48);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.88, 0.32), cedarMat);
        frame.position.y = 0.44;
        andonGroup.add(frame);
        const paper = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.62, 0.34), shojiEmissiveMat);
        paper.position.y = 0.48;
        andonGroup.add(paper);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.18, 4), cedarMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.y = 0.96;
        andonGroup.add(roof);
        house.add(andonGroup);
      }

      // World-space pointer offset helper for lights (added on group cleanly below)
      void dirToStreet;
      group.add(house);
    }
  }

  // Distant transverse machiya backdrop gate closing the end of Hanamikoji lane (z = -15.5)
  const endWall = new THREE.Group();
  endWall.position.set(0, 0, -15.5);
  const backGateWall = new THREE.Mesh(new THREE.BoxGeometry(9.6, 5.4, 2.2), cedarMat);
  backGateWall.position.y = 2.7;
  endWall.add(backGateWall);
  const backWindow = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.35, 0.12), shojiEmissiveMat);
  backWindow.position.set(0, 3.8, 1.12);
  endWall.add(backWindow);
  const backNoren = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.15), norenIndigoMat);
  backNoren.position.set(0, 2.0, 1.16);
  endWall.add(backNoren);
  const backRoof = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.28, 2.8), roofTileMat);
  backRoof.position.set(0, 5.55, 0.25);
  backRoof.rotation.x = 0.25;
  endWall.add(backRoof);
  group.add(endWall);

  // Colliders on key landmarks
  attachCollider(group, [2.6, 2.1, 2.2], [2.4, 4.2, 5.6], 'machiya_teahouse');
  attachCollider(group, [-2.1, 2.2, 4.8], [1.4, 1.5, 11.5], 'chochin_lanterns');
  attachCollider(group, [2.1, 2.2, 4.8], [1.4, 1.5, 11.5], 'chochin_lanterns');

  // 3. Staggered Warm Amber Eaves PointLights casting rich puddles down cobblestone lane (4 lights)
  const lanternLights: THREE.PointLight[] = [];
  const lightSpots: Array<[number, number, number]> = [
    [-2.05, 2.45, 7.6],
    [2.05, 2.45, 3.2],
    [-2.05, 2.45, -1.8],
    [2.05, 2.45, -6.8],
  ];
  for (const [lx, ly, lz] of lightSpots) {
    const pLight = new THREE.PointLight(0xff8e36, 7.4, 14.5, 1.35);
    pLight.position.set(lx, ly, lz);
    group.add(pLight);
    lanternLights.push(pLight);
  }

  const chochinPhases = new Float32Array(chochinPhasesArr);
  let glowBlend = 1;

  const updateFrame = (
    dt: number,
    elapsedSec: number,
    lanternsOn: boolean,
    lanternIntensity: number
  ) => {
    const targetGlow = lanternsOn ? 1.0 : 0.0;
    const alpha = 1 - Math.exp(-8.0 * dt);
    glowBlend = THREE.MathUtils.lerp(glowBlend, targetGlow, alpha);

    // Subtle candle/bulb warmth flicker
    const flicker =
      1 + Math.sin(elapsedSec * 3.7) * 0.045 + Math.sin(elapsedSec * 8.2) * 0.02;

    for (let i = 0; i < lanternLights.length; i++) {
      const f = i % 2 === 0 ? flicker : 2 - flicker;
      lanternLights[i].intensity = lanternIntensity * glowBlend * f;
    }

    chochinEmissiveMat.emissiveIntensity = 0.06 + glowBlend * 2.55 * flicker;
    // Shoji interiors remain faintly warm dusk amber when eaves lanterns turn off so tea houses stay legible
    shojiEmissiveMat.emissiveIntensity = 0.35 + glowBlend * 1.25;
    koshiMat.emissiveIntensity = 0.08 + glowBlend * 0.32;

    // Gentle breeze sway across suspended eaves paper lanterns
    for (let i = 0; i < chochinGroups.length; i++) {
      const sway = Math.sin(elapsedSec * 1.45 + chochinPhases[i]) * 0.045;
      chochinGroups[i].rotation.z = sway;
      chochinGroups[i].rotation.x = Math.cos(elapsedSec * 1.1 + chochinPhases[i]) * 0.03;
    }
  };

  return {
    group,
    textures,
    chochinGroups,
    chochinPhases,
    lanternLights,
    chochinEmissiveMat,
    shojiEmissiveMat,
    cobbleMaterial,
    updateFrame,
  };
}
