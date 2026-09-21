import { useState, useEffect } from 'react';

/**
 * Helper to get Euclidean distance between two RGB colors
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
  h = ((h % 360) + 360) % 360;
  h /= 360;
  let r: number, g: number, b: number;

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

/**
 * Amplifies any color to a vibrant, glowing neon tone while preserving its true hue.
 */
function amplifyToNeon(r: number, g: number, b: number): [number, number, number] {
  let [h, s, l] = rgbToHsl(r, g, b);
  // Guarantee high saturation for glowing, electric visualizer graphics
  s = Math.max(s, 0.85);
  // Lightness sweet spot: luminous, radiant, and clear on dark backdrops
  if (l < 0.48) l = 0.56;
  if (l > 0.68) l = 0.62;
  return hslToRgb(h, s, l);
}

/**
 * Extracts dominant colors from raw image pixel data.
 * Rules:
 * 1. If any chromatic color shades exist in the art, extracts and amplifies those exact hues.
 * 2. If single-color artwork, generates a harmonious analogous hue (+35 deg) without polluting with purple.
 * 3. If strictly monochrome (only black, grey, white), uses opposite-lightness color:
 *    - Dark / black art -> Radiant diamond platinum/white
 *    - Light / white art -> Deep obsidian charcoal
 */
function extractColorsFromImageData(imageData: ImageData): [string, string] {
  const data = imageData.data;
  let totalL = 0;
  let validPixels = 0;

  // Track chromatic pixels and group them into 18 hue sectors (20 deg each)
  const chromaticBins: Record<number, { r: number; g: number; b: number; count: number }> = {};

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 128) continue; // Skip transparent

    const [h, s, l] = rgbToHsl(r, g, b);
    totalL += l;
    validPixels++;

    // Chromatic pixel: has visible saturation (>= 0.08) and is not absolute black or blinding white
    if (s >= 0.08 && l >= 0.04 && l <= 0.96) {
      const hBin = Math.floor(h / 20) * 20;
      if (!chromaticBins[hBin]) {
        chromaticBins[hBin] = { r: 0, g: 0, b: 0, count: 0 };
      }
      chromaticBins[hBin].r += r;
      chromaticBins[hBin].g += g;
      chromaticBins[hBin].b += b;
      chromaticBins[hBin].count++;
    }
  }

  const avgLightness = validPixels > 0 ? totalL / validPixels : 0.5;
  const sortedBins = Object.values(chromaticBins).sort((a, b) => b.count - a.count);

  if (sortedBins.length > 0) {
    // ── Case 1: Chromatic colors found ──────────────────────────────────────
    const primaryBin = sortedBins[0];
    const pR = Math.floor(primaryBin.r / primaryBin.count);
    const pG = Math.floor(primaryBin.g / primaryBin.count);
    const pB = Math.floor(primaryBin.b / primaryBin.count);

    // Look for a distinct secondary hue from the artwork
    let accentBin = sortedBins.find(bin => {
      const bR = Math.floor(bin.r / bin.count);
      const bG = Math.floor(bin.g / bin.count);
      const bB = Math.floor(bin.b / bin.count);
      return colorDistance(pR, pG, pB, bR, bG, bB) > 60;
    });

    let aR: number, aG: number, aB: number;

    if (accentBin) {
      aR = Math.floor(accentBin.r / accentBin.count);
      aG = Math.floor(accentBin.g / accentBin.count);
      aB = Math.floor(accentBin.b / accentBin.count);
    } else {
      // Single-hue artwork (e.g. yellow & black, or monochrome red):
      // Generate harmonious analogous accent (+35 deg hue shift), staying in natural color family
      const [pH, pS, pL] = rgbToHsl(pR, pG, pB);
      const [nAR, nAG, nAB] = hslToRgb((pH + 35) % 360, pS, pL);
      aR = nAR;
      aG = nAG;
      aB = nAB;
    }

    const [neonPR, neonPG, neonPB] = amplifyToNeon(pR, pG, pB);
    const [neonAR, neonAG, neonAB] = amplifyToNeon(aR, aG, aB);

    return [`rgb(${neonPR}, ${neonPG}, ${neonPB})`, `rgb(${neonAR}, ${neonAG}, ${neonAB})`];
  }

  // ── Case 2: Pure Monochrome Artwork (Black, Grey, White) ────────────────
  // Apply opposite lightness:
  if (avgLightness < 0.5) {
    // Dark cover -> Radiant luminous platinum/white glow
    return ['rgb(245, 248, 255)', 'rgb(205, 225, 255)'];
  } else {
    // Light cover -> Deep sleek obsidian/charcoal glow
    return ['rgb(30, 32, 45)', 'rgb(65, 75, 95)'];
  }
}

/**
 * Hook to extract dominant colors from an image URL using an offscreen canvas.
 * Falls back seamlessly to the backend image proxy if direct CORS is restricted.
 */
export function useCoverColors(imageUrl?: string | null): [string, string] | null {
  const [colors, setColors] = useState<[string, string] | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setColors(null);
      return;
    }

    let isMounted = true;

    const tryExtract = (url: string, isProxyRetry = false) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        if (!isMounted) return;
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;

          const size = 64;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);

          const imageData = ctx.getImageData(0, 0, size, size);
          const extracted = extractColorsFromImageData(imageData);
          setColors(extracted);
        } catch (err) {
          if (!isProxyRetry) {
            // Taint or CORS blocked -> Retry via backend image proxy
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const proxyUrl = `${apiUrl}/music/proxy/image?url=${encodeURIComponent(imageUrl)}`;
            tryExtract(proxyUrl, true);
          } else {
            console.warn('Cover color extraction blocked or failed:', err);
          }
        }
      };

      img.onerror = () => {
        if (!isMounted) return;
        if (!isProxyRetry) {
          // Direct load error -> Retry via backend image proxy
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const proxyUrl = `${apiUrl}/music/proxy/image?url=${encodeURIComponent(imageUrl)}`;
          tryExtract(proxyUrl, true);
        } else {
          console.warn('Cover image load failed:', url);
        }
      };

      img.src = url;
    };

    tryExtract(imageUrl);

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  return colors;
}
