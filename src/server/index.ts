import express from "express";

import CONFIG from "../config";
import { BootLoader } from "../boot";

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

new BootLoader(async () => {
    try {
        await import("./registry");
    } catch (error) {
        console.error("Failed to load registry endpoints:", error);
        return false;
    }

    app.listen(CONFIG.server.port, () => {
        console.log(`Server is running on port ${CONFIG.server.port}`);
    });

    return true;
});
