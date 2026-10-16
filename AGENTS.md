# Project implementation rules

## Empty-value rendering

- Render a missing scalar field with the ASCII hyphen `-`.
- Never use an em dash `—`, en dash `–`, or an HTML dash entity as an empty-value placeholder.
- Reserve collection-level copy such as `暂无数据` for an empty table, list, or selector; do not use it for an individual missing field.
- Reuse the existing shared table and empty-state components where available.
- Before finishing frontend work, run `frontend/e2e/empty-placeholder.spec.ts` or an equivalent source scan to ensure no em dash was introduced.
