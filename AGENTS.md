# Team Triumph repository instructions

## Versioning and changelog
- Every code, UI, content-behaviour or UX change must update the in-app version automatically.
- The single source of truth is `APP_RELEASE` in `search.js`.
- Use semantic versioning:
  - patch for fixes and small polish
  - minor for meaningful functionality, content structure or UX changes
  - major only for deliberate breaking/redesign releases
- Update the release date and keep the release summary short, plain-English and user-facing.
- The current version and latest change must remain visible in the app footer.
- If a service worker/cache version is added later, keep it in sync with the app release where relevant.
- Do not make Adrian ask for a version bump or changelog update each time.

## General
- Keep the hub mobile-first, quick to scan and low-friction.
- Prefer direct destination links over Partner Portal intermediary pages when a safe, stable public destination is available.
- Preserve existing resources unless the requested change explicitly replaces or removes them.
