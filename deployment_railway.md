# 🚂 Deployment Guide: Railway.app (Server)

Follow these steps to fix the `MODULE_NOT_FOUND` error and deploy successfully to Railway.

## 1. Why it failed
In a monorepo, Node.js often fails to resolve `.ts` files from shared packages when running compiled code. I've implemented a **Pure Node.js** fix:
- Build the `shared` package to JavaScript first.
- The server now references the compiled JS version of `@mouse-army/shared`.
- This works natively on Railway without needing Bun or extra loaders.

## 2. Updated Configuration (`railway.json`)
I've updated the `railway.json` in your root directory. It now uses standard Node.js:
- **Build Command**: `npm install && npx turbo build --filter=server`
- **Start Command**: `node apps/server/dist/network/index.js` (Note: the path is now cleaner!)
I've created a `railway.json` file in your root directory. This file is the **Source of Truth** for Railway and will override any manual dashboard settings, making the deployment "Plug and Play."

**What's in the file:**
- **Build Command**: `npm install && npx turbo build --filter=server`
- **Start Command**: `npm start -w server`

## 3. Verify and Push
1. **Push Changes**: Make sure you have committed and pushed the `railway.json` and the updated `apps/server/package.json` to your GitHub.
2. **Dashboard**: In the Railway dashboard, go to your service → **Settings**. 
   - Ensure the **Root Directory** is set to `/`.
   - If there is a "Custom Start Command" manually typed in the dashboard, **DELETE IT** so it uses the one in `railway.json`.

## 4. Environment Variables
Make sure these are added in the **Variables** tab:

| Variable | Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `PORT` | `3001` (or whatever Railway assigns automatically) |
| `ALLOWED_ORIGIN` | `*` |

## 4. How it works now
1. Railway runs the **Build Command** from the root.
2. `turbo build` compiles the `shared` package and then the `server`.
3. Because of my changes, the server file is now at: `apps/server/dist/apps/server/network/index.js`.
4. The **Start Command** (`npm start -w server`) tells npm to run the `start` script inside `apps/server`, which I've already updated to point to the correct path.

## 5. Deployment
- Push the changes I just made to your repository.
- Railway should trigger a re-deploy automatically.

> [!TIP]
> Using `npm start -w server` is the cleanest way to run a workspace command from the root of a monorepo.
