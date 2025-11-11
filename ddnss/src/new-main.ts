import { randomUniform } from "d3-random";
import { ConfigFile } from "./config/config-types";
import { checkTasks, loadConfig } from "./load-config";
import { Logger } from "./utils/logging";
import { sleep } from "./utils/misc";

export async function main () {
	
	const config = await loadConfig();
	const logger = new Logger(config.server_name);
	logger.info(`--------------------------------------------------- |`);
	logger.info(`                                                    |`);
	logger.info(`              DD-Cluster DDNS Server                |`);
	logger.info(`                                                    |`);
	logger.info(`--------------------------------------------------- |`);
	logger.info(`staring server: ${config.server_name}`);
	logger.info(`configured run interval: ${config.global.update_interval}`);
	logger.info(`next run will starts: Now`);
	
	const intervalMs = 5*60*1000; // 5 minutes
	
	while (true) {
		
		const runId = randomUniform(100000, 999999)().toString();
		
		await runTask(config, logger, runId);
		
		logger.info(`done current run.`)
		logger.info(`next run will starts at: ${new Date(Date.now() + intervalMs).toLocaleString()}`);
		
		await sleep(intervalMs);
		
	}
	
}

async function runTask (config: ConfigFile, logger: Logger, runId: string) {
	
	logger.info(`---------------------------------------------------`);
	logger.info(`===> Starting a new run`);
	logger.info(`  run id: ${runId} `);
	logger.info(`---------------------------------------------------`);
	
	const recordWithTasks = await checkTasks(config);
	logger.info(" ==> Loaded pending tasks:")
	for (const rec of recordWithTasks) {
		logger.info(` * ${rec.name}`)
		for (const endpoint of rec.associatedEndpoints) {
			logger.info(`   - ${endpoint.name}`);
		}
	}
	
}
