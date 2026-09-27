import {Composition} from 'remotion';
import {AssetVideo, type RenderManifest} from './AssetVideo';
import {DemoVideo} from './DemoVideo';
import {generatedManifest} from './generated-manifest';

const manifest = generatedManifest as unknown as RenderManifest;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AssetVideo"
        component={AssetVideo}
        durationInFrames={Math.max(1, manifest.project.totalFrames)}
        fps={Math.max(1, manifest.project.fps)}
        width={Math.max(1, manifest.project.width)}
        height={Math.max(1, manifest.project.height)}
        defaultProps={{manifest}}
      />
      <Composition
        id="VisualAssetHubDemo2Min"
        component={DemoVideo}
        durationInFrames={1800}
        fps={15}
        width={1920}
        height={1080}
      />
    </>
  );
};
