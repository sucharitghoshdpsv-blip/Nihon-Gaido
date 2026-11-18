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
  Flame,
  Mountain,
  Sparkles,
  Trees,
  Volume2,
  VolumeX,
  Wind,
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
import { buildArashiyamaBiome } from '../three/arashiyamaModels';
import { buildGionBiome } from '../three/gionModels';
import { LiquidTabs } from './ui/liquid-glass-navbar';
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
import {
  createInitialShishiOdoshiState,
  stepShishiOdoshiAndWind,
  triggerWindAndShishiOdoshi,
  type ShishiOdoshiState,
} from '../utils/biomeMechanics';
import {
  createGionAudioLayer,
  playBambooWindRustle,
  playShishiOdoshiKnock,
  type GionAudioController,
} from '../utils/biomeAudio';

interface ThreeShrineViewProps {
  selectedCityName: string;
  initialBiome?: ShrineBiomeId;
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

const BIOME_LIGHTS: Record<ShrineBiomeId, ShrineTimeOfDayId[]> = {
  kyoto_shrine: ['dawn', 'dusk', 'night'],
  jigokudani: ['winter_twilight', 'dawn', 'dusk', 'night'],
  arashiyama: ['misty_morning', 'emerald_canopy', 'dawn', 'dusk'],
  gion: ['gion_dusk', 'night', 'dusk'],
};

function monumentForPreset(presetId: AnyCameraPresetId): AnyMonumentId {
  switch (presetId) {
    case 'torii':
      return 'torii';
    case 'lantern':
      return 'lantern';
    case 'bell':
      return 'bell';
    case 'pagoda':
      return 'pagoda';
    case 'overview':
      return 'zen_garden';
    case 'onsen_pool':
      return 'onsen_pool';
    case 'rock_ledge':
      return 'kakehi_spout';
    case 'pine_overlook':
      return 'frost_pines';
    case 'ravine':
      return 'volcanic_rock';
    case 'bamboo_path':
    case 'bamboo_overlook':
      return 'bamboo_pathway';
    case 'canopy_sunbeams':
      return 'sunlit_canopy';
    case 'shishi_odoshi':
      return 'shishi_odoshi';
    case 'hanamikoji':
      return 'cobblestone_lane';
    case 'tea_house':
    case 'canal_bridge':
      return 'machiya_teahouse';
    case 'chochin_eaves':
      return 'chochin_lanterns';
    default:
      return 'torii';
  }
}

export const ThreeShrineView: React.FC<ThreeShrineViewProps> = ({
  selectedCityName,
  initialBiome = 'kyoto_shrine',
  onExit,
}) => {
  const initialBiomeInfo = SHRINE_BIOMES[initialBiome];
  const initialCam = getCameraPreset(initialBiomeInfo.defaultCameraPreset, initialBiome);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [biome, setBiome] = useState<ShrineBiomeId>(initialBiome);
  const [cameraPreset, setCameraPreset] = useState<AnyCameraPresetId>(
    initialBiomeInfo.defaultCameraPreset
  );
  const [timeOfDay, setTimeOfDay] = useState<ShrineTimeOfDayId>(
    initialBiomeInfo.defaultTimeOfDay
  );
  const [activeMonument, setActiveMonument] = useState<AnyMonumentId>(
    initialBiomeInfo.defaultMonument
  );
  const [autoSpin, setAutoSpin] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [bellRingCount, setBellRingCount] = useState(0);
  const [waterRippleCount, setWaterRippleCount] = useState(0);
  const [arashiyamaWindCount, setArashiyamaWindCount] = useState(0);
  const [gionLanternsOn, setGionLanternsOn] = useState(true);
  const [gionAudioOn, setGionAudioOn] = useState(false);
  const [isBellShaking, setIsBellShaking] = useState(false);

  // Refs bridging React UI controls into WebGL loop without tearing down the scene
  const biomeRef = useRef<ShrineBiomeId>(initialBiome);
  const targetCamPosRef = useRef(new THREE.Vector3(...initialCam.position));
  const targetLookAtRef = useRef(new THREE.Vector3(...initialCam.target));
  const isLerpingCamRef = useRef(false);
  const timeOfDayRef = useRef<ShrineTimeOfDayId>(initialBiomeInfo.defaultTimeOfDay);
  const autoSpinRef = useRef(false);
  const bellPhysicsRef = useRef<TempleBellPhysicsState>(createInitialBellPhysicsState());
  const isShakingRef = useRef(false);
  const rippleSlotsRef = useRef<OnsenRippleSlot[]>(createInitialRippleSlots());
  const shishiStateRef = useRef<ShishiOdoshiState>(createInitialShishiOdoshiState());
  const gionLanternsOnRef = useRef(true);
  const gionAudioRef = useRef<GionAudioController | null>(null);
  const elapsedRef = useRef(0);
  const steamBurstFnRef = useRef<((x: number, z: number) => void) | null>(null);
  const rippleUploadFnRef = useRef<((slots: OnsenRippleSlot[], elapsed: number) => void) | null>(
    null
  );
  const arashiyamaSplashFnRef = useRef<(() => void) | null>(null);
  const immediateRenderFnRef = useRef<((snapCamera?: boolean) => void) | null>(null);

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

  const handleTriggerArashiyamaWind = () => {
    shishiStateRef.current = triggerWindAndShishiOdoshi(shishiStateRef.current);
    arashiyamaSplashFnRef.current?.();
    playBambooWindRustle();
    setArashiyamaWindCount((c) => c + 1);
    setActiveMonument('shishi_odoshi');
  };
  const handleTriggerArashiyamaWindRef = useRef(handleTriggerArashiyamaWind);
  handleTriggerArashiyamaWindRef.current = handleTriggerArashiyamaWind;

  const handleToggleGionLanterns = () => {
    const next = !gionLanternsOnRef.current;
    gionLanternsOnRef.current = next;
    setGionLanternsOn(next);
    setActiveMonument('chochin_lanterns');
    immediateRenderFnRef.current?.(false);
  };
  const handleToggleGionLanternsRef = useRef(handleToggleGionLanterns);
  handleToggleGionLanternsRef.current = handleToggleGionLanterns;

  const handleToggleGionAudio = () => {
    if (!gionAudioRef.current) {
      gionAudioRef.current = createGionAudioLayer();
    }
    if (gionAudioRef.current.isPlaying()) {
      gionAudioRef.current.stop();
      setGionAudioOn(false);
    } else {
      const started = gionAudioRef.current.start();
      setGionAudioOn(started);
      setActiveMonument('cobblestone_lane');
    }
  };
  const handleToggleGionAudioRef = useRef(handleToggleGionAudio);
  handleToggleGionAudioRef.current = handleToggleGionAudio;

  const handleSelectBiome = (nextBiome: ShrineBiomeId) => {
    const info = SHRINE_BIOMES[nextBiome];
    const preset = getCameraPreset(info.defaultCameraPreset, nextBiome);
    biomeRef.current = nextBiome;
    timeOfDayRef.current = info.defaultTimeOfDay;
    targetCamPosRef.current.set(...preset.position);
    targetLookAtRef.current.set(...preset.target);
    isLerpingCamRef.current = true;

    if (nextBiome !== 'gion' && gionAudioRef.current?.isPlaying()) {
      gionAudioRef.current.stop();
      setGionAudioOn(false);
    }

    setBiome(nextBiome);
    setTimeOfDay(info.defaultTimeOfDay);
    setCameraPreset(info.defaultCameraPreset);
    setActiveMonument(info.defaultMonument);

    if (nextBiome === 'jigokudani') {
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
    immediateRenderFnRef.current?.(true);
  };

  useEffect(() => {
    biomeRef.current = biome;
  }, [biome]);

  useEffect(() => {
    timeOfDayRef.current = timeOfDay;
    immediateRenderFnRef.current?.(false);
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

  // Keyboard shortcuts across all 4 biomes
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
      } else if (e.key === 'w' || e.key === 'W') {
        if (biomeRef.current === 'arashiyama') {
          handleTriggerArashiyamaWindRef.current();
        }
      } else if (e.key === 'l' || e.key === 'L') {
        if (biomeRef.current === 'gion') {
          handleToggleGionLanternsRef.current();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (biomeRef.current === 'gion') {
          handleToggleGionAudioRef.current();
        }
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onExit]);

  // Main Three.js scene lifecycle (mounts all 4 biomes inside single shared WebGL context)
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
    controls.minDistance = 4.0;
    controls.maxDistance = 32;
    controls.maxPolarAngle = Math.PI * 0.478;
    controls.minPolarAngle = 0.14;
    controls.update();

    const onControlStart = () => {
      isLerpingCamRef.current = false;
    };
    controls.addEventListener('start', onControlStart);

    // Sky & Atmospheric Lights (shared smoothly across biomes)
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
    scene.add(jigokudani.group);
    steamBurstFnRef.current = jigokudani.spawnSteamBurst;
    rippleUploadFnRef.current = jigokudani.updateRipples;

    // -------------------------------------------------------------------------
    // BIOME 3: Arashiyama Bamboo Grove (竹林の小径)
    // -------------------------------------------------------------------------
    const arashiyama = buildArashiyamaBiome(maxAnisotropy);
    scene.add(arashiyama.group);
    arashiyamaSplashFnRef.current = arashiyama.triggerSplash;

    // -------------------------------------------------------------------------
    // BIOME 4: Gion Historic Tea House District (祇園)
    // -------------------------------------------------------------------------
    const gion = buildGionBiome(maxAnisotropy);
    scene.add(gion.group);

    const syncVisibility = () => {
      const cur = biomeRef.current;
      kyotoGroup.visible = cur === 'kyoto_shrine';
      jigokudani.group.visible = cur === 'jigokudani';
      arashiyama.group.visible = cur === 'arashiyama';
      gion.group.visible = cur === 'gion';
    };
    syncVisibility();

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

    const getActiveBiomeRoots = () => {
      switch (biomeRef.current) {
        case 'jigokudani':
          return [jigokudani.group];
        case 'arashiyama':
          return [arashiyama.group];
        case 'gion':
          return [gion.group];
        default:
          return [kyotoGroup];
      }
    };

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
        if (monId === 'shishi_odoshi') {
          handleTriggerArashiyamaWindRef.current();
          return;
        }
        if (monId === 'chochin_lanterns') {
          handleToggleGionLanternsRef.current();
          return;
        }
        if (monId === 'cobblestone_lane') {
          gionAudioRef.current?.triggerGetaStep();
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

      syncVisibility();

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

      const curBiome = biomeRef.current;

      if (curBiome === 'jigokudani') {
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
      } else if (curBiome === 'arashiyama') {
        const shishiStep = stepShishiOdoshiAndWind(shishiStateRef.current, dt);
        shishiStateRef.current = shishiStep.state;
        if (shishiStep.didStrikeStone) {
          arashiyama.triggerSplash();
          playShishiOdoshiKnock();
        }
        arashiyama.updateFrame(
          dt,
          elapsed,
          shishiStep.state,
          timeOfDayRef.current,
          atmo.particleColorHex
        );
        if (isShakingRef.current) {
          isShakingRef.current = false;
          setIsBellShaking(false);
        }
        renderer.render(scene, camera);
      } else if (curBiome === 'gion') {
        gion.updateFrame(dt, elapsed, gionLanternsOnRef.current, atmo.lanternIntensity);
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

    immediateRenderFnRef.current = (snapCamera = true) => {
      if (disposed) return;
      syncVisibility();
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

      if (snapCamera) {
        camera.position.copy(targetCamPosRef.current);
        controls.target.copy(targetLookAtRef.current);
        isLerpingCamRef.current = false;
        controls.update();
      }

      const cur = biomeRef.current;
      if (cur === 'jigokudani') {
        jigokudani.updateRipples(rippleSlotsRef.current, elapsedRef.current);
        jigokudani.updateFrame(
          0.016,
          elapsedRef.current,
          camera,
          atmo.lanternIntensity,
          atmo.amberSteamHex ?? 0xff9b38,
          atmo.particleColorHex
        );
      } else if (cur === 'arashiyama') {
        arashiyama.updateFrame(
          0.016,
          elapsedRef.current,
          shishiStateRef.current,
          timeOfDayRef.current,
          atmo.particleColorHex
        );
      } else if (cur === 'gion') {
        // Use a larger dt step on synchronous toggle so lantern light state reflects immediately on frame 1
        gion.updateFrame(0.6, elapsedRef.current, gionLanternsOnRef.current, atmo.lanternIntensity);
      }
      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      gionAudioRef.current?.stop();
      immediateRenderFnRef.current = null;
      steamBurstFnRef.current = null;
      rippleUploadFnRef.current = null;
      arashiyamaSplashFnRef.current = null;
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
      Object.values(arashiyama.textures).forEach((tex) => tex.dispose());
      Object.values(gion.textures).forEach((tex) => tex.dispose());
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
  const activeLightOptions = BIOME_LIGHTS[biome];

  const biomeSubtitleHint =
    biome === 'jigokudani'
      ? 'Click water surface for ripples & steam · Drag to orbit'
      : biome === 'arashiyama'
      ? 'Click Shishi-odoshi or trigger wind · Drag to orbit'
      : biome === 'gion'
      ? 'Click chochin eaves to toggle glow · Drag to orbit'
      : 'Click any landmark or bell · Drag to orbit';

  const formatLightLabel = (tod: ShrineTimeOfDayId) => {
    const preset = getAtmospherePreset(tod);
    if (
      tod === 'winter_twilight' ||
      tod === 'misty_morning' ||
      tod === 'emerald_canopy' ||
      tod === 'gion_dusk'
    ) {
      return preset.label;
    }
    return tod.charAt(0).toUpperCase() + tod.slice(1);
  };

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
      data-wind-triggers={arashiyamaWindCount}
      data-lantern-glow={gionLanternsOn ? 'true' : 'false'}
      data-audio-layer={gionAudioOn ? 'true' : 'false'}
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
              Context: {selectedCityName} · {biomeSubtitleHint}
            </p>
          </div>

          {/* 4-Biome Switcher */}
          <LiquidTabs
            items={(['kyoto_shrine', 'jigokudani', 'arashiyama', 'gion'] as const).map(
              (biomeId) => ({
                id: biomeId,
                label: SHRINE_BIOMES[biomeId].shortLabel,
                icon:
                  biomeId === 'jigokudani' ? (
                    <Mountain className="w-3.5 h-3.5" />
                  ) : biomeId === 'arashiyama' ? (
                    <Trees className="w-3.5 h-3.5" />
                  ) : biomeId === 'gion' ? (
                    <Flame className="w-3.5 h-3.5" />
                  ) : undefined,
              })
            )}
            value={biome}
            onChange={(biomeId) => handleSelectBiome(biomeId)}
            ariaLabel="Select 3D Biome"
            size="xs"
            tone="dark"
          />
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
          <div className="pointer-events-auto w-full max-w-6xl rounded-2xl px-4 py-3 bg-[#0a0e17]/92 border border-amber-300/25 shadow-xl flex flex-wrap items-center justify-between gap-3">
            {/* Camera Viewpoints */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-amber-200/75 mr-1 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                View:
              </span>
              <LiquidTabs
                items={activeCameraPresets.map((preset) => ({
                  id: preset.id,
                  label: preset.label,
                }))}
                value={cameraPreset}
                onChange={(presetId) => {
                  setCameraPreset(presetId);
                  setActiveMonument(monumentForPreset(presetId));
                }}
                ariaLabel="Camera Viewpoints"
                size="xs"
                tone="dark"
              />
            </div>

            {/* Atmosphere / Lighting Preset */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-amber-200/75 mr-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Light:
              </span>
              <LiquidTabs
                items={activeLightOptions.map((tod) => ({
                  id: tod,
                  label: formatLightLabel(tod),
                }))}
                value={timeOfDay}
                onChange={(tod) => setTimeOfDay(tod)}
                ariaLabel="Atmosphere Lighting Presets"
                size="xs"
                tone="dark"
              />
            </div>

            {/* Primary Biome Actions, Orbit & Collapse */}
            <div className="flex flex-wrap items-center gap-2">
              {biome === 'jigokudani' && (
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
              )}

              {biome === 'arashiyama' && (
                <button
                  type="button"
                  onClick={handleTriggerArashiyamaWind}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-300 text-slate-950 hover:bg-emerald-200 transition-colors"
                >
                  <Wind className="w-3.5 h-3.5" />
                  <span>
                    {arashiyamaWindCount > 0
                      ? `Wind Audio (${arashiyamaWindCount})`
                      : 'Wind & Shishi-odoshi'}
                  </span>
                </button>
              )}

              {biome === 'gion' && (
                <>
                  <button
                    type="button"
                    onClick={handleToggleGionLanterns}
                    aria-pressed={gionLanternsOn}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      gionLanternsOn
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                        : 'bg-white/10 text-slate-200 hover:bg-white/15'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>{gionLanternsOn ? 'Lantern Glow: On' : 'Lantern Glow: Off'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleGionAudio}
                    aria-pressed={gionAudioOn}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      gionAudioOn
                        ? 'bg-rose-300 text-slate-950 hover:bg-rose-200'
                        : 'bg-white/10 text-slate-200 hover:bg-white/15'
                    }`}
                  >
                    {gionAudioOn ? (
                      <Volume2 className="w-3.5 h-3.5" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5" />
                    )}
                    <span>{gionAudioOn ? 'Audio Layer: On' : 'Audio Layer: Off'}</span>
                  </button>
                </>
              )}

              {biome === 'kyoto_shrine' && (
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

