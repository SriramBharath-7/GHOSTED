import { createAudioPlayer } from 'expo-audio';
import { playSound, setSoundEnabled } from '@/services/sound';

jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));

test('sound toggle silences cues and playback failure cannot reject a completed action', async () => {
  const player = { seekTo: jest.fn().mockResolvedValue(undefined), play: jest.fn(), pause: jest.fn(), volume: 1 };
  (createAudioPlayer as jest.Mock).mockReturnValue(player);
  setSoundEnabled(false);
  await playSound('complete');
  expect(createAudioPlayer).not.toHaveBeenCalled();

  setSoundEnabled(true);
  await playSound('complete');
  expect(player.play).toHaveBeenCalledTimes(1);
  expect(player.volume).toBeLessThan(1);

  setSoundEnabled(false);
  expect(player.pause).toHaveBeenCalledTimes(1);
  await playSound('complete');
  expect(player.play).toHaveBeenCalledTimes(1);

  setSoundEnabled(true);
  player.seekTo.mockRejectedValueOnce(new Error('Audio unavailable'));
  await expect(playSound('complete')).resolves.toBeUndefined();
  expect(player.play).toHaveBeenCalledTimes(1);
});
