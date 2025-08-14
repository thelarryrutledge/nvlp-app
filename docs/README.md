# NVLP Documentation

This directory contains comprehensive documentation for the NVLP (Virtual Envelope Budgeting) system.

## Core Documentation

### 🏗️ Architecture & System Design
- **[CONSOLIDATED_ARCHITECTURE.md](./CONSOLIDATED_ARCHITECTURE.md)** - Complete system architecture, database design, transaction system, security implementation, and operational guides
- **[PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md)** - Caching strategies, connection pooling, N+1 query optimization, and performance metrics

### 👨‍💻 Developer Integration
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete development setup guide and design system reference
- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Comprehensive API integration guide covering PostgREST endpoints, Edge Functions, authentication, and client libraries
- **[EDGE_FUNCTIONS_GUIDE.md](./EDGE_FUNCTIONS_GUIDE.md)** - Detailed guide for Supabase Edge Functions usage and development
- **[openapi.yaml](./openapi.yaml)** - OpenAPI specification for the NVLP API

### 🔒 Security & Validation  
- **[RLS_SECURITY_AUDIT.md](./RLS_SECURITY_AUDIT.md)** - Row Level Security implementation and security audit results
- **[RATE_LIMITING.md](./RATE_LIMITING.md)** - API rate limiting implementation and configuration
- **[REQUEST_VALIDATION.md](./REQUEST_VALIDATION.md)** - Input validation rules and error handling

### 💰 Business Logic & Flows
- **[TRANSACTION_FLOWS.md](./TRANSACTION_FLOWS.md)** - Money flow model and transaction type definitions
- **[TRANSACTION_VALIDATION_RULES.md](./TRANSACTION_VALIDATION_RULES.md)** - Business rules and validation logic for transactions

### 🛠️ Operations & Maintenance
- **[DATABASE_CLEANUP.md](./DATABASE_CLEANUP.md)** - Database maintenance, cleanup procedures, and automated tasks

### 📈 Future Planning
- **[POST_MVP_MONETIZATION.md](./POST_MVP_MONETIZATION.md)** - Post-MVP feature planning and monetization strategy

---

## Quick Reference

### For New Developers
1. Start with [SETUP_GUIDE.md](./SETUP_GUIDE.md) for development environment and design system
2. Review [CONSOLIDATED_ARCHITECTURE.md](./CONSOLIDATED_ARCHITECTURE.md) for system overview
3. Follow [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for API integration
4. Review [TRANSACTION_FLOWS.md](./TRANSACTION_FLOWS.md) for business logic understanding

### For System Operations
1. Reference [PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md) for optimization strategies
2. Use [DATABASE_CLEANUP.md](./DATABASE_CLEANUP.md) for maintenance procedures
3. Check [RLS_SECURITY_AUDIT.md](./RLS_SECURITY_AUDIT.md) for security compliance

### For Frontend Development
1. Use [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for API endpoints and usage
2. Reference [REQUEST_VALIDATION.md](./REQUEST_VALIDATION.md) for input validation
3. Check [RATE_LIMITING.md](./RATE_LIMITING.md) for API limits and error handling

---

## Document Status

✅ **Active** - Core documentation that is actively maintained and referenced  
📚 **Reference** - Detailed technical documentation for specific topics  
🔧 **Operational** - Documentation for system operations and maintenance

All documentation is current as of the API foundation completion phase.