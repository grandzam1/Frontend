/** Approximate map positions for a 1000×500 equirectangular world map. */
export const COUNTRY_MAP_POINTS: Record<string, { x: number; y: number; name: string }> = {
  US: { x: 220, y: 200, name: 'United States' },
  CA: { x: 210, y: 140, name: 'Canada' },
  MX: { x: 200, y: 250, name: 'Mexico' },
  BR: { x: 340, y: 340, name: 'Brazil' },
  AR: { x: 320, y: 400, name: 'Argentina' },
  GB: { x: 480, y: 150, name: 'United Kingdom' },
  IE: { x: 460, y: 145, name: 'Ireland' },
  FR: { x: 495, y: 175, name: 'France' },
  DE: { x: 515, y: 155, name: 'Germany' },
  ES: { x: 475, y: 195, name: 'Spain' },
  IT: { x: 525, y: 190, name: 'Italy' },
  NL: { x: 505, y: 145, name: 'Netherlands' },
  SE: { x: 530, y: 110, name: 'Sweden' },
  NO: { x: 515, y: 100, name: 'Norway' },
  PL: { x: 540, y: 150, name: 'Poland' },
  RU: { x: 680, y: 120, name: 'Russia' },
  TR: { x: 580, y: 195, name: 'Turkey' },
  NG: { x: 510, y: 290, name: 'Nigeria' },
  GH: { x: 485, y: 285, name: 'Ghana' },
  ZA: { x: 555, y: 390, name: 'South Africa' },
  EG: { x: 565, y: 230, name: 'Egypt' },
  KE: { x: 585, y: 310, name: 'Kenya' },
  IN: { x: 700, y: 250, name: 'India' },
  CN: { x: 780, y: 200, name: 'China' },
  JP: { x: 860, y: 195, name: 'Japan' },
  KR: { x: 840, y: 200, name: 'South Korea' },
  AU: { x: 860, y: 380, name: 'Australia' },
  NZ: { x: 940, y: 420, name: 'New Zealand' },
  SG: { x: 780, y: 310, name: 'Singapore' },
  AE: { x: 620, y: 240, name: 'United Arab Emirates' },
  SA: { x: 600, y: 245, name: 'Saudi Arabia' },
  IL: { x: 575, y: 215, name: 'Israel' },
  PK: { x: 680, y: 230, name: 'Pakistan' },
  BD: { x: 730, y: 250, name: 'Bangladesh' },
  PH: { x: 830, y: 290, name: 'Philippines' },
  ID: { x: 810, y: 330, name: 'Indonesia' },
  TH: { x: 770, y: 275, name: 'Thailand' },
  VN: { x: 790, y: 270, name: 'Vietnam' },
  MY: { x: 785, y: 310, name: 'Malaysia' },
  CO: { x: 290, y: 300, name: 'Colombia' },
  CL: { x: 300, y: 390, name: 'Chile' },
  PE: { x: 285, y: 340, name: 'Peru' },
  PT: { x: 460, y: 195, name: 'Portugal' },
  CH: { x: 510, y: 170, name: 'Switzerland' },
  AT: { x: 525, y: 165, name: 'Austria' },
  BE: { x: 500, y: 150, name: 'Belgium' },
  DK: { x: 515, y: 130, name: 'Denmark' },
  FI: { x: 550, y: 100, name: 'Finland' },
  UA: { x: 560, y: 155, name: 'Ukraine' },
  RO: { x: 550, y: 175, name: 'Romania' },
  CZ: { x: 530, y: 155, name: 'Czechia' },
  HU: { x: 540, y: 170, name: 'Hungary' },
  GR: { x: 545, y: 200, name: 'Greece' },
};

export function countryFlag(code: string | null | undefined) {
  if (!code || code.length !== 2 || code === '??') {
    return '🌐';
  }
  const upper = code.toUpperCase();
  const a = upper.codePointAt(0);
  const b = upper.codePointAt(1);
  if (!a || !b) {
    return '🌐';
  }
  return String.fromCodePoint(127397 + a, 127397 + b);
}

export function countryLabel(code: string | null | undefined, name?: string | null) {
  if (name && name.trim() && name !== 'Unknown') {
    return name;
  }
  if (!code || code === '??') {
    return 'Unknown location';
  }
  return COUNTRY_MAP_POINTS[code.toUpperCase()]?.name ?? code.toUpperCase();
}
