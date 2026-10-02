import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { getPaperTheme } from '../../data/paperThemes';
import { DAILY_CALENDAR_FACE_HEIGHT, DAILY_CALENDAR_FACE_WIDTH, paintDailyCalendarSheet } from '../../lib/dailyCalendarPrint';
import type { DailyCalendarSize, DailyPageTheme } from '../../types';

interface DailyCalendarPreviewProps {
  theme: DailyPageTheme;
  size?: DailyCalendarSize;
  className?: string;
  sampleTasks?: boolean;
}

export function DailyCalendarPreview({
  theme,
  size = 'standard',
  className = '',
  sampleTasks = false
}: DailyCalendarPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const definition = useMemo(() => getPaperTheme(theme), [theme]);
  const previewDate = useMemo(() => new Date(2026, 9, 1), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Half-resolution backing canvas is ample for a small Settings preview while
    // still using the exact same 900×1280 print coordinates as the Today object.
    context.setTransform(.5, 0, 0, .5, 0, 0);
    paintDailyCalendarSheet(context, {
      date: previewDate,
      theme,
      size,
      taskLines: sampleTasks ? ['One thing that matters', 'A small next step', 'Leave room for life'] : [],
      memo: sampleTasks ? 'Keep the page quiet.' : '',
      showMiniMonth: true
    });
  }, [previewDate, sampleTasks, size, theme]);

  const style = {
    '--paper-edition-accent': definition.accent,
    '--paper-edition-hardware': definition.hardware,
    '--paper-edition-hardware-highlight': definition.hardwareHighlight,
    '--paper-edition-back': definition.backSheet
  } as CSSProperties;

  return (
    <span className={`paper-edition-preview ${className}`.trim()} style={style} aria-hidden="true">
      <span className="paper-edition-preview__cord" />
      <span className="paper-edition-preview__stack" />
      <canvas
        ref={canvasRef}
        width={DAILY_CALENDAR_FACE_WIDTH / 2}
        height={DAILY_CALENDAR_FACE_HEIGHT / 2}
      />
      <span className="paper-edition-preview__clamp"><i /><i /></span>
    </span>
  );
}
