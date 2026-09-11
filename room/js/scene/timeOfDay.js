/**
 * The room is lit for the hour the app is opened.
 *
 * Every preset carries the whole look — sky, sun, fog, exposure and how much
 * the indoor lamps still matter — so adding a slot means adding one entry here.
 * The `id` is also stamped on <body> so the CSS can swap the backdrop, the
 * glass tint and the logo colours to match.
 */
export const TIME_PRESETS = {
  dawn: {
    id: 'dawn',
    ambient: { color: 0x7a6684, intensity: 0.85 },
    hemi: { sky: 0xffc4a2, ground: 0x4a3a58, intensity: 0.95 },
    sun: { color: 0xffb178, intensity: 1.35, position: [-11, 9, 7] },
    fog: { color: 0x4a3550, near: 34, far: 115 },
    exposure: 1.12,
    /** Lamps and screens are still on, but the sky is taking over. */
    indoorLights: 0.72,
    window: { color: 0xffd3ab, emissive: 0.75 },
    grade: { tint: 0xffc9a8, amount: 0.1, saturation: 1.0, lightness: 1.08 },
    themeColor: '#2b1c42'
  },
  day: {
    id: 'day',
    ambient: { color: 0xd6d0c2, intensity: 0.85 },
    hemi: { sky: 0xffeede, ground: 0xb49a7e, intensity: 1.0 },
    sun: { color: 0xfff0cd, intensity: 1.55, position: [11, 21, 11] },
    fog: { color: 0xc9c0ae, near: 40, far: 130 },
    exposure: 0.98,
    indoorLights: 0.34,
    window: { color: 0xfffaf0, emissive: 1.25 },
    grade: { tint: 0xffe8c8, amount: 0.12, saturation: 1.0, lightness: 1.2 },
    themeColor: '#6e8fc4'
  },
  dusk: {
    id: 'dusk',
    ambient: { color: 0x8e6a86, intensity: 0.9 },
    hemi: { sky: 0xff9e6e, ground: 0x3e2c4c, intensity: 1.0 },
    sun: { color: 0xff8f57, intensity: 1.6, position: [-13, 7, -5] },
    fog: { color: 0x5c3a4e, near: 34, far: 115 },
    exposure: 1.08,
    indoorLights: 0.8,
    window: { color: 0xffa473, emissive: 1.0 },
    grade: { tint: 0xff9f6a, amount: 0.12, saturation: 1.02, lightness: 1.05 },
    themeColor: '#2c1940'
  },
  night: {
    id: 'night',
    ambient: { color: 0x5a4a94, intensity: 0.75 },
    hemi: { sky: 0x9a86e8, ground: 0x2a1f4a, intensity: 0.85 },
    sun: { color: 0xbfaeff, intensity: 1.0, position: [9, 15, 8] },
    fog: { color: 0x1d1338, near: 34, far: 110 },
    exposure: 1.15,
    indoorLights: 1,
    window: { color: 0x8aa6e8, emissive: 0.3 },
    /** Night is the base palette — no regrade. */
    grade: null,
    themeColor: '#140d26'
  }
};

/** 5–8 dawn, 8–16 day, 16–19 dusk, otherwise night. */
export function presetForHour(hour) {
  if (hour >= 5 && hour < 8) return TIME_PRESETS.dawn;
  if (hour >= 8 && hour < 16) return TIME_PRESETS.day;
  if (hour >= 16 && hour < 19) return TIME_PRESETS.dusk;
  return TIME_PRESETS.night;
}

export function currentPreset(date = new Date()) {
  return presetForHour(date.getHours());
}
