import express from "express";

import CONFIG from "../config";
import { BootLoader } from "../boot";

export const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

new BootLoader(async () => {
    await import("./endpoints/registry");

    app.listen(CONFIG.server.port, () => {
        console.log(`Server is running on port ${CONFIG.server.port}`);
    });
});
