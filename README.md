# moezusb.github.io

Personal site of Mohamed Bah: operations and applied AI.

**Live:** [moezusb.github.io](https://moezusb.github.io)

Built with Vite and TypeScript, with no UI framework. The background is a WebGL shader (`src/aurora.ts`) that renders at half resolution, pauses in hidden tabs, and holds still for visitors who prefer reduced motion. Fonts (Newsreader and Geist) are self-hosted.

## Develop

```bash
npm install
npm run dev      # local server with hot reload
npm run build    # type-check and build to dist/
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes `dist/` to GitHub Pages. In the repository settings, Pages must use **GitHub Actions** as its source.
