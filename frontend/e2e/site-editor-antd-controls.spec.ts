import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('all right-panel configuration controls use Ant Design components', () => {
  const editor = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/Editor.tsx'), 'utf8');
  const start = editor.indexOf('const ThemeSettingsProperties');
  const end = editor.indexOf('const FooterPreviewLinks');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const inspector = editor.slice(start, end);

  expect(inspector).not.toMatch(/<(?:input|select|textarea|button|label)\b/);
  for (const component of ['Input', 'Select', 'Button', 'Upload', 'ColorPicker', 'Slider', 'Segmented', 'EditorSwitch']) {
    expect(editor, `${component} should remain part of the shared inspector control set`).toContain(`<${component}`);
  }
});

test('hero service promises and per-section media recommendations remain declarative', () => {
  const editor = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/Editor.tsx'), 'utf8');
  const schema = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/schema.ts'), 'utf8');
  expect(editor).toContain("hero: '1600 × 900 px'");
  expect(editor).toContain("products: '1600 × 1000 px'");
  expect(editor).toContain("footer: '1600 × 500 px'");
  expect(editor).toContain('推荐尺寸：288 × 72 px（约 4:1）');
  expect(editor).toContain('服务承诺标题');
  expect(editor).toContain('服务承诺说明');
  expect(editor).toContain('grid-cols-[20px_minmax(0,.8fr)_minmax(0,1.2fr)]');
  expect(editor).not.toContain('const HeroImages');
  expect(editor).toContain('<small>点击后执行</small>');
  expect(editor).toContain('editor-toggle-list');
  expect(editor).toContain('editor-toggle-item');
  expect(schema).toContain("trustItems.*.title");
  expect(schema).toContain("trustItems.*.description");
  expect(schema).toContain("filter(([pageId]) => pageId === 'home')");
  expect(schema).not.toMatch(/hero: \{[^\n]+style: \[[^\]]*'imageUrls'/);
});

test('text component keeps brand media, metrics visibility and quality badge multilingual configuration aligned', () => {
  const editor = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/Editor.tsx'), 'utf8');
  const schema = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/schema.ts'), 'utf8');
  const storefront = readFileSync(resolve(process.cwd(), '../storefront/src/main.tsx'), 'utf8');

  expect(editor).toContain('<div className="mb-2 text-xs font-bold text-muted-foreground">品牌图片</div>');
  expect(editor).toContain('className="editor-media-card"');
  expect(editor).toContain('uploadText="上传品牌图片"');
  expect(editor).toContain('s.showStats !== false && <div className="mt-7 grid grid-cols-3');
  expect(editor).toContain('<Field label="品质保证标识">');
  expect(schema).toContain("{ path: 'qualityBadgeText', label: '品质保证标识' }");
  expect(storefront).toContain("textSection?.showStats !== false && !!textSection?.stats?.length");
  expect(storefront).toContain('textSection?.qualityBadgeText && <span className="about-quality-badge"');
});
