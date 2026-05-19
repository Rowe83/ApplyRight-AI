# Workbench JD Templates (Sprint D-3)

**Date:** 2026-05-19  
**Status:** Implemented

## Goals

- Lower friction for first-time users who do not have a JD ready.
- Improve pasted JD readability via normalization.

## Features

1. **Example JD templates** — frontend / fullstack / product samples in `lib/jd-templates.ts`, applied via `JdTemplatePicker`.
2. **Paste normalization** — `normalizeJdText` on clipboard paste and optional「整理格式」button.
3. **Replace guard** — confirm when replacing non-empty JD with a template.

## Out of scope

- User-authored template library
- JD URL scraping
