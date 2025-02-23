// import { Request, Response, NextFunction } from "express";
// import pkg from "openai";
// import dotenv from "dotenv";

// dotenv.config();

// const { Configuration, OpenAIApi } = pkg;

// const configuration = new Configuration({
//   apiKey: process.env.OPENAI_API_KEY,
// });
// const openai = new OpenAIApi(configuration);

// export const chatHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   try {
//     const { messages } = req.body; // Expect an array of messages with role and content
//     if (!messages || !Array.isArray(messages)) {
//       res.status(400).json({ error: "Messages array is required" });
//       return;
//     }

//     // Call the OpenAI ChatCompletion API
//     const completion = await openai.createChatCompletion({
//       model: "gpt-3.5-turbo",
//       messages: messages,
//     });

//     const reply = completion.data.choices[0].message?.content;
//     res.status(200).json({ reply });
//   } catch (error) {
//     next(error);
//   }
// };
