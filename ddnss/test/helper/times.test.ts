import { parseDuration } from "../../src/helper/times.js";
import { describe, it, expect } from "vitest";

describe("parseDuration", () => {
	
	it("should parses simple milliseconds", () => {
		expect(parseDuration("10ms")).toBe(10);
	});
	
	it("should parses minutes, seconds and milliseconds", () => {
		expect(parseDuration("50min 0s 1ms")).toBe(50 * 60 * 1000 + 1);
	});
	
	it("should parses large composite value matching Scala example", () => {
		// 1090035d 6h 38min 21s 720ms -> 94179047901720 ms (from the Scala example)
		expect(parseDuration("1090035d 6h 38min 21s 720ms")).toBe(94179047901720);
	});
	
	it("should be forgiving about extra whitespace", () => {
		expect(parseDuration(" 50min   0s  1ms ")).toBe(50 * 60 * 1000 + 1);
	});
	
	it("should parse mixed ordered duration correctly", () => {
		expect(parseDuration("1s 500ms")).toBe(1500);
		expect(parseDuration("500ms 1s")).toBe(1500);
	});
	
	it("should throw on empty string", () => {
		expect(() => parseDuration("")).toThrow();
	});
	
	it("should throw on unknown unit", () => {
		expect(() => parseDuration("5yr")).toThrow();
	});
	
});
