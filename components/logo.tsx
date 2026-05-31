function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4" y="4" width="120" height="120" rx="28" fill="#17202B" />
      <rect
        x="4.75"
        y="4.75"
        width="118.5"
        height="118.5"
        rx="27.25"
        stroke="#3A4656"
        strokeWidth="1.5"
      />

      <defs>
        <clipPath id="markClip">
          <rect x="12" y="12" width="104" height="104" rx="22" />
        </clipPath>
      </defs>

      <g clipPath="url(#markClip)" opacity="0.86">
        <path
          d="M-4 90C18 76 30 77 47 86C66 96 81 95 100 82C116 71 129 69 142 76"
          stroke="#596676"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.38"
        />
        <path
          d="M2 65C22 54 38 54 56 62C73 70 86 70 105 58C120 48 133 46 147 51"
          stroke="#596676"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.34"
        />
        <path
          d="M-8 42C11 35 27 36 47 44C65 51 80 51 98 41C115 31 128 31 142 36"
          stroke="#596676"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.28"
        />
        <path
          d="M33 -4L112 122"
          stroke="#596676"
          strokeWidth="1.8"
          opacity="0.18"
        />
        <path
          d="M62 -4L141 122"
          stroke="#596676"
          strokeWidth="1.8"
          opacity="0.14"
        />
        <path
          d="M-8 18L71 144"
          stroke="#596676"
          strokeWidth="1.8"
          opacity="0.14"
        />
      </g>

      <path
        d="M25 65C35.5 47.5 49.1 39 64 39C78.9 39 92.5 47.5 103 65C92.5 82.5 78.9 91 64 91C49.1 91 35.5 82.5 25 65Z"
        stroke="#89D8E6"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M39 65C46.1 55.3 54.2 50.6 64 50.6C73.8 50.6 81.9 55.3 89 65C81.9 74.7 73.8 79.4 64 79.4C54.2 79.4 46.1 74.7 39 65Z"
        fill="#17202B"
        stroke="#3A4656"
        strokeWidth="2"
      />
      <circle cx="64" cy="65" r="10" fill="#E2AA38" />
      <circle cx="68" cy="61" r="3" fill="#FFF5D8" opacity="0.9" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className="h-5.5 w-5.5" />
      <span className="text-foreground type-label">Plainsight</span>
    </span>
  );
}
