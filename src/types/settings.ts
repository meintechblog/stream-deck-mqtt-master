import { z } from "zod";

// Global Settings -- stored securely, NOT exported in profiles (CONN-06)
export const GlobalSettingsSchema = z.object({
  broker: z
    .object({
      host: z.string().min(1),
      port: z.number().int().min(1).max(65535).default(1883),
      username: z.string().optional(),
      password: z.string().optional(),
      tls: z.boolean().default(false),
      clientId: z.string().optional(), // auto-generated if missing
    })
    .optional(),
});
export type GlobalSettings = z.infer<typeof GlobalSettingsSchema>;

// Broker config extracted for ConnectionManager use
export interface BrokerConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls: boolean;
  clientId?: string;
}

// Action Settings -- per button, exported in profiles
// Phase 1: broker config stored here for simplicity (sdpi-components auto-binding)
// Phase 2: move broker credentials to global settings for security (CONN-06)
export const MqttActionSettingsSchema = z.object({
  brokerHost: z.string().optional(),
  brokerPort: z.string().optional(), // stored as string from PI textfield
  subscribeTopic: z.string().optional(),
  publishTopic: z.string().optional(),
  publishPayload: z.string().optional(),
  qos: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
  retain: z.boolean().default(false),
  lastValue: z.string().optional(), // cached for restart recovery
});
export type MqttActionSettings = z.infer<typeof MqttActionSettingsSchema>;
