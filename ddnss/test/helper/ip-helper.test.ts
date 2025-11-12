import { IPv6CIDR2Mask, reverseIPv6, mergeIPv6, applyIPv6Mask } from "../../src/helper/ip-helper.js";
import { Address6 } from "ip-address";
import { describe, expect, it } from "vitest";

describe("IP Helper Tests", () => {
	
	describe("IPv6CIDR2Mask", () => {
		
		describe("should converts IP-CIDR suffix to IP Mask", () => {
			
			const map: [number, string][] = [
				[0, "::"],
				[1, "8000::"],
				[2, "c000::"],
				[3, "e000::"],
				[4, "f000::"],
				[5, "f800::"],
				[6, "fc00::"],
				[8, "ff00::"],
				[60, "ffff:ffff:ffff:fff0::"],
				[62, "ffff:ffff:ffff:fffc::"],
				[64, "ffff:ffff:ffff:ffff::"],
				[128, "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
				// [-64, "::ffff:ffff:ffff:ffff"] // should support at future
			]
			
			for (const [prefixLength, expectedMask] of map) {
				it(`prefixLength /${prefixLength} -> mask ${expectedMask}`, () => {
					const maskIP = IPv6CIDR2Mask(prefixLength);
					expect(maskIP).toBeInstanceOf(Address6);
					expect(maskIP.correctForm()).toBe(expectedMask);
				});
			}
			
		});
		
	})
	
	describe("applyIPv6Mask", () => {
		
		describe("should apply IPv6 mask by bitwise AND", () => {
			const map: [string, string, string][] = [
				["2001:0db8:85a3::8a2e:0370:7334", "ffff:ffff:ffff:ffff::", "2001:db8:85a3::"],
				["fe80::1ff:fe23:4567:890a", "ffff:ffff:ffff:ffff::", "fe80::"],
				["1234:5678:9abc:def0:1234:5678:9abc:def0", "ffff:ffff::", "1234:5678::"],
				["::1", "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ff00", "::"],
				["2001:0db8:85a3::8a2e:370:7334", "::ffff:ffff:ffff:ffff", "::8a2e:370:7334"],
				["2001:0db8:85a3::8a2e:370:7334", "f000::1861:0000", "2000::60:0"]
			];
			for (const [ipStr, maskStr, expectedStr] of map) {
				it(`ip ${ipStr} %mask ${maskStr} -> ${expectedStr}`, () => {
					const ip = new Address6(ipStr);
					const mask = new Address6(maskStr);
					const maskedIP = applyIPv6Mask(ip, mask);
					expect(maskedIP).toBeInstanceOf(Address6);
					expect(maskedIP.correctForm()).toBe(expectedStr);
				});
			}
		});
		
	})
	
	describe("reverseIPv6", () => {
		
		describe("should reverse the given IPv6 by bit", () => {
			
			const map: [string, string][] = [
				["::", "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff" ],
				["8000::", "7fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
				["c000::", "3fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
				["e000::", "1fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
				["f000::", "fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
				["f800::", "7ff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
				["fc00::", "3ff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
				["ff00::", "ff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
				["ffff:ffff:ffff:fff0::", "::f:ffff:ffff:ffff:ffff"],
				["ffff:ffff:ffff:fffc::", "::3:ffff:ffff:ffff:ffff"],
				["ffff:ffff:ffff:ffff::", "::ffff:ffff:ffff:ffff"],
				["ff00:ff00:ff00:ff00:ff00:ff00:ff00:ff00", "ff:ff:ff:ff:ff:ff:ff:ff"],
				["abcd:1234:abcd:7890::1", "5432:edcb:5432:876f:ffff:ffff:ffff:fffe"],
			]
			
			for (const [a, b] of map) {
				describe(`ip ${a} <-> reversed ${b}`, () => {
					
					it(`should reverse correctly`, () => {
						const ip = new Address6(a);
						const reversedMaskIP = reverseIPv6(ip);
						expect(reversedMaskIP).toBeInstanceOf(Address6);
						expect(reversedMaskIP.correctForm()).toBe(b);
					})
					
					it(`should reverse back correctly`, () => {
						const ip = new Address6(b);
						const reversedMaskIP = reverseIPv6(ip);
						expect(reversedMaskIP).toBeInstanceOf(Address6);
						expect(reversedMaskIP.correctForm()).toBe(a);
					})
					
				});
			}
			
		})
		
	})
	
	describe("mergeIPv6", () => {
		
		describe("should merge two IPv6 addresses by bitwise OR", () => {
			const map: [string, string, string][] = [
				["::", "::", "::"],
				["::", "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff", "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
				["8000::", "4000::", "c000::"],
				["ff00:ff00:ff00:ff00:ff00:ff00:ff00:ff00", "00ff:00ff:00ff:00ff:00ff:00ff:00ff:00ff", "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"],
				["abcd:1234:abcd:7890::1", "::", "abcd:1234:abcd:7890::1"],
				["2210:b7ac:7523:7a00::", "::efea:97a", "2210:b7ac:7523:7a00::efea:97a"],
			];
			
			for (const [a, b, expected] of map) {
				describe(`${a} + ${b} -> ${expected}`, () => {
					it("should merge correctly (order A|B)", () => {
						const ip1 = new Address6(a);
						const ip2 = new Address6(b);
						const merged = mergeIPv6(ip1, ip2);
						expect(merged).toBeInstanceOf(Address6);
						expect(merged.correctForm()).toBe(expected);
					});
					
					it("should merge correctly (order B|A)", () => {
						const ip1 = new Address6(a);
						const ip2 = new Address6(b);
						const merged = mergeIPv6(ip2, ip1);
						expect(merged).toBeInstanceOf(Address6);
						expect(merged.correctForm()).toBe(expected);
					});
				});
			}
		});
		
	})
	
})
