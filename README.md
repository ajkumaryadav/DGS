# District Governance Suite (DGS) — Portal Launcher & Service Manager

A high-performance, unified application portal, workspace manager, and Windows Service controller built for the District IT Office, Khairthal-Tijara.

---

## 🚀 Key Features

### 1. Dual Port 80 & Port 8000 Automatic Listener
- **Port 80 (Standard HTTP)**: Allows immediate access via `http://localhost/` or `http://<IP>/` without needing to type a port number.
- **Port 8000**: Secondary / direct management port (`http://localhost:8000/`).

### 2. Embedded In-App Frame Workspace
- Clicking any application opens it inside a fullscreen, embedded **In-App Frame** within the DGS dashboard.
- Includes Top Control Bar with **Reload**, **Open in New Tab**, **Toggle Fullscreen**, and **Close**.
- Switchable mode toggle in toolbar: **"In-App Frame"** (default) vs **"New Tab"**.

### 3. Role-Based Multi-User Admin & Authentication
- **Default Master Administrator**:
  - **User ID**: `admin`
  - **Password**: `dgs@admin2026`
- **User Management**:
  - Add new users (Super Administrator, Administrator, Operator).
  - Edit full names, roles, and reset passwords.
  - Delete operators/admins (protects the master superadmin).
- **Protected Operations**: Adding/editing apps, deleting apps, starting/stopping/restarting services, and managing users require admin login.

### 4. Direct Disk Persistence for Applications (`applications.json`)
- All added apps, edits, reordering, and deletions are saved directly to `applications.json` on disk via `/api/applications`.
- Changes persist across PC reboots, browser cache resets, localhost, and LAN connections.

### 5. Automatic 24/7 Windows Service Startup on PC Boot
- **`install-dgs-launcher-service.bat`**: Installs DGS Launcher (`server.js`) as an automatic Windows Service with NSSM that boots on PC startup.
- **`setup-autostart-all-services.bat`**: Configures all district services (`bams`, `DakMonitoring`, `DistrictFlagshipMonitoring`, `ACCC-WEB`, `ACCC-API`, `SamparkWeb`, `SamparkAPI`, `tcms`, `DGS-Nginx`, `DGS-Launcher-Server`) to start automatically (`start= auto`) and grants full Start/Stop permissions.
- **`grant-service-permissions.bat`**: Grants service permissions to authenticated users to prevent UAC errors when controlling services from the web portal.

---

## 🛠️ Quick Commands

```bash
# Start directly in dev/test mode:
npm run dev
# or: node server.js

# Install DGS Launcher as an Automatic Windows Service:
install-dgs-launcher-service.bat (Right-click -> Run as Administrator)

# Configure all district services to Auto-Start on boot:
setup-autostart-all-services.bat (Right-click -> Run as Administrator)
```

---

## 🌐 URLs & Ports
- **Standard Portal**: [http://localhost/](http://localhost/) or [http://127.0.0.1/](http://127.0.0.1/)
- **Direct Port**: [http://localhost:8000/](http://localhost:8000/)
- **LAN Access**: `http://<YOUR_IP>/` (e.g. `http://10.70.12.73/`)
