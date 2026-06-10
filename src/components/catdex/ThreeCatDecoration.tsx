function CatHead({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      className={className}
      fill="none"
    >
      <path
        d="M17 27 12 12l14 9a25 25 0 0 1 12 0l14-9-5 15c3 4 5 9 5 15 0 11-9 18-20 18S12 53 12 42c0-6 2-11 5-15Z"
        fill="#fffdf2"
        stroke="#111111"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path d="M25 39h.1M39 39h.1" stroke="#111111" strokeLinecap="round" strokeWidth="5" />
      <path d="M30 46h4" stroke="#2f5fb3" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

export default function ThreeCatDecoration() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-4 top-6 flex items-end gap-1 opacity-45"
    >
      <CatHead className="h-8 w-8 rotate-[-9deg]" />
      <CatHead className="h-10 w-10 rotate-[5deg]" />
      <CatHead className="h-7 w-7 rotate-[12deg]" />
    </div>
  );
}
