import { inspectPatches } from './lib/apply.js';

export function apply() {
  try {
    const result = inspectPatches();
    if (result.state !== 'patched') {
      console.warn('[dsh-temporary-chat] Patch is not applied. Stop DSH Web and run the explicit apply command before restarting / 补丁尚未应用，请停止 DSH Web，执行显式 apply 命令后再重启。');
    }
  } catch (error) {
    console.error('[dsh-temporary-chat] Patch check refused / 补丁状态检查拒绝:', error);
  }
  return () => {};
}

export default apply;
