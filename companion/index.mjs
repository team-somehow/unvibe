import { acquireLock, loadConfig } from './config.mjs';
import { createCompanion } from './server.mjs';

let unlock, companion, stopping = false;
try {
  const config = await loadConfig();
  unlock = await acquireLock(config.dataDir);
  companion = await createCompanion(config);
  const link = new URL(config.frontendUrl);
  link.hash = new URLSearchParams({ token: config.token, bridge: companion.url }).toString();
  // This explicit connection link is the only place the pairing credential is printed.
  console.log(`Learnagram companion is listening on ${companion.url}`);
  console.log('Open this private connection link on this machine. Anyone with it can access selected local Claude sessions:');
  console.log(link.toString());
  console.log('Keep this terminal running. Claude credentials stay in Claude Code. Press Ctrl+C to disconnect.');
  async function shutdown() { if (stopping) return; stopping = true; await companion.close(); await unlock(); process.exit(0); }
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
} catch (error) {
  if (companion) await companion.close();
  if (unlock) await unlock();
  console.error(error.code === 'EADDRINUSE' ? 'The companion port is already in use. Stop the existing companion or set LEARNAGRAM_COMPANION_PORT.' : error.message);
  process.exitCode = 1;
}
