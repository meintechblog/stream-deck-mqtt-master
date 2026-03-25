import type { BrokerConfig } from "../types/settings";

export function brokerKey(config: BrokerConfig): string {
  const protocol = config.tls ? "mqtts" : "mqtt";
  return `${protocol}://${config.host.trim()}:${config.port}`;
}
