// ============================================
// Form Validation Utilities
// ============================================

export type ValidationRule<T = unknown> = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: T, formValues?: Record<string, unknown>) => boolean | string;
  message?: string;
};

export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>;
};

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

type AnyObject = Record<string, unknown>;

// Helper to get nested value
function getValue(obj: AnyObject, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

// Helper to format field name
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

// Get error message for a rule
function getMessage(field: string, rule: keyof ValidationRule, value: unknown, customMessage?: string): string {
  if (customMessage) return customMessage;

  const fieldName = formatFieldName(field);

  switch (rule) {
    case 'required':
      return `${fieldName}不能为空`;
    case 'minLength':
      return `${fieldName}至少需要${value}个字符`;
    case 'maxLength':
      return `${fieldName}不能超过${value}个字符`;
    case 'min':
      return `${fieldName}不能小于${value}`;
    case 'max':
      return `${fieldName}不能大于${value}`;
    case 'pattern':
      return `${fieldName}格式不正确`;
    default:
      return `${fieldName}无效`;
  }
}

// Validate a single field
export function validateField<T extends object, K extends keyof T>(
  field: K,
  value: T[K],
  rules: ValidationRules<T>,
  formValues?: Record<string, unknown>
): ValidationError | null {
  const fieldRules = rules[field];
  if (!fieldRules) return null;

  const stringValue = String(value ?? '');
  const numValue = Number(value);

  // Required check
  if (fieldRules.required) {
    if (value === undefined || value === null || value === '' ||
        (Array.isArray(value) && value.length === 0)) {
      return {
        field: field as string,
        message: getMessage(field as string, 'required', null, fieldRules.message),
      };
    }
  }

  // Skip other checks if empty and not required
  if (value === undefined || value === null || value === '') {
    return null;
  }

  // String length checks
  if (typeof value === 'string') {
    if (fieldRules.minLength !== undefined && stringValue.length < fieldRules.minLength) {
      return {
        field: field as string,
        message: getMessage(field as string, 'minLength', fieldRules.minLength, fieldRules.message),
      };
    }
    if (fieldRules.maxLength !== undefined && stringValue.length > fieldRules.maxLength) {
      return {
        field: field as string,
        message: getMessage(field as string, 'maxLength', fieldRules.maxLength, fieldRules.message),
      };
    }
  }

  // Number checks
  if (typeof value === 'number' && !isNaN(numValue)) {
    if (fieldRules.min !== undefined && numValue < fieldRules.min) {
      return {
        field: field as string,
        message: getMessage(field as string, 'min', fieldRules.min, fieldRules.message),
      };
    }
    if (fieldRules.max !== undefined && numValue > fieldRules.max) {
      return {
        field: field as string,
        message: getMessage(field as string, 'max', fieldRules.max, fieldRules.message),
      };
    }
  }

  // Pattern check
  if (fieldRules.pattern && !fieldRules.pattern.test(stringValue)) {
    return {
      field: field as string,
      message: getMessage(field as string, 'pattern', null, fieldRules.message),
    };
  }

  // Custom validation
  if (fieldRules.custom) {
    const result = fieldRules.custom(value, formValues);
    if (result !== true) {
      return {
        field: field as string,
        message: typeof result === 'string' ? result : (fieldRules.message || '验证失败'),
      };
    }
  }

  return null;
}

// Validate entire form
export function validateForm<T extends object>(
  values: T,
  rules: ValidationRules<T>,
  fieldsToValidate?: (keyof T)[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const fields = fieldsToValidate || (Object.keys(rules) as (keyof T)[]);

  for (const field of fields) {
    const value = values[field];
    const error = validateField(field, value, rules, values as Record<string, unknown>);
    if (error) {
      errors.push(error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// Predefined Validation Rules
// ============================================

export const validators = {
  // Username: 3-20 chars, alphanumeric and underscore
  username: {
    pattern: /^[a-zA-Z0-9_]{3,20}$/,
    message: '用户名只能包含字母、数字和下划线，长度3-20个字符',
  },

  // Email
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: '请输入有效的邮箱地址',
  },

  // Password: min 8 chars, at least 1 letter and 1 number
  password: {
    minLength: 8,
    pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
    message: '密码至少8个字符，需包含字母和数字',
  },

  // Strong password: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
  strongPassword: {
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/,
    message: '密码至少8个字符，需包含大小写字母、数字和特殊字符',
  },

  // URL
  url: {
    pattern: /^https?:\/\/.+/,
    message: '请输入有效的URL地址',
  },

  // Phone number (China)
  phone: {
    pattern: /^1[3-9]\d{9}$/,
    message: '请输入有效的手机号码',
  },

  // Repository name: alphanumeric, dash, underscore, dot; max 100 chars
  repoName: {
    pattern: /^[a-zA-Z0-9._-]+$/,
    maxLength: 100,
    message: '仓库名称只能包含字母、数字、破折号、下划线和点',
  },

  // Chinese characters only
  chinese: {
    pattern: /^[\u4e00-\u9fa5]+$/,
    message: '只能输入中文字符',
  },

  // No special characters (except space)
  noSpecialChars: {
    pattern: /^[\w\s\u4e00-\u9fa5]+$/,
    message: '不能包含特殊字符',
  },
};

// ============================================
// useForm Hook Helper (for React forms)
// ============================================

export function createFormValidator<T extends Record<string, unknown>>(rules: ValidationRules<T>) {
  return {
    validate: (values: T, fieldsToValidate?: (keyof T)[]) => {
      return validateForm(values, rules, fieldsToValidate);
    },
    validateField: <K extends keyof T>(field: K, value: T[K]) => {
      return validateField(field, value, rules);
    },
  };
}

// ============================================
// Common form validation schemas
// ============================================

export const loginSchema = {
  email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '请输入有效的邮箱地址' },
  password: { required: true, minLength: 6, message: '密码至少6个字符' },
} as const;

export const registerSchema = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: '用户名3-20个字符，只能包含字母、数字和下划线',
  },
  email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '请输入有效的邮箱地址' },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
    message: '密码至少8个字符，需包含字母和数字',
  },
  confirmPassword: {
    required: true,
    custom: (value: string, formValues: Record<string, unknown>) => {
      if (value !== (formValues.password as string)) return '两次输入的密码不一致';
      return true;
    },
  },
} as const;

export const profileSchema = {
  name: { maxLength: 50, message: '姓名不能超过50个字符' },
  bio: { maxLength: 200, message: '个人简介不能超过200个字符' },
  website: { pattern: /^https?:\/\/.+/, message: '请输入有效的网站地址' },
} as const;

export const repoSchema = {
  name: {
    required: true,
    pattern: /^[a-zA-Z0-9._-\u4e00-\u9fa5]+$/,
    maxLength: 100,
    message: '仓库名称只能包含字母、数字、中文、破折号、下划线和点',
  },
  description: { maxLength: 500, message: '描述不能超过500个字符' },
} as const;

export default {
  validateField,
  validateForm,
  validators,
  createFormValidator,
  loginSchema,
  registerSchema,
  profileSchema,
  repoSchema,
};
