import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import CONFIG from "../config";
import { BootLoader } from "../boot";
import { getLogger } from "../util/logger";

const logger = getLogger("SERVER");
export const app = express();

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (CONFIG.server.allowedOrigins[0] !== "*") {
            if (CONFIG.server.allowedOrigins.includes(origin)) return callback(null, true);
            else return callback(new Error('Not allowed by CORS'));
        }

        callback(null, true);
    },
    credentials: true
};

app.use(cors(corsOptions));
app.use(cookieParser());

new BootLoader(async () => {
    try {
        // await import("./registry");
        await import("./proxy");
    } catch (error) {
        logger.error("Failed to load registry endpoints:", error);
        return false;
    }

    app.listen(CONFIG.server.port, () => {
        logger.info(`Server is running on port ${CONFIG.server.port}`);
    });

    return true;
});
