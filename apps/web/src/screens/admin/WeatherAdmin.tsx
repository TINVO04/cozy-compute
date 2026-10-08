import {
  Cloud,
  CloudLightning,
  CloudRain,
  Moon,
  RefreshCw,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button } from '../../ui/primitives';
import { acceptWorldWeather } from '../../game/weather-sync';
import type { AdminWeatherOverride, WeatherTelemetry } from '@cozy/game-data';
import type { WeatherCondition } from '../../game/weather-engine';
import { ApplyWorldWeather } from './ApplyWorldWeather';

export function WeatherAdminPage() {
  const weather = useUi((s) => s.weather);
  const override = useUi((s) => s.weatherOverride);
  const setWeatherOverride = useUi((s) => s.setWeatherOverride);
  const resetWeatherOverride = useUi((s) => s.resetWeatherOverride);
  const triggerLightning = useUi((s) => s.triggerLightning);
  const triggerWindGust = useUi((s) => s.triggerWindGust);

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncToServer = useCallback(async (patch: Partial<AdminWeatherOverride>) => {
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const current = useUi.getState().weatherOverride;
      const body = {
        enabled: true,
        solarHour: patch.solarHour !== undefined ? patch.solarHour : (current?.solarHour ?? null),
        condition: patch.condition !== undefined ? patch.condition : (current?.condition ?? null),
        windSpeedKmh: patch.windSpeedKmh !== undefined ? patch.windSpeedKmh : (current?.windSpeedKmh ?? null),
        rainIntensity:
          patch.rainIntensity !== undefined ? patch.rainIntensity : (current?.rainIntensity ?? null),
        lightningAt: patch.lightningAt !== undefined ? patch.lightningAt : undefined,
        windGustAt: patch.windGustAt !== undefined ? patch.windGustAt : undefined,
      };
      const res = await api<WeatherTelemetry>('/admin/weather', {
        method: 'PUT',
        body,
      });
      acceptWorldWeather(res);
      setSyncStatus('synced');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi đồng bộ máy chủ';
      setSyncError(msg);
      setSyncStatus('error');
    }
  }, []);

  const debouncedSync = useCallback(
    (patch: Partial<AdminWeatherOverride>) => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        void syncToServer(patch);
      }, 250);
    },
    [syncToServer],
  );

  const resetAllServer = useCallback(async () => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      const res = await api<WeatherTelemetry>('/admin/weather', {
        method: 'PUT',
        body: { enabled: false },
      });
      acceptWorldWeather(res);
      setSyncStatus('synced');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khôi phục thời tiết';
      setSyncError(msg);
      setSyncStatus('error');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  const handleSetTime = (hour: number | null) => {
    play('click');
    setWeatherOverride({ solarHour: hour });
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    void syncToServer({ solarHour: hour });
  };

  const handleSetCondition = (condition: WeatherCondition | null) => {
    play('click');
    setWeatherOverride({ condition });
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    void syncToServer({ condition });
  };

  const handleTriggerLightning = () => {
    triggerLightning();
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    void syncToServer({ lightningAt: Date.now() });
  };

  const handleTriggerWindGust = () => {
    play('wind_gust');
    triggerWindGust();
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    void syncToServer({ windGustAt: Date.now() });
  };

  const handleResetAll = () => {
    play('pop');
    resetWeatherOverride();
    void resetAllServer();
  };

  return (
    <div className="stack-lg">
      <header className="admin-head">
        <div>
          <h1>Khí hậu & Thời tiết Biên Hòa</h1>
          <p className="muted">
            Mọi thay đổi chu kỳ ánh sáng 24h, thời tiết, gió thổi và sấm sét sẽ đồng bộ thời gian thực tới
            toàn bộ người chơi trong server.
          </p>
          {syncError && <p style={{ color: '#ef4444', fontSize: 13, margin: '4px 0 0' }}>⚠️ {syncError}</p>}
        </div>
        <div className="row">
          <span
            className={`pill ${
              syncStatus === 'syncing' ? 'pill-info' : weather.isOverridden ? 'pill-warning' : 'pill-success'
            }`}
          >
            {syncStatus === 'syncing'
              ? '🔄 Đang đồng bộ toàn server...'
              : weather.isOverridden
                ? '🟡 Đang ghi đè toàn server'
                : '🟢 Realtime Biên Hòa (Toàn server)'}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetAll}
            disabled={!weather.isOverridden && !override?.enabled}
          >
            <RefreshCw size={14} /> Khôi phục Realtime
          </Button>
        </div>
      </header>

      {/* KPI Cards */}
      <ApplyWorldWeather />
      <section className="kpis">
        <article className="kpi">
          <div className="kpi-icon" style={{ color: '#38bdf8' }}>
            <Sun size={20} />
          </div>
          <div>
            <div className="kpi-val">{weather.secondsString}</div>
            <div className="kpi-label">Giờ Biên Hòa (GMT+7)</div>
            <div className="kpi-sub muted">{weather.phaseLabelVi}</div>
          </div>
        </article>

        <article className="kpi">
          <div className="kpi-icon" style={{ color: '#fbbf24' }}>
            <Thermometer size={20} />
          </div>
          <div>
            <div className="kpi-val">{weather.temperatureC}°C</div>
            <div className="kpi-label">Nhiệt độ hiện tại</div>
            <div className="kpi-sub muted">Nhiệt đới Đông Nam Bộ</div>
          </div>
        </article>

        <article className="kpi">
          <div className="kpi-icon" style={{ color: '#4ade80' }}>
            <CloudRain size={20} />
          </div>
          <div>
            <div className="kpi-val" style={{ fontSize: 16 }}>
              {weather.conditionLabelVi}
            </div>
            <div className="kpi-label">Tình trạng thời tiết</div>
            <div className="kpi-sub muted">{weather.precipitationMm} mm lượng mưa</div>
          </div>
        </article>

        <article className="kpi">
          <div className="kpi-icon" style={{ color: '#34d399' }}>
            <Wind size={20} />
          </div>
          <div>
            <div className="kpi-val">{weather.windSpeedKmh} km/h</div>
            <div className="kpi-label">Vận tốc gió</div>
            <div className="kpi-sub muted">Hướng {weather.windDirectionDeg}°</div>
          </div>
        </article>
      </section>

      {/* Control Panels */}
      <div className="split" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Card 1: Time of Day */}
        <article className="card" style={{ padding: 20 }}>
          <div className="section-title">
            <h3>Thử nghiệm khung giờ (Day/Night Cycle)</h3>
            <span className="muted">Giờ hiện tại: {weather.timeString}</span>
          </div>

          <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
            Bấm chọn preset khung giờ để xem bản đồ chuyển màu ánh sáng bình minh, ban ngày, hoàng hôn hoặc
            đêm huyền ảo:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <Button size="sm" variant="secondary" onClick={() => handleSetTime(6.0)}>
              <Sunrise size={14} color="#f97316" /> Sáng sớm (06:00)
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleSetTime(9.5)}>
              <Sun size={14} color="#facc15" /> Buổi sáng (09:30)
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleSetTime(12.0)}>
              <Sun size={14} color="#fbbf24" /> Buổi trưa (12:00)
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleSetTime(17.75)}>
              <Sunset size={14} color="#f43f5e" /> Hoàng hôn (17:45)
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleSetTime(21.5)}>
              <Moon size={14} color="#818cf8" /> Ban đêm (21:30)
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleSetTime(null)}>
              <RefreshCw size={13} /> Giờ Biên Hòa thật
            </Button>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span className="muted">Thanh trượt giờ tùy ý (0h - 24h):</span>
              <strong>
                {Math.floor(weather.solarHour)}:
                {String(Math.floor((weather.solarHour % 1) * 60)).padStart(2, '0')}
              </strong>
            </div>
            <input
              type="range"
              min="0"
              max="23.9"
              step="0.1"
              value={weather.solarHour}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setWeatherOverride({ solarHour: val });
                debouncedSync({ solarHour: val });
              }}
              onPointerUp={(e) => {
                const val = parseFloat((e.target as HTMLInputElement).value);
                if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
                void syncToServer({ solarHour: val });
              }}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#38bdf8' }}
            />
          </div>
        </article>

        {/* Card 2: Weather & Precipitation */}
        <article className="card" style={{ padding: 20 }}>
          <div className="section-title">
            <h3>Thử nghiệm thời tiết & Lượng mưa</h3>
            <span className="muted">{weather.conditionLabelVi}</span>
          </div>

          <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
            Bấm chọn trạng thái thời tiết để xem mưa rơi nghiêng theo gió, mặt đường ướt phản chiếu và sấm
            sét:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <Button size="sm" variant="secondary" onClick={() => handleSetCondition('clear')}>
              <Sun size={14} color="#facc15" /> Trời quang / Nắng
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleSetCondition('cloudy')}>
              <Cloud size={14} color="#94a3b8" /> Nhiều mây râm
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleSetCondition('drizzle')}>
              <CloudRain size={14} color="#38bdf8" /> Mưa bay lất phất
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleSetCondition('heavy_rain')}>
              <CloudRain size={14} color="#2563eb" /> Mưa rào xối xả
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleSetCondition('thunderstorm')}>
              <CloudLightning size={14} color="#a855f7" /> Giông bão sấm sét
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleSetCondition(null)}>
              <RefreshCw size={13} /> Thời tiết thật
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}
              >
                <span className="muted">Tốc độ gió:</span>
                <strong>{weather.windSpeedKmh} km/h</strong>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={weather.windSpeedKmh}
                onChange={(e) => {
                  play('click');
                  const val = parseFloat(e.target.value);
                  setWeatherOverride({ windSpeedKmh: val });
                  debouncedSync({ windSpeedKmh: val });
                }}
                onPointerUp={(e) => {
                  const val = parseFloat((e.target as HTMLInputElement).value);
                  if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
                  void syncToServer({ windSpeedKmh: val });
                }}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#34d399' }}
              />
            </div>
            <div>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}
              >
                <span className="muted">Lượng mưa:</span>
                <strong>{weather.precipitationMm} mm</strong>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={Math.min(1, weather.precipitationMm / 25)}
                onChange={(e) => {
                  play('click');
                  const val = parseFloat(e.target.value);
                  setWeatherOverride({ rainIntensity: val });
                  debouncedSync({ rainIntensity: val });
                }}
                onPointerUp={(e) => {
                  const val = parseFloat((e.target as HTMLInputElement).value);
                  if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
                  void syncToServer({ rainIntensity: val });
                }}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#38bdf8' }}
              />
            </div>
          </div>
        </article>
      </div>

      {/* Card 3: Instant Interactive Triggers */}
      <article className="card" style={{ padding: 20 }}>
        <div className="section-title">
          <h3>⚡ Kích hoạt hiệu ứng tức thì (Instant Triggers)</h3>
          <span className="muted">Thử nghiệm phản ứng đồ họa & âm thanh ngay lập tức</span>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <Button
            size="sm"
            variant="secondary"
            style={{
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(202, 138, 4, 0.35) 100%)',
              borderColor: '#eab308',
              color: '#fef08a',
              fontWeight: 700,
            }}
            onClick={handleTriggerLightning}
          >
            <Zap size={16} color="#facc15" /> ⚡ Kích Sét Đánh (Lightning Strike & Thunder)
          </Button>

          <Button
            size="sm"
            variant="secondary"
            style={{
              background:
                'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(14, 165, 233, 0.25) 100%)',
              borderColor: '#38bdf8',
              color: '#e0f2fe',
              fontWeight: 700,
            }}
            onClick={handleTriggerWindGust}
          >
            <Wind size={16} color="#38bdf8" /> 🍃 Giật Gió Mạnh (Sudden Wind Gust)
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetAll}
            disabled={!weather.isOverridden && !override?.enabled}
          >
            <RefreshCw size={15} /> Khôi phục toàn bộ về Realtime Biên Hòa
          </Button>
        </div>
      </article>
    </div>
  );
}
