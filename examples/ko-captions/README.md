# Korean captions (HyperFrames)

Hangul-first caption example for short-form talking-head video.

This folder packages the Sume Labs Korean caption adaptations on top of upstream HyperFrames:

- **CapCut-feeling Hangul font matrix** (OFL / free redistributable only)
- **Canonical ment text** with STT timings only (fix brand / spelling drift)
- **Phrase grouping** so product names and idioms do not split awkwardly  
  (e.g. `포켓 제트` / `들고 다니는데,`, `진짜` / `살 것 같아.`)
- Larger weight-shift cards tuned for 9:16

## Layout

```text
examples/ko-captions/
  components/caption-weight-shift.html   # upstream registry component (patched at render time)
  fixtures/sample-words.json             # example ment + word timings
  fonts/                                 # Pretendard + CapCut-vibe Hangul families (OFL)
  render.mjs                             # weight-shift × font matrix
  render-style-matrix.mjs                # style × font matrix (black-outline, highlight, …)
  CAPTION-STYLE-INVENTORY.md             # which registry styles are karaoke / line-by-line
  README.md
```

## Font matrix

| Slug             | Family              | CapCut vibe           |
| ---------------- | ------------------- | --------------------- |
| `pretendard`     | Pretendard Variable | Clean baseline        |
| `do-hyeon`       | Do Hyeon            | Thick rounded classic |
| `black-han-sans` | Black Han Sans      | Impact / slam         |
| `jua`            | Jua                 | Soft cute rounded     |
| `dunggeunmo`     | NeoDunggeunmo       | Pixel / retro         |
| `nanum-pen`      | Nanum Pen Script    | Handwritten           |
| `gowun-dodum`    | Gowun Dodum         | Soft editorial        |

See [`fonts/README.md`](./fonts/README.md) for upstream URLs and OFL notes.

## Quick start

From the monorepo root (after `bun install` and enough package build for the CLI):

```bash
# Build CLI if packages/cli/dist/cli.js is missing
bun run --filter '@hyperframes/{parsers,lint,studio-server}' build
bun run --filter @hyperframes/core build
bun run --filter '@hyperframes/{engine,producer,player,studio,shader-transitions}' build
bun run --filter @hyperframes/cli build

# 1) Put your talking-head MP4 here (720×1280 recommended)
cp /path/to/your-talking-head.mp4 examples/ko-captions/source.mp4

# 2) Optional: replace fixtures/sample-words.json with your STT words
#    Keep "ment" as the exact Korean script you want on screen.

# 3) Render one font (default: pretendard)
node examples/ko-captions/render.mjs
node examples/ko-captions/render.mjs --font do-hyeon

# 4) Or render the full CapCut-feeling matrix
node examples/ko-captions/render.mjs --all
node examples/ko-captions/render.mjs --list
```

Outputs:

- Per-font: `examples/ko-captions/out/fonts/<slug>.mp4`
- Legacy convenience copy for Pretendard: `examples/ko-captions/out/ko-weight-shift.mp4`

`source.mp4`, `.project*/`, and `out/` are gitignored — keep renders local.

## Style × font matrix

Compare CapCut-ish animations beyond weight-shift (phrase plan + ment preserved):

| Style                | Feel                                                            |
| -------------------- | --------------------------------------------------------------- |
| `black-outline`      | White fill + thick black outline + soft shadow (CapCut classic) |
| `highlight`          | TikTok red word sweep on phrase cards                           |
| `pill-karaoke`       | Pill karaoke                                                    |
| `clip-wipe`          | Phrase wipe reveal                                              |
| `editorial-emphasis` | Line/block emphasis                                             |

```bash
# CapCut outline fonts first
node examples/ko-captions/render-style-matrix.mjs --priority --copy-experiment

# Full default matrix (~15)
node examples/ko-captions/render-style-matrix.mjs --all --copy-experiment --skip-existing

node examples/ko-captions/render-style-matrix.mjs --style black-outline --font jua
node examples/ko-captions/render-style-matrix.mjs --list
```

Outputs: `examples/ko-captions/out/matrix/<style>--<font>.mp4`

Local review gallery (experiment tmp, not in this repo):

`sume-com/tmp/fal-replay-9a5dc677/reels-org-v6-v3calm/hf-captions/review/index.html`

```bash
cd …/hf-captions && python3 -m http.server 8765
# → http://127.0.0.1:8765/review/
```

See [`CAPTION-STYLE-INVENTORY.md`](./CAPTION-STYLE-INVENTORY.md) for the full registry inventory.

## Ment + STT contract

1. Run STT on the voice track to get word timings.
2. Keep those timestamps.
3. Rewrite word strings to your exact ment (brand spelling, particles, punctuation).
4. Pass phrase groups so Korean compounds stay readable.

See also: [`docs/guides/korean-captions.md`](../../docs/guides/korean-captions.md).

## License notes

- HyperFrames: Apache-2.0 (upstream `heygen-com/hyperframes`)
- Bundled fonts: SIL Open Font License 1.1 — see `fonts/*/OFL.txt` and `fonts/README.md`
