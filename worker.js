const worker_id = process.env.ID || 0;
process.send(`${worker_id} running`);

/*
 incoming message API:

 {
 transaction_id: [a-z0-9]{36,36},
 type: [PREPARE|COMMIT|ABORT],
 bug: [FAIL|NO_RESPONSE]
 }

 outgoing message API:

 {
 sender: [0-9]+,
 transaction_id: [a-z0-9]{36,36},
 type: [PREPARE|COMMIT|ABORT]_[YES|NO],
 }
 */

process.on('message', (message) => {
    let transaction_id = message.transaction_id;
    if (!message.bug || message.bug != `NO_RESPONSE`) {
        switch (message.type) {
            case `PREPARE`:
                if (Math.random() < 0.5) {
                    process.send(generate_message(transaction_id, `PREPARE_YES`));
                } else {
                    process.send(generate_message(transaction_id, `PREPARE_NO`));
                }
                // if (!message.bug || message.bug != `FAIL`) {
                //     process.send(generate_message(transaction_id, `PREPARE_YES`));
                // } else {
                //     process.send(generate_message(transaction_id, `PREPARE_NO`));
                // }
                break;
            case `COMMIT`:
                if (!message.bug || message.bug != `FAIL`) {
                    process.send(generate_message(transaction_id, `COMMIT_YES`));
                } else {
                    process.send(generate_message(transaction_id, `COMMIT_NO`));
                }
                break;
            case `ABORT`:
                if (!message.bug || message.bug != `FAIL`) {
                    process.send(generate_message(transaction_id, `ABORT_YES`));
                } else {
                    process.send(generate_message(transaction_id, `ABORT_NO`));
                }
                break;
        }
    }
});

function can_prepare() {
    return true;
}

function can_commit() {
    return true;
}

function can_abort() {
    return true;
}

function can_respond() {
    return true;
}

function generate_message(transaction_id, type) {
    return {
        sender: worker_id,
        transaction_id: transaction_id,
        type: type
    }
}