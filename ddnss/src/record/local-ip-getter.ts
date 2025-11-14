import { Address6, Address4 } from "ip-address";
import { Address4Or6 } from "../helper/ip-helper";
import { IPGetter } from "./ip-getters";
import { ServerMain } from "../main";


type V4V6IPGetter = {
	name: string;
	v4: LocalIPGetters<Address4>;
	v6: LocalIPGetters<Address6>;
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

export const LocalIPGetters: Record<string, V4V6IPGetter> = {
	FETCH_NO_IP: {
		name: "no-ip.com fetch service",
		v4: new V4NetworkQueryBasedLocalIPGetter('http://ip1.dynupdate.no-ip.com/'),
		v6: new V6NetworkQueryBasedLocalIPGetter('http://ip1.dynupdate6.no-ip.com/'),
	}
};

abstract class AbsLocalIPGetter <Addr extends Address4Or6> implements IPGetter<Addr> {
	
	private cachedResult: Addr | null = null;
	private cachedRunId: string | null = null;
	
	public constructor (
		protected readonly server: ServerMain,
		protected readonly endServiceProvider: V4V6IPGetter
	) {}
	
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
		this.server.logger.info(`getting local IP address using service: ${this.endServiceProvider.name}`);
		const cached = this.isCacheValid(runId);
		if (cached !== null) {
			this.server.logger.info(`cache not expired, using cached address: ${cached.correctForm()}`);
			return cached
		};
		const ip = await this.realGetIPAddress();
		this.server.logger.info(`obtained local IP address: ${ip.correctForm()}`);
		return this.cacheIP(ip, runId);
	}
	
	protected abstract realGetIPAddress (): Promise<Addr>;
	
}

export class LocalIPGetterV4 extends AbsLocalIPGetter<Address4> {
	protected override async realGetIPAddress(): Promise<Address4> {
		return this.endServiceProvider.v4.getIP();
	}
}

export class LocalIPGetterV6 extends AbsLocalIPGetter<Address6> {
	protected override async realGetIPAddress(): Promise<Address6> {
		return this.endServiceProvider.v6.getIP();
	}
}
