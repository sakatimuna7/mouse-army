# 🚂 Deployment Guide: Railway.app (Server)

Follow these steps to fix the `MODULE_NOT_FOUND` error and deploy successfully to Railway.

## 1. Why it failed
In a monorepo, TypeScript often creates a nested `dist/apps/server/...` structure instead of putting everything directly in `dist/`. I've updated your `tsconfig.json` to make this structure **predictable**.

## 2. Railway Settings
Go to your service settings in [Railway](https://railway.app/) and update these fields:

- **Root Directory**: `/` (Must be the root of the project)
- **Build Command**: `npm install && npx turbo build --filter=server`
- **Start Command**: `npm start -w server`

## 3. Environment Variables
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
