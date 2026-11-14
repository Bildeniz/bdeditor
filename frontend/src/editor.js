import { Editor, Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import EN_MESSAGES from "../../bd_editor/locale/en.json";
import TR_MESSAGES from "../../bd_editor/locale/tr.json";

const MESSAGES = { en: EN_MESSAGES, tr: TR_MESSAGES };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{1,12}$/;
const formsWithSubmitHandler = new WeakSet();

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
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol)
      && !url.username
      && !url.password;
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
  const canvas = root.querySelector(".bd-editor-canvas");
  const sourceWrapper = root.querySelector(".bd-editor-source-wrapper");
  const sourceView = root.querySelector(".bd-editor-source-view");
  const sourceLabel = root.querySelector(".bd-editor-source-label");
  const status = root.querySelector(".bd-editor-status");
  let sourceMode = false;
  toolbar.setAttribute("aria-label", messages.toolbar);

  window.bdEditorProviders = config.embeds?.providers || [];

  const buttonRefs = new Map();
  let editor = null;
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
      SafeImage.configure({ allowBase64: false }),
      createVideoEmbedExtension(config.embeds?.providers || []),
    ],
    content: source.value || "<p></p>",
    editorProps: {
      attributes: { "aria-label": messages.editor },
    },
    onUpdate: () => {
      if (!editor) return;
      source.value = editor.getHTML();
      status.textContent = "";
      updateToolbar();
    },
    onSelectionUpdate: updateToolbar,
  });

  const labels = {
    heading: messages.heading,
    bold: messages.bold,
    italic: messages.italic,
    underline: messages.underline,
    strike: messages.strike,
    bullet_list: messages.bullet_list,
    ordered_list: messages.ordered_list,
    blockquote: messages.blockquote,
    code_block: messages.code_block,
    link: messages.link,
    image: messages.image,
    embed: messages.embed,
    source: messages.source,
    undo: messages.undo,
    redo: messages.redo,
  };
  const toolbarConfig = config.toolbar || {};

  function addButton(name, action) {
    if (!toolbarConfig[name]) return null;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = labels[name];
    button.title = labels[name];
    button.setAttribute("aria-label", labels[name]);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", action);
    toolbar.append(button);
    buttonRefs.set(name, button);
    return button;
  }

  if (toolbarConfig.heading) {
    const select = document.createElement("select");
    select.setAttribute("aria-label", messages.heading);
    const paragraph = document.createElement("option");
    paragraph.value = "paragraph";
    paragraph.textContent = messages.paragraph;
    select.append(paragraph);
    for (let level = 1; level <= 6; level += 1) {
      const option = document.createElement("option");
      option.value = String(level);
      option.textContent = messages.headingLevel.replace("{level}", String(level));
      select.append(option);
    }
    select.addEventListener("change", () => {
      const chain = editor.chain().focus();
      if (select.value === "paragraph") chain.setParagraph().run();
      else chain.toggleHeading({ level: Number(select.value) }).run();
    });
    toolbar.append(select);
    buttonRefs.set("heading", select);
  }

  addButton("bold", () => editor.chain().focus().toggleBold().run());
  addButton("italic", () => editor.chain().focus().toggleItalic().run());
  addButton("underline", () => editor.chain().focus().toggleUnderline().run());
  addButton("strike", () => editor.chain().focus().toggleStrike().run());
  addButton("bullet_list", () => editor.chain().focus().toggleBulletList().run());
  addButton("ordered_list", () => editor.chain().focus().toggleOrderedList().run());
  addButton("blockquote", () => editor.chain().focus().toggleBlockquote().run());
  addButton("code_block", () => editor.chain().focus().toggleCodeBlock().run());

  addButton("link", () => {
    const current = editor.getAttributes("link").href || "";
    const value = window.prompt(messages.linkPrompt, current);
    if (value === null) return;
    const href = value.trim();
    if (!isSafeLink(href)) {
      status.textContent = messages.invalidLink;
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  });

  addButton("image", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      const uploadUrl = source.dataset.bdUploadUrl;
      const form = source.closest("form");
      const csrfToken = form?.querySelector('input[name="csrfmiddlewaretoken"]')?.value;
      const body = new FormData();
      body.append("image", file);
      body.append("app_label", source.dataset.bdAppLabel || "");
      body.append("model_label", source.dataset.bdModelLabel || "");
      try {
        const response = await fetch(uploadUrl, {
          method: "POST",
          credentials: "same-origin",
          headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
          body,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || messages.uploadFailure);
        if (!isSafeImageUrl(result.url)) throw new Error(messages.uploadFailure);
        editor.chain().focus().setImage({ src: result.url, alt: "" }).run();
      } catch (error) {
        status.textContent = error instanceof Error ? error.message : messages.uploadFailure;
      }
    });
    input.click();
  });

  addButton("embed", () => {
    const value = window.prompt(messages.embedPrompt);
    if (value === null) return;
    if (!editor.commands.insertBdVideo({ src: value.trim() })) {
      status.textContent = messages.invalidEmbed;
    }
  });

  const sourceButton = addButton("source", () => {
    sourceMode = !sourceMode;
    sourceWrapper.hidden = !sourceMode;
    canvas.hidden = sourceMode;
    sourceButton.setAttribute("aria-pressed", String(sourceMode));
    if (sourceMode) {
      sourceView.value = editor.getHTML();
      sourceLabel.textContent = messages.sourceLabel;
      sourceView.focus();
    } else {
      // Parse source through the editor schema; Django sanitizes it again when
      // the form is submitted, so this client-side step is never authoritative.
      editor.commands.setContent(sourceView.value);
      editor.commands.focus();
    }
  });

  addButton("undo", () => editor.chain().focus().undo().run());
  addButton("redo", () => editor.chain().focus().redo().run());

  function updateToolbar() {
    if (!editor || editor.isDestroyed) return;
    for (const [name, button] of buttonRefs) {
      if (name === "heading") {
        const level = [1, 2, 3, 4, 5, 6].find((item) => editor.isActive("heading", { level: item }));
        button.value = level ? String(level) : "paragraph";
      } else {
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
        if (activeNames[name]) {
          button.setAttribute("aria-pressed", String(editor.isActive(activeNames[name])));
        }
      }
    }
  }

  const form = source.closest("form");
  if (form && !formsWithSubmitHandler.has(form)) {
    form.addEventListener(
      "submit",
      () => {
        for (const candidate of form.querySelectorAll("textarea[data-bd-config]")) {
          const candidateEditor = candidate.__bdEditor;
          if (candidateEditor && !candidateEditor.isDestroyed) {
            const candidateSourceMode =
              candidate.nextElementSibling?.querySelector(".bd-editor-source-wrapper")?.hidden === false;
            candidate.value = candidateSourceMode
              ? candidate.nextElementSibling.querySelector(".bd-editor-source-view").value
              : candidateEditor.getHTML();
          }
        }
      },
      true,
    );
    formsWithSubmitHandler.add(form);
  }

  source.__bdEditor = editor;
  source.dataset.bdInitialized = "true";
  source.hidden = true;
  root.hidden = false;
  updateToolbar();
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
