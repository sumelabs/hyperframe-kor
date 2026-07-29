# Korean captions (HyperFrames)

Hangul-first caption example for short-form talking-head video.

This folder packages the Sume Labs Korean caption adaptations on top of upstream HyperFrames:

- **Pretendard Variable** instead of Latin-only Google fonts (no tofu)
- **Canonical ment text** with STT timings only (fix brand / spelling drift)
- **Phrase grouping** so product names and idioms do not split awkwardly  
  (e.g. `포켓 제트` / `들고 다니는데,`, `진짜` / `살 것 같아.`)
- Larger weight-shift cards tuned for 9:16

## Layout

```text
examples/ko-captions/
  components/caption-weight-shift.html   # upstream registry component (patched at render time)
  fixtures/sample-words.json             # example ment + word timings
  fonts/PretendardVariable.woff2         # OFL Hangul font
  render.mjs                             # patch + hyperframes render
  README.md
```

## Quick start

From the monorepo root (after `bun install` / package build as usual):

```bash
# 1) Put your talking-head MP4 here (720×1280 recommended)
cp /path/to/your-talking-head.mp4 examples/ko-captions/source.mp4

# 2) Optional: replace fixtures/sample-words.json with your STT words
#    Keep "ment" as the exact Korean script you want on screen.

# 3) Render
node examples/ko-captions/render.mjs
```

Outputs land in `examples/ko-captions/out/`.

## Ment + STT contract

1. Run STT on the voice track to get word timings.
2. Keep those timestamps.
3. Rewrite word strings to your exact ment (brand spelling, particles, punctuation).
4. Pass phrase groups so Korean compounds stay readable.

See also: [`docs/guides/korean-captions.md`](../../docs/guides/korean-captions.md).

## License notes

- HyperFrames: Apache-2.0 (upstream `heygen-com/hyperframes`)
- Pretendard: SIL Open Font License 1.1 — see `fonts/README.md`
