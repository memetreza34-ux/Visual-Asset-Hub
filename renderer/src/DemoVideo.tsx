import {
  AbsoluteFill,
  Easing,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const SCENE_SECONDS = 10;
const SCENES = [
  {
    kicker: 'PRODUCTION WORKFLOW',
    title: 'Visual Asset Hub',
    body: 'Von der Quelle bis zum fertigen Video – ein kontrollierter Workflow für Medien, Rechte und Rendering.',
    tags: ['Search', 'Review', 'Rights', 'Render'],
  },
  {
    kicker: '01 · DISCOVER',
    title: 'Quellen durchsuchen',
    body: 'Ein Suchfeld verbindet mehrere Medienquellen, ohne den restlichen Workflow an einen einzigen Anbieter zu koppeln.',
    tags: ['Pexels', 'Pixabay', 'Openverse'],
  },
  {
    kicker: '02 · INGEST',
    title: 'Gezielt in die Inbox',
    body: 'Nur ausgewählte Treffer werden geladen. Keine blinden Massendownloads – jedes Asset beginnt in einer kontrollierten Inbox.',
    tags: ['Inbox', 'Source metadata', 'Cache'],
  },
  {
    kicker: '03 · ANALYZE',
    title: 'FFmpeg analysiert automatisch',
    body: 'Auflösung, Dauer, FPS, Codec, Audio, Alpha-Kanal, Ausrichtung und SHA-256 entstehen ohne manuelle Eingabe.',
    tags: ['ffprobe', 'Thumbnail', 'SHA-256'],
  },
  {
    kicker: '04 · REVIEW',
    title: 'Im Browser prüfen',
    body: 'Preview öffnen, Metadaten ergänzen und erst danach freigeben. Der Mensch bleibt an der entscheidenden Stelle im Loop.',
    tags: ['Preview', 'Metadata', 'Approve'],
  },
  {
    kicker: '05 · RIGHTS',
    title: 'Quelle und Lizenz bleiben erhalten',
    body: 'Externe Medien können nicht versehentlich als eigene Produktion gespeichert werden. Nutzungsrechte werden serverseitig erzwungen.',
    tags: ['License', 'Attribution', 'Scopes'],
  },
  {
    kicker: '06 · LIBRARY',
    title: 'Freigegebene Assets werden suchbar',
    body: 'Kategorie, Tags, Motiv, Handlung, Stil und technische Daten machen die Bibliothek für spätere Produktionen wiederverwendbar.',
    tags: ['Catalog', 'Filters', 'Search'],
  },
  {
    kicker: '07 · PROJECT',
    title: 'Ein Video besteht aus Asset-IDs',
    body: 'Szenen referenzieren stabile Asset-IDs statt lose Dateien. Dadurch bleibt ein Projekt nachvollziehbar und reproduzierbar.',
    tags: ['Scenes', 'Asset IDs', 'Timeline'],
  },
  {
    kicker: '08 · GATE',
    title: 'Nur erlaubtes Material kommt weiter',
    body: 'Nicht freigegebene Assets oder fehlende YouTube-Rechte blockieren den Export schon vor dem Renderer.',
    tags: ['Approved only', 'Usage scope', 'Validation'],
  },
  {
    kicker: '09 · MANIFEST',
    title: 'Render-Manifest als klare Übergabe',
    body: 'Frames, Dauer, Quelle und Attributionen landen in einem deterministischen Manifest für den Schnitt- und Render-Schritt.',
    tags: ['Frames', 'Duration', 'Attribution'],
  },
  {
    kicker: '10 · REMOTION',
    title: 'Remotion rendert die Szenen',
    body: 'Der Renderer bekommt nur geprüfte Projektdateien, nutzt framebasierte Animationen und erzeugt reproduzierbare Ausgaben.',
    tags: ['React', 'Sequence', 'H.264'],
  },
  {
    kicker: 'END-TO-END TEST',
    title: '120 Sekunden. Ein kompletter Weg.',
    body: 'Dieser Film selbst ist der erste Render-Test: zwölf Szenen, exakt zwei Minuten, erzeugt direkt aus dem Visual-Asset-Hub-Repo.',
    tags: ['2:00', '1080p', '30 fps', 'GitHub Actions'],
  },
] as const;

const palette = [
  ['#08111f', '#153a6b', '#6ea8ff'],
  ['#0d1220', '#263d78', '#9eb7ff'],
  ['#10100f', '#4d3c1a', '#ffd67d'],
  ['#071413', '#174b42', '#79e0ca'],
  ['#120d17', '#4e2f68', '#cfa2f5'],
  ['#160d10', '#65303a', '#ff9dae'],
  ['#07121a', '#1f5068', '#7dd8ff'],
  ['#10100d', '#4a421a', '#e9dd74'],
  ['#0e1018', '#323d68', '#9baeff'],
  ['#0a1310', '#2d5c45', '#85e2aa'],
  ['#0e0d14', '#463568', '#c7a7ff'],
  ['#071019', '#16496f', '#7bcaff'],
] as const;

const Scene: React.FC<{index: number}> = ({index}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scene = SCENES[index];
  const [background, panel, accent] = palette[index];
  const duration = SCENE_SECONDS * fps;
  const enter = interpolate(frame, [0, 26], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const exit = interpolate(frame, [duration - 28, duration - 1], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const progress = interpolate(frame, [0, duration - 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const drift = interpolate(frame, [0, duration - 1], [-24, 34], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: background,
        color: '#f8fbff',
        fontFamily: 'Inter, Arial, sans-serif',
        opacity: exit,
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 78% 18%, ${panel} 0%, transparent 38%), radial-gradient(circle at 18% 86%, ${accent}22 0%, transparent 34%)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          right: 86 + drift,
          top: 96,
          width: 560,
          height: 560,
          border: `1px solid ${accent}50`,
          borderRadius: 120,
          rotate: `${interpolate(frame, [0, duration - 1], [-7, 7])}deg`,
          opacity: 0.45,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 170 - drift * 0.4,
          top: 186,
          width: 380,
          height: 380,
          borderRadius: 90,
          backgroundColor: `${accent}10`,
          border: `1px solid ${accent}32`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 110,
          right: 110,
          top: 88,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: enter,
          translate: `0 ${interpolate(enter, [0, 1], [16, 0])}px`,
        }}
      >
        <div style={{fontSize: 22, fontWeight: 800, letterSpacing: 4, color: accent}}>
          {scene.kicker}
        </div>
        <div style={{fontSize: 22, color: '#ffffff99'}}>
          {String(index + 1).padStart(2, '0')} / {SCENES.length}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 110,
          top: 220,
          width: 1050,
          opacity: enter,
          translate: `${interpolate(enter, [0, 1], [-42, 0])}px 0`,
        }}
      >
        <div
          style={{
            fontSize: 88,
            lineHeight: 0.98,
            fontWeight: 900,
            letterSpacing: -4.5,
            maxWidth: 1040,
          }}
        >
          {scene.title}
        </div>
        <div
          style={{
            marginTop: 42,
            maxWidth: 930,
            fontSize: 32,
            lineHeight: 1.5,
            color: '#d9e4f2',
            fontWeight: 450,
          }}
        >
          {scene.body}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 110,
          bottom: 145,
          display: 'flex',
          gap: 16,
          opacity: enter,
        }}
      >
        {scene.tags.map((tag, tagIndex) => {
          const tagEnter = interpolate(frame, [20 + tagIndex * 8, 44 + tagIndex * 8], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={tag}
              style={{
                padding: '13px 20px',
                borderRadius: 999,
                border: `1px solid ${accent}65`,
                backgroundColor: `${panel}99`,
                color: '#eef5ff',
                fontSize: 20,
                fontWeight: 700,
                opacity: tagEnter,
                translate: `0 ${interpolate(tagEnter, [0, 1], [14, 0])}px`,
              }}
            >
              {tag}
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 110,
          right: 110,
          bottom: 78,
          height: 5,
          borderRadius: 999,
          backgroundColor: '#ffffff18',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            borderRadius: 999,
            backgroundColor: accent,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const DemoVideo: React.FC = () => {
  const {fps} = useVideoConfig();
  const duration = SCENE_SECONDS * fps;

  return (
    <AbsoluteFill style={{backgroundColor: '#05070b'}}>
      {SCENES.map((_, index) => (
        <Sequence
          key={index}
          from={index * duration}
          durationInFrames={duration}
          name={`Demo ${String(index + 1).padStart(2, '0')}`}
        >
          <Scene index={index} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const DEMO_DURATION_IN_FRAMES = SCENES.length * SCENE_SECONDS * 30;
