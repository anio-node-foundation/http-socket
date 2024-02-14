//
// code taken from https://rob-blackbourn.medium.com/beyond-eventsource-streaming-fetch-with-readablestream-5765c7de21a1
// and adjusted to fit our use case
//
// Original Author: Rob Blackbourn, Date: Sep 23, 2019
//

import eventEmitter from "@anio-js-core-foundation/simple-event-emitter"

function createLineDecoder() {
	return new TransformStream({
		start(controller) {
			controller.buf = ""
			controller.pos = 0
		},

		transform(chunk, controller) {
			controller.buf += chunk

			while (controller.pos < controller.buf.length) {
				if (controller.buf[controller.pos] == "\n") {
					const line = controller.buf.substring(0, controller.pos)
					controller.enqueue(line)
					controller.buf = controller.buf.substring(controller.pos + 1)
					controller.pos = 0
				} else {
					controller.pos++
				}
			}
		}
	})
}

function createWriteableEventStream(dispatchEvent) {
	return new WritableStream({
		start(controller) {
			dispatchEvent("start")
		},

		write(message, controller) {
			dispatchEvent("message", message)
		},

		close(controller) {
			dispatchEvent("close")
		},

		abort(reason) {
			dispatchEvent("close")
		}
	})
}

export default function SSEWithFetch(url, options = {}) {
	let instance = {
		public_interface: {}
	}

	const event_emitter = eventEmitter(["start", "message", "close", "error"])

	const dispatchEvent = event_emitter.install(instance.public_interface)

	const line_decoder = createLineDecoder()
	const event_stream = createWriteableEventStream(dispatchEvent)

	fetch(url, options)
	.then(response => {
		return response.body
			.pipeThrough(new TextDecoderStream())
			.pipeThrough(line_decoder)
			.pipeTo(event_stream)
	})
	.catch(error => {
		dispatchEvent("error", error)
	})

	return instance.public_interface
}
