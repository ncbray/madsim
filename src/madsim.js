// Copyright 2014 Nicholas Bray

"use strict";

var StatusBar = function() {
    this.bg = document.createElement("span");
    this.bg.className = "statusbar";
    this.fg = document.createElement("span");
    this.fg.className = "statusbarinner";
    this.bg.appendChild(this.fg);


    this.old = 0;
    this.fg.style.width = 0;
};

StatusBar.prototype.attach = function(parent) {
    parent.appendChild(this.bg);
};

StatusBar.prototype.update = function(amt) {
    var current = (amt * 100)|0;
    if (current != this.old) {
	this.old = current;
	this.fg.style.width = current + "%";
    }
};


var ResourceView = function(state, config) {
    this.config = config;

    this.amount = 0;

    this.wigit = document.createElement("div");

    this.nameElement = document.createElement("span");
    this.nameElement.className = "name";
    this.nameElement.innerText = this.config["name"];
    this.wigit.appendChild(this.nameElement);

    this.amountElement = document.createElement("span");
    this.amountElement.className = "number";
    this.amountElement.innerText = this.amount;
    this.wigit.appendChild(this.amountElement);

    var showInfo = function() {
	state.view.showResourceInfo(config);
    };
    this.wigit.addEventListener("mouseenter", showInfo);
    this.wigit.addEventListener("mousedown", showInfo);

    if ("capacity" in config) {
	this.status = new StatusBar();
	this.status.attach(this.wigit);
    }

    var area = document.getElementById("uiarea");
    area.appendChild(this.wigit);
};

ResourceView.prototype.sync = function(state) {
    var current = resourceAmount(state, this.config["id"]);
    if (current != this.amount) {
	this.amount = current;

	this.amountElement.innerText = current;
    }

    if (this.status) {
	var cap = state.capacity[this.config["id"]];
	this.status.update(current / cap);
    }
};


var MadSimView = function() {
    this.resourceInfo = document.createElement("div");
};

MadSimView.prototype.showResourceInfo = function(config) {
    this.resourceInfo.innerText = config["name"] + ": " + config["info"];
    this.showInfo(this.resourceInfo);
};

MadSimView.prototype.showActionInfo = function(config) {
    var costs = [];
    for (var i in config.uses) {
	var cost = config.uses[i];
	costs.push(cost["amount"] + " " + cost["resource"]);
    }


    this.resourceInfo.innerText = config["name"] + ": " + costs.join(", ");
    this.showInfo(this.resourceInfo);
};

MadSimView.prototype.showInfo = function(e) {
    var area = document.getElementById("infoarea");
    area.innerHTML = "";
    area.appendChild(e);
};

MadSimView.prototype.log = function(message) {
    var div = document.createElement("div");
    div.innerText = message;

    var area = document.getElementById("logarea");
    area.appendChild(div);

    while (area.children.length > 40) {
	area.removeChild(area.firstChild);
    }
    area.scrollTop = Math.max(area.scrollHeight - area.clientHeight, 0);
};


var ActionView = function(config, state) {
    this.config = config

    this.wigit = document.createElement("a");
    this.wigit.className = "action";
    this.wigit.innerText = config.name;

    var showInfo = function() {
	state.view.showActionInfo(config);
    };
    this.wigit.addEventListener("mouseenter", showInfo);
    this.wigit.addEventListener("mousedown", showInfo);


    this.wigit.onclick = function() {
	performAction(state, config);
    }

    var area = document.getElementById("uiarea");
    area.appendChild(this.wigit);
};

ActionView.prototype.sync = function(state) {
    if (canPerform(state, this.config)) {
	this.wigit.className = "action";
    } else {
	this.wigit.className = "action disabled";
    }
};

function canPerform(state, config) {
    for (var i in config.uses) {
	var cost = config.uses[i];
	if (resourceAmount(state, cost["resource"]) < cost["amount"]) {
	    return false;
	}
    }
    return config.id in actions;
}

function payCost(state, config) {
    for (var i in config.uses) {
	var cost = config.uses[i];
	adjustResource(state, cost["resource"], -cost["amount"]);
    }
}

function performAction(state, config) {
    if (canPerform(state, config)) {
	var impl = actions[config.id];
	payCost(state, config);
	impl.perform(state);
    }
}

var actions = {
    "build_reactor": {
	perform: function(state) {
	    adjustResource(state, "reactors", 1);
	    state.view.log("Built reactor.");
	}
    },
    "build_converter": {
	perform: function(state) {
	    adjustResource(state, "converters", 1);
	    state.view.log("Built converter.");
	}
    },
    "build_battery": {
	perform: function(state) {
	    adjustResource(state, "batteries", 1);
	    state.view.log("Built battery.");
	}
    },
    "build_storage": {
	perform: function(state) {
	    adjustResource(state, "storage", 1);
	    state.view.log("Built storage.");
	}
    },
    "build_robot": {
	perform: function(state) {
	    adjustResource(state, "robots", 1);
	    state.view.log("Built robot.");
	}
    }
};

var MadSim = function(config) {
    var state = this;
    this.runner = new GameRunner();
    this.runner.onFrame(function(dt) {
	state.frame(dt);
    }).requestFrame();

    this.config = config;
    this.timeAccum = 0;
    this.tickLength = 0.1;

    this.view = new MadSimView();

    this.resources = {};
    this.capacity = {};
    this.views = [];
    this.actions = [];

    for (var i in config["resources"]) {
	var r = config["resources"][i];
	this.resources[r.id] = r.initial | 0;
	this.views.push(new ResourceView(this, r));
    }

    for (var i in config["actions"]) {
	this.actions.push(new ActionView(config["actions"][i], state));
    }

    this.lastEvent = 0;

    this.syncCapacity();
    this.sync();
};

function resourceAmount(state, id) {
    return state.resources[id]|0;
};

function adjustResource(state, id, amt) {
    accumulateResource(state, id, amt);
    capResource(state, id);
}

function accumulateResource(state, id, amt) {
    state.resources[id] += amt;
}

function capResource(state, id) {
    var updated = state.resources[id];
    if (updated < 0) {
	updated = 0;
    }
    if (id in state.capacity) {
	var cap = state.capacity[id];
	if (updated > cap) {
	    updated = cap;
	}
    }
    state.resources[id] = updated;
}


MadSim.prototype.sync = function() {
    for (var i in this.actions) {
	this.actions[i].sync(this);
    }
    for (var i in this.views) {
	this.views[i].sync(this);
    }
};

MadSim.prototype.syncCapacity = function() {
    var config = this.config;
    for (var i in config["resources"]) {
	var r = config["resources"][i];
	if ("capacity" in r) {
	    var capacity = r.capacity;
	    if ("capacity_scale" in r) {
		for (var j in r["capacity_scale"]) {
		    var term = r["capacity_scale"][j];
		    capacity += resourceAmount(this, term["resource"]) * term["amount"];
		}
	    }
	    this.capacity[r.id] = capacity;
	}
    }
};

function randomIndex(l) {
    return (Math.random() * l.length)|0;
}

function doEvents(state) {
    state.lastEvent += state.tickLength;
    var p = state.lastEvent / (state.lastEvent + 100);
    var tp = 1 - Math.pow(1 - p, state.tickLength);
    if (Math.random() < tp) {

	var wargs = 2;

	var robots = resourceAmount(state, "robots");
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

	    var index = randomIndex(targets);
	    var target = targets[index];
	    if (resourceAmount(state, target) >= 1) {
		adjustResource(state, target, -1);
		destroyed[index] += 1;
		destroyedCount += 1;
	    }
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
	    state.view.log("Wargs attack and destroy " + destroyedText + ".");
	} else {
	    state.view.log("Wargs attack, but destroy nothing.");
	}
	state.lastEvent = 0;
    }
}

MadSim.prototype.frame = function(dt) {
    var state = this;

    this.timeAccum += dt;
    var updated = false;

    while (this.timeAccum > this.tickLength) {
	this.timeAccum -= this.tickLength;
	updated = true;

	this.syncCapacity();

	adjustResource(state, "inspiration", 1);
	accumulateResource(state, "energy", resourceAmount(state, "reactors"));

	var input = Math.min(resourceAmount(state, "converters")*10, resourceAmount(state, "energy"));
	var output = input * 0.1;
	var cap = state.capacity["mass"] - resourceAmount(state, "mass");
	if (cap < output) {
	    output =  cap;
	    input = cap * 10;
	}
	adjustResource(state, "energy", -input);
	adjustResource(state, "mass", output);

	capResource(state, "energy");

	doEvents(state);
    }

    if (updated) {
	this.sync();
    }
};


function loadJSON(url, callback) {
    var oReq = new XMLHttpRequest();
    oReq.onload = function () {
	callback(JSON.parse(this.responseText));
    };
    oReq.open("get", "config.json", true);
    oReq.send();
}

window.onload = function() {
    loadJSON("config.json", function(result) {
	var state = new MadSim(result);
    });
}
