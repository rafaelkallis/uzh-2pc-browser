/**
 * Created by rafaelkallis on 03.11.16.
 */
const Promise = require('bluebird');
const uuid = require('node-uuid').v4;
const PrepareNoError = require('./errors').PrepareNoVoteError;
const ACKError = require('./errors').ACKError;
const TimeoutError = require('./errors').TimeoutError;
const socket_client = require('socket.io-client');
const constants = require('./constants');
const PREPARE = constants.PREPARE;
const COMMIT = constants.COMMIT;
const ABORT = constants.ABORT;
const YES = constants.YES;
const ACK = constants.ACK;

/**
 * Used by Subordinate for handling requests from Coordinator
 * @param id: a unique identifier for the Subordinate
 * @param coordinator_host: a URI in the "address:port" format
 * @param message_handler: a promise returning the subordinates response when fulfilled
 */
class CoordinatorMediator {
    constructor(id, coordinator_host, message_handler) {
        this._coordinator_socket = socket_client(coordinator_host);
        this._coordinator_socket.on('connect', () => console.log('connected with coordinator') || this._handshake(id));
        this._coordinator_socket.on('disconnect', () => console.log('disconnected from coordinator'));
        this._handle_message(message_handler);
    }

    _handshake(id) {
        console.log('sending handshake to coordinator');
        this._coordinator_socket.emit('handshake', id);
    }

    _handle_message(handle_message) {
        this._coordinator_socket.on('message', (message) =>
        console.log(`received ${JSON.stringify(message)}`) || handle_message(message.type, message.payload, (result =>
        console.log(`send ${JSON.stringify({id: message.id, type: result})}`) || this._coordinator_socket.send({id: message.id, type: result}))));
    }
}

/**
 * Used by Coordinator to make requests to Subordinate
 * @param socket_server: the subordinate's socket_server.
 */
class SubordinateMediator {
    constructor(subordinate_id, socket) {
        this.subordinate_id = subordinate_id;
        this.subordinate_socket = socket;
    }

    _request(type, payload, callback, timeout_interval = 1000) {
        let id = uuid();
        let listener = (message) => {
            if (message.id == id) {
                clearTimeout(timeout);
                this.subordinate_socket.removeListener(`message`, listener);
                callback(null, message.type);
            }
        };

        let timeout = setTimeout(() => {
            this.subordinate_socket.removeListener(`message`, listener);
            callback(new TimeoutError());
        }, timeout_interval);

        this.subordinate_socket.on('message', listener);
        let message = {id: id, type: type, payload: payload};
        this.subordinate_socket.send(message);
    }

    prepare(payload) {
        return new Promise((resolve, reject) => this._request(PREPARE, payload, (err, type) => err || type != YES ? reject(new PrepareNoError(this.subordinate_id)) : resolve()));
    }

    commit(payload) {
        return new Promise((resolve, reject) => this._request(COMMIT, payload, (err, type) => err || type != ACK ? reject(new ACKError(this.subordinate_id)) : resolve()));
    }

    abort(payload) {
        return new Promise((resolve, reject) => this._request(ABORT, payload, (err, type) => err || type != ACK ? reject(new ACKError(this.subordinate_id)) : resolve()));
    }
}

module.exports = {CoordinatorMediator, SubordinateMediator};
