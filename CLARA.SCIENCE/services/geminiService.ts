import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GenerateResult, EditResult } from '../types';
import { base64ToMimeAndData } from '../utils/imageUtils';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const scenePromptSystemInstruction = `You are an expert in creating medical visual mnemonics specifically tailored for the Canadian Medical Council Qualifying Examination (MCCQE). Your task is to transform a medical topic into a powerful learning tool.

For the given medical text, you must perform the following steps:
1.  Identify the absolute highest-yield concepts a student MUST know for the MCCQE.
2.  Devise a creative, memorable, and cohesive theme for a single visual scene.
3.  Create a title for this scene.
4.  For each high-yield concept, invent a distinct, clever, and symbolic visual element (a character, object, or action) to represent it.
5.  Write a detailed prompt for an AI image generator. This prompt must describe the entire scene, integrating all symbolic elements into the cohesive theme. The scene must be minimalist, containing ONLY the necessary symbolic elements. It must be described in a way that is visually clear and easy to understand. **ULTRA-CRITICAL, NON-NEGOTIABLE RULE: The prompt must forcefully and repeatedly command the image generator to include ZERO text. Emphasize that any words, letters, labels, or numbers are strictly forbidden and will ruin the output.**
6.  Write a series of bullet points explaining the mnemonics. Each bullet point should clearly link a visual element to the specific MCCQE high-yield fact it represents.

Your final output must be a single, minified JSON object with three keys: "title", "scene_prompt", and "explanation_points". "explanation_points" must be an array of strings.

Example:
Medical Text: "Listeria monocytogenes"
Your JSON output:
{
  "title": "The Listeria Ice Cream Factory",
  "scene_prompt": "A vibrant, cartoon-style scene inside a chilly, sparkling ice cream factory. In the center, a determined-looking action figure character named 'General Lister' is rocketing upwards... The entire scene is clean, clear, and focused only on these key elements, with no extra distractions. **ABSOLUTELY NO WORDS, TEXT, LETTERS, OR NUMBERS are allowed in the image. This is the most important rule. The image must be purely visual.** The style is sketchy and mnemonic.",
  "explanation_points": [
    "General Lister in the cold factory: Listeria is often transmitted through contaminated food products that are refrigerated, such as soft cheeses and milk, as it can grow in cold temperatures.",
    "Rocket-powered action figure: Represents Listeria's characteristic end-over-end 'tumbling motility' at room temperature.",
    "Thick purple coat: A mnemonic for being a Gram-positive bacterium.",
    "Glowing lightbulb power source: Represents that Listeria is catalase-positive."
  ]
}`;

export const generateScene = async (medicalText: string, style: string): Promise<GenerateResult> => {
  const textModel = 'gemini-2.5-flash';

  const textGenerationResponse = await ai.models.generateContent({
    model: textModel,
    contents: medicalText,
    config: {
      systemInstruction: scenePromptSystemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          scene_prompt: { type: Type.STRING },
          explanation_points: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "scene_prompt", "explanation_points"]
      }
    }
  });

  const responseJson = JSON.parse(textGenerationResponse.text);
  const { title, scene_prompt, explanation_points } = responseJson;

  if (!scene_prompt || !explanation_points || !title) {
    throw new Error('Failed to generate scene details from the text model.');
  }
  
  const stylePrompts: { [key: string]: string } = {
    'Cartoon': 'Style: vibrant cartoon, animated, playful, mnemonic, visual metaphor.',
    'Realistic': 'Style: photorealistic, detailed, realistic lighting, mnemonic, visual metaphor.',
    'Minimalist': 'Style: minimalist, clean lines, simple shapes, symbolic, mnemonic, visual metaphor.',
    'Sketchy': 'Style: sketchy, hand-drawn, notepad sketch, mnemonic, visual metaphor.',
  };
  
  const stylePrompt = stylePrompts[style] || stylePrompts['Sketchy'];

  const fullPrompt = `${scene_prompt} ${stylePrompt} ULTRA-CRITICAL RULE: The image must contain ZERO text, ZERO letters, ZERO numbers. It must be a purely visual scene. Do NOT write on the image. This is a strict, non-negotiable instruction.`;

  const imageModel = 'imagen-4.0-generate-001';
  const imageGenerationResponse = await ai.models.generateImages({
    model: imageModel,
    prompt: fullPrompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '16:9',
    }
  });

  const generatedImage = imageGenerationResponse.generatedImages[0];
  if (!generatedImage || !generatedImage.image.imageBytes) {
    throw new Error('Failed to generate image.');
  }

  const imageData = `data:image/jpeg;base64,${generatedImage.image.imageBytes}`;
  const formattedExplanation = `${title}\n${explanation_points.map((pt: string) => `* ${pt}`).join('\n')}`;

  return { imageData, explanation: formattedExplanation };
};

export const editScene = async (base64ImageDataUri: string, prompt: string): Promise<EditResult> => {
  const { mimeType, data } = base64ToMimeAndData(base64ImageDataUri);

  if (!mimeType || !data) {
    throw new Error('Invalid image data URI.');
  }

  const imagePart = {
    inlineData: {
      data,
      mimeType,
    },
  };

  const textPart = {
    text: `${prompt}. CRITICAL, NON-NEGOTIABLE INSTRUCTION: The final edited image must contain absolutely zero words, text, letters, or numbers. This is the most important rule. Ensure the image is purely visual.`,
  };

  const editModel = 'gemini-2.5-flash-image-preview';

  const response = await ai.models.generateContent({
    model: editModel,
    contents: {
      parts: [imagePart, textPart],
    },
    config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  let editedImageData: string | null = null;
  let responseText: string | undefined = undefined;

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const { data: imgData, mimeType: imgMimeType } = part.inlineData;
      editedImageData = `data:${imgMimeType};base64,${imgData}`;
    } else if (part.text) {
        responseText = part.text;
    }
  }

  if (!editedImageData) {
    throw new Error('Failed to edit image. The model did not return an image.');
  }

  return { imageData: editedImageData, text: responseText };
};
