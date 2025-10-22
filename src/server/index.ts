import express from "express";

import CONFIG from "../config";
import { BootLoader } from "../boot";
import { getLogger } from "../util/logger";

const logger = getLogger("SERVER");
export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

new BootLoader(async () => {
    try {
        await import("./registry");
    } catch (error) {
        logger.error("Failed to load registry endpoints:", error);
        return false;
    }

    app.listen(CONFIG.server.port, () => {
        logger.info(`Server is running on port ${CONFIG.server.port}`);
    });

    return true;
});
