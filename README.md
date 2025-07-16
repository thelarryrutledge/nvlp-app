# NVLP - Personal Finance Management System

A comprehensive personal finance management system with React Native mobile app and Supabase backend, featuring envelope budgeting, transaction management, and financial reporting.

## 📚 Documentation

**[Complete Documentation](./docs/README.md)** - Comprehensive guides and references

### Quick Links
- **[Mobile Development](./apps/mobile/docs/DEVELOPMENT_GUIDE.md)** - React Native app setup and development  
- **[API Documentation](./apps/api/docs/)** - Supabase Edge Functions and database
- **[Deployment Guides](./docs/README.md#for-devopsdeployment)** - Production deployment processes
- **[Migration Status](./docs/migration/)** - Monorepo migration progress (95% Complete)

## Architecture

- **Frontend**: React Native mobile app with TypeScript
- **Backend**: Supabase (PostgreSQL + Edge Functions)  
- **Shared Libraries**: TypeScript packages for types and API client
- **Development**: pnpm monorepo with Turborepo build system
- **Deployment**: iOS App Store, Google Play Store, Supabase Edge Functions

## Features

- 📱 **Mobile App**: Native iOS and Android experience
- 🔐 **Authentication**: Secure user registration and login
- 💰 **Budget Management**: Create and manage multiple budgets
- 📊 **Categories & Envelopes**: Organize expenses with envelope budgeting
- 💳 **Transaction Tracking**: Record income, expenses, and transfers
- 📈 **Dashboard & Reports**: Comprehensive financial insights
- 📤 **Data Export**: Export data in multiple formats
- 🔍 **Audit Trail**: Track all financial activities
- 🔔 **Notifications**: Stay informed about budget status

## Project Structure

```
nvlp-app/
├── apps/
│   ├── mobile/              # React Native mobile app
│   │   ├── src/            # App source code
│   │   ├── android/        # Android platform code
│   │   ├── ios/            # iOS platform code
│   │   └── docs/           # Mobile documentation
│   └── api/                # Supabase Edge Functions
│       ├── src/            # Function source code
│       └── docs/           # API documentation
├── packages/
│   ├── types/              # Shared TypeScript types
│   ├── client/             # API client library
│   └── config/             # Shared configuration
├── docs/                   # Project documentation
└── scripts/                # Build and utility scripts
```

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- React Native development environment
- Supabase account

### Development Setup
```bash
# Clone repository
git clone https://github.com/thelarryrutledge/nvlp-app.git
cd nvlp-app

# Install dependencies
pnpm install

# Start mobile development
cd apps/mobile
pnpm start
pnpm ios    # or pnpm android
```

### Production Deployment
```bash
# Build packages
pnpm build:packages

# Deploy API
pnpm deploy:api

# Build mobile apps
cd apps/mobile
pnpm build:ios:prod
pnpm build:android:bundle
```

## Development Commands

```bash
# Development
pnpm dev                     # Start all development servers
pnpm start                   # Start mobile Metro bundler

# Building
pnpm build                   # Build all packages
pnpm build:packages          # Build shared packages only
pnpm build:production        # Production build with optimization

# Testing & Quality
pnpm test                    # Run all tests
pnpm lint                    # Run linting
pnpm type-check              # TypeScript validation

# Deployment
pnpm deploy:api              # Deploy API functions
pnpm cache:clean             # Clean build caches
```

## Technology Stack

### Frontend
- **React Native 0.80** - Cross-platform mobile development
- **TypeScript** - Type-safe development
- **Zustand** - State management
- **React Navigation** - Navigation library
- **React Native Vector Icons** - Icon system

### Backend
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Database
- **Edge Functions** - Serverless API
- **Row Level Security** - Data security

### Development
- **pnpm** - Package manager with workspace support
- **Turborepo** - Build system and caching
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework

## Contributing

1. **Setup**: Follow the [Development Guide](./apps/mobile/docs/DEVELOPMENT_GUIDE.md)
2. **Code Style**: Follow ESLint and Prettier configurations
3. **Testing**: Write tests for new features
4. **Documentation**: Update relevant docs when making changes
5. **Review**: All changes require code review

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## License

This project is licensed under the ISC License - see the [LICENSE](./LICENSE) file for details.

## Support

- **Documentation**: [docs/README.md](./docs/README.md)
- **Issues**: [GitHub Issues](https://github.com/thelarryrutledge/nvlp-app/issues)
- **Discussions**: [GitHub Discussions](https://github.com/thelarryrutledge/nvlp-app/discussions)

---

Built with ❤️ using React Native and Supabase