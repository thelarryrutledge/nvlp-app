/**
 * Request Validation Library for NVLP API
 * 
 * Provides comprehensive input validation and sanitization to prevent:
 * - SQL injection attacks
 * - XSS attacks
 * - Data type violations
 * - Business logic violations
 * - Malformed requests
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData?: any;
}

// Common validation patterns
const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  alphanumeric: /^[a-zA-Z0-9\s]+$/,
  currency: /^\d+(\.\d{1,2})?$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  transactionType: /^(income|expense|transfer|allocation|payoff)$/,
  scheduleType: /^(weekly|biweekly|monthly|semi_monthly|quarterly|yearly|one_time)$/,
  fillType: /^(manual|percentage|fixed_amount)$/,
};

// SQL injection prevention patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(--|\/\*|\*\/|;|'|")/,
  /(\bOR\b|\bAND\b).*?=.*?=/i,
  /(\bUNION\b|\bSELECT\b).*?\bFROM\b/i,
];

// XSS prevention patterns
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
];

/**
 * Sanitize string input to prevent XSS and SQL injection
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  let sanitized = input;
  
  // Remove XSS patterns
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Encode HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Check for SQL injection attempts
 */
export function detectSQLInjection(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Validate email format
 */
export function validateEmail(email: any): ValidationError | null {
  if (!email) {
    return { field: 'email', message: 'Email is required', code: 'REQUIRED' };
  }
  
  if (typeof email !== 'string') {
    return { field: 'email', message: 'Email must be a string', code: 'INVALID_TYPE' };
  }
  
  if (email.length > 255) {
    return { field: 'email', message: 'Email must be less than 255 characters', code: 'TOO_LONG' };
  }
  
  if (detectSQLInjection(email)) {
    return { field: 'email', message: 'Invalid email format', code: 'INVALID_FORMAT' };
  }
  
  if (!PATTERNS.email.test(email)) {
    return { field: 'email', message: 'Invalid email format', code: 'INVALID_FORMAT' };
  }
  
  return null;
}

/**
 * Validate UUID format
 */
export function validateUUID(value: any, fieldName: string, required: boolean = true): ValidationError | null {
  if (!value) {
    return required 
      ? { field: fieldName, message: `${fieldName} is required`, code: 'REQUIRED' }
      : null;
  }
  
  if (typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string`, code: 'INVALID_TYPE' };
  }
  
  if (!PATTERNS.uuid.test(value)) {
    return { field: fieldName, message: `${fieldName} must be a valid UUID`, code: 'INVALID_FORMAT' };
  }
  
  return null;
}

/**
 * Validate string field
 */
export function validateString(
  value: any, 
  fieldName: string, 
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowEmpty?: boolean;
  } = {}
): ValidationError | null {
  const { required = false, minLength, maxLength, pattern, allowEmpty = false } = options;
  
  if (!value) {
    return required 
      ? { field: fieldName, message: `${fieldName} is required`, code: 'REQUIRED' }
      : null;
  }
  
  if (typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string`, code: 'INVALID_TYPE' };
  }
  
  if (!allowEmpty && value.trim().length === 0) {
    return { field: fieldName, message: `${fieldName} cannot be empty`, code: 'EMPTY' };
  }
  
  if (detectSQLInjection(value)) {
    return { field: fieldName, message: `${fieldName} contains invalid characters`, code: 'INVALID_CHARACTERS' };
  }
  
  if (minLength && value.length < minLength) {
    return { 
      field: fieldName, 
      message: `${fieldName} must be at least ${minLength} characters`, 
      code: 'TOO_SHORT' 
    };
  }
  
  if (maxLength && value.length > maxLength) {
    return { 
      field: fieldName, 
      message: `${fieldName} must be less than ${maxLength} characters`, 
      code: 'TOO_LONG' 
    };
  }
  
  if (pattern && !pattern.test(value)) {
    return { 
      field: fieldName, 
      message: `${fieldName} has invalid format`, 
      code: 'INVALID_FORMAT' 
    };
  }
  
  return null;
}

/**
 * Validate numeric field
 */
export function validateNumber(
  value: any, 
  fieldName: string, 
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
    positive?: boolean;
  } = {}
): ValidationError | null {
  const { required = false, min, max, integer = false, positive = false } = options;
  
  if (value === null || value === undefined) {
    return required 
      ? { field: fieldName, message: `${fieldName} is required`, code: 'REQUIRED' }
      : null;
  }
  
  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    return { field: fieldName, message: `${fieldName} must be a number`, code: 'INVALID_TYPE' };
  }
  
  if (integer && !Number.isInteger(numValue)) {
    return { field: fieldName, message: `${fieldName} must be an integer`, code: 'INVALID_FORMAT' };
  }
  
  if (positive && numValue <= 0) {
    return { field: fieldName, message: `${fieldName} must be positive`, code: 'INVALID_VALUE' };
  }
  
  if (min !== undefined && numValue < min) {
    return { 
      field: fieldName, 
      message: `${fieldName} must be at least ${min}`, 
      code: 'TOO_SMALL' 
    };
  }
  
  if (max !== undefined && numValue > max) {
    return { 
      field: fieldName, 
      message: `${fieldName} must be at most ${max}`, 
      code: 'TOO_LARGE' 
    };
  }
  
  return null;
}

/**
 * Validate currency amount
 */
export function validateCurrency(value: any, fieldName: string, required: boolean = true): ValidationError | null {
  if (!value && value !== 0) {
    return required 
      ? { field: fieldName, message: `${fieldName} is required`, code: 'REQUIRED' }
      : null;
  }
  
  // Convert to string for pattern matching
  const strValue = String(value);
  
  if (!PATTERNS.currency.test(strValue)) {
    return { 
      field: fieldName, 
      message: `${fieldName} must be a valid currency amount (max 2 decimal places)`, 
      code: 'INVALID_FORMAT' 
    };
  }
  
  const numValue = Number(value);
  
  if (isNaN(numValue)) {
    return { field: fieldName, message: `${fieldName} must be a number`, code: 'INVALID_TYPE' };
  }
  
  // Check for reasonable currency limits (prevent overflow)
  if (numValue < -999999999.99 || numValue > 999999999.99) {
    return { 
      field: fieldName, 
      message: `${fieldName} must be between -999,999,999.99 and 999,999,999.99`, 
      code: 'OUT_OF_RANGE' 
    };
  }
  
  return null;
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function validateDate(value: any, fieldName: string, required: boolean = true): ValidationError | null {
  if (!value) {
    return required 
      ? { field: fieldName, message: `${fieldName} is required`, code: 'REQUIRED' }
      : null;
  }
  
  if (typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string`, code: 'INVALID_TYPE' };
  }
  
  if (!PATTERNS.date.test(value)) {
    return { 
      field: fieldName, 
      message: `${fieldName} must be in YYYY-MM-DD format`, 
      code: 'INVALID_FORMAT' 
    };
  }
  
  // Validate actual date
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { 
      field: fieldName, 
      message: `${fieldName} must be a valid date`, 
      code: 'INVALID_DATE' 
    };
  }
  
  // Check for reasonable date range (not too far in past/future)
  const now = new Date();
  const minDate = new Date(1900, 0, 1);
  const maxDate = new Date(now.getFullYear() + 100, 11, 31);
  
  if (date < minDate || date > maxDate) {
    return { 
      field: fieldName, 
      message: `${fieldName} must be between 1900-01-01 and ${maxDate.getFullYear()}-12-31`, 
      code: 'OUT_OF_RANGE' 
    };
  }
  
  return null;
}

/**
 * Validate transaction type
 */
export function validateTransactionType(value: any): ValidationError | null {
  if (!value) {
    return { field: 'transaction_type', message: 'Transaction type is required', code: 'REQUIRED' };
  }
  
  if (typeof value !== 'string') {
    return { field: 'transaction_type', message: 'Transaction type must be a string', code: 'INVALID_TYPE' };
  }
  
  if (!PATTERNS.transactionType.test(value)) {
    return { 
      field: 'transaction_type', 
      message: 'Transaction type must be one of: income, expense, transfer, allocation, payoff', 
      code: 'INVALID_VALUE' 
    };
  }
  
  return null;
}

/**
 * Validate transaction request based on type
 */
export function validateTransactionRequest(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate required fields
  const typeError = validateTransactionType(data.transaction_type);
  if (typeError) {
    errors.push(typeError);
    return { isValid: false, errors }; // Can't validate further without valid type
  }
  
  const amountError = validateCurrency(data.amount, 'amount');
  if (amountError) errors.push(amountError);
  
  const descriptionError = validateString(data.description, 'description', { 
    required: false, 
    maxLength: 255 
  });
  if (descriptionError) errors.push(descriptionError);
  
  const dateError = validateDate(data.transaction_date, 'transaction_date');
  if (dateError) errors.push(dateError);
  
  // Validate type-specific fields
  const type = data.transaction_type;
  
  switch (type) {
    case 'income':
      const incomeSourceError = validateUUID(data.income_source_id, 'income_source_id');
      if (incomeSourceError) errors.push(incomeSourceError);
      
      // Income transactions should not have envelope or payee fields
      if (data.from_envelope_id || data.to_envelope_id || data.payee_id) {
        errors.push({
          field: 'transaction_type',
          message: 'Income transactions cannot have envelope or payee fields',
          code: 'INVALID_COMBINATION'
        });
      }
      break;
      
    case 'expense':
    case 'payoff':
      const fromEnvelopeError = validateUUID(data.from_envelope_id, 'from_envelope_id');
      if (fromEnvelopeError) errors.push(fromEnvelopeError);
      
      const payeeError = validateUUID(data.payee_id, 'payee_id');
      if (payeeError) errors.push(payeeError);
      
      // Expense/payoff transactions should not have income source or to_envelope
      if (data.income_source_id || data.to_envelope_id) {
        errors.push({
          field: 'transaction_type',
          message: `${type} transactions cannot have income_source_id or to_envelope_id`,
          code: 'INVALID_COMBINATION'
        });
      }
      break;
      
    case 'transfer':
      const fromError = validateUUID(data.from_envelope_id, 'from_envelope_id');
      if (fromError) errors.push(fromError);
      
      const toError = validateUUID(data.to_envelope_id, 'to_envelope_id');
      if (toError) errors.push(toError);
      
      // Check that from and to are different
      if (data.from_envelope_id === data.to_envelope_id) {
        errors.push({
          field: 'to_envelope_id',
          message: 'Transfer must be between different envelopes',
          code: 'INVALID_VALUE'
        });
      }
      
      // Transfer transactions should not have income source or payee
      if (data.income_source_id || data.payee_id) {
        errors.push({
          field: 'transaction_type',
          message: 'Transfer transactions cannot have income_source_id or payee_id',
          code: 'INVALID_COMBINATION'
        });
      }
      break;
      
    case 'allocation':
      const allocToError = validateUUID(data.to_envelope_id, 'to_envelope_id');
      if (allocToError) errors.push(allocToError);
      
      // Allocation transactions should not have other fields
      if (data.from_envelope_id || data.income_source_id || data.payee_id) {
        errors.push({
          field: 'transaction_type',
          message: 'Allocation transactions can only have to_envelope_id',
          code: 'INVALID_COMBINATION'
        });
      }
      break;
  }
  
  // Sanitize string fields
  const sanitizedData = {
    ...data,
    description: data.description ? sanitizeString(data.description) : data.description,
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined,
  };
}

/**
 * Validate budget request
 */
export function validateBudgetRequest(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  
  const nameError = validateString(data.name, 'name', { 
    required: true, 
    minLength: 1, 
    maxLength: 100 
  });
  if (nameError) errors.push(nameError);
  
  const descriptionError = validateString(data.description, 'description', { 
    required: false, 
    maxLength: 255 
  });
  if (descriptionError) errors.push(descriptionError);
  
  // Sanitize string fields
  const sanitizedData = {
    ...data,
    name: data.name ? sanitizeString(data.name) : data.name,
    description: data.description ? sanitizeString(data.description) : data.description,
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined,
  };
}

/**
 * Validate envelope request
 */
export function validateEnvelopeRequest(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  
  const nameError = validateString(data.name, 'name', { 
    required: true, 
    minLength: 1, 
    maxLength: 100 
  });
  if (nameError) errors.push(nameError);
  
  const descriptionError = validateString(data.description, 'description', { 
    required: false, 
    maxLength: 255 
  });
  if (descriptionError) errors.push(descriptionError);
  
  if (data.budget_id) {
    const budgetError = validateUUID(data.budget_id, 'budget_id');
    if (budgetError) errors.push(budgetError);
  }
  
  if (data.target_amount !== undefined && data.target_amount !== null) {
    const targetError = validateCurrency(data.target_amount, 'target_amount', false);
    if (targetError) errors.push(targetError);
  }
  
  if (data.target_date) {
    const dateError = validateDate(data.target_date, 'target_date', false);
    if (dateError) errors.push(dateError);
  }
  
  if (data.fill_type) {
    const fillTypeError = validateString(data.fill_type, 'fill_type', { 
      pattern: PATTERNS.fillType 
    });
    if (fillTypeError) {
      errors.push({
        field: 'fill_type',
        message: 'Fill type must be one of: manual, percentage, fixed_amount',
        code: 'INVALID_VALUE'
      });
    }
  }
  
  if (data.fill_amount !== undefined && data.fill_amount !== null) {
    const fillAmountError = validateCurrency(data.fill_amount, 'fill_amount', false);
    if (fillAmountError) errors.push(fillAmountError);
  }
  
  // Sanitize string fields
  const sanitizedData = {
    ...data,
    name: data.name ? sanitizeString(data.name) : data.name,
    description: data.description ? sanitizeString(data.description) : data.description,
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined,
  };
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(
  errors: ValidationError[], 
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      message: 'The request contains invalid data',
      details: errors,
    }),
    {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Middleware to validate request body
 */
export function withValidation<T>(
  validator: (data: any) => ValidationResult,
  handler: (req: Request, validatedData: T) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      const body = await req.json();
      const result = validator(body);
      
      if (!result.isValid) {
        const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
        return createValidationErrorResponse(result.errors, corsHeaders);
      }
      
      return handler(req, result.sanitizedData as T);
    } catch (error) {
      const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  };
}

/**
 * Validate schedule type
 */
export function validateScheduleType(value: any): ValidationError | null {
  if (!value) {
    return null; // Schedule type is optional
  }
  
  if (typeof value !== 'string') {
    return { field: 'schedule_type', message: 'Schedule type must be a string', code: 'INVALID_TYPE' };
  }
  
  if (!PATTERNS.scheduleType.test(value)) {
    return { 
      field: 'schedule_type', 
      message: 'Schedule type must be one of: weekly, biweekly, monthly, semi_monthly, quarterly, yearly, one_time', 
      code: 'INVALID_VALUE' 
    };
  }
  
  return null;
}

/**
 * Validate schedule configuration based on schedule type
 */
export function validateScheduleConfig(scheduleType: string, config: any): ValidationError | null {
  if (!scheduleType) {
    return null; // If no schedule type, config should be null
  }
  
  if (!config) {
    return { 
      field: 'schedule_config', 
      message: 'Schedule config is required when schedule_type is provided', 
      code: 'REQUIRED' 
    };
  }
  
  if (typeof config !== 'object' || Array.isArray(config)) {
    return { 
      field: 'schedule_config', 
      message: 'Schedule config must be an object', 
      code: 'INVALID_TYPE' 
    };
  }
  
  switch (scheduleType) {
    case 'weekly':
      if (typeof config.day_of_week !== 'number' || config.day_of_week < 0 || config.day_of_week > 6) {
        return {
          field: 'schedule_config.day_of_week',
          message: 'Weekly schedule requires day_of_week (0-6, where 0=Sunday)',
          code: 'INVALID_VALUE'
        };
      }
      break;
      
    case 'biweekly':
      if (typeof config.day_of_week !== 'number' || config.day_of_week < 0 || config.day_of_week > 6) {
        return {
          field: 'schedule_config.day_of_week',
          message: 'Biweekly schedule requires day_of_week (0-6, where 0=Sunday)',
          code: 'INVALID_VALUE'
        };
      }
      if (!config.start_date) {
        return {
          field: 'schedule_config.start_date',
          message: 'Biweekly schedule requires start_date',
          code: 'REQUIRED'
        };
      }
      const startDateError = validateDate(config.start_date, 'schedule_config.start_date');
      if (startDateError) return startDateError;
      break;
      
    case 'monthly':
      if (typeof config.day_of_month !== 'number' || 
          (config.day_of_month < 1 || config.day_of_month > 31) && config.day_of_month !== -1) {
        return {
          field: 'schedule_config.day_of_month',
          message: 'Monthly schedule requires day_of_month (1-31 or -1 for last day)',
          code: 'INVALID_VALUE'
        };
      }
      break;
      
    case 'semi_monthly':
      if (!Array.isArray(config.pay_dates) || config.pay_dates.length !== 2) {
        return {
          field: 'schedule_config.pay_dates',
          message: 'Semi-monthly schedule requires pay_dates array with exactly 2 elements',
          code: 'INVALID_VALUE'
        };
      }
      for (const date of config.pay_dates) {
        if (typeof date !== 'number' || 
            (date < 1 || date > 31) && date !== -1) {
          return {
            field: 'schedule_config.pay_dates',
            message: 'Pay dates must be numbers between 1-31 or -1 for last day',
            code: 'INVALID_VALUE'
          };
        }
      }
      break;
      
    case 'quarterly':
      if (typeof config.month_of_quarter !== 'number' || 
          config.month_of_quarter < 1 || config.month_of_quarter > 3) {
        return {
          field: 'schedule_config.month_of_quarter',
          message: 'Quarterly schedule requires month_of_quarter (1-3)',
          code: 'INVALID_VALUE'
        };
      }
      if (typeof config.day_of_month !== 'number' || 
          (config.day_of_month < 1 || config.day_of_month > 31) && config.day_of_month !== -1) {
        return {
          field: 'schedule_config.day_of_month',
          message: 'Quarterly schedule requires day_of_month (1-31 or -1 for last day)',
          code: 'INVALID_VALUE'
        };
      }
      break;
      
    case 'yearly':
      if (typeof config.month !== 'number' || config.month < 1 || config.month > 12) {
        return {
          field: 'schedule_config.month',
          message: 'Yearly schedule requires month (1-12)',
          code: 'INVALID_VALUE'
        };
      }
      if (typeof config.day_of_month !== 'number' || 
          (config.day_of_month < 1 || config.day_of_month > 31) && config.day_of_month !== -1) {
        return {
          field: 'schedule_config.day_of_month',
          message: 'Yearly schedule requires day_of_month (1-31 or -1 for last day)',
          code: 'INVALID_VALUE'
        };
      }
      break;
      
    case 'one_time':
      if (!config.date) {
        return {
          field: 'schedule_config.date',
          message: 'One-time schedule requires date',
          code: 'REQUIRED'
        };
      }
      const dateError = validateDate(config.date, 'schedule_config.date');
      if (dateError) return dateError;
      break;
      
    default:
      return {
        field: 'schedule_type',
        message: 'Invalid schedule type',
        code: 'INVALID_VALUE'
      };
  }
  
  return null;
}

/**
 * Validate income source request
 */
export function validateIncomeSourceRequest(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  
  const nameError = validateString(data.name, 'name', { 
    required: true, 
    minLength: 1, 
    maxLength: 100 
  });
  if (nameError) errors.push(nameError);
  
  const descriptionError = validateString(data.description, 'description', { 
    required: false, 
    maxLength: 255 
  });
  if (descriptionError) errors.push(descriptionError);
  
  if (data.expected_amount !== undefined && data.expected_amount !== null) {
    const amountError = validateCurrency(data.expected_amount, 'expected_amount', false);
    if (amountError) errors.push(amountError);
  }
  
  if (data.schedule_type) {
    const scheduleTypeError = validateScheduleType(data.schedule_type);
    if (scheduleTypeError) errors.push(scheduleTypeError);
    
    const scheduleConfigError = validateScheduleConfig(data.schedule_type, data.schedule_config);
    if (scheduleConfigError) errors.push(scheduleConfigError);
  }
  
  if (data.next_expected_date) {
    const dateError = validateDate(data.next_expected_date, 'next_expected_date', false);
    if (dateError) errors.push(dateError);
  }
  
  // Sanitize string fields
  const sanitizedData = {
    ...data,
    name: data.name ? sanitizeString(data.name) : data.name,
    description: data.description ? sanitizeString(data.description) : data.description,
  };
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined,
  };
}