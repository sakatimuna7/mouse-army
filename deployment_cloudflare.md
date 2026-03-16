# Cloudflare Pages Deployment (Client)

Follow these steps to fix the `@rollup/rollup-linux-x64-gnu` error and deploy your monorepo client successfully.

## 1. The Fix
I have added the following to your `apps/client/package.json`:
```json
"optionalDependencies": {
  "@rollup/rollup-linux-x64-gnu": "4.6.1"
}
```
This forces `npm` to install the Linux-specific binary that Cloudflare needs, even if you are building from a Mac.

## 2. Cloudflare Dashboard Settings
**IMPORTANT**: You MUST configure these settings in your Cloudflare Pages project dashboard:

| Setting | Value |
| :--- | :--- |
| **Framework Preset** | `None` |
| **Build command** | `npx turbo build --filter=client` |
| **Build output directory** | `apps/client/dist` |
| **Root directory** | `/` |

> [!IMPORTANT]
> Change the **Root directory** to `/` (the root of your project) so Cloudflare can see the `packages/shared` workspace and use `turbo`.

## 3. Environment Variables
Add these in the Cloudflare dashboard:
- `NODE_VERSION`: `22`
- `NPM_VERSION`: `10`
- `VITE_SERVER_URL`: `https://your-server-url.railway.app` (Your production server URL)
