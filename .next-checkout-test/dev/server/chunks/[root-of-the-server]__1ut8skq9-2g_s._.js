(()=>{"use strict";module.exports = [
"[externals]/@electric-sql/pglite [external] (@electric-sql/pglite, esm_import, [project]/node_modules/@electric-sql/pglite)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
var mod = await __turbopack_context__.y("@electric-sql/pglite-7966c14983af6418");

__turbopack_context__.n(mod);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, true);}),
"[project]/node_modules/@ai-sdk/groq/dist/index.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "VERSION",
    ()=>VERSION,
    "browserSearch",
    ()=>browserSearch,
    "createGroq",
    ()=>createGroq,
    "groq",
    ()=>groq
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@ai-sdk/provider/dist/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@ai-sdk/provider-utils/dist/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@workflow/serde/dist/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z .object>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$enum$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z .enum>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$boolean$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z .boolean>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z .string>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z .number>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$array$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z .array>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$literal$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z .literal>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$union$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-route] (ecmascript) <export * as z .union>");
;
;
;
//#region src/convert-groq-usage.ts
function convertGroqUsage(usage) {
    if (usage == null) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createNullLanguageModelUsage"])();
    const promptTokens = usage.prompt_tokens ?? 0;
    const cacheReadTokens = usage.prompt_tokens_details?.cached_tokens ?? void 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const reasoningTokens = usage.completion_tokens_details?.reasoning_tokens ?? void 0;
    const textTokens = reasoningTokens != null ? Math.max(0, completionTokens - reasoningTokens) : completionTokens;
    return {
        inputTokens: {
            total: promptTokens,
            noCache: cacheReadTokens != null ? promptTokens - cacheReadTokens : promptTokens,
            cacheRead: cacheReadTokens,
            cacheWrite: void 0
        },
        outputTokens: {
            total: completionTokens,
            text: textTokens,
            reasoning: reasoningTokens
        },
        raw: usage
    };
}
//#endregion
//#region src/convert-to-groq-chat-messages.ts
function convertToGroqChatMessages(prompt) {
    const messages = [];
    for (const { role, content } of prompt)switch(role){
        case "system":
            messages.push({
                role: "system",
                content
            });
            break;
        case "user":
            if (content.length === 1 && content[0].type === "text") {
                messages.push({
                    role: "user",
                    content: content[0].text
                });
                break;
            }
            messages.push({
                role: "user",
                content: content.map((part)=>{
                    switch(part.type){
                        case "text":
                            return {
                                type: "text",
                                text: part.text
                            };
                        case "file":
                            switch(part.data.type){
                                case "reference":
                                    throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["UnsupportedFunctionalityError"]({
                                        functionality: "file parts with provider references"
                                    });
                                case "text":
                                    throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["UnsupportedFunctionalityError"]({
                                        functionality: "text file parts"
                                    });
                                case "url":
                                case "data":
                                    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getTopLevelMediaType"])(part.mediaType) !== "image") throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["UnsupportedFunctionalityError"]({
                                        functionality: "Non-image file content parts"
                                    });
                                    return {
                                        type: "image_url",
                                        image_url: {
                                            url: part.data.type === "url" ? part.data.url.toString() : `data:${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolveFullMediaType"])({
                                                part
                                            })};base64,${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["convertToBase64"])(part.data.data)}`
                                        }
                                    };
                            }
                    }
                })
            });
            break;
        case "assistant":
            {
                let text = "";
                let reasoning = "";
                const toolCalls = [];
                for (const part of content)switch(part.type){
                    case "reasoning":
                        reasoning += part.text;
                        break;
                    case "text":
                        text += part.text;
                        break;
                    case "tool-call":
                        toolCalls.push({
                            id: part.toolCallId,
                            type: "function",
                            function: {
                                name: part.toolName,
                                arguments: JSON.stringify(part.input)
                            }
                        });
                }
                messages.push({
                    role: "assistant",
                    content: text,
                    ...reasoning.length > 0 ? {
                        reasoning
                    } : null,
                    ...toolCalls.length > 0 ? {
                        tool_calls: toolCalls
                    } : null
                });
                break;
            }
        case "tool":
            for (const toolResponse of content){
                if (toolResponse.type === "tool-approval-response") continue;
                const output = toolResponse.output;
                let contentValue;
                switch(output.type){
                    case "text":
                    case "error-text":
                        contentValue = output.value;
                        break;
                    case "execution-denied":
                        contentValue = output.reason ?? "Tool call execution denied.";
                        break;
                    case "content":
                    case "json":
                    case "error-json":
                        contentValue = JSON.stringify(output.value);
                }
                messages.push({
                    role: "tool",
                    tool_call_id: toolResponse.toolCallId,
                    content: contentValue
                });
            }
            break;
        default:
            throw new Error(`Unsupported role: ${role}`);
    }
    return messages;
}
//#endregion
//#region src/groq-chat-language-model-options.ts
const groqLanguageModelChatOptions = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
    reasoningFormat: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$enum$3e$__["z"].enum([
        "parsed",
        "raw",
        "hidden"
    ]).optional(),
    /**
	* Specifies the reasoning effort level for model inference.
	* @see https://console.groq.com/docs/reasoning#reasoning-effort
	*/ reasoningEffort: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$enum$3e$__["z"].enum([
        "none",
        "default",
        "low",
        "medium",
        "high"
    ]).optional(),
    /**
	* Whether to enable parallel function calling during tool use. Default to true.
	*/ parallelToolCalls: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$boolean$3e$__["z"].boolean().optional(),
    /**
	* A unique identifier representing your end-user, which can help OpenAI to
	* monitor and detect abuse. Learn more.
	*/ user: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().optional(),
    /**
	* Whether to use structured outputs.
	*
	* @default true
	*/ structuredOutputs: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$boolean$3e$__["z"].boolean().optional(),
    /**
	* Whether to use strict JSON schema validation.
	* When true, the model uses constrained decoding to guarantee schema compliance.
	* Only used when structured outputs are enabled and a schema is provided.
	*
	* @default true
	*/ strictJsonSchema: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$boolean$3e$__["z"].boolean().optional(),
    /**
	* Service tier for the request.
	* - 'on_demand': Default tier with consistent performance and fairness
	* - 'performance': Prioritized tier for latency-sensitive workloads
	* - 'flex': Higher throughput tier optimized for workloads that can handle occasional request failures
	* - 'auto': Uses on_demand rate limits, then falls back to flex tier if exceeded
	*
	* @default 'on_demand'
	*/ serviceTier: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$enum$3e$__["z"].enum([
        "on_demand",
        "performance",
        "flex",
        "auto"
    ]).optional()
});
//#endregion
//#region src/groq-error.ts
const groqErrorDataSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
    error: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        message: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string(),
        type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string()
    })
});
const groqFailedResponseHandler = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
    errorSchema: groqErrorDataSchema,
    errorToMessage: (data)=>data.error.message
});
//#endregion
//#region src/groq-browser-search-models.ts
/**
* Models that support browser search functionality.
* Based on: https://console.groq.com/docs/browser-search
*/ const BROWSER_SEARCH_SUPPORTED_MODELS = [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b"
];
/**
* Check if a model supports browser search functionality.
*/ function isBrowserSearchSupportedModel(modelId) {
    return BROWSER_SEARCH_SUPPORTED_MODELS.includes(modelId);
}
/**
* Get a formatted list of supported models for error messages.
*/ function getSupportedModelsString() {
    return BROWSER_SEARCH_SUPPORTED_MODELS.join(", ");
}
//#endregion
//#region src/groq-prepare-tools.ts
function prepareTools({ tools, toolChoice, modelId }) {
    tools = tools?.length ? tools : void 0;
    const toolWarnings = [];
    if (tools == null) return {
        tools: void 0,
        toolChoice: void 0,
        toolWarnings
    };
    const groqTools = [];
    for (const tool of tools)if (tool.type === "provider") {
        if (tool.id === "groq.browser_search") {
            if (!isBrowserSearchSupportedModel(modelId)) toolWarnings.push({
                type: "unsupported",
                feature: `provider-defined tool ${tool.id}`,
                details: `Browser search is only supported on the following models: ${getSupportedModelsString()}. Current model: ${modelId}`
            });
            else groqTools.push({
                type: "browser_search"
            });
        } else toolWarnings.push({
            type: "unsupported",
            feature: `provider-defined tool ${tool.id}`
        });
    } else groqTools.push({
        type: "function",
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
            ...tool.strict != null ? {
                strict: tool.strict
            } : {}
        }
    });
    if (toolChoice == null) return {
        tools: groqTools,
        toolChoice: void 0,
        toolWarnings
    };
    const type = toolChoice.type;
    switch(type){
        case "auto":
        case "none":
        case "required":
            return {
                tools: groqTools,
                toolChoice: type,
                toolWarnings
            };
        case "tool":
            return {
                tools: groqTools,
                toolChoice: {
                    type: "function",
                    function: {
                        name: toolChoice.toolName
                    }
                },
                toolWarnings
            };
        default:
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["UnsupportedFunctionalityError"]({
                functionality: `tool choice type: ${type}`
            });
    }
}
//#endregion
//#region src/map-groq-finish-reason.ts
function mapGroqFinishReason(finishReason) {
    switch(finishReason){
        case "stop":
            return "stop";
        case "length":
            return "length";
        case "content_filter":
            return "content-filter";
        case "function_call":
        case "tool_calls":
            return "tool-calls";
        default:
            return "other";
    }
}
//#endregion
//#region src/groq-chat-language-model.ts
function createGroqStreamError(error, data) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createProviderStreamError"])({
        message: error.message,
        type: error.type,
        ...getGroqStreamErrorMetadata(error.type),
        data
    });
}
function getGroqStreamErrorMetadata(type) {
    switch(type){
        case "rate_limit_error":
            return {
                statusCode: 429,
                isRetryable: true
            };
        case "api_error":
        case "internal_server_error":
        case "server_error":
            return {
                statusCode: 500,
                isRetryable: true
            };
        case "overloaded_error":
        case "service_unavailable":
            return {
                statusCode: 503,
                isRetryable: true
            };
        case "timeout":
        case "timeout_error":
            return {
                statusCode: 504,
                isRetryable: true
            };
        case "authentication_error":
        case "invalid_api_key":
            return {
                statusCode: 401,
                isRetryable: false
            };
        case "permission_error":
            return {
                statusCode: 403,
                isRetryable: false
            };
        case "not_found_error":
        case "model_not_found":
            return {
                statusCode: 404,
                isRetryable: false
            };
        case "bad_request":
        case "context_length_exceeded":
        case "invalid_request_error":
            return {
                statusCode: 400,
                isRetryable: false
            };
        default:
            return {};
    }
}
var GroqChatLanguageModel = class GroqChatLanguageModel {
    static [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WORKFLOW_SERIALIZE"]](model) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["serializeModelOptions"])({
            modelId: model.modelId,
            config: model.config
        });
    }
    static [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WORKFLOW_DESERIALIZE"]](options) {
        return new GroqChatLanguageModel(options.modelId, options.config);
    }
    constructor(modelId, config){
        this.specificationVersion = "v4";
        this.supportedUrls = {
            "image/*": [
                /^https?:\/\/.*$/
            ]
        };
        this.modelId = modelId;
        this.config = config;
    }
    get provider() {
        return this.config.provider;
    }
    async getArgs({ prompt, maxOutputTokens, temperature, topP, topK, frequencyPenalty, presencePenalty, stopSequences, responseFormat, seed, reasoning, tools, toolChoice, providerOptions }) {
        const warnings = [];
        const groqOptions = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["parseProviderOptions"])({
            provider: "groq",
            providerOptions,
            schema: groqLanguageModelChatOptions
        });
        let jsonResponseTool;
        if (responseFormat?.type === "json" && responseFormat.schema != null && tools?.some((tool)=>tool.type === "function")) {
            let name = "json";
            for(let suffix = 1; tools.some((tool)=>tool.name === name); suffix++)name = `json_${suffix}`;
            jsonResponseTool = {
                type: "function",
                name,
                description: responseFormat.description ?? "Respond with a JSON object.",
                inputSchema: responseFormat.schema
            };
        }
        const structuredOutputs = groqOptions?.structuredOutputs ?? true;
        const strictJsonSchema = groqOptions?.strictJsonSchema ?? true;
        if (topK != null) warnings.push({
            type: "unsupported",
            feature: "topK"
        });
        if (responseFormat?.type === "json" && responseFormat.schema != null && !structuredOutputs && jsonResponseTool == null) warnings.push({
            type: "unsupported",
            feature: "responseFormat",
            details: "JSON response format schema is only supported with structuredOutputs"
        });
        const { tools: groqTools, toolChoice: groqToolChoice, toolWarnings } = prepareTools({
            tools: jsonResponseTool != null ? [
                ...tools ?? [],
                jsonResponseTool
            ] : tools,
            toolChoice: jsonResponseTool == null ? toolChoice : toolChoice?.type === "tool" ? toolChoice : toolChoice?.type === "none" ? {
                type: "tool",
                toolName: jsonResponseTool.name
            } : {
                type: "required"
            },
            modelId: this.modelId
        });
        let reasoningEffort = groqOptions?.reasoningEffort;
        if (reasoningEffort == null && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["isCustomReasoning"])(reasoning)) {
            if (reasoning === "none") {
                if (this.modelId === "qwen/qwen3.6-27b") reasoningEffort = "none";
                else warnings.push({
                    type: "unsupported",
                    feature: "reasoning",
                    details: `reasoning "${reasoning}" is not supported by this model.`
                });
            } else reasoningEffort = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["mapReasoningToProviderEffort"])({
                reasoning,
                effortMap: {
                    minimal: "low",
                    low: "low",
                    medium: "medium",
                    high: "high",
                    xhigh: "high",
                    max: "high"
                },
                warnings
            });
        }
        return {
            args: {
                model: this.modelId,
                user: groqOptions?.user,
                parallel_tool_calls: jsonResponseTool != null ? false : groqOptions?.parallelToolCalls,
                max_tokens: maxOutputTokens,
                temperature,
                top_p: topP,
                frequency_penalty: frequencyPenalty,
                presence_penalty: presencePenalty,
                stop: stopSequences,
                seed,
                response_format: jsonResponseTool == null && responseFormat?.type === "json" ? structuredOutputs && responseFormat.schema != null ? {
                    type: "json_schema",
                    json_schema: {
                        schema: responseFormat.schema,
                        strict: strictJsonSchema,
                        name: responseFormat.name ?? "response",
                        description: responseFormat.description
                    }
                } : {
                    type: "json_object"
                } : void 0,
                reasoning_format: groqOptions?.reasoningFormat,
                reasoning_effort: reasoningEffort,
                service_tier: groqOptions?.serviceTier,
                messages: convertToGroqChatMessages(prompt),
                tools: groqTools,
                tool_choice: groqToolChoice
            },
            warnings: [
                ...warnings,
                ...toolWarnings
            ],
            jsonResponseToolName: jsonResponseTool?.name
        };
    }
    async doGenerate(options) {
        const { args, warnings, jsonResponseToolName } = await this.getArgs(options);
        const body = JSON.stringify(args);
        const { responseHeaders, value: response, rawValue: rawResponse } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
            url: this.config.url({
                path: "/chat/completions",
                modelId: this.modelId
            }),
            headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(this.config.headers?.(), options.headers),
            body: args,
            failedResponseHandler: groqFailedResponseHandler,
            successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(groqChatResponseSchema),
            abortSignal: options.abortSignal,
            fetch: this.config.fetch
        });
        const choice = response.choices[0];
        if (choice == null) throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["InvalidResponseDataError"]({
            data: rawResponse,
            message: "Response did not contain any choices."
        });
        const content = [];
        const text = choice.message.content;
        if (jsonResponseToolName == null && text != null && text.length > 0) content.push({
            type: "text",
            text
        });
        const reasoning = choice.message.reasoning;
        if (reasoning != null && reasoning.length > 0) content.push({
            type: "reasoning",
            text: reasoning
        });
        if (choice.message.tool_calls != null) for (const toolCall of choice.message.tool_calls)if (toolCall.function.name === jsonResponseToolName) content.push({
            type: "text",
            text: toolCall.function.arguments
        });
        else content.push({
            type: "tool-call",
            toolCallId: toolCall.id || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["generateId"])(),
            toolName: toolCall.function.name,
            input: toolCall.function.arguments
        });
        return {
            content,
            finishReason: {
                unified: jsonResponseToolName != null && content.some((part)=>part.type === "text") && !content.some((part)=>part.type === "tool-call") && choice.finish_reason === "tool_calls" ? "stop" : mapGroqFinishReason(choice.finish_reason),
                raw: choice.finish_reason ?? void 0
            },
            usage: convertGroqUsage(response.usage),
            response: {
                ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createLanguageModelResponseMetadata"])(response),
                headers: responseHeaders,
                body: rawResponse
            },
            warnings,
            request: {
                body
            }
        };
    }
    async doStream(options) {
        const { args, warnings, jsonResponseToolName } = await this.getArgs(options);
        const body = {
            ...args,
            stream: true
        };
        const { responseHeaders, value: response } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
            url: this.config.url({
                path: "/chat/completions",
                modelId: this.modelId
            }),
            headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(this.config.headers?.(), options.headers),
            body,
            failedResponseHandler: groqFailedResponseHandler,
            successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createEventSourceResponseHandler"])(groqChatChunkSchema),
            abortSignal: options.abortSignal,
            fetch: this.config.fetch
        });
        let toolCallTracker;
        let finishReason = {
            unified: "other",
            raw: void 0
        };
        let usage = void 0;
        let isFirstChunk = true;
        let isActiveText = false;
        let isActiveReasoning = false;
        const result = {
            stream: response.pipeThrough(new TransformStream({
                start (controller) {
                    toolCallTracker = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["StreamingToolCallTracker"](controller, {
                        generateId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["generateId"],
                        typeValidation: "required"
                    });
                    controller.enqueue({
                        type: "stream-start",
                        warnings
                    });
                },
                transform (chunk, controller) {
                    if (options.includeRawChunks) controller.enqueue({
                        type: "raw",
                        rawValue: chunk.rawValue
                    });
                    if (!chunk.success) {
                        finishReason = {
                            unified: "error",
                            raw: void 0
                        };
                        controller.enqueue({
                            type: "error",
                            error: chunk.error
                        });
                        return;
                    }
                    const value = chunk.value;
                    if ("error" in value) {
                        finishReason = {
                            unified: "error",
                            raw: void 0
                        };
                        controller.enqueue({
                            type: "error",
                            error: createGroqStreamError(value.error, value)
                        });
                        return;
                    }
                    if (isFirstChunk) {
                        isFirstChunk = false;
                        controller.enqueue({
                            type: "response-metadata",
                            ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createLanguageModelResponseMetadata"])(value)
                        });
                    }
                    if (value.x_groq?.usage != null) usage = value.x_groq.usage;
                    const choice = value.choices[0];
                    if (choice?.finish_reason != null) finishReason = {
                        unified: mapGroqFinishReason(choice.finish_reason),
                        raw: choice.finish_reason
                    };
                    if (choice?.delta == null) return;
                    const delta = choice.delta;
                    if (delta.reasoning != null && delta.reasoning.length > 0) {
                        if (!isActiveReasoning) {
                            controller.enqueue({
                                type: "reasoning-start",
                                id: "reasoning-0"
                            });
                            isActiveReasoning = true;
                        }
                        controller.enqueue({
                            type: "reasoning-delta",
                            id: "reasoning-0",
                            delta: delta.reasoning
                        });
                    }
                    if (delta.content != null && delta.content.length > 0) {
                        if (isActiveReasoning) {
                            controller.enqueue({
                                type: "reasoning-end",
                                id: "reasoning-0"
                            });
                            isActiveReasoning = false;
                        }
                        if (!isActiveText) {
                            controller.enqueue({
                                type: "text-start",
                                id: "txt-0"
                            });
                            isActiveText = true;
                        }
                        controller.enqueue({
                            type: "text-delta",
                            id: "txt-0",
                            delta: delta.content
                        });
                    }
                    if (delta.tool_calls != null && delta.tool_calls.length > 0) {
                        if (isActiveReasoning) {
                            controller.enqueue({
                                type: "reasoning-end",
                                id: "reasoning-0"
                            });
                            isActiveReasoning = false;
                        }
                        for (const toolCallDelta of delta.tool_calls)toolCallTracker.processDelta(toolCallDelta);
                    }
                },
                flush (controller) {
                    if (isActiveReasoning) controller.enqueue({
                        type: "reasoning-end",
                        id: "reasoning-0"
                    });
                    if (isActiveText) controller.enqueue({
                        type: "text-end",
                        id: "txt-0"
                    });
                    toolCallTracker.flush();
                    controller.enqueue({
                        type: "finish",
                        finishReason,
                        usage: convertGroqUsage(usage)
                    });
                }
            })),
            request: {
                body: JSON.stringify(body)
            },
            response: {
                headers: responseHeaders
            }
        };
        return {
            ...result,
            stream: jsonResponseToolName == null ? result.stream : result.stream.pipeThrough((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["convertJsonResponseToolStream"])(jsonResponseToolName))
        };
    }
};
const groqChatResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
    created: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().nullish(),
    model: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
    choices: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$array$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        message: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
            content: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
            reasoning: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
            tool_calls: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$array$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
                id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
                type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$literal$3e$__["z"].literal("function"),
                function: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
                    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string(),
                    arguments: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string()
                })
            })).nullish()
        }),
        index: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number(),
        finish_reason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish()
    })),
    usage: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        prompt_tokens: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().nullish(),
        completion_tokens: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().nullish(),
        total_tokens: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().nullish(),
        prompt_tokens_details: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
            cached_tokens: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().nullish()
        }).nullish(),
        completion_tokens_details: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
            reasoning_tokens: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().nullish()
        }).nullish()
    }).nullish()
});
const groqChatChunkSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$union$3e$__["z"].union([
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
        created: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().nullish(),
        model: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
        choices: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$array$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
            delta: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
                content: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
                reasoning: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
                tool_calls: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$array$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
                    index: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number(),
                    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
                    type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$literal$3e$__["z"].literal("function").optional(),
                    function: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
                        name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
                        arguments: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish()
                    })
                })).nullish()
            }).nullish(),
            finish_reason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullable().optional(),
            index: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number()
        })),
        x_groq: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
            usage: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
                prompt_tokens: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().nullish(),
                completion_tokens: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().nullish(),
                total_tokens: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().nullish(),
                prompt_tokens_details: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
                    cached_tokens: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().nullish()
                }).nullish(),
                completion_tokens_details: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
                    reasoning_tokens: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().nullish()
                }).nullish()
            }).nullish()
        }).nullish()
    }),
    groqErrorDataSchema
]);
//#endregion
//#region src/groq-transcription-model-options.ts
const groqTranscriptionModelOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        language: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
        prompt: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
        responseFormat: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
        temperature: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().min(0).max(1).nullish(),
        timestampGranularities: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$array$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string()).nullish()
    })));
//#endregion
//#region src/groq-transcription-model.ts
var GroqTranscriptionModel = class GroqTranscriptionModel {
    get provider() {
        return this.config.provider;
    }
    static [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WORKFLOW_SERIALIZE"]](model) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["serializeModelOptions"])({
            modelId: model.modelId,
            config: model.config
        });
    }
    static [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WORKFLOW_DESERIALIZE"]](options) {
        return new GroqTranscriptionModel(options.modelId, options.config);
    }
    constructor(modelId, config){
        this.modelId = modelId;
        this.config = config;
        this.specificationVersion = "v4";
    }
    async getArgs({ audio, mediaType, providerOptions }) {
        const warnings = [];
        const groqOptions = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["parseProviderOptions"])({
            provider: "groq",
            providerOptions,
            schema: groqTranscriptionModelOptions
        });
        const formData = new FormData();
        const blob = audio instanceof Uint8Array ? new Blob([
            audio
        ]) : new Blob([
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["convertBase64ToUint8Array"])(audio)
        ]);
        formData.append("model", this.modelId);
        const fileExtension = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["mediaTypeToExtension"])(mediaType);
        formData.append("file", new File([
            blob
        ], "audio", {
            type: mediaType
        }), `audio.${fileExtension}`);
        if (groqOptions) {
            const transcriptionModelOptions = {
                language: groqOptions.language ?? void 0,
                prompt: groqOptions.prompt ?? void 0,
                response_format: groqOptions.responseFormat ?? void 0,
                temperature: groqOptions.temperature ?? void 0,
                timestamp_granularities: groqOptions.timestampGranularities ?? void 0
            };
            for(const key in transcriptionModelOptions){
                const value = transcriptionModelOptions[key];
                if (value !== void 0) {
                    if (Array.isArray(value)) for (const item of value)formData.append(`${key}[]`, String(item));
                    else formData.append(key, String(value));
                }
            }
        }
        return {
            formData,
            responseFormat: groqOptions?.responseFormat,
            warnings
        };
    }
    async doGenerate(options) {
        const currentDate = this.config._internal?.currentDate?.() ?? /* @__PURE__ */ new Date();
        const { formData, responseFormat, warnings } = await this.getArgs(options);
        const successfulResponseHandler = responseFormat === "text" ? groqTextTranscriptionResponseHandler : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(groqTranscriptionResponseSchema);
        const { value: response, responseHeaders, rawValue: rawResponse } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postFormDataToApi"])({
            url: this.config.url({
                path: "/audio/transcriptions",
                modelId: this.modelId
            }),
            headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(this.config.headers?.(), options.headers),
            formData,
            failedResponseHandler: groqFailedResponseHandler,
            successfulResponseHandler,
            abortSignal: options.abortSignal,
            fetch: this.config.fetch
        });
        return {
            text: response.text,
            segments: response.segments?.map((segment)=>({
                    text: segment.text,
                    startSecond: segment.start,
                    endSecond: segment.end
                })) ?? response.words?.map((word)=>({
                    text: word.word,
                    startSecond: word.start,
                    endSecond: word.end
                })) ?? [],
            language: response.language ?? void 0,
            durationInSeconds: response.duration ?? void 0,
            warnings,
            response: {
                timestamp: currentDate,
                modelId: this.modelId,
                headers: responseHeaders,
                body: rawResponse
            }
        };
    }
};
const groqTranscriptionResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
    text: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string(),
    x_groq: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string()
    }),
    task: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
    language: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string().nullish(),
    duration: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number().nullish(),
    segments: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$array$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number(),
        seek: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number(),
        start: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number(),
        end: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number(),
        text: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string(),
        tokens: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$array$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number()),
        temperature: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number(),
        avg_logprob: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number(),
        compression_ratio: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number(),
        no_speech_prob: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number()
    })).nullish(),
    words: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$array$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({
        word: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$string$3e$__["z"].string(),
        start: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number(),
        end: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$number$3e$__["z"].number()
    })).nullish()
});
const binaryResponseHandler = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createBinaryResponseHandler"])();
const textDecoder = new TextDecoder();
const groqTextTranscriptionResponseHandler = async (options)=>{
    const { value, responseHeaders } = await binaryResponseHandler(options);
    const text = textDecoder.decode(value);
    return {
        value: {
            text
        },
        rawValue: text,
        responseHeaders
    };
};
//#endregion
//#region src/tool/browser-search.ts
/**
* Browser search tool for Groq models.
*
* Provides interactive browser search capabilities that go beyond traditional web search
* by navigating websites interactively and providing more detailed results.
*
* Currently supported on:
* - openai/gpt-oss-20b
* - openai/gpt-oss-120b
*
* @see https://console.groq.com/docs/browser-search
*/ const browserSearch = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createProviderExecutedToolFactory"])({
    id: "groq.browser_search",
    inputSchema: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({}))),
    outputSchema: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z__$2e$object$3e$__["z"].object({})))
});
//#endregion
//#region src/groq-tools.ts
const groqTools = {
    browserSearch
};
//#endregion
//#region src/version.ts
const VERSION = "4.0.57";
//#endregion
//#region src/groq-provider.ts
/**
* Create an Groq provider instance.
*/ function createGroq(options = {}) {
    const baseURL = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["withoutTrailingSlash"])(options.baseURL) ?? "https://api.groq.com/openai/v1";
    const getHeaders = ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["withUserAgentSuffix"])({
            Authorization: `Bearer ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["loadApiKey"])({
                apiKey: options.apiKey,
                environmentVariableName: "GROQ_API_KEY",
                description: "Groq"
            })}`,
            ...options.headers
        }, `ai-sdk-groq/${VERSION}`);
    const createChatModel = (modelId)=>new GroqChatLanguageModel(modelId, {
            provider: "groq.chat",
            url: ({ path })=>`${baseURL}${path}`,
            headers: getHeaders,
            fetch: options.fetch
        });
    const createLanguageModel = (modelId)=>{
        if (new.target) throw new Error("The Groq model function cannot be called with the new keyword.");
        return createChatModel(modelId);
    };
    const createTranscriptionModel = (modelId)=>{
        return new GroqTranscriptionModel(modelId, {
            provider: "groq.transcription",
            url: ({ path })=>`${baseURL}${path}`,
            headers: getHeaders,
            fetch: options.fetch
        });
    };
    const provider = function(modelId) {
        return createLanguageModel(modelId);
    };
    provider.specificationVersion = "v4";
    provider.languageModel = createLanguageModel;
    provider.chat = createChatModel;
    provider.embeddingModel = (modelId)=>{
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NoSuchModelError"]({
            modelId,
            modelType: "embeddingModel"
        });
    };
    provider.textEmbeddingModel = provider.embeddingModel;
    provider.imageModel = (modelId)=>{
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NoSuchModelError"]({
            modelId,
            modelType: "imageModel"
        });
    };
    provider.transcription = createTranscriptionModel;
    provider.transcriptionModel = createTranscriptionModel;
    provider.tools = groqTools;
    return provider;
}
/**
* Default Groq provider instance.
*/ const groq = createGroq();
;
}),
"[project]/node_modules/@ai-sdk/provider/dist/index.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AISDKError",
    ()=>AISDKError,
    "APICallError",
    ()=>APICallError,
    "EmptyResponseBodyError",
    ()=>EmptyResponseBodyError,
    "Experimental_DecisionRefusalError",
    ()=>DecisionRefusalError,
    "Experimental_DecisionUnsupportedQuestionTypeError",
    ()=>DecisionUnsupportedQuestionTypeError,
    "Experimental_EvaluationUnsupportedQuestionTypeError",
    ()=>Experimental_EvaluationUnsupportedQuestionTypeError,
    "InvalidArgumentError",
    ()=>InvalidArgumentError,
    "InvalidPromptError",
    ()=>InvalidPromptError,
    "InvalidResponseDataError",
    ()=>InvalidResponseDataError,
    "JSONParseError",
    ()=>JSONParseError,
    "LoadAPIKeyError",
    ()=>LoadAPIKeyError,
    "LoadSettingError",
    ()=>LoadSettingError,
    "NoContentGeneratedError",
    ()=>NoContentGeneratedError,
    "NoSuchModelError",
    ()=>NoSuchModelError,
    "NoSuchProviderReferenceError",
    ()=>NoSuchProviderReferenceError,
    "TooManyEmbeddingValuesForCallError",
    ()=>TooManyEmbeddingValuesForCallError,
    "TypeValidationError",
    ()=>TypeValidationError,
    "UnsupportedFunctionalityError",
    ()=>UnsupportedFunctionalityError,
    "getErrorMessage",
    ()=>getErrorMessage,
    "isJSONArray",
    ()=>isJSONArray,
    "isJSONObject",
    ()=>isJSONObject,
    "isJSONValue",
    ()=>isJSONValue
]);
//#region src/errors/ai-sdk-error.ts
/**
* Symbol used for identifying AI SDK Error instances.
* Enables checking if an error is an instance of AISDKError across package versions.
*/ const marker$16 = "vercel.ai.error";
const symbol$16 = Symbol.for(marker$16);
/**
* Custom error class for AI SDK related errors.
* @extends Error
*/ var AISDKError = class AISDKError extends Error {
    /**
	* Creates an AI SDK Error.
	*
	* @param {Object} params - The parameters for creating the error.
	* @param {string} params.name - The name of the error.
	* @param {string} params.message - The error message.
	* @param {unknown} [params.cause] - The underlying cause of the error.
	*/ constructor({ name, message, cause }){
        super(message);
        this[symbol$16] = true;
        this.name = name;
        this.cause = cause;
    }
    /**
	* Checks if the given error is an AI SDK Error.
	* @param {unknown} error - The error to check.
	* @returns {boolean} True if the error is an AI SDK Error, false otherwise.
	*/ static isInstance(error) {
        return AISDKError.hasMarker(error, marker$16);
    }
    static hasMarker(error, marker) {
        const markerSymbol = Symbol.for(marker);
        return error != null && typeof error === "object" && markerSymbol in error && typeof error[markerSymbol] === "boolean" && error[markerSymbol] === true;
    }
};
//#endregion
//#region src/errors/decision-unsupported-question-type-error.ts
const name$15 = "AI_DecisionUnsupportedQuestionTypeError";
const marker$15 = `vercel.ai.error.${name$15}`;
const symbol$15 = Symbol.for(marker$15);
/**
* A decision model does not support the type of a requested question.
*/ var DecisionUnsupportedQuestionTypeError = class extends AISDKError {
    constructor({ questionId, questionType, provider, modelId, message = `Question "${questionId}" has type "${questionType}", which is not supported by provider "${provider}" and model "${modelId}".` }){
        super({
            name: name$15,
            message
        });
        this[symbol$15] = true;
        this.questionId = questionId;
        this.questionType = questionType;
        this.provider = provider;
        this.modelId = modelId;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$15);
    }
};
//#endregion
//#region src/errors/api-call-error.ts
const name$14 = "AI_APICallError";
const marker$14 = `vercel.ai.error.${name$14}`;
const symbol$14 = Symbol.for(marker$14);
var APICallError = class extends AISDKError {
    constructor({ message, url, requestBodyValues, statusCode, responseHeaders, responseBody, cause, isRetryable = statusCode != null && (statusCode === 408 || statusCode === 409 || statusCode === 429 || statusCode >= 500), data }){
        super({
            name: name$14,
            message,
            cause
        });
        this[symbol$14] = true;
        this.url = url;
        this.requestBodyValues = requestBodyValues;
        this.statusCode = statusCode;
        this.responseHeaders = responseHeaders;
        this.responseBody = responseBody;
        this.isRetryable = isRetryable;
        this.data = data;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$14);
    }
};
//#endregion
//#region src/errors/empty-response-body-error.ts
const name$13 = "AI_EmptyResponseBodyError";
const marker$13 = `vercel.ai.error.${name$13}`;
const symbol$13 = Symbol.for(marker$13);
var EmptyResponseBodyError = class extends AISDKError {
    constructor({ message = "Empty response body" } = {}){
        super({
            name: name$13,
            message
        });
        this[symbol$13] = true;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$13);
    }
};
//#endregion
//#region src/errors/decision-refusal-error.ts
const name$12 = "AI_DecisionRefusalError";
const marker$12 = `vercel.ai.error.${name$12}`;
const symbol$12 = Symbol.for(marker$12);
/**
* A decision model declined to answer one or more questions.
*/ var DecisionRefusalError = class extends AISDKError {
    constructor({ questionIds, provider, modelId, message = `Decision model "${modelId}" from provider "${provider}" refused ${questionIds.length === 1 ? "question" : "questions"} ${questionIds.map((id)=>JSON.stringify(id)).join(", ")}.` }){
        super({
            name: name$12,
            message
        });
        this[symbol$12] = true;
        this.questionIds = questionIds;
        this.provider = provider;
        this.modelId = modelId;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$12);
    }
};
//#endregion
//#region src/errors/get-error-message.ts
function getErrorMessage(error) {
    if (error == null) return "unknown error";
    if (typeof error === "string") return error;
    if (error instanceof Error) return error.toString();
    return JSON.stringify(error);
}
//#endregion
//#region src/errors/invalid-argument-error.ts
const name$11 = "AI_InvalidArgumentError";
const marker$11 = `vercel.ai.error.${name$11}`;
const symbol$11 = Symbol.for(marker$11);
/**
* A function argument is invalid.
*/ var InvalidArgumentError = class extends AISDKError {
    constructor({ message, cause, argument }){
        super({
            name: name$11,
            message,
            cause
        });
        this[symbol$11] = true;
        this.argument = argument;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$11);
    }
};
//#endregion
//#region src/errors/invalid-prompt-error.ts
const name$10 = "AI_InvalidPromptError";
const marker$10 = `vercel.ai.error.${name$10}`;
const symbol$10 = Symbol.for(marker$10);
/**
* A prompt is invalid. This error should be thrown by providers when they cannot
* process a prompt.
*/ var InvalidPromptError = class extends AISDKError {
    constructor({ prompt, message, cause }){
        super({
            name: name$10,
            message: `Invalid prompt: ${message}`,
            cause
        });
        this[symbol$10] = true;
        this.prompt = prompt;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$10);
    }
};
//#endregion
//#region src/errors/invalid-response-data-error.ts
const name$9 = "AI_InvalidResponseDataError";
const marker$9 = `vercel.ai.error.${name$9}`;
const symbol$9 = Symbol.for(marker$9);
/**
* Server returned a response with invalid data content.
* This should be thrown by providers when they cannot parse the response from the API.
*/ var InvalidResponseDataError = class extends AISDKError {
    constructor({ data, message = `Invalid response data: ${JSON.stringify(data)}.` }){
        super({
            name: name$9,
            message
        });
        this[symbol$9] = true;
        this.data = data;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$9);
    }
};
//#endregion
//#region src/errors/json-parse-error.ts
const name$8 = "AI_JSONParseError";
const marker$8 = `vercel.ai.error.${name$8}`;
const symbol$8 = Symbol.for(marker$8);
var JSONParseError = class extends AISDKError {
    constructor({ text, cause }){
        super({
            name: name$8,
            message: `JSON parsing failed: Text: ${text}.\nError message: ${getErrorMessage(cause)}`,
            cause
        });
        this[symbol$8] = true;
        this.text = text;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$8);
    }
};
//#endregion
//#region src/errors/load-api-key-error.ts
const name$7 = "AI_LoadAPIKeyError";
const marker$7 = `vercel.ai.error.${name$7}`;
const symbol$7 = Symbol.for(marker$7);
var LoadAPIKeyError = class extends AISDKError {
    constructor({ message }){
        super({
            name: name$7,
            message
        });
        this[symbol$7] = true;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$7);
    }
};
//#endregion
//#region src/errors/load-setting-error.ts
const name$6 = "AI_LoadSettingError";
const marker$6 = `vercel.ai.error.${name$6}`;
const symbol$6 = Symbol.for(marker$6);
var LoadSettingError = class extends AISDKError {
    constructor({ message }){
        super({
            name: name$6,
            message
        });
        this[symbol$6] = true;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$6);
    }
};
//#endregion
//#region src/errors/no-content-generated-error.ts
const name$5 = "AI_NoContentGeneratedError";
const marker$5 = `vercel.ai.error.${name$5}`;
const symbol$5 = Symbol.for(marker$5);
/**
* Thrown when the AI provider fails to generate any content.
*/ var NoContentGeneratedError = class extends AISDKError {
    constructor({ message = "No content generated." } = {}){
        super({
            name: name$5,
            message
        });
        this[symbol$5] = true;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$5);
    }
};
//#endregion
//#region src/errors/no-such-model-error.ts
const name$4 = "AI_NoSuchModelError";
const marker$4 = `vercel.ai.error.${name$4}`;
const symbol$4 = Symbol.for(marker$4);
var NoSuchModelError = class extends AISDKError {
    constructor({ errorName = name$4, modelId, modelType, message = `No such ${modelType}: ${modelId}` }){
        super({
            name: errorName,
            message
        });
        this[symbol$4] = true;
        this.modelId = modelId;
        this.modelType = modelType;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$4);
    }
};
//#endregion
//#region src/errors/no-such-provider-reference-error.ts
const name$3 = "AI_NoSuchProviderReferenceError";
const marker$3 = `vercel.ai.error.${name$3}`;
const symbol$3 = Symbol.for(marker$3);
/**
* Thrown when a provider reference cannot be resolved because the specified
* provider is not found in the provider reference mapping.
*/ var NoSuchProviderReferenceError = class extends AISDKError {
    constructor({ provider, reference, message = `No provider reference found for provider '${provider}'. Available providers: ${Object.keys(reference).join(", ")}` }){
        super({
            name: name$3,
            message
        });
        this[symbol$3] = true;
        this.provider = provider;
        this.reference = reference;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$3);
    }
};
//#endregion
//#region src/errors/too-many-embedding-values-for-call-error.ts
const name$2 = "AI_TooManyEmbeddingValuesForCallError";
const marker$2 = `vercel.ai.error.${name$2}`;
const symbol$2 = Symbol.for(marker$2);
var TooManyEmbeddingValuesForCallError = class extends AISDKError {
    constructor(options){
        super({
            name: name$2,
            message: `Too many values for a single embedding call. The ${options.provider} model "${options.modelId}" can only embed up to ${options.maxEmbeddingsPerCall} values per call, but ${options.values.length} values were provided.`
        });
        this[symbol$2] = true;
        this.provider = options.provider;
        this.modelId = options.modelId;
        this.maxEmbeddingsPerCall = options.maxEmbeddingsPerCall;
        this.values = options.values;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$2);
    }
};
//#endregion
//#region src/errors/type-validation-error.ts
const name$1 = "AI_TypeValidationError";
const marker$1 = `vercel.ai.error.${name$1}`;
const symbol$1 = Symbol.for(marker$1);
var TypeValidationError = class TypeValidationError extends AISDKError {
    constructor({ value, cause, context }){
        let contextPrefix = "Type validation failed";
        if (context?.field) contextPrefix += ` for ${context.field}`;
        if (context?.entityName || context?.entityId) {
            contextPrefix += " (";
            const parts = [];
            if (context.entityName) parts.push(context.entityName);
            if (context.entityId) parts.push(`id: "${context.entityId}"`);
            contextPrefix += parts.join(", ");
            contextPrefix += ")";
        }
        super({
            name: name$1,
            message: `${contextPrefix}: Value: ${JSON.stringify(value)}.\nError message: ${getErrorMessage(cause)}`,
            cause
        });
        this[symbol$1] = true;
        this.value = value;
        this.context = context;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker$1);
    }
    /**
	* Wraps an error into a TypeValidationError.
	* If the cause is already a TypeValidationError with the same value and context, it returns the cause.
	* Otherwise, it creates a new TypeValidationError.
	*
	* @param {Object} params - The parameters for wrapping the error.
	* @param {unknown} params.value - The value that failed validation.
	* @param {unknown} params.cause - The original error or cause of the validation failure.
	* @param {TypeValidationContext} params.context - Optional context about what is being validated.
	* @returns {TypeValidationError} A TypeValidationError instance.
	*/ static wrap({ value, cause, context }) {
        if (TypeValidationError.isInstance(cause) && cause.value === value && cause.context?.field === context?.field && cause.context?.entityName === context?.entityName && cause.context?.entityId === context?.entityId) return cause;
        return new TypeValidationError({
            value,
            cause,
            context
        });
    }
};
//#endregion
//#region src/errors/unsupported-functionality-error.ts
const name = "AI_UnsupportedFunctionalityError";
const marker = `vercel.ai.error.${name}`;
const symbol = Symbol.for(marker);
var UnsupportedFunctionalityError = class extends AISDKError {
    constructor({ functionality, message = `'${functionality}' functionality not supported.` }){
        super({
            name,
            message
        });
        this[symbol] = true;
        this.functionality = functionality;
    }
    static isInstance(error) {
        return AISDKError.hasMarker(error, marker);
    }
};
//#endregion
//#region src/errors/index.ts
/** @deprecated Use `Experimental_DecisionUnsupportedQuestionTypeError` instead. */ const Experimental_EvaluationUnsupportedQuestionTypeError = DecisionUnsupportedQuestionTypeError;
//#endregion
//#region src/json-value/is-json.ts
function isJSONValue(value) {
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
    if (Array.isArray(value)) return value.every(isJSONValue);
    if (typeof value === "object") return Object.entries(value).every(([key, val])=>typeof key === "string" && (val === void 0 || isJSONValue(val)));
    return false;
}
function isJSONArray(value) {
    return Array.isArray(value) && value.every(isJSONValue);
}
function isJSONObject(value) {
    return value != null && typeof value === "object" && Object.entries(value).every(([key, val])=>typeof key === "string" && (val === void 0 || isJSONValue(val)));
}
;
}),
"[project]/node_modules/@vercel/oidc/dist/auth-config.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all)=>{
    for(var name in all)__defProp(target, name, {
        get: all[name],
        enumerable: true
    });
};
var __copyProps = (to, from, except, desc)=>{
    if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
            get: ()=>from[key],
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
    }
    return to;
};
var __toESM = (mod, isNodeMode, target)=>(target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(// If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
        value: mod,
        enumerable: true
    }) : target, mod));
var __toCommonJS = (mod)=>__copyProps(__defProp({}, "__esModule", {
        value: true
    }), mod);
var auth_config_exports = {};
__export(auth_config_exports, {
    isValidAccessToken: ()=>isValidAccessToken,
    readAuthConfig: ()=>readAuthConfig,
    writeAuthConfig: ()=>writeAuthConfig
});
module.exports = __toCommonJS(auth_config_exports);
var fs = __toESM(__turbopack_context__.r("[externals]/fs [external] (fs, cjs)"));
var path = __toESM(__turbopack_context__.r("[externals]/path [external] (path, cjs)"));
var import_token_util = __turbopack_context__.r("[project]/node_modules/@vercel/oidc/dist/token-util.js [app-route] (ecmascript)");
function getAuthConfigPath() {
    const dataDir = (0, import_token_util.getVercelDataDir)();
    if (!dataDir) {
        throw new Error(`Unable to find Vercel CLI data directory. Your platform: ${process.platform}. Supported: darwin, linux, win32.`);
    }
    return path.join(dataDir, "auth.json");
}
function readAuthConfig() {
    try {
        const authPath = getAuthConfigPath();
        if (!fs.existsSync(authPath)) {
            return null;
        }
        const content = fs.readFileSync(authPath, "utf8");
        if (!content) {
            return null;
        }
        return JSON.parse(content);
    } catch (error) {
        return null;
    }
}
function writeAuthConfig(config) {
    const authPath = getAuthConfigPath();
    const authDir = path.dirname(authPath);
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, {
            mode: 504,
            recursive: true
        });
    }
    fs.writeFileSync(authPath, JSON.stringify(config, null, 2), {
        mode: 384
    });
}
function isValidAccessToken(authConfig, expirationBufferMs = 0) {
    if (!authConfig.token) return false;
    if (typeof authConfig.expiresAt !== "number") return true;
    const nowInSeconds = Math.floor(Date.now() / 1e3);
    const bufferInSeconds = expirationBufferMs / 1e3;
    return authConfig.expiresAt >= nowInSeconds + bufferInSeconds;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
    isValidAccessToken,
    readAuthConfig,
    writeAuthConfig
});
}),
"[project]/node_modules/@vercel/oidc/dist/auth-errors.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all)=>{
    for(var name in all)__defProp(target, name, {
        get: all[name],
        enumerable: true
    });
};
var __copyProps = (to, from, except, desc)=>{
    if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
            get: ()=>from[key],
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
    }
    return to;
};
var __toCommonJS = (mod)=>__copyProps(__defProp({}, "__esModule", {
        value: true
    }), mod);
var auth_errors_exports = {};
__export(auth_errors_exports, {
    AccessTokenMissingError: ()=>AccessTokenMissingError,
    RefreshAccessTokenFailedError: ()=>RefreshAccessTokenFailedError
});
module.exports = __toCommonJS(auth_errors_exports);
class AccessTokenMissingError extends Error {
    constructor(){
        super("No authentication found. Please log in with the Vercel CLI (vercel login).");
        this.name = "AccessTokenMissingError";
    }
}
class RefreshAccessTokenFailedError extends Error {
    constructor(cause){
        super("Failed to refresh authentication token.", {
            cause
        });
        this.name = "RefreshAccessTokenFailedError";
    }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
    AccessTokenMissingError,
    RefreshAccessTokenFailedError
});
}),
"[project]/node_modules/@vercel/oidc/dist/get-context.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all)=>{
    for(var name in all)__defProp(target, name, {
        get: all[name],
        enumerable: true
    });
};
var __copyProps = (to, from, except, desc)=>{
    if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
            get: ()=>from[key],
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
    }
    return to;
};
var __toCommonJS = (mod)=>__copyProps(__defProp({}, "__esModule", {
        value: true
    }), mod);
var get_context_exports = {};
__export(get_context_exports, {
    SYMBOL_FOR_REQ_CONTEXT: ()=>SYMBOL_FOR_REQ_CONTEXT,
    getContext: ()=>getContext
});
module.exports = __toCommonJS(get_context_exports);
const SYMBOL_FOR_REQ_CONTEXT = Symbol.for("@vercel/request-context");
function getContext() {
    const fromSymbol = globalThis;
    return fromSymbol[SYMBOL_FOR_REQ_CONTEXT]?.get?.() ?? {};
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
    SYMBOL_FOR_REQ_CONTEXT,
    getContext
});
}),
"[project]/node_modules/@vercel/oidc/dist/get-vercel-oidc-token.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all)=>{
    for(var name in all)__defProp(target, name, {
        get: all[name],
        enumerable: true
    });
};
var __copyProps = (to, from, except, desc)=>{
    if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
            get: ()=>from[key],
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
    }
    return to;
};
var __toESM = (mod, isNodeMode, target)=>(target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(// If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
        value: mod,
        enumerable: true
    }) : target, mod));
var __toCommonJS = (mod)=>__copyProps(__defProp({}, "__esModule", {
        value: true
    }), mod);
var get_vercel_oidc_token_exports = {};
__export(get_vercel_oidc_token_exports, {
    getVercelOidcToken: ()=>getVercelOidcToken,
    getVercelOidcTokenSync: ()=>getVercelOidcTokenSync
});
module.exports = __toCommonJS(get_vercel_oidc_token_exports);
var import_get_context = __turbopack_context__.r("[project]/node_modules/@vercel/oidc/dist/get-context.js [app-route] (ecmascript)");
var import_token_error = __turbopack_context__.r("[project]/node_modules/@vercel/oidc/dist/token-error.js [app-route] (ecmascript)");
async function getVercelOidcToken(options) {
    let token = "";
    let err;
    try {
        token = getVercelOidcTokenSync();
    } catch (error) {
        err = error;
    }
    try {
        const [{ getTokenPayload, isExpired }, { refreshToken }] = await Promise.all([
            await __turbopack_context__.A("[project]/node_modules/@vercel/oidc/dist/token-util.js [app-route] (ecmascript, async loader)"),
            await __turbopack_context__.A("[project]/node_modules/@vercel/oidc/dist/token.js [app-route] (ecmascript, async loader)")
        ]);
        if (!token || isExpired(getTokenPayload(token), options?.expirationBufferMs)) {
            await refreshToken(options);
            token = getVercelOidcTokenSync();
        }
    } catch (error) {
        let message = err instanceof Error ? err.message : "";
        if (error instanceof Error) {
            message = `${message}
${error.message}`;
        }
        if (message) {
            throw new import_token_error.VercelOidcTokenError(message);
        }
        throw error;
    }
    return token;
}
function getVercelOidcTokenSync() {
    const token = (0, import_get_context.getContext)().headers?.["x-vercel-oidc-token"] ?? process.env.VERCEL_OIDC_TOKEN;
    if (!token) {
        throw new Error(`The 'x-vercel-oidc-token' header is missing from the request. Do you have the OIDC option enabled in the Vercel project settings?`);
    }
    return token;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
    getVercelOidcToken,
    getVercelOidcTokenSync
});
}),
"[project]/node_modules/@vercel/oidc/dist/index.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all)=>{
    for(var name in all)__defProp(target, name, {
        get: all[name],
        enumerable: true
    });
};
var __copyProps = (to, from, except, desc)=>{
    if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
            get: ()=>from[key],
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
    }
    return to;
};
var __toCommonJS = (mod)=>__copyProps(__defProp({}, "__esModule", {
        value: true
    }), mod);
var src_exports = {};
__export(src_exports, {
    AccessTokenMissingError: ()=>import_auth_errors.AccessTokenMissingError,
    RefreshAccessTokenFailedError: ()=>import_auth_errors.RefreshAccessTokenFailedError,
    getContext: ()=>import_get_context.getContext,
    getVercelOidcToken: ()=>import_get_vercel_oidc_token.getVercelOidcToken,
    getVercelOidcTokenSync: ()=>import_get_vercel_oidc_token.getVercelOidcTokenSync,
    getVercelToken: ()=>import_token_util.getVercelToken
});
module.exports = __toCommonJS(src_exports);
var import_get_vercel_oidc_token = __turbopack_context__.r("[project]/node_modules/@vercel/oidc/dist/get-vercel-oidc-token.js [app-route] (ecmascript)");
var import_get_context = __turbopack_context__.r("[project]/node_modules/@vercel/oidc/dist/get-context.js [app-route] (ecmascript)");
var import_auth_errors = __turbopack_context__.r("[project]/node_modules/@vercel/oidc/dist/auth-errors.js [app-route] (ecmascript)");
var import_token_util = __turbopack_context__.r("[project]/node_modules/@vercel/oidc/dist/token-util.js [app-route] (ecmascript)");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
    AccessTokenMissingError,
    RefreshAccessTokenFailedError,
    getContext,
    getVercelOidcToken,
    getVercelOidcTokenSync,
    getVercelToken
});
}),
"[project]/node_modules/@vercel/oidc/dist/oauth.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all)=>{
    for(var name in all)__defProp(target, name, {
        get: all[name],
        enumerable: true
    });
};
var __copyProps = (to, from, except, desc)=>{
    if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
            get: ()=>from[key],
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
    }
    return to;
};
var __toCommonJS = (mod)=>__copyProps(__defProp({}, "__esModule", {
        value: true
    }), mod);
var oauth_exports = {};
__export(oauth_exports, {
    processTokenResponse: ()=>processTokenResponse,
    refreshTokenRequest: ()=>refreshTokenRequest
});
module.exports = __toCommonJS(oauth_exports);
var import_os = __turbopack_context__.r("[externals]/os [external] (os, cjs)");
const VERCEL_ISSUER = "https://vercel.com";
const VERCEL_CLI_CLIENT_ID = "cl_HYyOPBNtFMfHhaUn9L4QPfTZz6TP47bp";
const userAgent = `@vercel/oidc node-${process.version} ${(0, import_os.platform)()} (${(0, import_os.arch)()}) ${(0, import_os.hostname)()}`;
let _tokenEndpoint = null;
async function getTokenEndpoint() {
    if (_tokenEndpoint) {
        return _tokenEndpoint;
    }
    const discoveryUrl = `${VERCEL_ISSUER}/.well-known/openid-configuration`;
    const response = await fetch(discoveryUrl, {
        headers: {
            "user-agent": userAgent
        }
    });
    if (!response.ok) {
        throw new Error("Failed to discover OAuth endpoints");
    }
    const metadata = await response.json();
    if (!metadata || typeof metadata.token_endpoint !== "string") {
        throw new Error("Invalid OAuth discovery response");
    }
    const endpoint = metadata.token_endpoint;
    _tokenEndpoint = endpoint;
    return endpoint;
}
async function refreshTokenRequest(options) {
    const tokenEndpoint = await getTokenEndpoint();
    return await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "user-agent": userAgent
        },
        body: new URLSearchParams({
            client_id: VERCEL_CLI_CLIENT_ID,
            grant_type: "refresh_token",
            ...options
        })
    });
}
async function processTokenResponse(response) {
    const json = await response.json();
    if (!response.ok) {
        const errorMsg = typeof json === "object" && json && "error" in json ? String(json.error) : "Token refresh failed";
        return [
            new Error(errorMsg)
        ];
    }
    if (typeof json !== "object" || json === null) {
        return [
            new Error("Invalid token response")
        ];
    }
    if (typeof json.access_token !== "string") {
        return [
            new Error("Missing access_token in response")
        ];
    }
    if (json.token_type !== "Bearer") {
        return [
            new Error("Invalid token_type in response")
        ];
    }
    if (typeof json.expires_in !== "number") {
        return [
            new Error("Missing expires_in in response")
        ];
    }
    return [
        null,
        json
    ];
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
    processTokenResponse,
    refreshTokenRequest
});
}),
"[project]/node_modules/@vercel/oidc/dist/token-error.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all)=>{
    for(var name in all)__defProp(target, name, {
        get: all[name],
        enumerable: true
    });
};
var __copyProps = (to, from, except, desc)=>{
    if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
            get: ()=>from[key],
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
    }
    return to;
};
var __toCommonJS = (mod)=>__copyProps(__defProp({}, "__esModule", {
        value: true
    }), mod);
var token_error_exports = {};
__export(token_error_exports, {
    VercelOidcTokenError: ()=>VercelOidcTokenError
});
module.exports = __toCommonJS(token_error_exports);
class VercelOidcTokenError extends Error {
    constructor(message, cause){
        super(message);
        this.name = "VercelOidcTokenError";
        this.cause = cause;
    }
    toString() {
        if (this.cause) {
            return `${this.name}: ${this.message}: ${this.cause}`;
        }
        return `${this.name}: ${this.message}`;
    }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
    VercelOidcTokenError
});
}),
"[project]/node_modules/@vercel/oidc/dist/token-io.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all)=>{
    for(var name in all)__defProp(target, name, {
        get: all[name],
        enumerable: true
    });
};
var __copyProps = (to, from, except, desc)=>{
    if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
            get: ()=>from[key],
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
    }
    return to;
};
var __toESM = (mod, isNodeMode, target)=>(target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(// If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
        value: mod,
        enumerable: true
    }) : target, mod));
var __toCommonJS = (mod)=>__copyProps(__defProp({}, "__esModule", {
        value: true
    }), mod);
var token_io_exports = {};
__export(token_io_exports, {
    findRootDir: ()=>findRootDir,
    getUserDataDir: ()=>getUserDataDir
});
module.exports = __toCommonJS(token_io_exports);
var import_path = __toESM(__turbopack_context__.r("[externals]/path [external] (path, cjs)"));
var import_fs = __toESM(__turbopack_context__.r("[externals]/fs [external] (fs, cjs)"));
var import_os = __toESM(__turbopack_context__.r("[externals]/os [external] (os, cjs)"));
var import_token_error = __turbopack_context__.r("[project]/node_modules/@vercel/oidc/dist/token-error.js [app-route] (ecmascript)");
function findRootDir() {
    try {
        let dir = process.cwd();
        while(dir !== import_path.default.dirname(dir)){
            const pkgPath = import_path.default.join(dir, ".vercel");
            if (import_fs.default.existsSync(pkgPath)) {
                return dir;
            }
            dir = import_path.default.dirname(dir);
        }
    } catch (e) {
        throw new import_token_error.VercelOidcTokenError("Token refresh only supported in node server environments");
    }
    return null;
}
function getUserDataDir() {
    if (process.env.XDG_DATA_HOME) {
        return process.env.XDG_DATA_HOME;
    }
    switch(import_os.default.platform()){
        case "darwin":
            return import_path.default.join(import_os.default.homedir(), "Library/Application Support");
        case "linux":
            return import_path.default.join(import_os.default.homedir(), ".local/share");
        case "win32":
            if (process.env.LOCALAPPDATA) {
                return process.env.LOCALAPPDATA;
            }
            return null;
        default:
            return null;
    }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
    findRootDir,
    getUserDataDir
});
}),
"[project]/node_modules/@vercel/oidc/dist/token-util.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all)=>{
    for(var name in all)__defProp(target, name, {
        get: all[name],
        enumerable: true
    });
};
var __copyProps = (to, from, except, desc)=>{
    if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
            get: ()=>from[key],
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
    }
    return to;
};
var __toESM = (mod, isNodeMode, target)=>(target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(// If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
        value: mod,
        enumerable: true
    }) : target, mod));
var __toCommonJS = (mod)=>__copyProps(__defProp({}, "__esModule", {
        value: true
    }), mod);
var token_util_exports = {};
__export(token_util_exports, {
    assertVercelOidcTokenResponse: ()=>assertVercelOidcTokenResponse,
    findProjectInfo: ()=>findProjectInfo,
    getTokenPayload: ()=>getTokenPayload,
    getVercelDataDir: ()=>getVercelDataDir,
    getVercelOidcToken: ()=>getVercelOidcToken,
    getVercelToken: ()=>getVercelToken,
    isExpired: ()=>isExpired,
    loadToken: ()=>loadToken,
    saveToken: ()=>saveToken
});
module.exports = __toCommonJS(token_util_exports);
var path = __toESM(__turbopack_context__.r("[externals]/path [external] (path, cjs)"));
var fs = __toESM(__turbopack_context__.r("[externals]/fs [external] (fs, cjs)"));
var import_token_error = __turbopack_context__.r("[project]/node_modules/@vercel/oidc/dist/token-error.js [app-route] (ecmascript)");
var import_token_io = __turbopack_context__.r("[project]/node_modules/@vercel/oidc/dist/token-io.js [app-route] (ecmascript)");
var import_auth_config = __turbopack_context__.r("[project]/node_modules/@vercel/oidc/dist/auth-config.js [app-route] (ecmascript)");
var import_oauth = __turbopack_context__.r("[project]/node_modules/@vercel/oidc/dist/oauth.js [app-route] (ecmascript)");
var import_auth_errors = __turbopack_context__.r("[project]/node_modules/@vercel/oidc/dist/auth-errors.js [app-route] (ecmascript)");
function getVercelDataDir() {
    const vercelFolder = "com.vercel.cli";
    const dataDir = (0, import_token_io.getUserDataDir)();
    if (!dataDir) {
        return null;
    }
    return path.join(dataDir, vercelFolder);
}
async function getVercelToken(options) {
    const authConfig = (0, import_auth_config.readAuthConfig)();
    if (!authConfig?.token) {
        throw new import_auth_errors.AccessTokenMissingError();
    }
    if ((0, import_auth_config.isValidAccessToken)(authConfig, options?.expirationBufferMs)) {
        return authConfig.token;
    }
    if (!authConfig.refreshToken) {
        (0, import_auth_config.writeAuthConfig)({});
        throw new import_auth_errors.RefreshAccessTokenFailedError("No refresh token available");
    }
    try {
        const tokenResponse = await (0, import_oauth.refreshTokenRequest)({
            refresh_token: authConfig.refreshToken
        });
        const [tokensError, tokens] = await (0, import_oauth.processTokenResponse)(tokenResponse);
        if (tokensError || !tokens) {
            (0, import_auth_config.writeAuthConfig)({});
            throw new import_auth_errors.RefreshAccessTokenFailedError(tokensError);
        }
        const updatedConfig = {
            token: tokens.access_token,
            expiresAt: Math.floor(Date.now() / 1e3) + tokens.expires_in
        };
        if (tokens.refresh_token) {
            updatedConfig.refreshToken = tokens.refresh_token;
        }
        (0, import_auth_config.writeAuthConfig)(updatedConfig);
        return updatedConfig.token;
    } catch (error) {
        (0, import_auth_config.writeAuthConfig)({});
        if (error instanceof import_auth_errors.AccessTokenMissingError || error instanceof import_auth_errors.RefreshAccessTokenFailedError) {
            throw error;
        }
        throw new import_auth_errors.RefreshAccessTokenFailedError(error);
    }
}
async function getVercelOidcToken(authToken, projectId, teamId) {
    const url = `https://api.vercel.com/v1/projects/${projectId}/token?source=vercel-oidc-refresh${teamId ? `&teamId=${teamId}` : ""}`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${authToken}`
        }
    });
    if (!res.ok) {
        throw new import_token_error.VercelOidcTokenError(`Failed to refresh OIDC token: ${res.statusText}`);
    }
    const tokenRes = await res.json();
    assertVercelOidcTokenResponse(tokenRes);
    return tokenRes;
}
function assertVercelOidcTokenResponse(res) {
    if (!res || typeof res !== "object") {
        throw new TypeError("Vercel OIDC token is malformed. Expected an object. Please run `vc env pull` and try again");
    }
    if (!("token" in res) || typeof res.token !== "string") {
        throw new TypeError("Vercel OIDC token is malformed. Expected a string-valued token property. Please run `vc env pull` and try again");
    }
}
function findProjectInfo() {
    const dir = (0, import_token_io.findRootDir)();
    if (!dir) {
        throw new import_token_error.VercelOidcTokenError("Unable to find project root directory. Have you linked your project with `vc link?`");
    }
    const prjPath = path.join(dir, ".vercel", "project.json");
    if (!fs.existsSync(prjPath)) {
        throw new import_token_error.VercelOidcTokenError("project.json not found, have you linked your project with `vc link?`");
    }
    const prj = JSON.parse(fs.readFileSync(prjPath, "utf8"));
    if (typeof prj.projectId !== "string" && typeof prj.orgId !== "string") {
        throw new TypeError("Expected a string-valued projectId property. Try running `vc link` to re-link your project.");
    }
    return {
        projectId: prj.projectId,
        teamId: prj.orgId
    };
}
function saveToken(token, projectId) {
    const dir = (0, import_token_io.getUserDataDir)();
    if (!dir) {
        throw new import_token_error.VercelOidcTokenError("Unable to find user data directory. Please reach out to Vercel support.");
    }
    const tokenPath = path.join(dir, "com.vercel.token", `${projectId}.json`);
    const tokenJson = JSON.stringify(token);
    fs.mkdirSync(path.dirname(tokenPath), {
        mode: 504,
        recursive: true
    });
    fs.writeFileSync(tokenPath, tokenJson);
    fs.chmodSync(tokenPath, 432);
    return;
}
function loadToken(projectId) {
    const dir = (0, import_token_io.getUserDataDir)();
    if (!dir) {
        throw new import_token_error.VercelOidcTokenError("Unable to find user data directory. Please reach out to Vercel support.");
    }
    const tokenPath = path.join(dir, "com.vercel.token", `${projectId}.json`);
    if (!fs.existsSync(tokenPath)) {
        return null;
    }
    const token = JSON.parse(fs.readFileSync(tokenPath, "utf8"));
    assertVercelOidcTokenResponse(token);
    return token;
}
function getTokenPayload(token) {
    const tokenParts = token.split(".");
    if (tokenParts.length !== 3) {
        throw new import_token_error.VercelOidcTokenError("Invalid token. Please run `vc env pull` and try again");
    }
    const base64 = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}
function isExpired(token, bufferMs = 0) {
    return token.exp * 1e3 < Date.now() + bufferMs;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
    assertVercelOidcTokenResponse,
    findProjectInfo,
    getTokenPayload,
    getVercelDataDir,
    getVercelOidcToken,
    getVercelToken,
    isExpired,
    loadToken,
    saveToken
});
}),
"[project]/node_modules/@workflow/serde/dist/index.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Symbol used to define custom serialization for user-defined class instances.
 * The static method should accept an instance and return serializable data.
 *
 * @example
 * ```ts
 * import { WORKFLOW_SERIALIZE, WORKFLOW_DESERIALIZE } from '@workflow/serde';
 *
 * class MyClass {
 *   constructor(public value: string) {}
 *
 *   static [WORKFLOW_SERIALIZE](instance: MyClass) {
 *     return { value: instance.value };
 *   }
 *
 *   static [WORKFLOW_DESERIALIZE](data: { value: string }) {
 *     return new MyClass(data.value);
 *   }
 * }
 * ```
 */ __turbopack_context__.s([
    "WORKFLOW_DESERIALIZE",
    ()=>WORKFLOW_DESERIALIZE,
    "WORKFLOW_SERIALIZE",
    ()=>WORKFLOW_SERIALIZE
]);
const WORKFLOW_SERIALIZE = Symbol.for('workflow-serialize');
const WORKFLOW_DESERIALIZE = Symbol.for('workflow-deserialize');
}),
"[project]/node_modules/ajv-formats/dist/formats.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.formatNames = exports.fastFormats = exports.fullFormats = void 0;
function fmtDef(validate, compare) {
    return {
        validate,
        compare
    };
}
exports.fullFormats = {
    // date: http://tools.ietf.org/html/rfc3339#section-5.6
    date: fmtDef(date, compareDate),
    // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
    time: fmtDef(getTime(true), compareTime),
    "date-time": fmtDef(getDateTime(true), compareDateTime),
    "iso-time": fmtDef(getTime(), compareIsoTime),
    "iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
    // duration: https://tools.ietf.org/html/rfc3339#appendix-A
    duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
    uri,
    "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
    // uri-template: https://tools.ietf.org/html/rfc6570
    "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    // For the source: https://gist.github.com/dperini/729294
    // For test cases: https://mathiasbynens.be/demo/url-regex
    url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
    // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
    ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
    regex,
    // uuid: http://tools.ietf.org/html/rfc4122
    uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    // JSON-pointer: https://tools.ietf.org/html/rfc6901
    // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
    "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
    "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
    "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
    // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
    // byte: https://github.com/miguelmota/is-base64
    byte,
    // signed 32 bit integer
    int32: {
        type: "number",
        validate: validateInt32
    },
    // signed 64 bit integer
    int64: {
        type: "number",
        validate: validateInt64
    },
    // C-type float
    float: {
        type: "number",
        validate: validateNumber
    },
    // C-type double
    double: {
        type: "number",
        validate: validateNumber
    },
    // hint to the UI to hide input strings
    password: true,
    // unchecked string payload
    binary: true
};
exports.fastFormats = {
    ...exports.fullFormats,
    date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
    time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
    "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
    "iso-time": fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoTime),
    "iso-date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoDateTime),
    // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    // email (sources from jsen validator):
    // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
    // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
    email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
};
exports.formatNames = Object.keys(exports.fullFormats);
function isLeapYear(year) {
    // https://tools.ietf.org/html/rfc3339#appendix-C
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
const DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
const DAYS = [
    0,
    31,
    28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
];
function date(str) {
    // full-date from http://tools.ietf.org/html/rfc3339#section-5.6
    const matches = DATE.exec(str);
    if (!matches) return false;
    const year = +matches[1];
    const month = +matches[2];
    const day = +matches[3];
    return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
}
function compareDate(d1, d2) {
    if (!(d1 && d2)) return undefined;
    if (d1 > d2) return 1;
    if (d1 < d2) return -1;
    return 0;
}
const TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
function getTime(strictTimeZone) {
    return function time(str) {
        const matches = TIME.exec(str);
        if (!matches) return false;
        const hr = +matches[1];
        const min = +matches[2];
        const sec = +matches[3];
        const tz = matches[4];
        const tzSign = matches[5] === "-" ? -1 : 1;
        const tzH = +(matches[6] || 0);
        const tzM = +(matches[7] || 0);
        if (tzH > 23 || tzM > 59 || strictTimeZone && !tz) return false;
        if (hr <= 23 && min <= 59 && sec < 60) return true;
        // leap second
        const utcMin = min - tzM * tzSign;
        const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
        return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
    };
}
function compareTime(s1, s2) {
    if (!(s1 && s2)) return undefined;
    const t1 = new Date("2020-01-01T" + s1).valueOf();
    const t2 = new Date("2020-01-01T" + s2).valueOf();
    if (!(t1 && t2)) return undefined;
    return t1 - t2;
}
function compareIsoTime(t1, t2) {
    if (!(t1 && t2)) return undefined;
    const a1 = TIME.exec(t1);
    const a2 = TIME.exec(t2);
    if (!(a1 && a2)) return undefined;
    t1 = a1[1] + a1[2] + a1[3];
    t2 = a2[1] + a2[2] + a2[3];
    if (t1 > t2) return 1;
    if (t1 < t2) return -1;
    return 0;
}
const DATE_TIME_SEPARATOR = /t|\s/i;
function getDateTime(strictTimeZone) {
    const time = getTime(strictTimeZone);
    return function date_time(str) {
        // http://tools.ietf.org/html/rfc3339#section-5.6
        const dateTime = str.split(DATE_TIME_SEPARATOR);
        return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1]);
    };
}
function compareDateTime(dt1, dt2) {
    if (!(dt1 && dt2)) return undefined;
    const d1 = new Date(dt1).valueOf();
    const d2 = new Date(dt2).valueOf();
    if (!(d1 && d2)) return undefined;
    return d1 - d2;
}
function compareIsoDateTime(dt1, dt2) {
    if (!(dt1 && dt2)) return undefined;
    const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
    const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
    const res = compareDate(d1, d2);
    if (res === undefined) return undefined;
    return res || compareTime(t1, t2);
}
const NOT_URI_FRAGMENT = /\/|:/;
const URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
function uri(str) {
    // http://jmrware.com/articles/2009/uri_regexp/URI_regex.html + optional protocol + required "."
    return NOT_URI_FRAGMENT.test(str) && URI.test(str);
}
const BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
function byte(str) {
    BYTE.lastIndex = 0;
    return BYTE.test(str);
}
const MIN_INT32 = -(2 ** 31);
const MAX_INT32 = 2 ** 31 - 1;
function validateInt32(value) {
    return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
}
function validateInt64(value) {
    // JSON and javascript max Int is 2**53, so any int that passes isInteger is valid for Int64
    return Number.isInteger(value);
}
function validateNumber() {
    return true;
}
const Z_ANCHOR = /[^\\]\\Z/;
function regex(str) {
    if (Z_ANCHOR.test(str)) return false;
    try {
        new RegExp(str);
        return true;
    } catch (e) {
        return false;
    }
}
}),
"[project]/node_modules/ajv-formats/dist/index.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
const formats_1 = __turbopack_context__.r("[project]/node_modules/ajv-formats/dist/formats.js [app-route] (ecmascript)");
const limit_1 = __turbopack_context__.r("[project]/node_modules/ajv-formats/dist/limit.js [app-route] (ecmascript)");
const codegen_1 = __turbopack_context__.r("[project]/node_modules/ajv/dist/compile/codegen/index.js [app-route] (ecmascript)");
const fullName = new codegen_1.Name("fullFormats");
const fastName = new codegen_1.Name("fastFormats");
const formatsPlugin = (ajv, opts = {
    keywords: true
})=>{
    if (Array.isArray(opts)) {
        addFormats(ajv, opts, formats_1.fullFormats, fullName);
        return ajv;
    }
    const [formats, exportName] = opts.mode === "fast" ? [
        formats_1.fastFormats,
        fastName
    ] : [
        formats_1.fullFormats,
        fullName
    ];
    const list = opts.formats || formats_1.formatNames;
    addFormats(ajv, list, formats, exportName);
    if (opts.keywords) (0, limit_1.default)(ajv);
    return ajv;
};
formatsPlugin.get = (name, mode = "full")=>{
    const formats = mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats;
    const f = formats[name];
    if (!f) throw new Error(`Unknown format "${name}"`);
    return f;
};
function addFormats(ajv, list, fs, exportName) {
    var _a;
    var _b;
    (_a = (_b = ajv.opts.code).formats) !== null && _a !== void 0 ? _a : _b.formats = (0, codegen_1._)`require("ajv-formats/dist/formats").${exportName}`;
    for (const f of list)ajv.addFormat(f, fs[f]);
}
module.exports = exports = formatsPlugin;
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = formatsPlugin;
}),
"[project]/node_modules/ajv-formats/dist/limit.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.formatLimitDefinition = void 0;
const ajv_1 = __turbopack_context__.r("[project]/node_modules/ajv/dist/ajv.js [app-route] (ecmascript)");
const codegen_1 = __turbopack_context__.r("[project]/node_modules/ajv/dist/compile/codegen/index.js [app-route] (ecmascript)");
const ops = codegen_1.operators;
const KWDs = {
    formatMaximum: {
        okStr: "<=",
        ok: ops.LTE,
        fail: ops.GT
    },
    formatMinimum: {
        okStr: ">=",
        ok: ops.GTE,
        fail: ops.LT
    },
    formatExclusiveMaximum: {
        okStr: "<",
        ok: ops.LT,
        fail: ops.GTE
    },
    formatExclusiveMinimum: {
        okStr: ">",
        ok: ops.GT,
        fail: ops.LTE
    }
};
const error = {
    message: ({ keyword, schemaCode })=>(0, codegen_1.str)`should be ${KWDs[keyword].okStr} ${schemaCode}`,
    params: ({ keyword, schemaCode })=>(0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
};
exports.formatLimitDefinition = {
    keyword: Object.keys(KWDs),
    type: "string",
    schemaType: "string",
    $data: true,
    error,
    code (cxt) {
        const { gen, data, schemaCode, keyword, it } = cxt;
        const { opts, self } = it;
        if (!opts.validateFormats) return;
        const fCxt = new ajv_1.KeywordCxt(it, self.RULES.all.format.definition, "format");
        if (fCxt.$data) validate$DataFormat();
        else validateFormat();
        function validate$DataFormat() {
            const fmts = gen.scopeValue("formats", {
                ref: self.formats,
                code: opts.code.formats
            });
            const fmt = gen.const("fmt", (0, codegen_1._)`${fmts}[${fCxt.schemaCode}]`);
            cxt.fail$data((0, codegen_1.or)((0, codegen_1._)`typeof ${fmt} != "object"`, (0, codegen_1._)`${fmt} instanceof RegExp`, (0, codegen_1._)`typeof ${fmt}.compare != "function"`, compareCode(fmt)));
        }
        function validateFormat() {
            const format = fCxt.schema;
            const fmtDef = self.formats[format];
            if (!fmtDef || fmtDef === true) return;
            if (typeof fmtDef != "object" || fmtDef instanceof RegExp || typeof fmtDef.compare != "function") {
                throw new Error(`"${keyword}": format "${format}" does not define "compare" function`);
            }
            const fmt = gen.scopeValue("formats", {
                key: format,
                ref: fmtDef,
                code: opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(format)}` : undefined
            });
            cxt.fail$data(compareCode(fmt));
        }
        function compareCode(fmt) {
            return (0, codegen_1._)`${fmt}.compare(${data}, ${schemaCode}) ${KWDs[keyword].fail} 0`;
        }
    },
    dependencies: [
        "format"
    ]
};
const formatLimitPlugin = (ajv)=>{
    ajv.addKeyword(exports.formatLimitDefinition);
    return ajv;
};
exports.default = formatLimitPlugin;
}),
"[project]/node_modules/content-type/index.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/*!
 * content-type
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */ /**
 * RegExp to match *( ";" parameter ) in RFC 7231 sec 3.1.1.1
 *
 * parameter     = token "=" ( token / quoted-string )
 * token         = 1*tchar
 * tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
 *               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
 *               / DIGIT / ALPHA
 *               ; any VCHAR, except delimiters
 * quoted-string = DQUOTE *( qdtext / quoted-pair ) DQUOTE
 * qdtext        = HTAB / SP / %x21 / %x23-5B / %x5D-7E / obs-text
 * obs-text      = %x80-FF
 * quoted-pair   = "\" ( HTAB / SP / VCHAR / obs-text )
 */ var PARAM_REGEXP = /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g // eslint-disable-line no-control-regex
;
var TEXT_REGEXP = /^[\u000b\u0020-\u007e\u0080-\u00ff]+$/ // eslint-disable-line no-control-regex
;
var TOKEN_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
/**
 * RegExp to match quoted-pair in RFC 7230 sec 3.2.6
 *
 * quoted-pair = "\" ( HTAB / SP / VCHAR / obs-text )
 * obs-text    = %x80-FF
 */ var QESC_REGEXP = /\\([\u000b\u0020-\u00ff])/g // eslint-disable-line no-control-regex
;
/**
 * RegExp to match chars that must be quoted-pair in RFC 7230 sec 3.2.6
 */ var QUOTE_REGEXP = /([\\"])/g;
/**
 * RegExp to match type in RFC 7231 sec 3.1.1.1
 *
 * media-type = type "/" subtype
 * type       = token
 * subtype    = token
 */ var TYPE_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
/**
 * Module exports.
 * @public
 */ exports.format = format;
exports.parse = parse;
/**
 * Format object to media type.
 *
 * @param {object} obj
 * @return {string}
 * @public
 */ function format(obj) {
    if (!obj || typeof obj !== 'object') {
        throw new TypeError('argument obj is required');
    }
    var parameters = obj.parameters;
    var type = obj.type;
    if (!type || !TYPE_REGEXP.test(type)) {
        throw new TypeError('invalid type');
    }
    var string = type;
    // append parameters
    if (parameters && typeof parameters === 'object') {
        var param;
        var params = Object.keys(parameters).sort();
        for(var i = 0; i < params.length; i++){
            param = params[i];
            if (!TOKEN_REGEXP.test(param)) {
                throw new TypeError('invalid parameter name');
            }
            string += '; ' + param + '=' + qstring(parameters[param]);
        }
    }
    return string;
}
/**
 * Parse media type to object.
 *
 * @param {string|object} string
 * @return {Object}
 * @public
 */ function parse(string) {
    if (!string) {
        throw new TypeError('argument string is required');
    }
    // support req/res-like objects as argument
    var header = typeof string === 'object' ? getcontenttype(string) : string;
    if (typeof header !== 'string') {
        throw new TypeError('argument string is required to be a string');
    }
    var index = header.indexOf(';');
    var type = index !== -1 ? header.slice(0, index).trim() : header.trim();
    if (!TYPE_REGEXP.test(type)) {
        throw new TypeError('invalid media type');
    }
    var obj = new ContentType(type.toLowerCase());
    // parse parameters
    if (index !== -1) {
        var key;
        var match;
        var value;
        PARAM_REGEXP.lastIndex = index;
        while(match = PARAM_REGEXP.exec(header)){
            if (match.index !== index) {
                throw new TypeError('invalid parameter format');
            }
            index += match[0].length;
            key = match[1].toLowerCase();
            value = match[2];
            if (value.charCodeAt(0) === 0x22 /* " */ ) {
                // remove quotes
                value = value.slice(1, -1);
                // remove escapes
                if (value.indexOf('\\') !== -1) {
                    value = value.replace(QESC_REGEXP, '$1');
                }
            }
            obj.parameters[key] = value;
        }
        if (index !== header.length) {
            throw new TypeError('invalid parameter format');
        }
    }
    return obj;
}
/**
 * Get content-type from req/res objects.
 *
 * @param {object}
 * @return {Object}
 * @private
 */ function getcontenttype(obj) {
    var header;
    if (typeof obj.getHeader === 'function') {
        // res-like
        header = obj.getHeader('content-type');
    } else if (typeof obj.headers === 'object') {
        // req-like
        header = obj.headers && obj.headers['content-type'];
    }
    if (typeof header !== 'string') {
        throw new TypeError('content-type header is missing from object');
    }
    return header;
}
/**
 * Quote a string if necessary.
 *
 * @param {string} val
 * @return {string}
 * @private
 */ function qstring(val) {
    var str = String(val);
    // no need to quote tokens
    if (TOKEN_REGEXP.test(str)) {
        return str;
    }
    if (str.length > 0 && !TEXT_REGEXP.test(str)) {
        throw new TypeError('invalid parameter value');
    }
    return '"' + str.replace(QUOTE_REGEXP, '\\$1') + '"';
}
/**
 * Class to represent a content type.
 * @private
 */ function ContentType(type) {
    this.parameters = Object.create(null);
    this.type = type;
}
}),
"[project]/node_modules/eventsource-parser/dist/index.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ParseError",
    ()=>ParseError,
    "createParser",
    ()=>createParser
]);
class ParseError extends Error {
    constructor(message, options){
        super(message), this.name = "ParseError", this.type = options.type, this.field = options.field, this.value = options.value, this.line = options.line;
    }
}
const LF = 10, CR = 13, SPACE = 32;
function noop(_arg) {}
function createParser(config) {
    if (typeof config == "function") throw new TypeError("`config` must be an object, got a function instead. Did you mean `createParser({onEvent: fn})`?");
    const { onEvent = noop, onError = noop, onRetry = noop, onComment, maxBufferSize } = config, pendingFragments = [];
    let pendingFragmentsLength = 0, isFirstChunk = !0, id, data = "", dataLines = 0, eventType, terminated = !1;
    function feed(chunk) {
        if (terminated) throw new Error("Cannot feed parser: it was terminated after exceeding the configured max buffer size. Call `reset()` to resume parsing.");
        if (isFirstChunk && (isFirstChunk = !1, chunk.charCodeAt(0) === 239 && chunk.charCodeAt(1) === 187 && chunk.charCodeAt(2) === 191 && (chunk = chunk.slice(3))), pendingFragments.length === 0) {
            const trailing2 = processLines(chunk);
            trailing2 !== "" && (pendingFragments.push(trailing2), pendingFragmentsLength = trailing2.length), checkBufferSize();
            return;
        }
        if (chunk.indexOf(`
`) === -1 && chunk.indexOf("\r") === -1) {
            pendingFragments.push(chunk), pendingFragmentsLength += chunk.length, checkBufferSize();
            return;
        }
        pendingFragments.push(chunk);
        const input = pendingFragments.join("");
        pendingFragments.length = 0, pendingFragmentsLength = 0;
        const trailing = processLines(input);
        trailing !== "" && (pendingFragments.push(trailing), pendingFragmentsLength = trailing.length), checkBufferSize();
    }
    function checkBufferSize() {
        maxBufferSize !== void 0 && (pendingFragmentsLength + data.length <= maxBufferSize || (terminated = !0, pendingFragments.length = 0, pendingFragmentsLength = 0, id = void 0, data = "", dataLines = 0, eventType = void 0, onError(new ParseError(`Buffered data exceeded max buffer size of ${maxBufferSize} characters`, {
            type: "max-buffer-size-exceeded"
        }))));
    }
    function processLines(chunk) {
        let searchIndex = 0;
        if (chunk.indexOf("\r") === -1) {
            let lfIndex = chunk.indexOf(`
`, searchIndex);
            for(; lfIndex !== -1;){
                if (searchIndex === lfIndex) {
                    dataLines > 0 && onEvent({
                        id,
                        event: eventType,
                        data
                    }), id = void 0, data = "", dataLines = 0, eventType = void 0, searchIndex = lfIndex + 1, lfIndex = chunk.indexOf(`
`, searchIndex);
                    continue;
                }
                const firstCharCode = chunk.charCodeAt(searchIndex);
                if (isDataPrefix(chunk, searchIndex, firstCharCode)) {
                    const valueStart = chunk.charCodeAt(searchIndex + 5) === SPACE ? searchIndex + 6 : searchIndex + 5, value = chunk.slice(valueStart, lfIndex);
                    if (dataLines === 0 && chunk.charCodeAt(lfIndex + 1) === LF) {
                        onEvent({
                            id,
                            event: eventType,
                            data: value
                        }), id = void 0, data = "", eventType = void 0, searchIndex = lfIndex + 2, lfIndex = chunk.indexOf(`
`, searchIndex);
                        continue;
                    }
                    data = dataLines === 0 ? value : `${data}
${value}`, dataLines++;
                } else isEventPrefix(chunk, searchIndex, firstCharCode) ? eventType = chunk.slice(chunk.charCodeAt(searchIndex + 6) === SPACE ? searchIndex + 7 : searchIndex + 6, lfIndex) || void 0 : parseLine(chunk, searchIndex, lfIndex);
                searchIndex = lfIndex + 1, lfIndex = chunk.indexOf(`
`, searchIndex);
            }
            return chunk.slice(searchIndex);
        }
        for(; searchIndex < chunk.length;){
            const crIndex = chunk.indexOf("\r", searchIndex), lfIndex = chunk.indexOf(`
`, searchIndex);
            let lineEnd = -1;
            if (crIndex !== -1 && lfIndex !== -1 ? lineEnd = crIndex < lfIndex ? crIndex : lfIndex : crIndex !== -1 ? crIndex === chunk.length - 1 ? lineEnd = -1 : lineEnd = crIndex : lfIndex !== -1 && (lineEnd = lfIndex), lineEnd === -1) break;
            parseLine(chunk, searchIndex, lineEnd), searchIndex = lineEnd + 1, chunk.charCodeAt(searchIndex - 1) === CR && chunk.charCodeAt(searchIndex) === LF && searchIndex++;
        }
        return chunk.slice(searchIndex);
    }
    function parseLine(chunk, start, end) {
        if (start === end) {
            dispatchEvent();
            return;
        }
        const firstCharCode = chunk.charCodeAt(start);
        if (isDataPrefix(chunk, start, firstCharCode)) {
            const valueStart = chunk.charCodeAt(start + 5) === SPACE ? start + 6 : start + 5, value2 = chunk.slice(valueStart, end);
            data = dataLines === 0 ? value2 : `${data}
${value2}`, dataLines++;
            return;
        }
        if (isEventPrefix(chunk, start, firstCharCode)) {
            eventType = chunk.slice(chunk.charCodeAt(start + 6) === SPACE ? start + 7 : start + 6, end) || void 0;
            return;
        }
        if (firstCharCode === 105 && chunk.charCodeAt(start + 1) === 100 && chunk.charCodeAt(start + 2) === 58) {
            const value2 = chunk.slice(chunk.charCodeAt(start + 3) === SPACE ? start + 4 : start + 3, end);
            value2.includes("\0") || (id = value2);
            return;
        }
        if (firstCharCode === 58) {
            if (onComment) {
                const line2 = chunk.slice(start, end);
                onComment(line2.slice(chunk.charCodeAt(start + 1) === SPACE ? 2 : 1));
            }
            return;
        }
        const line = chunk.slice(start, end), fieldSeparatorIndex = line.indexOf(":");
        if (fieldSeparatorIndex === -1) {
            processField(line, "", line);
            return;
        }
        const field = line.slice(0, fieldSeparatorIndex), offset = line.charCodeAt(fieldSeparatorIndex + 1) === SPACE ? 2 : 1, value = line.slice(fieldSeparatorIndex + offset);
        processField(field, value, line);
    }
    function processField(field, value, line) {
        switch(field){
            case "event":
                eventType = value || void 0;
                break;
            case "data":
                data = dataLines === 0 ? value : `${data}
${value}`, dataLines++;
                break;
            case "id":
                value.includes("\0") || (id = value);
                break;
            case "retry":
                /^\d+$/.test(value) ? onRetry(parseInt(value, 10)) : onError(new ParseError(`Invalid \`retry\` value: "${value}"`, {
                    type: "invalid-retry",
                    value,
                    line
                }));
                break;
            default:
                onError(new ParseError(`Unknown field "${field.length > 20 ? `${field.slice(0, 20)}\u2026` : field}"`, {
                    type: "unknown-field",
                    field,
                    value,
                    line
                }));
                break;
        }
    }
    function dispatchEvent() {
        dataLines > 0 && onEvent({
            id,
            event: eventType,
            data
        }), id = void 0, data = "", dataLines = 0, eventType = void 0;
    }
    function reset(options = {}) {
        if (options.consume && pendingFragments.length > 0) {
            const incompleteLine = pendingFragments.join("");
            parseLine(incompleteLine, 0, incompleteLine.length);
        }
        isFirstChunk = !0, id = void 0, data = "", dataLines = 0, eventType = void 0, pendingFragments.length = 0, pendingFragmentsLength = 0, terminated = !1;
    }
    return {
        feed,
        reset
    };
}
function isDataPrefix(chunk, i, firstCharCode) {
    return firstCharCode === 100 && chunk.charCodeAt(i + 1) === 97 && chunk.charCodeAt(i + 2) === 116 && chunk.charCodeAt(i + 3) === 97 && chunk.charCodeAt(i + 4) === 58;
}
function isEventPrefix(chunk, i, firstCharCode) {
    return firstCharCode === 101 && chunk.charCodeAt(i + 1) === 118 && chunk.charCodeAt(i + 2) === 101 && chunk.charCodeAt(i + 3) === 110 && chunk.charCodeAt(i + 4) === 116 && chunk.charCodeAt(i + 5) === 58;
}
;
}),
"[project]/node_modules/eventsource-parser/dist/stream.js [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EventSourceParserStream",
    ()=>EventSourceParserStream
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$eventsource$2d$parser$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/eventsource-parser/dist/index.js [app-route] (ecmascript)");
;
;
class EventSourceParserStream extends TransformStream {
    constructor({ onError, onRetry, onComment, maxBufferSize } = {}){
        let parser;
        super({
            start (controller) {
                parser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$eventsource$2d$parser$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createParser"])({
                    onEvent: (event)=>{
                        controller.enqueue(event);
                    },
                    onError (error) {
                        typeof onError == "function" && onError(error), (onError === "terminate" || error.type === "max-buffer-size-exceeded") && controller.error(error);
                    },
                    onRetry,
                    onComment,
                    maxBufferSize
                });
            },
            transform (chunk) {
                parser.feed(chunk);
            }
        });
    }
}
;
}),
"[project]/node_modules/fast-deep-equal/index.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// do not edit .js files directly - edit src/index.jst
module.exports = function equal(a, b) {
    if (a === b) return true;
    if (a && b && typeof a == 'object' && typeof b == 'object') {
        if (a.constructor !== b.constructor) return false;
        var length, i, keys;
        if (Array.isArray(a)) {
            length = a.length;
            if (length != b.length) return false;
            for(i = length; i-- !== 0;)if (!equal(a[i], b[i])) return false;
            return true;
        }
        if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
        if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
        if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length) return false;
        for(i = length; i-- !== 0;)if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
        for(i = length; i-- !== 0;){
            var key = keys[i];
            if (!equal(a[key], b[key])) return false;
        }
        return true;
    }
    // true if both NaN, false otherwise
    return a !== a && b !== b;
};
}),
"[project]/node_modules/fast-uri/index.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const { normalizeIPv6, removeDotSegments, recomposeAuthority, normalizePercentEncoding, normalizePathEncoding, serializePathEncoding, normalizeQueryFragmentEncoding, encodeQuery, encodeFragment, reescapeHostDelimiters, isIPv4, nonSimpleDomain } = __turbopack_context__.r("[project]/node_modules/fast-uri/lib/utils.js [app-route] (ecmascript)");
const { SCHEMES, getSchemeHandler } = __turbopack_context__.r("[project]/node_modules/fast-uri/lib/schemes.js [app-route] (ecmascript)");
const VALID_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*$/u;
const MALFORMED_SCHEME_ERROR = 'URI scheme is malformed.';
/**
 * @param {string} scheme
 * @returns {string}
 */ function decodeValidScheme(scheme) {
    const decodedScheme = unescape(String(scheme));
    if (!VALID_SCHEME.test(decodedScheme)) {
        throw new TypeError(MALFORMED_SCHEME_ERROR);
    }
    return decodedScheme;
}
/**
 * @template {import('./types/index').URIComponent|string} T
 * @param {T} uri
 * @param {import('./types/index').Options} [options]
 * @returns {T}
 */ function normalize(uri, options) {
    if (typeof uri === 'string') {
        uri = normalizeString(uri, options);
    } else if (typeof uri === 'object') {
        uri = parse(serialize(uri, options), options);
    }
    return uri;
}
/**
 * @param {string} baseURI
 * @param {string} relativeURI
 * @param {import('./types/index').Options} [options]
 * @returns {string}
 */ function resolve(baseURI, relativeURI, options) {
    const schemelessOptions = options ? Object.assign({
        scheme: 'null'
    }, options) : {
        scheme: 'null'
    };
    const { parsed: baseParsed, malformedAuthorityOrPort: baseMalformed, malformedPercentEncoding: baseMalformedPercentEncoding, malformedSchemeSpecific: baseMalformedSchemeSpecific, malformedHost: baseMalformedHost, malformedScheme: baseMalformedScheme } = parseWithStatus(baseURI, schemelessOptions);
    const { parsed: relativeParsed, malformedAuthorityOrPort: relativeMalformed, malformedPercentEncoding: relativeMalformedPercentEncoding, malformedSchemeSpecific: relativeMalformedSchemeSpecific, malformedHost: relativeMalformedHost, malformedScheme: relativeMalformedScheme } = parseWithStatus(relativeURI, schemelessOptions);
    if (baseMalformed || relativeMalformed || baseMalformedPercentEncoding || relativeMalformedPercentEncoding || baseMalformedSchemeSpecific || relativeMalformedSchemeSpecific || baseMalformedHost || relativeMalformedHost || baseMalformedScheme || relativeMalformedScheme) {
        throw new Error(baseParsed.error || relativeParsed.error || 'URI is malformed.');
    }
    const resolved = resolveComponent(baseParsed, relativeParsed, schemelessOptions, true);
    const resolvedSchemeHandler = getSchemeHandler(options && options.scheme || resolved.scheme);
    const resolvedHost = resolved.host;
    const resolvedHostIsIP = resolvedHost !== undefined && resolvedHost !== '' && (isIPv4(resolvedHost) || normalizeIPv6(resolvedHost).isIPV6);
    canonicalizeHost(resolved, options || {}, resolvedSchemeHandler, resolvedHostIsIP);
    // Percent escapes in an ASCII reg-name are encoded data. The WHATWG hostname
    // parser can reject them even though fast-uri preserves them safely as RFC
    // 3986 data. A raw non-ASCII host must still fail closed if conversion fails.
    const encodedASCIIHost = resolvedHost && resolvedHost.indexOf('%') !== -1 && !/\P{ASCII}/u.test(resolvedHost);
    if (resolved.error && !encodedASCIIHost) {
        throw new Error(resolved.error);
    }
    schemelessOptions.skipEscape = true;
    return serialize(resolved, schemelessOptions);
}
/**
 * @param {import ('./types/index').URIComponent} base
 * @param {import ('./types/index').URIComponent} relative
 * @param {import('./types/index').Options} [options]
 * @param {boolean} [skipNormalization=false]
 * @returns {import ('./types/index').URIComponent}
 */ function resolveComponent(base, relative, options, skipNormalization) {
    /** @type {import('./types/index').URIComponent} */ const target = {};
    if (!skipNormalization) {
        base = parse(serialize(base, options), options); // normalize base component
        relative = parse(serialize(relative, options), options); // normalize relative component
    }
    options = options || {};
    if (!options.tolerant && relative.scheme) {
        target.scheme = relative.scheme;
        // target.authority = relative.authority;
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || '');
        target.query = relative.query;
    } else {
        if (relative.userinfo !== undefined || relative.host !== undefined || relative.port !== undefined) {
            // target.authority = relative.authority;
            target.userinfo = relative.userinfo;
            target.host = relative.host;
            target.port = relative.port;
            target.path = removeDotSegments(relative.path || '');
            target.query = relative.query;
        } else {
            if (!relative.path) {
                target.path = base.path;
                if (relative.query !== undefined) {
                    target.query = relative.query;
                } else {
                    target.query = base.query;
                }
            } else {
                if (relative.path[0] === '/') {
                    target.path = removeDotSegments(relative.path);
                } else {
                    if ((base.userinfo !== undefined || base.host !== undefined || base.port !== undefined) && !base.path) {
                        target.path = '/' + relative.path;
                    } else if (!base.path) {
                        target.path = relative.path;
                    } else {
                        target.path = base.path.slice(0, base.path.lastIndexOf('/') + 1) + relative.path;
                    }
                    target.path = removeDotSegments(target.path);
                }
                target.query = relative.query;
            }
            // target.authority = base.authority;
            target.userinfo = base.userinfo;
            target.host = base.host;
            target.port = base.port;
        }
        target.scheme = base.scheme;
    }
    target.fragment = relative.fragment;
    return target;
}
/**
 * @param {import ('./types/index').URIComponent|string} uriA
 * @param {import ('./types/index').URIComponent|string} uriB
 * @param {import ('./types/index').Options} options
 * @returns {boolean}
 */ function equal(uriA, uriB, options) {
    const normalizedA = normalizeComparableURI(uriA, options);
    const normalizedB = normalizeComparableURI(uriB, options);
    return normalizedA !== undefined && normalizedB !== undefined && normalizedA === normalizedB;
}
/**
 * @param {Readonly<import('./types/index').URIComponent>} cmpts
 * @param {import('./types/index').Options} [opts]
 * @returns {string}
 */ function serialize(cmpts, opts) {
    const component = {
        host: cmpts.host,
        scheme: cmpts.scheme,
        userinfo: cmpts.userinfo,
        port: cmpts.port,
        path: cmpts.path,
        query: cmpts.query,
        nid: cmpts.nid,
        nss: cmpts.nss,
        uuid: cmpts.uuid,
        fragment: cmpts.fragment,
        reference: cmpts.reference,
        resourceName: cmpts.resourceName,
        secure: cmpts.secure,
        error: ''
    };
    const options = Object.assign({}, opts);
    const uriTokens = [];
    if (component.scheme) {
        component.scheme = decodeValidScheme(component.scheme);
    }
    // find scheme handler
    const schemeHandler = getSchemeHandler(options.scheme || component.scheme);
    // perform scheme specific serialization
    if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);
    const hasAuthority = component.userinfo !== undefined || component.host !== undefined || component.port !== undefined;
    const pathNoScheme = !options.skipEscape && component.scheme === undefined && !hasAuthority;
    if (component.path !== undefined) {
        if (!options.skipEscape) {
            component.path = serializePathEncoding(component.path, pathNoScheme);
        } else {
            component.path = normalizePercentEncoding(component.path);
        }
    }
    if (options.reference !== 'suffix' && component.scheme) {
        // Scheme handlers may replace the scheme during serialization.
        component.scheme = decodeValidScheme(component.scheme);
        uriTokens.push(component.scheme, ':');
    }
    const authority = recomposeAuthority(component);
    if (authority !== undefined) {
        if (options.reference !== 'suffix') {
            uriTokens.push('//');
        }
        uriTokens.push(authority);
        if (component.path && component.path[0] !== '/') {
            uriTokens.push('/');
        }
    }
    if (component.path !== undefined) {
        let s = component.path;
        if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
            s = removeDotSegments(s);
        }
        // Dot-segment removal can expose a colon that was not originally in the
        // first segment (for example, "./a:b"). Reapply path-noscheme encoding so
        // the serialized relative reference cannot be reparsed as a URI scheme.
        if (pathNoScheme) {
            s = serializePathEncoding(s, true);
        }
        if (authority === undefined && s[0] === '/' && s[1] === '/') {
            // don't allow the path to start with "//"
            s = '/%2F' + s.slice(2);
        }
        uriTokens.push(s);
    }
    if (component.query !== undefined) {
        uriTokens.push('?', encodeQuery(component.query));
    }
    if (component.fragment !== undefined) {
        uriTokens.push('#', encodeFragment(component.fragment));
    }
    return uriTokens.join('');
}
const URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
// Captures the authority component (between "//" and the next "/", "?" or "#"),
// with or without a scheme prefix, for the literal-backslash rejection below.
const AUTHORITY_PREFIX = /^(?:[^#/:?]+:)?\/\/([^/?#]*)/;
// Captures the leading authority-introducer region after an optional scheme: a
// run of forward slashes, backslashes, and the characters the WHATWG URL parser
// removes before parsing (TAB U+0009, LF U+000A, CR U+000D). A valid introducer
// is exactly "//". Node treats "\" as "/" on special schemes and strips those
// characters first, so forms like "\\", "/\", "\/", "/<TAB>/", or a leading
// "<TAB>//" reach an authority in Node while fast-uri's URI_PARSE folds them into
// the path group (host confusion / SSRF / redirect bypass).
const AUTHORITY_INTRODUCER_REGION = /^(?:[^#/:?]+:)?([/\\\t\n\r]*)/;
/**
 * @param {import('./types/index').URIComponent} parsed
 * @param {RegExpMatchArray} matches
 * @returns {string|undefined}
 */ function getParseError(parsed, matches) {
    if (matches[2] !== undefined && parsed.path && parsed.path[0] !== '/') {
        return 'URI path must start with "/" when authority is present.';
    }
    if (typeof parsed.port === 'number' && (parsed.port < 0 || parsed.port > 65535)) {
        return 'URI port is malformed.';
    }
    return undefined;
}
/**
 * Checks percent syntax without decoding the represented octets. RFC 3986
 * percent-encoding is byte-oriented, so sequences such as `%FF` are valid even
 * though they are not independently valid UTF-8.
 *
 * @param {string|undefined} component
 * @returns {boolean}
 */ function hasMalformedPercentEncoding(component) {
    if (component === undefined) return false;
    let percent = component.indexOf('%');
    while(percent !== -1){
        if (percent + 2 >= component.length || !/^[\da-f]{2}$/iu.test(component.slice(percent + 1, percent + 3))) {
            return true;
        }
        percent = component.indexOf('%', percent + 3);
    }
    return false;
}
/**
 * Whether the host is a bracketed IP literal (RFC 3986 `IP-literal`).
 * An unterminated `[` is not a literal, so it must still be validated as a
 * reg-name instead of being waved through as an IP.
 *
 * @param {string} host
 * @returns {boolean}
 */ function isIPLiteral(host) {
    return host[0] === '[' && host[host.length - 1] === ']';
}
/**
 * @param {RegExpMatchArray} matches
 * @returns {boolean}
 */ function hasMalformedComponentPercentEncoding(matches) {
    // Bracketed IP literals use a raw "%" as the zone separator for historical
    // compatibility. Their parsing is intentionally left to normalizeIPv6.
    const host = matches[4];
    return hasMalformedPercentEncoding(matches[3]) || host !== undefined && !isIPLiteral(host) && hasMalformedPercentEncoding(host) || hasMalformedPercentEncoding(matches[6]) || hasMalformedPercentEncoding(matches[7]) || hasMalformedPercentEncoding(matches[8]);
}
/**
 * @param {import('./types/index').URIComponent} parsed
 * @param {import('./types/index').Options} options
 * @param {{ domainHost?: boolean, unicodeSupport?: boolean }|undefined} schemeHandler
 * @param {boolean} isIP
 * @returns {boolean} whether host conversion failed
 */ function canonicalizeHost(parsed, options, schemeHandler, isIP) {
    if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport) && parsed.host && !isIPLiteral(parsed.host) && (options.domainHost || schemeHandler && schemeHandler.domainHost) && isIP === false && nonSimpleDomain(parsed.host)) {
        try {
            parsed.host = new URL('http://' + parsed.host).hostname;
        } catch (e) {
            parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
            return true;
        }
    }
    return false;
}
/**
 * @param {string} uri
 * @param {import('./types/index').Options} [opts]
 * @returns {{ parsed: import('./types/index').URIComponent, malformedAuthorityOrPort: boolean, malformedPercentEncoding: boolean, malformedSchemeSpecific: boolean, malformedHost: boolean, malformedScheme: boolean }}
 */ function parseWithStatus(uri, opts) {
    const options = Object.assign({}, opts);
    /** @type {import('./types/index').URIComponent} */ const parsed = {
        scheme: undefined,
        userinfo: undefined,
        host: '',
        port: undefined,
        path: '',
        query: undefined,
        fragment: undefined
    };
    let malformedAuthorityOrPort = false;
    let malformedPercentEncoding = false;
    let malformedSchemeSpecific = false;
    let malformedHost = false;
    let malformedIPLiteral = false;
    let malformedScheme = false;
    let isIP = false;
    if (options.reference === 'suffix') {
        if (options.scheme) {
            uri = options.scheme + ':' + uri;
        } else {
            uri = '//' + uri;
        }
    }
    // A literal backslash (U+005C) is not a valid RFC 3986 URI character and is
    // not an authority delimiter. Reject it in the authority rather than
    // rewriting it: normalizing "\" -> "/" (WHATWG error recovery) could silently
    // change the resource identified by an otherwise-invalid input, and lets "\"
    // act as a host delimiter here while Node's native URL parses a different
    // host (SSRF / redirect / origin-allowlist bypass). Percent-encoded %5C is
    // untouched and remains valid encoded data.
    const authorityMatch = uri.match(AUTHORITY_PREFIX);
    if (authorityMatch !== null && authorityMatch[1].indexOf('\\') !== -1) {
        parsed.error = 'URI authority must not contain a literal backslash.';
        malformedAuthorityOrPort = true;
    }
    // Reject a malformed or whitespace-smuggled authority introducer. fast-uri
    // only recognizes a literal "//"; anything else in the leading separator run
    // (a backslash, or a "//" that appears only after removing the TAB/LF/CR that
    // Node strips) means the authority fast-uri parses differs from the one Node's
    // URL resolves. Reject rather than rewrite, mirroring the literal-backslash
    // guard above. Percent-encoded forms (%5C, %09) are untouched, valid data.
    const introducerMatch = uri.match(AUTHORITY_INTRODUCER_REGION);
    if (introducerMatch !== null) {
        const region = introducerMatch[1];
        const normalizedRegion = region.replace(/[\t\n\r]/g, '');
        // Two or more leading separators introduce an authority.
        if (normalizedRegion.length >= 2) {
            if (normalizedRegion.slice(0, 2) !== '//') {
                parsed.error = parsed.error || 'URI authority must not contain a literal backslash.';
                malformedAuthorityOrPort = true;
            } else if (region.length !== normalizedRegion.length) {
                parsed.error = parsed.error || 'URI authority introducer must not contain whitespace.';
                malformedAuthorityOrPort = true;
            }
        }
    }
    const matches = uri.match(URI_PARSE);
    if (matches) {
        // store each component
        parsed.scheme = matches[1];
        parsed.userinfo = matches[3];
        parsed.host = matches[4];
        parsed.port = parseInt(matches[5], 10);
        parsed.path = matches[6] || '';
        parsed.query = matches[7];
        parsed.fragment = matches[8];
        if (parsed.scheme !== undefined) {
            const decodedScheme = unescape(parsed.scheme);
            if (VALID_SCHEME.test(decodedScheme)) {
                parsed.scheme = decodedScheme.toLowerCase();
            } else {
                parsed.error = parsed.error || MALFORMED_SCHEME_ERROR;
                malformedScheme = true;
            }
        }
        malformedPercentEncoding = hasMalformedComponentPercentEncoding(matches);
        if (malformedPercentEncoding) {
            parsed.error = parsed.error || 'URI contains malformed percent-encoding.';
        }
        // fix port number
        if (isNaN(parsed.port)) {
            parsed.port = matches[5];
        }
        const parseError = getParseError(parsed, matches);
        if (parseError !== undefined) {
            parsed.error = parsed.error || parseError;
            malformedAuthorityOrPort = true;
        }
        if (parsed.host) {
            const ipv4result = isIPv4(parsed.host);
            if (ipv4result === false) {
                const bracketedIPLiteral = isIPLiteral(parsed.host);
                const hasIPLiteralBracket = parsed.host.indexOf('[') !== -1 || parsed.host.indexOf(']') !== -1;
                const ipv6result = normalizeIPv6(parsed.host);
                isIP = ipv6result.isIPV6 || ipv6result.isIPVFuture === true;
                malformedIPLiteral = hasIPLiteralBracket && (!bracketedIPLiteral || ipv6result.error === true);
                parsed.host = isIP ? ipv6result.host : ipv6result.host.toLowerCase();
                if (malformedIPLiteral) {
                    parsed.error = parsed.error || 'URI host is malformed.';
                    malformedAuthorityOrPort = true;
                }
            } else {
                isIP = true;
            }
        }
        if (parsed.scheme === undefined && parsed.userinfo === undefined && parsed.host === undefined && parsed.port === undefined && parsed.query === undefined && !parsed.path) {
            parsed.reference = 'same-document';
        } else if (parsed.scheme === undefined) {
            parsed.reference = 'relative';
        } else if (parsed.fragment === undefined) {
            parsed.reference = 'absolute';
        } else {
            parsed.reference = 'uri';
        }
        // check for reference errors
        if (options.reference && options.reference !== 'suffix' && options.reference !== parsed.reference) {
            parsed.error = parsed.error || 'URI is not a ' + options.reference + ' reference.';
        }
        // find scheme handler
        const schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);
        // convert Unicode IDN -> ASCII IDN when the effective scheme uses domain hosts
        if (!malformedIPLiteral) {
            malformedHost = canonicalizeHost(parsed, options, schemeHandler, isIP);
        }
        if (uri.indexOf('%') !== -1 && parsed.host !== undefined && !malformedIPLiteral) {
            let host = isIP ? parsed.host : normalizePercentEncoding(parsed.host, true);
            if (!isIP) {
                // Fold reg-name case after decoding unreserved octets. The second
                // pass only restores uppercase hex in escapes that remain encoded.
                host = normalizePercentEncoding(host.toLowerCase());
            }
            parsed.host = reescapeHostDelimiters(host, isIP);
        }
        if (!schemeHandler || schemeHandler && !schemeHandler.skipNormalize) {
            if (parsed.path) {
                parsed.path = normalizePathEncoding(parsed.path);
            }
            if (parsed.query) {
                parsed.query = normalizeQueryFragmentEncoding(parsed.query);
            }
            if (parsed.fragment) {
                parsed.fragment = normalizeQueryFragmentEncoding(parsed.fragment);
            }
        }
        // perform scheme specific parsing
        if (schemeHandler && schemeHandler.parse) {
            schemeHandler.parse(parsed, options);
            if (schemeHandler === SCHEMES.urn && parsed.nid === undefined) {
                malformedSchemeSpecific = true;
            }
        }
    } else {
        parsed.error = parsed.error || 'URI can not be parsed.';
    }
    return {
        parsed,
        malformedAuthorityOrPort,
        malformedPercentEncoding,
        malformedSchemeSpecific,
        malformedHost,
        malformedScheme
    };
}
/**
 * @param {string} uri
 * @param {import('./types/index').Options} [opts]
 * @returns
 */ function parse(uri, opts) {
    return parseWithStatus(uri, opts).parsed;
}
/**
 * @param {string} uri
 * @param {import('./types/index').Options} [opts]
 * @returns {string}
 */ function normalizeString(uri, opts) {
    return normalizeStringWithStatus(uri, opts).normalized;
}
/**
 * @param {string} uri
 * @param {import('./types/index').Options} [opts]
 * @returns {{ normalized: string, malformedAuthorityOrPort: boolean, malformedPercentEncoding: boolean, malformedSchemeSpecific: boolean, malformedHost: boolean, malformedScheme: boolean }}
 */ function normalizeStringWithStatus(uri, opts) {
    const { parsed, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = parseWithStatus(uri, opts);
    return {
        normalized: malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? uri : serialize(parsed, opts),
        malformedAuthorityOrPort,
        malformedPercentEncoding,
        malformedSchemeSpecific,
        malformedHost,
        malformedScheme
    };
}
/**
 * @param {import ('./types/index').URIComponent|string} uri
 * @param {import('./types/index').Options} [opts]
 * @returns {string|undefined}
 */ function normalizeComparableURI(uri, opts) {
    if (typeof uri !== 'string' && typeof uri !== 'object') {
        return undefined;
    }
    let value;
    try {
        value = typeof uri === 'string' ? uri : serialize(uri, opts);
    } catch  {
        return undefined;
    }
    const { normalized, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = normalizeStringWithStatus(value, opts);
    return malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? undefined : normalized;
}
const fastUri = {
    SCHEMES,
    normalize,
    resolve,
    resolveComponent,
    equal,
    serialize,
    parse
};
module.exports = fastUri;
module.exports.default = fastUri;
module.exports.fastUri = fastUri;
}),
"[project]/node_modules/fast-uri/lib/schemes.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const { isUUID } = __turbopack_context__.r("[project]/node_modules/fast-uri/lib/utils.js [app-route] (ecmascript)");
const URN_REG = /^([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-./:;=@]|%[\da-f]{2})+)$/iu;
const supportedSchemeNames = [
    'http',
    'https',
    'ws',
    'wss',
    'urn',
    'urn:uuid'
];
/** @typedef {supportedSchemeNames[number]} SchemeName */ /**
 * @param {string} name
 * @returns {name is SchemeName}
 */ function isValidSchemeName(name) {
    return supportedSchemeNames.indexOf(name) !== -1;
}
/**
 * @callback SchemeFn
 * @param {import('../types/index').URIComponent} component
 * @param {import('../types/index').Options} options
 * @returns {import('../types/index').URIComponent}
 */ /**
 * @typedef {Object} SchemeHandler
 * @property {SchemeName} scheme - The scheme name.
 * @property {boolean} [domainHost] - Indicates if the scheme supports domain hosts.
 * @property {SchemeFn} parse - Function to parse the URI component for this scheme.
 * @property {SchemeFn} serialize - Function to serialize the URI component for this scheme.
 * @property {boolean} [skipNormalize] - Indicates if normalization should be skipped for this scheme.
 * @property {boolean} [absolutePath] - Indicates if the scheme uses absolute paths.
 * @property {boolean} [unicodeSupport] - Indicates if the scheme supports Unicode.
 */ /**
 * @param {import('../types/index').URIComponent} wsComponent
 * @returns {boolean}
 */ function wsIsSecure(wsComponent) {
    if (wsComponent.secure === true) {
        return true;
    } else if (wsComponent.secure === false) {
        return false;
    } else if (wsComponent.scheme) {
        return wsComponent.scheme.length === 3 && (wsComponent.scheme[0] === 'w' || wsComponent.scheme[0] === 'W') && (wsComponent.scheme[1] === 's' || wsComponent.scheme[1] === 'S') && (wsComponent.scheme[2] === 's' || wsComponent.scheme[2] === 'S');
    } else {
        return false;
    }
}
/** @type {SchemeFn} */ function httpParse(component) {
    if (!component.host) {
        component.error = component.error || 'HTTP URIs must have a host.';
    }
    return component;
}
/** @type {SchemeFn} */ function httpSerialize(component) {
    const secure = String(component.scheme).toLowerCase() === 'https';
    // normalize the default port
    if (component.port === (secure ? 443 : 80) || component.port === '') {
        component.port = undefined;
    }
    // normalize the empty path
    if (!component.path) {
        component.path = '/';
    }
    // NOTE: We do not parse query strings for HTTP URIs
    // as WWW Form Url Encoded query strings are part of the HTML4+ spec,
    // and not the HTTP spec.
    return component;
}
/** @type {SchemeFn} */ function wsParse(wsComponent) {
    // indicate if the secure flag is set
    wsComponent.secure = wsIsSecure(wsComponent);
    // construct resouce name
    wsComponent.resourceName = (wsComponent.path || '/') + (wsComponent.query ? '?' + wsComponent.query : '');
    wsComponent.path = undefined;
    wsComponent.query = undefined;
    return wsComponent;
}
/** @type {SchemeFn} */ function wsSerialize(wsComponent) {
    // normalize the default port
    if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === '') {
        wsComponent.port = undefined;
    }
    // ensure scheme matches secure flag
    if (typeof wsComponent.secure === 'boolean') {
        wsComponent.scheme = wsComponent.secure ? 'wss' : 'ws';
        wsComponent.secure = undefined;
    }
    // reconstruct path from resource name
    if (wsComponent.resourceName) {
        const queryIndex = wsComponent.resourceName.indexOf('?');
        const path = queryIndex === -1 ? wsComponent.resourceName : wsComponent.resourceName.slice(0, queryIndex);
        wsComponent.path = path && path !== '/' ? path : undefined;
        wsComponent.query = queryIndex === -1 ? undefined : wsComponent.resourceName.slice(queryIndex + 1);
        wsComponent.resourceName = undefined;
    }
    // forbid fragment component
    wsComponent.fragment = undefined;
    return wsComponent;
}
/** @type {SchemeFn} */ function urnParse(urnComponent, options) {
    if (!urnComponent.path) {
        urnComponent.error = 'URN can not be parsed';
        return urnComponent;
    }
    const matches = urnComponent.path.match(URN_REG);
    if (matches && matches[0] === urnComponent.path) {
        const scheme = options.scheme || urnComponent.scheme || 'urn';
        urnComponent.nid = matches[1].toLowerCase();
        urnComponent.nss = matches[2];
        const urnScheme = `${scheme}:${options.nid || urnComponent.nid}`;
        const schemeHandler = getSchemeHandler(urnScheme);
        urnComponent.path = undefined;
        if (schemeHandler) {
            urnComponent = schemeHandler.parse(urnComponent, options);
        }
    } else {
        urnComponent.error = urnComponent.error || 'URN can not be parsed.';
    }
    return urnComponent;
}
/** @type {SchemeFn} */ function urnSerialize(urnComponent, options) {
    if (urnComponent.nid === undefined) {
        throw new Error('URN without nid cannot be serialized');
    }
    const scheme = options.scheme || urnComponent.scheme || 'urn';
    const nid = urnComponent.nid.toLowerCase();
    const urnScheme = `${scheme}:${options.nid || nid}`;
    const schemeHandler = getSchemeHandler(urnScheme);
    if (schemeHandler) {
        urnComponent = schemeHandler.serialize(urnComponent, options);
    }
    const uriComponent = urnComponent;
    const nss = urnComponent.nss;
    uriComponent.path = `${nid || options.nid}:${nss}`;
    options.skipEscape = true;
    return uriComponent;
}
/** @type {SchemeFn} */ function urnuuidParse(urnComponent, options) {
    const uuidComponent = urnComponent;
    uuidComponent.uuid = uuidComponent.nss;
    uuidComponent.nss = undefined;
    if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid))) {
        uuidComponent.error = uuidComponent.error || 'UUID is not valid.';
    }
    return uuidComponent;
}
/** @type {SchemeFn} */ function urnuuidSerialize(uuidComponent) {
    const urnComponent = uuidComponent;
    // normalize UUID
    urnComponent.nss = (uuidComponent.uuid || '').toLowerCase();
    return urnComponent;
}
const http = {
    scheme: 'http',
    domainHost: true,
    parse: httpParse,
    serialize: httpSerialize
};
const https = {
    scheme: 'https',
    domainHost: http.domainHost,
    parse: httpParse,
    serialize: httpSerialize
};
const ws = {
    scheme: 'ws',
    domainHost: true,
    parse: wsParse,
    serialize: wsSerialize
};
const wss = {
    scheme: 'wss',
    domainHost: ws.domainHost,
    parse: ws.parse,
    serialize: ws.serialize
};
const urn = {
    scheme: 'urn',
    parse: urnParse,
    serialize: urnSerialize,
    skipNormalize: true
};
const urnuuid = {
    scheme: 'urn:uuid',
    parse: urnuuidParse,
    serialize: urnuuidSerialize,
    skipNormalize: true
};
const SCHEMES = {
    http,
    https,
    ws,
    wss,
    urn,
    'urn:uuid': urnuuid
};
Object.setPrototypeOf(SCHEMES, null);
/**
 * @param {string|undefined} scheme
 * @returns {SchemeHandler|undefined}
 */ function getSchemeHandler(scheme) {
    return scheme && (SCHEMES[scheme] || SCHEMES[scheme.toLowerCase()]) || undefined;
}
module.exports = {
    wsIsSecure,
    SCHEMES,
    isValidSchemeName,
    getSchemeHandler
};
}),
"[project]/node_modules/fast-uri/lib/utils.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/** @type {(value: string) => boolean} */ const isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);
/** @type {(value: string) => boolean} */ const isIPv4 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);
/** @type {(value: string) => boolean} */ const isPort = RegExp.prototype.test.bind(/^\d*$/u);
/** @type {(value: string) => boolean} */ const isHexPair = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu);
/** @type {(value: string) => boolean} */ const isUnreserved = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu);
/** @type {(value: string) => boolean} */ const isPathCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/]$/u);
/** @type {(value: string) => boolean} */ const isQueryFragmentCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/?]$/u);
/** @type {(value: string) => boolean} */ const isUserinfoCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:]$/u);
const BYTE_HEX = new Array(256);
{
    const HEX_DIGITS = '0123456789ABCDEF';
    for(let i = 0; i < 256; i++){
        BYTE_HEX[i] = '%' + HEX_DIGITS[i >> 4] + HEX_DIGITS[i & 0xF];
    }
}function percentEncodeNonAscii(cp) {
    if (cp < 0x800) {
        return BYTE_HEX[0xC0 | cp >> 6] + BYTE_HEX[0x80 | cp & 0x3F];
    }
    if (cp < 0x10000) {
        return BYTE_HEX[0xE0 | cp >> 12] + BYTE_HEX[0x80 | cp >> 6 & 0x3F] + BYTE_HEX[0x80 | cp & 0x3F];
    }
    return BYTE_HEX[0xF0 | cp >> 18] + BYTE_HEX[0x80 | cp >> 12 & 0x3F] + BYTE_HEX[0x80 | cp >> 6 & 0x3F] + BYTE_HEX[0x80 | cp & 0x3F];
}
/**
 * @param {Array<string>} input
 * @returns {string}
 */ function stringArrayToHexStripped(input) {
    let acc = '';
    let code = 0;
    let i = 0;
    for(i = 0; i < input.length; i++){
        code = input[i].charCodeAt(0);
        if (code === 48) {
            continue;
        }
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
            return '';
        }
        acc += input[i];
        break;
    }
    for(i += 1; i < input.length; i++){
        code = input[i].charCodeAt(0);
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
            return '';
        }
        acc += input[i];
    }
    return acc;
}
/** @type {(value: string) => boolean} */ const isHextet = RegExp.prototype.test.bind(/^[\dA-Fa-f]{1,4}$/);
/** @type {(value: string) => boolean} */ const isIPvFuture = RegExp.prototype.test.bind(/^[vV][\dA-Fa-f]+\.[A-Za-z\d\-._~!$&'()*+,;=:]+$/);
/** @type {(value: string) => boolean} */ const isZoneCharacter = RegExp.prototype.test.bind(/^[A-Za-z\d\-._~]$/);
/**
 * @param {string} value
 * @returns {boolean}
 */ const nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
/**
 * @param {string} zone
 * @returns {boolean}
 */ function isZoneIdentifier(zone) {
    if (zone.length === 0) return false;
    for(let i = 0; i < zone.length; i++){
        if (isZoneCharacter(zone[i])) continue;
        if (zone[i] === '%' && i + 2 < zone.length && isHexPair(zone.slice(i + 1, i + 3))) {
            i += 2;
            continue;
        }
        return false;
    }
    return true;
}
/**
 * Compresses the longest run of zero hextets to "::" per RFC 5952. A run of a
 * single zero hextet is left uncompressed. On ties the leftmost run wins.
 *
 * @param {string[]} hextets
 * @returns {string}
 */ function compressIPv6ZeroRun(hextets) {
    let bestStart = -1;
    let bestLength = 0;
    let runStart = -1;
    let runLength = 0;
    for(let i = 0; i < hextets.length; i++){
        if (hextets[i] === '0') {
            if (runStart === -1) runStart = i;
            runLength++;
            if (runLength > bestLength) {
                bestLength = runLength;
                bestStart = runStart;
            }
        } else {
            runStart = -1;
            runLength = 0;
        }
    }
    if (bestLength < 2) return hextets.join(':');
    const head = hextets.slice(0, bestStart).join(':');
    const tail = hextets.slice(bestStart + bestLength).join(':');
    return head + '::' + tail;
}
/**
 * Validates an IPv6 address against the alternatives in RFC 3986 section
 * 3.2.2 and returns the same address with leading hextet zeroes removed.
 * An embedded IPv4 address counts as two hextets and is only valid at the end.
 *
 * @param {string} input
 * @returns {string|undefined}
 */ function normalizeIPv6Address(input) {
    const compression = input.indexOf('::');
    if (compression !== -1 && input.indexOf('::', compression + 1) !== -1) return undefined;
    const left = compression === -1 ? input.split(':') : input.slice(0, compression).split(':');
    const right = compression === -1 ? [] : input.slice(compression + 2).split(':');
    if (compression !== -1) {
        if (left.length === 1 && left[0] === '') left.length = 0;
        if (right.length === 1 && right[0] === '') right.length = 0;
    }
    const parts = left.concat(right);
    let hextetCount = 0;
    for(let i = 0; i < parts.length; i++){
        const part = parts[i];
        if (part === '') return undefined;
        if (part.indexOf('.') !== -1) {
            if (i !== parts.length - 1 || compression !== -1 && right.length === 0 || !isIPv4(part)) return undefined;
            hextetCount += 2;
            continue;
        }
        if (!isHextet(part)) return undefined;
        parts[i] = parseInt(part, 16).toString(16);
        hextetCount++;
    }
    if (compression === -1) {
        if (hextetCount !== 8) return undefined;
        return compressIPv6ZeroRun(parts);
    }
    if (hextetCount >= 8) return undefined;
    // expand "::" then re-compress the longest run for a canonical result
    const expanded = parts.slice(0, left.length);
    for(let i = hextetCount; i < 8; i++)expanded.push('0');
    for(let i = left.length; i < parts.length; i++)expanded.push(parts[i]);
    return compressIPv6ZeroRun(expanded);
}
/**
 * @typedef {Object} NormalizeIPv6Result
 * @property {string} host - The normalized host.
 * @property {string} [escapedHost] - The escaped host.
 * @property {boolean} isIPV6 - Indicates if the host is an IPv6 address.
 * @property {boolean} [isIPVFuture] - Indicates if the host is an IPvFuture literal.
 * @property {boolean} [error] - Indicates if a bracketed IP literal is malformed.
 */ /**
 * Validates and normalizes a bracketed IP literal. Raw zone separators remain
 * accepted for backwards compatibility, while encoded separators and zone
 * contents follow RFC 6874.
 *
 * @param {string} host
 * @returns {NormalizeIPv6Result}
 */ function normalizeIPv6(host) {
    const bracketed = host[0] === '[' && host[host.length - 1] === ']';
    const hasBracket = host[0] === '[' || host[host.length - 1] === ']';
    if (hasBracket && !bracketed) return {
        host,
        isIPV6: false,
        error: true
    };
    let input = bracketed ? host.slice(1, -1) : host;
    if (bracketed && isIPvFuture(input)) {
        input = input.toLowerCase();
        return {
            host: `[${input}]`,
            escapedHost: input,
            isIPV6: false,
            isIPVFuture: true
        };
    }
    if (findToken(input, ':') < 2) {
        return {
            host,
            isIPV6: false,
            error: bracketed
        };
    }
    let zoneIdentifier = '';
    const zoneSeparator = input.indexOf('%');
    if (zoneSeparator !== -1) {
        const separatorLength = input.slice(zoneSeparator, zoneSeparator + 3).toLowerCase() === '%25' ? 3 : 1;
        zoneIdentifier = input.slice(zoneSeparator + separatorLength);
        if (!isZoneIdentifier(zoneIdentifier)) return {
            host,
            isIPV6: false,
            error: true
        };
        input = input.slice(0, zoneSeparator);
    }
    const address = normalizeIPv6Address(input);
    if (address === undefined) return {
        host,
        isIPV6: false,
        error: true
    };
    return {
        host: address + (zoneIdentifier ? '%' + zoneIdentifier : ''),
        escapedHost: address + (zoneIdentifier ? '%25' + zoneIdentifier : ''),
        isIPV6: true
    };
}
/**
 * @param {string} str
 * @param {string} token
 * @returns {number}
 */ function findToken(str, token) {
    let ind = 0;
    for(let i = 0; i < str.length; i++){
        if (str[i] === token) ind++;
    }
    return ind;
}
/**
 * @param {string} path
 * @returns {string}
 *
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.2.4
 */ function removeDotSegments(path) {
    let input = path;
    const output = [];
    let nextSlash = -1;
    let len = 0;
    // eslint-disable-next-line no-cond-assign
    while(len = input.length){
        if (len === 1) {
            if (input === '.') {
                break;
            } else if (input === '/') {
                output.push('/');
                break;
            } else {
                output.push(input);
                break;
            }
        } else if (len === 2) {
            if (input[0] === '.') {
                if (input[1] === '.') {
                    break;
                } else if (input[1] === '/') {
                    input = input.slice(2);
                    continue;
                }
            } else if (input[0] === '/') {
                if (input[1] === '.' || input[1] === '/') {
                    output.push('/');
                    break;
                }
            }
        } else if (len === 3) {
            if (input === '/..') {
                if (output.length !== 0) {
                    output.pop();
                }
                output.push('/');
                break;
            }
        }
        if (input[0] === '.') {
            if (input[1] === '.') {
                if (input[2] === '/') {
                    input = input.slice(3);
                    continue;
                }
            } else if (input[1] === '/') {
                input = input.slice(2);
                continue;
            }
        } else if (input[0] === '/') {
            if (input[1] === '.') {
                if (input[2] === '/') {
                    input = input.slice(2);
                    continue;
                } else if (input[2] === '.') {
                    if (input[3] === '/') {
                        input = input.slice(3);
                        if (output.length !== 0) {
                            output.pop();
                        }
                        continue;
                    }
                }
            }
        }
        // Rule 2E: Move normal path segment to output
        if ((nextSlash = input.indexOf('/', 1)) === -1) {
            output.push(input);
            break;
        } else {
            output.push(input.slice(0, nextSlash));
            input = input.slice(nextSlash);
        }
    }
    return output.join('');
}
/**
 * Re-escape RFC 3986 gen-delims that must not appear literally in the host.
 * After the URI regex parses, these characters cannot be literal in the host
 * field, so any that appear after decoding came from percent-encoding and
 * must be restored to prevent authority structure changes.
 *
 * @param {string} host
 * @param {boolean} isIP - true for IPv4/IPv6 hosts (skip colon re-escaping)
 * @returns {string}
 */ const HOST_DELIMS = {
    '@': '%40',
    '/': '%2F',
    '?': '%3F',
    '#': '%23',
    ':': '%3A'
};
const HOST_DELIM_RE = /[@/?#:]/g;
const HOST_DELIM_NO_COLON_RE = /[@/?#]/g;
function reescapeHostDelimiters(host, isIP) {
    const re = isIP ? HOST_DELIM_NO_COLON_RE : HOST_DELIM_RE;
    re.lastIndex = 0;
    return host.replace(re, (ch)=>HOST_DELIMS[ch]);
}
/**
 * Normalizes percent escapes and optionally decodes only unreserved ASCII bytes.
 * Reserved delimiters such as `%2F` stay escaped; `%2E` is unreserved.
 *
 * @param {string} input
 * @param {boolean} [decodeUnreserved=false]
 * @returns {string}
 */ function normalizePercentEncoding(input, decodeUnreserved = false) {
    if (input.indexOf('%') === -1) {
        return input;
    }
    let output = '';
    for(let i = 0; i < input.length; i++){
        if (input[i] === '%' && i + 2 < input.length) {
            const hex = input.slice(i + 1, i + 3);
            if (isHexPair(hex)) {
                const normalizedHex = hex.toUpperCase();
                const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
                if (decodeUnreserved && isUnreserved(decoded)) {
                    output += decoded;
                } else {
                    output += '%' + normalizedHex;
                }
                i += 2;
                continue;
            }
        }
        output += input[i];
    }
    return output;
}
/**
 * Normalizes path data without turning reserved escapes into live path syntax.
 * Valid escapes are uppercased, raw unsafe characters are escaped, and only
 * unreserved bytes that are not `.` are decoded.
 *
 * @param {string} input
 * @returns {string}
 */ function normalizePathEncoding(input) {
    let output = '';
    for(let i = 0; i < input.length; i++){
        const ch = input[i];
        if (ch === '%' && i + 2 < input.length) {
            const hex = input.slice(i + 1, i + 3);
            if (isHexPair(hex)) {
                const normalizedHex = hex.toUpperCase();
                const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
                if (decoded !== '.' && isUnreserved(decoded)) {
                    output += decoded;
                } else {
                    output += '%' + normalizedHex;
                }
                i += 2;
                continue;
            }
        }
        if (isPathCharacter(ch)) {
            output += ch;
        } else {
            const code = input.charCodeAt(i);
            if (code < 0x80) {
                output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
            } else if (code < 0xD800 || code > 0xDFFF) {
                output += percentEncodeNonAscii(code);
            } else if (code <= 0xDBFF && i + 1 < input.length) {
                const low = input.charCodeAt(i + 1);
                if (low >= 0xDC00 && low <= 0xDFFF) {
                    output += percentEncodeNonAscii(0x10000 + (code - 0xD800 << 10) + (low - 0xDC00));
                    i++;
                } else {
                    output += percentEncodeNonAscii(0xFFFD);
                }
            } else {
                output += percentEncodeNonAscii(0xFFFD);
            }
        }
    }
    return output;
}
/**
 * Serializes a path without rewriting reserved data. Raw RFC 3986 path
 * characters remain literal, valid escapes are preserved and uppercased, and
 * everything else is UTF-8 percent-encoded. In a path-noscheme, a colon in the
 * first segment must be escaped so the result cannot be parsed as a scheme.
 *
 * @param {string} input
 * @param {boolean} [pathNoScheme=false]
 * @returns {string}
 */ function serializePathEncoding(input, pathNoScheme = false) {
    let output = '';
    let firstSegment = pathNoScheme && input[0] !== '/';
    for(let i = 0; i < input.length; i++){
        const ch = input[i];
        if (ch === '%' && i + 2 < input.length) {
            const hex = input.slice(i + 1, i + 3);
            if (isHexPair(hex)) {
                output += '%' + hex.toUpperCase();
                i += 2;
                continue;
            }
        }
        if (ch === '/') {
            firstSegment = false;
        }
        if (isPathCharacter(ch) && (ch !== ':' || !firstSegment)) {
            output += ch;
        } else {
            const code = input.charCodeAt(i);
            if (code < 0x80) {
                output += BYTE_HEX[code];
            } else if (code < 0xD800 || code > 0xDFFF) {
                output += percentEncodeNonAscii(code);
            } else if (code <= 0xDBFF && i + 1 < input.length) {
                const low = input.charCodeAt(i + 1);
                if (low >= 0xDC00 && low <= 0xDFFF) {
                    output += percentEncodeNonAscii(0x10000 + (code - 0xD800 << 10) + (low - 0xDC00));
                    i++;
                } else {
                    output += percentEncodeNonAscii(0xFFFD);
                }
            } else {
                output += percentEncodeNonAscii(0xFFFD);
            }
        }
    }
    return output;
}
/**
 * Percent-encodes a URI component using its RFC 3986 literal character set.
 * Existing valid escapes are preserved and normalized to uppercase hex.
 *
 * @param {string} input
 * @param {(value: string) => boolean} isAllowed
 * @returns {string}
 */ function encodeComponent(input, isAllowed) {
    let output = '';
    for(let i = 0; i < input.length; i++){
        const ch = input[i];
        if (ch === '%' && i + 2 < input.length) {
            const hex = input.slice(i + 1, i + 3);
            if (isHexPair(hex)) {
                output += '%' + hex.toUpperCase();
                i += 2;
                continue;
            }
        }
        if (isAllowed(ch)) {
            output += ch;
        } else {
            const code = input.charCodeAt(i);
            if (code < 0x80) {
                output += BYTE_HEX[code];
            } else if (code < 0xD800 || code > 0xDFFF) {
                output += percentEncodeNonAscii(code);
            } else if (code <= 0xDBFF && i + 1 < input.length) {
                const low = input.charCodeAt(i + 1);
                if (low >= 0xDC00 && low <= 0xDFFF) {
                    output += percentEncodeNonAscii(0x10000 + (code - 0xD800 << 10) + (low - 0xDC00));
                    i++;
                } else {
                    output += percentEncodeNonAscii(0xFFFD);
                }
            } else {
                output += percentEncodeNonAscii(0xFFFD);
            }
        }
    }
    return output;
}
/**
 * Encodes userinfo while preserving its RFC 3986 §3.2.1 literal characters.
 * In particular, authority delimiters such as `@`, `/`, `?`, and `#` are data.
 *
 * @param {string} input
 * @returns {string}
 */ function encodeUserinfo(input) {
    return encodeComponent(input, isUserinfoCharacter);
}
/**
 * Encodes query data using the RFC 3986 §3.4 grammar. A literal `#` must be
 * escaped because it would otherwise begin the fragment component.
 *
 * @param {string} input
 * @returns {string}
 */ function encodeQuery(input) {
    return encodeComponent(input, isQueryFragmentCharacter);
}
/**
 * Encodes fragment data using the RFC 3986 §3.5 grammar.
 *
 * @param {string} input
 * @returns {string}
 */ function encodeFragment(input) {
    return encodeComponent(input, isQueryFragmentCharacter);
}
function isEscapeSafe(cp) {
    return cp >= 0x30 && cp <= 0x39 || cp >= 0x41 && cp <= 0x5A || cp >= 0x61 && cp <= 0x7A || cp === 0x2A || cp === 0x2B || cp === 0x2D || cp === 0x2E || cp === 0x2F || cp === 0x40 || cp === 0x5F;
}
/**
 * Normalizes the percent-encoding of a query or fragment component.
 *
 * Like `normalizePathEncoding`, but uses the query/fragment character set
 * (which additionally allows `?`) and decodes `.` since it has no dot-segment
 * meaning outside of a path.
 *
 * @param {string} input
 * @returns {string}
 */ function normalizeQueryFragmentEncoding(input) {
    let output = '';
    for(let i = 0; i < input.length; i++){
        const ch = input[i];
        if (ch === '%' && i + 2 < input.length) {
            const hex = input.slice(i + 1, i + 3);
            if (isHexPair(hex)) {
                const normalizedHex = hex.toUpperCase();
                const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
                if (isUnreserved(decoded)) {
                    output += decoded;
                } else {
                    output += '%' + normalizedHex;
                }
                i += 2;
                continue;
            }
        }
        if (isQueryFragmentCharacter(ch)) {
            output += ch;
        } else {
            const code = input.charCodeAt(i);
            if (code < 0x80) {
                output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
            } else if (code < 0xD800 || code > 0xDFFF) {
                output += percentEncodeNonAscii(code);
            } else if (code <= 0xDBFF && i + 1 < input.length) {
                const low = input.charCodeAt(i + 1);
                if (low >= 0xDC00 && low <= 0xDFFF) {
                    output += percentEncodeNonAscii(0x10000 + (code - 0xD800 << 10) + (low - 0xDC00));
                    i++;
                } else {
                    output += percentEncodeNonAscii(0xFFFD);
                }
            } else {
                output += percentEncodeNonAscii(0xFFFD);
            }
        }
    }
    return output;
}
/**
 * Escapes a component while preserving existing valid percent escapes.
 *
 * @param {string} input
 * @returns {string}
 */ function escapePreservingEscapes(input) {
    let output = '';
    for(let i = 0; i < input.length; i++){
        if (input[i] === '%' && i + 2 < input.length) {
            const hex = input.slice(i + 1, i + 3);
            if (isHexPair(hex)) {
                output += '%' + hex.toUpperCase();
                i += 2;
                continue;
            }
        }
        output += escape(input[i]);
    }
    return output;
}
/**
 * @param {import('../types/index').URIComponent} component
 * @returns {string|undefined}
 */ function recomposeAuthority(component) {
    const uriTokens = [];
    if (component.userinfo !== undefined) {
        uriTokens.push(encodeUserinfo(component.userinfo));
        uriTokens.push('@');
    }
    if (component.host !== undefined) {
        let host = component.host;
        if (!isIPv4(host)) {
            let ipV6res = normalizeIPv6(host);
            if (ipV6res.isIPV6 !== true && ipV6res.isIPVFuture !== true) {
                // Decode only unreserved bytes, once. In particular, keep %25 encoded
                // so it cannot introduce a second escape during recomposition.
                host = normalizePercentEncoding(host, true);
                ipV6res = normalizeIPv6(host);
            }
            if (ipV6res.isIPV6 === true || ipV6res.isIPVFuture === true) {
                host = `[${ipV6res.escapedHost}]`;
            } else {
                host = reescapeHostDelimiters(host, false);
            }
        }
        uriTokens.push(host);
    }
    if (typeof component.port === 'number' || typeof component.port === 'string') {
        const port = String(component.port);
        if (!isPort(port)) {
            throw new TypeError('URI port is malformed.');
        }
        uriTokens.push(':');
        uriTokens.push(port);
    }
    return uriTokens.length ? uriTokens.join('') : undefined;
}
;
module.exports = {
    nonSimpleDomain,
    recomposeAuthority,
    reescapeHostDelimiters,
    normalizePercentEncoding,
    normalizePathEncoding,
    serializePathEncoding,
    normalizeQueryFragmentEncoding,
    encodeUserinfo,
    encodeQuery,
    encodeFragment,
    escapePreservingEscapes,
    removeDotSegments,
    isIPv4,
    isUUID,
    normalizeIPv6,
    stringArrayToHexStripped
};
}),
"[project]/node_modules/json-schema-traverse/index.js [app-route] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

var traverse = module.exports = function(schema, opts, cb) {
    // Legacy support for v0.3.1 and earlier.
    if (typeof opts == 'function') {
        cb = opts;
        opts = {};
    }
    cb = opts.cb || cb;
    var pre = typeof cb == 'function' ? cb : cb.pre || function() {};
    var post = cb.post || function() {};
    _traverse(opts, pre, post, schema, '', schema);
};
traverse.keywords = {
    additionalItems: true,
    items: true,
    contains: true,
    additionalProperties: true,
    propertyNames: true,
    not: true,
    if: true,
    then: true,
    else: true
};
traverse.arrayKeywords = {
    items: true,
    allOf: true,
    anyOf: true,
    oneOf: true
};
traverse.propsKeywords = {
    $defs: true,
    definitions: true,
    properties: true,
    patternProperties: true,
    dependencies: true
};
traverse.skipKeywords = {
    default: true,
    enum: true,
    const: true,
    required: true,
    maximum: true,
    minimum: true,
    exclusiveMaximum: true,
    exclusiveMinimum: true,
    multipleOf: true,
    maxLength: true,
    minLength: true,
    pattern: true,
    format: true,
    maxItems: true,
    minItems: true,
    uniqueItems: true,
    maxProperties: true,
    minProperties: true
};
function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
    if (schema && typeof schema == 'object' && !Array.isArray(schema)) {
        pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
        for(var key in schema){
            var sch = schema[key];
            if (Array.isArray(sch)) {
                if (key in traverse.arrayKeywords) {
                    for(var i = 0; i < sch.length; i++)_traverse(opts, pre, post, sch[i], jsonPtr + '/' + key + '/' + i, rootSchema, jsonPtr, key, schema, i);
                }
            } else if (key in traverse.propsKeywords) {
                if (sch && typeof sch == 'object') {
                    for(var prop in sch)_traverse(opts, pre, post, sch[prop], jsonPtr + '/' + key + '/' + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
                }
            } else if (key in traverse.keywords || opts.allKeys && !(key in traverse.skipKeywords)) {
                _traverse(opts, pre, post, sch, jsonPtr + '/' + key, rootSchema, jsonPtr, key, schema);
            }
        }
        post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
    }
}
function escapeJsonPtr(str) {
    return str.replace(/~/g, '~0').replace(/\//g, '~1');
}
}),
"[project]/node_modules/pkce-challenge/dist/index.node.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>pkceChallenge,
    "generateChallenge",
    ()=>generateChallenge,
    "verifyChallenge",
    ()=>verifyChallenge
]);
let crypto;
crypto = globalThis.crypto?.webcrypto ?? // Node.js [18-16] REPL
globalThis.crypto ?? // Node.js >18
__turbopack_context__.A("[externals]/node:crypto [external] (node:crypto, cjs, async loader)").then((m)=>m.webcrypto); // Node.js <18 Non-REPL
/**
 * Creates an array of length `size` of random bytes
 * @param size
 * @returns Array of random ints (0 to 255)
 */ async function getRandomValues(size) {
    return (await crypto).getRandomValues(new Uint8Array(size));
}
/** Generate cryptographically strong random string
 * @param size The desired length of the string
 * @returns The random string
 */ async function random(size) {
    const mask = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";
    const evenDistCutoff = Math.pow(2, 8) - Math.pow(2, 8) % mask.length;
    let result = "";
    while(result.length < size){
        const randomBytes = await getRandomValues(size - result.length);
        for (const randomByte of randomBytes){
            if (randomByte < evenDistCutoff) {
                result += mask[randomByte % mask.length];
            }
        }
    }
    return result;
}
/** Generate a PKCE challenge verifier
 * @param length Length of the verifier
 * @returns A random verifier `length` characters long
 */ async function generateVerifier(length) {
    return await random(length);
}
async function generateChallenge(code_verifier) {
    const buffer = await (await crypto).subtle.digest("SHA-256", new TextEncoder().encode(code_verifier));
    // Generate base64url string
    // btoa is deprecated in Node.js but is used here for web browser compatibility
    // (which has no good replacement yet, see also https://github.com/whatwg/html/issues/6811)
    return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\//g, '_').replace(/\+/g, '-').replace(/=/g, '');
}
async function pkceChallenge(length) {
    if (!length) length = 43;
    if (length < 43 || length > 128) {
        throw `Expected a length between 43 and 128. Received ${length}.`;
    }
    const verifier = await generateVerifier(length);
    const challenge = await generateChallenge(verifier);
    return {
        code_verifier: verifier,
        code_challenge: challenge
    };
}
async function verifyChallenge(code_verifier, expectedChallenge) {
    const actualChallenge = await generateChallenge(code_verifier);
    return actualChallenge === expectedChallenge;
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/Options.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "defaultOptions",
    ()=>defaultOptions,
    "getDefaultOptions",
    ()=>getDefaultOptions,
    "ignoreOverride",
    ()=>ignoreOverride,
    "jsonDescription",
    ()=>jsonDescription
]);
const ignoreOverride = Symbol("Let zodToJsonSchema decide on which parser to use");
const jsonDescription = (jsonSchema, def)=>{
    if (def.description) {
        try {
            return {
                ...jsonSchema,
                ...JSON.parse(def.description)
            };
        } catch  {}
    }
    return jsonSchema;
};
const defaultOptions = {
    name: undefined,
    $refStrategy: "root",
    basePath: [
        "#"
    ],
    effectStrategy: "input",
    pipeStrategy: "all",
    dateStrategy: "format:date-time",
    mapStrategy: "entries",
    removeAdditionalStrategy: "passthrough",
    allowedAdditionalProperties: true,
    rejectedAdditionalProperties: false,
    definitionPath: "definitions",
    target: "jsonSchema7",
    strictUnions: false,
    definitions: {},
    errorMessages: false,
    markdownDescription: false,
    patternStrategy: "escape",
    applyRegexFlags: false,
    emailStrategy: "format:email",
    base64Strategy: "contentEncoding:base64",
    nameStrategy: "ref",
    openAiAnyTypeName: "OpenAiAnyType"
};
const getDefaultOptions = (options)=>typeof options === "string" ? {
        ...defaultOptions,
        name: options
    } : {
        ...defaultOptions,
        ...options
    };
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/Refs.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getRefs",
    ()=>getRefs
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$Options$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/Options.js [app-route] (ecmascript)");
;
const getRefs = (options)=>{
    const _options = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$Options$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getDefaultOptions"])(options);
    const currentPath = _options.name !== undefined ? [
        ..._options.basePath,
        _options.definitionPath,
        _options.name
    ] : _options.basePath;
    return {
        ..._options,
        flags: {
            hasReferencedOpenAiAnyType: false
        },
        currentPath: currentPath,
        propertyPath: undefined,
        seen: new Map(Object.entries(_options.definitions).map(([name, def])=>[
                def._def,
                {
                    def: def._def,
                    path: [
                        ..._options.basePath,
                        _options.definitionPath,
                        name
                    ],
                    // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
                    jsonSchema: undefined
                }
            ]))
    };
};
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/errorMessages.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addErrorMessage",
    ()=>addErrorMessage,
    "setResponseValueAndErrors",
    ()=>setResponseValueAndErrors
]);
function addErrorMessage(res, key, errorMessage, refs) {
    if (!refs?.errorMessages) return;
    if (errorMessage) {
        res.errorMessage = {
            ...res.errorMessage,
            [key]: errorMessage
        };
    }
}
function setResponseValueAndErrors(res, key, value, errorMessage, refs) {
    res[key] = value;
    addErrorMessage(res, key, errorMessage, refs);
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/getRelativePath.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getRelativePath",
    ()=>getRelativePath
]);
const getRelativePath = (pathA, pathB)=>{
    let i = 0;
    for(; i < pathA.length && i < pathB.length; i++){
        if (pathA[i] !== pathB[i]) break;
    }
    return [
        (pathA.length - i).toString(),
        ...pathB.slice(i)
    ].join("/");
};
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/index.js [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$Refs$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/Refs.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/any.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$array$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/array.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$bigint$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/bigint.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$branded$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/branded.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$catch$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/catch.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/date.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$default$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/default.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$effects$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/effects.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$intersection$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/intersection.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$map$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/map.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$never$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/never.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$nullable$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$number$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/number.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$object$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/object.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$optional$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/optional.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$pipeline$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/pipeline.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$promise$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/promise.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$readonly$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/readonly.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$record$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/record.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$set$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/set.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$string$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/string.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$tuple$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/tuple.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$undefined$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/undefined.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$union$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/union.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$unknown$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/unknown.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$selectParser$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/selectParser.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$zodToJsonSchema$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/zodToJsonSchema.js [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const __TURBOPACK__default__export__ = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$zodToJsonSchema$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["zodToJsonSchema"];
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseDef",
    ()=>parseDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$Options$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/Options.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$selectParser$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/selectParser.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$getRelativePath$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/getRelativePath.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/any.js [app-route] (ecmascript)");
;
;
;
;
function parseDef(def, refs, forceResolution = false) {
    const seenItem = refs.seen.get(def);
    if (refs.override) {
        const overrideResult = refs.override?.(def, refs, seenItem, forceResolution);
        if (overrideResult !== __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$Options$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ignoreOverride"]) {
            return overrideResult;
        }
    }
    if (seenItem && !forceResolution) {
        const seenSchema = get$ref(seenItem, refs);
        if (seenSchema !== undefined) {
            return seenSchema;
        }
    }
    const newItem = {
        def,
        path: refs.currentPath,
        jsonSchema: undefined
    };
    refs.seen.set(def, newItem);
    const jsonSchemaOrGetter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$selectParser$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["selectParser"])(def, def.typeName, refs);
    // If the return was a function, then the inner definition needs to be extracted before a call to parseDef (recursive)
    const jsonSchema = typeof jsonSchemaOrGetter === "function" ? parseDef(jsonSchemaOrGetter(), refs) : jsonSchemaOrGetter;
    if (jsonSchema) {
        addMeta(def, refs, jsonSchema);
    }
    if (refs.postProcess) {
        const postProcessResult = refs.postProcess(jsonSchema, def, refs);
        newItem.jsonSchema = jsonSchema;
        return postProcessResult;
    }
    newItem.jsonSchema = jsonSchema;
    return jsonSchema;
}
const get$ref = (item, refs)=>{
    switch(refs.$refStrategy){
        case "root":
            return {
                $ref: item.path.join("/")
            };
        case "relative":
            return {
                $ref: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$getRelativePath$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getRelativePath"])(refs.currentPath, item.path)
            };
        case "none":
        case "seen":
            {
                if (item.path.length < refs.currentPath.length && item.path.every((value, index)=>refs.currentPath[index] === value)) {
                    console.warn(`Recursive reference detected at ${refs.currentPath.join("/")}! Defaulting to any`);
                    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseAnyDef"])(refs);
                }
                return refs.$refStrategy === "seen" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseAnyDef"])(refs) : undefined;
            }
    }
};
const addMeta = (def, refs, jsonSchema)=>{
    if (def.description) {
        jsonSchema.description = def.description;
        if (refs.markdownDescription) {
            jsonSchema.markdownDescription = def.description;
        }
    }
    return jsonSchema;
};
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/any.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseAnyDef",
    ()=>parseAnyDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$getRelativePath$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/getRelativePath.js [app-route] (ecmascript)");
;
function parseAnyDef(refs) {
    if (refs.target !== "openAi") {
        return {};
    }
    const anyDefinitionPath = [
        ...refs.basePath,
        refs.definitionPath,
        refs.openAiAnyTypeName
    ];
    refs.flags.hasReferencedOpenAiAnyType = true;
    return {
        $ref: refs.$refStrategy === "relative" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$getRelativePath$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getRelativePath"])(anyDefinitionPath, refs.currentPath) : anyDefinitionPath.join("/")
    };
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/array.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseArrayDef",
    ()=>parseArrayDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/types.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/errorMessages.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
;
;
;
function parseArrayDef(def, refs) {
    const res = {
        type: "array"
    };
    if (def.type?._def && def.type?._def?.typeName !== __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodAny) {
        res.items = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.type._def, {
            ...refs,
            currentPath: [
                ...refs.currentPath,
                "items"
            ]
        });
    }
    if (def.minLength) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "minItems", def.minLength.value, def.minLength.message, refs);
    }
    if (def.maxLength) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "maxItems", def.maxLength.value, def.maxLength.message, refs);
    }
    if (def.exactLength) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "minItems", def.exactLength.value, def.exactLength.message, refs);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "maxItems", def.exactLength.value, def.exactLength.message, refs);
    }
    return res;
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/bigint.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseBigintDef",
    ()=>parseBigintDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/errorMessages.js [app-route] (ecmascript)");
;
function parseBigintDef(def, refs) {
    const res = {
        type: "integer",
        format: "int64"
    };
    if (!def.checks) return res;
    for (const check of def.checks){
        switch(check.kind){
            case "min":
                if (refs.target === "jsonSchema7") {
                    if (check.inclusive) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "minimum", check.value, check.message, refs);
                    } else {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "exclusiveMinimum", check.value, check.message, refs);
                    }
                } else {
                    if (!check.inclusive) {
                        res.exclusiveMinimum = true;
                    }
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "minimum", check.value, check.message, refs);
                }
                break;
            case "max":
                if (refs.target === "jsonSchema7") {
                    if (check.inclusive) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "maximum", check.value, check.message, refs);
                    } else {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "exclusiveMaximum", check.value, check.message, refs);
                    }
                } else {
                    if (!check.inclusive) {
                        res.exclusiveMaximum = true;
                    }
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "maximum", check.value, check.message, refs);
                }
                break;
            case "multipleOf":
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "multipleOf", check.value, check.message, refs);
                break;
        }
    }
    return res;
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/boolean.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseBooleanDef",
    ()=>parseBooleanDef
]);
function parseBooleanDef() {
    return {
        type: "boolean"
    };
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/branded.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseBrandedDef",
    ()=>parseBrandedDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
;
function parseBrandedDef(_def, refs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(_def.type._def, refs);
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/catch.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseCatchDef",
    ()=>parseCatchDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
;
const parseCatchDef = (def, refs)=>{
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.innerType._def, refs);
};
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/date.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseDateDef",
    ()=>parseDateDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/errorMessages.js [app-route] (ecmascript)");
;
function parseDateDef(def, refs, overrideDateStrategy) {
    const strategy = overrideDateStrategy ?? refs.dateStrategy;
    if (Array.isArray(strategy)) {
        return {
            anyOf: strategy.map((item, i)=>parseDateDef(def, refs, item))
        };
    }
    switch(strategy){
        case "string":
        case "format:date-time":
            return {
                type: "string",
                format: "date-time"
            };
        case "format:date":
            return {
                type: "string",
                format: "date"
            };
        case "integer":
            return integerDateParser(def, refs);
    }
}
const integerDateParser = (def, refs)=>{
    const res = {
        type: "integer",
        format: "unix-time"
    };
    if (refs.target === "openApi3") {
        return res;
    }
    for (const check of def.checks){
        switch(check.kind){
            case "min":
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "minimum", check.value, check.message, refs);
                break;
            case "max":
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "maximum", check.value, check.message, refs);
                break;
        }
    }
    return res;
};
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/default.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseDefaultDef",
    ()=>parseDefaultDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
;
function parseDefaultDef(_def, refs) {
    return {
        ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(_def.innerType._def, refs),
        default: _def.defaultValue()
    };
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/effects.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseEffectsDef",
    ()=>parseEffectsDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/any.js [app-route] (ecmascript)");
;
;
function parseEffectsDef(_def, refs) {
    return refs.effectStrategy === "input" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(_def.schema._def, refs) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseAnyDef"])(refs);
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/enum.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseEnumDef",
    ()=>parseEnumDef
]);
function parseEnumDef(def) {
    return {
        type: "string",
        enum: Array.from(def.values)
    };
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/intersection.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseIntersectionDef",
    ()=>parseIntersectionDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
;
const isJsonSchema7AllOfType = (type)=>{
    if ("type" in type && type.type === "string") return false;
    return "allOf" in type;
};
function parseIntersectionDef(def, refs) {
    const allOf = [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.left._def, {
            ...refs,
            currentPath: [
                ...refs.currentPath,
                "allOf",
                "0"
            ]
        }),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.right._def, {
            ...refs,
            currentPath: [
                ...refs.currentPath,
                "allOf",
                "1"
            ]
        })
    ].filter((x)=>!!x);
    let unevaluatedProperties = refs.target === "jsonSchema2019-09" ? {
        unevaluatedProperties: false
    } : undefined;
    const mergedAllOf = [];
    // If either of the schemas is an allOf, merge them into a single allOf
    allOf.forEach((schema)=>{
        if (isJsonSchema7AllOfType(schema)) {
            mergedAllOf.push(...schema.allOf);
            if (schema.unevaluatedProperties === undefined) {
                // If one of the schemas has no unevaluatedProperties set,
                // the merged schema should also have no unevaluatedProperties set
                unevaluatedProperties = undefined;
            }
        } else {
            let nestedSchema = schema;
            if ("additionalProperties" in schema && schema.additionalProperties === false) {
                const { additionalProperties, ...rest } = schema;
                nestedSchema = rest;
            } else {
                // As soon as one of the schemas has additionalProperties set not to false, we allow unevaluatedProperties
                unevaluatedProperties = undefined;
            }
            mergedAllOf.push(nestedSchema);
        }
    });
    return mergedAllOf.length ? {
        allOf: mergedAllOf,
        ...unevaluatedProperties
    } : undefined;
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/literal.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseLiteralDef",
    ()=>parseLiteralDef
]);
function parseLiteralDef(def, refs) {
    const parsedType = typeof def.value;
    if (parsedType !== "bigint" && parsedType !== "number" && parsedType !== "boolean" && parsedType !== "string") {
        return {
            type: Array.isArray(def.value) ? "array" : "object"
        };
    }
    if (refs.target === "openApi3") {
        return {
            type: parsedType === "bigint" ? "integer" : parsedType,
            enum: [
                def.value
            ]
        };
    }
    return {
        type: parsedType === "bigint" ? "integer" : parsedType,
        const: def.value
    };
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/map.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseMapDef",
    ()=>parseMapDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$record$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/record.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/any.js [app-route] (ecmascript)");
;
;
;
function parseMapDef(def, refs) {
    if (refs.mapStrategy === "record") {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$record$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseRecordDef"])(def, refs);
    }
    const keys = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.keyType._def, {
        ...refs,
        currentPath: [
            ...refs.currentPath,
            "items",
            "items",
            "0"
        ]
    }) || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseAnyDef"])(refs);
    const values = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.valueType._def, {
        ...refs,
        currentPath: [
            ...refs.currentPath,
            "items",
            "items",
            "1"
        ]
    }) || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseAnyDef"])(refs);
    return {
        type: "array",
        maxItems: 125,
        items: {
            type: "array",
            items: [
                keys,
                values
            ],
            minItems: 2,
            maxItems: 2
        }
    };
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/nativeEnum.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseNativeEnumDef",
    ()=>parseNativeEnumDef
]);
function parseNativeEnumDef(def) {
    const object = def.values;
    const actualKeys = Object.keys(def.values).filter((key)=>{
        return typeof object[object[key]] !== "number";
    });
    const actualValues = actualKeys.map((key)=>object[key]);
    const parsedTypes = Array.from(new Set(actualValues.map((values)=>typeof values)));
    return {
        type: parsedTypes.length === 1 ? parsedTypes[0] === "string" ? "string" : "number" : [
            "string",
            "number"
        ],
        enum: actualValues
    };
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/never.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseNeverDef",
    ()=>parseNeverDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/any.js [app-route] (ecmascript)");
;
function parseNeverDef(refs) {
    return refs.target === "openAi" ? undefined : {
        not: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseAnyDef"])({
            ...refs,
            currentPath: [
                ...refs.currentPath,
                "not"
            ]
        })
    };
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/null.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseNullDef",
    ()=>parseNullDef
]);
function parseNullDef(refs) {
    return refs.target === "openApi3" ? {
        enum: [
            "null"
        ],
        nullable: true
    } : {
        type: "null"
    };
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseNullableDef",
    ()=>parseNullableDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$union$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/union.js [app-route] (ecmascript)");
;
;
function parseNullableDef(def, refs) {
    if ([
        "ZodString",
        "ZodNumber",
        "ZodBigInt",
        "ZodBoolean",
        "ZodNull"
    ].includes(def.innerType._def.typeName) && (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
        if (refs.target === "openApi3") {
            return {
                type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$union$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["primitiveMappings"][def.innerType._def.typeName],
                nullable: true
            };
        }
        return {
            type: [
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$union$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["primitiveMappings"][def.innerType._def.typeName],
                "null"
            ]
        };
    }
    if (refs.target === "openApi3") {
        const base = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.innerType._def, {
            ...refs,
            currentPath: [
                ...refs.currentPath
            ]
        });
        if (base && "$ref" in base) return {
            allOf: [
                base
            ],
            nullable: true
        };
        return base && {
            ...base,
            nullable: true
        };
    }
    const base = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.innerType._def, {
        ...refs,
        currentPath: [
            ...refs.currentPath,
            "anyOf",
            "0"
        ]
    });
    return base && {
        anyOf: [
            base,
            {
                type: "null"
            }
        ]
    };
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/number.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseNumberDef",
    ()=>parseNumberDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/errorMessages.js [app-route] (ecmascript)");
;
function parseNumberDef(def, refs) {
    const res = {
        type: "number"
    };
    if (!def.checks) return res;
    for (const check of def.checks){
        switch(check.kind){
            case "int":
                res.type = "integer";
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["addErrorMessage"])(res, "type", check.message, refs);
                break;
            case "min":
                if (refs.target === "jsonSchema7") {
                    if (check.inclusive) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "minimum", check.value, check.message, refs);
                    } else {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "exclusiveMinimum", check.value, check.message, refs);
                    }
                } else {
                    if (!check.inclusive) {
                        res.exclusiveMinimum = true;
                    }
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "minimum", check.value, check.message, refs);
                }
                break;
            case "max":
                if (refs.target === "jsonSchema7") {
                    if (check.inclusive) {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "maximum", check.value, check.message, refs);
                    } else {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "exclusiveMaximum", check.value, check.message, refs);
                    }
                } else {
                    if (!check.inclusive) {
                        res.exclusiveMaximum = true;
                    }
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "maximum", check.value, check.message, refs);
                }
                break;
            case "multipleOf":
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "multipleOf", check.value, check.message, refs);
                break;
        }
    }
    return res;
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/object.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseObjectDef",
    ()=>parseObjectDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
;
function parseObjectDef(def, refs) {
    const forceOptionalIntoNullable = refs.target === "openAi";
    const result = {
        type: "object",
        properties: {}
    };
    const required = [];
    const shape = def.shape();
    for(const propName in shape){
        let propDef = shape[propName];
        if (propDef === undefined || propDef._def === undefined) {
            continue;
        }
        let propOptional = safeIsOptional(propDef);
        if (propOptional && forceOptionalIntoNullable) {
            if (propDef._def.typeName === "ZodOptional") {
                propDef = propDef._def.innerType;
            }
            if (!propDef.isNullable()) {
                propDef = propDef.nullable();
            }
            propOptional = false;
        }
        const parsedDef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(propDef._def, {
            ...refs,
            currentPath: [
                ...refs.currentPath,
                "properties",
                propName
            ],
            propertyPath: [
                ...refs.currentPath,
                "properties",
                propName
            ]
        });
        if (parsedDef === undefined) {
            continue;
        }
        result.properties[propName] = parsedDef;
        if (!propOptional) {
            required.push(propName);
        }
    }
    if (required.length) {
        result.required = required;
    }
    const additionalProperties = decideAdditionalProperties(def, refs);
    if (additionalProperties !== undefined) {
        result.additionalProperties = additionalProperties;
    }
    return result;
}
function decideAdditionalProperties(def, refs) {
    if (def.catchall._def.typeName !== "ZodNever") {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.catchall._def, {
            ...refs,
            currentPath: [
                ...refs.currentPath,
                "additionalProperties"
            ]
        });
    }
    switch(def.unknownKeys){
        case "passthrough":
            return refs.allowedAdditionalProperties;
        case "strict":
            return refs.rejectedAdditionalProperties;
        case "strip":
            return refs.removeAdditionalStrategy === "strict" ? refs.allowedAdditionalProperties : refs.rejectedAdditionalProperties;
    }
}
function safeIsOptional(schema) {
    try {
        return schema.isOptional();
    } catch  {
        return true;
    }
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/optional.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseOptionalDef",
    ()=>parseOptionalDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/any.js [app-route] (ecmascript)");
;
;
const parseOptionalDef = (def, refs)=>{
    if (refs.currentPath.toString() === refs.propertyPath?.toString()) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.innerType._def, refs);
    }
    const innerSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.innerType._def, {
        ...refs,
        currentPath: [
            ...refs.currentPath,
            "anyOf",
            "1"
        ]
    });
    return innerSchema ? {
        anyOf: [
            {
                not: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseAnyDef"])(refs)
            },
            innerSchema
        ]
    } : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseAnyDef"])(refs);
};
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/pipeline.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parsePipelineDef",
    ()=>parsePipelineDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
;
const parsePipelineDef = (def, refs)=>{
    if (refs.pipeStrategy === "input") {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.in._def, refs);
    } else if (refs.pipeStrategy === "output") {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.out._def, refs);
    }
    const a = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.in._def, {
        ...refs,
        currentPath: [
            ...refs.currentPath,
            "allOf",
            "0"
        ]
    });
    const b = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.out._def, {
        ...refs,
        currentPath: [
            ...refs.currentPath,
            "allOf",
            a ? "1" : "0"
        ]
    });
    return {
        allOf: [
            a,
            b
        ].filter((x)=>x !== undefined)
    };
};
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/promise.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parsePromiseDef",
    ()=>parsePromiseDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
;
function parsePromiseDef(def, refs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.type._def, refs);
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/readonly.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseReadonlyDef",
    ()=>parseReadonlyDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
;
const parseReadonlyDef = (def, refs)=>{
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.innerType._def, refs);
};
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/record.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseRecordDef",
    ()=>parseRecordDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/types.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$string$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/string.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$branded$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/branded.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/any.js [app-route] (ecmascript)");
;
;
;
;
;
function parseRecordDef(def, refs) {
    if (refs.target === "openAi") {
        console.warn("Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead.");
    }
    if (refs.target === "openApi3" && def.keyType?._def.typeName === __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodEnum) {
        return {
            type: "object",
            required: def.keyType._def.values,
            properties: def.keyType._def.values.reduce((acc, key)=>({
                    ...acc,
                    [key]: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.valueType._def, {
                        ...refs,
                        currentPath: [
                            ...refs.currentPath,
                            "properties",
                            key
                        ]
                    }) ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseAnyDef"])(refs)
                }), {}),
            additionalProperties: refs.rejectedAdditionalProperties
        };
    }
    const schema = {
        type: "object",
        additionalProperties: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.valueType._def, {
            ...refs,
            currentPath: [
                ...refs.currentPath,
                "additionalProperties"
            ]
        }) ?? refs.allowedAdditionalProperties
    };
    if (refs.target === "openApi3") {
        return schema;
    }
    if (def.keyType?._def.typeName === __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodString && def.keyType._def.checks?.length) {
        const { type, ...keyType } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$string$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseStringDef"])(def.keyType._def, refs);
        return {
            ...schema,
            propertyNames: keyType
        };
    } else if (def.keyType?._def.typeName === __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodEnum) {
        return {
            ...schema,
            propertyNames: {
                enum: def.keyType._def.values
            }
        };
    } else if (def.keyType?._def.typeName === __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodBranded && def.keyType._def.type._def.typeName === __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodString && def.keyType._def.type._def.checks?.length) {
        const { type, ...keyType } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$branded$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseBrandedDef"])(def.keyType._def, refs);
        return {
            ...schema,
            propertyNames: keyType
        };
    }
    return schema;
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/set.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseSetDef",
    ()=>parseSetDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/errorMessages.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
;
;
function parseSetDef(def, refs) {
    const items = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.valueType._def, {
        ...refs,
        currentPath: [
            ...refs.currentPath,
            "items"
        ]
    });
    const schema = {
        type: "array",
        uniqueItems: true,
        items
    };
    if (def.minSize) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(schema, "minItems", def.minSize.value, def.minSize.message, refs);
    }
    if (def.maxSize) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(schema, "maxItems", def.maxSize.value, def.maxSize.message, refs);
    }
    return schema;
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/string.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseStringDef",
    ()=>parseStringDef,
    "zodPatterns",
    ()=>zodPatterns
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/errorMessages.js [app-route] (ecmascript)");
;
let emojiRegex = undefined;
const zodPatterns = {
    /**
     * `c` was changed to `[cC]` to replicate /i flag
     */ cuid: /^[cC][^\s-]{8,}$/,
    cuid2: /^[0-9a-z]+$/,
    ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
    /**
     * `a-z` was added to replicate /i flag
     */ email: /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,
    /**
     * Constructed a valid Unicode RegExp
     *
     * Lazily instantiate since this type of regex isn't supported
     * in all envs (e.g. React Native).
     *
     * See:
     * https://github.com/colinhacks/zod/issues/2433
     * Fix in Zod:
     * https://github.com/colinhacks/zod/commit/9340fd51e48576a75adc919bff65dbc4a5d4c99b
     */ emoji: ()=>{
        if (emojiRegex === undefined) {
            emojiRegex = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u");
        }
        return emojiRegex;
    },
    /**
     * Unused
     */ uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
    /**
     * Unused
     */ ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
    ipv4Cidr: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
    /**
     * Unused
     */ ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
    ipv6Cidr: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
    base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
    base64url: /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
    nanoid: /^[a-zA-Z0-9_-]{21}$/,
    jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
};
function parseStringDef(def, refs) {
    const res = {
        type: "string"
    };
    if (def.checks) {
        for (const check of def.checks){
            switch(check.kind){
                case "min":
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
                    break;
                case "max":
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
                    break;
                case "email":
                    switch(refs.emailStrategy){
                        case "format:email":
                            addFormat(res, "email", check.message, refs);
                            break;
                        case "format:idn-email":
                            addFormat(res, "idn-email", check.message, refs);
                            break;
                        case "pattern:zod":
                            addPattern(res, zodPatterns.email, check.message, refs);
                            break;
                    }
                    break;
                case "url":
                    addFormat(res, "uri", check.message, refs);
                    break;
                case "uuid":
                    addFormat(res, "uuid", check.message, refs);
                    break;
                case "regex":
                    addPattern(res, check.regex, check.message, refs);
                    break;
                case "cuid":
                    addPattern(res, zodPatterns.cuid, check.message, refs);
                    break;
                case "cuid2":
                    addPattern(res, zodPatterns.cuid2, check.message, refs);
                    break;
                case "startsWith":
                    addPattern(res, RegExp(`^${escapeLiteralCheckValue(check.value, refs)}`), check.message, refs);
                    break;
                case "endsWith":
                    addPattern(res, RegExp(`${escapeLiteralCheckValue(check.value, refs)}$`), check.message, refs);
                    break;
                case "datetime":
                    addFormat(res, "date-time", check.message, refs);
                    break;
                case "date":
                    addFormat(res, "date", check.message, refs);
                    break;
                case "time":
                    addFormat(res, "time", check.message, refs);
                    break;
                case "duration":
                    addFormat(res, "duration", check.message, refs);
                    break;
                case "length":
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
                    break;
                case "includes":
                    {
                        addPattern(res, RegExp(escapeLiteralCheckValue(check.value, refs)), check.message, refs);
                        break;
                    }
                case "ip":
                    {
                        if (check.version !== "v6") {
                            addFormat(res, "ipv4", check.message, refs);
                        }
                        if (check.version !== "v4") {
                            addFormat(res, "ipv6", check.message, refs);
                        }
                        break;
                    }
                case "base64url":
                    addPattern(res, zodPatterns.base64url, check.message, refs);
                    break;
                case "jwt":
                    addPattern(res, zodPatterns.jwt, check.message, refs);
                    break;
                case "cidr":
                    {
                        if (check.version !== "v6") {
                            addPattern(res, zodPatterns.ipv4Cidr, check.message, refs);
                        }
                        if (check.version !== "v4") {
                            addPattern(res, zodPatterns.ipv6Cidr, check.message, refs);
                        }
                        break;
                    }
                case "emoji":
                    addPattern(res, zodPatterns.emoji(), check.message, refs);
                    break;
                case "ulid":
                    {
                        addPattern(res, zodPatterns.ulid, check.message, refs);
                        break;
                    }
                case "base64":
                    {
                        switch(refs.base64Strategy){
                            case "format:binary":
                                {
                                    addFormat(res, "binary", check.message, refs);
                                    break;
                                }
                            case "contentEncoding:base64":
                                {
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(res, "contentEncoding", "base64", check.message, refs);
                                    break;
                                }
                            case "pattern:zod":
                                {
                                    addPattern(res, zodPatterns.base64, check.message, refs);
                                    break;
                                }
                        }
                        break;
                    }
                case "nanoid":
                    {
                        addPattern(res, zodPatterns.nanoid, check.message, refs);
                    }
                case "toLowerCase":
                case "toUpperCase":
                case "trim":
                    break;
                default:
                    ((_)=>{})(check);
            }
        }
    }
    return res;
}
function escapeLiteralCheckValue(literal, refs) {
    return refs.patternStrategy === "escape" ? escapeNonAlphaNumeric(literal) : literal;
}
const ALPHA_NUMERIC = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");
function escapeNonAlphaNumeric(source) {
    let result = "";
    for(let i = 0; i < source.length; i++){
        if (!ALPHA_NUMERIC.has(source[i])) {
            result += "\\";
        }
        result += source[i];
    }
    return result;
}
// Adds a "format" keyword to the schema. If a format exists, both formats will be joined in an allOf-node, along with subsequent ones.
function addFormat(schema, value, message, refs) {
    if (schema.format || schema.anyOf?.some((x)=>x.format)) {
        if (!schema.anyOf) {
            schema.anyOf = [];
        }
        if (schema.format) {
            schema.anyOf.push({
                format: schema.format,
                ...schema.errorMessage && refs.errorMessages && {
                    errorMessage: {
                        format: schema.errorMessage.format
                    }
                }
            });
            delete schema.format;
            if (schema.errorMessage) {
                delete schema.errorMessage.format;
                if (Object.keys(schema.errorMessage).length === 0) {
                    delete schema.errorMessage;
                }
            }
        }
        schema.anyOf.push({
            format: value,
            ...message && refs.errorMessages && {
                errorMessage: {
                    format: message
                }
            }
        });
    } else {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(schema, "format", value, message, refs);
    }
}
// Adds a "pattern" keyword to the schema. If a pattern exists, both patterns will be joined in an allOf-node, along with subsequent ones.
function addPattern(schema, regex, message, refs) {
    if (schema.pattern || schema.allOf?.some((x)=>x.pattern)) {
        if (!schema.allOf) {
            schema.allOf = [];
        }
        if (schema.pattern) {
            schema.allOf.push({
                pattern: schema.pattern,
                ...schema.errorMessage && refs.errorMessages && {
                    errorMessage: {
                        pattern: schema.errorMessage.pattern
                    }
                }
            });
            delete schema.pattern;
            if (schema.errorMessage) {
                delete schema.errorMessage.pattern;
                if (Object.keys(schema.errorMessage).length === 0) {
                    delete schema.errorMessage;
                }
            }
        }
        schema.allOf.push({
            pattern: stringifyRegExpWithFlags(regex, refs),
            ...message && refs.errorMessages && {
                errorMessage: {
                    pattern: message
                }
            }
        });
    } else {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$errorMessages$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setResponseValueAndErrors"])(schema, "pattern", stringifyRegExpWithFlags(regex, refs), message, refs);
    }
}
// Mutate z.string.regex() in a best attempt to accommodate for regex flags when applyRegexFlags is true
function stringifyRegExpWithFlags(regex, refs) {
    if (!refs.applyRegexFlags || !regex.flags) {
        return regex.source;
    }
    // Currently handled flags
    const flags = {
        i: regex.flags.includes("i"),
        m: regex.flags.includes("m"),
        s: regex.flags.includes("s")
    };
    // The general principle here is to step through each character, one at a time, applying mutations as flags require. We keep track when the current character is escaped, and when it's inside a group /like [this]/ or (also) a range like /[a-z]/. The following is fairly brittle imperative code; edit at your peril!
    const source = flags.i ? regex.source.toLowerCase() : regex.source;
    let pattern = "";
    let isEscaped = false;
    let inCharGroup = false;
    let inCharRange = false;
    for(let i = 0; i < source.length; i++){
        if (isEscaped) {
            pattern += source[i];
            isEscaped = false;
            continue;
        }
        if (flags.i) {
            if (inCharGroup) {
                if (source[i].match(/[a-z]/)) {
                    if (inCharRange) {
                        pattern += source[i];
                        pattern += `${source[i - 2]}-${source[i]}`.toUpperCase();
                        inCharRange = false;
                    } else if (source[i + 1] === "-" && source[i + 2]?.match(/[a-z]/)) {
                        pattern += source[i];
                        inCharRange = true;
                    } else {
                        pattern += `${source[i]}${source[i].toUpperCase()}`;
                    }
                    continue;
                }
            } else if (source[i].match(/[a-z]/)) {
                pattern += `[${source[i]}${source[i].toUpperCase()}]`;
                continue;
            }
        }
        if (flags.m) {
            if (source[i] === "^") {
                pattern += `(^|(?<=[\r\n]))`;
                continue;
            } else if (source[i] === "$") {
                pattern += `($|(?=[\r\n]))`;
                continue;
            }
        }
        if (flags.s && source[i] === ".") {
            pattern += inCharGroup ? `${source[i]}\r\n` : `[${source[i]}\r\n]`;
            continue;
        }
        pattern += source[i];
        if (source[i] === "\\") {
            isEscaped = true;
        } else if (inCharGroup && source[i] === "]") {
            inCharGroup = false;
        } else if (!inCharGroup && source[i] === "[") {
            inCharGroup = true;
        }
    }
    try {
        new RegExp(pattern);
    } catch  {
        console.warn(`Could not convert regex pattern at ${refs.currentPath.join("/")} to a flag-independent form! Falling back to the flag-ignorant source`);
        return regex.source;
    }
    return pattern;
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/tuple.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseTupleDef",
    ()=>parseTupleDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
;
function parseTupleDef(def, refs) {
    if (def.rest) {
        return {
            type: "array",
            minItems: def.items.length,
            items: def.items.map((x, i)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(x._def, {
                    ...refs,
                    currentPath: [
                        ...refs.currentPath,
                        "items",
                        `${i}`
                    ]
                })).reduce((acc, x)=>x === undefined ? acc : [
                    ...acc,
                    x
                ], []),
            additionalItems: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(def.rest._def, {
                ...refs,
                currentPath: [
                    ...refs.currentPath,
                    "additionalItems"
                ]
            })
        };
    } else {
        return {
            type: "array",
            minItems: def.items.length,
            maxItems: def.items.length,
            items: def.items.map((x, i)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(x._def, {
                    ...refs,
                    currentPath: [
                        ...refs.currentPath,
                        "items",
                        `${i}`
                    ]
                })).reduce((acc, x)=>x === undefined ? acc : [
                    ...acc,
                    x
                ], [])
        };
    }
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/undefined.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseUndefinedDef",
    ()=>parseUndefinedDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/any.js [app-route] (ecmascript)");
;
function parseUndefinedDef(refs) {
    return {
        not: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseAnyDef"])(refs)
    };
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/union.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseUnionDef",
    ()=>parseUnionDef,
    "primitiveMappings",
    ()=>primitiveMappings
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
;
const primitiveMappings = {
    ZodString: "string",
    ZodNumber: "number",
    ZodBigInt: "integer",
    ZodBoolean: "boolean",
    ZodNull: "null"
};
function parseUnionDef(def, refs) {
    if (refs.target === "openApi3") return asAnyOf(def, refs);
    const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
    // This blocks tries to look ahead a bit to produce nicer looking schemas with type array instead of anyOf.
    if (options.every((x)=>x._def.typeName in primitiveMappings && (!x._def.checks || !x._def.checks.length))) {
        // all types in union are primitive and lack checks, so might as well squash into {type: [...]}
        const types = options.reduce((types, x)=>{
            const type = primitiveMappings[x._def.typeName]; //Can be safely casted due to row 43
            return type && !types.includes(type) ? [
                ...types,
                type
            ] : types;
        }, []);
        return {
            type: types.length > 1 ? types : types[0]
        };
    } else if (options.every((x)=>x._def.typeName === "ZodLiteral" && !x.description)) {
        // all options literals
        const types = options.reduce((acc, x)=>{
            const type = typeof x._def.value;
            switch(type){
                case "string":
                case "number":
                case "boolean":
                    return [
                        ...acc,
                        type
                    ];
                case "bigint":
                    return [
                        ...acc,
                        "integer"
                    ];
                case "object":
                    if (x._def.value === null) return [
                        ...acc,
                        "null"
                    ];
                case "symbol":
                case "undefined":
                case "function":
                default:
                    return acc;
            }
        }, []);
        if (types.length === options.length) {
            // all the literals are primitive, as far as null can be considered primitive
            const uniqueTypes = types.filter((x, i, a)=>a.indexOf(x) === i);
            return {
                type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
                enum: options.reduce((acc, x)=>{
                    return acc.includes(x._def.value) ? acc : [
                        ...acc,
                        x._def.value
                    ];
                }, [])
            };
        }
    } else if (options.every((x)=>x._def.typeName === "ZodEnum")) {
        return {
            type: "string",
            enum: options.reduce((acc, x)=>[
                    ...acc,
                    ...x._def.values.filter((x)=>!acc.includes(x))
                ], [])
        };
    }
    return asAnyOf(def, refs);
}
const asAnyOf = (def, refs)=>{
    const anyOf = (def.options instanceof Map ? Array.from(def.options.values()) : def.options).map((x, i)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(x._def, {
            ...refs,
            currentPath: [
                ...refs.currentPath,
                "anyOf",
                `${i}`
            ]
        })).filter((x)=>!!x && (!refs.strictUnions || typeof x === "object" && Object.keys(x).length > 0));
    return anyOf.length ? {
        anyOf
    } : undefined;
};
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/parsers/unknown.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "parseUnknownDef",
    ()=>parseUnknownDef
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/any.js [app-route] (ecmascript)");
;
function parseUnknownDef(refs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseAnyDef"])(refs);
}
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/selectParser.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "selectParser",
    ()=>selectParser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/types.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/any.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$array$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/array.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$bigint$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/bigint.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/boolean.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$branded$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/branded.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$catch$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/catch.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/date.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$default$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/default.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$effects$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/effects.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$enum$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/enum.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$intersection$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/intersection.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$literal$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/literal.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$map$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/map.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$nativeEnum$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/nativeEnum.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$never$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/never.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$null$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/null.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$nullable$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$number$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/number.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$object$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/object.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$optional$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/optional.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$pipeline$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/pipeline.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$promise$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/promise.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$record$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/record.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$set$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/set.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$string$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/string.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$tuple$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/tuple.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$undefined$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/undefined.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$union$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/union.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$unknown$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/unknown.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$readonly$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/readonly.js [app-route] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const selectParser = (def, typeName, refs)=>{
    switch(typeName){
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodString:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$string$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseStringDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodNumber:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$number$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseNumberDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodObject:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$object$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseObjectDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodBigInt:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$bigint$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseBigintDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodBoolean:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseBooleanDef"])();
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodDate:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$date$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDateDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodUndefined:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$undefined$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseUndefinedDef"])(refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodNull:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$null$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseNullDef"])(refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodArray:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$array$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseArrayDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodUnion:
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodDiscriminatedUnion:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$union$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseUnionDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodIntersection:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$intersection$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseIntersectionDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodTuple:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$tuple$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseTupleDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodRecord:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$record$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseRecordDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodLiteral:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$literal$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseLiteralDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodEnum:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$enum$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseEnumDef"])(def);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodNativeEnum:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$nativeEnum$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseNativeEnumDef"])(def);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodNullable:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$nullable$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseNullableDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodOptional:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$optional$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseOptionalDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodMap:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$map$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseMapDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodSet:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$set$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseSetDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodLazy:
            return ()=>def.getter()._def;
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodPromise:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$promise$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parsePromiseDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodNaN:
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodNever:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$never$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseNeverDef"])(refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodEffects:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$effects$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseEffectsDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodAny:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseAnyDef"])(refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodUnknown:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$unknown$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseUnknownDef"])(refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodDefault:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$default$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDefaultDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodBranded:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$branded$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseBrandedDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodReadonly:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$readonly$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseReadonlyDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodCatch:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$catch$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseCatchDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodPipeline:
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$pipeline$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parsePipelineDef"])(def, refs);
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodFunction:
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodVoid:
        case __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$types$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ZodFirstPartyTypeKind"].ZodSymbol:
            return undefined;
        default:
            return ((_)=>undefined)(typeName);
    }
};
}),
"[project]/node_modules/zod-to-json-schema/dist/esm/zodToJsonSchema.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "zodToJsonSchema",
    ()=>zodToJsonSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parseDef.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$Refs$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/Refs.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zod-to-json-schema/dist/esm/parsers/any.js [app-route] (ecmascript)");
;
;
;
const zodToJsonSchema = (schema, options)=>{
    const refs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$Refs$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getRefs"])(options);
    let definitions = typeof options === "object" && options.definitions ? Object.entries(options.definitions).reduce((acc, [name, schema])=>({
            ...acc,
            [name]: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(schema._def, {
                ...refs,
                currentPath: [
                    ...refs.basePath,
                    refs.definitionPath,
                    name
                ]
            }, true) ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseAnyDef"])(refs)
        }), {}) : undefined;
    const name = typeof options === "string" ? options : options?.nameStrategy === "title" ? undefined : options?.name;
    const main = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parseDef$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseDef"])(schema._def, name === undefined ? refs : {
        ...refs,
        currentPath: [
            ...refs.basePath,
            refs.definitionPath,
            name
        ]
    }, false) ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2d$to$2d$json$2d$schema$2f$dist$2f$esm$2f$parsers$2f$any$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["parseAnyDef"])(refs);
    const title = typeof options === "object" && options.name !== undefined && options.nameStrategy === "title" ? options.name : undefined;
    if (title !== undefined) {
        main.title = title;
    }
    if (refs.flags.hasReferencedOpenAiAnyType) {
        if (!definitions) {
            definitions = {};
        }
        if (!definitions[refs.openAiAnyTypeName]) {
            definitions[refs.openAiAnyTypeName] = {
                // Skipping "object" as no properties can be defined and additionalProperties must be "false"
                type: [
                    "string",
                    "number",
                    "integer",
                    "boolean",
                    "array",
                    "null"
                ],
                items: {
                    $ref: refs.$refStrategy === "relative" ? "1" : [
                        ...refs.basePath,
                        refs.definitionPath,
                        refs.openAiAnyTypeName
                    ].join("/")
                }
            };
        }
    }
    const combined = name === undefined ? definitions ? {
        ...main,
        [refs.definitionPath]: definitions
    } : main : {
        $ref: [
            ...refs.$refStrategy === "relative" ? [] : refs.basePath,
            refs.definitionPath,
            name
        ].join("/"),
        [refs.definitionPath]: {
            ...definitions,
            [name]: main
        }
    };
    if (refs.target === "jsonSchema7") {
        combined.$schema = "http://json-schema.org/draft-07/schema#";
    } else if (refs.target === "jsonSchema2019-09" || refs.target === "openAi") {
        combined.$schema = "https://json-schema.org/draft/2019-09/schema#";
    }
    if (refs.target === "openAi" && ("anyOf" in combined || "oneOf" in combined || "allOf" in combined || "type" in combined && Array.isArray(combined.type))) {
        console.warn("Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property.");
    }
    return combined;
};
;
}),
];})()

//# sourceMappingURL=%5Broot-of-the-server%5D__1ut8skq9-2g_s._.js.map