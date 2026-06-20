function makeCtx() {
  return new ((window as any).AudioContext || (window as any).webkitAudioContext)();
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  gain = 0.12,
) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime + startOffset);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
  osc.start(ctx.currentTime + startOffset);
  osc.stop(ctx.currentTime + startOffset + duration);
}

export function playTapFeedback() {
  if (navigator.vibrate) navigator.vibrate(10);
  try {
    const ctx = makeCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.06);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
    setTimeout(() => ctx.close(), 200);
  } catch (_) {}
}

export function playCompletionFeedback() {
  if (navigator.vibrate) navigator.vibrate(40);
  try {
    const ctx = makeCtx();
    playTone(ctx, 523, 0, 0.15, 0.15);
    playTone(ctx, 783, 0.12, 0.25, 0.15);
    setTimeout(() => ctx.close(), 500);
  } catch (_) {}
}

export function playUndoFeedback() {
  if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
  try {
    const ctx = makeCtx();
    playTone(ctx, 783, 0, 0.15, 0.15);
    playTone(ctx, 523, 0.12, 0.25, 0.15);
    setTimeout(() => ctx.close(), 500);
  } catch (_) {}
}
