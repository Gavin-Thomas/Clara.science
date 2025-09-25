export interface ExplanationData {
  title: string;
  explanationPoints: string[];
}

export interface GenerateResult extends ExplanationData {
  imageData: string; // base64 data URI
}

export interface EditResult {
  imageData: string; // base64 data URI
  text?: string;
  newExplanationPoint: string;
}
