import { ToolRoute } from "@/features/toolbox/ui/ToolRoute";
import { Assistant } from "./Assistant";
import { meta } from "./meta";

export default function AssistantPage() {
  return (
    <ToolRoute meta={meta}>
      <Assistant />
    </ToolRoute>
  );
}
