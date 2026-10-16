import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('editor, draft preview and public storefront use the shared renderer', () => {
  const editor = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/Editor.tsx'), 'utf8');
  const preview = readFileSync(resolve(process.cwd(), 'src/pages/SitePreview/index.tsx'), 'utf8');
  const storefront = readFileSync(resolve(process.cwd(), '../storefront/src/main.tsx'), 'utf8');
  const activeStorefront = storefront.split('/* Legacy renderer retained temporarily')[0];
  expect(editor).toContain("import SiteRenderer, { SiteContactModal } from './SiteRenderer'");
  expect(preview).toContain("import SiteRenderer from '../SiteEditor/SiteRenderer'");
  expect(storefront).toContain("import SiteRenderer from '../../frontend/src/pages/SiteEditor/SiteRenderer'");
  expect(editor).toContain('<SiteContactModal info={config.siteInfo}');
  expect(activeStorefront).not.toContain('<ContactModal open={contactOpen}');
  expect(editor).toContain("window.open('/site-preview'");
  expect(storefront).toContain('return <SiteRenderer config={rendererConfig}');
});
