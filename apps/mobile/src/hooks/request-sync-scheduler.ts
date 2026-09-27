export function createRefreshScheduler(refresh: () => void, delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  return {
    schedule() {
      if (disposed) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        if (!disposed) refresh();
      }, delayMs);
    },
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
      timer = undefined;
    },
  };
}
