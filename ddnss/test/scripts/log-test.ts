import { Logger, normalError } from "../../src/utils/logging";
import { Thread } from "../../src/utils/thread";

class MyException extends Error {
	public readonly threadName: string = "MyExceptionThread";
	constructor(message: string) {
		super(message);
		this.name = "MyException";
	}
}

const logger = new Logger("TestLogger");

const err = new MyException("This is a test exception.");
err.cause = new Error("This is the cause of the test exception.");

logger.info("This is an info message.");
logger.error("Test an exception:\n" + normalError(err));

function testThread () {
	const thread = Thread.getCurrentThread();
	logger.info(`In thread: ${thread ? thread.name : "<No Thread>"}`);
}

class MyThread extends Thread {
	
	public async run (): Promise<void> {
		logger.info(`Thread ${this.name} is running.`);
		testThread();
		logger.info(`Thread ${this.name} has finished.`);
	}
	
}

testThread();

const myThread = new MyThread("ExampleThread");
const anotherThread = new MyThread("AnotherThread");

anotherThread.start();
myThread.start();
