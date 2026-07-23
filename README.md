# Tempo

A sprint-based Gantt scheduler for Stock & Connected Enterprise planning — a desktop app for visualizing and managing project timelines, built with Electron.

## Features

- **Sprint-based planning** — Organize work by 2-week and 3-week sprints
- **Gantt visualization** — Clean read-only and editable timeline views
- **Task management** — Create, edit, and link tasks with story points
- **Automatic scheduling** — Chain tasks sequentially by story points
- **Parallel execution** — Mark tasks to run concurrently (⚡ Auto-schedule)
- **Capacity planning** — Configure developer capacity and sprint duration
- **Quarter markers** — Built-in Stock calendar (S259–S288) with quarter dividers
- **Wiki export** — Generate HTML fragments for Confluence documentation
- **Milestone support** — Track important dates alongside working day calculations
- **Weekend handling** — Automatic adjustment for calendar weekends

## Installation

Download the latest `Tempo.zip` from [Releases](https://github.com/ColmMcKeon/Tempo/releases) or build from source.

## Development

```bash
npm install
npm start
npm run build  # Create production bundle
```

## Project Data

Projects are stored as JSON in the `data/` folder. Default project: `connected-enterprise.json` (65 points, S277–S285).

---

Plan smarter, schedule faster. Built for enterprise timeline management.
