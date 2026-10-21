# v1.0.8 changelog

## User-visible changes

- Keep large product/specification selectors responsive when creating or reopening purchase and sales orders.
- Improve purchase and sales order detail column widths and use the modal as the only vertical scroll container.
- Allow cancelled orders with no fulfillment or finance history to be edited and returned to pending receipt or shipment.
- Normalize purchase order monetary fields as numbers so reopened orders pass request validation when saved without changing their values.
- Clear discontinued product or specification selections when reopening cancelled orders instead of displaying their internal keys.

## Components

- [x] API
- [x] Admin
- [ ] Storefront
- [ ] Database schema
- [ ] Historical-data correction
- [ ] Redis/networking
- [ ] Storage
