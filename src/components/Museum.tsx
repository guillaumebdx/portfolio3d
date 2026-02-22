import { useEffect, useRef, useState, useCallback } from 'react';
import { useGLTF, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  Group,
  Mesh,
  MeshStandardMaterial,
  Box3,
  Vector3,
  SpotLight,
  Object3D,
  Color,
  TextureLoader,
  SRGBColorSpace,
} from 'three';
import paintingsData from '../data/paintings.json';

const DRACO_CDN = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

// Vite glob import: all images in assets/paints/
const paintImages = import.meta.glob('../assets/paints/*.*', { eager: true, import: 'default' }) as Record<string, string>;

function getImageUrl(filename: string): string | undefined {
  const key = Object.keys(paintImages).find((k) => k.endsWith('/' + filename));
  return key ? paintImages[key] : undefined;
}

interface PaintingInfo {
  center: [number, number, number];
  normal: [number, number, number];
  bottomY: number;
  width: number;
  height: number;
  title: string;
  year: string;
}

interface MuseumProps {
  modelPath: string;
}

export default function Museum({ modelPath }: MuseumProps) {
  const { scene } = useGLTF(modelPath, DRACO_CDN);
  const groupRef = useRef<Group>(null);
  const [paintings, setPaintings] = useState<PaintingInfo[]>([]);

  useEffect(() => {
    if (!groupRef.current) return;

    groupRef.current.updateMatrixWorld(true);

    const found: PaintingInfo[] = [];
    const textureLoader = new TextureLoader();
    let paintingIndex = 0;

    groupRef.current.traverse((child) => {
      if (!(child as Mesh).isMesh) return;
      const mesh = child as Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const mat = mesh.material as MeshStandardMaterial;
      if (!mat?.map) {
        if (mat && mat.color) {
          mat.color = new Color('#555555');
          mat.roughness = 0.95;
          mat.metalness = 0.0;
        }
        return;
      }

      const box = new Box3().setFromObject(mesh);
      const size = new Vector3();
      box.getSize(size);
      const center = new Vector3();
      box.getCenter(center);

      const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
      const isFlatish = dims[0] < dims[2] * 0.15;
      const isOnWall = center.y > 0.5 && center.y < 3.5;

      if (isFlatish && isOnWall) {
        // Replace texture from data
        const data = paintingsData[paintingIndex];
        if (data) {
          const imgUrl = getImageUrl(data.file);
          if (imgUrl) {
            const tex = textureLoader.load(imgUrl);
            tex.colorSpace = SRGBColorSpace;
            tex.flipY = false;
            mat.map = tex;
            mat.needsUpdate = true;
          }
        }

        const thinAxis = size.x < size.z ? 'x' : 'z';
        let normal: [number, number, number];

        if (thinAxis === 'x') {
          normal = center.x < 0 ? [1, 0, 0] : [-1, 0, 0];
        } else {
          normal = center.z < 0 ? [0, 0, 1] : [0, 0, -1];
        }

        // Get painting dimensions (width is the larger horizontal axis)
        const w = thinAxis === 'x' ? size.z : size.x;
        const h = size.y;

        found.push({
          center: [center.x, center.y, center.z],
          normal,
          bottomY: box.min.y,
          width: w,
          height: h,
          title: data?.title ?? `Œuvre #${paintingIndex + 1}`,
          year: data?.year ?? '',
        });

        paintingIndex++;
      }
    });

    setPaintings(found);

    // Signal that the scene is fully ready (meshes processed, textures loading)
    // Small delay to let textures start rendering
    setTimeout(() => {
      window.dispatchEvent(new Event('sceneReady'));
    }, 500);
  }, [scene]);

  const [visited, setVisited] = useState<Set<number>>(new Set());
  const firedRef = useRef(false);

  // Fire event when all paintings visited
  useEffect(() => {
    if (paintings.length > 0 && visited.size === paintings.length && !firedRef.current) {
      firedRef.current = true;
      // Small delay so the last green check renders first
      setTimeout(() => {
        window.dispatchEvent(new Event('allPaintingsVisited'));
      }, 800);
    }
  }, [visited, paintings]);

  const markVisited = useCallback((index: number) => {
    setVisited((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        scale={[0.5, 1, 1]}
        position={[0, 0, 0]}
      />
      {paintings.map((p, i) => (
        <PaintingExtras
          key={i}
          index={i}
          painting={p}
          visited={visited.has(i)}
          onVisited={markVisited}
        />
      ))}
    </group>
  );
}

const VISIT_DISTANCE = 2.5;
const _camDir = new Vector3();

function PaintingExtras({
  index,
  painting,
  visited,
  onVisited,
}: {
  index: number;
  painting: PaintingInfo;
  visited: boolean;
  onVisited: (i: number) => void;
}) {
  useFrame(({ camera }) => {
    if (visited) return;
    const dx = camera.position.x - painting.center[0];
    const dz = camera.position.z - painting.center[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > VISIT_DISTANCE) return;

    // Check if camera is facing the painting (looking toward the wall)
    camera.getWorldDirection(_camDir);
    const n = painting.normal;
    // dot between camera look direction and inverse of painting normal
    // (camera should look opposite to the normal = toward the wall)
    const dot = _camDir.x * -n[0] + _camDir.z * -n[2];
    if (dot > 0.3) {
      onVisited(index);
    }
  });

  return (
    <>
      <PaintingFrame painting={painting} />
      <PaintingSpotlight painting={painting} />
      <PaintingPlacard painting={painting} visited={visited} />
    </>
  );
}

// 3D frame around the painting (positioned behind the painting texture)
function PaintingFrame({ painting }: { painting: PaintingInfo }) {
  const { center, normal, width, height } = painting;

  // Frame position: at painting center, slightly behind (negative normal)
  const framePos: [number, number, number] = [
    center[0] - normal[0] * 0.01,
    center[1],
    center[2] - normal[2] * 0.01,
  ];

  // Rotation to face outward (same as placard)
  const rotY = Math.atan2(normal[0], normal[2]);

  // Thick frame dimensions like reference image
  const frameDepth = 0.06;
  const outerBorder = 0.12;      // Thick dark brown outer
  const goldStripe = 0.08;       // Gold accent stripe
  const innerBorder = 0.04;      // Inner dark edge

  return (
    <group position={framePos} rotation={[0, rotY, 0]}>
      {/* Outer frame - thick dark brown wood */}
      <mesh position={[0, 0, -frameDepth * 0.5]}>
        <boxGeometry args={[width + outerBorder * 2, height + outerBorder * 2, frameDepth]} />
        <meshStandardMaterial color="#2a1810" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Gold stripe - bright accent */}
      <mesh position={[0, 0, -frameDepth * 0.3]}>
        <boxGeometry args={[width + goldStripe * 2, height + goldStripe * 2, frameDepth * 0.7]} />
        <meshStandardMaterial color="#d4a84b" roughness={0.25} metalness={0.8} />
      </mesh>

      {/* Inner dark brown border */}
      <mesh position={[0, 0, -frameDepth * 0.15]}>
        <boxGeometry args={[width + innerBorder * 2, height + innerBorder * 2, frameDepth * 0.5]} />
        <meshStandardMaterial color="#1a0f08" roughness={0.6} metalness={0.15} />
      </mesh>

      {/* Inner lip - thin dark edge closest to painting */}
      <mesh position={[0, 0, 0.002]}>
        <boxGeometry args={[width + 0.015, height + 0.015, 0.012]} />
        <meshStandardMaterial color="#0a0604" roughness={0.3} metalness={0.4} />
      </mesh>
    </group>
  );
}

// Spot positioned above the painting, pointing down at its center
function PaintingSpotlight({ painting }: { painting: PaintingInfo }) {
  const lightRef = useRef<SpotLight>(null);
  const targetRef = useRef<Object3D>(null);

  const { center, normal, width } = painting;

  const spotPos: [number, number, number] = [
    center[0] + normal[0] * 0.8,
    center[1] + 2,
    center[2] + normal[2] * 0.8,
  ];
  const targetPos: [number, number, number] = [center[0], center[1], center[2]];

  // Wider paintings need wider spotlight angle
  // Base angle 0.5 for small paintings, up to 0.9 for large ones
  const spotAngle = Math.min(0.9, 0.4 + width * 0.25);

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
    }
  }, []);

  return (
    <>
      <spotLight
        ref={lightRef}
        position={spotPos}
        angle={spotAngle}
        penumbra={0.4}
        intensity={8}
        color="#ffdda0"
        distance={8}
        decay={1.2}
        castShadow={false}
      />
      <object3D ref={targetRef} position={targetPos} />
    </>
  );
}

// Placard under the painting with title + year + visited check
function PaintingPlacard({ painting, visited }: { painting: PaintingInfo; visited: boolean }) {
  const { center, normal, bottomY, title, year } = painting;

  // Position: below the painting, pushed out from wall
  const placardPos: [number, number, number] = [
    center[0] + normal[0] * 0.05,
    bottomY - 0.25,
    center[2] + normal[2] * 0.05,
  ];

  // Rotation: face the normal direction
  const rotY = Math.atan2(normal[0], normal[2]);

  return (
    <group position={placardPos} rotation={[0, rotY, 0]}>
      {/* Main dark panel — 3D box for depth */}
      <mesh position={[0, 0, 0.005]}>
        <boxGeometry args={[0.32, 0.1, 0.01]} />
        <meshStandardMaterial color="#111111" roughness={0.2} metalness={0.9} />
      </mesh>

      {/* Gold border frame */}
      <mesh position={[0, 0, 0.004]}>
        <boxGeometry args={[0.34, 0.12, 0.005]} />
        <meshStandardMaterial color="#8b7355" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Title text */}
      <Text
        position={[0, 0.015, 0.015]}
        fontSize={0.028}
        color="#e0d0b8"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Regular.woff"
        letterSpacing={0.05}
      >
        {title}
      </Text>

      {/* Year text */}
      <Text
        position={[0, -0.022, 0.015]}
        fontSize={0.018}
        color="#8a8078"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Regular.woff"
        letterSpacing={0.08}
      >
        {year}
      </Text>

      {/* Status dot: red when not visited, green when visited */}
      <group position={[0.24, 0, 0.01]}>
        {/* Outer glow disc */}
        <mesh>
          <circleGeometry args={[0.04, 24]} />
          <meshStandardMaterial
            color={visited ? '#00ff66' : '#ff4444'}
            emissive={visited ? '#00ff66' : '#ff4444'}
            emissiveIntensity={1.5}
            transparent
            opacity={0.15}
          />
        </mesh>
        {/* Inner bright disc */}
        <mesh position={[0, 0, 0.002]}>
          <circleGeometry args={[0.025, 24]} />
          <meshStandardMaterial
            color={visited ? '#00ff66' : '#ff4444'}
            emissive={visited ? '#00ff66' : '#ff4444'}
            emissiveIntensity={2}
            transparent
            opacity={0.4}
          />
        </mesh>
        {/* Check or X symbol */}
        <Text
          position={[0, 0, 0.005]}
          fontSize={0.04}
          color={visited ? '#00ff66' : '#ff4444'}
          anchorX="center"
          anchorY="middle"
        >
          {visited ? '✓' : '○'}
        </Text>
        {/* Point light for glow */}
        <pointLight
          position={[0, 0, 0.03]}
          intensity={0.4}
          color={visited ? '#00ff66' : '#ff4444'}
          distance={0.4}
          decay={2}
        />
      </group>
    </group>
  );
}
