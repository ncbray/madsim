"use strict";

function testState() {
    return {
	resources: {"foo": 1},
	capacity: {"foo": 2}
    };
}

QUnit.test("add resources", function(assert) {
    var state = testState();
    assert.strictEqual(adjustResource(state, "foo", 1), true);
    assert.strictEqual(resourceAmount(state, "foo"), 2);
});

QUnit.test("remove resources", function(assert) {
    var state = testState();
    assert.strictEqual(adjustResource(state, "foo", -1), true);
    assert.strictEqual(resourceAmount(state, "foo"), 0);
});

QUnit.test("negative resources", function(assert) {
    var state = testState();
    assert.strictEqual(adjustResource(state, "foo", -2), false);
    assert.strictEqual(resourceAmount(state, "foo"), 0);
});

QUnit.test("overflow resources", function(assert) {
    var state = testState();
    assert.strictEqual(adjustResource(state, "foo", 2), false);
    assert.strictEqual(resourceAmount(state, "foo"), 2);
});

QUnit.test("destroy resource", function(assert) {
    var state = testState();
    var targets = ["foo"];
    var destroyed = [0];

    assert.strictEqual(destroyResource(state, targets, destroyed), 1);
    assert.strictEqual(destroyed[0], 1);
    assert.strictEqual(resourceAmount(state, "foo"), 0);

    assert.strictEqual(destroyResource(state, targets, destroyed), 0);
    assert.strictEqual(destroyed[0], 1);
    assert.strictEqual(resourceAmount(state, "foo"), 0);
});


QUnit.test("resource tick", function(assert) {
    var state = {
	resources: {
	    "inspiration": 0,
	    "energy": 0,
	    "mass": 0,
	    "mining": 1,
	    "reactors": 15,
	    "converters": 1,
	},
	capacity: {
	    "energy": 10,
	    "mass": 10
	},
    };
    resourceTick(state);
    assert.strictEqual(resourceAmount(state, "inspiration"), 1);
    assert.strictEqual(resourceAmount(state, "energy"), 5);
    assert.strictEqual(resourceAmount(state, "mass"), 2);
});
