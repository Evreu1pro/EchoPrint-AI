// ============================================================
// EchoPrint AI — lightweight i18n (EN default, RU)
// ============================================================

export type Locale = 'en' | 'ru';

const en = {
  brand: 'EchoPrint AI',
  tagline: 'Browser fingerprint integrity lab',
  subtitle:
    'Educational scanner for uniqueness, spoof detection, and tracker exposure — fully client-side.',
  scanCta: 'Run full scan',
  scanning: 'Scanning…',
  rescan: 'Scan again',
  scanHint: 'About 8–12 seconds · 100+ signals · no data leaves your device',
  privacyTitle: '100% private',
  privacyBody:
    'Analysis runs only in your browser. We do not upload fingerprints, cookies, or IP data.',
  featUniqueness: 'Uniqueness',
  featUniquenessDesc: 'Entropy-weighted rarity across hardware, canvas, fonts, and more.',
  featIntegrity: 'Integrity',
  featIntegrityDesc: 'Multi-sample canvas/audio noise, prototype tamper, Client Hints drift.',
  featExposure: 'Exposure',
  featExposureDesc: 'Which vectors trackers can use + live third-party hits on this page.',
  featConsistency: 'Consistency',
  featConsistencyDesc: 'Cross-checks UA ↔ GPU ↔ touch ↔ timezone so spoofs stand out.',
  scoreOverall: 'Overall privacy posture',
  scoreUniqueness: 'Uniqueness',
  scoreIntegrity: 'Integrity',
  scoreConsistency: 'Consistency',
  scoreExposure: 'Exposure risk',
  sectionReport: 'Analysis report',
  sectionIntegrity: 'Integrity findings',
  sectionExposure: 'Exposure surface',
  sectionLiveTrackers: 'Live tracker hits',
  sectionSignals: 'Collected signals',
  sectionNoLive:
    'No known tracker scripts/cookies on this page. That is expected here — open a shop or social site and rescan to test live detection.',
  exportJson: 'Export JSON',
  device: 'Device',
  lang: 'Language',
  footerPrivacy: 'Client-side only · MIT · Educational use',
  footerDocs: 'Docs',
  howItWorks: 'How it works',
  how1: 'Collect stable and unstable browser signals',
  how2: 'Score rarity, consistency, and integrity (spoof / bot)',
  how3: 'Map real exposure vectors and optional live tracker hits',
  errorGeneric: 'Scan failed. Reload and try again.',
  riskVeryLow: 'Very low',
  riskLow: 'Low',
  riskMedium: 'Medium',
  riskHigh: 'High',
  riskVeryHigh: 'Very high',
  available: 'Exposed',
  blocked: 'Not available',
  confidence: 'Confidence',
  evidence: 'Evidence',
  recommendations: 'Recommendations',
  tips: 'Privacy tips',
  canvasStable: 'Canvas stable',
  canvasUnstable: 'Canvas unstable (noise)',
  audioStable: 'Audio stable',
  audioUnstable: 'Audio unstable',
  noFindings: 'No integrity issues detected.',
  vectorsTitle: 'Fingerprint vectors',
  mitigation: 'Mitigation',
  matched: 'Matched',
  progressDefault: 'Initializing',
} as const;

const ru: Record<keyof typeof en, string> = {
  brand: 'EchoPrint AI',
  tagline: 'Лаборатория целостности browser fingerprint',
  subtitle:
    'Образовательный сканер уникальности, spoof-детекции и поверхности трекинга — только в браузере.',
  scanCta: 'Полное сканирование',
  scanning: 'Сканирование…',
  rescan: 'Сканировать снова',
  scanHint: 'Около 8–12 секунд · 100+ сигналов · данные не уходят с устройства',
  privacyTitle: '100% приватно',
  privacyBody:
    'Анализ только в вашем браузере. Мы не загружаем fingerprint, cookies или IP.',
  featUniqueness: 'Уникальность',
  featUniquenessDesc: 'Энтропия и редкость по hardware, canvas, шрифтам и др.',
  featIntegrity: 'Целостность',
  featIntegrityDesc: 'Мульти-сэмплы canvas/audio, подмена prototype, Client Hints drift.',
  featExposure: 'Экспозиция',
  featExposureDesc: 'Какие векторы доступны трекерам + живые хиты на странице.',
  featConsistency: 'Согласованность',
  featConsistencyDesc: 'Сверки UA ↔ GPU ↔ touch ↔ timezone — spoof сразу виден.',
  scoreOverall: 'Общий уровень приватности',
  scoreUniqueness: 'Уникальность',
  scoreIntegrity: 'Целостность',
  scoreConsistency: 'Согласованность',
  scoreExposure: 'Риск экспозиции',
  sectionReport: 'Отчёт анализа',
  sectionIntegrity: 'Находки целостности',
  sectionExposure: 'Поверхность экспозиции',
  sectionLiveTrackers: 'Живые трекеры',
  sectionSignals: 'Собранные сигналы',
  sectionNoLive:
    'На этой странице нет известных трекер-скриптов/cookies — это нормально. Откройте магазин или соцсеть и пересканируйте.',
  exportJson: 'Экспорт JSON',
  device: 'Устройство',
  lang: 'Язык',
  footerPrivacy: 'Только client-side · MIT · Для обучения',
  footerDocs: 'Документация',
  howItWorks: 'Как это работает',
  how1: 'Собираем стабильные и нестабильные сигналы браузера',
  how2: 'Считаем редкость, согласованность и целостность (spoof / bot)',
  how3: 'Строим карту векторов и опциональные live-хиты трекеров',
  errorGeneric: 'Скан не удался. Обновите страницу и попробуйте снова.',
  riskVeryLow: 'Очень низкий',
  riskLow: 'Низкий',
  riskMedium: 'Средний',
  riskHigh: 'Высокий',
  riskVeryHigh: 'Очень высокий',
  available: 'Доступен',
  blocked: 'Недоступен',
  confidence: 'Уверенность',
  evidence: 'Доказательства',
  recommendations: 'Рекомендации',
  tips: 'Советы по приватности',
  canvasStable: 'Canvas стабилен',
  canvasUnstable: 'Canvas нестабилен (шум)',
  audioStable: 'Audio стабилен',
  audioUnstable: 'Audio нестабилен',
  noFindings: 'Проблем целостности не найдено.',
  vectorsTitle: 'Векторы fingerprint',
  mitigation: 'Защита',
  matched: 'Совпадения',
  progressDefault: 'Инициализация',
};

export type MessageKey = keyof typeof en;

const catalogs: Record<Locale, Record<MessageKey, string>> = { en: { ...en }, ru };

export function t(locale: Locale, key: MessageKey): string {
  return catalogs[locale][key] ?? catalogs.en[key] ?? key;
}

export function riskLabel(locale: Locale, level: string): string {
  const map: Record<string, MessageKey> = {
    very_low: 'riskVeryLow',
    low: 'riskLow',
    medium: 'riskMedium',
    high: 'riskHigh',
    very_high: 'riskVeryHigh',
    LOW: 'riskLow',
    MEDIUM: 'riskMedium',
    HIGH: 'riskHigh',
    CRITICAL: 'riskVeryHigh',
  };
  const k = map[level];
  return k ? t(locale, k) : level;
}
