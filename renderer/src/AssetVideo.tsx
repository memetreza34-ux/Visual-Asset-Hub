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
import {EditorialOverlays, type RenderOverlay} from './EditorialOverlays';

type MotionSpec = {
  type?: 'static' | 'push' | 'pull' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';
  scaleFrom?: number;
  scaleTo?: number;
  description?: string;
} | null;

type FocusSpec = {x: number; y: number} | null;

export type RenderScene = {
  id: string;
  beatId?: string | null;
  title: string;
  fromFrame: number;
  durationInFrames: number;
  durationSeconds: number;
  trimStartSeconds?: number;
  fit?: 'cover' | 'contain';
  transition?: 'cut' | 'fade';
  presentation?: 'auto' | 'vertical-blur' | 'contain' | 'article' | 'document' | 'map' | 'freeze-frame' | 'headline';
  motion?: MotionSpec;
  focus?: FocusSpec;
  overlays?: RenderOverlay[];
  asset: {
    id: string;
    type: string;
    title: string;
    source: string;
    preview?: string | null;
    orientation?: string;
  };
};

export type RenderManifest = {
  policy?: {networkAllowed?: boolean; phase1AssetsOnly?: boolean};
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

const sourceFor = (source: string) => /^https?:\/\//i.test(source) ? source : staticFile(source);
const objectPosition = (scene: RenderScene) => scene.focus ? `${clamp(scene.focus.x, 0, 100)}% ${clamp(scene.focus.y, 0, 100)}%` : '50% 50%';

const sceneOpacity = (frame: number, duration: number, fps: number, transition: RenderScene['transition']) => {
  if (transition !== 'fade' || duration < 6) return 1;
  const fade = Math.max(1, Math.min(Math.round(fps * 0.14), Math.floor((duration - 1) / 3)));
  const fadeOutStart = Math.max(fade + 1, duration - fade - 1);
  return interpolate(frame, [0, fade, fadeOutStart, duration - 1], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
};

const progressFor = (frame: number, duration: number) => interpolate(frame, [0, Math.max(1, duration - 1)], [0, 1], {
  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
});

const motionTransform = (scene: RenderScene, progress: number) => {
  const type = scene.motion?.type || 'push';
  if (type === 'static') return 'translate(0%, 0%) scale(1)';
  const defaultFrom = type === 'pull' ? 1.055 : 1.015;
  const defaultTo = type === 'pull' ? 1.015 : 1.055;
  const scaleFrom = finite(scene.motion?.scaleFrom, defaultFrom);
  const scaleTo = finite(scene.motion?.scaleTo, defaultTo);
  const scale = scaleFrom + (scaleTo - scaleFrom) * progress;
  let x = 0;
  let y = 0;
  if (type === 'pan-left') x = 1.8 - progress * 3.6;
  if (type === 'pan-right') x = -1.8 + progress * 3.6;
  if (type === 'pan-up') y = 1.5 - progress * 3;
  if (type === 'pan-down') y = -1.5 + progress * 3;
  return `translate(${x}%, ${y}%) scale(${scale})`;
};

const DocumentaryImage: React.FC<{scene: RenderScene; fps: number}> = ({scene, fps}) => {
  const frame = useCurrentFrame();
  const progress = progressFor(frame, scene.durationInFrames);
  return (
    <CanvasImage
      src={sourceFor(scene.asset.source)}
      style={{
        width: '100%', height: '100%',
        objectFit: scene.presentation === 'contain' || scene.fit === 'contain' ? 'contain' : 'cover',
        objectPosition: objectPosition(scene),
        opacity: sceneOpacity(frame, scene.durationInFrames, fps, scene.transition),
        transform: motionTransform(scene, progress),
      }}
    />
  );
};

const ArticleScreenshot: React.FC<{scene: RenderScene; fps: number}> = ({scene, fps}) => {
  const frame = useCurrentFrame();
  const progress = progressFor(frame, scene.durationInFrames);
  const scale = 1.02 + progress * 0.035;
  const y = interpolate(progress, [0, 1], [1.2, -3.2]);
  return (
    <AbsoluteFill style={{backgroundColor: '#101010', overflow: 'hidden', opacity: sceneOpacity(frame, scene.durationInFrames, fps, scene.transition)}}>
      <CanvasImage
        src={sourceFor(scene.asset.source)}
        style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:scene.focus ? objectPosition(scene) : '50% 0%',transform:`translateY(${y}%) scale(${scale})`,filter:'contrast(1.02) saturate(0.95)'}}
      />
      <AbsoluteFill style={{boxShadow: 'inset 0 0 110px rgba(0,0,0,0.32)'}} />
    </AbsoluteFill>
  );
};

const MapImage: React.FC<{scene: RenderScene; fps: number}> = ({scene, fps}) => {
  const frame = useCurrentFrame();
  const progress = progressFor(frame, scene.durationInFrames);
  return (
    <AbsoluteFill style={{backgroundColor:'#0b0e11',overflow:'hidden',opacity:sceneOpacity(frame,scene.durationInFrames,fps,scene.transition)}}>
      <CanvasImage src={sourceFor(scene.asset.source)} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:objectPosition(scene),transform:motionTransform({...scene,motion:scene.motion || {type:'push',scaleFrom:1.02,scaleTo:1.06}},progress),filter:'saturate(0.9) contrast(1.04) brightness(0.9)'}} />
      <AbsoluteFill style={{background:'radial-gradient(circle at 50% 48%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.26) 100%)'}} />
    </AbsoluteFill>
  );
};

const FreezeFrame: React.FC<{scene: RenderScene; fps: number}> = ({scene, fps}) => {
  const frame = useCurrentFrame();
  const freezeSource = scene.asset.type === 'image' ? scene.asset.source : scene.asset.preview;
  if (!freezeSource) return <StandardVideo scene={scene} fps={fps} />;
  const progress = progressFor(frame, scene.durationInFrames);
  return (
    <AbsoluteFill style={{backgroundColor:'#080808',overflow:'hidden',opacity:sceneOpacity(frame,scene.durationInFrames,fps,scene.transition)}}>
      <CanvasImage src={sourceFor(freezeSource)} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:objectPosition(scene),transform:motionTransform(scene,progress)}} />
      <AbsoluteFill style={{boxShadow:'inset 0 0 90px rgba(0,0,0,0.24)'}} />
    </AbsoluteFill>
  );
};

const StandardVideo: React.FC<{scene: RenderScene; fps: number}> = ({scene, fps}) => {
  const frame = useCurrentFrame();
  return (
    <Video
      src={sourceFor(scene.asset.source)}
      muted
      trimBefore={Math.max(0, Math.round((scene.trimStartSeconds ?? 0) * fps))}
      style={{width:'100%',height:'100%',objectFit:scene.presentation === 'contain' || scene.fit === 'contain' ? 'contain' : 'cover',objectPosition:objectPosition(scene),opacity:sceneOpacity(frame,scene.durationInFrames,fps,scene.transition)}}
    />
  );
};

const VerticalBlurVideo: React.FC<{scene: RenderScene; fps: number}> = ({scene, fps}) => {
  const frame = useCurrentFrame();
  const src = sourceFor(scene.asset.source);
  const trimBefore = Math.max(0, Math.round((scene.trimStartSeconds ?? 0) * fps));
  return (
    <AbsoluteFill style={{backgroundColor:'#090909',overflow:'hidden',opacity:sceneOpacity(frame,scene.durationInFrames,fps,scene.transition)}}>
      <Video src={src} muted trimBefore={trimBefore} style={{position:'absolute',width:'112%',height:'112%',left:'-6%',top:'-6%',objectFit:'cover',objectPosition:objectPosition(scene),filter:'blur(30px) saturate(0.9) brightness(0.62)',transform:'scale(1.08)'}} />
      <AbsoluteFill style={{backgroundColor:'rgba(0,0,0,0.12)'}} />
      <Video src={src} muted trimBefore={trimBefore} style={{position:'absolute',width:'100%',height:'100%',objectFit:'contain',filter:'drop-shadow(0 0 26px rgba(0,0,0,0.45))'}} />
    </AbsoluteFill>
  );
};

const SceneMedia: React.FC<{scene: RenderScene; fps: number}> = ({scene, fps}) => {
  const isVideo = ['video','animation','screen-recording','overlay'].includes(scene.asset.type);
  if (scene.presentation === 'freeze-frame') return <FreezeFrame scene={scene} fps={fps} />;
  if (!isVideo) {
    if (scene.presentation === 'article' || scene.presentation === 'document') return <ArticleScreenshot scene={scene} fps={fps} />;
    if (scene.presentation === 'map') return <MapImage scene={scene} fps={fps} />;
    return <DocumentaryImage scene={scene} fps={fps} />;
  }
  const vertical = scene.presentation === 'vertical-blur' || (scene.presentation !== 'contain' && scene.asset.orientation === 'vertical');
  return vertical ? <VerticalBlurVideo scene={scene} fps={fps} /> : <StandardVideo scene={scene} fps={fps} />;
};

const SceneLayer: React.FC<{scene: RenderScene; fps: number}> = ({scene, fps}) => (
  <AbsoluteFill>
    <SceneMedia scene={scene} fps={fps} />
    {scene.presentation === 'headline' ? <AbsoluteFill style={{background:'linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.52))'}} /> : null}
    <EditorialOverlays overlays={scene.overlays} />
  </AbsoluteFill>
);

export const AssetVideo: React.FC<{manifest: RenderManifest}> = ({manifest}) => {
  if ((manifest.project.workflowVersion ?? 1) >= 2) {
    if (!manifest.voiceover?.source) throw new Error('Workflow requires the user voiceover master track.');
    if (manifest.voiceover.sourceType !== 'user-provided' || manifest.voiceover.generatedByPipeline === true) throw new Error('Generated or replacement voiceover is forbidden.');
  }
  if ((manifest.project.workflowVersion ?? 1) >= 3) {
    if (manifest.policy?.networkAllowed !== false) throw new Error('Workflow v3 requires networkAllowed=false.');
    const remote = manifest.scenes.find((scene) => /^https?:\/\//i.test(scene.asset.source));
    if (remote) throw new Error(`Workflow v3 refuses remote runtime asset: ${remote.id}`);
  }
  return (
    <AbsoluteFill style={{backgroundColor:'#000'}}>
      {manifest.voiceover?.source ? <Audio src={sourceFor(manifest.voiceover.source)} durationInFrames={manifest.project.totalFrames} /> : null}
      {manifest.scenes.map((scene) => (
        <Sequence key={scene.id} from={scene.fromFrame} durationInFrames={scene.durationInFrames} name={scene.title}>
          <SceneLayer scene={scene} fps={manifest.project.fps} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

function finite(value: number | undefined, fallback: number) { return typeof value === 'number' && Number.isFinite(value) ? value : fallback; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
