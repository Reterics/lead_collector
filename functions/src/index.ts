import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import type {NextFunction, Request, Response} from "express";
import express from "express";
import cors from "cors";
import Busboy from "busboy";
import { SpeechClient, protos } from "@google-cloud/speech";
import {Storage} from "@google-cloud/storage";
import {auth} from "firebase-admin";
import DecodedIdToken = auth.DecodedIdToken;

admin.initializeApp(); // uses default service account in Cloud Functions environment

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "25mb" })); // for JSON base64 uploads

const speechClient = new SpeechClient();
const storage = new Storage();
const GCS_BUCKET = process.env.GCLOUD_BUCKET; // set in functions config env or in console

interface AuthenticatedRequest extends Request {
  auth?: DecodedIdToken;
  rawBody?: string
}
// Middleware: verify Firebase ID token
async function verifyFirebaseIdToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = (req.get("Authorization") || "").split("Bearer ").pop();
    const idToken = authHeader || (req.query && (req.query.idToken as string)) || null;
    if (!idToken) return res.status(401).json({ error: "Missing Authorization header" });
    (req as AuthenticatedRequest).auth = await admin.auth().verifyIdToken(idToken);
    return next();
  } catch (err) {
    console.error("verify token failed", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * POST /transcribe
 * - Accepts JSON: { audioBase64: string, languageCode?: string }
 * - or multipart/form-data with `file` field (webm)
 * - Short-sync transcription (synchronous recognize) for short clips (~<=60s)
 */
app.post("/transcribe", verifyFirebaseIdToken, async (req: Request, res: Response) => {
  try {
    // Support two upload modes: JSON base64 or multipart form-data
    if (req.is("application/json") && req.body?.audioBase64) {
      const audioBase64 = req.body.audioBase64 as string;
      const languageCode = String(req.body.languageCode || "hu-HU");

      const request: protos.google.cloud.speech.v1.IRecognizeRequest = {
        audio: { content: audioBase64 },
        config: {
          encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS,
          languageCode,
          enableAutomaticPunctuation: true,
        },
      };

      const [response] = await speechClient.recognize(request);
      const results =
        response.results?.map(r => ({
          text: r.alternatives?.[0]?.transcript ?? "",
          confidence: r.alternatives?.[0]?.confidence ?? 0,
        })) ?? [];
      const transcript = results.map(r => r.text).join(" ").trim();
      return res.json({ transcript, results });
    }

    if (req.is("multipart/form-data") || (req.headers["content-type"] || "").includes("multipart/form-data")) {
      const busboy = Busboy({ headers: req.headers });
      let fileBuffer: Buffer | null = null;
      let filename = "audio.webm";
      let languageCode = "en-US";

      await new Promise<void>((resolve, reject) => {
        busboy.on("file", (_fieldname, file, info) => {
          const chunks: Buffer[] = [];
          filename = info?.filename ?? filename;
          file.on("data", (d) => chunks.push(d));
          file.on("end", () => {
            fileBuffer = Buffer.concat(chunks);
          });
        });
        busboy.on("field", (name, val) => {
          if (name === "languageCode") languageCode = String(val || "en-US");
        });
        busboy.on("finish", resolve);
        busboy.on("error", reject);
        // In Firebase Functions, rawBody is available for multipart
        busboy.end((req as AuthenticatedRequest).rawBody ?? (req as AuthenticatedRequest).body);
      });

      if (!fileBuffer) return res.status(400).json({ error: "No file uploaded" });

      const base64 = fileBuffer.toString("base64");

      const request: protos.google.cloud.speech.v1.IRecognizeRequest = {
        audio: { content: base64 },
        config: {
          encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS,
          languageCode,
          enableAutomaticPunctuation: true,
        },
      };

      const [response] = await speechClient.recognize(request);
      const results =
        response.results?.map((r) => ({
          text: r.alternatives?.[0]?.transcript ?? "",
          confidence: r.alternatives?.[0]?.confidence ?? 0,
        })) ?? [];
      const transcript = results.map((r) => r.text).join(" ").trim();

      return res.json({ transcript, results });
    }

    return res.status(400).json({ error: "Unsupported content type or missing audio" })
  } catch (err) {
    console.error("transcribe error", err);
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

/**
 * POST /transcribe/gcs
 * - Accepts a multipart file, uploads to GCS, then starts longRunningRecognize on that GCS URI.
 * - Returns operation result (may wait for completion or return op name).
 */
app.post("/transcribe/gcs", verifyFirebaseIdToken, async (req: Request, res: Response) => {
  try {
    if (!GCS_BUCKET) return res.status(500).json({ error: "GCS_BUCKET not configured" });

    const busboy = Busboy({ headers: req.headers });
    let fileBuffer: Buffer | null = null;
    let filename = `upload-${Date.now()}.webm`;
    let languageCode = "en-US";

    await new Promise<void>((resolve, reject) => {
      busboy.on("file", (_fieldname, file, info) => {
        const chunks: Buffer[] = [];
        filename = info?.filename ?? filename;
        file.on("data", (d) => chunks.push(d));
        file.on("end", () => {
          fileBuffer = Buffer.concat(chunks);
        });
      });
      busboy.on("field", (name, val) => {
        if (name === "languageCode") languageCode = String(val || "en-US");
      });
      busboy.on("finish", resolve);
      busboy.on("error", reject);
      busboy.end((req as AuthenticatedRequest).rawBody ?? (req as AuthenticatedRequest).body);
    });

    if (!fileBuffer) return res.status(400).json({ error: "No file uploaded" });

    // Upload to GCS
    const bucket = storage.bucket(GCS_BUCKET);
    const file = bucket.file(filename);
    await file.save(fileBuffer, { resumable: false, contentType: "audio/webm" });

    const gcsUri = `gs://${GCS_BUCKET}/${filename}`;

    // v1 long-running recognize uses { audio: { uri }, config: {...} }
    const [op] = await speechClient.longRunningRecognize({
      audio: { uri: gcsUri },
      config: {
        encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        languageCode,
        enableAutomaticPunctuation: true,
      },
    });

    const [finalResp] = await op.promise();

    const results =
      finalResp.results?.map((r) => ({
        text: r.alternatives?.[0]?.transcript ?? "",
        confidence: r.alternatives?.[0]?.confidence ?? 0,
      })) ?? [];
    const transcript = results.map((r) => r.text).join(" ").trim();

    // optional cleanup
    await file.delete().catch(() => null);

    return res.json({ transcript, results });
  } catch (err) {
    console.error("transcribe/gcs error", err);
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
});

export const api = functions.https.onRequest(app);

// Create a user profile document on auth user creation (external sign-up)
export const onAuthUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    const db = admin.firestore();
    const docRef = db.collection('users').doc(user.uid);
    const snap = await docRef.get();
    if (snap.exists) return; // don't overwrite if exists

    const teamId = user.uid; // each external signup gets their own team by default
    await docRef.set({
      email: user.email ?? null,
      username: user.email ?? user.uid,
      role: 'user',
      teamId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.error('onAuthUserCreate failed:', e);
  }
});
