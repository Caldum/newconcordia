import { useState } from 'react';

import { useGameAction } from '../../features/actions/useGameAction';
import { foundCompany } from '../../features/economy/api';
import type { FoundCompany } from '../../features/economy/api';
import { categoryOf, isRaw } from '../../features/economy/goods';
import { useCurrentCitizen } from '../../features/shell/CurrentCitizen';
import { useRegionResources } from '../../features/world/resources';
import { useRegionName } from '../../features/world/useNames';
import { useWorld } from '../../features/world/useWorld';

import { foundableRegions } from './foundableRegions';

/** What a company can make when founded (spec section 5); a manufacturer starts at Q1 (N1). */
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

/** The founding form: its fields, the regions that fit the chosen good, and the founding action. */
export function useFoundCompanyForm() {
  const citizen = useCurrentCitizen();
  const regionName = useRegionName();
  const world = useWorld().data;
  const resources = useRegionResources().data;
  const [good, setGood] = useState<FoundableGood>('food_raw');
  const [chosenRegion, setChosenRegion] = useState(citizen.region_code);
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

  const regions =
    world && resources
      ? foundableRegions(
          world,
          resources,
          { extractor: isRaw(good), category: categoryOf(good) },
          citizen.country_code,
        )
      : [];
  // The chosen region while it fits the good; otherwise the first one that does.
  const regionCode = regions.some((region) => region.code === chosenRegion)
    ? chosenRegion
    : (regions[0]?.code ?? null);
  const hostCountry = regionCode ? world?.regions.get(regionCode)?.owner_country_code : undefined;

  /** Any change is a new request: a new idempotency key. */
  const edit =
    <T>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      action.changed();
    };

  return {
    good,
    regions,
    regionCode,
    /** The host country when it is not the player's: foreigners pay its construction surcharge. */
    foreignHost: hostCountry && hostCountry !== citizen.country_code ? hostCountry : null,
    name,
    nameError: checked && !isValidCompanyName(name),
    founded,
    action,
    setGood: edit(setGood),
    setRegionCode: edit(setChosenRegion),
    setName: edit(setName),
    submit: () => {
      setChecked(true);
      if (isValidCompanyName(name) && regionCode) {
        action.run({ name: name.trim(), goodCode: good, regionCode });
      }
    },
  };
}
