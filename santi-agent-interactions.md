# Santi Agent Interactions

## 2026-06-15 - README and Contributing Documentation

### Topic

Project documentation refresh.

### Prompt Summary

The user asked to rewrite the repository README so it follows common `README.md` standards and to add a `CONTRIBUTING.md` file. The user approved writing both documents in English.

### Full Prompt

> Quiero que me rehagas el readme para que siga los estandares de readme.md y que anadas un contributing.md. Si tienes alguna duda hazmela
>
> Adelante en ingles

### What Was Achieved

- Replaced the previous scaffolding/status-oriented README with a project-oriented README.
- Added setup instructions, prerequisites, scripts, architecture notes, API overview, environment variable reference, testing guidance, and external service notes.
- Added a contributor guide covering workflow, coding standards, Angular and Express conventions, environment setup, tests, PR checklist, and documentation expectations.

### Affected Files

- `README.md`
- `CONTRIBUTING.md`
- `santi-agent-interactions.md`

### Reasoning Notes

The previous README mostly documented historical scaffolding phases and contained outdated paths and implementation status. The new README is structured around common open-source documentation expectations: project purpose, features, stack, setup, configuration, scripts, architecture, API surface, testing, integrations, contributing, and license. The contributor guide mirrors the repository rules from `AGENTS.md` and the actual commands present in the root, client, and server `package.json` files.

## 2026-06-15 - Canonical AI Agent Guide

### Topic

Repository instructions for AI-assisted development.

### Prompt Summary

The user wanted `AGENTS.md` updated with the useful content from `CLAUDE.md`, local skills distributed in the repository, and the development guidance from `CONTRIBUTING.md`, because future contributors are likely to use AI tools. The user decided to remove `CLAUDE.md` and keep `AGENTS.md` as the single source of truth.

### Full Prompt

> Anade o actualiza el agents.md con lo que hay en claude.md y las skills que hay repartidas por el repo. No se si esto esta bien hecho asi. Guiame porfa. Lo que quiero es que quizas lo que hay en el contributing tambien sea util para desarrollo con IA (porque seamos realistaas, todo el mundo que toque esto usara IA)
>
> Yo quitaria claude.md entonces y dejaria solo agents.md

### What Was Achieved

- Replaced the duplicated `AGENTS.md` content with a canonical AI agent operating guide.
- Removed `CLAUDE.md` to avoid maintaining two overlapping instruction files.
- Added explicit references to `README.md`, `CONTRIBUTING.md`, and the local `mongodb-tfg` skill.
- Added agent workflow rules, coding standards, architecture notes, testing guidance, API summary, and a final agent checklist.

### Affected Files

- `AGENTS.md`
- `CLAUDE.md`
- `santi-agent-interactions.md`

### Reasoning Notes

Keeping both `CLAUDE.md` and `AGENTS.md` with near-identical content made future drift likely. A single `AGENTS.md` is clearer for AI tools and maintainers. The new guide keeps repository-specific architecture and command details while incorporating the human development expectations from `CONTRIBUTING.md` in a more operational format for agents.
