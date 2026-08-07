# Sonic Design System (Sonic DLS)

An interactive sound design language system (DLS) for a premium car infotainment UI using Tone.js.

## Run Locally

Prerequisites: Node.js

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the app:

   ```bash
   npm run dev
   ```

## Deploy to GitHub Pages

This repo is preconfigured to build correctly for GitHub Pages (Vite `base` set to relative paths).

I added a GitHub Actions workflow that builds the site and deploys the `dist` output to GitHub Pages on pushes to `main`.

If you prefer manual deploys, you can build locally and push the `dist` contents to your Pages branch.
