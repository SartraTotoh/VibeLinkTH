-- db-fix-mojibake.sql
-- Repair double-encoded Thai (windows-874 -> UTF-8) in user-entered columns.
--
-- CONSTRAINT:
--   Only fixes the 5 unambiguous word tokens (contain archaic letters ฃ/ฅ or a
--   stray right-double-quote U+201D, which NEVER occur in healthy Thai text).
--   NOT fixed automatically:
--     * "ยท" -> "·"  (ambiguous: valid inside e.g. "โดยทั่วไป" - needs review)
--     * C1/€ hard-sig rows (listed by db-utf8-check.sql) - human review, the
--       correct replacement depends on the original word, can't be guessed.
--
-- Safety:
--   * Idempotent (replace() is a no-op when token absent).
--   * Run db-utf8-check.sql AFTER this and expect the token-scan section empty.
--   * Review mode: replace UPDATE with SELECT + ctid to preview before writing.

-- Campaign
UPDATE "Campaign" SET name        = REPLACE(name,        U&'\0E40\0E18\0E1F',        U&'\0E3F');
UPDATE "Campaign" SET name        = REPLACE(name,        U&'\0E40\0E18\0E03\0E40\0E18\0E0D', U&'\0E23\0E2D');
UPDATE "Campaign" SET name        = REPLACE(name,        U&'\0E40\0E18\0E05\0E40\0E18\201D',      U&'\0E25\0E14');
UPDATE "Campaign" SET name        = REPLACE(name,        U&'\0E40\0E18\0E0A\0E40\0E18\201D',      U&'\0E2A\0E14');
UPDATE "Campaign" SET name        = REPLACE(name,        U&'\0E40\0E18\201D\0E40\0E18\0E0E',      U&'\0E14\0E39');
UPDATE "Campaign" SET source      = REPLACE(source,      U&'\0E40\0E18\0E1F',        U&'\0E3F');
UPDATE "Campaign" SET source      = REPLACE(source,      U&'\0E40\0E18\0E03\0E40\0E18\0E0D', U&'\0E23\0E2D');
UPDATE "Campaign" SET source      = REPLACE(source,      U&'\0E40\0E18\0E05\0E40\0E18\201D',      U&'\0E25\0E14');
UPDATE "Campaign" SET source      = REPLACE(source,      U&'\0E40\0E18\0E0A\0E40\0E18\201D',      U&'\0E2A\0E14');
UPDATE "Campaign" SET source      = REPLACE(source,      U&'\0E40\0E18\201D\0E40\0E18\0E0E',      U&'\0E14\0E39');
UPDATE "Campaign" SET medium      = REPLACE(medium,      U&'\0E40\0E18\0E1F',        U&'\0E3F');
UPDATE "Campaign" SET medium      = REPLACE(medium,      U&'\0E40\0E18\0E03\0E40\0E18\0E0D', U&'\0E23\0E2D');
UPDATE "Campaign" SET medium      = REPLACE(medium,      U&'\0E40\0E18\0E05\0E40\0E18\201D',      U&'\0E25\0E14');
UPDATE "Campaign" SET medium      = REPLACE(medium,      U&'\0E40\0E18\0E0A\0E40\0E18\201D',      U&'\0E2A\0E14');
UPDATE "Campaign" SET medium      = REPLACE(medium,      U&'\0E40\0E18\201D\0E40\0E18\0E0E',      U&'\0E14\0E39');
UPDATE "Campaign" SET content     = REPLACE(content,     U&'\0E40\0E18\0E1F',        U&'\0E3F');
UPDATE "Campaign" SET content     = REPLACE(content,     U&'\0E40\0E18\0E03\0E40\0E18\0E0D', U&'\0E23\0E2D');
UPDATE "Campaign" SET content     = REPLACE(content,     U&'\0E40\0E18\0E05\0E40\0E18\201D',      U&'\0E25\0E14');
UPDATE "Campaign" SET content     = REPLACE(content,     U&'\0E40\0E18\0E0A\0E40\0E18\201D',      U&'\0E2A\0E14');
UPDATE "Campaign" SET content     = REPLACE(content,     U&'\0E40\0E18\201D\0E40\0E18\0E0E',      U&'\0E14\0E39');

-- Link title
UPDATE "Link" SET title           = REPLACE(title,           U&'\0E40\0E18\0E1F',        U&'\0E3F');
UPDATE "Link" SET title           = REPLACE(title,           U&'\0E40\0E18\0E03\0E40\0E18\0E0D', U&'\0E23\0E2D');
UPDATE "Link" SET title           = REPLACE(title,           U&'\0E40\0E18\0E05\0E40\0E18\201D',      U&'\0E25\0E14');
UPDATE "Link" SET title           = REPLACE(title,           U&'\0E40\0E18\0E0A\0E40\0E18\201D',      U&'\0E2A\0E14');
UPDATE "Link" SET title           = REPLACE(title,           U&'\0E40\0E18\201D\0E40\0E18\0E0E',      U&'\0E14\0E39');

-- User display / vibe
UPDATE "User" SET "displayName"   = REPLACE("displayName",   U&'\0E40\0E18\0E1F',        U&'\0E3F');
UPDATE "User" SET "displayName"   = REPLACE("displayName",   U&'\0E40\0E18\0E03\0E40\0E18\0E0D', U&'\0E23\0E2D');
UPDATE "User" SET "displayName"   = REPLACE("displayName",   U&'\0E40\0E18\0E05\0E40\0E18\201D',      U&'\0E25\0E14');
UPDATE "User" SET "displayName"   = REPLACE("displayName",   U&'\0E40\0E18\0E0A\0E40\0E18\201D',      U&'\0E2A\0E14');
UPDATE "User" SET "displayName"   = REPLACE("displayName",   U&'\0E40\0E18\201D\0E40\0E18\0E0E',      U&'\0E14\0E39');
UPDATE "User" SET "vibeTitle"     = REPLACE("vibeTitle",     U&'\0E40\0E18\0E1F',        U&'\0E3F');
UPDATE "User" SET "vibeTitle"     = REPLACE("vibeTitle",     U&'\0E40\0E18\0E03\0E40\0E18\0E0D', U&'\0E23\0E2D');
UPDATE "User" SET "vibeTitle"     = REPLACE("vibeTitle",     U&'\0E40\0E18\0E05\0E40\0E18\201D',      U&'\0E25\0E14');
UPDATE "User" SET "vibeTitle"     = REPLACE("vibeTitle",     U&'\0E40\0E18\0E0A\0E40\0E18\201D',      U&'\0E2A\0E14');
UPDATE "User" SET "vibeTitle"     = REPLACE("vibeTitle",     U&'\0E40\0E18\201D\0E40\0E18\0E0E',      U&'\0E14\0E39');
UPDATE "User" SET "vibeBio"       = REPLACE("vibeBio",       U&'\0E40\0E18\0E1F',        U&'\0E3F');
UPDATE "User" SET "vibeBio"       = REPLACE("vibeBio",       U&'\0E40\0E18\0E03\0E40\0E18\0E0D', U&'\0E23\0E2D');
UPDATE "User" SET "vibeBio"       = REPLACE("vibeBio",       U&'\0E40\0E18\0E05\0E40\0E18\201D',      U&'\0E25\0E14');
UPDATE "User" SET "vibeBio"       = REPLACE("vibeBio",       U&'\0E40\0E18\0E0A\0E40\0E18\201D',      U&'\0E2A\0E14');
UPDATE "User" SET "vibeBio"       = REPLACE("vibeBio",       U&'\0E40\0E18\201D\0E40\0E18\0E0E',      U&'\0E14\0E39');

-- AuditLog detail
UPDATE "AuditLog" SET detail      = REPLACE(detail,      U&'\0E40\0E18\0E1F',        U&'\0E3F');
UPDATE "AuditLog" SET detail      = REPLACE(detail,      U&'\0E40\0E18\0E03\0E40\0E18\0E0D', U&'\0E23\0E2D');
UPDATE "AuditLog" SET detail      = REPLACE(detail,      U&'\0E40\0E18\0E05\0E40\0E18\201D',      U&'\0E25\0E14');
UPDATE "AuditLog" SET detail      = REPLACE(detail,      U&'\0E40\0E18\0E0A\0E40\0E18\201D',      U&'\0E2A\0E14');
UPDATE "AuditLog" SET detail      = REPLACE(detail,      U&'\0E40\0E18\201D\0E40\0E18\0E0E',      U&'\0E14\0E39');