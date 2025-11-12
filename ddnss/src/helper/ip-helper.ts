import { Address4, Address6 } from "ip-address";

export type IPTypes = 'A' | 'AAAA';
export type Address4Or6 = Address4 | Address6;

export function IPv6CIDR2Mask(prefixLength: number): Address6 {
	
	if (!Number.isInteger(prefixLength)) {
		throw new TypeError('prefixLength must be an integer');
	}
	if (prefixLength < 0 || prefixLength > 128) {
		throw new RangeError('prefixLength must be between 0 and 128');
	}
	
	// Build eight 16-bit groups for the IPv6 address mask
	const groups: string[] = [];
	let remaining = prefixLength;
	for (let i = 0; i < 8; i++) {
		const bits = Math.min(remaining, 16);
		remaining -= bits;
		let val = 0;
		if (bits === 16) {
			val = 0xffff;
		} else if (bits > 0) {
			// Create a mask with `bits` leading ones in a 16-bit field.
			// Example: bits=4 -> 1111 0000 0000 0000 -> 0xF000
			// Use left shift on 0xffff then clamp to 16 bits.
			val = (0xffff << (16 - bits)) & 0xffff;
		} else {
			val = 0;
		}
		groups.push(val.toString(16).padStart(4, '0'));
	}
	
	const addrStr = groups.join(':');
	return new Address6(addrStr);
	
}

function expandIPv6ToHextets(ipStr: string): string[] {
	// normalize to lowercase
	const s = ipStr.toLowerCase();
	// if contains '::' we need to expand the omitted zeros
	if (s.includes('::')) {
		const parts = s.split('::');
		const left = parts[0] === '' ? [] : parts[0].split(':');
		const right = parts[1] === '' ? [] : parts[1].split(':');
		const missing = 8 - (left.length + right.length);
		const middle = new Array(missing).fill('0');
		const groups = [...left, ...middle, ...right];
		return groups.map(g => g.padStart(4, '0'));
	}
	const groups = s.split(':');
	// If already full-length, pad each to 4 chars
	return groups.map(g => g.padStart(4, '0'));
}

export function applyIPv6Mask(ip: Address6, mask: Address6): Address6 {
	const ipStr = ip.correctForm ? ip.correctForm() : (ip as any).address || ip.toString();
	const maskStr = mask.correctForm ? mask.correctForm() : (mask as any).address || mask.toString();
	const ipHextets = expandIPv6ToHextets(ipStr);
	const maskHextets = expandIPv6ToHextets(maskStr);
	const maskedHextets = ipHextets.map((hextet, idx) => {
		const ipVal = parseInt(hextet, 16) & 0xffff;
		const maskVal = parseInt(maskHextets[idx], 16) & 0xffff;
		const andVal = (ipVal & maskVal) & 0xffff;
		return andVal.toString(16).padStart(4, '0');
	});
	const maskedAddrStr = maskedHextets.join(':');
	return new Address6(maskedAddrStr);
}

export function reverseIPv6(ip: Address6): Address6 {
	const ipStr = ip.correctForm ? ip.correctForm() : (ip as any).address || ip.toString();
	const hextets = expandIPv6ToHextets(ipStr);
	const reversed = hextets.map(h => {
			const val = parseInt(h, 16) & 0xffff;
			const rev = (~val) & 0xffff;
		return rev.toString(16).padStart(4, '0');
	}).join(':');
	return new Address6(reversed);
}

export function mergeIPv6(ip1: Address6, ip2: Address6): Address6 {
	const s1 = ip1.correctForm ? ip1.correctForm() : (ip1 as any).address || ip1.toString();
	const s2 = ip2.correctForm ? ip2.correctForm() : (ip2 as any).address || ip2.toString();
	const h1 = expandIPv6ToHextets(s1);
	const h2 = expandIPv6ToHextets(s2);
	const merged = h1.map((hextet, idx) => {
		const v1 = parseInt(hextet, 16) & 0xffff;
		const v2 = parseInt(h2[idx], 16) & 0xffff;
		const orv = (v1 | v2) & 0xffff;
		return orv.toString(16).padStart(4, '0');
	}).join(':');
	return new Address6(merged);
}
