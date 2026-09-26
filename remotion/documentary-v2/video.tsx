import React from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Audio, Video} from '@remotion/media';

export type DocumentaryRenderShot = {
  shotId: string;
  sceneId: string;
  startFrame: number;
  durationInFrames: number;
  mediaType: 'image' | 'video';
  mediaFile: string;
  trimBeforeFrames?: number;
  trimAfterFrames?: number | null;
  motion?: string;
  transitionIn?: string;
  overlayText?: string | null;
  loopVideo?: boolean;
};

export type DocumentaryRenderPropsV2 = {
  audioFile: string;
  shots: DocumentaryRenderShot[];
};

const ShotVisual: React.FC<{shot: DocumentaryRenderShot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const lastFrame = Math.max(1, shot.durationInFrames - 1);
  const direction = numericIndex(`${shot.sceneId}-${shot.shotId}`) % 2 === 0 ? 1 : -1;
  const fadeFrames = Math.min(5, Math.max(2, Math.floor(shot.durationInFrames / 6)));
  const opacity = shot.transitionIn === 'fade'
    ? interpolate(frame, [0, fadeFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 1;

  if (shot.mediaType === 'video') {
    return (
      <AbsoluteFill style={{opacity, backgroundColor: '#000'}}>
        <Video
          src={staticFile(shot.mediaFile)}
          muted
          loop={shot.loopVideo ?? true}
          trimBefore={Math.max(0, shot.trimBeforeFrames ?? 0)}
          trimAfter={shot.trimAfterFrames ?? undefined}
          durationInFrames={shot.durationInFrames}
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
        <DocumentaryFinish overlayText={shot.overlayText} />
      </AbsoluteFill>
    );
  }

  const useMotion = shot.motion !== 'none';
  return (
    <AbsoluteFill style={{opacity, overflow: 'hidden', backgroundColor: '#000'}}>
      <Img
        src={staticFile(shot.mediaFile)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          scale: useMotion ? interpolate(frame, [0, lastFrame], [1.012, 1.06], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1,
          translate: useMotion ? `${interpolate(frame, [0, lastFrame], [-8 * direction, 8 * direction], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px 0px` : '0px 0px'
        }}
      />
      <DocumentaryFinish overlayText={shot.overlayText} />
    </AbsoluteFill>
  );
};

const DocumentaryFinish: React.FC<{overlayText?: string | null}> = ({overlayText}) => (
  <>
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.18) 100%)', pointerEvents: 'none'}} />
    {overlayText ? (
      <div style={{position: 'absolute', left: 72, bottom: 64, maxWidth: 1120, padding: '14px 22px', borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.62)', color: '#fff', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 42, fontWeight: 700, lineHeight: 1.12}}>
        {overlayText}
      </div>
    ) : null}
  </>
);

export const DocumentaryVideoV2: React.FC<DocumentaryRenderPropsV2> = ({audioFile, shots}) => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    {shots.map((shot) => (
      <Sequence key={`${shot.sceneId}-${shot.shotId}`} name={`${shot.sceneId}/${shot.shotId}`} from={shot.startFrame} durationInFrames={shot.durationInFrames}>
        <ShotVisual shot={shot} />
      </Sequence>
    ))}
    <Audio src={staticFile(audioFile)} />
  </AbsoluteFill>
);

function numericIndex(value: string) {
  const values = String(value).match(/\d+/g);
  return values ? values.map(Number).reduce((sum, item) => sum + item, 0) : 1;
}
