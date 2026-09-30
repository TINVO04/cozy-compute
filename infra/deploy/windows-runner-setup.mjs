import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { run, settings, within } from './windows-common.mjs';

try {
  if (process.platform !== 'win32') throw new Error('Runner setup requires Windows.');
  const config = await settings();
  const root = resolve(process.env.COZY_RUNNER_DIR ?? 'D:/CozyGameRunner');
  if (
    within(config.root, root) ||
    within(root, config.root) ||
    within(process.cwd(), root) ||
    within(root, process.cwd())
  )
    throw new Error('Runner directory must be separate from production and the checkout.');
  await mkdir(root);
  const account = run('whoami.exe', [], root, undefined, true);
  run(
    'icacls.exe',
    [
      root,
      '/inheritance:r',
      '/grant:r',
      `${account}:(OI)(CI)F`,
      '*S-1-5-18:(OI)(CI)F',
      '*S-1-5-32-544:(OI)(CI)F',
    ],
    root,
  );
  const downloads = JSON.parse(
    run('gh', ['api', 'repos/TINVO04/cozy-compute/actions/runners/downloads'], root, undefined, true),
  );
  const release = downloads.find((entry) => entry.os === 'win' && entry.architecture === 'x64');
  if (!release || !/^[a-f0-9]{64}$/.test(release.sha256_checksum))
    throw new Error('Runner release checksum unavailable.');
  const response = await fetch(release.download_url);
  if (!response.ok) throw new Error('Runner download failed.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== release.sha256_checksum)
    throw new Error('Runner checksum mismatch.');
  await writeFile(join(root, 'runner.zip'), bytes);
  run(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      'Expand-Archive -LiteralPath runner.zip -DestinationPath .',
    ],
    root,
  );
  const registration = JSON.parse(
    run(
      'gh',
      ['api', '--method', 'POST', 'repos/TINVO04/cozy-compute/actions/runners/registration-token'],
      root,
      undefined,
      true,
    ),
  );
  // Token is handled in this process; never printed or written to a command file.
  run(
    join(root, 'bin/Runner.Listener.exe'),
    [
      'configure',
      '--unattended',
      '--url',
      'https://github.com/TINVO04/cozy-compute',
      '--token',
      registration.token,
      '--name',
      'cozy-windows-production',
      '--labels',
      'cozy-production',
      '--work',
      '_work',
    ],
    root,
  );
  console.log(`Runner configured at ${root}; install its startup task before enabling AUTO_DEPLOY.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
