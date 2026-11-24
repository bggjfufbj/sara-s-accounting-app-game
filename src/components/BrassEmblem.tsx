import type { TeamMeta } from '../game/types';

export function TeamCrestIcon({
  crest,
  color = '#D4A243',
  size = 24,
}: {
  crest: TeamMeta['crest'];
  color?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="10.5" fill="#121814" stroke={color} strokeWidth="1.5" />
      {crest === 'gold' && (
        <>
          <path
            d="M5.8 16L7.7 10.4H16.3L18.2 16H5.8Z"
            fill={color}
            fillOpacity="0.32"
            stroke={color}
            strokeWidth="1.45"
            strokeLinejoin="round"
          />
          <path d="M8.7 12.6H15.3" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
          <path
            d="M15.4 5.2L15.9 6.8L17.5 7.3L15.9 7.8L15.4 9.4L14.9 7.8L13.3 7.3L14.9 6.8L15.4 5.2Z"
            fill={color}
          />
        </>
      )}
      {crest === 'star' && (
        <path
          d="M12 5.4L13.95 9.35L18.3 9.98L15.15 13.05L15.9 17.38L12 15.33L8.1 17.38L8.85 13.05L5.7 9.98L10.05 9.35L12 5.4Z"
          fill={color}
          fillOpacity="0.34"
          stroke={color}
          strokeWidth="1.45"
          strokeLinejoin="round"
        />
      )}
      {crest === 'moon' && (
        <>
          <path
            d="M15.1 6.3A5.8 5.8 0 1 0 17.7 15.5A4.6 4.6 0 1 1 15.1 6.3Z"
            fill={color}
            fillOpacity="0.35"
            stroke={color}
            strokeWidth="1.45"
            strokeLinejoin="round"
          />
          <circle cx="15.8" cy="10.2" r="1.15" fill={color} />
        </>
      )}
      {crest === 'sun' && (
        <>
          <circle cx="12" cy="12" r="3.4" fill={color} fillOpacity="0.36" stroke={color} strokeWidth="1.45" />
          <path
            d="M12 5.2V6.8M12 17.2V18.8M5.2 12H6.8M17.2 12H18.8M7.2 7.2L8.35 8.35M15.65 15.65L16.8 16.8M16.8 7.2L15.65 8.35M8.35 15.65L7.2 16.8"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )}
      {crest === 'falcon' && (
        <>
          <path
            d="M4.8 9.2C7.4 9.1 9.4 10.5 10.6 12L12 8.2L13.4 12C14.6 10.5 16.6 9.1 19.2 9.2C17.8 12.2 15.9 14.1 13.5 14.8L12 18.2L10.5 14.8C8.1 14.1 6.2 12.2 4.8 9.2Z"
            fill={color}
            fillOpacity="0.34"
            stroke={color}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M12 6.1L13.1 8.3H10.9L12 6.1Z" fill={color} />
        </>
      )}
      {crest === 'silver' && (
        <>
          <path
            d="M12 5.6L17.6 10.1L12 18.4L6.4 10.1L12 5.6Z"
            fill={color}
            fillOpacity="0.28"
            stroke={color}
            strokeWidth="1.45"
            strokeLinejoin="round"
          />
          <path
            d="M6.7 10.1H17.3M9.7 10.1L12 18.1L14.3 10.1M9.7 10.1L12 5.9L14.3 10.1"
            stroke={color}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}

export function TitleLockupEmblem({ compact = false }: { compact?: boolean }) {
  return (
    <div className="w-full flex flex-col items-start">
      <svg
        viewBox="0 0 420 118"
        direction="rtl"
        className={compact ? 'w-[220px] sm:w-[260px] h-auto' : 'w-full max-w-[420px] h-auto'}
        role="img"
        aria-label="تەرازووی ژمێرییار"
      >
        <defs>
          <linearGradient id="brassStroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2D28B" />
            <stop offset="50%" stopColor="#D4A243" />
            <stop offset="100%" stopColor="#9A6E22" />
          </linearGradient>
        </defs>
        {/* Subtle brass ledger rule & balance crest */}
        <path
          d="M16 18 H346 M364 18 H406"
          stroke="url(#brassStroke)"
          strokeWidth="1.5"
          strokeOpacity="0.65"
        />
        <g transform="translate(355, 18)">
          <circle r="7" fill="#0C3325" stroke="url(#brassStroke)" strokeWidth="1.5" />
          <path d="M-3.5 0 H3.5 M0 -3.5 V3.5" stroke="#F2D28B" strokeWidth="1.2" />
        </g>

        {/* Bespoke calligraphic display title — in RTL SVG, textAnchor="start" anchors right edge at x=406 */}
        <text
          x="406"
          y="78"
          textAnchor="start"
          direction="rtl"
          unicodeBidi="plaintext"
          fill="#FAF4E6"
          stroke="#0A241A"
          strokeWidth="6"
          style={{
            fontFamily: "'Amiri', 'Vazirmatn', serif",
            fontSize: '52px',
            fontWeight: 700,
            paintOrder: 'stroke fill',
          }}
        >
          تەرازووی ژمێرییار
        </text>

        {/* Bottom double accounting rule (classic trial balance double underline) */}
        <line x1="76" y1="100" x2="406" y2="100" stroke="url(#brassStroke)" strokeWidth="2.2" />
        <line x1="126" y1="107" x2="406" y2="107" stroke="url(#brassStroke)" strokeWidth="1.2" strokeOpacity="0.72" />
      </svg>
    </div>
  );
}

/**
 * Interactive antique brass balance scale centerpiece.
 * tiltDeg ranges from -16 (tilted left/credit) to +16 (tilted right/debit).
 */
export function BrassScaleCenterpiece({
  tiltDeg = 0,
  rightLabel = 'مدين',
  leftLabel = 'دائن',
  compact = false,
}: {
  tiltDeg?: number;
  rightLabel?: string;
  leftLabel?: string;
  compact?: boolean;
}) {
  const clampedTilt = Math.max(-18, Math.min(18, tiltDeg));
  const rad = (clampedTilt * Math.PI) / 180;
  const armHalf = 104;
  const cx = 180;
  const cy = 74;

  const leftX = cx - armHalf * Math.cos(rad);
  const leftY = cy - armHalf * Math.sin(rad);
  const rightX = cx + armHalf * Math.cos(rad);
  const rightY = cy + armHalf * Math.sin(rad);

  return (
    <svg
      viewBox="0 0 360 264"
      className={compact ? 'w-full max-w-[300px] h-auto select-none' : 'w-full max-w-[440px] h-auto select-none'}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="brassMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5DC9B" />
          <stop offset="48%" stopColor="#CFA044" />
          <stop offset="100%" stopColor="#7C5618" />
        </linearGradient>
        <linearGradient id="brassDish" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#94681E" />
          <stop offset="50%" stopColor="#F2D48A" />
          <stop offset="100%" stopColor="#8A5F1A" />
        </linearGradient>
        <radialGradient id="scaleHalo" cx="50%" cy="46%" r="48%">
          <stop offset="0%" stopColor="#D4A243" stopOpacity="0.22" />
          <stop offset="70%" stopColor="#D4A243" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#D4A243" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Soft ambient brass glow on the felt table */}
      <circle cx="180" cy="126" r="118" fill="url(#scaleHalo)" />

      {/* Ledger drafting circles */}
      <circle cx="180" cy="126" r="106" fill="none" stroke="#D4A243" strokeOpacity="0.16" strokeDasharray="3 6" />
      <circle cx="180" cy="126" r="82" fill="none" stroke="#D4A243" strokeOpacity="0.12" />

      {/* Mahogany & Brass Pedestal Base */}
      <ellipse cx="180" cy="236" rx="72" ry="12" fill="#1C120B" fillOpacity="0.65" />
      <path d="M126 232 C126 218, 234 218, 234 232 Z" fill="url(#brassMetal)" stroke="#4C330D" strokeWidth="1.5" />
      <rect x="148" y="210" width="64" height="11" rx="4" fill="url(#brassMetal)" stroke="#4C330D" strokeWidth="1.2" />

      {/* Central Brass Pillar */}
      <path d="M173 74 L169 212 H191 L187 74 Z" fill="url(#brassMetal)" stroke="#4C330D" strokeWidth="1.3" />
      <circle cx="180" cy="50" r="10" fill="url(#brassMetal)" stroke="#4C330D" strokeWidth="1.5" />
      <path d="M180 30 L186 42 H174 Z" fill="#F4D891" />

      {/* Balance Beam */}
      <g
        style={{
          transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
          transformOrigin: `${cx}px ${cy}px`,
          transform: `rotate(${clampedTilt}deg)`,
        }}
      >
        <path
          d={`M${cx - armHalf - 6} ${cy} Q${cx} ${cy - 14} ${cx + armHalf + 6} ${cy} Q${cx} ${cy + 7} ${cx - armHalf - 6} ${cy} Z`}
          fill="url(#brassMetal)"
          stroke="#4C330D"
          strokeWidth="1.4"
        />
        <circle cx={cx} cy={cy} r="9" fill="#193C2D" stroke="#F4D891" strokeWidth="2.2" />
        <circle cx={cx} cy={cy} r="3.2" fill="#F4D891" />
      </g>

      {/* Left Pan (Credit / Liabilities+Equity) */}
      <g style={{ transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <line x1={leftX} y1={leftY} x2={leftX - 28} y2={leftY + 58} stroke="#E3BC68" strokeWidth="1.4" />
        <line x1={leftX} y1={leftY} x2={leftX + 28} y2={leftY + 58} stroke="#E3BC68" strokeWidth="1.4" />
        <line x1={leftX} y1={leftY} x2={leftX} y2={leftY + 58} stroke="#E3BC68" strokeWidth="1" strokeOpacity="0.65" />
        <path
          d={`M${leftX - 36} ${leftY + 58} Q${leftX} ${leftY + 80} ${leftX + 36} ${leftY + 58} Z`}
          fill="url(#brassDish)"
          stroke="#4C330D"
          strokeWidth="1.4"
        />
        <text
          x={leftX}
          y={leftY + 95}
          textAnchor="middle"
          fill="#F8E7B9"
          stroke="#0A241A"
          strokeWidth="3.5"
          style={{
            fontFamily: "'Vazirmatn', sans-serif",
            fontSize: '12px',
            fontWeight: 700,
            paintOrder: 'stroke fill',
          }}
        >
          {leftLabel}
        </text>
      </g>

      {/* Right Pan (Debit / Assets) */}
      <g style={{ transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <line x1={rightX} y1={rightY} x2={rightX - 28} y2={rightY + 58} stroke="#E3BC68" strokeWidth="1.4" />
        <line x1={rightX} y1={rightY} x2={rightX + 28} y2={rightY + 58} stroke="#E3BC68" strokeWidth="1.4" />
        <line x1={rightX} y1={rightY} x2={rightX} y2={rightY + 58} stroke="#E3BC68" strokeWidth="1" strokeOpacity="0.65" />
        <path
          d={`M${rightX - 36} ${rightY + 58} Q${rightX} ${rightY + 80} ${rightX + 36} ${rightY + 58} Z`}
          fill="url(#brassDish)"
          stroke="#4C330D"
          strokeWidth="1.4"
        />
        <text
          x={rightX}
          y={rightY + 95}
          textAnchor="middle"
          fill="#F8E7B9"
          stroke="#0A241A"
          strokeWidth="3.5"
          style={{
            fontFamily: "'Vazirmatn', sans-serif",
            fontSize: '12px',
            fontWeight: 700,
            paintOrder: 'stroke fill',
          }}
        >
          {rightLabel}
        </text>
      </g>
    </svg>
  );
}
