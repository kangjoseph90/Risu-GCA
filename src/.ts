import { RequestType } from "./types";

function parseRequestType(mode: string): RequestType {
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