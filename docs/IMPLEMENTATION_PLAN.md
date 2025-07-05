# NVLP Backend Implementation Plan

## Project Overview
This document outlines the detailed implementation plan for the NVLP (Virtual Envelope Budget App) backend and REST API. The implementation follows an API-first approach using Supabase as the backend service.

## Architecture Summary
- **Backend**: Supabase (PostgreSQL database, authentication, Edge Functions)
- **API**: REST API via Supabase Edge Functions
- **Authentication**: Supabase Auth with JWT tokens
- **Security**: Row Level Security (RLS) policies
- **Data**: Manual transaction-based envelope budgeting system

## Phase 1: Foundation Setup (Week 1-2)

### 1.1 Supabase Project Setup
- Create new Supabase project
- Configure project settings and environment
- Set up development and production environments
- Install and configure Supabase CLI
- Initialize local development environment

### 1.2 Database Schema Implementation
- Create all core tables with proper relationships
- Implement UUID primary keys and foreign key constraints
- Set up proper indexing for performance
- Add database triggers for automatic timestamp updates
- Create enums for transaction types and frequencies

### 1.3 Row Level Security (RLS) Setup
- Enable RLS on all user-facing tables
- Create policies for user data isolation
- Test RLS policies with multiple users
- Document security model and policies

## Phase 2: Core API Development (Week 3-4)

### 2.1 Authentication & User Management
- Configure Supabase Auth settings
- Implement user registration and login flows
- Set up JWT token validation
- Create user profile management endpoints

### 2.2 Basic CRUD Operations
- Income Sources API endpoints
- Categories API endpoints
- Envelopes API endpoints
- Payees API endpoints
- Basic validation and error handling

### 2.3 API Foundation
- Implement consistent error response format
- Add request/response logging
- Set up API versioning structure
- Create API documentation framework

## Phase 3: Transaction System (Week 5-6)

### 3.1 Transaction Core Logic
- Implement transaction creation with type validation
- Build transaction business logic rules
- Create balance calculation functions
- Add transaction amount validation

### 3.2 Transaction Types Implementation - MONEY FLOW MODEL
**Core Money Flow**: Income → Available Bucket → Envelopes → Payees (money leaves system)

**Transaction Type Envelope Handling**:
- **Income transactions**: from_envelope = NULL, to_envelope = NULL (increases user_state.available_amount)
- **Allocation transactions**: from_envelope = NULL (from available bucket), to_envelope = target (decreases available, increases envelope)
- **Expense transactions**: from_envelope = source, to_envelope = NULL, payee_id = target (decreases envelope, money leaves to payee)
- **Transfer transactions**: from_envelope = source, to_envelope = target (envelope to envelope movement)
- **Debt payment transactions**: from_envelope = source, to_envelope = NULL, payee_id = debt_payee (decreases envelope, money leaves to payee)

**Key Principle**: Payees are destinations where money leaves the system entirely. Available bucket (user_state.available_amount) is the central pool for unallocated money.

### 3.3 State Management
- User state tracking (available_amount)
- Envelope balance calculations
- Transaction effect processing
- Data consistency validation

## Phase 4: Advanced Features (Week 7-8)

### 4.1 Audit Logging System
- Transaction events table implementation
- Audit trail for all transaction modifications
- Edit history with required reasons
- Soft delete implementation across all entities

### 4.2 Data Integrity & Validation
- Transaction validation rules
- Balance consistency checks
- Envelope negative balance handling
- Transfer amount validation

### 4.3 Reporting & Dashboard
- Dashboard summary endpoint
- Transaction history with filtering
- Spending analysis by category and time period
- Data export functionality (CSV/JSON)

## Phase 5: Testing & Validation (Week 9-10)

### 5.1 Unit Testing
- Database function testing
- API endpoint testing
- Business logic validation
- Edge case handling

### 5.2 Integration Testing
- End-to-end transaction flows
- Multi-user data isolation testing
- Performance testing with realistic data
- Security testing and penetration testing

### 5.3 API Documentation
- Complete OpenAPI specification
- Endpoint documentation with examples
- Error code documentation
- Authentication guide

## Phase 6: CLI Development (Week 11-12)

### 6.1 CLI Foundation
- Project structure and architecture
- API client library
- Configuration management
- Authentication handling

### 6.2 Core CLI Commands
- Income management commands
- Envelope management commands
- Transaction commands (spend, allocate, transfer)
- Balance and status commands

### 6.3 CLI User Experience
- Interactive prompts for missing data
- Auto-completion and suggestions
- Colored output and formatting
- Error handling and user feedback

## Implementation Details

### Database Schema Priority Order
1. User authentication (handled by Supabase Auth)
2. Core entity tables (income_sources, categories, payees)
3. Envelopes table with relationships
4. Transactions table with complex business logic
5. Transaction events (audit log)
6. User state table
7. **Multi-Budget Support**: Budgets table and foreign key additions

### API Endpoint Priority Order
1. Authentication endpoints
2. **Budget management endpoints** (create, list, switch, default)
3. Basic CRUD for entities (income sources, categories, payees)
4. Envelope management endpoints
5. Transaction creation endpoints
6. Dashboard and reporting endpoints
7. Administrative endpoints (audit, export)

### Business Logic Implementation Order
1. **Budget selection and context management**
2. Simple transaction types (income, expense)
3. Balance calculation engine
4. Complex transaction types (allocate, transfer)
5. Debt payment handling
6. Audit logging and edit tracking
7. Soft delete and recovery

## Risk Mitigation

### Technical Risks
- **Database Performance**: Implement proper indexing and query optimization
- **Data Consistency**: Use database transactions and validation
- **API Reliability**: Implement proper error handling and retries
- **Security**: Thorough RLS testing and security audits

### Development Risks
- **Scope Creep**: Strict adherence to MVP feature set
- **Timeline Delays**: Weekly progress reviews and adjustment
- **Quality Issues**: Continuous testing throughout development
- **Documentation**: Parallel documentation with development

## Success Criteria

### Technical Metrics
- All API endpoints respond within 200ms (95th percentile)
- 100% RLS policy coverage with proper testing
- Zero data loss scenarios in testing
- Complete audit trail for all operations

### Functional Metrics
- All transaction types work correctly
- Balance calculations are accurate to the penny
- Multi-user isolation is verified
- CLI provides intuitive user experience

## Deployment Strategy

### Development Environment
- Local Supabase instance for development
- Automated testing on each commit
- Code review process for all changes

### Production Deployment
- Supabase production project setup
- Environment variable management
- Database migration strategy
- Monitoring and alerting setup

## Post-Implementation
- Performance monitoring and optimization
- User feedback collection and analysis
- Bug fixing and stability improvements
- Preparation for mobile/web UI phases

This implementation plan provides a structured approach to building the NVLP backend with clear milestones, deliverables, and success criteria for each phase.