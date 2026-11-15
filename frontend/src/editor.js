import { Editor, Extension, Node, getMarkRange } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { TableCell, TableHeader, TableKit } from "@tiptap/extension-table";
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
import ImageEditIcon from "@tabler/icons/outline/photo-edit.svg";
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

const TEXT_ALIGNMENTS = new Set(["left", "center", "right", "justify", "start", "end"]);
const IMAGE_LAYOUT_STYLES = {
  "block-left":
    "display:block;float:none;clear:both;margin-left:0;margin-right:auto;margin-bottom:0.5rem",
  "block-center":
    "display:block;float:none;clear:both;margin-left:auto;margin-right:auto;margin-bottom:0.5rem",
  "block-right":
    "display:block;float:none;clear:both;margin-left:auto;margin-right:0;margin-bottom:0.5rem",
  inline: "display:inline;float:none;clear:none;vertical-align:top;margin-left:0.25em;margin-right:0.25em",
  "float-left": "display:block;float:left;clear:none;margin-right:1em;margin-bottom:0.5rem",
  "float-right": "display:block;float:right;clear:none;margin-left:1em;margin-bottom:0.5rem",
};

const IMAGE_LAYOUT_MESSAGES = {
  "block-left": "imageLayoutBlockLeft",
  "block-center": "imageLayoutBlockCenter",
  "block-right": "imageLayoutBlockRight",
  inline: "imageLayoutInline",
  "float-left": "imageLayoutFloatLeft",
  "float-right": "imageLayoutFloatRight",
};

const INLINE_VERTICAL_ALIGNMENT_MESSAGES = {
  top: "imageVerticalAlignTop",
  middle: "imageVerticalAlignMiddle",
  bottom: "imageVerticalAlignBottom",
  baseline: "imageVerticalAlignBaseline",
};

function isFloatImageLayout(layout) {
  return layout === "float-left" || layout === "float-right";
}

function imageDimensionsSummary(width, height, messages) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return messages.unknownImageSize;
  }
  return messages.imageDimensionsSummary
    .replace("{width}", String(Math.round(width)))
    .replace("{height}", String(Math.round(height)))
    .replace("{ratio}", (width / height).toFixed(2));
}

function imageLayoutStyle(layout, verticalAlignment, preserveAspectRatio, imageConfig) {
  let style = IMAGE_LAYOUT_STYLES[layout] || IMAGE_LAYOUT_STYLES[imageConfig.default_layout];
  if (layout === "inline") {
    style = style.replace(
      "vertical-align:top",
      `vertical-align:${verticalAlignment || imageConfig.default_inline_vertical_alignment}`,
    );
  }
  const maxWidth = isFloatImageLayout(layout)
    ? `${imageConfig.float_max_width_percent}%`
    : "100%";
  style += `;max-width:${maxWidth};max-height:${imageConfig.max_height}px`;
  if (preserveAspectRatio) style += ";height:auto";
  return style;
}

const TextAlignment = Extension.create({
  name: "bdTextAlignment",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element) => {
              const value = element.style.textAlign.toLowerCase();
              return TEXT_ALIGNMENTS.has(value) ? value : null;
            },
            renderHTML: ({ textAlign }) =>
              TEXT_ALIGNMENTS.has(textAlign) ? { style: `text-align:${textAlign}` } : {},
          },
        },
      },
    ];
  },
});

function parseImageLayout(element) {
  const { display, float, marginLeft, marginRight } = element.style;
  if (float === "left" || float === "right") return `float-${float}`;
  if (display === "inline" || display === "inline-block") return "inline";
  if (marginLeft === "auto" && marginRight === "auto") return "block-center";
  if (marginLeft === "auto") return "block-right";
  return "block-left";
}

function createSafeImageExtension(imageConfig, messages) {
  return Image.extend({
    addOptions() {
      return {
        ...this.parent?.(),
        inline: true,
        allowBase64: false,
        resize: imageConfig.allow_resize
          ? {
              enabled: true,
              directions: [
                "top-left",
                "top",
                "top-right",
                "right",
                "bottom-right",
                "bottom",
                "bottom-left",
                "left",
              ],
              minWidth: 1,
              minHeight: 1,
              alwaysPreserveAspectRatio: imageConfig.preserve_aspect_ratio,
            }
          : false,
      };
    },

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
        layout: {
          default: imageConfig.default_layout,
          parseHTML: (element) => {
            const layout = parseImageLayout(element);
            return imageConfig.allowed_layouts.includes(layout)
              ? layout
              : imageConfig.default_layout;
          },
          renderHTML: ({ layout, inlineVerticalAlignment, preserveAspectRatio }) => ({
            style: imageLayoutStyle(
              layout,
              inlineVerticalAlignment,
              preserveAspectRatio,
              imageConfig,
            ),
          }),
        },
        inlineVerticalAlignment: {
          default: imageConfig.default_inline_vertical_alignment,
          parseHTML: (element) => {
            const alignment = element.style.verticalAlign;
            return imageConfig.inline_vertical_alignments.includes(alignment)
              ? alignment
              : imageConfig.default_inline_vertical_alignment;
          },
          renderHTML: () => ({}),
        },
        preserveAspectRatio: {
          default: imageConfig.preserve_aspect_ratio,
          parseHTML: (element) => {
            if (element.style.height === "auto") return true;
            if (element.style.height) return false;
            return imageConfig.preserve_aspect_ratio;
          },
          renderHTML: () => ({}),
        },
      };
    },

    addNodeView() {
      const createParentNodeView = this.parent?.();
      if (!createParentNodeView) return null;
      return (props) => {
        const nodeView = createParentNodeView(props);
        if (!nodeView) return null;

        const container = nodeView.dom;
        const image = container.querySelector("img");
        const dimensionsInfo = document.createElement("output");
        dimensionsInfo.className = "bd-editor-image-resize-info";
        dimensionsInfo.dataset.bdImageResizeInfo = "";
        dimensionsInfo.setAttribute("aria-hidden", "true");
        container.append(dimensionsInfo);
        nodeView.minSize = { width: 1, height: 1 };
        nodeView.maxSize = {
          width: imageConfig.max_width,
          height: imageConfig.max_height,
        };
        let observedParent = null;
        let resizeObserver = null;

        function updateDimensionsInfo(width, height) {
          dimensionsInfo.textContent = imageDimensionsSummary(width, height, messages);
        }

        function updateRenderedDimensionsInfo(node) {
          const rect = image?.getBoundingClientRect();
          updateDimensionsInfo(
            rect?.width || Number(node.attrs.width) || image?.naturalWidth,
            rect?.height || Number(node.attrs.height) || image?.naturalHeight,
          );
        }

        function updateResizeBounds(node) {
          const layout = node.attrs.layout || imageConfig.default_layout;
          const contentWidth = container.parentElement?.clientWidth || 0;
          const maxWidth = isFloatImageLayout(layout) && contentWidth
            ? Math.min(
                imageConfig.max_width,
                Math.floor((contentWidth * imageConfig.float_max_width_percent) / 100),
              )
            : imageConfig.max_width;
          nodeView.maxSize = {
            width: Math.max(1, maxWidth),
            height: imageConfig.max_height,
          };

          const parent = container.parentElement;
          if (resizeObserver && parent && parent !== observedParent) {
            resizeObserver.disconnect();
            resizeObserver.observe(parent);
            observedParent = parent;
          }
        }

        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => {
            if (!container.isConnected) return;
            updateResizeBounds(nodeView.node);
            updateRenderedDimensionsInfo(nodeView.node);
          });
        }

        function applyLayout(node) {
          const layout = node.attrs.layout || imageConfig.default_layout;
          const isFloatingLayout = isFloatImageLayout(layout);
          const verticalAlignment =
            node.attrs.inlineVerticalAlignment || imageConfig.default_inline_vertical_alignment;
          const style = document.createElement("span").style;
          style.cssText = imageLayoutStyle(
            layout,
            verticalAlignment,
            node.attrs.preserveAspectRatio !== false,
            imageConfig,
          );
          container.style.position = "relative";
          container.style.display = layout === "inline" ? "inline-flex" : "block";
          container.style.width = "fit-content";
          container.style.maxWidth = isFloatingLayout
            ? `${imageConfig.float_max_width_percent}%`
            : "100%";
          container.style.maxHeight = `${imageConfig.max_height}px`;
          container.style.cssFloat = style.cssFloat;
          container.style.clear = style.clear;
          container.style.marginLeft = style.marginLeft;
          container.style.marginRight = style.marginRight;
          container.style.marginBottom = style.marginBottom;
          container.style.verticalAlign = style.verticalAlign;

          if (image) {
            image.style.display = "block";
            image.style.cssFloat = "none";
            image.style.clear = "none";
            image.style.margin = "0";
            image.style.verticalAlign = "baseline";
            image.style.maxWidth = "100%";
            image.style.maxHeight = `${imageConfig.max_height}px`;
            image.style.width = Number(node.attrs.width)
              ? `${Number(node.attrs.width)}px`
              : "";
            image.style.height = node.attrs.preserveAspectRatio !== false
              ? "auto"
              : Number(node.attrs.height)
                ? `${Number(node.attrs.height)}px`
                : "";
          }
          nodeView.preserveAspectRatio =
            node.attrs.preserveAspectRatio ?? imageConfig.preserve_aspect_ratio;
          updateResizeBounds(node);
          updateRenderedDimensionsInfo(node);
          requestAnimationFrame(() => {
            if (!container.isConnected) return;
            updateResizeBounds(nodeView.node);
            updateRenderedDimensionsInfo(nodeView.node);
          });
        }

        const onResize = nodeView.onResize?.bind(nodeView);
        nodeView.onResize = (width, height) => {
          onResize?.(width, height);
          updateDimensionsInfo(width, height);
        };
        const onCommit = nodeView.onCommit.bind(nodeView);
        nodeView.onCommit = (width, height) => {
          const position = props.getPos();
          onCommit(width, height);
          if (position !== undefined) props.editor.commands.setNodeSelection(position);
        };
        const updateNodeView = nodeView.update.bind(nodeView);
        nodeView.update = (node, ...args) => {
          const updated = updateNodeView(node, ...args);
          if (updated) applyLayout(node);
          return updated;
        };
        const destroyNodeView = nodeView.destroy.bind(nodeView);
        nodeView.destroy = () => {
          resizeObserver?.disconnect();
          destroyNodeView();
        };
        applyLayout(props.node);
        return nodeView;
      };
    },
  });
}

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

function addTableBackgroundAttribute(extension) {
  return extension.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        backgroundColor: {
          default: null,
          parseHTML: (element) => element.style.backgroundColor || null,
          renderHTML: ({ backgroundColor }) =>
            backgroundColor ? { style: `background-color: ${backgroundColor}` } : {},
        },
      };
    },
  });
}

const StyledTableCell = addTableBackgroundAttribute(TableCell);
const StyledTableHeader = addTableBackgroundAttribute(TableHeader);

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

async function estimateImageSizes(file, format, qualities) {
  if (typeof createImageBitmap !== "function") {
    throw new Error("Image size estimation requires createImageBitmap.");
  }

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("A 2D canvas context is unavailable.");
    if (format === "JPEG") {
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(bitmap, 0, 0);

    const mimeType = `image/${format === "JPEG" ? "jpeg" : format.toLowerCase()}`;
    const sizes = [];
    for (const quality of qualities) {
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, mimeType, format === "PNG" ? undefined : quality / 100);
      });
      if (!blob || blob.type !== mimeType) {
        throw new Error(`The browser could not estimate ${format} output size.`);
      }
      sizes.push(blob.size);
    }
    return sizes;
  } finally {
    bitmap.close();
    canvas.width = 0;
    canvas.height = 0;
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
    imageContext: root.querySelector("[data-bd-image-context-tools]"),
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
  const imageLayoutToolbarLabel = root.querySelector("[data-bd-image-layout-toolbar-label]");
  const imageLayoutToolbar = root.querySelector("[data-bd-image-layout-toolbar]");
  const inlineAlignmentToolbarField = root.querySelector(
    "[data-bd-image-inline-alignment-toolbar-field]",
  );
  const inlineAlignmentToolbarLabel = root.querySelector(
    "[data-bd-image-inline-alignment-toolbar-label]",
  );
  const inlineAlignmentToolbar = root.querySelector(
    "[data-bd-image-inline-alignment-toolbar]",
  );
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
  let selectedImageResizeContainer = null;
  let selectedImagePosition = null;
  let draftTimer = null;
  const buttonRefs = new Map();
  const tableActions = new Map();
  const colorMenus = new Map();

  toolbar.setAttribute("aria-label", messages.toolbar);
  rows.imageContext.setAttribute("aria-label", messages.imageContextToolbar);
  rows.table.setAttribute("aria-label", messages.tableTools);
  modeSwitch.setAttribute("aria-label", messages.modeSwitch);
  modeSwitch.hidden = !toolbarConfig.source;
  textModeButton.textContent = messages.modeText;
  sourceModeButton.textContent = messages.modeSource;
  sourceLabel.textContent = messages.sourceLabel;
  imageLayoutToolbarLabel.textContent = messages.imageLayoutToolbar;
  imageLayoutToolbar.setAttribute("aria-label", messages.imageLayout);
  for (const layout of config.images.allowed_layouts) {
    const option = document.createElement("option");
    option.value = layout;
    option.textContent = messages[IMAGE_LAYOUT_MESSAGES[layout]];
    imageLayoutToolbar.append(option);
  }
  inlineAlignmentToolbarLabel.textContent = messages.imageInlineAlignmentToolbar;
  inlineAlignmentToolbar.setAttribute("aria-label", messages.imageInlineAlignment);
  for (const alignment of config.images.inline_vertical_alignments) {
    const option = document.createElement("option");
    option.value = alignment;
    option.textContent = messages[INLINE_VERTICAL_ALIGNMENT_MESSAGES[alignment]];
    inlineAlignmentToolbar.append(option);
  }
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
      TextAlignment,
      createSafeImageExtension(config.images, messages),
      TableKit.configure({
        table: { resizable: true },
        tableCell: false,
        tableHeader: false,
      }),
      StyledTableCell,
      StyledTableHeader,
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

    const textAlignSelect = buttonRefs.get("text_align");
    if (textAlignSelect) {
      const currentBlock = editor.isActive("heading") ? "heading" : "paragraph";
      textAlignSelect.value = editor.getAttributes(currentBlock).textAlign || "";
      textAlignSelect.disabled =
        sourceMode || (!editor.isActive("paragraph") && !editor.isActive("heading"));
    }

    const selection = editor.state.selection;
    const imageNodeSelected = selection.node?.type.name === "image";
    if (imageNodeSelected) selectedImagePosition = selection.from;
    else if (!rows.imageContext.contains(document.activeElement)) selectedImagePosition = null;
    const rememberedImageNode =
      selectedImagePosition === null ? null : editor.state.doc.nodeAt(selectedImagePosition);
    const selectedImageNode = imageNodeSelected
      ? selection.node
      : rows.imageContext.contains(document.activeElement) &&
          rememberedImageNode?.type.name === "image"
        ? rememberedImageNode
        : null;
    const selectedImageNodePosition = imageNodeSelected
      ? selection.from
      : selectedImageNode
        ? selectedImagePosition
        : null;
    const selectedImageLayout =
      selectedImageNode?.attrs.layout || config.images.default_layout;
    const showImageContext = Boolean(
      selectedImageNode && !sourceMode && toolbarConfig.image_editing,
    );
    const imageEditButton = buttonRefs.get("image_editing");
    if (imageEditButton) {
      imageEditButton.disabled = sourceMode || !selectedImageNode;
      imageEditButton.setAttribute("aria-pressed", String(Boolean(selectedImageNode)));
    }
    rows.imageContext.hidden = !showImageContext;
    imageLayoutToolbar.value = config.images.allowed_layouts.includes(selectedImageLayout)
      ? selectedImageLayout
      : config.images.default_layout;
    inlineAlignmentToolbarField.hidden =
      !showImageContext || selectedImageLayout !== "inline";
    inlineAlignmentToolbar.value = config.images.inline_vertical_alignments.includes(
      selectedImageNode?.attrs.inlineVerticalAlignment,
    )
      ? selectedImageNode.attrs.inlineVerticalAlignment
      : config.images.default_inline_vertical_alignment;

    selectedImageResizeContainer?.classList.remove("bd-editor-image-selected");
    selectedImageResizeContainer = null;
    if (selectedImageNodePosition !== null) {
      const selectedNode = editor.view.nodeDOM(selectedImageNodePosition);
      if (selectedNode instanceof HTMLElement) {
        selectedNode.classList.add("bd-editor-image-selected");
        selectedImageResizeContainer = selectedNode;
      }
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

  function fitImageDimensions(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
      return { width: null, height: null };
    }
    const imageConfig = config.images;
    const scale = Math.min(
      1,
      imageConfig.max_width / width,
      imageConfig.max_height / height,
    );
    return {
      width: Math.max(1, Math.floor(width * scale)),
      height: Math.max(1, Math.floor(height * scale)),
    };
  }

  function getImageWidthLimit(layout, nodeView = null) {
    const imageConfig = config.images;
    if (!isFloatImageLayout(layout)) return imageConfig.max_width;

    const contentWidth =
      nodeView?.parentElement?.clientWidth ||
      editor?.view?.dom?.clientWidth ||
      0;
    if (!contentWidth) return imageConfig.max_width;
    return Math.max(
      1,
      Math.min(
        imageConfig.max_width,
        Math.floor((contentWidth * imageConfig.float_max_width_percent) / 100),
      ),
    );
  }

  function fitImageDimensionsForLayout(width, height, layout, nodeView = null) {
    const dimensions = fitImageDimensions(width, height);
    if (!dimensions.width || !dimensions.height) return dimensions;

    const maxWidth = getImageWidthLimit(layout, nodeView);
    if (dimensions.width <= maxWidth) return dimensions;
    const scale = maxWidth / dimensions.width;
    return {
      width: maxWidth,
      height: Math.max(1, Math.round(dimensions.height * scale)),
    };
  }

  function setupImagePropertyFields(
    dialog,
    {
      width,
      height,
      layout,
      inlineVerticalAlignment,
      preserveAspectRatio,
      alt = "",
      title = "",
      nodeView = null,
    },
  ) {
    const imageConfig = config.images;
    const qualityConfig = config.uploads;
    const widthField = dialog.querySelector("[data-bd-image-width]");
    const heightField = dialog.querySelector("[data-bd-image-height]");
    const ratioCheckbox = dialog.querySelector("[data-bd-image-ratio]");
    const layoutSelect = dialog.querySelector("[data-bd-image-layout]");
    const inlineAlignmentField = dialog.querySelector("[data-bd-image-inline-alignment-field]");
    const inlineAlignmentLabel = dialog.querySelector("[data-bd-image-inline-alignment-label]");
    const inlineAlignmentSelect = dialog.querySelector("[data-bd-image-inline-alignment]");
    const inlineAlignmentHint = dialog.querySelector("[data-bd-image-inline-alignment-hint]");
    const dimensionsSummary = dialog.querySelector("[data-bd-image-dimensions-summary]");
    const altField = dialog.querySelector("[data-bd-image-alt]");
    const altWarning = dialog.querySelector("[data-bd-image-alt-warning]");
    const titleField = dialog.querySelector("[data-bd-image-title-value]");
    const dimensions = fitImageDimensionsForLayout(width, height, layout, nodeView);
    const aspectRatio = dimensions.width && dimensions.height
      ? dimensions.width / dimensions.height
      : null;

    widthField.min = "1";
    widthField.max = String(getImageWidthLimit(layout, nodeView));
    heightField.min = "1";
    heightField.max = String(imageConfig.max_height);
    widthField.disabled = !imageConfig.allow_resize;
    heightField.disabled = !imageConfig.allow_resize;
    widthField.value = dimensions.width ? String(dimensions.width) : "";
    heightField.value = dimensions.height ? String(dimensions.height) : "";
    ratioCheckbox.checked = preserveAspectRatio ?? imageConfig.preserve_aspect_ratio;
    ratioCheckbox.disabled = !imageConfig.allow_resize;

    layoutSelect.replaceChildren();
    for (const imageLayout of imageConfig.allowed_layouts) {
      const option = document.createElement("option");
      option.value = imageLayout;
      option.textContent = messages[IMAGE_LAYOUT_MESSAGES[imageLayout]];
      layoutSelect.append(option);
    }
    layoutSelect.value = imageConfig.allowed_layouts.includes(layout)
      ? layout
      : imageConfig.default_layout;
    layoutSelect.disabled = imageConfig.allowed_layouts.length === 1;
    inlineAlignmentLabel.textContent = messages.imageInlineAlignment;
    inlineAlignmentHint.textContent = messages.imageInlineAlignmentHint;
    inlineAlignmentSelect.replaceChildren();
    for (const alignment of imageConfig.inline_vertical_alignments) {
      const option = document.createElement("option");
      option.value = alignment;
      option.textContent = messages[INLINE_VERTICAL_ALIGNMENT_MESSAGES[alignment]];
      inlineAlignmentSelect.append(option);
    }
    inlineAlignmentSelect.value = imageConfig.inline_vertical_alignments.includes(
      inlineVerticalAlignment,
    )
      ? inlineVerticalAlignment
      : imageConfig.default_inline_vertical_alignment;
    inlineAlignmentSelect.disabled = imageConfig.inline_vertical_alignments.length === 1;
    altField.value = alt || "";
    titleField.value = title || "";
    altWarning.textContent = messages.missingAltWarning;
    altWarning.hidden = !qualityConfig.warn_missing_alt || Boolean(altField.value.trim());
    altField.oninput = () => {
      altWarning.hidden =
        !qualityConfig.warn_missing_alt || Boolean(altField.value.trim());
    };

    function updateDimensionsSummary() {
      dimensionsSummary.textContent = imageDimensionsSummary(
        Number(widthField.value),
        Number(heightField.value),
        messages,
      );
    }

    function updateInlineAlignmentVisibility() {
      const isInlineLayout = layoutSelect.value === "inline";
      inlineAlignmentField.hidden = !isInlineLayout;
      inlineAlignmentHint.hidden = !isInlineLayout;
    }

    function updateImageWidthLimit() {
      const maxWidth = getImageWidthLimit(layoutSelect.value, nodeView);
      widthField.max = String(maxWidth);
      const currentWidth = Number(widthField.value);
      const currentHeight = Number(heightField.value);
      if (currentWidth > maxWidth && currentHeight >= 1) {
        const scale = Math.min(
          maxWidth / currentWidth,
          imageConfig.max_height / currentHeight,
        );
        widthField.value = String(Math.max(1, Math.floor(currentWidth * scale)));
        heightField.value = String(Math.max(1, Math.round(currentHeight * scale)));
      }
      updateDimensionsSummary();
    }

    function updateDimensions(changedField) {
      if (!imageConfig.allow_resize) return;
      let nextWidth = Number(widthField.value);
      let nextHeight = Number(heightField.value);
      if (!Number.isInteger(nextWidth) || nextWidth < 1) return;
      if (!Number.isInteger(nextHeight) || nextHeight < 1) return;
      const maxWidth = getImageWidthLimit(layoutSelect.value, nodeView);
      if (ratioCheckbox.checked && aspectRatio) {
        if (changedField === "height") nextWidth = Math.round(nextHeight * aspectRatio);
        else nextHeight = Math.round(nextWidth / aspectRatio);
      }
      if (ratioCheckbox.checked && aspectRatio) {
        const scale = Math.min(
          1,
          maxWidth / nextWidth,
          imageConfig.max_height / nextHeight,
        );
        if (scale < 1) {
          nextWidth = Math.max(1, Math.floor(nextWidth * scale));
          nextHeight = Math.max(1, Math.round(nextWidth / aspectRatio));
        }
      } else {
        nextWidth = Math.min(nextWidth, maxWidth);
        nextHeight = Math.min(nextHeight, imageConfig.max_height);
      }
      nextWidth = Math.min(nextWidth, maxWidth);
      nextHeight = Math.min(nextHeight, imageConfig.max_height);
      widthField.value = String(nextWidth);
      heightField.value = String(nextHeight);
      updateDimensionsSummary();
    }

    layoutSelect.onchange = () => {
      updateInlineAlignmentVisibility();
      updateImageWidthLimit();
    };
    widthField.oninput = () => updateDimensions("width");
    heightField.oninput = () => updateDimensions("height");
    ratioCheckbox.onchange = () => updateDimensions("width");
    updateInlineAlignmentVisibility();
    updateImageWidthLimit();
    updateDimensionsSummary();
  }

  function openImageDialog(file, dimensions) {
    const dialog = root.querySelector('[data-bd-dialog="image"]');
    const formatSelect = dialog.querySelector("[data-bd-image-format]");
    const qualitySelect = dialog.querySelector("[data-bd-image-quality-preset]");
    const qualityRange = dialog.querySelector("[data-bd-image-quality]");
    const qualityOutput = dialog.querySelector("[data-bd-image-quality-output]");
    const qualityHint = dialog.querySelector("[data-bd-image-quality-hint]");
    const uploadOptions = dialog.querySelector("[data-bd-image-upload-options]");
    const sizeEstimates = dialog.querySelector("[data-bd-image-estimates]");
    const altField = dialog.querySelector("[data-bd-image-alt]");
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
      high: Math.min(qualityConfig.max_quality, Math.max(qualityConfig.quality, 92)),
      balanced: qualityConfig.quality,
      compact: Math.max(qualityConfig.min_quality, Math.min(qualityConfig.quality, 68)),
    };
    const dimensionText = dimensions
      ? messages.imageDetails
          .replace("{width}", String(dimensions.width))
          .replace("{height}", String(dimensions.height))
          .replace("{size}", formatFileSize(file.size))
      : messages.unknownImageSize;

    dialog.dataset.bdMode = "upload";
    uploadOptions.hidden = false;
    dialog.querySelector("[data-bd-image-title]").textContent = messages.insertImage;
    dialog.querySelector("[data-bd-image-details]").textContent = dimensionText;
    dialog.querySelector("[data-bd-image-format-text]").textContent = messages.imageFormat;
    dialog.querySelector("[data-bd-image-quality-label]").textContent = messages.qualityPreset;
    dialog.querySelector("[data-bd-image-alt-text]").textContent = messages.altText;
    dialog.querySelector("[data-bd-image-alt-hint]").textContent = messages.altTextHint;
    dialog.querySelector("[data-bd-image-width-label]").textContent = messages.imageWidth;
    dialog.querySelector("[data-bd-image-height-label]").textContent = messages.imageHeight;
    dialog.querySelector("[data-bd-image-ratio-label]").textContent = messages.imageKeepRatio;
    dialog.querySelector("[data-bd-image-layout-label]").textContent = messages.imageLayout;
    dialog.querySelector("[data-bd-image-layout-hint]").textContent = messages.imageLayoutHint;
    dialog.querySelector("[data-bd-image-title-label]").textContent = messages.imageTitle;
    sizeEstimates.hidden = !qualityConfig.show_size_estimates;
    dialog.querySelector("[data-bd-image-insert]").textContent = messages.insertImage;
    dialog.querySelector("[data-bd-image-cancel]").textContent = messages.cancel;
    dialog.querySelector("[data-bd-image-close]").title = messages.close;
    dialog.querySelector("[data-bd-image-close]").setAttribute("aria-label", messages.close);
    dialog.querySelector("[data-bd-image-close]").replaceChildren(createIcon(CloseIcon));
    dialog.querySelector("[data-bd-image-quality-label]").setAttribute("for", "bd-editor-quality");
    qualityRange.id = `bd-editor-quality-${source.id || "field"}`;
    dialog.querySelector("[data-bd-image-quality-label]").setAttribute("for", qualityRange.id);
    error.textContent = "";
    setupImagePropertyFields(dialog, {
      width: dimensions?.width,
      height: dimensions?.height,
      layout: config.images.default_layout,
    });

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
    qualityRange.min = String(qualityConfig.min_quality);
    qualityRange.max = String(qualityConfig.max_quality);
    qualityRange.setAttribute("aria-label", messages.qualityPreset);
    let estimateRevision = 0;
    let estimateTimer = null;

    function updateQualityControls() {
      const isPng = formatSelect.value === "PNG";
      const canChooseQuality =
        qualityConfig.allow_quality_selection &&
        !isPng &&
        qualityConfig.min_quality < qualityConfig.max_quality;
      qualitySelect.disabled = !canChooseQuality;
      qualityRange.disabled = !canChooseQuality;
      qualityHint.textContent = isPng ? messages.pngLossless : "";
      qualityOutput.textContent = messages.qualityValue.replace("{value}", qualityRange.value);
    }

    function scheduleSizeEstimates() {
      window.clearTimeout(estimateTimer);
      estimateTimer = window.setTimeout(updateSizeEstimates, 300);
    }

    async function updateSizeEstimates() {
      if (!qualityConfig.show_size_estimates) return;
      const revision = ++estimateRevision;
      sizeEstimates.textContent = messages.estimatingSizes;
      const format = formatSelect.value;
      const estimates = format === "PNG"
        ? [{ label: messages.pngLosslessEstimate, quality: qualityConfig.quality }]
        : qualitySelect.value === "custom"
          ? [
              {
                label: messages.qualityEstimateCurrent.replace("{value}", qualityRange.value),
                quality: Number(qualityRange.value),
              },
            ]
          : [
              { label: messages.qualityHigh, quality: qualityValues.high },
              { label: messages.qualityBalanced, quality: qualityValues.balanced },
              { label: messages.qualityCompact, quality: qualityValues.compact },
            ];
      try {
        const sizes = await estimateImageSizes(
          file,
          format,
          estimates.map(({ quality }) => quality),
        );
        if (revision !== estimateRevision) return;
        sizeEstimates.textContent = [
          messages.estimatedSizes,
          ...estimates.map(({ label }, index) =>
            messages.qualityEstimate
              .replace("{label}", label)
              .replace("{size}", formatFileSize(sizes[index])),
          ),
        ].join(" ");
      } catch (estimateError) {
        console.warn("BD-Editor could not estimate image output sizes.", estimateError);
        if (revision === estimateRevision) {
          sizeEstimates.textContent = messages.sizeEstimatesUnavailable;
        }
      }
    }

    qualitySelect.onchange = () => {
      if (qualityValues[qualitySelect.value] !== undefined) {
        qualityRange.value = String(qualityValues[qualitySelect.value]);
      }
      updateQualityControls();
      scheduleSizeEstimates();
    };
    qualityRange.oninput = () => {
      qualitySelect.value = "custom";
      updateQualityControls();
      scheduleSizeEstimates();
    };
    formatSelect.onchange = () => {
      updateQualityControls();
      updateSizeEstimates();
    };
    updateQualityControls();
    updateSizeEstimates();

    dialog.__bdUpload = { file, dimensions, qualityValues };
    dialog.__bdTarget = null;
    openDialog(dialog);
    altField.focus();
  }

  function getSelectedImageContext() {
    const selection = editor.state.selection;
    if (selection.node?.type.name !== "image") return null;
    const nodeDOM = editor.view.nodeDOM(selection.from);
    const imageDOM =
      nodeDOM instanceof HTMLImageElement ? nodeDOM : nodeDOM?.querySelector?.("img");
    const renderedSize = imageDOM?.getBoundingClientRect();
    const width =
      Math.round(renderedSize?.width || 0) ||
      Number(selection.node.attrs.width) ||
      imageDOM?.naturalWidth ||
      null;
    const height =
      Math.round(renderedSize?.height || 0) ||
      Number(selection.node.attrs.height) ||
      imageDOM?.naturalHeight ||
      null;
    return {
      position: selection.from,
      attrs: selection.node.attrs,
      width,
      height,
      nodeView: nodeDOM instanceof HTMLElement ? nodeDOM : null,
    };
  }

  function openSelectedImageDialog() {
    const image = getSelectedImageContext();
    if (!image) return;
    const dialog = root.querySelector('[data-bd-dialog="image"]');
    const widthField = dialog.querySelector("[data-bd-image-width]");
    const imageConfig = config.images;
    const uploadOptions = dialog.querySelector("[data-bd-image-upload-options]");
    const sizeEstimates = dialog.querySelector("[data-bd-image-estimates]");

    dialog.dataset.bdMode = "edit";
    uploadOptions.hidden = true;
    sizeEstimates.hidden = true;
    sizeEstimates.textContent = "";
    dialog.querySelector("[data-bd-image-title]").textContent = messages.editImage;
    dialog.querySelector("[data-bd-image-alt-text]").textContent = messages.altText;
    dialog.querySelector("[data-bd-image-alt-hint]").textContent = messages.altTextHint;
    dialog.querySelector("[data-bd-image-width-label]").textContent = messages.imageWidth;
    dialog.querySelector("[data-bd-image-height-label]").textContent = messages.imageHeight;
    dialog.querySelector("[data-bd-image-ratio-label]").textContent = messages.imageKeepRatio;
    dialog.querySelector("[data-bd-image-layout-label]").textContent = messages.imageLayout;
    dialog.querySelector("[data-bd-image-layout-hint]").textContent = messages.imageLayoutHint;
    dialog.querySelector("[data-bd-image-title-label]").textContent = messages.imageTitle;
    dialog.querySelector("[data-bd-image-insert]").textContent = messages.saveImageChanges;
    dialog.querySelector("[data-bd-image-cancel]").textContent = messages.cancel;
    dialog.querySelector("[data-bd-image-close]").title = messages.close;
    dialog.querySelector("[data-bd-image-close]").setAttribute("aria-label", messages.close);
    dialog.querySelector("[data-bd-image-close]").replaceChildren(createIcon(CloseIcon));
    dialog.querySelector("[data-bd-image-error]").textContent = "";
    setupImagePropertyFields(dialog, {
      width: image.width,
      height: image.height,
      layout: image.attrs.layout || imageConfig.default_layout,
      inlineVerticalAlignment: image.attrs.inlineVerticalAlignment,
      preserveAspectRatio: image.attrs.preserveAspectRatio,
      alt: image.attrs.alt,
      title: image.attrs.title,
      nodeView: image.nodeView,
    });
    dialog.__bdUpload = null;
    dialog.__bdTarget = {
      position: image.position,
      width: image.width,
      height: image.height,
      nodeView: image.nodeView,
    };
    openDialog(dialog);
    if (imageConfig.allow_resize && widthField.value) widthField.focus();
    else dialog.querySelector("[data-bd-image-layout]").focus();
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

  function getImageProperties(dialog, fallbackDimensions, mode) {
    const imageConfig = config.images;
    const widthField = dialog.querySelector("[data-bd-image-width]");
    const heightField = dialog.querySelector("[data-bd-image-height]");
    const layout = dialog.querySelector("[data-bd-image-layout]").value;
    const inlineVerticalAlignment = dialog.querySelector("[data-bd-image-inline-alignment]").value;
    const properties = {
      layout,
      inlineVerticalAlignment,
      preserveAspectRatio: dialog.querySelector("[data-bd-image-ratio]").checked,
      alt: dialog.querySelector("[data-bd-image-alt]").value.trim(),
      title: dialog.querySelector("[data-bd-image-title-value]").value.trim() || null,
    };
    if (!imageConfig.allowed_layouts.includes(layout)) {
      dialog.querySelector("[data-bd-image-error]").textContent = messages.invalidImageLayout;
      return null;
    }
    if (!imageConfig.inline_vertical_alignments.includes(inlineVerticalAlignment)) {
      dialog.querySelector("[data-bd-image-error]").textContent =
        messages.invalidImageVerticalAlignment;
      return null;
    }

    if (!imageConfig.allow_resize && mode === "edit") return properties;
    const widthText = widthField.value.trim();
    const heightText = heightField.value.trim();
    const nodeView = dialog.__bdTarget?.nodeView || null;
    const maxWidth = getImageWidthLimit(layout, nodeView);
    if (!widthText && !heightText) {
      const dimensions = fitImageDimensionsForLayout(
        fallbackDimensions?.width,
        fallbackDimensions?.height,
        layout,
        nodeView,
      );
      if (dimensions.width && dimensions.height) Object.assign(properties, dimensions);
      return properties;
    }
    if (!widthText || !heightText) {
      dialog.querySelector("[data-bd-image-error]").textContent =
        messages.invalidImageDimensions;
      return null;
    }

    const width = Number(widthText);
    const height = Number(heightText);
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      width > maxWidth ||
      height < 1 ||
      height > imageConfig.max_height
    ) {
      dialog.querySelector("[data-bd-image-error]").textContent =
        messages.invalidImageDimensions;
      return null;
    }
    return { ...properties, width, height };
  }

  async function uploadSelectedImage() {
    const dialog = root.querySelector('[data-bd-dialog="image"]');
    const error = dialog.querySelector("[data-bd-image-error]");
    const upload = dialog.__bdUpload;
    if (!upload) return;
    const selectedProperties = getImageProperties(dialog, upload.dimensions, "upload");
    if (!selectedProperties) return;

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
      const imageProperties = { ...selectedProperties };
      if (!imageProperties.width || !imageProperties.height) {
        Object.assign(
          imageProperties,
          fitImageDimensions(result.width, result.height),
        );
      }

      const imageSelection = source.__bdImageSelection;
      const inserted = editor
        .chain()
        .focus()
        .setTextSelection(imageSelection)
        .insertContent({
          type: "image",
          attrs: {
            src: result.url,
            ...imageProperties,
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

  function updateSelectedImage() {
    const dialog = root.querySelector('[data-bd-dialog="image"]');
    const error = dialog.querySelector("[data-bd-image-error]");
    const target = dialog.__bdTarget;
    if (!target) return;
    const properties = getImageProperties(
      dialog,
      { width: target.width, height: target.height },
      "edit",
    );
    if (!properties) return;
    const saveButton = dialog.querySelector("[data-bd-image-insert]");
    saveButton.disabled = true;
    error.textContent = "";
    try {
      const updated = editor
        .chain()
        .focus()
        .setNodeSelection(target.position)
        .updateAttributes("image", properties)
        .run();
      if (!updated) throw new Error(messages.imageEditFailure);
      closeDialog(dialog);
    } catch (editError) {
      error.textContent =
        editError instanceof Error ? editError.message : messages.imageEditFailure;
    } finally {
      saveButton.disabled = false;
    }
  }

  function submitImageDialog() {
    if (root.querySelector('[data-bd-dialog="image"]').dataset.bdMode === "edit") {
      updateSelectedImage();
      return;
    }
    void uploadSelectedImage();
  }

  const imageDialog = root.querySelector('[data-bd-dialog="image"]');
  imageDialog.querySelector("[data-bd-image-insert]").addEventListener("click", submitImageDialog);
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

  const tableStyleScope = root.querySelector("[data-bd-table-style-scope]");
  const tableStylePrimary = root.querySelector("[data-bd-table-style-primary]");
  const tableStyleSecondary = root.querySelector("[data-bd-table-style-secondary]");
  const tableStyleSecondaryField = root.querySelector("[data-bd-table-style-secondary-field]");
  const tableStyleApply = root.querySelector("[data-bd-table-style-apply]");
  const tableStyleClear = root.querySelector("[data-bd-table-style-clear]");
  root.querySelector("[data-bd-table-style-scope-label]").textContent = messages.tableStyleScope;
  root.querySelector("[data-bd-table-style-primary-label]").textContent = messages.tableStyleCell;
  root.querySelector("[data-bd-table-style-secondary-label]").textContent =
    messages.tableStyleEvenRows;
  tableStyleScope.querySelector('[value="cell"]').textContent = messages.tableStyleCell;
  tableStyleScope.querySelector('[value="row"]').textContent = messages.tableStyleRow;
  tableStyleScope.querySelector('[value="zebra"]').textContent = messages.tableStyleZebra;
  tableStylePrimary.setAttribute("aria-label", messages.tableStyleCell);
  tableStyleSecondary.setAttribute("aria-label", messages.tableStyleEvenRows);
  tableStyleApply.textContent = messages.tableStyleApply;
  tableStyleClear.textContent = messages.tableStyleClear;

  function getCurrentTableContext() {
    const { $from } = editor.state.selection;
    let tableDepth = null;
    let rowDepth = null;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const nodeName = $from.node(depth).type.name;
      if (nodeName === "tableRow" && rowDepth === null) rowDepth = depth;
      if (nodeName === "table") {
        tableDepth = depth;
        break;
      }
    }
    if (tableDepth === null || rowDepth === null) return null;
    return {
      table: $from.node(tableDepth),
      tablePos: $from.before(tableDepth),
      row: $from.node(rowDepth),
      rowPos: $from.before(rowDepth),
    };
  }

  function updateRowCells(transaction, row, rowPosition, color) {
    row.forEach((cell, offset) => {
      if (!["tableCell", "tableHeader"].includes(cell.type.name)) return;
      transaction.setNodeMarkup(rowPosition + 1 + offset, null, {
        ...cell.attrs,
        backgroundColor: color,
      });
    });
  }

  function updateTableRows(tableContext, colorForRow) {
    const transaction = editor.state.tr;
    tableContext.table.forEach((row, offset, index) => {
      updateRowCells(
        transaction,
        row,
        tableContext.tablePos + 1 + offset,
        colorForRow(index),
      );
    });
    if (transaction.docChanged) editor.view.dispatch(transaction);
  }

  function applyTableStyle(clear = false) {
    const tableContext = getCurrentTableContext();
    if (!tableContext) return;
    const scope = tableStyleScope.value;
    const primaryColor = clear ? null : tableStylePrimary.value;
    const secondaryColor = clear ? null : tableStyleSecondary.value;
    if (scope === "cell") {
      editor.chain().focus().setCellAttribute("backgroundColor", primaryColor).run();
    } else if (scope === "row") {
      const transaction = editor.state.tr;
      updateRowCells(transaction, tableContext.row, tableContext.rowPos, primaryColor);
      if (transaction.docChanged) editor.view.dispatch(transaction);
    } else {
      updateTableRows(tableContext, (index) =>
        clear ? null : index % 2 === 0 ? primaryColor : secondaryColor,
      );
    }
  }

  function updateTableStyleControls() {
    const zebra = tableStyleScope.value === "zebra";
    tableStyleSecondaryField.hidden = !zebra;
    tableStylePrimary.setAttribute(
      "aria-label",
      zebra
        ? messages.tableStyleOddRows
        : tableStyleScope.value === "row"
          ? messages.tableStyleRow
          : messages.tableStyleCell,
    );
    root.querySelector("[data-bd-table-style-primary-label]").textContent =
      zebra
        ? messages.tableStyleOddRows
        : tableStyleScope.value === "row"
          ? messages.tableStyleRow
          : messages.tableStyleCell;
  }

  tableStyleScope.addEventListener("change", updateTableStyleControls);
  tableStyleApply.addEventListener("click", () => applyTableStyle());
  tableStyleClear.addEventListener("click", () => applyTableStyle(true));
  updateTableStyleControls();

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
        [
          "[data-bd-image-alt], [data-bd-image-width], [data-bd-image-height], [data-bd-image-layout], [data-bd-image-inline-alignment], [data-bd-image-title-value]",
          submitImageDialog,
        ],
        ["[data-bd-link-text], [data-bd-link-url]", applyLink],
        ["[data-bd-embed-url]", applyEmbed],
        ["[data-bd-table-rows], [data-bd-table-columns]", insertTable],
        [
          "[data-bd-table-style-scope], [data-bd-table-style-primary], [data-bd-table-style-secondary]",
          () => applyTableStyle(),
        ],
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
  addButton("image_editing", ImageEditIcon, openSelectedImageDialog, "primary");
  function updateImageContextAttribute(attribute, value) {
    const selection = editor.state.selection;
    const position =
      selection.node?.type.name === "image" ? selection.from : selectedImagePosition;
    const node = position === null ? null : editor.state.doc.nodeAt(position);
    if (node?.type.name !== "image") return;
    if (
      attribute === "layout" &&
      !config.images.allowed_layouts.includes(value)
    ) {
      return;
    }
    if (
      attribute === "inlineVerticalAlignment" &&
      !config.images.inline_vertical_alignments.includes(value)
    ) {
      return;
    }

    const attributes = { [attribute]: value };
    if (attribute === "layout") {
      const nodeView = editor.view.nodeDOM(position);
      const image = nodeView instanceof HTMLElement ? nodeView.querySelector("img") : null;
      const dimensions = fitImageDimensionsForLayout(
        Number(node.attrs.width) || image?.naturalWidth,
        Number(node.attrs.height) || image?.naturalHeight,
        value,
        nodeView,
      );
      if (dimensions.width && dimensions.height) Object.assign(attributes, dimensions);
    }

    editor
      .chain()
      .setNodeSelection(position)
      .updateAttributes("image", attributes)
      .run();
    selectedImagePosition = position;
    editor.commands.setNodeSelection(position);
  }
  imageLayoutToolbar.addEventListener("change", () => {
    updateImageContextAttribute("layout", imageLayoutToolbar.value);
  });
  inlineAlignmentToolbar.addEventListener("change", () => {
    updateImageContextAttribute("inlineVerticalAlignment", inlineAlignmentToolbar.value);
  });
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

  const textAlignSelect = toolbarConfig.text_align ? document.createElement("select") : null;
  if (textAlignSelect) {
    textAlignSelect.className = "bd-editor-format-select";
    textAlignSelect.setAttribute("aria-label", messages.text_align);
    for (const [value, label] of [
      ["", messages.alignDefault],
      ["left", messages.alignLeft],
      ["center", messages.alignCenter],
      ["right", messages.alignRight],
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      textAlignSelect.append(option);
    }
    textAlignSelect.addEventListener("change", () => {
      const nodeType = editor.isActive("heading") ? "heading" : "paragraph";
      editor
        .chain()
        .focus()
        .updateAttributes(nodeType, { textAlign: textAlignSelect.value || null })
        .run();
    });
    rows.format.append(textAlignSelect);
    buttonRefs.set("text_align", textAlignSelect);
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
