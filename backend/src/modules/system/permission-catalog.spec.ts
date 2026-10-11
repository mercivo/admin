import { ALL_PERMISSIONS, PERMISSION_CATALOG, withPermissionParents } from './permission-catalog';

describe('permission catalog hierarchy', () => {
  it('uses primary menus, secondary menus, then page/button leaves', () => {
    const byKey = new Map(PERMISSION_CATALOG.map(item => [item.key, item]));
    expect(new Set(PERMISSION_CATALOG.filter(item => item.level === 'primary').map(item => item.key)))
      .toEqual(new Set(['menu.dashboard', 'group.products', 'group.sales', 'group.site', 'group.system']));

    for (const item of PERMISSION_CATALOG) {
      if (item.level === 'primary') expect(item.parentKey).toBeNull();
      if (item.level === 'secondary') expect(byKey.get(item.parentKey || '')?.level).toBe('primary');
      if (item.level === 'page' || item.level === 'button') expect(['primary', 'secondary']).toContain(byKey.get(item.parentKey || '')?.level);
    }
    expect(PERMISSION_CATALOG.some(item => item.level === 'page')).toBe(true);
    expect(PERMISSION_CATALOG.some(item => item.level === 'button')).toBe(true);
  });

  it('adds every menu ancestor when a leaf permission is selected', () => {
    expect(withPermissionParents(['product.create'])).toEqual(['group.products', 'menu.products', 'product.create']);
    expect(withPermissionParents(['page.site.seo'])).toEqual(['group.site', 'menu.site', 'page.site.seo']);
  });

  it('contains unique permission keys', () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });
});
