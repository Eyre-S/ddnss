import { ServerMain } from "../main";
import { Logger } from "../utils/logging";

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
				this.logger.echo('Available commands: help, exit');
				break;
			case 'exit':
				this.logger.echo('Exiting server...');
				process.exit(0);
			default:
				this.logger.echoWarn(`Unknown command: ${command}`);
		}
		
	}
	
}
