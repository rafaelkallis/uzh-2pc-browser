/**
 * Created by rafaelkallis on 07.11.16.
 */
import { Promise } from 'bluebird';
import { Coordinator } from './coordinator';
import { Subordinate } from './subordinate';
import { Transaction } from './transaction';
import { PrepareNoVoteError } from './errors';
import { Notification } from './notification';


let sub1 = new Subordinate(1);
let sub2 = new Subordinate(2);
let sub3 = new Subordinate(3);

let coordinator = new Coordinator();

coordinator.attach_subordinate(sub1);
coordinator.attach_subordinate(sub2);
coordinator.attach_subordinate(sub3);

function start_transaction() {
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

    coordinator.perform_transaction(transaction, delay, timeout);
}

function ready(fn) {
    if (document.readyState != 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

function log_updater(log_id) {
    return (log_entry, duration) => {
        let log = document.getElementById(log_id);
        log.appendChild(new Notification(log_entry, duration).element);
        log.scrollTop = log.scrollHeight;
    }
}

ready(() => {
    document.getElementById('start-transaction-button').addEventListener('click', start_transaction);

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

    coordinator.listen(log_updater('coordinator-log'));
    sub1.listen(log_updater('subordinate1-log'));
    sub2.listen(log_updater('subordinate2-log'));
    sub3.listen(log_updater('subordinate3-log'));

    let coordinator_active_button = document.getElementById('coordinator-active-button');
    let sub1_active_button = document.getElementById('subordinate1-active-button');
    let sub2_active_button = document.getElementById('subordinate2-active-button');
    let sub3_active_button = document.getElementById('subordinate3-active-button');

    coordinator_active_button.addEventListener('click', () => {
        coordinator_active_button.classList.toggle('button-outline');
        coordinator.toggle();
    });
    sub1_active_button.addEventListener('click', () => {
        sub1_active_button.classList.toggle('button-outline');
        sub1.toggle();
    });
    sub2_active_button.addEventListener('click', () => {
        sub2_active_button.classList.toggle('button-outline');
        sub2.toggle();
    });
    sub3_active_button.addEventListener('click', () => {
        sub3_active_button.classList.toggle('button-outline');
        sub3.toggle();
    });
});


