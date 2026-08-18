import { applyPatches } from './lib/apply.js';

export function apply() {
  try {
    const result = applyPatches();
    if (result.changedFiles > 0) {
      console.warn('[dsh-temporary-chat] Patch applied. Restart dsh web before continuing / 补丁已应用，请重启 dsh web 后再继续。');
    }
  } catch (error) {
    console.error('[dsh-temporary-chat] Refused to patch DSH / 已拒绝修改 DSH:', error);
  }
  return () => {};
}

export default apply;
