import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { useDialogA11y } from "./dialog-a11y";

function Harness() {
  const [open, setOpen] = useState(false);
  const ref = useDialogA11y(open, () => setOpen(false));

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <main id="main-content">
        <a href="#content">content</a>
      </main>
      {open ? (
        <div ref={ref} role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button">first</button>
          <button type="button">last</button>
        </div>
      ) : null}
    </>
  );
}

describe("useDialogA11y", () => {
  it("traps focus, locks the page, and restores focus on Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "open" }));

    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "first" })).toHaveFocus();
    expect(document.getElementById("main-content")).toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("hidden");

    // هوک یک فریم بعد دوباره فوکوس اول را اعمال می‌کند (requestAnimationFrame
    // در useDialogA11y)؛ اگر Tab پیش از آن فریم برسد، فوکوس به «first»
    // برمی‌گردد و تست flaky می‌شود. فریم باید پیش از Tab رد شده باشد.
    await new Promise((resolve) => requestAnimationFrame(resolve));

    await user.tab();
    expect(screen.getByRole("button", { name: "last" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "first" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "open" })).toHaveFocus();
    expect(document.getElementById("main-content")).not.toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("");
  });
});
