import { Address6, Address4 } from "ip-address";
import { Address4Or6, IPTypes } from "../helper/ip-helper";


type V4V6IPGetter = {
	v4: LocalIPGetters<Address4>;
	v6: LocalIPGetters<Address6>;
}

function getTypedIPetter (getter: V4V6IPGetter, type: IPTypes): LocalIPGetters<Address4Or6> {
	if (type === 'A') {
		return getter.v4;
	} else {
		return getter.v6;
	}
}

interface LocalIPGetters <T extends Address4Or6> {
	getIP(): Promise<T>;
}

abstract class NetworkQueryBasedLocalIPGetter <T extends Address4Or6> implements LocalIPGetters <T> {
	protected endpoint: string;
	public constructor (endpoint: string) {
		this.endpoint = endpoint;
	}
	public abstract getIP(): Promise<T>;
}

class V4NetworkQueryBasedLocalIPGetter extends NetworkQueryBasedLocalIPGetter<Address4> {
	public override async getIP (): Promise<Address4> {
		const response = await fetch(this.endpoint);
		const data = await response.text();
		const addr = new Address4(data.trim());
		return addr;
	}
}

class V6NetworkQueryBasedLocalIPGetter extends NetworkQueryBasedLocalIPGetter<Address6> {
	public override async getIP (): Promise<Address6> {
		const response = await fetch(this.endpoint);
		const data = await response.text();
		const addr = new Address6(data.trim());
		return addr;
	}
}

const LocalIPGetters: Record<string, V4V6IPGetter> = {
	FETCH_NO_IP: {
		v4: new V4NetworkQueryBasedLocalIPGetter('http://ip1.dynupdate6.no-ip.com/'),
		v6: new V6NetworkQueryBasedLocalIPGetter('http://ip1.dynupdate6.no-ip.com/'),
	}
};

abstract class AbsLocalIPGetter <Addr extends Address4Or6> {
	
	private cachedResult: Addr | null = null;
	private cachedRunId: string | null = null;
	
	protected isCacheValid (runId: string | undefined): Addr | null {
		if (this.cachedRunId === runId || runId === undefined) {
			return this.cachedResult;
		}
		return null;
	}
	
	protected cacheIP (ip: Addr, runId: string): Addr {
		this.cachedResult = ip;
		this.cachedRunId = runId;
		return ip;
	}
	
	public async getIP (runId: string): Promise<Addr> {
		const cached = this.isCacheValid(runId);
		if (cached !== null) return cached;
		const ip = await this.realGetIPAddress();
		return this.cacheIP(ip, runId);
	}
	
	protected abstract realGetIPAddress (): Promise<Addr>;
	
}

export class LocalIPGetterV4 extends AbsLocalIPGetter<Address4> {
	protected override async realGetIPAddress(): Promise<Address4> {
		const getter = getTypedIPetter(LocalIPGetters.FETCH_NO_IP, 'A') as LocalIPGetters<Address4>;
		return getter.getIP();
	}
}

export class LocalIPGetterV6 extends AbsLocalIPGetter<Address6> {
	protected override async realGetIPAddress(): Promise<Address6> {
		const getter = getTypedIPetter(LocalIPGetters.FETCH_NO_IP, 'AAAA') as LocalIPGetters<Address6>;
		return getter.getIP();
	}
}
