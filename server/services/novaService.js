/**
 * Nova Service — AWS Bedrock Integration
 * ========================================
 * Central service layer for all Amazon Nova model interactions.
 *
 * Models used:
 *   • amazon.nova-lite-v1:0       — text reasoning, explanations, test generation
 *   • amazon.nova-lite-v1:0       — also handles multimodal (image + text) inputs
 *   • amazon.nova-sonic-v1:0      — reserved for real-time voice (future streaming)
 *
 * Every public function builds a prompt, calls Bedrock via InvokeModelCommand,
 * and returns parsed results.  All errors bubble up to the controller layer.
 */

const {
    BedrockRuntimeClient,
    InvokeModelCommand,
} = require('@aws-sdk/client-bedrock-runtime');

// ----- AWS Bedrock Client (Bearer Token auth) -----
const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    token: {
        token: process.env.AWS_BEARER_TOKEN_BEDROCK,
    },
});

// ----- Model IDs -----
const NOVA_LITE_MODEL = 'amazon.nova-lite-v1:0';

// ----- Math formatting instruction (appended to every system prompt) -----
const MATH_FORMAT_INSTRUCTION =
    ' When writing mathematical expressions, ALWAYS use LaTeX delimiters: ' +
    'use $...$ for inline math (e.g. $x^2 + 1$) and $$...$$ for display/block math ' +
    '(e.g. $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$). ' +
    'Never use plain [ ] or ( ) as math delimiters. ' +
    'NEVER output HTML tags such as <span>, <div>, or any KaTeX-rendered HTML. ' +
    'Output plain text with LaTeX math only — no HTML whatsoever.';

/**
 * sanitizeAiText
 * Strips KaTeX HTML spans the AI accidentally emits.
 *
 * Method: iteratively remove the INNERMOST spans first (those with no nested
 * tags), then outer spans become leaves — repeat until stable. This correctly
 * handles arbitrary nesting depth with zero character-counting bugs.
 *
 * After span removal, the plain-text that the AI writes right after
 * the katex span is the only text remaining — exactly what we want.
 */
function sanitizeAiText(text) {
    if (!text.includes('<') && !text.includes('&lt;')) return text; // fast path

    let result = text;

    // Decode HTML entities for angle brackets so the regexes below always
    // see real '<' '>' regardless of how the AI escaped them.
    result = result
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');

    // Replace <span class="katex">CONTENT</span> (any nesting depth) with just CONTENT.
    // We iterate until stable — each pass flattens one nesting level.
    let prev;
    do {
        prev = result;
        // Leaf spans: no nested '<' inside (safe single-pass per level)
        result = result.replace(/<span[^>]*>([^<]*)<\/span>/gi, '$1');
    } while (result !== prev);

    // Strip any remaining unclosed/unpaired span tags
    result = result.replace(/<\/?span[^>]*>/gi, '');

    // <br> → newline
    result = result.replace(/<br\s*\/?>/gi, '\n');

    // Strip all remaining HTML tags (div, etc.), keeping text content
    result = result.replace(/<[^>]+>/gi, '');

    return result.replace(/\n{3,}/g, '\n\n');
}


// ----- Helper: call Nova text model -----
async function invokeNovaText(messages, systemPrompt = '') {
    /**
     * Amazon Nova Lite uses the "messages" API format.
     * We build a request body that includes system instructions
     * and the conversation messages array.
     */
    const body = {
        schemaVersion: 'messages-v1',
        messages,
        system: [{ text: systemPrompt }],
        inferenceConfig: {
            max_new_tokens: 2048,
            temperature: 0.7,
            top_p: 0.9,
        },
    };

    const command = new InvokeModelCommand({
        modelId: NOVA_LITE_MODEL,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(body),
    });

    const response = await bedrockClient.send(command);
    const parsed = JSON.parse(new TextDecoder().decode(response.body));

    // Nova returns { output: { message: { content: [{ text }] } } }
    return parsed?.output?.message?.content?.[0]?.text ?? '';
}

// ----- Helper: call Nova multimodal (image + text) -----
async function invokeNovaMultimodal(base64Image, textPrompt) {
    /**
     * For image understanding we send the image as a base64-encoded
     * content block alongside the text prompt in the same user message.
     * Nova Lite supports multimodal inputs natively.
     */
    const body = {
        schemaVersion: 'messages-v1',
        messages: [
            {
                role: 'user',
                content: [
                    {
                        image: {
                            format: 'jpeg',
                            source: { bytes: base64Image },
                        },
                    },
                    { text: textPrompt },
                ],
            },
        ],
        system: [
            {
                text: 'You are an expert tutor for competitive exams (JEE, NIMCET, GATE). Analyse the image carefully.',
            },
        ],
        inferenceConfig: {
            max_new_tokens: 2048,
            temperature: 0.3,
        },
    };

    const command = new InvokeModelCommand({
        modelId: NOVA_LITE_MODEL,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(body),
    });

    const response = await bedrockClient.send(command);
    const parsed = JSON.parse(new TextDecoder().decode(response.body));
    return parsed?.output?.message?.content?.[0]?.text ?? '';
}

// ===================================================================
// Public API
// ===================================================================

/**
 * solveFromImage
 * Accepts a base64-encoded image of a math / science problem.
 * 1. Sends the image to Nova multimodal to extract and understand the question.
 * 2. Asks Nova Lite to generate a detailed step-by-step solution.
 */
async function solveFromImage(base64Image) {
    // Step 1 — Extract the question from the image
    const extractionPrompt =
        'Extract the math or science question from this image. ' +
        'Write it out clearly in text form. If there are diagrams, describe them.';
    const extractedQuestion = await invokeNovaMultimodal(base64Image, extractionPrompt);

    // Step 2 — Solve the extracted question step-by-step
    const solveMessages = [
        {
            role: 'user',
            content: [
                {
                    text:
                        `Here is a question extracted from a student's image:\n\n${extractedQuestion}\n\n` +
                        'Please solve this step-by-step. Show all working. ' +
                        'At the end, clearly state the final answer.',
                },
            ],
        },
    ];

    const systemPrompt =
        'You are a friendly and patient tutor for JEE, NIMCET, and GATE exams. ' +
        'Provide clear, step-by-step solutions with explanations a student can follow.' +
        MATH_FORMAT_INSTRUCTION;

    const solution = await invokeNovaText(solveMessages, systemPrompt);

    return {
        extractedQuestion: sanitizeAiText(extractedQuestion),
        solution: sanitizeAiText(solution),
    };
}

/**
 * chat
 * Conversational AI tutor.  Accepts an array of { role, content } messages
 * and returns the assistant's reply.
 */
async function chat(conversationMessages) {
    // Convert simple { role, content } to Nova's expected format
    const messages = conversationMessages.map((m) => ({
        role: m.role,
        content: [{ text: m.content }],
    }));

    const systemPrompt =
        'You are a warm, encouraging AI tutor helping students prepare for JEE, NIMCET, and GATE. ' +
        'Explain concepts in simple language, use examples, and be patient.' +
        MATH_FORMAT_INSTRUCTION;

    const reply = await invokeNovaText(messages, systemPrompt);
    return sanitizeAiText(reply);
}

/**
 * generateTest
 * Creates a practice test for the given topic with `count` questions.
 * Returns a JSON array of question objects.
 */
async function generateTest(topic, count = 5) {
    const messages = [
        {
            role: 'user',
            content: [
                {
                    text:
                        `Generate a high-quality practice test on the topic "${topic}" for competitive exam preparation (JEE/NIMCET/GATE).\n` +
                        `Number of questions: ${count}.\n` +
                        'IMPORTANT: Ensure that the "correctAnswer" strictly matches the correct option from the "options" array.\n' +
                        'Return ONLY a valid JSON array. Each element must have:\n' +
                        '  "question": string (with clear problem statement),\n' +
                        '  "options": ["A. ...", "B. ...", "C. ...", "D. ..."] (four distinct choices),\n' +
                        '  "correctAnswer": "A" | "B" | "C" | "D" (the single correct choice),\n' +
                        '  "explanation": string (clear, step-by-step reasoning for the correct answer)\n' +
                        'Double-check that the marked "correctAnswer" is indeed the logically correct one among the options.\n' +
                        'Do NOT include any markdown formatting, extra text, or commentary. Just the JSON array.',
                },
            ],
        },
    ];

    const systemPrompt =
        'You are a rigorous test-generation engine. Your primary goal is accuracy. ' +
        'Ensure the "correctAnswer" always aligns with the provided "options" and is logically correct.';

    const raw = await invokeNovaText(messages, systemPrompt);

    // Try to parse the JSON from the response
    try {
        // Strip possible markdown code fences
        const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch {
        // If parsing fails, return raw text so the controller can decide what to do
        return raw;
    }
}

/**
 * analyzePerformance
 * Accepts an array of attempt summaries and asks Nova to identify weak topics
 * and recommend a study plan.
 */
async function analyzePerformance(attempts) {
    const summary = attempts
        .map(
            (a) =>
                `Topic: ${a.topic} | Score: ${a.score}/${a.total} (${Math.round(
                    (a.score / a.total) * 100
                )}%)`
        )
        .join('\n');

    const messages = [
        {
            role: 'user',
            content: [
                {
                    text:
                        `Here are a student's recent practice test results:\n\n${summary}\n\n` +
                        'Identify the weak topics where the student needs improvement. ' +
                        'Provide specific study recommendations and suggest which topics to focus on next. ' +
                        'Be encouraging but honest.',
                },
            ],
        },
    ];

    const systemPrompt =
        'You are an academic performance coach. Analyze the data and give actionable, motivating advice.';

    const analysis = await invokeNovaText(messages, systemPrompt);
    return sanitizeAiText(analysis);
}

module.exports = {
    solveFromImage,
    chat,
    generateTest,
    analyzePerformance,
};
