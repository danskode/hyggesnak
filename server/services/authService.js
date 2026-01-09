import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { dbGet, dbRun } from '../database/queryHelpers.js';
import emailService from './emailService.js';
import { JWT_SECRET, JWT_EXPIRY } from '../config/auth.js';
import { config } from '../config/config.js';

class AuthService {
    // Login user and generate JWT token
    async login(username, password) {
        try {
            const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);

            if (!user) {
                throw { status: 401, message: "Forkert brugernavn eller password" };
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                throw { status: 401, message: "Forkert brugernavn eller password" };
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRY }
            );

            return {
                id: user.id,
                username: user.username,
                role: user.role,
                token: token
            };
        } catch (error) {
            if (error.status) throw error;
            throw { status: 500, message: "Server fejl" };
        }
    }

    // Request password reset - generate and save token
    async requestPasswordReset(email) {
        try {
            const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

            // Always return success for security (don't reveal if email exists)
            if (!user) {
                return { message: "Hvis emailen findes, er et reset link sendt" };
            }

            // Generate reset token - this will be sent to user
            const resetToken = crypto.randomBytes(32).toString('hex');

            // Hash token before storing in database for security
            const hashedToken = crypto
                .createHash('sha256')
                .update(resetToken)
                .digest('hex');

            const resetTokenExpires = new Date(Date.now() + config.resetTokenExpiryHours * 60 * 60 * 1000);

            // Save HASHED token to database
            await dbRun(
                'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
                [hashedToken, resetTokenExpires.toISOString(), user.id]
            );

            // Send UNHASHED token via email (user needs this to reset password)
            emailService.sendPasswordResetEmail(user.username, user.email, resetToken)
                .catch(err => console.error('Email send error:', err));

            return { message: "Hvis emailen findes, er et reset link sendt" };
        } catch (error) {
            throw { status: 500, message: "Server fejl" };
        }
    }

    // Reset password with token
    async resetPassword(token, newPassword) {
        try {
            // Hash the incoming token to compare with database
            const hashedToken = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            const user = await dbGet(
                'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > ?',
                [hashedToken, new Date().toISOString()]
            );

            if (!user) {
                throw { status: 400, message: "Ugyldig eller udløbet reset token" };
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, config.saltRounds);

            // Update password and clear reset token
            await dbRun(
                'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
                [hashedPassword, user.id]
            );

            return { message: "Password er blevet nulstillet succesfuldt" };
        } catch (error) {
            if (error.status) throw error;
            throw { status: 500, message: "Server fejl" };
        }
    }
}

export default new AuthService();
