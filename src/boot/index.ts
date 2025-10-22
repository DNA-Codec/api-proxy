type BootFunction = () => any;

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

export async function startBootLoaders() {
    await Promise.all(bootloaders.map(b => b.run()));
}