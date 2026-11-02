import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormGroup } from "./form-group";
import { Input } from "@/components/ui/input";

describe("FormGroup", () => {
  it("label را با فیلد از طریق htmlFor/id به‌هم متصل می‌کند", () => {
    render(
      <FormGroup label="نام">
        <Input />
      </FormGroup>,
    );

    expect(screen.getByLabelText("نام")).toBeInTheDocument();
  });

  it("وقتی hint دارد، فیلد را با aria-describedby به آن متصل می‌کند", () => {
    render(
      <FormGroup label="ایمیل" hint="برای اطلاع‌رسانی استفاده می‌شود">
        <Input />
      </FormGroup>,
    );

    const field = screen.getByLabelText("ایمیل");
    const describedBy = field.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(screen.getByText("برای اطلاع‌رسانی استفاده می‌شود")).toHaveAttribute("id", describedBy);
  });

  it("وقتی error دارد، به‌جای hint همان پیام را با role=alert و aria-describedby نشان می‌دهد", () => {
    render(
      <FormGroup label="رمز عبور" hint="حداقل ۸ کاراکتر" error="رمز عبور الزامی است">
        <Input />
      </FormGroup>,
    );

    const field = screen.getByLabelText(/رمز عبور/);
    const errorNode = screen.getByRole("alert");
    expect(errorNode).toHaveTextContent("رمز عبور الزامی است");
    expect(field.getAttribute("aria-describedby")).toBe(errorNode.id);
    expect(screen.queryByText("حداقل ۸ کاراکتر")).not.toBeInTheDocument();
  });

  it("required را هم به‌صورت نشانهٔ بصری و هم aria-required منتقل می‌کند", () => {
    render(
      <FormGroup label="نام خانوادگی" required>
        <Input />
      </FormGroup>,
    );

    expect(screen.getByLabelText(/نام خانوادگی/)).toHaveAttribute("aria-required", "true");
  });
});
