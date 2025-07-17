# Contributing to NVLP

## Development Setup

1. Install pnpm globally:
   ```bash
   npm install -g pnpm
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run development servers:
   ```bash
   # Run all apps in development
   pnpm dev

   # Run specific apps
   pnpm dev:api    # API server
   pnpm dev:mobile # React Native app
   pnpm dev:web    # Web app (future)
   ```

## Project Structure

- `apps/` - Application code
  - `api/` - Backend API and Edge Functions
  - `mobile/` - React Native mobile app
  - `web/` - Web application (future)
- `packages/` - Shared packages
  - `client/` - TypeScript API client
  - `types/` - Shared TypeScript types
  - `config/` - Shared configuration

## Development Guidelines

### Code Style
- We use ESLint and Prettier for code formatting
- Run `pnpm lint` to check for issues
- Run `pnpm format` to format code

### Testing
- Write tests for new features
- Run `pnpm test` to run all tests
- Run `pnpm test:watch` for development

### Commits
- Use clear, descriptive commit messages
- Reference issue numbers when applicable
- Keep commits focused and atomic

### Pull Requests
- Create feature branches from `main`
- Update relevant documentation
- Ensure all tests pass
- Request review from maintainers