if (process.env.COZY_DEPLOY_MODE === 'windows-native') {
  const { deployWindows } = await import('./windows-deploy.mjs');
  await deployWindows();
} else if (!process.env.COZY_DEPLOY_MODE || process.env.COZY_DEPLOY_MODE === 'docker') {
  const { deploy } = await import('./deploy.mjs');
  await deploy();
} else {
  throw new Error('Set COZY_DEPLOY_MODE to windows-native or docker.');
}
