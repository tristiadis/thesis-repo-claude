/**
 * Validation Utilities
 * Joi schemas and validation functions for data validation
 */

const Joi = require('joi');

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Thesis Submission Schema
 */
const thesisSchema = Joi.object({
  title: Joi.string().required().min(10).max(500).messages({
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 10 characters',
    'string.max': 'Title must not exceed 500 characters',
  }),

  titleEn: Joi.string().optional().allow('', null).max(500).messages({
    'string.max': 'English title must not exceed 500 characters',
  }),

  abstractId: Joi.string().required().min(100).max(5000).messages({
    'string.empty': 'Indonesian abstract is required',
    'string.min': 'Abstract must be at least 100 characters',
    'string.max': 'Abstract must not exceed 5000 characters',
  }),

  abstractEn: Joi.string().optional().allow('', null).min(100).max(5000).messages({
    'string.min': 'English abstract must be at least 100 characters',
    'string.max': 'English abstract must not exceed 5000 characters',
  }),

  keywords: Joi.string().required().min(3).max(500).messages({
    'string.empty': 'Keywords are required',
    'string.min': 'Keywords must be at least 3 characters',
    'string.max': 'Keywords must not exceed 500 characters',
  }),

  departmentId: Joi.number().integer().positive().required().messages({
    'number.base': 'Department is required',
    'number.positive': 'Invalid department',
    'any.required': 'Department is required',
  }),

  graduationYear: Joi.number()
    .integer()
    .min(2000)
    .max(new Date().getFullYear() + 1)
    .required()
    .messages({
      'number.base': 'Graduation year must be a number',
      'number.min': 'Graduation year must be 2000 or later',
      'number.max': 'Graduation year cannot be in the future',
      'any.required': 'Graduation year is required',
    }),

  defenseDate: Joi.date().optional().allow('', null).messages({
    'date.base': 'Invalid defense date format',
  }),

  advisor1Id: Joi.number().integer().positive().required().messages({
    'number.base': 'Primary advisor is required',
    'any.required': 'Primary advisor is required',
  }),

  advisor2Id: Joi.number().integer().positive().optional().allow('', null),

  examiner1Id: Joi.number().integer().positive().required().messages({
    'number.base': 'First examiner is required',
    'any.required': 'First examiner is required',
  }),

  examiner2Id: Joi.number().integer().positive().required().messages({
    'number.base': 'Second examiner is required',
    'any.required': 'Second examiner is required',
  }),

  examiner3Id: Joi.number().integer().positive().optional().allow('', null),
});

/**
 * User Registration Schema
 */
const registerSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.empty': 'Username is required',
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters',
      'string.max': 'Username must not exceed 30 characters',
    }),

  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Full name is required',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must not exceed 100 characters',
  }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
    }),

  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    }),

  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'string.empty': 'Please confirm your password',
  }),

  studentId: Joi.string()
    .pattern(/^\d+$/)
    .min(5)
    .max(20)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Student ID must contain only numbers',
      'string.min': 'Student ID must be at least 5 characters',
      'string.max': 'Student ID must not exceed 20 characters',
    }),
});

/**
 * Login Schema
 */
const loginSchema = Joi.object({
  username: Joi.string().required().messages({
    'string.empty': 'Username is required',
  }),

  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
  }),
});

/**
 * File Upload Schema
 */
const fileUploadSchema = Joi.object({
  accessLevel: Joi.string()
    .valid('PUBLIC', 'EMBARGOED', 'RESTRICTED')
    .default('PUBLIC')
    .messages({
      'any.only': 'Invalid access level',
    }),

  embargoUntil: Joi.date().optional().allow('', null).when('accessLevel', {
    is: 'EMBARGOED',
    then: Joi.date().required().greater('now').messages({
      'date.base': 'Embargo date must be a valid date',
      'date.greater': 'Embargo date must be in the future',
      'any.required': 'Embargo date is required for embargoed files',
    }),
  }),

  embargoReason: Joi.string().optional().allow('', null).max(500).when('accessLevel', {
    is: 'EMBARGOED',
    then: Joi.string().required().messages({
      'string.empty': 'Embargo reason is required for embargoed files',
    }),
  }),
});

/**
 * Search Query Schema
 */
const searchSchema = Joi.object({
  q: Joi.string().optional().allow('').max(200).messages({
    'string.max': 'Search query is too long',
  }),

  faculty: Joi.number().integer().positive().optional().allow(''),

  department: Joi.number().integer().positive().optional().allow(''),

  year: Joi.number().integer().min(2000).max(new Date().getFullYear()).optional().allow(''),

  sort: Joi.string()
    .valid('newest', 'oldest', 'title', 'author', 'views', 'downloads')
    .optional()
    .default('newest'),

  page: Joi.number().integer().min(1).optional().default(1),

  limit: Joi.number().integer().min(1).max(100).optional().default(20),
});

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate thesis submission data
 */
function validateThesis(data) {
  const { error, value } = thesisSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw {
      name: 'ValidationError',
      message: 'Thesis validation failed',
      details: error.details,
    };
  }

  return value;
}

/**
 * Validate user registration data
 */
function validateRegister(data) {
  const { error, value } = registerSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw {
      name: 'ValidationError',
      message: 'Registration validation failed',
      details: error.details,
    };
  }

  return value;
}

/**
 * Validate login data
 */
function validateLogin(data) {
  const { error, value } = loginSchema.validate(data, {
    abortEarly: false,
  });

  if (error) {
    throw {
      name: 'ValidationError',
      message: 'Login validation failed',
      details: error.details,
    };
  }

  return value;
}

/**
 * Validate file upload data
 */
function validateFileUpload(data) {
  const { error, value } = fileUploadSchema.validate(data, {
    abortEarly: false,
  });

  if (error) {
    throw {
      name: 'ValidationError',
      message: 'File upload validation failed',
      details: error.details,
    };
  }

  return value;
}

/**
 * Validate search query
 */
function validateSearch(data) {
  const { error, value } = searchSchema.validate(data, {
    abortEarly: false,
  });

  if (error) {
    throw {
      name: 'ValidationError',
      message: 'Search validation failed',
      details: error.details,
    };
  }

  return value;
}

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

/**
 * Generic validation middleware
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const validationError = {
        name: 'ValidationError',
        message: 'Validation failed',
        details: error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
          type: d.type,
        })),
      };

      return next(validationError);
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
}

/**
 * Validate query parameters
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const validationError = {
        name: 'ValidationError',
        message: 'Query validation failed',
        details: error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      };

      return next(validationError);
    }

    req.query = value;
    next();
  };
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Schemas
  thesisSchema,
  registerSchema,
  loginSchema,
  fileUploadSchema,
  searchSchema,

  // Validation functions
  validateThesis,
  validateRegister,
  validateLogin,
  validateFileUpload,
  validateSearch,

  // Middleware
  validate,
  validateQuery,
};
