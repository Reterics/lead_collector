import {firebaseAuth, getFunctionsBaseUrl} from "../config.ts";

export async function transcribeViaFunction(file: File, languageCode = "en-US") {
  const user = firebaseAuth?.currentUser;
  if (!user) throw new Error("Not authenticated");

  const idToken = await user.getIdToken(); // current user's ID token
  // Convert file to base64 (no prefix)
  const arrayBuffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);

  const base = getFunctionsBaseUrl();
  const resp = await fetch(base + "/api/transcribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ audioBase64: base64, languageCode }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }
  return await resp.json() as Promise<{
    transcript: string;
    results: Array<{ text: string; confidence: number }>;
  }>;
}
