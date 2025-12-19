import random from 'random'
import { normalError, strip } from "./logging";
import { AsyncLocalStorage } from 'node:async_hooks';

interface SleepTimeout {
	timeout: NodeJS.Timeout;
	resolve: () => void;
}

// TODO: Post-check to make sure there are no race conditions.
export abstract class Thread {
	
	private static storage = new AsyncLocalStorage<Thread>();
	
	public static getCurrentThread(): Thread | undefined {
		return Thread.storage.getStore();
	}
	
	private sleepingTimeout: SleepTimeout | null = null;
	
	// TODO: show sleep state
	private _state: 'preparing' | 'running' | 'stopped' = 'preparing';
	public get state (): 'preparing' | 'running' | 'stopped' { return this._state; }
	private set state (value: 'preparing' | 'running' | 'stopped') { this._state = value; }
	
	public errorCatcher: ((err: any) => void) = (err: any) => {
		console.error("Uncaught error in thread:", normalError(err));
	};
	
	private _name: string;
	public get name (): string { return this._name; }
	public set name (value: string) {
		this._name = value;
	}
	
	public constructor (
		name?: string
	) {
		this.name = name ?? "Thread-" + random.int(0, Number.MAX_SAFE_INTEGER);
	}
	
	public start (): void {
		if (this.state !== 'preparing') {
			throw new IllegalThreadStateError.ThreadAlreadyStartedError();
		}
		this.state = 'running';
		Thread.storage.run<Promise<void>>(this, () => {
			return this.run()
		}).then(() => {
			this.state = 'stopped';
		}).catch((err) => {
			this.state = 'stopped';
			this.errorCatcher(err);
		});
	}
	
	private interruptedState: null | InterruptingParameter<any> = null;
	
	protected async sleep (ms: number): Promise<void> {
		await this.executeSleep(ms);
		const int = this.interrupted();
		if (int !== null) {
			throw new InterruptedError("Thread was interrupted during sleep!", int);
		}
	}
	
	private executeSleep (ms: number): Promise<void> {
		const promise = Promise.withResolvers<void>()
		const int = this.interrupted()
		if (int !== null) {
			throw new InterruptedError("Thread was interrupted during sleep!", int);
		}
		if (this.sleepingTimeout !== null) {
			throw new IllegalThreadStateError.AlreadySleepingError();
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
			throw new IllegalThreadStateError.NotSleepingError();
		}
	}
	
	public interrupt <T> (param?: T): void {
		if (this.state !== 'running') {
			throw new IllegalThreadStateError.NotRunningError();
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

export class IllegalThreadStateError extends Error {
	public constructor (message: string) {
		super(message);
	}
}

export namespace IllegalThreadStateError {
	export class ThreadAlreadyStartedError extends IllegalThreadStateError {
		public constructor () {
			super("This thread has already been started, it cannot be started again.");
		}
	}
	
	export class AlreadySleepingError extends IllegalThreadStateError {
		public constructor () {
			super(strip(`
				|This thread is already in sleeping state.
				|  If you occurs this error, that probably means there are somewhere calls sleep()
				|    without using await keyword, or a sleep() is called outside this thread.
				|  Please check your code to fix those, due to they may cause unexpected behaviors.
			`));
		}
	}
	
	export class NotSleepingError extends IllegalThreadStateError {
		public constructor () {
			super(`
				|This thread is not sleeping so that stop sleeping is not possible.
				|  This is probably a bug of the thread implementation, please report to the developer.
			`);
		}
	}
	
	export class NotRunningError extends IllegalThreadStateError {
		public constructor () {
			super(`
				|This thread is not running, so that interrupting is not possible.
			`);
		}
	}
	
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
