import type { FamiliarColor, FamiliarDesign, FamiliarTheme } from '../../types';

export type FamiliarPose =
  | 'rest'
  | 'awake'
  | 'curious'
  | 'thinking'
  | 'waiting'
  | 'celebrate'
  | 'play'
  | 'music'
  | 'stretch'
  | 'sleepy'
  | 'greet'
  | 'hop'
  | 'peek';

export function FamiliarAvatar({
  design = 'sprout',
  color = 'mint',
  theme = 'natural',
  pose = 'awake',
  size = 'md'
}: {
  design?: FamiliarDesign;
  color?: FamiliarColor;
  theme?: FamiliarTheme;
  pose?: FamiliarPose;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <span
      className={`familiar-avatar design-${design} color-${color} theme-${theme} pose-${pose} size-${size}`}
      aria-hidden="true"
    >
      <span className="familiar-avatar-motion">
        <span className="familiar-avatar-gesture">
          <span className="familiar-avatar-shadow" />
          <span className="familiar-avatar-wisp wisp-a" />
          <span className="familiar-avatar-wisp wisp-b" />
          <span className="familiar-avatar-tail" />
          <span className="familiar-avatar-body">
            <i className="familiar-avatar-leaf leaf-left" />
            <i className="familiar-avatar-leaf leaf-right" />
            <i className="familiar-avatar-brow brow-left" />
            <i className="familiar-avatar-brow brow-right" />
            <i className="familiar-avatar-eye eye-left" />
            <i className="familiar-avatar-eye eye-right" />
            <i className="familiar-avatar-mouth" />
            <i className="familiar-avatar-core" />
            {pose === 'thinking' ? <i className="familiar-avatar-thought" /> : null}
          </span>
          {pose === 'play' ? <span className="familiar-avatar-mote" /> : null}
          {pose === 'celebrate' || pose === 'greet' ? <><span className="familiar-avatar-spark spark-a" /><span className="familiar-avatar-spark spark-b" /><span className="familiar-avatar-spark spark-c" /></> : null}
          {pose === 'music' ? <span className="familiar-avatar-music">♪</span> : null}
          {pose === 'sleepy' ? <span className="familiar-avatar-sleep">z</span> : null}
        </span>
      </span>
    </span>
  );
}
