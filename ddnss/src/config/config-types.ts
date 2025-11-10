import { union, z } from "zod";

//## start accounts

export const zCloudflareAPIAccount = z.object({
	type: z.literal("cloudflare_api"),
	api_key: z.string()
});
export type CloudflareAPIAccount = z.infer<typeof zCloudflareAPIAccount>;

export const zAccountUnit = zCloudflareAPIAccount;
export type AccountUnit = z.infer<typeof zAccountUnit>;

//## end accounts

//## start records

export const zRecordsRecordType = z.union([
	z.literal("A"),
	z.literal("AAAA")
])
export type RecordsRecordType = z.infer<typeof zRecordsRecordType>;

export const zLocalRecord = z.object({
	type: z.literal("local"),
	record: zRecordsRecordType,
})
export type LocalRecord = z.infer<typeof zLocalRecord>;

export const zLocalPrefixRecord = z.object({
	type: z.literal("local_prefix"),
	record: zRecordsRecordType,
	prefix_mask: union([z.string(), z.number()]),
	suffix: z.string()
})
export type LocalPrefixRecord = z.infer<typeof zLocalPrefixRecord>;

export const zRecordUnit = union([
	zLocalRecord,
	zLocalPrefixRecord
]);
export type RecordUnit = z.infer<typeof zRecordUnit>;

//## end records

//## start endpoints

export const zCloudflareRecordEndpoint = z.object({
	type: z.literal("cloudflare_record"),
	account: zAccountUnit,
	check_name: z.string(),
	zone_id: z.string(),
	record_id: z.string(),
	record: zRecordUnit
});
export type CloudflareRecordEndpoint = z.infer<typeof zCloudflareRecordEndpoint>;

export const zEndpointUnit = zCloudflareRecordEndpoint;
export type EndpointUnit = z.infer<typeof zEndpointUnit>;

//## end endpoints

export const configFileSchema = z.object({
	accounts: z.record(z.string(), zAccountUnit).optional(),
	records: z.record(z.string(), zRecordUnit).optional(),
	endpoints: z.array(zEndpointUnit)
});
