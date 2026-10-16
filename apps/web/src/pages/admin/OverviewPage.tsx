import { Note } from '@concordia/atlas/Note';
import { Panel } from '@concordia/atlas/Panel';
import { Link } from '@tanstack/react-router';

import { consoleMessages } from '../../features/admin/messages';
import { useOverview } from '../../features/admin/queries';
import { formatDate, formatMoney, formatNumber, useLocale, useMessages } from '../../i18n';

import styles from './AdminPage.module.css';
import { ConsolePage } from './ConsolePage';
import { dayToDate } from './describeState';
import { overviewMessages } from './overviewMessages';

/** `/admin`: today's figures of players, moderation and GOLD (AdminPlayers canvas, «Hoy»). */
export function OverviewPage() {
  const copy = useMessages(overviewMessages);
  const shared = useMessages(consoleMessages);
  const { locale } = useLocale();
  const overview = useOverview();
  const data = overview.data;
  const count = (value: number) => formatNumber(value, locale);
  const gold = (value: number) => shared.goldAmount(formatMoney(value, locale));

  return (
    <ConsolePage
      title={copy.title}
      {...(data ? { intro: copy.intro(formatDate(dayToDate(data.game_day), locale)) } : {})}
    >
      {overview.isError ? <Note tone="error">{copy.loadFailed}</Note> : null}
      {data ? (
        <div className={styles.columns}>
          <Panel className={styles.section} aria-labelledby="overview-moderation">
            <h2 id="overview-moderation" className="at-title-3">
              {copy.moderationTitle}
            </h2>
            <dl className={styles.stats}>
              <div>
                <dt>{copy.openReports}</dt>
                <dd>{count(data.open_reports)}</dd>
              </div>
              <div>
                <dt>{copy.openSignals}</dt>
                <dd>{count(data.open_signals)}</dd>
              </div>
              <div>
                <dt>{copy.suspended}</dt>
                <dd>{count(data.suspended)}</dd>
              </div>
              <div>
                <dt>{copy.muted}</dt>
                <dd>{count(data.muted)}</dd>
              </div>
            </dl>
            <Link to="/admin/reports">{copy.toReports}</Link>
          </Panel>
          <Panel className={styles.section} aria-labelledby="overview-players">
            <h2 id="overview-players" className="at-title-3">
              {copy.playersTitle}
            </h2>
            <dl className={styles.stats}>
              <div>
                <dt>{copy.citizens}</dt>
                <dd>{count(data.citizens)}</dd>
              </div>
              <div>
                <dt>{copy.newToday}</dt>
                <dd>{count(data.new_today)}</dd>
              </div>
              <div>
                <dt>{copy.active}</dt>
                <dd>{count(data.active_24h)}</dd>
              </div>
              <div>
                <dt>{copy.waiting}</dt>
                <dd>{count(data.waiting)}</dd>
              </div>
              <div>
                <dt>{copy.countries}</dt>
                <dd>{count(data.countries_in_play)}</dd>
              </div>
            </dl>
          </Panel>
          <Panel className={styles.section} aria-labelledby="overview-gold">
            <h2 id="overview-gold" className="at-title-3">
              {copy.goldTitle}
            </h2>
            <dl className={styles.stats}>
              <div>
                <dt>{copy.held}</dt>
                <dd>{gold(data.gold_held)}</dd>
              </div>
              <div>
                <dt>{copy.minted}</dt>
                <dd>{gold(data.gold_minted)}</dd>
              </div>
              <div>
                <dt>{copy.burned}</dt>
                <dd>{gold(data.gold_burned)}</dd>
              </div>
              <div>
                <dt>{copy.mintedToday}</dt>
                <dd>{gold(data.gold_minted_today)}</dd>
              </div>
              <div>
                <dt>{copy.burnedToday}</dt>
                <dd>{gold(data.gold_burned_today)}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      ) : null}
    </ConsolePage>
  );
}
