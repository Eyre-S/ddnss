import { mkdirSync, writeFileSync } from "fs";
import { configFileSchema } from "../../src/config/config-types";
import z from "zod";

const appConfig_schema = z.toJSONSchema(configFileSchema);

mkdirSync("schemas", { recursive: true })

writeFileSync("schemas/app-config.json", JSON.stringify(appConfig_schema, null, '\t'))
