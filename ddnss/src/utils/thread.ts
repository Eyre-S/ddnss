import { normalError } from "./logging";

interface SleepTimeout {
	timeout: NodeJS.Timeout;
	resolve: () => void;
}

// TODO: Post-check to make sure there are no race conditions.
export abstract class Thread {
	
	private sleepingTimeout: SleepTimeout | null = null;
	// TODO: show sleep state
	private _state: 'preparing' | 'running' | 'stopped' = 'preparing';
	public get state (): 'preparing' | 'running' | 'stopped' { return this._state; }
	private set state (value: 'preparing' | 'running' | 'stopped') { this._state = value; }
	private interruptedState: null | InterruptingParameter<any> = null;
	public errorCatcher: ((err: any) => void) = (err: any) => {
		console.error("Uncaught error in thread:", normalError(err));
	};
	
	public start (): void {
		if (this.state !== 'preparing') {
			// TODO: IllegalThreadStateError.NotStartableThreadError
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
			throw new InterruptedError("Thread was interrupted during sleep!", int);
		}
		if (this.sleepingTimeout !== null) {
			// TODO: IllegalThreadStateError.AlreadySleepingError
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
			// TODO: IllegalThreadStateError.NotSleepingError
			throw new Error("This thread is not sleeping.");
		}
	}
	
	public interrupt <T> (param?: T): void {
		if (this.state !== 'running') {
			// TODO: IllegalThreadStateError.NotRunningError
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
