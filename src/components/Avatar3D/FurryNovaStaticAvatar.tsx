import React from 'react';

export interface FurryNovaStaticAvatarProps {
  className?: string;
  size?: number;
  isListening?: boolean;
}

/**
 * High-fidelity static vector avatar of the light sage-green vertical ovoid plush Nova companion.
 * Matches the 3D procedural Nova (taller fuller vertical ellipsoid body with flattened bottom,
 * elongated left upright ear, arched-and-drooping right lop ear, distinct short rounded side arms,
 * larger/wider warm cream-oatmeal oval belly patch, soft peach-orange cheek blush, and dark-brown eyes).
 */
export function FurryNovaStaticAvatar({
  className = '',
  size = 128,
}: FurryNovaStaticAvatarProps) {
  return (
    <div
      className={`relative select-none pointer-events-none flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label="Nova Avatar"
    >
      <svg
        viewBox="0 0 180 180"
        className="w-full h-full drop-shadow-[0_8px_18px_rgba(125,138,114,0.20)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Light Low-Saturation Sage Green Coat Gradient */}
          <radialGradient id="sagePlushGrad" cx="46%" cy="34%" r="64%">
            <stop offset="0%" stopColor="#C4CCB9" />
            <stop offset="55%" stopColor="#ABB5A1" />
            <stop offset="100%" stopColor="#8D9883" />
          </radialGradient>

          {/* Warm Cream-Oatmeal Belly Patch Gradient */}
          <radialGradient id="creamBellyGrad" cx="50%" cy="42%" r="58%">
            <stop offset="0%" stopColor="#EFE9DC" />
            <stop offset="72%" stopColor="#E6DECEDE" />
            <stop offset="100%" stopColor="#D8CEBC" />
          </radialGradient>

          {/* Soft Warm Peach-Orange Cheek Blush Gradient */}
          <radialGradient id="peachBlushGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E8936B" stopOpacity="0.80" />
            <stop offset="55%" stopColor="#E59874" stopOpacity="0.40" />
            <stop offset="100%" stopColor="#ABB5A1" stopOpacity="0" />
          </radialGradient>

          {/* Dark Espresso-Brown Eye Gradient */}
          <radialGradient id="espressoEyeGrad" cx="38%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#3B241B" />
            <stop offset="65%" stopColor="#21120D" />
            <stop offset="100%" stopColor="#120906" />
          </radialGradient>
        </defs>

        {/* --- Screen-Left Upright Ear (Elongated, Rounded Tip, Subtle Pale Inner Hollow) --- */}
        <g transform="rotate(-8 62 42)">
          <rect x="49" y="8" width="24" height="50" rx="12" fill="url(#sagePlushGrad)" />
          <ellipse cx="61" cy="34" rx="6.5" ry="15" fill="#D4DCCB" opacity="0.76" />
        </g>

        {/* --- Screen-Right Folded Lop Ear (Arches Upward & Droops Outward/Downward Outside Head) --- */}
        <path
          d="M 103 42 C 108 26 128 24 142 36 C 153 46 154 64 143 69 C 133 73 125 60 119 49 C 115 43 109 44 105 48 Z"
          fill="url(#sagePlushGrad)"
        />

        {/* --- Clearly Recognizable Short Rounded Plush Arms on Middle-Lower Sides --- */}
        <ellipse
          cx="33"
          cy="113"
          rx="12.5"
          ry="19"
          transform="rotate(26 33 113)"
          fill="url(#sagePlushGrad)"
        />
        <ellipse
          cx="147"
          cy="113"
          rx="12.5"
          ry="19"
          transform="rotate(-26 147 113)"
          fill="url(#sagePlushGrad)"
        />

        {/* --- Fuller Vertical Ellipsoid Plush Body (Rounded Top, Gently Flattened Bottom) --- */}
        <path
          d="M 90 33 C 124 33 144 66 144 112 C 144 147 124 162 90 162 C 56 162 36 147 36 112 C 36 66 56 33 90 33 Z"
          fill="url(#sagePlushGrad)"
        />

        {/* --- Larger, Wider Warm Cream-White Vertical Oval Belly Patch on Lower Front --- */}
        <ellipse
          cx="90"
          cy="121"
          rx="38"
          ry="34"
          fill="url(#creamBellyGrad)"
        />

        {/* --- Soft Warm Peach-Orange Gradient Cheek Blush Below Outer Eyes --- */}
        <ellipse cx="57" cy="83" rx="13.5" ry="8.5" fill="url(#peachBlushGrad)" />
        <ellipse cx="123" cy="83" rx="13.5" ry="8.5" fill="url(#peachBlushGrad)" />

        {/* --- Two Small Dark Espresso-Brown Round Eyes with Restrained Highlights --- */}
        {/* Left Eye */}
        <g>
          <circle cx="70.5" cy="74" r="5.6" fill="url(#espressoEyeGrad)" />
          <circle cx="68.8" cy="72.2" r="1.7" fill="#FFFDF9" opacity="0.92" />
          <circle cx="72.1" cy="75.8" r="0.75" fill="#F5E6DC" opacity="0.65" />
        </g>

        {/* Right Eye */}
        <g>
          <circle cx="109.5" cy="74" r="5.6" fill="url(#espressoEyeGrad)" />
          <circle cx="107.8" cy="72.2" r="1.7" fill="#FFFDF9" opacity="0.92" />
          <circle cx="111.1" cy="75.8" r="0.75" fill="#F5E6DC" opacity="0.65" />
        </g>
      </svg>
    </div>
  );
}
