import { app } from ".";
import http from "http";
import { getLogger } from "../util/logger";
import CONFIG from "../config";
import jwt from "jsonwebtoken";

const logger = getLogger("PROXY");

const serviceMap = CONFIG.proxy.services;
const PUBLIC_PATHS = CONFIG.proxy.publicPaths;

function verifyJWT(req: any): boolean {
    if (!CONFIG.proxy.jwt.enabled) return true;

    if (!CONFIG.proxy.jwt.secret) {
        logger.error("JWT secret is not configured.");
        return false;
    }

    if (!CONFIG.proxy.jwt.cookieName) {
        logger.error("JWT cookie name is not configured.");
        return false;
    }

    const token = req.cookies?.[CONFIG.proxy.jwt.cookieName];
    if (!token) return false;

    try {
        const decoded = jwt.verify(token, CONFIG.proxy.jwt.secret);
        req.user = decoded;
    } catch (error) {
        logger.warn(`JWT verification failed: ${(error as Error).message || "unknown error"}`);
        return false;
    }

    return true;
}

app.all("/*path", (req, res) => {
    const subdomain = req.headers.host?.split(".")[0];
    const targetURLString = serviceMap[(subdomain || "") as keyof typeof serviceMap];

    if (!targetURLString) {
        logger.warn(`Unknown subdomain: ${subdomain}`);
        res.status(502).send("Bad Gateway: Unknown Target");
        return;
    }

    // Check Authorization
    const publicPathContainer = PUBLIC_PATHS[subdomain as keyof typeof PUBLIC_PATHS];
    const isPublicPath = publicPathContainer?.some(path => req.path.startsWith(path));
    if (!isPublicPath && !verifyJWT(req)) {
        logger.warn(`Unauthorized request to ${req.path}`);
        res.status(401).send("Unauthorized");
        return;
    }

    // Build the proxy request
    const targetURL = new URL(targetURLString);
    const fullPath = req.originalUrl || req.url;

    logger.info(`Proxying ${req.method} ${fullPath} -> ${targetURL.hostname}:${targetURL.port}`);

    const proxyRequest = http.request({
        hostname: targetURL.hostname,
        port: targetURL.port,
        path: fullPath,
        method: req.method,
        headers: {
            ...req.headers,
            host: targetURL.hostname,
        },
    });

    // Handle Errors
    proxyRequest.on("error", (err) => {
        logger.error(`Proxy error: ${err.message}`);
        if (!res.headersSent) res.status(502).send("Bad Gateway: Target service unavailable");
    });

    req.on("error", (err) => {
        logger.error(`Request error: ${err.message}`);
        proxyRequest.destroy();
    });

    // Pipe Request
    req.pipe(proxyRequest);

    // Handle Piped Response
    proxyRequest.on("response", (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
    });
});