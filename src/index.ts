#!/usr/bin/env node
/**
 * bugmerge-stats - CLI entry point
 * Usage: bugmerge-stats --user <handle> --output <path.svg> [--theme dark|light] [--token <tok>] [--no-avatar] [--cache-ttl <minutes>]
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fetchAllMetrics, type FetchOptions } from './fetch.js';
import { computeMetrics, type MetricsResult } from './metrics.js';
import { renderCard } from './render.js';

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;
    if (arg === '--no-avatar') { args['no-avatar'] = true; continue; }
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = argv[i + 1];
      if (val && !val.startsWith('--')) { args[key] = val; i++; }
      else { args[key] = true; }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  const user = args['user'] as string | undefined;
  const output = args['output'] as string | undefined;
  const theme = (args['theme'] as string) || 'dark';
  const token = (args['token'] as string) || process.env['GITHUB_TOKEN'] || '';
  const noAvatar = Boolean(args['no-avatar']);
  const cacheTtlMinutes = parseInt((args['cache-ttl'] as string) || '360', 10);

  if (!user || !output) {
    console.error('Usage: bugmerge-stats --user <handle> --output <path.svg> [--theme dark|light] [--token <tok>] [--no-avatar] [--cache-ttl <minutes>]');
    process.exit(1);
  }

  const outputPath = resolve(output);
  const cacheFile = resolve(dirname(outputPath), '.bugmerge-stats-cache.json');

  // Cache check
  if (existsSync(cacheFile)) {
    try {
      const cache = JSON.parse(readFileSync(cacheFile, 'utf8')) as { user: string; fetchedAt: string; metrics: MetricsResult };
      const ageMinutes = (Date.now() - new Date(cache.fetchedAt).getTime()) / 60000;
      if (cache.user === user && ageMinutes < cacheTtlMinutes) {
        console.log(`[bugmerge-stats] Using cached data (${Math.round(ageMinutes)}m old, TTL ${cacheTtlMinutes}m)`);
        const svg = renderCard(cache.metrics, theme);
        writeFileSync(outputPath, svg, 'utf8');
        console.log(`[bugmerge-stats] Written to ${outputPath}`);
        return;
      }
    } catch { /* ignore corrupt cache */ }
  }

  const fetchOpts: FetchOptions = { user, token, noAvatar };
  console.log(`[bugmerge-stats] Fetching data for @${user}...`);
  const raw = await fetchAllMetrics(fetchOpts);
  const metrics = computeMetrics(raw);

  // Write cache
  writeFileSync(cacheFile, JSON.stringify({ user, fetchedAt: new Date().toISOString(), metrics }, null, 2), 'utf8');

  const svg = renderCard(metrics, theme);
  writeFileSync(outputPath, svg, 'utf8');
  console.log(`[bugmerge-stats] Written to ${outputPath}`);
}

main().catch(err => {
  console.error('[bugmerge-stats] Fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
