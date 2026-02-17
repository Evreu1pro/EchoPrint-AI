// ============================================================
// EchoPrint AI - Target Profiles
// Профили известных трекеров и платформ
// ============================================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TargetProfile {
  id: string;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  category: 'ecommerce' | 'social' | 'adtech' | 'analytics' | 'finance' | 'government';
  trackingInfra: {
    primaryDomains: string[];
    thirdPartyTrackers: string[];
    jsLibraries: string[];
  };
  fingerprintMethods: {
    canvas: boolean;
    webgl: boolean;
    audio: boolean;
    fonts: boolean;
    sensors: boolean;
    battery: boolean;
    webrtc: boolean;
    behavioral: boolean;
  };
  storageKeys: string[];
  apiEndpoints: string[];
  detectionTriggers: string[];
  knownVulnerabilities: Array<{
    id: string;
    description: string;
    status: string;
  }>;
  countermeasures: {
    blockDomains: boolean;
    spoofFingerprint: boolean;
    clearCookies: boolean;
    useContainer: boolean;
  };
  regionSpecific?: string[];
  dataTransferDestination?: string[];
}

// ============================================================
// AliExpress Profile
// ============================================================
export const AliExpressProfile: TargetProfile = {
  id: 'aliexpress',
  name: "AliExpress (EU/Global)",
  description: "Крупнейший маркетплейс Alibaba Group с агрессивным трекингом",
  riskLevel: "CRITICAL",
  category: 'ecommerce',
  trackingInfra: {
    primaryDomains: [
      "g.alicdn.com",
      "log.mmstat.com",
      "atanx.alicdn.com",
      "gtd.alicdn.com",
      "acjs.aliyun.com",
      "ynuf.alipay.com",
      "aeis.alicdn.com",
      "afcs.alicdn.com"
    ],
    thirdPartyTrackers: [
      "criteo.com",
      "appsflyer.com",
      "google-analytics.com",
      "facebook.com",
      "rtbhouse.com",
      "moloco.com",
      "remerge.io",
      "tiktok.com",
      "taboola.com",
      "outbrain.com"
    ],
    jsLibraries: [
      "aplus_v2.js",
      "aplus_cplugin.js",
      "aplus_plugin_aefront/index.js",
      "sufei_data/index.js",
      "AWSC/awsc.js",
      "ac.js",
      "retcode.js"
    ]
  },
  fingerprintMethods: {
    canvas: true,
    webgl: true,
    audio: true,
    fonts: true,
    sensors: false,
    battery: true,
    webrtc: false,
    behavioral: true
  },
  storageKeys: [
    // Essential tracking
    "cna", "isg", "xman_f", "xman_t", "xman_us_f", "xman_us_t",
    // Analytics
    "ali_apache_id", "ali_apache_track", "ali_beacon_id",
    // Security/Fraud
    "x5sec", "x5secdata", "baxia_sec_cookie", "sgcookie",
    // Session
    "JSESSIONID", "XSRF-TOKEN", "acs_usuc_t", "_m_h5_tk", "_m_h5_tk_enc",
    // A/B Testing
    "AB_STG", "AB_DATA_TRACK", "AB_ALG", "ali_ab",
    // Localization
    "intl_locale", "intl_common_forever", "aep_common_f", "aep_usuc_f"
  ],
  apiEndpoints: [
    "https://log.mmstat.com/eg.js",
    "https://ynuf.alipay.com/service/collect.json",
    "https://gtd.alicdn.com/tb/log",
    "https://acs.m.taobao.com/h5/mtop.common.gettimestamp",
    "https://h5api.m.taobao.com/h5/mtop.aliexpress.address.renderweb"
  ],
  detectionTriggers: [
    "Блокировка aplus_v2.js",
    "Отключение Canvas/WebGL API",
    "Использование Tor/Mullvad Browser",
    "Подмена User-Agent",
    "Обнаружение VM (SwiftShader и др.)",
    "AdBlock/UBlock с фильтрами alicdn.com"
  ],
  knownVulnerabilities: [
    {
      id: "CVE-2023-36025",
      description: "Session tokens via insecure WebView",
      status: "Patched"
    },
    {
      id: "GDPR-2024-001",
      description: "Unlawful data transfers to China (noyb complaint)",
      status: "Under Investigation"
    },
    {
      id: "PRIVACY-2024",
      description: "Cross-site tracking without consent",
      status: "Known Issue"
    }
  ],
  countermeasures: {
    blockDomains: true,
    spoofFingerprint: true,
    clearCookies: true,
    useContainer: true
  },
  regionSpecific: ["CN", "RU", "BR", "ES", "FR", "DE", "IT", "NL"],
  dataTransferDestination: ["China", "Singapore", "US"]
};

// ============================================================
// Amazon Profile
// ============================================================
export const AmazonProfile: TargetProfile = {
  id: 'amazon',
  name: "Amazon",
  description: "Глобальный маркетплейс с комплексным трекингом поведения",
  riskLevel: "HIGH",
  category: 'ecommerce',
  trackingInfra: {
    primaryDomains: [
      "amazon.com",
      "amazon-adsystem.com",
      "amazonaws.com",
      "cloudfront.net",
      "assoc-amazon.com"
    ],
    thirdPartyTrackers: [
      "doubleclick.net",
      "google-analytics.com",
      "facebook.com",
      "criteo.com",
      "advertising.com"
    ],
    jsLibraries: [
      "amazon-cognito-identity.min.js",
      "amazon-login.js",
      "apex.js",
      "ammers.js"
    ]
  },
  fingerprintMethods: {
    canvas: true,
    webgl: true,
    audio: false,
    fonts: true,
    sensors: false,
    battery: false,
    webrtc: false,
    behavioral: true
  },
  storageKeys: [
    "session-id", "session-id-time", "ubid-main", "ubid-tsv", 
    "x-main", "at-main", "sess-at-main", "csrfToken",
    "apay-session-id", "apay-device-id"
  ],
  apiEndpoints: [
    "https://www.amazon.com/gp/navigation/dynamic/ recurse.html",
    "https://completion.amazon.com/api/2017/suggestions"
  ],
  detectionTriggers: [
    "Отключение Amazon-ADSystem",
    "Подмена Accept-Language",
    "Блокировка cookie session-id"
  ],
  knownVulnerabilities: [
    {
      id: "PRIVACY-2023",
      description: "Cross-device tracking without explicit consent",
      status: "Known Issue"
    }
  ],
  countermeasures: {
    blockDomains: true,
    spoofFingerprint: false,
    clearCookies: true,
    useContainer: false
  },
  regionSpecific: ["US", "UK", "DE", "FR", "IT", "ES", "JP", "IN"],
  dataTransferDestination: ["US", "EU", "UK"]
};

// ============================================================
// Facebook/Meta Profile
// ============================================================
export const FacebookProfile: TargetProfile = {
  id: 'facebook',
  name: "Facebook / Meta",
  description: "Социальная сеть с тотальным отслеживанием",
  riskLevel: "CRITICAL",
  category: 'social',
  trackingInfra: {
    primaryDomains: [
      "facebook.com",
      "fbcdn.net",
      "facebook.net",
      "fb.com",
      "messenger.com",
      "instagram.com",
      "whatsapp.com"
    ],
    thirdPartyTrackers: [
      "doubleclick.net",
      "google-analytics.com",
      "googleadservices.com",
      "bing.com"
    ],
    jsLibraries: [
      "fbevents.js",
      "connect.facebook.net",
      "recaptcha__en.js",
      "detectproxy.js"
    ]
  },
  fingerprintMethods: {
    canvas: true,
    webgl: true,
    audio: true,
    fonts: true,
    sensors: false,
    battery: false,
    webrtc: true,
    behavioral: true
  },
  storageKeys: [
    "fr", "datr", "sb", "c_user", "xs", "wd", "dpr", 
    "presence", "locale", "reg_ext_ref", "reg_fb_ref"
  ],
  apiEndpoints: [
    "https://graph.facebook.com/",
    "https://www.facebook.com/ajax/bz",
    "https://www.facebook.com/tr/"
  ],
  detectionTriggers: [
    "Блокировка fbevents.js",
    "Отключение Facebook Pixel",
    "Использование Facebook Container",
    "Очистка datr cookie"
  ],
  knownVulnerabilities: [
    {
      id: "GDPR-2021-IRISH",
      description: "Illegal processing of sensitive data",
      status: "Fined €1.2B"
    },
    {
      id: "PRIVACY-2023",
      description: "Shadow profiles of non-users",
      status: "Ongoing Investigation"
    }
  ],
  countermeasures: {
    blockDomains: true,
    spoofFingerprint: true,
    clearCookies: true,
    useContainer: true
  },
  dataTransferDestination: ["US", "Ireland", "Singapore"]
};

// ============================================================
// Google Profile
// ============================================================
export const GoogleProfile: TargetProfile = {
  id: 'google',
  name: "Google",
  description: "Поисковик с комплексным трекингом всей экосистемы",
  riskLevel: "CRITICAL",
  category: 'analytics',
  trackingInfra: {
    primaryDomains: [
      "google.com",
      "google-analytics.com",
      "googletagmanager.com",
      "googleadservices.com",
      "googlesyndication.com",
      "doubleclick.net",
      "gstatic.com",
      "youtube.com"
    ],
    thirdPartyTrackers: [],
    jsLibraries: [
      "analytics.js",
      "gtag.js",
      "gtm.js",
      "recaptcha__en.js",
      "cbt.js"
    ]
  },
  fingerprintMethods: {
    canvas: true,
    webgl: true,
    audio: true,
    fonts: true,
    sensors: false,
    battery: false,
    webrtc: false,
    behavioral: true
  },
  storageKeys: [
    "_ga", "_gid", "_gat", "__utma", "__utmb", "__utmc", "__utmz",
    "SID", "HSID", "SSID", "APISID", "SAPISID", "NID", "1P_JAR"
  ],
  apiEndpoints: [
    "https://www.google-analytics.com/collect",
    "https://www.googletagmanager.com/gtm.js",
    "https://www.google.com/gen_204"
  ],
  detectionTriggers: [
    "Блокировка Google Analytics",
    "Отключение GA cookies",
    "Использование Privacy Badger",
    "Установка Optimize extension"
  ],
  knownVulnerabilities: [
    {
      id: "GDPR-2022-FRANCE",
      description: "Illegal cookie consent implementation",
      status: "Fined €150M"
    }
  ],
  countermeasures: {
    blockDomains: true,
    spoofFingerprint: false,
    clearCookies: true,
    useContainer: false
  },
  dataTransferDestination: ["US", "EU", "Global"]
};

// ============================================================
// TikTok Profile
// ============================================================
export const TikTokProfile: TargetProfile = {
  id: 'tiktok',
  name: "TikTok",
  description: "Социальная сеть с агрессивным поведенческим трекингом",
  riskLevel: "CRITICAL",
  category: 'social',
  trackingInfra: {
    primaryDomains: [
      "tiktok.com",
      "tiktokv.com",
      "tiktokcdn.com",
      "byteoversea.com",
      "bytedance.com",
      "ibytedtos.com"
    ],
    thirdPartyTrackers: [
      "facebook.com",
      "google-analytics.com",
      "adjust.com",
      "appsdt.com"
    ],
    jsLibraries: [
      "analytics.js",
      "pixel.js",
      "ttq.js"
    ]
  },
  fingerprintMethods: {
    canvas: true,
    webgl: true,
    audio: true,
    fonts: true,
    sensors: true,
    battery: true,
    webrtc: false,
    behavioral: true
  },
  storageKeys: [
    "sid_tt", "sid_guard", "uid_tt", "odin_tt", 
    "sessionid", "tt_webid", "tt_webid_v2"
  ],
  apiEndpoints: [
    "https://m.tiktok.com/api/",
    "https://web.tiktok.com/api/"
  ],
  detectionTriggers: [
    "Блокировка ttq.js",
    "Отключение clipboard access",
    "Блокировка sensors API"
  ],
  knownVulnerabilities: [
    {
      id: "PRIVACY-2024",
      description: "Clipboard snooping",
      status: "Patched"
    },
    {
      id: "GDPR-2023",
      description: "Data transfers to China",
      status: "Under Investigation"
    }
  ],
  countermeasures: {
    blockDomains: true,
    spoofFingerprint: true,
    clearCookies: true,
    useContainer: true
  },
  dataTransferDestination: ["China", "Singapore", "US"]
};

// ============================================================
// All Target Profiles Registry
// ============================================================
export const ALL_TARGET_PROFILES: TargetProfile[] = [
  AliExpressProfile,
  AmazonProfile,
  FacebookProfile,
  GoogleProfile,
  TikTokProfile
];

export function getTargetProfile(id: string): TargetProfile | undefined {
  return ALL_TARGET_PROFILES.find(p => p.id === id);
}

export function getProfilesByCategory(category: TargetProfile['category']): TargetProfile[] {
  return ALL_TARGET_PROFILES.filter(p => p.category === category);
}

export function getProfilesByRisk(risk: RiskLevel): TargetProfile[] {
  return ALL_TARGET_PROFILES.filter(p => p.riskLevel === risk);
}
