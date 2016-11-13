/**
 * Created by rafaelkallis on 03.11.16.
 */
import { PREPARE, COMMIT, ABORT, YES, NO, ACK, TIMEOUT, BUG_NO, BUG_TIMEOUT } from './constants';
import { PrepareNoVoteError, SubordinateNotActiveError } from './errors';
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
            this._log(this.active ? "Online" : "Offline");
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
        return this.active ? Promise.resolve() : Promise.reject(new SubordinateNotActiveError());
    }

    prepare(transaction, delay, bugs) {
        let vote_no = bugs.includes('sub-vote-no') && Math.random() < 0.33;
        let crash = bugs.includes('sub-crash-prepare-sending') && Math.random() < 0.33;

        return this.is_active()
            .then(() => {
                if (!vote_no) {
                    return this._log(`${transaction.id}: YES`, delay)
                } else {
                    return this._log(`${transaction.id}: NO`, delay)
                }
            })
            .then(() => {
                if (crash) {
                    setTimeout(() => this.active = false, delay * 0.6);
                }
            })
            .delay(delay)
            .then(() => this.is_active())
            .then(() => {
                if (!vote_no) {
                    return Promise.resolve();
                } else {
                    return Promise.reject(new PrepareNoVoteError());
                }
            });
    }

    commit(transaction, delay, bugs) {
        let crash = bugs.includes('sub-crash-commit-sending') && Math.random() < 0.33;

        return this.is_active()
            .then(() => this._log(`${transaction.id}: ACK`, delay))
            .then(() => {
                if (crash) {
                    setTimeout(() => this.active = false, delay * 0.5);
                }
            })
            .delay(delay)
            .then(() => this.is_active());
    }

    abort(transaction, delay, bugs) {
        let crash = bugs.includes('sub-crash-abort-sending') && Math.random() < 0.33;

        return this.is_active()
            .then(() => this._log(`${transaction.id}: ACK`, delay))
            .then(() => {
                if (crash) {
                    setTimeout(() => this.active = false, delay * 0.5);
                }
            })
            .delay(delay)
            .then(() => this.is_active());

    }
}