#!/usr/bin/env node
import {
  applyPatches,
  inspectPatches,
  recoverPatches,
  unpatchPatches
} from '../lib/apply.js';

const command = process.argv[2] ?? 'apply';
const dryRun = process.argv.includes('--dry-run');

try {
  let result;
  switch (command) {
    case 'apply':
      result = applyPatches({ dryRun });
      break;
    case 'unpatch':
      result = unpatchPatches({ dryRun });
      break;
    case 'check':
    case 'status':
      result = inspectPatches();
      break;
    case 'recover':
      result = recoverPatches();
      break;
    default:
      throw new Error('Unknown command "' + command + '". Use apply, unpatch, status, check, or recover.');
  }
  console.log(JSON.stringify(result, null, 2));
  if ((command === 'apply' || command === 'unpatch') && !dryRun && result.changedFiles > 0) {
    console.warn('Restart dsh web before continuing / 请重启 dsh web 后再继续。');
  }
} catch (error) {
  console.error('[dsh-temporary-chat] ' + (error instanceof Error ? error.stack ?? error.message : String(error)));
  process.exitCode = 1;
}
