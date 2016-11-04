// let app = require('express')();
// let Promise = require('bluebird');
// let Subordinate = require('./subordinate_socket');
//
// let _subordinate_mediators = [];
//
// for (let i = 0; i < 4; ++i) {
//     _subordinate_mediators.push(new Subordinate());
// }
//
// _app.get(`/`, (req, res) => {
//     let payload = {
//         id: 'some_id',
//         payload: 'some_payload'
//     };
//
//     new Promise(resolve => console.log(`preparing`) || resolve())
//         .then(() => Promise.all(_subordinate_mediators.map(sub => sub.prepare(payload))))
//         .then(() => console.log(`committing`))
//         .then(() => Promise.all(_subordinate_mediators.map(sub => sub.commit(payload))))
//         .then(() => res.send(`OK\n`))
//         .catch(() => {
//             console.log('aborting');
//             Promise.all(_subordinate_mediators.map(worker => worker.abort(payload)))
//                 .then(() => res.send('ABORTED\n'));
//         });
// });
//
// _app.listen(8080);


// --* DEBUG *--

// let sub1 = new SubordinateMediator();

// sub1.prepare('payload').then(result => console.log(result)).catch(err => console.error(err.message));

// sub1.commit('payload').then(result => console.log(result));

// sub1.abort('payload').then(result => console.log(result));

const uuid = require('node-uuid').v4;
const Coordinator = require('./coordinator');
const Subordinate = require('./subordinate');


let leaf1 = new Subordinate(uuid(), 'http://localhost:8080');
// let leaf2 = new Subordinate(uuid(), 'http://localhost:8080');
// let leaf3 = new Subordinate(uuid(), 'http://localhost:8080');
// let leaf4 = new Subordinate(uuid(), 'http://localhost:8080');