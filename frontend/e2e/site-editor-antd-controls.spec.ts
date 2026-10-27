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

test('hero background inherits the theme and keeps the image separate from the trust bar', () => {
  const editor = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/Editor.tsx'), 'utf8');
  const renderer = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/SiteRenderer.tsx'), 'utf8');
  const schema = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/schema.ts'), 'utf8');
  const styles = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/controls.css'), 'utf8');
  const storefront = readFileSync(resolve(process.cwd(), '../storefront/src/main.tsx'), 'utf8');

  expect(schema).toContain('export const resolveSectionBackground');
  expect(schema).toContain('const isDefault = section.backgroundColor === undefined && section.backgroundOpacity === undefined');
  expect(schema).toContain("section.type === 'hero' || !fallback.scrim ? `url(${image})`");
  expect(schema).not.toContain('backgroundImage: `linear-gradient(rgba(${rgb}');
  expect(schema).toContain("'跟随主题'");
  expect(editor).toContain('{ backgroundColor: undefined, backgroundOpacity: undefined }');
  expect(editor).toContain('背景图片仅覆盖首屏主视觉并保持原始显示');
  expect(renderer).toContain('const background = resolveSectionBackground(s');
  expect(renderer).toContain('className="editor-hero-shade"');
  expect(renderer).toContain('className="editor-hero-trust-grid" style={{ \'--hero-background-color\': background.color }');
  expect(styles).toContain('var(--hero-background-color,var(--site-theme)) 88%,black');
  expect(styles).not.toContain('[data-custom-background="true"]>*');
  expect(storefront).not.toContain('const frame = requestAnimationFrame(() => editorSections');
});

test('all page sections resolve their real defaults and fixed image scrims through the shared background path', () => {
  const editor = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/Editor.tsx'), 'utf8');
  const renderer = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/SiteRenderer.tsx'), 'utf8');
  const schema = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/schema.ts'), 'utf8');
  const styles = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/controls.css'), 'utf8');

  expect(schema).toContain("header: { color: '#FFFFFF', opacity: 100, theme: false, scrim: 'rgba(255,255,255,.88)' }");
  expect(schema).toContain("text: { color: '#F8F6F2', opacity: 100, theme: false, scrim: 'rgba(255,255,255,.82)' }");
  expect(schema).toContain("form: { color: themeColor, opacity: themeOpacity, theme: true, scrim: 'rgba(8,20,15,.72)' }");
  expect(schema).toContain("footer: { color: themeColor, opacity: themeOpacity, theme: true, darken: true, scrim: 'rgba(0,0,0,.55)' }");
  expect(schema).toContain("section.sectionBackgroundImage || (section.type === 'form' ? section.backgroundImageUrl || '' : '')");
  expect(schema).toContain("'使用模块默认'");
  expect(editor).toContain("{ sectionBackgroundImage, backgroundImageUrl: undefined }");
  expect(editor).not.toContain("s.type === 'form' && <BackgroundImage recommendedSize");
  expect(renderer).toContain("resolveSectionBackground(s, 'var(--site-theme)')");
  expect(renderer).toContain("'--section-background-image': background.style?.backgroundImage || 'none'");
  expect(styles).not.toContain('[data-section-type="header"]>.editor-header-announcement');
  expect(styles).toContain('[data-section-type="header"]>.editor-site-header');
});

test('product badge filters use a compact separated toolbar above the product grid', () => {
  const styles = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/controls.css'), 'utf8');
  const renderer = readFileSync(resolve(process.cwd(), 'src/pages/SiteEditor/SiteRenderer.tsx'), 'utf8');

  expect(styles).toContain('.editor-product-badge-filters{display:flex;flex-wrap:wrap;align-items:center;gap:10px 22px;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid #eeeae4');
  expect(styles).toContain('.editor-product-badge-filters{align-items:flex-start;gap:6px 16px;margin-bottom:8px;padding-bottom:4px}');
  expect(renderer.indexOf('className="editor-product-badge-filters"')).toBeLessThan(renderer.indexOf('className="editor-product-grid grid gap-4"'));
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
