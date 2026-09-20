export interface SubtitleCue {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

function parseTimestamp(timeString: string): number {
  const parts = timeString.trim().replace(',', '.').split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return 0;
}

export function parseSrtOrVtt(content: string): SubtitleCue[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i;
        break;
      }
    }

    if (timeLineIndex === -1) continue;

    const timeLine = lines[timeLineIndex];
    const [startStr, endStr] = timeLine.split('-->');
    if (!startStr || !endStr) continue;

    const startTime = parseTimestamp(startStr);
    const endTime = parseTimestamp(endStr);
    const textLines = lines.slice(timeLineIndex + 1);
    const text = textLines.join('\n').replace(/<[^>]+>/g, '').trim();

    if (text) {
      cues.push({
        id: `cue-${cues.length}`,
        startTime,
        endTime,
        text,
      });
    }
  }

  return cues;
}
