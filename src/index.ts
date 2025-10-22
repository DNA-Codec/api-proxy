import { startBootLoaders } from "./boot";

// startup locations
import "./server/index";

// lifecycle
function main() {
    console.log("Starting proxy server...");
    startBootLoaders();
}

main();