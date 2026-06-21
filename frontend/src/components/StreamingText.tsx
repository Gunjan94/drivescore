/** Renders streamed SSE tokens with a blinking cursor while in flight. */
export function StreamingText({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <p className="text-[17px] leading-relaxed text-text">
      {text}
      {streaming && <span className="blink text-accent">▋</span>}
      {!text && streaming && <span className="text-muted">Generating…</span>}
    </p>
  );
}
