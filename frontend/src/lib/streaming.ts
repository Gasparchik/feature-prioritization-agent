export function getChunkText(event: Record<string, unknown>): string | null {
  return typeof event.text === 'string' ? event.text : null
}

export function isStreamDone(
  event: Record<string, unknown>
): event is { done: true; usage: { input: number; output: number } } {
  return event.done === true
}
