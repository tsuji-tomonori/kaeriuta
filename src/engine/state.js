import { createFlagState } from './flags.js';
import { createParams } from './params.js';
import { createExecutionStack } from './execution.js';

export function createGameState() {
  return {
    version: 2, sceneId: 'prologue', executionStack: createExecutionStack(), flags: createFlagState(), items: [],
    params: createParams(), logs: {}, read: {}, choices: {}, route: null, endingId: null,
  };
}

export function cloneState(state) { return structuredClone(state); }
