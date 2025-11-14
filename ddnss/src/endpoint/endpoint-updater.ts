import { Address6 } from "ip-address";
import { EndpointUnit } from "../config/config-types";
import { Address4Or6 } from "../helper/ip-helper";
import { ServerMain } from "../main";
import { CloudflareAAAAEndpointUpdater } from "./cloudflare";

export interface EndpointUpdater<Addr extends Address4Or6> {
	update (runId: string, address: Addr): Promise<void>;
}

export const EndpointUpdate = {
	
	get (config: EndpointUnit, server: ServerMain): EndpointUpdater<Address6> {
		if (config.record.record == 'A') {
			throw new Error('IPv4 A record endpoint updater not implemented yet');
		}
		return new CloudflareAAAAEndpointUpdater(
			server,
			config.account,
			config.zone_id,
			config.record_id,
			config.check_name == 'as-name' ? config.name : config.check_name,
			server.config.server_name
		)
	}
	
}
