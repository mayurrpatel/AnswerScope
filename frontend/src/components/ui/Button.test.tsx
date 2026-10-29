import { render, screen } from "@testing-library/react";
import { test, expect } from "vitest";
import { Button } from "./Button";
import { Badge } from "./Badge";

test("renders Button variants with semantic classes", () => {
  const { rerender } = render(<Button variant="primary">Click Me</Button>);
  const btn = screen.getByRole("button");
  expect(btn).toHaveClass("bg-primary");

  rerender(<Button variant="secondary">Cancel</Button>);
  expect(btn).toHaveClass("bg-surface");

  rerender(<Button variant="danger">Delete</Button>);
  expect(btn).toHaveClass("bg-danger");
});

test("renders Badge variants with token styles", () => {
  render(<Badge variant="success">Completed</Badge>);
  expect(screen.getByText("Completed")).toHaveClass("text-success");
});
