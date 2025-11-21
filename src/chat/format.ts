import type { OpenAIChat } from "../api"
import type { GeminiChat, GeminiPart, GeminiResponse } from "./types";




function parseGeminiRole(role: string): "user" | "model" | "function" {
    switch (role) {
        case 'system':
        case 'user':
            return 'user';
        case 'assistant':
            return 'model';
        case 'function':
            return 'function';
        default:
            return 'user';
    }
}

export function parseGeminiChat(messages: OpenAIChat[]): GeminiChat[] {
    const chats: GeminiChat[] = [];
    for (const msg of messages) {
        const role = parseGeminiRole(msg.role);
        let parts: GeminiPart[] = [];
        let lastChat = chats.length > 0 ? chats[chats.length - 1] : null;
        
        if (lastChat && lastChat.role === role) {
            parts = lastChat.parts;
            chats.pop();
        }
        
        parts.push({ text: msg.content });

        if (msg.multimodals) {
            for (const modal of msg.multimodals) {
                const dataurl = modal.base64;
                const base64 = dataurl.split(",")[1];
                const mediaType = dataurl.split(";")[0].split(":")[1];
    
                parts.push({
                    inlineData: {
                        mimeType: mediaType,
                        data: base64,
                    }
                });   
            }
        }

        chats.push({ role, parts });
    }
    return chats;
}

export function extractContent(response: GeminiResponse): { content: string, thoughts: string } {
    let content = '';
    let thoughts = '';

    if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
                if (part.text) {
                    if (part.thought) {
                        thoughts += part.text;
                    } else {
                        content += part.text;
                    }
                }
            }
        }
    }
    return { content, thoughts };
}

export function formatResult(content: string, thoughts: string): string {
    let result = '';
    if (thoughts.trim()) {
        result += `<Thoughts>\n\n${thoughts.trim()}\n\n</Thoughts>\n\n`;
    }
    result += content;
    return result;
}
