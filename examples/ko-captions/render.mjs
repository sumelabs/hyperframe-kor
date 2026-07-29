#!/usr/bin/env node
/**
 * Korean weight-shift captions example for sumelabs/hyperframe-kor.
 *
 * - Pretendard Hangul font
 * - Canonical ment text + STT timings
 * - Phrase grouping for readable Korean cards
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
const PROJECT_DIR = join(here, ".project");
const OUT_DIR = join(here, "out");
const SRC = join(here, "source.mp4");
const FONT = join(here, "fonts/PretendardVariable.woff2");
const WORDS_PATH = join(here, "fixtures/sample-words.json");
const COMPONENT = join(here, "components/caption-weight-shift.html");

const DESIGN_FONT_SIZE = 96;
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

function resolveHyperFramesCli() {
  const fromRoot = createRequire(join(REPO, "package.json"));
  try {
    return join(
      dirname(fromRoot.resolve("hyperframes/package.json")),
      "dist/cli.js",
    );
  } catch {
    // Monorepo local CLI build
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

function patchWeightShiftHtml(html, meta) {
  let out = html;
  out = out.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>\s*/g, "");
  out = out.replace(/<link[^>]*fonts\.gstatic\.com[^>]*>\s*/g, "");

  const face = `@font-face {
        font-family: "Pretendard";
        src: url("fonts/PretendardVariable.woff2") format("woff2");
        font-weight: 100 900;
        font-display: block;
      }`;
  out = out.replace("<style>", `<style>\n      ${face}\n`);
  out = out.replaceAll('"Montserrat"', '"Pretendard"');
  out = out.replaceAll("'Montserrat'", "'Pretendard'");
  out = out.replaceAll("px Montserrat", "px Pretendard");
  out = out.replace(/text-transform:\s*lowercase;?/g, "/* no lowercase */");
  out = out.replace(/lang="en"/g, 'lang="ko"');
  out = out.replace(
    /https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@[^"]+\/dist\/gsap\.min\.js/g,
    "gsap.min.js",
  );

  out = out.replace(/font-size:\s*72px;/g, `font-size: ${DESIGN_FONT_SIZE}px;`);
  out = out.replace(
    /CAPTION_FONT_SIZE\s*=\s*Math\.round\(72\s*\*\s*layout\.fontScale\)/g,
    `CAPTION_FONT_SIZE = Math.round(${DESIGN_FONT_SIZE} * layout.fontScale)`,
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

async function main() {
  await access(SRC).catch(() => {
    throw new Error(
      `Missing ${SRC}\nCopy a talking-head MP4 to examples/ko-captions/source.mp4 first.`,
    );
  });
  await access(FONT);
  await access(COMPONENT);
  await access(WORDS_PATH);

  await mkdir(OUT_DIR, { recursive: true });
  await rm(PROJECT_DIR, { recursive: true, force: true });
  await mkdir(join(PROJECT_DIR, "fonts"), { recursive: true });

  const meta = await probe(SRC);
  const doc = JSON.parse(await readFile(WORDS_PATH, "utf8"));
  const ment = doc.ment;
  const words = doc.words;
  const captionData = buildCaptionData(words, ment, meta);

  let html = await readFile(COMPONENT, "utf8");
  html = patchWeightShiftHtml(html, meta);

  await copyFile(SRC, join(PROJECT_DIR, "source.mp4"));
  await copyFile(FONT, join(PROJECT_DIR, "fonts/PretendardVariable.woff2"));
  const gsap = resolveGsap();
  if (gsap) await copyFile(gsap, join(PROJECT_DIR, "gsap.min.js"));
  await writeFile(join(PROJECT_DIR, "caption-data.json"), JSON.stringify(captionData, null, 2));
  await writeFile(join(PROJECT_DIR, "index.html"), html, "utf8");
  await writeFile(
    join(PROJECT_DIR, "package.json"),
    JSON.stringify({ name: "ko-captions-weight-shift", private: true, type: "module" }, null, 2),
  );

  const outPath = join(OUT_DIR, "ko-weight-shift.mp4");
  const cli = resolveHyperFramesCli();
  const fps = Math.round(meta.fps) === 24 ? 24 : 30;
  console.log("render", { meta, cli, outPath });
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [cli, "render", PROJECT_DIR, "-o", outPath, "-q", "standard", "-f", String(fps)],
    { maxBuffer: 80 * 1024 * 1024, timeout: 1000 * 60 * 12 },
  );
  await writeFile(join(OUT_DIR, "render.log"), `${stdout}\n${stderr}`);
  console.log("DONE", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
