/**
 * Custom dev script that prints a clear banner showing the PC's actual
 * IP address before starting Next.js. This resolves the confusion where
 * Next.js shows "Network: http://0.0.0.0:3000" — which is NOT an address
 * you can open in a browser. Users need their real IP (e.g. 192.168.0.103).
 */
const { execSync } = require('child_process');
const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (!iface.internal && iface.family === 'IPv4') {
        return iface.address;
      }
    }
  }
  return null;
}

const ip = getLocalIP();

console.log('');
console.log('============================================================');
console.log('  PC Memorial Kalawati Hospital - Prescription Management');
console.log('============================================================');
console.log('');
console.log('  HOW TO ACCESS THE APP:');
console.log('');
console.log('  On THIS computer:');
console.log('    http://localhost:3000');
console.log('');
if (ip) {
  console.log('  On OTHER devices (phone, tablet, other PC on same WiFi):');
  console.log(`    http://${ip}:3000   <-- USE THIS ADDRESS`);
  console.log('');
  console.log('  >>> The address above is your PC\'s real IP address. <<<');
  console.log('  >>> Type it into any browser on any device on same WiFi. <<<');
} else {
  console.log('  On OTHER devices: Run "ipconfig" in Command Prompt to find');
  console.log('  your IPv4 Address, then use http://YOUR-IP:3000');
}
console.log('');
console.log('  NOTE: Below, Next.js will show "Network: http://0.0.0.0:3000"');
console.log('  This 0.0.0.0 is NORMAL - it just means "all interfaces".');
console.log('  Do NOT type 0.0.0.0 in your browser - use the IP address above.');
console.log('');
console.log('  - All devices must be on the same WiFi');
console.log('  - All devices auto-sync every 15 seconds');
console.log('  - Windows Firewall may prompt - click "Allow access"');
console.log('  - Press Ctrl+C to stop the server');
console.log('');
console.log('============================================================');
console.log('');

// Start Next.js dev server with network access enabled
// The -H 0.0.0.0 makes the server listen on all network interfaces
// so other devices on the WiFi can connect using the PC's IP address
const { spawn } = require('child_process');

// Build the command. We run npm with shell:true so it works reliably on
// both Windows (npm.cmd) and Linux/macOS. Arguments are safe (no user input).
const env = { ...process.env, FORCE_COLOR: '1' };
delete env.NO_COLOR; // avoid "NO_COLOR ignored due to FORCE_COLOR" warning

const child = spawn('npm run dev:next', [], {
  stdio: 'inherit',
  shell: true,
  env,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

// Forward Ctrl+C to the child process so the server shuts down cleanly
process.on('SIGINT', () => {
  if (!child.killed) child.kill('SIGINT');
});
