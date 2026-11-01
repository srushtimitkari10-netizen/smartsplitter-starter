
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));
export async function GET() {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const models = [];

    for await (const model of await ai.models.list()) {
      if (model.supportedActions?.includes('generateContent')) {
        models.push(model.name);
      }
    }

    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing from .env.local" },
        { status: 500 }
      );
    }

    const { sentence } = await request.json();

    if (
      !sentence ||
      typeof sentence !== "string" ||
      !sentence.trim()
    ) {
      return NextResponse.json(
        { error: "Please enter an expense sentence." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    let response;
    let lastError;

    // Retry temporary Gemini errors up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash",

          contents: `
You are an intelligent expense-splitting assistant.

Convert the user's sentence into an expense split.

USER SENTENCE: "${sentence}"

RULES:
1. "me, Raj and Priya" means 3 people.
2. "split with 2 friends" means 3 people in total.
3. "just me" means 1 person.
4. Identify the expense amount.
5. Identify a short expense description.
6. Calculate each = amount / people.
7. Return ONLY valid JSON. No markdown or explanations.

Example:
{"amount":1200,"people":3,"each":400,"description":"dinner"}
`,

          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                amount: { type: "NUMBER" },
                people: { type: "INTEGER" },
                each: { type: "NUMBER" },
                description: { type: "STRING" }
              },
              required: [
                "amount",
                "people",
                "each",
                "description"
              ]
            }
          }
        });

        break;
      } catch (error) {
        lastError = error;

        const errorText =
          `${error.status || ""} ${error.message || ""}`.toLowerCase();

        const temporaryError =
          error.status === 503 ||
          error.status === 429 ||
          error.status === 500 ||
          errorText.includes("unavailable") ||
          errorText.includes("overloaded") ||
          errorText.includes("high demand") ||
          errorText.includes("503");

        if (!temporaryError || attempt === 3) {
          throw error;
        }

        console.log(
          `Gemini attempt ${attempt} failed. Retrying...`
        );

        await sleep(attempt * 1500);
      }
    }

    if (!response) {
      throw lastError || new Error("Gemini did not return a response.");
    }

    const responseText = response.text;

    if (!responseText) {
      throw new Error("Gemini returned an empty response.");
    }

    const cleanedResponse = responseText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const result = JSON.parse(cleanedResponse);

    if (
      !Number.isFinite(result.amount) ||
      !Number.isInteger(result.people) ||
      result.amount <= 0 ||
      result.people < 1 ||
      typeof result.description !== "string"
    ) {
      return NextResponse.json(
        { error: "Gemini returned invalid expense details." },
        { status: 422 }
      );
    }

    // Calculate the split on the server
    result.each = Number(
      (result.amount / result.people).toFixed(2)
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error("Gemini API error:", error);

    const status =
      error.status === 503 || error.status === 429
        ? error.status
        : 500;

    return NextResponse.json(
      {
        error:
          status === 503 || status === 429
            ? "Gemini is temporarily busy. Please try again shortly."
            : error.message || "Unknown Gemini API error"
      },
      { status }
    );
  }
}
