# 🔍 EchoPrint AI

**Образовательный AI-анализатор уникальности и реалистичности устройства/браузера**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

## 🎯 О проекте

EchoPrint AI помогает пользователям понять, насколько их браузер и устройство выделяются среди миллионов других в интернете. Инструмент собирает характеристики, анализирует уровень уникальности цифрового отпечатка, проверяет согласованность параметров и даёт рекомендации по улучшению приватности.

### ✨ Ключевые возможности

- **📊 80+ сигналов** для сбора fingerprint-данных
- **📱 Авто-определение устройства** — мобильное/планшет/десктоп/Smart TV/консоль
- **🎯 Адаптивные рекомендации** — разные советы для разных типов устройств
- **🔍 Target Detection** — детекция трекеров AliExpress, Amazon, Facebook, Google, TikTok
- **🔐 100% приватность** — все данные обрабатываются только в браузере
- **🤖 AI-анализ** с понятными рекомендациями на русском языке
- **📈 Uniqueness Score** — оценка уникальности устройства (0-100%)
- **✅ Consistency Score** — 30+ правил проверки логичности параметров
- **⚠️ Anomaly Detection** — обнаружение виртуализации, автоматизации, модификаций
- **💾 Экспорт отчёта** в JSON для личного использования

## 🔍 Target Detection (Новое!)

EchoPrint AI теперь определяет известные трекеры популярных платформ:

| Платформа | Risk Level | Методы отслеживания |
|-----------|------------|---------------------|
| **AliExpress** | 🔴 CRITICAL | Canvas, WebGL, Audio, Fonts, Battery, Behavioral |
| **Facebook/Meta** | 🔴 CRITICAL | Canvas, WebGL, Audio, Fonts, WebRTC, Behavioral |
| **TikTok** | 🔴 CRITICAL | Canvas, WebGL, Audio, Fonts, Sensors, Battery, Behavioral |
| **Google** | 🔴 CRITICAL | Canvas, WebGL, Audio, Fonts, Behavioral |
| **Amazon** | 🟠 HIGH | Canvas, WebGL, Fonts, Behavioral |

### Что анализируется:
- **Домены трекинга** — первичные и сторонние
- **JS-библиотеки** — скрипты отслеживания
- **Fingerprint методы** — какие техники используются
- **Storage keys** — cookies и localStorage
- **Известные уязвимости** — GDPR нарушения, CVE

## 🛠️ Технологии

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Fingerprint**: @fingerprintjs/fingerprintjs
- **Deployment**: GitHub Pages / Vercel / Netlify (static export)

## 📦 Установка

### Требования

- Node.js 18+ 
- bun или npm

### Локальный запуск

```bash
# Клонирование репозитория
git clone https://github.com/yourusername/echoprint-ai.git
cd echoprint-ai

# Установка зависимостей
bun install
# или
npm install

# Запуск в режиме разработки
bun run dev
# или
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

### Сборка для production

```bash
bun run build
# или
npm run build
```

## 🚀 Деплой

### GitHub Pages

1. Обновите `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/echoprint-ai', // ваш репозиторий
  images: {
    unoptimized: true
  }
};
```

2. Соберите и задеплойте:

```bash
bun run build
# Папка 'out' содержит статический сайт
```

### Vercel (рекомендуется)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/echoprint-ai)

1. Fork репозитория
2. Подключите к Vercel
3. Автоматический деплой при push

### Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

1. Fork репозитория
2. Подключите к Netlify
3. Build command: `npm run build`
4. Publish directory: `out`

## 📊 Собираемые параметры

### Canvas Fingerprint (4 сигнала)
- Text rendering hash
- Geometry rendering hash  
- Gradient rendering hash
- Emoji rendering hash

### WebGL Fingerprint (10+ сигналов)
- UNMASKED_VENDOR
- UNMASKED_RENDERER
- Extensions list
- Max texture size
- Shader precision
- Rendered scene hash

### Audio Fingerprint (4 сигнала)
- AudioContext hash
- Sample rate
- Channel count
- Offline audio processing

### Hardware (9+ сигналов)
- CPU cores
- Device memory
- Screen resolution
- Color depth
- Pixel ratio
- Touch points
- GPU info

### Navigator & Client Hints (12+ сигналов)
- User-Agent
- Platform
- Languages
- WebDriver flag
- Client Hints (Sec-CH-UA-*)

### И многое другое...

- Fonts enumeration (400+ шрифтов)
- WebRTC leak detection
- Media devices
- Sensors API
- Battery status
- Storage APIs
- Performance timing
- Timezone & locale

## 🔬 Методология анализа

### Uniqueness Score

Рассчитывается на основе Shannon entropy и статистической редкости комбинаций сигналов:

```
Uniqueness = (Entropy / MaxEntropy) * 100
```

- **0-25%**: Массовое устройство, хорошая приватность
- **25-50%**: Мало уникальный, отслеживание затруднено
- **50-75%**: Умеренно уникальный, частичное отслеживание
- **75-100%**: Очень уникальный, легко идентифицировать

### Consistency Score

30+ правил проверки логичности:

- UA ↔ Platform соответствие
- OS ↔ GPU соответствие
- Screen resolution реалистичность
- Browser ↔ Engine соответствие
- Виртуализация GPU
- И многое другое

### Anomaly Detection

Обнаружение:

- 🖥️ Виртуализации (VMware, VirtualBox, Parallels)
- 🤖 Автоматизации (Selenium, WebDriver, Headless)
- 🔧 Модификаций (Canvas randomization, WebGL spoofing)

## 🔐 Приватность

```
⚠️ Все данные обрабатываются только в вашем браузере и никуда не отправляются.
```

- ❌ Нет серверной части
- ❌ Нет cookies для трекинга
- ❌ Нет аналитики
- ❌ Нет внешних запросов
- ✅ Полностью client-side

## 🎨 Кастомизация

### Темы

Используется CSS переменные Tailwind:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 262.1 83.3% 57.8%;
  /* ... */
}
```

### Добавление новых проверок

1. Создайте функцию в `src/lib/fingerprint/`
2. Добавьте типы в `src/lib/types.ts`
3. Интегрируйте в `collector.ts`
4. Добавьте правила в `consistency.ts`

## 🤝 Вклад в проект

Мы приветствуем вклад! Пожалуйста:

1. Fork репозитория
2. Создайте ветку (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT License - используйте свободно для любых целей.

## 🙏 Благодарности

- [FingerprintJS](https://fingerprintjs.com/) — за отличную библиотеку
- [shadcn/ui](https://ui.shadcn.com/) — за красивые компоненты
- [Next.js](https://nextjs.org/) — за лучший React фреймворк

---

**Сделано с ❤️ для приватности в интернете**

---

## English overview

**EchoPrint AI** is an educational browser fingerprint analyzer.

- Collects 80+ client-side signals
- Uniqueness + consistency scoring
- Tracker / target detection (AliExpress, Meta, TikTok, Google, Amazon)
- Privacy-first: processing stays in the browser
- Built with **Next.js 15**, **TypeScript**, deployed on **Vercel**

**Live demo:** https://echo-print-ai.vercel.app

