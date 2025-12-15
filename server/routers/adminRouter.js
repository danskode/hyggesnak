import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireSuperAdmin } from '../middleware/adminMiddleware.js';
import * as adminService from '../services/adminService.js';

const router = Router();

//==== Admin Middleware - require authentication and SUPER_ADMIN role ====//

router.use(authenticateToken, requireSuperAdmin);

//==== User Management Endpoints ====//

// GET /api/admin/users
router.get('/users', async (req, res, next) => {
    try {
        const result = await adminService.getUsers(req.query);

        res.send({
            data: result.users,
            pagination: result.pagination
        });
    } catch (error) {
        error.status = error.status || 500;
        error.message = error.message || 'Kunne ikke hente brugere';
        next(error);
    }
});

// POST /api/admin/users
router.post('/users', async (req, res, next) => {
    try {
        const user = await adminService.createUser(req.body);

        res.status(201).send({
            message: 'Bruger oprettet',
            data: user
        });
    } catch (error) {
        error.status = error.status || 500;
        error.message = error.message || 'Kunne ikke oprette bruger';
        next(error);
    }
});

// PUT /api/admin/users/:userId
router.put('/users/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const updatedUser = await adminService.updateUser(userId, req.body);

        res.send({
            message: 'Bruger opdateret',
            data: updatedUser
        });
    } catch (error) {
        error.status = error.status || 500;
        error.message = error.message || 'Kunne ikke opdatere bruger';
        next(error);
    }
});

// DELETE /api/admin/users/:userId
router.delete('/users/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;
        const deletedUser = await adminService.deleteUser(userId, req.user.id);

        res.send({
            message: `Bruger ${deletedUser.username} slettet`
        });
    } catch (error) {
        error.status = error.status || 500;
        error.message = error.message || 'Kunne ikke slette bruger';
        next(error);
    }
});

//==== Hyggesnak Management Endpoints ====//

// GET /api/admin/hyggesnakke
router.get('/hyggesnakke', async (req, res, next) => {
    try {
        const result = await adminService.getHyggesnakke(req.query);

        res.send({
            data: result.hyggesnakke,
            pagination: result.pagination
        });
    } catch (error) {
        error.status = error.status || 500;
        error.message = error.message || 'Kunne ikke hente hyggesnakke';
        next(error);
    }
});

// GET /api/admin/hyggesnakke/:hyggesnakId
router.get('/hyggesnakke/:hyggesnakId', async (req, res, next) => {
    try {
        const { hyggesnakId } = req.params;
        const hyggesnak = await adminService.getHyggesnakDetails(hyggesnakId);

        res.send({
            data: hyggesnak
        });
    } catch (error) {
        error.status = error.status || 500;
        error.message = error.message || 'Kunne ikke hente hyggesnak detaljer';
        next(error);
    }
});

// DELETE /api/admin/hyggesnakke/:hyggesnakId
router.delete('/hyggesnakke/:hyggesnakId', async (req, res, next) => {
    try {
        const { hyggesnakId } = req.params;
        const deletedHyggesnak = await adminService.deleteHyggesnak(hyggesnakId);

        res.send({
            message: `Hyggesnak "${deletedHyggesnak.display_name}" slettet`
        });
    } catch (error) {
        error.status = error.status || 500;
        error.message = error.message || 'Kunne ikke slette hyggesnak';
        next(error);
    }
});

//==== System Statistics Endpoint ====//

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
    try {
        const stats = await adminService.getSystemStats();

        res.send({
            data: stats
        });
    } catch (error) {
        error.status = error.status || 500;
        error.message = error.message || 'Kunne ikke hente statistik';
        next(error);
    }
});

export default router;
