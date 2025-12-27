const { spawn } = require('child_process');

// Set Apple credentials - DO NOT commit real passwords to git!
// Set EXPO_APPLE_PASSWORD in your environment or pass via EAS secrets
process.env.EXPO_APPLE_ID = 'timebeunus.boyd@icloud.com';
process.env.EXPO_APPLE_TEAM_ID = 'DB9BF4C58Y';
// EXPO_APPLE_PASSWORD should be set in your environment variables

const child = spawn('eas', ['build', '--platform', 'ios', '--profile', 'production', '--no-wait'], {
  cwd: 'C:\\Users\\Timeb\\OneDrive\\TIME\\mobile',
  env: process.env,
  shell: true,
  stdio: ['pipe', 'inherit', 'inherit']
});

// Answer "y" to the login prompt
setTimeout(() => {
  child.stdin.write('y\n');
}, 3000);

child.on('close', (code) => {
  console.log(`Build process exited with code ${code}`);
});
