import { app } from ".";
import http from "http";
import { getLogger } from "../util/logger";
import CONFIG from "../config";
import jwt from "jsonwebtoken";
import { Request } from "express";

const logger = getLogger("PROXY");

const serviceMap = CONFIG.proxy.services;
const PUBLIC_PATHS = CONFIG.proxy.publicPaths;

function verifyJWT(req: any): { success: boolean, payload: unknown } {
    if (!CONFIG.proxy.jwt.enabled) return { success: true, payload: null };

    if (!CONFIG.proxy.jwt.secret) {
        logger.error("JWT secret is not configured.");
        return { success: false, payload: null };
    }

    if (!CONFIG.proxy.jwt.cookieName) {
        logger.error("JWT cookie name is not configured.");
        return { success: false, payload: null };
    }

    const token = req.cookies?.[CONFIG.proxy.jwt.cookieName];
    if (!token) {
        logger.warn("JWT token not found in cookies.");
        return { success: false, payload: null };
    }

    try {
        const decoded = jwt.verify(token, CONFIG.proxy.jwt.secret);
        req.user = decoded;
        return { success: true, payload: decoded };
    } catch (error) {
        logger.warn(`JWT verification failed: ${(error as Error).message || "unknown error"}`);
        return { success: false, payload: null };
    }
}

function getDeterminant(req: Request): { determinant: string, path: string } | null {
    if (CONFIG.proxy.routing.determinant === "subdomain") {
        return { determinant: req.headers.host?.split(".")[0] || '', path: req.originalUrl };
    } else if (CONFIG.proxy.routing.determinant === "path") {
        const fixedPath = req.path.replace(`/${req.path.split("/")[1]}`, '');
        const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        return { determinant: req.path.split("/")[1] || '', path: fixedPath + queryString };
    }
    logger.warn(`Unknown routing determinant: ${CONFIG.proxy.routing.determinant}`);
    return null;
}

app.all("/*path", (req, res) => {
    const determinantData = getDeterminant(req);
    if (!determinantData) {
        res.status(500).send("Server Configuration Error");
        return;
    }

    const { determinant, path } = determinantData;
    const targetURLString = serviceMap[(determinant || "") as keyof typeof serviceMap];

    logger.info(`[DEBUG] Incoming: ${req.method} ${req.originalUrl}`);
    logger.info(`[DEBUG] Determinant: "${determinant}", Proxied Path: "${path}"`);
    logger.info(`[DEBUG] Target URL: ${targetURLString}`);

    if (!targetURLString) {
        logger.warn(`Unknown subdomain: ${determinant}`);
        res.status(502).send("Bad Gateway: Unknown Target");
        return;
    }

    // Check Authorization
    const publicPathContainer = PUBLIC_PATHS[determinant as keyof typeof PUBLIC_PATHS];
    const isPublicPath = publicPathContainer?.some(publicPath => path === publicPath || path.startsWith(publicPath + "/"));
    logger.info(`[DEBUG] Public paths for "${determinant}": ${JSON.stringify(publicPathContainer)}`);
    logger.info(`[DEBUG] Is public path: ${isPublicPath}, checking against path: "${path}"`);
    const authResult = verifyJWT(req);
    if (!isPublicPath && !authResult.success) {
        logger.warn(`Unauthorized request to ${req.path}`);
        res.status(401).send("Unauthorized");
        return;
    }

    // Build the proxy request
    const targetURL = new URL(targetURLString);

    logger.info(`Proxying ${req.method} ${path} -> ${targetURL.hostname}:${targetURL.port}`);

    const proxyRequest = http.request({
        hostname: targetURL.hostname,
        port: targetURL.port,
        path,
        method: req.method,
        headers: {
            ...req.headers,
            host: targetURL.hostname,
            "proxy-payload": JSON.stringify(authResult.payload),
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
        logger.info(`[DEBUG] Response from ${targetURL.hostname}: ${proxyRes.statusCode}`);
        logger.info(`[DEBUG] Response headers: ${JSON.stringify(proxyRes.headers)}`);
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
    });
});