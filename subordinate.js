let uuid = require('node-uuid').v4;
let fork = require('child_process').fork;
let Promise = require('bluebird');

let Subordinate = function () {
    let child_process = fork(`subordinate.js`);

    let request = (type, payload, callback, timeout_interval = 500) => {
        let id = uuid();
        let listener = (message) => {
            if (message.id == id) {
                clearTimeout(timeout);
                child_process.removeListener(`message`, listener);
                callback(null, message.type);
            }
        };

        let timeout = setTimeout(() => {
            child_process.removeListener(`message`, listener);
            callback(`TIMEOUT`);
        }, timeout_interval);

        child_process.on('message', listener);
        child_process.send({id: id, type: type, payload: payload});
    };

    this.prepare = (payload) => new Promise((resolve, reject) => request(`PREPARE`, payload, (err, response) => err || response != `YES` ? reject() : resolve()));

    this.commit = (payload) => new Promise(resolve => (function retry() {
        request(`COMMIT`, payload, (err, response) => err || response != `ACK` ? retry() : resolve());
    })());

    this.abort = (payload) => new Promise(resolve => (function retry() {
        request(`ABORT`, payload, (err, response) => err || response != `ACK` ? retry() : resolve());
    })());
};

module.exports = Subordinate;

process.on('message', (message) => {
    switch (message.type) {
        case `PREPARE`:
            Math.random() < 0.85 ? respond(message.id, `YES`) : Math.random() < 0.5 && respond(message.id, 'NO');
            break;
        case `COMMIT`:
            Math.random() < 0.85 && respond(message.id, `ACK`);
            break;
        case `ABORT`:
            Math.random() < 0.85 && respond(message.id, `ACK`);
            break;
    }
});

function respond(id, type) {
    process.send({id: id, type: type});
}