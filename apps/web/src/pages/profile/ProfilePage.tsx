import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { ProgressMeter } from '@concordia/atlas/Track';
import { Link } from '@tanstack/react-router';
import { useId } from 'react';
import type { ReactNode } from 'react';

import type { Citizen } from '../../features/auth/useCitizen';
import { initials } from '../../features/profile/initials';
import { rankMessages } from '../../features/profile/rankMessages';
import { useEnergy, useProfile } from '../../features/profile/useProfile';
import type { Profile } from '../../features/profile/useProfile';
import { CitizenOnly, GameShell } from '../../features/shell/GameShell';
import { useWorld } from '../../features/world/useWorld';
import { formatDate, formatNumber, useLocale, useMessages } from '../../i18n';
import { useDocumentTitle } from '../../lib/useDocumentTitle';

import { messages } from './messages';
import styles from './ProfilePage.module.css';

/** `/profile`: the signed-in player's attributes (Profile canvas). */
export function ProfilePage() {
  return <CitizenOnly>{(citizen) => <ProfileScreen citizen={citizen} />}</CitizenOnly>;
}

function ProfileScreen({ citizen }: { citizen: Citizen }) {
  const copy = useMessages(messages);
  const profile = useProfile();
  return (
    <GameShell>
      {profile.data ? (
        <ProfileContent profile={profile.data} citizen={citizen} />
      ) : profile.isError ? (
        <main className={styles.main}>
          <Note tone="error">{copy.loadFailed}</Note>
        </main>
      ) : null}
    </GameShell>
  );
}

function ProfileContent({ profile, citizen }: { profile: Profile; citizen: Citizen }) {
  const copy = useMessages(messages);
  const ranks = useMessages(rankMessages);
  const { locale } = useLocale();
  useDocumentTitle(copy.documentTitle(profile.name));
  const world = useWorld();
  const country = world.data?.countries.get(profile.country_code);
  const countryName = country
    ? locale === 'es'
      ? country.name_es
      : country.name_en
    : profile.country_code;
  const regionName = world.data?.regions.get(profile.region_code)?.name ?? profile.region_code;
  const energy = useEnergy(profile.energyReading) ?? profile.energy;
  const number = (value: number) => formatNumber(value, locale);
  const compact = (value: number) =>
    formatNumber(value, locale, { notation: 'compact', maximumFractionDigits: 2 });
  const joined = formatDate(profile.joined_at, locale);
  const levelSpan = profile.next_level_experience - profile.level_experience;
  const levelProgress = profile.experience - profile.level_experience;
  const rankName = ranks.rankName(profile.rank_step);

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.avatar} aria-hidden="true">
            {initials(profile.name)}
          </span>
          <div className={styles.identity}>
            <h1 className="at-display">{profile.name}</h1>
            <ul className={styles.tags}>
              <li className={styles.countryTag}>
                <span className="at-place-s">{countryName}</span>
              </li>
              <li>{rankName}</li>
              <li>{copy.playingSince(joined)}</li>
            </ul>
          </div>
        </div>
      </section>

      <main className={styles.main}>
        <nav aria-label={copy.sections} className={styles.tabs}>
          <Link to="/profile" activeProps={{ 'aria-current': 'page' }}>
            {copy.myProfile}
          </Link>
          <Link to="/citizenship/change">{copy.changeCountry}</Link>
        </nav>

        <div className={styles.stats}>
          <Stat
            label={copy.level}
            value={number(profile.level)}
            note={copy.experience(
              number(profile.experience),
              number(profile.next_level_experience),
            )}
          >
            <ProgressMeter
              value={levelProgress}
              max={levelSpan}
              label={copy.experienceToLevel(profile.level + 1)}
              valueText={copy.of(number(levelProgress), number(levelSpan))}
            />
          </Stat>
          <Stat label={copy.health} value={number(profile.health)} note={copy.healthNote}>
            <ProgressMeter
              value={profile.health}
              max={profile.health_max}
              label={copy.health}
              valueText={copy.of(number(profile.health), number(profile.health_max))}
            />
          </Stat>
          <Stat label={copy.strength} value={number(profile.strength)} note={copy.strengthNote} />
          <RankStat profile={profile} rankName={rankName} />
          <Stat label={copy.damage} value={compact(profile.damage)} note={copy.damageNote} />
          <Stat
            label={copy.influence}
            value={number(profile.influence)}
            note={copy.influenceNote}
          />
          <Stat
            label={copy.energy}
            value={number(energy)}
            note={
              energy >= profile.energy_max
                ? copy.full
                : copy.recharge(profile.energy_per_hour, profile.energy_max)
            }
          />
        </div>

        <Panel className={styles.path} aria-labelledby="profile-path">
          <h2 id="profile-path" className="at-title-2">
            {copy.path}
          </h2>
          <dl>
            <div>
              <dt>{copy.livesIn}</dt>
              <dd className="at-place-s">{regionName}</dd>
            </div>
            <div>
              <dt>{copy.citizenship}</dt>
              <dd>
                {copy.citizenshipSince(countryName, formatDate(citizen.citizen_since, locale))}
              </dd>
            </div>
            <div>
              <dt>{copy.number}</dt>
              <dd>{profile.citizen_code}</dd>
            </div>
          </dl>
        </Panel>
      </main>
    </>
  );
}

/** The rank and the military experience toward the next step; none past General V. */
function RankStat({ profile, rankName }: { profile: Profile; rankName: string }) {
  const copy = useMessages(messages);
  const ranks = useMessages(rankMessages);
  const { locale } = useLocale();
  const number = (value: number) => formatNumber(value, locale);
  if (profile.next_rank_xp === null) {
    return (
      <Stat label={copy.rank} value={rankName} note={copy.topRank(number(profile.military_xp))} />
    );
  }
  const span = profile.next_rank_xp - profile.rank_xp;
  const progress = profile.military_xp - profile.rank_xp;
  return (
    <Stat
      label={copy.rank}
      value={rankName}
      note={copy.militaryXp(number(profile.military_xp), number(profile.next_rank_xp))}
    >
      <ProgressMeter
        value={progress}
        max={span}
        label={copy.militaryXpTo(ranks.rankName(profile.rank_step + 1))}
        valueText={copy.of(number(progress), number(span))}
      />
    </Stat>
  );
}

function Stat({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: string;
  note: string;
  children?: ReactNode;
}) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId} className={styles.stat}>
      <span id={labelId} className={styles.statLabel}>
        {label}
      </span>
      <span className="at-figure">{value}</span>
      {children}
      <span className={styles.statNote}>{note}</span>
    </div>
  );
}
