import { Address6 } from "ip-address";
import { Address4Or6 } from "../helper/ip-helper";
import { RecordUnit } from "../config/config-types";
import { LocalPrefixIPGetterV6 } from "./local-prefix-ip-getter";
import { LocalIPGetterV6 } from "./local-ip-getter";
import { ServerMain } from "../new-main";

export interface IPGetter <T extends Address4Or6> {
	
	getIP(runId: string): Promise<T>;
	
}

export interface IPV6Getter extends IPGetter<Address6> {}

const defaultLocalIPGetterV6 = new LocalIPGetterV6()
export function getDefaultLocalIPGetterV6 (): IPGetter<Address6> {
	return defaultLocalIPGetterV6;
}

export function getIPGetter (configRecord: RecordUnit, server: ServerMain): IPV6Getter {
	if (configRecord.record === 'AAAA') {
		switch (configRecord.type) {
			case 'local_prefix': {
				let prefixMask: number|Address6;
				if (typeof configRecord.prefix_mask === 'number') {
					prefixMask = configRecord.prefix_mask;
				} else {
					prefixMask = new Address6(configRecord.prefix_mask);
				}
				return new LocalPrefixIPGetterV6(
					getDefaultLocalIPGetterV6(),
					prefixMask,
					new Address6(configRecord.suffix),
				);
			}
			case 'local': {
				return getDefaultLocalIPGetterV6();
			}
		}
	} else {
		throw new Error(`IPGetter for record type ${configRecord.record} is not implemented`);
	}
}
