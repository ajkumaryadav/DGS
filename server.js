/**
 * District Governance Suite (DGS) - Launcher & Service Management Server
 * Dual-stack IPv4 & IPv6 listener for LAN & Localhost.
 * Supports Port 80 (Standard HTTP) & Port 8000 (Fallback / Alt).
 * Provides static portal assets, persistent applications.json storage,
 * role-based multi-user management, and real-time Windows Service health control.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const crypto = require('crypto');
const { execFile, exec } = require('child_process');

const PORT = parseInt(process.env.PORT || '8000', 10);
const ROOT = __dirname;
const NSSM_PATH = 'D:\\aj\\Tools\\nssm.exe';
const USERS_CONFIG_PATH = path.join(ROOT, 'admin_config.json');
const APPLICATIONS_JSON_PATH = path.join(ROOT, 'applications.json');

// Active authenticated session tokens in memory: Map<token, { userId, username, role, loginAt }>
const activeSessions = new Map();

/**
 * Hash password with SHA-256
 * @param {string} pwd
 * @returns {string}
 */
function hashPassword(pwd) {
  return crypto.createHash('sha256').update(String(pwd)).digest('hex');
}

/**
 * Load or initialize user config
 * Supports multi-user database structure: { users: [...] }
 * Backward compatible with legacy { username, passwordHash } format.
 * @returns {{ users: Array<{ id: string, username: string, fullName: string, passwordHash: string, role: string, createdAt: string, updatedAt: string }> }}
 */
function getUserConfig() {
  try {
    if (fs.existsSync(USERS_CONFIG_PATH)) {
      const raw = fs.readFileSync(USERS_CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(raw);

      if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
        return parsed;
      }

      // Migrate legacy single admin format
      if (parsed && parsed.username && parsed.passwordHash) {
        const migrated = {
          users: [
            {
              id: 'usr_admin',
              username: parsed.username,
              fullName: 'District Administrator',
              passwordHash: parsed.passwordHash,
              role: 'superadmin',
              createdAt: parsed.updatedAt || new Date().toISOString(),
              updatedAt: parsed.updatedAt || new Date().toISOString()
            }
          ]
        };
        saveUserConfig(migrated);
        return migrated;
      }
    }
  } catch (e) {
    console.error('Error reading admin_config.json:', e.message);
  }

  // Default initial superadmin: admin / dgs@admin2026
  const defaultConfig = {
    users: [
      {
        id: 'usr_admin',
        username: 'admin',
        fullName: 'District Administrator',
        passwordHash: hashPassword('dgs@admin2026'),
        role: 'superadmin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  };

  saveUserConfig(defaultConfig);
  return defaultConfig;
}

/**
 * Save updated user config
 * @param {Object} cfg
 * @returns {boolean}
 */
function saveUserConfig(cfg) {
  try {
    fs.writeFileSync(USERS_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving admin_config.json:', e.message);
    return false;
  }
}

/**
 * Check if request has a valid active admin session
 * @param {http.IncomingMessage} req
 * @returns {{ valid: boolean, user: Object|null, token: string }}
 */
function getSessionInfo(req) {
  const authHeader = req.headers['authorization'] || '';
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }
  if (!token) {
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      token = parsedUrl.searchParams.get('token') || '';
    } catch (e) {}
  }

  if (token && activeSessions.has(token)) {
    return { valid: true, user: activeSessions.get(token), token };
  }
  return { valid: false, user: null, token: '' };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

/**
 * Asynchronously check if a TCP port is open and accepting connections
 * @param {number} port
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
function checkPortOpen(port, timeoutMs = 800) {
  if (!port || isNaN(port)) return Promise.resolve(false);
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isDone = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (!isDone) {
        isDone = true;
        socket.destroy();
        resolve(true);
      }
    });

    socket.on('timeout', () => {
      if (!isDone) {
        isDone = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.on('error', () => {
      if (!isDone) {
        isDone = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.connect(port, '127.0.0.1');
  });
}

/**
 * Asynchronously query Windows service status via NSSM, fallback to sc.exe & PowerShell
 * @param {string} serviceName
 * @returns {Promise<string>} SERVICE_RUNNING | SERVICE_STOPPED | SERVICE_PAUSED | SERVICE_NOT_INSTALLED | UNKNOWN
 */
function queryServiceStatusAsync(serviceName) {
  if (!serviceName) return Promise.resolve('NOT_CONFIGURED');

  return new Promise((resolve) => {
    if (fs.existsSync(NSSM_PATH)) {
      execFile(NSSM_PATH, ['status', serviceName], { encoding: 'utf16le', timeout: 3000 }, (err, stdout) => {
        if (!err && stdout && stdout.trim()) {
          const status = stdout.trim();
          if (status.includes('SERVICE_RUNNING') || status.includes('RUNNING')) return resolve('SERVICE_RUNNING');
          if (status.includes('SERVICE_STOPPED') || status.includes('STOPPED')) return resolve('SERVICE_STOPPED');
          if (status.includes('SERVICE_PAUSED') || status.includes('PAUSED')) return resolve('SERVICE_PAUSED');
          return resolve(status);
        }
        fallbackToSc(serviceName, resolve);
      });
    } else {
      fallbackToSc(serviceName, resolve);
    }
  });
}

function fallbackToSc(serviceName, resolve) {
  execFile('sc.exe', ['query', serviceName], { encoding: 'utf8', timeout: 3000 }, (err, stdout, stderr) => {
    if (stdout) {
      const match = stdout.match(/STATE\s*:\s*\d+\s+([A-Z_]+)/);
      if (match && match[1]) {
        return resolve('SERVICE_' + match[1]);
      }
    }
    if (stderr && (stderr.includes('1060') || stderr.includes('does not exist'))) {
      return resolve('SERVICE_NOT_INSTALLED');
    }

    // PowerShell fallback
    exec(`powershell.exe -NoProfile -Command "Get-Service -Name '${serviceName}' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status"`,
      { timeout: 3000 },
      (pErr, pStdout) => {
        if (!pErr && pStdout && pStdout.trim()) {
          const st = pStdout.trim().toUpperCase();
          if (st === 'RUNNING') return resolve('SERVICE_RUNNING');
          if (st === 'STOPPED') return resolve('SERVICE_STOPPED');
          return resolve('SERVICE_' + st);
        }
        resolve('UNKNOWN');
      }
    );
  });
}

/**
 * Asynchronously execute Start, Stop, or Restart on a Windows Service with multi-level fallbacks
 * @param {string} serviceName
 * @param {'start'|'stop'|'restart'} action
 * @returns {Promise<{success: boolean, message: string, output?: string}>}
 */
function executeServiceActionAsync(serviceName, action) {
  if (!serviceName) {
    return Promise.resolve({ success: false, message: 'Service name is missing.' });
  }

  const validActions = ['start', 'stop', 'restart'];
  if (!validActions.includes(action)) {
    return Promise.resolve({ success: false, message: `Invalid action '${action}'. Must be start, stop, or restart.` });
  }

  return new Promise((resolve) => {
    // 1. Try NSSM Direct
    if (fs.existsSync(NSSM_PATH)) {
      execFile(NSSM_PATH, [action, serviceName], { encoding: 'utf16le', timeout: 10000 }, (nErr, stdout, stderr) => {
        const outStr = (stdout || '').trim();
        const errStr = (stderr || '').trim();

        if (!nErr && !errStr.includes('Access is denied') && !errStr.includes("Can't open service")) {
          return resolve({
            success: true,
            message: `Service '${serviceName}' ${action}ed successfully via NSSM.`,
            output: outStr || errStr
          });
        }
        tryNetAndSc(serviceName, action, resolve);
      });
    } else {
      tryNetAndSc(serviceName, action, resolve);
    }
  });
}

function tryNetAndSc(serviceName, action, resolve) {
  if (action === 'restart') {
    execFile('net.exe', ['stop', serviceName], { encoding: 'utf8', timeout: 5000 }, () => {
      execFile('net.exe', ['start', serviceName], { encoding: 'utf8', timeout: 8000 }, (startErr, startOut) => {
        if (!startErr) {
          return resolve({ success: true, message: `Service '${serviceName}' restarted successfully.` });
        }
        tryPowerShellServiceAction(serviceName, action, resolve);
      });
    });
  } else {
    execFile('net.exe', [action, serviceName], { encoding: 'utf8', timeout: 8000 }, (err, out) => {
      if (!err) {
        return resolve({ success: true, message: `Service '${serviceName}' ${action}ed successfully.` });
      }
      // Try sc.exe
      const scAction = action === 'start' ? 'start' : (action === 'stop' ? 'stop' : 'start');
      execFile('sc.exe', [scAction, serviceName], { encoding: 'utf8', timeout: 6000 }, (scErr, scOut) => {
        if (!scErr && !scOut.includes('FAILED')) {
          return resolve({ success: true, message: `Service '${serviceName}' ${action}ed successfully via sc.exe.` });
        }
        tryPowerShellServiceAction(serviceName, action, resolve);
      });
    });
  }
}

function tryPowerShellServiceAction(serviceName, action, resolve) {
  let psCmd = '';
  if (action === 'start') psCmd = `Start-Service -Name '${serviceName}' -ErrorAction Stop`;
  else if (action === 'stop') psCmd = `Stop-Service -Name '${serviceName}' -Force -ErrorAction Stop`;
  else if (action === 'restart') psCmd = `Restart-Service -Name '${serviceName}' -Force -ErrorAction Stop`;

  exec(`powershell.exe -NoProfile -Command "${psCmd}"`, { timeout: 10000 }, (psErr, psOut, psStderr) => {
    if (!psErr) {
      return resolve({ success: true, message: `Service '${serviceName}' ${action}ed successfully via PowerShell.` });
    }

    // Check if dedicated batch script exists (e.g. restart-bams-service.bat)
    const batName = `restart-${serviceName.toLowerCase()}-service.bat`;
    const batPath = path.join(ROOT, batName);
    if (action === 'restart' && fs.existsSync(batPath)) {
      execFile('cmd.exe', ['/c', batPath], { encoding: 'utf8', timeout: 12000 }, (bErr) => {
        if (!bErr) {
          return resolve({ success: true, message: `Service '${serviceName}' restarted via script.` });
        }
      });
    }

    resolve({
      success: false,
      message: `Service '${serviceName}' could not be ${action}ed. Run 'grant-service-permissions.bat' once as Administrator or run DGS Launcher as Administrator.`
    });
  });
}

/**
 * Load applications list from applications.json
 * @returns {Array}
 */
function getApplicationsList() {
  try {
    if (fs.existsSync(APPLICATIONS_JSON_PATH)) {
      const raw = fs.readFileSync(APPLICATIONS_JSON_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading applications.json:', e.message);
  }
  return [];
}

/**
 * Save applications list to applications.json
 * @param {Array} apps
 * @returns {boolean}
 */
function saveApplicationsList(apps) {
  try {
    fs.writeFileSync(APPLICATIONS_JSON_PATH, JSON.stringify(apps, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error writing applications.json:', e.message);
    return false;
  }
}

/**
 * Get comprehensive health status for an application
 * @param {Object} app
 * @returns {Promise<Object>}
 */
async function getAppHealth(app) {
  const port = app.devPort || app.port || null;

  let serviceNames = [];
  if (Array.isArray(app.services) && app.services.length > 0) {
    serviceNames = app.services;
  } else if (app.serviceName) {
    serviceNames = [app.serviceName];
  }

  const [portActive, ...servicesStatus] = await Promise.all([
    checkPortOpen(port),
    ...serviceNames.map(async (sName) => {
      const rawStatus = await queryServiceStatusAsync(sName);
      const isRunning = rawStatus === 'SERVICE_RUNNING';
      const isStopped = rawStatus === 'SERVICE_STOPPED';
      return {
        serviceName: sName,
        status: rawStatus,
        isRunning,
        isStopped
      };
    })
  ]);

  let overallStatus = 'UNKNOWN';
  if (servicesStatus.length > 0) {
    const allRunning = servicesStatus.every(s => s.isRunning);
    const allStopped = servicesStatus.every(s => s.isStopped);
    const anyRunning = servicesStatus.some(s => s.isRunning);

    if (allRunning || portActive) {
      overallStatus = 'RUNNING';
    } else if (allStopped && !portActive) {
      overallStatus = 'STOPPED';
    } else if (anyRunning) {
      overallStatus = 'PARTIAL';
    } else {
      overallStatus = servicesStatus[0].status;
    }
  } else if (port) {
    overallStatus = portActive ? 'RUNNING' : 'STOPPED';
  } else if (app.status === 'coming_soon') {
    overallStatus = 'COMING_SOON';
  }

  const isResponsive = portActive || overallStatus === 'RUNNING';

  return {
    id: app.id,
    name: app.name,
    port,
    portActive,
    overallStatus,
    isResponsive,
    services: servicesStatus,
    primaryService: serviceNames[0] || null,
    checkedAt: new Date().toISOString()
  };
}

/**
 * Parse JSON request body
 * @param {http.IncomingMessage} req
 * @returns {Promise<Object>}
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2e6) req.destroy(); // 2MB max
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format: ' + err.message));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Handle API Requests
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function handleApiRequest(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  const session = getSessionInfo(req);

  // --------------------------------------------------------------------------
  // 1. AUTHENTICATION & LOGIN
  // --------------------------------------------------------------------------

  // POST /api/auth/login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const { username, password } = payload;
      const config = getUserConfig();

      if (!username || !password) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Username and password are required.' }));
        return;
      }

      const foundUser = config.users.find(
        u => u.username.toLowerCase() === username.trim().toLowerCase() &&
             u.passwordHash === hashPassword(password)
      );

      if (foundUser) {
        const token = crypto.randomBytes(32).toString('hex');
        const sessionData = {
          userId: foundUser.id,
          username: foundUser.username,
          fullName: foundUser.fullName || foundUser.username,
          role: foundUser.role || 'admin',
          loginAt: new Date().toISOString()
        };
        activeSessions.set(token, sessionData);

        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          token,
          user: {
            id: foundUser.id,
            username: foundUser.username,
            fullName: foundUser.fullName,
            role: foundUser.role
          },
          message: `Welcome, ${foundUser.fullName || foundUser.username}!`
        }));
        return;
      }

      res.writeHead(401);
      res.end(JSON.stringify({
        success: false,
        message: 'Invalid User ID or Password. Please try again.'
      }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, message: 'Auth error: ' + err.message }));
    }
    return;
  }

  // GET /api/auth/status
  if (pathname === '/api/auth/status' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      authenticated: session.valid,
      user: session.valid ? session.user : null,
      serverTime: new Date().toISOString()
    }));
    return;
  }

  // POST /api/auth/logout
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    if (session.token) {
      activeSessions.delete(session.token);
    }
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Logged out successfully.' }));
    return;
  }

  // POST /api/auth/reset-password (Current user changes own password)
  if (pathname === '/api/auth/reset-password' && req.method === 'POST') {
    try {
      const payload = await parseJsonBody(req);
      const { currentPassword, newPassword, username } = payload;
      const config = getUserConfig();

      const targetUsername = (session.valid && session.user ? session.user.username : (username || 'admin')).toLowerCase();
      const userIndex = config.users.findIndex(u => u.username.toLowerCase() === targetUsername);

      if (userIndex === -1) {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, message: 'User not found.' }));
        return;
      }

      if (!currentPassword || !newPassword) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Current and new password are required.' }));
        return;
      }

      if (hashPassword(currentPassword) !== config.users[userIndex].passwordHash) {
        res.writeHead(401);
        res.end(JSON.stringify({ success: false, message: 'Current password is incorrect.' }));
        return;
      }

      if (newPassword.length < 4) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'New password must be at least 4 characters long.' }));
        return;
      }

      config.users[userIndex].passwordHash = hashPassword(newPassword);
      config.users[userIndex].updatedAt = new Date().toISOString();
      const saved = saveUserConfig(config);

      if (saved) {
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          message: 'Password updated successfully! Please login with your new credentials.'
        }));
      } else {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, message: 'Failed to write updated password configuration.' }));
      }
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, message: 'Password reset error: ' + err.message }));
    }
    return;
  }

  // --------------------------------------------------------------------------
  // 2. USER MANAGEMENT (Admin Protected)
  // --------------------------------------------------------------------------

  // GET /api/users
  if (pathname === '/api/users' && req.method === 'GET') {
    if (!session.valid) {
      res.writeHead(401);
      res.end(JSON.stringify({ success: false, message: 'Authentication required to manage users.' }));
      return;
    }

    const config = getUserConfig();
    const safeUsers = config.users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName || u.username,
      role: u.role || 'admin',
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }));

    res.writeHead(200);
    res.end(JSON.stringify({ success: true, users: safeUsers }));
    return;
  }

  // POST /api/users/add
  if (pathname === '/api/users/add' && req.method === 'POST') {
    if (!session.valid) {
      res.writeHead(401);
      res.end(JSON.stringify({ success: false, message: 'Authentication required to add users.' }));
      return;
    }

    try {
      const payload = await parseJsonBody(req);
      const { username, fullName, password, role } = payload;

      if (!username || !password) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Username and password are required.' }));
        return;
      }

      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername.length < 3) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Username must be at least 3 characters.' }));
        return;
      }

      const config = getUserConfig();
      if (config.users.some(u => u.username.toLowerCase() === cleanUsername)) {
        res.writeHead(409);
        res.end(JSON.stringify({ success: false, message: `Username '${cleanUsername}' already exists.` }));
        return;
      }

      const newUser = {
        id: 'usr_' + Date.now(),
        username: cleanUsername,
        fullName: (fullName || username).trim(),
        passwordHash: hashPassword(password),
        role: role || 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      config.users.push(newUser);
      saveUserConfig(config);

      res.writeHead(201);
      res.end(JSON.stringify({
        success: true,
        message: `User '${cleanUsername}' created successfully.`,
        user: { id: newUser.id, username: newUser.username, fullName: newUser.fullName, role: newUser.role }
      }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, message: 'Error adding user: ' + err.message }));
    }
    return;
  }

  // POST /api/users/update
  if (pathname === '/api/users/update' && req.method === 'POST') {
    if (!session.valid) {
      res.writeHead(401);
      res.end(JSON.stringify({ success: false, message: 'Authentication required.' }));
      return;
    }

    try {
      const payload = await parseJsonBody(req);
      const { id, username, fullName, password, role } = payload;

      const config = getUserConfig();
      const userIndex = config.users.findIndex(u => u.id === id || (username && u.username.toLowerCase() === username.toLowerCase()));

      if (userIndex === -1) {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, message: 'User not found.' }));
        return;
      }

      if (fullName) config.users[userIndex].fullName = fullName.trim();
      if (role) config.users[userIndex].role = role;
      if (password && password.trim()) {
        if (password.length < 4) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, message: 'Password must be at least 4 characters.' }));
          return;
        }
        config.users[userIndex].passwordHash = hashPassword(password);
      }
      config.users[userIndex].updatedAt = new Date().toISOString();

      saveUserConfig(config);

      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: `User '${config.users[userIndex].username}' updated successfully.`
      }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, message: 'Error updating user: ' + err.message }));
    }
    return;
  }

  // POST /api/users/delete
  if (pathname === '/api/users/delete' && req.method === 'POST') {
    if (!session.valid) {
      res.writeHead(401);
      res.end(JSON.stringify({ success: false, message: 'Authentication required.' }));
      return;
    }

    try {
      const payload = await parseJsonBody(req);
      const { id, username } = payload;
      const config = getUserConfig();

      const userIndex = config.users.findIndex(u => u.id === id || (username && u.username.toLowerCase() === username.toLowerCase()));
      if (userIndex === -1) {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, message: 'User not found.' }));
        return;
      }

      if (config.users.length <= 1) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Cannot delete the only remaining administrator account.' }));
        return;
      }

      const deletedUsername = config.users[userIndex].username;
      config.users.splice(userIndex, 1);
      saveUserConfig(config);

      res.writeHead(200);
      res.end(JSON.stringify({ success: true, message: `User '${deletedUsername}' deleted successfully.` }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, message: 'Error deleting user: ' + err.message }));
    }
    return;
  }

  // --------------------------------------------------------------------------
  // 3. APPLICATIONS PERSISTENCE & MANAGEMENT (Direct to applications.json)
  // --------------------------------------------------------------------------

  // GET /api/applications (Fetch live applications array)
  if (pathname === '/api/applications' && req.method === 'GET') {
    const apps = getApplicationsList();
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, applications: apps }));
    return;
  }

  // POST /api/applications (Save entire array or add/edit an app)
  if (pathname === '/api/applications' && req.method === 'POST') {
    if (!session.valid) {
      res.writeHead(401);
      res.end(JSON.stringify({ success: false, message: 'Administrator login required to modify applications.' }));
      return;
    }

    try {
      const payload = await parseJsonBody(req);
      let appsToSave = [];

      if (Array.isArray(payload)) {
        appsToSave = payload;
      } else if (payload && Array.isArray(payload.applications)) {
        appsToSave = payload.applications;
      } else if (payload && payload.id) {
        // Single application update or append
        const currentList = getApplicationsList();
        const existingIndex = currentList.findIndex(a => a.id === payload.id);
        if (existingIndex !== -1) {
          currentList[existingIndex] = { ...currentList[existingIndex], ...payload };
        } else {
          currentList.push(payload);
        }
        appsToSave = currentList;
      }

      if (appsToSave.length === 0) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Invalid applications data provided.' }));
        return;
      }

      const saved = saveApplicationsList(appsToSave);
      if (saved) {
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          message: 'Applications configuration saved to disk successfully.',
          count: appsToSave.length,
          applications: appsToSave
        }));
      } else {
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, message: 'Failed to write applications.json file to disk.' }));
      }
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, message: 'Error saving applications: ' + err.message }));
    }
    return;
  }

  // POST /api/applications/delete (Delete an application from disk)
  if (pathname === '/api/applications/delete' && req.method === 'POST') {
    if (!session.valid) {
      res.writeHead(401);
      res.end(JSON.stringify({ success: false, message: 'Administrator login required to delete applications.' }));
      return;
    }

    try {
      const payload = await parseJsonBody(req);
      const { id } = payload;
      if (!id) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Application ID is required.' }));
        return;
      }

      const currentList = getApplicationsList();
      const filtered = currentList.filter(a => a.id !== id);

      if (filtered.length === currentList.length) {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, message: `Application '${id}' not found.` }));
        return;
      }

      saveApplicationsList(filtered);
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        message: `Application '${id}' removed successfully.`,
        applications: filtered
      }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, message: 'Error deleting application: ' + err.message }));
    }
    return;
  }

  // --------------------------------------------------------------------------
  // 4. SERVICES HEALTH & ACTIONS
  // --------------------------------------------------------------------------

  // GET /api/services/status
  if (pathname === '/api/services/status' && req.method === 'GET') {
    const appId = parsedUrl.searchParams.get('id') || parsedUrl.searchParams.get('appId');
    const apps = getApplicationsList();

    if (appId) {
      const app = apps.find(a => a.id === appId);
      if (!app) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: `Application '${appId}' not found.` }));
        return;
      }
      const health = await getAppHealth(app);
      res.writeHead(200);
      res.end(JSON.stringify(health));
      return;
    }

    // Check all enabled apps in parallel
    const allHealth = await Promise.all(
      apps.filter(a => a.enabled !== false).map(app => getAppHealth(app))
    );

    const summary = {
      total: allHealth.length,
      runningCount: allHealth.filter(h => h.isResponsive).length,
      stoppedCount: allHealth.filter(h => !h.isResponsive).length,
      timestamp: new Date().toISOString(),
      services: allHealth
    };

    res.writeHead(200);
    res.end(JSON.stringify(summary));
    return;
  }

  // POST /api/services/action (Start / Stop / Restart)
  if (pathname === '/api/services/action' && req.method === 'POST') {
    if (!session.valid) {
      res.writeHead(401);
      res.end(JSON.stringify({ success: false, message: 'Administrator authentication required to control services.' }));
      return;
    }

    try {
      const payload = await parseJsonBody(req);
      const { appId, action, serviceName } = payload;

      if (!action || !['start', 'stop', 'restart', 'status'].includes(action)) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Invalid action. Use start, stop, restart, or status.' }));
        return;
      }

      const apps = getApplicationsList();
      const app = apps.find(a => a.id === appId);

      let targets = [];
      if (serviceName) {
        targets = [serviceName];
      } else if (app) {
        if (Array.isArray(app.services) && app.services.length > 0) {
          targets = app.services;
        } else if (app.serviceName) {
          targets = [app.serviceName];
        }
      }

      if (targets.length === 0 && action !== 'status') {
        const appLabel = app ? app.name : appId;
        const portLabel = app && app.devPort ? `Port ${app.devPort}` : '';
        res.writeHead(200);
        res.end(JSON.stringify({
          success: false,
          message: `No Windows Service configured for '${appLabel}'. This application runs as a direct process on ${portLabel}.`
        }));
        return;
      }

      if (action === 'status') {
        const health = app ? await getAppHealth(app) : { overallStatus: 'UNKNOWN' };
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, health }));
        return;
      }

      // Execute action for all target services concurrently
      const results = await Promise.all(
        targets.map(async (sName) => {
          const resAction = await executeServiceActionAsync(sName, action);
          return {
            service: sName,
            ...resAction
          };
        })
      );

      // Allow 1.2s for Windows service process to transition
      await new Promise(r => setTimeout(r, 1200));

      const updatedHealth = app ? await getAppHealth(app) : null;
      const allSucceeded = results.every(r => r.success);

      res.writeHead(200);
      res.end(JSON.stringify({
        success: allSucceeded,
        action,
        appId,
        results,
        health: updatedHealth,
        message: allSucceeded
          ? `Successfully ${action}ed service(s): ${targets.join(', ')}`
          : results.map(r => r.message).join(' | ')
      }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, message: 'Internal error: ' + err.message }));
    }
    return;
  }

  // --------------------------------------------------------------------------
  // 5. NSSM SERVICE 1-CLICK REGISTRATION & DEREGISTRATION
  // --------------------------------------------------------------------------

  // POST /api/services/nssm/register
  if (pathname === '/api/services/nssm/register' && req.method === 'POST') {
    if (!session.valid) {
      res.writeHead(401);
      res.end(JSON.stringify({ success: false, message: 'Administrator login required to register Windows services.' }));
      return;
    }

    try {
      const payload = await parseJsonBody(req);
      const { serviceName, displayName, appDirectory, executablePath, arguments: serviceArgs, appId } = payload;

      if (!serviceName || !executablePath) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Service Name and Executable Path are required.' }));
        return;
      }

      const result = await registerNssmServiceAsync({
        serviceName: serviceName.trim(),
        displayName: displayName || serviceName,
        appDirectory: appDirectory ? appDirectory.trim() : '',
        executablePath: executablePath.trim(),
        arguments: serviceArgs || ''
      });

      // Also link to app in applications.json if appId provided
      if (appId) {
        const apps = getApplicationsList();
        const appIdx = apps.findIndex(a => a.id === appId);
        if (appIdx !== -1) {
          apps[appIdx].serviceName = serviceName.trim();
          if (!Array.isArray(apps[appIdx].services)) apps[appIdx].services = [];
          if (!apps[appIdx].services.includes(serviceName.trim())) {
            apps[appIdx].services.push(serviceName.trim());
          }
          saveApplicationsList(apps);
        }
      }

      res.writeHead(result.success ? 200 : 500);
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, message: 'NSSM Register Error: ' + err.message }));
    }
    return;
  }

  // POST /api/services/nssm/deregister
  if (pathname === '/api/services/nssm/deregister' && req.method === 'POST') {
    if (!session.valid) {
      res.writeHead(401);
      res.end(JSON.stringify({ success: false, message: 'Administrator login required to deregister Windows services.' }));
      return;
    }

    try {
      const payload = await parseJsonBody(req);
      const { serviceName, appId } = payload;

      if (!serviceName) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Service Name is required.' }));
        return;
      }

      const result = await deregisterNssmServiceAsync(serviceName.trim());

      // If linked to app, remove serviceName from applications.json
      if (appId) {
        const apps = getApplicationsList();
        const appIdx = apps.findIndex(a => a.id === appId);
        if (appIdx !== -1) {
          delete apps[appIdx].serviceName;
          if (Array.isArray(apps[appIdx].services)) {
            apps[appIdx].services = apps[appIdx].services.filter(s => s !== serviceName.trim());
          }
          saveApplicationsList(apps);
        }
      }

      res.writeHead(result.success ? 200 : 500);
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, message: 'NSSM Deregister Error: ' + err.message }));
    }
    return;
  }

  // GET /api/services/nssm/status
  if (pathname === '/api/services/nssm/status' && req.method === 'GET') {
    const sName = parsedUrl.searchParams.get('serviceName') || parsedUrl.searchParams.get('name');
    if (!sName) {
      res.writeHead(400);
      res.end(JSON.stringify({ success: false, message: 'Service name is required.' }));
      return;
    }

    const rawStatus = await queryServiceStatusAsync(sName);
    const isInstalled = rawStatus !== 'SERVICE_NOT_INSTALLED' && rawStatus !== 'NOT_CONFIGURED';

    res.writeHead(200);
    res.end(JSON.stringify({
      serviceName: sName,
      status: rawStatus,
      isInstalled,
      isRunning: rawStatus === 'SERVICE_RUNNING'
    }));
    return;
  }

  // --------------------------------------------------------------------------
  // 6. SYSTEM SUMMARY
  // --------------------------------------------------------------------------

  // GET /api/system/summary
  if (pathname === '/api/system/summary' && req.method === 'GET') {
    const apps = getApplicationsList();
    const allHealth = await Promise.all(
      apps.filter(a => a.enabled !== false).map(app => getAppHealth(app))
    );

    res.writeHead(200);
    res.end(JSON.stringify({
      host: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptimeSeconds: Math.floor(os.uptime()),
      ips: getLocalIPs(),
      totalApps: apps.length,
      activeApps: allHealth.filter(h => h.isResponsive).length,
      offlineApps: allHealth.filter(h => !h.isResponsive).length,
      serverTime: new Date().toISOString()
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'API endpoint not found' }));
}

/**
 * Register Windows service via NSSM
 */
function registerNssmServiceAsync({ serviceName, displayName, appDirectory, executablePath, arguments: sArgs }) {
  if (!serviceName || !executablePath) {
    return Promise.resolve({ success: false, message: 'Service name and executable path are required.' });
  }

  const nssm = fs.existsSync(NSSM_PATH) ? NSSM_PATH : 'nssm.exe';
  const dispName = displayName || `District Service - ${serviceName}`;
  const appDir = appDirectory || path.dirname(executablePath);
  const args = sArgs || '';

  return new Promise((resolve) => {
    // 1. Install
    const installArgs = ['install', serviceName, executablePath];
    if (args) installArgs.push(args);

    execFile(nssm, installArgs, { encoding: 'utf16le', timeout: 10000 }, (iErr, iOut, iStderr) => {
      // 2. Set AppDirectory
      execFile(nssm, ['set', serviceName, 'AppDirectory', appDir], { encoding: 'utf16le' }, () => {
        // 3. Set DisplayName
        execFile(nssm, ['set', serviceName, 'DisplayName', dispName], { encoding: 'utf16le' }, () => {
          // 4. Set Start to Automatic
          execFile(nssm, ['set', serviceName, 'Start', 'SERVICE_AUTO_START'], { encoding: 'utf16le' }, () => {
            // 5. Grant SDDL permissions
            const sddl = 'D:(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;CCLCSWRPWPDTLOCRRC;;;IU)(A;;CCLCSWRPWPDTLOCRRC;;;SU)(A;;CCLCSWRPWPDTLOCRRC;;;AU)(A;;CCLCSWRPWPDTLOCRRC;;;BU)';
            execFile('sc.exe', ['sdset', serviceName, sddl], () => {
              // 6. Start service
              execFile(nssm, ['start', serviceName], { encoding: 'utf16le', timeout: 10000 }, () => {
                resolve({
                  success: true,
                  message: `Service '${serviceName}' registered as Automatic Windows Service and started successfully.`
                });
              });
            });
          });
        });
      });
    });
  });
}

/**
 * Deregister Windows service via NSSM
 */
function deregisterNssmServiceAsync(serviceName) {
  if (!serviceName) {
    return Promise.resolve({ success: false, message: 'Service name is required.' });
  }
  const nssm = fs.existsSync(NSSM_PATH) ? NSSM_PATH : 'nssm.exe';

  return new Promise((resolve) => {
    execFile(nssm, ['stop', serviceName], { encoding: 'utf16le', timeout: 10000 }, () => {
      execFile(nssm, ['remove', serviceName, 'confirm'], { encoding: 'utf16le', timeout: 10000 }, (rErr, rOut, rStderr) => {
        if (!rErr) {
          return resolve({ success: true, message: `Service '${serviceName}' deregistered and removed successfully.` });
        }
        resolve({ success: false, message: `Service removal result: ${(rStderr || rOut || 'Complete').trim()}` });
      });
    });
  });
}

/**
 * Main HTTP Request Dispatcher
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function requestHandler(req, res) {
  // Dual CORS Headers for full LAN, Chrome PNA & Cross-Port Access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Private-Network, Access-Control-Allow-Private-Network');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Intercept API routes
  if (req.url.startsWith('/api/')) {
    await handleApiRequest(req, res);
    return;
  }

  // Parse URL & normalize path for static files
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

function getLocalIPs() {
  const ips = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// ----------------------------------------------------------------------------
// SERVER INITIALIZATION (Port 8000)
// ----------------------------------------------------------------------------

const server = http.createServer(requestHandler);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use by another process. Please close it and retry.`);
  } else {
    console.error('Server error:', err.message);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('================================================================');
  console.log('       District Governance Suite (DGS) - Launcher & Portal      ');
  console.log('================================================================');
  console.log(` [PORT ${PORT} ACTIVE] Management & Application Portal:`);
  console.log(`   - Local:  http://localhost:${PORT}/`);
  console.log(`   - Local:  http://127.0.0.1:${PORT}/`);
  ips.forEach(ip => console.log(`   - LAN IP: http://${ip}:${PORT}/`));
  console.log(' Service Management & Health API: Ready on /api/');
  console.log(' Applications Persistence: applications.json synced to disk.');
  console.log('================================================================');
});
