// Load environment variables from .env file
import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// Load API key for NumVerify from environment variables
const ACCESS_KEY = process.env.NUMVERIFY_API_KEY;

// Define a LangChain tool that checks if a phone number is valid
const validatePhoneNumber = tool(
    async ({ number }) => {
        const res = await fetch(`http://apilayer.net/api/validate?access_key=${ACCESS_KEY}&number=${number}`);
        const data = await res.json();
        // Construct a user-friendly message based on the validity of the number
        const msg = data.valid
            ? `Valid: ${data.country_name}, ${data.carrier}, ${data.line_type}`
            : "Invalid phone number";
        // Return a tuple: message string and raw response data
        return [msg, data];
    },
    {
        name: "validate_phone_number",
        description: "Check the country of a phone number",
        schema: z.object({
            number: z.string()
        }),
        returnType: "content_and_artifact"
    }
);

const model = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash",
    temperature: 0,
    apiKey: process.env.GOOGLE_API_KEY
});

// Bind the tools to the LLM
const modelWithTools = model.bindTools([validatePhoneNumber]);

// Example 1: Simple tool usage
console.log("=== Example 1: Basic Tool Usage ===");
const response = await modelWithTools.invoke([
    new HumanMessage("I'm about to call a phone number, but I'm not sure what country it's for. Can you help me with that? Here is the number: +14158586273")
]);

console.log("AI Response:", response.content);
console.log("Tool calls", response.tool_calls);

// Example 2: Handle tool calls manually
console.log("\n=== Example 2: Manual Tool Execution ===");
if (response.tool_calls && response.tool_calls.length > 0) {
    console.log("Tool call detected:", response.tool_calls);

    for (const toolCall of response.tool_calls) {
        if (toolCall.name === "validate_phone_number") {
            const args = toolCall.args;
            const [msg, data] = await validatePhoneNumber.invoke(args);
            console.log("Tool response message:", msg);
            console.log("Full tool output:", data);
        } else {
            console.log("Unknown tool:", toolCall.name);
        }
    }
} else {
    console.log("No tool was called by the model.");
}

// Example 3: Error handling
async function runPhoneCheck() {
    try {
        const messages = [
            new HumanMessage(
                "I'm about to call a phone number, but I'm not sure what country it's for. Can you help me with that? Here is the number: +1415"
            ),
        ]

        const response = await modelWithTools.invoke(messages);

        console.log("LLM Response:", response.content);

        // Check tool response
        const toolResponse = response.additional_kwargs?.tool_responses?.[0];
        const data = toolResponse?.output;

        if (!data) {
            console.log("Tool was not called or returned no data.");
            return;
        }

        if (data.valid && data.country_name) {
            console.log(`This number is from: ${data.country_name}`);
        } else {
            console.log("Invalid phone number or country not found.");
        }
    } catch (error) {
        console.error("Global error:", error.message);
    }


}

// Run the check
runPhoneCheck();

