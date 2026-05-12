import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// 静态数据模式：从 public/data/ 目录读取 JSON
const STATIC_DATA_MAP: Record<string, string> = {
  '/api/inns': '/data/inns.json',
  '/api/dashboard/summary': '/data/dashboard-summary.json',
  '/api/dashboard/trend': '/data/dashboard-trend.json',
  '/api/dashboard/weekly-detail': '/data/weekly-detail.json',
  '/api/compare': '/data/compare.json',
  '/api/reports/weekly': '/data/reports-weekly.json',
  '/api/reports/monthly': '/data/reports-monthly.json',
  '/api/reports/yearly': '/data/reports-yearly.json',
  '/api/alerts': '/data/alerts.json',
  '/api/crawler/logs': '/data/crawler-logs.json',
};

const DYNAMIC_PATTERNS: { pattern: RegExp; path: string }[] = [
  { pattern: /^\/api\/inns\/\d+$/, path: '/data/inn-detail-1.json' },
  { pattern: /^\/api\/inns\/\d+\/availability/, path: '/data/inn-availability-1.json' },
  { pattern: /^\/api\/inns\/\d+\/prices/, path: '/data/inn-prices-1.json' },
];

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

function getStaticPath(apiPath: string): string | null {
  // 精确匹配
  if (STATIC_DATA_MAP[apiPath]) return STATIC_DATA_MAP[apiPath];
  // 处理带 query 参数的情况
  const basePath = apiPath.split('?')[0];
  if (STATIC_DATA_MAP[basePath]) return STATIC_DATA_MAP[basePath];
  // 动态路径匹配
  for (const { pattern, path } of DYNAMIC_PATTERNS) {
    if (pattern.test(basePath)) return path;
  }
  return null;
}

export async function apiFetch(path: string, options?: RequestInit) {
  // 如果是静态导出模式，读取本地 JSON
  const staticPath = getStaticPath(path);
  if (staticPath && (!options || options.method === undefined || options.method === 'GET')) {
    const fullPath = BASE_PATH ? `${BASE_PATH}${staticPath}` : staticPath;
    const res = await fetch(fullPath);
    if (!res.ok) {
      throw new Error(`Static data not found: ${fullPath}`);
    }
    return res.json();
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
