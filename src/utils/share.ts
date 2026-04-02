interface ShareStats {
  totalTilesCleared: number;
  longestChain: number;
  maxMultiplier: number;
}

/**
 * Generates shareable text for daily puzzle results.
 */
export function generateShareText(score: number, date: string, stats: ShareStats): string {
  const dateFormatted = new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  // Generate a visual representation using emojis
  const scoreEmoji = getScoreEmoji(score);
  const streakEmoji = stats.maxMultiplier >= 5 ? '🔥' : stats.maxMultiplier >= 3 ? '⚡' : '';

  const lines = [
    `★ CASCADE ★`,
    `Daily Puzzle - ${dateFormatted}`,
    ``,
    `${scoreEmoji} Score: ${score}`,
    `🎯 Tiles: ${stats.totalTilesCleared}`,
    `⛓️ Best chain: ${stats.longestChain}`,
    `${streakEmoji} Max combo: ${stats.maxMultiplier}x`.trim(),
    ``,
    `Play at: cascade-eosin.vercel.app`,
  ];

  return lines.join('\n');
}

function getScoreEmoji(score: number): string {
  if (score >= 1000) return '🏆';
  if (score >= 500) return '⭐';
  if (score >= 250) return '✨';
  return '🎮';
}

/**
 * Shares result using Web Share API with clipboard fallback.
 * Returns true if sharing succeeded, false otherwise.
 */
export async function shareResult(text: string): Promise<{ success: boolean; method: 'share' | 'clipboard' | 'none' }> {
  // Try Web Share API first (native mobile sharing)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'CASCADE Daily Result',
        text: text,
      });
      return { success: true, method: 'share' };
    } catch (err) {
      // User cancelled or error - fall through to clipboard
      if ((err as Error).name === 'AbortError') {
        return { success: false, method: 'none' };
      }
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(text);
    return { success: true, method: 'clipboard' };
  } catch {
    return { success: false, method: 'none' };
  }
}
