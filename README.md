# judy's wishlist

a small react wishlist with clean type, real gift images, and a subtle glass action. it works on mobile and desktop.

## run locally

```sh
npm install
npm run dev
```

the development server uses port 4174. use a current node lts release.

## build and check

```sh
npm test
npm run build
npm run test:sites
```

static website files are in `dist/client`. they work at a domain root or inside a subdirectory such as `/wishlist/`. the preserved prototype build also produces a worker in `dist/server` for optional sites hosting.

## using the wishlist

* browse or search the collection, or select a category.
* open a wish to view its note and shop links.
* mark a wish as claimed or undo it. claims are just for fun, saved in this browser only. they do not make purchases or reserve gifts for other visitors.
* add, edit, favorite, or delete wishes. a deletion can be undone from the notification.
* export a json backup. import validates the file before applying it and preserves existing wishes not present in the import.

all changes stay on the current browser and origin. clearing site data removes local changes. moving between the standalone domain and a portfolio subdirectory uses separate browser storage, so export/import is the way to carry changes across.

## publishing your collection

the published starting collection lives in `src/content/wishes.json`. it contains judy's three requested additions and the fifteen gifts she selected from zara's wishlist. exact sizes, models, and current prices should be chosen when purchasing; no price has been invented.

to publish changes made in the browser:

1. select export.
2. replace `src/content/wishes.json` with that exported json file. the application supports both its versioned export format and the initial array format.
3. review any notes and reset personal `claimed` or `favorite` flags if they should not be the default for new visitors.
4. build and publish `dist/client` using your chosen static host.

this is a local editing workflow, not an authenticated remote content manager. visitors' edits never modify the published seed.

image paths inside the repository use `/gifts/filename`; the app adds the correct deployment base automatically. remote image and shop links must use http or https. asset references are documented in [asset sources](ASSET_SOURCES.md).

## project structure

* `src/App.jsx`: collection, dialogs, editing, and local state.
* `src/styles.css`: typography, spacing, responsive layouts, and glass button behavior.
* `src/wishes.js`: import validation and data helpers.
* `src/content/wishes.json`: the published collection.
* `public/gifts`: image assets.

the experience references [zara's wishlist](https://wishlist.zarazhang.com/) and uses a restrained visual system inspired by [michelle liu](https://www.liumichelle.com/design-system).
