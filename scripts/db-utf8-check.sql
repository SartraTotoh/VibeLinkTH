-- db-utf8-check.sql
-- Read-only. Find rows that carry the mojibake signature in user-entered
-- free-text columns (Thai + windows-874/UTF-8 double-encoding).
--
-- Safety: only SELECTs. Runs standalone per statement (works in Neon SQL
-- Editor and psql -f alike - no temp views, every query is self-contained).
--
-- The hard-signature class is: C1 controls U+0080..U+009F or Euro U+20AC.
-- These can NEVER appear in healthy UTF-8 Thai, so any hit is conclusive.
-- Class string is rebuilt inline as: '[' || chr(128) || '-' || chr(159) || chr(8364) || ']'

-- 1) Campaign - user-entered UTM fields
SELECT 'campaign' AS tbl, id, 'name' AS col, name AS val FROM "Campaign"
 WHERE name ~ ('[' || chr(128) || '-' || chr(159) || chr(8364) || ']')
UNION ALL
SELECT 'campaign', id, 'source', source FROM "Campaign"
 WHERE source ~ ('[' || chr(128) || '-' || chr(159) || chr(8364) || ']')
UNION ALL
SELECT 'campaign', id, 'medium', medium FROM "Campaign"
 WHERE medium ~ ('[' || chr(128) || '-' || chr(159) || chr(8364) || ']')
UNION ALL
SELECT 'campaign', id, 'content', COALESCE(content, '') FROM "Campaign"
 WHERE content ~ ('[' || chr(128) || '-' || chr(159) || chr(8364) || ']');

-- 2) Link - title (slug/destination are machine-managed)
SELECT 'link' AS tbl, id, 'title', title FROM "Link"
 WHERE title ~ ('[' || chr(128) || '-' || chr(159) || chr(8364) || ']');

-- 3) User - displayName / vibe free text
SELECT 'user' AS tbl, id, 'displayName', COALESCE("displayName", '') FROM "User"
 WHERE "displayName" ~ ('[' || chr(128) || '-' || chr(159) || chr(8364) || ']')
UNION ALL
SELECT 'user', id, 'vibeTitle', COALESCE("vibeTitle", '') FROM "User"
 WHERE "vibeTitle" ~ ('[' || chr(128) || '-' || chr(159) || chr(8364) || ']')
UNION ALL
SELECT 'user', id, 'vibeBio', COALESCE("vibeBio", '') FROM "User"
 WHERE "vibeBio" ~ ('[' || chr(128) || '-' || chr(159) || chr(8364) || ']');

-- 4) AuditLog detail (free-form)
SELECT 'audit_log' AS tbl, id, 'detail', COALESCE(detail, '') FROM "AuditLog"
 WHERE detail ~ ('[' || chr(128) || '-' || chr(159) || chr(8364) || ']');

-- 5) Pure-Thai token scan (known corrupted sequences; low false-positive)
-- These sequences contain archaic letters (ฃ/ฅ) or a stray right-double-quote
-- inside Thai text, so hits strongly indicate double-encoding:
SELECT 'campaign' AS tbl, id, 'name', name FROM "Campaign"
 WHERE name ~ U&'\0E18\0E03\0E18\0E0D|\0E18\0E05\0E18\201D|\0E40\0E18\0E1F'
UNION ALL
SELECT 'link', id, 'title', title FROM "Link"
 WHERE title ~ U&'\0E18\0E03\0E18\0E0D|\0E18\0E05\0E18\201D|\0E40\0E18\0E1F'
UNION ALL
SELECT 'user', id, 'displayName', COALESCE("displayName", '') FROM "User"
 WHERE "displayName" ~ U&'\0E18\0E03\0E18\0E0D|\0E18\0E05\0E18\201D|\0E40\0E18\0E1F'
UNION ALL
SELECT 'audit_log', id, 'detail', COALESCE(detail, '') FROM "AuditLog"
 WHERE detail ~ U&'\0E18\0E03\0E18\0E0D|\0E18\0E05\0E18\201D|\0E40\0E18\0E1F';