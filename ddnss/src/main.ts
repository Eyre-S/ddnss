import { randomUniform } from "d3-random";
import { ConfigFile } from "./config/config-types";
import { checkTasks, DefinedRecords, loadConfig } from "./load-config";
import { Logger } from "./utils/logging";
import { getIPGetter } from "./record/ip-getters";
import { EndpointUpdate } from "./endpoint/endpoint-updater";
import { parseDuration } from "./helper/times";
import { Console } from "./console/console";

import 'colorts/lib/string';

export class ServerMain {
	
	public readonly logger: Logger;
	public readonly console: Console;
	
	public readonly config: ConfigFile;
	/** If equals null, this program should run once and exit. */
	public readonly runIntervalMs: number | null;
	
	private constructor (config: ConfigFile) {
		this.config = config;
		this.logger = new Logger(config.server_name);
		this.console = new Console(this, this.logger);
		this.runIntervalMs = parseDuration(config.global.update_interval);
	}
	
	public static async create (): Promise<ServerMain> {
		const config = await loadConfig();
		return new ServerMain(config);
	}
	
	public async main (): Promise<void> {
		
		this.logger.info(`--------------------------------------------------- |`.magenta);
		this.logger.info(`                                                    |`.magenta);
		this.logger.info(`              DD-Cluster DDNS Server                |`.magenta);
		this.logger.info(`                                                    |`.magenta);
		this.logger.info(`--------------------------------------------------- |`.magenta);
		this.logger.info(`staring server: ${this.config.server_name}`);
		this.logger.info(`configured run interval: ${this.config.global.update_interval} (${this.runIntervalMs} ms)`);
		
		Task.forkRun(this, true);
		
	}
	
}

class Task {
	
	private readonly server: ServerMain;
	private readonly runId: string;
	
	public constructor (server: ServerMain) {
		this.server = server;
		this.runId = randomUniform(100000, 999999)().toString();
	}
	
	public static forkRun (server: ServerMain, immediate: boolean = false): NodeJS.Timeout | null {
		const newTask = new Task(server);
		if (immediate) {
			server.logger.info(`next run will starts: Now`);
			return setTimeout(() => newTask.run(), 1);
		} else {
			if (server.runIntervalMs === null) {
				server.logger.info(`done running, exiting server...`);
				return null;
			}
			server.logger.info(`next run will starts at: ${new Date(Date.now() + server.runIntervalMs).toLocaleString()}`)
			return setTimeout(() => newTask.run(), server.runIntervalMs);
		}
	}
	
	public async run (): Promise<void> {
		
		this.server.logger.info(`---------------------------------------------------`.magenta);
		this.server.logger.info(`===> Starting a new run`                            .magenta);
		this.server.logger.info(`  run id: ${this.runId} `                           .magenta);
		this.server.logger.info(`---------------------------------------------------`.magenta);
		
		const recordWithTasks = await checkTasks(this.server.config);
		this.server.logger.info(" ==> Loaded pending tasks:".green)
		for (const rec of recordWithTasks) {
			this.server.logger.info(` * ${rec.name}`)
			for (const endpoint of rec.associatedEndpoints) {
				this.server.logger.info(`   - ${endpoint.name}`);
			}
		}
		
		for (const record of recordWithTasks) {
			await this.runForRecord(record);
		}
		
		this.server.logger.info(` ==> Done this run.`.green)
		
		Task.forkRun(this.server);
		
	}
	
	private async runForRecord (record: DefinedRecords): Promise<void> {
		
		this.server.logger.info(` ==> Updating for record: ${record.name}`.green)
		this.server.logger.info(` :: getting IP address`.blue);
		const ipGetter = getIPGetter(record.record, this.server)
		const ip = await ipGetter.getIP(this.runId);
		this.server.logger.info(`obtained IP for record ${record.name}: ${ip.correctForm()}`);
		
		for (const endpoint of record.associatedEndpoints) {
			this.server.logger.info(` :: updating endpoint: ${endpoint.name}`.blue);
			const updater = EndpointUpdate.get(endpoint, this.server);
			await updater.update(this.runId, ip);
		}
		
	}
	
}
