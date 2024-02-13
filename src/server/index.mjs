import eventEmitter from "@anio-js-core-foundation/simple-event-emitter"
import createPromise from "@anio-js-core-foundation/create-promise"
import handleRequest from "./handleRequest.mjs"

export default async function(http_port, base_url) {
	const {default: path} = await import("node:path")
	const {default: http} = await import("node:http")

	let instance = {
		ready_promise: createPromise(),
		connected_clients: new Map(),
		public_interface: {
			sendMessage(client_id, msg) {
				if (!instance.connected_clients.has(client_id)) {
					throw new Error(`No such client '${client_id}'.`)
				}

				const client_instance = instance.connected_clients.get(client_id)

				return client_instance.public_interface.sendMessage(msg)
			}
		}
	}

	const event_emitter = eventEmitter(["httpRequest", "connect", "message", "disconnect"])

	instance.dispatchEvent = event_emitter.install(instance.public_interface)

	const normalized_base_url = path.normalize(base_url + "/")

	const server = http.createServer(async (request, response) => {
		const normalized_path = path.normalize(request.url)

		if (!normalized_path.startsWith(normalized_base_url)) {
			instance.dispatchEvent("httpRequest", {request, response})
		} else {
			const relative_path = normalized_path.slice(normalized_base_url.length)

			try {
				await handleRequest(instance, relative_path, request, response)
			} catch (error) {
				response.writeHead(500)
				response.write(`${error.message}`)
				response.end()
			}
		}
	})

	server.on("error", instance.ready_promise.reject)

	server.listen(http_port, () => {
		instance.public_interface.port = server.address().port

		instance.ready_promise.resolve(instance.public_interface)
	})

	return instance.ready_promise.promise
}
