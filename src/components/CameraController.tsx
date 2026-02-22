import { useRef, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Vector3, Raycaster, Euler } from 'three';

const HUMAN_HEIGHT = 1.6;
const MOVE_SPEED = 3;
const LOOK_SPEED = 0.002;
const COLLISION_DISTANCE = 0.5;
const RAY_ORIGINS_Y_OFFSETS = [0.2, 0.8, 1.4];

export default function CameraController() {
  const { camera, gl, scene } = useThree();

  const euler = useRef(new Euler(0, 0, 0, 'YXZ'));
  const direction = useRef(new Vector3());
  const raycaster = useRef(new Raycaster());
  const isLocked = useRef(false);
  const isMobile = useRef(false);
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const strafeLeft = useRef(false);
  const strafeRight = useRef(false);

  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  const touchLook = useRef({ active: false, lastX: 0, lastY: 0 });

  // Auto-navigation to painting
  const navTarget = useRef<{ pos: Vector3; lookAt: Vector3 } | null>(null);
  const isNavigating = useRef(false);

  // Guided tour
  const tourPaintings = useRef<{ center: number[]; normal: number[] }[]>([]);
  const tourActive = useRef(false);
  const tourIndex = useRef(0);
  const tourPauseUntil = useRef(0);
  const tourPhase = useRef<'approach' | 'stepback' | 'pause' | 'center'>('approach');

  // Block pointer lock until mode is selected
  const modeSelected = useRef(false);

  // Dancing camera
  const isDancing = useRef(false);
  const danceTime = useRef(0);

  // Detect mobile
  useEffect(() => {
    isMobile.current = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  // Set initial camera
  useEffect(() => {
    camera.position.set(0, HUMAN_HEIGHT, -12);
    camera.lookAt(0, HUMAN_HEIGHT, 10);
    euler.current.setFromQuaternion(camera.quaternion);
  }, [camera]);

  // Desktop: pointer lock + mouse look
  useEffect(() => {
    const canvas = gl.domElement;

    const onClick = () => {
      if (isMobile.current) return;
      if (!modeSelected.current) return;
      canvas.requestPointerLock();
    };

    const onModeSelected = () => { modeSelected.current = true; };

    const onLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked.current) return;
      euler.current.y -= e.movementX * LOOK_SPEED;
      euler.current.x -= e.movementY * LOOK_SPEED;
      euler.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    canvas.addEventListener('click', onClick);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('modeSelected', onModeSelected);

    return () => {
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('modeSelected', onModeSelected);
    };
  }, [camera, gl]);

  // Desktop: keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    keys.current.forward = true; break;
        case 'KeyS': case 'ArrowDown':  keys.current.backward = true; break;
        case 'KeyA': case 'ArrowLeft':  keys.current.left = true; break;
        case 'KeyD': case 'ArrowRight': keys.current.right = true; break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    keys.current.forward = false; break;
        case 'KeyS': case 'ArrowDown':  keys.current.backward = false; break;
        case 'KeyA': case 'ArrowLeft':  keys.current.left = false; break;
        case 'KeyD': case 'ArrowRight': keys.current.right = false; break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Mobile: touch look + walk button listener
  useEffect(() => {
    const canvas = gl.domElement;

    const onTouchStart = (e: TouchEvent) => {
      if (!isMobile.current) return;
      const touch = e.touches[0];
      touchLook.current = { active: true, lastX: touch.clientX, lastY: touch.clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isMobile.current || !touchLook.current.active) return;
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - touchLook.current.lastX;
      const dy = touch.clientY - touchLook.current.lastY;
      touchLook.current.lastX = touch.clientX;
      touchLook.current.lastY = touch.clientY;

      euler.current.y -= dx * LOOK_SPEED * 1.5;
      euler.current.x -= dy * LOOK_SPEED * 1.5;
      euler.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    const onTouchEnd = () => {
      touchLook.current.active = false;
    };

    // Walk button events (from DOM overlay)
    const onWalkStart = () => { moveForward.current = true; };
    const onWalkEnd = () => { moveForward.current = false; };
    const onWalkBackStart = () => { moveBackward.current = true; };
    const onWalkBackEnd = () => { moveBackward.current = false; };
    const onStrafeLeftStart = () => { strafeLeft.current = true; };
    const onStrafeLeftEnd = () => { strafeLeft.current = false; };
    const onStrafeRightStart = () => { strafeRight.current = true; };
    const onStrafeRightEnd = () => { strafeRight.current = false; };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    window.addEventListener('walkStart', onWalkStart);
    window.addEventListener('walkEnd', onWalkEnd);
    window.addEventListener('walkBackStart', onWalkBackStart);
    window.addEventListener('walkBackEnd', onWalkBackEnd);
    window.addEventListener('strafeLeftStart', onStrafeLeftStart);
    window.addEventListener('strafeLeftEnd', onStrafeLeftEnd);
    window.addEventListener('strafeRightStart', onStrafeRightStart);
    window.addEventListener('strafeRightEnd', onStrafeRightEnd);

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('walkStart', onWalkStart);
      window.removeEventListener('walkEnd', onWalkEnd);
      window.removeEventListener('walkBackStart', onWalkBackStart);
      window.removeEventListener('walkBackEnd', onWalkBackEnd);
      window.removeEventListener('strafeLeftStart', onStrafeLeftStart);
      window.removeEventListener('strafeLeftEnd', onStrafeLeftEnd);
      window.removeEventListener('strafeRightStart', onStrafeRightStart);
      window.removeEventListener('strafeRightEnd', onStrafeRightEnd);
    };
  }, [camera, gl]);

  // Listen for painting click navigation
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const { center, normal } = (e as CustomEvent).detail;
      // Target position: 1.5m in front of painting along its normal
      const targetPos = new Vector3(
        center[0] + normal[0] * 1.5,
        HUMAN_HEIGHT,
        center[2] + normal[2] * 1.5
      );
      const lookAtPoint = new Vector3(center[0], HUMAN_HEIGHT, center[2]);
      navTarget.current = { pos: targetPos, lookAt: lookAtPoint };
      isNavigating.current = true;
    };

    const onDanceStart = () => { isDancing.current = true; danceTime.current = 0; };
    const onDanceStop = () => {
      isDancing.current = false;
      // Reset pitch to level
      euler.current.x = 0;
      camera.quaternion.setFromEuler(euler.current);
    };

    window.addEventListener('navigateToPainting', onNavigate);
    window.addEventListener('dancingStart', onDanceStart);
    window.addEventListener('dancingStop', onDanceStop);
    return () => {
      window.removeEventListener('navigateToPainting', onNavigate);
      window.removeEventListener('dancingStart', onDanceStart);
      window.removeEventListener('dancingStop', onDanceStop);
    };
  }, []);

  // Guided tour events
  const navigateToTourIndex = useCallback((idx: number) => {
    const p = tourPaintings.current[idx];
    if (!p) return;
    // Phase 1: approach close (1.5m) to trigger visited green
    const targetPos = new Vector3(
      p.center[0] + p.normal[0] * 1.5,
      HUMAN_HEIGHT,
      p.center[2] + p.normal[2] * 1.5
    );
    const lookAtPoint = new Vector3(p.center[0], HUMAN_HEIGHT, p.center[2]);
    navTarget.current = { pos: targetPos, lookAt: lookAtPoint };
    isNavigating.current = true;
    tourPhase.current = 'approach';
    tourPauseUntil.current = 0;
  }, []);

  const stepBackFromPainting = useCallback(() => {
    const p = tourPaintings.current[tourIndex.current];
    if (!p) return;
    // Phase 2: step back to 3.5m so full painting is visible
    const targetPos = new Vector3(
      p.center[0] + p.normal[0] * 3.5,
      HUMAN_HEIGHT,
      p.center[2] + p.normal[2] * 3.5
    );
    const lookAtPoint = new Vector3(p.center[0], HUMAN_HEIGHT, p.center[2]);
    navTarget.current = { pos: targetPos, lookAt: lookAtPoint };
    isNavigating.current = true;
    tourPhase.current = 'stepback';
  }, []);

  useEffect(() => {
    const onPaintingsReady = (e: Event) => {
      tourPaintings.current = (e as CustomEvent).detail;
    };
    const onStartTour = () => {
      if (tourPaintings.current.length === 0) return;
      // Reorder paintings in snake pattern: reverse alternate wall groups
      // so we always start from the nearest painting when switching walls
      const paintings = [...tourPaintings.current];
      const groups: { start: number; end: number }[] = [];
      let groupStart = 0;
      for (let i = 1; i <= paintings.length; i++) {
        const prev = paintings[i - 1];
        const curr = paintings[i];
        const sameWall = curr &&
          Math.abs(prev.normal[0] - curr.normal[0]) < 0.1 &&
          Math.abs(prev.normal[2] - curr.normal[2]) < 0.1;
        if (!sameWall) {
          groups.push({ start: groupStart, end: i - 1 });
          groupStart = i;
        }
      }
      // For each group after the first, check if reversing is shorter
      for (let g = 1; g < groups.length; g++) {
        const prevLast = paintings[groups[g - 1].end];
        const { start, end } = groups[g];
        const first = paintings[start];
        const last = paintings[end];
        const distToFirst =
          Math.pow(prevLast.center[0] - first.center[0], 2) +
          Math.pow(prevLast.center[2] - first.center[2], 2);
        const distToLast =
          Math.pow(prevLast.center[0] - last.center[0], 2) +
          Math.pow(prevLast.center[2] - last.center[2], 2);
        if (distToLast < distToFirst) {
          // Reverse this wall group
          const segment = paintings.slice(start, end + 1).reverse();
          for (let i = 0; i < segment.length; i++) {
            paintings[start + i] = segment[i];
          }
        }
      }
      tourPaintings.current = paintings;
      tourActive.current = true;
      tourIndex.current = 0;
      navigateToTourIndex(0);
    };
    const onStopTour = () => {
      tourActive.current = false;
      isNavigating.current = false;
      navTarget.current = null;
    };

    window.addEventListener('paintingsReady', onPaintingsReady);
    window.addEventListener('startGuidedTour', onStartTour);
    window.addEventListener('stopGuidedTour', onStopTour);
    return () => {
      window.removeEventListener('paintingsReady', onPaintingsReady);
      window.removeEventListener('startGuidedTour', onStartTour);
      window.removeEventListener('stopGuidedTour', onStopTour);
    };
  }, [navigateToTourIndex]);

  // Collision detection: cast multiple rays at different heights
  const checkCollision = (position: Vector3, moveDir: Vector3): { blocked: boolean; normal?: Vector3 } => {
    const dir = moveDir.clone().normalize();

    for (const yOffset of RAY_ORIGINS_Y_OFFSETS) {
      const origin = new Vector3(position.x, yOffset, position.z);
      raycaster.current.set(origin, dir);
      raycaster.current.far = COLLISION_DISTANCE;

      const intersects = raycaster.current.intersectObjects(scene.children, true);
      for (const hit of intersects) {
        if ((hit.object as any).isMesh && hit.face) {
          const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
          normal.y = 0;
          normal.normalize();
          return { blocked: true, normal };
        }
      }
    }

    return { blocked: false };
  };

  // Frame loop
  useFrame((_, delta) => {
    // Dancing camera animation
    if (isDancing.current) {
      danceTime.current += delta;
      const t = danceTime.current;
      // Head bob: mix of frequencies for a groovy feel
      const yaw = Math.sin(t * 2.5) * 0.08 + Math.sin(t * 5) * 0.03;
      const pitch = Math.sin(t * 3.3) * 0.05 + Math.cos(t * 1.7) * 0.03;
      const roll = Math.sin(t * 2) * 0.04;
      euler.current.y += yaw * delta * 8;
      euler.current.x = pitch;
      camera.quaternion.setFromEuler(new Euler(euler.current.x, euler.current.y, roll, 'YXZ'));
      return;
    }

    // Guided tour: pause between paintings
    if (tourActive.current && !isNavigating.current && tourPauseUntil.current > 0) {
      if (Date.now() >= tourPauseUntil.current) {
        tourPauseUntil.current = 0;
        const prevIdx = tourIndex.current;
        tourIndex.current++;
        if (tourIndex.current < tourPaintings.current.length) {
          const prevP = tourPaintings.current[prevIdx];
          const nextP = tourPaintings.current[tourIndex.current];
          // Detect wall change: compare normal directions
          const sameWall =
            Math.abs(prevP.normal[0] - nextP.normal[0]) < 0.1 &&
            Math.abs(prevP.normal[2] - nextP.normal[2]) < 0.1;
          if (!sameWall) {
            // Route through room center before approaching next wall
            const midZ = (prevP.center[2] + nextP.center[2]) / 2;
            const targetPos = new Vector3(0, HUMAN_HEIGHT, midZ);
            const lookAt = new Vector3(nextP.center[0], HUMAN_HEIGHT, nextP.center[2]);
            navTarget.current = { pos: targetPos, lookAt };
            isNavigating.current = true;
            tourPhase.current = 'center';
          } else {
            navigateToTourIndex(tourIndex.current);
          }
        } else {
          // Tour finished
          tourActive.current = false;
          window.dispatchEvent(new Event('guidedTourEnd'));
        }
      }
      return;
    }

    // Auto-navigation to painting
    if (isNavigating.current && navTarget.current) {
      // Cancel navigation on any user input
      const hasInput =
        keys.current.forward || keys.current.backward ||
        keys.current.left || keys.current.right ||
        moveForward.current || moveBackward.current ||
        strafeLeft.current || strafeRight.current;
      if (hasInput) {
        isNavigating.current = false;
        navTarget.current = null;
        if (tourActive.current) {
          tourActive.current = false;
          window.dispatchEvent(new Event('guidedTourEnd'));
        }
      } else {
        const target = navTarget.current;
        const lerpSpeed = 3 * delta;

        // Smoothly move position
        camera.position.lerp(target.pos, lerpSpeed);

        // Smoothly rotate to look at painting
        const lookDir = new Vector3().subVectors(target.lookAt, camera.position).normalize();
        const targetYaw = Math.atan2(-lookDir.x, -lookDir.z);
        // Lerp euler Y toward target yaw
        let yawDiff = targetYaw - euler.current.y;
        // Normalize angle difference to [-PI, PI]
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
        euler.current.y += yawDiff * lerpSpeed;
        // Lerp pitch toward 0 (level)
        euler.current.x += (0 - euler.current.x) * lerpSpeed;
        camera.quaternion.setFromEuler(euler.current);

        // Check if arrived
        const dist = camera.position.distanceTo(target.pos);
        if (dist < 0.05 && Math.abs(yawDiff) < 0.02) {
          isNavigating.current = false;
          navTarget.current = null;
          // Tour: center → approach → stepback → pause
          if (tourActive.current) {
            if (tourPhase.current === 'center') {
              navigateToTourIndex(tourIndex.current);
            } else if (tourPhase.current === 'approach') {
              stepBackFromPainting();
            } else {
              tourPauseUntil.current = Date.now() + 3000;
              tourPhase.current = 'pause';
            }
          }
        }

        camera.position.y = HUMAN_HEIGHT;
        return;
      }
    }

    const active = isLocked.current || isMobile.current;
    if (!active) return;

    const speed = MOVE_SPEED * delta;

    // Forward direction (horizontal only)
    camera.getWorldDirection(direction.current);
    direction.current.y = 0;
    direction.current.normalize();

    const right = new Vector3().crossVectors(direction.current, new Vector3(0, 1, 0)).normalize();

    const moveDir = new Vector3();

    if (keys.current.forward || moveForward.current) moveDir.add(direction.current);
    if (keys.current.backward || moveBackward.current) moveDir.sub(direction.current);
    if (keys.current.left || strafeLeft.current) moveDir.sub(right);
    if (keys.current.right || strafeRight.current) moveDir.add(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();

      const { blocked, normal } = checkCollision(camera.position, moveDir);

      if (!blocked) {
        camera.position.addScaledVector(moveDir, speed);
      } else if (normal) {
        // Slide along wall
        const slide = moveDir.clone().sub(normal.clone().multiplyScalar(moveDir.dot(normal)));
        if (slide.lengthSq() > 0.001) {
          slide.normalize();
          const { blocked: slideBlocked } = checkCollision(camera.position, slide);
          if (!slideBlocked) {
            camera.position.addScaledVector(slide, speed * 0.7);
          }
        }
      }
    }

    // Lock Y to human height
    camera.position.y = HUMAN_HEIGHT;
  });

  return null;
}
