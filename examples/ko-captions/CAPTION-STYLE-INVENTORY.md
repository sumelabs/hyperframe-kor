# Caption style inventory (hyperframe-kor)

Registry components under `registry/components/caption-*`.

| Style                                          | Word timestamps / karaoke        | Line / phrase feel                                         | Hangul-patchable                         |
| ---------------------------------------------- | -------------------------------- | ---------------------------------------------------------- | ---------------------------------------- |
| `caption-weight-shift`                         | Yes (`caption-data.json`)        | **Strong** — phrase cards, weight handoff                  | Yes (strip Google fonts + `toLowerCase`) |
| `caption-black-outline` _(ko-captions matrix)_ | Yes (weight-shift base)          | **Strong** — same phrase cards, CapCut white+black outline | Yes (built for Hangul)                   |
| `caption-highlight`                            | Yes — per-word red sweep         | **Strong** — group on, karaoke within                      | Yes (strip uppercase + fonts)            |
| `caption-pill-karaoke`                         | Yes — pill karaoke color         | **Strong** — group pills                                   | Yes                                      |
| `caption-clip-wipe`                            | Hardcoded WORDS (matrix injects) | **Strong** — wipe reveal per word in group                 | Yes                                      |
| `caption-editorial-emphasis`                   | Yes                              | **Medium–strong** — block/line slide + emphasis            | Yes (dual font → one Hangul face)        |
| `caption-emoji-pop`                            | Yes                              | Phrase groups + emoji pops                                 | Partial (Latin keyword map)              |
| `caption-neon-accent`                          | Hardcoded                        | Phrase groups + accent colors                              | Yes with inject                          |
| `caption-neon-glow`                            | Hardcoded                        | Group karaoke fill                                         | Yes with inject                          |
| `caption-kinetic-slam`                         | Hardcoded                        | **Weak** — single-word slam                                | Yes with inject                          |
| `caption-particle-burst`                       | Hardcoded                        | Group + keyword bursts                                     | Yes with inject                          |
| `caption-glitch-rgb`                           | Hardcoded                        | Group glitch                                               | Yes with inject                          |
| `caption-gradient-fill`                        | Hardcoded                        | Group gradient karaoke                                     | Yes with inject                          |
| `caption-matrix-decode`                        | Hardcoded                        | Group decode reveal                                        | Latin-leaning glyph scramble             |
| `caption-parallax-layers`                      | Hardcoded                        | Layered line fade                                          | Yes with inject                          |
| `caption-texture`                              | Hardcoded                        | Single-word texture                                        | Yes with inject                          |
| `caption-blend-difference`                     | CSS helper only                  | N/A                                                        | N/A                                      |

## Matrix pick (vs locked weight-shift)

1. **black-outline** — CapCut white fill + thick black outline + soft shadow
2. **highlight** — TikTok/CapCut word highlight
3. **pill-karaoke** — classic karaoke pill
4. **clip-wipe** — clear phrase wipe entrance
5. **editorial-emphasis** — line/block emphasis contrast

Render: `node examples/ko-captions/render-style-matrix.mjs --all --copy-experiment`
