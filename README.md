# Sonic Design System

Sonic Design System is an interactive React UI for exploring and previewing a sound design language system. The project can be run as a website or installed as a React component package.

## Use as a React package

Install the package and its React peer dependencies:

```bash
npm install @pallavikiragi/sonic-design-system react react-dom
```

Import the component and its stylesheet in your app:

```tsx
import { SonicDesignSystem } from '@pallavikiragi/sonic-design-system';
import '@pallavikiragi/sonic-design-system/style.css';

function App() {
  return <SonicDesignSystem />;
}
```

The package requires a browser environment. Audio playback uses the Web Audio API and may need to be started by a user gesture.

## Build and publish the package

```bash
npm run build:package
npm pack --dry-run
npm login
npm publish
```

`npm publish` publishes this scoped package publicly. A new version is required for each subsequent release.

## Run the website locally

```bash
npm install
npm run dev
```

Build the website with `npm run build`.
