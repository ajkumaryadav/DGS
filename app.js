/**
 * DGS (District Governance Suite) - Application Launcher Controller
 * Full-featured controller with dynamic loading, direct opening,
 * in-UI add, edit & remove application management, and Coming Soon status support.
 */

(() => {
  'use strict';

  const STORAGE_KEY = 'dgs_applications_registry_v4';
  const ROUTE_MODE_KEY = 'dgs_route_mode_v2';

  // Default baseline application suite
  const DEFAULT_APPLICATIONS = [
    {
      "id": "accc",
      "name": "ACCC",
      "path": "/accc/",
      "devPort": 3000,
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

  // State
  let applicationsList = [];
  let currentCategory = 'all';
  let searchQuery = '';
  
  // Default to direct port mode across all environments (LAN & Local) for full HTML/CSS/JS asset loading
  let routeMode = localStorage.getItem(ROUTE_MODE_KEY) || 'direct';

  // DOM Elements
  const appsGrid = document.getElementById('apps-grid');
  const searchInput = document.getElementById('app-search');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const resultsCount = document.getElementById('results-count');
  const currentDateEl = document.getElementById('current-date');
  const categoryChipsContainer = document.getElementById('category-chips-container');
  const routeModeSelect = document.getElementById('route-mode-select');
  const exportJsonBtn = document.getElementById('export-json-btn');
  const resetAppsBtn = document.getElementById('reset-apps-btn');
  const toastContainer = document.getElementById('toast-container');

  // Modal Elements
  const addAppModal = document.getElementById('add-app-modal');
  const modalTitle = document.getElementById('modal-title');
  const openAddModalBtn = document.getElementById('open-add-modal-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-modal-btn');
  const addAppForm = document.getElementById('add-app-form');
  const formEditingId = document.getElementById('form-editing-id');
  const formAppName = document.getElementById('form-app-name');
  const formAppPort = document.getElementById('form-app-port');
  const formAppPath = document.getElementById('form-app-path');
  const formAppDesc = document.getElementById('form-app-desc');
  const formAppCategory = document.getElementById('form-app-category');
  const formAppStatus = document.getElementById('form-app-status');
  const formAppOrder = document.getElementById('form-app-order');
  const formAppIcon = document.getElementById('form-app-icon');
  const iconPresetsGrid = document.getElementById('icon-presets-grid');

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
   * Display toast notification
   * @param {string} message 
   */
  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }

  /**
   * Update live date in header
   */
  function updateLiveDate() {
    if (!currentDateEl) return;
    try {
      const now = new Date();
      const options = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };
      currentDateEl.textContent = now.toLocaleDateString('en-US', options);
    } catch (e) {
      currentDateEl.textContent = new Date().toDateString();
    }
  }

  /**
   * Resolve target URL for an application
   * @param {Object} app 
   * @returns {string}
   */
  function getAppTargetUrl(app) {
    if (!app || app.status === 'coming_soon' || app.path === '#' || !app.path) return '#';

    const host = window.location.hostname || 'localhost';
    const port = app.devPort || app.port;

    // 1. Direct Port Mode (Default & recommended for LAN + Local):
    // Directly opens dedicated port so Next.js static assets (/_next/...) load with 100% fidelity
    if (routeMode === 'direct' && port) {
      return `http://${host}:${port}/`;
    }

    // 2. If already absolute URL (http:// or https://)
    if (app.path && (app.path.startsWith('http://') || app.path.startsWith('https://'))) {
      try {
        const parsed = new URL(app.path);
        // If configured with localhost/127.0.0.1 and client is accessing from LAN IP, adapt host
        if ((parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') && host !== 'localhost' && host !== '127.0.0.1') {
          parsed.hostname = host;
          return parsed.toString();
        }
        return app.path;
      } catch (e) {
        return app.path;
      }
    }

    // 3. If port is present, always prefer direct port to prevent asset breakage
    if (port) {
      return `http://${host}:${port}/`;
    }

    // 4. Proxy / relative path fallback
    if (app.path && app.path.startsWith('/')) {
      const currentPort = window.location.port;
      if (currentPort && currentPort !== '80' && currentPort !== '') {
        return `http://${host}${app.path}`;
      }
      return app.path;
    }

    return app.path || '#';
  }

  /**
   * Save current application list to localStorage
   */
  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applicationsList, null, 2));
      if (resetAppsBtn) resetAppsBtn.hidden = false;
    } catch (e) {}
  }

  /**
   * Load applications (from localStorage or fetch from applications.json)
   */
  async function loadApplications() {
    let loadedData = null;

    // 1. Check localStorage first
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedData = parsed;
          if (resetAppsBtn) resetAppsBtn.hidden = false;
        }
      }
    } catch (e) {}

    // 2. If not in localStorage, fetch from server applications.json
    if (!loadedData) {
      try {
        const res = await fetch('applications.json', {
          cache: 'no-cache',
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) {
            loadedData = json;
          }
        }
      } catch (err) {
        console.warn('Network fetch skipped, using embedded defaults');
      }
    }

    // 3. Fallback to embedded default list if needed
    applicationsList = loadedData || DEFAULT_APPLICATIONS;

    renderCategoryChips();
    applyFilters();
  }

  /**
   * Render Category Chips
   */
  function renderCategoryChips() {
    if (!categoryChipsContainer) return;
    categoryChipsContainer.innerHTML = '';

    const enabledApps = applicationsList.filter(a => a.enabled === true);

    const counts = { all: enabledApps.length };
    enabledApps.forEach(app => {
      const cat = app.category ? app.category.trim() : 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    // 'All' Chip
    const allChip = document.createElement('button');
    allChip.type = 'button';
    allChip.className = `cat-chip ${currentCategory === 'all' ? 'active' : ''}`;
    allChip.setAttribute('data-category', 'all');
    allChip.innerHTML = `<span>All</span> <span class="cat-count">${counts.all}</span>`;
    allChip.addEventListener('click', () => setCategoryFilter('all'));
    categoryChipsContainer.appendChild(allChip);

    // Category Chips
    Object.keys(counts).forEach(cat => {
      if (cat === 'all') return;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `cat-chip ${currentCategory === cat ? 'active' : ''}`;
      chip.setAttribute('data-category', cat);
      chip.innerHTML = `<span>${escapeHtml(cat)}</span> <span class="cat-count">${counts[cat]}</span>`;
      chip.addEventListener('click', () => setCategoryFilter(cat));
      categoryChipsContainer.appendChild(chip);
    });
  }

  /**
   * Set category filter
   * @param {string} category 
   */
  function setCategoryFilter(category) {
    currentCategory = category;
    const chips = categoryChipsContainer.querySelectorAll('.cat-chip');
    chips.forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('data-category') === category);
    });
    applyFilters();
  }

  /**
   * Get category CSS class
   * @param {string} category 
   * @returns {string}
   */
  function getCategoryClass(category) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('monitoring')) return 'cat-monitoring';
    if (cat.includes('election')) return 'cat-elections';
    if (cat.includes('admin') || cat.includes('record') || cat.includes('draft')) return 'cat-admin';
    if (cat.includes('grievance') || cat.includes('public')) return 'cat-grievance';
    return '';
  }

  /**
   * Open modal to edit an existing application
   * @param {string} id 
   * @param {Event} event 
   */
  function openEditModal(id, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const app = applicationsList.find(a => a.id === id);
    if (!app || !addAppModal) return;

    if (modalTitle) modalTitle.textContent = 'Edit Application';
    if (formEditingId) formEditingId.value = app.id;
    if (formAppName) formAppName.value = app.name || '';
    if (formAppPort) formAppPort.value = app.devPort || '';
    if (formAppPath) formAppPath.value = app.path || '';
    if (formAppDesc) formAppDesc.value = app.description || '';
    if (formAppCategory) formAppCategory.value = app.category || 'General';
    if (formAppStatus) formAppStatus.value = app.status || 'active';
    if (formAppOrder) formAppOrder.value = app.order || 1;
    if (formAppIcon) formAppIcon.value = app.icon || 'icons/drafting.png';

    if (iconPresetsGrid) {
      const btns = iconPresetsGrid.querySelectorAll('.preset-icon-btn');
      btns.forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-icon') === app.icon);
      });
    }

    if (typeof addAppModal.showModal === 'function') {
      addAppModal.showModal();
    } else {
      addAppModal.setAttribute('open', '');
    }

    if (formAppName) formAppName.focus();
  }

  /**
   * Remove an application from dashboard
   * @param {string} id 
   * @param {string} name 
   * @param {Event} event 
   */
  function removeApplication(id, name, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (confirm(`Remove "${name}" from the dashboard?`)) {
      applicationsList = applicationsList.filter(app => app.id !== id);
      saveToStorage();
      renderCategoryChips();
      applyFilters();
      showToast(`Removed "${name}" from dashboard`);
    }
  }

  /**
   * Render application cards
   * @param {Array} apps 
   */
  function renderApplications(apps) {
    if (!appsGrid) return;
    appsGrid.innerHTML = '';

    if (apps.length === 0) {
      const emptyNotice = document.createElement('div');
      emptyNotice.className = 'empty-state-notice';
      emptyNotice.textContent = 'No applications found matching your search.';
      appsGrid.appendChild(emptyNotice);
      return;
    }

    const fragment = document.createDocumentFragment();

    apps.forEach(app => {
      const isComingSoon = app.status === 'coming_soon';
      const targetUrl = getAppTargetUrl(app);
      const iconPath = escapeHtml(app.icon || 'icons/generic.svg');
      const appName = escapeHtml(app.name || 'Application');
      const appDesc = escapeHtml(app.description || '');
      const category = app.category ? escapeHtml(app.category) : 'General';
      const catClass = getCategoryClass(category);

      const card = document.createElement('a');
      card.className = `app-card ${isComingSoon ? 'card-coming-soon' : ''}`;
      card.href = isComingSoon ? 'javascript:void(0);' : targetUrl;
      if (!isComingSoon && targetUrl !== '#') {
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
      }
      card.setAttribute('data-id', escapeHtml(app.id || ''));
      card.setAttribute('title', isComingSoon ? `${appName} (Coming Soon)` : `Open ${appName} (${targetUrl})`);

      const statusBadgeHtml = isComingSoon
        ? `<span class="card-status-pill status-coming-soon"><span class="card-status-dot dot-amber" aria-hidden="true"></span> Coming Soon</span>`
        : `<span class="card-status-pill"><span class="card-status-dot" aria-hidden="true"></span> Active</span>`;

      const actionButtonHtml = isComingSoon
        ? `<div class="btn btn-coming-soon" aria-hidden="true">
             <span>Under Development</span>
             <span style="font-size: 0.75rem;">⏳</span>
           </div>`
        : `<div class="btn btn-primary" aria-hidden="true">
             <span>Open Application</span>
             <svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <line x1="5" y1="12" x2="19" y2="12"></line>
               <polyline points="12 5 19 12 12 19"></polyline>
             </svg>
           </div>`;

      card.innerHTML = `
        <div class="card-header-meta">
          <div class="header-meta-left">
            <span class="category-tag ${catClass}">${category}</span>
          </div>
          <div class="header-meta-right">
            ${statusBadgeHtml}
            <button type="button" class="card-action-icon-btn card-edit-btn" title="Edit ${appName}" aria-label="Edit ${appName}">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button type="button" class="card-action-icon-btn card-remove-btn" title="Remove ${appName} from dashboard" aria-label="Remove ${appName}">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div class="app-icon-wrapper">
          <img 
            src="${iconPath}" 
            alt="${appName}" 
            class="app-icon-img" 
            loading="lazy" 
            onerror="this.onerror=null; this.src='icons/generic.svg';"
          >
        </div>

        <h2 class="app-name">${appName}</h2>
        <p class="app-description">${appDesc}</p>

        <div class="card-actions">
          ${actionButtonHtml}
        </div>
      `;

      // Click on Coming Soon card shows informative toast
      if (isComingSoon) {
        card.addEventListener('click', (e) => {
          // If clicked on edit or remove button, do not show toast
          if (e.target.closest('.card-action-icon-btn')) return;
          e.preventDefault();
          showToast(`"${appName}" is currently under development & coming soon!`);
        });
      }

      // Attach Edit click handler
      const editBtn = card.querySelector('.card-edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => openEditModal(app.id, e));
      }

      // Attach Remove click handler
      const removeBtn = card.querySelector('.card-remove-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => removeApplication(app.id, app.name, e));
      }

      fragment.appendChild(card);
    });

    appsGrid.appendChild(fragment);
  }

  /**
   * Filter and sort applications
   */
  function applyFilters() {
    const enabledApps = applicationsList
      .filter(app => app && app.enabled === true)
      .sort((a, b) => {
        const orderA = typeof a.order === 'number' ? a.order : 999;
        const orderB = typeof b.order === 'number' ? b.order : 999;
        return orderA - orderB;
      });

    let filtered = enabledApps;

    if (currentCategory !== 'all') {
      filtered = filtered.filter(app => {
        const cat = app.category ? app.category.trim() : 'General';
        return cat.toLowerCase() === currentCategory.toLowerCase();
      });
    }

    if (searchQuery) {
      filtered = filtered.filter(app => {
        const name = (app.name || '').toLowerCase();
        const desc = (app.description || '').toLowerCase();
        const cat = (app.category || '').toLowerCase();
        return name.includes(searchQuery) || desc.includes(searchQuery) || cat.includes(searchQuery);
      });
    }

    renderApplications(filtered);
    updateStats(filtered.length, enabledApps.length);
  }

  /**
   * Search Input Handler
   */
  function handleSearch() {
    const raw = searchInput ? searchInput.value : '';
    searchQuery = raw.trim().toLowerCase();

    if (clearSearchBtn) {
      clearSearchBtn.hidden = searchQuery.length === 0;
    }

    applyFilters();
  }

  /**
   * Update stats counter text
   */
  function updateStats(showingCount, totalCount) {
    if (!resultsCount) return;
    if (showingCount === totalCount) {
      resultsCount.textContent = `Showing ${totalCount} application${totalCount === 1 ? '' : 's'}`;
    } else {
      resultsCount.textContent = `Showing ${showingCount} of ${totalCount} application${totalCount === 1 ? '' : 's'}`;
    }
  }

  /**
   * Clear Search
   */
  function clearAllFilters() {
    searchQuery = '';
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    if (clearSearchBtn) clearSearchBtn.hidden = true;
    setCategoryFilter('all');
  }

  /**
   * Open Add App Modal
   */
  function openAddModal() {
    if (!addAppModal) return;
    if (modalTitle) modalTitle.textContent = 'Add Application / Website';
    if (formEditingId) formEditingId.value = '';
    if (addAppForm) addAppForm.reset();
    if (formAppStatus) formAppStatus.value = 'active';
    if (formAppOrder) formAppOrder.value = applicationsList.length + 1;
    if (formAppIcon) formAppIcon.value = 'icons/drafting.png';

    if (iconPresetsGrid) {
      const btns = iconPresetsGrid.querySelectorAll('.preset-icon-btn');
      btns.forEach((btn, idx) => btn.classList.toggle('selected', idx === 0));
    }

    if (typeof addAppModal.showModal === 'function') {
      addAppModal.showModal();
    } else {
      addAppModal.setAttribute('open', '');
    }

    if (formAppName) formAppName.focus();
  }

  /**
   * Close Add App Modal
   */
  function closeAddModal() {
    if (!addAppModal) return;
    if (typeof addAppModal.close === 'function') {
      addAppModal.close();
    } else {
      addAppModal.removeAttribute('open');
    }
  }

  /**
   * Form submission to add or edit an application
   * @param {Event} e 
   */
  function handleAddAppSubmit(e) {
    e.preventDefault();

    const editingId = formEditingId ? formEditingId.value : '';
    const name = formAppName ? formAppName.value.trim() : '';
    const path = formAppPath ? formAppPath.value.trim() : '';
    const desc = formAppDesc ? formAppDesc.value.trim() : '';
    const category = formAppCategory ? formAppCategory.value.trim() || 'General' : 'General';
    const status = formAppStatus ? formAppStatus.value : 'active';
    const icon = formAppIcon ? formAppIcon.value : 'icons/generic.svg';
    const portVal = formAppPort && formAppPort.value ? parseInt(formAppPort.value, 10) : null;
    const order = formAppOrder ? parseInt(formAppOrder.value, 10) || (applicationsList.length + 1) : (applicationsList.length + 1);

    if (!name || !desc) {
      showToast('Please fill in Application Name and Description.');
      return;
    }

    if (editingId) {
      // Editing existing application
      const index = applicationsList.findIndex(a => a.id === editingId);
      if (index !== -1) {
        applicationsList[index].name = name;
        applicationsList[index].path = path || '#';
        applicationsList[index].description = desc;
        applicationsList[index].category = category;
        applicationsList[index].status = status;
        applicationsList[index].icon = icon;
        applicationsList[index].order = order;
        if (portVal) {
          applicationsList[index].devPort = portVal;
        } else {
          delete applicationsList[index].devPort;
        }
        showToast(`Updated '${name}' successfully!`);
      }
    } else {
      // Adding new application
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
      if (portVal) {
        newApp.devPort = portVal;
      }
      applicationsList.push(newApp);
      showToast(`Added '${name}' successfully!`);
    }

    saveToStorage();
    renderCategoryChips();
    applyFilters();
    closeAddModal();
  }

  /**
   * Export applications.json configuration
   */
  function exportApplicationsJson() {
    const jsonString = JSON.stringify(applicationsList, null, 2);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonString).catch(() => {});
    }

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'applications.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Downloaded applications.json & copied to clipboard!');
  }

  /**
   * Reset application list to default baseline
   */
  function resetDefaultApplications() {
    if (confirm('Restore default district applications? Any customized or edited apps will be reset.')) {
      localStorage.removeItem(STORAGE_KEY);
      applicationsList = JSON.parse(JSON.stringify(DEFAULT_APPLICATIONS));
      if (resetAppsBtn) resetAppsBtn.hidden = true;
      renderCategoryChips();
      applyFilters();
      showToast('Default applications restored.');
    }
  }

  /**
   * Handle route mode changes
   */
  function handleRouteModeChange() {
    if (routeModeSelect) {
      routeMode = routeModeSelect.value;
      localStorage.setItem(ROUTE_MODE_KEY, routeMode);
      applyFilters();
      showToast(routeMode === 'direct' ? 'Using Direct Port Mode (LAN & Local Full Loading)' : 'Using NGINX Proxy Paths (/path/)');
    }
  }

  /**
   * Setup Event Listeners
   */
  function initEventListeners() {
    if (searchInput) {
      searchInput.addEventListener('input', handleSearch);
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          clearAllFilters();
          searchInput.blur();
        }
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', clearAllFilters);
    }

    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', exportApplicationsJson);
    }

    if (resetAppsBtn) {
      resetAppsBtn.addEventListener('click', resetDefaultApplications);
    }

    if (routeModeSelect) {
      routeModeSelect.value = routeMode;
      routeModeSelect.addEventListener('change', handleRouteModeChange);
    }

    if (openAddModalBtn) {
      openAddModalBtn.addEventListener('click', openAddModal);
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeAddModal);
    }

    if (cancelModalBtn) {
      cancelModalBtn.addEventListener('click', closeAddModal);
    }

    if (addAppForm) {
      addAppForm.addEventListener('submit', handleAddAppSubmit);
    }

    if (iconPresetsGrid) {
      const presetBtns = iconPresetsGrid.querySelectorAll('.preset-icon-btn');
      presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          presetBtns.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          const iconVal = btn.getAttribute('data-icon');
          if (formAppIcon) formAppIcon.value = iconVal;
        });
      });
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

      if (e.key === '/' && !isInput) {
        e.preventDefault();
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      if ((e.key === 'n' || e.key === 'N') && !isInput && !addAppModal.open) {
        e.preventDefault();
        openAddModal();
      }
    });
  }

  function init() {
    updateLiveDate();
    initEventListeners();
    loadApplications();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
