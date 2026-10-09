import { Button } from '@concordia/atlas/Button';
import { Field } from '@concordia/atlas/Field';
import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';

import { defineMessages, formatNumber, useLocale, useMessages } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import styles from '../economy/economy.module.css';
import { isRaw, useGoodName } from '../economy/goods';
import { act, errorCode, problemText } from '../economy/queries';
import { useActionKey } from '../economy/useActionKey';
import { useMyInventory } from '../market/queries';

import panel from './InventoryPanel.module.css';

const messages = defineMessages({
  es: {
    title: 'Objetos',
    empty: 'Todavía no tienes objetos. Compra en el mercado o pásalos desde tu empresa.',
    ration: (energy: number, max: number) =>
      `Recupera ${String(energy)} de energía, hasta ${String(max)} por día.`,
    weapon: (multiplier: string) => `Multiplica tu daño ×${multiplier}. Se gasta una por golpe.`,
    fuel: 'Lo usa tu país para abrir batallas.',
    raw: 'Materia prima. Pásala al depósito de tu empresa o véndela en el mercado.',
    today: (energy: number, max: number) => `Hoy recuperaste ${String(energy)} de ${String(max)}.`,
    rations: 'Raciones a comer',
    eat: 'Comer',
    eaten: (energy: number) => `Recuperaste ${String(energy)} de energía.`,
    quantityInvalid: 'Escribe una cantidad entera, mayor que cero.',
    error_food_limit: 'Con eso pasarías el máximo de energía por comida de hoy.',
    error_quantity_unavailable: 'No tienes tantas raciones.',
    error_amount_invalid: 'Escribe una cantidad entera, mayor que cero.',
    error_other: 'No se pudo completar. Revisa tu conexión y vuelve a intentar.',
  },
  en: {
    title: 'Items',
    empty: 'You have no items yet. Buy on the market or move them from your company.',
    ration: (energy: number, max: number) =>
      `Restores ${String(energy)} energy, up to ${String(max)} per day.`,
    weapon: (multiplier: string) => `Multiplies your damage ×${multiplier}. One is spent per hit.`,
    fuel: 'Your country uses it to open battles.',
    raw: 'Raw material. Move it to your company’s depot or sell it on the market.',
    today: (energy: number, max: number) =>
      `Today you recovered ${String(energy)} of ${String(max)}.`,
    rations: 'Rations to eat',
    eat: 'Eat',
    eaten: (energy: number) => `You recovered ${String(energy)} energy.`,
    quantityInvalid: 'Write a whole quantity above zero.',
    error_food_limit: 'That would pass today’s maximum energy from food.',
    error_quantity_unavailable: 'You do not have that many rations.',
    error_amount_invalid: 'Write a whole quantity above zero.',
    error_other: 'It did not go through. Check your connection and try again.',
  },
});

const effectsSchema = z.array(
  z.object({
    code: z.string(),
    damage_multiplier: z.number().nullable(),
    ration_energy: z.number().int(),
    food_energy_daily_max: z.number().int(),
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

function useFoodToday() {
  const auth = useAuth();
  const userId = auth.status === 'signedIn' ? auth.session.user.id : '';
  return useQuery({
    queryKey: ['me', userId, 'food-today'],
    enabled: auth.status === 'signedIn',
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_food_today');
      if (error) throw error as Error;
      return z.number().int().parse(data);
    },
  });
}

/** The player's goods and what each is for; rations can be eaten here (Inventory canvas). */
export function InventoryPanel() {
  const copy = useMessages(messages);
  const { locale } = useLocale();
  const goodName = useGoodName();
  const inventory = useMyInventory();
  const effects = useEffects();
  const rows = inventory.data ?? [];
  const effectOf = (code: string) => effects.data?.find((effect) => effect.code === code);
  const rationEnergy = effects.data?.[0]?.ration_energy ?? 0;
  const foodMax = effects.data?.[0]?.food_energy_daily_max ?? 0;

  return (
    <Panel className={styles.panel} aria-labelledby="inventory-title">
      <h2 id="inventory-title" className="at-title-3">
        {copy.title}
      </h2>
      {inventory.isSuccess && rows.length === 0 ? (
        <p className={styles.muted}>{copy.empty}</p>
      ) : null}
      <ul className={panel.items}>
        {rows.map((line) => {
          const multiplier = effectOf(line.good_code)?.damage_multiplier;
          const description =
            line.good_code === 'ration'
              ? copy.ration(rationEnergy, foodMax)
              : multiplier
                ? copy.weapon(formatNumber(multiplier, locale))
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
              {line.good_code === 'ration' ? <Eat foodMax={foodMax} /> : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function Eat({ foodMax }: { foodMax: number }) {
  const copy = useMessages(messages);
  const food = useFoodToday();
  const queryClient = useQueryClient();
  const [key, renewKey] = useActionKey();
  const [quantityText, setQuantityText] = useState('1');
  const [problem, setProblem] = useState<string | null>(null);
  const [eaten, setEaten] = useState<number | null>(null);
  const quantity = /^\d{1,4}$/.test(quantityText.trim()) ? Number(quantityText.trim()) : 0;

  const eat = async () => {
    if (quantity <= 0) return;
    setProblem(null);
    setEaten(null);
    try {
      const rows = await act(supabase.rpc('eat_rations', { p_quantity: quantity, p_key: key }));
      setEaten(rows?.[0]?.energy_gained ?? null);
      renewKey();
    } catch (error) {
      setProblem(errorCode(error));
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    }
  };

  return (
    <div className={styles.form}>
      <p className={styles.muted}>{copy.today(food.data ?? 0, foodMax)}</p>
      <div className={styles.inline}>
        <Field
          label={copy.rations}
          value={quantityText}
          inputMode="numeric"
          autoComplete="off"
          error={quantity > 0 ? undefined : copy.quantityInvalid}
          onChange={(event) => {
            setQuantityText(event.target.value);
            renewKey();
          }}
        />
        <Button disabled={quantity <= 0} onClick={() => void eat()}>
          {copy.eat}
        </Button>
      </div>
      {problem ? <Note tone="error">{problemText(copy, problem)}</Note> : null}
      <div role="status">{eaten === null ? null : <Note tone="ok">{copy.eaten(eaten)}</Note>}</div>
    </div>
  );
}
