//let previous_request_socket = null

export default function(instance, client, method, {request, response}) {
	if (method === "poll") {
		if (client.current_response_object !== null) {
			throw new Error(`Concurrent connections to /poll are not supported.`)
		}

		//console.log("reused", previous_request_socket === request.socket)
		//previous_request_socket = request.socket

		request.socket.on("timeout", () => {
			client.current_response_object = null
		})

		request.socket.on("close", () => {
			client.current_response_object = null
		})

		// serve queued up messages
		if (client.message_queue.length) {
			let messages = []

			while (client.message_queue.length) {
				const message = client.message_queue.shift()

				messages.push({
					sequence_id: client.sequence_id,
					message
				})

				client.sequence_id++
			}

			response.write(JSON.stringify({
				messages
			}))

			response.end()
		} else {
			// set response object so sendMessage()
			// can immediately send data via this variable
			client.current_response_object = response
		}

		return
	}

	if (method === "sendMessage") {
		let body = ""

		request.on("data", chunk => body += chunk)

		request.on("end", () => {
			response.write("\"ok\"")
			response.end()

			const data = JSON.parse(body)

			instance.dispatchEvent("message", client.id, data.message)
			client.dispatchEvent("message", data.message)
		})

		return
	}

	throw new Error(`No such method.`)
}
