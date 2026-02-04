# Project Instructions for Claude

## Database Migrations

When creating database migrations, Claude should always run them automatically using:

```bash
echo "y" | npx supabase db push
```

Do not ask the user to run migrations manually.

### Migration Patterns

- Reference users via `auth.users(id)`, not `users(id)`
- Use helper functions for RLS policies: `public.is_joey()`, `public.is_emily()`, `public.get_user_role()`, `public.is_support_of(owner_user_id)`
- Follow existing patterns in `supabase/migrations/` for RLS policy structure
