let uuid = require('node-uuid').v4;
let fork = require('child_process').fork;

let Subordinate = function () {
    let child_process = fork(`subordinate.js`);
    let that = this;

    this.request = (type, payload = '', callback = () => ({}), timeout_interval = 100) => {
        let id = uuid();
        let timeout = setTimeout(() => {
            console.log(`timeout`);
            child_process.removeListener(`message`, listener);
            callback(`timeout`);
        }, timeout_interval);

        let listener = (message) => {
            if (message.id == id) {
                clearTimeout(timeout);
                child_process.removeListener(`message`, listener);

                console.log(`message arrived`);

                callback(null, message.type);
            }
        };

        child_process.on('message', listener);
        child_process.send({id: id, type: type, payload: payload});
    };

    this.prepare = (payload) => new Promise((resolve, reject) => this.request(`PREPARE`, payload, (err, response) => err ? reject(err) : response != `YES` ? reject(response) : resolve()));

    this.commit = (payload) => new Promise((resolve) => (function retry() {
        that.request(`COMMIT`, payload, (err, response) => err || response != `ACK` ? retry() : resolve());
    })());

    this.abort = (payload) => new Promise((resolve) => (function retry() {
        that.request(`ABORT`, payload, (err, response) => err || response != `ACK` ? retry() : resolve());
    })());
};

module.exports = Subordinate;

process.on('message', (message) => {
    console.log(message);
    switch (message.type) {
        case `PREPARE`:
            respond(message.id, `YES`);
            break;
        case `COMMIT`:
            respond(message.id, `ACK`);
            break;
        case `ABORT`:
            respond(message.id, `ACK`);
            break;
    }
});

function respond(id, type) {
    process.send({id: id, type: type});
}