'use client';

import { getNetworkClient, WebRTCNetworkClient, resetNetworkClient } from './webrtc-client';

export type { NetworkRole } from './webrtc-client';
export { getNetworkClient, resetNetworkClient };

// Interface compatible with previous getSocket() usages
export function getSocket(): WebRTCNetworkClient {
  return getNetworkClient();
}

export function disconnectSocket(): void {
  resetNetworkClient();
}
