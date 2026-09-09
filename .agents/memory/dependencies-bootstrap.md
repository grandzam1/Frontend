---
name: Artifact dependency bootstrap
description: New artifact packages may need a workspace install before local typechecking.
---

When a newly created artifact reports missing local type definitions or Vite modules, run the workspace install for that package after the artifact bootstrap completes; the initial lockfile can lag behind the generated package manifest.

**Why:** Artifact creation and dependency installation are asynchronous, so the managed workflow can start before package-local links exist.

**How to apply:** Check the artifact package after creation, install workspace dependencies if its local node_modules is missing, then run the artifact typecheck and managed workflow.