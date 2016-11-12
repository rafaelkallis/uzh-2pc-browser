/**
 * Created by rafaelkallis on 07.11.16.
 */

module.exports = class Spectator {
    constructor(socket_server) {
        this._room = socket_server.of('/spectators');
    }

    send(message) {
        this._room.send(message);
    }
}