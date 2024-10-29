import { zodToJsonSchema } from "zod-to-json-schema";
import { AppConfig } from "../../src/main";
import { mkdirSync, writeFileSync } from "fs";

const appConfig_schema = zodToJsonSchema(AppConfig, "app-config")

mkdirSync("schemas", { recursive: true })

writeFileSync("schemas/app-config.json", JSON.stringify(appConfig_schema, null, '\t'))
