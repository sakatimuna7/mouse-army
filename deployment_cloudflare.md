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

## 2. Setting Wajib (Berdasarkan Screenshot Lu)
Lu harus ganti settingan di dashboard Cloudflare biar bisa baca monorepo Turborepo ini:

| Setting | Nilai Sekarang (Salah) | **Nilai Yang Bener (Wajib)** |
| :--- | :--- | :--- |
| **Root directory** | `/apps/client` | **`/`** (Wajib dikosongin atau isi `/`) |
| **Build command** | `npm run build` | **`npx turbo build --filter=client`** |
| **Build output directory** | `dist` | **`apps/client/dist`** |

> [!IMPORTANT]
> **Kenapa harus ganti Root Directory?** 
> Karena project ini pake Monorepo. Kalo lu set ke `/apps/client`, Cloudflare gak bakal bisa liat file `package-lock.json` yang ada di root dan file shared package kita. Makanya dia error `npm ci`.

## 3. Environment Variables
Pastiin udah nambahin ini juga di Cloudflare:
- `NODE_VERSION`: `22` (pastiin pake versi yang sama kayak lokal)
- `VITE_SERVER_URL`: URL API lu di Railway (misal: `https://mouse-army-production.up.railway.app`)
