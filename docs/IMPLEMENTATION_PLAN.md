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

## Phase 6: Frontend Development (Week 11-12)

### 6.1 React Native Mobile App
- Project structure and architecture
- Navigation and routing
- State management (Redux/Context)
- Authentication integration

### 6.2 Web Frontend (React)
- Responsive design and layout
- Component library integration
- Progressive Web App features
- Offline support

### 6.3 Frontend User Experience
- Intuitive budgeting interface
- Real-time balance updates
- Mobile-first design
- Accessibility features

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

## ARCHITECTURAL PIVOT: Direct PostgREST + Abstract Layer

### Decision Rationale
Due to Edge Function cold start performance issues, we've pivoted from wrapping all operations in Edge Functions to a hybrid approach:

**NEW ARCHITECTURE:**
- **Direct PostgREST calls** for simple CRUD operations (fast, no cold start)
- **Edge Functions** only for complex business logic requiring custom validation
- **Abstract Client Library** providing consistent interface regardless of transport
- **Flexible Implementation** allowing UIs to choose optimal transport per operation

### API Transport Options

#### 1. Direct PostgREST (Recommended for CRUD)
```typescript
// Direct PostgREST - No cold start, immediate response
const response = await fetch(`${SUPABASE_URL}/rest/v1/budgets`, {
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  }
})
```

#### 2. Edge Functions (For Complex Logic)
```typescript
// Edge Functions - Use for complex validation, business logic
const response = await fetch(`${API_URL}/complex-transaction`, {
  headers: { 'Authorization': `Bearer ${jwt}` }
})
```

#### 3. Abstract Client Library (Recommended Interface)
```typescript
// Consistent interface, configurable transport
const client = new NVLPClient({
  transport: 'postgrest', // or 'edge-functions'
  supabaseUrl: SUPABASE_URL,
  apiKey: SUPABASE_ANON_KEY,
  token: jwt
})

const budgets = await client.budgets.list() // Uses optimal transport
```

### Performance Benefits
- **🚀 Immediate Response**: PostgREST calls respond in <50ms vs 2-10s Edge Function cold starts
- **🔄 Retry Logic Simplified**: Only needed for Edge Functions, not PostgREST
- **📊 Predictable Performance**: Direct database queries eliminate serverless variability
- **⚡ Concurrent Operations**: Multiple PostgREST calls can run simultaneously without cold start penalty

### Implementation Strategy
1. **Phase 3A**: Convert existing Edge Functions to direct PostgREST documentation
2. **Phase 3B**: Create abstract client library with both transport options
3. **Phase 3C**: Update testing scripts to use direct PostgREST calls
4. **Phase 4+**: Use Edge Functions only for complex business logic (multi-step transactions, validation)

### Frontend Integration Patterns

#### API Client Implementation
- **Direct PostgREST**: Fast, reliable, no retry logic needed for simple operations
- **Edge Function Fallback**: For complex operations requiring custom business logic
- **Consistent Error Handling**: Abstract layer normalizes error responses from both transports
- **Authentication**: JWT + API key pattern for PostgREST, JWT-only for Edge Functions

#### User Experience Patterns
- **Optimistic Updates**: More reliable with fast PostgREST responses
  - ✅ Use for: Most CRUD operations (create, update, delete)
  - ❌ Avoid for: Complex financial transactions, multi-step operations
- **Loading States**: Simplified - minimal loading for PostgREST, longer for Edge Functions
- **Offline Support**: Cache frequently accessed data (user profile, budgets, recent transactions)

#### Performance Optimization
- **PostgREST First**: Use direct PostgREST for all simple CRUD operations
- **Edge Functions Last**: Only when PostgREST cannot handle the complexity
- **Request Batching**: PostgREST supports multiple operations in single request
- **Caching Strategy**: Cache user profile and budget list on authentication
- **Progressive Loading**: Load critical data first using PostgREST, then secondary data

### Frontend Authentication Flow
```
1. User logs in → Store JWT + profile data
2. Cache default budget ID from profile
3. Use cached data for immediate UI updates
4. Refresh tokens before expiration
5. Handle auth failures gracefully
```

## Risk Mitigation

### Technical Risks
- **Database Performance**: Implement proper indexing and query optimization
- **Data Consistency**: Use database transactions and validation
- **API Reliability**: Implement proper error handling and retries
- **Serverless Cold Starts**: Implement retry logic and user-friendly loading states
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
- Frontend provides intuitive user experience

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