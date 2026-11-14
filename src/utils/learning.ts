export interface LearningProgressState {
  masteredIds: string[];
  xp: number;
  streakDays: number;
  completedLessons: number;
}

export function normalizeJapaneseForComparison(input: string): string {
  return input
    .trim()
    .replace(/[\s　。、！？!?.,・「」『』]/g, '')
    .toLowerCase();
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export interface PronunciationEvaluation {
  score: number;
  grade: 'Excellent' | 'Good' | 'Keep Practicing';
  feedback: string;
}

export function evaluatePronunciationMatch(
  expectedJapanese: string,
  expectedRomaji: string,
  spokenTranscript: string
): PronunciationEvaluation {
  const normSpoken = normalizeJapaneseForComparison(spokenTranscript);
  if (!normSpoken) {
    return {
      score: 0,
      grade: 'Keep Practicing',
      feedback: 'No speech detected. Speak clearly closer to the microphone and try again.',
    };
  }

  const normJp = normalizeJapaneseForComparison(expectedJapanese);
  const normRomaji = normalizeJapaneseForComparison(expectedRomaji);

  const distJp = levenshteinDistance(normJp, normSpoken);
  const simJp = normJp.length > 0 ? Math.max(0, 1 - distJp / Math.max(normJp.length, normSpoken.length)) : 0;

  const distRom = levenshteinDistance(normRomaji, normSpoken);
  const simRom = normRomaji.length > 0 ? Math.max(0, 1 - distRom / Math.max(normRomaji.length, normSpoken.length)) : 0;

  const best = Math.round(Math.max(simJp, simRom) * 100);
  if (best >= 80) {
    return {
      score: best,
      grade: 'Excellent',
      feedback: 'Natural cadence and clear vowel timing. Ready for real-world conversation.',
    };
  }
  if (best >= 50) {
    return {
      score: best,
      grade: 'Good',
      feedback: 'Understandable phrasing. Pay close attention to long vowels and pitch drop.',
    };
  }
  return {
    score: best,
    grade: 'Keep Practicing',
    feedback: 'Listen to the native audio once more and enunciate each mora evenly.',
  };
}

export function recordMasteredItem(
  current: LearningProgressState,
  itemId: string,
  xpGain = 25
): LearningProgressState {
  if (current.masteredIds.includes(itemId)) {
    return current;
  }
  const updatedMastered = [...current.masteredIds, itemId];
  return {
    ...current,
    masteredIds: updatedMastered,
    xp: current.xp + xpGain,
    completedLessons: Math.floor(updatedMastered.length / 3),
  };
}
