import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './routing';

export default getRequestConfig(async ({ locale }) => {
  const safeLocale = (locales.includes(locale as any) ? locale : defaultLocale) as typeof defaultLocale;
  return {
    locale: safeLocale,
    messages: (await import(`../messages/${safeLocale}.json`)).default,
  };
});