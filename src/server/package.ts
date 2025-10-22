import { Request, Response } from "express";
import { app } from ".";

/** Callback function of an endpoint */
type EndpointCall = (req: Request, res: Response) => any;

type EndpointMethod = "get" | "post" | "put" | "delete";

/** Represents an API endpoint, listens via Express */
export class Endpoint {
    readonly method: EndpointMethod | EndpointMethod[];
    readonly path: string;
    private cb: EndpointCall;

    constructor(method: EndpointMethod | EndpointMethod[], path: string, cb: EndpointCall) {
        this.method = method;
        this.path = path;
        this.cb = cb;

        this.listen();
    }

    /** Start the listener for this endpoint */
    private listen() {
        if (Array.isArray(this.method)) for (const m of this.method) app[m](this.path, this.cb);
        else app[this.method](this.path, this.cb);
    }
}