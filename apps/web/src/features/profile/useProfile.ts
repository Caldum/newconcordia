import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

import { energyAt, refreshInMs } from './energy';
import type { EnergyReading, EnergyView } from './energy';

const profileSchema = z.object({
  name: z.string(),
  country_code: z.string(),
  /** As printed on the document: ARG-003413. */
  citizen_code: z.string(),
  region_code: z.string(),
  joined_at: z.string(),
  level: z.number().int(),
  experience: z.number().int(),
  /** Experience where the current level started. */
  level_experience: z.number().int(),
  next_level_experience: z.number().int(),
  health: z.number().int(),
  health_max: z.number().int(),
  strength: z.number().int(),
  military_xp: z.number().int(),
  /** 0 (Novice) to 75 (General V); see rankOf. */
  rank_step: z.number().int(),
  /** Military XP where the current rank step started. */
  rank_xp: z.number().int(),
  /** Null at General V. */
  next_rank_xp: z.number().int().nullable(),
  /** War damage accumulated over the whole game (a statistic). */
  damage: z.number().int(),
  influence: z.number().int(),
  energy: z.number().int(),
  energy_max: z.number().int(),
  /** Energy food may restore now (ADR 0047). */
  food_appetite: z.number().int(),
  food_appetite_max: z.number().int(),
  food_energy_per_interval: z.number().int(),
  food_interval_minutes: z.number().int(),
  /** Last settled meal interval; null before the first. */
  food_at: z.string().nullable(),
  /** What the next meal gives; null without food. */
  next_meal_energy: z.number().int().nullable(),
  /** Server time of the reading. */
  checked_at: z.string(),
});

export type ProfileRow = z.infer<typeof profileSchema>;
export type Profile = ProfileRow & { energyReading: EnergyReading };

async function fetchMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw error;
  const row = z.array(profileSchema).parse(data)[0];
  if (!row) return null;
  return {
    ...row,
    energyReading: {
      energy: row.energy,
      energyMax: row.energy_max,
      appetite: row.food_appetite,
      appetiteMax: row.food_appetite_max,
      perInterval: row.food_energy_per_interval,
      intervalMs: row.food_interval_minutes * 60_000,
      foodAt: Date.parse(row.food_at ?? row.checked_at),
      nextMealEnergy: row.next_meal_energy,
      checkedAt: Date.parse(row.checked_at),
      receivedAt: Date.now(),
    },
  };
}

/** The signed-in player's profile; `null` when the account has no citizen yet. */
export function useProfile() {
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.session.user.id : '';
  return useQuery({
    queryKey: ['me', userId, 'profile'],
    queryFn: fetchMyProfile,
    // Meals are settled on the server when the profile is read (ADR 0047): read again right after the next one.
    refetchInterval: (query) => {
      const reading = query.state.data?.energyReading;
      return reading ? refreshInMs(reading, Date.now()) : false;
    },
    enabled: auth.status === 'signedIn',
  });
}

/** How often the appetite on the bar moves while it fills; a CSS transition smooths each step. */
const fillStepMs = 1000;

/** Energy and appetite to show now, the appetite filling between readings. The database decides what is eaten. */
export function useEnergy(reading: EnergyReading | undefined): EnergyView | undefined {
  const [now, setNow] = useState(() => Date.now());
  const shown = reading ? energyAt(reading, now) : undefined;
  const filling = shown?.filling ?? false;

  useEffect(() => {
    if (!filling) return;
    const timer = setInterval(() => {
      setNow(Date.now());
    }, fillStepMs);
    return () => {
      clearInterval(timer);
    };
  }, [filling]);

  return shown;
}
