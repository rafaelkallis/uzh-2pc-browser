let app = require('express')();
let uuid = require(`node-uuid`).v4;
let Promise = require('bluebird');
let Subordinate = require('./subordinate');

let subordinates = [];

for (let i = 0; i < 4; ++i) {
    subordinates.push(new Subordinate());
}

app.get(`/`, (req, res) => {
    let payload = {
        id: 'some_id',
        payload: 'some_payload'
    };

    /* --* DEBUG *--
    new Promise(resolve => console.log(`preparing`) || resolve())
        .then(() => Promise.all(subordinates.map(sub => sub.prepare(payload))))
        .then(responses => console.log('responses:', responses) || Promise.resolve(responses))
        .then(responses => new Promise((resolve, reject) => responses.indexOf('NO') == -1 ? resolve('YES') : reject('NO')))
        .then(() => console.log(`committing`))
        .then(() => Promise.all(subordinates.map(sub => sub.commit(payload))))
        .then((responses) => console.log('responses:', responses))
        .then(() => res.send(`OK\n`))
        .catch((err) => {
            err.message == 'TIMEOUT' && console.error('timeout on prepare');
            console.log('aborting');
            Promise.all(subordinates.map(worker => worker.abort(payload)))
                .then(results => console.log('responses:', results))
                .then(() => res.send('ABORTED\n'));
        });
        */

    Promise.all(subordinates.map(sub => sub.prepare(payload)))
        .then(responses => new Promise((resolve, reject) => responses.indexOf('NO') == -1 ? resolve('YES') : reject('NO')))
        .then(() => Promise.all(subordinates.map(sub => sub.commit(payload))))
        .then(() => res.send(`OK\n`))
        .catch(() => {
            Promise.all(subordinates.map(worker => worker.abort(payload)))
                .then(() => res.send('ABORTED\n'));
        });
});

app.listen(8080);


// --* DEBUG *--

// let sub1 = new Subordinate();

// sub1.prepare('payload').then(result => console.log(result)).catch(err => console.error(err.message));

// sub1.commit('payload').then(result => console.log(result));

// sub1.abort('payload').then(result => console.log(result));
