# intigriti-asset-copier

Tampermonkey userscript that extracts all assets from an Intigriti program page and copies them to the clipboard in one click — no more manually selecting assets one by one.

## How it works

Intigriti's program pages are rendered by an Angular SPA. The script:

1. Injects a floating **"Copy Assets"** button into the page after Angular finishes rendering
2. On click, polls the DOM for `lib-asset-detail` components (up to 10s timeout)
3. Reads `.asset-name span / a`, `.tier .copy`, and `.type .copy` from each component
4. Classifies assets as **in-scope** (any tier) or **out-of-scope** (tier label contains `"out of scope"`)
5. Opens a modal with the result and copies the selected export format to the clipboard via `GM_setClipboard`

The script also listens for SPA navigation via `MutationObserver` on `document.body`, so the button re-injects automatically when you navigate between programs.

## Output formats

Use the modal selector to choose the export format. The script remembers your last choice with `GM_setValue` / `GM_getValue`.

### Plain text

```
## IN SCOPE ##
*.twistys.com
*.brazzers.com
*.mofos.com
probiller.twistys.com
probiller.brazzers.com

## OUT OF SCOPE ##
*.contentabc.com
*.adtng.com
babeslivecams.com
```

### JSON

```json
{
  "inScope": [
    {
      "name": "*.twistys.com",
      "type": "Wildcard",
      "tier": "Tier 2"
    }
  ],
  "outOfScope": []
}
```

### CSV

```csv
name,type,tier,scope
*.twistys.com,Wildcard,Tier 2,in-scope
```

## Installation

**Requirements:** [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, Safari)

**Option A — direct install**
1. Open Tampermonkey Dashboard → **Create new script**
2. Paste the contents of [`intigriti-asset-copier.user.js`](./intigriti-asset-copier.user.js)
3. Save (`Ctrl+S`)

**Option B — via raw URL** *(after pushing to GitHub)*
Navigate to the raw URL of the `.user.js` file — Tampermonkey will detect it and prompt for installation automatically.

## Permissions used

| Grant | Reason |
|---|---|
| `GM_setClipboard` | Write extracted assets to system clipboard |
| `GM_addStyle` | Inject button/modal CSS without polluting the page's own styles |
| `GM_getValue` / `GM_setValue` | Remember the last selected export format |

## Matched URLs

```
https://app.intigriti.com/programs/*
https://app.intigriti.com/researcher/programs/*
```

## Caveats

- If the Intigriti team changes Angular component names or CSS class names, the selectors will break. The relevant selectors are in `waitForAssets()`, `extractAssetName()`, `isOOS()`, `getTier()`, and `getType()`.
- The script waits 1.5s after page load and 1.2s after SPA navigation before injecting the button. These delays exist to give Angular time to render. They may need adjustment if the page is slow.
- Groups (e.g. `lib-asset-group-detail`) are fully expanded by default in the DOM even when visually collapsed, so all child assets are captured correctly.

## Contributing

Issues and PRs are welcome. See open issues for ideas tagged [`good first issue`](../../issues?q=label%3A%22good+first+issue%22).
