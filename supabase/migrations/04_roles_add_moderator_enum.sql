-- Three-tier role model, step A: add the enum value (must be its own transaction
-- before any function/policy can reference it). Applied live via MCP 2026-06-17.
--   moderator = platform super-admin: sees ALL projects, manages all roles/users.
--   admin     = tenant owner: sees ONLY projects they created + their own clients.
--   member    = client: sees only projects they are attached to.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'moderator';
