import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export type RenderOverlay = {
  kind: 'label' | 'headline' | 'number' | 'callout' | 'source';
  text: string;
  subtext?: string;
  position?: string;
  x?: number;
  y?: number;
};

export const EditorialOverlays: React.FC<{overlays?: RenderOverlay[]}> = ({overlays = []}) => {
  if (!overlays.length) return null;
  return (
    <>
      {overlays.map((overlay, index) => (
        <Overlay key={`${overlay.kind}-${index}-${overlay.text}`} overlay={overlay} delay={index * 3} />
      ))}
    </>
  );
};

const Overlay: React.FC<{overlay: RenderOverlay; delay: number}> = ({overlay, delay}) => {
  const frame = Math.max(0, useCurrentFrame() - delay);
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 170, mass: 0.7}});
  const opacity = interpolate(frame, [0, Math.max(1, Math.round(fps * 0.18))], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  if (overlay.kind === 'headline') {
    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', opacity,
      }}>
        <div style={{
          maxWidth: '82%', padding: '28px 38px', textAlign: 'center',
          background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(5px)', borderRadius: 18,
          transform: `scale(${0.9 + enter * 0.1})`, boxShadow: '0 16px 60px rgba(0,0,0,0.35)',
        }}>
          <div style={{fontFamily: 'Arial, sans-serif', fontWeight: 900, fontSize: 66, lineHeight: 1.02, color: 'white', letterSpacing: -1.2}}>{overlay.text}</div>
          {overlay.subtext ? <div style={{marginTop: 12, fontFamily: 'Arial, sans-serif', fontSize: 25, lineHeight: 1.2, color: 'rgba(255,255,255,0.86)'}}>{overlay.subtext}</div> : null}
        </div>
      </div>
    );
  }

  if (overlay.kind === 'number') {
    return (
      <div style={{
        position: 'absolute', left: 54, bottom: 56, maxWidth: '76%', pointerEvents: 'none', opacity,
        transform: `translateY(${(1 - enter) * 22}px)`,
      }}>
        <div style={{fontFamily: 'Arial, sans-serif', fontWeight: 900, fontSize: 74, lineHeight: 0.95, color: 'white', textShadow: '0 5px 26px rgba(0,0,0,0.72)', letterSpacing: -1.5}}>{overlay.text}</div>
        {overlay.subtext ? <div style={{marginTop: 10, fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 24, color: 'rgba(255,255,255,0.92)', textShadow: '0 3px 14px rgba(0,0,0,0.72)'}}>{overlay.subtext}</div> : null}
      </div>
    );
  }

  if (overlay.kind === 'callout') {
    const x = clamp(overlay.x ?? 50, 5, 95);
    const y = clamp(overlay.y ?? 50, 7, 93);
    const pulse = 1 + Math.sin(frame / Math.max(2, fps / 8)) * 0.08;
    const boxLeft = x > 68 ? -220 : 24;
    return (
      <div style={{position: 'absolute', left: `${x}%`, top: `${y}%`, pointerEvents: 'none', opacity}}>
        <div style={{position: 'absolute', width: 28, height: 28, borderRadius: '50%', border: '4px solid white', transform: `translate(-50%,-50%) scale(${pulse})`, boxShadow: '0 0 0 6px rgba(0,0,0,0.32)'}} />
        <div style={{position: 'absolute', width: 72, height: 3, background: 'white', left: x > 68 ? -72 : 0, top: -1, transformOrigin: x > 68 ? '100% 50%' : '0% 50%', transform: `scaleX(${enter})`, boxShadow: '0 2px 8px rgba(0,0,0,0.45)'}} />
        <div style={{
          position: 'absolute', left: boxLeft, top: -28, minWidth: 180, maxWidth: 260,
          padding: '12px 16px', borderRadius: 10, background: 'rgba(0,0,0,0.78)', color: 'white',
          fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: 22, lineHeight: 1.05,
          transform: `scale(${0.92 + enter * 0.08})`, transformOrigin: x > 68 ? 'right center' : 'left center',
          boxShadow: '0 10px 28px rgba(0,0,0,0.32)'
        }}>{overlay.text}</div>
      </div>
    );
  }

  if (overlay.kind === 'source') {
    return (
      <div style={{
        position: 'absolute', right: 24, bottom: 18, padding: '7px 10px', borderRadius: 6,
        background: 'rgba(0,0,0,0.62)', color: 'rgba(255,255,255,0.82)',
        fontFamily: 'Arial, sans-serif', fontSize: 14, lineHeight: 1, pointerEvents: 'none', opacity,
      }}>{overlay.text}</div>
    );
  }

  return (
    <div style={{
      position: 'absolute', left: 34, top: 30, padding: '9px 13px', borderRadius: 8,
      background: 'rgba(0,0,0,0.62)', color: 'white', textTransform: 'uppercase',
      fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: 17, letterSpacing: 0.6,
      pointerEvents: 'none', opacity, transform: `translateY(${(1 - enter) * -8}px)`,
    }}>{overlay.text}</div>
  );
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
