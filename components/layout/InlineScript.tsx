/**
 * Script that runs while the HTML is parsed, before the first paint.
 * `text/plain` on the client keeps React from warning about rendering a <script>
 * (pattern from Next's "Preventing flash before hydration" guide).
 */
export default function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
