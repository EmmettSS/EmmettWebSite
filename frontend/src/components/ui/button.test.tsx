import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("onClick را هنگام کلیک فراخوانی می‌کند", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>ارسال</Button>);

    await user.click(screen.getByRole("button", { name: "ارسال" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("در حالت isLoading غیرفعال می‌شود و aria-busy دارد تا از کلیک تکراری جلوگیری شود", () => {
    render(<Button isLoading>در حال ارسال</Button>);

    const button = screen.getByRole("button", { name: "در حال ارسال" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("در حالت disabled صریح، حتی بدون isLoading، غیرفعال می‌ماند", () => {
    render(<Button disabled>غیرفعال</Button>);
    expect(screen.getByRole("button", { name: "غیرفعال" })).toBeDisabled();
  });

  it("کلاس variant انتخابی را اعمال می‌کند", () => {
    render(<Button variant="secondary">ثانویه</Button>);
    expect(screen.getByRole("button", { name: "ثانویه" })).toHaveClass("border-border");
  });
});
