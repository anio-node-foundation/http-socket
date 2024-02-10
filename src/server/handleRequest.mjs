import handleClientMethod from "./handleClientMethod.mjs"
import createClient from "./createClient.mjs"
import resetDestroyClientTimer from "./resetDestroyClientTimer.mjs"

export default function(instance, path, {request, response}) {
	if (path === "/create") {
		const client = createClient(instance)

		response.write(JSON.stringify({client_id: client.id}))
		response.end()

		instance.dispatchEvent("connect", client)

		return
	}

	if (path.startsWith("/client/")) {
		const tmp = path.slice("/client/".length).split("/")

		if (tmp.length !== 2) {
			throw new Error(`Request to /client/ must follow the following scheme: /client/<id>/method.`)
		}

		const [client_id, method] = tmp

		if (!instance.connected_clients.has(client_id)) {
			throw new Error(`No such client id.`)
		}

		resetDestroyClientTimer(instance, client_id)

		const client = instance.connected_clients.get(client_id)

		handleClientMethod(instance, client, method, {request, response})

		return
	}

	throw new Error(`Invalid request.`)
}
