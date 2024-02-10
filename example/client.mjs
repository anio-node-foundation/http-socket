import {createClient} from "/package.mjs"

const client = await createClient(
	document.location.origin + "/endpoint/"
)

client.sendMessage("Hello from client!")

client.on("message", msg => {
	console.log(">>> got message", msg)
})
