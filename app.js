/* global html2canvas, JSZip, saveAs */

const GENRE_LABELS = {
  education: "教育",
  programming: "プログラミング",
  selfhelp: "自己啓発",
};

const THEME_CLASSES = {
  education: "theme-education",
  programming: "theme-programming",
  selfhelp: "theme-self-improvement",
};

const state = {
  genre: "education",
  s1Title: "",
  s1Subtitle: "",
  s10Summary: {
    1: "",
    2: "",
    3: "",
  },
  slides: {
    2: { mini: "", body: "" },
    3: { mini: "", body: "" },
    4: { mini: "", body: "" },
    5: { mini: "", body: "" },
    6: { mini: "", body: "" },
    7: { mini: "", body: "" },
    8: { mini: "", body: "" },
    9: { mini: "", body: "" },
  },
};

const els = {};

let previewSlideEls = [];
let exportSlideEls = [];
let previewWrapEls = [];
let previewIndex = 0;
let isSyncingScroll = false;

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element not found: ${id}`);
  return el;
}

function clampText(s) {
  return (s ?? "").toString().replace(/\r\n/g, "\n").trimEnd();
}

function syncUiToState() {
  // Slide 1
  if (els.s1Title) state.s1Title = clampText(els.s1Title.value);
  if (els.s1Subtitle) state.s1Subtitle = clampText(els.s1Subtitle.value);
}

function parseBulkToSlides(raw, { splitByBlank = true } = {}) {
  const text = clampText(raw).trim();
  if (!text) return [];

  if (!splitByBlank) {
    // fallback: one line per slide body
    return text.split("\n").map((l) => ({ mini: "", body: l.trim() }));
  }

  const blocks = text
    .split(/\n{2,}/g)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map((b) => {
    const lines = b.split("\n");
    if (lines.length <= 1) return { mini: "", body: lines[0].trim() };
    const mini = lines[0].trim();
    const body = lines.slice(1).join("\n").trimEnd();
    return { mini, body };
  });
}

function buildSlides(container, isPreview) {
  container.innerHTML = "";
  const slides = [];
  const wraps = [];

  for (let i = 1; i <= 10; i++) {
    if (isPreview) {
      const wrap = document.createElement("div");
      wrap.className = "slideWrap";
      const slide = createSlideEl(i);
      wrap.appendChild(slide);
      container.appendChild(wrap);
      slides.push(slide);
      wraps.push(wrap);
    } else {
      const slide = createSlideEl(i);
      container.appendChild(slide);
      slides.push(slide);
    }
  }
  return { slides, wraps };
}

function createSlideEl(i) {
  const slide = document.createElement("div");
  slide.className = "slide";
  slide.dataset.slide = String(i);

  // decor (card-like frame + corner mark)
  const wedge = document.createElement("div");
  wedge.className = "slide__wedge";

  const frame = document.createElement("div");
  frame.className = "slide__frame";

  // Corner icons (pencil + bulb)
  // Use real DOM <img> (data URL SVG) for stable html2canvas export.
  // The SVG stroke color is injected from current theme (--t-accent) in updateCornerIconsForTheme().
  const cornerIcons = document.createElement("div");
  cornerIcons.className = "cornerIcons";
  cornerIcons.innerHTML = `
    <img class="cornerIcon cornerIcon--pencil" data-role="cornerPencil" alt="" aria-hidden="true" decoding="sync" loading="eager" />
    <img class="cornerIcon cornerIcon--bulb" data-role="cornerBulb" alt="" aria-hidden="true" decoding="sync" loading="eager" />
  `;

  const corner = document.createElement("div");
  corner.className = "slide__cornerMark";
  corner.innerHTML = `<div class="cornerMark__dot"></div>`;

  const inner = document.createElement("div");
  inner.className = "slide__inner";

  if (i === 1) {
    slide.classList.add("slide1");

    const top = document.createElement("div");
    top.className = "slide__top";

    const genreTag = document.createElement("div");
    genreTag.className = "s1__genreTag";
    genreTag.dataset.role = "s1Genre";
    genreTag.textContent = "";

    top.appendChild(genreTag);

    const center = document.createElement("div");
    center.className = "s1__center";

    const title = document.createElement("div");
    title.className = "s1__title";
    title.dataset.role = "s1Title";
    title.textContent = "";

    const subtitle = document.createElement("div");
    subtitle.className = "s1__subtitle";
    subtitle.dataset.role = "s1Subtitle";
    subtitle.textContent = "";

    center.appendChild(title);
    center.appendChild(subtitle);

    const logo = document.createElement("div");
    logo.className = "s1__logo";
    logo.dataset.role = "s1Logo";
    logo.textContent = "塾講師K5";

    inner.appendChild(top);
    inner.appendChild(center);
    inner.appendChild(logo);
  } else if (i === 10) {
    slide.classList.add("slide10");

    const top = document.createElement("div");
    top.className = "slide__top";

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.dataset.role = "themeBadge";
    badge.innerHTML = `<span class="badge__dot"></span><span>教育</span>`;
    top.appendChild(badge);

    const body = document.createElement("div");
    body.className = "slide__body";

    const sheet = document.createElement("div");
    sheet.className = "contentSheet contentSheet--cta";

    const profile = document.createElement("div");
    profile.className = "s10__profile";

    const avatar = document.createElement("img");
    avatar.className = "s10__avatarImg";
    avatar.src = "./favicon.jpg";
    avatar.alt = "プロフィール画像";
    avatar.loading = "eager";
    avatar.decoding = "sync";

    const pname = document.createElement("div");
    pname.className = "s10__name";
    pname.dataset.role = "authorName";
    pname.textContent = "";

    profile.appendChild(avatar);
    profile.appendChild(pname);

    const summaryBlock = document.createElement("div");
    summaryBlock.className = "s10__summaryBlock";
    summaryBlock.innerHTML = `
      <div class="s10__summaryTitle">SUMMARY / まとめ</div>
      <div class="s10__summary">
        <div class="s10__summaryLine" data-role="summary1"></div>
        <div class="s10__summaryLine" data-role="summary2"></div>
        <div class="s10__summaryLine" data-role="summary3"></div>
      </div>
    `;

    sheet.appendChild(summaryBlock);

    const pitch = document.createElement("div");
    pitch.className = "s10__pitch";
    pitch.innerHTML = `
      <div class="s10__pitchLine">noteで「会社員×塾講師の思考の裏側」を発信</div>
      <div class="s10__pitchLine">HPで「学びと成長の情報発信プラットフォーム」を運用</div>
      <div class="s10__pitchLink">（概要欄の詳細はプロフィールのリンクからチェックしてください👇）</div>
      <div class="s10__handle">@k5_jukukoshi</div>
    `;

    const follow = document.createElement("div");
    follow.className = "s10__follow";
    follow.innerHTML = `
      <div class="s10__followMain">良かったらフォローしてください！</div>
    `;

    sheet.appendChild(pitch);
    sheet.appendChild(follow);
    body.appendChild(sheet);

    inner.appendChild(top);
    inner.appendChild(body);
    inner.appendChild(profile);
  } else {
    const top = document.createElement("div");
    top.className = "slide__top";

    const badge = document.createElement("div");
    badge.className = "badge";
    badge.dataset.role = "themeBadge";
    badge.innerHTML = `<span class="badge__dot"></span><span>教育</span>`;

    top.appendChild(badge);

    const body = document.createElement("div");
    body.className = "slide__body";

    const sheet = document.createElement("div");
    sheet.className = "contentSheet";

    const stack = document.createElement("div");
    stack.className = "sheetStack";

    const mini = document.createElement("div");
    mini.className = "body__miniTitle";
    mini.dataset.role = `s${i}Mini`;
    mini.textContent = "";

    const main = document.createElement("div");
    main.className = "body__main";

    const text = document.createElement("div");
    text.className = "body__text";
    text.dataset.role = `s${i}Text`;
    text.textContent = "";

    main.appendChild(text);
    stack.appendChild(mini);
    stack.appendChild(main);
    sheet.appendChild(stack);
    body.appendChild(sheet);
    inner.appendChild(top);
    inner.appendChild(body);
  }

  const credit = document.createElement("div");
  credit.className = "slide__credit";
  credit.innerHTML = `<div class="num">${String(i).padStart(2, "0")}/10</div>`;

  slide.appendChild(wedge);
  slide.appendChild(frame);
  slide.appendChild(cornerIcons);
  slide.appendChild(corner);
  slide.appendChild(inner);
  slide.appendChild(credit);
  return slide;
}

function svgToDataUrl(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function buildPencilSvg(strokeHex) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="170" height="170" viewBox="0 0 170 170">
      <!-- Visually center the pencil inside the 170x170 box -->
      <g transform="translate(18 -2)" fill="none" stroke="${strokeHex}" stroke-opacity="0.16" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
        <!-- body (parallelogram): slightly to top-left -->
        <path transform="translate(-2 -2)" d="M40 120l14 14 76-76-14-14z"/>
        <!-- top short line: move down and slightly left so it overlaps the body (pattern-like) -->
        <path transform="translate(-3 15)" d="M110 34l14 14"/>
        <!-- tip triangle: slightly to bottom-left -->
        <path transform="translate(-2 2)" d="M36 134l18-4-14-14z"/>
      </g>
    </svg>
  `.trim();
}

function buildBulbSvg(strokeHex) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="170" height="170" viewBox="0 0 170 170">
      <g fill="none" stroke="${strokeHex}" stroke-opacity="0.14" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M85 28c-26 0-46 20-46 46 0 18 9 33 23 41v14h46V115c14-8 23-23 23-41 0-26-20-46-46-46z"/>
        <path d="M68 132h34M72 148h26"/>
      </g>
    </svg>
  `.trim();
}

function updateCornerIconsForTheme() {
  if (!els.appRoot) return;
  // Corner icons are used only for education theme
  if (state.genre !== "education") return;
  const cs = window.getComputedStyle(els.appRoot);
  const accent = (cs.getPropertyValue("--t-accent") || "").trim() || "#2E7D32";
  const pencilUrl = svgToDataUrl(buildPencilSvg(accent));
  const bulbUrl = svgToDataUrl(buildBulbSvg(accent));

  const applyToSlide = (slideEl) => {
    const p = slideEl?.querySelector('[data-role="cornerPencil"]');
    const b = slideEl?.querySelector('[data-role="cornerBulb"]');
    if (p) p.src = pencilUrl;
    if (b) b.src = bulbUrl;
  };

  for (let i = 0; i < previewSlideEls.length; i++) applyToSlide(previewSlideEls[i]);
  for (let i = 0; i < exportSlideEls.length; i++) applyToSlide(exportSlideEls[i]);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderAll() {
  syncUiToState();
  const root = els.appRoot;
  applyThemeClass(root, state.genre);
  updateCornerIconsForTheme();
  updateGenreTabsUi();

  // slide 1
  setRoleText(previewSlideEls[0], "themeBadge", themeBadgeHtml(false));
  setRoleText(exportSlideEls[0], "themeBadge", themeBadgeHtml(false));

  const genreLabel = GENRE_LABELS[state.genre] ?? "教育";
  setRoleText(previewSlideEls[0], "s1Genre", genreLabel);
  setRoleText(exportSlideEls[0], "s1Genre", genreLabel);

  setRoleText(previewSlideEls[0], "s1Title", state.s1Title || "（タイトル）");
  setRoleText(exportSlideEls[0], "s1Title", state.s1Title || "（タイトル）");
  applyS1TitleFitting();

  const s1Subtitle = clampText(state.s1Subtitle);
  // Keep slide1 subtitle behavior consistent across themes (manual formatting only)
  setRoleText(previewSlideEls[0], "s1Subtitle", s1Subtitle);
  setRoleText(exportSlideEls[0], "s1Subtitle", s1Subtitle);

  // slide 1 logo text (education cover uses compact mark)
  setRoleText(previewSlideEls[0], "s1Logo", "塾講師K5");
  setRoleText(exportSlideEls[0], "s1Logo", "塾講師K5");

  // slides 2-9
  for (let i = 2; i <= 9; i++) {
    const mini = clampText(state.slides[i]?.mini) || "";
    const body = clampText(state.slides[i]?.body) || `（スライド${i}）`;
    setRoleText(previewSlideEls[i - 1], "themeBadge", themeBadgeHtml(false));
    setRoleText(exportSlideEls[i - 1], "themeBadge", themeBadgeHtml(false));
    setRoleText(previewSlideEls[i - 1], `s${i}Mini`, mini);
    setRoleText(exportSlideEls[i - 1], `s${i}Mini`, mini);
    setRoleText(previewSlideEls[i - 1], `s${i}Text`, body);
    setRoleText(exportSlideEls[i - 1], `s${i}Text`, body);
  }

  applyBodyTextFitting();

  // slide 10
  setRoleText(previewSlideEls[9], "themeBadge", themeBadgeHtml(false));
  setRoleText(exportSlideEls[9], "themeBadge", themeBadgeHtml(false));

  setRoleText(previewSlideEls[9], "authorName", "塾講師K5");
  setRoleText(exportSlideEls[9], "authorName", "塾講師K5");
  const sum = [
    clampText(state.s10Summary[1]) || "",
    clampText(state.s10Summary[2]) || "",
    clampText(state.s10Summary[3]) || "",
  ];
  setRoleText(previewSlideEls[9], "summary1", sum[0] ?? "");
  setRoleText(previewSlideEls[9], "summary2", sum[1] ?? "");
  setRoleText(previewSlideEls[9], "summary3", sum[2] ?? "");
  setRoleText(exportSlideEls[9], "summary1", sum[0] ?? "");
  setRoleText(exportSlideEls[9], "summary2", sum[1] ?? "");
  setRoleText(exportSlideEls[9], "summary3", sum[2] ?? "");
}

function updateGenreTabsUi() {
  if (!els.genreTabs || els.genreTabs.length === 0) return;
  for (const btn of els.genreTabs) {
    const isActive = btn.dataset.genre === state.genre;
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  }
}

function applyS1TitleFitting() {
  const previewTitle = previewSlideEls[0]?.querySelector('[data-role="s1Title"]');
  const exportTitle = exportSlideEls[0]?.querySelector('[data-role="s1Title"]');
  if (!previewTitle || !exportTitle) return;

  // CSSのテーマ別font-sizeを基準に縮小するため、まずインライン指定を解除
  previewTitle.style.removeProperty("font-size");
  exportTitle.style.removeProperty("font-size");

  fitTextToWidth(previewTitle, {
    startPx: parseFloat(window.getComputedStyle(previewTitle).fontSize) || 88,
    minPx: 34,
    stepPx: 1,
  });
  fitTextToWidth(exportTitle, {
    startPx: parseFloat(window.getComputedStyle(exportTitle).fontSize) || 88,
    minPx: 34,
    stepPx: 1,
  });
}

function applyBodyTextFitting() {
  // Programming theme tends to wrap/clip more; auto-fit so it never clips.
  const isProgramming = state.genre === "programming";

  for (let i = 2; i <= 9; i++) {
    const previewText = previewSlideEls[i - 1]?.querySelector(`[data-role="s${i}Text"]`);
    const exportText = exportSlideEls[i - 1]?.querySelector(`[data-role="s${i}Text"]`);
    const exportBodyBox =
      exportSlideEls[i - 1]?.querySelector(".body__main") ??
      exportSlideEls[i - 1]?.querySelector(".contentSheet");
    if (!previewText || !exportText || !exportBodyBox) continue;

    if (!isProgramming) {
      previewText.style.removeProperty("font-size");
      previewText.style.removeProperty("line-height");
      exportText.style.removeProperty("font-size");
      exportText.style.removeProperty("line-height");
      continue;
    }

    const fitted = fitTextToSheet(exportBodyBox, exportText, {
      startPx: 54,
      minPx: 34,
      stepPx: 2,
      lineHeight: 1.26,
    });

    previewText.style.fontSize = `${fitted.fontPx}px`;
    previewText.style.lineHeight = String(fitted.lineHeight);
  }
}

function fitTextToWidth(textEl, { startPx, minPx, stepPx }) {
  // reset
  textEl.style.fontSize = `${startPx}px`;

  // clientWidthは要素のレイアウト幅（max-width含む）。nowrap前提でscrollWidthと比較する。
  const available = Math.max(0, textEl.clientWidth);
  if (!available) return { fontPx: startPx };

  let fontPx = startPx;
  // +1 はフォントの丸め誤差対策
  while (fontPx > minPx && textEl.scrollWidth > available + 1) {
    fontPx -= stepPx;
    textEl.style.fontSize = `${fontPx}px`;
  }
  return { fontPx };
}

function fitTextToSheet(sheetEl, textEl, { startPx, minPx, stepPx, lineHeight }) {
  // reset
  textEl.style.fontSize = `${startPx}px`;
  textEl.style.lineHeight = String(lineHeight);

  const cs = window.getComputedStyle(sheetEl);
  const padTop = parseFloat(cs.paddingTop) || 0;
  const padBottom = parseFloat(cs.paddingBottom) || 0;
  const available = Math.max(0, sheetEl.clientHeight - padTop - padBottom);

  let fontPx = startPx;
  while (fontPx > minPx && textEl.scrollHeight > available + 1) {
    fontPx -= stepPx;
    textEl.style.fontSize = `${fontPx}px`;
  }
  return { fontPx, lineHeight };
}

function buildSummaryLines() {
  const lines = [];
  for (let i = 2; i <= 9; i++) {
    const t = clampText(state.slides[i]?.body);
    if (!t) continue;
    const first = t
      .split("\n")[0]
      .replace(/^[-*•]\s*/u, "")
      .trim();
    if (first) lines.push(first);
    if (lines.length >= 3) break;
  }
  while (lines.length < 3) lines.push("要点を入力するとここに自動表示されます。");
  return lines.slice(0, 3);
}

function applyThemeClass(rootEl, genre) {
  const classes = Object.values(THEME_CLASSES);
  for (const c of classes) rootEl.classList.remove(c);
  const next = THEME_CLASSES[genre] ?? THEME_CLASSES.education;
  rootEl.classList.add(next);
}

function distributeBulk() {
  const raw = clampText(els.bulkPaste.value);
  const splitByBlank = !!els.bulkIgnoreBlank.checked;
  const blocks = parseBulkToSlides(raw, { splitByBlank });

  // Block 1 -> Slide 1 (title/subtitle)
  if (blocks.length >= 1) {
    const b0 = blocks[0];
    const title = clampText(b0?.mini ?? "");
    const subtitle = clampText(b0?.body ?? "");
    state.s1Title = title;
    state.s1Subtitle = subtitle;
    if (els.s1Title) els.s1Title.value = title;
    if (els.s1Subtitle) els.s1Subtitle.value = subtitle;
  }

  // Block 2..9 -> Slides 2..9
  for (let i = 2; i <= 9; i++) {
    const idx = (i - 2) + 1;
    const b = blocks[idx];
    state.slides[i].mini = clampText(b?.mini ?? "");
    state.slides[i].body = clampText(b?.body ?? "");
  }

  // Block 10 -> Slide 10 summary (3 lines)
  {
    const b10 = blocks[9];
    const lines = [];
    if (b10) {
      const head = clampText(b10.mini);
      if (head) lines.push(head);
      const rest = clampText(b10.body);
      if (rest) lines.push(...rest.split("\n").map((l) => l.trim()).filter(Boolean));
    }
    state.s10Summary[1] = lines[0] ?? "";
    state.s10Summary[2] = lines[1] ?? "";
    state.s10Summary[3] = lines[2] ?? "";
  }

  // If there are more blocks beyond 10, append them to slide 9 body
  if (blocks.length > 10) {
    const rest = blocks.slice(10);
    const appended = rest
      .map((b) => {
        const m = clampText(b?.mini ?? "");
        const body = clampText(b?.body ?? "");
        return [m, body].filter(Boolean).join("\n");
      })
      .filter(Boolean)
      .join("\n\n");
    const cur = clampText(state.slides[9].body);
    const next = cur ? `${cur}\n\n${appended}` : appended;
    state.slides[9].body = clampText(next);
  }

  renderAll();
}

function renderS1SubtitleAsChecks(slideEl, raw) {
  const el = slideEl.querySelector('[data-role="s1Subtitle"]');
  if (!el) return;

  const text = clampText(raw);
  if (!text) {
    el.textContent = "";
    return;
  }

  const lines = text
    .split("\n")
    .map((l) => l.replace(/^[-*•]\s*/u, "").trim())
    .filter(Boolean);

  // single line: keep plain
  if (lines.length <= 1) {
    el.textContent = text;
    return;
  }

  el.innerHTML = `
    <div class="s1Checks">
      ${lines
        .map(
          (l) => `<div class="s1CheckItem"><span class="s1CheckIcon">✓</span><span>${escapeHtml(l)}</span></div>`
        )
        .join("")}
    </div>
  `;
}

function setRoleText(slideEl, role, text) {
  const el = slideEl.querySelector(`[data-role="${role}"]`);
  if (!el) return;
  // themeBadge needs innerHTML to keep the dot
  if (role === "themeBadge") {
    el.innerHTML = text;
    return;
  }
  el.textContent = text;
}

function themeBadgeHtml(withLabel = false) {
  const label = GENRE_LABELS[state.genre] ?? "教育";
  if (!withLabel) return `<span class="badge__dot"></span>`;
  return `<span class="badge__dot"></span><span>${escapeHtml(label)}</span>`;
}

function setStatus(el, text) {
  el.textContent = text;
}

function ensureLibs() {
  if (typeof html2canvas !== "function") throw new Error("html2canvas が読み込めていません（CDNを確認してください）。");
  if (els.downloadMode.value === "zip") {
    if (typeof JSZip !== "function") throw new Error("JSZip が読み込めていません（CDNを確認してください）。");
    if (typeof saveAs !== "function") throw new Error("FileSaver が読み込めていません（CDNを確認してください）。");
  }
}

async function downloadAll() {
  ensureLibs();
  els.downloadAllBtn.disabled = true;
  setStatus(els.downloadStatus, "準備中…");

  try {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((r) => setTimeout(r, 1200)),
      ]);
    }

    const genreLabel = GENRE_LABELS[state.genre] ?? "education";
    const baseName = `carousel_${genreLabel}_${getDateStamp()}`;
    const mode = els.downloadMode.value;

    if (mode === "zip") {
      const zip = new JSZip();
      for (let i = 1; i <= 10; i++) {
        setStatus(els.downloadStatus, `${i}/10 を書き出し中…`);
        const blob = await slideToPngBlob(exportSlideEls[i - 1]);
        const filename = `${baseName}_${String(i).padStart(2, "0")}.png`;
        zip.file(filename, blob);
      }
      setStatus(els.downloadStatus, "ZIP生成中…");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${baseName}.zip`);
      setStatus(els.downloadStatus, "完了（ZIPを保存しました）");
    } else {
      for (let i = 1; i <= 10; i++) {
        setStatus(els.downloadStatus, `${i}/10 をダウンロード中…`);
        const blob = await slideToPngBlob(exportSlideEls[i - 1]);
        const filename = `${baseName}_${String(i).padStart(2, "0")}.png`;
        await triggerDownload(blob, filename);
        // ブラウザのダウンロード制限対策で少し待つ
        await sleep(260);
      }
      setStatus(els.downloadStatus, "完了（10枚ダウンロード）");
    }
  } catch (e) {
    setStatus(els.downloadStatus, `エラー: ${e?.message ?? e}`);
  } finally {
    els.downloadAllBtn.disabled = false;
    window.setTimeout(() => setStatus(els.downloadStatus, ""), 3200);
  }
}

async function slideToPngBlob(slideEl) {
  const canvas = await html2canvas(slideEl, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    width: 1080,
    height: 1350,
    windowWidth: 1080,
    windowHeight: 1350,
  });

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG生成に失敗しました"))),
      "image/png",
      1.0
    );
  });
  return blob;
}

async function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function getDateStamp() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}${m}${day}_${hh}${mm}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function init() {
  els.appRoot = $("appRoot");
  // Genre tabs (select removed)
  els.genreTabs = Array.from(document.querySelectorAll(".genreTab"));
  // Slide1 inputs are optional (when using bulk paste only)
  els.s1Title = document.getElementById("s1Title");
  els.s1Subtitle = document.getElementById("s1Subtitle");
  els.bulkPaste = $("bulkPaste");
  els.bulkIgnoreBlank = $("bulkIgnoreBlank");
  els.bulkDistributeBtn = $("bulkDistributeBtn");
  els.bulkClearBtn = $("bulkClearBtn");
  els.downloadMode = $("downloadMode");
  els.downloadAllBtn = $("downloadAllBtn");
  els.downloadStatus = $("downloadStatus");
  els.previewList = $("previewList");
  els.previewViewport = $("previewViewport");
  els.exportArea = $("exportArea");

  // slides DOM
  const previewBuilt = buildSlides(els.previewList, true);
  previewSlideEls = previewBuilt.slides;
  previewWrapEls = previewBuilt.wraps;

  const exportBuilt = buildSlides(els.exportArea, false);
  exportSlideEls = exportBuilt.slides;

  // responsive preview scale
  const onResize = () => updatePreviewScale();
  window.addEventListener("resize", onResize);
  updatePreviewScale();

  // events
  for (const btn of els.genreTabs) {
    btn.addEventListener("click", () => {
      const next = btn.dataset.genre;
      if (!next) return;
      state.genre = next;
      renderAll();
    });
  }
  const onS1 = () => renderAll();
  if (els.s1Title) {
    els.s1Title.addEventListener("input", onS1);
    els.s1Title.addEventListener("change", onS1);
  }
  if (els.s1Subtitle) {
    els.s1Subtitle.addEventListener("input", onS1);
    els.s1Subtitle.addEventListener("change", onS1);
  }

  els.bulkDistributeBtn.addEventListener("click", distributeBulk);
  els.bulkClearBtn.addEventListener("click", () => {
    els.bulkPaste.value = "";
  });

  els.downloadAllBtn.addEventListener("click", downloadAll);

  els.previewViewport.addEventListener("scroll", () => onPreviewScroll());

  // start at slide 1 (no arrows/slider UI; user scrolls)
  goToPreview(0, { smooth: false });

  renderAll();
}

function updatePreviewScale() {
  const vp = els.previewViewport;
  if (!vp) return;
  const available = Math.max(240, vp.clientWidth);
  const scale = Math.min(0.27, Math.max(0.16, available / 1080));
  els.appRoot.style.setProperty("--previewScale", String(scale));
}

function goToPreview(idx, { smooth = true } = {}) {
  const next = Math.max(0, Math.min(9, idx));
  const wrap = previewWrapEls[next];
  if (!wrap) return;
  previewIndex = next;

  isSyncingScroll = true;
  wrap.scrollIntoView({ behavior: smooth ? "smooth" : "auto", inline: "start", block: "nearest" });
  window.setTimeout(() => {
    isSyncingScroll = false;
  }, smooth ? 350 : 0);
}

let previewScrollRaf = 0;
function onPreviewScroll() {
  if (isSyncingScroll) return;
  if (previewScrollRaf) return;
  previewScrollRaf = window.requestAnimationFrame(() => {
    previewScrollRaf = 0;
    const vp = els.previewViewport;
    if (!vp || previewWrapEls.length === 0) return;
    const x = vp.scrollLeft;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < previewWrapEls.length; i++) {
      const dist = Math.abs(previewWrapEls[i].offsetLeft - x);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx !== previewIndex) {
      previewIndex = bestIdx;
    }
  });
}

document.addEventListener("DOMContentLoaded", init);


