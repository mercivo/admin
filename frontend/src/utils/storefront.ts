import { workspaceApi } from '../services/api/index';

const previewBaseUrl = import.meta.env.VITE_STOREFRONT_PREVIEW_URL || 'http://localhost';

export async function openPublishedStorefront() {
  const previewWindow = window.open('about:blank', '_blank');
  if (previewWindow) previewWindow.opener = null;
  try {
    const workspace = await workspaceApi.getSettings();
    let target: URL;
    if (workspace.site.domain && workspace.site.domainStatus === 'active') {
      const protocol = workspace.site.domain === 'localhost' || workspace.site.domain.endsWith('.localhost') ? 'http:' : 'https:';
      target = new URL(`${protocol}//${workspace.site.domain}`);
    } else {
      target = new URL(previewBaseUrl, window.location.origin);
      target.searchParams.set('site', workspace.site.slug);
    }
    if (previewWindow) previewWindow.location.replace(target.toString());
    else window.location.assign(target.toString());
  } catch {
    previewWindow?.close();
  }
}
