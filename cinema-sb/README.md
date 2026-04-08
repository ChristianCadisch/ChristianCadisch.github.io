# Share Preview

This is a standalone web preview that imitates the Cinema SB app feed UI.

## What it does

- Renders a mobile-style feed screen
- Accepts a shared video UID or video URL through query params
- Fetches title and copy from the public Cinema SB metadata API when a Cloudflare Stream UID is present
- Prompts the user to download the app whenever they tap app-like UI controls

## Files

- `index.html`: preview shell and modal
- `styles.css`: app-inspired styling
- `app.js`: query-param parsing, video setup, and CTA modal logic

## Query params

- `v`: Cloudflare Stream UID for the shared video
- `video`: fallback video URL to preview
- `title`: optional fallback title when API lookup is unavailable
- `kicker`: optional small top label
- `meta`: optional fallback neighborhood / secondary line
- `description`: optional fallback caption copy
- `poster`: poster image URL
- `app`: app download URL

## Example

```text
index.html?v=abc123def456ghi789jkl012mno345pq
```

## Notes

- HLS links such as `.m3u8` are handled with `hls.js` when needed.
- The site looks up matching location records from `https://proud-cloud-879dcinema-sb-metadata-api.serafin-065.workers.dev`.
- All `.app-interaction` buttons open the download prompt instead of performing real app actions.
