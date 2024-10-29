type RecordType = 'A' | 'AAAA' | 'CNAME'

export interface SetRecordConfig {
	name: string,
	type: RecordType,
	proxied: boolean,
	ttl: number,
}

export interface SetRecordCloudflareConfig extends SetRecordConfig {
	zone_id: string,
	record_id: string,
	allow_name_change: boolean
}

export interface SetRecordCloudflareValues {
	content: string,
	comment: string,
}

export interface CloudflareRecordUpdateRequest {
	name: string,
	type: RecordType,
	content: string,
	proxied: boolean,
	ttl: number
	comment: string,
}

export class CloudflareRecordUpdateRequestImpl implements CloudflareRecordUpdateRequest {
	
	public readonly name: string
	public readonly type: RecordType
	public readonly content: string
	public readonly proxied: boolean
	public readonly ttl: number
	public readonly comment: string
	
	constructor (config: CloudflareRecordUpdateRequest) {
		this.name = config.name
		this.type = config.type
		this.content = config.content
		this.proxied = config.proxied
		this.ttl = config.ttl
		this.comment = config.comment
	}
	
}

export class CloudflareRecordUpdateTask {
	
	public readonly context: CloudflareContext
	
	public readonly request_body: CloudflareRecordUpdateRequestImpl
	public readonly zone_id: string
	public readonly record_id: string
	
	public readonly allow_name_change: boolean
	
	constructor (context: CloudflareContext, config: SetRecordCloudflareConfig, values: SetRecordCloudflareValues) {
		this.context = context
		this.request_body = new CloudflareRecordUpdateRequestImpl({
			name: config.name,
			type: config.type,
			content: values.content,
			proxied: config.proxied,
			ttl: config.ttl,
			comment: values.comment,
		})
		this.zone_id = config.zone_id
		this.record_id = config.record_id
		this.allow_name_change = config.allow_name_change
	}
	
	public async get (): Promise<CloudflareResponseResult<CloudflareRecord>> {
		const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${this.zone_id}/dns_records/${this.record_id}`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${this.context.token}`,
				'Content-Type': 'application/json',
			},
		})
		return await response.json() as CloudflareResponseResult<CloudflareRecord>
	}
	
	public async execute (): Promise<CloudflareResponseResult<CloudflareRecord>> {
		
		const current = await this.get()
		if (!cloudflareIsSuccess(current)) {
			return await current
		}
		
		if (!(current.result.name == this.request_body.name)) {
			if (!this.allow_name_change) {
				throw new Error("Change record domain name is not allowed.", { cause: {
					old_name: current.result.name,
					new_name: this.request_body.name,
				} })
			}
		}
		
		const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${this.zone_id}/dns_records/${this.record_id}`, {
			method: 'PUT',
			headers: {
				'Authorization': `Bearer ${this.context.token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(this.request_body),
			mode: 'no-cors'
		})
		
		const data = await response.json() as CloudflareResponseResult<CloudflareRecord>
		
		return data
		
	}
	
}

export type CloudflareResponseResult <S> = CloudflareResponseResultSuccess<S> | CloudflareResponseResultError

export interface CloudflareResponseResultError {
	success: false,
	errors: {
		code: number,
		message: string,
	}[]
}

export interface CloudflareResponseResultSuccess <S> {
	success: true,
	result: S,
	errors: [],
	message: []
}

export interface CloudflareRecord {
	id: string;
	zone_id: string;
	zone_name: string;
	name: string;
	type: string;
	content: string;
	proxiable: boolean;
	proxied: boolean;
	ttl: number;
	settings: Record<string, unknown>;
	meta: {
		auto_added: boolean;
		managed_by_apps: boolean;
		managed_by_argo_tunnel: boolean;
	};
	comment: string;
	tags: string[];
	created_on: string;
	modified_on: string;
	comment_modified_on: string;
}

export function cloudflareIsSuccess <S> (response: CloudflareResponseResult<S>): response is CloudflareResponseResultSuccess<S> {
	if (response.success === true) {
		return true
	} else return false
}

export class CloudflareContext {
	
	public readonly token: string
	
	constructor (token: string) {
		this.token = token
	}
	
}
