export type WhatsAppMessage = {
  to: string;
  template: string;
  variables?: Record<string, string>;
};

export async function sendWhatsAppMessage(message: WhatsAppMessage) {
  return {
    provider: "mock-meta-whatsapp-cloud-api",
    status: "queued",
    messageId: `mock-wa-${Date.now()}`,
    message,
  };
}
