// One connection and fallback timer per tab, shared by all mounted views.
export function startRealtime() {
  let stream: EventSource | null = null;
  let connected = false;
  let lastRefresh = Date.now();
  let pending: number | undefined;
  const notify = () => {
    if (document.visibilityState !== 'visible' || pending !== undefined) return;
    pending = window.setTimeout(() => {
      pending = undefined;
      lastRefresh = Date.now();
      window.dispatchEvent(new Event('cifraya:update'));
    }, 250);
  };
  const connect = () => {
    if (document.visibilityState !== 'visible' || !navigator.onLine) {
      stream?.close(); stream = null; connected = false; return;
    }
    if (!stream) {
      stream = new EventSource('/api/events');
      stream.addEventListener('open', () => { connected = true; notify(); });
      stream.addEventListener('error', () => { connected = false; });
      stream.addEventListener('update', notify);
    }
    notify();
  };
  const timer = window.setInterval(() => {
    if (navigator.onLine && Date.now() - lastRefresh >= (connected ? 120_000 : 20_000)) notify();
  }, 10_000);
  document.addEventListener('visibilitychange', connect);
  window.addEventListener('online', connect);
  window.addEventListener('offline', connect);
  connect();
  return () => {
    stream?.close(); window.clearInterval(timer); window.clearTimeout(pending);
    document.removeEventListener('visibilitychange', connect);
    window.removeEventListener('online', connect); window.removeEventListener('offline', connect);
  };
}
