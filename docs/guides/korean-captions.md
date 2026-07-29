# Korean captions on HyperFrames

Guide for Hangul talking-head captions. Maintained in the **Sume Labs fork** [`sumelabs/hyperframe-kor`](https://github.com/sumelabs/hyperframe-kor) (fork of [`heygen-com/hyperframes`](https://github.com/heygen-com/hyperframes)).

## Why a fork layer?

Upstream caption registry components are excellent, but default demos often:

1. Load **Latin Google fonts** → Hangul tofu
2. Apply `toLowerCase()` / `uppercase` → weird for Korean
3. Split groups on short pauses → tiny cards like `포켓` / `제트` or `살` / `것 같아.`

This fork documents and ships a Korean-first path under `examples/ko-captions/`.

## Recommended stack

| Piece | Choice |
| --- | --- |
| Style | `caption-weight-shift` (registry) |
| Font | CapCut-feeling Hangul matrix under `examples/ko-captions/fonts/` (Pretendard baseline; Do Hyeon / Black Han Sans / Jua / NeoDunggeunmo / Nanum Pen / Gowun Dodum — all OFL) |
| Timing | STT word timestamps |
| On-screen text | Canonical ment (not raw STT strings) |
| Grouping | Phrase plan / sticky idioms |
| Aspect | 9:16 portrait |

Render a single face with `node examples/ko-captions/render.mjs --font do-hyeon`, or the full matrix with `--all`. Outputs go to `examples/ko-captions/out/fonts/<slug>.mp4`.

## Ment vs STT

```text
STT:   프론비 포켓젯을 들고 다니는데 ...
Ment:  프롬비 포켓 제트 들고 다니는데, ...
```

Keep STT `start` / `end`. Rewrite `text`. Merge/split tokens when STT tokenization disagrees (`립밤만`+`한` → `립밤만한`, `포켓젯을` → `포켓`+`제트`).

## Phrase grouping tips

Prefer readable Korean cards:

```text
포켓 제트
들고 다니는데,

진짜
살 것 같아.
```

Avoid:

```text
포켓
제트

진짜 살
것 같아.
```

## Example

See [`examples/ko-captions/`](../../examples/ko-captions/).

## Upstream sync

```bash
git fetch upstream
git merge upstream/main
# re-check examples/ko-captions after registry caption component changes
```
