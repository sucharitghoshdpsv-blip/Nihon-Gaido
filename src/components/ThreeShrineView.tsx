import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ArrowLeft, Bell, ChevronDown, ChevronUp, Compass, Eye, Sparkles } from 'lucide-react';
import {
  SHRINE_CAMERA_PRESETS,
  getAtmospherePreset,
  getCameraPreset,
  getMonumentInfo,
  type ShrineCameraPresetId,
  type ShrineMonumentId,
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
import {
  computeBellShakeOffset,
  createInitialBellPhysicsState,
  stepBellPhysics,
  triggerBellStrike,
  type TempleBellPhysicsState,
  type TempleBellShakeOffset,
} from '../utils/templeBell';
import { playTempleBellChime } from '../utils/templeBellAudio';

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

export const ThreeShrineView: React.FC<ThreeShrineViewProps> = ({
  selectedCityName,
  onExit,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [cameraPreset, setCameraPreset] = useState<ShrineCameraPresetId>('overview');
  const [timeOfDay, setTimeOfDay] = useState<ShrineTimeOfDayId>('dusk');
  const [activeMonument, setActiveMonument] = useState<ShrineMonumentId>('torii');
  const [autoSpin, setAutoSpin] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);
  const [bellRingCount, setBellRingCount] = useState(0);
  const [isBellShaking, setIsBellShaking] = useState(false);

  // Refs bridging React UI controls into WebGL loop without tearing down the scene
  const targetCamPosRef = useRef(new THREE.Vector3(11.5, 6.2, 13.8));
  const targetLookAtRef = useRef(new THREE.Vector3(0, 2.2, -1.5));
  const isLerpingCamRef = useRef(false);
  const timeOfDayRef = useRef<ShrineTimeOfDayId>('dusk');
  const autoSpinRef = useRef(false);
  const bellPhysicsRef = useRef<TempleBellPhysicsState>(createInitialBellPhysicsState());
  const isShakingRef = useRef(false);

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

  useEffect(() => {
    timeOfDayRef.current = timeOfDay;
  }, [timeOfDay]);

  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);

  useEffect(() => {
    const preset = getCameraPreset(cameraPreset);
    targetCamPosRef.current.set(...preset.position);
    targetLookAtRef.current.set(...preset.target);
    isLerpingCamRef.current = true;
  }, [cameraPreset]);

  // Keyboard shortcuts: H toggles dock visibility, B rings Temple Bell, Escape exits 3D Shrine
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
        handleRingBellRef.current();
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onExit]);

  // Main Three.js scene lifecycle
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

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.25, 160);
    camera.position.set(11.5, 6.2, 13.8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2.2, -1.5);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.minDistance = 4.2;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI * 0.475;
    controls.minPolarAngle = 0.14;
    controls.update();

    // User pointer/wheel immediately cancels camera preset lerp
    const onControlStart = () => {
      isLerpingCamRef.current = false;
    };
    controls.addEventListener('start', onControlStart);

    // Sky & Atmospheric Lights
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
      keyLight.shadow.camera.far = 48;
      keyLight.shadow.camera.left = -16;
      keyLight.shadow.camera.right = 16;
      keyLight.shadow.camera.top = 16;
      keyLight.shadow.camera.bottom = -16;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    // Textures & Materials
    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);
    const textures = createShrineTextures(maxAnisotropy);
    const materials = createShrineMaterials(textures);

    // Courtyard & Architectural Landmarks
    const courtyard = buildZenCourtyard(materials);
    scene.add(courtyard);

    const torii = buildToriiGate(materials);
    torii.position.set(0, 0, 2.0);
    scene.add(torii);

    const leftLantern = buildToroLantern(materials);
    leftLantern.group.position.set(-2.6, 0, -0.4);
    scene.add(leftLantern.group);

    const rightLantern = buildToroLantern(materials);
    rightLantern.group.position.set(2.6, 0, -0.4);
    scene.add(rightLantern.group);

    const pagoda = buildSanctuaryPagoda(materials);
    pagoda.position.set(0, 0, -8.5);
    scene.add(pagoda);

    const templeBell = buildTempleBell(materials);
    templeBell.group.position.set(-4.8, 0, 3.4);
    scene.add(templeBell.group);

    const petals = buildDriftingPetals(48);
    scene.add(petals.mesh);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycaster strictly targeting layer 1 proxy colliders
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointerNdc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let lastHoverCheck = 0;

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
      const hits = raycaster.intersectObjects(scene.children, true);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    const onPointerUp = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - downX, ev.clientY - downY);
      if (dist > 6) return; // drag/orbit, not click

      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      if (hits.length > 0) {
        const monId = hits[0].object.userData.monumentId as ShrineMonumentId | undefined;
        if (monId === 'bell') {
          handleRingBellRef.current();
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

    // Resize Observer cleanly tracks viewport resizes
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

      // Apply atmospheric preset transitions via exponential damping (fast-converging on software WebGL)
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

      // Lantern subtle warm flicker
      const flicker = 1 + Math.sin(elapsed * 4.3) * 0.05 + Math.sin(elapsed * 9.1) * 0.025;
      leftLantern.pointLight.intensity = atmo.lanternIntensity * flicker;
      rightLantern.pointLight.intensity = atmo.lanternIntensity * (2 - flicker);
      materials.lanternEmissive.emissiveIntensity = Math.max(0.9, atmo.lanternIntensity * 0.55);

      // Particle color & instanced drift (zero allocations)
      targetParticleColor.setHex(atmo.particleColorHex);
      petals.material.color.lerp(targetParticleColor, blend);
      petals.material.emissive.lerp(targetParticleColor, blend);

      const pCount = petals.baseX.length;
      for (let i = 0; i < pCount; i++) {
        const phase = petals.phases[i];
        const speed = petals.speeds[i];
        const yRange = 7.6;
        const y = ((petals.baseY[i] - elapsed * speed * 0.65) % yRange + yRange) % yRange + 0.5;
        const x = petals.baseX[i] + Math.sin(elapsed * speed + phase) * 0.9;
        const z = petals.baseZ[i] + Math.cos(elapsed * speed * 0.8 + phase) * 0.7;
        petals.dummy.position.set(x, y, z);
        petals.dummy.rotation.set(elapsed * 0.8 + phase, elapsed * 0.6 + phase, phase);
        petals.dummy.scale.setScalar(petals.scales[i]);
        petals.dummy.updateMatrix();
        petals.mesh.setMatrixAt(i, petals.dummy.matrix);
      }
      petals.mesh.instanceMatrix.needsUpdate = true;

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

      // Step Temple Bell spring physics, resonance halo, and trauma-squared screen shake
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

      if (isSoftwareGl) {
        afterDraw(renderer.getContext(), () => {
          if (!disposed) rafId = requestAnimationFrame(tick);
        });
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
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
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const currentMonument = getMonumentInfo(activeMonument);

  return (
    <div
      className="fixed inset-0 z-40 w-screen h-screen overflow-hidden bg-[#080c15] text-slate-100 select-none"
      role="region"
      aria-label="Interactive 3D Kyoto Shrine & Zen Courtyard"
      data-bell-rings={bellRingCount}
      data-bell-shaking={isBellShaking ? 'true' : 'false'}
    >
      {/* Dedicated WebGL mount container with zero React children */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {/* Top Overlay Header + Etiquette Plaque (solid/rgba surface — no backdrop-filter over WebGL) */}
      <div className="pointer-events-none absolute top-4 left-4 right-4 flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-2.5 bg-[#0a0e17]/90 border border-amber-300/25 shadow-lg">
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
              3D Kyoto Shrine & Zen Courtyard
            </p>
            <p className="text-[11px] text-amber-200/75">
              Context: {selectedCityName} · Click any landmark or drag to orbit
            </p>
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
          <div className="pointer-events-auto w-full max-w-4xl rounded-2xl px-4 py-3 bg-[#0a0e17]/92 border border-amber-300/25 shadow-xl flex flex-wrap items-center justify-between gap-3">
            {/* Camera Viewpoints */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-amber-200/75 mr-1 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                View:
              </span>
              {SHRINE_CAMERA_PRESETS.map((preset) => {
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
                      else setActiveMonument('zen_garden');
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

            {/* Atmosphere / Time of Day */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-amber-200/75 mr-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Light:
              </span>
              {(['dawn', 'dusk', 'night'] as const).map((tod) => {
                const active = timeOfDay === tod;
                return (
                  <button
                    key={tod}
                    type="button"
                    onClick={() => setTimeOfDay(tod)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                      active
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'bg-white/10 text-slate-200 hover:bg-white/15'
                    }`}
                  >
                    {tod}
                  </button>
                );
              })}
            </div>

            {/* Bell Ring Action, Orbit & Collapse */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRingBell}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{bellRingCount > 0 ? `Ring Bell (${bellRingCount})` : 'Ring Bell'}</span>
              </button>
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
