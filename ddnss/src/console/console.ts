import { readFileSync } from "fs";
import { ServerMain } from "../main";
import { Logger } from "../utils/logging";
import path from "path";

export class Console {
	
	public constructor (
		private server: ServerMain,
		private logger: Logger
	) {
		logger.setOnReadline(this.onCommand.bind(this));
	}
	
	private onCommand (input: string): void {
		
		const args = input.trim().split(' ');
		const command = args.shift()?.toLowerCase();
		
		switch (command) {
			case 'help':
				this.logger.echo(readFileSync(path.join('./', 'resources', 'console', 'help.txt'), 'utf-8'));
				break;
			case 'exit':
			case 'quit':
			case 'stop':
				this.logger.echo('Stopping DDNSS server...');
				process.exit(0);
			case 'run':
				this.logger.echo('Calling task thread to run immediately...');
				this.server.callTaskImmediately();
				break;
			default:
				this.logger.echoWarn(`Unknown command: ${command}`);
		}
		
	}
	
}
