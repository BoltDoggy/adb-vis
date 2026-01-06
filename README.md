# Electrobun Starter

An opinionated starter template for building desktop applications with [Electrobun](https://electrobun.dev/).

## What's Included

- **React 19** with TypeScript for the webview UI
- **Vite 6** for fast development builds
- **Tailwind CSS 4** for styling
- **shadcn/ui** pre-configured (New York style, neutral base)
- **Biome** for linting and formatting
- **Type-safe RPC** between main process and webview via shared schema
- **Bun** as the runtime and package manager
- Basic application menu setup
- Post-build script for Vite integration with Electrobun

## Getting Started

```bash
bun install
bun run dev
```

## Project Structure

```
main/           # Bun main process
webview/        # React webview UI
shared/         # Shared types (RPC schema)
scripts/        # Build scripts
assets/         # Static assets
```
