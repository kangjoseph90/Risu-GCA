import type { GlobalFetchResult } from "../api";
import { Logger } from "../shared/logger";
import { extractContent, formatResult } from "./format";
import type { GeminiResponse } from "./types";


export function handleResponse(result: GlobalFetchResult): { success: boolean, content: string | ReadableStream } {
    if (!result.ok) {
        return { success: false, content: `Error: ${result.status} ${JSON.stringify(result.data)}` };
    }

    const response = result.data.response as GeminiResponse;
    const { content, thoughts } = extractContent(response);
    
    if (!content && !thoughts) {
        return { success: false, content: "Empty response from model" };
    }

    return { success: true, content: formatResult(content, thoughts) };
}

export async function handleStreamResponse(response: Response): Promise<{ success: boolean, content: string | ReadableStream }> {
    if (!response.ok) {
        const text = await response.text();
        return { success: false, content: `Error: ${response.status} ${text}` };
    }

    if (!response.body) {
        return { success: false, content: "No response body" };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let thinking = false;

    const stream = new ReadableStream({
        async start(controller) {
            let buffer = '';
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine.startsWith('data: ')) continue;
                        
                        const dataStr = trimmedLine.slice(6).trim();
                        if (dataStr === '[DONE]') continue;

                        try {
                            const data = JSON.parse(dataStr);
                            const responseData = data.response as GeminiResponse;
                            
                            if (responseData.candidates && responseData.candidates.length > 0) {
                                const candidate = responseData.candidates[0];
                                if (candidate.content && candidate.content.parts) {
                                    for (const part of candidate.content.parts) {
                                        if (part.text) {
                                            if (part.thought) {
                                                if (!thinking) {
                                                    thinking = true;
                                                    controller.enqueue("<Thoughts>\n\n");
                                                }
                                                controller.enqueue(part.text);
                                            } else {
                                                if (thinking) {
                                                    thinking = false;
                                                    controller.enqueue("\n\n</Thoughts>\n\n");
                                                }
                                                controller.enqueue(part.text);
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            Logger.error('Stream parse error', e);
                        }
                    }
                }
                if (thinking) {
                    controller.enqueue("\n\n</Thoughts>\n\n");
                }
                controller.close();
            } catch (e) {
                Logger.error('Stream error', e);
                controller.error(e);
            }
        }
    });

    return { success: true, content: stream as any };
}

