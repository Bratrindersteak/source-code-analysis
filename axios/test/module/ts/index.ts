import assert from 'assert';
import axios, {CanceledError, AxiosError, AxiosHeaders, formToJSON, spread, isAxiosError, isCancel, all, toFormData} from 'axios';

assert.strictEqual(typeof axios, 'function');

assert.strictEqual(typeof CanceledError, 'function');
assert.strictEqual(typeof AxiosError, 'function');
assert.strictEqual(typeof AxiosHeaders, 'function');
assert.strictEqual(typeof formToJSON, 'function');
assert.strictEqual(typeof spread, 'function');
assert.strictEqual(typeof isAxiosError, 'function');
assert.strictEqual(typeof isCancel, 'function');
assert.strictEqual(typeof all, 'function');
assert.strictEqual(typeof toFormData, 'function');

assert.strictEqual(typeof axios.CanceledError, 'function');
assert.strictEqual(typeof axios.AxiosError, 'function');
assert.strictEqual(typeof axios.AxiosHeaders, 'function');
assert.strictEqual(typeof axios.formToJSON, 'function');
assert.strictEqual(typeof axios.spread, 'function');
assert.strictEqual(typeof axios.isAxiosError, 'function');
assert.strictEqual(typeof axios.isCancel, 'function');
assert.strictEqual(typeof axios.all, 'function');
assert.strictEqual(typeof axios.toFormData, 'function');
