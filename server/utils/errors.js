//==== Custom Error Classes ====//
// Standardized error handling across the application
// All custom errors extend AppError with status codes

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.status = status;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 400 Bad Request - Invalid input/validation errors
 */
export class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}

/**
 * 401 Unauthorized - Authentication required or failed
 */
export class UnauthorizedError extends AppError {
    constructor(message = 'Autentificering påkrævet') {
        super(message, 401);
    }
}

/**
 * 403 Forbidden - Authenticated but not authorized
 */
export class ForbiddenError extends AppError {
    constructor(message = 'Du har ikke adgang til denne ressource') {
        super(message, 403);
    }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends AppError {
    constructor(message = 'Ressource ikke fundet') {
        super(message, 404);
    }
}

/**
 * 409 Conflict - Resource conflict (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
    constructor(message = 'Ressource konflikt') {
        super(message, 409);
    }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
    constructor(message = 'For mange forsøg. Prøv igen senere') {
        super(message, 429);
    }
}

/**
 * 500 Internal Server Error - Generic server error
 */
export class InternalError extends AppError {
    constructor(message = 'Intern serverfejl') {
        super(message, 500);
    }
}
