import { Editor, Node, getMarkRange } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import Color from "@tiptap/extension-color";
import { BackgroundColor, TextStyle } from "@tiptap/extension-text-style";
import BoldIcon from "@tabler/icons/outline/bold.svg";
import ItalicIcon from "@tabler/icons/outline/italic.svg";
import UnderlineIcon from "@tabler/icons/outline/underline.svg";
import StrikeIcon from "@tabler/icons/outline/strikethrough.svg";
import BulletListIcon from "@tabler/icons/outline/list.svg";
import NumberedListIcon from "@tabler/icons/outline/list-numbers.svg";
import QuoteIcon from "@tabler/icons/outline/quote.svg";
import CodeIcon from "@tabler/icons/outline/code.svg";
import TextColorIcon from "@tabler/icons/outline/color-swatch.svg";
import BackgroundColorIcon from "@tabler/icons/outline/highlight.svg";
import LinkIcon from "@tabler/icons/outline/link.svg";
import ImageIcon from "@tabler/icons/outline/photo.svg";
import EmbedIcon from "@tabler/icons/outline/player-play.svg";
import TableIcon from "@tabler/icons/outline/table.svg";
import UndoIcon from "@tabler/icons/outline/arrow-back-up.svg";
import RedoIcon from "@tabler/icons/outline/arrow-forward-up.svg";
import RowBeforeIcon from "@tabler/icons/outline/row-insert-top.svg";
import RowAfterIcon from "@tabler/icons/outline/row-insert-bottom.svg";
import RowRemoveIcon from "@tabler/icons/outline/row-remove.svg";
import ColumnBeforeIcon from "@tabler/icons/outline/column-insert-left.svg";
import ColumnAfterIcon from "@tabler/icons/outline/column-insert-right.svg";
import ColumnRemoveIcon from "@tabler/icons/outline/column-remove.svg";
import HeaderRowIcon from "@tabler/icons/outline/table-row.svg";
import DeleteTableIcon from "@tabler/icons/outline/trash.svg";
import CloseIcon from "@tabler/icons/outline/x.svg";
import EN_MESSAGES from "../../bd_editor/locale/en.json";
import TR_MESSAGES from "../../bd_editor/locale/tr.json";

const MESSAGES = { en: EN_MESSAGES, tr: TR_MESSAGES };
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;
const formsWithSubmitHandler = new WeakSet();
let editorInstanceCount = 0;

const TEXT_COLOR_PALETTE = [
  { key: "colorCharcoal", value: "#1f2937" },
  { key: "colorBlue", value: "#1d4ed8" },
  { key: "colorRed", value: "#b91c1c" },
  { key: "colorGreen", value: "#15803d" },
  { key: "colorPurple", value: "#7e22ce" },
  { key: "colorOrange", value: "#b45309" },
];

const BACKGROUND_COLOR_PALETTE = [
  { key: "backgroundYellow", value: "#fef08a" },
  { key: "backgroundBlue", value: "#bfdbfe" },
  { key: "backgroundGreen", value: "#bbf7d0" },
  { key: "backgroundRose", value: "#fecdd3" },
  { key: "backgroundPurple", value: "#ddd6fe" },
  { key: "backgroundGray", value: "#e2e8f0" },
];

function canonicalEmbedUrl(rawUrl, providers) {
  if (typeof rawUrl !== "string" || rawUrl.length > 2048) return null;

  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (
    providers.includes("youtube") &&
    ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(
      url.hostname.toLowerCase(),
    )
  ) {
    let videoId = null;
    if (url.hostname.toLowerCase() === "youtu.be" && parts.length) {
      videoId = parts[0];
    } else if (parts[0] === "watch") {
      videoId = url.searchParams.get("v");
    } else if (["embed", "shorts", "live"].includes(parts[0]) && parts.length > 1) {
      videoId = parts[1];
    }
    if (videoId && YOUTUBE_ID.test(videoId)) {
      return `https://www.youtube-nocookie.com/embed/${videoId}`;
    }
  }

  if (
    providers.includes("vimeo") &&
    ["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname.toLowerCase())
  ) {
    const videoId =
      url.hostname.toLowerCase() === "player.vimeo.com"
        ? parts.length === 2 && parts[0] === "video"
          ? parts[1]
          : null
        : parts.length === 1
          ? parts[0]
          : null;
    if (videoId && VIMEO_ID.test(videoId)) {
      return `https://player.vimeo.com/video/${videoId}`;
    }
  }

  return null;
}

function createVideoEmbedExtension(providers) {
  return Node.create({
    name: "bdVideoEmbed",
    group: "block",
    atom: true,
    selectable: true,

    addAttributes() {
      return { src: { default: null } };
    },

    parseHTML() {
      return [
        {
          tag: "iframe[src]",
          getAttrs: (element) => {
            const src = canonicalEmbedUrl(element.getAttribute("src"), providers);
            return src ? { src } : false;
          },
        },
      ];
    },

    renderHTML({ node }) {
      const src = canonicalEmbedUrl(node.attrs.src, providers);
      if (!src) return ["span", { "data-bd-invalid-embed": "true" }];
      return [
        "iframe",
        {
          src,
          title: "Embedded video",
          width: "640",
          height: "360",
          loading: "lazy",
          referrerpolicy: "strict-origin-when-cross-origin",
          allow: "encrypted-media; fullscreen; picture-in-picture",
        },
      ];
    },

    addCommands() {
      return {
        insertBdVideo:
          ({ src }) =>
          ({ commands }) => {
            const canonical = canonicalEmbedUrl(src, providers);
            if (!canonical) return false;
            return commands.insertContent({ type: this.name, attrs: { src: canonical } });
          },
      };
    },
  });
}

function isSafeLink(value) {
  try {
    const url = new URL(value, window.location.href);
    return (
      ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function isSafeImageUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

const SafeImage = Image.extend({
  addAttributes() {
    const parentAttributes = this.parent?.() || {};
    return {
      ...parentAttributes,
      src: {
        ...parentAttributes.src,
        parseHTML: (element) => {
          const value = element.getAttribute("src");
          return isSafeImageUrl(value) ? value : null;
        },
      },
    };
  },
});

function createIcon(source) {
  const svgDocument = new DOMParser().parseFromString(source, "image/svg+xml");
  const svg = document.importNode(svgDocument.documentElement, true);
  svg.classList.add("bd-editor-icon");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  return svg;
}

function formatFileSize(size) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

async function readImageDimensions(file) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("The browser could not decode this image."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function createDraftStore({ source, form, config, messages, status }) {
  if (!config.enabled) return null;

  const objectId = form?.querySelector('input[name="id"]')?.value || "new";
  const modelLabel = source.dataset.bdModelLabel || "form";
  const fieldName = source.name || source.id || "content";
  const storageKey = [
    "bd-editor",
    "draft",
    "v1",
    encodeURIComponent(window.location.pathname),
    encodeURIComponent(modelLabel),
    encodeURIComponent(objectId),
    encodeURIComponent(fieldName),
  ].join(":");
  const pendingKey = `${storageKey}:submitted`;
  let submitStarted = false;

  function hasFormErrors() {
    return Boolean(form?.querySelector(".errorlist, .errornote, [aria-invalid='true']"));
  }

  function restore() {
    try {
      if (window.sessionStorage.getItem(pendingKey) === "1") {
        if (!hasFormErrors()) window.localStorage.removeItem(storageKey);
        window.sessionStorage.removeItem(pendingKey);
      }

      const rawDraft = window.localStorage.getItem(storageKey);
      if (!rawDraft) return null;

      const draft = JSON.parse(rawDraft);
      if (
        typeof draft.content !== "string" ||
        typeof draft.expiresAt !== "number" ||
        typeof draft.sourceMode !== "boolean"
      ) {
        window.localStorage.removeItem(storageKey);
        status.textContent = messages.draftStorageError;
        return null;
      }
      if (draft.expiresAt <= Date.now()) {
        window.localStorage.removeItem(storageKey);
        status.textContent = messages.draftExpired;
        return null;
      }
      return draft;
    } catch {
      status.textContent = messages.draftStorageError;
      return null;
    }
  }

  function save(content, sourceMode) {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          content,
          sourceMode,
          expiresAt: Date.now() + config.ttl_days * 24 * 60 * 60 * 1000,
        }),
      );
      status.textContent = messages.draftSaved;
    } catch {
      status.textContent = messages.draftStorageError;
    }
  }

  function markSubmitted() {
    try {
      submitStarted = true;
      window.sessionStorage.setItem(pendingKey, "1");
    } catch {
      status.textContent = messages.draftStorageError;
    }
  }

  function clear() {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      status.textContent = messages.draftStorageError;
    }
  }

  return {
    restore,
    save,
    markSubmitted,
    clear,
    hasFormErrors,
    isSubmitting: () => submitStarted,
  };
}

function initializeEditor(source) {
  if (source.dataset.bdInitialized === "true") return;

  let config;
  try {
    config = JSON.parse(source.dataset.bdConfig);
  } catch (error) {
    console.error("BD-Editor received invalid widget configuration.", error);
    return;
  }

  const root = source.nextElementSibling;
  if (!root?.matches("[data-bd-editor-root]")) return;

  const locale = MESSAGES[source.dataset.bdLocale] ? source.dataset.bdLocale : "en";
  const messages = MESSAGES[locale];
  const toolbar = root.querySelector(".bd-editor-toolbar");
  const rows = {
    primary: root.querySelector("[data-bd-toolbar-primary]"),
    format: root.querySelector("[data-bd-toolbar-format]"),
    table: root.querySelector("[data-bd-toolbar-table]"),
  };
  const canvas = root.querySelector(".bd-editor-canvas");
  const sourceWrapper = root.querySelector(".bd-editor-source-wrapper");
  const sourceView = root.querySelector(".bd-editor-source-view");
  const sourceLabel = root.querySelector(".bd-editor-source-label");
  const status = root.querySelector(".bd-editor-status");
  const modeSwitch = root.querySelector(".bd-editor-mode-switch");
  const textModeButton = root.querySelector('[data-bd-mode="text"]');
  const sourceModeButton = root.querySelector('[data-bd-mode="source"]');
  const toolbarConfig = config.toolbar || {};
  const form = source.closest("form");
  const instanceId = `${source.id || "bd-editor"}-${++editorInstanceCount}`;
  const draftStore = createDraftStore({
    source,
    form,
    config: config.drafts || { enabled: false },
    messages,
    status,
  });
  const restoredDraft = draftStore?.restore();
  let sourceMode = Boolean(restoredDraft?.sourceMode);
  let editor = null;
  let draftTimer = null;
  const buttonRefs = new Map();
  const tableActions = new Map();
  const colorMenus = new Map();

  toolbar.setAttribute("aria-label", messages.toolbar);
  rows.table.setAttribute("aria-label", messages.tableTools);
  modeSwitch.setAttribute("aria-label", messages.modeSwitch);
  modeSwitch.hidden = !toolbarConfig.source;
  textModeButton.textContent = messages.modeText;
  sourceModeButton.textContent = messages.modeSource;
  sourceLabel.textContent = messages.sourceLabel;
  canvas.id = `${instanceId}-visual`;
  sourceView.id = `${instanceId}-source`;
  sourceLabel.htmlFor = sourceView.id;
  textModeButton.setAttribute("aria-controls", canvas.id);
  sourceModeButton.setAttribute("aria-controls", sourceView.id);
  textModeButton.setAttribute("aria-pressed", String(!sourceMode));
  sourceModeButton.setAttribute("aria-pressed", String(sourceMode));

  for (const [dialogName, titleSelector] of [
    ["image", "[data-bd-image-title]"],
    ["link", "[data-bd-link-title]"],
    ["embed", "[data-bd-embed-title]"],
    ["table", "[data-bd-table-title]"],
  ]) {
    const dialog = root.querySelector(`[data-bd-dialog="${dialogName}"]`);
    const title = dialog.querySelector(titleSelector);
    title.id = `${instanceId}-${dialogName}-title`;
    dialog.setAttribute("aria-labelledby", title.id);
  }

  if (restoredDraft?.sourceMode) {
    sourceView.value = restoredDraft.content;
  }

  function currentContent() {
    return sourceMode ? sourceView.value : editor?.getHTML() || source.value;
  }

  function scheduleDraftSave() {
    if (!draftStore) return;
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(
      () => draftStore.save(currentContent(), sourceMode),
      500,
    );
  }

  function addSeparator(rowName) {
    const separator = document.createElement("span");
    separator.className = "bd-editor-toolbar-separator";
    separator.setAttribute("role", "separator");
    separator.setAttribute("aria-orientation", "vertical");
    rows[rowName].append(separator);
  }

  function addButton(name, icon, action, rowName, extraClass = "") {
    if (!toolbarConfig[name] && rowName !== "table") return null;

    const button = document.createElement("button");
    button.type = "button";
    button.className = `bd-editor-tool-button ${extraClass}`.trim();
    button.title = messages[name];
    button.dataset.tooltip = messages[name];
    button.setAttribute("aria-label", messages[name]);
    button.setAttribute("aria-pressed", "false");
    button.append(createIcon(icon));
    button.addEventListener("click", action);
    rows[rowName].append(button);
    buttonRefs.set(name, button);
    return button;
  }

  function getLinkContext() {
    const selection = editor.state.selection;
    const markType = editor.schema.marks.link;
    let linkRange = null;
    if (editor.isActive("link")) {
      linkRange = getMarkRange(editor.state.doc.resolve(selection.from), markType);
      if (!linkRange && selection.from > 0) {
        linkRange = getMarkRange(editor.state.doc.resolve(selection.from - 1), markType);
      }
      if (
        linkRange &&
        (selection.from < linkRange.from || selection.to > linkRange.to)
      ) {
        linkRange = null;
      }
    }

    const range = linkRange || { from: selection.from, to: selection.to };
    return {
      from: range.from,
      to: range.to,
      href: editor.isActive("link") ? editor.getAttributes("link").href || "" : "",
      text: editor.state.doc.textBetween(range.from, range.to, " "),
      marks: selection.$from.marks().filter((mark) => mark.type !== markType),
      existing: Boolean(linkRange),
    };
  }

  const editorContent = restoredDraft && !restoredDraft.sourceMode
    ? restoredDraft.content
    : source.value || "<p></p>";
  editor = new Editor({
    element: canvas,
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: false,
          linkOnPaste: false,
          isAllowedUri: isSafeLink,
        },
      }),
      TextStyle,
      Color,
      BackgroundColor,
      SafeImage.configure({ allowBase64: false }),
      TableKit.configure({ table: { resizable: true } }),
      createVideoEmbedExtension(config.embeds?.providers || []),
    ],
    content: editorContent,
    editorProps: { attributes: { "aria-label": messages.editor } },
    onUpdate: () => {
      if (!editor) return;
      source.value = editor.getHTML();
      status.textContent = "";
      updateToolbar();
      scheduleDraftSave();
    },
    onSelectionUpdate: updateToolbar,
  });

  function openDialog(dialog) {
    if (!dialog.open) dialog.showModal();
  }

  function closeDialog(dialog, restoreEditorFocus = true) {
    if (dialog.open) dialog.close();
    if (restoreEditorFocus && !sourceMode) editor.commands.focus();
  }

  function setEditorMode(nextSourceMode, { preserveSource = false } = {}) {
    closeColorMenus();
    if (nextSourceMode) {
      sourceMode = true;
      sourceWrapper.hidden = false;
      canvas.hidden = true;
      if (!preserveSource) sourceView.value = editor.getHTML();
      source.value = sourceView.value;
      sourceView.focus();
    } else {
      try {
        editor.commands.setContent(sourceView.value);
        source.value = editor.getHTML();
      } catch {
        status.textContent = messages.invalidSource;
        sourceMode = true;
        sourceWrapper.hidden = false;
        canvas.hidden = true;
        sourceView.focus();
        updateToolbar();
        return;
      }
      sourceMode = false;
      sourceWrapper.hidden = true;
      canvas.hidden = false;
      editor.commands.focus();
      status.textContent = "";
    }

    textModeButton.setAttribute("aria-pressed", String(!sourceMode));
    sourceModeButton.setAttribute("aria-pressed", String(sourceMode));
    root.dataset.sourceMode = String(sourceMode);
    updateToolbar();
    scheduleDraftSave();
  }

  function updateToolbar() {
    if (!editor || editor.isDestroyed) return;
    const activeNames = {
      bold: "bold",
      italic: "italic",
      underline: "underline",
      strike: "strike",
      bullet_list: "bulletList",
      ordered_list: "orderedList",
      blockquote: "blockquote",
      code_block: "codeBlock",
      link: "link",
    };

    for (const [name, button] of buttonRefs) {
      if (activeNames[name]) {
        button.setAttribute("aria-pressed", String(editor.isActive(activeNames[name])));
      }
      if (name === "undo") button.disabled = sourceMode || !editor.can().undo();
      if (name === "redo") button.disabled = sourceMode || !editor.can().redo();
      if (name !== "undo" && name !== "redo") button.disabled = sourceMode;
    }

    const textStyle = editor.getAttributes("textStyle");
    const currentColors = {
      text_color: textStyle.color || "",
      background_color: textStyle.backgroundColor || "",
    };
    for (const [name, menuState] of colorMenus) {
      const currentColor = currentColors[name];
      menuState.button.setAttribute("aria-pressed", String(Boolean(currentColor)));
      for (const option of menuState.menu.querySelectorAll("[data-bd-color-value]")) {
        option.setAttribute("aria-pressed", String(option.dataset.bdColorValue === currentColor));
      }
    }

    const headingSelect = buttonRefs.get("heading");
    if (headingSelect) {
      const level = [1, 2, 3, 4, 5, 6].find((item) =>
        editor.isActive("heading", { level: item }),
      );
      headingSelect.value = level ? String(level) : "paragraph";
      headingSelect.disabled = sourceMode;
    }

    const inTable = editor.isActive("table");
    rows.table.hidden = sourceMode || !toolbarConfig.table || !inTable;
    for (const [name, command] of tableActions) {
      const button = buttonRefs.get(name);
      button.disabled = sourceMode || !inTable || !editor.can()[command]();
    }
  }

  function showLinkDialog() {
    const dialog = root.querySelector('[data-bd-dialog="link"]');
    const textField = dialog.querySelector("[data-bd-link-text]");
    const urlField = dialog.querySelector("[data-bd-link-url]");
    const error = dialog.querySelector("[data-bd-link-error]");
    const removeButton = dialog.querySelector("[data-bd-link-remove]");
    const context = getLinkContext();

    dialog.querySelector("[data-bd-link-title]").textContent = messages.link;
    dialog.querySelector("[data-bd-link-text-label]").textContent = messages.linkText;
    dialog.querySelector("[data-bd-link-url-label]").textContent = messages.linkUrl;
    dialog.querySelector("[data-bd-link-apply]").textContent = messages.applyLink;
    dialog.querySelector("[data-bd-link-cancel]").textContent = messages.cancel;
    dialog.querySelector("[data-bd-link-close]").title = messages.close;
    dialog.querySelector("[data-bd-link-close]").setAttribute("aria-label", messages.close);
    dialog.querySelector("[data-bd-link-close]").replaceChildren(createIcon(CloseIcon));
    removeButton.textContent = messages.removeLink;
    removeButton.hidden = !context.existing;
    error.textContent = "";
    textField.value = context.text;
    urlField.value = context.href;
    dialog.__bdContext = context;
    openDialog(dialog);
    (context.href ? urlField : textField).focus();
  }

  function applyLink() {
    const dialog = root.querySelector('[data-bd-dialog="link"]');
    const textField = dialog.querySelector("[data-bd-link-text]");
    const urlField = dialog.querySelector("[data-bd-link-url]");
    const error = dialog.querySelector("[data-bd-link-error]");
    const context = dialog.__bdContext;
    const text = textField.value.trim();
    const href = urlField.value.trim();

    if (!isSafeLink(href)) {
      error.textContent = messages.invalidLink;
      urlField.focus();
      return;
    }
    if (!text) {
      error.textContent = messages.linkTextRequired;
      textField.focus();
      return;
    }

    const linkMark = editor.schema.marks.link.create({ href });
    const linkedText = editor.schema.text(text, [...context.marks, linkMark]);
    editor
      .chain()
      .focus()
      .insertContentAt({ from: context.from, to: context.to }, linkedText)
      .run();
    closeDialog(dialog);
  }

  const linkDialog = root.querySelector('[data-bd-dialog="link"]');
  linkDialog.querySelector("[data-bd-link-apply]").addEventListener("click", applyLink);
  linkDialog.querySelector("[data-bd-link-cancel]").addEventListener("click", () => closeDialog(linkDialog));
  linkDialog.querySelector("[data-bd-link-close]").addEventListener("click", () => closeDialog(linkDialog));
  linkDialog.querySelector("[data-bd-link-remove]").addEventListener("click", () => {
    const context = linkDialog.__bdContext;
    editor
      .chain()
      .focus()
      .setTextSelection({ from: context.from, to: context.to })
      .unsetLink()
      .run();
    closeDialog(linkDialog);
  });
  linkDialog.querySelector("[data-bd-link-url]").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyLink();
    }
  });

  function openImageDialog(file, dimensions) {
    const dialog = root.querySelector('[data-bd-dialog="image"]');
    const formatSelect = dialog.querySelector("[data-bd-image-format]");
    const qualitySelect = dialog.querySelector("[data-bd-image-quality-preset]");
    const qualityRange = dialog.querySelector("[data-bd-image-quality]");
    const qualityOutput = dialog.querySelector("[data-bd-image-quality-output]");
    const qualityHint = dialog.querySelector("[data-bd-image-quality-hint]");
    const error = dialog.querySelector("[data-bd-image-error]");
    const qualityConfig = config.uploads;
    const outputFormat = qualityConfig.output_format;
    const sourceFormat = {
      "image/jpeg": "JPEG",
      "image/png": "PNG",
      "image/webp": "WEBP",
    }[file.type.toLowerCase()];
    const allowedFormats = qualityConfig.allowed_formats;
    const initialFormat = outputFormat !== "keep"
      ? outputFormat
      : allowedFormats.includes(sourceFormat)
        ? sourceFormat
        : allowedFormats[0];
    const qualityValues = {
      high: Math.min(100, Math.max(qualityConfig.quality, 92)),
      balanced: qualityConfig.quality,
      compact: Math.min(qualityConfig.quality, 68),
    };
    const dimensionText = dimensions
      ? messages.imageDetails
          .replace("{width}", String(dimensions.width))
          .replace("{height}", String(dimensions.height))
          .replace("{size}", formatFileSize(file.size))
      : messages.unknownImageSize;

    dialog.querySelector("[data-bd-image-title]").textContent = messages.insertImage;
    dialog.querySelector("[data-bd-image-details]").textContent = dimensionText;
    dialog.querySelector("[data-bd-image-format-text]").textContent = messages.imageFormat;
    dialog.querySelector("[data-bd-image-quality-label]").textContent = messages.qualityPreset;
    dialog.querySelector("[data-bd-image-alt-text]").textContent = messages.altText;
    dialog.querySelector("[data-bd-image-alt-hint]").textContent = messages.altTextHint;
    dialog.querySelector("[data-bd-image-insert]").textContent = messages.insertImage;
    dialog.querySelector("[data-bd-image-cancel]").textContent = messages.cancel;
    dialog.querySelector("[data-bd-image-close]").title = messages.close;
    dialog.querySelector("[data-bd-image-close]").setAttribute("aria-label", messages.close);
    dialog.querySelector("[data-bd-image-close]").replaceChildren(createIcon(CloseIcon));
    dialog.querySelector("[data-bd-image-quality-label]").setAttribute("for", "bd-editor-quality");
    qualityRange.id = `bd-editor-quality-${source.id || "field"}`;
    dialog.querySelector("[data-bd-image-quality-label]").setAttribute("for", qualityRange.id);
    error.textContent = "";

    formatSelect.replaceChildren();
    for (const format of allowedFormats) {
      const option = document.createElement("option");
      option.value = format;
      option.textContent = format;
      formatSelect.append(option);
    }
    formatSelect.value = initialFormat;
    formatSelect.disabled = !qualityConfig.allow_format_selection;

    qualitySelect.replaceChildren();
    for (const [value, label] of [
      ["high", messages.qualityHigh],
      ["balanced", messages.qualityBalanced],
      ["compact", messages.qualityCompact],
      ["custom", messages.qualityCustom],
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      qualitySelect.append(option);
    }
    const preset = dimensions &&
      (Math.max(dimensions.width, dimensions.height) >= 3000 || file.size >= 4 * 1024 * 1024)
      ? "compact"
      : dimensions &&
          (Math.max(dimensions.width, dimensions.height) >= 1400 || file.size >= 1.5 * 1024 * 1024)
        ? "balanced"
        : "high";
    qualitySelect.value = preset;
    qualityRange.value = String(qualityValues[preset]);
    qualityRange.setAttribute("aria-label", messages.qualityPreset);

    function updateQualityControls() {
      const isPng = formatSelect.value === "PNG";
      const canChooseQuality = qualityConfig.allow_quality_selection && !isPng;
      qualitySelect.disabled = !canChooseQuality;
      qualityRange.disabled = !canChooseQuality;
      qualityHint.textContent = isPng ? messages.pngLossless : "";
      qualityOutput.textContent = messages.qualityValue.replace("{value}", qualityRange.value);
    }

    qualitySelect.onchange = () => {
      if (qualityValues[qualitySelect.value] !== undefined) {
        qualityRange.value = String(qualityValues[qualitySelect.value]);
      }
      updateQualityControls();
    };
    qualityRange.oninput = () => {
      qualitySelect.value = "custom";
      updateQualityControls();
    };
    formatSelect.onchange = updateQualityControls;
    updateQualityControls();

    dialog.__bdUpload = { file, dimensions, qualityValues };
    openDialog(dialog);
    dialog.querySelector("[data-bd-image-alt]").focus();
  }

  async function beginImageSelection() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/jpeg,image/png,image/webp";
    fileInput.className = "bd-editor-file-input";
    fileInput.setAttribute("aria-label", messages.selectImage);
    root.append(fileInput);
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      fileInput.remove();
      if (!file) return;
      if (file.size > config.uploads.max_file_size) {
        status.textContent = messages.tooLargeImage;
        return;
      }
      let dimensions = null;
      try {
        dimensions = await readImageDimensions(file);
      } catch {
        status.textContent = messages.unknownImageSize;
      }
      if (dimensions && dimensions.width * dimensions.height > config.uploads.max_image_pixels) {
        status.textContent = messages.tooManyPixels;
        return;
      }
      if (!config.uploads.allowed_formats.includes({
        "image/jpeg": "JPEG",
        "image/png": "PNG",
        "image/webp": "WEBP",
      }[file.type.toLowerCase()])) {
        status.textContent = messages.invalidImageFormat;
        return;
      }
      openImageDialog(file, dimensions);
    });
    fileInput.addEventListener("cancel", () => fileInput.remove(), { once: true });
    fileInput.click();
  }

  async function uploadSelectedImage() {
    const dialog = root.querySelector('[data-bd-dialog="image"]');
    const error = dialog.querySelector("[data-bd-image-error]");
    const upload = dialog.__bdUpload;
    if (!upload) return;

    const formData = new FormData();
    formData.append("image", upload.file);
    formData.append("app_label", source.dataset.bdAppLabel || "");
    formData.append("model_label", source.dataset.bdModelLabel || "");
    if (config.uploads.allow_format_selection) {
      formData.append("format", dialog.querySelector("[data-bd-image-format]").value);
    }
    if (
      config.uploads.allow_quality_selection &&
      dialog.querySelector("[data-bd-image-format]").value !== "PNG"
    ) {
      formData.append("quality", dialog.querySelector("[data-bd-image-quality]").value);
    }

    const csrfToken = form?.querySelector('input[name="csrfmiddlewaretoken"]')?.value;
    const insertButton = dialog.querySelector("[data-bd-image-insert]");
    insertButton.disabled = true;
    error.textContent = "";
    status.textContent = messages.uploading;

    try {
      const response = await fetch(source.dataset.bdUploadUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || messages.uploadFailure);
      if (!isSafeImageUrl(result.url)) throw new Error(messages.uploadFailure);

      const imageSelection = source.__bdImageSelection;
      const inserted = editor
        .chain()
        .focus()
        .setTextSelection(imageSelection)
        .insertContent({
          type: "image",
          attrs: {
            src: result.url,
            alt: dialog.querySelector("[data-bd-image-alt]").value.trim(),
            width: result.width,
            height: result.height,
          },
        })
        .run();
      if (!inserted) throw new Error(messages.uploadFailure);
      status.textContent = "";
      closeDialog(dialog);
    } catch (uploadError) {
      error.textContent =
        uploadError instanceof Error ? uploadError.message : messages.uploadFailure;
      status.textContent = "";
    } finally {
      insertButton.disabled = false;
    }
  }

  const imageDialog = root.querySelector('[data-bd-dialog="image"]');
  imageDialog.querySelector("[data-bd-image-insert]").addEventListener("click", uploadSelectedImage);
  imageDialog
    .querySelector("[data-bd-image-cancel]")
    .addEventListener("click", () => closeDialog(imageDialog));
  imageDialog
    .querySelector("[data-bd-image-close]")
    .addEventListener("click", () => closeDialog(imageDialog));

  function showEmbedDialog() {
    const dialog = root.querySelector('[data-bd-dialog="embed"]');
    const url = dialog.querySelector("[data-bd-embed-url]");
    dialog.querySelector("[data-bd-embed-title]").textContent = messages.embed;
    dialog.querySelector("[data-bd-embed-url-label]").textContent = messages.embedUrl;
    dialog.querySelector("[data-bd-embed-insert]").textContent = messages.insertEmbed;
    dialog.querySelector("[data-bd-embed-cancel]").textContent = messages.cancel;
    dialog.querySelector("[data-bd-embed-close]").title = messages.close;
    dialog.querySelector("[data-bd-embed-close]").setAttribute("aria-label", messages.close);
    dialog.querySelector("[data-bd-embed-close]").replaceChildren(createIcon(CloseIcon));
    dialog.querySelector("[data-bd-embed-error]").textContent = "";
    url.value = "";
    source.__bdEmbedSelection = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    openDialog(dialog);
    url.focus();
  }

  function applyEmbed() {
    const dialog = root.querySelector('[data-bd-dialog="embed"]');
    const url = dialog.querySelector("[data-bd-embed-url]").value.trim();
    const canonical = canonicalEmbedUrl(url, config.embeds?.providers || []);
    if (!canonical) {
      dialog.querySelector("[data-bd-embed-error]").textContent = messages.invalidEmbed;
      dialog.querySelector("[data-bd-embed-url]").focus();
      return;
    }
    const selection = source.__bdEmbedSelection;
    editor
      .chain()
      .focus()
      .setTextSelection(selection)
      .insertContent({ type: "bdVideoEmbed", attrs: { src: canonical } })
      .run();
    closeDialog(dialog);
  }

  const embedDialog = root.querySelector('[data-bd-dialog="embed"]');
  embedDialog.querySelector("[data-bd-embed-insert]").addEventListener("click", applyEmbed);
  embedDialog
    .querySelector("[data-bd-embed-cancel]")
    .addEventListener("click", () => closeDialog(embedDialog));
  embedDialog
    .querySelector("[data-bd-embed-close]")
    .addEventListener("click", () => closeDialog(embedDialog));
  embedDialog.querySelector("[data-bd-embed-url]").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyEmbed();
    }
  });

  function showTableDialog() {
    const dialog = root.querySelector('[data-bd-dialog="table"]');
    dialog.querySelector("[data-bd-table-title]").textContent = messages.tableTitle;
    dialog.querySelector("[data-bd-table-rows-label]").textContent = messages.rows;
    dialog.querySelector("[data-bd-table-columns-label]").textContent = messages.columns;
    dialog.querySelector("[data-bd-table-header-label]").textContent = messages.headerRow;
    dialog.querySelector("[data-bd-table-insert]").textContent = messages.insertTable;
    dialog.querySelector("[data-bd-table-cancel]").textContent = messages.cancel;
    dialog.querySelector("[data-bd-table-close]").title = messages.close;
    dialog.querySelector("[data-bd-table-close]").setAttribute("aria-label", messages.close);
    dialog.querySelector("[data-bd-table-close]").replaceChildren(createIcon(CloseIcon));
    dialog.querySelector("[data-bd-table-error]").textContent = "";
    source.__bdTableSelection = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    openDialog(dialog);
    dialog.querySelector("[data-bd-table-rows]").focus();
  }

  function insertTable() {
    const dialog = root.querySelector('[data-bd-dialog="table"]');
    const rowsValue = Number(dialog.querySelector("[data-bd-table-rows]").value);
    const columnsValue = Number(dialog.querySelector("[data-bd-table-columns]").value);
    const error = dialog.querySelector("[data-bd-table-error]");
    if (
      !Number.isInteger(rowsValue) ||
      !Number.isInteger(columnsValue) ||
      rowsValue < 1 ||
      rowsValue > 20 ||
      columnsValue < 1 ||
      columnsValue > 20
    ) {
      error.textContent = messages.invalidTableSize;
      return;
    }

    const selection = source.__bdTableSelection;
    editor
      .chain()
      .focus()
      .setTextSelection(selection)
      .insertTable({
        rows: rowsValue,
        cols: columnsValue,
        withHeaderRow: dialog.querySelector("[data-bd-table-header-row]").checked,
      })
      .run();
    closeDialog(dialog);
  }

  const tableDialog = root.querySelector('[data-bd-dialog="table"]');
  tableDialog.querySelector("[data-bd-table-insert]").addEventListener("click", insertTable);
  tableDialog
    .querySelector("[data-bd-table-cancel]")
    .addEventListener("click", () => closeDialog(tableDialog));
  tableDialog
    .querySelector("[data-bd-table-close]")
    .addEventListener("click", () => closeDialog(tableDialog));

  function closeColorMenus({ returnFocus = false } = {}) {
    for (const { button, menu } of colorMenus.values()) {
      if (menu.hidden) continue;
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
      if (returnFocus) button.focus();
    }
  }

  function positionColorMenu(button, menu) {
    const shellRect = root.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const menuWidth = 224;
    menu.style.left = `${Math.max(
      8,
      Math.min(buttonRect.left - shellRect.left, root.clientWidth - menuWidth - 8),
    )}px`;
    menu.style.top = `${buttonRect.bottom - shellRect.top + 5}px`;
  }

  function addColorPicker(name, icon, palette, rowName) {
    const button = addButton(
      name,
      icon,
      () => {
        const state = colorMenus.get(name);
        const shouldOpen = state.menu.hidden;
        closeColorMenus();
        if (shouldOpen && !sourceMode) {
          state.menu.hidden = false;
          state.button.setAttribute("aria-expanded", "true");
          positionColorMenu(state.button, state.menu);
        }
      },
      rowName,
    );
    if (!button) return;

    button.classList.add("bd-editor-color-trigger");
    button.setAttribute("aria-haspopup", "true");
    button.setAttribute("aria-expanded", "false");

    const menu = document.createElement("div");
    menu.className = "bd-editor-color-menu";
    menu.hidden = true;
    menu.setAttribute("role", "group");
    menu.setAttribute("aria-label", messages[name]);

    const swatches = document.createElement("div");
    swatches.className = "bd-editor-color-swatches";
    for (const color of palette) {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "bd-editor-color-swatch";
      option.style.setProperty("--bd-editor-swatch", color.value);
      option.title = messages[color.key];
      option.setAttribute("aria-label", messages[color.key]);
      option.setAttribute("aria-pressed", "false");
      option.dataset.bdColorValue = color.value;
      option.addEventListener("click", () => {
        const chain = editor.chain().focus();
        if (name === "text_color") chain.setColor(color.value).run();
        else chain.setBackgroundColor(color.value).run();
        closeColorMenus();
      });
      swatches.append(option);
    }
    menu.append(swatches);

    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "bd-editor-color-reset";
    reset.textContent = messages.defaultColor;
    reset.dataset.bdColorValue = "";
    reset.setAttribute("aria-pressed", "false");
    reset.addEventListener("click", () => {
      const chain = editor.chain().focus();
      if (name === "text_color") chain.unsetColor().run();
      else chain.unsetBackgroundColor().run();
      closeColorMenus();
    });
    menu.append(reset);
    root.append(menu);
    colorMenus.set(name, { button, menu });
  }

  root.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && colorMenus.size) {
        const openMenu = [...colorMenus.values()].find(({ menu }) => !menu.hidden);
        if (openMenu) {
          event.preventDefault();
          closeColorMenus({ returnFocus: true });
          return;
        }
      }
      if (event.key !== "Enter" || event.isComposing) return;

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const enterActions = [
        ["[data-bd-image-alt]", uploadSelectedImage],
        ["[data-bd-link-text], [data-bd-link-url]", applyLink],
        ["[data-bd-embed-url]", applyEmbed],
        ["[data-bd-table-rows], [data-bd-table-columns]", insertTable],
      ];
      const matchingAction = enterActions.find(([selector]) => target.matches(selector));
      if (!matchingAction) return;

      // These controls live inside Django's outer admin form. Consume Enter
      // before it triggers the form's default Save button.
      event.preventDefault();
      event.stopPropagation();
      matchingAction[1]();
    },
    true,
  );

  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest(".bd-editor-color-menu, .bd-editor-color-trigger")) return;
    closeColorMenus();
  });

  addButton("undo", UndoIcon, () => editor.chain().focus().undo().run(), "primary");
  addButton("redo", RedoIcon, () => editor.chain().focus().redo().run(), "primary");
  addSeparator("primary");
  addButton("link", LinkIcon, showLinkDialog, "primary");
  addButton("image", ImageIcon, () => {
    source.__bdImageSelection = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    void beginImageSelection();
  }, "primary");
  addButton("table", TableIcon, showTableDialog, "primary");
  addButton("embed", EmbedIcon, showEmbedDialog, "primary");

  const headingSelect = toolbarConfig.heading ? document.createElement("select") : null;
  if (headingSelect) {
    headingSelect.className = "bd-editor-format-select";
    headingSelect.setAttribute("aria-label", messages.heading);
    const paragraph = document.createElement("option");
    paragraph.value = "paragraph";
    paragraph.textContent = messages.paragraph;
    headingSelect.append(paragraph);
    for (let level = 1; level <= 6; level += 1) {
      const option = document.createElement("option");
      option.value = String(level);
      option.textContent = messages.headingLevel.replace("{level}", String(level));
      headingSelect.append(option);
    }
    headingSelect.addEventListener("change", () => {
      const chain = editor.chain().focus();
      if (headingSelect.value === "paragraph") chain.setParagraph().run();
      else chain.setHeading({ level: Number(headingSelect.value) }).run();
    });
    rows.format.append(headingSelect);
    buttonRefs.set("heading", headingSelect);
    addSeparator("format");
  }

  addButton("bold", BoldIcon, () => editor.chain().focus().toggleBold().run(), "format");
  addButton("italic", ItalicIcon, () => editor.chain().focus().toggleItalic().run(), "format");
  addColorPicker("text_color", TextColorIcon, TEXT_COLOR_PALETTE, "format");
  addColorPicker(
    "background_color",
    BackgroundColorIcon,
    BACKGROUND_COLOR_PALETTE,
    "format",
  );
  addSeparator("format");
  addButton(
    "underline",
    UnderlineIcon,
    () => editor.chain().focus().toggleUnderline().run(),
    "format",
  );
  addButton("strike", StrikeIcon, () => editor.chain().focus().toggleStrike().run(), "format");
  addSeparator("format");
  addButton(
    "bullet_list",
    BulletListIcon,
    () => editor.chain().focus().toggleBulletList().run(),
    "format",
  );
  addButton(
    "ordered_list",
    NumberedListIcon,
    () => editor.chain().focus().toggleOrderedList().run(),
    "format",
  );
  addSeparator("format");
  addButton(
    "blockquote",
    QuoteIcon,
    () => editor.chain().focus().toggleBlockquote().run(),
    "format",
  );
  addButton(
    "code_block",
    CodeIcon,
    () => editor.chain().focus().toggleCodeBlock().run(),
    "format",
  );

  const tableCommands = [
    ["rowBefore", "addRowBefore"],
    ["rowAfter", "addRowAfter"],
    ["deleteRow", "deleteRow"],
    ["columnBefore", "addColumnBefore"],
    ["columnAfter", "addColumnAfter"],
    ["deleteColumn", "deleteColumn"],
    ["toggleHeader", "toggleHeaderRow"],
    ["deleteTable", "deleteTable"],
  ];
  const tableIcons = {
    rowBefore: RowBeforeIcon,
    rowAfter: RowAfterIcon,
    deleteRow: RowRemoveIcon,
    columnBefore: ColumnBeforeIcon,
    columnAfter: ColumnAfterIcon,
    deleteColumn: ColumnRemoveIcon,
    toggleHeader: HeaderRowIcon,
    deleteTable: DeleteTableIcon,
  };
  for (const [name, command] of tableCommands) {
    const button = addButton(
      name,
      tableIcons[name],
      () => editor.chain().focus()[command]().run(),
      "table",
      name === "deleteTable" ? "bd-editor-tool-button-danger" : "",
    );
    if (button) tableActions.set(name, command);
  }

  textModeButton.addEventListener("click", () => setEditorMode(false));
  sourceModeButton.addEventListener("click", () => setEditorMode(true));
  sourceView.addEventListener("input", () => {
    source.value = sourceView.value;
    scheduleDraftSave();
  });

  if (form && !formsWithSubmitHandler.has(form)) {
    form.addEventListener(
      "submit",
      () => {
        for (const candidate of form.querySelectorAll("textarea[data-bd-config]")) {
          const candidateEditor = candidate.__bdEditor;
          if (!candidateEditor || candidateEditor.isDestroyed) continue;

          const candidateSourceMode =
            candidate.nextElementSibling?.querySelector(".bd-editor-source-wrapper")?.hidden === false;
          const candidateRoot = candidate.nextElementSibling;
          candidate.value = candidateSourceMode
            ? candidateRoot.querySelector(".bd-editor-source-view").value
            : candidateEditor.getHTML();
          candidate.__bdDraft?.save(candidate.value, candidateSourceMode);
          candidate.__bdDraft?.markSubmitted();
        }
      },
      true,
    );
    formsWithSubmitHandler.add(form);
  }

  source.__bdEditor = editor;
  source.__bdDraft = draftStore;
  source.dataset.bdInitialized = "true";
  source.hidden = true;
  root.hidden = false;
  if (draftStore) {
    window.addEventListener(
      "pagehide",
      () => {
        window.clearTimeout(draftTimer);
        if (draftStore.isSubmitting()) draftStore.clear();
        else draftStore.save(currentContent(), sourceMode);
      },
      { once: true },
    );
  }
  if (sourceMode) setEditorMode(true, { preserveSource: true });
  else updateToolbar();
  if (restoredDraft) status.textContent = messages.draftRestored;
  else if (draftStore?.hasFormErrors()) scheduleDraftSave();
}

function initializeWithin(element) {
  if (element.matches?.("textarea[data-bd-config]")) initializeEditor(element);
  for (const textarea of element.querySelectorAll?.("textarea[data-bd-config]") || []) {
    initializeEditor(textarea);
  }
}

function start() {
  initializeWithin(document);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof HTMLElement) initializeWithin(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
