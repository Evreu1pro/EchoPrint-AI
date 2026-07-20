// ============================================================
// EchoPrint AI — lightweight i18n (EN default, RU)
// ============================================================

export type Locale = 'en' | 'ru';

const en = {
  brand: 'EchoPrint AI',
  tagline: 'M1–M5 fingerprint lab',
  rescan: 'Scan again',
  privacyTitle: 'Privacy-first lab',
  privacyBody:
    'M2–M5 run in your browser. M1 is an ephemeral /api/fp request (IP intel, no DB). Scan history stays in localStorage only.',
  exportJson: 'Export JSON',
  footerPrivacy: 'Educational · MIT · History local-only',
  footerDocs: 'Docs',
  howItWorks: 'How it works',
  errorGeneric: 'Scan failed. Reload and try again.',
  historyTitle: 'Scan history',
  compareTitle: 'Compare scans',
  compareCta: 'Compare 2',
} as const;

const ru: Record<keyof typeof en, string> = {
  brand: 'EchoPrint AI',
  tagline: 'Лаборатория fingerprint M1–M5',
  rescan: 'Сканировать снова',
  privacyTitle: 'Privacy-first',
  privacyBody:
    'M2–M5 — в браузере. M1 — эфемерный /api/fp (IP intel, без БД). История только в localStorage.',
  exportJson: 'Экспорт JSON',
  footerPrivacy: 'Обучение · MIT · История только локально',
  footerDocs: 'Документация',
  howItWorks: 'Как это работает',
  errorGeneric: 'Скан не удался. Обновите страницу и попробуйте снова.',
  historyTitle: 'История сканов',
  compareTitle: 'Сравнение сканов',
  compareCta: 'Сравнить 2',
};

export type MessageKey = keyof typeof en;

const catalogs: Record<Locale, Record<MessageKey, string>> = { en: { ...en }, ru };

export function t(locale: Locale, key: MessageKey): string {
  return catalogs[locale][key] ?? catalogs.en[key] ?? key;
}
