# @anio-node-foundation/http-socket

Emulate a socket via http server-sent events / fetch.

### Example Server

```js
import {createServer} from "@anio-node-foundation/http-socket"

const server = await createServer(3324 /* port */, "/endpoint")

console.log("Listening on port", server.port)

server.on("httpRequest", ({request, response}) => {
	// handle normal http request (url doesn't start with "/endpoint" in this case)
	response.write("hello")
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
```

### Example Client

```js
import {createClient} from "@anio-node-foundation/http-socket"

const client = await createClient(`${document.location.origin}/endpoint/`)

client.sendMessage("Hello from client!")

client.on("message", msg => {
	console.log("client received message", msg)
})
```
