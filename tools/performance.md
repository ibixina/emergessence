# Performance measurements

Measured on October 12, 2026, in the Codex in-app browser at 1280 × 720, device pixel ratio 1, without CPU or network throttling. Baseline scene: commit `efe2582`. Raw results are in `results/baseline.json`, `results/baseline-interactions.json`, and `results/final.json`.

Each of three trials scrolls the full 11,954-pixel notebook forward for six seconds and backward for six seconds. The same instrumentation wraps the real scene methods in both versions, counts layout-dependent reads inside animation callbacks, and samples browser frame intervals. Long Animation Frames are recorded when supported. A separate scenario makes 19 chapter jumps and closes/reopens two research disclosures.

| Measurement | Baseline | Optimized |
| --- | ---: | ---: |
| Mean animation callback, pooled across all trials | 0.720 ms | 0.338 ms |
| Animation callback p95, by trial | 1.4 / 1.3 / 1.2 ms | 1.0 / 1.0 / 1.0 ms |
| Layout-dependent reads during each scroll trial | 6,630 / 7,270 / 7,280 | 0 / 0 / 0 |
| Full layout recalculations in the interaction scenario | 26 | 2 |
| Mean chapter jump call | 1.405 ms | 0.189 ms |
| Artwork transferred, four active raster assets | 4,180,527 bytes | 2,519,328 bytes |

The measured callback reduction is 53.1%. Geometry is cached during layout, widths are applied together before measurement, off-screen planes skip style updates, and connections are redrawn when layout changes. Resize notifications are coalesced; chapter jumps use existing geometry unless a resize is pending. Route projection skips distant paths and no longer allocates arrays per projected point. Animation stops when the document is hidden.

The four active images use lossless WebP encoding. Original PNGs remain available. Every decoded 8-bit RGBA pixel, including transparent RGB values, was compared by SHA-256 and is identical. HTTP response bodies were checked against the encoded files, with `image/webp` MIME types. Encoding used ImageMagick's [lossless and exact options](https://imagemagick.org/webp/):

```sh
magick original.png -define webp:lossless=true -define webp:exact=true -define webp:method=6 -quality 100 optimized.webp
```

## Limits

Warm scrolling was already about 60 fps: frame-interval p95 remains 16.8 ms. These results demonstrate less CPU work and 39.7% less artwork transfer, rather than a higher refresh rate. Payload savings are measured bytes, not an estimate of time saved on a user's connection. Sub-millisecond timings include the identical instrumentation overhead.

The first baseline trial had a roughly one-second frame delay without script attribution; an intermediate optimized run also had it. The final run recorded no long frames or intervals above 25 ms, but this does not establish a reliable cold-render improvement. A `will-change: transform` experiment did not consistently improve these delays and was discarded. Its absence prevents an unproven compositing change from altering drawing sharpness or layer allocation.

## Repeat

Serve the repository root, open `/?benchmark`, and wait approximately 40 seconds for the JSON result. `/?benchmark=interactions` runs only chapter jumps and disclosures. Repeat at the same viewport with the page visible, without other interactions. When comparing scene revisions, keep the scene module URL in `benchmark.js` identical to the import in `site/thoughtspace.js`; differing query versions create separate module instances.

Normal visitors do not load the benchmark or its instrumentation. The camera trajectory, inward motion, opacity curves, handwritten content, and artwork pixels are preserved. Browser checks covered chapter navigation, disclosure layout updates, mobile width and reading pan, and contact/footer reachability.
