import type { ColorPalette, Theme, CanvasElement, ThemeId } from '@/types';

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  h = (h % 360 + 360) % 360 / 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  if (s === 0) {
    const v = Math.round(l * 255).toString(16).padStart(2, '0');
    return `#${v}${v}${v}`;
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1/3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1/3);

  return `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
}

function adjustLightness(hex: string, amount: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, Math.min(100, l + amount)));
}

function adjustSaturation(hex: string, amount: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, Math.max(0, Math.min(100, s + amount)), l);
}

function rotateHue(hex: string, degrees: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h + degrees, s, l);
}

export function generateColorPalette(primaryColor: string): ColorPalette {
  const hex = primaryColor.startsWith('#') ? primaryColor : `#${primaryColor}`;
  const [h, s, l] = hexToHsl(hex);

  const secondary = l > 60
    ? adjustLightness(hex, -20)
    : adjustLightness(hex, 25);

  const accent = l > 70
    ? adjustLightness(adjustSaturation(hex, 15), -10)
    : adjustLightness(adjustSaturation(hex, 20), 15);

  const complementary = rotateHue(hex, 180);
  const analogous1 = rotateHue(hex, -30);
  const analogous2 = rotateHue(hex, 30);
  const triadic1 = rotateHue(hex, 120);
  const triadic2 = rotateHue(hex, 240);

  const neutralLight = l > 50 ? '#FAF9F7' : '#2A2A2A';
  const neutralDark = l > 50 ? '#3D3D3D' : '#E8E8E8';

  return {
    primary: hex,
    secondary,
    accent,
    complementary,
    analogous1,
    analogous2,
    triadic1,
    triadic2,
    neutralLight,
    neutralDark,
  };
}

export function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#333333' : '#FFFFFF';
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getThemeColorMap(theme: Theme): Map<string, string[]> {
  const colorMap = new Map<string, string[]>();
  const addMapping = (colorName: string, colors: string[]) => {
    colors.forEach(c => {
      const normalized = c.toLowerCase();
      if (!colorMap.has(normalized)) {
        colorMap.set(normalized, []);
      }
      if (!colorMap.get(normalized)!.includes(colorName)) {
        colorMap.get(normalized)!.push(colorName);
      }
    });
  };

  addMapping('primaryColor', [theme.primaryColor]);
  addMapping('secondaryColor', [theme.secondaryColor]);
  addMapping('accentColor', [theme.accentColor]);
  addMapping('backgroundColor', [theme.backgroundColor]);
  addMapping('textColor', [theme.textColor]);
  addMapping('decorativeColors', theme.decorativeColors);

  return colorMap;
}

export function findClosestThemeColor(
  color: string,
  oldThemeColorMap: Map<string, string[]>
): string | null {
  if (!color) return null;
  const normalized = color.toLowerCase();

  if (oldThemeColorMap.has(normalized)) {
    return oldThemeColorMap.get(normalized)![0];
  }

  let closestCategory: string | null = null;
  let minDistance = Infinity;

  oldThemeColorMap.forEach((categories, themeColor) => {
    const dist = colorDistance(normalized, themeColor);
    if (dist < minDistance && dist < 50) {
      minDistance = dist;
      closestCategory = categories[0];
    }
  });

  return closestCategory;
}

function colorDistance(hex1: string, hex2: string): number {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export function getColorFromNewTheme(category: string, newTheme: Theme): string | null {
  switch (category) {
    case 'primaryColor':
      return newTheme.primaryColor;
    case 'secondaryColor':
      return newTheme.secondaryColor;
    case 'accentColor':
      return newTheme.accentColor;
    case 'backgroundColor':
      return newTheme.backgroundColor;
    case 'textColor':
      return newTheme.textColor;
    case 'decorativeColors':
      return newTheme.decorativeColors[0];
    default:
      return null;
  }
}

export function getDecorativeColorMapping(
  oldColor: string,
  oldDecorativeColors: string[],
  newDecorativeColors: string[]
): string | null {
  const normalized = oldColor.toLowerCase();
  const idx = oldDecorativeColors.findIndex(c => c.toLowerCase() === normalized);
  if (idx !== -1 && idx < newDecorativeColors.length) {
    return newDecorativeColors[idx];
  }

  let closestIdx = -1;
  let minDist = Infinity;
  oldDecorativeColors.forEach((c, i) => {
    const dist = colorDistance(normalized, c.toLowerCase());
    if (dist < minDist) {
      minDist = dist;
      closestIdx = i;
    }
  });

  if (closestIdx !== -1 && minDist < 50 && closestIdx < newDecorativeColors.length) {
    return newDecorativeColors[closestIdx];
  }

  return null;
}

export interface ThemeColorSnapshot {
  elements: CanvasElement[];
  themeId: ThemeId;
  canvasBackground: string;
}

export function adaptElementColorsToNewTheme(
  element: CanvasElement,
  oldTheme: Theme,
  newTheme: Theme
): CanvasElement {
  const newElement = { ...element };
  const manuallyModified = new Set(element.manuallyModifiedColors || []);
  const oldColorMap = getThemeColorMap(oldTheme);

  const colorFields: ('backgroundColor' | 'textColor' | 'borderColor')[] = [
    'backgroundColor',
    'textColor',
    'borderColor',
  ];

  colorFields.forEach(field => {
    if (manuallyModified.has(field)) return;
    const oldColor = element[field];
    if (!oldColor) return;

    const category = findClosestThemeColor(oldColor, oldColorMap);
    if (category) {
      if (category === 'decorativeColors') {
        const mappedColor = getDecorativeColorMapping(
          oldColor,
          oldTheme.decorativeColors,
          newTheme.decorativeColors
        );
        if (mappedColor) {
          (newElement as any)[field] = mappedColor;
        }
      } else {
        const mappedColor = getColorFromNewTheme(category, newTheme);
        if (mappedColor) {
          (newElement as any)[field] = mappedColor;
        }
      }
    }
  });

  return newElement;
}
