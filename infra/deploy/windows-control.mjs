import { control, settings, startSupervisor } from './windows-common.mjs';

try {
  const config = await settings();
  const command = process.argv[2] ?? 'status';
  if (command === 'start') console.log(await startSupervisor(config));
  else if (command === 'stop') console.log(await control(config, '/stop', {}));
  else if (command === 'status') console.log(await control(config, '/status'));
  else throw new Error('Use start, stop or status.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
