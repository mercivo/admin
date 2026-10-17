# v1.0.1 changelog

## User-visible changes

- 修复商品图片上传成功后因图片域名无法解析而不显示的问题。
- 已保存的历史图片地址由管理端和店铺前台自动兼容，无需修改生产数据。
- 商品图片改为等比例完整显示并居中，宽图和长图不再被裁切。
- 商品支持最多 10 张图片，详情页提供主图与可切换缩略图，图片留白统一为白色。
- 采购、销售和库存商品明细编辑表扩大商品规格列与下拉选项，并统一行内容垂直居中。

## Components

- [x] API
- [x] Admin
- [x] Storefront
- [x] Database schema
- [ ] Historical-data correction
- [ ] Redis/networking
- [x] Storage
