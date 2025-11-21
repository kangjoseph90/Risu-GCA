import { RequestType } from "./types";

/**
 * Triggers a browser download for the given content.
 * @param content The string content to download.
 * @param fileName The name of the file.
 * @param mimeType The MIME type of the file.
 */
export function downloadFile(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Reads the content of a File object as a text string.
 * @param file The File object to read.
 * @returns A Promise that resolves with the file's text content.
 */
export function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = () => {
            reject(reader.error);
        };
        reader.readAsText(file);
    });
}

export function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: number | undefined;

    return function(this: ThisParameterType<T>, ...args: Parameters<T>): void {
        const context = this;
        clearTimeout(timeout);
        timeout = window.setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

export function parseRequestType(mode: string): RequestType {
    switch(mode) {
        case 'model': return RequestType.Chat;
        case 'memory': return RequestType.Memory;
        case 'emotion': return RequestType.Emotion;
        case 'translate': return RequestType.Translate;
        case 'otherAx':
        case 'submodel': return RequestType.Other;
        default: return RequestType.Unknown;
    }
}