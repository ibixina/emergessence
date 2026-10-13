# Emergessence

Shishir Shrestha's portfolio, presented as a connected sketchbook of cognition, brain studies, models, and experiments. Scrolling travels forward through the notes and drawings together, with pauses to read each spread.

Serve the repository root with any static HTTP server. For local development:

```sh
python3 -m http.server 5173 --bind 127.0.0.1
```

Open `http://127.0.0.1:5173/`. No build step or package installation is required.

`index.html`, `styles.css`, and `script.js` are the main entry points. `site/` contains the shared styling, drawing modules, depth scene, approved artwork, and licensed local handwriting font. `files/` contains the downloadable resume and CV.

The main site has one design and no comparison toolbar. Old `/designs/` links redirect to the main site and preserve their section anchors. Historical prototypes, artwork provenance, and screenshots remain in `designs/`; the former comparison page is archived at `designs/archive/comparison.html`.

Chapter links, research disclosures, keyboard focus, mobile scrolling, and direct section links remain functional. Reduced motion restores a normal scrolling notebook layout. Artwork and font provenance are documented in `designs/art-direction.md` and `site/assets/fonts/README.md`.
