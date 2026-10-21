import { expect, test } from '@playwright/test';

const permissions = ['page.storefront.leads', 'storefront.lead.assign', 'storefront.lead.manage'];

test('lead pool supports manual creation and the three-stage workflow', async ({ page }) => {
  await page.addInitScript(value => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'admin', siteId: 'site-1' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: value }));
  }, permissions);
  let created: Record<string, string> | undefined;
  let lead: Record<string, unknown> | undefined;
  const updates: Array<Record<string, string>> = [];
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions } } });
    if (url.includes('/storefront/overview')) return route.fulfill({ json: { data: { products: { total: 0, published: 0, pending: 0 }, leads: { total: created ? 1 : 0, new: created ? 1 : 0, following: 0, converted: 0 }, recentLeads: [] } } });
    if (url.includes('/storefront/lead-assignees')) return route.fulfill({ json: { data: { currentUserId: 'admin-1', members: [{ userId: 'admin-1', name: '管理员', role: 'admin' }, { userId: 'member-1', name: '业务员', role: 'member' }] } } });
    if (url.endsWith('/storefront/leads') && route.request().method() === 'POST') {
      created = route.request().postDataJSON();
      lead = { id: 'lead-1', type: 'inquiry', status: 'new', sourcePage: '', company: '', country: '', productId: null, productName: '', email: '', phone: '', note: null, assignedToUserId: 'admin-1', assignedToName: '当前管理员', closeReason: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...created };
      return route.fulfill({ json: { data: lead } });
    }
    if (url.includes('/storefront/leads/lead-1') && route.request().method() === 'PATCH') {
      const payload = route.request().postDataJSON();
      updates.push(payload);
      lead = { ...lead, ...payload, assignedToName: payload.assigneeUserId === 'member-1' ? '业务员' : lead?.assignedToName };
      return route.fulfill({ json: { data: lead } });
    }
    if (url.includes('/storefront/leads')) return route.fulfill({ json: { data: { items: lead ? [lead] : [], total: lead ? 1 : 0, page: 1, pageSize: 20 } } });
    return route.fulfill({ json: { data: {} } });
  });

  await page.goto(`${process.env.FRONTEND_BASE_URL || 'http://localhost:8088'}/storefront/leads`);
  await expect(page.getByText('新线索 0 条', { exact: true })).toBeVisible();
  await expect(page.getByText('跟进中', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('已转化', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('已关闭', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '新建线索' }).click();
  await page.getByPlaceholder('请输入联系人姓名').fill('张三');
  await page.getByPlaceholder('手机号或邮箱，不限制格式').fill('微信 buyer_001');
  await page.getByPlaceholder('请填写产品、数量、规格、交期等采购需求').fill('采购 100 件');
  await page.getByRole('button', { name: '创建线索' }).click();
  await expect.poll(() => created).toEqual({ name: '张三', contact: '微信 buyer_001', requirements: '采购 100 件' });
  const contactCell = page.getByRole('cell', { name: '张三' });
  await expect(contactCell.locator('span')).toHaveClass(/font-normal/);
  await expect(page.getByRole('button', { name: '跟进并指派' })).toHaveClass(/app-table-action-button/);
  await page.getByRole('button', { name: '跟进并指派' }).click();
  await expect(page.getByText(/可指派给项目内任意成员/)).toBeVisible();
  await expect(page.getByText(/需要拥有“跟进和处理线索”权限/)).toBeVisible();
  await page.locator('[data-settings-field]').filter({ hasText: '指派成员' }).locator('.ant-select-selector').click();
  await page.getByText('业务员', { exact: true }).click();
  await page.getByPlaceholder('填写跟进计划或首次沟通信息').fill('首次电话沟通，客户有采购意向');
  await page.getByRole('button', { name: '开始跟进' }).click();
  await expect.poll(() => updates[0]).toEqual({ status: 'following', note: '首次电话沟通，客户有采购意向', assigneeUserId: 'member-1' });
  await expect(page.getByRole('button', { name: '标记转化' })).toHaveClass(/app-table-action-button/);
  await page.getByRole('button', { name: '标记转化' }).click();
  await page.getByPlaceholder('填写转化结果或商机说明').fill('已转为正式商机');
  await page.getByRole('button', { name: '确认转化' }).click();
  await expect.poll(() => updates[1]).toEqual({ status: 'converted', note: '已转为正式商机' });
  await expect(page.getByRole('button', { name: '关闭线索' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '查看详情' })).toHaveClass(/app-table-action-button/);
  await page.getByRole('button', { name: '查看详情' }).click();
  await expect(page.locator('.ant-descriptions')).toBeVisible();
  await expect(page.getByText('线索信息', { exact: true })).toHaveCount(0);
  await expect(page.locator('.ant-descriptions').getByText('采购需求', { exact: true })).toBeVisible();
});

test('只有跟进和处理权限时不显示指派操作', async ({ page }) => {
  const manageOnly = ['group.site', 'menu.storefront.leads', 'page.storefront.leads', 'storefront.lead.manage'];
  await page.addInitScript(value => {
    localStorage.setItem('mercivo_access_token', 'e30.eyJpYXQiOjQwNzA5MDg4MDAsImV4cCI6NDA3MDk5NTIwMH0.signature');
    localStorage.setItem('mercivo_user', JSON.stringify({ role: 'member', siteId: 'site-1' }));
    localStorage.setItem('mercivo_tenant', JSON.stringify({ permissions: value }));
  }, manageOnly);
  await page.route('**/api/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/auth/me')) return route.fulfill({ json: { data: { permissions: manageOnly } } });
    if (url.includes('/storefront/overview')) return route.fulfill({ json: { data: { products: { total: 0, published: 0, pending: 0 }, leads: { total: 1, new: 1, following: 0, converted: 0 }, recentLeads: [] } } });
    if (url.includes('/storefront/leads')) return route.fulfill({ json: { data: { items: [{ id: 'lead-1', name: '张三', contact: '13800000000', requirements: '采购 100 件', status: 'new', sourcePage: '/contact', createdAt: new Date().toISOString() }], total: 1, page: 1, pageSize: 20 } } });
    return route.fulfill({ json: { data: {} } });
  });

  await page.goto(`${process.env.FRONTEND_BASE_URL || 'http://localhost:8088'}/storefront/leads`);
  await expect(page.getByRole('button', { name: '跟进并指派' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '开始跟进' })).toBeVisible();
  await expect(page.getByRole('button', { name: '关闭线索' })).toBeVisible();
});
