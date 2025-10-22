type BootFunction = () => boolean | Promise<boolean>;

const bootloaders: BootLoader[] = [];

export class BootLoader {
    private cb: BootFunction;

    constructor(cb: BootFunction) {
        this.cb = cb;
        bootloaders.push(this);
    }

    run() {
        return this.cb();
    }
}

/** Starts bootloaders, throws error if a loader fails */
export async function startBootLoaders() {
    const results = await Promise.all(bootloaders.map(b => b.run()));
    const allSuccess = results.every(res => res === true);

    if (!allSuccess) throw new Error("One or more bootloaders failed to initialize.");
}