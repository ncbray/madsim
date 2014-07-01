// Copyright 2014 Nicholas Bray

"use strict";

function canPayCost(state, config) {
    for (var i in config) {
	var cost = config[i];
	if (resourceAmount(state, cost["resource"]) < cost["amount"]) {
	    return false;
	}
    }
    return true;
} 

function payCost(state, config) {
    for (var i in config) {
	var cost = config[i];
	adjustResource(state, cost["resource"], -cost["amount"]);
    }
}

function canPerform(state, config) {
    return canPayCost(state, config.uses) && config.id in actions;
}

function performAction(view, state, config) {
    if (canPerform(state, config)) {
	var impl = actions[config.id];
	payCost(state, config.uses);
	impl.perform(view, state);
    }
}

var actions = {
    "build_reactor": {
	perform: function(view, state) {
	    adjustResource(state, "reactors", 1);
	    view.log("Built reactor.");
	}
    },
    "build_converter": {
	perform: function(view, state) {
	    adjustResource(state, "converters", 1);
	    view.log("Built converter.");
	}
    },
    "build_battery": {
	perform: function(view, state) {
	    adjustResource(state, "batteries", 1);
	    view.log("Built battery.");
	}
    },
    "build_storage": {
	perform: function(view, state) {
	    adjustResource(state, "storage", 1);
	    view.log("Built storage.");
	}
    },
    "build_robot": {
	perform: function(view, state) {
	    adjustResource(state, "robots", 1);
	    view.log("Built robot.");
	}
    }
};

function resourceSanity(state, id) {
    if (!(id in state.resources)) throw "Unknown resource " + id;
}

function resourceAmount(state, id) {
    resourceSanity(state, id);
    return state.resources[id]|0;
};

function canMoveResource(state, srcId, dstId) {
    resourceSanity(state, srcId);
    resourceSanity(state, dstId);
    var cap = state.capacity[dstId];
    return state.resources[srcId] >= 1 && (cap === undefined || state.resources[dstId] + 1 < cap)
}

function moveResource(state, srcId, dstId) {
    resourceSanity(state, srcId);
    resourceSanity(state, dstId);
    if (canMoveResource(state, srcId, dstId)) {
	state.resources[srcId] -= 1;
	state.resources[dstId] += 1;
	return true;
    } else {
	return false;
    }
}

function adjustResource(state, id, amt) {
    resourceSanity(state, id);
    accumulateResource(state, id, amt);
    return !capResource(state, id);
}

function accumulateResource(state, id, amt) {
    resourceSanity(state, id);
    state.resources[id] += amt;
}

function capResource(state, id) {
    var capped = false;
    resourceSanity(state, id);
    var updated = state.resources[id];
    if (updated < 0) {
	updated = 0;
	capped = true;
    }
    if (id in state.capacity) {
	var cap = state.capacity[id];
	if (updated > cap) {
	    updated = cap;
	    capped = true;
	}
    }
    state.resources[id] = updated;
    return capped;
}

var syncCapacity = function(state) {
    var config = state.config;
    for (var i in config["resources"]) {
	var r = config["resources"][i];
	if ("capacity" in r) {
	    var capacity = r.capacity;
	    if ("capacity_scale" in r) {
		for (var j in r["capacity_scale"]) {
		    var term = r["capacity_scale"][j];
		    capacity += resourceAmount(state, term["resource"]) * term["amount"];
		}
	    }
	    state.capacity[r.id] = capacity;
	}
    }
};

function randomIndex(l) {
    return (Math.random() * l.length)|0;
}

function destroyResource(state, targets, destroyed) {
    var index = randomIndex(targets);
    var target = targets[index];
    if (resourceAmount(state, target) >= 1) {
	adjustResource(state, target, -1);
	destroyed[index] += 1;
	return 1;
    } else {
	return 0;
    }
}

function doEvents(view, state, dt) {
    state.lastEvent += dt;
    var p = state.lastEvent / (state.lastEvent + 100);
    var tp = 1 - Math.pow(1 - p, dt);
    if (Math.random() < tp) {

	var wargs = 2;

	var robots = resourceAmount(state, "defense");
	var pDefend = (robots / wargs) / 5;
	

	var targets = ["reactors", "converters", "batteries", "storage", "robots"];
	var destroyed = [0, 0, 0, 0, 0];
	var destroyedCount = 0;

	for (var w = 0; w < wargs; w++) {
	    // Kill
	    if (Math.random() < pDefend) {
		adjustResource(state, "corpses", 1);
		continue;
	    }

	    // Miss
	    if (Math.random() < 0.2) {
		continue;
	    }

	    destroyedCount += destroyResource(state, targets, destroyed);
	}

	if (destroyedCount) {
	    var destroyedText = "";
	    for (var i in targets) {
		if (destroyed[i] > 0) {
		    if (destroyedText) {
			destroyedText += ", ";
		    }
		    destroyedText += destroyed[i] + " " + targets[i];
		}
	    }
	    view.log("Wargs attack and destroy " + destroyedText + ".");
	} else {
	    view.log("Wargs attack, but destroy nothing.");
	}
	state.lastEvent = 0;
    }
}

function resourceTick(state) {
    adjustResource(state, "inspiration", 1);
    accumulateResource(state, "energy", resourceAmount(state, "reactors"));
    accumulateResource(state, "mass", resourceAmount(state, "mining"));

    var input = Math.min(resourceAmount(state, "converters")*10, resourceAmount(state, "energy"));
    var output = input * 0.1;
    var cap = Math.max(0, state.capacity["mass"] - resourceAmount(state, "mass"));
    if (cap < output) {
	output =  cap;
	input = cap * 10;
    }
    adjustResource(state, "energy", -input);
    adjustResource(state, "mass", output);

    capResource(state, "energy");
    capResource(state, "mass");
}


var MadSim = function(config) {
    var state = {
	resources: {},
	capacity: {},
	lastEvent: 0
    };
    state.config = config;

    var view = new madview.MadSimView();

    for (var i in config["resources"]) {
	var r = config["resources"][i];
	state.resources[r.id] = r.initial | 0;
	view.makeResource(state, r);
    }

    for (var i in config["actions"]) {
	view.makeAction(config["actions"][i], state);
    }

    syncCapacity(state);
    view.sync(state);

    var timeAccum = 0;
    var tickLength = 0.1;

    this.runner = new GameRunner();
    this.runner.onFrame(function(dt) {
	timeAccum += dt;
	var ticks = (timeAccum / tickLength)|0;
	timeAccum -= ticks * tickLength;

	for (var i = 0; i < ticks; i++) {
	    syncCapacity(state);
	    resourceTick(state);
	    doEvents(view, state, tickLength);
	}

	if (ticks) {
	    view.sync(state);
	}
    }).requestFrame();
};

MadSim.prototype.frame = function(dt) {
    var state = this.state;

};

function loadJSON(url, callback) {
    var oReq = new XMLHttpRequest();
    oReq.onload = function () {
	callback(JSON.parse(this.responseText));
    };
    oReq.open("get", "config.json", true);
    oReq.send();
}
