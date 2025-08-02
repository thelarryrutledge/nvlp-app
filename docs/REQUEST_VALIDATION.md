# Request Validation & Security Implementation

## Overview

The NVLP API implements comprehensive request validation and security measures to protect against:
- SQL injection attacks
- XSS (Cross-Site Scripting) attacks
- Data type violations
- Business logic violations
- Malformed requests
- Security header attacks
- MIME type confusion

## Validation System

### Core Validation Functions

#### String Validation
```typescript
validateString(value, fieldName, {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowEmpty?: boolean;
})
```

**Features**:
- SQL injection detection and prevention
- XSS pattern removal
- HTML entity encoding
- Length validation
- Pattern matching
- Whitespace trimming

#### Email Validation
```typescript
validateEmail(email)
```

**Features**:
- RFC-compliant email format validation
- Length limits (max 255 characters)
- SQL injection detection
- XSS protection

#### UUID Validation
```typescript
validateUUID(value, fieldName, required)
```

**Features**:
- Standard UUID format validation
- Required/optional field handling
- Type checking

#### Currency Validation
```typescript
validateCurrency(value, fieldName, required)
```

**Features**:
- Decimal precision validation (max 2 decimal places)
- Range checking (-999,999,999.99 to 999,999,999.99)
- Overflow prevention
- Type coercion safety

#### Date Validation
```typescript
validateDate(value, fieldName, required)
```

**Features**:
- YYYY-MM-DD format validation
- Actual date verification
- Reasonable range checking (1900-2124)
- Invalid date detection

### Entity-Specific Validation

#### Transaction Validation
```typescript
validateTransactionRequest(data): ValidationResult
```

**Validates**:
- Transaction type (income, expense, transfer, allocation, debt_payment)
- Amount (positive currency)
- Date (valid date format)
- Type-specific field requirements:
  - **Income**: requires `income_source_id`
  - **Expense/Debt**: requires `from_envelope_id` + `payee_id`
  - **Transfer**: requires `from_envelope_id` + `to_envelope_id` (different)
  - **Allocation**: requires `to_envelope_id` only

**Security Features**:
- Prevents invalid field combinations
- Ensures business logic compliance
- Sanitizes description fields

#### Budget Validation
```typescript
validateBudgetRequest(data): ValidationResult
```

**Validates**:
- Name (1-100 characters, required)
- Description (0-255 characters, optional)
- XSS prevention in text fields

#### Envelope Validation
```typescript
validateEnvelopeRequest(data): ValidationResult
```

**Validates**:
- Name and description
- UUID references (budget_id, category_id)
- Currency amounts (target_amount, fill_amount)
- Fill type enumeration
- Target date format

### Security Features

#### SQL Injection Prevention
**Patterns Detected**:
```typescript
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(--|\/\*|\*\/|;|'|")/,
  /(\bOR\b|\bAND\b).*?=.*?=/i,
  /(\bUNION\b|\bSELECT\b).*?\bFROM\b/i,
];
```

#### XSS Prevention
**Patterns Removed**:
```typescript
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
];
```

**HTML Entity Encoding**:
```typescript
sanitized = sanitized
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#x27;')
  .replace(/\//g, '&#x2F;');
```

## Security Headers

### Default Security Headers
```http
Content-Security-Policy: default-src 'none'; script-src 'none'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=(), ...
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-XSS-Protection: 1; mode=block
X-Robots-Tag: noindex, nofollow
```

### Security Header Protections

#### Content Security Policy (CSP)
- **Purpose**: Prevents XSS attacks by controlling resource loading
- **API Setting**: Blocks all external resources for API endpoints
- **Effect**: Scripts, stylesheets, images, etc. cannot be loaded

#### X-Frame-Options
- **Purpose**: Prevents clickjacking attacks
- **Setting**: `DENY`
- **Effect**: API cannot be embedded in frames/iframes

#### X-Content-Type-Options
- **Purpose**: Prevents MIME type sniffing attacks
- **Setting**: `nosniff`
- **Effect**: Browsers must respect declared content types

#### Strict-Transport-Security (HSTS)
- **Purpose**: Enforces HTTPS connections
- **Setting**: 1 year with subdomain inclusion
- **Effect**: Browsers will only use HTTPS for future requests

### Request Header Validation
```typescript
validateRequestHeaders(req): string[]
```

**Checks For**:
- Dangerous headers (`x-forwarded-host`, `x-original-url`, etc.)
- Host header injection attempts
- Excessively long headers (DoS prevention)
- Malicious user agents (sqlmap, nmap, nikto, etc.)

## Implementation Examples

### Basic Endpoint with Validation
```typescript
import { 
  validateBudgetRequest, 
  createValidationErrorResponse 
} from '../_shared/validation.ts'
import { withSecurity } from '../_shared/security-headers.ts'
import { withRateLimit } from '../_shared/rate-limiter.ts'

const handler = async (req: Request) => {
  if (req.method === 'POST') {
    const body = await req.json();
    const result = validateBudgetRequest(body);
    
    if (!result.isValid) {
      return createValidationErrorResponse(result.errors, corsHeaders);
    }
    
    // Use result.sanitizedData for processing
    const budget = await createBudget(result.sanitizedData);
    
    return new Response(JSON.stringify(budget), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Apply all security middleware
serve(withSecurity(withRateLimit('api', handler)));
```

### Validation Middleware Pattern
```typescript
import { withValidation } from '../_shared/validation.ts'

const handler = withValidation(
  validateTransactionRequest,
  async (req: Request, validatedData: any) => {
    // validatedData is already validated and sanitized
    const transaction = await createTransaction(validatedData);
    return new Response(JSON.stringify(transaction));
  }
);
```

### Custom Validation
```typescript
function validateCustomRequest(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Custom field validation
  const customError = validateString(data.customField, 'customField', {
    required: true,
    minLength: 5,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/
  });
  
  if (customError) errors.push(customError);
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? {
      ...data,
      customField: sanitizeString(data.customField)
    } : undefined
  };
}
```

## Error Responses

### Validation Error Response
```json
{
  "error": "Validation failed",
  "message": "The request contains invalid data",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "INVALID_FORMAT"
    },
    {
      "field": "amount",
      "message": "Amount must be positive",
      "code": "INVALID_VALUE"
    }
  ]
}
```

### Security Violation Response
```json
{
  "error": "Security policy violation",
  "message": "Request violates security policies",
  "violations": [
    "Potentially dangerous header detected: x-forwarded-host",
    "Potential host header injection detected"
  ]
}
```

## Validation Error Codes

| Code | Description | Example |
|------|-------------|---------|
| `REQUIRED` | Field is required but missing | `email is required` |
| `INVALID_TYPE` | Wrong data type | `amount must be a number` |
| `INVALID_FORMAT` | Format doesn't match pattern | `invalid email format` |
| `TOO_SHORT` | Below minimum length | `name must be at least 3 characters` |
| `TOO_LONG` | Above maximum length | `description must be less than 255 characters` |
| `TOO_SMALL` | Below minimum value | `amount must be at least 0.01` |
| `TOO_LARGE` | Above maximum value | `amount must be at most 999,999,999.99` |
| `OUT_OF_RANGE` | Outside acceptable range | `date must be between 1900-01-01 and 2124-12-31` |
| `INVALID_VALUE` | Value not allowed | `transaction type must be one of: income, expense, transfer` |
| `INVALID_COMBINATION` | Invalid field combination | `income transactions cannot have payee_id` |
| `INVALID_CHARACTERS` | Contains dangerous characters | `field contains invalid characters` |
| `EMPTY` | Field is empty when not allowed | `name cannot be empty` |
| `INVALID_DATE` | Not a valid date | `transaction_date must be a valid date` |

## Best Practices

### For API Consumers

1. **Handle Validation Errors**:
   ```javascript
   if (response.status === 400) {
     const error = await response.json();
     if (error.details) {
       // Show field-specific errors
       error.details.forEach(detail => {
         showFieldError(detail.field, detail.message);
       });
     }
   }
   ```

2. **Client-Side Validation**:
   - Implement matching validation on client
   - Provide immediate feedback
   - Never rely on client-side validation alone

3. **Security Headers**:
   - Respect security headers in responses
   - Don't attempt to bypass security measures

### For Developers

1. **Always Validate**:
   ```typescript
   // ❌ Don't do this
   const amount = body.amount;
   
   // ✅ Do this
   const result = validateCurrency(body.amount, 'amount');
   if (result) return createValidationErrorResponse([result], corsHeaders);
   ```

2. **Use Sanitized Data**:
   ```typescript
   // ❌ Don't use raw input
   const budget = { name: body.name };
   
   // ✅ Use validated and sanitized data
   const result = validateBudgetRequest(body);
   const budget = { name: result.sanitizedData.name };
   ```

3. **Layer Security**:
   ```typescript
   // Apply multiple security layers
   serve(
     withSecurity(
       withRateLimit('api',
         withValidation(validateRequest, handler)
       )
     )
   );
   ```

## Testing Validation

### Unit Testing
```typescript
import { validateEmail } from '../_shared/validation.ts';

// Test valid email
const result1 = validateEmail('user@example.com');
assert(result1 === null); // No error

// Test invalid email
const result2 = validateEmail('invalid-email');
assert(result2?.code === 'INVALID_FORMAT');

// Test SQL injection attempt
const result3 = validateEmail("'; DROP TABLE users; --");
assert(result3?.code === 'INVALID_FORMAT');
```

### Integration Testing
```bash
# Test validation endpoint
curl -X POST https://api.nvlp.com/transactions \
  -H "Content-Type: application/json" \
  -d '{"transaction_type":"invalid","amount":-100}' \
  
# Should return 400 with validation errors
```

### Security Testing
```bash
# Test SQL injection
curl -X POST https://api.nvlp.com/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com; DROP TABLE users; --"}'

# Test XSS
curl -X POST https://api.nvlp.com/budgets \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>"}'

# Test malicious headers
curl -X GET https://api.nvlp.com/budgets \
  -H "X-Forwarded-Host: evil.com" \
  -H "User-Agent: sqlmap/1.0"
```

## Performance Considerations

1. **Validation Overhead**: Minimal (~1-2ms per request)
2. **Security Headers**: No performance impact
3. **Memory Usage**: In-memory patterns, negligible memory usage
4. **Caching**: Validation patterns are compiled once at startup

## Future Enhancements

1. **Schema Validation**: JSON Schema integration
2. **Custom Validators**: Plugin system for domain-specific validation
3. **Rate Limiting by Field**: Different limits for sensitive fields
4. **Audit Logging**: Log all validation failures for monitoring
5. **Machine Learning**: Detect anomalous input patterns