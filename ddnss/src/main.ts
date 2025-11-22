import { randomUniform } from "d3-random";
import { ConfigFile } from "./config/config-types";
import { checkTasks, DefinedRecords, loadConfig } from "./load-config";
import { Logger, normalError } from "./utils/logging";
import { getIPGetter } from "./record/ip-getters";
import { EndpointUpdate } from "./endpoint/endpoint-updater";
import { parseDuration } from "./helper/times";
import { Console } from "./console/console";

import 'colorts/lib/string';
import { InterruptedError, Thread } from "./utils/thread";

export class ServerMain {
	
	public readonly logger: Logger;
	public readonly console: Console;
	
	public readonly config: ConfigFile;
	/** If equals null, this program should run once and exit. */
	public readonly runIntervalMs: number | null;
	
	private readonly taskThread: Thread;
	
	private constructor (config: ConfigFile) {
		this.config = config;
		this.logger = new Logger(config.server_name);
		this.console = new Console(this, this.logger);
		this.runIntervalMs = parseDuration(config.global.update_interval);
		this.taskThread = new TaskThread(this);
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
		
		this.taskThread.start();
		
	}
	
	public callTaskImmediately (): void {
		this.logger.debug(`Calling task thread to run immediately...`)
		this.taskThread.interrupt();
	}
	
}

// TODO:
//  - Pause console while running tasks
//  - Watchdog
//  - Graceful shutdown
class TaskThread extends Thread {
	
	public constructor (
		private readonly server: ServerMain
	) { super() }
	
	public override async run (): Promise<void> {
		this.server.logger.info("Starting initial task run...")
		while (true) {
			const task = new Task(this.server);
			try {
				await task.run();
			} catch (err) {
				this.server.logger.error(`An error occurred during task run:\n${normalError(err)}`);
			}
			if (this.server.runIntervalMs === null) {
				this.server.logger.info("Single run mode detected, exiting...");
				break;
			}
			this.server.logger.info(`Next run will starts at: ${new Date(Date.now() + this.server.runIntervalMs).toLocaleString()}`);
			this.interrupted(); // clear the interrupted state during running
			try {
				await this.sleep(this.server.runIntervalMs);
			} catch (err) {
				if (err instanceof InterruptedError) {
					this.server.logger.info("Starting run immediately via console call...")
				}
			}
		}
	}
	
}

// class TaskThreadManager {
//	
// 	private activeThread: NodeJS.Timeout | null = null;
//	
// 	private _intervalMs: number;
// 	public get intervalMs (): number {
// 		return this._intervalMs;
// 	}
// 	public set intervalMs (value: number) {
// 		this._intervalMs = value;
// 	}
//	
// 	public constructor (
// 		private readonly server: ServerMain,
// 		intervalMs: number
// 	) {
// 		this._intervalMs = intervalMs;
// 	}
//	
// 	public async start (immediate: boolean): Promise<void> {
// 		this.scheduleRuns(this.server, immediate);
// 	}
//	
// 	private scheduleRuns (server: ServerMain, immediate: boolean = false): void {
// 		if (immediate) {
// 			server.logger.info(`next run will starts: Now`);
// 			this.activeThread = setTimeout(this.forkRun.bind(this), 1);
// 		} else {
// 			server.logger.info(`next run will starts at: ${new Date(Date.now() + server.runIntervalMs).toLocaleString()}`)
// 			this.activeThread = setTimeout(this.forkRun.bind(this), server.runIntervalMs);
// 		}
// 	}
//	
// 	private forkRun (): Promise<void> {
// 		return new Promise((resolve) => {
// 			new Task(this.server).run().then(() => {
// 				resolve();
// 				this.scheduleRuns(this.server);
// 			}).catch((err) => { throw err });
// 		})
// 	}
//	
// }

// TODO: Catch unexpected error for
//  - each record update
//  - each endpoint update
class Task {
	
	private readonly server: ServerMain;
	private readonly runId: string;
	
	public constructor (server: ServerMain) {
		this.server = server;
		this.runId = randomUniform(100000, 999999)().toString();
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
