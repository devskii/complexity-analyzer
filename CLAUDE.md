# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Code extension that computes cyclomatic complexity of JS/TS functions and highlights those with high complexity (>=9) as warnings. Published under the name "Complexity Analyzer (JS/TS)".

## Build & Development Commands

- `npm run compile` — compile TypeScript to `out/`
- `npm run watch` — compile in watch mode
- `npm run publish` — package into a `.vsix` file for installation
- No tests are configured yet (`npm test` is a no-op stub)

To test the extension: compile, then install the `.vsix` in VS Code/Cursor via "Extensions: Install from VSIX" command palette action.

## Architecture

Two source files in `src/`, compiled to `out/`:

- **`extension.ts`** — Extension entry point (`activate`/`deactivate`). Registers CodeLens providers for JS/TS/JSX/TSX and listens for editor/document changes to run analysis. Contains all core logic: `analyzeCyclomaticComplexity` parses source with the TypeScript compiler API (`ts.createSourceFile`), walks the AST to find function nodes, and calls `computeCyclomaticComplexity` which counts branching constructs (if, for, while, switch, case, catch, ternary, `&&`, `||`, `?.`, `??`). Functions with complexity >=9 produce a `DiagnosticSeverity.Warning`.

- **`ComplexityCodeLensProvider.ts`** — Reads from the shared `DiagnosticCollection` and displays a summary CodeLens at the top of the file (count of complex functions detected).

The extension uses the TypeScript compiler API directly (not ESLint or a separate parser) for AST analysis.
