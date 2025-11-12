import { Address6 } from "ip-address";
import { EndpointUpdater } from "./endpoint-updater";
import { CloudflareAPIAccount } from "../config/config-types";
import { cloudflareIsSuccess, CloudflareRecordUpdateTask, SetRecordCloudflareConfig } from "../services/cloudflare";
import { ServerMain } from "../new-main";
import { define } from "../utils/defines";
import { strip } from "../utils/logging";

export class CloudflareAAAAEndpointUpdater implements EndpointUpdater<Address6> {
	
	constructor (
		private server: ServerMain,
		private account: CloudflareAPIAccount,
		private zoneId: string,
		private recordId: string,
		private expectedName: string | null = null,
		private serverName: string | undefined = undefined
	) {}
	
	async update (runId: string, address: Address6): Promise<void> {
		
		const config = define<SetRecordCloudflareConfig>({
			zone_id: this.zoneId,
			record_id: this.recordId,
			name: this.expectedName || '',
			type: 'AAAA',
			proxied: false,
			ttl: 60,
			allow_name_change: this.expectedName !== null,
		})
		
		this.server.logger.info(`updating record to Cloudflare.`);
		if (this.expectedName === null) {
			this.server.logger.warn(`you did not specify expected record name, record name may be changed unexpectedly!`);
			this.server.logger.warn(`extend record configuration is not implemented yet. when record name is not specified, the endpoint name is used instead. this may cause unexpected name changes!!!`);
		}
		
		const task = new CloudflareRecordUpdateTask(
			{ token: this.account.api_key },
			config,
			{
				content: address.correctForm(),
				comment: `[${this.serverName || ''} auto updated, on ${new Date().toISOString()}]`
			}
		)
		const resp = await task.execute()
		
		if (cloudflareIsSuccess(resp)) {
			
			this.server.logger.info(strip(`
				|successfully updated record:
				| - name: ${resp.result.zone_name} >> ${resp.result.name}
				| - type=${resp.result.type} proxy=${resp.result.proxied} ttl=${resp.result.ttl}
				| - value: ${resp.result.content}
				| - comment: ${resp.result.comment}
			`))
			
		} else {
			this.server.logger.error(`failed to update record: \n${resp.errors.map(e =>
				`  [err ${e.code}] ${e.message}`
			).join('\n')}`)
		}
		
	}
	
}