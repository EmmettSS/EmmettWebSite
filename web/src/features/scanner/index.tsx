import { ToolRoute } from "@/features/toolbox/ui/ToolRoute";
import { CheckSecurity } from "./CheckSecurity";
import { meta } from "./meta";

/** F-06 page. The scanner needs the API, so it is the one tool that is not offline-capable. */
export default function ScannerPage() {
  return (
    <ToolRoute meta={meta}>
      <CheckSecurity />
    </ToolRoute>
  );
}
