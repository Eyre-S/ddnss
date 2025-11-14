import { Address6 } from "ip-address";
import { Address4Or6 } from "../helper/ip-helper";
import { RecordUnit } from "../config/config-types";
import { LocalPrefixIPGetterV6 } from "./local-prefix-ip-getter";
import { LocalIPGetters, LocalIPGetterV6 } from "./local-ip-getter";
import { ServerMain } from "../main";

export interface IPGetter <T extends Address4Or6> {
	
	getIP(runId: string): Promise<T>;
	
}

export interface IPV6Getter extends IPGetter<Address6> {}

let cachedDefaultGetter: IPGetter<Address6> | null = null;
export function getDefaultLocalIPGetterV6 (server: ServerMain): IPGetter<Address6> {
	if (cachedDefaultGetter === null) {
		cachedDefaultGetter = new LocalIPGetterV6(
			server,
			LocalIPGetters.FETCH_NO_IP
		);
	}
	return cachedDefaultGetter;
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
					server,
					getDefaultLocalIPGetterV6(server),
					prefixMask,
					new Address6(configRecord.suffix),
				);
			}
			case 'local': {
				return getDefaultLocalIPGetterV6(server);
			}
		}
	} else {
		throw new Error(`IPGetter for record type ${configRecord.record} is not implemented`);
	}
}
