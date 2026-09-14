import { z } from "zod";

const usernameMaxLength = 64;

export const TelegramAuthRequestSchema = z.object({
  initData: z.string().trim().min(1).max(4096)
}).strict();

export const TelegramUserSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().min(1).max(256),
  last_name: z.string().max(256).optional(),
  username: z.string().max( usernameMaxLength ).optional(),
  language_code: z.string().min(2).max(16).optional(),
  is_premium: z.boolean().optional(),
  allows_write_to_pm: z.boolean().optional(),
  photo_url: z.string().url().max(2048).optional()
}).passthrough();

export const AuthIdentitySchema = z.object({
  provider: z.literal("telegram"),
  providerUserId: z.string().regex(/^[1-9][0-9]{0,31}$/),
  authDate: z.string().datetime({ offset: true })
}).strict();

export type TelegramAuthRequest = z.infer<typeof TelegramAuthRequestSchema>;
export type TelegramUser = z.infer<typeof TelegramUserSchema>;
export type AuthIdentity = z.infer<typeof AuthIdentitySchema>;
