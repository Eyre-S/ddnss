import { normalError } from "./logging";

interface SleepTimeout {
	timeout: NodeJS.Timeout;
	resolve: () => void;
}

export abstract class Thread {
	
	private sleepingTimeout: SleepTimeout | null = null;
	private state: 'preparing' | 'running' | 'stopped' = 'preparing';
	private interruptedState: null | InterruptingParameter<any> = null;
	public errorCatcher: ((err: any) => void) = (err: any) => {
		console.error("Uncaught error in thread:", normalError(err));
	};
	
	public start (): void {
		if (this.state !== 'preparing') {
			throw new Error("This thread has already been started.");
		}
		this.state = 'running';
		this.run().then(() => {
			this.state = 'stopped';
		}).catch((err) => {
			this.state = 'stopped';
			this.errorCatcher(err);
		});
	}
	
	protected async sleep (ms: number): Promise<void> {
		await this.executeSleep(ms);
		const int = this.interrupted();
		if (int !== null) {
			throw new InterruptedError("Thread was interrupted during sleep!", int);
		}
	}
	
	private executeSleep (ms: number): Promise<void> {
		// return new Promise<void>((resolve) => {
		// 	const int = this.interrupted()
		// 	if (int !== null) {
		// 		throw new InterruptedError("Thread was interrupted.", int);
		// 	}
		// 	if (this.sleepingTimeout !== null) {
		// 		throw new Error("This thread is already sleeping.");
		// 	}
		// 	this.sleepingTimeout = {
		// 		timeout: setTimeout(() => {
		// 			this.sleepingTimeout = null;
		// 			resolve();
		// 		}, ms),
		// 		resolve
		// 	};
		// });
		const promise = Promise.withResolvers<void>()
		const int = this.interrupted()
		if (int !== null) {
			throw new InterruptedError("Thread was interrupted.", int);
		}
		if (this.sleepingTimeout !== null) {
			throw new Error("This thread is already sleeping.");
		}
		this.sleepingTimeout = {
			timeout: setTimeout(() => {
				this.sleepingTimeout = null;
				promise.resolve();
			}, ms),
			resolve: promise.resolve
		};
		return promise.promise;
	}
	
	private stopSleep (): void {
		if (this.sleepingTimeout !== null) {
			const temp = this.sleepingTimeout;
			clearTimeout(temp.timeout);
			this.sleepingTimeout = null;
			temp.resolve();
		} else {
			throw new Error("This thread is not sleeping.");
		}
	}
	
	public interrupt <T> (param?: T): void {
		if (this.state !== 'running') {
			throw new Error("This thread is not running.");
		}
		this.interruptedState = new InterruptingParameter<T>(param);
		if (this.sleepingTimeout !== null) {
			this.stopSleep();
		}
	}
	
	protected interrupted (): InterruptingParameter<any> | null {
		const temp = this.interruptedState;
		this.interruptedState = null;
		return temp;
	}
	
	public abstract run (): Promise<void>;
	
}

export class InterruptedError <T> extends Error {
	public readonly value: T;
	public constructor (
		message: string,
		parameter: InterruptingParameter<T>
	) {
		super(message)
		this.value = parameter.value;
	}
}

export class InterruptingParameter <T> {
	public constructor (
		public readonly value: T
	) {}
}
