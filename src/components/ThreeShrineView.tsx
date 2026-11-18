import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  ChevronUp,
  Compass,
  Droplets,
  Eye,
  Mountain,
  Sparkles,
} from 'lucide-react';
import {
  SHRINE_BIOMES,
  getAtmospherePreset,
  getCameraPreset,
  getCameraPresetsForBiome,
  getMonumentInfo,
  type AnyCameraPresetId,
  type AnyMonumentId,
  type ShrineBiomeId,
  type ShrineTimeOfDayId,
} from '../utils/shrineSceneConfig';
import {
  buildDriftingPetals,
  buildSanctuaryPagoda,
  buildSkyDome,
  buildTempleBell,
  buildToroLantern,
  buildToriiGate,
  buildZenCourtyard,
  createShrineMaterials,
  createShrineTextures,
} from '../three/shrineModels';
import { buildJigokudaniBiome } from '../three/jigokudaniModels';
import {
  computeBellShakeOffset,
  createInitialBellPhysicsState,
  stepBellPhysics,
  triggerBellStrike,
  type TempleBellPhysicsState,
  type TempleBellShakeOffset,
} from '../utils/templeBell';
import { playTempleBellChime } from '../utils/templeBellAudio';
import {
  createInitialRippleSlots,
  spawnWaterRipple,
  type OnsenRippleSlot,
} from '../utils/onsenRipple';
import { playOnsenRippleSound } from '../utils/onsenAudio';

interface ThreeShrineViewProps {
  selectedCityName: string;
  onExit: () => void;
}

function detectSoftwareGl(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '')
      : String(gl.getParameter(gl.RENDERER) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
  } catch {
    return true;
  }
}

function afterDraw(
  gl: WebGL2RenderingContext | WebGLRenderingContext,
  cb: () => void,
  cooldownMs = 80
) {
  const isWebGl2 =
    typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  if (!isWebGl2) {
    setTimeout(cb, cooldownMs);
    return;
  }
  const gl2 = gl as WebGL2RenderingContext;
  const sync = gl2.fenceSync(gl2.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!sync) {
    setTimeout(cb, cooldownMs);
    return;
  }
  gl2.flush();
  const poll = () => {
    const status = gl2.clientWaitSync(sync, 0, 0);
    if (status === gl2.TIMEOUT_EXPIRED) {
      setTimeout(poll, 16);
      return;
    }
    gl2.deleteSync(sync);
    setTimeout(cb, cooldownMs);
  };
  poll();
}

const KYOTO_LIGHTS: ShrineTimeOfDayId[] = ['dawn', 'dusk', 'night'];
const JIGOKUDANI_LIGHTS: ShrineTimeOfDayId[] = ['winter_twilight', 'dawn', 'dusk', 'night'];

export const ThreeShrineView: React.FC<ThreeShrineViewProps> = ({
  selectedCityName,
  onExit,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [biome, setBiome] = useState<ShrineBiomeId>('kyoto_shrine');
  const [cameraPreset, setCameraPreset] = useState<AnyCameraPresetId>('overview');
  const [timeOfDay, setTimeOfDay] = useState<ShrineTimeOfDayId>('dusk');
  const [activeMonument, setActiveMonument] = useState<AnyMonumentId>('torii');
  const [autoSpin, setAutoSpin] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [bellRingCount, setBellRingCount] = useState(0);
  const [waterRippleCount, setWaterRippleCount] = useState(0);
  const [isBellShaking, setIsBellShaking] = useState(false);

  // Refs bridging React UI controls into WebGL loop without tearing down the scene
  const biomeRef = useRef<ShrineBiomeId>('kyoto_shrine');
  const targetCamPosRef = useRef(new THREE.Vector3(11.5, 6.2, 13.8));
  const targetLookAtRef = useRef(new THREE.Vector3(0, 2.2, -1.5));
  const isLerpingCamRef = useRef(false);
  const timeOfDayRef = useRef<ShrineTimeOfDayId>('dusk');
  const autoSpinRef = useRef(false);
  const bellPhysicsRef = useRef<TempleBellPhysicsState>(createInitialBellPhysicsState());
  const isShakingRef = useRef(false);
  const rippleSlotsRef = useRef<OnsenRippleSlot[]>(createInitialRippleSlots());
  const elapsedRef = useRef(0);
  const steamBurstFnRef = useRef<((x: number, z: number) => void) | null>(null);
  const rippleUploadFnRef = useRef<((slots: OnsenRippleSlot[], elapsed: number) => void) | null>(
    null
  );

  const handleRingBell = () => {
    bellPhysicsRef.current = triggerBellStrike(bellPhysicsRef.current);
    playTempleBellChime();
    setBellRingCount((c) => c + 1);
    setActiveMonument('bell');
    if (!isShakingRef.current) {
      isShakingRef.current = true;
      setIsBellShaking(true);
    }
  };
  const handleRingBellRef = useRef(handleRingBell);
  handleRingBellRef.current = handleRingBell;

  const handleSpawnWaterRipple = (worldX = 0, worldZ = 0) => {
    const res = spawnWaterRipple(rippleSlotsRef.current, worldX, worldZ, elapsedRef.current, 1.15);
    rippleSlotsRef.current = res.slots;
    rippleUploadFnRef.current?.(res.slots, elapsedRef.current);
    steamBurstFnRef.current?.(res.slots[res.slotIndex].x, res.slots[res.slotIndex].z);
    playOnsenRippleSound();
    setWaterRippleCount((c) => c + 1);
    setActiveMonument('onsen_pool');
  };
  const handleSpawnWaterRippleRef = useRef(handleSpawnWaterRipple);
  handleSpawnWaterRippleRef.current = handleSpawnWaterRipple;

  const immediateRenderFnRef = useRef<(() => void) | null>(null);

  const handleSelectBiome = (nextBiome: ShrineBiomeId) => {
    const info = SHRINE_BIOMES[nextBiome];
    const preset = getCameraPreset(info.defaultCameraPreset, nextBiome);
    biomeRef.current = nextBiome;
    timeOfDayRef.current = info.defaultTimeOfDay;
    targetCamPosRef.current.set(...preset.position);
    targetLookAtRef.current.set(...preset.target);
    isLerpingCamRef.current = true;

    setBiome(nextBiome);
    setTimeOfDay(info.defaultTimeOfDay);
    setCameraPreset(info.defaultCameraPreset);
    setActiveMonument(info.defaultMonument);

    if (nextBiome === 'jigokudani') {
      // Seed one gentle ambient ripple right on entry so steam & pool look immediately alive
      const seeded = spawnWaterRipple(
        rippleSlotsRef.current,
        -0.4,
        0.2,
        elapsedRef.current,
        0.95
      );
      rippleSlotsRef.current = seeded.slots;
      rippleUploadFnRef.current?.(seeded.slots, elapsedRef.current);
    }
    immediateRenderFnRef.current?.();
  };

  useEffect(() => {
    biomeRef.current = biome;
  }, [biome]);

  useEffect(() => {
    timeOfDayRef.current = timeOfDay;
  }, [timeOfDay]);

  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);

  useEffect(() => {
    const preset = getCameraPreset(cameraPreset, biome);
    targetCamPosRef.current.set(...preset.position);
    targetLookAtRef.current.set(...preset.target);
    isLerpingCamRef.current = true;
  }, [cameraPreset, biome]);

  // Keyboard shortcuts: H toggles dock visibility, B rings bell / R ripples onsen, Escape exits
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setControlsCollapsed((v) => !v);
      } else if (e.key === 'b' || e.key === 'B') {
        if (biomeRef.current === 'kyoto_shrine') {
          handleRingBellRef.current();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (biomeRef.current === 'jigokudani') {
          handleSpawnWaterRippleRef.current(
            (Math.random() - 0.5) * 2.2,
            (Math.random() - 0.5) * 2.2
          );
        }
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onExit]);

  // Main Three.js scene lifecycle (mounts both biomes inside single shared WebGL context)
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const initAtmo = getAtmospherePreset(timeOfDayRef.current);
    const fog = new THREE.FogExp2(initAtmo.fogHex, initAtmo.fogDensity);
    scene.fog = fog;
    scene.background = new THREE.Color(initAtmo.skyBottomHex);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = initAtmo.envIntensity;
    roomEnv.dispose();
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.25, 175);
    camera.position.set(11.5, 6.2, 13.8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2.2, -1.5);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.minDistance = 4.2;
    controls.maxDistance = 32;
    controls.maxPolarAngle = Math.PI * 0.475;
    controls.minPolarAngle = 0.14;
    controls.update();

    const onControlStart = () => {
      isLerpingCamRef.current = false;
    };
    controls.addEventListener('start', onControlStart);

    // Sky & Atmospheric Lights (shared cleanly between biomes with smooth damping transitions)
    const skyDome = buildSkyDome();
    scene.add(skyDome.mesh);

    const hemiLight = new THREE.HemisphereLight(
      initAtmo.hemiSkyHex,
      initAtmo.hemiGroundHex,
      initAtmo.hemiIntensity
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(initAtmo.keyHex, initAtmo.keyIntensity);
    keyLight.position.set(...initAtmo.keyPosition);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 52;
      keyLight.shadow.camera.left = -18;
      keyLight.shadow.camera.right = 18;
      keyLight.shadow.camera.top = 18;
      keyLight.shadow.camera.bottom = -18;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);

    // -------------------------------------------------------------------------
    // BIOME 1: Kyoto Shrine & Zen Courtyard
    // -------------------------------------------------------------------------
    const kyotoGroup = new THREE.Group();
    scene.add(kyotoGroup);

    const textures = createShrineTextures(maxAnisotropy);
    const materials = createShrineMaterials(textures);

    const courtyard = buildZenCourtyard(materials);
    kyotoGroup.add(courtyard);

    const torii = buildToriiGate(materials);
    torii.position.set(0, 0, 2.0);
    kyotoGroup.add(torii);

    const leftLantern = buildToroLantern(materials);
    leftLantern.group.position.set(-2.6, 0, -0.4);
    kyotoGroup.add(leftLantern.group);

    const rightLantern = buildToroLantern(materials);
    rightLantern.group.position.set(2.6, 0, -0.4);
    kyotoGroup.add(rightLantern.group);

    const pagoda = buildSanctuaryPagoda(materials);
    pagoda.position.set(0, 0, -8.5);
    kyotoGroup.add(pagoda);

    const templeBell = buildTempleBell(materials);
    templeBell.group.position.set(-4.8, 0, 3.4);
    kyotoGroup.add(templeBell.group);

    const petals = buildDriftingPetals(48);
    kyotoGroup.add(petals.mesh);

    // -------------------------------------------------------------------------
    // BIOME 2: Snow-Dusted Jigokudani Hot Spring Ravine (地獄谷)
    // -------------------------------------------------------------------------
    const jigokudani = buildJigokudaniBiome(maxAnisotropy);
    jigokudani.group.visible = biomeRef.current === 'jigokudani';
    kyotoGroup.visible = biomeRef.current === 'kyoto_shrine';
    scene.add(jigokudani.group);

    steamBurstFnRef.current = jigokudani.spawnSteamBurst;
    rippleUploadFnRef.current = jigokudani.updateRipples;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycaster strictly targeting layer 1 interactive targets on the active biome
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointerNdc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let lastHoverCheck = 0;

    const getActiveBiomeRoots = () =>
      biomeRef.current === 'jigokudani' ? [jigokudani.group] : [kyotoGroup];

    const onPointerDown = (ev: PointerEvent) => {
      downX = ev.clientX;
      downY = ev.clientY;
    };

    const onPointerMove = (ev: PointerEvent) => {
      const nowMs = performance.now();
      if (nowMs - lastHoverCheck < 80) return;
      lastHoverCheck = nowMs;
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(getActiveBiomeRoots(), true);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    const onPointerUp = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - downX, ev.clientY - downY);
      if (dist > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(getActiveBiomeRoots(), true);
      if (hits.length > 0) {
        const hit = hits[0];
        const monId = hit.object.userData.monumentId as AnyMonumentId | undefined;
        if (monId === 'bell') {
          handleRingBellRef.current();
          return;
        }
        if (monId === 'onsen_pool') {
          handleSpawnWaterRippleRef.current(hit.point.x, hit.point.z);
          return;
        }
        if (monId) {
          setActiveMonument(monId);
          setCameraPreset(getMonumentInfo(monId).cameraPreset);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Pre-allocated animation scratch colors & timing
    const targetFogColor = new THREE.Color();
    const targetSkyTop = new THREE.Color();
    const targetSkyBottom = new THREE.Color();
    const targetHemiSky = new THREE.Color();
    const targetHemiGround = new THREE.Color();
    const targetKeyColor = new THREE.Color();
    const targetParticleColor = new THREE.Color();
    const targetKeyPos = new THREE.Vector3();
    const camPosBeforeShake = new THREE.Vector3();
    const camQuatBeforeShake = new THREE.Quaternion();
    const camRight = new THREE.Vector3();
    const camUp = new THREE.Vector3();
    const shakeScratch: TempleBellShakeOffset = { offsetX: 0, offsetY: 0, rollRad: 0 };

    let disposed = false;
    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const tick = (now?: number) => {
      if (disposed) return;
      const tNow = typeof now === 'number' ? now : performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (tNow - lastTime) / 1000));
      lastTime = tNow;
      elapsed += dt;
      elapsedRef.current = elapsed;

      const isJigokudani = biomeRef.current === 'jigokudani';
      kyotoGroup.visible = !isJigokudani;
      jigokudani.group.visible = isJigokudani;

      // Apply atmospheric preset transitions via exponential damping
      const atmo = getAtmospherePreset(timeOfDayRef.current);
      const blend = isSoftwareGl ? 0.65 : 1 - Math.exp(-7.0 * dt);
      targetFogColor.setHex(atmo.fogHex);
      fog.color.lerp(targetFogColor, blend);
      fog.density = THREE.MathUtils.lerp(fog.density, atmo.fogDensity, blend);

      targetSkyTop.setHex(atmo.skyTopHex);
      targetSkyBottom.setHex(atmo.skyBottomHex);
      skyDome.uniforms.topColor.value.lerp(targetSkyTop, blend);
      skyDome.uniforms.bottomColor.value.lerp(targetSkyBottom, blend);

      targetHemiSky.setHex(atmo.hemiSkyHex);
      targetHemiGround.setHex(atmo.hemiGroundHex);
      hemiLight.color.lerp(targetHemiSky, blend);
      hemiLight.groundColor.lerp(targetHemiGround, blend);
      hemiLight.intensity = THREE.MathUtils.lerp(hemiLight.intensity, atmo.hemiIntensity, blend);

      targetKeyColor.setHex(atmo.keyHex);
      keyLight.color.lerp(targetKeyColor, blend);
      keyLight.intensity = THREE.MathUtils.lerp(keyLight.intensity, atmo.keyIntensity, blend);
      targetKeyPos.set(...atmo.keyPosition);
      keyLight.position.lerp(targetKeyPos, blend);

      scene.environmentIntensity = THREE.MathUtils.lerp(
        scene.environmentIntensity,
        atmo.envIntensity,
        blend
      );

      // Smooth camera preset transition
      if (isLerpingCamRef.current) {
        const camAlpha = isSoftwareGl ? 0.65 : 1 - Math.exp(-8.5 * dt);
        camera.position.lerp(targetCamPosRef.current, camAlpha);
        controls.target.lerp(targetLookAtRef.current, camAlpha);
        if (
          camera.position.distanceTo(targetCamPosRef.current) < 0.03 &&
          controls.target.distanceTo(targetLookAtRef.current) < 0.03
        ) {
          isLerpingCamRef.current = false;
        }
      }

      controls.autoRotate = autoSpinRef.current;
      controls.autoRotateSpeed = 0.65;
      controls.update();

      if (isJigokudani) {
        jigokudani.updateRipples(rippleSlotsRef.current, elapsed);
        jigokudani.updateFrame(
          dt,
          elapsed,
          camera,
          atmo.lanternIntensity,
          atmo.amberSteamHex ?? 0xffad4d,
          atmo.particleColorHex
        );
        if (isShakingRef.current) {
          isShakingRef.current = false;
          setIsBellShaking(false);
        }
        renderer.render(scene, camera);
      } else {
        // Kyoto lanterns flicker
        const flicker = 1 + Math.sin(elapsed * 4.3) * 0.05 + Math.sin(elapsed * 9.1) * 0.025;
        leftLantern.pointLight.intensity = atmo.lanternIntensity * flicker;
        rightLantern.pointLight.intensity = atmo.lanternIntensity * (2 - flicker);
        materials.lanternEmissive.emissiveIntensity = Math.max(0.9, atmo.lanternIntensity * 0.55);

        // Sakura petals drift
        targetParticleColor.setHex(atmo.particleColorHex);
        petals.material.color.lerp(targetParticleColor, blend);
        petals.material.emissive.lerp(targetParticleColor, blend);

        const pCount = petals.baseX.length;
        for (let i = 0; i < pCount; i++) {
          const phase = petals.phases[i];
          const speed = petals.speeds[i];
          const yRange = 7.6;
          const y = (((petals.baseY[i] - elapsed * speed * 0.65) % yRange) + yRange) % yRange + 0.5;
          const x = petals.baseX[i] + Math.sin(elapsed * speed + phase) * 0.9;
          const z = petals.baseZ[i] + Math.cos(elapsed * speed * 0.8 + phase) * 0.7;
          petals.dummy.position.set(x, y, z);
          petals.dummy.rotation.set(elapsed * 0.8 + phase, elapsed * 0.6 + phase, phase);
          petals.dummy.scale.setScalar(petals.scales[i]);
          petals.dummy.updateMatrix();
          petals.mesh.setMatrixAt(i, petals.dummy.matrix);
        }
        petals.mesh.instanceMatrix.needsUpdate = true;

        // Temple Bell spring physics + resonance halo + trauma screen shake
        const nextBellState = stepBellPhysics(bellPhysicsRef.current, dt);
        bellPhysicsRef.current = nextBellState;
        templeBell.bellSwingGroup.rotation.z = nextBellState.bellAngle;
        templeBell.strikerGroup.rotation.z = nextBellState.strikerAngle;

        if (nextBellState.ringWave >= 0) {
          templeBell.resonanceRing.visible = true;
          const ringScale = 1 + nextBellState.ringWave * 4.8;
          templeBell.resonanceRing.scale.set(ringScale, ringScale, 1);
          templeBell.resonanceMaterial.opacity = (1 - nextBellState.ringWave) * 0.7;
        } else {
          templeBell.resonanceRing.visible = false;
          templeBell.resonanceMaterial.opacity = 0;
        }

        const activeShakeNow = nextBellState.trauma > 0.015;
        if (activeShakeNow !== isShakingRef.current) {
          isShakingRef.current = activeShakeNow;
          setIsBellShaking(activeShakeNow);
        }

        computeBellShakeOffset(nextBellState, shakeScratch);
        const hasShake =
          shakeScratch.offsetX !== 0 || shakeScratch.offsetY !== 0 || shakeScratch.rollRad !== 0;

        if (hasShake) {
          camPosBeforeShake.copy(camera.position);
          camQuatBeforeShake.copy(camera.quaternion);
          camRight.setFromMatrixColumn(camera.matrixWorld, 0);
          camUp.setFromMatrixColumn(camera.matrixWorld, 1);
          camera.position
            .addScaledVector(camRight, shakeScratch.offsetX)
            .addScaledVector(camUp, shakeScratch.offsetY);
          camera.rotateZ(shakeScratch.rollRad);
          renderer.render(scene, camera);
          camera.position.copy(camPosBeforeShake);
          camera.quaternion.copy(camQuatBeforeShake);
        } else {
          renderer.render(scene, camera);
        }
      }

      if (isSoftwareGl) {
        afterDraw(renderer.getContext(), () => {
          if (!disposed) rafId = requestAnimationFrame(tick);
        });
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    immediateRenderFnRef.current = () => {
      if (disposed) return;
      const isJig = biomeRef.current === 'jigokudani';
      kyotoGroup.visible = !isJig;
      jigokudani.group.visible = isJig;
      const atmo = getAtmospherePreset(timeOfDayRef.current);
      fog.color.setHex(atmo.fogHex);
      fog.density = atmo.fogDensity;
      skyDome.uniforms.topColor.value.setHex(atmo.skyTopHex);
      skyDome.uniforms.bottomColor.value.setHex(atmo.skyBottomHex);
      hemiLight.color.setHex(atmo.hemiSkyHex);
      hemiLight.groundColor.setHex(atmo.hemiGroundHex);
      hemiLight.intensity = atmo.hemiIntensity;
      keyLight.color.setHex(atmo.keyHex);
      keyLight.intensity = atmo.keyIntensity;
      keyLight.position.set(...atmo.keyPosition);
      scene.environmentIntensity = atmo.envIntensity;
      camera.position.copy(targetCamPosRef.current);
      controls.target.copy(targetLookAtRef.current);
      isLerpingCamRef.current = false;
      controls.update();
      if (isJig) {
        jigokudani.updateRipples(rippleSlotsRef.current, elapsedRef.current);
        jigokudani.updateFrame(
          0.016,
          elapsedRef.current,
          camera,
          atmo.lanternIntensity,
          atmo.amberSteamHex ?? 0xff9b38,
          atmo.particleColorHex
        );
      }
      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      immediateRenderFnRef.current = null;
      steamBurstFnRef.current = null;
      rippleUploadFnRef.current = null;
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('start', onControlStart);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();

      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        const mat = (obj as THREE.Mesh).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else if (mat) {
          mat.dispose();
        }
      });

      Object.values(textures).forEach((tex) => tex.dispose());
      Object.values(jigokudani.textures).forEach((tex) => tex.dispose());
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const currentBiomeInfo = SHRINE_BIOMES[biome];
  const currentMonument = getMonumentInfo(activeMonument);
  const activeCameraPresets = getCameraPresetsForBiome(biome);
  const activeLightOptions = biome === 'jigokudani' ? JIGOKUDANI_LIGHTS : KYOTO_LIGHTS;

  return (
    <div
      className="fixed inset-0 z-40 w-screen h-screen overflow-hidden bg-[#080c15] text-slate-100 select-none"
      role="region"
      aria-label={currentBiomeInfo.label}
      data-biome={biome}
      data-lighting={timeOfDay}
      data-bell-rings={bellRingCount}
      data-bell-shaking={isBellShaking ? 'true' : 'false'}
      data-water-ripples={waterRippleCount}
    >
      {/* Dedicated WebGL mount container with zero React children */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {/* Top Overlay Header + Biome Switcher + Etiquette Plaque (solid/rgba — no backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute top-4 left-4 right-4 flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl px-4 py-2.5 bg-[#0a0e17]/90 border border-amber-300/25 shadow-lg">
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Exit 3D Shrine
          </button>
          <div>
            <p className="font-display text-sm font-bold text-amber-100">
              {currentBiomeInfo.label}
            </p>
            <p className="text-[11px] text-amber-200/75">
              Context: {selectedCityName} ·{' '}
              {biome === 'jigokudani'
                ? 'Click water surface for ripples & steam · Drag to orbit'
                : 'Click any landmark or bell · Drag to orbit'}
            </p>
          </div>

          {/* Biome Toggle */}
          <div
            className="flex items-center gap-1 rounded-lg bg-white/5 p-1 border border-white/10"
            role="group"
            aria-label="Select 3D Biome"
          >
            {(['kyoto_shrine', 'jigokudani'] as const).map((biomeId) => {
              const b = SHRINE_BIOMES[biomeId];
              const isSelected = biome === biomeId;
              return (
                <button
                  key={biomeId}
                  type="button"
                  onClick={() => handleSelectBiome(biomeId)}
                  aria-pressed={isSelected}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-sky-300 text-slate-950'
                      : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {biomeId === 'jigokudani' && <Mountain className="w-3.5 h-3.5" />}
                  {b.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pointer-events-auto max-w-md rounded-xl px-4 py-3 bg-[#0a0e17]/90 border border-amber-300/25 shadow-lg space-y-1">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-sm font-semibold text-amber-300 flex items-center gap-1.5">
              <Compass className="w-4 h-4 shrink-0" />
              {currentMonument.title} ({currentMonument.japanese})
            </p>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {currentMonument.etiquetteRule}
          </p>
        </div>
      </div>

      {/* Collapsible Floating Bottom Control Dock (<= 15% height, no backdrop-filter) */}
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-col items-center">
        {controlsCollapsed ? (
          <button
            type="button"
            onClick={() => setControlsCollapsed(false)}
            className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0a0e17]/92 border border-amber-300/30 text-amber-200 hover:text-white shadow-lg"
          >
            <ChevronUp className="w-4 h-4" />
            Show Controls (H)
          </button>
        ) : (
          <div className="pointer-events-auto w-full max-w-5xl rounded-2xl px-4 py-3 bg-[#0a0e17]/92 border border-amber-300/25 shadow-xl flex flex-wrap items-center justify-between gap-3">
            {/* Camera Viewpoints */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-amber-200/75 mr-1 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                View:
              </span>
              {activeCameraPresets.map((preset) => {
                const active = cameraPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setCameraPreset(preset.id);
                      if (preset.id === 'torii') setActiveMonument('torii');
                      else if (preset.id === 'lantern') setActiveMonument('lantern');
                      else if (preset.id === 'bell') setActiveMonument('bell');
                      else if (preset.id === 'pagoda') setActiveMonument('pagoda');
                      else if (preset.id === 'overview') setActiveMonument('zen_garden');
                      else if (preset.id === 'onsen_pool') setActiveMonument('onsen_pool');
                      else if (preset.id === 'rock_ledge') setActiveMonument('kakehi_spout');
                      else if (preset.id === 'pine_overlook') setActiveMonument('frost_pines');
                      else setActiveMonument('volcanic_rock');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      active
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'bg-white/10 text-slate-200 hover:bg-white/15'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Atmosphere / Lighting Preset */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-amber-200/75 mr-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Light:
              </span>
              {activeLightOptions.map((tod) => {
                const active = timeOfDay === tod;
                const preset = getAtmospherePreset(tod);
                return (
                  <button
                    key={tod}
                    type="button"
                    onClick={() => setTimeOfDay(tod)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      active
                        ? tod === 'winter_twilight'
                          ? 'bg-sky-300 text-slate-950 font-semibold'
                          : 'bg-amber-400 text-slate-950 font-semibold'
                        : 'bg-white/10 text-slate-200 hover:bg-white/15'
                    }`}
                  >
                    {tod === 'winter_twilight' ? preset.label : tod.charAt(0).toUpperCase() + tod.slice(1)}
                  </button>
                );
              })}
            </div>

            {/* Primary Biome Action, Orbit & Collapse */}
            <div className="flex items-center gap-2">
              {biome === 'jigokudani' ? (
                <button
                  type="button"
                  onClick={() =>
                    handleSpawnWaterRipple(
                      (Math.random() - 0.5) * 1.8,
                      (Math.random() - 0.5) * 1.8
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-300 text-slate-950 hover:bg-sky-200 transition-colors"
                >
                  <Droplets className="w-3.5 h-3.5" />
                  <span>
                    {waterRippleCount > 0 ? `Ripple Pool (${waterRippleCount})` : 'Ripple Pool'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRingBell}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{bellRingCount > 0 ? `Ring Bell (${bellRingCount})` : 'Ring Bell'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setAutoSpin((s) => !s)}
                aria-pressed={autoSpin}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  autoSpin
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'bg-white/10 text-slate-200 hover:bg-white/15'
                }`}
              >
                {autoSpin ? 'Orbit: On' : 'Orbit: Off'}
              </button>
              <button
                type="button"
                onClick={() => setControlsCollapsed(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-amber-200 hover:bg-white/15"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                Hide Controls
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

