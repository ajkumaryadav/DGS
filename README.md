# District Governance Suite (DGS) Launcher

A lightweight, static web-based application launcher for the District IT Office and District Governance Suite.

---

## How to Run the Launcher Locally

Because the launcher dynamically loads `applications.json`, it must be served via a web server (not opened directly via `file://`).

### Option 1: Python Built-in Server
Open PowerShell or Command Prompt inside the `DGS` folder and run:

```bash
# Use a free port such as 8000 or 9000 (do not use 8080 as Flagship Scheme Monitoring is running on 8080)
python -m http.server 8000
```
Then open your browser at: `http://localhost:8000`

> **Important: Reserved Server Ports**
> Do **NOT** run test servers on port `8080` or any of the following ports actively used by district backend applications and Windows services:
> - `8080`: **Flagship Scheme Monitoring** (Active Windows Service)
> - `3000`: **ACCC** (District Camera Monitoring)
> - `3001`: **ECMS** (Election Counting Management System)
> - `3050`: **Dak Monitoring System** (Postal & Correspondence Monitoring)
> - `3100`: **Office Record Management** (Office Records & Documents)
> - `3333`: **EMS** (Employees Management System)
> - `4000`: **ACCC API Backend**
> - `7000`: **Sampark Application**

### Option 2: Node.js (`npm run dev` or `npx serve`)
```bash
npm run dev
# or: npx serve . -p 8000
```
Then open your browser at: `http://localhost:8000`

### Option 3: Production NGINX
Place the `DGS` folder contents into your NGINX static html directory and serve on standard HTTP port `80`. NGINX will proxy `/flagship/`, `/dak/`, `/records/`, `/accc/`, etc. internally.

---

## How to Add or Remove Applications

### Adding an Application via Web UI
1. Click the **"+ Add Application"** button in the top right header (or press **`N`** on your keyboard).
2. Enter the **Application Name**, **Path/URL** (e.g. `/records/` or `http://localhost:3100`), and **Description**.
3. Choose a category and pick an icon from the built-in preset selector.
4. Click **Save Application**.

### Removing an Application via Web UI
- Hover over any application card and click the **`✕`** icon in the top right corner of the card.
- Confirm the prompt to remove the card from the dashboard.
- To restore original defaults, click **"Reset Defaults"** in the top toolbar.

### Adding an Application by Editing `applications.json`
Open `applications.json` and add a new entry:

```json
{
  "id": "bams",
  "name": "BAMS",
  "path": "/bams/",
  "devPort": 8000,
  "description": "Biometric Attendance Monitoring System",
  "icon": "icons/bams.png",
  "enabled": true,
  "order": 8,
  "category": "Administration"
}
```

Place the corresponding icon (PNG or SVG) into the `icons/` folder. The application card will immediately appear on the dashboard upon refresh.

---

## How to Disable an Application

To hide an application from the launcher without removing its configuration, set `"enabled": false` in `applications.json`:

```json
{
  "id": "sampark",
  "name": "Sampark",
  "path": "/sampark/",
  "description": "Sampark Application",
  "icon": "icons/sampark.png",
  "enabled": false,
  "order": 4
}
```

Disabled applications are automatically excluded from the portal dashboard and search results.

---

## How to Change Application Order

Adjust the numeric value of the `"order"` field in `applications.json`:

```json
{
  "id": "accc",
  "name": "ACCC",
  "order": 1
}
```

Applications are automatically sorted in ascending order (`1`, `2`, `3`, etc.).

---

## How to Change an Application Description or Icon

In `applications.json`, update the `"description"` or `"icon"` fields:

```json
{
  "id": "accc",
  "name": "ACCC",
  "path": "/accc/",
  "description": "Updated description text here",
  "icon": "icons/new-icon.png",
  "enabled": true,
  "order": 1
}
```

If an icon image is missing or fails to load, the launcher will automatically fall back to the generic system icon (`icons/generic.svg`).
