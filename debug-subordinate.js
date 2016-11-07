/**
 * Created by rafaelkallis on 03.11.16.
 */
const Subordinate = require('./subordinate');

let sub = new Subordinate(process.env.ID, 'http://localhost:8080');

sub.start();

setTimeout(() => sub.stop(), 5000);