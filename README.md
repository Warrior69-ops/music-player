# MELØ Music Player 🎵

A modern, high-performance, full-stack music streaming web application built with **Next.js (Web)** and **NestJS (API)**, featuring an ultra-sleek glassmorphic purple aesthetic, instant song streaming, albums, artists, search autocomplete, playlist management, and keyboard shortcuts.

---

## 🚀 Easiest Ways to Run the Project

You no longer need to open multiple terminals or remember complicated directory paths. Everything can be launched with **1 click** or **1 command** from the project root:

### 🌟 Option 1: 1-Click Launch (Recommended)
Simply **double-click** the file:
```
start.bat
```
*This automatically starts both the NestJS API and the Next.js Web frontend in a single colored window and shows you the local URLs.*

---

### 💻 Option 2: 1-Command from Terminal
Open PowerShell or Command Prompt in the project folder and run:
```bash
npm run dev
```
*(or simply `npm start`)*

This runs both services concurrently with color-coded log prefixes:
- `[API]` (Magenta): NestJS Backend
- `[WEB]` (Cyan): Next.js Frontend

---

### 🪟 Option 3: Separate Terminal Windows
If you want to view the API and Web logs in separate dedicated CMD windows, **double-click**:
```
start-separate-windows.bat
```

---

## 🌐 Local Access URLs

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend Web** | [http://localhost:3000](http://localhost:3000) | Next.js Glassmorphic Web App |
| **Backend API** | [http://localhost:3001](http://localhost:3001) | NestJS Streaming & Metadata REST API |
| **API Health Check** | [http://localhost:3001/music/suggest?q=coldplay](http://localhost:3001/music/suggest?q=coldplay) | Verify YouTube Music stream connection |

---

## 🛠️ Individual Service Commands

If you ever want to run or test a single service individually:

```bash
# Start Backend API only (Port 3001)
npm run dev:api

# Start Frontend Web only (Port 3000)
npm run dev:web

# Build both applications for production
npm run build
```

---

## ⌨️ Keyboard Shortcuts

- **Spacebar**: Toggle Play / Pause anywhere on the site (unless typing in an input field).
- **Arrow Down (↓)**: Select the next suggestion from the search autocomplete dropdown.
- **Arrow Up (↑)**: Select the previous suggestion from the search dropdown.
- **Enter (↵)**: Confirm and search / play the highlighted item.
- **Escape (Esc)**: Close the search suggestions modal.

---

## 📁 Project Structure

```
music-player/
├── start.bat                  # 1-Click launcher (unified window)
├── start-separate-windows.bat # 1-Click launcher (dual separate windows)
├── package.json               # Root monorepo workspace scripts
├── apps/
│   ├── api/                   # NestJS Backend (Port 3001)
│   │   └── src/               # Music streaming, playlists, auth, search
│   └── web/                   # Next.js 15 Frontend (Port 3000)
│       └── src/               # Glassmorphic UI components, player store
└── README.md
```
