// Admin Middleware (SUPER_ADMIN role) - Must be used AFTER authenticateToken middleware.
export const requireSuperAdmin = (req, res, next) => {
    // 1. Verify user is authenticated
    if (!req.user || !req.user.id) {
        return res.status(401).send({
            message: "Du skal være logget ind"
        });
    }

    // 2. Check if user has SUPER_ADMIN role
    if (req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).send({
            message: "Kun system administratorer har adgang til denne funktion"
        });
    }

    next();
};
