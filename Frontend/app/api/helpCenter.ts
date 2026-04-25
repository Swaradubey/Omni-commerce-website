import ApiService from './apiService';

export interface HelpCenterItem {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  content?: string;
  type: string;
  category?: string;
  tags?: string[];
  icon?: string;
  href?: string;
  actionLabel?: string;
  actionHref?: string;
  variant?: string;
  badgeLabel?: string;
  pageTitle?: string;
  searchPlaceholder?: string;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HelpCenterPagePayload {
  badgeLabel: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
}

export interface HelpCenterBundle {
  page: HelpCenterPagePayload;
  categories: HelpCenterItem[];
  faqs: HelpCenterItem[];
  articles: HelpCenterItem[];
  supportBlocks: HelpCenterItem[];
  faqTotal: number;
}

export async function fetchHelpCenterBundle(): Promise<HelpCenterBundle> {
  const res = await ApiService.get<HelpCenterBundle>('/help-center');
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Failed to load Help Center');
  }
  return res.data;
}

export async function searchHelpCenter(query: string): Promise<{
  query: string;
  results: HelpCenterItem[];
}> {
  const q = query.trim();
  if (!q) {
    return { query: '', results: [] };
  }
  const params = new URLSearchParams({ q });
  const res = await ApiService.get<{ query: string; results: HelpCenterItem[] }>(
    `/help-center/search?${params.toString()}`
  );
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Search failed');
  }
  return res.data;
}

export async function fetchHelpCenterCategories(): Promise<string[]> {
  const res = await ApiService.get<{ categories: string[] }>('/help-center/categories');
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Failed to load categories');
  }
  return res.data.categories || [];
}

export async function fetchHelpCenterBySlug(slug: string): Promise<HelpCenterItem> {
  const s = slug.trim();
  if (!s) {
    throw new Error('Slug is required');
  }
  const res = await ApiService.get<HelpCenterItem>(`/help-center/${encodeURIComponent(s)}`);
  if (!res.success || !res.data) {
    throw new Error(res.message || 'Not found');
  }
  return res.data;
}
