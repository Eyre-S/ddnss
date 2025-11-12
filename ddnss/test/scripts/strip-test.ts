import { Logger, strip } from "../../src/utils/logging";

const logger = new Logger("Strip-Test");

logger.info("-----------------------------------------")

logger.info(strip(`
	|There should be no leading empty line.
	|This is a test string.
	|	It has multiple lines.
	|		Some lines are indented.
	|This line is not indented.
	|There should be no trailing empty line.
`))

logger.info("-----------------------------------------")

logger.info(strip(`
	|
	|The above should have one empty line.
	|The below should have two empty lines.
	|
	|
	|The below should have one empty line.
	|
`))

logger.info("-----------------------------------------")

testInIndent();

function testInIndent () {
	logger.info("-----------------------------------------")
	
	logger.info(strip(`
		|There should be no leading empty line.
		|This is a test string.
		|	It has multiple lines.
		|		Some lines are indented.
		|This line is not indented.
		|There should be no trailing empty line.
	`))
	
	logger.info("-----------------------------------------")
	
	logger.info(strip(`
		|
		|The above should have one empty line.
		|The below should have two empty lines.
		|
		|
		|The below should have one empty line.
		|
	`))
	
	logger.info("-----------------------------------------")
}
