import { Address6 } from "ip-address";
import { applyIPv6Mask, IPv6CIDR2Mask, mergeIPv6, reverseIPv6 } from "../helper/ip-helper";
import { IPV6Getter } from "./ip-getters";

export class LocalPrefixIPGetterV6 <T extends IPV6Getter> implements IPV6Getter {
	
	private readonly localPrefixMask: Address6;
	
	public constructor (
		private baseGetter: T,
		prefixMask: number|Address6,
		private suffixIP: Address6,
	) {
		if (typeof prefixMask === 'number') {
			this.localPrefixMask = IPv6CIDR2Mask(prefixMask);
		} else {
			this.localPrefixMask = prefixMask;
		}
	}
	
	public async getIP (runId: string): Promise<Address6> {
		const localIP = await this.baseGetter.getIP(runId);
		const suffixMask = reverseIPv6(this.localPrefixMask);
		const prefix = applyIPv6Mask(localIP, this.localPrefixMask);
		const suffix = applyIPv6Mask(this.suffixIP, suffixMask);
		const merged = mergeIPv6(prefix, suffix);
		return merged;
	}
	
}
