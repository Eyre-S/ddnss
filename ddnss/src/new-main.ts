import { randomUniform } from "d3-random";
import { ConfigFile } from "./config/config-types";
import { checkTasks, DefinedRecords, loadConfig } from "./load-config";
import { Logger } from "./utils/logging";
import { getIPGetter } from "./record/ip-getters";

export class ServerMain {
	
	public readonly logger: Logger;
	
	public readonly config: ConfigFile;
	/** If equals null, this program should run once and exit. */
	public readonly runIntervalMs: number | null;
	
	private constructor (config: ConfigFile) {
		this.config = config;
		this.logger = new Logger(config.server_name);
		// todo: read from configuration
		this.runIntervalMs = 1*60*1000; // 5 minutes
	}
	
	public static async create (): Promise<ServerMain> {
		const config = await loadConfig();
		return new ServerMain(config);
	}
	
	public async main (): Promise<void> {
		
		this.logger.info(`--------------------------------------------------- |`);
		this.logger.info(`                                                    |`);
		this.logger.info(`              DD-Cluster DDNS Server                |`);
		this.logger.info(`                                                    |`);
		this.logger.info(`--------------------------------------------------- |`);
		this.logger.info(`staring server: ${this.config.server_name}`);
		this.logger.info(`configured run interval: ${this.config.global.update_interval}`);
		
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
		
		this.server.logger.info(`---------------------------------------------------`);
		this.server.logger.info(`===> Starting a new run`);
		this.server.logger.info(`  run id: ${this.runId} `);
		this.server.logger.info(`---------------------------------------------------`);
		
		const recordWithTasks = await checkTasks(this.server.config);
		this.server.logger.info(" ==> Loaded pending tasks:")
		for (const rec of recordWithTasks) {
			this.server.logger.info(` * ${rec.name}`)
			for (const endpoint of rec.associatedEndpoints) {
				this.server.logger.info(`   - ${endpoint.name}`);
			}
		}
		
		for (const record of recordWithTasks) {
			await this.runForRecord(record);
		}
		
		this.server.logger.info(` ==> Done this run.`)
		
		Task.forkRun(this.server);
		
	}
	
	private async runForRecord (record: DefinedRecords): Promise<void> {
		
		this.server.logger.info(` ==> Updating for record: ${record.name}`)
		this.server.logger.info(`  :: getting IP address`);
		const ipGetter = getIPGetter(record.record)
		const ip = await ipGetter.getIP(this.runId);
		this.server.logger.info(`obtained IP: ${ip.correctForm()}`);
		
	}
	
}
