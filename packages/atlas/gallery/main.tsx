import '../src/styles.css';

import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Brand, BrandMark } from '../src/components/Brand';
import { Button } from '../src/components/Button';
import { CountryBar, CountryBarNav, ResourceChip } from '../src/components/CountryBar';
import { CountryPicker } from '../src/components/CountryPicker';
import { Document } from '../src/components/Document';
import { Field } from '../src/components/Field';
import { GoldIcon } from '../src/components/GameIcons';
import { Note, Toast, ToastRegion } from '../src/components/Note';
import { OptionGroup } from '../src/components/Option';
import { Panel, PanelBody, PanelHeader } from '../src/components/Panel';
import { Scoreboard } from '../src/components/Scoreboard';
import { SectionHeader } from '../src/components/SectionHeader';
import { Segmented, Switch } from '../src/components/Segmented';
import { Silhouette } from '../src/components/Silhouette';
import { Stage } from '../src/components/Stage';
import { Status } from '../src/components/Status';
import { Steps } from '../src/components/Steps';
import { EnergyMeter, ProgressMeter, SplitTrack } from '../src/components/Track';

import styles from './gallery.module.css';
import { argentinaSilhouette, cuyoSilhouette, uruguaySilhouette } from './silhouettes';

const countries = [
  { code: 'ARG', name: 'Argentina' },
  { code: 'BRA', name: 'Brasil' },
  { code: 'CHL', name: 'Chile' },
  { code: 'PRY', name: 'Paraguay' },
  { code: 'MEX', name: 'México' },
  { code: 'USA', name: 'Estados Unidos' },
  { code: 'CAN', name: 'Canadá' },
  { code: 'ESP', name: 'España' },
  { code: 'PRT', name: 'Portugal' },
  { code: 'FRA', name: 'Francia' },
  { code: 'ITA', name: 'Italia' },
  { code: 'DEU', name: 'Alemania' },
  { code: 'GBR', name: 'Reino Unido' },
];

const battleSplit = { bottomColor: '#6CACE4', topColor: '#D0453A', bottomShare: 0.58 };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section} aria-label={title}>
      <h2 className="at-title-2">{title}</h2>
      {children}
    </section>
  );
}

function Gallery() {
  const [country, setCountry] = useState<string | null>('ARG');
  const [start, setStart] = useState<'arg' | 'bra' | null>('arg');
  const [layer, setLayer] = useState<'countries' | 'battles' | 'resources'>('countries');
  const [alerts, setAlerts] = useState(true);
  const [digest, setDigest] = useState(false);

  return (
    <>
      <CountryBar
        brand={
          <a href="#inicio">
            <BrandMark size={30} label="Concordia, ir al inicio" />
          </a>
        }
        navigation={
          <CountryBarNav
            label="Principal"
            links={['Inicio', 'Mapa', 'Economía', 'Guerra', 'Argentina'].map((section, index) => (
              <a
                key={section}
                href={`#${section}`}
                {...(index === 0 ? { 'aria-current': 'page' } : {})}
              >
                {section}
              </a>
            ))}
          />
        }
        resources={
          <>
            <ResourceChip icon={<GoldIcon />} label="1.240 Oro">
              1.240
            </ResourceChip>
            <ResourceChip>38.450 Crédito</ResourceChip>
            <EnergyMeter value={84} max={100} label="Energía" valueText="84 de 100" />
          </>
        }
      />
      <main className={styles.page} id="inicio">
        <h1 className="at-title-1">Atlas · galería de componentes</h1>

        <Section title="Marca">
          <div className={styles.row}>
            <Brand />
            <BrandMark version="appIcon" size={48} label="Concordia" />
            <BrandMark
              size={48}
              disputedColor="var(--nation)"
              label="Concordia con la región del jugador"
            />
          </div>
        </Section>

        <Section title="Botones">
          <div className={styles.row}>
            <Button>Entrar a Concordia</Button>
            <Button variant="war" icon="swords">
              Entrar a combatir
            </Button>
            <Button variant="secondary">Ver cómo se juega</Button>
            <Button variant="ghost" icon="back">
              Volver
            </Button>
          </div>
          <div className={styles.row}>
            <Button size="large">Crear mi ciudadano</Button>
            <Button disabled>Ya trabajaste hoy</Button>
          </div>
          <div className={styles.inkRow}>
            <Button variant="light">Elegir mi país</Button>
            <Button variant="outline-light">Iniciar sesión</Button>
          </div>
        </Section>

        <Section title="Estados">
          <div className={styles.row}>
            <Status tone="live">En vivo</Status>
            <Status>Ronda 3 de 5</Status>
            <Status tone="ok" icon="check">
              Aprobada
            </Status>
            <Status tone="warning">Quedan pocos kits</Status>
            <Status tone="info">Congreso</Status>
            <Status tone="nation">Día 1 de 7</Status>
          </div>
        </Section>

        <Section title="Paneles">
          <div className={styles.row} style={{ alignItems: 'stretch' }}>
            <Panel style={{ width: 280 }} aria-label="Tu día">
              <PanelHeader title="Tu día" action={<Status tone="warning">84 de energía</Status>} />
              <PanelBody className="at-support">
                Lo cotidiano: listas, formularios, tu día.
              </PanelBody>
            </Panel>
            <Panel surface="ink" style={{ width: 240, padding: '20px 22px' }} aria-label="Tinta">
              <h3 className="at-title-3">Tinta</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--on-ink-muted)' }}>
                Decisiones y marcadores.
              </p>
            </Panel>
            <Panel
              surface="nation"
              style={{ width: 240, padding: '20px 22px' }}
              aria-label="Argentina"
            >
              <span className="at-place" style={{ fontSize: 28 }}>
                Argentina
              </span>
              <p style={{ margin: '6px 0 0' }}>Lo que es de tu país.</p>
            </Panel>
          </div>
        </Section>

        <Section title="Escenario">
          <Stage aria-label="Cuyo en disputa">
            <div className={styles.stageContent}>
              <div style={{ width: 110 }}>
                <Silhouette {...cuyoSilhouette} label="Cuyo" split={battleSplit} />
              </div>
              <div className={styles.stageText}>
                <Status tone="live">En vivo, ronda 3 de 5</Status>
                <h3 className="at-display" style={{ fontSize: 48, lineHeight: 1 }}>
                  Mientras no estabas, España ocupó Cuyo.
                </h3>
                <p style={{ margin: 0 }}>La ronda 3 se define esta tarde.</p>
              </div>
            </div>
          </Stage>
        </Section>

        <Section title="Marcador">
          <Scoreboard
            summary="Batalla por Cuyo: Argentina 58 %, España 42 %"
            left={{ country: 'Argentina', percent: 58, role: 'Defiende su región', tone: 'own' }}
            right={{ country: 'España', percent: 42, role: 'Ocupa desde el lunes', tone: 'rival' }}
            region={<Silhouette {...cuyoSilhouette} label="Cuyo" split={battleSplit} />}
          />
        </Section>

        <Section title="Pistas">
          <div className={styles.column}>
            <SplitTrack
              leftShare={0.58}
              left={{ name: 'Argentina', color: 'var(--country-arg)', valueText: '58 %' }}
              right={{ name: 'España', color: 'var(--country-esp)', valueText: '42 %' }}
            />
            <ProgressMeter value={6420} max={8000} label="Experiencia" valueText="6.420 de 8.000" />
          </div>
        </Section>

        <Section title="Campos">
          <div className={styles.column}>
            <Field label="Correo" type="email" defaultValue="camila@ejemplo.com" />
            <Field
              label="Correo con error"
              defaultValue="camila@"
              error="Falta el dominio, por ejemplo camila@gmail.com."
            />
            <Field
              label="Nombre del ciudadano"
              defaultValue="Camila Ríos"
              success="Nombre disponible"
            />
          </div>
        </Section>

        <Section title="Selector de país">
          <div style={{ maxWidth: 640 }}>
            <CountryPicker
              label="País"
              countries={countries}
              value={country}
              onChange={setCountry}
              searchLabel="Buscar país"
              countText="13 países en juego"
              resultsText={(count, query) =>
                count === 0 ? `Ningún país coincide con «${query}».` : `${count} países coinciden.`
              }
              otherLabel="Otro país"
            />
          </div>
        </Section>

        <Section title="Opciones">
          <div className={styles.column}>
            <OptionGroup
              label="Dónde empezar"
              value={start}
              onChange={setStart}
              options={[
                {
                  value: 'arg',
                  title: 'Argentina',
                  description: '3.412 ciudadanos, en guerra con España',
                  place: true,
                  media: (
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 4,
                        background: 'var(--country-arg)',
                      }}
                    />
                  ),
                },
                {
                  value: 'bra',
                  title: 'Brasil',
                  description: '5.980 ciudadanos, el país más grande',
                  place: true,
                  media: (
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 4,
                        background: 'var(--country-bra)',
                      }}
                    />
                  ),
                },
              ]}
            />
          </div>
        </Section>

        <Section title="Segmentado e interruptor">
          <div className={styles.row} style={{ gap: 24 }}>
            <Segmented
              label="Capa"
              value={layer}
              onChange={setLayer}
              segments={[
                { value: 'countries', label: 'Países' },
                { value: 'battles', label: 'Batallas' },
                { value: 'resources', label: 'Recursos' },
              ]}
            />
            <Switch label="Avisos de batallas" checked={alerts} onChange={setAlerts} />
            <Switch label="Resumen por correo" checked={digest} onChange={setDigest} />
          </div>
        </Section>

        <Section title="Notas y avisos">
          <div className={styles.column}>
            <Note tone="info">
              Al registrarte ya eres ciudadano. Los primeros 7 días tu daño cuenta a la mitad.
            </Note>
            <Note tone="warning">Taller Ríos tiene hierro para 1 día.</Note>
            <Note tone="error">
              No se pudo comprar: el vendedor ya no tiene stock. Elige otra oferta.
            </Note>
            <Note tone="ok">Guardamos tus ajustes.</Note>
            <ToastRegion label="Avisos">
              <Toast>Cobraste 36,96 Crédito.</Toast>
            </ToastRegion>
          </div>
        </Section>

        <Section title="Pasos">
          <Panel style={{ maxWidth: 520, padding: 20 }} aria-label="Registro">
            <Steps
              label="Pasos del registro"
              steps={['Tus datos', 'Dónde empezar', 'Tu correo']}
              current={1}
            />
          </Panel>
        </Section>

        <Section title="Siluetas">
          <div className={styles.row} style={{ alignItems: 'flex-end', gap: 24 }}>
            <div style={{ width: 90 }}>
              <Silhouette {...cuyoSilhouette} label="Cuyo" fill="var(--country-esp)" />
            </div>
            <div style={{ width: 90 }}>
              <Silhouette {...uruguaySilhouette} label="Uruguay, fuera de juego" inactive />
            </div>
          </div>
        </Section>

        <Section title="Documento">
          <div style={{ padding: '20px 30px' }}>
            <Document
              heading="Documento de ciudadanía"
              country="República Argentina"
              silhouette={
                <Silhouette
                  {...argentinaSilhouette}
                  label="Argentina, tu región es Buenos Aires"
                  fill="var(--nation)"
                  borders
                />
              }
              fields={[
                { label: 'Nombre', value: 'Camila Ríos', kind: 'name' },
                { label: 'Número', value: 'ARG-003413', kind: 'number' },
                { label: 'Región', value: 'Buenos Aires', kind: 'place' },
              ]}
            />
          </div>
        </Section>

        <Section title="Cabecera de sección">
          <SectionHeader
            title="Mercado"
            subtitle="Cada país tiene su propio mercado. Compras con Crédito y la mercancía llega a tu inventario al instante."
            illustration="market"
          />
        </Section>
      </main>
    </>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root');
createRoot(container).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
);
