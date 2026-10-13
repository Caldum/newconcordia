import { Panel } from '@concordia/atlas/Panel';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { defineMessages, formatNumber, useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import styles from '../economy/economy.module.css';
import { isRaw, useGoodName } from '../economy/goods';
import { useMyInventory } from '../market/queries';

import panel from './InventoryPanel.module.css';

const messages = defineMessages({
  es: {
    title: 'Objetos',
    empty: 'Todavía no tienes objetos. Compra en el mercado o pásalos desde tu empresa.',
    food: (energy: number) => `Da ${String(energy)} de energía.`,
    autoFood: (perMeal: number) =>
      `Comes automáticamente: cada 5 minutos, si te falta energía, comes la comida de menor calidad que alcance y recuperas hasta ${String(perMeal)}.`,
    kit: (health: number) => `Cura ${String(health)} de salud.`,
    weapon: (multiplier: string) => `Multiplica tu daño ×${multiplier}. Se gasta una por golpe.`,
    fuel: 'Ya no se produce: quedó del juego anterior.',
    raw: 'Materia prima. Pásala al depósito de tu empresa o véndela en el mercado.',
  },
  en: {
    title: 'Items',
    empty: 'You have no items yet. Buy on the market or move them from your company.',
    food: (energy: number) => `Gives ${String(energy)} energy.`,
    autoFood: (perMeal: number) =>
      `You eat on your own: every 5 minutes, if you are missing energy, you eat the lowest quality that covers it and recover up to ${String(perMeal)}.`,
    kit: (health: number) => `Heals ${String(health)} health.`,
    weapon: (multiplier: string) => `Multiplies your damage ×${multiplier}. One is spent per hit.`,
    fuel: 'No longer produced: left over from the earlier game.',
    raw: 'Raw material. Move it to your company’s depot or sell it on the market.',
  },
});

const effectsSchema = z.array(
  z.object({
    code: z.string(),
    damage_multiplier: z.number().nullable(),
    energy: z.number().int().nullable(),
    heal: z.number().int().nullable(),
    food_energy_per_interval: z.number().int(),
  }),
);

function useEffects() {
  return useQuery({
    queryKey: ['goods-effects'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_goods_effects');
      if (error) throw error as Error;
      return effectsSchema.parse(data);
    },
  });
}

/** The player's goods and what each is for; food is eaten automatically (Inventory canvas). */
export function InventoryPanel() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const inventory = useMyInventory();
  const effects = useEffects();
  const rows = inventory.data ?? [];
  const effectOf = (code: string) => effects.data?.find((effect) => effect.code === code);
  const perMeal = effects.data?.[0]?.food_energy_per_interval ?? 0;
  const hasFood = rows.some((line) => effectOf(line.good_code)?.energy);

  return (
    <Panel className={styles.panel} aria-labelledby="inventory-title">
      <h2 id="inventory-title" className="at-title-3">
        {copy.title}
      </h2>
      {inventory.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.empty}</p>
      ) : null}
      {hasFood ? <p className={styles.muted}>{copy.autoFood(perMeal)}</p> : null}
      <ul className={panel.items}>
        {rows.map((line) => {
          const effect = effectOf(line.good_code);
          const description = effect?.energy
            ? copy.food(effect.energy)
            : effect?.heal
              ? copy.kit(effect.heal)
              : effect?.damage_multiplier
                ? copy.weapon(formatNumber(effect.damage_multiplier, locale))
                : line.good_code === 'fuel'
                  ? copy.fuel
                  : isRaw(line.good_code)
                    ? copy.raw
                    : '';
          return (
            <li key={line.good_code} className={panel.item}>
              <div className={panel.itemHead}>
                <strong>{goodName(line.good_code)}</strong>
                <span className="at-figure">{formatNumber(line.quantity, locale)}</span>
              </div>
              <p className={styles.muted}>{description}</p>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
