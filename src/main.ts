import { z } from "zod"
import { CloudflareContext, CloudflareRecordUpdateTask, cloudflareIsSuccess } from "./services/cloudflare"
import { getIp } from "./services/ips"
import { indent, Logger, normalError, strip } from "./utils/logging"
import { getCloudflareToken } from "./variables"
import { readFileSync } from "node:fs"
import { jsoncSafe } from "jsonc/lib/jsonc.safe"

const logger = new Logger('Cloudflare-DDNS')
const log = logger.info.bind(logger)

const CloudflareRecordUpdateConfig = z.object({
	name: z.string(),
	type: z.union([z.literal('A'), z.literal('AAAA'), z.literal('CNAME')]).default('AAAA'),
	proxied: z.boolean().default(false),
	ttl: z.number().default(60),
	zone_id: z.string(),
	record_id: z.string(),
	allow_name_change: z.boolean().default(false),
})

export const AppConfig = z.object({
	cloudflare: CloudflareRecordUpdateConfig.array()
})
export type AppConfig = z.infer<typeof AppConfig>

export async function loadConfig (): Promise<AppConfig> {
	
	const file_content: string = readFileSync('config.jsonc', { 'encoding': 'utf-8' })
	
	const appConfigDefinition = jsoncSafe.parse(file_content)
	if (appConfigDefinition[0] !== null) {
		throw new Error(`Failed to parse config file, error: ${appConfigDefinition[0]}`)
	} else {
		return AppConfig.parse(appConfigDefinition[1])
	}
	
}

export async function main () {
	
	log("Loading config...")
	const appConfig = await loadConfig()
	
	log("Starting Cloudflare DDNS Update.")
	
	const token = await getCloudflareToken()
	const context = new CloudflareContext(token)
	log("Read cloudflare token from environment variable.")
	
	log("Getting current IP...")
	const ip = await getIp()
	log((strip(`Got Current IP:
		| - IP: ${ip}`)))
	
	log("Starting update records...")
	
	for (const config of appConfig.cloudflare) {
		
		log(`Updating record ${config.name}...`)
		
		try {
			
			const task = new CloudflareRecordUpdateTask(context, config, {
				content: ip,
				comment: `[${config.name} auto updated, on ${new Date().toISOString()}]`
			})
			const resp = await task.execute()
			
			if (cloudflareIsSuccess(resp)) {
				
				log(strip(`Record ${config.name} updated successfully.
					| - Record Info: ${resp.result.zone_name} >> ${resp.result.name}
					| - Type: ${resp.result.type}, proxy:${resp.result.proxied}, ttl:${resp.result.ttl}
					| - Value: ${resp.result.content}
					| - Comment: ${resp.result.comment}`))
				
			} else {
				
				log(`Failed to update record ${config.name} due to: \n${resp.errors.map(e => (
					`  [${e.code}] ${e.message}`
				)).join('\n')}`)
				
			}
			
		} catch (e) {
			
			log(`Unknown error occurs when updating record ${config.name}, error: \n${indent(normalError(e), 2)}`)
			
		}
		
		log(`End update record ${config.name}`)
		
	}
	
}
