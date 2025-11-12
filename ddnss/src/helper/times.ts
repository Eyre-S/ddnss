/**
 * Parse a human-readable duration string (produced by the Scala `formatDuration` shown
 * in the prompt) back to milliseconds.
 *
 * Supported units (in descending order):
 *  - d   -> days (1000*60*60*24)
 *  - h   -> hours
 *  - min -> minutes
 *  - s   -> seconds
 *  - ms  -> milliseconds
 *
 * Examples:
 *  parseDuration("10ms") === 10
 *  parseDuration("50min 0s 1ms") === 50*60*1000 + 0*1000 + 1
 *  parseDuration("1090035d 6h 38min 21s 720ms") === ...
 *
 * The parser is flexible with whitespace but strict about units. Unknown tokens
 * will cause an error.
 */
export function parseDuration (s: string): number {
	
	const str = s.trim();
	if (str.length === 0) throw new Error('empty duration string');
	
	const multipliers: Record<string, number> = {
		d: 1000 * 60 * 60 * 24,
		h: 1000 * 60 * 60,
		min: 1000 * 60,
		s: 1000,
		ms: 1,
	};
	
	// Use global regex (no sticky flag) so we can locate tokens separated by spaces.
	const tokenRe = /([0-9]+)\s*(d|h|min|s|ms)\b/g;
	let match: RegExpExecArray | null;
	let total = 0;
	let lastIndex = 0;
	while ((match = tokenRe.exec(str)) !== null) {
		const [, numStr, unit] = match;
		// Ensure there are no stray characters between previous match and this one
		const between = str.slice(lastIndex, match.index);
		if (between.trim().length > 0) {
			// allow only spaces between tokens
			throw new Error(`unexpected token between components: "${between}"`);
		}
		const n = Number(numStr);
		if (!Number.isFinite(n)) throw new Error(`invalid number: ${numStr}`);
		const mul = multipliers[unit];
		if (mul === undefined) throw new Error(`unsupported unit: ${unit}`);
		total += n * mul;
		lastIndex = tokenRe.lastIndex;
	}
	
	// After matching tokens, the rest must be only whitespace
	const rest = str.slice(lastIndex);
	if (rest.trim().length > 0) {
		throw new Error(`unrecognized trailing content in duration: "${rest}"`);
	}
	
	return total;
	
}
