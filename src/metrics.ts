/**
 * metrics.ts - pure aggregation + rank computation
 * Input: RawData from fetch.ts
 * Output: MetricsResult consumed by render.ts
 */
import type { RawData, FiledAndFixedEntry } from './fetch.js';

export interface MetricsResult {
  handle: string;
  avatarUrl: string;
  issuesOpen: number;
  issuesClosed: number;
  issuesTotal: number;
  mergedPrCount: number;
  closedPrCount: number;
  reposContributed: number;
  commentThreadCount: number;
  filedAndFixedCount: number;
  filedAndFixedList: FiledAndFixedEntry[];
  issueReposTop3: string[];   // top 3 repos by issue count for display
  prReposTop3: string[];      // top 3 repos by PR count for display
  rank: 'S' | 'A' | 'B' | 'C' | 'D';
  rankScore: number;
}

function computeRank(r: Omit<MetricsResult, 'rank' | 'rankScore'>): { rank: MetricsResult['rank']; score: number } {
  const score =
    r.mergedPrCount * 4 +
    r.filedAndFixedCount * 3 +
    r.issuesClosed * 1.5 +
    r.reposContributed * 2 +
    r.commentThreadCount * 0.5;

  let rank: MetricsResult['rank'];
  if (score >= 200) rank = 'S';
  else if (score >= 100) rank = 'A';
  else if (score >= 50) rank = 'B';
  else if (score >= 20) rank = 'C';
  else rank = 'D';

  return { rank, score };
}

function topRepos(repos: string[]): string[] {
  const counts: Record<string, number> = {};
  for (const r of repos) counts[r] = (counts[r] ?? 0) + 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([repo]) => repo.split('/')[1] ?? repo);
}

export function computeMetrics(raw: RawData): MetricsResult {
  const reposContributed = new Set([...raw.reposFromIssues, ...raw.reposFromPrs]).size;

  const partial: Omit<MetricsResult, 'rank' | 'rankScore'> = {
    handle: raw.user,
    avatarUrl: raw.avatarUrl,
    issuesOpen: raw.issuesOpen,
    issuesClosed: raw.issuesClosed,
    issuesTotal: raw.issuesOpen + raw.issuesClosed,
    mergedPrCount: raw.mergedPrCount,
    closedPrCount: raw.closedPrCount,
    reposContributed,
    commentThreadCount: raw.commentThreadCount,
    filedAndFixedCount: raw.filedAndFixed.length,
    filedAndFixedList: raw.filedAndFixed,
    issueReposTop3: topRepos(raw.reposFromIssues),
    prReposTop3: topRepos(raw.reposFromPrs),
  };

  const { rank, score } = computeRank(partial);
  return { ...partial, rank, rankScore: Math.round(score) };
}
