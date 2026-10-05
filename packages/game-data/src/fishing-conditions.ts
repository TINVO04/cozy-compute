import type { FishSpecies } from './activities.js';
import type { WeatherTelemetry } from './weather.js';

export interface FishingConditions {
  weather: WeatherTelemetry;
  waitMultiplier: number;
  rareWeightMultiplier: number;
  reactionMultiplier: number;
  summary: string;
}

/** Bounded modifiers apply only inside the already-authorized fishing ground. */
export function fishingConditions(weather: WeatherTelemetry): FishingConditions {
  let wait = 1;
  let rare = 1;
  let reaction = 1;
  const notes: string[] = [];
  if (weather.timePhase === 'dawn' || weather.timePhase === 'sunset') {
    wait *= 0.8;
    rare *= 1.25;
    notes.push('Giờ cá ăn: cắn nhanh hơn, thuận lợi gặp cá quý');
  } else if (weather.timePhase === 'noon') {
    wait *= 1.2;
    rare *= 0.9;
    notes.push('Buổi trưa cá ăn chậm');
  } else if (weather.timePhase === 'night') {
    wait *= 1.08;
    notes.push('Ban đêm: cá da trơn, cá chình và thần ngư hoạt động mạnh');
  }
  if (weather.condition === 'drizzle' || weather.condition === 'rain') {
    wait *= 0.85;
    rare *= 1.2;
    notes.push('Mưa nhẹ/vừa: cá tích cực tìm mồi');
  } else if (weather.condition === 'cloudy') {
    wait *= 0.95;
    rare *= 1.1;
    notes.push('Trời râm thuận lợi câu cá');
  } else if (weather.condition === 'heavy_rain' || weather.condition === 'thunderstorm') {
    wait *= 1.25;
    reaction *= 0.85;
    notes.push('Mưa lớn/giông: cá cắn chậm, cần giật nhanh hơn');
  }
  if (weather.windSpeedKmh >= 30) {
    wait *= 1.1;
    reaction *= 0.9;
    notes.push('Gió mạnh làm phao khó giữ ổn định');
  }
  return {
    weather,
    waitMultiplier: Math.max(0.65, Math.min(1.6, wait)),
    rareWeightMultiplier: Math.max(0.8, Math.min(1.5, rare)),
    reactionMultiplier: Math.max(0.75, reaction),
    summary: notes.join(' · ') || 'Điều kiện câu cá bình thường',
  };
}

const NOCTURNAL = new Set(['electric_catfish', 'catfish_giant', 'catfish_noodle', 'electric_eel', 'axolotl']);

export function fishForConditions(table: FishSpecies[], conditions: FishingConditions): FishSpecies[] {
  const night = conditions.weather.timePhase === 'night';
  return table.map((fish) => {
    const nocturnal = NOCTURNAL.has(fish.variantOf ?? fish.id) || fish.habitat === 'mythic';
    const affinity = nocturnal ? (night ? 1.8 : 0.85) : night ? 0.8 : 1;
    const rarity = fish.rarity === 'common' || fish.rarity === 'rare' ? 1 : conditions.rareWeightMultiplier;
    return { ...fish, weight: fish.weight * affinity * rarity };
  });
}
