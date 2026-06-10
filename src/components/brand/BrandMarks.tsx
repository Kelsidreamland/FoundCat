interface BrandMarkProps {
  className?: string;
}

export function PostcardCatBrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      role="img"
      aria-label="轉角遇到貓 FOUND CAT Logo"
      viewBox="0 0 311 276"
      preserveAspectRatio="xMidYMid meet"
      className={`${className ?? ''} overflow-visible text-[#18346c] drop-shadow-[2px_4px_0_rgba(47,95,179,0.12)]`}
    >
      <defs>
        <clipPath id="moodboard-l1-signpost-clip">
          <rect x="0" y="0" width="311" height="224" />
        </clipPath>
      </defs>
      <image
        href="/brand/moodboard-l1-logo-transparent.png"
        width="311"
        height="276"
        clipPath="url(#moodboard-l1-signpost-clip)"
        aria-hidden="true"
      />
      <text
        x="155.5"
        y="255"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="Baskerville, 'Times New Roman', Times, serif"
        fontSize="25"
        fontWeight="600"
        letterSpacing="7"
      >
        FOUND CAT
      </text>
    </svg>
  );
}

export function MapTreasureBrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      role="img"
      aria-label="AI Moodboard V1 L4 貓咪地圖圖標"
      viewBox="0 0 222 267"
      preserveAspectRatio="xMidYMid meet"
      className={`${className ?? ''} overflow-visible text-[#18346c] drop-shadow-[2px_4px_0_rgba(47,95,179,0.12)]`}
    >
      <defs>
        <clipPath id="moodboard-l4-map-clip">
          <rect x="0" y="0" width="222" height="244" />
        </clipPath>
      </defs>
      <image
        href="/brand/moodboard-l4-map-transparent.png"
        width="222"
        height="267"
        clipPath="url(#moodboard-l4-map-clip)"
        aria-hidden="true"
      />
      <text
        x="111"
        y="262"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="Baskerville, 'Times New Roman', Times, serif"
        fontSize="13"
        fontWeight="600"
        letterSpacing="2.6"
      >
        FOUND CAT
      </text>
    </svg>
  );
}
