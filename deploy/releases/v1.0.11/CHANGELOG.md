# v1.0.11

- New apex-domain requests are normalized to `www` using the public suffix list; explicit subdomains remain unchanged.
- New tenants configure one CNAME to `customers.aihubflux.com`; platform TXT verification is no longer created for new rows.
- Cloudflare Custom Hostnames use HTTP DCV and retryable provider failures remain in a pending lifecycle state.
- Domain responses expose the original requested hostname while preserving every historical hostname and provider ID.
- The storefront settings page separates DNS waiting, provisioning, active, and terminal assistance states.
