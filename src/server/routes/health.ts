import { Endpoint } from "../package";

export const endpoint = new Endpoint("get", "/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});