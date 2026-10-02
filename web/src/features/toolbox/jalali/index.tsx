import { meta } from "./meta";
import { Tool } from "./Tool";
import { ToolRoute } from "../ui/ToolRoute";

export default function Page() {
  return (
    <ToolRoute meta={meta}>
      <Tool />
    </ToolRoute>
  );
}
