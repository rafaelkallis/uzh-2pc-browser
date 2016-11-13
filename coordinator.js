/**
 * Created by rafaelkallis on 03.11.16.
 */
import { Promise } from 'bluebird';
import { Observable } from './observable';
import { PREPARE, COMMIT, ABORT, FAIL, SUCCESS } from './constants';
import { PrepareNoVoteError, CoordinatorNotActiveError, SubordinateNotActiveError } from './errors';

export class Coordinator extends Observable {
    constructor() {
        super();
        this._active = true;
        this._subordinates = [];
        this._log_listeners = [];
        this._pending_abort = {};
        this._pending_commit = {};
    }

    get active() {
        return this._active;
    }

    set active(active) {
        if (this.active !== active) {
            this._active = active;
            this._log(active ? "Online" : "Offline");
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
        this._log_listeners.forEach(log_listener => log_listener(entry, duration));
        return Promise.resolve();
    }

    perform_transaction(transaction, delay, timeout, bugs) {
        this._prepare(transaction, delay, timeout, bugs)
            .catch(PrepareNoVoteError, SubordinateNotActiveError, err =>
                this._abort(transaction, delay, timeout, bugs)
                    .then(() => Promise.reject(err))
            )
            .then(() => this._commit(transaction, delay, timeout, bugs))
            .catch(PrepareNoVoteError, CoordinatorNotActiveError, SubordinateNotActiveError, this._ignore);
    }

    toggle() {
        if (this.active = !this.active) {
            Promise.all(Object.keys(this._pending_commit)
                .map(transaction_id => this._pending_commit[transaction_id])
                .map(transaction_info =>
                    this._log(`${transaction_info.transaction.id}: Recovering Commit`)
                        .then(() => this._commit(transaction_info.transaction, transaction_info.delay, transaction_info.timeout)))
            );

            Promise.all(Object.keys(this._pending_abort)
                .map(transaction_id => this._pending_abort[transaction_id])
                .map(transaction_info =>
                    this._log(`${transaction_info.transaction.id}: Recovering Abort`)
                        .then(() => this._abort(transaction_info.transaction, transaction_info.delay, transaction_info.timeout)))
            );
        }
        return this.active;
    }

    attach_subordinate(subordinate) {
        this.subordinates = this.subordinates.concat(subordinate);
    }

    _prepare(transaction, delay, timeout, bugs) {
        let crash_sub = bugs.includes('sub-crash-prepare-receiving');

        return this.is_active()
            .then(() => this._log(`${transaction.id}: Sending Prepare`, delay))
            .then(() => transaction.phase = PREPARE)
            .then(() => Promise.all(this.subordinates.map(sub =>
                new Promise(resolve => {
                    if (crash_sub && Math.random() < 0.33) {
                        setTimeout(() => sub.active = false, delay * 0.5);
                    }
                    resolve();
                })
                    .then(() => this.is_active())
                    .delay(delay)
                    .then(() => this.is_active())
                    .then(() => sub.prepare(transaction, delay, bugs))
                    .timeout(timeout) //
            )));
    }

    _commit(transaction, delay, timeout, bugs) {
        return this.is_active()
            .then(() => this._log(`${transaction.id}: Sending Commit`, delay))
            .then(() => transaction.phase = COMMIT)
            .then(() => this._pending_commit[transaction.id] = { transaction, delay, timeout })
            .then(() => Promise.all(this.subordinates.map(sub => this._commit_sub(sub, transaction, delay, timeout, bugs))))
            .then(() => this.is_active())
            .then(() => delete this._pending_commit[transaction.id])
            .then(() => this._log(`${transaction.id}: Completed`))
            .then(() => transaction.phase = "Finished");
    }

    _commit_sub(sub, transaction, delay, timeout, bugs) {
        let crash_sub = bugs.includes('sub-crash-commit-receiving') && Math.random() < 0.33;

        let attempt_n = 0;
        let attempt_commit = () =>
            this.is_active()
                .then(() => {
                    if (attempt_n > 0) {
                        return this._log(`${transaction.id}: retrying Commit on ${sub.id} (${attempt_n} attempt)`, delay);
                    } else if (crash_sub) {
                        setTimeout(() => sub.active = false, delay * 0.5);
                    }
                })
                .then(() => sub.is_active())
                .delay(delay)
                .then(() => this.is_active())
                .then(() => sub.commit(transaction, delay, bugs))
                .timeout(timeout) //
                .catch(Promise.TimeoutError, SubordinateNotActiveError, () => Promise.delay(Coordinator._exponential_backoff(++attempt_n)).then(() => attempt_commit()));

        return attempt_commit();
    }

    _abort(transaction, delay, timeout, bugs) {
        return this.is_active()
            .then(() => this._log(`${transaction.id}: Sending Abort`, delay))
            .then(() => transaction.phase = ABORT)
            .then(() => this._pending_abort[transaction.id] = { transaction, delay, timeout })
            .then(() => Promise.all(this.subordinates.map(sub => this._abort_sub(sub, transaction, delay, timeout, bugs))))
            .then(() => delete this._pending_abort[transaction.id])
            .then(() => this._log(`${transaction.id}: Completed`))
            .then(() => transaction.phase = "Aborted");
    }

    _abort_sub(sub, transaction, delay, timeout, bugs) {
        let crash_sub = bugs.includes('sub-crash-abort-receiving') && Math.random() < 0.33;

        let attempt_n = 0;
        let attempt_abort = () =>
            this.is_active()
                .then(() => {
                    if (attempt_n > 0) {
                        return this._log(`${transaction.id}: retrying Abort on ${sub.id} (${attempt_n})`, delay);
                    } else if (crash_sub) {
                        setTimeout(() => sub.active = false, delay * 0.5);
                    }
                })
                .then(() => sub.is_active())
                .delay(delay)
                .then(() => this.is_active())
                .then(() => sub.abort(transaction, delay, bugs))
                .timeout(timeout) //
                .catch(Promise.TimeoutError, SubordinateNotActiveError, () => Promise.delay(Coordinator._exponential_backoff(++attempt_n)).then(() => attempt_abort()));
        return attempt_abort();
    }

    static _exponential_backoff(attempt) {
        return 500 * Math.pow(2, attempt);
    }

    is_active() {
        return this.active ? Promise.resolve() : Promise.reject(new CoordinatorNotActiveError());
    }

    _ignore(err) {
        return Promise.resolve();
    }
};
