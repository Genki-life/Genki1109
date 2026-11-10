import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { createBlobCreature, type BlobCreature } from './blobCreature.ts';
import { createGPUFurPhysics, type GPUFurPhysics } from './gpuPhysics.ts';
import { createGPUFurSystem, type FurSystem } from './furSystem.ts';
import { FurryNovaStaticAvatar } from './FurryNovaStaticAvatar';

export interface NovaAvatar3DProps {
  /** Whether the current page/tab is active and visible (pauses loop when false) */
  isActiveTab?: boolean;
  /** Fallback image URL if WebGL fails or user switches to 2D */
  fallbackImage?: string;
  /** Custom class name for the wrapper element */
  className?: string;
  /** Callback when user clicks or boops the character */
  onBoop?: () => void;
  /** Mode: '3d' for procedural fur creature, '2d' for legacy image */
  mode?: '3d' | '2d';
  /** Toggle switch handler if displayed */
  onToggleMode?: () => void;
  /** Whether Nova is in active listening/typing posture */
  isListening?: boolean;
  /** Optional camera/character yaw angle preset: 'front' | 'side' | 'back' */
  viewPreset?: 'front' | 'side' | 'back';
}

function getYawForAngle(angle: 'front' | 'side' | 'back'): number {
  if (angle === 'side') {
    // Rotate -79.2 deg so character faces left like the middle turnaround view:
    // folded right ear in foreground, upright left ear behind it, right eye & blush clearly visible on left profile,
    // front belly edge on left, side arm in center, and pom-pom tail on right
    return -Math.PI * 0.44;
  }
  if (angle === 'back') {
    // Rotate 180 deg so character faces away like the right turnaround view:
    // folded ear on left, upright ear on right, round pom-pom tail at bottom center, no white belly
    return Math.PI;
  }
  return 0.0;
}

export function NovaAvatar3D({
  isActiveTab = true,
  fallbackImage = '/kila-home.png',
  className = '',
  onBoop,
  mode = '3d',
  onToggleMode,
  isListening = false,
  viewPreset,
}: NovaAvatar3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isListeningRef = useRef(isListening);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const onBoopRef = useRef(onBoop);
  useEffect(() => {
    onBoopRef.current = onBoop;
  }, [onBoop]);

  // Allow inspecting Front / Side / Back turnaround views via prop, URL param (?view=side|back), or interactive pill
  const [activeAngle, setActiveAngle] = useState<'front' | 'side' | 'back'>(() => {
    if (viewPreset === 'side' || viewPreset === 'back' || viewPreset === 'front') {
      return viewPreset;
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      if (v === 'side' || v === 'back' || v === 'front') return v;
    }
    return 'front';
  });

  useEffect(() => {
    if (viewPreset === 'front' || viewPreset === 'side' || viewPreset === 'back') {
      setActiveAngle(viewPreset);
    }
  }, [viewPreset]);

  const [isCompactContainer, setIsCompactContainer] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // References to keep across renders and tab switches
  const isDisposedRef = useRef(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const creatureRef = useRef<BlobCreature | null>(null);
  const furSystemRef = useRef<FurSystem | null>(null);
  const gpuPhysicsRef = useRef<GPUFurPhysics | null>(null);

  // Simulation timing & single-loop management
  const clockRef = useRef<THREE.Clock>(new THREE.Clock(false));
  const simTimeRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);
  const isLoopRunningRef = useRef<boolean>(false);

  // Short, fine, dense sheared-plush configuration in light low-saturation sage green
  const furParamsRef = useRef({
    baseColor: '#a4af9a', // Light low-saturation grey-sage green root
    tipColor: '#c9d1bf',  // Soft pale sage green plush tip
    furLength: 0.050,     // Fine, short velvety plush pile without spiky bristles
    furDensity: 0.98,
    roughness: 0.82,
    specular: 0.08,
    clumping: 0.18,
    curliness: 0.05,
    windStrength: 0.20,
    lightIntensity: 1.12,
    rimIntensity: 0.78
  });

  // Sync activeAngle yaw offset to creature and render immediately
  useEffect(() => {
    if (creatureRef.current) {
      creatureRef.current.setViewYawOffset(getYawForAngle(activeAngle), true);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        creatureRef.current.update(
          0.016,
          pointerNDCRef.current,
          cameraRef.current.position,
          false,
          isListeningRef.current
        );
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
  }, [activeAngle]);

  // Interaction tracking state
  const isPointerDownRef = useRef(false);
  const pointerStartPosRef = useRef({ x: 0, y: 0 });
  const isPointerOverCreatureRef = useRef(false);
  const pointerNDCRef = useRef(new THREE.Vector2(0, 0));
  const pointerLocalPosRef = useRef(new THREE.Vector3(0, 0, 2));
  const prevPointerLocalPosRef = useRef(new THREE.Vector3(0, 0, 2));
  const pointerVelocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const boopShockwaveRef = useRef(0.0);

  const isSoftwareGlRef = useRef<boolean>(false);
  const frameTimeoutRef = useRef<number | null>(null);

  // Stop animation loop cleanly
  const stopAnimationLoop = useCallback(() => {
    isLoopRunningRef.current = false;
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (frameTimeoutRef.current !== null) {
      clearTimeout(frameTimeoutRef.current);
      frameTimeoutRef.current = null;
    }
  }, []);

  // Start single animation loop with fresh clock baseline
  const startAnimationLoop = useCallback(() => {
    if (
      isDisposedRef.current ||
      !rendererRef.current ||
      !sceneRef.current ||
      !cameraRef.current ||
      !creatureRef.current ||
      !furSystemRef.current ||
      !gpuPhysicsRef.current
    ) {
      return;
    }

    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (frameTimeoutRef.current !== null) {
      clearTimeout(frameTimeoutRef.current);
      frameTimeoutRef.current = null;
    }

    isLoopRunningRef.current = true;
    clockRef.current.start();

    const scheduleNext = (renderer: THREE.WebGLRenderer, cb: () => void) => {
      if (!isSoftwareGlRef.current) {
        animFrameIdRef.current = requestAnimationFrame(cb);
        return;
      }
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposedRef.current || !isLoopRunningRef.current) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameTimeoutRef.current = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameTimeoutRef.current = window.setTimeout(cb, 80);
          }
        };
        frameTimeoutRef.current = window.setTimeout(poll, 5);
      } else {
        frameTimeoutRef.current = window.setTimeout(cb, 80);
      }
    };

    const loop = () => {
      if (isDisposedRef.current || !isLoopRunningRef.current) {
        animFrameIdRef.current = null;
        return;
      }

      const rawDelta = clockRef.current.getDelta();
      const dt = Math.min(Math.max(rawDelta, 0.001), 0.05);

      simTimeRef.current += dt;
      const time = simTimeRef.current;

      const creature = creatureRef.current;
      const furSystem = furSystemRef.current;
      const gpuPhysics = gpuPhysicsRef.current;
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;

      if (!creature || !furSystem || !gpuPhysics || !renderer || !scene || !camera) {
        return;
      }

      // Creature gentle breathing, blinking, gaze tracking & listening tilt
      creature.update(dt, pointerNDCRef.current, camera.position, false, isListeningRef.current);

      // Boop shockwave decay
      if (boopShockwaveRef.current > 0.001) {
        boopShockwaveRef.current = Math.max(0, boopShockwaveRef.current - dt * 3.2);
      }

      // GPGPU Verlet spring simulation step (skipped when in lightweight WebGL mode)
      if (furSystem.isGPUFurEnabled()) {
        const physicsTex = gpuPhysics.step({
          time,
          dt,
          windStrength: furParamsRef.current.windStrength,
          creatureVelocity: creature.animState.velocity,
          creatureAngularVel: creature.animState.angularVelocity,
          pointerLocalPos: pointerLocalPosRef.current,
          pointerVelocity: pointerVelocityRef.current,
          pointerActive: isPointerOverCreatureRef.current,
          boopShockwave: boopShockwaveRef.current
        });
        furSystem.sharedUniforms.uPhysicsTex.value = physicsTex;
      }

      furSystem.sharedUniforms.uTime.value = time;
      furSystem.sharedUniforms.uPointerLocalPos.value.copy(pointerLocalPosRef.current);
      furSystem.sharedUniforms.uPointerActive.value = isPointerOverCreatureRef.current ? 1.0 : 0.0;
      furSystem.sharedUniforms.uBoopShockwave.value = boopShockwaveRef.current;

      // Analytical fallback inertia
      furSystem.sharedUniforms.uWebGLInertia.value.set(
        -creature.animState.velocity.x * 0.08,
        -creature.animState.velocity.y * 0.08,
        -creature.animState.velocity.z * 0.08
      );

      renderer.render(scene, camera);
      scheduleNext(renderer, loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);
  }, []);

  // Main 3D Scene Initialization Effect
  useEffect(() => {
    if (mode === '2d') {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const testCanvas = document.createElement('canvas');
    const gl = (testCanvas.getContext('webgl2') || testCanvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      console.warn('WebGL not supported in current environment. Falling back to 2D Nova.');
      setHasError(true);
      setErrorMessage('WebGL context not available');
      return;
    }

    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpuName = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuName);
    isSoftwareGlRef.current = isSoftwareGl;

    isDisposedRef.current = false;

    try {
      const width = container.clientWidth || 240;
      const height = container.clientHeight || 240;
      setIsCompactContainer(width < 150);

      // WebGL Renderer with Alpha: true for 100% transparent canvas
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      rendererRef.current = renderer;

      const dpr = isSoftwareGl ? 1.5 : Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.96;
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const domElement = renderer.domElement;
      domElement.style.width = '100%';
      domElement.style.height = '100%';
      domElement.style.display = 'block';
      domElement.style.touchAction = 'pan-y';
      container.innerHTML = '';
      container.appendChild(domElement);

      // Three.js Scene & Perspective Camera
      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 40);
      cameraRef.current = camera;

      // Frame the fuller vertical ovoid plush doll, scaling it up appropriately on the Today home screen
      // while keeping the elongated left upright ear, folded right lop ear, side arms, and flat bottom inside
      const updateFraming = (w: number, h: number) => {
        const aspect = Math.max(0.5, w / Math.max(1, h));
        camera.aspect = aspect;

        const vFovRad = (camera.fov * Math.PI) / 180;
        const tanHalfV = Math.tan(vFovRad / 2);
        const tanHalfH = tanHalfV * aspect;

        const distV = 1.40 / tanHalfV;
        const distH = 1.18 / tanHalfH;
        const targetDist = Math.max(distV, distH, 4.88);

        camera.position.set(0.0, 0.22, targetDist);
        camera.lookAt(0.0, 0.20, 0.0);
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      updateFraming(width, height);

      // Soft, natural studio lighting rig (avoids overexposure, harsh glare, or purple tints)
      const keyLight = new THREE.DirectionalLight('#fffdf8', 1.35);
      keyLight.position.set(1.6, 2.3, 2.6);
      keyLight.castShadow = !isSoftwareGl;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.radius = 2.0;
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight('#f5f1e6', 0.90);
      rimLight.position.set(-2.0, 1.8, -2.5);
      scene.add(rimLight);

      const bottomFillLight = new THREE.DirectionalLight('#f4efe2', 0.55);
      bottomFillLight.position.set(0.0, -2.2, 2.0);
      scene.add(bottomFillLight);

      const hemiLight = new THREE.HemisphereLight('#fffdf9', '#8f9987', 0.85);
      scene.add(hemiLight);

      // Procedural Sage-Green Ovoid Plush Creature (asymmetric ears, side arms, cream belly, round tail, dark-brown eyes)
      const creature = createBlobCreature();
      creatureRef.current = creature;
      creature.setViewYawOffset(getYawForAngle(activeAngle), true);
      scene.add(creature.root);

      // GPGPU Physics & Fur System (64 shells + 60,000 strands on GPU; paced WebGL fur on software GL)
      const gpuPhysics = createGPUFurPhysics(renderer);
      gpuPhysicsRef.current = gpuPhysics;

      const furParams = {
        ...furParamsRef.current,
        softwareGl: isSoftwareGl,
        gpuFurEnabled: !isSoftwareGl && gpuPhysics.isGPGPUActive
      };

      const furSystem = createGPUFurSystem(creature.bodyGeometry, furParams);
      furSystemRef.current = furSystem;

      creature.root.add(furSystem.shellMesh);
      creature.root.add(furSystem.strandMesh);

      // Preserve white base multiplier so baked per-vertex colors (sage coat, cream belly, peach blush) show accurately
      creature.skinMaterial.color.set('#ffffff');

      // Raycaster for Petting & Boop Interactions
      const raycaster = new THREE.Raycaster();

      const updatePointer = (clientX: number, clientY: number) => {
        const rect = domElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        pointerNDCRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointerNDCRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointerNDCRef.current, camera);
        const hits = raycaster.intersectObject(creature.bodyMesh, false);

        if (hits.length > 0) {
          prevPointerLocalPosRef.current.copy(pointerLocalPosRef.current);
          pointerLocalPosRef.current.copy(hits[0].point);
          creature.root.worldToLocal(pointerLocalPosRef.current);

          if (isPointerOverCreatureRef.current) {
            pointerVelocityRef.current
              .subVectors(pointerLocalPosRef.current, prevPointerLocalPosRef.current)
              .multiplyScalar(28.0);
          }
          isPointerOverCreatureRef.current = true;
          domElement.style.cursor = 'pointer';
        } else {
          isPointerOverCreatureRef.current = false;
          pointerVelocityRef.current.multiplyScalar(0.5);
          domElement.style.cursor = 'grab';
        }
      };

      const handlePointerDown = (e: PointerEvent) => {
        isPointerDownRef.current = true;
        pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
        updatePointer(e.clientX, e.clientY);
      };

      const handlePointerMove = (e: PointerEvent) => {
        updatePointer(e.clientX, e.clientY);
      };

      const handlePointerUp = (e: PointerEvent) => {
        const dist = Math.hypot(
          e.clientX - pointerStartPosRef.current.x,
          e.clientY - pointerStartPosRef.current.y
        );

        if (dist < 12 && isPointerOverCreatureRef.current) {
          creature.triggerBoop();
          boopShockwaveRef.current = 1.0;
          if (onBoopRef.current) onBoopRef.current();
        }

        isPointerDownRef.current = false;
        isPointerOverCreatureRef.current = false;
        pointerVelocityRef.current.set(0, 0, 0);
      };

      const handlePointerLeave = () => {
        isPointerDownRef.current = false;
        isPointerOverCreatureRef.current = false;
        pointerVelocityRef.current.set(0, 0, 0);
        pointerNDCRef.current.set(0, 0);
      };

      domElement.addEventListener('pointerdown', handlePointerDown);
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      domElement.addEventListener('pointerleave', handlePointerLeave);

      let lastW = width;
      let lastH = height;
      const resizeObserver = new ResizeObserver((entries) => {
        if (!entries || entries.length === 0 || isDisposedRef.current) return;
        const entry = entries[0];
        const newWidth = Math.max(80, Math.floor(entry.contentRect.width));
        const newHeight = Math.max(80, Math.floor(entry.contentRect.height));
        if (newWidth === lastW && newHeight === lastH) return;
        lastW = newWidth;
        lastH = newHeight;
        setIsCompactContainer(newWidth < 150);
        updateFraming(newWidth, newHeight);
        renderer.render(scene, camera);
      });
      resizeObserver.observe(container);

      if (isActiveTab && document.visibilityState === 'visible') {
        startAnimationLoop();
      }

      return () => {
        isDisposedRef.current = true;
        stopAnimationLoop();

        resizeObserver.disconnect();
        domElement.removeEventListener('pointerdown', handlePointerDown);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        domElement.removeEventListener('pointerleave', handlePointerLeave);

        creature.dispose();
        furSystem.dispose();
        gpuPhysics.dispose();
        renderer.dispose();

        creatureRef.current = null;
        furSystemRef.current = null;
        gpuPhysicsRef.current = null;
        rendererRef.current = null;
        sceneRef.current = null;
        cameraRef.current = null;

        if (container.contains(domElement)) {
          container.removeChild(domElement);
        }
      };
    } catch (err: any) {
      console.error('Failed to initialize 3D Avatar:', err);
      setHasError(true);
      setErrorMessage(err?.message || '3D initialization error');
    }
  }, [mode, startAnimationLoop, stopAnimationLoop]);

  // Tab Activation / Background Page Visibility Loop Controller
  useEffect(() => {
    if (mode === '2d' || hasError) {
      stopAnimationLoop();
      return;
    }

    const syncLoopState = () => {
      const isVisible = document.visibilityState === 'visible';
      const shouldBeRunning = isActiveTab && isVisible;

      if (shouldBeRunning) {
        if (!isLoopRunningRef.current) {
          startAnimationLoop();
        }
      } else {
        if (isLoopRunningRef.current) {
          stopAnimationLoop();
        }
      }
    };

    syncLoopState();

    const handleVisibilityChange = () => {
      syncLoopState();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActiveTab, mode, hasError, startAnimationLoop, stopAnimationLoop]);

  // Fallback 2D Image View if in 2D mode or upon WebGL failure
  if (mode === '2d' || hasError) {
    return (
      <div className={`relative flex items-center justify-center select-none ${className}`}>
        <div className="absolute inset-0 rounded-full bg-radial from-[#FAF8F2]/85 via-[#EFECE2]/40 to-transparent blur-2xl pointer-events-none -z-10" />

        <FurryNovaStaticAvatar
          size={240}
          className="w-full h-full object-contain pointer-events-none drop-shadow-xs"
        />

        {hasError && (
          <div className="absolute bottom-2 inset-x-2 py-1 px-2 rounded-lg bg-black/60 backdrop-blur-xs text-[10px] text-white/90 text-center">
            {errorMessage || 'WebGL fallback active'}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center select-none group ${className}`}>
      {/* Subtle warm cream-neutral halo behind the 3D character */}
      <div className="absolute inset-2 rounded-full bg-radial from-[#FAF8F2]/85 via-[#EFECE2]/35 to-transparent blur-2xl pointer-events-none -z-10" />

      {/* Three.js Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center relative touch-pan-y"
        style={{ touchAction: 'pan-y' }}
      />

      {/* Discrete Front / Side / Back turnaround switcher pill on the Today home view (hidden when minimized in Chat Drawer) */}
      {!isCompactContainer && (
        <div className="absolute bottom-0.5 right-1 z-20 flex items-center gap-0.5 rounded-full bg-white/80 border border-white/90 px-1.5 py-0.5 shadow-xs text-[10px] font-medium text-[#6C6C70] opacity-85 hover:opacity-100 transition-opacity">
          <button
            type="button"
            data-testid="nova-view-front"
            onClick={(e) => {
              e.stopPropagation();
              setActiveAngle('front');
            }}
            className={`px-1.5 py-0.5 rounded-full transition-colors ${
              activeAngle === 'front'
                ? 'bg-[#738266]/20 text-[#1C1C1E] font-semibold'
                : 'hover:text-[#1C1C1E]'
            }`}
          >
            正面
          </button>
          <button
            type="button"
            data-testid="nova-view-side"
            onClick={(e) => {
              e.stopPropagation();
              setActiveAngle('side');
            }}
            className={`px-1.5 py-0.5 rounded-full transition-colors ${
              activeAngle === 'side'
                ? 'bg-[#738266]/20 text-[#1C1C1E] font-semibold'
                : 'hover:text-[#1C1C1E]'
            }`}
          >
            侧面
          </button>
          <button
            type="button"
            data-testid="nova-view-back"
            onClick={(e) => {
              e.stopPropagation();
              setActiveAngle('back');
            }}
            className={`px-1.5 py-0.5 rounded-full transition-colors ${
              activeAngle === 'back'
                ? 'bg-[#738266]/20 text-[#1C1C1E] font-semibold'
                : 'hover:text-[#1C1C1E]'
            }`}
          >
            背面
          </button>
        </div>
      )}
    </div>
  );
}
