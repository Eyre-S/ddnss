import { Address6 } from "ip-address";
import { EndpointUpdater } from "./endpoint-updater";
import { CloudflareAPIAccount } from "../config/config-types";
import { CloudflareRecordUpdateTask } from "../services/cloudflare";

export class CloudflareAAAAEndpointUpdater implements EndpointUpdater<Address6> {
	
	constructor (
		private account: CloudflareAPIAccount,
		private zoneId: string,
		private recordId: string,
		private expectedName: string | null = null,
		private serverName: string | undefined = undefined
	) {}
	
	async update (runId: string, address: Address6): Promise<void> {
		
		const task = new CloudflareRecordUpdateTask(
			{ token: this.account.api_key },
			{
				zone_id: this.zoneId,
				record_id: this.recordId,
				name: this.expectedName || '',
				type: 'AAAA',
				proxied: false,
				ttl: 60,
				allow_name_change: this.expectedName !== null,
			},
			{
				content: address.correctForm(),
				comment: `[${this.serverName || ''} auto updated, on ${new Date().toISOString()}]`
			}
		)
		const resp = await task.execute()
		
	}
	
}