import { getPaperTheme, type PaperThemeDefinition } from '../data/paperThemes';
import type { DailyCalendarSize, DailyPageTheme } from '../types';

export const DAILY_CALENDAR_FACE_WIDTH = 900;
export const DAILY_CALENDAR_FACE_HEIGHT = 1280;

export interface DailyCalendarPrintOptions {
  date: Date;
  theme: DailyPageTheme;
  size: DailyCalendarSize;
  taskLines?: string[];
  memo?: string;
  showMiniMonth?: boolean;
}

interface DeskPrintProfile {
  size: DailyCalendarSize;
  tasks: number;
  memoLines: number;
  numeral: number;
  showSides: boolean;
  showMini: boolean;
  miniScale: number;
  memoY: number;
  memoH: number;
  meta: number;
  rule: number;
}

function profileFor(size: DailyCalendarSize, dayText: string): DeskPrintProfile {
  if (size === 'compact') {
    return {
      size,
      tasks: 0,
      memoLines: 2,
      numeral: dayText.length > 1 ? 352 : 410,
      showSides: false,
      showMini: false,
      miniScale: 0,
      memoY: 900,
      memoH: 224,
      meta: 26,
      rule: 4
    };
  }
  if (size === 'large') {
    return {
      size,
      tasks: 3,
      memoLines: 5,
      numeral: dayText.length > 1 ? 286 : 330,
      showSides: true,
      showMini: true,
      miniScale: 1,
      memoY: 790,
      memoH: 366,
      meta: 21,
      rule: 3
    };
  }
  return {
    size,
    tasks: 1,
    memoLines: 3,
    numeral: dayText.length > 1 ? 310 : 360,
    showSides: true,
    showMini: true,
    miniScale: .82,
    memoY: 830,
    memoH: 316,
    meta: 24,
    rule: 3
  };
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seeded(seed: number) {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function drawPaperGrain(context: CanvasRenderingContext2D, theme: PaperThemeDefinition, key: string) {
  const random = seeded(hashSeed(key));
  context.save();
  context.globalAlpha = Math.min(.07, theme.grainOpacity * .62);
  const count = Math.round(1500 + theme.grainOpacity * 9000);
  for (let i = 0; i < count; i += 1) {
    const shade = 154 + Math.floor(random() * 76);
    context.fillStyle = `rgb(${shade},${Math.max(0, shade - 4)},${Math.max(0, shade - 10)})`;
    const dot = random() > .965 ? 2 : 1;
    context.fillRect(random() * DAILY_CALENDAR_FACE_WIDTH, random() * DAILY_CALENDAR_FACE_HEIGHT, dot, dot);
  }
  context.restore();
}

function drawMiniMonth(context: CanvasRenderingContext2D, date: Date, theme: PaperThemeDefinition, x: number, y: number, scale = 1) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const start = first.getDay();
  const cellX = 31 * scale;
  const cellY = 25 * scale;

  context.save();
  context.textAlign = 'left';
  context.fillStyle = theme.mutedInk;
  context.font = `800 ${24 * scale}px Inter, Arial, sans-serif`;
  context.fillText(new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase(), x, y);
  context.font = `700 ${17 * scale}px Inter, Arial, sans-serif`;
  for (let day = 1; day <= days; day += 1) {
    const slot = start + day - 1;
    const col = slot % 7;
    const row = Math.floor(slot / 7);
    context.fillStyle = day === date.getDate() ? theme.accent : theme.mutedInk;
    context.fillText(String(day), x + col * cellX, y + 34 * scale + row * cellY);
  }
  context.restore();
}

function clipped(text: string, max: number) {
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
}

function drawDeskNotes(
  context: CanvasRenderingContext2D,
  taskLines: string[],
  memo: string,
  theme: PaperThemeDefinition,
  profile: DeskPrintProfile,
  {
    x = 82,
    y = profile.memoY,
    width = 736,
    height = profile.memoH,
    label = 'MEMO',
    boxed = true,
    accentRule = false
  }: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    label?: string;
    boxed?: boolean;
    accentRule?: boolean;
  } = {}
) {
  const tasksVisible = taskLines.slice(0, profile.tasks);
  const cleanMemo = memo.trim().replace(/\s+/g, ' ');
  const inset = boxed ? 22 : 0;

  context.save();
  if (boxed) {
    context.strokeStyle = accentRule ? theme.accent : theme.rule;
    context.lineWidth = Math.max(2, profile.rule);
    context.strokeRect(x, y, width, height);
  }

  context.textAlign = 'left';
  context.fillStyle = theme.mutedInk;
  context.font = `800 ${profile.size === 'compact' ? 25 : 23}px Inter, Arial, sans-serif`;
  context.fillText(label, x + inset, y + 34);

  const ruledStart = y + 88;
  const ruledGap = (height - 118) / Math.max(1, profile.memoLines);
  context.strokeStyle = theme.rule;
  context.lineWidth = Math.max(2, profile.rule - 1);
  for (let i = 0; i < profile.memoLines; i += 1) {
    const lineY = ruledStart + i * ruledGap;
    context.beginPath();
    context.moveTo(x + inset, lineY);
    context.lineTo(x + width - inset, lineY);
    context.stroke();
  }

  if (profile.tasks > 0) {
    context.fillStyle = theme.ink;
    context.font = `650 ${profile.size === 'large' ? 22 : 24}px Inter, Arial, sans-serif`;
    tasksVisible.forEach((line, index) => {
      const lineY = ruledStart - 19 + index * ruledGap;
      const boxX = x + inset + 2;
      context.strokeStyle = theme.rule;
      context.lineWidth = 2;
      context.strokeRect(boxX, lineY - 16, 16, 16);
      const max = profile.size === 'large' ? 52 : 40;
      context.fillText(clipped(line, max), boxX + 30, lineY - 1);
    });
  }

  if (cleanMemo && profile.size !== 'compact') {
    const memoRow = Math.min(profile.memoLines - 1, Math.max(tasksVisible.length, 1));
    const lineY = ruledStart - 19 + memoRow * ruledGap;
    context.fillStyle = theme.mutedInk;
    context.font = `italic 500 ${profile.size === 'large' ? 21 : 22}px Georgia, serif`;
    context.fillText(clipped(cleanMemo, profile.size === 'large' ? 68 : 48), x + inset, lineY - 1);
  }
  context.restore();
}

function drawSharedRegistration(context: CanvasRenderingContext2D, theme: PaperThemeDefinition) {
  context.save();
  context.strokeStyle = theme.rule;
  context.lineWidth = 3;
  context.strokeRect(54, 64, 792, 1164);

  context.setLineDash([11, 10]);
  context.globalAlpha = .72;
  context.beginPath();
  context.moveTo(82, 112);
  context.lineTo(818, 112);
  context.stroke();
  context.setLineDash([]);
  context.globalAlpha = 1;

  context.fillStyle = theme.paper;
  for (const x of [330, 570]) {
    context.beginPath();
    context.arc(x, 82, 12, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  context.restore();
}

function drawTraditionalHimekuri(
  context: CanvasRenderingContext2D,
  date: Date,
  theme: PaperThemeDefinition,
  profile: DeskPrintProfile,
  taskLines: string[],
  memo: string,
  showMiniMonth: boolean
) {
  const year = date.getFullYear();
  const day = date.getDate();
  const monthNumber = date.getMonth() + 1;
  const monthLong = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date).toUpperCase();
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date).toUpperCase();
  const jp = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  const japaneseWeekday = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][date.getDay()];
  const dayOfYear = Math.floor((Date.UTC(year, date.getMonth(), day) - Date.UTC(year, 0, 0)) / 86400000);
  const daysInYear = new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;

  context.save();
  context.fillStyle = theme.accent;
  context.fillRect(72, 148, 756, 7);

  context.textAlign = 'left';
  context.fillStyle = theme.ink;
  context.font = `900 ${profile.meta + 12}px Inter, Arial, sans-serif`;
  context.fillText(String(year), 78, 105);
  context.fillStyle = theme.mutedInk;
  context.font = `700 ${profile.meta - 4}px "Noto Sans CJK JP", "Yu Gothic", sans-serif`;
  context.fillText('日めくり', 78, 137);

  context.textAlign = 'center';
  context.fillStyle = theme.ink;
  context.font = `900 ${profile.meta + 14}px "Noto Sans CJK JP", Inter, sans-serif`;
  context.fillText(`${monthNumber} 月`, 450, 106);
  context.fillStyle = theme.mutedInk;
  context.font = `800 ${profile.meta - 5}px Inter, Arial, sans-serif`;
  context.fillText(monthLong, 450, 137);

  context.textAlign = 'right';
  context.fillStyle = theme.accent;
  context.font = `900 ${profile.meta + 15}px "Noto Sans CJK JP", sans-serif`;
  context.fillText(jp, 822, 108);
  context.fillStyle = theme.mutedInk;
  context.font = `800 ${profile.meta - 5}px Inter, Arial, sans-serif`;
  context.fillText(weekday, 822, 137);

  if (showMiniMonth && profile.showMini) drawMiniMonth(context, date, theme, 80, 208, profile.miniScale);

  context.save();
  context.globalAlpha = .54;
  context.fillStyle = theme.accentSoft;
  const disc = profile.size === 'compact' ? 196 : profile.size === 'large' ? 172 : 184;
  context.beginPath();
  context.arc(472, profile.size === 'compact' ? 444 : 426, disc, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.textAlign = 'center';
  context.fillStyle = theme.ink;
  context.font = `900 ${profile.numeral}px Inter, Arial Black, sans-serif`;
  context.fillText(String(day), 450, profile.size === 'compact' ? 620 : 604);

  if (profile.showSides) {
    context.textAlign = 'left';
    context.fillStyle = theme.mutedInk;
    context.font = `800 ${profile.meta - 3}px Inter, Arial, sans-serif`;
    context.fillText('DAY', 84, 408);
    context.font = `900 ${profile.meta + 5}px Inter, Arial, sans-serif`;
    context.fillText(String(dayOfYear).padStart(3, '0'), 84, 442);
    context.font = `700 ${profile.meta - 7}px Inter, Arial, sans-serif`;
    context.fillText(`OF ${daysInYear}`, 84, 469);

    context.textAlign = 'right';
    context.font = `800 ${profile.meta - 3}px Inter, Arial, sans-serif`;
    context.fillText('DATE', 816, 408);
    context.font = `900 ${profile.meta + 5}px Inter, Arial, sans-serif`;
    context.fillText(`${String(monthNumber).padStart(2, '0')}.${String(day).padStart(2, '0')}`, 816, 442);
    context.font = `700 ${profile.meta - 7}px Inter, Arial, sans-serif`;
    context.fillText(String(year), 816, 469);
  }

  context.textAlign = 'center';
  context.fillStyle = theme.ink;
  context.font = `900 ${profile.size === 'compact' ? 46 : 43}px "Noto Sans CJK JP", "Yu Gothic", sans-serif`;
  context.fillText(japaneseWeekday, 450, profile.size === 'compact' ? 715 : 700);
  context.fillStyle = theme.accent;
  context.font = `900 ${profile.size === 'compact' ? 24 : 22}px Inter, Arial, sans-serif`;
  context.fillText(weekday, 450, profile.size === 'compact' ? 755 : 742);

  context.strokeStyle = theme.rule;
  context.lineWidth = profile.rule;
  context.beginPath();
  context.moveTo(82, 782);
  context.lineTo(818, 782);
  context.stroke();

  drawDeskNotes(context, taskLines, memo, theme, profile, {
    x: 84,
    y: profile.memoY,
    width: 732,
    height: profile.memoH,
    label: profile.size === 'compact' ? '今日 / TODAY' : '今日 / MEMO'
  });

  context.fillStyle = theme.accent;
  context.textAlign = 'left';
  context.font = '900 24px "Noto Serif CJK JP", Georgia, serif';
  context.fillText('暦', 82, 1206);
  context.textAlign = 'right';
  context.fillStyle = theme.mutedInk;
  context.font = '800 16px Inter, Arial, sans-serif';
  context.fillText('IKIGAI DAILY · ONE DAY / ONE PAGE', 818, 1204);
  context.restore();
}

function drawEditorialDesk(
  context: CanvasRenderingContext2D,
  date: Date,
  theme: PaperThemeDefinition,
  profile: DeskPrintProfile,
  taskLines: string[],
  memo: string,
  showMiniMonth: boolean
) {
  const year = date.getFullYear();
  const day = date.getDate();
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date).toUpperCase();
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date).toUpperCase();

  context.save();
  context.fillStyle = theme.accent;
  context.fillRect(54, 64, 24, 1164);
  context.fillStyle = theme.accentSoft;
  context.globalAlpha = .5;
  context.fillRect(106, 84, 700, 118);
  context.globalAlpha = 1;

  context.textAlign = 'left';
  context.fillStyle = theme.ink;
  context.font = `700 ${profile.size === 'compact' ? 35 : 32}px Georgia, "Times New Roman", serif`;
  context.fillText('IKIGAI DAILY PRESS', 116, 132);
  context.fillStyle = theme.mutedInk;
  context.font = `800 ${profile.meta - 2}px Inter, Arial, sans-serif`;
  context.fillText(`${weekday} · ${String(day).padStart(2, '0')} ${month} ${year}`, 116, 174);

  context.fillStyle = theme.ink;
  context.font = `600 ${profile.numeral + 42}px Georgia, "Times New Roman", serif`;
  context.fillText(String(day), 112, profile.size === 'compact' ? 650 : 628);

  context.fillStyle = theme.accent;
  context.font = `italic 600 ${profile.size === 'compact' ? 48 : 43}px Georgia, serif`;
  context.fillText('one day, one page', 120, profile.size === 'compact' ? 744 : 718);

  context.strokeStyle = theme.rule;
  context.lineWidth = profile.rule;
  context.beginPath();
  context.moveTo(116, 778);
  context.lineTo(808, 778);
  context.stroke();

  if (showMiniMonth && profile.showMini) drawMiniMonth(context, date, theme, 590, 236, profile.miniScale);
  drawDeskNotes(context, taskLines, memo, theme, profile, {
    x: 116,
    y: profile.memoY,
    width: 690,
    height: profile.memoH,
    label: 'NOTES FOR TODAY',
    boxed: false
  });

  context.fillStyle = theme.mutedInk;
  context.font = '800 16px Inter, Arial, sans-serif';
  context.fillText('IKIGAI PRESS · LOCAL EDITION', 116, 1206);
  context.restore();
}

function drawWinterDesk(
  context: CanvasRenderingContext2D,
  date: Date,
  theme: PaperThemeDefinition,
  profile: DeskPrintProfile,
  taskLines: string[],
  memo: string,
  showMiniMonth: boolean
) {
  const day = date.getDate();
  const year = date.getFullYear();
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date).toUpperCase();
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date).toUpperCase();

  context.save();
  context.fillStyle = theme.accent;
  context.fillRect(54, 64, 792, 180);
  context.fillStyle = '#f6fbfc';
  context.textAlign = 'left';
  context.font = `900 ${profile.size === 'compact' ? 38 : 34}px Inter, Arial, sans-serif`;
  context.fillText('WINTER STUDY', 84, 128);
  context.font = `800 ${profile.meta - 2}px Inter, Arial, sans-serif`;
  context.fillText(`${month} · ${year}`, 84, 176);
  context.textAlign = 'right';
  context.font = `900 ${profile.size === 'compact' ? 44 : 40}px Inter, Arial, sans-serif`;
  context.fillText(weekday, 818, 150);

  const fieldTop = profile.size === 'compact' ? 286 : 292;
  const fieldBottom = profile.size === 'compact' ? 744 : 710;
  context.fillStyle = theme.accentSoft;
  context.globalAlpha = .64;
  context.fillRect(88, fieldTop, 724, fieldBottom - fieldTop);
  context.globalAlpha = 1;
  context.strokeStyle = 'rgba(79,120,144,.26)';
  context.lineWidth = 2;
  for (let x = 110; x <= 812; x += 70) {
    context.beginPath(); context.moveTo(x, fieldTop); context.lineTo(x, fieldBottom); context.stroke();
  }
  for (let y = fieldTop + 32; y <= fieldBottom; y += 70) {
    context.beginPath(); context.moveTo(88, y); context.lineTo(812, y); context.stroke();
  }

  context.textAlign = 'center';
  context.fillStyle = theme.ink;
  context.font = `900 ${profile.numeral + 24}px Inter, Arial Black, sans-serif`;
  context.fillText(String(day), 450, profile.size === 'compact' ? 632 : 608);
  context.fillStyle = theme.accent;
  context.font = `800 ${profile.size === 'compact' ? 30 : 27}px "Noto Sans CJK JP", Inter, sans-serif`;
  context.fillText('静かな一日 · QUIET FOCUS', 450, profile.size === 'compact' ? 704 : 668);

  if (showMiniMonth && profile.showMini) drawMiniMonth(context, date, theme, 602, 304, profile.miniScale);
  drawDeskNotes(context, taskLines, memo, theme, profile, {
    x: 90,
    y: profile.memoY,
    width: 720,
    height: profile.memoH,
    label: 'STUDY NOTES'
  });
  context.restore();
}

function drawFestiveDesk(
  context: CanvasRenderingContext2D,
  date: Date,
  theme: PaperThemeDefinition,
  profile: DeskPrintProfile,
  taskLines: string[],
  memo: string,
  showMiniMonth: boolean
) {
  const day = date.getDate();
  const year = date.getFullYear();
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date).toUpperCase();
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date).toUpperCase();
  const green = '#315b42';

  context.save();
  context.strokeStyle = green;
  context.lineWidth = 12;
  context.strokeRect(54, 64, 792, 1164);
  context.fillStyle = green;
  context.fillRect(54, 64, 792, 164);
  context.fillStyle = '#fff7e9';
  context.textAlign = 'left';
  context.font = `900 ${profile.size === 'compact' ? 36 : 33}px Georgia, serif`;
  context.fillText(`${month} ${year}`, 86, 132);
  context.font = `800 ${profile.meta - 2}px Inter, Arial, sans-serif`;
  context.fillText('WINTER PRINT · LOCAL EDITION', 86, 177);
  context.textAlign = 'right';
  context.fillStyle = theme.accentSoft;
  context.font = '900 46px Inter, Arial, sans-serif';
  context.fillText('✦', 812, 162);

  for (let i = 0; i < 8; i += 1) {
    const x = 104 + i * 90;
    context.fillStyle = i % 2 ? theme.accent : green;
    context.beginPath();
    context.moveTo(x, 278);
    context.lineTo(x - 24, 314);
    context.lineTo(x + 24, 314);
    context.closePath();
    context.fill();
  }

  context.textAlign = 'center';
  context.fillStyle = theme.ink;
  context.font = `900 ${profile.numeral + 20}px Georgia, "Times New Roman", serif`;
  context.fillText(String(day), 450, profile.size === 'compact' ? 654 : 632);
  context.fillStyle = theme.accent;
  context.font = `900 ${profile.size === 'compact' ? 29 : 25}px Inter, Arial, sans-serif`;
  context.fillText(weekday, 450, profile.size === 'compact' ? 728 : 706);

  context.fillStyle = green;
  context.fillRect(110, 770, 680, 5);
  if (showMiniMonth && profile.showMini) drawMiniMonth(context, date, theme, 596, 346, profile.miniScale);
  drawDeskNotes(context, taskLines, memo, theme, profile, {
    x: 94,
    y: profile.memoY,
    width: 712,
    height: profile.memoH,
    label: 'TODAY / NOTES',
    accentRule: true
  });
  context.restore();
}

function drawSakuraDesk(
  context: CanvasRenderingContext2D,
  date: Date,
  theme: PaperThemeDefinition,
  profile: DeskPrintProfile,
  taskLines: string[],
  memo: string,
  showMiniMonth: boolean
) {
  const day = date.getDate();
  const year = date.getFullYear();
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date).toUpperCase();
  const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date).toUpperCase();
  const jp = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];

  context.save();
  context.textAlign = 'left';
  context.fillStyle = theme.ink;
  context.font = `700 ${profile.size === 'compact' ? 36 : 33}px Georgia, serif`;
  context.fillText(`${month} ${year}`, 84, 128);
  context.fillStyle = theme.mutedInk;
  context.font = `800 ${profile.meta - 2}px "Noto Sans CJK JP", Inter, sans-serif`;
  context.fillText('SAKURA DAWN · 日々', 84, 169);

  context.strokeStyle = theme.accent;
  context.lineWidth = 7;
  context.beginPath();
  context.moveTo(82, 278);
  context.bezierCurveTo(216, 205, 292, 242, 400, 174);
  context.stroke();
  for (let i = 0; i < 12; i += 1) {
    const x = 112 + ((i * 31) % 306);
    const y = 250 - ((i * 11) % 104);
    context.save();
    context.translate(x, y);
    context.rotate((i * .53) % Math.PI);
    context.fillStyle = i % 3 === 0 ? theme.accent : theme.accentSoft;
    context.globalAlpha = i % 3 === 0 ? .62 : .82;
    context.beginPath();
    context.ellipse(0, 0, 15, 7, .32, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.globalAlpha = 1;

  context.fillStyle = theme.accentSoft;
  context.globalAlpha = .72;
  context.beginPath();
  context.arc(626, 382, profile.size === 'compact' ? 174 : 162, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;

  context.textAlign = 'center';
  context.fillStyle = theme.ink;
  context.font = `600 ${profile.numeral + 28}px Georgia, "Times New Roman", serif`;
  context.fillText(String(day), 450, profile.size === 'compact' ? 646 : 626);
  context.fillStyle = theme.accent;
  context.font = `900 ${profile.size === 'compact' ? 58 : 52}px "Noto Serif CJK JP", Georgia, serif`;
  context.fillText(jp, 450, profile.size === 'compact' ? 724 : 704);
  context.fillStyle = theme.mutedInk;
  context.font = `800 ${profile.size === 'compact' ? 25 : 22}px Inter, Arial, sans-serif`;
  context.fillText(weekday, 450, profile.size === 'compact' ? 764 : 744);

  if (showMiniMonth && profile.showMini) drawMiniMonth(context, date, theme, 604, 188, profile.miniScale);
  drawDeskNotes(context, taskLines, memo, theme, profile, {
    x: 92,
    y: profile.memoY,
    width: 716,
    height: profile.memoH,
    label: '今日の余白',
    boxed: false
  });
  context.restore();
}

function drawMinimalDesk(
  context: CanvasRenderingContext2D,
  date: Date,
  theme: PaperThemeDefinition,
  profile: DeskPrintProfile,
  taskLines: string[],
  memo: string,
  showMiniMonth: boolean
) {
  const day = date.getDate();
  const year = date.getFullYear();
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date).toUpperCase();
  const monthNumber = String(date.getMonth() + 1).padStart(2, '0');
  const dayText = String(day).padStart(2, '0');

  context.save();
  context.fillStyle = theme.ink;
  context.fillRect(54, 64, 792, 112);
  context.textAlign = 'left';
  context.fillStyle = theme.paper;
  context.font = `800 ${profile.size === 'compact' ? 28 : 25}px Inter, Arial, sans-serif`;
  context.fillText(`IKIGAI / ${year}.${monthNumber}.${dayText}`, 80, 132);
  context.textAlign = 'right';
  context.fillText(weekday.slice(0, profile.size === 'compact' ? 3 : weekday.length), 820, 132);

  context.fillStyle = theme.ink;
  context.fillRect(76, 226, 20, 510);
  context.textAlign = 'left';
  context.font = `900 ${profile.numeral + 54}px Inter, Arial Black, sans-serif`;
  context.fillText(dayText, 126, profile.size === 'compact' ? 640 : 628);
  context.fillStyle = theme.mutedInk;
  context.font = `800 ${profile.size === 'compact' ? 29 : 25}px Inter, Arial, sans-serif`;
  context.fillText(`${weekday} / ${['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][date.getDay()]}`, 128, 716);

  context.fillStyle = theme.ink;
  context.fillRect(76, 780, 748, 5);
  if (showMiniMonth && profile.showMini) drawMiniMonth(context, date, theme, 642, 212, profile.miniScale);
  drawDeskNotes(context, taskLines, memo, theme, profile, {
    x: 78,
    y: profile.memoY,
    width: 744,
    height: profile.memoH,
    label: 'NOTES',
    boxed: false
  });
  context.restore();
}

function drawEdition(
  context: CanvasRenderingContext2D,
  date: Date,
  theme: PaperThemeDefinition,
  profile: DeskPrintProfile,
  taskLines: string[],
  memo: string,
  showMiniMonth: boolean
) {
  switch (theme.layout) {
    case 'editorial':
      drawEditorialDesk(context, date, theme, profile, taskLines, memo, showMiniMonth);
      break;
    case 'winter':
      drawWinterDesk(context, date, theme, profile, taskLines, memo, showMiniMonth);
      break;
    case 'festive':
      drawFestiveDesk(context, date, theme, profile, taskLines, memo, showMiniMonth);
      break;
    case 'sakura':
      drawSakuraDesk(context, date, theme, profile, taskLines, memo, showMiniMonth);
      break;
    case 'minimal':
      drawMinimalDesk(context, date, theme, profile, taskLines, memo, showMiniMonth);
      break;
    case 'himekuri':
    default:
      drawTraditionalHimekuri(context, date, theme, profile, taskLines, memo, showMiniMonth);
      break;
  }
}

export function paintDailyCalendarSheet(context: CanvasRenderingContext2D, options: DailyCalendarPrintOptions) {
  const {
    date,
    theme: themeId,
    size,
    taskLines = [],
    memo = '',
    showMiniMonth = true
  } = options;
  const theme = getPaperTheme(themeId);
  const profile = profileFor(size, String(date.getDate()));

  context.save();
  context.clearRect(0, 0, DAILY_CALENDAR_FACE_WIDTH, DAILY_CALENDAR_FACE_HEIGHT);
  context.fillStyle = theme.paper;
  context.fillRect(0, 0, DAILY_CALENDAR_FACE_WIDTH, DAILY_CALENDAR_FACE_HEIGHT);
  drawPaperGrain(context, theme, `${theme.id}:${date.toISOString().slice(0, 10)}:${size}`);
  drawSharedRegistration(context, theme);
  drawEdition(context, date, theme, profile, taskLines, memo, showMiniMonth);
  context.restore();
}
