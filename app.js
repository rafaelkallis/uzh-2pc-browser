/**
 * Created by rafaelkallis on 07.11.16.
 */
import { Promise } from 'bluebird';
import { Coordinator } from './coordinator';
import { Subordinate } from './subordinate';
import { Transaction } from './transaction';
import { PrepareNoVoteError, NotActiveError } from './errors';
import { Notification } from './notification';
import { Explosion } from './explosion';


let sub1 = new Subordinate(1);
let sub2 = new Subordinate(2);
let sub3 = new Subordinate(3);

let coordinator = new Coordinator();

coordinator.attach_subordinate(sub1);
coordinator.attach_subordinate(sub2);
coordinator.attach_subordinate(sub3);

function start_transaction(bugs) {
    let delay = document.getElementById('duration-input').value;
    let timeout = document.getElementById('timeout-input').value;
    let transaction = new Transaction('some_payload');
    let notification = null;
    let log = document.getElementById('transaction-log');

    transaction.observe(transaction => {
        if (!notification) {
            notification = new Notification(`${transaction.id}: ${transaction.phase}`);
            log.appendChild(notification.element);
            log.scrollTop = log.scrollHeight;
        } else {
            notification.text = `${transaction.id}: ${transaction.phase}`;
        }
    });

    coordinator.perform_transaction(transaction, delay, timeout, bugs);
}

function ready(fn) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

function bind_log_updater(log_id, active_observable) {
    active_observable.listen((log_entry, duration) => {
        let log = document.getElementById(log_id);
        let notification = new Notification(log_entry, duration);
        log.appendChild(notification.element);
        log.scrollTop = log.scrollHeight;
        active_observable.observe(active_observable => !active_observable.active && notification.stop_progress());
    });
}

ready(() => {
    document.getElementById('start-transaction-button').addEventListener('click', () => {
        let bugs = [];
        document.getElementById('sub-vote-no').checked && bugs.push('sub-vote-no');
        document.getElementById('sub-crash-prepare-receiving').checked && bugs.push('sub-crash-prepare-receiving');
        document.getElementById('sub-crash-prepare-sending').checked && bugs.push('sub-crash-prepare-sending');
        document.getElementById('sub-crash-commit-receiving').checked && bugs.push('sub-crash-commit-receiving');
        document.getElementById('sub-crash-commit-sending').checked && bugs.push('sub-crash-commit-sending');
        document.getElementById('sub-crash-abort-receiving').checked && bugs.push('sub-crash-abort-receiving');
        document.getElementById('sub-crash-abort-sending').checked && bugs.push('sub-crash-abort-sending');
        document.getElementById('coord-crash-prepare').checked && bugs.push('coord-crash-prepare');
        document.getElementById('coord-crash-commit').checked && bugs.push('coord-crash-commit');
        document.getElementById('coord-crash-abort').checked && bugs.push('coord-crash-abort');
        start_transaction(bugs);
    });

    let timeout_value = document.getElementById('timeout-value');
    let timeout_slider = document.getElementById('timeout-input');
    timeout_slider.addEventListener('change', () => timeout_value.innerText = timeout_slider.value);

    let delay_value = document.getElementById('duration-value');
    let delay_slider = document.getElementById('duration-input');
    delay_slider.addEventListener('change', () => {
        delay_value.innerText = delay_slider.value;
        timeout_value.innerText = delay_slider.value * 2 + 500;
        timeout_slider.value = delay_slider.value * 2 + 500;
    });

    bind_log_updater('coordinator-log', coordinator);
    bind_log_updater('subordinate1-log', sub1);
    bind_log_updater('subordinate2-log', sub2);
    bind_log_updater('subordinate3-log', sub3);

    let coordinator_active_button = document.getElementById('coordinator-active-button');
    let sub1_active_button = document.getElementById('subordinate1-active-button');
    let sub2_active_button = document.getElementById('subordinate2-active-button');
    let sub3_active_button = document.getElementById('subordinate3-active-button');

    coordinator_active_button.addEventListener('click', () => {
        coordinator.toggle();
    });
    sub1_active_button.addEventListener('click', () => {
        sub1.toggle();
    });
    sub2_active_button.addEventListener('click', () => {
        sub2.toggle();
    });
    sub3_active_button.addEventListener('click', () => {
        sub3.toggle();
    });

    let coordinator_explosion = new Explosion(document.getElementById('coordinator-explosion'));
    let subordinate1_explosion = new Explosion(document.getElementById('subordinate1-explosion'));
    let subordinate2_explosion = new Explosion(document.getElementById('subordinate2-explosion'));
    let subordinate3_explosion = new Explosion(document.getElementById('subordinate3-explosion'));

    coordinator.observe(coordinator => !coordinator.active && coordinator_explosion.boom() || coordinator_active_button.classList.toggle('button-outline'));
    sub1.observe(sub1 => !sub1.active && subordinate1_explosion.boom() || sub1_active_button.classList.toggle('button-outline'));
    sub2.observe(sub2 => !sub2.active && subordinate2_explosion.boom() || sub2_active_button.classList.toggle('button-outline'));
    sub3.observe(sub3 => !sub3.active && subordinate3_explosion.boom() || sub3_active_button.classList.toggle('button-outline'));
});