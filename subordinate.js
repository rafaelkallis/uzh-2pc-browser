/**
 * Created by rafaelkallis on 03.11.16.
 */
import { PREPARE, COMMIT, ABORT, YES, NO, ACK, TIMEOUT, BUG_NO, BUG_TIMEOUT } from './constants';
import { PrepareNoVoteError } from './errors';
import { Observable } from './observable';
import { Promise } from 'bluebird';

export class Subordinate extends Observable {
    constructor(id) {
        super();
        this._id = id;
        this._active = true;
        this._log_listeners = [];
    }

    get active() {
        return this._active;
    }

    set active(active) {
        if (this.active !== active) {
            this._active = active;
            this._notify();
            this._log(this.active ? "Turned On" : "Turned Off");
        }
    }

    get id() {
        return this._id;
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

    toggle() {
        this.active = !this.active;
    }

    is_active() {
        return new Promise((resolve, reject) => this.active && resolve());
    }

    prepare(transaction, delay) {
        return this.is_active()
            .then(() => {
                if (true) {
                    return this._log(`${transaction.id}: YES`, delay)
                        .delay(delay);
                } else {
                    return this._log(`${transaction.id}: NO`, delay)
                        .delay(delay)
                        .then(() => Promise.reject(new PrepareNoVoteError()));
                }
            });
    }

    commit(transaction, delay) {
        return this.is_active()
            .then(() => this._log(`${transaction.id}: ACK`, delay))
            .delay(delay);
    }

    abort(transaction, delay) {
        return this.is_active()
            .then(() => this._log(`${transaction.id}: ACK`, delay))
            .delay(delay);

    }
}