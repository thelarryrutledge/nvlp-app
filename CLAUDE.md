# CLAUDE.md - Project Context and Preferences

## Important Development Notes

### Supabase Configuration
- **We are NOT using local Docker version of Supabase**
- **We only use the remote Supabase service**
- Do not attempt to run `supabase start` or any Docker-related commands
- All Supabase edge functions are deployed to the remote service
- Development uses the remote Supabase instance directly

### API Development Workflow
- Edge functions are developed locally but deployed to remote Supabase
- Use `supabase functions deploy` for deployment
- Testing happens against the remote Supabase instance
- No local database or Docker containers are used

## Commands to Remember
- Build packages: `pnpm build:packages`
- Run tests: `pnpm test`
- Run linting: `pnpm lint`
- Clean build artifacts: `pnpm clean`

## Project Structure
- Monorepo using pnpm workspaces
- `/apps/mobile` - React Native app
- `/apps/api` - Supabase Edge Functions (deployed to remote)
- `/packages/types` - Shared TypeScript types
- `/packages/client` - API client library
- `/packages/config` - Shared configurations