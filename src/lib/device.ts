/**
 * What we tell the API about the device signing in, so push notifications
 * have somewhere to go.
 *
 * `device_type` is always known. `device_token` is the Firebase Cloud
 * Messaging registration token, which only exists after the browser has
 * granted notification permission -- so it starts absent and the push setup
 * calls `setPushToken` once it has one. A sign-in never waits for it.
 */

let pushToken: string | null = null;

export function setPushToken(token: string | null): void {
  pushToken = token;
}

export interface DeviceInfo {
  device_type: 'web';
  device_token?: string;
}

export function deviceInfo(): DeviceInfo {
  return { device_type: 'web', ...(pushToken ? { device_token: pushToken } : {}) };
}
