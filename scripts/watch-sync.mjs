import { watch } from 'chokidar';
import { cpSync, existsSync } from 'fs';

const DIST = 'dist/localstack-explorer';
const DEST = 'cli/localstack-explorer';

function sync() {
  if (existsSync(DIST)) {
    cpSync(DIST, DEST, { recursive: true });
    console.log(`[sync] ${DIST} → ${DEST}`);
  }
  if (existsSync('README.md')) {
    cpSync('README.md', 'cli/README.md');
    console.log('[sync] README.md → cli/README.md');
  }
}

// Debounce to avoid copying mid-build
let timer;
function debouncedSync() {
  clearTimeout(timer);
  timer = setTimeout(sync, 300);
}

const watcher = watch([DIST, 'README.md'], {
  ignoreInitial: false,
  awaitWriteFinish: { stabilityThreshold: 200 },
});

watcher
  .on('add', debouncedSync)
  .on('change', debouncedSync)
  .on('unlink', debouncedSync)
  .on('ready', () => console.log('[sync] Watching for changes…'));
