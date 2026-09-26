import React from 'react';
import {Composition} from 'remotion';
import {DocumentaryVideoV2, type DocumentaryRenderPropsV2} from './video';

const defaultProps: DocumentaryRenderPropsV2 = {
  audioFile: 'audio/voiceover.mp3',
  shots: []
};

export const DocumentaryRootV2: React.FC = () => {
  return (
    <Composition
      id="DocumentaryV2"
      component={DocumentaryVideoV2}
      durationInFrames={1}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={defaultProps}
    />
  );
};
