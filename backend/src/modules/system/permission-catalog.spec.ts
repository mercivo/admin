import {
  ALL_PERMISSIONS,
  PERMISSION_CATALOG,
  TRIAL_PERMISSIONS,
  FINANCE_PERMISSIONS,
  withFinancePermissionsForErpPlan,
  migrateFinanceWorkflowPermissions,
  withPermissionParents,
} from "./permission-catalog";

describe("permission catalog hierarchy", () => {
  it("uses primary menus, secondary menus, then page/button leaves", () => {
    const byKey = new Map(PERMISSION_CATALOG.map((item) => [item.key, item]));
    expect(
      new Set(
        PERMISSION_CATALOG.filter((item) => item.level === "primary").map(
          (item) => item.key,
        ),
      ),
    ).toEqual(
      new Set([
        "menu.dashboard",
        "group.products",
        "group.sales",
        "group.purchase",
        "group.finance",
        "group.inventory",
        "group.site",
        "group.system",
      ]),
    );

    for (const item of PERMISSION_CATALOG) {
      if (item.level === "primary") expect(item.parentKey).toBeNull();
      if (item.level === "secondary")
        expect(byKey.get(item.parentKey || "")?.level).toBe("primary");
      if (item.level === "page" || item.level === "button")
        expect(["primary", "secondary"]).toContain(
          byKey.get(item.parentKey || "")?.level,
        );
    }
    expect(PERMISSION_CATALOG.some((item) => item.level === "page")).toBe(true);
    expect(PERMISSION_CATALOG.some((item) => item.level === "button")).toBe(
      true,
    );
  });

  it("adds every menu ancestor when a leaf permission is selected", () => {
    expect(withPermissionParents(["product.create"])).toEqual([
      "group.products",
      "menu.products",
      "product.create",
    ]);
    expect(withPermissionParents(["settings.site"])).toEqual([
      "group.site",
      "menu.storefront.settings",
      "settings.site",
    ]);
  });

  it("contains unique permission keys", () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });

  it("keeps site settings permissions to view, edit, and custom domains", () => {
    expect(PERMISSION_CATALOG.filter((item) => item.parentKey === "menu.storefront.settings").map((item) => item.key)).toEqual([
      "page.site.settings",
      "settings.site",
      "site.domain",
    ]);
  });

  it("exposes multilingual content as an independent menu and capability", () => {
    expect(PERMISSION_CATALOG.filter((item) => item.parentKey === "menu.storefront.translations").map((item) => item.key)).toEqual([
      "page.site.translations",
      "site.translation.edit",
    ]);
    expect(withPermissionParents(["site.translation.edit"])).toEqual(expect.arrayContaining([
      "group.site",
      "menu.storefront.translations",
      "site.translation.edit",
    ]));
  });

  it("keeps storefront as one primary menu without a standalone overview", () => {
    const storefront = PERMISSION_CATALOG.find((item) => item.key === "group.site");
    expect(storefront).toMatchObject({ label: "独立站", level: "primary", parentKey: null });
    expect(ALL_PERMISSIONS).not.toContain("menu.storefront.overview");
    expect(ALL_PERMISSIONS).not.toContain("page.storefront.overview");
    expect(PERMISSION_CATALOG.filter((item) => item.parentKey === "group.site").map((item) => item.key)).toEqual([
      "menu.storefront.leads",
      "menu.storefront.products",
      "menu.site",
      "menu.storefront.translations",
      "menu.storefront.releases",
      "menu.storefront.settings",
    ]);
  });

  it("keeps primary permissions in the same order as the merchant menu", () => {
    expect(
      PERMISSION_CATALOG.filter((item) => item.level === "primary").map(
        (item) => item.key,
      ),
    ).toEqual([
      "menu.dashboard",
      "group.products",
      "group.sales",
      "group.purchase",
      "group.inventory",
      "group.site",
      "group.finance",
      "group.system",
    ]);
  });

  it("enables every inventory count, transfer, and warehouse operation for trial", () => {
    expect(TRIAL_PERMISSIONS).toEqual(
      expect.arrayContaining([
        "group.inventory",
        "menu.inventory.counts",
        "page.inventory.counts",
        "inventory.count.create",
        "inventory.count.complete",
        "menu.inventory.transfers",
        "page.inventory.transfers",
        "inventory.transfer.create",
        "inventory.transfer.receive",
        "menu.inventory.warehouses",
        "page.inventory.warehouses",
        "inventory.warehouse.manage",
      ]),
    );
  });

  it("uses a concise label for the inventory count execution permission", () => {
    expect(
      PERMISSION_CATALOG.find(
        (item) => item.key === "inventory.count.complete",
      )?.label,
    ).toBe("执行盘点");
  });

  it("defines the complete finance permission tree", () => {
    expect(FINANCE_PERMISSIONS).toEqual(expect.arrayContaining([
      "group.finance",
      "menu.finance.receipts",
      "page.finance.receipts",
      "finance.receipt.create",
      "finance.receipt.confirm",
      "finance.receipt.cancel",
      "menu.finance.payments",
      "page.finance.payments",
      "finance.payment.create",
      "finance.payment.confirm",
      "finance.payment.cancel",
      "menu.finance.statistics",
      "page.finance.statistics",
    ]));
  });

  it("backfills finance only for plans that contain sales and purchase", () => {
    expect(withFinancePermissionsForErpPlan(["group.sales", "group.purchase"]))
      .toEqual(expect.arrayContaining(FINANCE_PERMISSIONS));
    expect(withFinancePermissionsForErpPlan(["group.sales"]))
      .toEqual(["group.sales"]);
  });

  it("migrates legacy finance void permissions to confirm and cancel", () => {
    expect(migrateFinanceWorkflowPermissions(["finance.receipt.void", "finance.payment.void"]))
      .toEqual(expect.arrayContaining([
        "finance.receipt.confirm",
        "finance.receipt.cancel",
        "finance.payment.confirm",
        "finance.payment.cancel",
      ]));
  });

  it("consolidates legacy site permissions without coupling lead actions", () => {
    expect(migrateFinanceWorkflowPermissions(["page.site.seo", "settings.site.info", "settings.site.languages", "settings.seo", "storefront.lead.manage"]))
      .toEqual(expect.arrayContaining([
        "page.site.settings",
        "settings.site",
        "storefront.lead.manage",
      ]));
    expect(migrateFinanceWorkflowPermissions(["settings.site.info", "settings.site.languages", "settings.seo"]))
      .not.toEqual(expect.arrayContaining(["settings.site.info", "settings.site.languages", "settings.seo"]));
    expect(migrateFinanceWorkflowPermissions(["storefront.lead.manage"]))
      .not.toContain("storefront.lead.assign");
  });
});
