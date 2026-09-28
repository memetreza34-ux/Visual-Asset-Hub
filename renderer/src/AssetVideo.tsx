import {Audio, Video} from '@remotion/media';
import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';

export type RenderScene = {
  id: string;
  title: string;
  fromFrame: number;
  durationInFrames: number;
  durationSeconds: number;
  trimStartSeconds?: number;
  fit?: 'cover' | 'contain';
  transition?: 'cut' | 'fade';
  presentation?: 'auto' | 'vertical-blur' | 'contain';
  asset: {
    id: string;
    type: string;
    title: string;
    source: string;
    orientation?: string;
  };
};

export type RenderManifest = {
  project: {
    id: string;
    title: string;
    width: number;
    height: number;
    fps: number;
    totalFrames: number;
    workflowVersion?: number;
  };
  voiceover?: {
    source: string;
    durationSeconds: number;
    sha256?: string | null;
    sourceType?: string;
    generatedByPipeline?: boolean;
  } | null;
  scenes: RenderScene[];
};

const sourceFor = (source: string) =>
  /^https?:\/\//i.test(source) ? source : staticFile(source);

const sceneOpacity = (frame: number, duration: number, fps: number, transition: RenderScene['transition']) => {
  if (transition !== 'fade' || duration < 6) return 1;
  const fade = Math.max(1, Math.min(Math.round(fps * 0.14), Math.floor((duration - 1) / 3)));
  const fadeOutStart = Math.max(fade + 1, duration - fade - 1);
  return interpolate(frame, [0, fade, fadeOutStart, duration - 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
};

const DocumentaryImage: React.FC<{scene: RenderScene; fps: number}> = ({scene, fps}) => {
  const frame = useCurrentFrame();
  const duration = scene.durationInFrames;
  const opacity = sceneOpacity(frame, duration, fps, scene.transition);
  const progress = interpolate(frame, [0, Math.max(1, duration - 1)], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const direction = hash(scene.id) % 4;
  const scale = 1.015 + progress * 0.035;
  const x = direction === 0 ? -1.4 + progress * 2.8 : direction === 1 ? 1.4 - progress * 2.8 : 0;
  const y = direction === 2 ? -1.2 + progress * 2.4 : direction === 3 ? 1.2 - progress * 2.4 : 0;
  return (
    <CanvasImage
      src={sourceFor(scene.asset.source)}
      style={{
        width: '100%',
        height: '100%',
        objectFit: scene.presentation === 'contain' || scene.fit === 'contain' ? 'contain' : 'cover',
        opacity,
        transform: `translate(${x}%, ${y}%) scale(${scale})`,
      }}
    />
  );
};

const StandardVideo: React.FC<{scene: RenderScene; fps: number}> = ({scene, fps}) => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scene.durationInFrames, fps, scene.transition);
  return (
    <Video
      src={sourceFor(scene.asset.source)}
      muted
      trimBefore={Math.max(0, Math.round((scene.trimStartSeconds ?? 0) * fps))}
      style={{
        width: '100%',
        height: '100%',
        objectFit: scene.presentation === 'contain' || scene.fit === 'contain' ? 'contain' : 'cover',
        opacity,
      }}
    />
  );
};

const VerticalBlurVideo: React.FC<{scene: RenderScene; fps: number}> = ({scene, fps}) => {
  const frame = useCurrentFrame();
  const opacity = sceneOpacity(frame, scene.durationInFrames, fps, scene.transition);
  const src = sourceFor(scene.asset.source);
  const trimBefore = Math.max(0, Math.round((scene.trimStartSeconds ?? 0) * fps));
  return (
    <AbsoluteFill style={{backgroundColor: '#090909', overflow: 'hidden', opacity}}>
      <Video
        src={src}
        muted
        trimBefore={trimBefore}
        style={{
          position: 'absolute',
          width: '112%',
          height: '112%',
          left: '-6%',
          top: '-6%',
          objectFit: 'cover',
          filter: 'blur(30px) saturate(0.9) brightness(0.62)',
          transform: 'scale(1.08)',
        }}
      />
      <AbsoluteFill style={{backgroundColor: 'rgba(0,0,0,0.12)'}} />
      <Video
        src={src}
        muted
        trimBefore={trimBefore}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 26px rgba(0,0,0,0.45))',
        }}
      />
    </AbsoluteFill>
  );
};

const SceneMedia: React.FC<{scene: RenderScene; fps: number}> = ({scene, fps}) => {
  const isVideo = ['video', 'animation', 'screen-recording', 'overlay'].includes(scene.asset.type);
  if (!isVideo) return <DocumentaryImage scene={scene} fps={fps} />;
  const vertical = scene.presentation === 'vertical-blur' || (scene.presentation !== 'contain' && scene.asset.orientation === 'vertical');
  return vertical ? <VerticalBlurVideo scene={scene} fps={fps} /> : <StandardVideo scene={scene} fps={fps} />;
};

export const AssetVideo: React.FC<{manifest: RenderManifest}> = ({manifest}) => {
  if (manifest.project.workflowVersion === 2) {
    if (!manifest.voiceover?.source) throw new Error('Workflow v2 requires the user voiceover master track.');
    if (manifest.voiceover.sourceType !== 'user-provided' || manifest.voiceover.generatedByPipeline === true) {
      throw new Error('Workflow v2 refuses generated or replacement voiceover audio.');
    }
  }

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {manifest.voiceover?.source ? (
        <Audio
          src={sourceFor(manifest.voiceover.source)}
          durationInFrames={manifest.project.totalFrames}
        />
      ) : null}
      {manifest.scenes.map((scene) => (
        <Sequence
          key={scene.id}
          from={scene.fromFrame}
          durationInFrames={scene.durationInFrames}
          name={scene.title}
        >
          <AbsoluteFill>
            <SceneMedia scene={scene} fps={manifest.project.fps} />
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

function hash(value: string) {
  let result = 0;
  for (let i = 0; i < value.length; i++) result = ((result << 5) - result + value.charCodeAt(i)) | 0;
  return Math.abs(result);
}
