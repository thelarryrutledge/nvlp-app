# NVLP - Personal Finance Management System

A comprehensive personal finance management system built with Supabase, featuring budget tracking, envelope budgeting, transaction management, and reporting.

## Architecture

- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **API Layer**: Dual transport architecture (PostgREST + Edge Functions)
- **Client Libraries**: TypeScript and Go implementations
- **CLI**: Go-based command-line interface
- **Custom Domains**: 
  - `edge-api.nvlp.app` (Edge Functions)
  - `db-api.nvlp.app` (PostgREST)

## Features

- = **Authentication**: Secure user registration and login
- =� **Budget Management**: Create and manage multiple budgets
- =� **Categories & Envelopes**: Organize expenses with envelope budgeting
- =� **Transaction Tracking**: Record income, expenses, and transfers
- =� **Dashboard & Reports**: Comprehensive financial insights
- =� **Data Export**: Export data in multiple formats
- = **Audit Trail**: Track all financial activities
- = **Notifications**: Stay informed about budget status

## Client Libraries

### Go Client Library

The Go client library provides a comprehensive interface for the NVLP APIs.

**Quick Start:**
```go
config := &client.NVLPClientConfig{
    SupabaseURL:     "https://your-project.supabase.co",
    SupabaseAnonKey: "your-anon-key",
    APIBaseURL:      "https://edge-api.nvlp.app",
    DBApiURL:        "https://db-api.nvlp.app",
    PersistTokens:   true,
    AutoRefresh:     true,
}

nvlpClient := client.NewNVLPClient(config)
loginResponse, err := nvlpClient.Login("user@example.com", "password")
```

**Documentation:**
- [Complete Go Client Documentation](docs/go-client-library.md)
- [Package Documentation](internal/client/README.md)
- [Examples](examples/go-client/)

### TypeScript Client Library

The TypeScript client library supports both Node.js and browser environments.

**Documentation:**
- Located in `src/client/` directory
- Supports both PostgREST and Edge Function transports

## API Endpoints

### Authentication (Edge Functions)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh tokens

### Core Operations (PostgREST)
- **User Profiles**: `/user_profiles`
- **Budgets**: `/budgets`
- **Categories**: `/categories`
- **Envelopes**: `/envelopes`
- **Payees**: `/payees`
- **Income Sources**: `/income_sources`

### Business Logic (Edge Functions)
- **Transactions**: `/transactions`
- **Dashboard**: `/dashboard`
- **Reports**: `/reports`
- **Export**: `/export`
- **Audit**: `/audit`
- **Notifications**: `/notifications`

## Development Setup

### Prerequisites
- Supabase project
- Node.js 18+
- Go 1.21+
- Supabase CLI

### Environment Configuration
```bash
# Copy example environment file
cp .env.example .env.local

# Configure your Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Custom domains (production)
NVLP_EDGE_API_URL=https://edge-api.nvlp.app
NVLP_DB_API_URL=https://db-api.nvlp.app
```

### Testing
```bash
# Test custom domains
./scripts/test-custom-domains.sh

# Test Go client library
go run test_go_client_comprehensive.go

# Test individual components
go run examples/go-client/basic-usage.go
```

## Project Structure

```
   supabase/
      functions/          # Edge Functions
      migrations/         # Database schema
   src/
      client/            # TypeScript client library
   internal/
      client/            # Go client library
      types/             # Shared type definitions
      auth/              # Authentication management
   docs/                  # Documentation
   examples/              # Usage examples
   scripts/               # Development scripts
   tests/                 # Test files
```

## CLI Development

The Go CLI is currently in development as part of Phase 4:

-  **Task 11**: Go Client Library (Completed)
- = **Task 12**: CLI Foundation (In Progress)
- � **Task 13**: Basic CLI Commands
- � **Task 14**: Business Logic CLI Commands

## Contributing

1. Follow the development process outlined in `todo.md`
2. Test each component thoroughly before moving on
3. Use the provided testing scripts
4. Document all changes

## Documentation

- [Complete Development Todo](todo.md)
- [Go Client Library Guide](docs/go-client-library.md)
- [API Documentation](docs/)
- [Examples](examples/)

## Architecture Decisions

### Dual Transport Architecture
- **PostgREST**: Direct database access for CRUD operations
- **Edge Functions**: Complex business logic, authentication, calculations

### Custom Domain Routing
- **edge-api.nvlp.app**: Edge Functions (auth, transactions, dashboard)
- **db-api.nvlp.app**: PostgREST (budgets, categories, envelopes, etc.)

This separation allows for:
- Optimized routing and performance
- Clear separation of concerns
- Easier scaling and maintenance
- Better caching strategies

## License

[Add your license here]