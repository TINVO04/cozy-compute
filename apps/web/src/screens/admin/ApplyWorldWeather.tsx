import { useState } from 'react';
import type { WeatherTelemetry } from '@cozy/game-data';
import { api } from '../../lib/api';
import { useUi } from '../../lib/store';
import { acceptWorldWeather } from '../../game/weather-sync';
import { Button } from '../../ui/primitives';

export function ApplyWorldWeather() {
  const hasDraft = useUi((state) => !!state.weatherOverride?.enabled);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const apply = async (reset: boolean) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    const draft = useUi.getState().weatherOverride;
    try {
      const weather = await api<WeatherTelemetry>('/admin/weather', {
        method: 'PUT',
        body: reset
          ? { enabled: false }
          : {
              enabled: true,
              solarHour: draft?.solarHour ?? null,
              condition: draft?.condition ?? null,
              windSpeedKmh: draft?.windSpeedKmh ?? null,
              rainIntensity: draft?.rainIntensity ?? null,
              lightningAt: draft?.lightningAt,
              windGustAt: draft?.windGustAt,
            },
      });
      acceptWorldWeather(weather);
      setMessage(
        reset
          ? 'Đã khôi phục thời tiết thật cho toàn server.'
          : 'Đã áp dụng cho toàn bộ người chơi trong server.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu thời tiết. Hãy thử lại.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack" style={{ marginBottom: 16 }}>
      <p className="muted" style={{ fontSize: 12 }}>
        💡 Các tùy chỉnh giờ và thời tiết đều tự động phát sóng theo thời gian thực tới mọi người chơi trên
        server. Bạn cũng có thể nhấn áp dụng ngay hoặc khôi phục thời tiết thật tại đây:
      </p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <Button disabled={busy || !hasDraft} onClick={() => void apply(false)}>
          Áp dụng vào thế giới & câu cá
        </Button>
        <Button disabled={busy} variant="secondary" onClick={() => void apply(true)}>
          Dùng thời tiết thực cho mọi người
        </Button>
      </div>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
