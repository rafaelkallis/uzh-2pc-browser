let app = require('express')();
let uuid = require(`node-uuid`).v4;
let Promise = require('bluebird');
let Subordinate = require('./subordinate');

let subordinates = [];

for (let i = 0; i < 1; ++i) {
    subordinates.push(new Subordinate());
}

app.get(`/`, (req, res) => {
    let payload = {
        id: 'some_id',
        payload: 'some_payload'
    };
    new Promise((resolve) => console.log(`preparing`) || resolve())
        .then(Promise.all(subordinates.map(worker => worker.prepare(payload))))
        .then(console.log(`commiting`))
        .then(Promise.all(subordinates.map(worker => worker.commit(payload))))
        .then(() => res.send(`OK\n`))
        .catch((err) => res.send(`ABORTED\n`) || subordinates.map(worker => worker.abort(payload)));
});

app.listen(8080);