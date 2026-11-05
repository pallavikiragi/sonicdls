# Sonic DLS

**A design system for sound.** Sonic DLS gives designers and developers a shared language for how a product sounds, the same way a design system handles color, type and spacing.

Instead of picking audio files one by one, you work with named **sound tokens** such as `ui.button.confirm` or `ui.toggle.on`. Designers create and tune the sounds in the Sonic DLS app. Developers install this package, load the designer's export, and play the tokens on real interactions.

Sounds are **synthesized in the browser** with [Tone.js](https://tonejs.github.io/) (Web Audio API). The package contains no audio files and is under 20 KB.

---

## Table of contents

1. [How it works](#how-it-works)
2. [Quick start](#quick-start)
3. [The token hierarchy](#the-token-hierarchy)
4. [What the exported JSON contains](#what-the-exported-json-contains)
5. [Using tokens in your code](#using-tokens-in-your-code)
6. [API reference](#api-reference)
7. [Notes and troubleshooting](#notes-and-troubleshooting)
8. [License](#license)

---

## How it works

There are two roles and one file passed between them.

| Role | What they do |
|---|---|
| **Designer** | Creates the brand sound and tokens in the Sonic DLS app, then clicks **Export > Export as JSON** |
| **Developer** | Installs this package, adds the exported file to the project, loads it once, and plays tokens on interactions |

```
Designer (Sonic DLS app)          Developer (your project)
────────────────────────          ────────────────────────
Set brand sound                   npm install this package
Create / edit tokens              Add sonic-dls-export.json
Export as JSON  ───────────────▶  sonic.configure(tokens)
                                  sonic.play('ui.button.confirm')
```

When the designer changes a sound, they export a new JSON file and the developer replaces the old one. **No code changes are needed**, because the code only refers to token names.

---

## Quick start

### 1. Install

```bash
npm install @pallavikiragi/sonic-design-system tone
```

`tone` is a peer dependency, so you install it alongside the package. React is optional and not required.

### 2. Get the JSON 

In the Sonic DLS app, choose **Export > Export as JSON**. Add the file to your project, for example `src/sonic-dls-export.json`.

### 3. Load it once, at app start

```ts
import { sonic } from '@pallavikiragi/sonic-design-system';
import tokens from './sonic-dls-export.json';

sonic.configure(tokens);
```

### 4. Play tokens on interactions

```tsx
// Click
<button onClick={() => sonic.play('ui.button.confirm')}>Save</button>

// Toggle
<input
  type="checkbox"
  onChange={(e) => sonic.play(e.target.checked ? 'ui.toggle.on' : 'ui.toggle.off')}
/>
```

Plain JavaScript works the same way:

```js
document.querySelector('#save').addEventListener('click', () => {
  sonic.play('ui.button.confirm');
});
```

If you skip `configure()`, the package plays its built-in default tokens.

> **TypeScript:** importing JSON needs `"resolveJsonModule": true` in your `tsconfig`. If the compiler complains about the JSON's type, use `sonic.configure(tokens as any)`.

---

## The token hierarchy

Every sound is built in three layers. Each layer builds on the one below, which is why changing one brand setting can change every sound at once.

```
  PRIMITIVE      Brand sound       scale, timbre, warmth, decay, reverb ...
      │
      ▼
  SEMANTIC       Meaning           success, error, neutral ... (notes + length + loudness)
      │
      ▼
  COMPONENT      Interaction       ui.button.confirm, ui.toggle.on, nav.arrived ...
```

### Layer 1: Primitive (the brand sound)

The settings that give the whole product its sonic personality. A designer sets these once.

| Setting | What it controls |
|---|---|
| `scale` | The musical scale all notes come from, for example `C4 major pentatonic` |
| `timbre` | The tone color: `sine`, other oscillator types, or a custom sampled sound |
| `decayUnit` | The base length of a sound, in seconds. Every sound length is a multiple of this. |
| `warmth` | How soft or bright the tone is |
| `volumeBase` | The base loudness, in decibels |
| `reverbAmount` | How much room or tail the sound has |
| `attack` | How quickly each note starts, in seconds |

### Layer 2: Semantic (what a sound means)

A semantic layer describes the *feeling* of an outcome, such as success, error or neutral. Each semantic entry defines:

- `degrees`: which notes of the scale are played (this is the melody shape)
- `durMult`: how long it lasts, as a multiple of `decayUnit`
- `volOffset`: how much louder or quieter it is than `volumeBase`

Because semantics sit on top of the primitive layer, the same meaning sounds different in different brands, but it always feels like the same thing (a success always sounds like a success).

### Layer 3: Component (where it is used)

Component tokens are what developers use. Each token is tied to a semantic meaning and to a type of interaction:

```
ui.button.confirm   →  semantic: success   →  interaction: Confirmation
ui.toggle.on        →  semantic: ...       →  interaction: Input
nav.arrived         →  semantic: ...       →  interaction: Navigation
```

Token names follow a `group.element.action` pattern, such as `ui.button.confirm`, `ui.button.cancel`, `ui.toggle.on`, `ui.toggle.off` and `nav.arrived`.

Tokens belong to interaction types such as **Input, Navigation, Confirmation, Error, Alert, Ambient** and **Voice**. Ambient and voice tokens (for example `voice.listening`) can loop, so you stop them yourself with `sonic.stop(token)`.

A token can also carry **overrides**, small adjustments to its semantic defaults (a different note pattern, a different length or volume). Overrides apply to that one token only.

### How a sound is produced

```
play('ui.button.confirm')
  → look up the token and its semantic meaning
  → take the semantic's notes from the brand scale
  → length = decayUnit × durMult
  → volume = volumeBase + volOffset
  → shape the tone with timbre, warmth, attack and reverb
  → play it with Tone.js
```

---

## What the exported JSON contains

The file the designer exports has four parts that mirror the hierarchy:

| Key | Contents |
|---|---|
| `meta` | Export version and light or dark mode |
| `primitive` | The brand settings (layer 1) |
| `semantic` | The semantic definitions (layer 2) |
| `component` | Every token: its semantic, category, interaction types, overrides, and the resolved notes, frequencies, duration and volume (layer 3) |
| `assignments` | The assignments the designer made in the app, readable with `sonic.getAssignments()` |

You normally never edit this file by hand. Treat it as generated output, like a design-token file, and replace it when the designer exports a new one. Custom tokens the designer creates are included, and they appear in `sonic.tokens()`.

---

## Using tokens in your code

### List the available tokens

```ts
console.log(sonic.tokens());
// ['ui.button.confirm', 'ui.button.cancel', 'ui.toggle.on', ...]
```

### Looping sounds

```ts
sonic.play('voice.listening');   // starts a loop
sonic.stop('voice.listening');   // stops that token
sonic.stopAll();                 // stops everything
```

### Change the brand at runtime

```ts
sonic.updateBrand({ warmth: 0.5, volumeBase: -24 });
```

This affects all tokens until the next `configure()` call.

### Playing an unknown token

An unknown token name logs a warning in the console and plays nothing. It never throws, so a typo cannot crash your app.

---

## API reference

| Method | What it does |
|---|---|
| `sonic.configure(json)` | Loads the designer's exported JSON. Call once at startup. |
| `sonic.play(token)` | Plays a token and returns a promise. |
| `sonic.pause(token)` | Pauses a running token. |
| `sonic.stop(token)` | Stops a running token, such as a loop. |
| `sonic.stopAll()` | Stops all sound immediately. |
| `sonic.updateBrand(changes)` | Changes brand settings such as `warmth` or `scale` at runtime. |
| `sonic.tokens()` | Returns the list of token names currently loaded. |
| `sonic.getAssignments()` | Returns the assignments from the exported file. |
| `useSonicDLS()` | Returns the same `sonic` object, for use in React components. |

Exports: `sonic`, `useSonicDLS`, `COMPONENT_DEFS` and `SEMANTIC_DEFS` (the built-in defaults), and the types `SonicExport`, `BrandTokens` and `TimbreToken`.

---

## Notes and troubleshooting

- **No sound on the first try.** Browsers only allow audio after a user interaction. The first `play()` after a click or tap starts the audio engine, so call it from an event handler.
- **Console warning "Unknown token".** The token name is not in the loaded file. Check the spelling against `sonic.tokens()`, and check that `configure()` ran before `play()`.
- **Console warning "does not look like a Sonic DLS export".** The file is not an unmodified export from the Sonic DLS app. Export it again.
- **Sounds differ from the app.** Make sure you replaced the JSON with the latest export and that `configure()` runs once at startup.
- **Server-side rendering (Next.js and similar).** Audio only exists in the browser. Call `configure()` and `play()` on the client, for example inside `useEffect` or an event handler, and add `'use client'` where needed.
- **React Native is not supported yet.** The sound engine uses the Web Audio API, which React Native does not include. For native apps, use **Export > Export as WAV (ZIP)** in the Sonic DLS app and play the files with your platform's audio library.

---

## License

MIT