export function define <T> (value: T): T {
	return value
}

export type OptionalsTo <T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type Values<T> = T[keyof T];
export type OptionalKeys<T> = Values<{
	[K in keyof T]: {} extends Pick<T, K> ? K : never;
}>;
export type PickOptional <T> = Pick<T, OptionalKeys<T>>

export function fillDefaults <T> ( params: T, defaults: Required<PickOptional<T>> ): Required<T> {
	return {
		...defaults,
		...params,
	} as Required<T>
}

export const withDefaults = fillDefaults
