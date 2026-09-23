import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Layout and scrolling are verified by Playwright; jsdom has no scroll geometry.
HTMLElement.prototype.scrollIntoView = vi.fn();

afterEach(() => cleanup());
