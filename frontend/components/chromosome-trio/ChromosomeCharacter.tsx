'use client';

// A single stylized chromosome character: procedural "X" body (four tapered
// arm chains meeting at a centromere sphere), a simple embossed cartoon face,
// and its own idle loop (bob/sway/breathe/blink) plus one-off actions
// (wave/spin/jump/point). Orchestrated by <ChromosomeTrio /> in
// ChromosomeTrio.tsx — this file only knows about itself.
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildHalfArm, type ArmSegment } from './geometry';
import { clamp01, easeInOutCubic, easeOutCubic } from './animation-utils';
import type {
  ChromosomeActionName,
  ChromosomeCharacterHandle,
  ChromosomeExpression,
  ChromosomeIndex,
  ChromosomeRuntimeState,
} from './types';

interface ChromosomeCharacterProps {
  index: ChromosomeIndex;
  /** Local rest position within the trio group (also the idle bob center). */
  position: [number, number, number];
  /** Body color at the outer arm tips. */
  colorStart: string;
  /** Body color at the centromere (arm centers). */
  colorEnd: string;
  faceColor?: string;
  runtimeRef: React.MutableRefObject<ChromosomeRuntimeState>;
}

// Body shape: four half-arms (one per quadrant), each a curved taper from a
// rounded outer tip down to the shared centromere pinch.
const ARM_TIPS: Array<[number, number, number]> = [
  [0.86, 0.86, 0], // 0: top-right
  [-0.86, -0.86, 0], // 1: bottom-left
  [-0.86, 0.86, 0], // 2: top-left
  [0.86, -0.86, 0], // 3: bottom-right
];
const ARM_SEGMENT_COUNT = 6;
const TIP_RADIUS = 0.34;
const CENTER_RADIUS = 0.16;
const BOW_AMOUNT = 0.16;
const CENTROMERE_RADIUS = 0.22;

// Idle-loop tuning.
const BOB_AMPLITUDE = 0.12;
const BOB_SPEED = 0.9;
const SWAY_AMPLITUDE = 0.06;
const SWAY_SPEED = 0.5;
const BREATHE_AMPLITUDE = 0.02;
const BREATHE_SPEED = 1.1;
const BLINK_DURATION = 0.22;
const BLINK_MIN_GAP = 3;
const BLINK_MAX_GAP = 5;

const ACTION_DURATIONS: Record<ChromosomeActionName, number> = {
  wave: 1.1,
  spin: 1,
  jump: 0.6,
  point: 1,
};

interface ActiveAction {
  name: ChromosomeActionName;
  /** Set lazily on the first frame after playAction(), using the R3F clock. */
  startTime: number | null;
  duration: number;
}

const ChromosomeCharacter = forwardRef<ChromosomeCharacterHandle, ChromosomeCharacterProps>(
  ({ index, position, colorStart, colorEnd, faceColor = '#20202c', runtimeRef }, ref) => {
    const groupRef = useRef<THREE.Group>(null);
    const armRefs = useRef<(THREE.Group | null)[]>([null, null, null, null]);
    const leftEyeRef = useRef<THREE.Mesh>(null);
    const rightEyeRef = useRef<THREE.Mesh>(null);
    const mouthRef = useRef<THREE.Mesh>(null);

    // Per-character phase offset so the trio never bobs/sways/blinks in lockstep.
    const phase = useMemo(() => index * 2.1 + Math.random() * 0.6, [index]);

    const blinkState = useRef<{ nextBlinkAt: number; blinkStart: number | null }>({
      nextBlinkAt: BLINK_MIN_GAP + Math.random() * (BLINK_MAX_GAP - BLINK_MIN_GAP),
      blinkStart: null,
    });
    const activeAction = useRef<ActiveAction | null>(null);
    const expressionState = useRef<{ expression: ChromosomeExpression; winkEye: 'left' | 'right' }>({
      expression: 'happy',
      winkEye: 'right',
    });

    const halfArms = useMemo<ArmSegment[][]>(
      () =>
        ARM_TIPS.map((tip) =>
          buildHalfArm({
            tip,
            bowAmount: BOW_AMOUNT,
            segmentCount: ARM_SEGMENT_COUNT,
            tipRadius: TIP_RADIUS,
            centerRadius: CENTER_RADIUS,
          }),
        ),
      [],
    );

    // One THREE.Color per segment, lerped tip (colorStart) -> centromere
    // (colorEnd) using each segment's normalized position along its arm.
    const armColors = useMemo<THREE.Color[][]>(() => {
      const start = new THREE.Color(colorStart);
      const end = new THREE.Color(colorEnd);
      return halfArms.map((segments) => segments.map((segment) => new THREE.Color().lerpColors(start, end, segment.t)));
    }, [halfArms, colorStart, colorEnd]);

    const centromereColor = useMemo(() => new THREE.Color(colorEnd), [colorEnd]);

    useImperativeHandle(
      ref,
      () => ({
        playAction(actionName: ChromosomeActionName) {
          activeAction.current = { name: actionName, startTime: null, duration: ACTION_DURATIONS[actionName] };
        },
        setExpression(expression: ChromosomeExpression) {
          expressionState.current.expression = expression;
        },
      }),
      [],
    );

    useFrame((state) => {
      const t = state.clock.elapsedTime;
      const runtime = runtimeRef.current;
      const group = groupRef.current;
      if (!group) return;

      // ---- Idle loop: bob, sway, breathe ----
      if (!runtime.reducedMotion) {
        group.position.y = position[1] + Math.sin(t * BOB_SPEED + phase) * BOB_AMPLITUDE;
        group.rotation.z = Math.sin(t * SWAY_SPEED + phase) * SWAY_AMPLITUDE;
        const breathe = 1 + Math.sin(t * BREATHE_SPEED + phase) * BREATHE_AMPLITUDE;
        group.scale.setScalar(breathe);
      } else {
        group.position.y = position[1];
        group.rotation.z = 0;
        group.scale.setScalar(1);
      }

      // ---- Blink (idle loop, so also skipped under reduced motion) ----
      const blink = blinkState.current;
      if (!runtime.reducedMotion && blink.blinkStart === null && t >= blink.nextBlinkAt) {
        blink.blinkStart = t;
      }
      let blinkFactor = 1;
      if (blink.blinkStart !== null) {
        const elapsed = t - blink.blinkStart;
        if (elapsed >= BLINK_DURATION) {
          blink.blinkStart = null;
          blink.nextBlinkAt = t + BLINK_MIN_GAP + Math.random() * (BLINK_MAX_GAP - BLINK_MIN_GAP);
        } else {
          // Triangle-ish wave: open -> shut -> open across the blink window.
          const p = elapsed / BLINK_DURATION;
          blinkFactor = 1 - Math.sin(p * Math.PI) * 0.92;
        }
      }

      // ---- Expression (baseline eye/mouth pose, blink layers on top) ----
      const { expression, winkEye } = expressionState.current;
      const baseEyeScale = expression === 'excited' ? 1.3 : 1;
      const mouthWidth = expression === 'excited' ? 1.25 : 1;

      if (leftEyeRef.current && rightEyeRef.current) {
        const leftClosed = expression === 'wink' && winkEye === 'left';
        const rightClosed = expression === 'wink' && winkEye === 'right';
        leftEyeRef.current.scale.set(baseEyeScale, leftClosed ? 0.12 : baseEyeScale * blinkFactor, 1);
        rightEyeRef.current.scale.set(baseEyeScale, rightClosed ? 0.12 : baseEyeScale * blinkFactor, 1);
      }
      if (mouthRef.current) {
        mouthRef.current.scale.set(mouthWidth, 1, 1);
      }

      // ---- One-off actions (play regardless of reduced-motion: they are
      // explicit, developer-triggered interactions, not ambient looping motion) ----
      let jumpOffset = 0;
      let spinY = 0;
      let squashX = 1;
      let squashY = 1;
      const armOffsets = [0, 0, 0, 0];

      const action = activeAction.current;
      if (action) {
        if (action.startTime === null) action.startTime = t;
        const progress = clamp01((t - action.startTime) / action.duration);

        switch (action.name) {
          case 'wave': {
            // Top-right arm swings back and forth with decaying amplitude.
            armOffsets[0] = Math.sin(progress * Math.PI * 3) * (1 - progress) * 0.5;
            break;
          }
          case 'point': {
            // Bottom-right arm extends outward, holds, then eases back.
            const target = -0.55;
            if (progress < 0.35) armOffsets[3] = easeOutCubic(progress / 0.35) * target;
            else if (progress < 0.65) armOffsets[3] = target;
            else armOffsets[3] = target * (1 - easeInOutCubic((progress - 0.65) / 0.35));
            break;
          }
          case 'spin': {
            spinY = easeInOutCubic(progress) * Math.PI * 2;
            break;
          }
          case 'jump': {
            const arc = Math.sin(progress * Math.PI);
            jumpOffset = arc * 0.5;
            squashY = 1 + arc * 0.15;
            squashX = 1 - arc * 0.1;
            break;
          }
        }

        if (progress >= 1) activeAction.current = null;
      }

      group.position.y += jumpOffset;
      group.rotation.y = spinY;
      group.scale.x *= squashX;
      group.scale.y *= squashY;
      group.scale.z *= squashX;

      armRefs.current.forEach((armGroup, i) => {
        if (armGroup) armGroup.rotation.z = armOffsets[i];
      });
    });

    return (
      <group ref={groupRef} position={position}>
        {/* Centromere: small sphere that smooths over where the four arms meet. */}
        <mesh>
          <sphereGeometry args={[CENTROMERE_RADIUS, 16, 16]} />
          <meshPhysicalMaterial color={centromereColor} roughness={0.3} clearcoat={0.7} clearcoatRoughness={0.15} />
        </mesh>

        {/* Four curved arms. Each is its own pivot group (rotating about the
            centromere) so wave/point can move a single arm independently. */}
        {halfArms.map((segments, armIndex) => (
          <group
            key={armIndex}
            ref={(el) => {
              armRefs.current[armIndex] = el;
            }}
          >
            {segments.map((segment, segIndex) => (
              <mesh key={segIndex} position={segment.position} quaternion={segment.quaternion}>
                <capsuleGeometry args={[segment.radius, segment.length, 4, 8]} />
                <meshPhysicalMaterial
                  color={armColors[armIndex][segIndex]}
                  roughness={0.3}
                  clearcoat={0.7}
                  clearcoatRoughness={0.15}
                />
              </mesh>
            ))}
          </group>
        ))}

        {/* Face: two embossed eyes + a curved smile, sitting proud of the
            centromere's front surface. */}
        <group position={[0, 0.02, CENTROMERE_RADIUS * 0.95]}>
          <mesh ref={leftEyeRef} position={[-0.09, 0.02, 0]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color={faceColor} roughness={0.4} />
          </mesh>
          <mesh ref={rightEyeRef} position={[0.09, 0.02, 0]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial color={faceColor} roughness={0.4} />
          </mesh>
          <mesh ref={mouthRef} position={[0, -0.07, 0]} rotation={[0, 0, -Math.PI / 2 - 0.55]}>
            <torusGeometry args={[0.08, 0.014, 8, 24, 1.1]} />
            <meshStandardMaterial color={faceColor} roughness={0.4} />
          </mesh>
        </group>
      </group>
    );
  },
);

ChromosomeCharacter.displayName = 'ChromosomeCharacter';

export default ChromosomeCharacter;
