import createRandomIdentifier from "@anio-js-core-foundation/create-random-identifier"
import resetDestroyClientTimer from "./resetDestroyClientTimer.mjs"
import eventEmitter from "@anio-js-core-foundation/simple-event-emitter"

export default function(instance) {
	const client_id = createRandomIdentifier(32)

	let client_instance = {
		id: client_id,
		message_queue: [],
		sequence_id: 0,
		current_response_object: null,
		destroy_client_timer: null,

		public_interface: {
			id: client_id,

			sendMessage(msg) {
				return instance.public_interface.sendMessage(client_id, msg)
			}
		}
	}

	const event_emitter = eventEmitter(["message", "disconnect"])

	client_instance.dispatchEvent = event_emitter.install(client_instance.public_interface)

	instance.connected_clients.set(client_id, client_instance)

	resetDestroyClientTimer(instance, client_id)

	return client_instance.public_interface
}
