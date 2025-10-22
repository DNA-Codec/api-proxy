import { Endpoint } from "./common";

export const endpoint = new Endpoint("get", "/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});