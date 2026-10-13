import { useState } from 'react';

import { useGameAction } from '../../features/actions/useGameAction';
import { foundCompany } from '../../features/economy/api';
import type { FoundCompany } from '../../features/economy/api';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useRegionName } from '../../features/world/useNames';

/** What a company can make when founded (spec section 5); every quality line starts at Q1. */
export const foundableGoods = [
  'food_raw',
  'military_raw',
  'medical_raw',
  'food_q1',
  'weapon_q1',
  'kit_q1',
] as const;
export type FoundableGood = (typeof foundableGoods)[number];

export function isValidCompanyName(name: string): boolean {
  const length = name.trim().length;
  return length >= 3 && length <= 40;
}

/** The founding form: its fields, their validity, and the founding action. */
export function useFoundCompanyForm() {
  const citizen = useCurrentCitizen();
  const regionName = useRegionName();
  const [good, setGood] = useState<FoundableGood>('food_raw');
  const [regionCode, setRegionCode] = useState(citizen.region_code);
  const [name, setName] = useState('');
  const [checked, setChecked] = useState(false);
  const [founded, setFounded] = useState<{ name: string; region: string } | null>(null);
  const action = useGameAction((key, company: FoundCompany) => foundCompany(company, key), {
    onSuccess: (_, company) => {
      setFounded({ name: company.name, region: regionName(company.regionCode) });
      setName('');
      setChecked(false);
    },
  });

  /** Any change is a new request: a new idempotency key. */
  const edit =
    <T>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      action.changed();
    };

  return {
    good,
    regionCode,
    name,
    nameError: checked && !isValidCompanyName(name),
    founded,
    action,
    setGood: edit(setGood),
    setRegionCode: edit(setRegionCode),
    setName: edit(setName),
    submit: () => {
      setChecked(true);
      if (isValidCompanyName(name)) {
        action.run({ name: name.trim(), goodCode: good, regionCode });
      }
    },
  };
}
