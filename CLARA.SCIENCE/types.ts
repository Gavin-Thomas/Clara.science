export interface GenerateResult {
  imageData: string; // base64 data URI
  explanation: string;
}

export interface EditResult {
  imageData: string; // base64 data URI
  text?: string;
}
