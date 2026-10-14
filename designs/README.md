# Archived design studies

Thoughtspace is now the main portfolio at `/`. The former `/designs/` entry redirects there. The comparison prototype is retained at `archive/comparison.html`; shared production code and approved assets are in `../site/`.

# Emergessence design studies

Three local portfolio directions: Neuron, Sketchbook, and Thoughtspace. Interference and Refraction have been retired from the comparison.

From the repository root, run:

```sh
python3 -m http.server 5173 --bind 127.0.0.1
```

Open `http://127.0.0.1:5173/designs/archive/comparison.html?design=axon` to inspect the archived comparison.

- **Neuron:** the camera advances only along the depth axis. The approved ink artwork occupies tilted, curved surfaces in a spatial network, with connecting axons projected toward one stable vanishing point. Native WebGL renders perspective and clips branches as they pass the viewer. Scroll remains native and all portfolio content is ordinary HTML. A still illustration is available when WebGL is unavailable. Reduced motion keeps the viewpoint still and disables text scrambling.
- **Cipher typography:** the original site's symbol alphabet reappears on the name, brand, and section headings. Letters resolve on entry and replay on hover; the name also supports click and keyboard activation. Character widths and accessible names remain stable during decoding.
- **Sketchbook:** connected working pages built around weighted inputs, associative recall, prediction loops, and illustrated project notes. All active drawings are native SVG, including correctly plotted tanh, ReLU, and sigmoid curves. Generated collage artwork has been removed from the live design. The pages use tighter spacing, short handwritten annotations, and links between related studies and experiments. The cover has a pressure-sensitive pencil tool, undo, and Escape to finish; marks stay in the current browser session. Research disclosures and the original project and contact links remain functional.

**Thoughtspace** (`?design=thoughtspace`) is a continuous notebook traveled in depth. The camera advances through the actual HTML spreads, rather than leaving the content to scroll in front of a decorative scene. Each spread contains its notes, diagrams, captions, arrows, and working links on the same plane. Connected ink routes join the drawings during travel. Only one spread has full emphasis at a reading stop; distant spreads disappear and the camera pauses long enough to read. Tall spreads pan through their contents before the journey continues. There are no opaque reading panels or white section veils.

Chapter links, deep links, native wheel/touch scrolling, keyboard focus, and research disclosures are supported. Resizing recalculates the scene and retains progress within the current spread. Reduced motion returns all the content to its normal document layout.

The artwork includes loose, unshaded lateral, dorsal, and medial pen studies of the brain and large branching neurons. No people or faces appear in Thoughtspace. Probabilistic modeling shows a prior, likelihood, and analytically calculated Gaussian posterior. The latent-space spread links a sampled 3D Swiss roll with its two intrinsic coordinates; path and rotation sliders reveal matching neighborhoods and projection effects. The wordmark decodes on entry, hover, and focus. Both earlier directions remain available.

There are no third-party JavaScript dependencies, package installation, build steps, or hosted project services. The original site is preserved in Git history. These designs use the existing content, repository links, email address, and PDF files.

Artwork provenance and generation prompts are recorded in `art-direction.md`. Previous image assets and screenshots are retained for reference.

Sketchbook uses a locally served Reenie Beanie font for its loose ballpoint lettering. All text uses the regular font weight, with synthetic bolding disabled. The font source and license are recorded in `../site/assets/fonts/README.md`.
