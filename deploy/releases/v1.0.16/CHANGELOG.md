# v1.0.16

- Preserve an entered apex hostname instead of rewriting it to `www`.
- Require a tenant-specific TXT ownership proof before provisioning Cloudflare routing and HTTPS.
- Allow multiple unverified claims while enforcing one verified owner for each hostname in MySQL.
- Keep the current active primary domain until its replacement becomes active.
- Add apex DNS guidance for CNAME Flattening, ALIAS, and ANAME providers.

The schema migration changes only hostname claim constraints. It does not rewrite any existing hostname or release any existing binding.
