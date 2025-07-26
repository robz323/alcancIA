// Simple Plugin interface for build
export interface Plugin {
    name: string;
    description: string;
    actions: any[];
    evaluators: any[];
    providers: any[];
}

import { onRampAction } from "./actions/onRamp";
import { offRampAction } from "./actions/offRamp";

export const capaPlugin: Plugin = {
    name: "capa",
    description: "Plugin de Capa para integración de fiat a crypto en América Latina",
    actions: [
        onRampAction,
        offRampAction,
    ],
    evaluators: [],
    providers: [],
};

// Exportar todas las funcionalidades del plugin
export * from "./types";
export * from "./client";
export { onRampAction } from "./actions/onRamp";
export { offRampAction } from "./actions/offRamp";

export default capaPlugin; 