import 'dotenv/config';
import { validateEnv } from './utils/validateEnv.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import './database/db.js';
import { config } from './config/config.js';

//==== Environment variables ====//

validateEnv();

//==== Express app setup ====//

const app = express();
app.use(express.json());

//==== Security headers & Cors ====//

app.use(helmet());

// CORS config

const corsOptions = {
    origin: config.clientUrl,
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

//===== Request Logging (Development) =====//
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        // console.log(`${req.method} ${req.path}`);
        next();
    });
}

//===== Routers =====//

import authRouter from './routers/authRouter.js';
app.use('/api', authRouter);

import hyggesnakRouter from './routers/hyggesnakRouter.js';
app.use('/api', hyggesnakRouter);

import membersRouter from './routers/membersRouter.js';
app.use('/api', membersRouter);

import messagesRouter from './routers/messagesRouter.js';
app.use('/api', messagesRouter);

import networkRouter from './routers/networkRouter.js';
app.use('/api/network', networkRouter);

import hyggesnakInvitationRouter from './routers/hyggesnakInvitationRouter.js';
app.use('/api', hyggesnakInvitationRouter);

import adminRouter from './routers/adminRouter.js';
app.use('/api/admin', adminRouter);

//===== Error Handler =====//

import { errorHandler } from './middleware/errorHandler.js';
app.use(errorHandler);

//===== Start Server =====//

const server = app.listen(config.port, (error) => {
    if (error) {
        console.error("Server is not starting, due to:", error);
        process.exit(1);
    }
    console.log(`Server is up and running on port ${config.port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

//===== Socket.IO Setup =====//

import { Server } from 'socket.io';
import { setupSocketHandlers } from './socket/socketHandlers.js';

const io = new Server(server, {
    cors: corsOptions
});

setupSocketHandlers(io);

// Make io available to routers
app.set('io', io);

//===== Graceful Shutdown Handlers =====//

const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Close Socket.IO connections first
    io.close(() => {
        console.log('Socket.IO server closed');

        // Then close HTTP server
        server.close(() => {
            console.log('HTTP server closed');

            // Finally close database connection
            import('./database/db.js').then((dbModule) => {
                const db = dbModule.default;
                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                        process.exit(1);
                    }
                    console.log('Database connection closed');
                    process.exit(0);
                });
            });
        });
    });

    // Force shutdown after 10 seconds if graceful shutdown fails
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});