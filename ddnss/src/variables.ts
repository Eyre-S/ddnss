export async function getCloudflareToken (): Promise<string> {
	
	const api_key = process.env.API_KEY
	
	if (typeof api_key === 'undefined') {
		throw new Error('API_KEY is not set.')
	}
	return api_key
	
}
