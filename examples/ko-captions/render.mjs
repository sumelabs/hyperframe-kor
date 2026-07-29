#!/usr/bin/env node
/**
 * Korean weight-shift captions example for sumelabs/hyperframe-kor.
 *
 * - Selectable CapCut-feeling Hangul fonts (OFL matrix)
 * - Canonical ment text + STT timings
 * - Phrase grouping for readable Korean cards
 *
 * Usage:
 *   node render.mjs                         # pretendard (default)
 *   node render.mjs --font do-hyeon
 *   node render.mjs --all                   # render full font matrix
 *   node render.mjs --list
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
const OUT_DIR = join(here, "out");
const SRC = join(here, "source.mp4");
const WORDS_PATH = join(here, "fixtures/sample-words.json");
const COMPONENT = join(here, "components/caption-weight-shift.html");

const DESIGN_SAFE_HEIGHT = 380;
const DESIGN_SAFE_BOTTOM = 72;
const MAX_WORDS_PER_GROUP = 7;
const PAUSE_THRESHOLD = 0.45;

/** Default phrase plan for the sample ment. Override via fixtures later if needed. */
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
 * CapCut-feeling Hangul font matrix.
 * `cssFamily` is the CSS font-family name injected into the patch.
 * `projectRel` is the path under the temp project (fonts/...).
 */
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
    // Pixel faces read small at the same CSS size.
    fontSize: 110,
  },
  "nanum-pen": {
    label: "Nanum Pen Script",
    cssFamily: "Nanum Pen Script",
    file: join(here, "fonts/nanum-pen/NanumPenScript-Regular.ttf"),
    projectRel: "fonts/NanumPenScript-Regular.ttf",
    format: "truetype",
    // Script fonts need a bump for readable Hangul cards.
    fontSize: 108,
  },
  "gowun-dodum": {
    label: "Gowun Dodum",
    cssFamily: "Gowun Dodum",
    file: join(here, "fonts/gowun-dodum/GowunDodum-Regular.ttf"),
    projectRel: "fonts/GowunDodum-Regular.ttf",
    format: "truetype",
    fontSize: 96,
  },
};

function parseArgs(argv) {
  const args = { font: "pretendard", all: false, list: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") args.all = true;
    else if (a === "--list") args.list = true;
    else if (a === "--font" || a === "-f") {
      args.font = String(argv[++i] || "").trim();
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    }
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

function patchWeightShiftHtml(html, meta, font) {
  let out = html;
  out = out.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>\s*/g, "");
  out = out.replace(/<link[^>]*fonts\.gstatic\.com[^>]*>\s*/g, "");

  const face = fontFaceCss(font);
  const family = font.cssFamily;
  const fontSize = font.fontSize;

  out = out.replace("<style>", `<style>\n      ${face}\n`);
  out = out.replaceAll('"Montserrat"', `"${family}"`);
  out = out.replaceAll("'Montserrat'", `'${family}'`);
  out = out.replaceAll("px Montserrat", `px ${family}`);
  out = out.replace(/text-transform:\s*lowercase;?/g, "/* no lowercase */");
  out = out.replace(/lang="en"/g, 'lang="ko"');
  out = out.replace(
    /https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@[^"]+\/dist\/gsap\.min\.js/g,
    "gsap.min.js",
  );

  out = out.replace(/font-size:\s*72px;/g, `font-size: ${fontSize}px;`);
  out = out.replace(
    /CAPTION_FONT_SIZE\s*=\s*Math\.round\(72\s*\*\s*layout\.fontScale\)/g,
    `CAPTION_FONT_SIZE = Math.round(${fontSize} * layout.fontScale)`,
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
    /wordEl\.textContent = word\.text\.toLowerCase\(\);/g,
    "wordEl.textContent = word.text;",
  );
  out = out.replace(/return w\.text\.toLowerCase\(\);/g, "return w.text;");
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
      .caption-layer, #caption-stage, .safe-zone { z-index: 20 !important; }
    </style>`,
  );
  return out;
}

async function renderOne(slug) {
  const font = FONT_MATRIX[slug];
  if (!font) {
    throw new Error(
      `Unknown font slug "${slug}". Use --list to see options.`,
    );
  }

  await access(SRC).catch(() => {
    throw new Error(
      `Missing ${SRC}\nCopy a talking-head MP4 to examples/ko-captions/source.mp4 first.`,
    );
  });
  await access(font.file);
  await access(COMPONENT);
  await access(WORDS_PATH);

  const projectDir = join(here, `.project-${slug}`);
  const fontsOutDir = join(OUT_DIR, "fonts");
  await mkdir(fontsOutDir, { recursive: true });
  await rm(projectDir, { recursive: true, force: true });
  await mkdir(join(projectDir, "fonts"), { recursive: true });

  const meta = await probe(SRC);
  const doc = JSON.parse(await readFile(WORDS_PATH, "utf8"));
  const ment = doc.ment;
  const words = doc.words;
  const captionData = buildCaptionData(words, ment, meta);

  let html = await readFile(COMPONENT, "utf8");
  html = patchWeightShiftHtml(html, meta, font);

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
      { name: `ko-captions-${slug}`, private: true, type: "module" },
      null,
      2,
    ),
  );

  const outPath = join(fontsOutDir, `${slug}.mp4`);
  // Keep legacy default path for pretendard convenience
  const legacyPath =
    slug === "pretendard" ? join(OUT_DIR, "ko-weight-shift.mp4") : null;

  const cli = resolveHyperFramesCli();
  await access(cli).catch(() => {
    throw new Error(
      `Missing HyperFrames CLI at ${cli}. Run monorepo build first (packages/cli).`,
    );
  });
  const fps = Math.round(meta.fps) === 24 ? 24 : 30;
  console.log("render", { slug, label: font.label, meta, cli, outPath });
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [cli, "render", projectDir, "-o", outPath, "-q", "standard", "-f", String(fps)],
    { maxBuffer: 80 * 1024 * 1024, timeout: 1000 * 60 * 12 },
  );
  await writeFile(join(fontsOutDir, `${slug}.log`), `${stdout}\n${stderr}`);
  if (legacyPath) await copyFile(outPath, legacyPath);
  console.log("DONE", outPath);
  return outPath;
}

function printHelp() {
  console.log(`Korean weight-shift caption renderer

Usage:
  node render.mjs [--font <slug>]
  node render.mjs --all
  node render.mjs --list

Fonts:
${Object.entries(FONT_MATRIX)
  .map(([slug, f]) => `  ${slug.padEnd(16)} ${f.label} (size ${f.fontSize})`)
  .join("\n")}
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.list) {
    for (const [slug, f] of Object.entries(FONT_MATRIX)) {
      console.log(`${slug}\t${f.label}\t${f.file}`);
    }
    return;
  }

  const slugs = args.all ? Object.keys(FONT_MATRIX) : [args.font];
  if (!args.all && !FONT_MATRIX[args.font]) {
    throw new Error(
      `Unknown font slug "${args.font}". Use --list to see options.`,
    );
  }

  const results = [];
  for (const slug of slugs) {
    try {
      const path = await renderOne(slug);
      results.push({ slug, ok: true, path });
    } catch (err) {
      console.error(`[fail] ${slug}:`, err?.message || err);
      results.push({ slug, ok: false, error: String(err?.message || err) });
      if (!args.all) throw err;
    }
  }

  console.log("\n=== font matrix summary ===");
  for (const r of results) {
    console.log(r.ok ? `OK  ${r.slug} -> ${r.path}` : `FAIL ${r.slug}: ${r.error}`);
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
