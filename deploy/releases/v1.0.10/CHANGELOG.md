# v1.0.10 changelog

- Integrate custom-domain ownership verification with Cloudflare for SaaS Custom Hostnames.
- Track pending verification, provisioning, active, and failed states separately.
- Reconcile asynchronous hostname and TLS status every minute.
- Keep provider deletion and local deletion consistent.
- Correct the admin UI so TXT verification is not presented as completed HTTPS provisioning.
- Add a dedicated Cloudflare edge Worker and authenticated original-host forwarding for Cloud Run.
- Show Cloudflare DCV records when certificate validation needs an additional DNS record.
