import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

export type ImageUploader = (file: File) => Promise<string>;

interface ImageUploadOptions {
  uploader: ImageUploader | null;
  onError?: (err: unknown) => void;
}

const IMAGE_MIME_REGEX = /^image\/(jpeg|jpg|png|webp|avif|gif)$/;

/**
 * Tiptap extension that intercepts paste + drop of image files and uploads
 * them via the injected `uploader` callback. On success, inserts an image
 * node at the drop/paste position with the returned URL.
 *
 * Stays a thin transport layer — the actual server contract lives in the
 * uploader closure passed by the React layer (`uploadInlineImage` in
 * `editor-core.tsx`). That separation keeps the editor surface decoupled
 * from API client details and makes the extension testable in isolation.
 *
 * Errors are surfaced via the optional `onError` hook so the React layer
 * can toast / mark the editor as failed. If the uploader is `null` (e.g.
 * unauthenticated, feature disabled), the extension is inert — paste/drop
 * fall through to default Tiptap behavior (i.e. plain markdown / no-op).
 */
export const ImageUploadExtension = Extension.create<ImageUploadOptions>({
  name: "inlineImageUpload",

  addOptions() {
    return {
      uploader: null,
      onError: undefined,
    };
  },

  addProseMirrorPlugins() {
    // Capture the option getters by reference once. Tiptap re-creates the
    // extension instance on `configure()`, so closing over the options here
    // is equivalent to reading them off `this` lazily but keeps the lint
    // rule (no-this-alias) satisfied.
    const getUploader = () => this.options.uploader;
    const getOnError = () => this.options.onError;

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            drop: (view, event) => {
              const uploader = getUploader();
              if (!uploader) return false;
              const files = Array.from(event.dataTransfer?.files ?? []).filter(
                (f) => IMAGE_MIME_REGEX.test(f.type),
              );
              if (files.length === 0) return false;
              event.preventDefault();

              const pos =
                view.posAtCoords({ left: event.clientX, top: event.clientY })
                  ?.pos ?? view.state.selection.from;

              void Promise.all(files.map((file) => uploader(file))).then(
                (urls) => {
                  const { schema } = view.state;
                  const imageType = schema.nodes.image;
                  if (!imageType) return;
                  const tr = view.state.tr;
                  let insertAt = pos;
                  for (const url of urls) {
                    const node = imageType.create({ src: url });
                    tr.insert(insertAt, node);
                    insertAt += node.nodeSize;
                  }
                  view.dispatch(tr);
                },
                (err) => {
                  getOnError()?.(err);
                },
              );
              return true;
            },
          },
          handlePaste: (view, event) => {
            const uploader = getUploader();
            if (!uploader) return false;
            const items = Array.from(event.clipboardData?.items ?? []);
            const fileItems = items.filter(
              (i) => i.kind === "file" && IMAGE_MIME_REGEX.test(i.type),
            );
            if (fileItems.length === 0) return false;
            event.preventDefault();

            const files = fileItems
              .map((i) => i.getAsFile())
              .filter((f): f is File => f != null);
            if (files.length === 0) return false;

            const pos = view.state.selection.from;

            void Promise.all(files.map((file) => uploader(file))).then(
              (urls) => {
                const { schema } = view.state;
                const imageType = schema.nodes.image;
                if (!imageType) return;
                const tr = view.state.tr;
                let insertAt = pos;
                for (const url of urls) {
                  const node = imageType.create({ src: url });
                  tr.insert(insertAt, node);
                  insertAt += node.nodeSize;
                }
                view.dispatch(tr);
              },
              (err) => {
                getOnError()?.(err);
              },
            );
            return true;
          },
        },
      }),
    ];
  },
});
