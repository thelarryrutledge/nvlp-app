# NVLP Architecture Documentation

Comprehensive architecture overview for the NVLP (Virtual Envelope Budget) system.

## Table of Contents

- [System Overview](#system-overview)
- [Monorepo Architecture](#monorepo-architecture)
- [Application Architecture](#application-architecture)
- [Data Architecture](#data-architecture)
- [API Architecture](#api-architecture)
- [Development Architecture](#development-architecture)
- [Deployment Architecture](#deployment-architecture)
- [Security Architecture](#security-architecture)

## System Overview

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NVLP System Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   Mobile Apps   │    │  Web Interface  │    │   API Clients   │        │
│  │                 │    │   (Future)      │    │   (External)    │        │
│  │ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │        │
│  │ │ iOS App     │ │    │ │ React Web   │ │    │ │ Third-party │ │        │
│  │ │ (React      │ │    │ │ Dashboard   │ │    │ │ Integrations│ │        │
│  │ │ Native)     │ │    │ │             │ │    │ │             │ │        │
│  │ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │        │
│  │ ┌─────────────┐ │    │                 │    │                 │        │
│  │ │ Android App │ │    │                 │    │                 │        │
│  │ │ (React      │ │    │                 │    │                 │        │
│  │ │ Native)     │ │    │                 │    │                 │        │
│  │ └─────────────┘ │    │                 │    │                 │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│           │                       │                       │                │
│           └───────────────────────┼───────────────────────┘                │
│                                   │                                        │
│  ┌─────────────────────────────────┼─────────────────────────────────┐      │
│  │                API Gateway / Load Balancer                       │      │
│  │                        (Supabase)                                │      │
│  └─────────────────────────────────┼─────────────────────────────────┘      │
│                                   │                                        │
│  ┌─────────────────────────────────┼─────────────────────────────────┐      │
│  │                    Backend Services                               │      │
│  │                                                                   │      │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │      │
│  │ │ Authentication  │  │ Edge Functions  │  │   Database      │   │      │
│  │ │ Service         │  │                 │  │                 │   │      │
│  │ │                 │  │ ┌─────────────┐ │  │ ┌─────────────┐ │   │      │
│  │ │ • JWT Tokens    │  │ │ Auth API    │ │  │ │ PostgreSQL  │ │   │      │
│  │ │ • User Mgmt     │  │ │ Dashboard   │ │  │ │ Database    │ │   │      │
│  │ │ • Session Mgmt  │  │ │ Transaction │ │  │ │             │ │   │      │
│  │ │                 │  │ │ Envelopes   │ │  │ │ • Tables    │ │   │      │
│  │ └─────────────────┘  │ │ Reports     │ │  │ │ • Views     │ │   │      │
│  │                      │ │ Export      │ │  │ │ • RLS       │ │   │      │
│  │ ┌─────────────────┐  │ │ Audit       │ │  │ │ • Triggers  │ │   │      │
│  │ │ Storage &       │  │ │ Health      │ │  │ └─────────────┘ │   │      │
│  │ │ File Management │  │ └─────────────┘ │  └─────────────────┘   │      │
│  │ │                 │  └─────────────────┘                      │      │
│  │ │ • File Uploads  │                                            │      │
│  │ │ • Documents     │  ┌─────────────────┐                      │      │
│  │ │ • Receipts      │  │ Realtime        │                      │      │
│  │ │                 │  │ Subscriptions   │                      │      │
│  │ └─────────────────┘  │                 │                      │      │
│  │                      │ • Live Updates  │                      │      │
│  │                      │ • Push Notifs   │                      │      │
│  │                      │ • Presence      │                      │      │
│  │                      │                 │                      │      │
│  │                      └─────────────────┘                      │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │                    External Integrations                        │      │
│  │                                                                 │      │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │      │
│  │ │ Analytics &     │  │ Banking APIs    │  │ Export Services │ │      │
│  │ │ Monitoring      │  │ (Future)        │  │                 │ │      │
│  │ │                 │  │                 │  │ • CSV Export    │ │      │
│  │ │ • Supabase      │  │ • Open Banking  │  │ • PDF Reports   │ │      │
│  │ │   Analytics     │  │ • Transaction   │  │ • Email Reports │ │      │
│  │ │ • Error         │  │   Import        │  │                 │ │      │
│  │ │   Tracking      │  │ • Account Sync  │  │                 │ │      │
│  │ │ • Performance   │  │                 │  │                 │ │      │
│  │ │   Monitoring    │  │                 │  │                 │ │      │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘ │      │
│  └─────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack Overview

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React Native 0.80 | Cross-platform mobile development |
| **State Management** | Zustand | Lightweight state management |
| **Navigation** | React Navigation 6 | Mobile navigation |
| **Backend** | Supabase | Backend-as-a-Service |
| **Database** | PostgreSQL | Primary data storage |
| **API** | Supabase Edge Functions | Serverless API endpoints |
| **Authentication** | Supabase Auth | User authentication & authorization |
| **Build System** | Turborepo + pnpm | Monorepo build orchestration |
| **Type Safety** | TypeScript | Type-safe development |

## Monorepo Architecture

### Package Structure

```
nvlp-app/                              # Monorepo Root
├── apps/                              # Applications
│   ├── mobile/                        # React Native Mobile App
│   │   ├── src/
│   │   │   ├── components/            # Reusable UI components
│   │   │   ├── screens/               # Screen components
│   │   │   ├── navigation/            # Navigation configuration
│   │   │   ├── stores/                # Zustand stores
│   │   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── utils/                 # Mobile-specific utilities
│   │   │   └── types/                 # Mobile-specific types
│   │   ├── android/                   # Android platform code
│   │   ├── ios/                       # iOS platform code
│   │   └── docs/                      # Mobile documentation
│   │
│   └── api/                           # API Package (deployment scripts)
│       ├── src/                       # Shared API utilities
│       ├── docs/                      # API documentation
│       └── package.json               # Deployment scripts
│
├── packages/                          # Shared Libraries
│   ├── types/                         # Shared TypeScript Types
│   │   ├── src/
│   │   │   ├── domain/                # Business entity types
│   │   │   ├── api/                   # API request/response types
│   │   │   └── enums/                 # Enumeration types
│   │   └── dist/                      # Built outputs (ESM/CJS)
│   │
│   ├── client/                        # API Client Library
│   │   ├── src/
│   │   │   ├── nvlp-client.ts         # Main client class
│   │   │   ├── token-manager.ts       # Authentication
│   │   │   ├── transports/            # HTTP transport layer
│   │   │   └── errors.ts              # Error handling
│   │   └── dist/                      # Built outputs
│   │
│   └── config/                        # Shared Configuration
│       ├── eslint/                    # ESLint configuration
│       ├── prettier/                  # Prettier configuration
│       ├── typescript/                # TypeScript configuration
│       └── jest/                      # Jest configuration
│
├── supabase/                          # Supabase Configuration
│   ├── functions/                     # Edge Functions (deployed)
│   │   ├── auth/                      # Authentication endpoints
│   │   ├── dashboard/                 # Dashboard data
│   │   ├── transactions/              # Transaction management
│   │   ├── envelopes/                 # Envelope operations
│   │   ├── reports/                   # Reporting
│   │   ├── export/                    # Data export
│   │   ├── notifications/             # Notifications
│   │   ├── audit/                     # Audit logging
│   │   ├── health/                    # Health checks
│   │   └── _shared/                   # Shared utilities
│   ├── migrations/                    # Database migrations
│   └── config.toml                    # Supabase project config
│
├── docs/                              # Project Documentation
│   ├── development/                   # Development guides
│   └── migration/                     # Migration documentation
│
├── scripts/                           # Build & Utility Scripts
└── .github/                           # CI/CD Workflows
```

### Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                    Package Dependency Flow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                           │
│  │   @nvlp/config  │ ─────────────────┐                       │
│  │                 │                  │                       │
│  │ • ESLint        │                  │                       │
│  │ • Prettier      │                  │                       │
│  │ • TypeScript    │                  │                       │
│  │ • Jest          │                  │                       │
│  └─────────────────┘                  │                       │
│                                       │                       │
│  ┌─────────────────┐                  │                       │
│  │   @nvlp/types   │ ─────────────────┼─────────┐             │
│  │                 │                  │         │             │
│  │ • Domain Types  │                  │         │             │
│  │ • API Types     │                  │         │             │
│  │ • Enums         │                  │         │             │
│  └─────────────────┘                  │         │             │
│            │                          │         │             │
│            │                          │         │             │
│            ▼                          │         │             │
│  ┌─────────────────┐                  │         │             │
│  │  @nvlp/client   │ ─────────────────┼─────────┼─────────┐   │
│  │                 │                  │         │         │   │
│  │ • API Client    │                  │         │         │   │
│  │ • Authentication│                  │         │         │   │
│  │ • HTTP Transport│                  │         │         │   │
│  │ • Error Handling│                  │         │         │   │
│  └─────────────────┘                  │         │         │   │
│            │                          │         │         │   │
│            │                          │         │         │   │
│            ▼                          ▼         ▼         ▼   │
│  ┌─────────────────┐                ┌───────────────────────┐ │
│  │  Mobile App     │                │      API Package     │ │
│  │                 │                │                       │ │
│  │ • React Native  │                │ • Edge Functions     │ │
│  │ • UI Components │                │ • Deployment Scripts │ │
│  │ • Navigation    │                │ • Documentation      │ │
│  │ • State Mgmt    │                │                       │ │
│  └─────────────────┘                └───────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Application Architecture

### Mobile Application Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Mobile App Architecture                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Presentation Layer                           │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │    Screens      │  │   Components    │  │   Navigation    │     │   │
│  │ │                 │  │                 │  │                 │     │   │
│  │ │ • Dashboard     │  │ • Button        │  │ • Stack Nav     │     │   │
│  │ │ • Transactions  │  │ • Input         │  │ • Tab Nav       │     │   │
│  │ │ • Budgets       │  │ • Modal         │  │ • Drawer Nav    │     │   │
│  │ │ • Envelopes     │  │ • Charts        │  │ • Deep Linking  │     │   │
│  │ │ • Reports       │  │ • Lists         │  │                 │     │   │
│  │ │ • Settings      │  │ • Forms         │  │                 │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Business Logic Layer                         │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │ Custom Hooks    │  │  State Stores   │  │    Services     │     │   │
│  │ │                 │  │   (Zustand)     │  │                 │     │   │
│  │ │ • useAuth       │  │                 │  │ • Validation    │     │   │
│  │ │ • useBudgets    │  │ • Auth Store    │  │ • Formatting    │     │   │
│  │ │ • useEnvelopes  │  │ • Budget Store  │  │ • Calculations  │     │   │
│  │ │ • useTransact   │  │ • UI Store      │  │ • Offline Sync  │     │   │
│  │ │ • useReports    │  │ • Cache Store   │  │                 │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Data Layer                                  │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │  API Client     │  │ Local Storage   │  │   Cache Layer   │     │   │
│  │ │ (@nvlp/client)  │  │                 │  │                 │     │   │
│  │ │                 │  │ • AsyncStorage  │  │ • React Query   │     │   │
│  │ │ • HTTP Requests │  │ • Secure Store  │  │ • Cache Mgmt    │     │   │
│  │ │ • Auth Tokens   │  │ • Offline Data  │  │ • Optimistic   │     │   │
│  │ │ • Error Handle  │  │ • User Prefs    │  │   Updates       │     │   │
│  │ │ • Auto Retry    │  │                 │  │                 │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                  │                                          │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Platform Layer                                  │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │   iOS Native    │  │ Android Native  │  │ Cross-Platform  │     │   │
│  │ │                 │  │                 │  │                 │     │   │
│  │ │ • iOS APIs      │  │ • Android APIs  │  │ • React Native  │     │   │
│  │ │ • Native Mods   │  │ • Native Mods   │  │   Bridge        │     │   │
│  │ │ • Push Notifs   │  │ • Push Notifs   │  │ • JS Engine     │     │   │
│  │ │ • Biometrics    │  │ • Biometrics    │  │ • Metro Bundle  │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### State Management Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Zustand State Architecture                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Auth Store    │  │  Budget Store   │  │   UI Store      │ │
│  │                 │  │                 │  │                 │ │
│  │ • User State    │  │ • Budgets       │  │ • Loading       │ │
│  │ • Session       │  │ • Categories    │  │ • Modals        │ │
│  │ • Tokens        │  │ • Envelopes     │  │ • Navigation    │ │
│  │ • Permissions   │  │ • Income        │  │ • Alerts        │ │
│  │                 │  │                 │  │                 │ │
│  │ Actions:        │  │ Actions:        │  │ Actions:        │ │
│  │ • login()       │  │ • fetch()       │  │ • setLoading()  │ │
│  │ • logout()      │  │ • create()      │  │ • showModal()   │ │
│  │ • refresh()     │  │ • update()      │  │ • hideModal()   │ │
│  └─────────────────┘  │ • delete()      │  └─────────────────┘ │
│                       └─────────────────┘                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Transaction     │  │  Report Store   │  │  Cache Store    │ │
│  │ Store           │  │                 │  │                 │ │
│  │                 │  │ • Analytics     │  │ • Offline Data  │ │
│  │ • Transactions  │  │ • Charts Data   │  │ • Sync Queue    │ │
│  │ • Payees        │  │ • Export Data   │  │ • Timestamps    │ │
│  │ • Filters       │  │ • Date Ranges   │  │ • Invalidation  │ │
│  │ • Sorting       │  │                 │  │                 │ │
│  │                 │  │ Actions:        │  │ Actions:        │ │
│  │ Actions:        │  │ • generate()    │  │ • cache()       │ │
│  │ • fetch()       │  │ • filter()      │  │ • sync()        │ │
│  │ • create()      │  │ • export()      │  │ • clear()       │ │
│  │ • update()      │  │                 │  │ • offline()     │ │
│  │ • delete()      │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Store Persistence                     │   │
│  │                                                         │   │
│  │ • AsyncStorage for non-sensitive data                  │   │
│  │ • SecureStore for sensitive data (tokens, etc.)       │   │
│  │ • Automatic rehydration on app launch                 │   │
│  │ • Selective persistence by store slice                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Architecture

### Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Database Schema (PostgreSQL)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                    ┌─────────────────┐                │
│  │     users       │                    │   user_states   │                │
│  │                 │                    │                 │                │
│  │ • id (uuid)     │ ──────────────────▶│ • user_id (fk)  │                │
│  │ • email         │                    │ • available_amt │                │
│  │ • email_conf    │                    │ • created_at    │                │
│  │ • created_at    │                    │ • updated_at    │                │
│  └─────────────────┘                    └─────────────────┘                │
│           │                                                                 │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐                    ┌─────────────────┐                │
│  │    budgets      │                    │ income_sources  │                │
│  │                 │                    │                 │                │
│  │ • id (uuid)     │ ──────────────────▶│ • budget_id(fk) │                │
│  │ • user_id (fk)  │                    │ • name          │                │
│  │ • name          │                    │ • amount        │                │
│  │ • description   │                    │ • frequency     │                │
│  │ • created_at    │                    │ • active        │                │
│  │ • is_active     │                    │ • created_at    │                │
│  └─────────────────┘                    └─────────────────┘                │
│           │                                                                 │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐                    ┌─────────────────┐                │
│  │   categories    │                    │    envelopes    │                │
│  │                 │                    │                 │                │
│  │ • id (uuid)     │                    │ • id (uuid)     │                │
│  │ • budget_id(fk) │ ──────────────────▶│ • category_id   │                │
│  │ • name          │                    │ • name          │                │
│  │ • color         │                    │ • target_amount │                │
│  │ • icon          │                    │ • current_bal   │                │
│  │ • created_at    │                    │ • created_at    │                │
│  └─────────────────┘                    └─────────────────┘                │
│                                                   │                         │
│                                                   │                         │
│  ┌─────────────────┐                             │                         │
│  │     payees      │                             │                         │
│  │                 │                             │                         │
│  │ • id (uuid)     │                             │                         │
│  │ • budget_id(fk) │                             │                         │
│  │ • name          │                             │                         │
│  │ • category      │                             │                         │
│  │ • created_at    │                             │                         │
│  └─────────────────┘                             │                         │
│           │                                      │                         │
│           │                  ┌─────────────────────────────────┐           │
│           │                  │                                 │           │
│           │                  ▼                                 ▼           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        transactions                              │   │
│  │                                                                  │   │
│  │ • id (uuid)                                                     │   │
│  │ • user_id (fk)                                                  │   │
│  │ • budget_id (fk)                                                │   │
│  │ • type (enum: income, allocation, expense, transfer, debt)      │   │
│  │ • amount (decimal)                                              │   │
│  │ • description                                                   │   │
│  │ • date                                                          │   │
│  │ • from_envelope_id (fk, nullable)                              │   │
│  │ • to_envelope_id (fk, nullable)                                │   │
│  │ • payee_id (fk, nullable)                                      │   │
│  │ • tags (jsonb)                                                  │   │
│  │ • created_at                                                    │   │
│  │ • updated_at                                                    │   │
│  │ • is_deleted                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      audit_logs                                  │   │
│  │                                                                  │   │
│  │ • id (uuid)                                                     │   │
│  │ • entity_type                                                   │   │
│  │ • entity_id                                                     │   │
│  │ • action (insert, update, delete)                              │   │
│  │ • old_values (jsonb)                                           │   │
│  │ • new_values (jsonb)                                           │   │
│  │ • user_id (fk)                                                 │   │
│  │ • timestamp                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Money Flow Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NVLP Money Flow Model                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    Income      ┌─────────────────┐                   │
│  │   External      │   Transaction  │   Available     │                   │
│  │   Income        │ ──────────────▶│   Bucket        │                   │
│  │                 │                │                 │                   │
│  │ • Salary        │                │ • Unallocated   │                   │
│  │ • Freelance     │                │   Money         │                   │
│  │ • Gifts         │                │ • Waiting to be │                   │
│  │ • Refunds       │                │   Allocated     │                   │
│  └─────────────────┘                └─────────────────┘                   │
│                                               │                             │
│                                               │ Allocation                  │
│                                               │ Transaction                 │
│                                               ▼                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Envelopes                                 │   │
│  │                                                                  │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │   │
│  │ │   Groceries     │  │    Rent         │  │   Entertainment │ │   │
│  │ │   Envelope      │  │   Envelope      │  │    Envelope     │ │   │
│  │ │                 │  │                 │  │                 │ │   │
│  │ │ • Target: $500  │  │ • Target: $1200 │  │ • Target: $200  │ │   │
│  │ │ • Current: $350 │  │ • Current: $1200│  │ • Current: $150 │ │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘ │   │
│  │                                                                  │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │   │
│  │ │   Emergency     │  │   Vacation      │  │      Car        │ │   │
│  │ │   Envelope      │  │   Envelope      │  │   Envelope      │ │   │
│  │ │                 │  │                 │  │                 │ │   │
│  │ │ • Target: $1000 │  │ • Target: $300  │  │ • Target: $400  │ │   │
│  │ │ • Current: $750 │  │ • Current: $100 │  │ • Current: $320 │ │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                  │                                          │
│                                  │ Expense                                  │
│                                  │ Transaction                              │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          Payees                                  │   │
│  │                    (Money Leaves System)                        │   │
│  │                                                                  │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │   │
│  │ │    Walmart      │  │   Landlord      │  │    Netflix      │ │   │
│  │ │                 │  │                 │  │                 │ │   │
│  │ │ • Grocery Store │  │ • Rent Payments │  │ • Entertainment │ │   │
│  │ │ • Category:     │  │ • Category:     │  │ • Category:     │ │   │
│  │ │   Groceries     │  │   Housing       │  │   Entertainment │ │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘ │   │
│  │                                                                  │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │   │
│  │ │   Auto Shop     │  │   Credit Card   │  │    Savings      │ │   │
│  │ │                 │  │   Company       │  │    Account      │ │   │
│  │ │ • Car Repairs   │  │ • Debt Payment  │  │ • Transfers     │ │   │
│  │ │ • Category:     │  │ • Category:     │  │ • Category:     │ │   │
│  │ │   Auto          │  │   Debt          │  │   Savings       │ │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Transaction Types                               │   │
│  │                                                                     │   │
│  │ • Income: External → Available Bucket                             │   │
│  │ • Allocation: Available Bucket → Envelope                         │   │
│  │ • Expense: Envelope → Payee (money leaves)                        │   │
│  │ • Transfer: Envelope → Envelope                                    │   │
│  │ • Debt Payment: Envelope → Debt Payee (money leaves)             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## API Architecture

### Edge Functions Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Supabase Edge Functions Architecture                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        API Gateway                                  │   │
│  │                     (Supabase Edge Runtime)                        │   │
│  │                                                                     │   │
│  │ • Request Routing                                                  │   │
│  │ • Authentication Middleware                                        │   │
│  │ • Rate Limiting                                                    │   │
│  │ • CORS Handling                                                    │   │
│  │ • Request/Response Logging                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Edge Functions                                  │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │   auth/         │  │   dashboard/    │  │ transactions/   │     │   │
│  │ │                 │  │                 │  │                 │     │   │
│  │ │ • /login        │  │ • /summary      │  │ • /create       │     │   │
│  │ │ • /register     │  │ • /analytics    │  │ • /update       │     │   │
│  │ │ • /refresh      │  │ • /budgets      │  │ • /delete       │     │   │
│  │ │ • /logout       │  │ • /recent       │  │ • /list         │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │  envelopes/     │  │   reports/      │  │    export/      │     │   │
│  │ │                 │  │                 │  │                 │     │   │
│  │ │ • /create       │  │ • /spending     │  │ • /csv          │     │   │
│  │ │ • /update       │  │ • /income       │  │ • /pdf          │     │   │
│  │ │ • /delete       │  │ • /trends       │  │ • /email        │     │   │
│  │ │ • /transfer     │  │ • /categories   │  │                 │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │ notifications/  │  │    audit/       │  │    health/      │     │   │
│  │ │                 │  │                 │  │                 │     │   │
│  │ │ • /send         │  │ • /log          │  │ • /check        │     │   │
│  │ │ • /schedule     │  │ • /query        │  │ • /status       │     │   │
│  │ │ • /preferences  │  │ • /report       │  │                 │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Shared Utilities                               │   │
│  │                       (_shared/)                                    │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │   auth-utils    │  │  db-helpers     │  │   validators    │     │   │
│  │ │                 │  │                 │  │                 │     │   │
│  │ │ • JWT Verify    │  │ • Query Build   │  │ • Input Valid   │     │   │
│  │ │ • User Context  │  │ • Transaction   │  │ • Schema Valid  │     │   │
│  │ │ • Permissions   │  │ • Error Handle  │  │ • Type Guards   │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │   formatters    │  │    cache        │  │     errors      │     │   │
│  │ │                 │  │                 │  │                 │     │   │
│  │ │ • Date Format   │  │ • Redis Client  │  │ • Error Classes │     │   │
│  │ │ • Currency      │  │ • Cache Keys    │  │ • Error Codes   │     │   │
│  │ │ • Sanitizers    │  │ • TTL Mgmt      │  │ • Log Format    │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Database Layer                                  │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │   PostgreSQL    │  │   Row Level     │  │   Triggers &    │     │   │
│  │ │   Database      │  │   Security      │  │   Functions     │     │   │
│  │ │                 │  │                 │  │                 │     │   │
│  │ │ • Tables        │  │ • User Policies │  │ • Auto Updates  │     │   │
│  │ │ • Views         │  │ • Data Isolation│  │ • Calculations  │     │   │
│  │ │ • Indexes       │  │ • Access Control│  │ • Audit Trails  │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request/Response Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 API Request/Response Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Mobile App                                                     │
│  ┌─────────────────┐                                           │
│  │ User Action     │                                           │
│  │ (e.g., Create   │                                           │
│  │  Transaction)   │                                           │
│  └─────────────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ @nvlp/client    │                                           │
│  │ API Client      │                                           │
│  │                 │                                           │
│  │ • Add Auth      │                                           │
│  │ • Serialize     │                                           │
│  │ • Retry Logic   │                                           │
│  └─────────────────┘                                           │
│           │                                                     │
│           ▼ HTTPS Request                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Supabase Edge Runtime                    │   │
│  │                                                         │   │
│  │ 1. ┌─────────────────┐                                │   │
│  │    │ Authentication  │ ← Verify JWT Token              │   │
│  │    │ Middleware      │   Extract User Context          │   │
│  │    └─────────────────┘                                │   │
│  │           │                                            │   │
│  │           ▼                                            │   │
│  │ 2. ┌─────────────────┐                                │   │
│  │    │ Route to        │ ← Match URL to Function         │   │
│  │    │ Edge Function   │   Load Function Code            │   │
│  │    └─────────────────┘                                │   │
│  │           │                                            │   │
│  │           ▼                                            │   │
│  │ 3. ┌─────────────────┐                                │   │
│  │    │ Execute         │ ← Run Business Logic            │   │
│  │    │ Function Logic  │   Validate Input                │   │
│  │    └─────────────────┘   Call Database                │   │
│  │           │                                            │   │
│  │           ▼                                            │   │
│  │ 4. ┌─────────────────┐                                │   │
│  │    │ Database        │ ← Execute SQL with RLS          │   │
│  │    │ Query/Update    │   Apply User Policies           │   │
│  │    └─────────────────┘   Return Results               │   │
│  │           │                                            │   │
│  │           ▼                                            │   │
│  │ 5. ┌─────────────────┐                                │   │
│  │    │ Format          │ ← Serialize Response            │   │
│  │    │ Response        │   Add Headers                   │   │
│  │    └─────────────────┘   Handle Errors                │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │                                                     │
│           ▼ HTTPS Response                                      │
│  ┌─────────────────┐                                           │
│  │ @nvlp/client    │                                           │
│  │ Response        │                                           │
│  │                 │                                           │
│  │ • Deserialize   │                                           │
│  │ • Error Handle  │                                           │
│  │ • Cache Update  │                                           │
│  └─────────────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Mobile App      │                                           │
│  │ State Update    │                                           │
│  │                 │                                           │
│  │ • Update Store  │                                           │
│  │ • Refresh UI    │                                           │
│  │ • Show Result   │                                           │
│  └─────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Development Architecture

### Hot Reload System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Development Hot Reload Architecture                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Package Watch System                           │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │   @nvlp/types   │  │  @nvlp/client   │  │  @nvlp/config   │     │   │
│  │ │                 │  │                 │  │                 │     │   │
│  │ │ File Watcher:   │  │ File Watcher:   │  │ File Watcher:   │     │   │
│  │ │ • tsup --watch  │  │ • tsup --watch  │  │ • Simple copy   │     │   │
│  │ │ • src/**/*.ts   │  │ • src/**/*.ts   │  │ • Config files  │     │   │
│  │ │                 │  │ • Depends on    │  │                 │     │   │
│  │ │ On Change:      │  │   @nvlp/types   │  │ On Change:      │     │   │
│  │ │ • Rebuild ESM   │  │                 │  │ • Copy configs  │     │   │
│  │ │ • Rebuild CJS   │  │ On Change:      │  │ • Notify apps   │     │   │
│  │ │ • Generate .d.ts│  │ • Wait for deps │  │                 │     │   │
│  │ │ • Notify apps   │  │ • Rebuild       │  │                 │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Application Watch System                         │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐                    ┌─────────────────┐         │   │
│  │ │  Mobile App     │                    │  API Functions  │         │   │
│  │ │  (Metro)        │                    │  (Supabase)     │         │   │
│  │ │                 │                    │                 │         │   │
│  │ │ Watch Folders:  │                    │ File Watcher:   │         │   │
│  │ │ • src/**/*      │                    │ • functions/**  │         │   │
│  │ │ • packages/*/   │                    │ • Deno runtime  │         │   │
│  │ │   src/**/*      │                    │                 │         │   │
│  │ │ • packages/*/   │                    │ On Change:      │         │   │
│  │ │   dist/**/*     │                    │ • Reload func   │         │   │
│  │ │                 │                    │ • Import map    │         │   │
│  │ │ On Change:      │                    │   update        │         │   │
│  │ │ • Fast Refresh  │                    │ • Hot swap      │         │   │
│  │ │ • Bundle reload │                    │                 │         │   │
│  │ │ • Cache update  │                    │                 │         │   │
│  │ └─────────────────┘                    └─────────────────┘         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Dependency Chain Propagation                    │   │
│  │                                                                     │   │
│  │  @nvlp/types changes                                               │   │
│  │  │                                                                 │   │
│  │  ├─▶ @nvlp/client rebuilds (waits for types)                      │   │
│  │  │                                                                 │   │
│  │  ├─▶ Mobile app refreshes (waits for packages)                    │   │
│  │  │                                                                 │   │
│  │  └─▶ API functions reload (import map updated)                    │   │
│  │                                                                     │   │
│  │  Time: ~100ms types → ~300ms client → ~500ms app refresh          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Build System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Turborepo Build Architecture                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       Build Pipeline                                │   │
│  │                                                                     │   │
│  │  Input: pnpm build                                                 │   │
│  │  │                                                                  │   │
│  │  ▼                                                                  │   │
│  │  Turborepo Analyzes Dependency Graph                              │   │
│  │  │                                                                  │   │
│  │  ▼                                                                  │   │
│  │  ┌─────────────────┐                                              │   │
│  │  │    Stage 1      │ ← No dependencies                            │   │
│  │  │                 │                                              │   │
│  │  │ @nvlp/config    │ ← Builds first (configs)                     │   │
│  │  │ @nvlp/types     │ ← Builds first (types)                       │   │
│  │  └─────────────────┘                                              │   │
│  │  │                                                                  │   │
│  │  ▼                                                                  │   │
│  │  ┌─────────────────┐                                              │   │
│  │  │    Stage 2      │ ← Depends on Stage 1                         │   │
│  │  │                 │                                              │   │
│  │  │ @nvlp/client    │ ← Depends on types                          │   │
│  │  └─────────────────┘                                              │   │
│  │  │                                                                  │   │
│  │  ▼                                                                  │   │
│  │  ┌─────────────────┐                                              │   │
│  │  │    Stage 3      │ ← Depends on Stages 1 & 2                   │   │
│  │  │                 │                                              │   │
│  │  │ Mobile App      │ ← Depends on client + types                  │   │
│  │  │ API Package     │ ← Depends on client + types                  │   │
│  │  └─────────────────┘                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Caching Strategy                               │   │
│  │                                                                     │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │   │
│  │  │ Local Cache     │  │ Remote Cache    │  │ Docker Cache    │   │   │
│  │  │                 │  │ (Optional)      │  │ (CI/CD)         │   │   │
│  │  │ • .turbo/       │  │ • Vercel Remote │  │ • Layer Cache   │   │   │
│  │  │ • node_modules/ │  │ • S3 Bucket     │  │ • Multi-stage   │   │   │
│  │  │ • dist/ outputs │  │ • Team Sharing  │  │ • Base Images   │   │   │
│  │  │                 │  │                 │  │                 │   │   │
│  │  │ Cache Keys:     │  │ Cache Keys:     │  │ Cache Keys:     │   │   │
│  │  │ • File hashes   │  │ • Git hashes    │  │ • File hashes   │   │   │
│  │  │ • Input deps    │  │ • Dependencies  │  │ • Layer content │   │   │
│  │  │ • Config files  │  │ • Env variables │  │                 │   │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Production Optimizations                        │   │
│  │                                                                     │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │   │
│  │  │ TypeScript      │  │ Bundle          │  │ Platform        │   │   │
│  │  │ Optimizations   │  │ Optimizations   │  │ Optimizations   │   │   │
│  │  │                 │  │                 │  │                 │   │   │
│  │  │ • Strict mode   │  │ • Tree shaking  │  │ • iOS signing   │   │   │
│  │  │ • Type checking │  │ • Code split    │  │ • Android R8    │   │   │
│  │  │ • Declaration   │  │ • Minification  │  │ • Hermes JS     │   │   │
│  │  │   generation    │  │ • Dead code     │  │ • ProGuard      │   │   │
│  │  │                 │  │   elimination   │  │                 │   │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Production Infrastructure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Production Deployment Architecture                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Client Applications                           │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │   iOS Devices   │  │ Android Devices │  │  Web Browsers   │     │   │
│  │ │                 │  │                 │  │   (Future)      │     │   │
│  │ │ • App Store     │  │ • Google Play   │  │ • Progressive   │     │   │
│  │ │   Distribution  │  │   Store         │  │   Web App       │     │   │
│  │ │ • Auto Updates  │  │ • Staged        │  │ • Service       │     │   │
│  │ │ • A/B Testing   │  │   Rollout       │  │   Workers       │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        CDN & Edge Network                           │   │
│  │                         (Supabase Edge)                            │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │   Americas      │  │    Europe       │  │  Asia Pacific   │     │   │
│  │ │                 │  │                 │  │                 │     │   │
│  │ │ • US West       │  │ • London        │  │ • Singapore     │     │   │
│  │ │ • US East       │  │ • Frankfurt     │  │ • Tokyo         │     │   │
│  │ │ • Toronto       │  │ • Stockholm     │  │ • Sydney        │     │   │
│  │ │                 │  │                 │  │                 │     │   │
│  │ │ Features:       │  │ Features:       │  │ Features:       │     │   │
│  │ │ • Edge Caching  │  │ • GDPR Compliant│  │ • Low Latency   │     │   │
│  │ │ • Load Balancing│  │ • Data Residency│  │ • Regional Data │     │   │
│  │ │ • DDoS Protection│  │                 │  │                 │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Core Backend Services                           │   │
│  │                        (Supabase Cloud)                            │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │ Authentication  │  │  Edge Functions │  │   Database      │     │   │
│  │ │ Service         │  │                 │  │                 │     │   │
│  │ │                 │  │ • Auto-scaling  │  │ • PostgreSQL    │     │   │
│  │ │ • JWT           │  │ • Multi-region  │  │ • Read Replicas │     │   │
│  │ │ • OAuth         │  │ • Cold start    │  │ • Backups       │     │   │
│  │ │ • MFA           │  │   optimization  │  │ • Point-in-time │     │   │
│  │ │ • Session Mgmt  │  │ • Monitoring    │  │   Recovery      │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │   Storage       │  │    Realtime     │  │   Analytics     │     │   │
│  │ │                 │  │                 │  │                 │     │   │
│  │ │ • File Uploads  │  │ • WebSockets    │  │ • Usage Stats   │     │   │
│  │ │ • Image Resize  │  │ • Subscriptions │  │ • Performance   │     │   │
│  │ │ • CDN           │  │ • Presence      │  │ • Error Logs    │     │   │
│  │ │ • Security      │  │ • Broadcasting  │  │ • Dashboards    │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Supporting Infrastructure                      │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │  CI/CD Pipeline │  │   Monitoring    │  │   Security      │     │   │
│  │ │ (GitHub Actions)│  │                 │  │                 │     │   │
│  │ │                 │  │ • Uptime        │  │ • SSL/TLS       │     │   │
│  │ │ • Automated     │  │ • Performance   │  │ • WAF           │     │   │
│  │ │   Testing       │  │ • Error Rate    │  │ • Rate Limiting │     │   │
│  │ │ • Build Cache   │  │ • Alerts        │  │ • Audit Logs    │     │   │
│  │ │ • Multi-env     │  │ • Dashboards    │  │ • Compliance    │     │   │
│  │ │   Deployment    │  │                 │  │                 │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │    Backup &     │  │   Disaster      │  │    Support      │     │   │
│  │ │   Recovery      │  │   Recovery      │  │                 │     │   │
│  │ │                 │  │                 │  │ • Error         │     │   │
│  │ │ • Daily Backups │  │ • Multi-region  │  │   Tracking      │     │   │
│  │ │ • Point-in-time │  │ • Failover      │  │ • User Support  │     │   │
│  │ │ • Data Export   │  │ • Health Checks │  │ • Documentation │     │   │
│  │ │ • Retention     │  │ • Recovery Time │  │ • Status Page   │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Security Architecture

### Security Model Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Security Architecture                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Authentication & Authorization                  │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │  User Identity  │  │  JWT Tokens     │  │  Session Mgmt   │     │   │
│  │ │                 │  │                 │  │                 │     │   │
│  │ │ • Email + Pass  │  │ • Access Token  │  │ • Refresh Token │     │   │
│  │ │ • OAuth         │  │ • Short Lived   │  │ • Long Lived    │     │   │
│  │ │ • MFA Support   │  │ • Stateless     │  │ • Rotation      │     │   │
│  │ │ • Biometrics    │  │ • Claims Based  │  │ • Revocation    │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Data Protection                               │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │ Row Level       │  │  Data           │  │  Encryption     │     │   │
│  │ │ Security (RLS)  │  │  Validation     │  │                 │     │   │
│  │ │                 │  │                 │  │ • TLS 1.3       │     │   │
│  │ │ • User Isolation│  │ • Input Valid   │  │ • At Rest       │     │   │
│  │ │ • Policy Based  │  │ • SQL Injection │  │ • In Transit    │     │   │
│  │ │ • Automatic     │  │   Prevention    │  │ • Key Rotation  │     │   │
│  │ │ • Audit Trail   │  │ • XSS Protection│  │                 │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Network & API Security                         │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │    HTTPS        │  │  Rate Limiting  │  │   CORS Policy   │     │   │
│  │ │                 │  │                 │  │                 │     │   │
│  │ │ • TLS Required  │  │ • API Endpoints │  │ • Origin Control│     │   │
│  │ │ • Certificate   │  │ • User Based    │  │ • Method Allow  │     │   │
│  │ │   Validation    │  │ • IP Based      │  │ • Header Allow  │     │   │
│  │ │ • HSTS Headers  │  │ • Throttling    │  │ • Credentials   │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │   API Security  │  │  DDoS           │  │   WAF           │     │   │
│  │ │                 │  │  Protection     │  │                 │     │   │
│  │ │ • Auth Required │  │                 │  │ • Attack        │     │   │
│  │ │ • Input Valid   │  │ • Traffic       │  │   Detection     │     │   │
│  │ │ • Output        │  │   Analysis      │  │ • Bot Protection│     │   │
│  │ │   Sanitization  │  │ • Auto Block    │  │ • Geo Blocking  │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Compliance & Monitoring                        │   │
│  │                                                                     │   │
│  │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │ │  Audit Logging  │  │  Privacy        │  │  Incident       │     │   │
│  │ │                 │  │  Compliance     │  │  Response       │     │   │
│  │ │ • All Actions   │  │                 │  │                 │     │   │
│  │ │ • User Context  │  │ • GDPR Ready    │  │ • Alert System │     │   │
│  │ │ • Timestamps    │  │ • Data Deletion │  │ • Escalation    │     │   │
│  │ │ • Immutable     │  │ • Consent Mgmt  │  │ • Recovery      │     │   │
│  │ └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

This architecture documentation provides comprehensive visual representations of the NVLP system from multiple perspectives. Each diagram can be used for:

- **Development**: Understanding code organization and dependencies
- **Deployment**: Planning infrastructure and deployment strategies  
- **Security**: Implementing proper security measures
- **Maintenance**: Troubleshooting and system evolution
- **Documentation**: Onboarding new team members

For detailed implementation specifics, refer to the component-specific documentation in each package and application directory.