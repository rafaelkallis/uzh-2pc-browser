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

    perform_transaction(transaction, delay, bugs) {
        this._prepare(transaction, delay, bugs)
            .catch(PrepareNoVoteError, SubordinateNotActiveError, err =>
                this._abort(transaction, delay, bugs)
                    .then(() => Promise.reject(err))
            )
            .then(() => this._commit(transaction, delay, bugs))
            .catch(PrepareNoVoteError, CoordinatorNotActiveError, SubordinateNotActiveError, this._ignore);
    }

    toggle() {
        if (this.active = !this.active) {
            Promise.all(Object.keys(this._pending_commit)
                .map(transaction_id => this._pending_commit[transaction_id])
                .map(transaction_info =>
                    this._log(`${transaction_info.transaction.id}: Recovering Commit`)
                        .then(() => this._commit(transaction_info.transaction, transaction_info.delay, transaction_info.bugs)))
            );

            Promise.all(Object.keys(this._pending_abort)
                .map(transaction_id => this._pending_abort[transaction_id])
                .map(transaction_info =>
                    this._log(`${transaction_info.transaction.id}: Recovering Abort`)
                        .then(() => this._abort(transaction_info.transaction, transaction_info.delay, transaction_info.bugs)))
            );
        }
        return this.active;
    }

    attach_subordinate(subordinate) {
        this.subordinates = this.subordinates.concat(subordinate);
    }

    _prepare(transaction, delay, bugs) {
        return this.is_active()
            .then(() => this._log(`${transaction.id}: Sending Prepare`, delay))
            .then(() => transaction.phase = PREPARE)
            .then(() => {
                let coord_crash_sending_idx = bugs.indexOf('coord-crash-prepare-sending');
                let coord_crash_sending = coord_crash_sending_idx != -1;
                if (coord_crash_sending) {
                    bugs.splice(coord_crash_sending_idx, 1);
                    setTimeout(() => this.active = false, delay * 0.5);
                }
            })
            .then(() => {
                let coord_crash_receiving_idx = bugs.indexOf('coord-crash-prepare-receiving');
                let coord_crash_receiving = coord_crash_receiving_idx != -1;
                if (coord_crash_receiving) {
                    bugs.splice(coord_crash_receiving_idx, 1);
                    setTimeout(() => this.active = false, delay * 1.5);
                }
            })
            .then(() => Promise.all(this.subordinates.map(sub =>
                this.is_active()
                    .then(() => {
                        let sub_crash_receiving_idx = bugs.indexOf('sub-crash-prepare-receiving');
                        let sub_crash_receiving = sub_crash_receiving_idx != -1;
                        if (sub_crash_receiving && Math.random() < 0.6) {
                            bugs.splice(sub_crash_receiving_idx, 1);
                            setTimeout(() => sub.active = false, delay * 0.5);
                        }
                    })
                    .then(() => {
                        let sub_crash_sending_idx = bugs.indexOf('sub-crash-prepare-sending');
                        let sub_crash_sending = sub_crash_sending_idx != -1;
                        if (sub_crash_sending && Math.random() < 0.6) {
                            bugs.splice(sub_crash_sending_idx, 1);
                            setTimeout(() => sub.active = false, delay * 1.5);
                        }
                    })
                    .delay(delay)
                    .then(() => this.is_active())
                    .then(() => sub.prepare(transaction, delay, bugs))
            )));
    }

    _commit(transaction, delay, bugs) {
        return this.is_active()
            .then(() => this._log(`${transaction.id}: Sending Commit`, delay))
            .then(() => transaction.phase = COMMIT)
            .then(() => this._pending_commit[transaction.id] = { transaction, delay, bugs })
            .then(() => {
                let coord_crash_sending_idx = bugs.indexOf('coord-crash-commit-sending');
                let coord_crash_sending = coord_crash_sending_idx != -1;
                if (coord_crash_sending) {
                    setTimeout(() => this.active = false, delay * 0.5);
                    bugs.splice(coord_crash_sending_idx, 1);
                }
            })
            .then(() => {
                let coord_crash_receiving_idx = bugs.indexOf('coord-crash-commit-receiving');
                let coord_crash_receiving = coord_crash_receiving_idx != -1;
                if (coord_crash_receiving) {
                    setTimeout(() => this.active = false, delay * 1.5);
                    bugs.splice(coord_crash_receiving_idx, 1);
                }
            })
            .then(() => Promise.all(this.subordinates.map(sub => this._commit_sub(sub, transaction, delay, bugs))))
            .then(() => this.is_active())
            .then(() => delete this._pending_commit[transaction.id])
            .then(() => this._log(`${transaction.id}: Completed`))
            .then(() => transaction.phase = "Finished");
    }

    _commit_sub(sub, transaction, delay, bugs) {
        let attempt_n = 0;
        let attempt_commit = () =>
            this.is_active()
                .then(() => {
                    if (attempt_n > 0) {
                        return this._log(`${transaction.id}: retrying Commit on ${sub.id} (${attempt_n} attempt)`, delay);
                    }
                })
                .then(() => {
                    let sub_crash_receiving_idx = bugs.indexOf('sub-crash-commit-receiving');
                    let sub_crash_receiving = sub_crash_receiving_idx != -1;
                    if (sub_crash_receiving && Math.random() < 0.6) {
                        bugs.splice(sub_crash_receiving_idx, 1);
                        setTimeout(() => sub.active = false, delay * 0.5);
                    }
                })
                .then(() => {
                    let sub_crash_sending_idx = bugs.indexOf('sub-crash-commit-sending');
                    let sub_crash_sending = sub_crash_sending_idx != -1;
                    if (sub_crash_sending && Math.random() < 0.6) {
                        bugs.splice(sub_crash_sending_idx, 1);
                        setTimeout(() => sub.active = false, delay * 1.5);
                    }
                })
                .delay(delay)
                .then(() => this.is_active())
                .then(() => sub.commit(transaction, delay, bugs))
                .catch(SubordinateNotActiveError, () => Promise.delay(Coordinator._exponential_backoff(++attempt_n)).then(() => attempt_commit()));

        return attempt_commit();
    }

    _abort(transaction, delay, bugs) {
        return this.is_active()
            .then(() => this._log(`${transaction.id}: Sending Abort`, delay))
            .then(() => transaction.phase = ABORT)
            .then(() => this._pending_abort[transaction.id] = { transaction, delay, bugs })
            .then(() => {
                let coord_crash_sending_idx = bugs.indexOf('coord-crash-abort-sending');
                let coord_crash_sending = coord_crash_sending_idx != -1;
                if (coord_crash_sending) {
                    setTimeout(() => this.active = false, delay * 0.5);
                    bugs.splice(coord_crash_sending_idx, 1);
                }
            })
            .then(() => {
                let coord_crash_receiving_idx = bugs.indexOf('coord-crash-abort-receiving');
                let coord_crash_receiving = coord_crash_receiving_idx != -1;
                if (coord_crash_receiving) {
                    setTimeout(() => this.active = false, delay * 1.5);
                    bugs.splice(coord_crash_receiving_idx, 1);
                }
            })
            .then(() => Promise.all(this.subordinates.map(sub => this._abort_sub(sub, transaction, delay, bugs))))
            .then(() => this.is_active())
            .then(() => delete this._pending_abort[transaction.id])
            .then(() => this._log(`${transaction.id}: Completed`))
            .then(() => transaction.phase = "Aborted");
    }

    _abort_sub(sub, transaction, delay, bugs) {
        let attempt_n = 0;
        let attempt_abort = () =>
            this.is_active()
                .then(() => {
                    if (attempt_n > 0) {
                        return this._log(`${transaction.id}: retrying Abort on ${sub.id} (${attempt_n})`, delay);
                    }
                })
                .then(() => {
                    let sub_crash_receiving_idx = bugs.indexOf('sub-crash-abort-receiving');
                    let sub_crash_receiving = sub_crash_receiving_idx != -1;
                    if (sub_crash_receiving && Math.random() < 0.6) {
                        bugs.splice(sub_crash_receiving_idx, 1);
                        setTimeout(() => sub.active = false, delay * 0.5);
                    }
                })
                .then(() => {
                    let sub_crash_sending_idx = bugs.indexOf('sub-crash-abort-sending');
                    let sub_crash_sending = sub_crash_sending_idx != -1;
                    if (sub_crash_sending && Math.random() < 0.6) {
                        bugs.splice(sub_crash_sending_idx, 1);
                        setTimeout(() => sub.active = false, delay * 1.5);
                    }
                })
                .delay(delay)
                .then(() => this.is_active())
                .then(() => sub.abort(transaction, delay, bugs))
                .catch(SubordinateNotActiveError, () => Promise.delay(Coordinator._exponential_backoff(++attempt_n)).then(() => attempt_abort()));
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