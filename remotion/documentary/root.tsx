import React from 'react';
import {Composition} from 'remotion';
import {DocumentaryVideo, type DocumentaryRenderProps} from './video';

const defaultProps: DocumentaryRenderProps = {
  audioFile: 'audio/voiceover.mp3',
  scenes: []
};

export const DocumentaryRoot: React.FC = () => {
  return (
    <Composition
      id="Documentary"
      component={DocumentaryVideo}
      durationInFrames={1}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={defaultProps}
    />
  );
};
