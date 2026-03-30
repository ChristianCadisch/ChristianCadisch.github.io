# Share Preview

This is a standalone web preview that imitates the Cinema SB app feed UI.

## What it does

- Renders a mobile-style feed screen
- Accepts a shared video URL and metadata through query params
- Prompts the user to download the app whenever they tap app-like UI controls

## Files

- `index.html`: preview shell and modal
- `styles.css`: app-inspired styling
- `app.js`: query-param parsing, video setup, and CTA modal logic

## Query params

- `video`: video URL to preview
- `title`: main title text
- `kicker`: small top label
- `meta`: neighborhood / secondary line
- `description`: caption copy
- `poster`: poster image URL
- `app`: app download URL

## Example

```text
index.html?video=https://videodelivery.net/abc123/manifest/video.m3u8&title=Sunset%20Walk&meta=West%20Village&description=Watch%20the%20preview%20and%20download%20the%20app.&app=https://exampleapp.com
```

## Notes

- HLS links such as `.m3u8` are handled with `hls.js` when needed.
- All `.app-interaction` buttons open the download prompt instead of performing real app actions.
