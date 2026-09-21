import { useState, useEffect } from 'react';

/**
 * Helper to get the distance between two RGB colors
 */
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt(Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
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
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function amplifyToNeon(r: number, g: number, b: number): [number, number, number] {
  let [h, s, l] = rgbToHsl(r, g, b);
  // Neon Amplification: Force high saturation, clamp lightness into glowing "sweet spot"
  s = Math.max(s, 0.75); 
  if (l < 0.45) l = 0.55; 
  if (l > 0.7) l = 0.65;  
  return hslToRgb(h, s, l);
}

/**
 * Hook to extract dominant colors from an image URL using an offscreen canvas.
 * Returns [primaryColor, accentColor] in RGB format (e.g. 'rgb(255, 0, 0)').
 */
export function useCoverColors(imageUrl?: string | null): [string, string] | null {
  const [colors, setColors] = useState<[string, string] | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setColors(null);
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // Downscale for performance
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;
        const colorCounts: Record<string, { r: number; g: number; b: number; count: number }> = {};

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Ignore transparent pixels
          if (a < 128) continue;

          // Convert to HSL to filter out muddy/gray/black/white pixels
          const [, s, l] = rgbToHsl(r, g, b);
          if (s < 0.15 || l < 0.15 || l > 0.85) continue;

          // Group colors into bins to find dominant clusters
          const binSize = 15;
          const rBin = Math.floor(r / binSize) * binSize;
          const gBin = Math.floor(g / binSize) * binSize;
          const bBin = Math.floor(b / binSize) * binSize;
          const key = `${rBin},${gBin},${bBin}`;

          if (!colorCounts[key]) {
            colorCounts[key] = { r: 0, g: 0, b: 0, count: 0 };
          }
          colorCounts[key].r += r;
          colorCounts[key].g += g;
          colorCounts[key].b += b;
          colorCounts[key].count += 1;
        }

        const sortedColors = Object.values(colorCounts).sort((a, b) => b.count - a.count);

        if (sortedColors.length === 0) {
          // Grayscale fallback: Icy Cyan & Electric Violet
          setColors(['rgb(6, 182, 212)', 'rgb(139, 92, 246)']);
          return;
        }

        // Calculate exact average of the most dominant bin
        const primary = sortedColors[0];
        const pR = Math.floor(primary.r / primary.count);
        const pG = Math.floor(primary.g / primary.count);
        const pB = Math.floor(primary.b / primary.count);

        // Find an accent color that is sufficiently different
        let accent = sortedColors.find(c => {
          const cR = Math.floor(c.r / c.count);
          const cG = Math.floor(c.g / c.count);
          const cB = Math.floor(c.b / c.count);
          return colorDistance(pR, pG, pB, cR, cG, cB) > 80;
        });

        let aR = pR, aG = pG, aB = pB;

        if (accent) {
          aR = Math.floor(accent.r / accent.count);
          aG = Math.floor(accent.g / accent.count);
          aB = Math.floor(accent.b / accent.count);
        } else {
          // If no distinct accent found, generate an analogous variation
          aR = Math.min(255, pR + 40);
          aG = Math.max(0, pG - 20);
          aB = Math.min(255, pB + 40);
        }

        const [neonPR, neonPG, neonPB] = amplifyToNeon(pR, pG, pB);
        const [neonAR, neonAG, neonAB] = amplifyToNeon(aR, aG, aB);

        setColors([`rgb(${neonPR}, ${neonPG}, ${neonPB})`, `rgb(${neonAR}, ${neonAG}, ${neonAB})`]);
      } catch (err) {
        // CORS or Canvas taint error
        console.warn('Cover color extraction blocked by CORS or failed:', err);
        setColors(null);
      }
    };

    img.onerror = () => {
      if (!isMounted) return;
      setColors(null);
    };

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  return colors;
}
