import { serializeError } from "serialize-error"
import Stream from "stream"
import { withDefaults } from "./defines"
import { ensureWithin } from "./ensure"
import eaw from "eastasianwidth"
import { Thread } from "./thread"

// TODO:
//  - [ ] Support log level switches.
export class Logger {
	
	public readonly name: string
	private readlineCallback: ((line: string) => void) | null = null
	public readonly context: Logger.ContextCb = Logger.defaultContext
	private prompt: Logger.PromptCb = Logger.defaultPrompt
	
	private _isConsoleOpen = false
	public get isConsoleOpen (): boolean { return this._isConsoleOpen }
	public set isConsoleOpen (value: boolean) {
		this._isConsoleOpen = value
		this.rerenderPrompt()
	}
	
	constructor (name: string, context?: Logger.ContextCb) {
		this.name = name
		if (context) this.context = context
		process.stdin.setRawMode(true)
		process.stdin.on('data', this.onChar.bind(this))
		process.stdout.write(this.prompt(this));
	}
	
	private inputBuffer: string = ''
	private inputPosition: number = 0
	private inputBeforeCursor (): string { return this.inputBuffer.slice(0, this.inputPosition); }
	private inputAfterCursor (): string { return this.inputBuffer.slice(this.inputPosition); }
	public consoleStatus = {
		buffer: () => this.inputBuffer,
		position: () => this.inputPosition,
		beforeCursor: () => this.inputBeforeCursor(),
		afterCursor: () => this.inputAfterCursor(),
		isOpen: () => this.isConsoleOpen
	}
	private onChar (buffer: Buffer<ArrayBuffer>): void {
		
		const char = buffer.toString("utf8")
		
		// Handle Ctrl+C
		if (char === '\u0003') {
			this.warn('exiting due to Ctrl+C')
			process.exit()
		}
		
		// Block input when console is closed
		if (!this.isConsoleOpen) return
		
		// Handle Enter
		if (char === '\r' || char === '\n') {
			process.stdout.write('\n')
			this.readlineCallback?.(this.inputBuffer)
			this.inputBuffer = ''
			this.inputPosition = 0
			this.rerenderPrompt()
			return
		}
		
		// Handle backspace(\u007f)
		//  seems that it should be \u0008, and it is exactly what works on older version,
		//  but it suddenly does not work, and \u007f works instead on my terminal
		if (char === '\u007f') {
			// backspace
			if (this.inputBuffer.strip.length > 0) {
				let before = this.inputBeforeCursor().slice(0, -1)
				let after = this.inputAfterCursor()
				this.inputBuffer = before + after
				this.inputPosition = ensureWithin(0, this.inputPosition - 1, this.inputBuffer.length)
				this.rerenderPrompt()
			}
			return
		}
		
		// Handle Position Cursor Left/Right
		if (char === '\u001b[D' || char === '\u001b[C') {
			this.inputPosition = ensureWithin(0, this.inputPosition + (char === '\u001b[D' ? -1 : 1), this.inputBuffer.length)
			this.rerenderPrompt()
			return
		}
		// // Handle Position Cursor Up/Down
		// if (char === '\u001b[A' || char === '\u001b[B') {
		// 	return
		// }
		// Handle Home/End
		if (char === '\u001b[1~') {
			this.inputPosition = 0
			this.rerenderPrompt()
			return
		}
		if (char === '\u001b[4~') {
			this.inputPosition = this.inputBuffer.length
			this.rerenderPrompt()
			return
		}
		// Ignore all unknown control characters
		if (char <= '\u001f' || char === '\u007f') {
			this.debug(`Ignored control character: ${char.split('').map(c =>'\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join(', ')}`)
			return
		}
		
		// Handle any other characters
		this.inputBuffer = this.inputBeforeCursor() + char + this.inputAfterCursor()
		this.inputPosition += char.length
		this.rerenderPrompt()
		
	}
	
	private clearPromptLine (): void {
		process.stdout.clearLine(0)
		process.stdout.cursorTo(0)
	}
	
	private rerenderPrompt (): void {
		process.stdout.clearLine(0)
		process.stdout.cursorTo(0)
		const prompt = this.prompt(this);
		process.stdout.write(prompt + this.inputBuffer);
		process.stdout.cursorTo(eaw.length(prompt.strip) + eaw.length(this.inputBeforeCursor()));
	}
	
	public setOnReadline (callback: (line: string) => void): Logger {
		if (this.readlineCallback !== null) {
			process.stdin.off('data', this.readlineCallback)
		}
		this.readlineCallback = callback
		return this
	}
	
	public setPrompt (callback: Logger.PromptCb): Logger.PromptCb {
		const old = this.prompt
		this.prompt = callback
		return old
	}
	
	private getHeader (persist: string[], additional: { preHeader: string[], postHeader: string[], prefixModifier: (prefix: string) => string }): [string, string] {
		const header_common = `${[...additional.preHeader, ...this.context(this), ...additional.postHeader].map((x) => `[${x}]`).join('')}`
		const header_tail = `${persist.map((x) => `${x}`).join(' ')}` + additional.prefixModifier(" | ".bold as any as string)
		const header_starter = `${header_common}${header_tail}`
		const header_others = `${' '.repeat(header_common.strip.length)}${header_tail}`
		return [header_starter, header_others]
	}
	
	private render (message: string, persistHeader: string[], _additional: Logger.RenderParameters = {}) {
		
		const additional = withDefaults(_additional, {
			preHeader: [],
			postHeader: [],
			messageModifier: (msg: string) => msg,
			lineModifier: (line: string) => line,
			prefixModifier: (prefix: string) => prefix,
			pipe: process.stdout
		})
		
		const [header_starter, header_others] = this.getHeader(persistHeader, additional)
		
		const pipe = additional.pipe;
		
		if (pipe === process.stdout || pipe === process.stderr) {
			this.clearPromptLine();
		}
		message = additional.messageModifier(message)
		message.split('\n').forEach((line, index) => {
			line = additional.lineModifier(line)
			if (index === 0) {
				pipe.write(header_starter + line + '\n')
			} else {
				pipe.write(header_others + line + '\n')
			}
		})
		if (pipe === process.stdout || pipe === process.stderr) {
			this.rerenderPrompt();
		}
		
	}
	
	public echo (message: string) {
		this.render(message, ['➤'], { pipe: process.stdout })
	}
	
	public echoWarn (message: string) {
		this.render(message, ['➤'.yellow], { pipe: process.stdout })
	}
	
	public echoError (message: string) {
		this.render(message, ['➤'.red], { pipe: process.stdout, lineModifier: (msg) => msg.red, prefixModifier: (prefix) => prefix.red } )
	}
	
	public info (message: string) {
		this.render(message, ['🛈'])
	}
	
	public warn (message: string) {
		this.render(message, ['⚠'.yellow])
	}
	
	public debug (message: string) {
		this.render(message, ['⊙'.gray], { lineModifier: (msg) => msg.gray, prefixModifier: (prefix) => prefix.strip.gray } )
	}
	
	public error (message: string) {
		this.render(message, ['✖'.red], { pipe: process.stderr, lineModifier: (msg) => msg.red, prefixModifier: (prefix) => prefix.red } )
	}
	
}

export namespace Logger {
	
	export interface RenderParameters {
		preHeader?: string[],
		postHeader?: string[],
		messageModifier?: (message: string) => string
		lineModifier?: (line: string) => string,
		prefixModifier?: (prefix: string) => string,
		pipe?: Stream.Writable
	}
	
	export type PromptCb = (self: Logger) => string
	export type ContextCb = (self: Logger) => string[]
	
	export const defaultPrompt: PromptCb = (self) => {
		if (self.isConsoleOpen) {
			return '> '.green.bold as any as string
		} else {
			return 'X> '.green.bold as any as string
		}
	}
	
	export const defaultContext: ContextCb = (self) => {
		return [new Date().toISOString().blue, (Thread.getCurrentThread()?.name || "global").cyan, self.name.magenta]
	}
	
}

export function strip (str: string): string {
	return str.replace(/^\n[\t ]*\|/, '').replace(/\n[\t ]*$/, '').replaceAll(/(?<=\n)[\t ]*\|/g, '')
}

export function indent (str: string, indent: number = 2): string {
	return str.split('\n').map(line => ' '.repeat(indent) + line).join('\n')
}

export function normalError (error: any): string {
	
	if (error instanceof Error) {
		let errMessage = ""
		errMessage = error.stack || `${error.name}: ${error.message}`
		const { stack: _1, name: _2, message: _3, cause: _4, ...extra } = error as any
		if (Object.keys(extra).length > 0) {
			errMessage += `\n  Extra properties:`
			for (const [key, value] of Object.entries(extra)) {
				errMessage += `\n    - ${key}: ${JSON.stringify(value)}`
			}
		}
		let cause = error.cause
		while (cause) {
			errMessage += `\nCaused by: ${normalError(cause)}`
			if (cause instanceof Error) cause = cause.cause
			else cause = undefined
		}
		return errMessage
	}
	
	if (typeof error === 'object') {
		return JSON.stringify(serializeError(error), undefined, 4)
	} else {
		return new String(error).toString()
	}
	
}
