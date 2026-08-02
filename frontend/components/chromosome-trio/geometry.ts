// Procedural geometry for a single chromosome "half arm": a chain of
// overlapping capsule beads that tapers from a rounded outer tip down to the
// thin centromere pinch. Four half-arms (one per quadrant) meet at the
// character's center to form the classic chromosome "X" silhouette, without
// loading any external model.
import * as THREE from 'three';
import { smoothstep } from './animation-utils';

export interface ArmSegment {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  length: number;
  radius: number;
  /** Normalized position along the arm: 0 = outer tip, 1 = centromere. Handy for color gradients. */
  t: number;
}

interface HalfArmOptions {
  /** Outer tip of this arm, in the character's local space. */
  tip: [number, number, number];
  /** How far the arm bows away from a straight line, for an organic curve. */
  bowAmount: number;
  /** Number of capsule beads used to approximate the tapered curve. */
  segmentCount: number;
  /** Capsule radius at the outer tip. */
  tipRadius: number;
  /** Capsule radius at the centromere (center) end. */
  centerRadius: number;
}

const CENTER = new THREE.Vector3(0, 0, 0);
const LOCAL_UP = new THREE.Vector3(0, 1, 0);

function quadraticPoint(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number): THREE.Vector3 {
  const a = 1 - t;
  return new THREE.Vector3(
    a * a * p0.x + 2 * a * t * p1.x + t * t * p2.x,
    a * a * p0.y + 2 * a * t * p1.y + t * t * p2.y,
    a * a * p0.z + 2 * a * t * p1.z + t * t * p2.z,
  );
}

function quadraticTangent(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number): THREE.Vector3 {
  return new THREE.Vector3(
    2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
    2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
    2 * (1 - t) * (p1.z - p0.z) + 2 * t * (p2.z - p1.z),
  ).normalize();
}

/**
 * Builds a chain of capsule bead transforms running along a slightly bowed
 * quadratic curve from `tip` to the shared center point. Capsule caps are
 * hemispherical, so consecutive beads overlap into a smooth, seamless,
 * soft-plastic-looking taper with no manual vertex/UV work required.
 */
export function buildHalfArm(options: HalfArmOptions): ArmSegment[] {
  const { tip, bowAmount, segmentCount, tipRadius, centerRadius } = options;

  const p0 = new THREE.Vector3(...tip);
  const p2 = CENTER;
  const dir = new THREE.Vector3().subVectors(p2, p0).normalize();
  const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
  const p1 = new THREE.Vector3().lerpVectors(p0, p2, 0.5).addScaledVector(perp, bowAmount);

  const armLength = p0.distanceTo(p2);
  const segments: ArmSegment[] = [];

  for (let i = 0; i < segmentCount; i++) {
    const tMid = (i + 0.5) / segmentCount;
    const point = quadraticPoint(p0, p1, p2, tMid);
    const tangent = quadraticTangent(p0, p1, p2, tMid);
    const quat = new THREE.Quaternion().setFromUnitVectors(LOCAL_UP, tangent);
    // tMid=0 (tip) -> tipRadius, tMid=1 (center) -> centerRadius.
    const radius = THREE.MathUtils.lerp(centerRadius, tipRadius, smoothstep(1 - tMid));

    segments.push({
      position: [point.x, point.y, point.z],
      quaternion: [quat.x, quat.y, quat.z, quat.w],
      length: armLength / segmentCount,
      radius,
      t: tMid,
    });
  }

  return segments;
}
