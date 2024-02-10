import eventEmitter from "@anio-js-core-foundation/simple-event-emitter"
import runFnPeriodically from "@anio-js-foundation/run-fn-periodically"

async function getClientID(endpoint_url) {
	const response = await fetch(`${endpoint_url}/create`)

	return (await response.json()).client_id
}

export default async function createClient(endpoint_url) {
	const event_emitter = eventEmitter(["message", "desync"])

	let instance = {
		desynced: false,
		destroyed: false,

		debug(...args) {
			if (instance.public_interface.debug !== true) return

			console.log("http-socket client", endpoint_url, ...args)
		},

		public_interface: {
			debug: false
		}
	}

	const dispatchEvent = event_emitter.install(instance.public_interface)

	const client_id = await getClientID(endpoint_url)
	let sequence_id = 0

	const poll = async () => {
		try {
			const response = await fetch(
				`${endpoint_url}/client/${client_id}/poll`, {
					signal: AbortSignal.timeout(10000) /* double the server timeout */
				}
			)

			const data = await response.json()

			if ("messages" in data) {
				const {messages} = data

				for (const message of messages) {
					instance.desynced = message.sequence_id !== sequence_id

					dispatchEvent("message", message.message)

					++sequence_id
				}

				if (instance.desynced) {
					instance.debug("desync detected")

					dispatchEvent("desync")
				}
			} else {
				instance.debug("got response", data)
			}
		} catch (e) {
			instance.debug("error", e.message)
		}
	}

	const poller = runFnPeriodically(poll, 500)

	instance.public_interface.sendMessage = async (msg) => {
		if (instance.destroyed) {
			throw new Error(`Cannot use .sendMessage on destroyed instance.`)
		}

		await fetch(`${endpoint_url}/client/${client_id}/sendMessage`, {
			headers: {
				"Content-Type": "application/json"
			},
			method: "POST",
			body: JSON.stringify({message: msg})
		})
	}

	instance.public_interface.destroy = () => {
		if (instance.destroyed) return

		instance.destroyed = true

		poller.cancel()
	}

	return instance.public_interface
}
