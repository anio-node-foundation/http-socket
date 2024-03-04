import eventEmitter from "@anio-js-foundation/simple-event-emitter"
import createRandomIdentifier from "@anio-js-foundation/create-random-identifier"

function setupClient(id) {
	let client_instance = {
		id,
		current_stream: null,
		message_queue: [],
		public_interface: {
			id,
			sendMessage(msg) {
				// client is connected, send immediately
				if (client_instance.current_stream !== null) {
					client_instance.current_stream.write(
						`${JSON.stringify({
							message: msg
						})}\n`
					)
				} else {
					client_instance.message_queue.push(msg)
				}
			}
		}
	}

	const event_emitter = eventEmitter(["message", "disconnect"])

	client_instance.dispatchEvent = event_emitter.install(client_instance.public_interface)

	return client_instance
}

export default function(instance, relative_path, request, response) {
	if (relative_path === "create") {
		const client_id = createRandomIdentifier(32)

		instance.connected_clients.set(client_id, setupClient(client_id))

		response.write(JSON.stringify({
			id: client_id
		}) + "\n")
		response.end()

		return
	}
	else if (relative_path.startsWith("stream/")) {
		let client_id = relative_path.slice("stream/".length)

		if (!instance.connected_clients.has(client_id)) {
			throw new Error(`Invalid client identifier '${client_id}'.`)
		}

		const client_instance = instance.connected_clients.get(client_id)

		if (client_instance.current_stream !== null) {
			throw new Error(`Concurrent streams are not supported.`)
		}

		// release stream when socket closes
		request.socket.on("close", () => {
			client_instance.current_stream = null

			instance.dispatchEvent("disconnect", client_instance.id)

			client_instance.dispatchEvent("disconnect")

			instance.connected_clients.delete(client_instance.id)
		})

		client_instance.current_stream = response

		response.writeHead(200, {
			//"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive"
		})

		instance.dispatchEvent("connect", client_instance.public_interface)

		client_instance.current_stream.write(
			`C813A843-5765-4DB3-8439-24AC1849117D\n`
		)

		// dump accumulated messages
		while (client_instance.message_queue.length) {
			const msg = client_instance.message_queue.shift()

			client_instance.current_stream.write(
				`${JSON.stringify({message: msg})}\n`
			)
		}

		return
	}
	else if (relative_path.startsWith("sendMessage/")) {
		let client_id = relative_path.slice("sendMessage/".length)

		if (!instance.connected_clients.has(client_id)) {
			throw new Error(`Invalid client identifier '${client_id}'.`)
		}

		const client_instance = instance.connected_clients.get(client_id)

		let body = ""

		request.on("data", chunk => body += chunk)

		request.on("end", () => {
			response.write("ok")
			response.end()

			const data = JSON.parse(body)

			instance.dispatchEvent("message", client_instance.id, data.message)
			client_instance.dispatchEvent("message", data.message)
		})

		return
	}

	throw new Error(`Unknown method '${relative_path}'.`)
}
