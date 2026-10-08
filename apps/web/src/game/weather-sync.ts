import { getBienHoaTime, PHASE_LABELS, type WeatherTelemetry } from '@cozy/game-data';
import { api } from '../lib/api';
import { useUi } from '../lib/store';

let snapshot: WeatherTelemetry | null = null;
let receivedAt = 0;
export function acceptWorldWeather(weather: WeatherTelemetry) {
  snapshot = weather;
  receivedAt = performance.now();
  useUi.getState().setWeatherTelemetry(weather);
}

export function startWeatherSync() {
  let stopped = false;
  const sync = async () => {
    try {
      const weather = await api<WeatherTelemetry>('/world/weather');
      if (!stopped) acceptWorldWeather(weather);
    } catch {
      /* Keep the last server snapshot during brief disconnects. */
    }
  };
  void sync();
  const poll = window.setInterval(() => void sync(), 30_000);
  const clock = window.setInterval(() => {
    if (!snapshot) return;
    const hour = snapshot.timeFrozen
      ? snapshot.solarHour
      : (snapshot.solarHour + (performance.now() - receivedAt) / 3_600_000) % 24;
    const time = getBienHoaTime(hour);
    useUi.getState().setWeatherTelemetry({
      ...snapshot,
      solarHour: hour,
      timeString: time.timeString,
      secondsString: time.secondsString,
      timePhase: time.phase,
      phaseLabelVi: PHASE_LABELS[time.phase],
    });
  }, 1000);
  return () => {
    stopped = true;
    window.clearInterval(poll);
    window.clearInterval(clock);
  };
}
