import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1791864768221 implements MigrationInterface {
    name = 'InitialSchema1791864768221'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`team_members\` (
                \`id\` varchar(36) NOT NULL,
                \`user_id\` varchar(36) NULL,
                \`tenant_id\` varchar(36) NOT NULL DEFAULT '',
                \`site_id\` varchar(36) NOT NULL DEFAULT '',
                \`name\` varchar(255) NOT NULL,
                \`email\` varchar(255) NULL,
                \`phone\` varchar(50) NULL,
                \`role\` varchar(20) NOT NULL DEFAULT 'member',
                \`permissions\` json NULL,
                \`avatar\` varchar(10) NOT NULL,
                \`color\` varchar(100) NOT NULL DEFAULT 'bg-gray-500 text-white',
                \`joined_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_c2bf4967c8c2a6b845dadfbf3d\` (\`user_id\`),
                UNIQUE INDEX \`IDX_a88b84bdd6391e3d877a59fbb7\` (\`email\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`app_configs\` (
                \`key\` varchar(100) NOT NULL,
                \`value\` json NOT NULL,
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`key\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`translation_values\` (
                \`id\` varchar(36) NOT NULL,
                \`unit_id\` varchar(36) NOT NULL,
                \`locale\` varchar(10) NOT NULL,
                \`value\` longtext NOT NULL,
                \`source_hash\` varchar(64) NOT NULL,
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`uq_translation_value_locale\` (\`unit_id\`, \`locale\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`translation_units\` (
                \`id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`resource_type\` varchar(32) NOT NULL,
                \`resource_id\` varchar(160) NOT NULL,
                \`field_key\` varchar(255) NOT NULL,
                \`source_text\` longtext NOT NULL,
                \`source_hash\` varchar(64) NOT NULL,
                \`content_format\` varchar(16) NOT NULL DEFAULT 'text',
                \`is_required\` tinyint NOT NULL DEFAULT 1,
                \`is_archived\` tinyint NOT NULL DEFAULT 0,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`uq_translation_unit_resource\` (
                    \`site_id\`,
                    \`resource_type\`,
                    \`resource_id\`,
                    \`field_key\`
                ),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`subscription_orders\` (
                \`id\` varchar(36) NOT NULL,
                \`order_no\` varchar(40) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`plan_id\` varchar(36) NOT NULL,
                \`plan_code\` varchar(30) NOT NULL,
                \`plan_name\` varchar(80) NOT NULL,
                \`amount\` decimal(10, 2) NOT NULL,
                \`currency\` varchar(10) NOT NULL DEFAULT 'CNY',
                \`status\` varchar(20) NOT NULL DEFAULT 'confirmed',
                \`payment_status\` varchar(20) NOT NULL DEFAULT 'not_required',
                \`effective_at\` datetime NOT NULL,
                \`expires_at\` datetime NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_5520a1d8a6de7c98fdbb761acb\` (\`order_no\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`plans\` (
                \`id\` varchar(36) NOT NULL,
                \`code\` varchar(30) NOT NULL,
                \`name\` varchar(80) NOT NULL,
                \`price\` decimal(10, 2) NOT NULL DEFAULT '0.00',
                \`currency\` varchar(10) NOT NULL DEFAULT 'CNY',
                \`billing_cycle\` varchar(20) NOT NULL DEFAULT 'month',
                \`description\` text NULL,
                \`max_products\` int NOT NULL DEFAULT '100',
                \`max_members\` int NOT NULL DEFAULT '1',
                \`max_warehouses\` int NOT NULL DEFAULT '1',
                \`features\` json NULL,
                \`permissions\` json NULL,
                \`enabled\` tinyint NOT NULL DEFAULT 1,
                \`sort_order\` int NOT NULL DEFAULT '0',
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_95f7ef3fc4c31a3545b4d825dd\` (\`code\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`storefront_inquiry_leads\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`type\` varchar(20) NOT NULL DEFAULT 'inquiry',
                \`status\` varchar(24) NOT NULL DEFAULT 'new',
                \`name\` varchar(120) NOT NULL DEFAULT '',
                \`contact\` varchar(160) NOT NULL DEFAULT '',
                \`email\` varchar(160) NOT NULL DEFAULT '',
                \`company\` varchar(160) NOT NULL DEFAULT '',
                \`phone\` varchar(50) NOT NULL DEFAULT '',
                \`country\` varchar(100) NOT NULL DEFAULT '',
                \`product_id\` varchar(36) NULL,
                \`product_name\` varchar(255) NOT NULL DEFAULT '',
                \`source_page\` varchar(500) NOT NULL DEFAULT '',
                \`requirements\` text NOT NULL,
                \`note\` text NULL,
                \`assigned_to_user_id\` varchar(36) NULL,
                \`assigned_to_name\` varchar(120) NOT NULL DEFAULT '',
                \`close_reason\` text NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                INDEX \`IDX_storefront_leads_site_created\` (\`site_id\`, \`created_at\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`sitemap_info\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`last_generated_at\` datetime NULL,
                \`status\` varchar(50) NOT NULL DEFAULT 'generated',
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`hreflang_config\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`language\` varchar(10) NOT NULL,
                \`base_url\` varchar(500) NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`tenants\` (
                \`id\` varchar(36) NOT NULL,
                \`slug\` varchar(120) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`status\` varchar(20) NOT NULL DEFAULT 'active',
                \`plan\` varchar(30) NOT NULL DEFAULT 'trial',
                \`max_products\` int NOT NULL DEFAULT '100',
                \`max_members\` int NOT NULL DEFAULT '1',
                \`max_warehouses\` int NOT NULL DEFAULT '1',
                \`features\` json NULL,
                \`permissions\` json NULL,
                \`permissions_customized\` tinyint NOT NULL DEFAULT 0,
                \`expires_at\` datetime NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_2310ecc5cb8be427097154b18f\` (\`slug\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`sites\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`slug\` varchar(120) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`status\` varchar(20) NOT NULL DEFAULT 'draft',
                \`default_language\` varchar(10) NOT NULL DEFAULT 'zh_CN',
                \`supported_languages\` json NULL,
                \`default_currency\` varchar(10) NOT NULL DEFAULT 'CNY',
                \`guest_price_mode\` varchar(20) NOT NULL DEFAULT 'base',
                \`published_version_id\` varchar(36) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_26503a75e987672fb5af9258cc\` (\`slug\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`site_versions\` (
                \`id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`version\` int NOT NULL,
                \`status\` varchar(20) NOT NULL DEFAULT 'published',
                \`snapshot\` json NOT NULL,
                \`published_by\` varchar(255) NOT NULL DEFAULT 'system',
                \`release_note\` text NOT NULL,
                \`published_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`site_domains\` (
                \`id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`hostname\` varchar(255) NOT NULL,
                \`is_primary\` tinyint NOT NULL DEFAULT 0,
                \`ssl_status\` varchar(20) NOT NULL DEFAULT 'pending',
                \`status\` varchar(20) NOT NULL DEFAULT 'active',
                \`verification_token\` varchar(64) NULL,
                \`verified_at\` datetime NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_a96ae7420bf21c00b964475c9b\` (\`hostname\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`seo_global\` (
                \`id\` varchar(36) NOT NULL,
                \`site_name\` varchar(255) NOT NULL,
                \`title_template\` varchar(255) NULL,
                \`description_template\` text NULL,
                \`default_share_image\` varchar(500) NULL,
                \`ga_id\` varchar(50) NULL,
                \`gc_verification\` text NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`sales_orders\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`order_no\` varchar(40) NOT NULL,
                \`customer_id\` varchar(36) NOT NULL,
                \`warehouse_id\` varchar(36) NOT NULL,
                \`currency\` varchar(3) NOT NULL DEFAULT 'CNY',
                \`amount\` decimal(14, 2) NOT NULL DEFAULT '0.00',
                \`discount\` decimal(14, 2) NOT NULL DEFAULT '0.00',
                \`shipping_fee\` decimal(14, 2) NOT NULL DEFAULT '0.00',
                \`total_amount\` decimal(14, 2) NOT NULL DEFAULT '0.00',
                \`status\` varchar(24) NOT NULL DEFAULT 'confirmed',
                \`delivery_date\` date NULL,
                \`shipping_address\` varchar(500) NOT NULL DEFAULT '',
                \`contact_name\` varchar(80) NOT NULL DEFAULT '',
                \`contact_phone\` varchar(40) NOT NULL DEFAULT '',
                \`remark\` varchar(500) NOT NULL DEFAULT '',
                \`created_by\` varchar(36) NOT NULL,
                \`confirmed_at\` datetime NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`UQ_sales_orders_site_no\` (\`site_id\`, \`order_no\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`sales_order_lines\` (
                \`id\` varchar(36) NOT NULL,
                \`order_id\` varchar(36) NOT NULL,
                \`product_id\` varchar(36) NOT NULL,
                \`variant_key\` varchar(36) NOT NULL DEFAULT 'BASE',
                \`product_name\` varchar(255) NOT NULL,
                \`product_sku\` varchar(100) NOT NULL,
                \`variant_label\` varchar(160) NOT NULL DEFAULT '默认规格',
                \`quantity\` int NOT NULL,
                \`shipped_quantity\` int NOT NULL DEFAULT '0',
                \`unit_price\` decimal(14, 2) NOT NULL,
                \`amount\` decimal(14, 2) NOT NULL,
                UNIQUE INDEX \`UQ_sales_order_line_dimension\` (\`order_id\`, \`product_id\`, \`variant_key\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`sales_shipments\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`shipment_no\` varchar(40) NOT NULL,
                \`order_id\` varchar(36) NOT NULL,
                \`warehouse_id\` varchar(36) NOT NULL,
                \`status\` varchar(20) NOT NULL DEFAULT 'shipped',
                \`delivery_method\` varchar(20) NOT NULL DEFAULT 'offline',
                \`logistics_company\` varchar(100) NOT NULL DEFAULT '',
                \`tracking_no\` varchar(100) NOT NULL DEFAULT '',
                \`remark\` varchar(500) NOT NULL DEFAULT '',
                \`created_by\` varchar(36) NOT NULL,
                \`shipped_at\` datetime NOT NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`UQ_sales_shipments_site_no\` (\`site_id\`, \`shipment_no\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`sales_shipment_lines\` (
                \`id\` varchar(36) NOT NULL,
                \`shipment_id\` varchar(36) NOT NULL,
                \`order_line_id\` varchar(36) NOT NULL,
                \`product_id\` varchar(36) NOT NULL,
                \`variant_key\` varchar(36) NOT NULL DEFAULT 'BASE',
                \`quantity\` int NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`suppliers\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`code\` varchar(40) NOT NULL,
                \`name\` varchar(160) NOT NULL,
                \`contact\` varchar(80) NOT NULL DEFAULT '',
                \`phone\` varchar(40) NOT NULL DEFAULT '',
                \`email\` varchar(160) NOT NULL DEFAULT '',
                \`address\` varchar(500) NOT NULL DEFAULT '',
                \`tax_no\` varchar(80) NOT NULL DEFAULT '',
                \`payment_terms\` varchar(100) NOT NULL DEFAULT '',
                \`payment_days\` int NOT NULL DEFAULT '0',
                \`status\` varchar(20) NOT NULL DEFAULT 'active',
                \`remark\` varchar(500) NOT NULL DEFAULT '',
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`UQ_suppliers_site_code\` (\`site_id\`, \`code\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`purchase_orders\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`order_no\` varchar(40) NOT NULL,
                \`supplier_id\` varchar(36) NOT NULL,
                \`warehouse_id\` varchar(36) NOT NULL,
                \`currency\` varchar(3) NOT NULL DEFAULT 'CNY',
                \`amount\` decimal(14, 2) NOT NULL DEFAULT '0.00',
                \`tax_amount\` decimal(14, 2) NOT NULL DEFAULT '0.00',
                \`shipping_fee\` decimal(14, 2) NOT NULL DEFAULT '0.00',
                \`total_amount\` decimal(14, 2) NOT NULL DEFAULT '0.00',
                \`status\` varchar(24) NOT NULL DEFAULT 'draft',
                \`expected_date\` date NULL,
                \`remark\` varchar(500) NOT NULL DEFAULT '',
                \`created_by\` varchar(36) NOT NULL,
                \`confirmed_at\` datetime NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`UQ_purchase_orders_site_no\` (\`site_id\`, \`order_no\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`purchase_order_lines\` (
                \`id\` varchar(36) NOT NULL,
                \`order_id\` varchar(36) NOT NULL,
                \`product_id\` varchar(36) NOT NULL,
                \`variant_key\` varchar(36) NOT NULL DEFAULT 'BASE',
                \`product_name\` varchar(255) NOT NULL,
                \`product_sku\` varchar(100) NOT NULL,
                \`variant_label\` varchar(160) NOT NULL DEFAULT '默认规格',
                \`quantity\` int NOT NULL,
                \`received_quantity\` int NOT NULL DEFAULT '0',
                \`unit_price\` decimal(14, 2) NOT NULL,
                \`amount\` decimal(14, 2) NOT NULL,
                UNIQUE INDEX \`UQ_purchase_order_line_dimension\` (\`order_id\`, \`product_id\`, \`variant_key\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`purchase_receipts\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`receipt_no\` varchar(40) NOT NULL,
                \`order_id\` varchar(36) NOT NULL,
                \`warehouse_id\` varchar(36) NOT NULL,
                \`status\` varchar(20) NOT NULL DEFAULT 'received',
                \`remark\` varchar(500) NOT NULL DEFAULT '',
                \`created_by\` varchar(36) NOT NULL,
                \`received_at\` datetime NOT NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`UQ_purchase_receipts_site_no\` (\`site_id\`, \`receipt_no\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`purchase_receipt_lines\` (
                \`id\` varchar(36) NOT NULL,
                \`receipt_id\` varchar(36) NOT NULL,
                \`order_line_id\` varchar(36) NOT NULL,
                \`product_id\` varchar(36) NOT NULL,
                \`variant_key\` varchar(36) NOT NULL DEFAULT 'BASE',
                \`quantity\` int NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`product_categories\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL DEFAULT '',
                \`site_id\` varchar(36) NOT NULL DEFAULT '',
                \`code\` varchar(100) NOT NULL,
                \`label\` varchar(255) NOT NULL,
                \`sort\` int NOT NULL DEFAULT '0',
                \`status\` varchar(20) NOT NULL DEFAULT 'enabled',
                \`remark\` varchar(500) NOT NULL DEFAULT '',
                \`parent_code\` varchar(100) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`uq_product_categories_site_code\` (\`site_id\`, \`code\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`products\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL DEFAULT '',
                \`site_id\` varchar(36) NOT NULL DEFAULT '',
                \`name_zh\` varchar(255) NOT NULL,
                \`sku\` varchar(100) NOT NULL,
                \`description\` text NULL,
                \`price\` varchar(100) NOT NULL,
                \`base_price\` decimal(14, 2) NOT NULL DEFAULT '0.00',
                \`level_prices\` json NULL,
                \`currency_prices\` json NULL,
                \`variants\` json NULL,
                \`tags\` json NULL,
                \`stock\` int NOT NULL,
                \`moq\` int NOT NULL,
                \`status\` varchar(20) NOT NULL DEFAULT 'pending',
                \`category\` varchar(100) NOT NULL,
                \`img\` varchar(500) NOT NULL,
                \`hot\` tinyint NOT NULL DEFAULT 0,
                \`badge\` varchar(30) NOT NULL DEFAULT '',
                \`like_count\` int NOT NULL DEFAULT '0',
                \`main_image\` varchar(500) NULL,
                \`seo_title\` varchar(255) NULL,
                \`seo_description\` text NULL,
                \`seo_image\` varchar(500) NULL,
                \`brand\` varchar(255) NULL,
                \`gtin\` varchar(50) NULL,
                \`enable_reviews\` tinyint NOT NULL DEFAULT 0,
                \`review_rating\` decimal(2, 1) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`UQ_products_site_sku\` (\`site_id\`, \`sku\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`page_overrides\` (
                \`id\` varchar(36) NOT NULL,
                \`page_type\` enum (
                    'home',
                    'product_list',
                    'product_detail',
                    'custom'
                ) NOT NULL,
                \`page_id\` varchar(255) NULL,
                \`language\` varchar(10) NOT NULL,
                \`title\` varchar(255) NULL,
                \`description\` text NULL,
                \`keywords\` json NULL,
                \`social_title\` varchar(255) NULL,
                \`social_description\` text NULL,
                \`social_image\` varchar(500) NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`warehouses\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`code\` varchar(40) NOT NULL,
                \`name\` varchar(120) NOT NULL,
                \`contact\` varchar(80) NOT NULL DEFAULT '',
                \`phone\` varchar(40) NOT NULL DEFAULT '',
                \`address\` varchar(500) NOT NULL DEFAULT '',
                \`status\` varchar(20) NOT NULL DEFAULT 'active',
                \`is_default\` tinyint NOT NULL DEFAULT 0,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`UQ_warehouses_site_code\` (\`site_id\`, \`code\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`inventory_balances\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`warehouse_id\` varchar(36) NOT NULL,
                \`product_id\` varchar(36) NOT NULL,
                \`variant_key\` varchar(36) NOT NULL DEFAULT 'BASE',
                \`on_hand\` int NOT NULL DEFAULT '0',
                \`reserved\` int NOT NULL DEFAULT '0',
                \`in_transit\` int NOT NULL DEFAULT '0',
                \`warning_stock\` int NOT NULL DEFAULT '0',
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`UQ_inventory_balance_dimension\` (\`warehouse_id\`, \`product_id\`, \`variant_key\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`inventory_ledger\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`warehouse_id\` varchar(36) NOT NULL,
                \`product_id\` varchar(36) NOT NULL,
                \`variant_key\` varchar(36) NOT NULL DEFAULT 'BASE',
                \`type\` varchar(30) NOT NULL,
                \`quantity_change\` int NOT NULL,
                \`balance_after\` int NOT NULL,
                \`reference_type\` varchar(30) NOT NULL,
                \`reference_id\` varchar(36) NOT NULL,
                \`actor_user_id\` varchar(36) NOT NULL DEFAULT '',
                \`remark\` varchar(500) NOT NULL DEFAULT '',
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                INDEX \`IDX_inventory_ledger_site_created\` (\`site_id\`, \`created_at\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`stock_counts\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`document_no\` varchar(40) NOT NULL,
                \`warehouse_id\` varchar(36) NOT NULL,
                \`status\` varchar(20) NOT NULL DEFAULT 'draft',
                \`remark\` varchar(500) NOT NULL DEFAULT '',
                \`created_by\` varchar(36) NOT NULL,
                \`started_at\` datetime NULL,
                \`completed_at\` datetime NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`UQ_stock_counts_site_no\` (\`site_id\`, \`document_no\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`stock_count_lines\` (
                \`id\` varchar(36) NOT NULL,
                \`count_id\` varchar(36) NOT NULL,
                \`product_id\` varchar(36) NOT NULL,
                \`variant_key\` varchar(36) NOT NULL DEFAULT 'BASE',
                \`system_quantity\` int NOT NULL DEFAULT '0',
                \`counted_quantity\` int NULL,
                \`difference\` int NOT NULL DEFAULT '0',
                UNIQUE INDEX \`UQ_stock_count_line_dimension\` (\`count_id\`, \`product_id\`, \`variant_key\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`stock_transfers\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`document_no\` varchar(40) NOT NULL,
                \`source_warehouse_id\` varchar(36) NOT NULL,
                \`destination_warehouse_id\` varchar(36) NOT NULL,
                \`status\` varchar(20) NOT NULL DEFAULT 'shipped',
                \`remark\` varchar(500) NOT NULL DEFAULT '',
                \`created_by\` varchar(36) NOT NULL,
                \`shipped_at\` datetime NULL,
                \`received_at\` datetime NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`UQ_stock_transfers_site_no\` (\`site_id\`, \`document_no\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`stock_transfer_lines\` (
                \`id\` varchar(36) NOT NULL,
                \`transfer_id\` varchar(36) NOT NULL,
                \`product_id\` varchar(36) NOT NULL,
                \`variant_key\` varchar(36) NOT NULL DEFAULT 'BASE',
                \`quantity\` int NOT NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`finance_transactions\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`transaction_no\` varchar(40) NOT NULL,
                \`type\` varchar(16) NOT NULL,
                \`order_id\` varchar(36) NOT NULL,
                \`partner_id\` varchar(36) NOT NULL,
                \`partner_name\` varchar(160) NOT NULL,
                \`currency\` varchar(3) NOT NULL DEFAULT 'CNY',
                \`amount\` decimal(14, 2) NOT NULL,
                \`payment_method\` varchar(24) NOT NULL,
                \`account_name\` varchar(100) NOT NULL DEFAULT '',
                \`reference_no\` varchar(100) NOT NULL DEFAULT '',
                \`transaction_date\` date NOT NULL,
                \`status\` varchar(16) NOT NULL DEFAULT 'pending',
                \`remark\` varchar(500) NOT NULL DEFAULT '',
                \`void_reason\` varchar(500) NOT NULL DEFAULT '',
                \`created_by\` varchar(36) NOT NULL,
                \`voided_by\` varchar(36) NULL,
                \`voided_at\` datetime NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                INDEX \`IDX_finance_transactions_site_type_date\` (\`site_id\`, \`type\`, \`transaction_date\`),
                UNIQUE INDEX \`UQ_finance_transactions_site_no\` (\`site_id\`, \`transaction_no\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`customers\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`company\` varchar(255) NOT NULL,
                \`email\` varchar(255) NOT NULL DEFAULT '',
                \`phone\` varchar(50) NULL,
                \`phone_normalized\` varchar(50) NULL,
                \`status\` varchar(20) NOT NULL DEFAULT 'active',
                \`country\` varchar(100) NOT NULL DEFAULT '',
                \`level\` varchar(36) NOT NULL DEFAULT '',
                \`orders\` int NOT NULL DEFAULT '0',
                \`total_amount\` decimal(14, 2) NOT NULL DEFAULT '0.00',
                \`last_order_at\` date NULL,
                \`notes\` text NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`customer_level_rules\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NOT NULL,
                \`site_id\` varchar(36) NOT NULL,
                \`code\` varchar(36) NOT NULL,
                \`name\` varchar(50) NOT NULL,
                \`note\` varchar(500) NOT NULL DEFAULT '',
                \`min_amount\` decimal(14, 2) NOT NULL DEFAULT '0.00',
                \`min_orders\` int NOT NULL DEFAULT '0',
                \`discount_rate\` decimal(8, 2) NULL,
                \`sort\` int NOT NULL DEFAULT '0',
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`users\` (
                \`id\` varchar(36) NOT NULL,
                \`tenant_id\` varchar(36) NULL,
                \`site_id\` varchar(36) NULL,
                \`phone\` varchar(50) NULL,
                \`username\` varchar(80) NULL,
                \`password_hash\` varchar(255) NOT NULL,
                \`role\` varchar(30) NOT NULL DEFAULT 'admin',
                \`permissions\` json NULL,
                \`status\` varchar(20) NOT NULL DEFAULT 'active',
                \`last_login_at\` datetime NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_a000cca60bcf04454e72769949\` (\`phone\`),
                UNIQUE INDEX \`IDX_fe0bb3f6520ee0469504521e71\` (\`username\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX \`IDX_fe0bb3f6520ee0469504521e71\` ON \`users\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_a000cca60bcf04454e72769949\` ON \`users\`
        `);
        await queryRunner.query(`
            DROP TABLE \`users\`
        `);
        await queryRunner.query(`
            DROP TABLE \`customer_level_rules\`
        `);
        await queryRunner.query(`
            DROP TABLE \`customers\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_finance_transactions_site_no\` ON \`finance_transactions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_finance_transactions_site_type_date\` ON \`finance_transactions\`
        `);
        await queryRunner.query(`
            DROP TABLE \`finance_transactions\`
        `);
        await queryRunner.query(`
            DROP TABLE \`stock_transfer_lines\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_stock_transfers_site_no\` ON \`stock_transfers\`
        `);
        await queryRunner.query(`
            DROP TABLE \`stock_transfers\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_stock_count_line_dimension\` ON \`stock_count_lines\`
        `);
        await queryRunner.query(`
            DROP TABLE \`stock_count_lines\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_stock_counts_site_no\` ON \`stock_counts\`
        `);
        await queryRunner.query(`
            DROP TABLE \`stock_counts\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_inventory_ledger_site_created\` ON \`inventory_ledger\`
        `);
        await queryRunner.query(`
            DROP TABLE \`inventory_ledger\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_inventory_balance_dimension\` ON \`inventory_balances\`
        `);
        await queryRunner.query(`
            DROP TABLE \`inventory_balances\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_warehouses_site_code\` ON \`warehouses\`
        `);
        await queryRunner.query(`
            DROP TABLE \`warehouses\`
        `);
        await queryRunner.query(`
            DROP TABLE \`page_overrides\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_products_site_sku\` ON \`products\`
        `);
        await queryRunner.query(`
            DROP TABLE \`products\`
        `);
        await queryRunner.query(`
            DROP INDEX \`uq_product_categories_site_code\` ON \`product_categories\`
        `);
        await queryRunner.query(`
            DROP TABLE \`product_categories\`
        `);
        await queryRunner.query(`
            DROP TABLE \`purchase_receipt_lines\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_purchase_receipts_site_no\` ON \`purchase_receipts\`
        `);
        await queryRunner.query(`
            DROP TABLE \`purchase_receipts\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_purchase_order_line_dimension\` ON \`purchase_order_lines\`
        `);
        await queryRunner.query(`
            DROP TABLE \`purchase_order_lines\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_purchase_orders_site_no\` ON \`purchase_orders\`
        `);
        await queryRunner.query(`
            DROP TABLE \`purchase_orders\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_suppliers_site_code\` ON \`suppliers\`
        `);
        await queryRunner.query(`
            DROP TABLE \`suppliers\`
        `);
        await queryRunner.query(`
            DROP TABLE \`sales_shipment_lines\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_sales_shipments_site_no\` ON \`sales_shipments\`
        `);
        await queryRunner.query(`
            DROP TABLE \`sales_shipments\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_sales_order_line_dimension\` ON \`sales_order_lines\`
        `);
        await queryRunner.query(`
            DROP TABLE \`sales_order_lines\`
        `);
        await queryRunner.query(`
            DROP INDEX \`UQ_sales_orders_site_no\` ON \`sales_orders\`
        `);
        await queryRunner.query(`
            DROP TABLE \`sales_orders\`
        `);
        await queryRunner.query(`
            DROP TABLE \`seo_global\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_a96ae7420bf21c00b964475c9b\` ON \`site_domains\`
        `);
        await queryRunner.query(`
            DROP TABLE \`site_domains\`
        `);
        await queryRunner.query(`
            DROP TABLE \`site_versions\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_26503a75e987672fb5af9258cc\` ON \`sites\`
        `);
        await queryRunner.query(`
            DROP TABLE \`sites\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_2310ecc5cb8be427097154b18f\` ON \`tenants\`
        `);
        await queryRunner.query(`
            DROP TABLE \`tenants\`
        `);
        await queryRunner.query(`
            DROP TABLE \`hreflang_config\`
        `);
        await queryRunner.query(`
            DROP TABLE \`sitemap_info\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_storefront_leads_site_created\` ON \`storefront_inquiry_leads\`
        `);
        await queryRunner.query(`
            DROP TABLE \`storefront_inquiry_leads\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_95f7ef3fc4c31a3545b4d825dd\` ON \`plans\`
        `);
        await queryRunner.query(`
            DROP TABLE \`plans\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_5520a1d8a6de7c98fdbb761acb\` ON \`subscription_orders\`
        `);
        await queryRunner.query(`
            DROP TABLE \`subscription_orders\`
        `);
        await queryRunner.query(`
            DROP INDEX \`uq_translation_unit_resource\` ON \`translation_units\`
        `);
        await queryRunner.query(`
            DROP TABLE \`translation_units\`
        `);
        await queryRunner.query(`
            DROP INDEX \`uq_translation_value_locale\` ON \`translation_values\`
        `);
        await queryRunner.query(`
            DROP TABLE \`translation_values\`
        `);
        await queryRunner.query(`
            DROP TABLE \`app_configs\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_a88b84bdd6391e3d877a59fbb7\` ON \`team_members\`
        `);
        await queryRunner.query(`
            DROP INDEX \`IDX_c2bf4967c8c2a6b845dadfbf3d\` ON \`team_members\`
        `);
        await queryRunner.query(`
            DROP TABLE \`team_members\`
        `);
    }

}
