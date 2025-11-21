/**
 * log,
 * error,
 * warn,
 * info,
 * debug
 */
export class Logger {
    static log(...message: any[]) {
        console.log("[GCA]", ...message);
    }
    static error(...message: any[]) {
        console.error("[GCA]", ...message);
    }   
    static warn(...message: any[]) {
        console.warn("[GCA]", ...message);
    }
    static info(...message: any[]) {
        console.info("[GCA]", ...message);
    }
    static debug(...message: any[]) {
        console.debug("[GCA]", ...message);
    }
}