import {createServer} from "../build/package.mjs"
import fs from "node:fs"

const server = await createServer(3324, "/endpoint")

server.on("httpRequest", ({request, response}) => {
	if (request.url === "/main.mjs") {
		response.setHeader("Content-Type", "text/javascript")
		response.write(fs.readFileSync("./example/client.mjs"))
		response.end()

		return
	} else if (request.url === "/package.mjs") {
		response.setHeader("Content-Type", "text/javascript")
		response.write(fs.readFileSync("./build/package.mjs"))
		response.end()

		return
	}

	response.setHeader("Content-Type", "text/html;charset=utf-8")
	response.write(fs.readFileSync("./example/index.html"))
	response.end()
})

server.on("connect", client => {
	console.log(client.id, "connected to the server")

	client.on("message", message => {
		console.log("client onmessage handler", message)
	})

	client.on("disconnect", () => {
		console.log("client ondisconnect handler")
	})

	server.sendMessage(client.id, "Welcome to the server!")
	client.sendMessage("Hello from the server again!")
})

server.on("message", (client_id, message) => {
	console.log(client_id, "received message", message)
})

server.on("disconnect", (client_id) => {
	console.log("client", client_id, "disconnected")
})

console.log("Listening on port", server.port)
