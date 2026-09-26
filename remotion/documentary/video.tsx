import React from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Audio, Video} from '@remotion/media';

export type DocumentaryRenderScene = {
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

export type DocumentaryRenderProps = {
  audioFile: string;
  scenes: DocumentaryRenderScene[];
};

const SceneVisual: React.FC<{scene: DocumentaryRenderScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const lastFrame = Math.max(1, scene.durationInFrames - 1);
  const direction = numericSceneIndex(scene.sceneId) % 2 === 0 ? 1 : -1;
  const fadeFrames = Math.min(5, Math.max(2, Math.floor(scene.durationInFrames / 5)));
  const opacity = scene.transitionIn === 'fade'
    ? interpolate(frame, [0, fadeFrames], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 1;

  if (scene.mediaType === 'video') {
    return (
      <AbsoluteFill style={{opacity, backgroundColor: '#000'}}>
        <Video
          src={staticFile(scene.mediaFile)}
          muted
          loop={scene.loopVideo ?? true}
          trimBefore={Math.max(0, scene.trimBeforeFrames ?? 0)}
          trimAfter={scene.trimAfterFrames ?? undefined}
          durationInFrames={scene.durationInFrames}
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
        <DocumentaryFinish overlayText={scene.overlayText} />
      </AbsoluteFill>
    );
  }

  const useMotion = scene.motion !== 'none';
  return (
    <AbsoluteFill style={{opacity, overflow: 'hidden', backgroundColor: '#000'}}>
      <Img
        src={staticFile(scene.mediaFile)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          scale: useMotion
            ? interpolate(frame, [0, lastFrame], [1.015, 1.075], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
            : 1,
          translate: useMotion
            ? `${interpolate(frame, [0, lastFrame], [-10 * direction, 10 * direction], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}px 0px`
            : '0px 0px'
        }}
      />
      <DocumentaryFinish overlayText={scene.overlayText} />
    </AbsoluteFill>
  );
};

const DocumentaryFinish: React.FC<{overlayText?: string | null}> = ({overlayText}) => {
  return (
    <>
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.22) 100%)',
          pointerEvents: 'none'
        }}
      />
      {overlayText ? (
        <div
          style={{
            position: 'absolute',
            left: 72,
            bottom: 64,
            maxWidth: 1120,
            padding: '16px 24px',
            borderRadius: 12,
            backgroundColor: 'rgba(0,0,0,0.66)',
            color: '#fff',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: 44,
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: -0.4
          }}
        >
          {overlayText}
        </div>
      ) : null}
    </>
  );
};

export const DocumentaryVideo: React.FC<DocumentaryRenderProps> = ({audioFile, scenes}) => {
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {scenes.map((scene) => (
        <Sequence
          key={scene.sceneId}
          name={scene.sceneId}
          from={scene.startFrame}
          durationInFrames={scene.durationInFrames}
        >
          <SceneVisual scene={scene} />
        </Sequence>
      ))}
      <Audio src={staticFile(audioFile)} />
    </AbsoluteFill>
  );
};

function numericSceneIndex(sceneId: string) {
  const match = String(sceneId).match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : 1;
}
