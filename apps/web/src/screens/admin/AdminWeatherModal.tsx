import {
  Cloud,
  CloudLightning,
  CloudRain,
  Compass,
  Moon,
  RefreshCw,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
  X,
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

interface Props {
  onClose: () => void;
}

export function AdminWeatherModal({ onClose }: Props) {
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [onClose]);

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
    <div
      className="backdrop"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000,
        backgroundColor: 'rgba(5, 7, 18, 0.72)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '94%',
          maxWidth: 680,
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: 24,
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(180deg, #18192a 0%, #121320 100%)',
          borderRadius: 16,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 16,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: 14,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🌤️</span>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                Admin Weather & Time Studio
              </h2>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontWeight: 700,
                  backgroundColor:
                    syncStatus === 'syncing'
                      ? 'rgba(56, 189, 248, 0.2)'
                      : weather.isOverridden
                        ? 'rgba(234, 179, 8, 0.2)'
                        : 'rgba(34, 197, 94, 0.2)',
                  color: syncStatus === 'syncing' ? '#38bdf8' : weather.isOverridden ? '#fde047' : '#4ade80',
                  border: `1px solid ${
                    syncStatus === 'syncing' ? '#0284c7' : weather.isOverridden ? '#ca8a04' : '#16a34a'
                  }`,
                }}
              >
                {syncStatus === 'syncing'
                  ? '🔄 ĐANG ĐỒNG BỘ TOÀN SERVER...'
                  : weather.isOverridden
                    ? '🟡 ĐÃ ÁP DỤNG TOÀN SERVER'
                    : '🟢 REALTIME BIÊN HÒA (TOÀN SERVER)'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
              Mọi thay đổi ánh sáng 24h, thời tiết, gió thổi và sấm sét sẽ đồng bộ thời gian thực tới toàn bộ
              người chơi trong game.
            </p>
            {syncError && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ef4444' }}>⚠️ {syncError}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng bảng điều khiển"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: 8,
              padding: 6,
              cursor: 'pointer',
              color: '#94a3b8',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Telemetry Bar */}
        <ApplyWorldWeather />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 8,
            padding: 12,
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Đồng hồ Biên Hòa</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#38bdf8' }}>{weather.secondsString}</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>{weather.phaseLabelVi}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Thermometer size={12} /> Nhiệt độ
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fbbf24' }}>{weather.temperatureC}°C</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>Cảm nhận nhiệt đới</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CloudRain size={12} /> Tình trạng
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{weather.conditionLabelVi}</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>{weather.precipitationMm} mm/h</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Compass size={12} /> Sức gió
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#34d399' }}>{weather.windSpeedKmh} km/h</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>Hướng {weather.windDirectionDeg}°</div>
          </div>
        </div>

        {/* Section 1: Time of Day Presets */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
              🌅 Thử Nghiệm Khung Giờ (Day/Night Presets)
            </span>
            <span style={{ fontSize: 11, color: '#38bdf8' }}>Giờ hiện tại: {weather.timeString}</span>
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}
          >
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '7px 8px', justifyContent: 'center', gap: 6 }}
              onClick={() => handleSetTime(6.0)}
            >
              <Sunrise size={14} color="#f97316" /> Sáng sớm (6h)
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '7px 8px', justifyContent: 'center', gap: 6 }}
              onClick={() => handleSetTime(9.5)}
            >
              <Sun size={14} color="#facc15" /> Buổi sáng (9h30)
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '7px 8px', justifyContent: 'center', gap: 6 }}
              onClick={() => handleSetTime(12.0)}
            >
              <Sun size={14} color="#fbbf24" /> Buổi trưa (12h)
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '7px 8px', justifyContent: 'center', gap: 6 }}
              onClick={() => handleSetTime(17.75)}
            >
              <Sunset size={14} color="#f43f5e" /> Hoàng hôn (17h45)
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '7px 8px', justifyContent: 'center', gap: 6 }}
              onClick={() => handleSetTime(21.5)}
            >
              <Moon size={14} color="#818cf8" /> Ban đêm (21h30)
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '7px 8px', justifyContent: 'center', gap: 6, color: '#38bdf8' }}
              onClick={() => handleSetTime(null)}
            >
              <RefreshCw size={13} /> Giờ Biên Hòa thật
            </button>
          </div>

          {/* Time Range Slider */}
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: '#94a3b8',
                marginBottom: 4,
              }}
            >
              <span>Kéo giờ tùy ý (0h - 24h):</span>
              <span style={{ fontWeight: 700, color: '#f8fafc' }}>
                {Math.floor(weather.solarHour)}:
                {String(Math.floor((weather.solarHour % 1) * 60)).padStart(2, '0')}
              </span>
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
        </div>

        {/* Section 2: Weather Presets */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
              🌧️ Thử Nghiệm Thời Tiết (Weather Presets)
            </span>
            <span style={{ fontSize: 11, color: '#4ade80' }}>Trạng thái: {weather.conditionLabelVi}</span>
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: 8 }}
          >
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '7px 8px', justifyContent: 'center', gap: 6 }}
              onClick={() => handleSetCondition('clear')}
            >
              <Sun size={14} color="#facc15" /> Nắng ráo
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '7px 8px', justifyContent: 'center', gap: 6 }}
              onClick={() => handleSetCondition('cloudy')}
            >
              <Cloud size={14} color="#94a3b8" /> Nhiều mây
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '7px 8px', justifyContent: 'center', gap: 6 }}
              onClick={() => handleSetCondition('drizzle')}
            >
              <CloudRain size={14} color="#38bdf8" /> Mưa bay
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '7px 8px', justifyContent: 'center', gap: 6 }}
              onClick={() => handleSetCondition('heavy_rain')}
            >
              <CloudRain size={14} color="#2563eb" /> Mưa to xối xả
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '7px 8px', justifyContent: 'center', gap: 6 }}
              onClick={() => handleSetCondition('thunderstorm')}
            >
              <CloudLightning size={14} color="#a855f7" /> Giông bão sét
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '7px 8px', justifyContent: 'center', gap: 6, color: '#4ade80' }}
              onClick={() => handleSetCondition(null)}
            >
              <RefreshCw size={13} /> Thời tiết thật
            </button>
          </div>

          {/* Wind & Rain Sliders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: '#94a3b8',
                  marginBottom: 4,
                }}
              >
                <span>Tốc độ gió:</span>
                <span style={{ fontWeight: 700, color: '#34d399' }}>{weather.windSpeedKmh} km/h</span>
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
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: '#94a3b8',
                  marginBottom: 4,
                }}
              >
                <span>Lượng mưa:</span>
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>{weather.precipitationMm} mm</span>
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
        </div>

        {/* Section 3: Instant Triggers */}
        <div
          style={{
            padding: 12,
            background: 'rgba(234, 179, 8, 0.05)',
            border: '1px solid rgba(234, 179, 8, 0.2)',
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <span
            style={{ fontSize: 12, fontWeight: 700, color: '#facc15', display: 'block', marginBottom: 8 }}
          >
            ⚡ Kích Hoạt Hiệu Ứng Tức Thì (Instant Triggers)
          </span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button
              size="sm"
              variant="secondary"
              style={{
                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2) 0%, rgba(202, 138, 4, 0.3) 100%)',
                borderColor: '#eab308',
                color: '#fef08a',
                fontWeight: 700,
              }}
              onClick={handleTriggerLightning}
            >
              <Zap size={14} color="#facc15" /> ⚡ Thử Sét Đánh (Lightning Flash & Thunder)
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
              <Wind size={14} color="#38bdf8" /> 🍃 Giật Gió Mạnh (Sudden Wind Gust)
            </Button>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 10,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Button
            size="sm"
            variant="ghost"
            style={{ color: '#ef4444' }}
            onClick={handleResetAll}
            disabled={!weather.isOverridden && !override?.enabled}
          >
            <RefreshCw size={13} /> Khôi phục toàn bộ về Realtime Biên Hòa
          </Button>
          <Button size="sm" variant="primary" onClick={onClose}>
            Đóng bảng thử nghiệm
          </Button>
        </div>
      </div>
    </div>
  );
}
