
export type{
    GeminiChat,
    GeminiResponse,
    GeminiPart
}

interface GeminiPart {
    text?: string;
    thought?: boolean;
}

interface GeminiCandidate {
    content?: {
        parts?: GeminiPart[];
        role?: string;
    };
    finishReason?: string;
}

interface GeminiResponse {
    candidates?: GeminiCandidate[];
}

type GeminiFunctionCall = {
    id?: string;
    name: string;
    args: any
}

type GeminiFunctionResponse = {
    id?: string;
    name: string;
    response: any
}

interface GeminiPart{
    text?:string
    thought?:boolean
    thoughtSignature?:string
    "inlineData"?: {
        "mimeType": string,
        "data": string
    },
    functionCall?: GeminiFunctionCall
    functionResponse?: GeminiFunctionResponse
}

interface GeminiChat {
    role: "user"|"model"|"function"
    parts:|GeminiPart[]
}