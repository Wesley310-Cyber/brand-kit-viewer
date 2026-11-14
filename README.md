# Brand Kit Viewer

An internal page for looking at every brand kit palette while working: Cover Flow, Sphere and Grid views, click-to-copy hex codes, and links to each kit's Notion page and Claude Design system.

## How it works

- `public/index.html` is the whole page.
- `netlify/functions/kits.mts` is the small API behind it (`/api/kits`). It keeps the kits in Netlify Blobs, so they survive every redeploy.
- `src/seed.mts` holds the kits the site starts with. It is copied into storage once, on the first visit. After that, storage is the record.

## Adding a kit

Use the **Add kit** button on the page. No code change and no redeploy. Adding, editing and deleting ask for the edit passcode once per browser.

## Setup on Netlify

1. Import this repo as a new Netlify project. Publish directory `public`, no build command (both are already in `netlify.toml`).
2. Add an environment variable `EDIT_PASSCODE` (scope: Functions) with the passcode, then redeploy.

## Changing the viewer

Push to `main`. Netlify redeploys automatically. The kits are not touched.
