# 🐭 Mouse Army - Multiplayer Battle Royale

A fast-paced, real-time multiplayer "Mouse Army" battle game built with **Phaser 3**, **Socket.io**, and **React**. Battle other players, dodge black holes, and use powerful items to become the top mouse on the leaderboard.

## 🚀 Features

- **Real-time Multiplayer**: Powered by Socket.io with interest management (AOI) for high performance.
- **Dynamic World Events**: Survive the core-collapsing **Black Holes** that spawn dynamically.
- **Arsenal of Items**:
  - 💣 **Bombs**: Large area-of-effect damage.
  - ⚡ **Turbo**: Speed boost to chase or escape.
  - 🪝 **Hook**: Pull enemies towards you to stun and strike.
  - 🧲 **Magnets**: Drag all nearby enemies towards your position.
- **Procedural Audio**: Real-time synthesized "Dark Synth" BGM and earthquake rumbles—no audio assets required!
- **Cross-Platform**: Optimized controls for both Desktop (Keyboard) and Mobile (Touch Joystick).

## 🛠 Tech Stack

- **Framework**: Phaser 3 (Engine), React (Lobby/UI).
- **Network**: Socket.io & Express.
- **State Management**: Zustand.
- **Languages**: TypeScript (Strict mode).
- **Server Runtime**: Bun (Optimized for performance).
- **Architecture**: Monorepo using Turborepo.

## 📂 Project Structure

```text
apps/
  ├── client/      # Vite + Phaser 3 Frontend
  └── server/      # Socket.io + Bun Backend
packages/
  └── shared/      # Shared interfaces and game logic
```

## ⚙️ Getting Started

### Prerequisites

- **Bun** (recommended) or **Node.js**.
- **npm** (for workspace management).

### Installation

```bash
# Install dependencies from root
npm install
```

### Running the Game

```bash
# Run both client and server in development mode
npm run dev
```

The client will be available at `http://localhost:5173`.

## 🌐 Deployment

### Environment Variables

#### Client (`apps/client/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_SERVER_URL` | The URL of the production backend server | `http://localhost:3001` |
| `VITE_NODE_ENV` | Environment mode | `development` |

#### Server (`apps/server/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The port the server will listen on | `3001` |
| `NODE_ENV` | Environment mode (`production` or `development`) | `development` |
| `ALLOWED_ORIGIN` | Allowed CORS origin (e.g., your client URL) | `*` |

### Production Build

1. **Build the entire project**:
   ```bash
   npm run build
   ```
   This will run `turbo build`, which compiles the shared package, builds the client dist, and compiles the server TS to JS.

2. **Server Deployment**:
   The server can be run using Bun for maximum performance:
   ```bash
   cd apps/server
   bun dist/network/index.js
   ```

3. **Client Deployment**:
   The client is a static site located in `apps/client/dist`. You can host it on Vercel, Netlify, or any static hosting service.

## 🎮 Controls

### Desktop
- **Mouse**: Directional control.
- **Left Click**: Primary Attack.
- **Space**: Use Selected Item.
- **A / D**: Switch Item.
- **Q**: Use Turbo (Direct shortcut).

### Mobile
- **Left Joystick**: Move and aim.
- **Right Buttons**: Attack, Turbo, Hook, and Item use.

---
*Built with passion for the Mouse Army.*
