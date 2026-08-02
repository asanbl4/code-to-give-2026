'use client';

// Canvas wrapper + public API for the chromosome trio. This file owns:
//   - the transparent R3F <Canvas> and its lighting
//   - the three <ChromosomeCharacter /> instances and their layout
//   - the imperative handle (playAction/moveTo/setExpression/pauseIdle/resumeIdle)
//   - prefers-reduced-motion detection
// It intentionally renders no text/UI and drives no scroll/click logic of its
// own — the consuming page controls all of that via the ref.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ChromosomeCharacter from './ChromosomeCharacter';
import { clamp01, easeInOutCubic } from './animation-utils';
import type {
  ChromosomeCharacterHandle,
  ChromosomeIndex,
  ChromosomeRuntimeState,
  ChromosomeTrioHandle,
  ChromosomeTrioProps,
} from './types';

// The center character sits forward (z=0.25, see CHARACTER_OFFSETS below)
// and gets a red gradient; the two characters behind it share a yellow
// gradient, so front vs. back reads clearly at a glance.
const BACK_GRADIENT: [string, string] = ['#FFE066', '#E8A33D']; // tip -> centromere
const FRONT_GRADIENT: [string, string] = ['#FF6B6B', '#C81E3D']; // tip -> centromere
const CHARACTER_GRADIENTS: Array<[string, string]> = [BACK_GRADIENT, FRONT_GRADIENT, BACK_GRADIENT];
const CHARACTER_OFFSETS: Array<[number, number, number]> = [
  [-1.9, 0, 0],
  [0, 0.12, 0.25],
  [1.9, 0, 0],
];

function usePrefersReducedMotion(): boolean {
  // Lazy initializer reads the real value on first render; the effect below
  // only subscribes to future changes, so we never setState from inside it.
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);
  return reduced;
}

interface MoveTarget {
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  startScale: number;
  targetScale: number;
  startTime: number | null;
  duration: number;
}

/**
 * Lives inside the Canvas purely to run the moveTo() tween on the trio group
 * every frame — kept separate from ChromosomeTrio itself since useFrame only
 * works inside the R3F render tree.
 */
function TrioRig({
  groupRef,
  moveTargetRef,
}: {
  groupRef: React.MutableRefObject<THREE.Group | null>;
  moveTargetRef: React.MutableRefObject<MoveTarget | null>;
}) {
  useFrame((state) => {
    const group = groupRef.current;
    const move = moveTargetRef.current;
    if (!group || !move) return;

    if (move.startTime === null) move.startTime = state.clock.elapsedTime;
    const progress = clamp01((state.clock.elapsedTime - move.startTime) / move.duration);
    const eased = easeInOutCubic(progress);

    group.position.lerpVectors(move.startPos, move.targetPos, eased);
    group.scale.setScalar(THREE.MathUtils.lerp(move.startScale, move.targetScale, eased));

    if (progress >= 1) moveTargetRef.current = null;
  });
  return null;
}

const ChromosomeTrio = forwardRef<ChromosomeTrioHandle, ChromosomeTrioProps>(
  ({ scale = 1, position = [0, 0, 0], autoIdle = true, className }, ref) => {
    const groupRef = useRef<THREE.Group>(null);
    const characterRefs = useRef<(ChromosomeCharacterHandle | null)[]>([null, null, null]);
    const moveTargetRef = useRef<MoveTarget | null>(null);
    const prefersReducedMotion = usePrefersReducedMotion();

    // Mutable, read-each-frame state shared with every character. Using a
    // ref (rather than props) means pauseIdle()/resumeIdle() take effect
    // instantly without waiting on a React re-render.
    const runtimeRef = useRef<ChromosomeRuntimeState>({
      idleEnabled: autoIdle,
      reducedMotion: prefersReducedMotion,
    });

    useEffect(() => {
      runtimeRef.current.idleEnabled = autoIdle;
    }, [autoIdle]);

    useEffect(() => {
      runtimeRef.current.reducedMotion = prefersReducedMotion;
    }, [prefersReducedMotion]);

    useImperativeHandle(
      ref,
      () => ({
        playAction(characterIndex, actionName) {
          characterRefs.current[characterIndex]?.playAction(actionName);
        },
        setExpression(characterIndex, expression) {
          characterRefs.current[characterIndex]?.setExpression(expression);
        },
        moveTo(nextPosition, duration = 1, nextScale) {
          const group = groupRef.current;
          if (!group) return;
          moveTargetRef.current = {
            startPos: group.position.clone(),
            targetPos: new THREE.Vector3(...nextPosition),
            startScale: group.scale.x,
            targetScale: nextScale ?? group.scale.x,
            startTime: null,
            // Respect prefers-reduced-motion: snap almost instantly instead
            // of tweening over the requested duration.
            duration: prefersReducedMotion ? Math.min(duration, 0.05) : duration,
          };
        },
        pauseIdle() {
          runtimeRef.current.idleEnabled = false;
        },
        resumeIdle() {
          runtimeRef.current.idleEnabled = true;
        },
      }),
      [prefersReducedMotion],
    );

    return (
      <div className={className} style={{ width: '100%', height: '100%' }}>
        <Canvas
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 2]}
          // fov 38 (was 32): the intro overlay was still clipping the outer
          // (yellow) characters at its scale even in a wide 1.7:1 box — a
          // perspective camera's visible width depends on distance/fov/aspect,
          // not the container's pixel size (see MascotIntroOverlay's comment
          // for the full explanation). Widening the fov gives every consumer
          // more headroom without needing to touch each one's own scale.
          camera={{ position: [0, 0, 8], fov: 38 }}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.65} />
          <directionalLight position={[3, 4, 5]} intensity={1.1} />
          <directionalLight position={[-4, -2, 3]} intensity={0.35} color="#a8c0ff" />
          <pointLight position={[0, 2, -3]} intensity={0.3} color="#ffffff" />

          <group ref={groupRef} position={position} scale={scale}>
            {CHARACTER_OFFSETS.map((offset, i) => (
              <ChromosomeCharacter
                key={i}
                ref={(el) => {
                  characterRefs.current[i] = el;
                }}
                index={i as ChromosomeIndex}
                position={offset}
                colorStart={CHARACTER_GRADIENTS[i][0]}
                colorEnd={CHARACTER_GRADIENTS[i][1]}
                runtimeRef={runtimeRef}
              />
            ))}
          </group>

          <TrioRig groupRef={groupRef} moveTargetRef={moveTargetRef} />
        </Canvas>
      </div>
    );
  },
);

ChromosomeTrio.displayName = 'ChromosomeTrio';

export default ChromosomeTrio;
