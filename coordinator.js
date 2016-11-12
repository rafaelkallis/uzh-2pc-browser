/**
 * Created by rafaelkallis on 03.11.16.
 */
import { Promise } from 'bluebird';
import { uuid } from 'node-uuid';
import { Observable } from './observable';
import { PREPARE, COMMIT, ABORT, FAIL, SUCCESS } from './constants';
import { PrepareNoVoteError } from './errors';

export class Coordinator extends Observable {
    constructor() {
        super();
        this._active = true;
        this._subordinates = [];
        this._log_listeners = [];
    }

    get active() {
        return this._active;
    }

    set active(active) {
        if (this.active !== active) {
            this._active = active;
            this._log(active ? "Turned On" : "Turned Off");
            this._notify();
        }
    }

    get subordinates() {
        return this._subordinates;
    }
    set subordinates(subordinates) {
        if (this.subordinates !== subordinates) {
            this._subordinates = subordinates;
            this._notify();
        }
    }

    listen(log_listener) {
        this._log_listeners.push(log_listener);
    }

    _log(entry, duration = 0) {
        return new Promise(resolve => {
            this._log_listeners.forEach(log_listener => log_listener(entry, duration));
            resolve();
        });
    }

    perform_transaction(transaction, delay = 0, timeout = 1000) {
        this._prepare(transaction, delay, timeout)
            .then(
            () => this._commit(transaction, delay, timeout)
                .then(() => this._log(`${transaction.id}: Completed`))
                .then(() => transaction.phase = SUCCESS),
            err => {
                console.log(err.message);
                transaction.phase = "Aborting";
                this._abort(transaction, delay, timeout)
                    .then(() => this._log(`${transaction.id}: Completed`))
                    .then(() => transaction.phase = "Aborted");
            });
    }

    toggle() {
        if (this.active = !this.active) {
            /*
             *  TODO: Check logs for any pending transactions
             */
        }
    }

    attach_subordinate(subordinate) {
        this.subordinates = this.subordinates.concat(subordinate);
    }

    _prepare(transaction, delay, timeout) {
        return this.is_active()
            .then(() => this._log(`${transaction.id}: Sending Prepare`, delay))
            .then(() => transaction.phase = PREPARE)
            .then(() => Promise.all(this.subordinates.map(sub =>
                this.is_active()
                    .delay(delay)
                    .then(() => sub.prepare(transaction, delay))
                    .timeout(timeout)
            )));
    }

    _commit(transaction, delay, timeout) {
        return this.is_active()
            .then(() => this._log(`${transaction.id}: Sending Commit`, delay))
            .then(() => transaction.phase = COMMIT)
            .then(() => Promise.all(this.subordinates.map(sub => this._commit_sub(sub, transaction, delay, timeout))));
    }

    _commit_sub(sub, transaction, delay, timeout) {
        let attempt_n = 0;
        let attempt_commit = () =>
            this.is_active()
                .then(() => {
                    if (attempt_n > 0) {
                        return this._log(`${transaction.id}: retrying Commit on ${sub.id} (${attempt_n})`, delay);
                    }
                })
                .delay(delay)
                .then(() => sub.commit(transaction, delay))
                .timeout(timeout)
                .catch(Promise.TimeoutError, () => Promise.delay(Coordinator._exponential_backoff(++attempt_n)).then(() => attempt_commit()));
        return attempt_commit();
    }

    _abort(transaction, delay, timeout) {
        return this.is_active()
            .then(() => this._log(`${transaction.id}: Sending Abort`, delay))
            .then(() => transaction.phase = ABORT)
            .then(() => Promise.all(this.subordinates.map(sub => this._abort_sub(sub, transaction, delay, timeout))));
    }

    _abort_sub(sub, transaction, delay, timeout) {
        let attempt_n = 0;
        let attempt_abort = () =>
            this.is_active()
                .then(() => {
                    if (attempt_n > 0) {
                        return this._log(`${transaction.id}: retrying Abort on ${sub.id} (${attempt_n})`, delay);
                    }
                })
                .delay(delay)
                .then(() => sub.abort(transaction, delay))
                .timeout(timeout)
                .catch(Promise.TimeoutError, () => Promise.delay(Coordinator._exponential_backoff(++attempt_n)).then(() => attempt_abort()));
        return attempt_abort();
    }

    static _exponential_backoff(attempt) {
        return 500 * Math.pow(2, attempt);
    }

    is_active() {
        return new Promise(resolve => this.active && resolve());
    }
};
