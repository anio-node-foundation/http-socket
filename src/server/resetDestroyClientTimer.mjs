export default function(instance, client_id) {
	const client = instance.connected_clients.get(client_id)

	if (client.destroy_client_timer !== null) {
		clearTimeout(client.destroy_client_timer)

		client.destroy_client_timer = null
	}

	client.destroy_client_timer = setTimeout(() => {
		client.current_response_object = null

		instance.connected_clients.delete(client.id)

		instance.dispatchEvent("disconnect", client.id)

		client.dispatchEvent("disconnect")
	}, 10000)
}
