import * as THREE from 'three';
import { type ShrineMonumentId } from '../utils/shrineSceneConfig';

export interface ShrineTextureBundle {
  woodMap: THREE.CanvasTexture;
  woodBump: THREE.CanvasTexture;
  stoneMap: THREE.CanvasTexture;
  stoneBump: THREE.CanvasTexture;
  gravelMap: THREE.CanvasTexture;
  gravelBump: THREE.CanvasTexture;
  plaqueMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
}

export interface ShrineMaterialBundle {
  vermilionWood: THREE.MeshStandardMaterial;
  darkCharWood: THREE.MeshStandardMaterial;
  naturalCedar: THREE.MeshStandardMaterial;
  graniteStone: THREE.MeshStandardMaterial;
  mossStone: THREE.MeshStandardMaterial;
  bronzeMetal: THREE.MeshStandardMaterial;
  goldLeaf: THREE.MeshStandardMaterial;
  lanternEmissive: THREE.MeshStandardMaterial;
  shojiEmissive: THREE.MeshStandardMaterial;
  shimenawaRope: THREE.MeshStandardMaterial;
  shidePaper: THREE.MeshStandardMaterial;
  rakedGravel: THREE.MeshStandardMaterial;
  plaqueFace: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
}

export interface DriftingPetalSystem {
  mesh: THREE.InstancedMesh;
  material: THREE.MeshStandardMaterial;
  baseX: Float32Array;
  baseY: Float32Array;
  baseZ: Float32Array;
  phases: Float32Array;
  speeds: Float32Array;
  scales: Float32Array;
  dummy: THREE.Object3D;
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

export function createShrineTextures(maxAnisotropy: number): ShrineTextureBundle {
  const rand = seededRand(1089);

  // 1. Vermilion lacquer & wood grain
  const [woodCanvas, wCtx] = makeCanvas(256, 256);
  wCtx.fillStyle = '#c83722';
  wCtx.fillRect(0, 0, 256, 256);
  const [woodBumpCanvas, wbCtx] = makeCanvas(256, 256);
  wbCtx.fillStyle = '#808080';
  wbCtx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 180; i++) {
    const x = rand() * 256;
    const width = 1 + rand() * 3;
    wCtx.fillStyle = rand() > 0.5 ? 'rgba(90, 14, 10, 0.16)' : 'rgba(240, 95, 58, 0.12)';
    wCtx.fillRect(x, 0, width, 256);
    wbCtx.fillStyle = rand() > 0.5 ? 'rgba(40,40,40,0.35)' : 'rgba(215,215,215,0.28)';
    wbCtx.fillRect(x, 0, width, 256);
  }

  const woodMap = new THREE.CanvasTexture(woodCanvas);
  woodMap.colorSpace = THREE.SRGBColorSpace;
  woodMap.wrapS = THREE.RepeatWrapping;
  woodMap.wrapT = THREE.RepeatWrapping;
  woodMap.anisotropy = maxAnisotropy;

  const woodBump = new THREE.CanvasTexture(woodBumpCanvas);
  woodBump.wrapS = THREE.RepeatWrapping;
  woodBump.wrapT = THREE.RepeatWrapping;
  woodBump.anisotropy = maxAnisotropy;

  // 2. Kyoto Granite Stone
  const [stoneCanvas, sCtx] = makeCanvas(256, 256);
  sCtx.fillStyle = '#7c8184';
  sCtx.fillRect(0, 0, 256, 256);
  const [stoneBumpCanvas, sbCtx] = makeCanvas(256, 256);
  sbCtx.fillStyle = '#808080';
  sbCtx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 2400; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const size = 1 + rand() * 2.5;
    const v = Math.floor(85 + rand() * 90);
    sCtx.fillStyle = `rgb(${v}, ${v + 2}, ${v - 1})`;
    sCtx.fillRect(x, y, size, size);
    const bv = Math.floor(60 + rand() * 140);
    sbCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    sbCtx.fillRect(x, y, size, size);
  }
  // subtle moss veins near edges
  for (let i = 0; i < 28; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const r = 6 + rand() * 16;
    const grad = sCtx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(65, 96, 55, 0.25)');
    grad.addColorStop(1, 'rgba(65, 96, 55, 0)');
    sCtx.fillStyle = grad;
    sCtx.beginPath();
    sCtx.arc(x, y, r, 0, Math.PI * 2);
    sCtx.fill();
  }

  const stoneMap = new THREE.CanvasTexture(stoneCanvas);
  stoneMap.colorSpace = THREE.SRGBColorSpace;
  stoneMap.wrapS = THREE.RepeatWrapping;
  stoneMap.wrapT = THREE.RepeatWrapping;
  stoneMap.anisotropy = maxAnisotropy;

  const stoneBump = new THREE.CanvasTexture(stoneBumpCanvas);
  stoneBump.wrapS = THREE.RepeatWrapping;
  stoneBump.wrapT = THREE.RepeatWrapping;
  stoneBump.anisotropy = maxAnisotropy;

  // 3. Karesansui Raked Zen Gravel
  const [gravelCanvas, gCtx] = makeCanvas(512, 512);
  gCtx.fillStyle = '#c8c3b6';
  gCtx.fillRect(0, 0, 512, 512);
  const [gravelBumpCanvas, gbCtx] = makeCanvas(512, 512);
  gbCtx.fillStyle = '#808080';
  gbCtx.fillRect(0, 0, 512, 512);

  // Raked linear & radial waves
  for (let y = 0; y < 512; y += 8) {
    gCtx.fillStyle = 'rgba(135, 130, 120, 0.28)';
    gCtx.fillRect(0, y, 512, 3);
    gbCtx.fillStyle = '#505050';
    gbCtx.fillRect(0, y, 512, 3);
    gbCtx.fillStyle = '#b8b8b8';
    gbCtx.fillRect(0, y + 3, 512, 3);
  }
  for (const ringCenter of [
    { x: 165, y: 245, rMax: 115 },
    { x: 355, y: 265, rMax: 110 },
  ]) {
    for (let r = 24; r < ringCenter.rMax; r += 10) {
      gCtx.strokeStyle = 'rgba(120, 114, 104, 0.35)';
      gCtx.lineWidth = 3;
      gCtx.beginPath();
      gCtx.arc(ringCenter.x, ringCenter.y, r, 0, Math.PI * 2);
      gCtx.stroke();

      gbCtx.strokeStyle = '#484848';
      gbCtx.lineWidth = 3;
      gbCtx.beginPath();
      gbCtx.arc(ringCenter.x, ringCenter.y, r, 0, Math.PI * 2);
      gbCtx.stroke();
    }
  }
  // Fine stone grit
  for (let i = 0; i < 3800; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    gCtx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.2)' : 'rgba(60,55,48,0.22)';
    gCtx.fillRect(x, y, 1.5, 1.5);
  }

  const gravelMap = new THREE.CanvasTexture(gravelCanvas);
  gravelMap.colorSpace = THREE.SRGBColorSpace;
  gravelMap.anisotropy = maxAnisotropy;

  const gravelBump = new THREE.CanvasTexture(gravelBumpCanvas);
  gravelBump.anisotropy = maxAnisotropy;

  // 4. Torii Gold Plaque (Gakuzuka)
  const [plaqueCanvas, pCtx] = makeCanvas(256, 384);
  pCtx.fillStyle = '#11161d';
  pCtx.fillRect(0, 0, 256, 384);
  pCtx.strokeStyle = '#e5b84b';
  pCtx.lineWidth = 14;
  pCtx.strokeRect(14, 14, 228, 356);
  pCtx.fillStyle = '#f3cb62';
  pCtx.font = 'bold 104px serif';
  pCtx.textAlign = 'center';
  pCtx.textBaseline = 'middle';
  pCtx.fillText('敬', 128, 130);
  pCtx.fillText('神', 128, 255);

  const plaqueMap = new THREE.CanvasTexture(plaqueCanvas);
  plaqueMap.colorSpace = THREE.SRGBColorSpace;
  plaqueMap.anisotropy = maxAnisotropy;

  // 5. Radial Contact Shadow
  const [shadowCanvas, shCtx] = makeCanvas(128, 128);
  const shGrad = shCtx.createRadialGradient(64, 64, 6, 64, 64, 62);
  shGrad.addColorStop(0, 'rgba(6, 8, 14, 0.72)');
  shGrad.addColorStop(0.55, 'rgba(6, 8, 14, 0.34)');
  shGrad.addColorStop(1, 'rgba(6, 8, 14, 0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shadowCanvas);

  return {
    woodMap,
    woodBump,
    stoneMap,
    stoneBump,
    gravelMap,
    gravelBump,
    plaqueMap,
    contactShadowMap,
  };
}

export function createShrineMaterials(tex: ShrineTextureBundle): ShrineMaterialBundle {
  return {
    vermilionWood: new THREE.MeshStandardMaterial({
      color: 0xd9442b,
      map: tex.woodMap,
      bumpMap: tex.woodBump,
      bumpScale: 0.025,
      roughness: 0.48,
      metalness: 0.05,
    }),
    darkCharWood: new THREE.MeshStandardMaterial({
      color: 0x1c1e24,
      roughness: 0.56,
      metalness: 0.08,
    }),
    naturalCedar: new THREE.MeshStandardMaterial({
      color: 0x735238,
      bumpMap: tex.woodBump,
      bumpScale: 0.03,
      roughness: 0.74,
      metalness: 0.02,
    }),
    graniteStone: new THREE.MeshStandardMaterial({
      color: 0xb6bac0,
      map: tex.stoneMap,
      bumpMap: tex.stoneBump,
      bumpScale: 0.045,
      roughness: 0.84,
      metalness: 0.04,
    }),
    mossStone: new THREE.MeshStandardMaterial({
      color: 0x456b46,
      bumpMap: tex.stoneBump,
      bumpScale: 0.05,
      roughness: 0.9,
      metalness: 0.0,
    }),
    bronzeMetal: new THREE.MeshStandardMaterial({
      color: 0x3b3329,
      roughness: 0.34,
      metalness: 0.88,
    }),
    goldLeaf: new THREE.MeshStandardMaterial({
      color: 0xe9be53,
      roughness: 0.24,
      metalness: 0.92,
    }),
    lanternEmissive: new THREE.MeshStandardMaterial({
      color: 0xffdf9e,
      emissive: new THREE.Color(0xff9a3c),
      emissiveIntensity: 2.2,
      roughness: 0.35,
      metalness: 0.0,
    }),
    shojiEmissive: new THREE.MeshStandardMaterial({
      color: 0xffe4b8,
      emissive: new THREE.Color(0xff9c4a),
      emissiveIntensity: 1.1,
      roughness: 0.65,
      metalness: 0.0,
    }),
    shimenawaRope: new THREE.MeshStandardMaterial({
      color: 0xb99b63,
      roughness: 0.88,
      metalness: 0.0,
    }),
    shidePaper: new THREE.MeshStandardMaterial({
      color: 0xf6f3ea,
      roughness: 0.62,
      metalness: 0.0,
      side: THREE.DoubleSide,
    }),
    rakedGravel: new THREE.MeshStandardMaterial({
      color: 0xd8d3c6,
      map: tex.gravelMap,
      bumpMap: tex.gravelBump,
      bumpScale: 0.055,
      roughness: 0.92,
      metalness: 0.0,
    }),
    plaqueFace: new THREE.MeshStandardMaterial({
      map: tex.plaqueMap,
      roughness: 0.3,
      metalness: 0.35,
    }),
    contactShadow: new THREE.MeshBasicMaterial({
      map: tex.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    }),
  };
}

function attachCollider(
  group: THREE.Group,
  size: [number, number, number],
  centerY: number,
  monumentId: ShrineMonumentId
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
 * 10-part Myojin Vermilion Torii Gate built procedurally with curved ExtrudeGeometry eaves & braided Shimenawa rope.
 */
export function buildToriiGate(mats: ShrineMaterialBundle): THREE.Group {
  const group = new THREE.Group();
  group.userData.monumentId = 'torii';

  const pillarSpan = 2.15;
  const pillarHeight = 4.25;
  const pillarRadius = 0.22;

  for (const side of [-1, 1]) {
    const x = side * pillarSpan;

    // 1. Stone Kamebara plinth
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, 0.48, 12),
      mats.graniteStone
    );
    plinth.position.set(x, 0.24, 0);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    // 2. Dark bronze base sleeve (Nemaki)
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.245, 0.275, 0.42, 14),
      mats.darkCharWood
    );
    collar.position.set(x, 0.65, 0);
    collar.castShadow = true;
    group.add(collar);

    // 3. Slightly inward-tilted vermilion pillar (Hashira)
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(pillarRadius * 0.9, pillarRadius, pillarHeight, 18),
      mats.vermilionWood
    );
    pillar.position.set(x * 0.985, 0.46 + pillarHeight * 0.5, 0);
    pillar.rotation.z = side * 0.032;
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);

    // 4. Kusabi timber wedges near lower tie beam
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.28), mats.darkCharWood);
    wedge.position.set(x * 0.96, 3.68, 0);
    group.add(wedge);

    // Contact shadow disk under each base
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), mats.contactShadow);
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(x, 0.015, 0);
    group.add(sh);
  }

  // 5. Lower crossbeam (Nuki)
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(5.55, 0.24, 0.2), mats.vermilionWood);
  nuki.position.set(0, 3.66, 0);
  nuki.castShadow = true;
  group.add(nuki);

  // 6. Upper Shimaki beam
  const shimaki = new THREE.Mesh(new THREE.BoxGeometry(6.15, 0.26, 0.34), mats.vermilionWood);
  shimaki.position.set(0, 4.46, 0);
  shimaki.castShadow = true;
  group.add(shimaki);

  // 7. Curved upturned Kasagi roof beam using ExtrudeGeometry
  const kasagiShape = new THREE.Shape();
  kasagiShape.moveTo(-3.42, 0.18);
  kasagiShape.quadraticCurveTo(0, -0.08, 3.42, 0.18);
  kasagiShape.lineTo(3.62, 0.44);
  kasagiShape.quadraticCurveTo(0, 0.18, -3.62, 0.44);
  kasagiShape.closePath();

  const kasagiGeo = new THREE.ExtrudeGeometry(kasagiShape, {
    depth: 0.48,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.035,
    bevelThickness: 0.035,
  });
  kasagiGeo.center();
  const kasagi = new THREE.Mesh(kasagiGeo, mats.darkCharWood);
  kasagi.position.set(0, 4.76, 0);
  kasagi.castShadow = true;
  group.add(kasagi);

  // 8. Gakuzuka vertical nameplate frame + calligraphy face
  const plaqueFrame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.82, 0.18), mats.goldLeaf);
  plaqueFrame.position.set(0, 4.06, 0.02);
  plaqueFrame.castShadow = true;
  group.add(plaqueFrame);

  const plaqueFront = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.72), mats.plaqueFace);
  plaqueFront.position.set(0, 4.06, 0.115);
  group.add(plaqueFront);

  // 9. Braided Shimenawa straw rope curved between pillars via TubeGeometry
  const ropeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.95, 3.55, 0.11),
    new THREE.Vector3(-1.0, 3.22, 0.13),
    new THREE.Vector3(0, 3.12, 0.14),
    new THREE.Vector3(1.0, 3.22, 0.13),
    new THREE.Vector3(1.95, 3.55, 0.11),
  ]);
  const ropeGeo = new THREE.TubeGeometry(ropeCurve, 24, 0.075, 8, false);
  const rope = new THREE.Mesh(ropeGeo, mats.shimenawaRope);
  rope.castShadow = true;
  group.add(rope);

  // 10. Hanging zigzag Shide paper strips
  const shideShape = new THREE.Shape();
  shideShape.moveTo(0, 0);
  shideShape.lineTo(0.08, -0.14);
  shideShape.lineTo(-0.02, -0.2);
  shideShape.lineTo(0.06, -0.34);
  shideShape.lineTo(-0.04, -0.4);
  shideShape.lineTo(-0.1, -0.26);
  shideShape.lineTo(-0.02, -0.18);
  shideShape.lineTo(-0.08, -0.06);
  shideShape.closePath();
  const shideGeo = new THREE.ShapeGeometry(shideShape);

  for (const sx of [-1.05, 0, 1.05]) {
    const shide = new THREE.Mesh(shideGeo, mats.shidePaper);
    shide.position.set(sx, sx === 0 ? 3.1 : 3.21, 0.18);
    group.add(shide);
  }

  attachCollider(group, [6.4, 5.1, 1.2], 2.55, 'torii');
  return group;
}

/**
 * 7-part Kasuga Stone Toro Lantern with LatheGeometry stone column & glowing inner firebox.
 */
export function buildToroLantern(mats: ShrineMaterialBundle): {
  group: THREE.Group;
  pointLight: THREE.PointLight;
} {
  const group = new THREE.Group();
  group.userData.monumentId = 'lantern';

  // 1. Turned base + column + middle platform via LatheGeometry
  const profile = [
    new THREE.Vector2(0.01, 0.0),
    new THREE.Vector2(0.56, 0.0),
    new THREE.Vector2(0.52, 0.16),
    new THREE.Vector2(0.36, 0.34),
    new THREE.Vector2(0.21, 0.44),
    new THREE.Vector2(0.18, 1.48),
    new THREE.Vector2(0.26, 1.56),
    new THREE.Vector2(0.46, 1.72),
    new THREE.Vector2(0.46, 1.84),
    new THREE.Vector2(0.01, 1.84),
  ];
  const columnGeo = new THREE.LatheGeometry(profile, 8);
  const column = new THREE.Mesh(columnGeo, mats.graniteStone);
  column.castShadow = true;
  column.receiveShadow = true;
  group.add(column);

  // 2. Warm glowing shoji firebox core (Hibukuro)
  const firebox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.23, 0.44, 6),
    mats.lanternEmissive
  );
  firebox.position.y = 2.06;
  group.add(firebox);

  // 3. Stone corner ribs around firebox
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.48, 0.065), mats.graniteStone);
    rib.position.set(Math.cos(angle) * 0.25, 2.06, Math.sin(angle) * 0.25);
    group.add(rib);
  }

  // 4. Swept hexagonal umbrella roof (Kasa)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.38, 6), mats.graniteStone);
  roof.position.y = 2.46;
  roof.castShadow = true;
  group.add(roof);

  // 5. Lotus Jewel Finial (Hoju)
  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 1), mats.bronzeMetal);
  finial.position.y = 2.74;
  finial.castShadow = true;
  group.add(finial);

  // 6. Contact shadow
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.45), mats.contactShadow);
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.015;
  group.add(sh);

  // 7. Real PointLight inside firebox
  const pointLight = new THREE.PointLight(0xffaa4c, 4.5, 11, 1.6);
  pointLight.position.set(0, 2.06, 0);
  group.add(pointLight);

  attachCollider(group, [1.3, 2.9, 1.3], 1.45, 'lantern');
  return { group, pointLight };
}

export interface TempleBellModel {
  group: THREE.Group;
  bellSwingGroup: THREE.Group;
  strikerGroup: THREE.Group;
  resonanceRing: THREE.Mesh;
  resonanceMaterial: THREE.MeshBasicMaterial;
}

/**
 * 9-part Shoro Temple Bell Pavilion & cast bronze Bonsho bell with swinging striker log.
 */
export function buildTempleBell(mats: ShrineMaterialBundle): TempleBellModel {
  const group = new THREE.Group();
  group.userData.monumentId = 'bell';

  // 1. Granite podium flush on ground (y = 0) + radial contact shadow
  const podium = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.28, 2.5), mats.graniteStone);
  podium.position.y = 0.14;
  podium.castShadow = true;
  podium.receiveShadow = true;
  group.add(podium);

  const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), mats.contactShadow);
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.015;
  group.add(sh);

  // 2. Four slightly inward-slanted cedar/vermilion pavilion corner posts
  const postOffset = 0.92;
  const postHeight = 2.65;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const stoneShoe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.16, 0.16, 10),
        mats.darkCharWood
      );
      stoneShoe.position.set(sx * postOffset, 0.34, sz * postOffset);
      group.add(stoneShoe);

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, postHeight, 12),
        mats.vermilionWood
      );
      post.position.set(sx * (postOffset * 0.93), 0.32 + postHeight * 0.5, sz * (postOffset * 0.93));
      post.rotation.z = sx * 0.045;
      post.rotation.x = -sz * 0.045;
      post.castShadow = true;
      post.receiveShadow = true;
      group.add(post);
    }
  }

  // 3. Upper cedar support tie beams framing the belfry
  for (const sz of [-0.82, 0.82]) {
    const beamX = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.16, 0.16), mats.naturalCedar);
    beamX.position.set(0, 2.86, sz);
    beamX.castShadow = true;
    group.add(beamX);
  }
  const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 1.95), mats.naturalCedar);
  ridgeBeam.position.set(0, 2.88, 0);
  ridgeBeam.castShadow = true;
  group.add(ridgeBeam);

  // 4. Swept pyramidal Shoro pavilion roof & bronze finial
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.05, 0.78, 4), mats.darkCharWood);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.32;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 1), mats.goldLeaf);
  finial.position.y = 3.74;
  finial.castShadow = true;
  group.add(finial);

  // 5. Swinging bronze Bonsho bell assembly pivoted from ridgeBeam (y = 2.78)
  const bellSwingGroup = new THREE.Group();
  bellSwingGroup.position.set(0, 2.78, 0);
  group.add(bellSwingGroup);

  const ryuzuHook = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 10, 18), mats.bronzeMetal);
  ryuzuHook.position.y = -0.14;
  bellSwingGroup.add(ryuzuHook);

  // LatheGeometry turned cast-bronze Bonsho profile (bottom-to-top exterior winding -> outward normals)
  const bellProfile = [
    new THREE.Vector2(0.01, -0.18),
    new THREE.Vector2(0.32, -0.35),
    new THREE.Vector2(0.40, -0.82),
    new THREE.Vector2(0.44, -1.24),
    new THREE.Vector2(0.56, -1.24),
    new THREE.Vector2(0.49, -0.95),
    new THREE.Vector2(0.45, -0.45),
    new THREE.Vector2(0.38, -0.14),
    new THREE.Vector2(0.24, -0.02),
    new THREE.Vector2(0.01, 0.0),
  ];
  const bellGeo = new THREE.LatheGeometry(bellProfile, 24);
  const bronzePatinaMat = new THREE.MeshStandardMaterial({
    color: 0x5c4f38,
    roughness: 0.28,
    metalness: 0.90,
  });
  const bellMesh = new THREE.Mesh(bellGeo, bronzePatinaMat);
  bellMesh.position.y = -0.22;
  bellMesh.castShadow = true;
  bellMesh.receiveShadow = true;
  bellSwingGroup.add(bellMesh);

  // Decorative raised horizontal bands & golden lotus striking boss (Tsukiza)
  const bandRing = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.024, 8, 24), mats.goldLeaf);
  bandRing.rotation.x = Math.PI / 2;
  bandRing.position.y = -0.86;
  bellSwingGroup.add(bandRing);

  const tsukiza = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), mats.goldLeaf);
  tsukiza.rotation.z = Math.PI / 2;
  tsukiza.position.set(0.50, -1.08, 0);
  bellSwingGroup.add(tsukiza);

  // 6. Suspended wooden Shumoku striker log on right side (+X)
  const strikerGroup = new THREE.Group();
  strikerGroup.position.set(1.06, 2.75, 0);
  group.add(strikerGroup);

  const ropeLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.05, 6), mats.shimenawaRope);
  ropeLeft.position.set(-0.22, -0.52, 0);
  strikerGroup.add(ropeLeft);

  const ropeRight = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.05, 6), mats.shimenawaRope);
  ropeRight.position.set(0.22, -0.52, 0);
  strikerGroup.add(ropeRight);

  const shumokuLog = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 1.02, 12), mats.naturalCedar);
  shumokuLog.rotation.z = Math.PI / 2;
  shumokuLog.position.set(0, -1.04, 0);
  shumokuLog.castShadow = true;
  strikerGroup.add(shumokuLog);

  // 7. Expanding golden acoustic resonance wave ring around bell base
  const resonanceMaterial = new THREE.MeshBasicMaterial({
    color: 0xf6c945,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const resonanceRing = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.84, 36),
    resonanceMaterial
  );
  resonanceRing.rotation.x = -Math.PI / 2;
  resonanceRing.position.y = 1.65;
  resonanceRing.visible = false;
  group.add(resonanceRing);

  // 8. Dedicated raycast collider on Layer 1
  attachCollider(group, [2.7, 3.8, 2.7], 1.9, 'bell');

  return {
    group,
    bellSwingGroup,
    strikerGroup,
    resonanceRing,
    resonanceMaterial,
  };
}

/**
 * Multi-tier Kyoto Sanctuary Pagoda anchored on carved stone podium.
 */
export function buildSanctuaryPagoda(mats: ShrineMaterialBundle): THREE.Group {
  const group = new THREE.Group();
  group.userData.monumentId = 'pagoda';

  // Stone podium foundation
  const base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.65, 5.2), mats.graniteStone);
  base.position.y = 0.325;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const steps = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.36, 1.2), mats.graniteStone);
  steps.position.set(0, 0.18, 2.9);
  steps.castShadow = true;
  steps.receiveShadow = true;
  group.add(steps);

  let cursorY = 0.65;
  const tiers = [
    { coreW: 3.1, coreH: 1.85, roofW: 4.85, roofH: 0.72 },
    { coreW: 2.45, coreH: 1.55, roofW: 4.0, roofH: 0.65 },
    { coreW: 1.85, coreH: 1.35, roofW: 3.15, roofH: 0.58 },
  ];

  for (const tier of tiers) {
    // Cedar core wall
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(tier.coreW, tier.coreH, tier.coreW),
      mats.vermilionWood
    );
    core.position.y = cursorY + tier.coreH * 0.5;
    core.castShadow = true;
    core.receiveShadow = true;
    group.add(core);

    // Glowing shoji screen bands with dark cedar kumiko lattice bars
    const windowStrip = new THREE.Mesh(
      new THREE.BoxGeometry(tier.coreW + 0.03, tier.coreH * 0.44, tier.coreW * 0.52),
      mats.shojiEmissive
    );
    windowStrip.position.y = cursorY + tier.coreH * 0.48;
    group.add(windowStrip);

    const windowStripCross = new THREE.Mesh(
      new THREE.BoxGeometry(tier.coreW * 0.52, tier.coreH * 0.44, tier.coreW + 0.03),
      mats.shojiEmissive
    );
    windowStripCross.position.y = cursorY + tier.coreH * 0.48;
    group.add(windowStripCross);

    // Dark cedar horizontal lintel trim framing shoji strips
    const mullionMid = new THREE.Mesh(
      new THREE.BoxGeometry(tier.coreW + 0.06, 0.07, tier.coreW * 0.55),
      mats.darkCharWood
    );
    mullionMid.position.y = cursorY + tier.coreH * 0.48;
    group.add(mullionMid);

    const mullionMidCross = new THREE.Mesh(
      new THREE.BoxGeometry(tier.coreW * 0.55, 0.07, tier.coreW + 0.06),
      mats.darkCharWood
    );
    mullionMidCross.position.y = cursorY + tier.coreH * 0.48;
    group.add(mullionMidCross);

    // Tier roof with slight upward flare silhouette
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(tier.roofW * 0.74, tier.roofH, 4),
      mats.darkCharWood
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = cursorY + tier.coreH + tier.roofH * 0.42;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);

    // Gold tip eave trim
    const fascia = new THREE.Mesh(
      new THREE.BoxGeometry(tier.roofW * 0.96, 0.08, tier.roofW * 0.96),
      mats.naturalCedar
    );
    fascia.position.y = cursorY + tier.coreH + 0.04;
    group.add(fascia);

    cursorY += tier.coreH + tier.roofH * 0.72;
  }

  // Bronze Sorin Spire built with LatheGeometry
  const spireProfile = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.32, 0),
    new THREE.Vector2(0.24, 0.25),
    new THREE.Vector2(0.09, 0.4),
    new THREE.Vector2(0.14, 0.8),
    new THREE.Vector2(0.06, 1.3),
    new THREE.Vector2(0.12, 1.55),
    new THREE.Vector2(0.02, 2.05),
  ];
  const spire = new THREE.Mesh(new THREE.LatheGeometry(spireProfile, 12), mats.goldLeaf);
  spire.position.y = cursorY + 0.1;
  spire.castShadow = true;
  group.add(spire);

  const sh = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 7.2), mats.contactShadow);
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.012;
  group.add(sh);

  attachCollider(group, [5.4, 8.6, 5.4], 4.3, 'pagoda');
  return group;
}

/**
 * Raked Karesansui Zen gravel plaza, stepped Tobi-ishi path stones, mossy rock islands, and InstancedMesh bamboo grove.
 */
export function buildZenCourtyard(mats: ShrineMaterialBundle): THREE.Group {
  const group = new THREE.Group();

  // Wide forest floor extending seamlessly into horizon fog
  const earth = new THREE.Mesh(
    new THREE.CircleGeometry(110, 48),
    new THREE.MeshStandardMaterial({
      color: 0x18211b,
      roughness: 0.96,
      metalness: 0.0,
    })
  );
  earth.rotation.x = -Math.PI / 2;
  earth.position.y = -0.02;
  earth.receiveShadow = true;
  group.add(earth);

  // Raked Karesansui gravel sanctuary bed
  const gravelBed = new THREE.Mesh(new THREE.BoxGeometry(16, 0.08, 22), mats.rakedGravel);
  gravelBed.position.set(0, 0.01, -1.5);
  gravelBed.receiveShadow = true;
  gravelBed.userData.monumentId = 'zen_garden';
  group.add(gravelBed);

  // Collider for clicking the Zen gravel garden
  const zenCollider = new THREE.Mesh(
    new THREE.BoxGeometry(12, 0.6, 14),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  zenCollider.position.set(3.2, 0.25, -2.5);
  zenCollider.layers.set(1);
  zenCollider.userData.monumentId = 'zen_garden';
  group.add(zenCollider);

  // Cedar border frame around Zen courtyard
  const borderLongGeo = new THREE.BoxGeometry(0.28, 0.2, 22.3);
  const borderShortGeo = new THREE.BoxGeometry(16.5, 0.2, 0.28);
  for (const bx of [-8.0, 8.0]) {
    const b = new THREE.Mesh(borderLongGeo, mats.naturalCedar);
    b.position.set(bx, 0.08, -1.5);
    b.receiveShadow = true;
    group.add(b);
  }
  for (const bz of [-12.5, 9.5]) {
    const b = new THREE.Mesh(borderShortGeo, mats.naturalCedar);
    b.position.set(0, 0.08, bz);
    b.receiveShadow = true;
    group.add(b);
  }

  // Curved Tobi-ishi stepping stones leading under Torii (left/off-center Seichu etiquette path!)
  const stonePositions: Array<[number, number, number]> = [
    [0.65, 8.6, 0.92],
    [0.72, 7.1, 0.84],
    [0.58, 5.5, 0.9],
    [0.52, 3.8, 0.96],
    [0.44, 2.1, 0.88],
    [0.25, 0.4, 0.92],
    [0.05, -1.4, 0.9],
    [-0.1, -3.1, 0.86],
    [0.0, -4.8, 0.95],
  ];
  const slabGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.1, 7);
  for (const [sx, sz, sScale] of stonePositions) {
    const slab = new THREE.Mesh(slabGeo, mats.graniteStone);
    slab.position.set(sx, 0.06, sz);
    slab.scale.set(sScale, 1, sScale * 0.86);
    slab.rotation.y = sx * 1.4 + sz * 0.3;
    slab.receiveShadow = true;
    slab.castShadow = true;
    group.add(slab);
  }

  // Mossy rock island clusters flanking gravel rings
  const rockClusters = [
    { x: -4.2, z: -2.2, rocks: [1.05, 0.62, 0.48] },
    { x: 4.5, z: -2.8, rocks: [1.15, 0.7, 0.5] },
  ];
  for (const cluster of rockClusters) {
    const mound = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 2.2, 0.22, 16),
      mats.mossStone
    );
    mound.position.set(cluster.x, 0.1, cluster.z);
    mound.receiveShadow = true;
    group.add(mound);

    cluster.rocks.forEach((radius, idx) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 1), mats.graniteStone);
      rock.scale.set(1.1, 0.78, 0.92);
      rock.position.set(
        cluster.x + (idx === 0 ? 0 : idx === 1 ? 0.95 : -0.85),
        0.15 + radius * 0.55,
        cluster.z + (idx === 1 ? 0.55 : -0.45)
      );
      rock.rotation.set(idx * 0.4, idx * 1.1, 0.2);
      rock.castShadow = true;
      rock.receiveShadow = true;
      group.add(rock);
    });
  }

  // Instanced Bamboo sanctuary backdrop (curved strictly behind & beside courtyard so camera foreground is open)
  const bambooCount = 46;
  const bambooGeo = new THREE.CylinderGeometry(0.11, 0.14, 7.6, 8);
  const bambooMat = new THREE.MeshStandardMaterial({
    color: 0x3b6e3c,
    roughness: 0.42,
    metalness: 0.04,
  });
  const bambooMesh = new THREE.InstancedMesh(bambooGeo, bambooMat, bambooCount);
  bambooMesh.castShadow = true;
  bambooMesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const rand = seededRand(7741);

  for (let i = 0; i < bambooCount; i++) {
    // Semicircle from left-flank (-PI*1.08) around back (-PI*0.5) to right-flank (+PI*0.08)
    const angle = -Math.PI * 1.06 + (i / (bambooCount - 1)) * Math.PI * 1.12;
    const radius = 10.6 + rand() * 5.8;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 3.6;
    const scaleY = 0.78 + rand() * 0.65;
    const scaleXZ = 0.8 + rand() * 0.45;
    dummy.position.set(x, (7.6 * scaleY) / 2 - 0.1, z);
    dummy.rotation.set((rand() - 0.5) * 0.08, rand() * Math.PI, (rand() - 0.5) * 0.08);
    dummy.scale.set(scaleXZ, scaleY, scaleXZ);
    dummy.updateMatrix();
    bambooMesh.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.31 + (rand() - 0.5) * 0.04, 0.36, 0.24 + rand() * 0.14);
    bambooMesh.setColorAt(i, color);
  }
  bambooMesh.instanceMatrix.needsUpdate = true;
  if (bambooMesh.instanceColor) bambooMesh.instanceColor.needsUpdate = true;
  bambooMesh.computeBoundingSphere();
  bambooMesh.frustumCulled = false;
  group.add(bambooMesh);

  return group;
}

/**
 * Instanced drifting sakura petals / twilight embers with zero per-frame allocations.
 */
export function buildDriftingPetals(count = 48): DriftingPetalSystem {
  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, 0);
  petalShape.quadraticCurveTo(0.09, 0.08, 0.04, 0.18);
  petalShape.lineTo(0, 0.14);
  petalShape.lineTo(-0.04, 0.18);
  petalShape.quadraticCurveTo(-0.09, 0.08, 0, 0);

  const geo = new THREE.ShapeGeometry(petalShape);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffd1e0,
    emissive: new THREE.Color(0xff9bbd),
    emissiveIntensity: 0.35,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.InstancedMesh(geo, material, count);
  mesh.frustumCulled = false;

  const baseX = new Float32Array(count);
  const baseY = new Float32Array(count);
  const baseZ = new Float32Array(count);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const scales = new Float32Array(count);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const rand = seededRand(9021);

  for (let i = 0; i < count; i++) {
    baseX[i] = (rand() - 0.5) * 20;
    baseY[i] = 1.2 + rand() * 7.5;
    baseZ[i] = (rand() - 0.5) * 22 - 2;
    phases[i] = rand() * Math.PI * 2;
    speeds[i] = 0.55 + rand() * 0.7;
    scales[i] = 0.85 + rand() * 0.45;
    dummy.position.set(baseX[i], baseY[i], baseZ[i]);
    dummy.scale.setScalar(scales[i]);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.setHSL(0.95 + rand() * 0.04, 0.72, 0.82 + rand() * 0.12);
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();

  return {
    mesh,
    material,
    baseX,
    baseY,
    baseZ,
    phases,
    speeds,
    scales,
    dummy,
  };
}

export function buildSkyDome(): {
  mesh: THREE.Mesh;
  uniforms: { topColor: { value: THREE.Color }; bottomColor: { value: THREE.Color } };
} {
  const uniforms = {
    topColor: { value: new THREE.Color(0x16223d) },
    bottomColor: { value: new THREE.Color(0xd97d54) },
  };
  const skyGeo = new THREE.SphereGeometry(68, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPos;
      void main() {
        float h = clamp(normalize(vWorldPos).y * 1.45 + 0.15, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, smoothstep(0.0, 1.0, h)), 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(skyGeo, skyMat);
  return { mesh, uniforms };
}
