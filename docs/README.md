# NVLP Documentation

## Overview

Comprehensive documentation for the NVLP (Virtual Envelope Budget) application - a React Native mobile app with Supabase backend API.

## Documentation Structure

### 📱 Mobile App
- **[Mobile Development Guide](../apps/mobile/docs/DEVELOPMENT_GUIDE.md)** - Complete setup and development workflow
- **[Mobile Deployment Guide](../apps/mobile/docs/DEPLOYMENT_GUIDE.md)** - Production builds and app store deployment
- **[Mobile README](../apps/mobile/README.md)** - Quick start and overview

### 🔌 API & Backend  
- **[API Documentation](../apps/api/docs/)** - Supabase Edge Functions and database
- **[API Deployment Guide](../apps/api/docs/DEPLOYMENT.md)** - API deployment process
- **[API Specification](../apps/api/docs/api-specification.yaml)** - OpenAPI specification
- **[API README](../apps/api/README.md)** - Quick start and overview

### 🏗️ Development & Build
- **[Development Guide](./DEVELOPMENT.md)** - General development workflow
- **[Development Setup Guide](./development/SETUP_GUIDE.md)** - Complete development environment setup
- **[Development Workflow](./development/WORKFLOW.md)** - Day-to-day development workflows  
- **[Hot Reload Setup](./development/HOT_RELOAD.md)** - Development environment configuration
- **[Deployment Overview](./development/DEPLOYMENT_OVERVIEW.md)** - Complete deployment guide for all components
- **[Production Build Guide](./PRODUCTION_BUILD.md)** - Build process and optimization

### 🗂️ Project Architecture
- **[Architecture Overview](./ARCHITECTURE.md)** - Comprehensive system architecture with diagrams
- **[Implementation Plan](./IMPLEMENTATION_PLAN.md)** - High-level architecture and features
- **[Performance Analysis](./PERFORMANCE_ANALYSIS.md)** - Performance considerations and optimization
- **[Caching Implementation](./CACHING_IMPLEMENTATION.md)** - Caching strategy and implementation
- **[Data Dictionary](./data-dictionary.md)** - Database schema and API reference

### 📦 Monorepo Migration
- **[Migration Plan](./migration/MONOREPO_MIGRATION_PLAN.md)** - Original migration strategy
- **[Migration Roadmap](./migration/monorepo-migration-roadmap.md)** - Detailed migration progress
- **[Migration Memory](./migration/memory.md)** - Current status and next steps

## Quick Start Guides

### For Developers
1. **Environment Setup**: Follow [Development Setup Guide](./development/SETUP_GUIDE.md)
2. **Daily Workflow**: Use [Development Workflow](./development/WORKFLOW.md) 
3. **Mobile-Specific**: See [Mobile Development Guide](../apps/mobile/docs/DEVELOPMENT_GUIDE.md)
4. **API Development**: Use [API Documentation](../apps/api/docs/)

### For DevOps/Deployment
1. **Complete Overview**: [Deployment Overview](./development/DEPLOYMENT_OVERVIEW.md)
2. **Mobile Deployment**: [Mobile Deployment Guide](../apps/mobile/docs/DEPLOYMENT_GUIDE.md)
3. **API Deployment**: [API Deployment Guide](../apps/api/docs/DEPLOYMENT.md)
4. **Production Builds**: [Production Build Guide](./PRODUCTION_BUILD.md)

### For Project Management
1. **System Architecture**: [Architecture Overview](./ARCHITECTURE.md)
2. **Implementation**: [Implementation Plan](./IMPLEMENTATION_PLAN.md)
3. **Progress**: [Migration Roadmap](./migration/monorepo-migration-roadmap.md)
4. **Performance**: [Performance Analysis](./PERFORMANCE_ANALYSIS.md)

## Project Structure

```
nvlp-app/
├── apps/
│   ├── mobile/              # React Native mobile app
│   │   ├── docs/           # Mobile-specific documentation
│   │   ├── src/            # Mobile app source code
│   │   ├── android/        # Android platform code
│   │   └── ios/            # iOS platform code
│   └── api/                # Supabase Edge Functions
│       ├── docs/           # API documentation
│       └── src/            # Edge function source code
├── packages/
│   ├── types/              # Shared TypeScript types
│   ├── client/             # API client library
│   └── config/             # Shared configuration
├── docs/                   # Project documentation
│   ├── migration/          # Monorepo migration docs
│   └── development/        # Development guides
└── scripts/                # Build and utility scripts
```

## Contributing

1. **Code Style**: Follow ESLint and Prettier configurations
2. **Documentation**: Update relevant docs when making changes
3. **Testing**: Write tests for new features
4. **Review**: All changes require code review

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed contribution guidelines.

## Development Workflow

### Daily Development
```bash
# Start development environment
pnpm dev

# Run mobile app
cd apps/mobile
pnpm start
pnpm ios  # or pnpm android
```

### Before Committing
```bash
# Run quality checks
pnpm type-check
pnpm lint
pnpm test

# Build packages
pnpm build:packages
```

### Production Deployment
```bash
# Build for production
pnpm build:production

# Deploy API
pnpm deploy:api

# Build mobile apps
cd apps/mobile
pnpm build:ios:prod
pnpm build:android:bundle
```

## Support & Resources

### Internal Resources
- **[CLAUDE.md](../CLAUDE.md)** - AI assistant context and preferences
- **[Guidelines](../guidelines.md)** - Project guidelines and conventions

### External Resources
- [React Native Documentation](https://reactnative.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [pnpm Documentation](https://pnpm.io/)

---

Last updated: July 2025  
For questions or issues, please check the relevant documentation sections above.