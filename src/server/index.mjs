import eventEmitter from "@anio-js-core-foundation/simple-event-emitter"
import createPromise from "@anio-js-core-foundation/create-promise"
import handleRequest from "./handleRequest.mjs"

export default async function createServer(port, endpoint_path) {
	const {default: http} = await import("node:http")
	const {default: path} = await import("node:path")

	const {promise, resolve, reject} = createPromise()

	let instance = {
		port: -1,
		connected_clients: new Map(),
		public_interface: {}
	}

	const event_emitter = eventEmitter(["connect", "httpRequest", "message", "disconnect"])

	const dispatchEvent = event_emitter.install(instance.public_interface)

	instance.dispatchEvent = dispatchEvent

	instance.public_interface.sendMessage = (client_id, msg) => {
		if (!instance.connected_clients.has(client_id)) {
			throw new Error(`No such client '${client_id}'.`)
		}

		const client = instance.connected_clients.get(client_id)
		const {current_response_object} = client

		if (current_response_object === null) {
			client.message_queue.push(msg)
		} else {
			current_response_object.write(JSON.stringify({
				messages: [{
					message: msg,
					sequence_id: client.sequence_id
				}]
			}))
			current_response_object.end()

			client.current_response_object = null
			client.sequence_id++
		}
	}

	const server = http.createServer((request, response) => {
		if (request.url.startsWith(endpoint_path)) {
			let normalized_path = request.url.slice(endpoint_path.length)

			normalized_path = path.normalize(normalized_path)

			try {
				handleRequest(
					instance, normalized_path, {request, response}
				)
			} catch (error) {
				response.write(JSON.stringify({
					error: error.message
				}))
				response.end()
			}
		} else {
			dispatchEvent("httpRequest", {request, response})
		}
	})

	server.on("error", reject)

	server.timeout = 5000
	server.maxRequestsPerSocket = 1

	server.listen(port, () => {
		instance.public_interface.port = server.address().port

		resolve(instance.public_interface)
	})

	return await promise
}
