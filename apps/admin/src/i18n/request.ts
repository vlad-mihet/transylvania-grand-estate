import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { loadSharedMessages, mergeMessages, type MessageTree } from "@tge/i18n";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  // Parity with the public apps (landing/revery/academy): merge shared
  // `Common.*` messages from @tge/i18n on top of the app-local bundle so
  // admin can reference shared keys (property types, common actions,
  // legal copy, etc.) without re-defining them.
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
