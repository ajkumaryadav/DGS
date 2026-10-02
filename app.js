/**
 * DGS (District Governance Suite) - Application Launcher & Service Controller
 * Version 3.2 - Dual Port 80/8000, Persistent applications.json Storage,
 * Multi-User Role Management, In-App Frame Workspace, and 1-Click Windows Service Manager.
 */

(() => {
  'use strict';

  const STORAGE_KEY = 'dgs_applications_registry_v8';
  const ROUTE_MODE_KEY = 'dgs_route_mode_v2';
  const AUTH_TOKEN_KEY = 'dgs_admin_token_v2';
  const LAUNCH_TARGET_KEY = 'dgs_launch_target_v2';

  // Default baseline application suite
  const DEFAULT_APPLICATIONS = [
    {
      "id": "accc",
      "name": "ACCC",
      "path": "/accc/",
      "devPort": 3000,
      "serviceName": "ACCC-WEB",
      "services": ["ACCC-WEB", "ACCC-API"],
      "description": "District Camera Monitoring System",
      "icon": "icons/accc.png",
      "enabled": true,
      "status": "active",
      "order": 1,
      "category": "Monitoring"
    },
    {
      "id": "ecms",
      "name": "ECMS",
      "path": "/ecms/",
      "devPort": 3001,
      "description": "Election Counting Management System",
      "icon": "icons/ecms.png",
      "enabled": true,
      "status": "active",
      "order": 2,
      "category": "Elections"
    },
    {
      "id": "flagship",
      "name": "Flagship Scheme Monitoring",
      "path": "/flagship/",
      "devPort": 8080,
      "serviceName": "DistrictFlagshipMonitoring",
      "services": ["DistrictFlagshipMonitoring"],
      "description": "District Flagship Scheme Monitoring",
      "icon": "icons/flagship.png",
      "enabled": true,
      "status": "active",
      "order": 3,
      "category": "Monitoring"
    },
    {
      "id": "dak",
      "name": "Dak Monitoring System",
      "path": "/dak/",
      "devPort": 3050,
      "serviceName": "DakMonitoring",
      "services": ["DakMonitoring"],
      "description": "District Postal & Dak Correspondence Monitoring System",
      "icon": "icons/dak.png",
      "enabled": true,
      "status": "active",
      "order": 4,
      "category": "Monitoring"
    },
    {
      "id": "records",
      "name": "Office Record Management",
      "path": "/records/",
      "devPort": 3005,
      "description": "District Office Records & Document Management System",
      "icon": "icons/records.png",
      "enabled": true,
      "status": "active",
      "order": 5,
      "category": "Administration"
    },
    {
      "id": "bams",
      "name": "Budget Announcement Monitoring System",
      "path": "/bams/",
      "devPort": 3100,
      "serviceName": "bams",
      "services": ["bams"],
      "description": "District Budget Announcement Monitoring System",
      "icon": "icons/budget.png",
      "enabled": true,
      "status": "active",
      "order": 6,
      "category": "Monitoring"
    },
    {
      "id": "ems",
      "name": "EMS",
      "path": "/ems/",
      "devPort": 3333,
      "description": "Employees Management System",
      "icon": "icons/ems.png",
      "enabled": true,
      "status": "active",
      "order": 7,
      "category": "Administration"
    },
    {
      "id": "sampark",
      "name": "Sampark",
      "path": "/sampark/",
      "devPort": 7000,
      "serviceName": "SamparkWeb",
      "services": ["SamparkWeb", "SamparkAPI"],
      "description": "Sampark Application",
      "icon": "icons/sampark.png",
      "enabled": true,
      "status": "active",
      "order": 8,
      "category": "Public Grievance"
    },
    {
      "id": "gods",
      "name": "Govt Order Drafting System",
      "path": "#",
      "description": "District Government Orders & Notifications Drafting System",
      "icon": "icons/drafting.png",
      "enabled": true,
      "status": "coming_soon",
      "order": 9,
      "category": "Administration"
    },
    {
      "id": "tms",
      "name": "Task Monitoring System",
      "path": "#",
      "serviceName": "tcms",
      "services": ["tcms"],
      "description": "District Administrative Task & Milestone Tracking System",
      "icon": "icons/task.png",
      "enabled": true,
      "status": "coming_soon",
      "order": 10,
      "category": "Monitoring"
    },
    {
      "id": "network",
      "name": "Network Monitoring and Troubleshooting",
      "path": "#",
      "description": "District Network Infrastructure & Connectivity Troubleshooting",
      "icon": "icons/network.png",
      "enabled": true,
      "status": "coming_soon",
      "order": 11,
      "category": "Monitoring"
    }
  ];

  // Global State
  let applicationsList = [];
  let currentCategory = 'all';
  let searchQuery = '';
  let routeMode = localStorage.getItem(ROUTE_MODE_KEY) || 'direct';
  let launchTarget = localStorage.getItem(LAUNCH_TARGET_KEY) || 'frame'; // 'frame' | 'tab'

  // Admin Authentication State
  let adminToken = localStorage.getItem(AUTH_TOKEN_KEY) || null;
  let currentUser = null; // { id, username, fullName, role }
  let pendingAdminAction = null;

  // Live Services Health Map: appId -> healthObject
  const servicesHealthMap = new Map();
  let isCheckingServices = false;
  let activeActionAppId = null;

  // In-App Frame State
  let currentFrameApp = null;
  let currentFrameUrl = '';

  // DOM Elements
  const appsGrid = document.getElementById('apps-grid');
  const searchInput = document.getElementById('app-search');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const resultsCount = document.getElementById('results-count');
  const currentDateEl = document.getElementById('current-date');
  const categoryChipsContainer = document.getElementById('category-chips-container');
  const routeModeSelect = document.getElementById('route-mode-select');
  const launchTargetToggle = document.getElementById('launch-target-toggle');
  const frameToggleText = document.getElementById('frame-toggle-text');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const resetAppsBtn = document.getElementById('reset-apps-btn');
  const toastContainer = document.getElementById('toast-container');
  const refreshServicesBtn = document.getElementById('refresh-services-btn');
  const headerHealthDot = document.getElementById('header-health-dot');
  const headerHealthText = document.getElementById('header-health-text');
  const authControlsGroup = document.getElementById('auth-controls-group');
  const openAddModalBtn = document.getElementById('open-add-modal-btn');

  // In-App Frame Modal Elements
  const inappFrameModal = document.getElementById('inapp-frame-modal');
  const inappAppIcon = document.getElementById('inapp-app-icon');
  const inappTitle = document.getElementById('inapp-title');
  const inappCategoryBadge = document.getElementById('inapp-category-badge');
  const inappUrlDisplay = document.getElementById('inapp-url-display');
  const inappIframe = document.getElementById('inapp-iframe');
  const inappLoader = document.getElementById('inapp-loader');
  const inappFallbackNotice = document.getElementById('inapp-fallback-notice');
  const inappFallbackOpenBtn = document.getElementById('inapp-fallback-open-btn');
  const inappReloadBtn = document.getElementById('inapp-reload-btn');
  const inappPopoutBtn = document.getElementById('inapp-popout-btn');
  const inappFullscreenBtn = document.getElementById('inapp-fullscreen-btn');
  const inappCloseBtn = document.getElementById('inapp-close-btn');

  // User Management Modal Elements
  const userMgmtModal = document.getElementById('user-mgmt-modal');
  const closeUserMgmtBtn = document.getElementById('close-user-mgmt-btn');
  const userCountBadge = document.getElementById('user-count-badge');
  const btnShowAddUser = document.getElementById('btn-show-add-user');
  const userFormCard = document.getElementById('user-form-card');
  const userFormTitle = document.getElementById('user-form-title');
  const userUpsertForm = document.getElementById('user-upsert-form');
  const userFormId = document.getElementById('user-form-id');
  const uUsername = document.getElementById('u-username');
  const uFullname = document.getElementById('u-fullname');
  const uRole = document.getElementById('u-role');
  const uPassword = document.getElementById('u-password');
  const uPwdReq = document.getElementById('u-pwd-req');
  const btnCancelUserForm = document.getElementById('btn-cancel-user-form');
  const usersTableTbody = document.getElementById('users-table-tbody');

  // Add/Edit App Modal Elements
  const addAppModal = document.getElementById('add-app-modal');
  const modalTitle = document.getElementById('modal-title');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-modal-btn');
  const addAppForm = document.getElementById('add-app-form');
  const formEditingId = document.getElementById('form-editing-id');
  const formAppName = document.getElementById('form-app-name');
  const formAppPort = document.getElementById('form-app-port');
  const formAppPath = document.getElementById('form-app-path');
  const formAppDesc = document.getElementById('form-app-desc');
  const formAppService = document.getElementById('form-app-service');
  const formAppCategory = document.getElementById('form-app-category');
  const formAppStatus = document.getElementById('form-app-status');
  const formAppOrder = document.getElementById('form-app-order');
  const formAppIcon = document.getElementById('form-app-icon');
  const iconPresetsGrid = document.getElementById('icon-presets-grid');

  // NSSM 1-Click Elements
  const toggleNssmPanelBtn = document.getElementById('toggle-nssm-panel-btn');
  const nssmServiceBox = document.getElementById('nssm-service-box');
  const nssmStatusBadge = document.getElementById('nssm-status-badge');
  const nssmExePath = document.getElementById('nssm-exe-path');
  const nssmAppDir = document.getElementById('nssm-app-dir');
  const nssmAppArgs = document.getElementById('nssm-app-args');
  const btnNssmRegister = document.getElementById('btn-nssm-register');
  const btnNssmDeregister = document.getElementById('btn-nssm-deregister');

  // Auth Modals Elements
  const adminLoginModal = document.getElementById('admin-login-modal');
  const adminLoginForm = document.getElementById('admin-login-form');
  const loginUsernameInput = document.getElementById('login-username');
  const loginPasswordInput = document.getElementById('login-password');
  const loginModalMessage = document.getElementById('login-modal-message');
  const closeLoginModalBtn = document.getElementById('close-login-modal-btn');
  const cancelLoginModalBtn = document.getElementById('cancel-login-modal-btn');

  const adminResetPwdModal = document.getElementById('admin-reset-pwd-modal');
  const adminResetPwdForm = document.getElementById('admin-reset-pwd-form');
  const pwdCurrentInput = document.getElementById('pwd-current');
  const pwdNewInput = document.getElementById('pwd-new');
  const pwdConfirmInput = document.getElementById('pwd-confirm');
  const closeResetPwdModalBtn = document.getElementById('close-reset-pwd-modal-btn');
  const cancelResetPwdModalBtn = document.getElementById('cancel-reset-pwd-modal-btn');

  // Diagnostics Modal Elements
  const serviceDetailsModal = document.getElementById('service-details-modal');
  const closeServiceModalBtn = document.getElementById('close-service-modal-btn');
  const serviceModalTitle = document.getElementById('service-modal-title');
  const serviceModalBadge = document.getElementById('service-modal-badge');
  const serviceModalBody = document.getElementById('service-modal-body');

  /**
   * Escape HTML entities
   * @param {string} str 
   * @returns {string}
   */
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Show notification toast
   * @param {string} message 
   * @param {number} duration 
   */
  function showToast(message, duration = 3500) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Universal fetch helper for API endpoints with session authentication
   * @param {string} url 
   * @param {RequestInit} options 
   * @returns {Promise<{ok: boolean, status: number, data: any}>}
   */
  async function fetchApi(url, options = {}) {
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }

    try {
      const res = await fetch(url, { ...options, headers });
      const contentType = res.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }
      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      console.warn(`Fetch error for ${url}:`, err.message);
      return { ok: false, status: 0, data: null, error: err.message };
    }
  }

  /**
   * Format live date badge
   */
  function updateDateDisplay() {
    if (!currentDateEl) return;
    const now = new Date();
    const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    currentDateEl.textContent = now.toLocaleDateString('en-IN', options);
  }

  // --------------------------------------------------------------------------
  // AUTHENTICATION & ROLE MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Check authentication status on startup
   */
  async function checkAuthStatus() {
    if (!adminToken) {
      currentUser = null;
      renderAuthHeader();
      return;
    }

    try {
      const { ok, data } = await fetchApi('/api/auth/status');
      if (ok && data && data.authenticated && data.user) {
        currentUser = data.user;
      } else {
        // Token expired or invalid
        adminToken = null;
        currentUser = null;
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Auth status check skipped:', e.message);
    }

    renderAuthHeader();
  }

  /**
   * Render Header Auth Profile / Login Button
   */
  function renderAuthHeader() {
    if (!authControlsGroup) return;

    if (currentUser) {
      const initial = (currentUser.fullName || currentUser.username || 'A').charAt(0).toUpperCase();
      const roleLabel = (currentUser.role || 'admin').toUpperCase();

      authControlsGroup.innerHTML = `
        <div class="admin-profile-pill" id="admin-profile-pill" title="Administrator Session Active">
          <div class="admin-avatar">${escapeHtml(initial)}</div>
          <span>${escapeHtml(currentUser.fullName || currentUser.username)}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        <div class="admin-dropdown-menu" id="admin-dropdown-menu" hidden>
          <div class="admin-dropdown-header">
            <div class="user-name">${escapeHtml(currentUser.fullName || currentUser.username)}</div>
            <div class="user-role">${escapeHtml(roleLabel)}</div>
          </div>
          <button type="button" class="admin-dropdown-item" id="menu-add-app-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Add Application</span>
          </button>
          <button type="button" class="admin-dropdown-item" id="menu-manage-users-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Manage Users</span>
          </button>
          <button type="button" class="admin-dropdown-item" id="menu-change-pwd-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span>Change Password</span>
          </button>
          <button type="button" class="admin-dropdown-item text-danger" id="menu-logout-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <span>Logout</span>
          </button>
        </div>
      `;

      const profilePill = document.getElementById('admin-profile-pill');
      const dropdownMenu = document.getElementById('admin-dropdown-menu');

      if (profilePill && dropdownMenu) {
        profilePill.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdownMenu.hidden = !dropdownMenu.hidden;
        });

        document.addEventListener('click', (e) => {
          if (!authControlsGroup.contains(e.target)) {
            dropdownMenu.hidden = true;
          }
        });
      }

      const menuAddAppBtn = document.getElementById('menu-add-app-btn');
      if (menuAddAppBtn) {
        menuAddAppBtn.addEventListener('click', () => {
          if (dropdownMenu) dropdownMenu.hidden = true;
          openAddModal();
        });
      }

      const menuManageUsersBtn = document.getElementById('menu-manage-users-btn');
      if (menuManageUsersBtn) {
        menuManageUsersBtn.addEventListener('click', () => {
          if (dropdownMenu) dropdownMenu.hidden = true;
          openUserManagementModal();
        });
      }

      const menuChangePwdBtn = document.getElementById('menu-change-pwd-btn');
      if (menuChangePwdBtn) {
        menuChangePwdBtn.addEventListener('click', () => {
          if (dropdownMenu) dropdownMenu.hidden = true;
          openResetPasswordModal();
        });
      }

      const menuLogoutBtn = document.getElementById('menu-logout-btn');
      if (menuLogoutBtn) {
        menuLogoutBtn.addEventListener('click', () => {
          if (dropdownMenu) dropdownMenu.hidden = true;
          performLogout();
        });
      }

    } else {
      authControlsGroup.innerHTML = `
        <button type="button" id="header-login-btn" class="btn btn-secondary btn-sm" title="Login as Administrator">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>Admin Login</span>
        </button>
      `;

      const headerLoginBtn = document.getElementById('header-login-btn');
      if (headerLoginBtn) {
        headerLoginBtn.addEventListener('click', () => openLoginModal('Please login to perform administrative actions.'));
      }
    }
  }

  /**
   * Check if current user is logged in, else trigger login modal with callback
   * @param {Function} callback 
   * @param {string} [notice] 
   * @returns {boolean}
   */
  function requireAdminAuth(callback = null, notice = 'Administrator authentication required.') {
    if (currentUser) {
      return true;
    }
    pendingAdminAction = callback;
    openLoginModal(notice);
    return false;
  }

  /**
   * Open Login Modal
   * @param {string} notice 
   */
  function openLoginModal(notice = '') {
    if (!adminLoginModal) return;
    if (loginModalMessage && notice) {
      loginModalMessage.textContent = notice;
    }
    if (loginPasswordInput) loginPasswordInput.value = '';
    if (typeof adminLoginModal.showModal === 'function') {
      adminLoginModal.showModal();
    } else {
      adminLoginModal.setAttribute('open', '');
    }
    if (loginPasswordInput) loginPasswordInput.focus();
  }

  /**
   * Close Login Modal
   */
  function closeLoginModal() {
    if (!adminLoginModal) return;
    if (typeof adminLoginModal.close === 'function') {
      adminLoginModal.close();
    } else {
      adminLoginModal.removeAttribute('open');
    }
  }

  /**
   * Handle Login Submit
   * @param {Event} e 
   */
  async function handleLoginSubmit(e) {
    e.preventDefault();
    const username = loginUsernameInput ? loginUsernameInput.value.trim() : '';
    const password = loginPasswordInput ? loginPasswordInput.value : '';

    if (!username || !password) {
      showToast('Please enter both User ID and Password.');
      return;
    }

    try {
      const { ok, data } = await fetchApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (ok && data && data.success && data.token) {
        adminToken = data.token;
        currentUser = data.user || { username, fullName: username, role: 'admin' };
        localStorage.setItem(AUTH_TOKEN_KEY, adminToken);

        showToast(`✅ Welcome, ${currentUser.fullName || currentUser.username}!`);
        closeLoginModal();
        renderAuthHeader();

        if (typeof pendingAdminAction === 'function') {
          const act = pendingAdminAction;
          pendingAdminAction = null;
          act();
        }
      } else {
        showToast(data && data.message ? data.message : 'Invalid login credentials.');
      }
    } catch (err) {
      showToast('Login failed: ' + err.message);
    }
  }

  /**
   * Logout current admin
   */
  async function performLogout() {
    try {
      await fetchApi('/api/auth/logout', { method: 'POST' });
    } catch (e) {}

    adminToken = null;
    currentUser = null;
    localStorage.removeItem(AUTH_TOKEN_KEY);
    renderAuthHeader();
    showToast('Logged out successfully.');
  }

  /**
   * Open Reset Password Modal
   */
  function openResetPasswordModal() {
    if (!adminResetPwdModal) return;
    if (adminResetPwdForm) adminResetPwdForm.reset();
    if (typeof adminResetPwdModal.showModal === 'function') {
      adminResetPwdModal.showModal();
    } else {
      adminResetPwdModal.setAttribute('open', '');
    }
    if (pwdCurrentInput) pwdCurrentInput.focus();
  }

  function closeResetPasswordModal() {
    if (!adminResetPwdModal) return;
    if (typeof adminResetPwdModal.close === 'function') {
      adminResetPwdModal.close();
    } else {
      adminResetPwdModal.removeAttribute('open');
    }
  }

  /**
   * Handle Reset Password Submit
   * @param {Event} e 
   */
  async function handleResetPwdSubmit(e) {
    e.preventDefault();
    const currentPassword = pwdCurrentInput ? pwdCurrentInput.value : '';
    const newPassword = pwdNewInput ? pwdNewInput.value : '';
    const confirmPassword = pwdConfirmInput ? pwdConfirmInput.value : '';

    if (!currentPassword || !newPassword) {
      showToast('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 4) {
      showToast('New password must be at least 4 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New password and confirm password do not match.');
      return;
    }

    try {
      const { ok, data } = await fetchApi('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          username: currentUser ? currentUser.username : 'admin',
          currentPassword,
          newPassword
        })
      });

      if (ok && data && data.success) {
        showToast('✅ Password changed successfully!');
        closeResetPasswordModal();
      } else {
        showToast(data && data.message ? data.message : 'Failed to update password.');
      }
    } catch (err) {
      showToast('Error updating password: ' + err.message);
    }
  }

  // --------------------------------------------------------------------------
  // USER MANAGEMENT MODAL CONTROLLER
  // --------------------------------------------------------------------------

  async function openUserManagementModal() {
    if (!requireAdminAuth(() => openUserManagementModal(), 'Admin login required to manage users.')) {
      return;
    }

    if (!userMgmtModal) return;
    if (typeof userMgmtModal.showModal === 'function') {
      userMgmtModal.showModal();
    } else {
      userMgmtModal.setAttribute('open', '');
    }

    if (userFormCard) userFormCard.hidden = true;
    await fetchAndRenderUsers();
  }

  function closeUserManagementModal() {
    if (!userMgmtModal) return;
    if (typeof userMgmtModal.close === 'function') {
      userMgmtModal.close();
    } else {
      userMgmtModal.removeAttribute('open');
    }
  }

  async function fetchAndRenderUsers() {
    if (!usersTableTbody) return;
    usersTableTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#64748b;">Loading user directory...</td></tr>`;

    try {
      const { ok, data } = await fetchApi('/api/users');
      if (ok && data && Array.isArray(data.users)) {
        const users = data.users;
        if (userCountBadge) {
          userCountBadge.textContent = `${users.length} User${users.length === 1 ? '' : 's'}`;
        }

        if (users.length === 0) {
          usersTableTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#64748b;">No users configured.</td></tr>`;
          return;
        }

        usersTableTbody.innerHTML = users.map(u => {
          const isSelf = currentUser && currentUser.username.toLowerCase() === u.username.toLowerCase();
          const roleClass = u.role === 'superadmin' ? 'role-superadmin' : (u.role === 'operator' ? 'role-operator' : 'role-admin');
          const roleLabel = u.role === 'superadmin' ? 'Super Admin' : (u.role === 'operator' ? 'Operator' : 'Admin');
          const createdStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'System';

          return `
            <tr>
              <td>
                <div class="user-cell">
                  <div class="admin-avatar" style="width:22px; height:22px; font-size:0.6875rem;">
                    ${escapeHtml(u.username.charAt(0).toUpperCase())}
                  </div>
                  <span>${escapeHtml(u.username)}</span>
                  ${isSelf ? '<span style="font-size:0.7rem; color:#2563eb; font-weight:700;">(You)</span>' : ''}
                </div>
              </td>
              <td>${escapeHtml(u.fullName || u.username)}</td>
              <td><span class="role-badge ${roleClass}">${escapeHtml(roleLabel)}</span></td>
              <td>${escapeHtml(createdStr)}</td>
              <td>
                <div style="display:flex; align-items:center; gap:0.35rem;">
                  <button type="button" class="btn-icon-subtle btn-edit-user" data-user='${JSON.stringify(u)}' title="Edit User">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  ${!isSelf ? `
                    <button type="button" class="btn-icon-subtle btn-icon-danger btn-delete-user" data-id="${escapeHtml(u.id)}" data-username="${escapeHtml(u.username)}" title="Delete User">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Attach action handlers
        usersTableTbody.querySelectorAll('.btn-edit-user').forEach(btn => {
          btn.addEventListener('click', () => {
            const userData = JSON.parse(btn.getAttribute('data-user'));
            openEditUserForm(userData);
          });
        });

        usersTableTbody.querySelectorAll('.btn-delete-user').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const uname = btn.getAttribute('data-username');
            handleDeleteUser(id, uname);
          });
        });
      }
    } catch (err) {
      usersTableTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#ef4444;">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function openAddUserForm() {
    if (userFormCard) userFormCard.hidden = false;
    if (userFormTitle) userFormTitle.textContent = 'Create New Administrator / Operator';
    if (userFormId) userFormId.value = '';
    if (uUsername) {
      uUsername.value = '';
      uUsername.readOnly = false;
    }
    if (uFullname) uFullname.value = '';
    if (uRole) uRole.value = 'admin';
    if (uPassword) uPassword.value = '';
    if (uPwdReq) uPwdReq.style.display = 'inline';
    if (uUsername) uUsername.focus();
  }

  function openEditUserForm(user) {
    if (userFormCard) userFormCard.hidden = false;
    if (userFormTitle) userFormTitle.textContent = `Edit User: ${user.username}`;
    if (userFormId) userFormId.value = user.id || '';
    if (uUsername) {
      uUsername.value = user.username;
      uUsername.readOnly = true; // username immutable during edit
    }
    if (uFullname) uFullname.value = user.fullName || user.username;
    if (uRole) uRole.value = user.role || 'admin';
    if (uPassword) {
      uPassword.value = '';
      uPassword.placeholder = 'Leave blank to keep existing password';
    }
    if (uPwdReq) uPwdReq.style.display = 'none';
    if (uFullname) uFullname.focus();
  }

  async function handleUserUpsertSubmit(e) {
    e.preventDefault();
    const id = userFormId ? userFormId.value : '';
    const username = uUsername ? uUsername.value.trim().toLowerCase() : '';
    const fullName = uFullname ? uFullname.value.trim() : '';
    const role = uRole ? uRole.value : 'admin';
    const password = uPassword ? uPassword.value : '';

    if (!username || !fullName) {
      showToast('Please provide Username and Full Name.');
      return;
    }

    if (!id && !password) {
      showToast('Password is required for new users.');
      return;
    }

    const endpoint = id ? '/api/users/update' : '/api/users/add';
    const payload = { id, username, fullName, role, password };

    try {
      const { ok, data } = await fetchApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (ok && data && data.success) {
        showToast(`✅ ${data.message}`);
        if (userFormCard) userFormCard.hidden = true;
        await fetchAndRenderUsers();
      } else {
        showToast(data && data.message ? data.message : 'Operation failed.');
      }
    } catch (err) {
      showToast('User operation error: ' + err.message);
    }
  }

  async function handleDeleteUser(id, username) {
    if (!confirm(`Are you sure you want to permanently delete user '${username}'?`)) {
      return;
    }

    try {
      const { ok, data } = await fetchApi('/api/users/delete', {
        method: 'POST',
        body: JSON.stringify({ id, username })
      });

      if (ok && data && data.success) {
        showToast(`✅ User '${username}' removed.`);
        await fetchAndRenderUsers();
      } else {
        showToast(data && data.message ? data.message : 'Failed to delete user.');
      }
    } catch (err) {
      showToast('Delete error: ' + err.message);
    }
  }

  // --------------------------------------------------------------------------
  // IN-APP FRAME / WORKSPACE CONTROLLER
  // --------------------------------------------------------------------------

  /**
   * Launch application either inside In-App Frame or in external tab
   * @param {Object} app 
   */
  function launchApplication(app) {
    const targetUrl = resolveAppUrl(app);
    if (!targetUrl || targetUrl === '#') {
      showToast(`'${app.name}' is coming soon.`);
      return;
    }

    if (launchTarget === 'tab') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    openInAppFrame(app, targetUrl);
  }

  /**
   * Open application inside Embedded In-App Frame Modal
   * @param {Object} app 
   * @param {string} url 
   */
  function openInAppFrame(app, url) {
    if (!inappFrameModal || !inappIframe) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    currentFrameApp = app;
    currentFrameUrl = url;

    // Set header info
    if (inappTitle) inappTitle.textContent = app.name;
    if (inappAppIcon) inappAppIcon.src = app.icon || 'icons/generic.svg';
    if (inappCategoryBadge) inappCategoryBadge.textContent = app.category || 'App';
    if (inappUrlDisplay) inappUrlDisplay.textContent = url;

    // Show loader
    if (inappLoader) {
      inappLoader.style.display = 'flex';
      inappLoader.style.opacity = '1';
    }
    if (inappFallbackNotice) inappFallbackNotice.hidden = true;

    // Load iframe
    inappIframe.src = url;

    // Show modal
    inappFrameModal.classList.add('active');
    inappFrameModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Iframe load listener
    inappIframe.onload = () => {
      if (inappLoader) {
        inappLoader.style.opacity = '0';
        setTimeout(() => { inappLoader.style.display = 'none'; }, 300);
      }
    };

    // Safety timeout for restricted frames (X-Frame-Options)
    setTimeout(() => {
      if (inappLoader && inappLoader.style.display !== 'none') {
        inappLoader.style.display = 'none';
        if (inappFallbackNotice) inappFallbackNotice.hidden = false;
      }
    }, 4500);
  }

  /**
   * Close In-App Frame Modal
   */
  function closeInAppFrame() {
    if (!inappFrameModal || !inappIframe) return;
    inappFrameModal.classList.remove('active');
    inappFrameModal.classList.remove('fullscreen');
    inappFrameModal.setAttribute('aria-hidden', 'true');
    inappIframe.src = 'about:blank';
    document.body.style.overflow = '';
    currentFrameApp = null;
    currentFrameUrl = '';
  }

  /**
   * Reload current In-App Frame
   */
  function reloadInAppFrame() {
    if (!inappIframe || !currentFrameUrl) return;
    if (inappLoader) {
      inappLoader.style.display = 'flex';
      inappLoader.style.opacity = '1';
    }
    inappIframe.src = currentFrameUrl;
  }

  /**
   * Pop out current In-App frame to separate window
   */
  function popoutInAppFrame() {
    if (!currentFrameUrl) return;
    window.open(currentFrameUrl, '_blank', 'noopener,noreferrer');
    closeInAppFrame();
  }

  /**
   * Toggle fullscreen on In-App frame
   */
  function toggleInAppFullscreen() {
    if (!inappFrameModal) return;
    inappFrameModal.classList.toggle('fullscreen');
  }

  // --------------------------------------------------------------------------
  // APPLICATIONS DATA PERSISTENCE & API SYNCHRONIZATION
  // --------------------------------------------------------------------------

  /**
   * Load applications from server API as single source of truth
   */
  async function loadApplications() {
    let loadedData = null;

    // 1. Fetch from Server /api/applications (Disk persistent)
    try {
      const { ok, data } = await fetchApi('/api/applications');
      if (ok && data && Array.isArray(data.applications) && data.applications.length > 0) {
        loadedData = data.applications;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedData));
      }
    } catch (err) {
      console.warn('Could not fetch /api/applications, trying local storage');
    }

    // 2. Fallback to LocalStorage
    if (!loadedData) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedData = parsed;
          }
        }
      } catch (e) {}
    }

    // 3. Fallback to applications.json static file
    if (!loadedData) {
      try {
        const res = await fetch('applications.json', { cache: 'no-cache' });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) {
            loadedData = json;
          }
        }
      } catch (err) {}
    }

    // 4. Ultimate fallback
    applicationsList = loadedData || DEFAULT_APPLICATIONS;

    renderCategoryChips();
    applyFilters();
    fetchAllServicesHealth();
  }

  /**
   * Persist applications array to server disk applications.json
   */
  async function syncApplicationsToServer() {
    try {
      const { ok, data } = await fetchApi('/api/applications', {
        method: 'POST',
        body: JSON.stringify(applicationsList)
      });
      if (ok && data && data.success) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(applicationsList));
        return true;
      }
    } catch (err) {
      console.warn('Server sync skipped:', err.message);
    }
    // Fallback save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applicationsList));
    return false;
  }

  // --------------------------------------------------------------------------
  // LIVE SERVICE HEALTH & WINDOWS SERVICE CONTROL
  // --------------------------------------------------------------------------

  /**
   * Fetch live status for all services from server API
   */
  async function fetchAllServicesHealth() {
    if (isCheckingServices) return;
    isCheckingServices = true;

    if (refreshServicesBtn) refreshServicesBtn.classList.add('is-refreshing');
    if (headerHealthText) headerHealthText.textContent = 'Checking Services...';
    if (headerHealthDot) headerHealthDot.className = 'health-pulse-dot dot-amber';

    try {
      const { ok, data } = await fetchApi('/api/services/status');

      if (ok && data) {
        if (Array.isArray(data.services)) {
          data.services.forEach(health => {
            servicesHealthMap.set(health.id, health);
          });
        }

        const totalActive = data.runningCount || 0;
        const totalApps = data.total || applicationsList.length;

        if (headerHealthText) {
          headerHealthText.textContent = `${totalActive}/${totalApps} Services Online`;
        }
        if (headerHealthDot) {
          if (totalActive === totalApps && totalApps > 0) {
            headerHealthDot.className = 'health-pulse-dot dot-green';
          } else if (totalActive > 0) {
            headerHealthDot.className = 'health-pulse-dot dot-green';
          } else {
            headerHealthDot.className = 'health-pulse-dot dot-red';
          }
        }
      } else {
        if (headerHealthText) headerHealthText.textContent = 'Service API Standalone';
        if (headerHealthDot) headerHealthDot.className = 'health-pulse-dot dot-gray';
      }
    } catch (err) {
      if (headerHealthText) headerHealthText.textContent = 'Direct Mode';
      if (headerHealthDot) headerHealthDot.className = 'health-pulse-dot dot-gray';
    } finally {
      isCheckingServices = false;
      if (refreshServicesBtn) refreshServicesBtn.classList.remove('is-refreshing');
      applyFilters();
    }
  }

  /**
   * Execute Start, Stop, or Restart on an application's service(s)
   * @param {string} appId 
   * @param {'start'|'stop'|'restart'} action 
   * @param {string} [serviceName] 
   */
  async function triggerServiceAction(appId, action, serviceName = null) {
    if (!requireAdminAuth(() => triggerServiceAction(appId, action, serviceName), `Admin login required to ${action} Windows services.`)) {
      return;
    }

    const app = applicationsList.find(a => a.id === appId);
    const appName = app ? app.name : appId;

    if (action === 'stop') {
      if (!confirm(`Are you sure you want to STOP the Windows service for "${appName}"?`)) {
        return;
      }
    }

    activeActionAppId = appId;
    applyFilters();

    const actionText = action === 'restart' ? 'Restarting' : (action === 'start' ? 'Starting' : 'Stopping');
    showToast(`⚡ ${actionText} service for ${appName}...`);

    try {
      const { ok, data } = await fetchApi('/api/services/action', {
        method: 'POST',
        body: JSON.stringify({ appId, action, serviceName })
      });

      if (ok && data) {
        if (data.health) {
          servicesHealthMap.set(appId, data.health);
        }
        showToast(data.success ? `✅ ${data.message}` : `⚠️ ${data.message}`, 4500);
      } else {
        showToast(`Action failed: ${data && data.message ? data.message : 'Service error'}`);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      activeActionAppId = null;
      fetchAllServicesHealth();
    }
  }

  // --------------------------------------------------------------------------
  // URL RESOLUTION & RENDERING
  // --------------------------------------------------------------------------

  /**
   * Resolve target URL for an application
   * @param {Object} app 
   * @returns {string}
   */
  function resolveAppUrl(app) {
    if (!app.path || app.path === '#') return '#';
    if (app.path.startsWith('http://') || app.path.startsWith('https://')) return app.path;

    const hostname = window.location.hostname || 'localhost';

    if (routeMode === 'direct' && app.devPort) {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      return `${protocol}//${hostname}:${app.devPort}/`;
    }

    // Default NGINX Path
    const cleanPath = app.path.startsWith('/') ? app.path : `/${app.path}`;
    return cleanPath;
  }

  /**
   * Render category filter chips
   */
  function renderCategoryChips() {
    if (!categoryChipsContainer) return;

    const categories = ['all'];
    applicationsList.forEach(app => {
      const cat = app.category || 'General';
      if (!categories.includes(cat)) categories.push(cat);
    });

    categoryChipsContainer.innerHTML = categories.map(cat => {
      const label = cat === 'all' ? 'All Applications' : cat;
      const count = cat === 'all'
        ? applicationsList.length
        : applicationsList.filter(a => (a.category || 'General') === cat).length;
      const isActive = currentCategory === cat ? 'active' : '';

      return `
        <button type="button" class="cat-chip ${isActive}" data-category="${escapeHtml(cat)}">
          <span>${escapeHtml(label)}</span>
          <span class="cat-chip-count">${count}</span>
        </button>
      `;
    }).join('');

    categoryChipsContainer.querySelectorAll('.cat-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        currentCategory = btn.getAttribute('data-category');
        renderCategoryChips();
        applyFilters();
      });
    });
  }

  /**
   * Filter and render application cards
   */
  function applyFilters() {
    if (!appsGrid) return;

    let filtered = applicationsList.filter(app => {
      if (app.enabled === false) return false;
      if (currentCategory !== 'all' && (app.category || 'General') !== currentCategory) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (app.name || '').toLowerCase().includes(q);
        const descMatch = (app.description || '').toLowerCase().includes(q);
        const catMatch = (app.category || '').toLowerCase().includes(q);
        const portMatch = String(app.devPort || '').includes(q);
        return nameMatch || descMatch || catMatch || portMatch;
      }
      return true;
    });

    filtered.sort((a, b) => (a.order || 99) - (b.order || 99));

    if (resultsCount) {
      resultsCount.textContent = `Showing ${filtered.length} of ${applicationsList.length} apps`;
    }

    if (filtered.length === 0) {
      appsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: #64748b;">
          <h3>No applications found</h3>
          <p>Try searching with another keyword or selecting "All Applications".</p>
        </div>
      `;
      return;
    }

    appsGrid.innerHTML = filtered.map(app => renderAppCard(app)).join('');
    attachCardEventListeners();
  }

  /**
   * Generate HTML for a single application card
   * @param {Object} app 
   * @returns {string}
   */
  function renderAppCard(app) {
    const health = servicesHealthMap.get(app.id);
    const isActionRunning = activeActionAppId === app.id;

    let statusPillClass = 'status-offline';
    let statusPillText = 'Service Inactive';
    let isResponsive = false;

    if (health) {
      isResponsive = health.isResponsive;
      if (health.overallStatus === 'RUNNING' || isResponsive) {
        statusPillClass = 'status-online';
        statusPillText = 'Live & Online';
      } else if (health.overallStatus === 'PARTIAL') {
        statusPillClass = 'status-partial';
        statusPillText = 'Partial Running';
      } else if (health.overallStatus === 'COMING_SOON' || app.status === 'coming_soon') {
        statusPillClass = 'status-coming-soon';
        statusPillText = 'Coming Soon';
      }
    } else if (app.status === 'coming_soon') {
      statusPillClass = 'status-coming-soon';
      statusPillText = 'Coming Soon';
    }

    const hasService = Boolean(app.serviceName || (Array.isArray(app.services) && app.services.length > 0));

    return `
      <article class="app-card" data-app-id="${escapeHtml(app.id)}">
        <div class="app-card-header">
          <div class="app-card-icon-wrapper">
            <img src="${escapeHtml(app.icon || 'icons/generic.svg')}" alt="${escapeHtml(app.name)}" class="app-card-icon" onerror="this.onerror=null; this.src='icons/generic.svg';">
          </div>
          <div class="app-card-title-group">
            <h3 class="app-card-title" title="${escapeHtml(app.name)}">${escapeHtml(app.name)}</h3>
            <div class="app-card-badges">
              <span class="app-cat-badge">${escapeHtml(app.category || 'General')}</span>
              ${app.devPort ? `<span class="app-port-badge">Port ${app.devPort}</span>` : ''}
            </div>
          </div>
        </div>

        <p class="app-card-desc" title="${escapeHtml(app.description || '')}">
          ${escapeHtml(app.description || 'No description available.')}
        </p>

        <div class="app-card-footer">
          <div class="app-status-pill ${statusPillClass}">
            <span class="health-pulse-dot ${statusPillClass === 'status-online' ? 'dot-green' : (statusPillClass === 'status-partial' ? 'dot-amber' : 'dot-red')}"></span>
            <span>${escapeHtml(statusPillText)}</span>
          </div>

          <div class="card-action-btns">
            ${hasService ? `
              <button type="button" class="btn btn-secondary btn-sm btn-service-restart" data-id="${escapeHtml(app.id)}" title="Restart Windows Service" ${isActionRunning ? 'disabled' : ''}>
                <svg class="${isActionRunning ? 'refresh-spin-icon' : ''}" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                <span>${isActionRunning ? 'Working...' : 'Restart'}</span>
              </button>
            ` : ''}

            <button type="button" class="btn btn-primary btn-sm btn-launch-app" data-id="${escapeHtml(app.id)}" title="Launch Application">
              <span>Open</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </button>

            ${currentUser ? `
              <button type="button" class="btn-icon-subtle btn-edit-app" data-id="${escapeHtml(app.id)}" title="Edit Application Configuration">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button type="button" class="btn-icon-subtle btn-icon-danger btn-delete-app" data-id="${escapeHtml(app.id)}" title="Delete Application">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            ` : ''}
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Attach click events to card buttons
   */
  function attachCardEventListeners() {
    // Launch Application
    appsGrid.querySelectorAll('.app-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Prevent if user clicked edit/delete/restart buttons directly
        if (e.target.closest('button')) return;
        const appId = card.getAttribute('data-app-id');
        const app = applicationsList.find(a => a.id === appId);
        if (app) launchApplication(app);
      });
    });

    appsGrid.querySelectorAll('.btn-launch-app').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const appId = btn.getAttribute('data-id');
        const app = applicationsList.find(a => a.id === appId);
        if (app) launchApplication(app);
      });
    });

    // Restart Service
    appsGrid.querySelectorAll('.btn-service-restart').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const appId = btn.getAttribute('data-id');
        triggerServiceAction(appId, 'restart');
      });
    });

    // Edit Application
    appsGrid.querySelectorAll('.btn-edit-app').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const appId = btn.getAttribute('data-id');
        const app = applicationsList.find(a => a.id === appId);
        if (app) openEditModal(app);
      });
    });

    // Delete Application
    appsGrid.querySelectorAll('.btn-delete-app').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const appId = btn.getAttribute('data-id');
        handleDeleteApp(appId);
      });
    });
  }

  // --------------------------------------------------------------------------
  // ADD / EDIT / DELETE APPLICATION MODAL
  // --------------------------------------------------------------------------

  function openAddModal() {
    if (!requireAdminAuth(() => openAddModal(), 'Admin login required to add applications.')) {
      return;
    }

    if (!addAppModal) return;
    if (modalTitle) modalTitle.textContent = 'Add Application / Website';
    if (formEditingId) formEditingId.value = '';
    if (addAppForm) addAppForm.reset();
    if (formAppStatus) formAppStatus.value = 'active';
    if (formAppOrder) formAppOrder.value = applicationsList.length + 1;
    if (formAppIcon) formAppIcon.value = 'icons/generic.svg';

    if (iconPresetsGrid) {
      const btns = iconPresetsGrid.querySelectorAll('.preset-icon-btn');
      btns.forEach((btn, idx) => btn.classList.toggle('selected', idx === 0));
    }

    if (nssmServiceBox) nssmServiceBox.hidden = true;
    if (nssmStatusBadge) {
      nssmStatusBadge.className = 'nssm-badge-offline';
      nssmStatusBadge.textContent = 'Not Configured';
    }

    if (typeof addAppModal.showModal === 'function') {
      addAppModal.showModal();
    } else {
      addAppModal.setAttribute('open', '');
    }
    if (formAppName) formAppName.focus();
  }

  function openEditModal(app) {
    if (!requireAdminAuth(() => openEditModal(app), 'Admin login required to edit applications.')) {
      return;
    }

    if (!addAppModal) return;
    if (modalTitle) modalTitle.textContent = `Edit Application: ${app.name}`;
    if (formEditingId) formEditingId.value = app.id;
    if (formAppName) formAppName.value = app.name || '';
    if (formAppPort) formAppPort.value = app.devPort || '';
    if (formAppPath) formAppPath.value = app.path || '';
    if (formAppDesc) formAppDesc.value = app.description || '';
    
    const primarySvc = Array.isArray(app.services) && app.services.length > 0 ? app.services[0] : (app.serviceName || '');
    if (formAppService) {
      formAppService.value = Array.isArray(app.services) ? app.services.join(', ') : (app.serviceName || '');
    }
    if (formAppCategory) formAppCategory.value = app.category || 'General';
    if (formAppStatus) formAppStatus.value = app.status || 'active';
    if (formAppOrder) formAppOrder.value = app.order || 1;
    if (formAppIcon) formAppIcon.value = app.icon || 'icons/generic.svg';

    // Populate NSSM defaults for this app
    if (nssmAppDir) {
      if (app.id === 'typing' || (app.name && app.name.toLowerCase().includes('typing')) || (app.path && app.path.includes('gtes'))) {
        nssmAppDir.value = 'D:\\aj\\gtes';
      } else {
        nssmAppDir.value = `D:\\aj\\${app.id}`;
      }
    }

    if (nssmAppArgs) {
      if (app.id === 'typing' || (app.name && app.name.toLowerCase().includes('typing')) || (app.path && app.path.includes('gtes'))) {
        nssmAppArgs.value = 'node_modules/next/dist/bin/next start -p 3800';
      } else {
        nssmAppArgs.value = 'server.js';
      }
    }
    if (nssmServiceBox) nssmServiceBox.hidden = true;

    if (primarySvc) {
      checkNssmServiceStatus(primarySvc);
    }

    if (iconPresetsGrid) {
      const btns = iconPresetsGrid.querySelectorAll('.preset-icon-btn');
      btns.forEach(btn => {
        const iconSrc = btn.getAttribute('data-icon');
        btn.classList.toggle('selected', iconSrc === app.icon);
      });
    }

    if (typeof addAppModal.showModal === 'function') {
      addAppModal.showModal();
    } else {
      addAppModal.setAttribute('open', '');
    }
    if (formAppName) formAppName.focus();
  }

  function closeAddModal() {
    if (!addAppModal) return;
    if (typeof addAppModal.close === 'function') {
      addAppModal.close();
    } else {
      addAppModal.removeAttribute('open');
    }
  }

  async function handleAddAppSubmit(e) {
    e.preventDefault();

    const editingId = formEditingId ? formEditingId.value : '';
    const name = formAppName ? formAppName.value.trim() : '';
    const path = formAppPath ? formAppPath.value.trim() : '';
    const desc = formAppDesc ? formAppDesc.value.trim() : '';
    const serviceVal = formAppService ? formAppService.value.trim() : '';
    const category = formAppCategory ? formAppCategory.value.trim() || 'General' : 'General';
    const status = formAppStatus ? formAppStatus.value : 'active';
    const icon = formAppIcon ? formAppIcon.value : 'icons/generic.svg';
    const portVal = formAppPort && formAppPort.value ? parseInt(formAppPort.value, 10) : null;
    const order = formAppOrder ? parseInt(formAppOrder.value, 10) || (applicationsList.length + 1) : (applicationsList.length + 1);

    if (!name || !desc) {
      showToast('Please fill in Application Name and Description.');
      return;
    }

    const servicesArr = serviceVal ? serviceVal.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (editingId) {
      // Editing existing
      const index = applicationsList.findIndex(a => a.id === editingId);
      if (index !== -1) {
        applicationsList[index].name = name;
        applicationsList[index].path = path || '#';
        applicationsList[index].description = desc;
        applicationsList[index].category = category;
        applicationsList[index].status = status;
        applicationsList[index].icon = icon;
        applicationsList[index].order = order;
        if (servicesArr.length > 0) {
          applicationsList[index].services = servicesArr;
          applicationsList[index].serviceName = servicesArr[0];
        } else {
          delete applicationsList[index].services;
          delete applicationsList[index].serviceName;
        }
        if (portVal) {
          applicationsList[index].devPort = portVal;
        } else {
          delete applicationsList[index].devPort;
        }
        showToast(`Updated '${name}' successfully!`);
      }
    } else {
      // Adding new
      const autoId = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      const newApp = {
        id: autoId,
        name,
        path: path || '#',
        description: desc,
        icon,
        enabled: true,
        status,
        order,
        category
      };
      if (servicesArr.length > 0) {
        newApp.services = servicesArr;
        newApp.serviceName = servicesArr[0];
      }
      if (portVal) {
        newApp.devPort = portVal;
      }
      applicationsList.push(newApp);
      showToast(`Added '${name}' successfully!`);
    }

    // Sync to disk applications.json
    await syncApplicationsToServer();

    renderCategoryChips();
    applyFilters();
    closeAddModal();
    fetchAllServicesHealth();
  }

  async function handleDeleteApp(appId) {
    if (!requireAdminAuth(() => handleDeleteApp(appId), 'Admin login required to delete applications.')) {
      return;
    }

    const app = applicationsList.find(a => a.id === appId);
    if (!app) return;

    if (!confirm(`Are you sure you want to delete '${app.name}'?`)) {
      return;
    }

    applicationsList = applicationsList.filter(a => a.id !== appId);

    try {
      await fetchApi('/api/applications/delete', {
        method: 'POST',
        body: JSON.stringify({ id: appId })
      });
    } catch (e) {}

    await syncApplicationsToServer();
    showToast(`Deleted '${app.name}'.`);
    renderCategoryChips();
    applyFilters();
    fetchAllServicesHealth();
  }

  // --------------------------------------------------------------------------
  // NSSM 1-CLICK WINDOWS SERVICE MANAGEMENT
  // --------------------------------------------------------------------------

  async function checkNssmServiceStatus(serviceName) {
    if (!serviceName || !nssmStatusBadge) return;
    try {
      const { ok, data } = await fetchApi(`/api/services/nssm/status?name=${encodeURIComponent(serviceName)}`);
      if (ok && data && data.isInstalled) {
        nssmStatusBadge.className = 'nssm-badge-online';
        nssmStatusBadge.textContent = data.isRunning ? '🟢 Running (Auto-Start)' : '🟡 Stopped (Installed)';
        if (btnNssmDeregister) btnNssmDeregister.hidden = false;
      } else {
        nssmStatusBadge.className = 'nssm-badge-offline';
        nssmStatusBadge.textContent = '⚪ Not Installed';
        if (btnNssmDeregister) btnNssmDeregister.hidden = true;
      }
    } catch (e) {}
  }

  async function handleNssmRegister() {
    if (!requireAdminAuth(() => handleNssmRegister(), 'Admin login required to register Windows services.')) {
      return;
    }

    let serviceName = formAppService ? formAppService.value.trim() : '';
    let exePath = nssmExePath ? nssmExePath.value.trim() : 'C:\\Program Files\\nodejs\\node.exe';
    let appDir = nssmAppDir ? nssmAppDir.value.trim() : '';
    let args = nssmAppArgs ? nssmAppArgs.value.trim() : '';
    const appId = formEditingId ? formEditingId.value.trim() : '';
    const name = formAppName ? formAppName.value.trim() : '';

    // Smart auto-fill for serviceName if left blank
    if (!serviceName) {
      if (appId === 'typing' || (name && name.toLowerCase().includes('typing')) || (name && name.toLowerCase().includes('gtes'))) {
        serviceName = 'gtes';
      } else if (appId) {
        serviceName = appId;
      } else if (name) {
        serviceName = name.replace(/[^a-zA-Z0-9]/g, '');
      } else {
        serviceName = 'district-service';
      }
      if (formAppService) formAppService.value = serviceName;
    }

    // Smart directory auto-fill
    if (!appDir || appDir === 'D:\\aj\\typing') {
      if (appId === 'typing' || serviceName === 'gtes' || (name && name.toLowerCase().includes('gtes'))) {
        appDir = 'D:\\aj\\gtes';
      } else if (appId) {
        appDir = `D:\\aj\\${appId}`;
      }
      if (nssmAppDir) nssmAppDir.value = appDir;
    }

    if (!exePath) {
      exePath = 'C:\\Program Files\\nodejs\\node.exe';
      if (nssmExePath) nssmExePath.value = exePath;
    }

    showToast(`⚡ Registering Windows Service '${serviceName}' via NSSM...`);
    try {
      const { ok, data } = await fetchApi('/api/services/nssm/register', {
        method: 'POST',
        body: JSON.stringify({
          serviceName,
          displayName: name || serviceName,
          appDirectory: appDir,
          executablePath: exePath,
          arguments: args,
          appId
        })
      });

      if (ok && data && data.success) {
        showToast(`✅ ${data.message}`, 4500);
        checkNssmServiceStatus(serviceName);
        fetchAllServicesHealth();
      } else {
        showToast(data && data.message ? data.message : 'Registration failed.');
      }
    } catch (err) {
      showToast('NSSM Error: ' + err.message);
    }
  }

  async function handleNssmDeregister() {
    if (!requireAdminAuth(() => handleNssmDeregister(), 'Admin login required to deregister Windows services.')) {
      return;
    }

    const serviceName = formAppService ? formAppService.value.trim() : '';
    const appId = formEditingId ? formEditingId.value.trim() : '';

    if (!serviceName) {
      showToast('No Service Name specified.');
      return;
    }

    if (!confirm(`Are you sure you want to stop and remove Windows service '${serviceName}'?`)) {
      return;
    }

    showToast(`Stopping and removing Windows Service '${serviceName}'...`);
    try {
      const { ok, data } = await fetchApi('/api/services/nssm/deregister', {
        method: 'POST',
        body: JSON.stringify({ serviceName, appId })
      });

      if (ok && data && data.success) {
        showToast(`✅ ${data.message}`);
        checkNssmServiceStatus(serviceName);
        fetchAllServicesHealth();
      } else {
        showToast(data && data.message ? data.message : 'Deregister failed.');
      }
    } catch (err) {
      showToast('NSSM Error: ' + err.message);
    }
  }

  // --------------------------------------------------------------------------
  // EVENT LISTENERS INITIALIZATION
  // --------------------------------------------------------------------------

  function initEventListeners() {
    // Search
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        if (clearSearchBtn) clearSearchBtn.hidden = !searchQuery;
        applyFilters();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.hidden = true;
        applyFilters();
        if (searchInput) searchInput.focus();
      });
    }

    // Launch Target Mode (In-App Frame vs Tab)
    if (launchTargetToggle) {
      launchTargetToggle.checked = launchTarget === 'frame';
      if (frameToggleText) frameToggleText.textContent = launchTarget === 'frame' ? 'In-App Frame' : 'New Tab';

      launchTargetToggle.addEventListener('change', (e) => {
        launchTarget = e.target.checked ? 'frame' : 'tab';
        localStorage.setItem(LAUNCH_TARGET_KEY, launchTarget);
        if (frameToggleText) frameToggleText.textContent = launchTarget === 'frame' ? 'In-App Frame' : 'New Tab';
        showToast(launchTarget === 'frame' ? '🖥️ Opening apps inside DGS Frame' : '↗️ Opening apps in New Browser Tabs');
      });
    }

    // Routing Mode
    if (routeModeSelect) {
      routeModeSelect.value = routeMode;
      routeModeSelect.addEventListener('change', (e) => {
        routeMode = e.target.value;
        localStorage.setItem(ROUTE_MODE_KEY, routeMode);
        showToast(routeMode === 'direct' ? 'Using Direct Backend Ports (LAN & Local)' : 'Using NGINX Proxy Routes (/path/)');
      });
    }

    // Add App Modal
    if (openAddModalBtn) openAddModalBtn.addEventListener('click', () => openAddModal());
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeAddModal());
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', () => closeAddModal());
    if (addAppForm) addAppForm.addEventListener('submit', handleAddAppSubmit);

    // NSSM 1-Click Panel Controls
    if (toggleNssmPanelBtn && nssmServiceBox) {
      toggleNssmPanelBtn.addEventListener('click', () => {
        nssmServiceBox.hidden = !nssmServiceBox.hidden;
        let currentSvc = formAppService ? formAppService.value.trim() : '';
        const appId = formEditingId ? formEditingId.value.trim() : '';
        const appName = formAppName ? formAppName.value.trim() : '';

        // Auto-populate Service Name & Directory if empty
        if (!currentSvc) {
          if (appId === 'typing' || (appName && appName.toLowerCase().includes('typing')) || (appName && appName.toLowerCase().includes('gtes'))) {
            currentSvc = 'gtes';
          } else if (appId) {
            currentSvc = appId;
          } else if (appName) {
            currentSvc = appName.replace(/[^a-zA-Z0-9]/g, '');
          }
          if (formAppService && currentSvc) formAppService.value = currentSvc;
        }

        if (nssmAppDir && (!nssmAppDir.value || nssmAppDir.value === 'D:\\aj\\typing')) {
          if (appId === 'typing' || currentSvc === 'gtes') {
            nssmAppDir.value = 'D:\\aj\\gtes';
          }
        }

        if (!nssmServiceBox.hidden && currentSvc) {
          checkNssmServiceStatus(currentSvc);
        }
      });
    }

    // NSSM Preset Quick Fill Buttons
    const btnNssmPresetNext = document.getElementById('btn-nssm-preset-next');
    if (btnNssmPresetNext) {
      btnNssmPresetNext.addEventListener('click', () => {
        if (nssmExePath) nssmExePath.value = 'C:\\Program Files\\nodejs\\node.exe';
        if (nssmAppDir) nssmAppDir.value = 'D:\\aj\\gtes';
        if (nssmAppArgs) nssmAppArgs.value = 'node_modules/next/dist/bin/next start -p 3800';
        if (formAppService && !formAppService.value.trim()) formAppService.value = 'gtes';
        showToast('Filled Next.js preset for GTES (Port 3800)');
      });
    }

    const btnNssmPresetNode = document.getElementById('btn-nssm-preset-node');
    if (btnNssmPresetNode) {
      btnNssmPresetNode.addEventListener('click', () => {
        if (nssmExePath) nssmExePath.value = 'C:\\Program Files\\nodejs\\node.exe';
        if (nssmAppArgs) nssmAppArgs.value = 'server.js';
        showToast('Filled Node (server.js) preset');
      });
    }

    const btnNssmPresetCmd = document.getElementById('btn-nssm-preset-cmd');
    if (btnNssmPresetCmd) {
      btnNssmPresetCmd.addEventListener('click', () => {
        if (nssmExePath) nssmExePath.value = 'C:\\Windows\\System32\\cmd.exe';
        if (nssmAppArgs) nssmAppArgs.value = '/c "npm run start"';
        showToast('Filled CMD (npm start) preset');
      });
    }

    if (formAppService) {
      formAppService.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val) checkNssmServiceStatus(val);
      });
    }

    if (btnNssmRegister) btnNssmRegister.addEventListener('click', handleNssmRegister);
    if (btnNssmDeregister) btnNssmDeregister.addEventListener('click', handleNssmDeregister);

    // Preset Icon Picker
    if (iconPresetsGrid) {
      iconPresetsGrid.querySelectorAll('.preset-icon-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          iconPresetsGrid.querySelectorAll('.preset-icon-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          const iconPath = btn.getAttribute('data-icon');
          if (formAppIcon) formAppIcon.value = iconPath;
        });
      });
    }

    // Admin Login Modal
    if (adminLoginForm) adminLoginForm.addEventListener('submit', handleLoginSubmit);
    if (closeLoginModalBtn) closeLoginModalBtn.addEventListener('click', () => closeLoginModal());
    if (cancelLoginModalBtn) cancelLoginModalBtn.addEventListener('click', () => closeLoginModal());

    // Admin Reset Password Modal
    if (adminResetPwdForm) adminResetPwdForm.addEventListener('submit', handleResetPwdSubmit);
    if (closeResetPwdModalBtn) closeResetPwdModalBtn.addEventListener('click', () => closeResetPasswordModal());
    if (cancelResetPwdModalBtn) cancelResetPwdModalBtn.addEventListener('click', () => closeResetPasswordModal());

    // User Management Modal
    if (closeUserMgmtBtn) closeUserMgmtBtn.addEventListener('click', () => closeUserManagementModal());
    if (btnShowAddUser) btnShowAddUser.addEventListener('click', () => openAddUserForm());
    if (btnCancelUserForm) btnCancelUserForm.addEventListener('click', () => { if (userFormCard) userFormCard.hidden = true; });
    if (userUpsertForm) userUpsertForm.addEventListener('submit', handleUserUpsertSubmit);

    // In-App Frame Controls
    if (inappCloseBtn) inappCloseBtn.addEventListener('click', () => closeInAppFrame());
    if (inappReloadBtn) inappReloadBtn.addEventListener('click', () => reloadInAppFrame());
    if (inappPopoutBtn) inappPopoutBtn.addEventListener('click', () => popoutInAppFrame());
    if (inappFullscreenBtn) inappFullscreenBtn.addEventListener('click', () => toggleInAppFullscreen());
    if (inappFallbackOpenBtn) inappFallbackOpenBtn.addEventListener('click', () => popoutInAppFrame());

    // Refresh Services button
    if (refreshServicesBtn) {
      refreshServicesBtn.addEventListener('click', () => fetchAllServicesHealth());
    }

    // Export JSON
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        const jsonStr = JSON.stringify(applicationsList, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'applications.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Downloaded applications.json!');
      });
    }

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // ESC closes in-app frame
      if (e.key === 'Escape' && inappFrameModal && inappFrameModal.classList.contains('active')) {
        closeInAppFrame();
        return;
      }
      // '/' focuses search
      if (e.key === '/' && document.activeElement !== searchInput && !document.activeElement.matches('input, textarea')) {
        e.preventDefault();
        if (searchInput) searchInput.focus();
      }
      // 'R' refreshes services
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !document.activeElement.matches('input, textarea')) {
        fetchAllServicesHealth();
      }
      // 'N' opens Add App dialog
      if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !document.activeElement.matches('input, textarea')) {
        openAddModal();
      }
    });
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  function init() {
    updateDateDisplay();
    initEventListeners();
    checkAuthStatus();
    loadApplications();

    // Periodic live health check every 25 seconds
    setInterval(() => {
      fetchAllServicesHealth();
    }, 25000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
