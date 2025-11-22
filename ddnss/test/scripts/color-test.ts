import 'colorts/lib/string'

const text1 = "Hello, World!".red.bold as any as string
const text2 = "This is a test string.".green.italic

console.log(text1)
console.log("type of this message: " + (typeof text1))
console.log(text2)
console.log("type of this message: " + (typeof text2))
console.log(text1 + text2)
console.log("Combined length: " + (text1.length + text2.length))
console.log("Stripped text1: " + text1.strip)
console.log("Stripped text2: " + text2.strip)
console.log("Stripped combined: " + (text1 + text2).strip)
console.log("Lengths after stripping: " + ((text1 + text2).strip.length))
