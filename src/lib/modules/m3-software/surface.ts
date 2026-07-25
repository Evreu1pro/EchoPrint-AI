// ============================================================
// API + storage surface probe
// ------------------------------------------------------------
// Two jobs:
//
//   1. Collect the attack-surface facts that M4 used to read straight from
//      `navigator` / `SharedArrayBuffer` inside its scoring function. Doing
//      it here keeps computeModule4() a pure function of its inputs, so it
//      is testable and SSR-safe.
//   2. Audit where a persistent id can actually be parked. Clearing cookies
//      is not the same as clearing state, and this enumerates the places
//      that survive it.
// ============================================================

export interface StorageSlot {
  id: string;
  label: string;
  available: boolean;
  /** We successfully wrote and read a marker back. */
  writable: boolean;
  /** Plain-language note about persistence. */
  note: string;
}

export interface ApiSurface {
  sharedArrayBuffer: boolean;
  crossOriginIsolated: boolean;
  webUsb: boolean;
  webBluetooth: boolean;
  webHid: boolean;
  webSerial: boolean;
  webMidi: boolean;
  webNfc: boolean;
  serviceWorker: boolean;
  geolocation: boolean;
  notifications: boolean;
  webrtc: boolean;
  /** Storage mechanisms that can hold a tracking id. */
  storage: StorageSlot[];
  /** How many storage slots accepted a write. */
  persistentSlots: number;
  findings: string[];
}

const PROBE_KEY = '__echoprint_surface_probe__';

function has(target: object, key: string): boolean {
  try {
    return key in target;
  } catch {
    return false;
  }
}

function probeWebStorage(
  id: string,
  label: string,
  store: () => Storage | undefined,
  note: string
): StorageSlot {
  try {
    const s = store();
    if (!s) return { id, label, available: false, writable: false, note: 'Not available' };
    s.setItem(PROBE_KEY, '1');
    const ok = s.getItem(PROBE_KEY) === '1';
    s.removeItem(PROBE_KEY);
    return { id, label, available: true, writable: ok, note };
  } catch {
    // Private mode / blocked storage throws here.
    return { id, label, available: false, writable: false, note: 'Blocked (private mode?)' };
  }
}

async function probeStorage(): Promise<StorageSlot[]> {
  const slots: StorageSlot[] = [];

  slots.push(
    probeWebStorage(
      'localStorage',
      'localStorage',
      () => window.localStorage,
      'Survives cookie clearing unless "site data" is cleared too.'
    )
  );
  slots.push(
    probeWebStorage(
      'sessionStorage',
      'sessionStorage',
      () => window.sessionStorage,
      'Per-tab only — dies with the tab.'
    )
  );

  slots.push({
    id: 'cookies',
    label: 'Cookies',
    available: typeof navigator !== 'undefined' && navigator.cookieEnabled === true,
    writable: navigator.cookieEnabled === true,
    note: 'The one thing everybody knows how to clear.',
  });

  // IndexedDB
  try {
    const available = typeof indexedDB !== 'undefined';
    slots.push({
      id: 'indexedDB',
      label: 'IndexedDB',
      available,
      writable: available,
      note: 'Holds structured data; commonly missed by "clear cookies".',
    });
  } catch {
    slots.push({
      id: 'indexedDB',
      label: 'IndexedDB',
      available: false,
      writable: false,
      note: 'Blocked',
    });
  }

  // Cache API
  try {
    const available = typeof caches !== 'undefined';
    let writable = false;
    if (available) {
      try {
        const cache = await caches.open(PROBE_KEY);
        await cache.put(
          new Request(`/${PROBE_KEY}`),
          new Response('1')
        );
        writable = Boolean(await cache.match(`/${PROBE_KEY}`));
        await caches.delete(PROBE_KEY);
      } catch {
        writable = false;
      }
    }
    slots.push({
      id: 'cacheApi',
      label: 'Cache API',
      available,
      writable,
      note: 'Can store an id inside a cached response body.',
    });
  } catch {
    slots.push({ id: 'cacheApi', label: 'Cache API', available: false, writable: false, note: 'Blocked' });
  }

  // Service worker
  const swAvailable = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  slots.push({
    id: 'serviceWorker',
    label: 'Service Worker',
    available: swAvailable,
    writable: false,
    note: swAvailable
      ? 'Can re-seed every other storage slot after you clear them.'
      : 'Not available',
  });

  // window.name survives cross-origin navigation within the same tab.
  slots.push({
    id: 'windowName',
    label: 'window.name',
    available: typeof window !== 'undefined',
    writable: typeof window !== 'undefined',
    note: 'Ancient trick: survives navigation inside the same tab.',
  });

  return slots;
}

export async function collectSurface(): Promise<ApiSurface> {
  const findings: string[] = [];
  const nav: Navigator = navigator;

  const sharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const isolated =
    typeof crossOriginIsolated !== 'undefined' ? Boolean(crossOriginIsolated) : false;

  const surface = {
    sharedArrayBuffer,
    crossOriginIsolated: isolated,
    webUsb: has(nav, 'usb'),
    webBluetooth: has(nav, 'bluetooth'),
    webHid: has(nav, 'hid'),
    webSerial: has(nav, 'serial'),
    webMidi: has(nav, 'requestMIDIAccess'),
    webNfc: typeof window !== 'undefined' && has(window, 'NDEFReader'),
    serviceWorker: has(nav, 'serviceWorker'),
    geolocation: has(nav, 'geolocation'),
    notifications: typeof window !== 'undefined' && has(window, 'Notification'),
    webrtc: typeof window !== 'undefined' && has(window, 'RTCPeerConnection'),
  };

  if (surface.sharedArrayBuffer) {
    findings.push(
      'SharedArrayBuffer is exposed — enables high-resolution timing side channels.'
    );
  }
  const deviceApis = [
    surface.webUsb && 'WebUSB',
    surface.webBluetooth && 'Web Bluetooth',
    surface.webHid && 'WebHID',
    surface.webSerial && 'Web Serial',
  ].filter(Boolean) as string[];
  if (deviceApis.length) {
    findings.push(`Physical-device APIs reachable: ${deviceApis.join(', ')}.`);
  }

  const storage = await probeStorage();
  const persistentSlots = storage.filter((s) => s.writable).length;
  if (persistentSlots > 2) {
    findings.push(
      `${persistentSlots} storage mechanisms accepted a write — clearing cookies alone would not reset you.`
    );
  }

  return { ...surface, storage, persistentSlots, findings };
}
