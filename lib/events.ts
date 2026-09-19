// Server-side real-time event broadcaster for Next.js API routes

type EventCallback = (eventName: string, data: unknown) => void;

const globalEmitter = global as unknown as {
  __aimless_subscribers?: Set<EventCallback>;
};

if (!globalEmitter.__aimless_subscribers) {
  globalEmitter.__aimless_subscribers = new Set<EventCallback>();
}

export function subscribeToEvents(callback: EventCallback): () => void {
  globalEmitter.__aimless_subscribers!.add(callback);
  return () => {
    globalEmitter.__aimless_subscribers!.delete(callback);
  };
}

export function broadcastEvent(eventName: string, data: unknown): void {
  const subscribers = globalEmitter.__aimless_subscribers;
  if (!subscribers) return;

  for (const sub of subscribers) {
    try {
      sub(eventName, data);
    } catch (err) {
      console.error(`[Event Broadcast Error for ${eventName}]:`, err);
    }
  }
}
