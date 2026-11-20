import * as z from 'zod/v4';

export const app = "panoforge";
export const prefix = "panoforge";
export const port = 45937;
export const operation = "create_image";
export const description = "Generate a base image from the current form or expand the selected image into a 360-degree panorama. Use job_get for the stored file.";
export const input = z.object({ action: z.enum(["base", "panorama"]) }).strict();
export const output = z.object({ kind: z.enum(["base", "panorama"]), imageData: z.string().min(1).max(25_000_000) }).strict();
