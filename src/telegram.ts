import { readFileSync } from "fs";

export async function callTelegramApi(
  botToken: string,
  method: string,
  params: Record<string, unknown>
): Promise<any> {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!data.ok) {
    throw new Error((data.description as string) || `Telegram API error`);
  }
  return data;
}

export async function sendFileViaTelegram(
  botToken: string,
  chatId: number,
  filePath: string
): Promise<void> {
  try {
    const fileContent = readFileSync(filePath);
    const fileName = filePath.split("/").pop() || "file";

    // Create FormData for file upload
    const formData = new FormData();
    formData.append("chat_id", String(chatId));
    formData.append(
      "document",
      new Blob([fileContent], { type: "application/octet-stream" }),
      fileName
    );

    const url = `https://api.telegram.org/bot${botToken}/sendDocument`;
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as Record<string, unknown>;
    if (!data.ok) {
      throw new Error((data.description as string) || "Failed to send file");
    }
  } catch (e: any) {
    throw new Error(`Error sending file: ${e.message}`);
  }
}
