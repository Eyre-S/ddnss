import { Console } from "../../src/console/console";
import { Logger } from "../../src/utils/logging";

import 'colorts/lib/string';

const logger = new Logger("ConsoleTest");
new Console({} as any, logger);
logger.setPrompt((self) => {
	if (self.isConsoleOpen) {
		return `x${self.consoleStatus.buffer().length} :${self.consoleStatus.position()}` + ' > '.green.bold as any as string
	} else {
		return 'X> '.red.bold as any as string
	}
})

logger.info("This is a normal message.");
logger.info("This is a warning message.");
logger.info("This is an error message.");
