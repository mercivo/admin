# v1.0.8 rollout

## Preconditions

- [ ] Purchase and sales service tests passed
- [ ] Admin build and line-item regression checks passed
- [ ] Empty-placeholder scan passed
- [ ] `node scripts/validate-release.mjs v1.0.8` passed

## Ordered actions

1. Merge the reviewed commit to `main`.
2. Let the `mercivo-main` Cloud Build trigger build, test, migrate, and deploy all services in `mercivo-admin` / `asia-east1`.
3. Do not deploy an individual service from a developer machine.
4. Do not run a reset, first-install procedure, SQL script, or data correction.

## Verification

- With a test account, open a purchase and sales order editor backed by many product specifications; search, scroll, and change the selected option.
- Open purchase and sales order details and verify horizontal overflow uses the table scrollbar while vertical overflow uses the modal scrollbar.
- Cancel test orders that have no fulfillment or finance history, reopen them, save, and verify they return to pending receipt or pending shipment with the original order number.
- Verify an unchanged purchase order with decimal prices can be reopened and saved without request-validation errors.
- Reopen cancelled orders whose original product or specification is no longer selectable and verify the field is empty and requires a new selection rather than showing an internal key.
- Confirm orders with fulfillment or finance history are rejected by the reopen endpoint.
- Verify inventory in-transit and reserved quantities using read-only queries after the test workflow.
