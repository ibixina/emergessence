# Emergessence

Shishir's portfolio, presented as a connected sketchbook of cognition, brain studies, models, and experiments. Sparse ochre, teal, coral, and dusty blue crayon marks add color beneath the handwriting and fine pen drawings. Scrolling travels forward through the notes and drawings together, with pauses to read each spread.

Serve the repository root with any static HTTP server. For local development:

```sh
python3 -m http.server 5173 --bind 127.0.0.1
```

Open `http://127.0.0.1:5173/`. No build step or package installation is required.

`index.html`, `styles.css`, and `script.js` are the main entry points. `site/` contains the shared styling, drawing modules, depth scene, approved artwork, and licensed local handwriting font. `files/` contains the downloadable resume and CV.

On the cover, “emerge” starts as ordinary handwriting, reveals tiny ants along its strokes, and disperses into a wandering colony over a faint word. One canvas draws at most 420 cached ant sprites at up to 30 updates per second; the buffer is capped at two million pixels. Letter sampling happens once, and animation frames do not read layout or update individual DOM elements. Motion pauses away from the resting cover and in hidden tabs. Reduced motion keeps the ordinary text.

The latent-space spread links a sampled 3D Swiss roll to its two intrinsic coordinates. Path and rotation sliders expose corresponding neighborhoods and changes in projection; the example uses an explicit geometric map. Both views share the same samples, colors, and selected coordinates. It runs locally in SVG without dependencies or automatic animation.

The main site has one design and no comparison toolbar. Old `/designs/` links redirect to the main site and preserve their section anchors. Historical prototypes, artwork provenance, and screenshots remain in `designs/`; the former comparison page is archived at `designs/archive/comparison.html`.

Scrolling moves the scene proportionally to the gesture, with real-time feedback and fractional trackpad input. Every page is a stable resting position: after input stops, a damped pull restores the nearest page to its full reading scale. Each reading spread enlarges its text and drawings together to fill the available viewport width or height, with room for the page controls. Small deviations return to the same page; crossing the midpoint enters the next page's basin. No transition position can remain suspended. Taller pages retain their reading pan without shrinking the content. One motion controller drives the document, camera, and reading pan; flings stay within the neighboring spread, and the page counter provides previous/next controls. Chapter links, research disclosures, keyboard focus, mobile scrolling, and direct section links remain functional. Reduced motion restores a normal scrolling notebook layout. Artwork and font provenance are documented in `designs/art-direction.md` and `site/assets/fonts/README.md`.

Run `node --test tools/scroll-settling.test.mjs` to check the motion controller, gesture boundaries, fractional input, and frame-rate independence. With Playwright and its Chromium browser available, run `node --test tools/scroll-browser.test.mjs` to verify actual rendered movement, trackpad input, mobile swipes, and page controls. The browser suite starts its own local static server. Set `PLAYWRIGHT_MODULE` or `BROWSER_EXECUTABLE` when using an existing installation outside the repository.

Open `http://127.0.0.1:5173/?benchmark` to run the opt-in performance benchmark. It performs three complete scroll journeys and a chapter/disclosure scenario, then displays the measured results. Profiling code only loads with this query parameter. See `tools/performance.md` for recorded comparisons and measurement limits.
