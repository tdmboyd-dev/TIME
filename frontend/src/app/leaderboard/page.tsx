'use client';

/**
 * Leaderboard Page
 *
 * Uses the consolidated Leaderboard component from components/social
 * which fetches real data from /api/v1/social/leaderboard
 */

import { Leaderboard } from '@/components/social/Leaderboard';

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <Leaderboard />
    </div>
  );
}
