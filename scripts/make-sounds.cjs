// Reproducible, quiet System tones. No external samples or runtime synthesis.
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const directory = join(__dirname, '..', 'assets', 'sounds');
mkdirSync(directory, { recursive: true });
const sampleRate = 22050;
const cues = {
  complete: [[660, 0.09], [990, 0.12]],
  undo: [[550, 0.09], [440, 0.09]],
  celebrate: [[523.25, 0.12], [659.25, 0.12], [783.99, 0.2]],
  purchase: [[880, 0.08], [1174.66, 0.13]],
  redeem: [[880, 0.1], [660, 0.1], [440, 0.13]],
};

for (const [name, notes] of Object.entries(cues)) {
  const samples = [];
  for (const [frequency, duration] of notes) {
    const length = Math.round(sampleRate * duration);
    for (let i = 0; i < length; i++) {
      const envelope = Math.sin(Math.PI * i / length) ** 2;
      samples.push(Math.round(Math.sin(2 * Math.PI * frequency * i / sampleRate) * envelope * 7000));
    }
  }
  const wav = Buffer.alloc(44 + samples.length * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, i) => wav.writeInt16LE(sample, 44 + i * 2));
  writeFileSync(join(directory, `${name}.wav`), wav);
}
