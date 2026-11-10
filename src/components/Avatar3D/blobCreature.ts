import * as THREE from 'three';

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0.0, Math.min(1.0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3.0 - 2.0 * t);
}

/**
 * Evaluates the exact torso surface point for a unit sphere direction (u, v, w).
 * Produces a seamless, neckless, vertical pear-ovoid plush body:
 * - Rounded top crown
 * - Plump middle-lower belly
 * - Gently flattened stable bottom base (no legs or feet)
 */
export function sculptTorsoPosition(u: number, v: number, w: number): [number, number, number] {
  // 1. Vertical coordinate: seamless head-and-body vertical ellipsoid from y ≈ -0.775 (flat base) to y ≈ +0.94 (rounded crown)
  let y = v * 0.94;
  if (v < -0.60) {
    const t = (-0.60 - v) / 0.40;
    y = -0.60 * 0.94 - 0.21 * (Math.tanh(t * 2.25) / Math.tanh(2.25));
  }

  // 2. Super-ovoid radial profile:
  // - Upper head (v > 0): gently fuller dome so the top crown is broad and rounded like the turnaround sheet
  // - Lower body (v < 0): plump lower belly curving smoothly into the wide, gently flattened base without sharp corners
  const rHoriz = Math.hypot(u, w);
  let radialSuper = 1.0;
  if (rHoriz > 1e-5) {
    if (v > 0.0) {
      const upperExp = 1.0 - 0.14 * Math.pow(v, 1.25);
      radialSuper = Math.pow(rHoriz, upperExp) / rHoriz;
    } else {
      const lowerExp = 1.0 - 0.32 * Math.pow(-v, 1.15);
      radialSuper = Math.pow(rHoriz, lowerExp) / rHoriz;
    }
  }

  const bellyBulge = Math.exp(-Math.pow((v + 0.18) / 0.60, 2.0));
  const upperFullness = Math.exp(-Math.pow((v - 0.36) / 0.62, 2.0));

  // Horizontal width profile: head and body seamlessly integrated, slightly wider in lower-middle belly
  const widthScale = (0.64 - 0.022 * v + 0.068 * bellyBulge + 0.052 * upperFullness) * radialSuper;
  const x = u * widthScale;

  // Side depth profile: natural ovoid thickness with softly rounded front belly
  const depthScale = (0.61 - 0.026 * v + 0.070 * bellyBulge + 0.038 * upperFullness) * radialSuper;
  let z = w * depthScale;
  if (w > 0) {
    z += 0.034 * w * radialSuper * Math.exp(-Math.pow((v + 0.22) / 0.52, 2.0));
  }

  return [x, y, z];
}

/**
 * Computes the exact eye anchor position on the sculpted torso surface.
 */
function getEyeSurfacePosition(side: number): [number, number, number] {
  const targetX = side * 0.245;
  const targetY = 0.25;
  const v = targetY / 0.94;
  const bellyBulge = Math.exp(-Math.pow((v + 0.18) / 0.60, 2.0));
  const upperFullness = Math.exp(-Math.pow((v - 0.36) / 0.62, 2.0));
  const rHorizApprox = Math.sqrt(Math.max(0.01, 1.0 - v * v));
  const upperExp = 1.0 - 0.14 * Math.pow(v, 1.25);
  const radialSuper = Math.pow(rHorizApprox, upperExp) / rHorizApprox;
  const widthScale = (0.64 - 0.022 * v + 0.068 * bellyBulge + 0.052 * upperFullness) * radialSuper;
  const u = targetX / widthScale;
  const w = Math.sqrt(Math.max(0.01, 1.0 - u * u - v * v));
  return sculptTorsoPosition(u, v, w);
}

/**
 * Evaluates the anatomical follicle growth mask at a local position on the plush surface.
 * - 0.0 inside the eyeball sockets
 * - Slightly shorter around the eyes for crisp facial definition
 * - Uniformly dense, fine short plush across the body, asymmetric ears, stubby arms, and pom-pom tail
 */
export function evaluateFollicleMask(x: number, y: number, z: number): number {
  const [lex, ley, lez] = getEyeSurfacePosition(-1);
  const [rex, rey, rez] = getEyeSurfacePosition(1);

  const distLeftEye = Math.hypot(x - lex, (y - ley) * 1.05, z - lez);
  const distRightEye = Math.hypot(x - rex, (y - rey) * 1.05, z - rez);
  const minEyeDist = Math.min(distLeftEye, distRightEye);

  // Tightly match the glossy eyeball radius (r < 0.048 = 0) so there is zero bare skin ring
  if (minEyeDist < 0.048) {
    return 0.0;
  }
  const eyeMask = 0.44 + 0.56 * smoothstep(0.048, 0.12, minEyeDist);

  // Larger, wider cream-white front belly oval has uniform velvety plush density
  let bellyTrim = 1.0;
  if (z > 0.20) {
    const bellyRx = 0.51 - 0.035 * (y + 0.33);
    const bx = x / Math.max(0.28, bellyRx);
    const by = (y + 0.33) / 0.39;
    const bDist = Math.hypot(bx, by);
    const bellyWeight = (1.0 - smoothstep(0.78, 1.04, bDist)) * smoothstep(0.20, 0.42, z);
    bellyTrim = 1.0 - 0.02 * bellyWeight;
  }

  // Very bottom ground contact pad taper
  const bottomMask = 0.50 + 0.50 * smoothstep(-0.775, -0.66, y);

  return Math.max(0.0, Math.min(1.04, eyeMask * bellyTrim * bottomMask));
}

/**
 * Computes the biological grooming flow tangent vector for short, dense plush fur.
 * Hairs lie smoothly along the body contour, sweeping gently around the eyes, upward along the upright ear,
 * outward-downward along the folded ear and arms, and radially on the round pom-pom tail.
 */
export function evaluateGroomFlow(
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
  nz: number
): [number, number, number] {
  // Base downward and slightly outward plush nap direction
  let fx = x * 0.18;
  let fy = -0.85;
  let fz = z * 0.15;

  // On the upright left ear (y > 0.78, x < -0.06), groom flows upward toward the rounded ear tip
  if (y > 0.78 && x < -0.06) {
    const earW = smoothstep(0.78, 0.92, y);
    fx = fx * (1.0 - earW) + (-0.15) * earW;
    fy = fy * (1.0 - earW) + 0.94 * earW;
  }

  // On the folded right lop ear (y > 0.44, x > 0.22), groom flows along the arch and downward toward the drooping lobe
  if (y > 0.44 && x > 0.22 && y + x * 0.52 > 0.80) {
    const lopW = smoothstep(0.24, 0.42, x);
    fx = fx * (1.0 - lopW) + 0.48 * lopW;
    fy = fy * (1.0 - lopW) + (-0.86) * lopW;
  }

  // On the stubby side arms (abs(x) > 0.60, y in [-0.52, 0.02]), groom flows outward and downward toward the mitten tip
  if (Math.abs(x) > 0.60 && y > -0.52 && y < 0.02) {
    const armW = smoothstep(0.60, 0.70, Math.abs(x));
    const signX = x >= 0 ? 1.0 : -1.0;
    fx = fx * (1.0 - armW) + signX * 0.52 * armW;
    fy = fy * (1.0 - armW) + (-0.84) * armW;
  }

  // On the round pom-pom tail at the bottom-back (z < -0.54, y < -0.32), groom radiates outward as a soft ball
  if (z < -0.54 && y < -0.32 && Math.abs(x) < 0.26) {
    const tailW = smoothstep(-0.52, -0.60, z);
    const rx = x;
    const ry = y + 0.52;
    const rz = z + 0.68;
    fx = fx * (1.0 - tailW) + rx * 2.0 * tailW;
    fy = fy * (1.0 - tailW) + (ry * 1.6 - 0.15) * tailW;
    fz = fz * (1.0 - tailW) + rz * 2.0 * tailW;
  }

  // Smooth tangential parting around the two eyes
  const [lex, ley, lez] = getEyeSurfacePosition(-1);
  const [rex, rey, rez] = getEyeSurfacePosition(1);
  const eyeCenters: [number, number, number][] = [
    [lex, ley, lez],
    [rex, rey, rez]
  ];

  for (let i = 0; i < 2; i++) {
    const [ex, ey, ez] = eyeCenters[i];
    const dx = x - ex;
    const dy = y - ey;
    const dz = z - ez;
    const d = Math.hypot(dx, dy, dz) + 1e-5;
    if (d < 0.18) {
      const influence = smoothstep(0.18, 0.0, d) * 0.85;
      fx += (dx / d) * influence;
      fy += (dy / d) * influence * 0.85;
      fz += (dz / d) * influence * 0.20;
    }
  }

  // Project onto the tangent plane orthogonal to surface normal N
  const dotFN = fx * nx + fy * ny + fz * nz;
  let tx = fx - dotFN * nx;
  let ty = fy - dotFN * ny;
  let tz = fz - dotFN * nz;
  const len = Math.hypot(tx, ty, tz);
  if (len > 1e-5) {
    tx /= len;
    ty /= len;
    tz /= len;
  } else {
    tx = 1.0;
    ty = 0.0;
    tz = 0.0;
  }

  return [tx, ty, tz];
}

/**
 * Evaluates the RGB under-skin vertex color at local position (x, y, z), calibrated to match
 * the exact shaded root luminance of furShaders.ts so the base mesh never causes bright hotspots
 * or dark boundary rings under the short plush fur.
 */
function evaluateUnderSkinColor(x: number, y: number, z: number): [number, number, number] {
  // Calibrated sage-green root under-skin matching furShaders.ts root color
  let r = 0.61;
  let g = 0.65;
  let b = 0.57;

  // 1. Larger, wider warm cream-oatmeal oval belly on the lower front (z > 0.20)
  // Exactly matches furShaders.ts bellyRx, bellyRy, bellyZMask, and smoothstep feathering
  if (z > 0.20) {
    const bellyRx = 0.51 - 0.035 * (y + 0.33);
    const bx = x / Math.max(0.28, bellyRx);
    const by = (y + 0.33) / 0.39;
    const bDist = Math.hypot(bx, by);
    const bellyW = (1.0 - smoothstep(0.78, 1.04, bDist)) * smoothstep(0.20, 0.42, z);
    r = r * (1.0 - bellyW) + 0.80 * bellyW;
    g = g * (1.0 - bellyW) + 0.77 * bellyW;
    b = b * (1.0 - bellyW) + 0.70 * bellyW;
  }

  // 2. Soft warm peach-orange cheek blush below and outer to the eyes
  if (z > 0.28) {
    const lx = (x + 0.375) / 0.145;
    const rx = (x - 0.375) / 0.145;
    const by = (y - 0.13) / 0.090;
    const dBlush = Math.min(Math.hypot(lx, by), Math.hypot(rx, by));
    if (dBlush < 1.35) {
      const blushW = Math.exp(-dBlush * dBlush * 1.45) * smoothstep(0.28, 0.50, z) * 0.84;
      r = r * (1.0 - blushW) + 0.78 * blushW;
      g = g * (1.0 - blushW) + 0.49 * blushW;
      b = b * (1.0 - blushW) + 0.36 * blushW;
    }
  }

  // 3. Subtle pale sage-cream inner hollow on the elongated upright left ear (x < 0, y > 0.82, z > 0.0)
  if (x < -0.14 && y > 0.82 && z > 0.0) {
    const ex = (x + 0.32) / 0.088;
    const ey = (y - 1.12) / 0.24;
    const dEar = Math.hypot(ex, ey);
    if (dEar < 1.15) {
      const earW = (1.0 - smoothstep(0.45, 1.10, dEar)) * smoothstep(0.0, 0.06, z) * 0.72;
      r = r * (1.0 - earW) + 0.70 * earW;
      g = g * (1.0 - earW) + 0.74 * earW;
      b = b * (1.0 - earW) + 0.65 * earW;
    }
  }

  return [r, g, b];
}

/**
 * C1-continuous rounded paddle envelope for plush ears and limbs.
 * Avoids any step discontinuity while producing a sturdy root, gently full mid-section,
 * and wide hemispherical rounded tip at s = 1.
 */
function evaluateSmoothPaddleEnvelope(s: number, midFullness = 0.10): number {
  const rootTaper = Math.pow(Math.sin(Math.min(1.0, s / 0.22) * (Math.PI * 0.5)), 0.72);
  const tipDome = Math.cos(Math.max(0.0, (s - 0.58) / 0.42) * (Math.PI * 0.5));
  return rootTaper * Math.pow(Math.max(0.0, tipDome), 0.56) * (1.0 + midFullness * Math.sin(s * Math.PI));
}

/**
 * Helper to create the screen-left upright ear geometry:
 * Elongated, broad rounded paddle top, natural plush thickness in Side view, and subtle front hollow.
 */
function createLeftUprightEarGeometry(): THREE.BufferGeometry {
  const geom = new THREE.SphereGeometry(1.0, 44, 36);
  const pos = geom.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    const v = pos.getY(i);
    const w = pos.getZ(i);

    const phi = Math.acos(Math.max(-1.0, Math.min(1.0, v)));
    const s = 1.0 - phi / Math.PI; // 0 at base, 1 at tip
    const rCircle = Math.sqrt(Math.max(0.0, 1.0 - v * v));
    const cosTheta = rCircle > 1e-5 ? u / rCircle : 0.0;
    const sinTheta = rCircle > 1e-5 ? w / rCircle : 0.0;

    const paddleEnv = evaluateSmoothPaddleEnvelope(s, 0.11);

    const widthRadius = 0.176 * paddleEnv;
    const thickRadius = 0.114 * paddleEnv;

    let lx = cosTheta * widthRadius;
    let ly = s * 0.69; // Elongated upright ear height
    let lz = sinTheta * thickRadius;

    // Gentle concave inner-ear hollow on the front (+z) face
    if (sinTheta > 0 && s > 0.16 && s < 0.84 && Math.abs(cosTheta) < 0.76) {
      const scoop =
        Math.sin(((s - 0.16) / 0.68) * Math.PI) *
        (1.0 - Math.pow(cosTheta / 0.76, 2.0));
      lz -= scoop * 0.022;
    }

    // Slight forward cup near the rounded tip
    lz += Math.pow(s, 1.8) * 0.016;

    // Rotate ear slightly outward (+8.6 deg around Z) and slightly inward-facing (+8 deg around Y)
    const roll = 0.15;
    const yaw = 0.14;
    const rx = lx * Math.cos(roll) - ly * Math.sin(roll);
    const ry = lx * Math.sin(roll) + ly * Math.cos(roll);

    const fx = rx * Math.cos(yaw) + lz * Math.sin(yaw);
    const fz = -rx * Math.sin(yaw) + lz * Math.cos(yaw);

    // Anchor on the upper-left head crown
    pos.setXYZ(i, fx - 0.25, ry + 0.77, fz + 0.01);
  }

  geom.computeVertexNormals();
  return geom;
}

/**
 * Helper to create the screen-right folded / drooping lop ear geometry.
 * Rises from the upper-right crown, bends outward over a plush fold arch, and droops naturally downward
 * as a wide, plump rounded paddle flap in Front, Side, and Back views (without inner crease pinching).
 */
function createRightLopEarGeometry(): THREE.BufferGeometry {
  const geom = new THREE.SphereGeometry(1.0, 56, 42);
  const pos = geom.attributes.position;

  // Spine curve from upper-right crown -> fold arch -> outward-downward drooping ear paddle
  const spineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.22, 0.75, 0.02),
    new THREE.Vector3(0.36, 0.93, 0.03),
    new THREE.Vector3(0.54, 0.89, 0.04),
    new THREE.Vector3(0.67, 0.73, 0.05),
    new THREE.Vector3(0.72, 0.55, 0.06)
  ]);

  const worldZ = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    const v = pos.getY(i);
    const w = pos.getZ(i);

    const phi = Math.acos(Math.max(-1.0, Math.min(1.0, v)));
    const s = 1.0 - phi / Math.PI; // 0 at root, 1 at drooping paddle tip
    const rCircle = Math.sqrt(Math.max(0.0, 1.0 - v * v));
    const cosTheta = rCircle > 1e-5 ? u / rCircle : 0.0;
    const sinTheta = rCircle > 1e-5 ? w / rCircle : 0.0;

    const paddleEnv = evaluateSmoothPaddleEnvelope(s, 0.13);

    const center = spineCurve.getPointAt(s);
    const tang = spineCurve.getTangentAt(s).normalize();

    // flapAxis is along Z (broad ear width seen face-on in Side view)
    const flapAxis = worldZ.clone().sub(tang.clone().multiplyScalar(worldZ.dot(tang))).normalize();
    // thickAxis is in the XY plane perpendicular to the spine curve
    const thickAxis = new THREE.Vector3().crossVectors(tang, flapAxis).normalize();

    // Asymmetric XY thickness prevents inner-bend self-intersection while keeping outer arch plump
    const thickR = (cosTheta >= 0.0 ? 0.098 : 0.064) * paddleEnv;
    // Broad Z paddle width so Side view shows a generous, rounded-bottom drooping ear flap
    const flapR = (0.172 + 0.028 * Math.pow(s, 0.7)) * paddleEnv;

    const px =
      center.x +
      thickAxis.x * (cosTheta * thickR) +
      flapAxis.x * (sinTheta * flapR);
    const py =
      center.y +
      thickAxis.y * (cosTheta * thickR) +
      flapAxis.y * (sinTheta * flapR);
    const pz =
      center.z +
      thickAxis.z * (cosTheta * thickR) +
      flapAxis.z * (sinTheta * flapR);

    pos.setXYZ(i, px, py, pz);
  }

  geom.computeVertexNormals();
  return geom;
}

/**
 * Helper to create the clearly recognizable short, rounded, fingerless plush arms on both sides
 * of the middle-lower body with a soft shoulder connection and vertical-oval side profile.
 */
function createStubbyArmGeometry(side: number): THREE.BufferGeometry {
  const geom = new THREE.SphereGeometry(1.0, 38, 30);
  const pos = geom.attributes.position;

  // Smooth outward-and-downward arm curve from middle-lower torso flank to rounded mitten tip
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.60, -0.04, 0.04),
    new THREE.Vector3(side * 0.75, -0.22, 0.05),
    new THREE.Vector3(side * 0.86, -0.41, 0.06)
  ]);

  const worldZ = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    const v = pos.getY(i);
    const w = pos.getZ(i);

    const phi = Math.acos(Math.max(-1.0, Math.min(1.0, v)));
    const s = 1.0 - phi / Math.PI;
    const rCircle = Math.sqrt(Math.max(0.0, 1.0 - v * v));
    const cosTheta = rCircle > 1e-5 ? u / rCircle : 0.0;
    const sinTheta = rCircle > 1e-5 ? w / rCircle : 0.0;

    const mittenEnv = evaluateSmoothPaddleEnvelope(s, 0.09);

    const center = armCurve.getPointAt(s);
    const tang = armCurve.getTangentAt(s).normalize();

    const depthAxis = worldZ.clone().sub(tang.clone().multiplyScalar(worldZ.dot(tang))).normalize();
    const thickAxis = new THREE.Vector3().crossVectors(tang, depthAxis).normalize();

    const rThick = 0.098 * mittenEnv;
    const rDepth = 0.118 * mittenEnv; // Keeps side-view arm profile a vertical oval rather than a wide circle

    const px = center.x + thickAxis.x * (cosTheta * rThick) + depthAxis.x * (sinTheta * rDepth);
    const py = center.y + thickAxis.y * (cosTheta * rThick) + depthAxis.y * (sinTheta * rDepth);
    const pz = center.z + thickAxis.z * (cosTheta * rThick) + depthAxis.z * (sinTheta * rDepth);

    pos.setXYZ(i, px, py, pz);
  }

  geom.computeVertexNormals();
  return geom;
}

/**
 * Helper to create the small round pom-pom tail at the bottom-center of the back.
 * Embedded cleanly into the lower back torso without gaps, protruding backward in Side view.
 */
function createPomTailGeometry(): THREE.BufferGeometry {
  const geom = new THREE.SphereGeometry(0.165, 28, 22);
  const pos = geom.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) * 1.05;
    const y = pos.getY(i) * 1.05 - 0.52;
    const z = pos.getZ(i) * 1.02 - 0.68;
    pos.setXYZ(i, x, y, z);
  }

  geom.computeVertexNormals();
  return geom;
}

/**
 * Merges an array of indexed BufferGeometries into a single BufferGeometry.
 */
function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let totalVerts = 0;
  let totalIndices = 0;

  for (const g of geometries) {
    totalVerts += g.attributes.position.count;
    totalIndices += g.index ? g.index.count : 0;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices = new Uint32Array(totalIndices);

  let vertOffset = 0;
  let idxOffset = 0;

  for (const g of geometries) {
    const posAttr = g.attributes.position;
    const normAttr = g.attributes.normal;
    const uvAttr = g.attributes.uv;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      positions[(vertOffset + i) * 3] = posAttr.getX(i);
      positions[(vertOffset + i) * 3 + 1] = posAttr.getY(i);
      positions[(vertOffset + i) * 3 + 2] = posAttr.getZ(i);

      normals[(vertOffset + i) * 3] = normAttr.getX(i);
      normals[(vertOffset + i) * 3 + 1] = normAttr.getY(i);
      normals[(vertOffset + i) * 3 + 2] = normAttr.getZ(i);

      if (uvAttr) {
        uvs[(vertOffset + i) * 2] = uvAttr.getX(i);
        uvs[(vertOffset + i) * 2 + 1] = uvAttr.getY(i);
      }
    }

    if (g.index) {
      const idxAttr = g.index;
      for (let i = 0; i < idxAttr.count; i++) {
        indices[idxOffset + i] = idxAttr.getX(i) + vertOffset;
      }
      idxOffset += idxAttr.count;
    }

    vertOffset += count;
    g.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}

/**
 * Builds the complete composite plush geometry (Torso + Upright Left Ear + Folded Right Ear +
 * Left & Right Stubby Arms + Back Round Pom-Pom Tail) with baked fur attributes so all parts
 * receive seamless 3D volumetric short plush fur.
 */
export function createOrganicBlobGeometry(widthSegments = 88, heightSegments = 68): THREE.BufferGeometry {
  const torsoGeo = new THREE.SphereGeometry(1.0, widthSegments, heightSegments);
  const tPos = torsoGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const u = tPos.getX(i);
    const v = tPos.getY(i);
    const w = tPos.getZ(i);
    const [sx, sy, sz] = sculptTorsoPosition(u, v, w);
    tPos.setXYZ(i, sx, sy, sz);
  }
  torsoGeo.computeVertexNormals();

  const leftEarGeo = createLeftUprightEarGeometry();
  const rightEarGeo = createRightLopEarGeometry();
  const leftArmGeo = createStubbyArmGeometry(-1);
  const rightArmGeo = createStubbyArmGeometry(1);
  const tailGeo = createPomTailGeometry();

  const geom = mergeGeometries([
    torsoGeo,
    leftEarGeo,
    rightEarGeo,
    leftArmGeo,
    rightArmGeo,
    tailGeo
  ]);

  const posAttr = geom.attributes.position;
  const normAttr = geom.attributes.normal;
  const count = posAttr.count;

  const follicleMaskArray = new Float32Array(count);
  const groomTangentArray = new Float32Array(count * 3);
  const skinColorArray = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const nx = normAttr.getX(i);
    const ny = normAttr.getY(i);
    const nz = normAttr.getZ(i);

    follicleMaskArray[i] = evaluateFollicleMask(x, y, z);
    const [tx, ty, tz] = evaluateGroomFlow(x, y, z, nx, ny, nz);
    groomTangentArray[i * 3] = tx;
    groomTangentArray[i * 3 + 1] = ty;
    groomTangentArray[i * 3 + 2] = tz;

    const [cr, cg, cb] = evaluateUnderSkinColor(x, y, z);
    skinColorArray[i * 3] = cr;
    skinColorArray[i * 3 + 1] = cg;
    skinColorArray[i * 3 + 2] = cb;
  }

  geom.setAttribute('aFollicleMask', new THREE.BufferAttribute(follicleMaskArray, 1));
  geom.setAttribute('aGroomTangent', new THREE.BufferAttribute(groomTangentArray, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(skinColorArray, 3));

  return geom;
}

export interface AnimState {
  time: number;
  baseScale: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  blinkTimer: number;
  nextBlink: number;
  boopImpulse: number;
  boopPhase: number;
  prevPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  targetLook: THREE.Vector2;
  currentLook: THREE.Vector2;
}

export interface BlobCreature {
  root: THREE.Group;
  bodyMesh: THREE.Mesh;
  bodyGeometry: THREE.BufferGeometry;
  skinMaterial: THREE.MeshStandardMaterial;
  animState: AnimState;
  setEnvironmentScale: (scale: number, offsetX?: number, offsetZ?: number) => void;
  setViewYawOffset: (yawRad: number, immediate?: boolean) => void;
  triggerBoop: () => void;
  placeAt: (targetWorldPos: THREE.Vector3, normal?: THREE.Vector3, animate?: boolean, cameraPos?: THREE.Vector3 | null) => void;
  resetPlacement: (animate?: boolean) => void;
  isPlaced: () => boolean;
  getAnchorPosition: () => THREE.Vector3;
  update: (dt: number, pointerNDC?: THREE.Vector2 | null, cameraPos?: THREE.Vector3 | null, isARMode?: boolean, isListening?: boolean) => void;
  dispose: () => void;
}

interface EyeItem {
  pivot: THREE.Group;
  basePos: THREE.Vector3;
  catchlightMain: THREE.Mesh;
  catchlightSub: THREE.Mesh;
  side: number;
}

export function createBlobCreature(): BlobCreature {
  const root = new THREE.Group();
  root.name = 'SagePlushNovaCreature';

  const bodyGeometry = createOrganicBlobGeometry(88, 68);

  // Vertex-colored velvety under-skin matching the sage body, cream belly, and peach blush
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ffffff'),
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.01
  });

  const bodyMesh = new THREE.Mesh(bodyGeometry, skinMaterial);
  bodyMesh.name = 'BlobBodyMesh';
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  root.add(bodyMesh);

  // ---------------------------------------------------------------------------
  // Facial Features: Two small, dark espresso-brown round eyes (NO mouth or nose)
  // ---------------------------------------------------------------------------
  const faceGroup = new THREE.Group();
  faceGroup.name = 'FacialFeatures';
  root.add(faceGroup);

  const eyeMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#180e0a'),
    roughness: 0.05,
    metalness: 0.03,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    reflectivity: 0.9
  });

  const lowerIrisMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#382016')
  });

  const highlightMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#fffdf9')
  });

  const subHighlightMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#e8d5c8'),
    transparent: true,
    opacity: 0.75
  });

  const eyes: EyeItem[] = [];
  const eyeSides = [-1, 1];

  for (const side of eyeSides) {
    const [sx, sy, sz] = getEyeSurfacePosition(side);
    const eyePivot = new THREE.Group();
    // Place the glossy dark-brown bead eye cleanly on the torso surface so short fur frames it without occluding in front or side view
    eyePivot.position.set(sx, sy, sz + 0.032);
    eyePivot.rotation.y = side * 0.28;
    eyePivot.rotation.x = -0.04;

    // Small, deep espresso-brown/black round bead eye
    const eyeballGeo = new THREE.SphereGeometry(0.072, 32, 24);
    eyeballGeo.scale(1.0, 1.02, 0.86);
    const eyeball = new THREE.Mesh(eyeballGeo, eyeMaterial);
    eyePivot.add(eyeball);

    // Subtle dark warm-umber lower iris crescent
    const irisGeo = new THREE.SphereGeometry(0.050, 20, 16);
    irisGeo.scale(0.92, 0.92, 0.44);
    const iris = new THREE.Mesh(irisGeo, lowerIrisMat);
    iris.position.set(0, -0.010, 0.042);
    eyePivot.add(iris);

    // Natural, restrained primary catchlight on upper-left
    const catchlightMainGeo = new THREE.SphereGeometry(0.017, 16, 12);
    catchlightMainGeo.scale(1.0, 1.08, 0.36);
    const catchlightMain = new THREE.Mesh(catchlightMainGeo, highlightMat);
    catchlightMain.position.set(-0.018, 0.020, 0.058);
    eyePivot.add(catchlightMain);

    // Very subtle secondary lower-right pinpoint reflection
    const catchlightSubGeo = new THREE.SphereGeometry(0.0075, 12, 10);
    catchlightSubGeo.scale(1.0, 1.0, 0.35);
    const catchlightSub = new THREE.Mesh(catchlightSubGeo, subHighlightMat);
    catchlightSub.position.set(0.018, -0.020, 0.056);
    eyePivot.add(catchlightSub);

    faceGroup.add(eyePivot);

    eyes.push({
      pivot: eyePivot,
      basePos: eyePivot.position.clone(),
      catchlightMain,
      catchlightSub,
      side
    });
  }

  const animState: AnimState = {
    time: 0,
    baseScale: 1.0,
    baseX: 0.0,
    baseY: 0.0,
    baseZ: 0.0,
    blinkTimer: 0,
    nextBlink: 2.8,
    boopImpulse: 0,
    boopPhase: 0,
    prevPosition: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    angularVelocity: new THREE.Vector3(),
    targetLook: new THREE.Vector2(0, 0),
    currentLook: new THREE.Vector2(0, 0)
  };

  const anchorPos = new THREE.Vector3(0, 0, 0);
  const targetAnchorPos = new THREE.Vector3(0, 0, 0);
  const startAnchorPos = new THREE.Vector3(0, 0, 0);
  let isPlaced = false;
  let isPlacing = false;
  let placeProgress = 1.0;
  let placeHopHeight = 0.0;
  let facingYaw = 0.0;
  let facingPitch = 0.0;
  let targetFacingYaw = 0.0;
  let targetFacingPitch = 0.0;
  let faceViewerHoldTimer = 0.0;
  let viewYawOffset = 0.0;
  let currentViewYawOffset = 0.0;

  function setViewYawOffset(yawRad: number, immediate = false) {
    viewYawOffset = Number.isFinite(yawRad) ? yawRad : 0.0;
    if (immediate) {
      currentViewYawOffset = viewYawOffset;
      root.rotation.y = facingYaw + currentViewYawOffset;
    }
  }

  function placeAt(
    targetWorldPos: THREE.Vector3,
    _normal?: THREE.Vector3,
    animate = true,
    cameraPos: THREE.Vector3 | null = null
  ) {
    if (!targetWorldPos) return;
    isPlaced = true;
    const s = animState.baseScale;
    const targetCenterY = targetWorldPos.y + 0.94 * s;

    animState.targetLook.set(0, 0);
    animState.currentLook.set(0, 0);
    faceViewerHoldTimer = 1.4;

    if (cameraPos) {
      const dx = cameraPos.x - targetWorldPos.x;
      const dy = cameraPos.y - targetCenterY;
      const dz = cameraPos.z - targetWorldPos.z;
      const horizDist = Math.max(0.001, Math.hypot(dx, dz));
      targetFacingYaw = Math.atan2(dx, dz);
      targetFacingPitch = -Math.atan2(dy, horizDist) * 0.72;
      if (!animate) {
        facingYaw = targetFacingYaw;
        facingPitch = targetFacingPitch;
      }
    }

    if (animate) {
      startAnchorPos.copy(anchorPos);
      targetAnchorPos.set(targetWorldPos.x, targetCenterY, targetWorldPos.z);
      placeProgress = 0.0;
      isPlacing = true;
      placeHopHeight = Math.min(0.65, Math.max(0.18, startAnchorPos.distanceTo(targetAnchorPos) * 0.22));
      animState.boopImpulse = 0.85;
      animState.boopPhase = 0.0;
    } else {
      anchorPos.set(targetWorldPos.x, targetCenterY, targetWorldPos.z);
      targetAnchorPos.copy(anchorPos);
      isPlacing = false;
      placeProgress = 1.0;
    }
  }

  function resetPlacement(animate = true) {
    isPlaced = false;
    targetFacingYaw = 0.0;
    targetFacingPitch = 0.0;
    faceViewerHoldTimer = 0.0;
    animState.targetLook.set(0, 0);
    animState.currentLook.set(0, 0);
    const s = animState.baseScale;
    const ox = animState.baseX || 0.0;
    const oz = animState.baseZ || 0.0;
    const targetY = -0.94 + 0.94 * s;

    if (animate) {
      startAnchorPos.copy(anchorPos);
      targetAnchorPos.set(ox, targetY, oz);
      placeProgress = 0.0;
      isPlacing = true;
      placeHopHeight = Math.min(0.55, Math.max(0.18, startAnchorPos.distanceTo(targetAnchorPos) * 0.22));
      animState.boopImpulse = 0.85;
      animState.boopPhase = 0.0;
    } else {
      anchorPos.set(ox, targetY, oz);
      targetAnchorPos.set(ox, targetY, oz);
      startAnchorPos.set(ox, targetY, oz);
      facingYaw = 0.0;
      facingPitch = 0.0;
      isPlacing = false;
      placeProgress = 1.0;
      animState.boopImpulse = 0.0;
      animState.boopPhase = 0.0;
    }
  }

  function setEnvironmentScale(scale: number, offsetX = 0.0, offsetZ = 0.0) {
    const s = Number.isFinite(scale) && scale > 0 ? scale : 1.0;
    const ox = Number.isFinite(offsetX) ? offsetX : 0.0;
    const oz = Number.isFinite(offsetZ) ? offsetZ : 0.0;
    animState.baseScale = s;
    animState.baseX = ox;
    animState.baseY = -0.94 * (1.0 - s);
    animState.baseZ = oz;
    if (!isPlaced) {
      anchorPos.set(ox, -0.94 + 0.94 * s, oz);
      targetAnchorPos.copy(anchorPos);
      startAnchorPos.copy(anchorPos);
      facingYaw = 0.0;
      facingPitch = 0.0;
      targetFacingYaw = 0.0;
      targetFacingPitch = 0.0;
    }
  }

  function triggerBoop() {
    animState.boopImpulse = 1.0;
    animState.boopPhase = 0.0;
  }

  let listeningWeight = 0.0;

  function update(
    dt: number,
    pointerNDC: THREE.Vector2 | null = null,
    cameraPos: THREE.Vector3 | null = null,
    isARMode = false,
    isListening = false
  ) {
    const safeDt = Math.min(Math.max(dt, 0.001), 0.05);
    animState.time += safeDt;

    const targetListening = isListening ? 1.0 : 0.0;
    listeningWeight += (targetListening - listeningWeight) * Math.min(1.0, safeDt * 3.4);

    if (faceViewerHoldTimer > 0) {
      faceViewerHoldTimer = Math.max(0, faceViewerHoldTimer - safeDt);
    }

    const listeningLookY = 0.08 * listeningWeight;
    const listeningLookX = 0.05 * listeningWeight;
    if (pointerNDC && faceViewerHoldTimer <= 0 && Math.abs(viewYawOffset) < 0.1) {
      animState.targetLook.set(
        pointerNDC.x * 0.18 + listeningLookX,
        pointerNDC.y * 0.12 + listeningLookY
      );
    } else if (faceViewerHoldTimer > 0 || Math.abs(viewYawOffset) >= 0.1) {
      animState.targetLook.set(0, 0);
    } else {
      animState.targetLook.set(listeningLookX, listeningLookY);
    }
    animState.currentLook.lerp(animState.targetLook, Math.min(1.0, safeDt * 6.0));

    if (animState.boopImpulse > 0.001) {
      animState.boopPhase += safeDt * 13.0;
      animState.boopImpulse *= Math.exp(-safeDt * 3.8);
    } else {
      animState.boopImpulse = 0.0;
    }

    let hop = 0.0;
    if (isPlacing) {
      placeProgress += safeDt * 3.4;
      if (placeProgress >= 1.0) {
        placeProgress = 1.0;
        isPlacing = false;
        anchorPos.copy(targetAnchorPos);
        triggerBoop();
      } else {
        const p = placeProgress;
        anchorPos.lerpVectors(startAnchorPos, targetAnchorPos, p);
        hop = Math.sin(p * Math.PI) * placeHopHeight;
      }
    }

    if ((isPlaced || isARMode) && cameraPos) {
      const dx = cameraPos.x - anchorPos.x;
      const dy = cameraPos.y - anchorPos.y;
      const dz = cameraPos.z - anchorPos.z;
      const horizDist = Math.max(0.001, Math.hypot(dx, dz));
      targetFacingYaw = Math.atan2(dx, dz);
      targetFacingPitch = -Math.atan2(dy, horizDist) * 0.72;
    } else if (!isPlaced) {
      targetFacingYaw = 0.0;
      targetFacingPitch = 0.0;
    }

    const yawDiff = Math.atan2(Math.sin(targetFacingYaw - facingYaw), Math.cos(targetFacingYaw - facingYaw));
    facingYaw += yawDiff * Math.min(1.0, safeDt * 12.0);
    facingPitch += (targetFacingPitch - facingPitch) * Math.min(1.0, safeDt * 12.0);

    const offsetDiff = Math.atan2(
      Math.sin(viewYawOffset - currentViewYawOffset),
      Math.cos(viewYawOffset - currentViewYawOffset)
    );
    currentViewYawOffset += offsetDiff * Math.min(1.0, safeDt * 16.0);

    // Gentle, restrained breathing & subtle sway so the plush silhouette stays faithful to the turnaround
    const s = animState.baseScale;
    const breath = Math.sin(animState.time * 2.0) * 0.012;
    const bodyLookScale = (isPlaced || isARMode) ? (faceViewerHoldTimer > 0 ? 0.0 : 0.04) : 0.45;
    const swayX = (Math.sin(animState.time * 1.15) * 0.012 + animState.currentLook.x * 0.04 * bodyLookScale) * s;
    const jumpY =
      (Math.sin(animState.time * 2.0) * 0.012 +
        Math.abs(Math.sin(animState.boopPhase)) * animState.boopImpulse * 0.18) *
      s;
    const squash =
      1.0 +
      breath +
      Math.cos(animState.boopPhase * 2.0) * animState.boopImpulse * 0.08;

    const prevX = root.position.x;
    const prevY = root.position.y;
    const prevZ = root.position.z;
    const prevRotZ = root.rotation.z;
    const prevRotY = root.rotation.y;

    root.position.set(
      anchorPos.x + swayX,
      anchorPos.y + jumpY + hop,
      anchorPos.z
    );

    const listeningPitch = -0.05 * listeningWeight;
    const listeningYaw = 0.04 * listeningWeight;
    const listeningRoll = 0.06 * listeningWeight;

    root.scale.set((1.0 / Math.sqrt(squash)) * s, squash * s, (1.0 / Math.sqrt(squash)) * s);
    root.rotation.y =
      facingYaw +
      currentViewYawOffset +
      animState.currentLook.x * 0.16 * bodyLookScale +
      Math.sin(animState.time * 0.8) * (isPlaced ? 0.01 : 0.018) +
      listeningYaw;
    root.rotation.x =
      facingPitch -
      animState.currentLook.y * 0.10 * bodyLookScale +
      Math.cos(animState.time * 1.5) * (isPlaced ? 0.008 : 0.012) +
      listeningPitch;
    root.rotation.z =
      -(swayX / s) * 0.18 +
      Math.sin(animState.boopPhase) * animState.boopImpulse * 0.08 +
      listeningRoll;

    animState.velocity.set(
      (root.position.x - prevX) / (safeDt * s),
      (root.position.y - prevY) / (safeDt * s),
      (root.position.z - prevZ) / (safeDt * s)
    );
    animState.angularVelocity.set(
      (root.rotation.x - prevRotY) / safeDt,
      (root.rotation.y - prevRotY) / safeDt,
      (root.rotation.z - prevRotZ) / safeDt
    );

    // Natural blinking
    animState.blinkTimer += safeDt;
    let blinkScaleY = 1.0;
    if (animState.blinkTimer > animState.nextBlink) {
      const blinkProgress = (animState.blinkTimer - animState.nextBlink) / 0.15;
      if (blinkProgress < 1.0) {
        blinkScaleY = Math.max(0.08, Math.abs(Math.cos(blinkProgress * Math.PI)));
      } else {
        animState.blinkTimer = 0;
        animState.nextBlink = 2.6 + Math.random() * 2.6;
      }
    }
    if (animState.boopImpulse > 0.25) {
      blinkScaleY = Math.min(blinkScaleY, 0.18);
    }

    for (const eye of eyes) {
      eye.pivot.scale.y = blinkScaleY;
      eye.catchlightMain.position.x = -0.018 + animState.currentLook.x * 0.012;
      eye.catchlightMain.position.y = 0.020 + animState.currentLook.y * 0.011;
    }
  }

  function dispose() {
    bodyGeometry.dispose();
    skinMaterial.dispose();
    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
  }

  return {
    root,
    bodyMesh,
    bodyGeometry,
    skinMaterial,
    animState,
    setEnvironmentScale,
    setViewYawOffset,
    triggerBoop,
    placeAt,
    resetPlacement,
    isPlaced: () => isPlaced,
    getAnchorPosition: () => anchorPos,
    update,
    dispose
  };
}
