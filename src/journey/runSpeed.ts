const smartSpeedProfiles = {
  'desk-break': [.72, .90, 1.09, 1.12, 1.10, 1.06, .97, .80],
  'weekend-home': [.84, 1, 1.02, 1.04, 1.04, 1.03, 1, .90],
  incline: [.76, .90, 1.16, .90, 1.26, .90, 1.12, .76],
};

export type SmartSpeedProfile = keyof typeof smartSpeedProfiles;
export type SmartRunSpeed = { mode: 'smart'; profile?: SmartSpeedProfile };
export type RunSpeed = { mode: 'custom'; kmh: number } | SmartRunSpeed;

export const RUN_SPEED_LIMITS = { min: 1, max: 12, initial: 6 };

export function getRunSpeedKmh(speed: RunSpeed, seconds: number, routeKm: number, routeSeconds: number): number {
  if (speed.mode === 'custom') return speed.kmh;

  const { min, max, initial } = RUN_SPEED_LIMITS;
  const duration = routeSeconds > 0 ? routeSeconds : 300;
  const average = routeKm > 0 && routeSeconds > 0 ? routeKm * 3600 / routeSeconds : initial;
  const cruise = Math.max(min, Math.min(max, average));
  const progress = Math.max(0, Math.min(1, seconds / duration));
  let target: number;
  if (speed.profile) {
    const profile = smartSpeedProfiles[speed.profile];
    const position = progress * (profile.length - 1);
    const segment = Math.floor(position);
    const start = profile[segment];
    const end = profile[Math.ceil(position)];
    target = cruise * (start + (end - start) * (position - segment));
  } else {
    const rampSeconds = Math.min(60, duration / 3);
    const ramp = Math.max(0, Math.min(1, seconds / rampSeconds, (duration - seconds) / rampSeconds));
    const phase = 2 * Math.PI * progress;
    const variation = .12 * Math.sin(4 * phase) + .04 * Math.sin(7 * phase);
    target = cruise * (.7 + ramp * (.3 + variation));
  }
  return Math.round(Math.max(min, Math.min(max, target)) * 10) / 10;
}
