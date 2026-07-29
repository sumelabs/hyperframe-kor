#!/usr/bin/env node
/**
 * Korean caption style × font matrix for sumelabs/hyperframe-kor.
 *
 * Styles contrast with locked weight-shift, prioritizing phrase/line reveals
 * plus CapCut white-fill + thick black outline (`black-outline`).
 *
 * Usage:
 *   node render-style-matrix.mjs --list
 *   node render-style-matrix.mjs --style black-outline --font do-hyeon
 *   node render-style-matrix.mjs --priority   # black-outline CapCut fonts first
 *   node render-style-matrix.mjs --all
 *   node render-style-matrix.mjs --all --copy-experiment
 */
import { execFile } from "node:child_process";
import {
  copyFile,
  mkdir,
  readFile,
  writeFile,
  rm,
  access,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "../..");
const OUT_DIR = join(here, "out/matrix");
const SRC = join(here, "source.mp4");
const WORDS_PATH = join(here, "fixtures/sample-words.json");
const REGISTRY = join(REPO, "registry/components");
const WEIGHT_SHIFT = join(here, "components/caption-weight-shift.html");

const DESIGN_SAFE_HEIGHT = 380;
const DESIGN_SAFE_BOTTOM = 72;
const MAX_WORDS_PER_GROUP = 7;
const PAUSE_THRESHOLD = 0.45;

const EXPERIMENT_ROOT = join(
  REPO,
  "../sume-com/tmp/fal-replay-9a5dc677/reels-org-v6-v3calm/hf-captions",
);
const BGM = join(
  REPO,
  "../sume-com/tmp/fal-replay-9a5dc677/bgm-variants/tracks/day-bright-pop.mp3",
);

/** Locked phrase plan (same as render.mjs). */
const PHRASE_PLAN = [
  ["요즘", "바깥", "나가면", "진짜"],
  ["숨이", "턱", "막히지", "않아?"],
  ["땀", "나고,", "머리", "뜨겁고,"],
  ["기분까지", "예민해지잖아."],
  ["그래서", "내가", "프롬비"],
  ["포켓", "제트", "들고", "다니는데,"],
  ["이게", "생각보다", "완전", "달라."],
  ["립밤만한", "크기인데", "바람은", "세고,"],
  ["가방에", "넣어도", "짐이", "안", "돼."],
  ["더울", "때", "얼굴에", "대고", "있으면"],
  ["진짜", "살", "것", "같아."],
  ["올여름엔", "프롬비가", "내", "필수템이야."],
];

/**
 * Longer one-liners for CapCut black-outline (merged phrases).
 * Keep product name / idiom sticky; do not auto-shrink per card.
 */
const BLACK_OUTLINE_PHRASE_PLAN = [
  ["요즘", "바깥", "나가면", "진짜", "숨이", "턱", "막히지", "않아?"],
  ["땀", "나고,", "머리", "뜨겁고,", "기분까지", "예민해지잖아."],
  ["그래서", "내가", "프롬비", "포켓", "제트", "들고", "다니는데,"],
  ["이게", "생각보다", "완전", "달라."],
  ["립밤만한", "크기인데", "바람은", "세고,", "가방에", "넣어도", "짐이", "안", "돼."],
  ["더울", "때", "얼굴에", "대고", "있으면", "진짜", "살", "것", "같아."],
  ["올여름엔", "프롬비가", "내", "필수템이야."],
];

/** Fixed px for all black-outline fonts — never fit-shrink per group. */
const BLACK_OUTLINE_FONT_SIZE = 64;

/** CapCut-feeling Hangul fonts (subset of render.mjs). */
const FONT_MATRIX = {
  pretendard: {
    label: "Pretendard Variable",
    cssFamily: "Pretendard",
    file: join(here, "fonts/PretendardVariable.woff2"),
    projectRel: "fonts/PretendardVariable.woff2",
    format: "woff2",
    fontWeightRange: "100 900",
    fontSize: 96,
  },
  "do-hyeon": {
    label: "Do Hyeon",
    cssFamily: "Do Hyeon",
    file: join(here, "fonts/do-hyeon/DoHyeon-Regular.ttf"),
    projectRel: "fonts/DoHyeon-Regular.ttf",
    format: "truetype",
    fontSize: 98,
  },
  "black-han-sans": {
    label: "Black Han Sans",
    cssFamily: "Black Han Sans",
    file: join(here, "fonts/black-han-sans/BlackHanSans-Regular.ttf"),
    projectRel: "fonts/BlackHanSans-Regular.ttf",
    format: "truetype",
    fontSize: 100,
  },
  jua: {
    label: "Jua",
    cssFamily: "Jua",
    file: join(here, "fonts/jua/Jua-Regular.ttf"),
    projectRel: "fonts/Jua-Regular.ttf",
    format: "truetype",
    fontSize: 100,
  },
  dunggeunmo: {
    label: "NeoDunggeunmo",
    cssFamily: "DungGeunMo",
    file: join(here, "fonts/dunggeunmo/DungGeunMo.ttf"),
    projectRel: "fonts/DungGeunMo.ttf",
    format: "truetype",
    fontSize: 110,
  },
  "bagel-fat-one": {
    label: "Bagel Fat One",
    cssFamily: "Bagel Fat One",
    file: join(here, "fonts/bagel-fat-one/BagelFatOne-Regular.ttf"),
    projectRel: "fonts/BagelFatOne-Regular.ttf",
    format: "truetype",
    fontSize: 96,
  },
  dongle: {
    label: "Dongle Bold",
    cssFamily: "Dongle",
    file: join(here, "fonts/dongle/Dongle-Bold.ttf"),
    projectRel: "fonts/Dongle-Bold.ttf",
    format: "truetype",
    fontSize: 100,
  },
  "gasoek-one": {
    label: "Gasoek One",
    cssFamily: "Gasoek One",
    file: join(here, "fonts/gasoek-one/GasoekOne-Regular.ttf"),
    projectRel: "fonts/GasoekOne-Regular.ttf",
    format: "truetype",
    fontSize: 96,
  },
  // CapCut staples (2024–2026 KR UGC / subtitle favorites)
  "cafe24-ssurround": {
    label: "Cafe24 Ssurround",
    cssFamily: "Cafe24 Ssurround",
    file: join(here, "fonts/cafe24-ssurround/Cafe24Ssurround.woff"),
    projectRel: "fonts/Cafe24Ssurround.woff",
    format: "woff",
    fontSize: 96,
  },
  "cafe24-ssurround-air": {
    label: "Cafe24 Ssurround Air",
    cssFamily: "Cafe24 Ssurround Air",
    file: join(here, "fonts/cafe24-ssurround-air/Cafe24SsurroundAir.woff"),
    projectRel: "fonts/Cafe24SsurroundAir.woff",
    format: "woff",
    fontSize: 96,
  },
  "gmarket-sans": {
    label: "Gmarket Sans Bold",
    cssFamily: "Gmarket Sans",
    file: join(here, "fonts/gmarket-sans/GmarketSansBold.woff"),
    projectRel: "fonts/GmarketSansBold.woff",
    format: "woff",
    fontSize: 96,
  },
  "yeon-sung": {
    label: "Yeon Sung (배민 연성)",
    cssFamily: "Yeon Sung",
    file: join(here, "fonts/yeon-sung/YeonSung-Regular.ttf"),
    projectRel: "fonts/YeonSung-Regular.ttf",
    format: "truetype",
    fontSize: 96,
  },
  "single-day": {
    label: "Single Day",
    cssFamily: "Single Day",
    file: join(here, "fonts/single-day/SingleDay-Regular.ttf"),
    projectRel: "fonts/SingleDay-Regular.ttf",
    format: "truetype",
    fontSize: 100,
  },
  "hi-melody": {
    label: "Hi Melody",
    cssFamily: "Hi Melody",
    file: join(here, "fonts/hi-melody/HiMelody-Regular.ttf"),
    projectRel: "fonts/HiMelody-Regular.ttf",
    format: "truetype",
    fontSize: 100,
  },
};

/**
 * Style registry.
 * `source`: absolute html path
 * `baseFont`: CSS family name(s) to replace with Hangul face
 * `kind`: patch pipeline key
 */
const STYLE_MATRIX = {
  "black-outline": {
    label: "CapCut black outline",
    source: WEIGHT_SHIFT,
    baseFonts: ["Montserrat"],
    kind: "black-outline",
    note: "White fill + thick black outline + soft shadow; phrase groups from weight-shift",
  },
  highlight: {
    label: "Highlight (TikTok sweep)",
    source: join(REGISTRY, "caption-highlight/caption-highlight.html"),
    baseFonts: ["Montserrat"],
    kind: "highlight",
    note: "Group cards + per-word red highlight karaoke",
  },
  "pill-karaoke": {
    label: "Pill karaoke",
    source: join(REGISTRY, "caption-pill-karaoke/caption-pill-karaoke.html"),
    baseFonts: ["Poppins"],
    kind: "pill-karaoke",
    note: "Pill container + per-word karaoke color",
  },
  "clip-wipe": {
    label: "Clip wipe",
    source: join(REGISTRY, "caption-clip-wipe/caption-clip-wipe.html"),
    baseFonts: ["Poppins"],
    kind: "clip-wipe",
    note: "Phrase groups with left-to-right wipe reveal (no caption-data; injected)",
  },
  "editorial-emphasis": {
    label: "Editorial emphasis",
    source: join(
      REGISTRY,
      "caption-editorial-emphasis/caption-editorial-emphasis.html",
    ),
    baseFonts: ["Inter", "Playfair Display"],
    kind: "editorial-emphasis",
    note: "Block/line entrance with size contrast",
  },
};

/** Default matrix (~14). black-outline CapCut fonts first. */
const DEFAULT_JOBS = [
  ["black-outline", "do-hyeon"],
  ["black-outline", "black-han-sans"],
  ["black-outline", "jua"],
  ["black-outline", "dunggeunmo"],
  ["black-outline", "bagel-fat-one"],
  ["black-outline", "dongle"],
  ["black-outline", "gasoek-one"],
  ["black-outline", "cafe24-ssurround"],
  ["black-outline", "cafe24-ssurround-air"],
  ["black-outline", "gmarket-sans"],
  ["black-outline", "yeon-sung"],
  ["black-outline", "single-day"],
  ["black-outline", "hi-melody"],
  ["highlight", "do-hyeon"],
  ["highlight", "black-han-sans"],
  ["highlight", "jua"],
  ["pill-karaoke", "do-hyeon"],
  ["pill-karaoke", "black-han-sans"],
  ["pill-karaoke", "jua"],
  ["clip-wipe", "do-hyeon"],
  ["clip-wipe", "black-han-sans"],
  ["clip-wipe", "jua"],
  ["editorial-emphasis", "do-hyeon"],
  ["editorial-emphasis", "pretendard"],
];

function parseArgs(argv) {
  const args = {
    style: null,
    font: null,
    all: false,
    priority: false,
    list: false,
    copyExperiment: false,
    skipExisting: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") args.all = true;
    else if (a === "--priority") args.priority = true;
    else if (a === "--list") args.list = true;
    else if (a === "--copy-experiment") args.copyExperiment = true;
    else if (a === "--skip-existing") args.skipExisting = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--style" || a === "-s") args.style = String(argv[++i] || "").trim();
    else if (a === "--font" || a === "-f") args.font = String(argv[++i] || "").trim();
  }
  return args;
}

function resolveHyperFramesCli() {
  const fromRoot = createRequire(join(REPO, "package.json"));
  try {
    return join(
      dirname(fromRoot.resolve("hyperframes/package.json")),
      "dist/cli.js",
    );
  } catch {
    return join(REPO, "packages/cli/dist/cli.js");
  }
}

function resolveGsap() {
  const fromRoot = createRequire(join(REPO, "package.json"));
  try {
    return join(dirname(fromRoot.resolve("gsap/package.json")), "dist/gsap.min.js");
  } catch {
    return null;
  }
}

async function probe(path) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height,r_frame_rate",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    path,
  ]);
  const j = JSON.parse(stdout);
  const s = j.streams[0];
  const [n, d] = String(s.r_frame_rate || "24/1").split("/").map(Number);
  return {
    width: s.width,
    height: s.height,
    duration: Number(j.format.duration),
    fps: d ? n / d : 24,
  };
}

function buildCaptionData(words, ment, meta) {
  return {
    version: 1,
    resolution: { width: meta.width, height: meta.height },
    brand: {
      primaryColor: "#FFFFFF",
      accentColor: "#FFD700",
    },
    segments: [
      {
        start: words[0]?.start ?? 0,
        text: ment,
        words: words.map((w) => ({
          text: w.text,
          start: w.start,
          end: w.end,
        })),
      },
    ],
  };
}

function fontFaceCss(font) {
  const weight = font.fontWeightRange
    ? `font-weight: ${font.fontWeightRange};`
    : "font-weight: 400;";
  return `@font-face {
        font-family: "${font.cssFamily}";
        src: url("${font.projectRel}") format("${font.format}");
        ${weight}
        font-display: block;
      }`;
}

function replaceFontFamilies(html, baseFonts, cssFamily) {
  let out = html;
  for (const base of baseFonts) {
    out = out.replaceAll(`"${base}"`, `"${cssFamily}"`);
    out = out.replaceAll(`'${base}'`, `'${cssFamily}'`);
    out = out.replaceAll(`px ${base}`, `px ${cssFamily}`);
    out = out.replaceAll(`${base},`, `${cssFamily},`);
  }
  return out;
}

function injectCommonHangulPatches(html, meta, font, baseFonts) {
  let out = html;
  out = out.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>\s*/g, "");
  out = out.replace(/<link[^>]*fonts\.gstatic\.com[^>]*>\s*/g, "");
  out = out.replace("<style>", `<style>\n      ${fontFaceCss(font)}\n`);
  out = replaceFontFamilies(out, baseFonts, font.cssFamily);
  out = out.replace(/text-transform:\s*lowercase;?/g, "/* no lowercase */");
  out = out.replace(/text-transform:\s*uppercase;?/g, "/* no uppercase */");
  out = out.replace(/lang="en"/g, 'lang="ko"');
  out = out.replace(
    /https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@[^"]+\/dist\/gsap\.min\.js/g,
    "gsap.min.js",
  );
  out = out.replace(
    /wordEl\.textContent = word\.text\.toLowerCase\(\);/g,
    "wordEl.textContent = word.text;",
  );
  out = out.replace(
    /wordEl\.textContent = word\.text\.toUpperCase\(\);/g,
    "wordEl.textContent = word.text;",
  );
  out = out.replace(
    /textEl\.textContent = w\.text\.toUpperCase\(\);/g,
    "textEl.textContent = w.text;",
  );
  out = out.replace(
    /span\.textContent = w\.text\.toUpperCase\(\);/g,
    "span.textContent = w.text;",
  );
  out = out.replace(/return w\.text\.toLowerCase\(\);/g, "return w.text;");
  out = out.replace(/return w\.text\.toUpperCase\(\);/g, "return w.text;");
  out = out.replace(/\.toLowerCase\(\)/g, "");
  out = out.replace(/\.toUpperCase\(\)/g, "");

  const duration = meta.duration.toFixed(3);
  const videoBlock = `
      <video
        id="a-roll"
        src="source.mp4"
        data-start="0"
        data-duration="${duration}"
        data-track-index="0"
        style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;"
      ></video>
      <audio
        id="a-roll-audio"
        src="source.mp4"
        data-start="0"
        data-duration="${duration}"
        data-track-index="2"
        data-volume="1"
      ></audio>`;

  out = out.replace(/data-duration="[^"]*"/, `data-duration="${duration}"`);
  out = out.replace(/data-width="[^"]*"/, `data-width="${meta.width}"`);
  out = out.replace(/data-height="[^"]*"/, `data-height="${meta.height}"`);
  out = out.replace(/data-fps="[^"]*"/, `data-fps="${Math.round(meta.fps)}"`);

  if (!out.includes('id="a-roll"')) {
    const m = out.match(/<div\s+[^>]*data-composition-id="[^"]+"[^>]*>/);
    if (!m) throw new Error("could not find composition root");
    const idx = out.indexOf(m[0]) + m[0].length;
    out = out.slice(0, idx) + videoBlock + out.slice(idx);
  }

  out = out.replace(
    /(html,\s*body\s*\{[^}]*?)background:\s*transparent;/,
    "$1background: #000;",
  );
  out = out.replace(
    "</style>",
    `
      #a-roll { z-index: 0 !important; }
      .caption-layer, #caption-stage, .safe-zone,
      .hl-group, .wp-group, .caption-group, #hl-container, #wp-container {
        z-index: 20 !important;
      }
    </style>`,
  );
  return out;
}

/**
 * CapCut white fill + crisp black outline.
 * Stroke-only (no text-shadow) — multi-offset shadows read as a soft black
 * smudge at 720p encode, and clip at transform/overflow edges.
 */
const CAPCUT_OUTLINE_CSS = `
      .caption-line {
        color: #ffffff !important;
        font-weight: 700 !important;
        text-shadow: none !important;
        filter: none !important;
        padding: 24px 32px !important;
        box-sizing: content-box !important;
        overflow: visible !important;
        max-width: none !important;
      }
      .caption-line span {
        color: #ffffff !important;
        font-weight: 700 !important;
        display: inline-block !important;
        text-shadow: none !important;
        filter: none !important;
        padding: 0 3px !important;
        overflow: visible !important;
        -webkit-text-stroke: 4px #000000;
        paint-order: stroke fill;
      }
`;

function injectPhrasePlanMakeGroups(out) {
  const phraseJson = JSON.stringify(PHRASE_PLAN);
  const makeGroupBody = `function makeGroups(words) {
          var plan = ${phraseJson};
          var groups = [];
          var cursor = 0;
          plan.forEach(function (phrase) {
            var slice = words.slice(cursor, cursor + phrase.length);
            if (slice.length !== phrase.length) return;
            for (var i = 0; i < phrase.length; i++) {
              if (slice[i].text !== phrase[i]) return;
            }
            groups.push(makeGroup(slice));
            cursor += phrase.length;
          });
          while (cursor < words.length) {
            var chunk = words.slice(cursor, cursor + MAX_WORDS_PER_GROUP);
            groups.push(makeGroup(chunk));
            cursor += chunk.length;
          }
          return groups;
        }`;

  // weight-shift / pill style: function makeGroups(words) { ... }
  if (/function makeGroups\(words\) \{/.test(out)) {
    out = out.replace(
      /function makeGroups\(words\) \{[\s\S]*?return avoidSingleWordGroups\(groups\);\n        \}/,
      makeGroupBody,
    );
    // pill-karaoke variant without avoidSingleWordGroups
    out = out.replace(
      /function makeGroups\(words\) \{[\s\S]*?return groups;\n        \}/,
      makeGroupBody.replace(
        /groups\.push\(makeGroup\(([^)]+)\)\);/g,
        (m, arg) => {
          if (arg.includes("slice") || arg.includes("chunk")) {
            return `groups.push({ words: ${arg}, start: ${arg}[0].start, end: ${arg}[${arg}.length - 1].end });`;
          }
          return m;
        },
      ),
    );
  }
  return out;
}

function injectPhrasePlanHfMakeGroups(out) {
  const phraseJson = JSON.stringify(PHRASE_PLAN);
  const replacement = `function hfMakeGroups(words, fontPx, safeWidth, durationS) {
          var plan = ${phraseJson};
          var raw = [];
          var cursor = 0;
          plan.forEach(function (phrase) {
            var slice = words.slice(cursor, cursor + phrase.length);
            if (slice.length !== phrase.length) return;
            for (var i = 0; i < phrase.length; i++) {
              if (slice[i].text !== phrase[i]) return;
            }
            raw.push(slice);
            cursor += phrase.length;
          });
          while (cursor < words.length) {
            raw.push(words.slice(cursor, cursor + ${MAX_WORDS_PER_GROUP}));
            cursor += Math.min(${MAX_WORDS_PER_GROUP}, words.length - cursor);
          }
          return raw.map(function (ws, gi) {
            var nextStart = gi + 1 < raw.length ? raw[gi + 1][0].start : durationS;
            return {
              words: ws,
              start: ws[0].start,
              end: Math.min(
                ws[ws.length - 1].end + 0.5,
                Math.max(ws[0].start + 0.2, nextStart - 0.05),
              ),
            };
          });
        }`;
  if (/function hfMakeGroups\(/.test(out)) {
    out = out.replace(
      /function hfMakeGroups\([\s\S]*?return raw\.map\([\s\S]*?\};\n        \}/,
      replacement,
    );
  }
  return out;
}

function patchWeightShiftBase(html, meta, font) {
  let out = injectCommonHangulPatches(html, meta, font, ["Montserrat"]);
  out = out.replace(/font-size:\s*72px;/g, `font-size: ${font.fontSize}px;`);
  out = out.replace(
    /CAPTION_FONT_SIZE\s*=\s*Math\.round\(72\s*\*\s*layout\.fontScale\)/g,
    `CAPTION_FONT_SIZE = Math.round(${font.fontSize} * layout.fontScale)`,
  );
  out = out.replace(
    /var stageHeight = Math\.round\(278 \* layout\.fontScale\);/,
    `var stageHeight = Math.round(${DESIGN_SAFE_HEIGHT} * layout.fontScale);`,
  );
  out = out.replace(
    /stage\.style\.bottom = Math\.round\(100 \* layout\.scaleY\) \+ "px";/,
    `stage.style.bottom = Math.round(${DESIGN_SAFE_BOTTOM} * layout.scaleY) + "px";`,
  );
  out = out.replace(/height:\s*278px;/g, `height: ${DESIGN_SAFE_HEIGHT}px;`);
  out = out.replace(/bottom:\s*100px;/g, `bottom: ${DESIGN_SAFE_BOTTOM}px;`);
  out = out.replace(
    /var MAX_WORDS_PER_GROUP = 4;/,
    `var MAX_WORDS_PER_GROUP = ${MAX_WORDS_PER_GROUP};`,
  );
  out = out.replace(
    /var PAUSE_THRESHOLD = 0\.1;/,
    `var PAUSE_THRESHOLD = ${PAUSE_THRESHOLD};`,
  );

  const phraseJson = JSON.stringify(PHRASE_PLAN);
  out = out.replace(
    /function makeGroups\(words\) \{[\s\S]*?return avoidSingleWordGroups\(groups\);\n        \}/,
    `function makeGroups(words) {
          var plan = ${phraseJson};
          var groups = [];
          var cursor = 0;
          plan.forEach(function (phrase) {
            var slice = words.slice(cursor, cursor + phrase.length);
            if (slice.length !== phrase.length) return;
            for (var i = 0; i < phrase.length; i++) {
              if (slice[i].text !== phrase[i]) return;
            }
            groups.push(makeGroup(slice));
            cursor += phrase.length;
          });
          while (cursor < words.length) {
            var chunk = words.slice(cursor, cursor + MAX_WORDS_PER_GROUP);
            groups.push(makeGroup(chunk));
            cursor += chunk.length;
          }
          return groups;
        }`,
  );

  out = out.replace(
    /function splitLines\(words\) \{[\s\S]*?return result;\n        \}/,
    `function splitLines(words) {
          if (words.length < 2) return [{ words: words, startIndex: 0 }];
          var joined = words.map(function (w) { return w.text; }).join(" ");
          if (joined === "포켓 제트 들고 다니는데,") {
            return [
              { words: words.slice(0, 2), startIndex: 0 },
              { words: words.slice(2), startIndex: 2 },
            ];
          }
          if (joined === "그래서 내가 프롬비") {
            return [
              { words: words.slice(0, 2), startIndex: 0 },
              { words: words.slice(2), startIndex: 2 },
            ];
          }
          if (joined === "진짜 살 것 같아.") {
            return [
              { words: words.slice(0, 1), startIndex: 0 },
              { words: words.slice(1), startIndex: 1 },
            ];
          }
          var bestSplit = Math.ceil(words.length / 2);
          var lineMax = MAX_LINE_WIDTH * 1.28;
          var bestScore = -Infinity;
          for (var s = 1; s < words.length; s++) {
            var line1 = words.slice(0, s);
            var line2 = words.slice(s);
            var w1 = measureLineWidth(line1);
            var w2 = measureLineWidth(line2);
            if (w1 > lineMax || w2 > lineMax) continue;
            if (line1.length && line2.length && line1[line1.length - 1].text === "포켓" && line2[0].text === "제트") continue;
            var score = -Math.abs(w1 - w2) + Math.min(line1.length, line2.length) * 40;
            if (line1.length >= 2 && line2.length >= 2) score += 80;
            if (score > bestScore) { bestScore = score; bestSplit = s; }
          }
          return [
            { words: words.slice(0, bestSplit), startIndex: 0 },
            { words: words.slice(bestSplit), startIndex: bestSplit },
          ].filter(function (line) { return line.words.length; });
        }`,
  );
  return out;
}

function patchBlackOutline(html, meta, font) {
  // Fixed size for every font/card. Prefer longer lines, but HARD-CUT when a
  // line would overflow the safe width (never shrink glyphs to fit).
  // Vertically ~midway between former bottom-third and true center (~64%).
  const slimFont = { ...font, fontSize: BLACK_OUTLINE_FONT_SIZE };
  let out = patchWeightShiftBase(html, meta, slimFont);
  const longPlanJson = JSON.stringify(BLACK_OUTLINE_PHRASE_PLAN);
  // Design-space (1920-wide) stage; cut inset leaves room for 4px stroke + pad
  const safeDesignW = 1600;
  const lineInsetDesign = 200;

  // Kill upstream soft shadow / clip before our outline CSS
  out = out.replace(
    /text-shadow:\s*0 2px 4px rgba\(0,\s*0,\s*0,\s*0\.3\);/g,
    "text-shadow: none;",
  );
  out = out.replace(
    /#black-outline\s*\{([^}]*)overflow:\s*hidden;/,
    "#black-outline {$1overflow: visible;",
  );
  out = out.replace(
    /will-change:\s*transform;/g,
    "will-change: auto;",
  );
  out = out.replace(
    /backface-visibility:\s*hidden;/g,
    "backface-visibility: visible;",
  );
  // Extra room for stroke outside glyph box
  out = out.replace(
    /var FONT_WIDTH_SAFETY = [^;]+;/,
    "var FONT_WIDTH_SAFETY = 1.28;",
  );

  out = out.replace(
    "</style>",
    `${CAPCUT_OUTLINE_CSS}
      /* black-outline: centered, mid-frame; never clip stroke */
      #black-outline,
      .caption-layer,
      .safe-zone,
      .caption-group,
      .caption-copy,
      .caption-line {
        overflow: visible !important;
      }
      .safe-zone {
        bottom: auto !important;
        top: 64% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: ${safeDesignW}px !important;
        height: 280px !important;
      }
      .caption-group {
        width: ${safeDesignW}px !important;
        height: 280px !important;
      }
      .caption-copy {
        max-width: none !important;
        overflow: visible !important;
      }
      .caption-line {
        font-size: ${BLACK_OUTLINE_FONT_SIZE}px !important;
        max-width: none !important;
      }
      .caption-line,
      .caption-copy {
        width: max-content !important;
      }
      /* Transform layers clip text-shadow outlines in Chromium — kill them */
      .caption-group {
        will-change: auto !important;
        backface-visibility: visible !important;
        transform: none !important;
        transform-origin: 50% 50% !important;
      }
    </style>`,
  );

  // One visual line per card; makeGroups already width-cuts
  out = out.replace(
    /function splitLines\(words\) \{[\s\S]*?return \[[\s\S]*?\]\.filter\(function \(line\) \{ return line\.words\.length; \}\);\n        \}/,
    `function splitLines(words) {
          return [{ words: words, startIndex: 0 }];
        }`,
  );
  if (!/function splitLines\(words\) \{\s*return \[\{ words: words, startIndex: 0 \}\];/.test(out)) {
    out = out.replace(
      /function splitLines\(words\) \{[\s\S]*?\n        \}/,
      `function splitLines(words) {
          return [{ words: words, startIndex: 0 }];
        }`,
    );
  }

  // Semantic phrase plan → greedy cut into max-width one-liners (fixed font)
  out = out.replace(
    /function makeGroups\(words\) \{[\s\S]*?return groups;\n        \}/,
    `function makeGroups(words) {
          var plan = ${longPlanJson};
          var groups = [];
          var cursor = 0;
          function pushFitted(slice) {
            if (!slice.length) return;
            var line = [];
            slice.forEach(function (w) {
              var trial = line.concat([w]);
              if (line.length && measureLineWidth(trial) > MAX_LINE_WIDTH) {
                groups.push(makeGroup(line));
                line = [w];
              } else {
                line = trial;
              }
            });
            if (line.length) groups.push(makeGroup(line));
          }
          plan.forEach(function (phrase) {
            var slice = words.slice(cursor, cursor + phrase.length);
            if (slice.length !== phrase.length) return;
            for (var i = 0; i < phrase.length; i++) {
              if (slice[i].text !== phrase[i]) return;
            }
            pushFitted(slice);
            cursor += phrase.length;
          });
          while (cursor < words.length) {
            pushFitted(words.slice(cursor, cursor + 8));
            cursor += Math.min(8, words.length - cursor);
          }
          return groups;
        }`,
  );

  // Never shrink per card — constant font size
  out = out.replace(
    /function fitFontSize\(text, baseFontSize, fontWeight, fontFamily, maxWidth\) \{[\s\S]*?return minSize;\n        \}/,
    `function fitFontSize(text, baseFontSize, fontWeight, fontFamily, maxWidth) {
          return baseFontSize;
        }`,
  );
  out = out.replace(
    /var computedSize = fitFontSize\(\s*widestLineText,\s*CAPTION_FONT_SIZE,\s*"700",\s*"[^"]+",\s*MAX_LINE_WIDTH,\s*\);/,
    "var computedSize = CAPTION_FONT_SIZE;",
  );
  // Do not clamp line width — that was clipping the black stroke at the ends
  out = out.replace(
    /lineEl\.style\.maxWidth = SAFE_ZONE_WIDTH \+ "px";/g,
    'lineEl.style.maxWidth = "none";',
  );

  // Stage: padded width + mid-frame. Set measure font BEFORE makeGroups.
  out = out.replace(
    /var stageHeight = Math\.round\(380 \* layout\.fontScale\);/,
    "var stageHeight = Math.round(280 * layout.fontScale);",
  );
  out = out.replace(
    /SAFE_ZONE_WIDTH = Math\.round\(1400 \* layout\.scaleX\);/,
    `SAFE_ZONE_WIDTH = Math.round(${safeDesignW} * layout.scaleX);`,
  );
  out = out.replace(
    /MAX_LINE_WIDTH = SAFE_ZONE_WIDTH - Math\.round\(40 \* layout\.scaleX\);/,
    `MAX_LINE_WIDTH = SAFE_ZONE_WIDTH - Math.round(${lineInsetDesign} * layout.scaleX);`,
  );
  out = out.replace(
    /stage\.style\.bottom = Math\.round\(72 \* layout\.scaleY\) \+ "px";/,
    `stage.style.bottom = "auto";
          stage.style.top = "64%";
          stage.style.left = "50%";
          stage.style.transform = "translate(-50%, -50%)";`,
  );
  out = out.replace(
    /CAPTION_FONT_SIZE = Math\.round\(\d+ \* layout\.fontScale\);/,
    `CAPTION_FONT_SIZE = Math.round(${BLACK_OUTLINE_FONT_SIZE} * layout.fontScale);`,
  );
  // Ensure measureContext uses final font size before grouping
  out = out.replace(
    /measureContext\.font = "700 " \+ CAPTION_FONT_SIZE \+ "px " \+ [^;]+;/,
    `measureContext.font = "700 " + CAPTION_FONT_SIZE + "px ${font.cssFamily}";
          MAX_LINE_WIDTH = SAFE_ZONE_WIDTH - Math.round(${lineInsetDesign} * layout.scaleX);`,
  );

  // Force bold; skip weight-shift animation (single-weight Hangul faces)
  out = out.replace(
    /lineEl\.style\.fontWeight = lineIndex === 0 \? FONT_WEIGHT_BOLD : FONT_WEIGHT_LIGHT;/,
    "lineEl.style.fontWeight = FONT_WEIGHT_BOLD;",
  );
  out = out.replace(
    /if \(group\.lines\.length === 2\) \{[\s\S]*?switchTime,\n              \);\n            \}/,
    "/* black-outline: keep constant bold; no weight shift */",
  );
  // Opacity-only entrance — scale/transform clips outline ends
  out = out.replace(
    /tl\.set\(groupEl, \{ opacity: 0, scale: 0\.85 \}, visibleStart\);/,
    "tl.set(groupEl, { opacity: 0, scale: 1 }, visibleStart);",
  );
  out = out.replace(
    /\{\s*opacity: 1,\s*scale: 1,\s*duration: ENTRY_DURATION,\s*ease: "power3\.out",\s*force3D: true\s*\}/,
    '{ opacity: 1, duration: ENTRY_DURATION, ease: "power2.out", force3D: false }',
  );
  out = out.replace(
    /transform: translateZ\(0\);/g,
    "/* no translateZ — avoids outline clip */",
  );
  out = out.replace(
    /data-composition-id="caption-weight-shift"/,
    'data-composition-id="caption-black-outline"',
  );
  out = out.replace(/id="weight-shift"/g, 'id="black-outline"');
  out = out.replace(/#weight-shift/g, "#black-outline");
  out = out.replace(
    /var HF_COMPOSITION_ID = "caption-weight-shift";/,
    'var HF_COMPOSITION_ID = "caption-black-outline";',
  );
  out = out.replace(
    /var HF_ROOT_ID = "weight-shift";/,
    'var HF_ROOT_ID = "black-outline";',
  );
  return out;
}

function patchHighlight(html, meta, font) {
  let out = injectCommonHangulPatches(html, meta, font, ["Montserrat"]);
  out = out.replace(
    /var MAX_WORDS_PER_GROUP = 4;/,
    `var MAX_WORDS_PER_GROUP = ${MAX_WORDS_PER_GROUP};`,
  );
  out = out.replace(
    /var PAUSE_THRESHOLD = 0\.1;/,
    `var PAUSE_THRESHOLD = ${PAUSE_THRESHOLD};`,
  );
  out = injectPhrasePlanHfMakeGroups(out);
  // Slightly larger base for 9:16
  out = out.replace(
    /var fontPx = Math\.round\(80 \* layout\.fontScale\);/,
    `var fontPx = Math.round(${Math.round(font.fontSize * 0.85)} * layout.fontScale);`,
  );
  return out;
}

function patchPillKaraoke(html, meta, font) {
  let out = injectCommonHangulPatches(html, meta, font, ["Poppins"]);
  out = out.replace(
    /var MAX_WORDS_PER_GROUP = 4;/,
    `var MAX_WORDS_PER_GROUP = ${MAX_WORDS_PER_GROUP};`,
  );
  out = out.replace(
    /var PAUSE_THRESHOLD = [^;]+;/,
    `var PAUSE_THRESHOLD = ${PAUSE_THRESHOLD};`,
  );
  const phraseJson = JSON.stringify(PHRASE_PLAN);
  out = out.replace(
    /function makeGroups\(words\) \{[\s\S]*?return groups;\n        \}/,
    `function makeGroups(words) {
          var plan = ${phraseJson};
          var groups = [];
          var cursor = 0;
          function pushSlice(slice) {
            if (!slice.length) return;
            groups.push({
              words: slice.slice(),
              start: slice[0].start,
              end: slice[slice.length - 1].end,
            });
          }
          plan.forEach(function (phrase) {
            var slice = words.slice(cursor, cursor + phrase.length);
            if (slice.length !== phrase.length) return;
            for (var i = 0; i < phrase.length; i++) {
              if (slice[i].text !== phrase[i]) return;
            }
            pushSlice(slice);
            cursor += phrase.length;
          });
          while (cursor < words.length) {
            pushSlice(words.slice(cursor, cursor + MAX_WORDS_PER_GROUP));
            cursor += Math.min(MAX_WORDS_PER_GROUP, words.length - cursor);
          }
          return groups;
        }`,
  );
  out = out.replace(
    /BASE_FONT_SIZE = Math\.round\(72 \* layout\.fontScale\);/,
    `BASE_FONT_SIZE = Math.round(${font.fontSize} * layout.fontScale);`,
  );
  return out;
}

function patchClipWipe(html, meta, font, words) {
  let out = injectCommonHangulPatches(html, meta, font, ["Poppins"]);
  const wordsJson = JSON.stringify(
    words.map((w) => ({ text: w.text, start: w.start, end: w.end })),
  );
  // Build RAW_GROUPS from phrase plan indices
  const rawGroups = [];
  let cursor = 0;
  for (const phrase of PHRASE_PLAN) {
    rawGroups.push([cursor, cursor + phrase.length - 1]);
    cursor += phrase.length;
  }
  while (cursor < words.length) {
    const end = Math.min(cursor + MAX_WORDS_PER_GROUP - 1, words.length - 1);
    rawGroups.push([cursor, end]);
    cursor = end + 1;
  }
  const duration = meta.duration;

  out = out.replace(
    /var WORDS = \[[\s\S]*?\];/,
    `var WORDS = ${wordsJson};`,
  );
  out = out.replace(
    /var KEYWORDS = new Set\([^;]+;/,
    "var KEYWORDS = new Set();",
  );
  out = out.replace(
    /var RAW_GROUPS = \[[\s\S]*?\];/,
    `var RAW_GROUPS = ${JSON.stringify(rawGroups)};`,
  );
  out = out.replace(
    /var nextStart = gi \+ 1 < RAW_GROUPS\.length \? WORDS\[RAW_GROUPS\[gi \+ 1\]\[0\]\]\.start : 8\.0;/,
    `var nextStart = gi + 1 < RAW_GROUPS.length ? WORDS[RAW_GROUPS[gi + 1][0]].start : ${duration};`,
  );
  out = out.replace(
    /fitFontSize\(groupText, 88, "800", "[^"]+", 1720\)/,
    `fitFontSize(groupText, ${font.fontSize}, "800", "${font.cssFamily}", 1720)`,
  );
  // Pin timeline to full duration
  if (!out.includes("tl.to({}, { duration:")) {
    out = out.replace(
      /tl\.seek\(0\);/,
      `tl.to({}, { duration: ${duration} }, 0);\n        tl.seek(0);`,
    );
  }
  return out;
}

function patchEditorial(html, meta, font) {
  let out = injectCommonHangulPatches(html, meta, font, [
    "Inter",
    "Playfair Display",
  ]);
  // Hangul-friendly emphasis: longer tokens / impact words
  out = out.replace(
    /function hfIsEmphasisWord\(text\) \{[\s\S]*?return clean\.length >= 5 && !HF_STOPWORDS\.has\(clean\);\n        \}/,
    `function hfIsEmphasisWord(text) {
          var t = String(text).replace(/[,.!?]/g, "");
          var KO_EMPH = new Set(["진짜","완전","달라.","세고,","필수템이야.","예민해지잖아.","막히지","프롬비","프롬비가","살"]);
          if (KO_EMPH.has(t) || KO_EMPH.has(text)) return true;
          if (/[\\uAC00-\\uD7A3]/.test(t)) return t.length >= 4;
          var clean = t.replace(/[^a-zA-Z]/g, "");
          return clean.length >= 5 && !HF_STOPWORDS.has(clean);
        }`,
  );
  const phraseJson = JSON.stringify(PHRASE_PLAN);
  out = out.replace(
    /function hfMakeBlocks\(words\) \{[\s\S]*?return blocks;\n        \}/,
    `function hfMakeBlocks(words) {
          var plan = ${phraseJson};
          var blocks = [];
          var cursor = 0;
          plan.forEach(function (phrase) {
            var slice = words.slice(cursor, cursor + phrase.length);
            if (slice.length !== phrase.length) return;
            for (var i = 0; i < phrase.length; i++) {
              if (slice[i].text !== phrase[i]) return;
            }
            var idxs = [];
            for (var k = 0; k < phrase.length; k++) idxs.push(cursor + k);
            cursor += phrase.length;
            var emphAt = -1;
            for (var e = idxs.length - 1; e >= 0; e--) {
              if (hfIsEmphasisWord(words[idxs[e]].text)) { emphAt = e; break; }
            }
            if (emphAt === idxs.length - 1 && idxs.length > 1) {
              blocks.push({
                line1: idxs.slice(0, -1).map(function (ix) { return [ix, "n"]; }),
                line2: [[idxs[idxs.length - 1], "e"]],
              });
            } else if (idxs.length > 3) {
              var split = Math.ceil(idxs.length / 2);
              blocks.push({
                line1: idxs.slice(0, split).map(function (ix) { return [ix, "n"]; }),
                line2: idxs.slice(split).map(function (ix) { return [ix, emphAt >= split ? "e" : "n"]; }),
              });
            } else {
              blocks.push({
                line1: idxs.map(function (ix, i) { return [ix, i === emphAt ? "e" : "n"]; }),
                line2: null,
              });
            }
          });
          while (cursor < words.length) {
            var end = Math.min(cursor + ${MAX_WORDS_PER_GROUP}, words.length);
            var rest = [];
            for (var r = cursor; r < end; r++) rest.push(r);
            blocks.push({
              line1: rest.map(function (ix) { return [ix, "n"]; }),
              line2: null,
            });
            cursor = end;
          }
          return blocks;
        }`,
  );
  return out;
}

function patchForStyle(styleSlug, html, meta, font, words) {
  const style = STYLE_MATRIX[styleSlug];
  switch (style.kind) {
    case "black-outline":
      return patchBlackOutline(html, meta, font);
    case "highlight":
      return patchHighlight(html, meta, font);
    case "pill-karaoke":
      return patchPillKaraoke(html, meta, font);
    case "clip-wipe":
      return patchClipWipe(html, meta, font, words);
    case "editorial-emphasis":
      return patchEditorial(html, meta, font);
    default:
      throw new Error(`Unknown style kind: ${style.kind}`);
  }
}

async function muxBgm(videoIn, videoOut) {
  const { stdout: dur } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=nw=1:nk=1",
    videoIn,
  ]);
  await mkdir(dirname(videoOut), { recursive: true });
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    videoIn,
    "-i",
    SRC,
    "-stream_loop",
    "-1",
    "-i",
    BGM,
    "-t",
    String(dur).trim(),
    "-filter_complex",
    "[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[vo];[2:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=0.15[bg];[vo][bg]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]",
    "-map",
    "0:v",
    "-map",
    "[a]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    videoOut,
  ]);
}

async function renderOne(
  styleSlug,
  fontSlug,
  { copyExperiment = false, skipExisting = false } = {},
) {
  const style = STYLE_MATRIX[styleSlug];
  const font = FONT_MATRIX[fontSlug];
  if (!style) throw new Error(`Unknown style "${styleSlug}"`);
  if (!font) throw new Error(`Unknown font "${fontSlug}"`);

  await access(SRC).catch(() => {
    throw new Error(`Missing ${SRC}`);
  });
  await access(font.file);
  await access(style.source);
  await access(WORDS_PATH);

  const jobId = `${styleSlug}--${fontSlug}`;
  const outPath = join(OUT_DIR, `${jobId}.mp4`);
  if (skipExisting) {
    try {
      await access(outPath);
      console.log("skip existing", outPath);
      if (copyExperiment) {
        const expDir = join(EXPERIMENT_ROOT, "style-font-matrix");
        const bgmDir = join(expDir, "with-bgm");
        await mkdir(bgmDir, { recursive: true });
        const expCopy = join(expDir, `${jobId}.mp4`);
        await copyFile(outPath, expCopy).catch(() => {});
        const bgmOut = join(bgmDir, `${jobId}-day-bright-pop-bgm.mp4`);
        try {
          await access(bgmOut);
        } catch {
          try {
            await access(BGM);
            await muxBgm(outPath, bgmOut);
            console.log("BGM", bgmOut);
          } catch (e) {
            console.warn("BGM mux skipped:", e?.message || e);
          }
        }
      }
      return outPath;
    } catch {
      /* render */
    }
  }

  const projectDir = join(here, `.project-matrix-${jobId}`);
  await mkdir(OUT_DIR, { recursive: true });
  await rm(projectDir, { recursive: true, force: true });
  await mkdir(join(projectDir, "fonts"), { recursive: true });

  const meta = await probe(SRC);
  const doc = JSON.parse(await readFile(WORDS_PATH, "utf8"));
  const ment = doc.ment;
  const words = doc.words;
  const captionData = buildCaptionData(words, ment, meta);

  let html = await readFile(style.source, "utf8");
  html = patchForStyle(styleSlug, html, meta, font, words);

  await copyFile(SRC, join(projectDir, "source.mp4"));
  await copyFile(font.file, join(projectDir, font.projectRel));
  const gsap = resolveGsap();
  if (gsap) await copyFile(gsap, join(projectDir, "gsap.min.js"));
  await writeFile(
    join(projectDir, "caption-data.json"),
    JSON.stringify(captionData, null, 2),
  );
  await writeFile(join(projectDir, "index.html"), html, "utf8");
  await writeFile(
    join(projectDir, "package.json"),
    JSON.stringify(
      { name: `ko-matrix-${jobId}`, private: true, type: "module" },
      null,
      2,
    ),
  );

  const cli = resolveHyperFramesCli();
  await access(cli);
  const fps = Math.round(meta.fps) === 24 ? 24 : 30;
  console.log("render", { style: styleSlug, font: fontSlug, outPath });
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [cli, "render", projectDir, "-o", outPath, "-q", "standard", "-f", String(fps)],
    { maxBuffer: 80 * 1024 * 1024, timeout: 1000 * 60 * 12 },
  );
  await writeFile(join(OUT_DIR, `${jobId}.log`), `${stdout}\n${stderr}`);
  console.log("DONE", outPath);

  if (copyExperiment) {
    const expDir = join(EXPERIMENT_ROOT, "style-font-matrix");
    const bgmDir = join(expDir, "with-bgm");
    await mkdir(bgmDir, { recursive: true });
    const expCopy = join(expDir, `${jobId}.mp4`);
    await copyFile(outPath, expCopy);
    try {
      await access(BGM);
      const bgmOut = join(bgmDir, `${jobId}-day-bright-pop-bgm.mp4`);
      await muxBgm(outPath, bgmOut);
      console.log("BGM", bgmOut);
    } catch (e) {
      console.warn("BGM mux skipped:", e?.message || e);
    }
  }

  return outPath;
}

function printHelp() {
  console.log(`Korean caption style × font matrix

Usage:
  node render-style-matrix.mjs --style <slug> --font <slug>
  node render-style-matrix.mjs --priority          # black-outline CapCut fonts
  node render-style-matrix.mjs --all [--copy-experiment]
  node render-style-matrix.mjs --list

Styles:
${Object.entries(STYLE_MATRIX)
  .map(([s, c]) => `  ${s.padEnd(22)} ${c.label}`)
  .join("\n")}

Fonts:
${Object.entries(FONT_MATRIX)
  .map(([s, f]) => `  ${s.padEnd(16)} ${f.label}`)
  .join("\n")}
`);
}

function resolveJobs(args) {
  if (args.priority) {
    return DEFAULT_JOBS.filter(([s]) => s === "black-outline");
  }
  if (args.all) return DEFAULT_JOBS;
  if (args.style && args.font) return [[args.style, args.font]];
  if (args.style) {
    const fonts =
      args.style === "black-outline"
        ? ["do-hyeon", "black-han-sans", "jua", "dunggeunmo"]
        : ["do-hyeon", "black-han-sans", "jua"];
    return fonts.map((f) => [args.style, f]);
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.list) {
    console.log("=== styles ===");
    for (const [slug, s] of Object.entries(STYLE_MATRIX)) {
      console.log(`${slug}\t${s.label}\t${s.note}`);
    }
    console.log("\n=== fonts ===");
    for (const [slug, f] of Object.entries(FONT_MATRIX)) {
      console.log(`${slug}\t${f.label}`);
    }
    console.log("\n=== default jobs ===");
    for (const [s, f] of DEFAULT_JOBS) console.log(`${s}--${f}`);
    return;
  }

  const jobs = resolveJobs(args);
  if (!jobs) {
    printHelp();
    process.exit(1);
  }

  const results = [];
  for (const [style, font] of jobs) {
    const id = `${style}--${font}`;
    try {
      const path = await renderOne(style, font, {
        copyExperiment: args.copyExperiment || args.all || args.priority,
        skipExisting: args.skipExisting,
      });
      results.push({ id, ok: true, path });
    } catch (err) {
      console.error(`[fail] ${id}:`, err?.message || err);
      results.push({ id, ok: false, error: String(err?.message || err) });
      if (!args.all && !args.priority) throw err;
    }
  }

  console.log("\n=== style×font matrix summary ===");
  for (const r of results) {
    console.log(r.ok ? `OK  ${r.id} -> ${r.path}` : `FAIL ${r.id}: ${r.error}`);
  }
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
