import createPromise from "@anio-js-core-foundation/create-promise"
import eventEmitter from "@anio-js-core-foundation/simple-event-emitter"

async function createClient(endpoint_url) {
	const response = await fetch(`${endpoint_url}/create`)

	return (await response.json()).id
}

export default async function(endpoint_url) {
	const ready_promise = createPromise()

	const id = await createClient(endpoint_url)

	let instance = {
		id,
		is_ready: false,
		message_queue: [],
		public_interface: {
			id,

			async sendMessage(msg) {
				await fetch(`${endpoint_url}/sendMessage/${id}`, {
					headers: {
						"Content-Type": "application/json"
					},
					method: "POST",
					body: JSON.stringify({message: msg})
				})
			}
		}
	}

	const event_emitter = eventEmitter(["message"])

	instance.dispatchEvent = event_emitter.install(instance.public_interface)

	let event_source = new EventSource(`${endpoint_url}/stream/${id}`)

	event_source.onmessage = (e) => {
		if (instance.is_ready === false) {
			if (e.data === `C813A843-5765-4DB3-8439-24AC1849117D`) {
				instance.is_ready = true

				ready_promise.resolve()

				setTimeout(() => {
					while (instance.message_queue.length) {
						const msg = instance.message_queue.shift()

						instance.dispatchEvent("message", msg)
					}
				}, 0)
			} else {
				instance.message_queue.push(e.data)
			}
		} else {
			instance.dispatchEvent("message", e.data)
		}
	}

	await ready_promise.promise

	return instance.public_interface
}
