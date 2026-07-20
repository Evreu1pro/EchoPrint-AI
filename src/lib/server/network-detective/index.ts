// Module 1 — Network Detective (server)
export type {
  NetworkDetectiveReport,
  ClientNetworkClaim,
  NetworkFinding,
  ProxySignals,
  ClientIpInfo,
  GeoHints,
  HeaderSnapshot,
  NetworkRisk,
} from './types';
export { buildNetworkDetectiveReport } from './report';
export { extractClientIp, extractGeoHints } from './ip';
export { snapshotHeaders } from './headers';
export { scoreProxy } from './proxy-score';
