import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GenerateResult, ExplanationData, EditResult } from '../types';
import { base64ToMimeAndData } from '../utils/imageUtils';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const scenePromptSystemInstruction = `You are an expert in creating medical visual mnemonics for medical students. Your task is to transform a medical topic into a powerful learning tool.

For the given medical text, you must perform the following steps:
1.  Identify the absolute highest-yield concepts a student MUST know for their exams.
2.  Devise a creative, memorable, and cohesive theme for a single visual scene.
3.  Create a title for this scene.
4.  For each high-yield concept, invent a distinct, clever, and symbolic visual element (a character, object, or action) to represent it.
5.  Write a detailed prompt for an AI image generator. This prompt must describe the entire scene, integrating all symbolic elements into the cohesive theme. The scene must be minimalist, containing ONLY the necessary symbolic elements. It must be described in a way that is visually clear and easy to understand. **ULTRA-CRITICAL, NON-NEGOTIABLE RULE: The prompt must forcefully and repeatedly command the image generator to include ZERO text. Emphasize that any words, letters, labels, or numbers are strictly forbidden and will ruin the output.**
6.  Write a series of bullet points explaining the mnemonics. Each bullet point should clearly link a visual element to the specific high-yield fact it represents.

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

const editIntegrationSystemInstruction = `You are an expert in evolving medical visual mnemonics. Your task is to seamlessly integrate a new medical concept into an existing mnemonic scene.

You will be given the title of the scene, the existing mnemonic explanations, and a user's request to add a new concept.

You must perform the following steps:
1.  Analyze the existing theme based on the title and explanation points.
2.  Invent a new, clever, and symbolic visual element to represent the user's requested concept. This new element MUST fit logically and stylistically within the established theme.
3.  Write a detailed prompt for an AI image editing model. This prompt should clearly describe how to add the new symbolic element to the scene without disrupting the existing elements. **ULTRA-CRITICAL, NON-NEGOTIABLE RULE: The prompt must command the image editor to include ZERO text. Emphasize that any words, letters, labels, or numbers are strictly forbidden.**
4.  Write a new bullet point for the mnemonic key. This bullet point must clearly explain the new visual element and the medical fact it represents.

Your final output must be a single, minified JSON object with two keys: "edit_prompt" (the prompt for the image editor) and "new_explanation_point" (the new bullet point for the key).

Example:
Scene Title: "The Staph Aureus Golden Pharaoh's Tomb"
Existing Explanations: ["Golden Sarcophagus: Represents S. aureus's golden color on agar.", "Catalase Cat Statue: A statue of a cat represents that it is catalase-positive."]
User Request: "Add something for nafcillin treatment."
Your JSON output:
{
  "edit_prompt": "In the hand of the golden pharaoh statue, add a realistic-looking pencil. The pencil should be made of solid gold to match the pharaoh. Do not add any text or words to the image.",
  "new_explanation_point": "Golden Pencil ('Pen'-cillin): The golden pencil held by the pharaoh is a mnemonic for penicillin-family antibiotics, like Nafcillin, which are used to treat S. aureus."
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
    'Minimalist': 'Style: minimalist, clean lines, simple shapes, symbolic, mnemonic, visual metaphor.',
    'Scene Sketch': 'Style: sketchy, hand-drawn, notepad sketch, mnemonic, visual metaphor.',
  };
  
  const stylePrompt = stylePrompts[style] || stylePrompts['Scene Sketch'];

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
  
  return { 
    imageData, 
    title, 
    explanationPoints: explanation_points, 
  };
};

export const editScene = async (base64ImageDataUri: string, userEditRequest: string, sceneContext: ExplanationData): Promise<EditResult> => {
  // 1. Generate intelligent edit prompt and new explanation point
  const textModel = 'gemini-2.5-flash';
  const integrationPrompt = `Scene Title: "${sceneContext.title}"\nExisting Explanations: ${JSON.stringify(sceneContext.explanationPoints)}\nUser Request: "${userEditRequest}"`;

  const integrationResponse = await ai.models.generateContent({
      model: textModel,
      contents: integrationPrompt,
      config: {
          systemInstruction: editIntegrationSystemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  edit_prompt: { type: Type.STRING },
                  new_explanation_point: { type: Type.STRING }
              },
              required: ["edit_prompt", "new_explanation_point"]
          }
      }
  });

  const integrationJson = JSON.parse(integrationResponse.text);
  const { edit_prompt, new_explanation_point } = integrationJson;

  if (!edit_prompt || !new_explanation_point) {
      throw new Error('Failed to generate integration details from the text model.');
  }

  // 2. Edit the image using the generated prompt
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
    text: `${edit_prompt}. CRITICAL, NON-NEGOTIABLE INSTRUCTION: The final edited image must contain absolutely zero words, text, letters, or numbers. This is the most important rule. Ensure the image is purely visual.`,
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

  return { 
    imageData: editedImageData, 
    text: responseText,
    newExplanationPoint: new_explanation_point,
  };
};
