# 🚀 Deployment Guide: Render.com (Server)

Follow these steps to deploy your Mouse Army server to Render.

## 1. Prepare your Repository
Ensure your latest changes are pushed to GitHub or GitLab, as Render connects directly to your git provider.

## 2. Create a New Web Service
1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.

## 3. Configure Service Settings
Use the following settings during the setup process:

- **Name**: `mouse-army-server` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose the one closest to your players (e.g., Singapore for Asia).
- **Branch**: `main`
- **Root Directory**: Leave blank (we will run from the root of the monorepo).
- **Build Command**: `npm install && npx turbo build --filter=server`
- **Start Command**: `node apps/server/dist/network/index.js`

> [!NOTE]
> We build the entire project (filtering for server) because the server depends on the `@mouse-army/shared` package being compiled to JavaScript.

## 4. Set Environment Variables
Click on the **Advanced** button or go to the **Env Vars** tab after creation:

| Key | Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` (Render's default, or leave empty if using default) |
| `ALLOWED_ORIGIN` | `*` (or your client's production URL later) |

> [!IMPORTANT]
> Render will automatically assign a `PORT` environment variable. Your server code already respects this, so ensure you don't hardcode it to `3001` in production.

## 5. Deploy
1. Click **Create Web Service**.
2. Render will start the build process. You can monitor the logs in the dashboard.
3. Once the build is finished and the status is **Live**, your server is up!

## 6. Update Client (Future Step)
Once your server is live, Render will give you a URL (e.g., `https://mouse-army-server.onrender.com`). You will need to use this as the `VITE_SERVER_URL` when you deploy your client.
