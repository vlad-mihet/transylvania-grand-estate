import { toast as sonnerToast } from "sonner";
import { ApiError } from "@/lib/api-client";

type ToastInput = string | { title: string; description?: string };

function render(input: ToastInput): { message: string; description?: string } {
  if (typeof input === "string") return { message: input };
  return { message: input.title, description: input.description };
}

export const toast = {
  success(input: ToastInput) {
    const { message, description } = render(input);
    return sonnerToast.success(message, { description });
  },
  error(input: ToastInput) {
    const { message, description } = render(input);
    return sonnerToast.error(message, { description });
  },
  info(input: ToastInput) {
    const { message, description } = render(input);
    return sonnerToast(message, { description });
  },
  warning(input: ToastInput) {
    const { message, description } = render(input);
    return sonnerToast.warning(message, { description });
  },

  promise<T>(
    promise: Promise<T>,
    opts: {
      loading: string;
      success: string | ((value: T) => string);
      error?: string | ((err: unknown) => string);
    },
  ) {
    return sonnerToast.promise(promise, {
      loading: opts.loading,
      success: opts.success,
      error: (err) => {
        if (opts.error) {
          return typeof opts.error === "function" ? opts.error(err) : opts.error;
        }
        return formatApiError(err);
      },
    });
  },

  dismiss: sonnerToast.dismiss,
};

function formatApiError(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
