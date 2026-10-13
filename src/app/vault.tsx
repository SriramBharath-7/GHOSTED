import { router } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { Download, FingerprintPattern, KeyRound, Lock, Upload } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { AppHeader } from '@/components/hud/AppHeader';
import { IconButton } from '@/components/ui/IconButton';
import { Row, ToggleRow } from '@/components/ui/Row';
import { Reveal, Screen } from '@/components/ui/Screen';
import { ConfirmSheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/Toast';
import { PinPad } from '@/components/vault/PinPad';
import { VaultHome } from '@/components/vault/VaultHome';
import { WorldScene } from '@/components/pixel/WorldScene';
import { Text } from '@/components/ui/Text';
import { colors, space } from '@/config/theme';
import { getDb } from '@/db/database';
import { type BackupFile, BackupError, exportBackup, importBackup, parseBackup } from '@/repo/backup';
import { pickBackupText, shareBackup } from '@/services/backupFiles';
import { haptics } from '@/services/haptics';
import { playSound } from '@/services/sound';
import {
  biometricsAvailable,
  biometricsEnabled,
  hasPin,
  lockoutRemaining,
  setBiometricsEnabled,
  setPin,
  unlockWithBiometrics,
  verifyPin,
} from '@/services/vaultAuth';
import { useGame } from '@/state/game';

type Phase = 'checking' | 'create' | 'confirm' | 'locked' | 'open';

/**
 * Private area. Reached only by a long press on the Settings footer.
 * Screenshots and the recents thumbnail are blocked while it is mounted,
 * and it locks itself whenever the app leaves the foreground.
 */
export default function VaultScreen() {
  // Native only: blocks screenshots and blanks the recents thumbnail.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void ScreenCapture.preventScreenCaptureAsync('vault');
    return () => void ScreenCapture.allowScreenCaptureAsync('vault');
  }, []);
  const [phase, setPhase] = useState<Phase>('checking');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [lockedMs, setLockedMs] = useState(0);
  const [bio, setBio] = useState({ available: false, enabled: false });
  const changingPin = useRef(false);

  const fail = (message: string) => {
    haptics.error();
    setError(message);
    setErrorKey((k) => k + 1);
  };

  const tryBiometric = useCallback(async () => {
    if (await unlockWithBiometrics()) {
      haptics.success();
      playSound('unlock');
      setPhase('open');
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const [pin, available, enabled, locked] = await Promise.all([
        hasPin(),
        biometricsAvailable(),
        biometricsEnabled(),
        lockoutRemaining(),
      ]);
      setBio({ available, enabled });
      setLockedMs(locked);
      setPhase(pin ? 'locked' : 'create');
      if (pin && available && enabled && locked === 0) void tryBiometric();
    })();
  }, [tryBiometric]);

  // Leaving the app closes the vault.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        setPhase((p) => (p === 'open' ? 'locked' : p));
      }
    });
    return () => sub.remove();
  }, []);

  // Lockout countdown.
  useEffect(() => {
    if (lockedMs <= 0) return;
    const timer = setTimeout(() => setLockedMs((ms) => Math.max(0, ms - 1000)), 1000);
    return () => clearTimeout(timer);
  }, [lockedMs]);

  const submitUnlock = async (pin: string) => {
    const result = await verifyPin(pin);
    if (result.ok) {
      haptics.success();
      playSound('unlock');
      setError(null);
      setPhase('open');
    } else if ('lockedForMs' in result) {
      setLockedMs(result.lockedForMs);
      fail('Too many attempts.');
    } else {
      fail(`Wrong PIN · ${result.attemptsLeft} ${result.attemptsLeft === 1 ? 'try' : 'tries'} left`);
    }
  };

  const submitCreate = (pin: string) => {
    setDraft(pin);
    setError(null);
    setPhase('confirm');
  };

  const submitConfirm = async (pin: string) => {
    if (pin !== draft) {
      setPhase('create');
      fail('PINs didn’t match. Start again.');
      return;
    }
    await setPin(pin);
    haptics.success();
    playSound('unlock');
    setError(null);
    setPhase('open');
    if (changingPin.current) {
      changingPin.current = false;
      toast('PIN changed');
    }
  };

  const content =
    phase === 'checking' ? null : phase === 'open' ? (
      <Reveal>
      <View style={styles.unlocked}>
        <VaultHome />
        <VaultSettings
          bio={bio}
          onBioChange={async (on) => {
            if (on && !(await unlockWithBiometrics())) return;
            await setBiometricsEnabled(on);
            setBio((b) => ({ ...b, enabled: on }));
          }}
          onChangePin={() => {
            changingPin.current = true;
            setPhase('create');
          }}
        />
      </View>
      </Reveal>
    ) : (
      <View style={styles.pad}>
        {phase === 'locked' ? (
          <PinPad
            key={`unlock-${errorKey}`}
            title="Enter PIN"
            subtitle={lockedMs > 0 ? `Try again in ${Math.ceil(lockedMs / 1000)}s` : undefined}
            error={error}
            errorKey={error ? errorKey : 0}
            disabled={lockedMs > 0}
            onSubmit={(pin) => void submitUnlock(pin)}
            onBiometric={bio.available && bio.enabled ? () => void tryBiometric() : undefined}
          />
        ) : (
          <PinPad
            key={`${phase}-${errorKey}`}
            title={phase === 'create' ? 'Choose a PIN' : 'Confirm PIN'}
            subtitle={phase === 'create' ? '4 to 8 digits' : 'Enter it once more'}
            error={error}
            errorKey={error ? errorKey : 0}
            onSubmit={phase === 'create' ? submitCreate : (pin) => void submitConfirm(pin)}
          />
        )}
      </View>
    );

  return (
    <Screen
      tint={colors.vault}
      header={
        <AppHeader
          back
          ghost
          controls={false}
          right={
            phase === 'open' ? (
              <IconButton
                icon={Lock}
                label="Lock"
                filled
                onPress={() => {
                  haptics.tap();
                  router.back();
                }}
              />
            ) : null
          }
        />
      }
    >
      <WorldScene variant="vault" title={phase === 'open' ? 'Keep your own promise' : 'A quiet place'} subtitle="Some things are just for you." height={150} />
      {content}
    </Screen>
  );
}

function VaultSettings({
  bio,
  onBioChange,
  onChangePin,
}: {
  bio: { available: boolean; enabled: boolean };
  onBioChange: (on: boolean) => Promise<void>;
  onChangePin: () => void;
}) {
  const today = useGame((s) => s.today);
  const commit = useGame((s) => s.commit);
  const [pending, setPending] = useState<BackupFile | null>(null);

  const doExport = async () => {
    try {
      await shareBackup(await exportBackup(getDb(), 'vault'), `ghosted-${today}-p.json`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed.', 'error');
    }
  };

  const doPick = async () => {
    try {
      const text = await pickBackupText();
      if (text === null) return;
      const file = parseBackup(text);
      if (file.kind !== 'vault') throw new BackupError('This file belongs in Settings, not here.');
      setPending(file);
    } catch (e) {
      haptics.error();
      toast(e instanceof BackupError ? e.message : 'Could not read that file.', 'error');
    }
  };

  return (
    <View style={styles.settings}>
      <Text variant="title" color={colors.vaultDim}>Private settings</Text>
      <Card style={styles.card}>
        {bio.available ? (
          <ToggleRow
            icon={FingerprintPattern}
            title="Unlock with fingerprint"
            value={bio.enabled}
            onChange={(on) => void onBioChange(on)}
          />
        ) : null}
        <Row icon={KeyRound} title="Change PIN" onPress={onChangePin} />
        <Row icon={Download} title="Export private backup" subtitle="Separate from the main backup. Not encrypted: keep it private." onPress={() => void doExport()} />
        <Row icon={Upload} title="Import private backup" onPress={() => void doPick()} />
      </Card>
      <ConfirmSheet
        visible={pending !== null}
        title="Restore private backup?"
        message="This replaces the counter and its history."
        confirmLabel="Restore"
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          const file = pending;
          setPending(null);
          try {
            await importBackup(getDb(), file);
            await commit();
            toast('Restored');
          } catch {
            toast('Import failed. Nothing was changed.', 'error');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  unlocked: { gap: space.md },
  pad: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: space.md },
  settings: { gap: space.md, marginTop: space.xl },
  card: { paddingVertical: space.xs },
});
