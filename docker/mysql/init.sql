-- SEO 管理平台数据库初始化脚本
-- 字符集: utf8mb4, 排序规则: utf8mb4_unicode_ci

CREATE TABLE IF NOT EXISTS `seo_global` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `site_name` VARCHAR(255) NOT NULL,
  `title_template` VARCHAR(255) DEFAULT NULL,
  `description_template` TEXT DEFAULT NULL,
  `default_share_image` VARCHAR(500) DEFAULT NULL,
  `ga_id` VARCHAR(50) DEFAULT NULL,
  `gc_verification` TEXT DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `page_overrides` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `page_type` ENUM('home', 'product_list', 'product_detail', 'custom') NOT NULL,
  `page_id` VARCHAR(255) DEFAULT NULL,
  `language` VARCHAR(10) NOT NULL,
  `title` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `keywords` JSON DEFAULT NULL,
  `social_title` VARCHAR(255) DEFAULT NULL,
  `social_description` TEXT DEFAULT NULL,
  `social_image` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  UNIQUE KEY `uk_page_type_lang` (`page_type`, `language`, `page_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `main_image` VARCHAR(500) DEFAULT NULL,
  `seo_title` VARCHAR(255) DEFAULT NULL,
  `seo_description` TEXT DEFAULT NULL,
  `seo_image` VARCHAR(500) DEFAULT NULL,
  `brand` VARCHAR(255) DEFAULT NULL,
  `gtin` VARCHAR(50) DEFAULT NULL,
  `enable_reviews` TINYINT(1) NOT NULL DEFAULT 0,
  `review_rating` DECIMAL(2,1) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sitemap_info` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `last_generated_at` DATETIME DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'generated',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hreflang_config` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `language` VARCHAR(10) NOT NULL,
  `base_url` VARCHAR(500) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认数据
INSERT INTO `sitemap_info` (`status`) VALUES ('generated') ON DUPLICATE KEY UPDATE `status` = 'generated';