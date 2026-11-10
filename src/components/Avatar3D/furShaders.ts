// Physical Plush Fur BSDF (Short, Fine, Dense Sheared Plush with Multi-Zone Root Pigmentation:
// Low-Saturation Light Sage Green Coat, Large Warm Cream-Oatmeal Belly Patch with Feathered Edge,
// Soft Peach-Orange Gradient Blush, Pale Sage Inner Upright Ear, and Natural Limb/Ear Crease AO)
// + Hybrid GPU Shells & Instanced Strands.

const COMMON_HAIR_BSDF_GLSL = /* glsl */ `
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;
  uniform float uRoughness;
  uniform float uSpecular;
  uniform float uFurDensity;
  uniform vec3 uKeyLightDir;
  uniform vec3 uKeyLightColor;
  uniform float uKeyLightIntensity;
  uniform vec3 uRimLightDir;
  uniform vec3 uRimLightColor;
  uniform float uRimIntensity;
  uniform float uAmbientIntensity;
  uniform vec3 uEnvSkyColor;
  uniform vec3 uEnvGroundColor;
  uniform float uEnvTintStrength;

  vec3 shiftTangent(vec3 T, vec3 N, float shift) {
    return normalize(T + N * shift);
  }

  float hairSpecularLobe(vec3 T, vec3 N, vec3 V, vec3 L, float roughness) {
    vec3 H = normalize(L + V + vec3(1e-6, 1e-6, 1e-6));
    float dotTH = clamp(dot(T, H), -1.0, 1.0);
    float sinTH = sqrt(max(1e-5, 1.0 - dotTH * dotTH));
    float hemiVis = smoothstep(-0.20, 0.25, dot(N, L));
    float exponent = mix(20.0, 5.5, clamp(roughness, 0.0, 1.0));
    return clamp(hemiVis * pow(sinTH, exponent) * 0.14, 0.0, 0.11);
  }

  // Evaluates soft, velvety plush shading with multi-zone root pigmentation so the belly patch,
  // soft gradient cheek blush, and inner ear never bleed across anatomical boundaries.
  vec3 evaluatePhysicalHairShading(
    vec3 rootPos,
    vec3 worldPos,
    vec3 surfNormal,
    vec3 hairTangent,
    float h,
    float strandSeed,
    float combMemory
  ) {
    vec3 N = normalize(surfNormal);
    vec3 T = normalize(hairTangent);
    vec3 V = normalize(cameraPosition - worldPos);
    vec3 L = normalize(uKeyLightDir);

    // 1. Multi-Zone Root Pigmentation evaluated strictly at each fiber's root (rootPos):
    // Zone A: Light, low-saturation grey-sage green main coat ("主体颜色调浅为低饱和鼠尾草绿")
    vec3 sageRoot = uBaseColor; // #9da893
    vec3 sageTip  = uTipColor;  // #c4ccb9

    // Zone B: Larger, wider warm cream-white oval belly patch with reduced glare & feathered transition
    // Exactly matches blobCreature.ts evaluateUnderSkinColor & evaluateFollicleMask
    float bellyRx = 0.51 - 0.035 * (rootPos.y + 0.33);
    float bellyEllip = sqrt(
      pow(rootPos.x / max(0.28, bellyRx), 2.0) +
      pow((rootPos.y + 0.33) / 0.39, 2.0)
    );
    float bellyZMask = smoothstep(0.20, 0.42, rootPos.z);
    float bellyWeight = (1.0 - smoothstep(0.78, 1.04, bellyEllip)) * bellyZMask;
    vec3 bellyRoot = vec3(0.86, 0.83, 0.76);
    vec3 bellyTip  = vec3(0.935, 0.905, 0.845);

    // Zone C: Soft warm peach-orange gradient cheek blush below/outer to the eyes
    float blushDx = (abs(rootPos.x) - 0.375) / 0.145;
    float blushDy = (rootPos.y - 0.13) / 0.090;
    float blushDistSq = blushDx * blushDx + blushDy * blushDy;
    float blushZ = smoothstep(0.28, 0.50, rootPos.z);
    float blushWeight = exp(-blushDistSq * 1.45) * blushZ * 0.84;
    vec3 blushRoot = vec3(0.84, 0.52, 0.38);
    vec3 blushTip  = vec3(0.94, 0.66, 0.52);

    // Zone D: Subtle pale sage-cream hollow on the elongated upright left ear (x < 0, y > 0.82, z > 0)
    float earDx = (rootPos.x + 0.32) / 0.088;
    float earDy = (rootPos.y - 1.12) / 0.24;
    float innerEarWeight = exp(-(earDx * earDx + earDy * earDy) * 1.50) * smoothstep(0.01, 0.07, rootPos.z) * 0.72;
    vec3 innerEarRoot = vec3(0.78, 0.82, 0.73);
    vec3 innerEarTip  = vec3(0.89, 0.92, 0.84);

    // Combine zone pigments smoothly with a subtle warm luminance lift across the belly-to-sage border
    vec3 zoneRoot = mix(sageRoot, innerEarRoot, innerEarWeight);
    vec3 zoneTip  = mix(sageTip,  innerEarTip,  innerEarWeight);

    float borderLift = 1.0 + bellyWeight * (1.0 - bellyWeight) * 0.12;
    zoneRoot = mix(zoneRoot, bellyRoot, bellyWeight) * borderLift;
    zoneTip  = mix(zoneTip,  bellyTip,  bellyWeight) * borderLift;

    zoneRoot = mix(zoneRoot, blushRoot, blushWeight);
    zoneTip  = mix(zoneTip,  blushTip,  blushWeight);

    // 2. Anatomical Plush Seam & Crease Ambient Occlusion (separates side arms, folded lop ear, and pom-pom tail)
    float seamShade = 1.0;

    // Vertical-oval crease around the short rounded side arms (y in [-0.45, -0.02], z ~ 0.05)
    vec2 armYZ = vec2((rootPos.y + 0.22) / 0.24, (rootPos.z - 0.05) / 0.125);
    float armRadial = length(armYZ);
    float onTorsoNearArm = smoothstep(0.57, 0.69, abs(rootPos.x)) * (1.0 - smoothstep(0.70, 0.76, abs(rootPos.x)));
    float armCreaseRing = exp(-pow((armRadial - 0.92) / 0.24, 2.0)) * onTorsoNearArm;
    seamShade -= armCreaseRing * 0.18;
    // Gentle volume lift on the outer rounded surface of the side arms so they stand out in Front & Side views
    float onOuterArm = smoothstep(0.71, 0.84, abs(rootPos.x)) * (1.0 - smoothstep(0.95, 1.35, armRadial));
    seamShade += onOuterArm * 0.05;

    // Soft shadow on the upper-right head directly beneath the arched-and-drooping right lop ear
    if (rootPos.x > 0.34 && rootPos.y > 0.44 && rootPos.y < 0.82) {
      float underLop = exp(-pow((rootPos.x - 0.52) / 0.14, 2.0) - pow((rootPos.y - 0.64) / 0.14, 2.0));
      float isHeadUnderEar = 1.0 - smoothstep(0.50, 0.58, rootPos.x);
      seamShade -= underLop * isHeadUnderEar * 0.16;
    }

    // Soft crease around the round pom-pom tail base at back bottom (x = 0, y = -0.52, z < -0.52)
    if (rootPos.z < -0.52) {
      float tailRadial = length(vec2(rootPos.x, rootPos.y + 0.52));
      float tailSeam = exp(-pow((tailRadial - 0.162) / 0.046, 2.0)) * smoothstep(-0.52, -0.60, rootPos.z);
      seamShade -= tailSeam * 0.19;
    }

    // Root-to-tip plush gradient with ultra-fine, low-contrast micro-variation (avoids graininess / 颗粒感)
    float rootTipMix = smoothstep(0.02, 0.82, pow(clamp(h, 0.0, 1.0), 0.50));
    float strandVar = fract(strandSeed * 19.37);
    vec3 fiberMicroTint = mix(vec3(0.986, 0.988, 0.984), vec3(1.014, 1.012, 1.010), strandVar);
    vec3 albedo = mix(zoneRoot, zoneTip, rootTipMix) * fiberMicroTint * seamShade;

    // 3. Soft Velvety Plush Tuft Ambient Occlusion (gentle depth without dark noisy pits)
    float aoFactor = mix(0.89, 1.0, pow(clamp(h, 0.0, 1.0), 0.48));
    vec3 creviceColor = zoneRoot * vec3(0.94, 0.95, 0.93) * seamShade;
    vec3 aoShadedAlbedo = mix(creviceColor, albedo, aoFactor);

    // 4. Soft Volumetric Self-Shadowing & Natural Wrap Diffuse Lighting
    float NdotL = dot(N, L);
    float opticalDepth = (1.0 - h) * (0.22 + 0.26 * uFurDensity) / max(0.40, NdotL * 0.5 + 0.65);
    float deepShadow = exp(-opticalDepth * 0.58);
    float wrapDiffuse = clamp((NdotL + 0.76) / 1.76, 0.0, 1.0);
    float lightWeight = clamp(wrapDiffuse * (0.60 + 0.40 * deepShadow), 0.0, 1.0);

    vec3 shadowCoat = aoShadedAlbedo * vec3(0.86, 0.88, 0.84);
    vec3 litCoat = aoShadedAlbedo * mix(vec3(1.0), uKeyLightColor, 0.16);
    vec3 diffuseTerm = mix(shadowCoat, litCoat, lightWeight) * (0.87 + 0.14 * uKeyLightIntensity);

    // 5. Restrained Soft Plush Sheen (avoids harsh glare on the cream belly or coat)
    float sheenBoost = 1.0 + combMemory * 0.16;
    vec3 tPrimary = shiftTangent(T, N, -0.10 + (strandSeed - 0.5) * 0.03);
    float specR = hairSpecularLobe(tPrimary, N, V, L, uRoughness) * uSpecular * sheenBoost;
    vec3 colorR = specR * uKeyLightColor * 0.18 * (1.0 - bellyWeight * 0.40);

    // 6. Soft Rim Halo along Plush Contour
    float fresnelRim = pow(1.0 - max(0.0, dot(N, V)), 2.6);
    vec3 scatterTT = fresnelRim * mix(zoneTip, uRimLightColor, 0.40) * (0.09 * uRimIntensity) * pow(h, 0.80);

    // 7. Soft Neutral Studio Hemisphere Fill
    vec3 hemiFill = mix(
      zoneRoot * 0.91,
      zoneTip * 1.01,
      clamp(N.y * 0.5 + 0.5, 0.0, 1.0)
    ) * (0.15 * uAmbientIntensity);

    return diffuseTerm + colorR * (0.35 + 0.65 * h) + scatterTT + hemiFill * aoFactor;
  }
`;

const COMMON_CLEARANCE_GLSL = /* glsl */ `
  float computeBellyLengthScale(vec3 rootPos) {
    float bellyRx = 0.51 - 0.035 * (rootPos.y + 0.33);
    float bellyEllip = sqrt(
      pow(rootPos.x / max(0.28, bellyRx), 2.0) +
      pow((rootPos.y + 0.33) / 0.39, 2.0)
    );
    float bellyZMask = smoothstep(0.20, 0.42, rootPos.z);
    float bellyWeight = (1.0 - smoothstep(0.78, 1.04, bellyEllip)) * bellyZMask;
    // Belly plush is subtly shorter and extra velvety without creating a perimeter step
    return mix(1.0, 0.98, bellyWeight);
  }

  vec3 applyAnatomicalClearance(vec3 pos, float h) {
    vec3 p = pos;
    float tipWeight = smoothstep(0.10, 0.65, h);

    // 1. Keep short plush fibers from crossing in front of or occluding the two dark-brown eyes
    // Eye centers are at x = ±0.245, y = 0.25
    if (p.z > 0.48 && tipWeight > 0.01) {
      vec2 leftEyeXY = vec2(-0.245, 0.25);
      vec2 rightEyeXY = vec2(0.245, 0.25);
      float eyeClearRadius = 0.072;

      vec2 dL = p.xy - leftEyeXY;
      float distL = length(dL);
      if (distL < eyeClearRadius && distL > 1e-5) {
        float push = (eyeClearRadius - distL) * tipWeight;
        p.xy += (dL / distL) * push * 0.92;
      }

      vec2 dR = p.xy - rightEyeXY;
      float distR = length(dR);
      if (distR < eyeClearRadius && distR > 1e-5) {
        float push = (eyeClearRadius - distR) * tipWeight;
        p.xy += (dR / distR) * push * 0.92;
      }
    }

    // 2. Wide, gently flattened plush bottom base (no legs or feet)
    float minBottomY = -0.785 + 0.045 * pow(clamp(length(p.xz) / 0.72, 0.0, 1.3), 2.6);
    if (p.y < minBottomY) {
      p.y = mix(p.y, minBottomY, 0.90);
    }

    return p;
  }
`;

export const SHELL_VERTEX_SHADER = /* glsl */ `
  attribute float aFollicleMask;
  attribute vec3 aGroomTangent;
  attribute float aShellIndex;

  uniform sampler2D uPhysicsTex;
  uniform float uFurLength;
  uniform float uClumping;
  uniform float uCurliness;
  uniform float uTime;
  uniform float uWindStrength;
  uniform vec3 uPointerLocalPos;
  uniform float uPointerActive;
  uniform float uGpuFurMode;
  uniform float uShellCountScale;
  uniform vec3 uWebGLInertia;
  uniform float uBoopShockwave;

  varying float vLayerHeight;
  varying float vFollicleMask;
  varying vec3 vRootPos;
  varying vec3 vWorldPos;
  varying vec3 vSurfNormal;
  varying vec3 vHairTangent;
  varying float vCombMemory;

  ${COMMON_CLEARANCE_GLSL}

  vec2 normalToSphericalUV(vec3 n) {
    vec3 d = normalize(n);
    float u = atan(d.x, d.z) / (2.0 * 3.14159265) + 0.5;
    float v = 1.0 - acos(clamp(d.y, -1.0, 1.0)) / 3.14159265;
    return vec2(u, v);
  }

  void main() {
    float h = clamp(aShellIndex * uShellCountScale, 0.0, 1.0);
    vLayerHeight = h;
    vFollicleMask = aFollicleMask;
    vRootPos = position;

    vec3 localNormal = normalize(normal);
    vec3 groomDir = normalize(aGroomTangent);
    vec3 sideDir = normalize(cross(localNormal, groomDir) + vec3(1e-4, 0.0, 0.0));

    vec3 gpuDisp = vec3(0.0);
    vCombMemory = 0.0;
    if (uGpuFurMode > 0.5) {
      vec2 simUV = normalToSphericalUV(localNormal);
      vec4 gpgpuData = texture2D(uPhysicsTex, simUV);
      gpuDisp = gpgpuData.xyz;
      vCombMemory = gpgpuData.w;
    } else {
      vec3 tangInertia = uWebGLInertia - localNormal * min(0.0, dot(uWebGLInertia, localNormal));
      gpuDisp = tangInertia;
      if (uBoopShockwave > 0.01) {
        float waveFront = (1.0 - uBoopShockwave) * 2.2;
        float dFront = abs(distance(localNormal, vec3(0.0, 0.0, 0.98)) - waveFront);
        if (dFront < 0.38) {
          float ripple = (1.0 - dFront / 0.38) * uBoopShockwave;
          vec3 radial = normalize(localNormal - vec3(0.0, 0.0, 0.98) + vec3(0.0, 1e-4, 0.0));
          gpuDisp += radial * ripple * 0.42;
        }
      }
      if (uPointerActive > 0.5) {
        float pDist = distance(position, uPointerLocalPos);
        if (pDist < 0.45) {
          vCombMemory = (1.0 - pDist / 0.45) * 0.65;
        }
      }
    }

    float bendFactor = pow(h, 1.25);
    vec3 windWave = vec3(
      sin(position.y * 4.5 + uTime * 2.1) * 0.028,
      cos(position.x * 4.0 + uTime * 1.8) * 0.016,
      cos(position.z * 4.2 - uTime * 2.0) * 0.028
    ) * uWindStrength;

    vec3 pointerPush = vec3(0.0);
    if (uPointerActive > 0.5) {
      float pDist = distance(position, uPointerLocalPos);
      if (pDist < 0.52) {
        vec3 away = normalize(position - uPointerLocalPos + vec3(0.0, 1e-4, 0.0));
        away -= localNormal * dot(away, localNormal);
        pointerPush = away * pow(1.0 - pDist / 0.52, 1.8) * 0.26;
      }
    }

    float bellyLenScale = computeBellyLengthScale(position);
    float effectiveLen = uFurLength * aFollicleMask * bellyLenScale;

    float lockPhase = dot(position, vec3(7.2, 8.4, 6.8));
    float curlFreq = mix(3.2, 6.4, uCurliness);
    float wavePhase = h * curlFreq + lockPhase;
    float smoothEnv = h * h * (3.0 - 2.0 * h);
    float waveAmp = uCurliness * effectiveLen * 0.12 * smoothEnv;
    vec3 waveOffset = (sideDir * sin(wavePhase) + groomDir * (cos(wavePhase) - 1.0) * 0.5) * waveAmp;
    vec3 waveTangent = (sideDir * cos(wavePhase) - groomDir * sin(wavePhase) * 0.5) * (waveAmp * curlFreq);

    // Fine short plush hugs the contour along the directional nap (avoids spiky bristles / 长刺感)
    vec3 totalOffset =
      localNormal * (h * effectiveLen * 0.78) +
      groomDir * (bendFactor * effectiveLen * (0.40 + 0.14 * uClumping)) +
      waveOffset +
      (gpuDisp * 0.26 + windWave + pointerPush) * bendFactor * effectiveLen;

    vec3 displacedLocal = applyAnatomicalClearance(position + totalOffset, h);
    vec4 worldPosition = modelMatrix * vec4(displacedLocal, 1.0);
    vWorldPos = worldPosition.xyz;

    vSurfNormal = normalize(mat3(modelMatrix) * localNormal);
    vec3 localHairDir = normalize(
      localNormal * (effectiveLen * 0.78) +
      groomDir * (1.25 * pow(max(0.05, h), 0.30) * effectiveLen * 0.44) +
      waveTangent +
      (gpuDisp * 0.26 + windWave + pointerPush) * 1.25 * pow(max(0.05, h), 0.30)
    );
    vHairTangent = normalize(mat3(modelMatrix) * localHairDir);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const SHELL_FRAGMENT_SHADER = /* glsl */ `
  ${COMMON_HAIR_BSDF_GLSL}

  uniform float uClumping;
  uniform float uCurliness;
  uniform float uGpuFurMode;

  varying float vLayerHeight;
  varying float vFollicleMask;
  varying vec3 vRootPos;
  varying vec3 vWorldPos;
  varying vec3 vSurfNormal;
  varying vec3 vHairTangent;
  varying float vCombMemory;

  vec2 octahedralUV(vec3 n) {
    vec3 d = n / (abs(n.x) + abs(n.y) + abs(n.z) + 1e-6);
    vec2 oct = d.y >= 0.0
      ? d.xz
      : (1.0 - abs(d.zx)) * vec2(d.x >= 0.0 ? 1.0 : -1.0, d.z >= 0.0 ? 1.0 : -1.0);
    return oct * 0.5 + 0.5;
  }

  vec3 hash23(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.xxz + p3.yxx) * p3.zyx);
  }

  void main() {
    if (vFollicleMask < 0.04) {
      discard;
    }

    // Ultra-fine high-frequency cellular grid for velvety, non-grainy short plush pile
    float gridScale = mix(108.0, 164.0, clamp(uFurDensity, 0.0, 1.0));
    vec2 baseUV = octahedralUV(normalize(vRootPos + vec3(0.0, 0.08, 0.0)));
    vec2 warpedUV = baseUV + 0.005 * sin(baseUV.yx * 38.0);
    vec2 sampleUV = warpedUV * gridScale;

    vec2 clumpGrid = warpedUV * (gridScale * 0.28);
    vec2 clumpFract = fract(clumpGrid) - 0.5;
    sampleUV -= clumpFract * (vLayerHeight * uClumping * 1.15);

    vec2 cellId = floor(sampleUV);
    vec2 cellLocal = fract(sampleUV) - 0.5;
    vec3 rand = hash23(cellId);

    float densityFactor = clamp(uFurDensity * 1.08, 0.35, 1.0) * clamp(vFollicleMask * 1.15, 0.0, 1.0);
    float fiberMaxH = mix(0.72, 1.0, rand.z) * densityFactor;
    if (vLayerHeight > fiberMaxH) {
      discard;
    }

    float curlFreq = mix(3.0, 6.0, uCurliness);
    float curlAngle = vLayerHeight * curlFreq + rand.x * 6.28318;
    float smoothEnv = vLayerHeight * vLayerHeight * (3.0 - 2.0 * vLayerHeight);
    float curlRadius = (0.018 * uClumping + 0.05 * uCurliness) * smoothEnv;
    vec2 strandCenter = (rand.xy - 0.5) * 0.16 + vec2(cos(curlAngle), sin(curlAngle)) * curlRadius;
    float distToAxis = length(cellLocal - strandCenter);

    float normH = clamp(vLayerHeight / max(0.15, fiberMaxH), 0.0, 1.0);
    float maxRadius = 0.76 * (1.0 - pow(normH, 1.55));
    if (distToAxis > maxRadius) {
      discard;
    }

    vec3 color = evaluatePhysicalHairShading(
      vRootPos,
      vWorldPos,
      vSurfNormal,
      vHairTangent,
      vLayerHeight,
      rand.x,
      vCombMemory
    );

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const STRAND_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aRootPos;
  attribute vec3 aRootNormal;
  attribute vec3 aGroomDir;
  attribute vec3 aClumpOffset;
  attribute float aStrandSeed;
  attribute float aMaskValue;

  uniform sampler2D uPhysicsTex;
  uniform float uFurLength;
  uniform float uFurDensity;
  uniform float uClumping;
  uniform float uCurliness;
  uniform float uTime;
  uniform float uWindStrength;
  uniform vec3 uPointerLocalPos;
  uniform float uPointerActive;
  uniform float uGpuFurMode;
  uniform vec3 uWebGLInertia;
  uniform float uBoopShockwave;

  varying float vHeight;
  varying float vRibbonU;
  varying float vStrandSeed;
  varying vec3 vRootPos;
  varying vec3 vWorldPos;
  varying vec3 vSurfNormal;
  varying vec3 vHairTangent;
  varying float vCombMemory;

  ${COMMON_CLEARANCE_GLSL}

  vec2 normalToSphericalUV(vec3 n) {
    vec3 d = normalize(n);
    float u = atan(d.x, d.z) / (2.0 * 3.14159265) + 0.5;
    float v = 1.0 - acos(clamp(d.y, -1.0, 1.0)) / 3.14159265;
    return vec2(u, v);
  }

  void main() {
    float h = position.y;
    vHeight = h;
    vRibbonU = position.x;
    vStrandSeed = aStrandSeed;
    vRootPos = aRootPos;

    if (aStrandSeed > uFurDensity || aMaskValue < 0.05) {
      gl_Position = vec4(2.0, 2.0, 2.0, 0.0);
      return;
    }

    vec3 N = normalize(aRootNormal);
    vec3 G = normalize(aGroomDir);
    vec3 sideVec = normalize(cross(N, G) + vec3(1e-4, 0.0, 0.0));

    vec3 gpuDisp = vec3(0.0);
    vCombMemory = 0.0;
    if (uGpuFurMode > 0.5) {
      vec2 simUV = normalToSphericalUV(N);
      vec4 gpgpuData = texture2D(uPhysicsTex, simUV);
      gpuDisp = gpgpuData.xyz;
      vCombMemory = gpgpuData.w;
    } else {
      gpuDisp = uWebGLInertia - N * min(0.0, dot(uWebGLInertia, N));
      if (uBoopShockwave > 0.01) {
        float waveFront = (1.0 - uBoopShockwave) * 2.2;
        float dFront = abs(distance(N, vec3(0.0, 0.0, 0.98)) - waveFront);
        if (dFront < 0.38) {
          float ripple = (1.0 - dFront / 0.38) * uBoopShockwave;
          vec3 radial = normalize(N - vec3(0.0, 0.0, 0.98) + vec3(0.0, 1e-4, 0.0));
          gpuDisp += radial * ripple * 0.42;
        }
      }
      if (uPointerActive > 0.5) {
        float pDist = distance(aRootPos, uPointerLocalPos);
        if (pDist < 0.45) {
          vCombMemory = (1.0 - pDist / 0.45) * 0.65;
        }
      }
    }

    float bellyLenScale = computeBellyLengthScale(aRootPos);
    float lenVariation = 0.90 + 0.20 * fract(aStrandSeed * 17.31);
    float totalLen = uFurLength * aMaskValue * bellyLenScale * lenVariation;

    float bend = pow(h, 1.25);
    float smoothEnv = h * h * (3.0 - 2.0 * h);

    vec3 windWave = vec3(
      sin(aRootPos.y * 4.6 + uTime * 2.1 + aStrandSeed * 3.14) * 0.028,
      cos(aRootPos.x * 4.0 + uTime * 1.8) * 0.016,
      cos(aRootPos.z * 4.2 - uTime * 2.0 + aStrandSeed * 3.14) * 0.028
    ) * uWindStrength;

    vec3 pointerPush = vec3(0.0);
    if (uPointerActive > 0.5) {
      float pDist = distance(aRootPos, uPointerLocalPos);
      if (pDist < 0.52) {
        vec3 away = normalize(aRootPos - uPointerLocalPos + vec3(0.0, 1e-4, 0.0));
        away -= N * dot(away, N);
        pointerPush = away * pow(1.0 - pDist / 0.52, 1.8) * 0.28;
      }
    }

    vec3 tuftAnchor = aRootPos + aClumpOffset;
    float coherentPhase = dot(tuftAnchor, vec3(7.2, 8.4, 6.8)) + (fract(aStrandSeed * 43.17) - 0.5) * 0.35;
    float curlFreq = mix(2.8, 5.8, uCurliness);
    float spiralAngle = h * curlFreq + coherentPhase;

    float curlAmp = uCurliness * totalLen * 0.12 * smoothEnv;
    vec3 curlOffset =
      sideVec * (sin(spiralAngle) - sin(coherentPhase)) * curlAmp +
      G * (cos(spiralAngle) - cos(coherentPhase)) * (curlAmp * 0.55);

    vec3 curlTangent =
      (sideVec * cos(spiralAngle) - G * sin(spiralAngle) * 0.55) * (curlAmp * curlFreq);

    vec3 clumpPull = aClumpOffset * (smoothEnv * uClumping * totalLen * 0.72);

    // Tangential plush nap alignment keeps strands lying softly along the body contour
    vec3 rawSpineLocal =
      aRootPos +
      N * (h * totalLen * 0.76) +
      G * (bend * totalLen * 0.44) +
      clumpPull +
      curlOffset +
      (gpuDisp * 0.26 + windWave + pointerPush) * bend * totalLen;

    vec3 spineLocal = applyAnatomicalClearance(rawSpineLocal, h);

    vec3 localTangent = normalize(
      N * (totalLen * 0.76) +
      G * (1.25 * pow(max(0.05, h), 0.30) * totalLen * 0.44) +
      clumpPull * 1.05 +
      curlTangent +
      (gpuDisp * 0.26 + windWave + pointerPush) * 1.25 * pow(max(0.05, h), 0.30)
    );

    vec3 worldSpine = (modelMatrix * vec4(spineLocal, 1.0)).xyz;
    vec3 worldTangent = normalize(mat3(modelMatrix) * localTangent);
    vSurfNormal = normalize(mat3(modelMatrix) * N);
    vHairTangent = worldTangent;

    vec3 viewDir = normalize(cameraPosition - worldSpine);
    vec3 billboardRight = normalize(cross(worldTangent, viewDir) + vec3(1e-5, 0.0, 0.0));

    float modelScale = length(modelMatrix[0].xyz);
    float modeWidthBoost = mix(1.22, 0.96, uGpuFurMode);
    float baseWidth = 0.0115 * modeWidthBoost * (0.85 + 0.25 * (1.0 - uFurDensity)) * modelScale;
    float width = baseWidth * (1.0 - pow(h, 1.35));

    vec3 finalWorld = worldSpine + billboardRight * (position.x * width);
    vWorldPos = finalWorld;

    gl_Position = projectionMatrix * viewMatrix * vec4(finalWorld, 1.0);
  }
`;

export const STRAND_FRAGMENT_SHADER = /* glsl */ `
  ${COMMON_HAIR_BSDF_GLSL}

  varying float vHeight;
  varying float vRibbonU;
  varying float vStrandSeed;
  varying vec3 vRootPos;
  varying vec3 vWorldPos;
  varying vec3 vSurfNormal;
  varying vec3 vHairTangent;
  varying float vCombMemory;

  void main() {
    vec3 color = evaluatePhysicalHairShading(
      vRootPos,
      vWorldPos,
      vSurfNormal,
      vHairTangent,
      vHeight,
      vStrandSeed,
      vCombMemory
    );

    float radialDist = abs(vRibbonU);
    float cylinderRoundness = sqrt(max(0.35, 1.0 - radialDist * radialDist * 0.65));
    color *= (0.94 + 0.08 * cylinderRoundness);

    gl_FragColor = vec4(color, 1.0);
  }
`;
