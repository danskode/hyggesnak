//==== Global error handler middleware ====//

export const errorHandler = (err, req, res, next) => {
    // Log different details based on environment
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
        // Full error details in development
        // Use console.error with direct string concatenation to avoid JSON serialization issues
        console.error('Error occurred:', err.message);
        if (err.stack) {
            console.error('Stack:', err.stack);
        }
    } else {
        // Minimal logging in production
        console.error('Error:', err.message, 'at', new Date().toISOString());
    }

    // Default error response
    let status = err.status || 500;
    let message = 'Serverfejl';

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        status = 403;
        message = 'Ugyldig token';
    } else if (err.name === 'TokenExpiredError') {
        status = 401;
        message = 'Token er udløbet';
    }

    // Don't leak error details to client in production
    if (!isDevelopment && status === 500) {
        message = 'Der opstod en serverfejl. Prøv igen senere.';
    }

    res.status(status).send({
        message,
        ...(isDevelopment && { stack: err.stack }) // Include stack trace only in dev
    });
};