import { readFileSync } from "fs";
import { ConfigFile, configFileSchema, EndpointUnit, RecordUnit } from "./config/config-types";
import { parse } from "yaml";

export async function loadConfig (path: string = './config.yaml'): Promise<ConfigFile> {
	const fileContent = readFileSync(path, { encoding: 'utf-8' });
	const parsed: any = parse(fileContent);
	configFileSchema.parse(parsed); // Validate
	return parsed;
}

export interface DefinedRecords {
	name: string;
	record: RecordUnit;
	associatedEndpoints: EndpointUnit[];
}

export async function checkTasks (config: ConfigFile): Promise<DefinedRecords[]> {
	
	const definedRecords: DefinedRecords[] = [];
	
	function addRecord (name: string, record: RecordUnit, withEndpoint: EndpointUnit|undefined = undefined): void {
		const rec: DefinedRecords = {
			name,
			record,
			associatedEndpoints: withEndpoint ? [withEndpoint] : [],
		};
		definedRecords.push(rec);
	}
	
	function associate (endpoint: EndpointUnit): void {
		
		const recInEndpoint = endpoint.record;
		
		for (const rec of definedRecords) {
			if (rec.record === recInEndpoint) {
				rec.associatedEndpoints.push(endpoint);
				return;
			}
		}
		
		addRecord(`(rec-for_${endpoint.name})`, recInEndpoint, endpoint);
		
	}
	
	for (const recName in config.records) {
		addRecord(recName, config.records[recName]);
	}
	
	for (const endpoint of config.endpoints) {
		associate(endpoint);
	}
	
	return definedRecords;
	
}
