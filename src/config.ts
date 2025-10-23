export const CONFIG = {
    /** Configuration relating to the server */
    server: {
        /** The port for the server to run on */
        port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    },
    /** Configuration relating to logging */
    logger: {
        /** The logging level to use */
        level: process.env.LOG_LEVEL || "info",
    },
    proxy: {
        /** Mapping for subdomains to their target urls */
        // Env Format: "codec=http://localhost:4000;user=http://localhost:5000"
        // Config Format: { [subdomain: string]: string }
        services: process.env.PROXY_SERVICES?.split(/[,;]/).reduce((acc, entry) => {
            const [subdomain, url] = entry.split("=");
            acc[subdomain] = url;
            return acc;
        }, {} as Record<string, string>) || {},

        /** Paths that do not require JWT verification */
        // Env Format: "codec=/api/v1/login,/api/v2/login;user=/api/v1/register"
        // Config Format: { codec: string[], user: string[] }
        publicPaths: process.env.PROXY_PUBLIC_PATHS?.split(";").reduce((acc, entry) => {
            const [subdomain, paths] = entry.split("=");
            acc[subdomain] = paths.split(",");
            return acc;
        }, {} as Record<string, string[]>) || {},

        /** JWT verification settings */
        jwt: {
            /** Whether JWT verification is enabled */
            enabled: process.env.JWT_ENABLED === "true",
            /** Secret key for JWT verification */
            secret: process.env.JWT_SECRET,
            /** Name of the cookie to extract JWT from */
            cookieName: process.env.JWT_COOKIE_NAME || "token",
        },

        /** Configuration relating to routing */
        routing: {
            /** Routing determination */
            determinant: process.env.ROUTING_DETERMINANT || "path", // "subdomain" | "path"
        },
    }
};

export default CONFIG;