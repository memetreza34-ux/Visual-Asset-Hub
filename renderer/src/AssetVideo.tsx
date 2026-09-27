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

const SceneMedia: React.FC<{scene: RenderScene; fps: number}> = ({scene, fps}) => {
  const frame = useCurrentFrame();
  const duration = scene.durationInFrames;
  const fade = Math.max(1, Math.min(Math.round(fps * 0.16), Math.floor((duration - 1) / 3)));
  const fadeOutStart = Math.max(fade + 1, duration - fade - 1);
  const opacity =
    duration < 6
      ? 1
      : interpolate(frame, [0, fade, fadeOutStart, duration - 1], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        });
  const scale = interpolate(frame, [0, Math.max(1, duration - 1)], [1, 1.025], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fit = scene.fit === 'contain' ? 'contain' : 'cover';
  const src = sourceFor(scene.asset.source);

  if (['video', 'animation', 'screen-recording', 'overlay'].includes(scene.asset.type)) {
    return (
      <Video
        src={src}
        muted
        trimBefore={Math.max(0, Math.round((scene.trimStartSeconds ?? 0) * fps))}
        style={{
          width: '100%',
          height: '100%',
          objectFit: fit,
          opacity,
          scale,
        }}
      />
    );
  }

  return (
    <CanvasImage
      src={src}
      style={{
        width: '100%',
        height: '100%',
        objectFit: fit,
        opacity,
        scale,
      }}
    />
  );
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
