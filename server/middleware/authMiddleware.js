import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/auth.js';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).send({
            message: "Du har ikke adgang uden en token, du!"
        });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        // Specific error handling for JWT errors
        if (err.name === 'TokenExpiredError') {
            return res.status(401).send({
                message: "Token er udløbet. Log venligst ind igen."
            });
        } else if (err.name === 'JsonWebTokenError') {
            return res.status(403).send({
                message: "Ugyldig token"
            });
        }

        // Unknown error - generic response
        return res.status(403).send({
            message: "Autentificering fejlede"
        });
    }
};
