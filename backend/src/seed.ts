import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { Product } from "./modules/product/product.entity";
import { ProductCategory } from "./modules/product-category/product-category.entity";
import { AppConfig } from "./modules/workspace/app-config.entity";
import { TeamMember } from "./modules/workspace/team-member.entity";
import { Tenant } from "./modules/site/tenant.entity";
import { Site } from "./modules/site/site.entity";
import { SiteDomain } from "./modules/site/site-domain.entity";
import { SiteVersion } from "./modules/site/site-version.entity";
import { User } from "./modules/auth/user.entity";
import { hashPassword } from "./modules/auth/password.util";
import { normalizeBootstrapPassword } from "./modules/auth/bootstrap-password";
import {
  InventoryBalance,
  InventoryLedgerEntry,
  Warehouse,
} from "./modules/inventory/inventory.entity";
import {
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseReceipt,
  PurchaseReceiptLine,
  Supplier,
} from "./modules/purchase/purchase.entity";

dotenv.config();

async function seed() {
  const ds = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    username: process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_DATABASE || "seo_platform",
    extra: {
      connectionLimit: parseInt(process.env.DB_POOL_MAX || "5", 10),
      ...(process.env.DB_SOCKET_PATH
        ? { socketPath: process.env.DB_SOCKET_PATH }
        : {}),
    },
    entities: [
      Product,
      ProductCategory,
      AppConfig,
      TeamMember,
      Tenant,
      Site,
      SiteDomain,
      SiteVersion,
      User,
      Warehouse,
      InventoryBalance,
      InventoryLedgerEntry,
      Supplier,
      PurchaseOrder,
      PurchaseOrderLine,
      PurchaseReceipt,
      PurchaseReceiptLine,
    ],
    synchronize: process.env.DB_SCHEMA_BOOTSTRAP === "true",
    charset: "utf8mb4",
    timezone: "+00:00",
  });

  await ds.initialize();
  console.log("Database connected");

  const productRepo = ds.getRepository(Product);
  const productCategoryRepo = ds.getRepository(ProductCategory);
  const configRepo = ds.getRepository(AppConfig);
  const teamRepo = ds.getRepository(TeamMember);
  const tenantRepo = ds.getRepository(Tenant);
  const siteRepo = ds.getRepository(Site);
  const domainRepo = ds.getRepository(SiteDomain);
  const versionRepo = ds.getRepository(SiteVersion);
  const userRepo = ds.getRepository(User);
  const warehouseRepo = ds.getRepository(Warehouse);
  const balanceRepo = ds.getRepository(InventoryBalance);
  const ledgerRepo = ds.getRepository(InventoryLedgerEntry);
  const supplierRepo = ds.getRepository(Supplier);
  const purchaseOrderRepo = ds.getRepository(PurchaseOrder);
  const purchaseOrderLineRepo = ds.getRepository(PurchaseOrderLine);
  const purchaseReceiptRepo = ds.getRepository(PurchaseReceipt);
  const purchaseReceiptLineRepo = ds.getRepository(PurchaseReceiptLine);

  // The platform administrator is infrastructure data, not demo/business data.
  // Keep it independently configurable so an empty production bootstrap still
  // has a system account without creating a tenant or sample records.
  if (process.env.SYSTEM_ADMIN_BOOTSTRAP_ENABLED !== "false") {
    const systemUsername = process.env.SYSTEM_ADMIN_USERNAME || "admin";
    const systemPassword = normalizeBootstrapPassword(
      process.env.SYSTEM_ADMIN_PASSWORD,
    );
    if (!systemPassword || systemPassword.length < 12)
      throw new Error(
        "SYSTEM_ADMIN_PASSWORD must be configured with at least 12 characters",
      );
    const existingSystemAdmin = await userRepo.findOne({
      where: { username: systemUsername },
    });
    const systemAdminValues = {
      tenantId: null,
      siteId: null,
      phone: null,
      username: systemUsername,
      passwordHash: await hashPassword(systemPassword),
      role: "system_admin" as const,
      status: "active" as const,
      lastLoginAt: null,
    };
    if (existingSystemAdmin) {
      await userRepo.save(
        userRepo.merge(existingSystemAdmin, systemAdminValues),
      );
    } else {
      await userRepo.save(userRepo.create(systemAdminValues));
    }
    console.log("System administrator ensured");
  }

  // Fresh production/test environments may need an empty business database.
  if (process.env.SEED_DATA_ENABLED === "false") {
    await ds.destroy();
    console.log("Bootstrap completed without demo or business seed data");
    return;
  }

  // ---- Products ----
  const products = [
    {
      nameZh: "环保购物袋",
      sku: "ECO-001",
      price: "$0.80–$1.20",
      stock: 50000,
      moq: 500,
      status: "published" as const,
      category: "eco",
      img: "photo-1542601906990-b4d3fb778b09",
      hot: true,
    },
    {
      nameZh: "棉质手提包",
      sku: "TOT-002",
      price: "$1.20–$2.00",
      stock: 30000,
      moq: 300,
      status: "published" as const,
      category: "tote",
      img: "photo-1553062407-98eeb64c6a62",
      hot: false,
    },
    {
      nameZh: "抽绳袋",
      sku: "DRW-003",
      price: "$0.50–$0.80",
      stock: 800,
      moq: 1000,
      status: "pending" as const,
      category: "drawstring",
      img: "photo-1584917865442-de89df76afd3",
      hot: false,
    },
    {
      nameZh: "帆布包",
      sku: "CVS-004",
      price: "$1.50–$2.50",
      stock: 20000,
      moq: 200,
      status: "published" as const,
      category: "tote",
      img: "photo-1491637639811-60e2756cc1c7",
      hot: true,
    },
    {
      nameZh: "无纺布袋",
      sku: "NWB-005",
      price: "$0.30–$0.60",
      stock: 100000,
      moq: 2000,
      status: "published" as const,
      category: "eco",
      img: "photo-1593642632559-0c6d3fc62b89",
      hot: false,
    },
    {
      nameZh: "可重复使用购物袋",
      sku: "RGB-006",
      price: "$0.90–$1.50",
      stock: 45000,
      moq: 500,
      status: "published" as const,
      category: "eco",
      img: "photo-1547949003-9792a18a2601",
      hot: true,
    },
  ];

  if ((await productRepo.count()) === 0) {
    for (const p of products) await productRepo.save(p);
  }
  console.log("Products seeded");

  // ---- Product Categories ----
  const productCategories = [
    {
      code: "eco",
      label: "环保袋",
      sort: 1,
      status: "enabled" as const,
      remark: "可降解环保材质产品",
      parentCode: null,
    },
    {
      code: "eco-shopping",
      label: "购物袋",
      sort: 1,
      status: "enabled" as const,
      remark: "",
      parentCode: "eco",
    },
    {
      code: "eco-grocery",
      label: "杂货袋",
      sort: 2,
      status: "enabled" as const,
      remark: "",
      parentCode: "eco",
    },
    {
      code: "eco-produce",
      label: "蔬果袋",
      sort: 3,
      status: "enabled" as const,
      remark: "",
      parentCode: "eco",
    },
    {
      code: "tote",
      label: "手提包",
      sort: 2,
      status: "enabled" as const,
      remark: "时尚手提类产品",
      parentCode: null,
    },
    {
      code: "tote-cotton",
      label: "棉质手提包",
      sort: 1,
      status: "enabled" as const,
      remark: "",
      parentCode: "tote",
    },
    {
      code: "tote-canvas",
      label: "帆布手提包",
      sort: 2,
      status: "enabled" as const,
      remark: "",
      parentCode: "tote",
    },
    {
      code: "tote-jute",
      label: "黄麻手提包",
      sort: 3,
      status: "disabled" as const,
      remark: "",
      parentCode: "tote",
    },
    {
      code: "drawstring",
      label: "抽绳袋",
      sort: 3,
      status: "enabled" as const,
      remark: "抽绳收口类袋包",
      parentCode: null,
    },
    {
      code: "draw-sport",
      label: "运动抽绳袋",
      sort: 1,
      status: "enabled" as const,
      remark: "",
      parentCode: "drawstring",
    },
    {
      code: "draw-gift",
      label: "礼品抽绳袋",
      sort: 2,
      status: "enabled" as const,
      remark: "",
      parentCode: "drawstring",
    },
    {
      code: "nonwoven",
      label: "无纺布袋",
      sort: 4,
      status: "disabled" as const,
      remark: "无纺布材质",
      parentCode: null,
    },
  ];

  if ((await productCategoryRepo.count()) === 0) {
    for (const category of productCategories)
      await productCategoryRepo.save(category as ProductCategory);
  }
  console.log("Product categories seeded");

  if ((await teamRepo.count()) === 0) {
    await teamRepo.save([
      {
        name: "Alex Johnson",
        email: "alex@mercivo.com",
        role: "admin",
        avatar: "AJ",
        color: "bg-primary text-white",
      },
      {
        name: "Sarah Chen",
        email: "sarah@mercivo.com",
        role: "member",
        avatar: "SC",
        color: "bg-violet-500 text-white",
      },
      {
        name: "Mike Wang",
        email: "mike@mercivo.com",
        role: "member",
        avatar: "MW",
        color: "bg-emerald-500 text-white",
      },
      {
        name: "Lisa Park",
        email: "lisa@mercivo.com",
        role: "member",
        avatar: "LP",
        color: "bg-amber-500 text-white",
      },
    ] as TeamMember[]);
  }
  const configs = {
    settings: {
      account: {
        name: "Alex Johnson",
        email: "alex@mercivo.com",
        phone: "+1 (555) 123-4567",
        timezone: "UTC+8 (Asia/Shanghai)",
      },
      site: {
        name: "Mercivo Official",
        domain: "www.mercivo.com",
        description:
          "Global B2B sourcing platform connecting buyers with premium suppliers",
        language: "English",
        currency: "USD ($)",
      },
      billing: { currentPlan: "pro" },
    },
    plans: {
      items: [
        {
          id: "starter",
          name: "Starter",
          price: "$29/mo",
          desc: "适合个人创业者",
          limits: ["20件商品", "1位成员", "1个独立站"],
        },
        {
          id: "pro",
          name: "Professional",
          price: "$99/mo",
          desc: "适合小型团队",
          limits: ["500件商品", "5位成员", "1个独立站"],
        },
        {
          id: "enterprise",
          name: "Enterprise",
          price: "$299/mo",
          desc: "适合大型企业",
          limits: ["无限商品", "20位成员", "1个独立站", "优先支持"],
        },
      ],
    },
    siteEditor: {
      page: "home",
      status: "published",
      version: 1,
      productSource: "全部商品",
      sort: "最新上架",
      displayCount: 9,
      columns: 3,
    },
    seo: {
      title: "",
      description: "",
      keywords: "",
      shareImage: "",
      canonicalUrl: "",
      robots: "index,follow,max-image-preview:large",
    },
    dashboard: { activities: [] },
  };
  for (const [key, value] of Object.entries(configs)) {
    if (!(await configRepo.exist({ where: { key } })))
      await configRepo.save({ key, value });
  }
  console.log("Workspace data seeded");
  let site =
    (await siteRepo.find({ order: { createdAt: "ASC" }, take: 1 }))[0] || null;
  if (!site) {
    let tenant =
      (await tenantRepo.find({ order: { createdAt: "ASC" }, take: 1 }))[0] ||
      null;
    if (!tenant)
      tenant = await tenantRepo.save({
        slug: "mercivo-demo",
        name: "Mercivo Demo",
        status: "active",
      });
    site = await siteRepo.save(
      siteRepo.create({
        tenantId: tenant.id,
        slug: "eco-bags",
        name: "EcoBags Official",
        status: "draft",
        defaultLanguage: "zh_CN",
        supportedLanguages: ["zh_CN"],
        defaultCurrency: "CNY",
        publishedVersionId: null,
      }),
    );
    await domainRepo.save([
      {
        siteId: site.id,
        hostname: "localhost",
        isPrimary: true,
        sslStatus: "active",
        status: "active",
      },
      {
        siteId: site.id,
        hostname: "eco-bags.mercivo.site",
        isPrimary: false,
        sslStatus: "pending",
        status: "active",
      },
    ] as SiteDomain[]);
  }
  await Promise.all([
    productRepo.update(
      { siteId: "" },
      { tenantId: site.tenantId, siteId: site.id },
    ),
    teamRepo.update(
      { siteId: "" },
      { tenantId: site.tenantId, siteId: site.id },
    ),
    productCategoryRepo.update(
      { siteId: "" },
      { tenantId: site.tenantId, siteId: site.id },
    ),
  ]);
  let defaultWarehouse = await warehouseRepo.findOne({
    where: { siteId: site.id, isDefault: true },
  });
  if (!defaultWarehouse) {
    defaultWarehouse = await warehouseRepo.save(
      warehouseRepo.create({
        tenantId: site.tenantId,
        siteId: site.id,
        code: "DEFAULT",
        name: "默认仓库",
        contact: "",
        phone: "",
        address: "",
        status: "active",
        isDefault: true,
      }),
    );
  }
  for (const product of await productRepo.find({
    where: { siteId: site.id },
  })) {
    const dimensions = product.variants?.length
      ? product.variants.map((variant) => ({
          variantKey: variant.id,
          quantity: Math.max(0, Number(variant.stock) || 0),
        }))
      : [
          {
            variantKey: "BASE",
            quantity: Math.max(0, Number(product.stock) || 0),
          },
        ];
    for (const dimension of dimensions) {
      if (
        await balanceRepo.exist({
          where: {
            warehouseId: defaultWarehouse.id,
            productId: product.id,
            variantKey: dimension.variantKey,
          },
        })
      )
        continue;
      const balance = await balanceRepo.save(
        balanceRepo.create({
          tenantId: site.tenantId,
          siteId: site.id,
          warehouseId: defaultWarehouse.id,
          productId: product.id,
          variantKey: dimension.variantKey,
          onHand: dimension.quantity,
          reserved: 0,
          inTransit: 0,
          warningStock: 0,
        }),
      );
      if (dimension.quantity > 0)
        await ledgerRepo.save(
          ledgerRepo.create({
            tenantId: site.tenantId,
            siteId: site.id,
            warehouseId: defaultWarehouse.id,
            productId: product.id,
            variantKey: dimension.variantKey,
            type: "opening",
            quantityChange: dimension.quantity,
            balanceAfter: dimension.quantity,
            referenceType: "seed",
            referenceId: balance.id,
            actorUserId: "",
            remark: "演示数据期初库存",
          }),
        );
    }
  }
  const seedPurchaseDemoData =
    process.env.SEED_PURCHASE_DEMO_DATA_ENABLED === "true";
  if (
    seedPurchaseDemoData &&
    (await supplierRepo.count({ where: { siteId: site.id } })) === 0
  ) {
    await supplierRepo.save([
      supplierRepo.create({
        tenantId: site.tenantId,
        siteId: site.id,
        code: "SUP-001",
        name: "华东环保材料有限公司",
        contact: "王经理",
        phone: "13800138001",
        email: "sales@huadong-material.example",
        address: "上海市松江区新桥工业园",
        taxNo: "91310000DEMO00001",
        paymentTerms: "月结",
        paymentDays: 30,
        status: "active",
        remark: "环保面料核心供应商",
      }),
      supplierRepo.create({
        tenantId: site.tenantId,
        siteId: site.id,
        code: "SUP-002",
        name: "宁波纺织品供应链有限公司",
        contact: "陈女士",
        phone: "13800138002",
        email: "service@ningbo-textile.example",
        address: "浙江省宁波市鄞州区",
        taxNo: "91330200DEMO00002",
        paymentTerms: "货到付款",
        paymentDays: 0,
        status: "active",
        remark: "棉布与帆布供应商",
      }),
      supplierRepo.create({
        tenantId: site.tenantId,
        siteId: site.id,
        code: "SUP-003",
        name: "广州包装辅料厂",
        contact: "刘先生",
        phone: "13800138003",
        email: "contact@gz-package.example",
        address: "广东省广州市白云区",
        taxNo: "91440100DEMO00003",
        paymentTerms: "预付 30%",
        paymentDays: 15,
        status: "active",
        remark: "包装及抽绳辅料供应商",
      }),
    ]);
  }
  if (
    seedPurchaseDemoData &&
    (await purchaseOrderRepo.count({ where: { siteId: site.id } })) === 0
  ) {
    const [supplierA, supplierB, supplierC] = await supplierRepo.find({
      where: { siteId: site.id },
      order: { code: "ASC" },
    });
    const seededProducts = await productRepo.find({
      where: { siteId: site.id },
      order: { createdAt: "ASC" },
    });
    if (supplierA && supplierB && supplierC && seededProducts.length >= 3) {
      const now = new Date();
      const date = (offset: number) =>
        new Date(now.getTime() + offset * 86400000).toISOString().slice(0, 10);
      const completedOrder = await purchaseOrderRepo.save(
        purchaseOrderRepo.create({
          tenantId: site.tenantId,
          siteId: site.id,
          orderNo: "PO-DEMO-001",
          supplierId: supplierA.id,
          warehouseId: defaultWarehouse.id,
          currency: "CNY",
          amount: 130,
          taxAmount: 16.9,
          shippingFee: 20,
          totalAmount: 166.9,
          status: "completed",
          expectedDate: date(-7),
          remark: "首批环保面料采购",
          createdBy: "seed",
          confirmedAt: new Date(now.getTime() - 10 * 86400000),
        }),
      );
      const completedLine = await purchaseOrderLineRepo.save(
        purchaseOrderLineRepo.create({
          orderId: completedOrder.id,
          productId: seededProducts[0].id,
          variantKey: "BASE",
          productName: seededProducts[0].nameZh,
          productSku: seededProducts[0].sku,
          variantLabel: "默认规格",
          quantity: 200,
          receivedQuantity: 200,
          unitPrice: 0.65,
          amount: 130,
        }),
      );
      const receipt = await purchaseReceiptRepo.save(
        purchaseReceiptRepo.create({
          tenantId: site.tenantId,
          siteId: site.id,
          receiptNo: "RK-DEMO-001",
          orderId: completedOrder.id,
          warehouseId: defaultWarehouse.id,
          status: "received",
          remark: "数量及外观验收合格",
          createdBy: "seed",
          receivedAt: new Date(now.getTime() - 6 * 86400000),
        }),
      );
      await purchaseReceiptLineRepo.save(
        purchaseReceiptLineRepo.create({
          receiptId: receipt.id,
          orderLineId: completedLine.id,
          productId: completedLine.productId,
          variantKey: completedLine.variantKey,
          quantity: completedLine.quantity,
        }),
      );
      const completedBalance = await balanceRepo.findOneByOrFail({
        warehouseId: defaultWarehouse.id,
        productId: completedLine.productId,
        variantKey: completedLine.variantKey,
      });
      const openingLedger = await ledgerRepo.findOne({
        where: {
          referenceType: "seed",
          referenceId: completedBalance.id,
          type: "opening",
        },
      });
      if (openingLedger) {
        openingLedger.quantityChange = Math.max(
          0,
          completedBalance.onHand - completedLine.quantity,
        );
        openingLedger.balanceAfter = openingLedger.quantityChange;
        await ledgerRepo.save(openingLedger);
      }
      await ledgerRepo.save(
        ledgerRepo.create({
          tenantId: site.tenantId,
          siteId: site.id,
          warehouseId: defaultWarehouse.id,
          productId: completedLine.productId,
          variantKey: completedLine.variantKey,
          type: "purchase_in",
          quantityChange: completedLine.quantity,
          balanceAfter: completedBalance.onHand,
          referenceType: "purchase_receipt",
          referenceId: receipt.id,
          actorUserId: "seed",
          remark: `采购入库 ${receipt.receiptNo}`,
        }),
      );

      const confirmedOrder = await purchaseOrderRepo.save(
        purchaseOrderRepo.create({
          tenantId: site.tenantId,
          siteId: site.id,
          orderNo: "PO-DEMO-002",
          supplierId: supplierB.id,
          warehouseId: defaultWarehouse.id,
          currency: "CNY",
          amount: 450,
          taxAmount: 58.5,
          shippingFee: 0,
          totalAmount: 508.5,
          status: "confirmed",
          expectedDate: date(5),
          remark: "棉质面料常规补货",
          createdBy: "seed",
          confirmedAt: new Date(now.getTime() - 86400000),
        }),
      );
      const confirmedLine = await purchaseOrderLineRepo.save(
        purchaseOrderLineRepo.create({
          orderId: confirmedOrder.id,
          productId: seededProducts[1].id,
          variantKey: "BASE",
          productName: seededProducts[1].nameZh,
          productSku: seededProducts[1].sku,
          variantLabel: "默认规格",
          quantity: 500,
          receivedQuantity: 0,
          unitPrice: 0.9,
          amount: 450,
        }),
      );
      const confirmedBalance = await balanceRepo.findOneByOrFail({
        warehouseId: defaultWarehouse.id,
        productId: confirmedLine.productId,
        variantKey: confirmedLine.variantKey,
      });
      confirmedBalance.inTransit += confirmedLine.quantity;
      await balanceRepo.save(confirmedBalance);

      const draftOrder = await purchaseOrderRepo.save(
        purchaseOrderRepo.create({
          tenantId: site.tenantId,
          siteId: site.id,
          orderNo: "PO-DEMO-003",
          supplierId: supplierC.id,
          warehouseId: defaultWarehouse.id,
          currency: "CNY",
          amount: 280,
          taxAmount: 36.4,
          shippingFee: 15,
          totalAmount: 331.4,
          status: "draft",
          expectedDate: date(12),
          remark: "抽绳辅料采购计划，待确认",
          createdBy: "seed",
          confirmedAt: null,
        }),
      );
      await purchaseOrderLineRepo.save(
        purchaseOrderLineRepo.create({
          orderId: draftOrder.id,
          productId: seededProducts[2].id,
          variantKey: "BASE",
          productName: seededProducts[2].nameZh,
          productSku: seededProducts[2].sku,
          variantLabel: "默认规格",
          quantity: 800,
          receivedQuantity: 0,
          unitPrice: 0.35,
          amount: 280,
        }),
      );
    }
  }
  if (!site.publishedVersionId) {
    const snapshot = {
      site: {
        id: site.id,
        slug: site.slug,
        name: site.name,
        defaultLanguage: site.defaultLanguage,
        defaultCurrency: site.defaultCurrency,
      },
      config: configs.siteEditor,
      products: await productRepo.find({
        where: { siteId: site.id, status: "published" },
      }),
      generatedAt: new Date().toISOString(),
    };
    const version = await versionRepo.save({
      siteId: site.id,
      version: 1,
      status: "published",
      snapshot,
      publishedBy: "seed",
      releaseNote: "初始化站点",
    });
    site.status = "published";
    site.publishedVersionId = version.id;
    await siteRepo.save(site);
  }
  await ds.destroy();
  console.log("Seed completed!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
