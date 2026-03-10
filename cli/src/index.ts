#!/usr/bin/env node

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import meow from 'meow';
import open from 'open';
import latestVersion from 'latest-version'; // Fetches the version directly from the registry
import semver from 'semver'; // For comparing versions
import packageJson from '../package.json' assert { type: 'json' };
import boxen from 'boxen';
const currentVersion = packageJson.version;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = new Hono();

// API: return update check result with 1 hour caching
app.get('/_api/check-updates', async (c) => {
  try {
    const result = await checkForUpdates();
    c.header('Cache-Control', 'public, max-age=3600');
    return c.json(result);
  } catch (err) {
    return c.json({ error: 'Failed to check for updates' }, 500);
  }
});

// Path to the Angular build output (relative to cli directory)
const distPath = join(__dirname, '..', 'localstack-explorer', 'browser');

// Serve static files
app.use('/*', serveStatic({ root: distPath }));

// SPA fallback - serve index.html for all routes that don't match static files
app.get('*', (c) => {
  const indexPath = join(distPath, 'index.html');
  const html = readFileSync(indexPath, 'utf-8');
  return c.html(html);
});

// Use `meow` for CLI parsing
const cli = meow(
  `${boxen('LocalStack Explorer')}

Modern, privacy-focused client-side UI for exploring
LocalStack S3 buckets

🌐 Online: https://vajahath.github.io/localstack-explorer/

Usage ══════════
  $ localstack-explorer [options]

Options ════════
  --port, -p       Port number (default: 4200) 🚀
  --hostname, -h   Hostname to bind to (default: localhost) 🌐
  --open, -o       Open in browser (default: false) 📖

Examples ═══════
  $ localstack-explorer --port=4200 --open
  $ localstack-explorer -p 8080 -h 0.0.0.0
  `,
  {
    importMeta: import.meta,
    flags: {
      port: {
        type: 'number',
        shortFlag: 'p',
        default: 4200,
      },
      hostname: {
        type: 'string',
        shortFlag: 'h',
        default: 'localhost',
      },
      open: {
        type: 'boolean',
        shortFlag: 'o',
        default: false,
      },
    },
  },
);

const port = Number(cli.flags.port ?? 4200);
const hostname = String(cli.flags.hostname ?? 'localhost');
const shouldOpen = Boolean(cli.flags.open ?? false);

// Validate port
if (Number.isNaN(port) || port < 1 || port > 65535) {
  console.error('❌ Invalid port number. Please provide a valid port between 1 and 65535.');
  process.exit(1);
}

if (!hostname || hostname.trim().length === 0) {
  console.error('❌ Invalid hostname. Please provide a non-empty hostname.');
  process.exit(1);
}

const server = serve({
  fetch: app.fetch,
  port,
  hostname,
});

// Handle port already in use error
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `❌ Port ${port} is already in use. Please choose another port with --port=<number>`,
    );
    process.exit(1);
  }
  console.error('❌ Server error:', err);
  process.exit(1);
});

console.log(`🌐 LocalStack Explorer running at http://${hostname}:${port}`);

if (shouldOpen) {
  const url = `http://${hostname}:${port}`;
  void (async () => {
    try {
      await open(url);
    } catch (err) {
      console.error('❌ Failed to open browser:', err);
    }
  })();
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down...');
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});

import updateNotifier from 'update-notifier';

updateNotifier({ pkg: packageJson }).notify();

export async function checkForUpdates(): Promise<{
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}> {
  const latest = await latestVersion('localstack-explorer');
  const updateAvailable = semver.lt(currentVersion, latest);
  return { currentVersion, latestVersion: latest, updateAvailable };
}

if (!(process.argv.includes('--help') || process.argv.includes('-h'))) {
  checkForUpdates()
    .then(async ({ currentVersion, latestVersion, updateAvailable }) => {
      if (!updateAvailable) return;

      console.log(
        boxen(
          `🚀 Update available: ${currentVersion} → ${latestVersion}\nRun \`npm install -g localstack-explorer\` to update.`,
        ),
      );
    })
    .catch((error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(
        `⚠️  Failed to check for updates: ${err.message}. Continuing without update check. If this persists, verify your network connection.`,
      );
      // if (err.stack) console.debug(err.stack);
    });
}