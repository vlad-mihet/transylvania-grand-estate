export { LocaleModule } from './locale.module';
export { LocaleMiddleware } from './locale.middleware';
export { CurrentLocale, LocaleScope } from './locale.decorator';
export {
  LocalizedSerializerInterceptor,
  isLocalizedShaped,
} from './localized-serializer.interceptor';
export {
  EXPAND_ALL_LOCALES,
  LOCALE_SCOPE_METADATA,
  type LocaleContext,
  type LocaleSource,
  type LocaleScopeValue,
} from './locale.types';
