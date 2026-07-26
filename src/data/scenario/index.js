import { prologue } from './prologue.js';
import { chapter1 } from './chapter1.js';
import { chapter2 } from './chapter2.js';
import { chapter3 } from './chapter3.js';
import { chapter4a } from './chapter4a.js';
import { chapter4b } from './chapter4b.js';
import { endings } from './endings.js';

/** Add every playable scene here; the runtime and static validator share this registry. */
export const scenes = { prologue, chapter1, chapter2, chapter3, chapter4a, chapter4b, ...endings };
