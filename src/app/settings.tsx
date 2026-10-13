import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  Bell,
  Download,
  FlaskConical,
  ListChecks,
  RotateCcw,
  Store,
  Upload,
  Vibrate,
  Volume2,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { PressableScale } from '@/components/ui/PressableScale';
import { Row, ToggleRow } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ConfirmSheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { toast } from '@/components/ui/Toast';
import { colors, fonts, space } from '@/config/theme';
import { getDb } from '@/db/database';
import { formatDate, isoToDateKey } from '@/domain/dates';
import { seedDemoHistory } from '@/dev/demoSeed';
import { type BackupFile, BackupError, exportBackup, importBackup, parseBackup, resetAllData } from '@/repo/backup';
import { pickBackupText, shareBackup } from '@/services/backupFiles';
import { haptics } from '@/services/haptics';
import { clearVaultCredentials } from '@/services/vaultAuth';
import { useGame } from '@/state/game';
import { remindersActive } from '@/state/selectors';

export default function SettingsScreen() {
  const settings = useGame((s) => s.settings);
  const today = useGame((s) => s.today);
  const updateSettings = useGame((s) => s.updateSettings);
  const setRemindersEnabled = useGame((s) => s.setRemindersEnabled);
  const permission = useGame((s) => s.reminderPermission);
  const reminders = useGame(remindersActive);
  const commit = useGame((s) => s.commit);
  const refreshReminders = useGame((s) => s.refreshReminders);
  const [name, setName] = useState(settings.playerName);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [resetText, setResetText] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  const saveName = () => {
    const trimmed = name.trim().slice(0, 24);
    if (trimmed && trimmed !== settings.playerName) void updateSettings({ playerName: trimmed });
    else setName(settings.playerName);
  };

  const toggleReminders = async (on: boolean) => {
    try {
      const permission = await setRemindersEnabled(on);
      if (on && permission === 'denied') toast('Notifications are blocked for GHOSTED.', 'error');
    } catch {
      toast('Could not update reminders. Try again.', 'error');
    }
  };

  const doExport = async () => {
    try {
      await shareBackup(await exportBackup(getDb(), 'main'), `ghosted-backup-${today}.json`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Export failed.', 'error');
    }
  };

  const doPick = async () => {
    try {
      const text = await pickBackupText();
      if (text === null) return;
      const file = parseBackup(text);
      if (file.kind !== 'main') throw new BackupError('This file can’t be imported here.');
      setPending(file);
    } catch (e) {
      haptics.error();
      toast(e instanceof BackupError ? e.message : 'Could not read that file.', 'error');
    }
  };

  const doImport = async () => {
    if (!pending) return;
    const file = pending;
    setPending(null);
    try {
      await importBackup(getDb(), file);
    } catch {
      haptics.error();
      toast('Import failed. Nothing was changed.', 'error');
      return;
    }
    await reload();
    haptics.success();
    toast('Backup restored');
  };

  const doReset = async () => {
    try {
      await resetAllData(getDb(), today);
      await clearVaultCredentials();
    } catch {
      haptics.error();
      toast('Could not finish the reset. Try again.', 'error');
      return;
    }
    await reload();
    setResetText('');
    setResetOpen(false);
    toast('All data erased');
    router.dismissAll();
  };

  /** After data is replaced: reload the store and re-check the restored reminder switch. */
  const reload = async () => {
    await commit();
    await refreshReminders();
    setName(useGame.getState().settings.playerName);
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen header={<Header back title="Settings" />}>
      <SectionTitle title="Player" />
      <TextField label="Name" value={name} onChangeText={setName} onBlur={saveName} onSubmitEditing={saveName} maxLength={24} autoCapitalize="characters" returnKeyType="done" />

      <SectionTitle title="Feel" />
      <Card style={styles.card}>
        <ToggleRow icon={Vibrate} title="Haptics" value={settings.haptics} onChange={(v) => void updateSettings({ haptics: v })} />
        <ToggleRow
          icon={Volume2}
          title="Sound effects"
          subtitle="Plays installed sound effects only"
          value={settings.sound}
          onChange={(v) => void updateSettings({ sound: v })}
        />
      </Card>

      <SectionTitle title="Reminders" />
      <Card style={styles.card}>
        <ToggleRow
          icon={Bell}
          title="Habit reminders"
          subtitle="Set times per habit in the habit editor"
          value={reminders}
          disabled={permission === 'unsupported'}
          onChange={(v) => void toggleReminders(v)}
        />
        {permission === 'unsupported' ? (
          <View style={styles.notice}>
            <Text variant="caption" color={colors.textMuted}>
              Reminders run in the installed GHOSTED app (not in Expo Go on Android or the web preview).
            </Text>
          </View>
        ) : null}
        {settings.reminders && permission === 'undetermined' ? (
          <View style={styles.notice}>
            <Text variant="caption" color={colors.textMuted}>
              Allow notifications to receive your scheduled habit reminders.
            </Text>
            <Button label="Allow notifications" kind="secondary" compact onPress={() => void toggleReminders(true)} />
          </View>
        ) : null}
        {permission === 'denied' ? (
          <View style={styles.notice}>
            <Text variant="caption" color={colors.warning}>
              Notifications are turned off for GHOSTED, so reminders can’t appear.
            </Text>
            <Button label="Open Android settings" kind="secondary" compact onPress={() => void Linking.openSettings()} />
          </View>
        ) : null}
      </Card>

      <SectionTitle title="Manage" />
      <Card style={styles.card}>
        <Row icon={ListChecks} title="Habits" subtitle="Create, edit, reorder, archive" onPress={() => router.push('/habits')} />
        <Row icon={Store} title="Rewards" subtitle="Edit and reorder in the Shop" onPress={() => router.navigate('/shop')} />
      </Card>

      <SectionTitle title="Your data" />
      <Card style={styles.card}>
        <Row icon={Download} title="Export backup" subtitle="Saves a JSON file you can keep anywhere" onPress={() => void doExport()} />
        <Row icon={Upload} title="Import backup" subtitle="Replaces current data with a backup" onPress={() => void doPick()} />
        <Row icon={RotateCcw} title="Reset all data" subtitle="Erase everything on this device" danger onPress={() => setResetOpen((o) => !o)} />
        {resetOpen ? (
          <View style={styles.notice}>
            <Text variant="caption" color={colors.danger}>
              This permanently erases all history, XP, coins, rewards, inventory and missions on this device. Export a backup first.
            </Text>
            <TextField label="Type RESET to confirm" value={resetText} onChangeText={setResetText} autoCapitalize="characters" />
            <Button label="Erase everything" kind="danger" disabled={resetText !== 'RESET'} onPress={() => void doReset()} />
          </View>
        ) : null}
      </Card>

      {__DEV__ ? (
        <>
          <SectionTitle title="Developer" />
          <Card style={styles.card}>
            <Row icon={FlaskConical} title="Load demo history" subtitle="Dev builds only · 120 days of sample completions" onPress={() => setDemoOpen(true)} />
          </Card>
        </>
      ) : null}

      <Footer version={version} />

      <ConfirmSheet
        visible={pending !== null}
        title="Restore this backup?"
        message={pending ? `Backup from ${formatDate(isoToDateKey(pending.exportedAt), today)}. Everything currently in the app will be replaced.` : ''}
        confirmLabel="Replace my data"
        destructive
        onCancel={() => setPending(null)}
        onConfirm={() => void doImport()}
      />
      <ConfirmSheet
        visible={demoOpen}
        title="Load demo history?"
        message="Adds generated completions for the last 120 days. For screenshots and testing only."
        confirmLabel="Load demo data"
        onCancel={() => setDemoOpen(false)}
        onConfirm={async () => {
          setDemoOpen(false);
          try {
            await seedDemoHistory(getDb(), today);
            await commit();
            toast('Demo history loaded');
          } catch {
            toast('Could not load demo history.', 'error');
          }
        }}
      />
    </Screen>
  );
}

/** Brand footer. A deliberate long press here is the private entrance. */
function Footer({ version }: { version: string }) {
  return (
    <PressableScale
      style={styles.footer}
      scaleTo={0.99}
      delayLongPress={1200}
      onLongPress={() => {
        haptics.tap();
        router.push('/vault');
      }}
      accessible={false}
    >
      <Text style={styles.wordmark}>GHOSTED</Text>
      <Text variant="caption" color={colors.textMuted}>
        v{version} · Disappear. Build. Return.
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: space.xs },
  notice: { gap: space.md, paddingBottom: space.md },
  footer: { alignItems: 'center', gap: space.xs, paddingVertical: space.xxl },
  wordmark: { fontFamily: fonts.display, fontSize: 16, letterSpacing: 6, color: colors.textMuted },
});
