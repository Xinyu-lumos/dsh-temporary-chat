import { applyPatches } from './lib/apply.js';

export function apply() {
  applyPatches();
  return () => {};
}

export default apply;
