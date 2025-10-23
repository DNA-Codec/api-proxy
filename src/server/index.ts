import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import CONFIG from "../config";
import { BootLoader } from "../boot";
import { getLogger } from "../util/logger";

const logger = getLogger("SERVER");
export const app = express();

const corsOptions: cors.CorsOptions = {
    origin: CONFIG.server.allowedOrigins,
    credentials: true,
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
