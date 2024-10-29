export async function getIp (): Promise<string> {
	
	const response = await fetch('http://ip1.dynupdate6.no-ip.com/')
	const data = await response.text()
	return data
	
}