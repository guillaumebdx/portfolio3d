import { useRef, useEffect } from 'react';
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
      canvas.requestPointerLock();
    };

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

    return () => {
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('mousemove', onMouseMove);
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

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    window.addEventListener('walkStart', onWalkStart);
    window.addEventListener('walkEnd', onWalkEnd);
    window.addEventListener('walkBackStart', onWalkBackStart);
    window.addEventListener('walkBackEnd', onWalkBackEnd);

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('walkStart', onWalkStart);
      window.removeEventListener('walkEnd', onWalkEnd);
      window.removeEventListener('walkBackStart', onWalkBackStart);
      window.removeEventListener('walkBackEnd', onWalkBackEnd);
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

    window.addEventListener('navigateToPainting', onNavigate);
    return () => window.removeEventListener('navigateToPainting', onNavigate);
  }, []);

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
    // Auto-navigation to painting
    if (isNavigating.current && navTarget.current) {
      // Cancel navigation on any user input
      const hasInput =
        keys.current.forward || keys.current.backward ||
        keys.current.left || keys.current.right ||
        moveForward.current || moveBackward.current;
      if (hasInput) {
        isNavigating.current = false;
        navTarget.current = null;
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
    if (keys.current.left) moveDir.sub(right);
    if (keys.current.right) moveDir.add(right);

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
