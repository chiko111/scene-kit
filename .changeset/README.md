# Changesets

Run `npm run changeset` for every change that should be released, pick the bump
(patch / minor / major) and describe it. The release workflow turns them into a
"Version Packages" PR; merging that PR publishes to npm.

All `@chiko111/scene-kit-*` packages are versioned together (`fixed`), so the schema,
renderers and editor always match.
