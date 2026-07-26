const DEFAULT_AUTO_BASE = 600;
const DEFAULT_AUTO_PER_CHARACTER = 45;
const DEFAULT_SKIP_INTERVAL = 24;

export function createPlayback({
  advance,
  isReadNode = () => false,
  getSettings = () => ({}),
  onModeChange = () => {},
  setTimeout: schedule = globalThis.setTimeout,
  clearTimeout: cancel = globalThis.clearTimeout,
} = {}) {
  const modes = { skip: false, auto: false };
  let timer = null;
  let latest = {};
  let hasNotification = false;

  const clearTimer = () => {
    if (timer !== null) cancel(timer);
    timer = null;
  };
  const emit = () => onModeChange({ ...modes });
  const setModes = (skip, auto) => {
    const changed = modes.skip !== skip || modes.auto !== auto;
    modes.skip = skip;
    modes.auto = auto;
    clearTimer();
    if (changed) emit();
  };
  const isEnd = (nodeType) => ['end', 'ending', 'END'].includes(nodeType);
  const isRead = (info, settings) => settings.skipAll
    || info.read === true
    || (info.read === undefined && isReadNode(info.nodeKey));

  const arm = () => {
    clearTimer();
    const settings = getSettings?.() || {};
    if (latest.choicesActive || latest.nodeType === 'choice'
      || latest.partActive || latest.nodeType === 'call'
      || latest.dialogActive || latest.backlogActive || latest.notebookActive
      || isEnd(latest.nodeType)) {
      setModes(false, false);
      return;
    }
    if (modes.skip) {
      if (!isRead(latest, settings)) {
        setModes(false, false);
        return;
      }
      const interval = Math.min(30, Math.max(16,
        Number(settings.skipInterval) || DEFAULT_SKIP_INTERVAL));
      timer = schedule(() => {
        timer = null;
        if (modes.skip) advance?.();
      }, interval);
      return;
    }
    if (modes.auto && !latest.revealing) {
      const coefficient = Number.isFinite(Number(settings.autoWait))
        ? Math.max(0, Number(settings.autoWait)) : 1;
      const base = Number.isFinite(Number(settings.autoBaseWait))
        ? Math.max(0, Number(settings.autoBaseWait)) : DEFAULT_AUTO_BASE;
      const perCharacter = Number.isFinite(Number(settings.autoCharacterWait))
        ? Math.max(0, Number(settings.autoCharacterWait)) : DEFAULT_AUTO_PER_CHARACTER;
      const delay = Math.max(0, base + (Number(latest.textLength) || 0) * perCharacter * coefficient);
      timer = schedule(() => {
        timer = null;
        if (modes.auto) advance?.();
      }, delay);
    }
  };

  return {
    modes,
    toggleSkip() {
      const next = !modes.skip;
      setModes(next, false);
      if (next && hasNotification) arm();
      return modes.skip;
    },
    toggleAuto() {
      const next = !modes.auto;
      setModes(false, next);
      if (next && hasNotification) arm();
      return modes.auto;
    },
    stop() {
      setModes(false, false);
    },
    notify(info = {}) {
      latest = { ...latest, ...info };
      hasNotification = true;
      arm();
    },
  };
}
