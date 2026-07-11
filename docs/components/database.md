---
sidebar_position: 1
---

# Database

**Location:** `cocoa_project_transfer/database/` · **Stack:** PostgreSQL on [NeonDB](https://neon.tech), PostGIS, pgcrypto

Three SQL files are the source of truth (there is no migration tool yet — see [O1](/docs/critical-issues#o1)):

| File | Contents | Status |
|---|---|---|
| `schema.sql` | 8 schemas, 65 tables, 80 FKs | ✅ In sync with the live dump |
| `seed.sql` | Dev seed data (users for every role, sample farms/harvests) | ✅ Clean, but one shared bcrypt hash |
| `other.sql` | `ref.*_constant` sync trigger functions | 🔴 **Truncated / invalid SQL** — restore from `backup.sql` ([C1](/docs/critical-issues#c1)) |

## Design decisions (from the original team)

- **ER-first design** — tables mirror the ER model directly.
- **Multi-schema layout** — 8 PostgreSQL schemas, one per business domain.
- **UUID primary keys** via `gen_random_uuid()` — safe for offline/mobile inserts and against ID enumeration.
- **No ORM** — the Kotlin backend uses jOOQ with explicit SQL.
- **No migration tool** — schema changes are manual `ALTER` statements + updating `schema.sql`. *(The [DB review](/docs/database/db-review) recommends adopting Flyway.)*
- **PostGIS** for plot boundaries and geographic data.

:::note[Normalization claim]
The original README claims "higher normal forms". The [DB review (D5)](/docs/database/db-review#4-bad-points) found real exceptions: the province/district/subdistrict triple is denormalized across 6 tables, and `ref.*_constant` mirror tables duplicate live data via triggers. Treat these as *documented denormalizations*, not 3NF.
:::

## First-time setup

1. Create a NeonDB project and database.
2. Enable extensions:

   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

3. Apply schema, then optionally seed:

   ```bash
   psql "postgresql://<user>:<password>@<host>/<dbname>?sslmode=require" -f schema.sql
   psql "postgresql://..." -f seed.sql
   ```

4. **Triggers:** restore the full trigger functions from `backup.sql` (at the CAPSTONE root, next to the transfer folder) — do not run the broken `other.sql`. Note `backup.sql` is **UTF-16 encoded**; convert first: `iconv -f UTF-16LE -t UTF-8 backup.sql > backup_utf8.sql`.

## Admin & permission recipes

There is no admin UI; these are done directly in SQL.

### Add an admin user

```sql
INSERT INTO auth.user_account (username, password_hash, is_requires_password_reset)
VALUES ('admin@example.com', '<bcrypt_hashed_password>', true);

INSERT INTO auth.user_role (user_id, role_id)
VALUES (
    (SELECT user_id FROM auth.user_account WHERE username = 'admin@example.com'),
    (SELECT role_id FROM auth.role WHERE role_name = 'admin')
);
```

:::warning[Role names are lowercase]
The live DB uses `admin`, `researcher`, `farmer`, `hub_collector`, `processor`. The old README's `ADMIN` / `RESEARCHER` / `COLLECTOR` is wrong. ([R2](/docs/critical-issues#r2))
:::

Passwords are bcrypt-hashed by the application — never store plain text.

:::note[Two similar-looking columns]
`user_account` has both `is_requires_password_reset` (**must** reset on next login — the one to set here) and `is_password_reset` (**has completed** a reset). Both are real and used by the backend; don't mix them up.
:::

### Grant / revoke a permission for a role

```sql
-- inspect
SELECT p.permission_key, p.description
FROM auth.role_permission rp
JOIN auth.permission p ON p.permission_id = rp.permission_id
JOIN auth.role r ON r.role_id = rp.role_id
WHERE r.role_name = 'researcher';

-- grant
INSERT INTO auth.role_permission (role_id, permission_id)
VALUES (
    (SELECT role_id FROM auth.role WHERE role_name = 'researcher'),
    (SELECT permission_id FROM auth.permission WHERE permission_key = 'form:read')
);

-- revoke
DELETE FROM auth.role_permission
WHERE role_id       = (SELECT role_id FROM auth.role WHERE role_name = 'researcher')
  AND permission_id = (SELECT permission_id FROM auth.permission WHERE permission_key = 'form:read');
```

### Making schema changes (current manual process)

1. Write the `ALTER TABLE` / `CREATE TABLE` SQL.
2. Apply via `psql` or the NeonDB SQL editor.
3. **Update `schema.sql` to match** — it must always allow a from-scratch rebuild.
4. Regenerate jOOQ in the Kotlin backend (`./gradlew generateJooq`) and check the Go models.
5. Log the change in the [Project Log](/log).

## See also

- [Database Review](/docs/database/db-review) — full findings: good points, bad points, conflicts
- [Fix Decisions](/docs/database/fix-decisions) — leave-vs-fix analysis per finding
- [Critical Issues](/docs/critical-issues) — the live tracker
- [Weak-Point Register — DB items](/docs/phase-0#1-database)
