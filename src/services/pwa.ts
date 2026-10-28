/* Service worker (Workbox via vite-plugin-pwa): instalação, aviso de
   versão nova e preparação explícita para uso offline. */
import { offlineAssets } from '@/services/vendor';

export interface PwaHooks {
  onNeedRefresh(update: () => Promise<void>): void;
  onOfflineReady(): void;
}

export async function registerPwa(hooks: PwaHooks): Promise<void> {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  try {
    const { registerSW } = await import('virtual:pwa-register');
    const update = registerSW({
      immediate: true,
      onNeedRefresh: () => hooks.onNeedRefresh(() => update(true)),
      onOfflineReady: () => hooks.onOfflineReady(),
    });
  } catch (e) {
    console.warn('[matreader] service worker não registrado', e);
  }
}

/** Baixa OCR e recursos do pdf.js para o cache (CacheFirst no SW) e pede
 *  armazenamento persistente. Devolve quantos arquivos ficaram prontos. */
export async function prepareOffline(onProgress?: (done: number, total: number) => void): Promise<{ ok: number; total: number; persisted: boolean }> {
  let ok = 0;
  const total = offlineAssets.length;
  for (const url of offlineAssets) {
    try {
      const r = await fetch(url, { cache: 'reload' });
      if (r.ok) {
        await r.arrayBuffer();
        ok++;
      }
    } catch {}
    onProgress?.(ok, total);
  }
  let persisted = false;
  try {
    persisted = (await navigator.storage?.persist?.()) ?? false;
  } catch {}
  return { ok, total, persisted };
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e ? { usage: e.usage ?? 0, quota: e.quota ?? 0 } : null;
  } catch {
    return null;
  }
}

export async function offlineCacheStatus(): Promise<{ cached: number; total: number }> {
  let cached = 0;
  try {
    for (const url of offlineAssets) {
      const hit = await caches.match(new URL(url, location.href).href);
      if (hit) cached++;
    }
  } catch {}
  return { cached, total: offlineAssets.length };
}
