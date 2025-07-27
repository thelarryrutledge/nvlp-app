# NVLP - Virtual Envelope Budgeting System: Technical Architecture Document

## Executive Summary

NVLP is a modern digital implementation of the envelope budgeting method, providing users with granular control over their finances through virtual envelopes that represent spending categories. The system implements a comprehensive money flow model with full audit trails, soft deletion capabilities, and real-time balance tracking.

## Core Concepts & Domain Model

### 1. Money Flow Architecture

The system implements a **zero-sum money flow model** where every transaction represents money moving between defined states:

- **Available Pool** → Money not yet allocated to any purpose
- **Envelopes** → Virtual containers representing spending categories
- **External World** → Sources (income) and destinations (expenses) outside the system

### 2. Transaction Types & Flow Rules

#### Income Transactions
- **Flow**: `External Source → Available Pool`
- **Effect**: Increases total available money in the budget
- **Required**: `income_source_id`
- **Null Fields**: `from_envelope_id`, `to_envelope_id`, `payee_id`

#### Allocation Transactions  
- **Flow**: `Available Pool → Envelope`
- **Effect**: Moves money from available into a specific envelope
- **Required**: `to_envelope_id`
- **Null Fields**: `from_envelope_id`, `payee_id`, `income_source_id`

#### Expense Transactions
- **Flow**: `Envelope → External Payee`
- **Effect**: Removes money from envelope and system
- **Required**: `from_envelope_id`, `payee_id`
- **Null Fields**: `to_envelope_id`, `income_source_id`

#### Transfer Transactions
- **Flow**: `Envelope → Envelope`
- **Effect**: Moves money between envelopes (no net change to budget)
- **Required**: `from_envelope_id`, `to_envelope_id` (must be different)
- **Null Fields**: `payee_id`, `income_source_id`

#### Debt Payment Transactions
- **Flow**: `Envelope → External Payee`
- **Effect**: Similar to expense but tracked separately for debt management
- **Required**: `from_envelope_id`, `payee_id`
- **Null Fields**: `to_envelope_id`, `income_source_id`

### 3. Data Entities & Relationships

#### User Profiles
- **Purpose**: Store user authentication and profile information
- **Key Fields**: `id`, `email`, `display_name`, `avatar_url`
- **Security**: Row-level security based on `auth.uid()`

#### Budgets
- **Purpose**: Top-level containers that scope all financial data
- **Key Fields**: `id`, `user_id`, `name`, `available_amount`
- **Multi-tenancy**: Users can have multiple budgets
- **Available Amount**: Calculated field representing unallocated money

#### Envelopes
- **Purpose**: Virtual spending categories with balance tracking
- **Key Fields**: `id`, `budget_id`, `name`, `current_balance`, `target_amount`
- **Types**: Regular, Debt, Savings
- **Balance Calculation**: Automatically updated via database triggers

#### Income Sources
- **Purpose**: Define sources of money entering the system
- **Key Fields**: `id`, `budget_id`, `name`, `expected_amount`, `frequency_days`
- **Features**: Expected income tracking, notification support

#### Payees
- **Purpose**: External entities that receive money (expenses/debt payments)
- **Key Fields**: `id`, `budget_id`, `name`, `total_paid`, `last_payment_date`
- **Tracking**: Automatic total calculation, payment history

#### Categories
- **Purpose**: Optional classification system for transactions
- **Key Fields**: `id`, `budget_id`, `name`, `category_type`
- **Types**: Income, Expense, Transfer, Debt Payment

#### Transactions
- **Purpose**: Core entity representing all money movements
- **Key Fields**: 
  - Identity: `id`, `budget_id`, `transaction_type`
  - Flow: `from_envelope_id`, `to_envelope_id`, `payee_id`, `income_source_id`
  - Details: `amount`, `description`, `transaction_date`
  - Status: `is_cleared`, `is_reconciled`
  - Audit: `is_deleted`, `deleted_at`, `deleted_by`

#### Transaction Events (Audit Trail)
- **Purpose**: Immutable log of all transaction changes
- **Key Fields**: `id`, `transaction_id`, `event_type`, `old_data`, `new_data`
- **Events**: CREATE, UPDATE, DELETE, RESTORE

## Technical Architecture

### 1. Database Design Principles

#### Multi-Tenant Architecture
- All entities scoped to `budget_id` (except user profiles)
- Row-Level Security (RLS) enforces data isolation
- Users can access multiple budgets, budgets belong to single users

#### Data Integrity Constraints
- **Flow Validation**: CHECK constraints enforce transaction type rules
- **Balance Constraints**: Non-negative balances where appropriate
- **Referential Integrity**: Proper foreign key relationships
- **Soft Delete Support**: Maintains referential integrity while allowing "deletion"

#### Real-Time Balance Calculation
- Database triggers automatically update envelope balances
- Available budget amount calculated as: `total_income - total_allocated`
- Payee totals maintained automatically

### 2. Security Model

#### Authentication
- Supabase Auth integration
- JWT-based session management
- Row-level security policies

#### Authorization Patterns
```sql
-- Budget Access Pattern
budget_id IN (
    SELECT id FROM public.budgets WHERE user_id = auth.uid()
)

-- Soft Delete Visibility Pattern  
(is_deleted = false OR deleted_by = auth.uid())
```

#### Data Protection
- All sensitive operations require authentication
- Users can only access their own budget data
- Soft deletes maintain audit trails while hiding data

### 3. API Architecture

#### Service Layer Pattern
- Dedicated service classes for each domain entity
- Consistent error handling and transformation
- Centralized token management
- Retry logic and offline support

#### Transaction Service Example
```typescript
class TransactionService {
  async getTransaction(id: string): Promise<TransactionWithDetails>
  async updateTransaction(id: string, updates: TransactionUpdateRequest): Promise<void>
  async softDeleteTransaction(id: string, userId: string): Promise<void>
  async restoreTransaction(id: string): Promise<void>
}
```

#### Error Handling Strategy
- Consistent error transformation across services
- Proper error logging and monitoring
- User-friendly error messages
- Graceful degradation for offline scenarios

## Business Logic & Rules

### 1. Balance Management

#### Envelope Balance Rules
- Envelopes can go negative when spending exceeds balance
- Transfers must have sufficient source envelope balance
- All envelope types allow negative balances

#### Available Amount Calculation
```
Available Amount = Total Income - Total Allocated - Total Unallocated Expenses
```

#### Budget Validation
- Total envelope balances + available amount = total income
- All money must be accounted for in the system

### 2. Transaction Lifecycle

#### Creation Workflow
1. Validate transaction type and required fields
2. Check balance constraints (if applicable)
3. Create transaction record
4. Update related envelope balances
5. Update payee/income source totals
6. Log transaction event

#### Update Workflow  
1. Validate changes don't violate constraints
2. Calculate balance adjustments needed
3. Update transaction record
4. Adjust envelope balances (reverse old, apply new)
5. Update related entity totals
6. Log transaction event

#### Soft Delete Workflow
1. Mark transaction as deleted
2. Reverse all balance effects
3. Update related entity totals
4. Maintain referential integrity
5. Log deletion event
6. Hide from normal queries

### 3. Notification System

#### Envelope Notifications
- Low balance warnings based on target amounts
- Overspending alerts for negative balances
- Monthly/weekly spending summaries

#### Income Notifications  
- Expected income reminders based on frequency
- Overdue income notifications
- Income vs. budget variance alerts

## User Experience Considerations

### 1. Mobile-First Design
- React Native implementation for iOS/Android
- Pure React Native, DO NOT use Expo
- Offline-capable with sync when connected
- Touch-friendly interface with gesture support

### 2. Quick Entry Workflows
- Rapid transaction entry with smart defaults
- Recent payees/envelopes for quick selection
- Calculator integration for complex amounts

### 3. Visual Feedback
- Real-time balance updates
- Progress indicators for envelope targets
- Spending trend visualization
- Category-based color coding

### 4. Data Management
- Bulk import/export capabilities
- Transaction search and filtering
- Soft delete with restoration options
- Comprehensive audit trails

## Performance & Scalability

### 1. Database Optimization
- Strategic indexing on query patterns
- Materialized views for complex calculations
- Efficient pagination for large datasets
- Query optimization for mobile constraints

### 2. Caching Strategy
- Client-side caching for offline operation
- Smart cache invalidation
- Background sync capabilities
- Optimistic updates with rollback

### 3. API Efficiency
- Batched operations where possible
- Selective field loading
- Connection pooling
- Rate limiting and throttling

## Development & Deployment

### 1. Technology Stack
- **Frontend**: React Native, TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **State Management**: React Context + Custom Stores
- **Testing**: Jest, React Native Testing Library

### 2. Development Workflow
- TypeScript for type safety
- ESLint/Prettier for code quality
- Automated testing pipeline
- Hot reload for rapid development

### 3. Deployment Strategy
- Supabase managed infrastructure
- Environment-based configuration
- Database migration management
- Monitoring and alerting

## Success Metrics

### 1. User Engagement
- Daily/monthly active users
- Transaction entry frequency
- Feature adoption rates
- Session duration and depth

### 2. System Performance
- API response times
- Error rates and types
- Database query performance
- Mobile app crash rates

### 3. Business Value
- User retention rates
- Budget goal achievement
- Financial behavior improvements
- User satisfaction scores

---

This document provides the foundation for building a robust, scalable envelope budgeting system with proper data integrity, security, and user experience considerations. The architecture supports both current requirements and future enhancements while maintaining clean separation of concerns and consistent patterns throughout the system.