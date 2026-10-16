# TEMPLATE SQL plan

No SQL by default. If this release needs historical-data correction, add numbered `.sql` files and document for each file:

- exact purpose and affected tenant/table scope;
- pre-query and expected row count;
- why the statement is idempotent;
- transaction and locking behavior;
- verification query;
- compensating SQL or backup/PITR rollback decision.

Every `UPDATE` or `DELETE` must have a selective `WHERE` clause. Do not include credentials or copied production rows.

Use `010-example.sql.template` as a starting point, rename it to a numbered `.sql` file, replace every placeholder, and keep one logical correction per file.
