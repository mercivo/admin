# v1.0.4 changelog

## User-visible changes

- Fix multilingual Excel import preview when production Redis is intentionally not configured.
- Keep preview tokens in API process memory for 30 minutes at the current single-instance scale.
- Return the existing expired-preview validation response after a process restart instead of a Redis connection error.
- Load multilingual content one business-group page at a time instead of fetching every 200-field page in parallel.
- Keep product, category-level, page-component, and common-copy groups intact while paging.
- Ignore stale responses during rapid language, tab, filter, and page changes while retaining unsaved drafts across pages.
- Avoid unchanged translation-unit writes, merge concurrent synchronization runs, and calculate both completion summaries from one short-lived cached dataset.
- Add a forward-only composite index for active translation-unit list queries.
- Show and edit every translation key independently, including identical product variant specifications and options; new Excel exports no longer combine repeated source copy.
- Keep cards and fields in deterministic business order: names before content, product variants and page components in their storefront rendering order, and common copy in module order.
- Order the Product Content quick navigation by category depth first, followed by product cards: first-level categories, second-level categories, then product information.

## Components

- [x] API
- [x] Admin
- [ ] Storefront
- [x] Database schema
- [ ] Historical-data correction
- [ ] Redis/networking
- [ ] Storage
