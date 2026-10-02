import { meta } from "./meta";
import { Tool } from "./Tool";
import { ToolRoute } from "@/features/toolbox/ui/ToolRoute";

/**
 * F-09 page. `ToolRoute` reads `meta.route`, so the canonical URL is /fa/biolab/ (or /en/biolab/)
 * even though the shared shell lives in the toolbox feature.
 */
export default function Page() {
  return (
    <ToolRoute meta={meta}>
      <Tool />
    </ToolRoute>
  );
}
