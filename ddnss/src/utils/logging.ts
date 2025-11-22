import { serializeError } from "serialize-error"

// TODO:
//  - [ ] Support log to stderr when needed.
//  - [ ] Support log level switches.
//  - [ ] Support switch prompt and readline on and off.
//  - [ ] Show headers colored.
//  - [ ] Show message colored.
export class Logger {
	
	public readonly name: string
	private readlineCallback: ((line: string) => void) | null = null
	private prompt: (() => string) = () => '> '
	public readonly context: () => string[] = () => {
		return [new Date().toISOString()]
	}
	
	constructor (name: string, context?: () => string[]) {
		this.name = name
		if (context) this.context = context
		process.stdin.setRawMode(true)
		process.stdin.on('data', this.onChar.bind(this))
		process.stdout.write(this.prompt());
	}
	
	private inputBuffer: string = ''
	private onChar (buffer: Buffer<ArrayBuffer>): void {
		const char = buffer.toString("utf8")
		if (char === '\r' || char === '\n') {
			process.stdout.write('\n')
			this.readlineCallback?.(this.inputBuffer)
			this.inputBuffer = ''
			process.stdout.clearLine(0)
			process.stdout.cursorTo(0)
			process.stdout.write(this.prompt());
			return
		} else if (char === '\u0003') {
			this.warn('exiting due to Ctrl+C')
			process.exit()
		} else if (char === '\u0008' || char === '\u007F') {
			// backspace
			if (this.inputBuffer.length > 0) {
				this.inputBuffer = this.inputBuffer.slice(0, -1)
				process.stdout.clearLine(0)
				process.stdout.cursorTo(0)
				process.stdout.write(this.prompt() + this.inputBuffer)
			}
			return
		}
		this.inputBuffer += char
		process.stdout.write(char)
	}
	
	public setOnReadline (callback: (line: string) => void): Logger {
		if (this.readlineCallback !== null) {
			process.stdin.off('data', this.readlineCallback)
		}
		this.readlineCallback = callback
		return this
	}
	
	public setPrompt (callback: () => string): Logger {
		this.prompt = callback
		return this
	}
	
	private getHeader (additional: string[] = []): [string, string] {
		const header_common = `${this.context().map((x) => `[${x}]`).join('')} [${this.name}] `
		const header_tail = `${additional.map((x) => `${x}`).join(' ')} | `
		const header_starter = `${header_common}${header_tail}`
		const header_others = `${' '.repeat(header_common.length)}${header_tail}`
		return [header_starter, header_others]
	}
	
	private send (message: string, additionalHeaders: string[] = []) {
		
		const [header_starter, header_others] = this.getHeader(additionalHeaders)
		
		process.stdout.clearLine(0)
		process.stdout.cursorTo(0)
		message.split('\n').forEach((line, index) => {
			if (index === 0) {
				process.stdout.write(header_starter + line + '\n')
			} else {
				process.stdout.write(header_others + line + '\n')
			}
		})
		process.stdout.write(this.prompt() + this.inputBuffer);
		
	}
	
	public echo (message: string) {
		this.send(message, ['➤'])
	}
	
	public echoWarn (message: string) {
		this.send(message, ['➤'.yellow])
	}
	
	public echoError (message: string) {
		this.send(message, ['➤'.red])
	}
	
	public info (message: string) {
		this.send(message, ['🛈'])
	}
	
	public warn (message: string) {
		this.send(message, ['⚠'.yellow])
	}
	
	public debug (message: string) {
		this.send(message, ['⊙'.gray])
	}
	
	public error (message: string) {
		this.send(message, ['✖'.red])
	}
	
}

export function strip (str: string): string {
	return str.replace(/^\n[\t ]*\|/, '').replace(/\n[\t ]*$/, '').replaceAll(/(?<=\n)[\t ]*\|/g, '')
}

export function indent (str: string, indent: number = 2): string {
	return str.split('\n').map(line => ' '.repeat(indent) + line).join('\n')
}

export function normalError (error: any): string {
	if (typeof error === 'object') {
		return JSON.stringify(serializeError(error), undefined, 4)
	} else {
		return new String(error).toString()
	}
}
