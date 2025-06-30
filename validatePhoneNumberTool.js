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
        description: "Check if a phone number is valid and show basic info",
        schema: z.object({
            number: z.string()
        }),
        returnType: "content_and_artifact"
    }
);

// Example usage: Invoke the tool with a sample phone number
validatePhoneNumber.invoke({ number: "+14158586273" }).then(([msg, data]) => {
    console.log(msg);
    console.log(data);
});
