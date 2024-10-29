import { serializeError } from "serialize-error"

export class Logger {
	
	public readonly name: string
	public readonly context: () => string[] = () => {
		return [new Date().toISOString()]
	}
	
	constructor (name: string, context?: () => string[]) {
		this.name = name
		if ( context ) this.context = context
	}
	
	private getHeader (): [string, string] {
		const header_common = `${this.context().map((x) => `[${x}]`).join('')} [${this.name}] `
		const header_starter = `${header_common} | `
		const header_others = `${' '.repeat(header_common.length)} | `
		return [header_starter, header_others]
	}
	
	public info (message: string) {
		
		const [header_starter, header_others] = this.getHeader()
		
		message.split('\n').forEach((line, index) => {
			if (index === 0) {
				console.log(header_starter + line)
			} else {
				console.log(header_others + line)
			}
		})
		
	}
	
}

export function strip (str: string): string {
	return str.replaceAll(/(?<=\n)[\t| ]*\|/g, '')
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
