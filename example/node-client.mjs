import {createClient} from "../build/package.mjs"

const client = await createClient(
	"http://localhost:3324/endpoint/"
)

client.sendMessage("Hello from node client!")

client.on("message", msg => {
	console.log(">>> node got message", msg)
})
