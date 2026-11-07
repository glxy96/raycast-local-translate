import { vi } from "vitest";

export interface RecordedRequest {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** Replace global fetch with a handler and record what was sent. */
export function mockFetch(handler: (req: RecordedRequest) => Response | Promise<Response>) {
  const requests: RecordedRequest[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const req = {
        url,
        headers: (init?.headers ?? {}) as Record<string, string>,
        body: init?.body ? JSON.parse(init.body as string) : {},
      };
      requests.push(req);
      return handler(req);
    }),
  );
  return requests;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** An SSE response whose chunks deliberately split lines in odd places, like a real network would. */
export function sse(deltas: string[], chunkSize = 7): Response {
  const text =
    deltas.map((d) => `data: ${JSON.stringify({ choices: [{ delta: { content: d } }] })}\n\n`).join("") +
    "data: [DONE]\n\n";
  const bytes = new TextEncoder().encode(text);
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize));
        controller.close();
      },
    }),
  );
}
