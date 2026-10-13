import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Vault credentials live only in the OS keystore (SecureStore), never in the
 * app database or backups. The PIN itself is never stored, only a salted hash.
 * The web build is a desktop preview with no keystore, so it falls back to
 * localStorage there; never ship the Vault on web.
 */
const keychain: Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'> =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (key) => localStorage.getItem(key),
        setItemAsync: async (key, value) => localStorage.setItem(key, value),
        deleteItemAsync: async (key) => localStorage.removeItem(key),
      }
    : SecureStore;

const KEYS = {
  hash: 'vault.pin.hash',
  salt: 'vault.pin.salt',
  biometrics: 'vault.biometrics',
  failures: 'vault.failures',
  lockedUntil: 'vault.lockedUntil',
} as const;

export const PIN_LENGTH = { min: 4, max: 8 };
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function hasPin(): Promise<boolean> {
  return (await keychain.getItemAsync(KEYS.hash)) !== null;
}

export async function setPin(pin: string): Promise<void> {
  const salt = toHex(Crypto.getRandomBytes(16));
  await keychain.setItemAsync(KEYS.salt, salt);
  await keychain.setItemAsync(KEYS.hash, await hashPin(pin, salt));
  await keychain.deleteItemAsync(KEYS.failures);
  await keychain.deleteItemAsync(KEYS.lockedUntil);
}

export type PinCheck =
  | { ok: true }
  | { ok: false; attemptsLeft: number }
  | { ok: false; lockedForMs: number };

export async function lockoutRemaining(): Promise<number> {
  const until = Number((await keychain.getItemAsync(KEYS.lockedUntil)) ?? 0);
  return Math.max(0, until - Date.now());
}

export async function verifyPin(pin: string): Promise<PinCheck> {
  const locked = await lockoutRemaining();
  if (locked > 0) return { ok: false, lockedForMs: locked };
  const [hash, salt] = await Promise.all([
    keychain.getItemAsync(KEYS.hash),
    keychain.getItemAsync(KEYS.salt),
  ]);
  if (hash && salt && (await hashPin(pin, salt)) === hash) {
    await keychain.deleteItemAsync(KEYS.failures);
    return { ok: true };
  }
  const failures = Number((await keychain.getItemAsync(KEYS.failures)) ?? 0) + 1;
  if (failures >= MAX_ATTEMPTS) {
    await keychain.setItemAsync(KEYS.lockedUntil, String(Date.now() + LOCKOUT_MS));
    await keychain.deleteItemAsync(KEYS.failures);
    return { ok: false, lockedForMs: LOCKOUT_MS };
  }
  await keychain.setItemAsync(KEYS.failures, String(failures));
  return { ok: false, attemptsLeft: MAX_ATTEMPTS - failures };
}

export async function biometricsAvailable(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

export async function biometricsEnabled(): Promise<boolean> {
  return (await keychain.getItemAsync(KEYS.biometrics)) === '1';
}

export async function setBiometricsEnabled(value: boolean): Promise<void> {
  await keychain.setItemAsync(KEYS.biometrics, value ? '1' : '0');
}

export async function unlockWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock',
    cancelLabel: 'Use PIN',
    disableDeviceFallback: true,
  });
  return result.success;
}

/** Used by "Reset app data". */
export async function clearVaultCredentials(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((key) => keychain.deleteItemAsync(key)));
}
