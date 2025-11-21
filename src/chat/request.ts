import type { GlobalFetchResult } from "../api";
import { GCAManager } from "../gca";

export async function requestGenerateContent(body: any, abortSignal?: AbortSignal): Promise<GlobalFetchResult> {
    return GCAManager.risuFetchGCA('generateContent', {
        method: 'POST',
        body: body,
        headers: { 'Content-Type': 'application/json' },
        abortSignal: abortSignal
    });
}

export async function requestGenerateStreamContent(body: any, abortSignal?: AbortSignal): Promise<Response> {
    return GCAManager.nativeFetchGCA('streamGenerateContent?alt=sse', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        signal: abortSignal
    });
}