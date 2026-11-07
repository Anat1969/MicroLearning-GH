/** אייקוני קו מינימליסטיים: עובי קו אחד, פינות מעוגלות, צבע לפי currentColor. */
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export const IconToday = () => (
  <svg {...base}>
    <rect x="4" y="4" width="16" height="16" rx="5" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

export const IconVision = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

export const IconJournal = () => (
  <svg {...base}>
    <path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2z" />
    <path d="M6 16a2 2 0 0 1 2-2h10" />
  </svg>
);

export const IconAdd = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconListen = () => (
  <svg {...base}>
    <path d="M9 18V6l10-2v12" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="16" r="2.5" />
  </svg>
);

export const IconWrite = () => (
  <svg {...base}>
    <path d="M4 20l4-1 11-11-3-3L5 16z" />
    <path d="M14 6l3 3" />
  </svg>
);

export const IconSay = () => (
  <svg {...base}>
    <path d="M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-7l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
  </svg>
);
