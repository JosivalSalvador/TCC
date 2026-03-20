import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("Utils: cn", () => {
  it("deve juntar classes normais de string", () => {
    expect(cn("p-4", "m-2")).toBe("p-4 m-2");
  });

  it("deve lidar com classes condicionais", () => {
    expect(
      cn("p-4", {
        "bg-red-500": true,
        "text-white": false,
      }),
    ).toBe("p-4 bg-red-500");
  });

  it("deve resolver conflitos do Tailwind (prevalecendo a última)", () => {
    // "px-2 py-1" e "p-4" conflitam. O "p-4" ganha.
    // "bg-red-500" e "bg-blue-500" conflitam. O azul ganha.
    expect(cn("px-2 py-1 bg-red-500", "p-4 bg-blue-500")).toBe(
      "p-4 bg-blue-500",
    );
  });
});
