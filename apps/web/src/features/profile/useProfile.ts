import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

import { energyAt } from './energy';
import type { EnergyReading } from './energy';

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
  strength: z.number().int(),
  /** War damage accumulated over the whole game. */
  damage: z.number().int(),
  rank: z.number().int(),
  /** Null at the highest rank. */
  next_rank_damage: z.number().int().nullable(),
  influence: z.number().int(),
  energy: z.number().int(),
  energy_max: z.number().int(),
  energy_per_hour: z.number().int(),
  /** Null when the bar is full. */
  next_energy_at: z.string().nullable(),
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
      energyPerHour: row.energy_per_hour,
      nextEnergyAt: row.next_energy_at === null ? null : Date.parse(row.next_energy_at),
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
    enabled: auth.status === 'signedIn',
  });
}

/** Energy to show now, rising point by point between readings. The database decides what is spent. */
export function useEnergy(reading: EnergyReading | undefined): number | undefined {
  const [now, setNow] = useState(() => Date.now());
  const shown = reading ? energyAt(reading, now) : undefined;
  const nextAt = shown?.nextAt ?? null;

  useEffect(() => {
    if (nextAt === null) return;
    const timer = setTimeout(
      () => {
        setNow(Date.now());
      },
      Math.max(0, nextAt - Date.now()),
    );
    return () => {
      clearTimeout(timer);
    };
  }, [nextAt]);

  return shown?.energy;
}
