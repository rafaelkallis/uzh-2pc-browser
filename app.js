var express = require('express');
var app = express();

const n_workers = 2;
const timeout_ms = 250;
const max_attempts = Infinity;
var workers = {};
var transactions = {};

for (let i = 0; i < 2; ++i) {
    workers[i] = require('child_process').fork(`worker.js`, {env: {ID: i}});

    /*
     incoming message API:

     {
     sender: ^[0-9]+$
     transaction_id: ^[a-z0-9]{36,36}$
     type: ^[PREPARE_[YES|NO]|COMMIT_[YES|NO]|ABORT_[YES|NO]]$
     }

     outgoing message API:

     {
     transaction_id: ^[a-z0-9]{36,36}$
     type: ^[PREPARE|COMMIT|ABORT]$
     }
     */

    workers[i].on('message', (message) => {
        let transaction_id = message.transaction_id;
        switch (message.type) {
            case `PREPARE_YES`:
                if (++transactions[transaction_id].yes_reponses == n_workers) {
                    upgrade_transaction(transaction_id);
                }
                break;
            case `COMMIT_YES`:
                if (++transactions[transaction_id].yes_reponses == n_workers) {
                    finish_transaction(transaction_id);
                }
                break;
            case `ABORT_YES`:
                if (++transactions[transaction_id].yes_reponses == n_workers) {
                    if (++transactions[transaction_id].attempts != max_attempts) {
                        start_transaction(transaction_id);
                    } else {
                        cancel_transaction(transaction_id);
                    }
                }
                break;
            case `PREPARE_NO`:
                abort_transaction(transaction_id);
                break;
            case `COMMIT_NO`:
                abort_transaction(transaction_id);
                break;
            case `ABORT_NO`:
                abort_transaction(transaction_id);
                break;
        }

    });
}

app.listen(8080);

app.get(`/`, (req, res) => {
    initialise_transaction((err) => err ? res.send('ABORTED\n') : res.send('OK\n'));
});

function initialise_transaction(transaction_callback) {
    let transaction_id = generate_transaction_id();
    transactions[transaction_id] = {
        phase: `INIT`,
        yes_reponses: 0,
        timeout: null,
        callback: transaction_callback,
        attempts: 0
    };
    start_transaction(transaction_id);
}

function start_transaction(transaction_id) {
    transactions[transaction_id].phase = `PREPARE`;
    console.log(`${transaction_id} started`);
    transactions[transaction_id].yes_reponses = 0;
    clearTimeout(transactions[transaction_id].timeout);
    transactions[transaction_id].timeout = setTimeout(() => abort_transaction(transaction_id), timeout_ms);
    send_prepare_message(transaction_id);
}

function upgrade_transaction(transaction_id) {
    transactions[transaction_id].phase = `COMMIT`;
    console.log(`${transaction_id} prepared`);
    transactions[transaction_id].yes_reponses = 0;
    clearTimeout(transactions[transaction_id].timeout);
    transactions[transaction_id].timeout = setTimeout(() => abort_transaction(transaction_id), timeout_ms);
    send_commit_message(transaction_id);
}

function abort_transaction(transaction_id) {
    if (transactions[transaction_id].phase != `ABORT`) {
        transactions[transaction_id].phase = `ABORT`;
        console.log(`${transaction_id} aborting`);
        clearTimeout(transactions[transaction_id].timeout);
        transactions[transaction_id].timeout = setTimeout(() => abort_transaction(transaction_id), timeout_ms);
        transactions[transaction_id].yes_reponses = 0;
        send_abort_message(transaction_id);
    }
}

function finish_transaction(transaction_id) {
    console.log(`${transaction_id} commited`);
    clearTimeout(transactions[transaction_id].timeout);
    transactions[transaction_id].callback(null);
    delete transactions[transaction_id];
}

function cancel_transaction(transaction_id) {
    console.log(`${transaction_id} canceled`);
    clearTimeout(transactions[transaction_id].timeout);
    transactions[transaction_id].callback(`canceled`);
    delete transactions[transaction_id];
}

function send_prepare_message(transaction_id) {
    send_message(generate_message(transaction_id, `PREPARE`));
}

function send_commit_message(transaction_id) {
    send_message(generate_message(transaction_id, `COMMIT`));
}

function send_abort_message(transaction_id) {
    send_message(generate_message(transaction_id, `ABORT`));
}

function send_message(message, bug = `NONE`, bug_probability = 1) {
    process.nextTick(() => Object.keys(workers).forEach((id) => {
        bug != `NONE` && Math.random() < bug_probability && (message['bug'] = bug);
        workers[id].send(message);
    }));
}

function generate_transaction_id() {
    return require('node-uuid').v4();
}

function generate_message(transaction_id, type) {
    return {
        transaction_id: transaction_id,
        type: type
    };
}