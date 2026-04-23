import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import {
  loadSharedMessages,
  mergeMessages,
  type MessageTree,
} from "@tge/i18n";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const [shared, app] = await Promise.all([
    loadSharedMessages(locale),
    import(`../../messages/${locale}.json`).then(
      (m) => m.default as MessageTree,
    ),
  ]);

  return {
    locale,
    messages: mergeMessages(shared, app),
  };
});
